-- Phase 7: Immutable, org-scoped audit ledger.
--
-- LOCAL REVIEW MIGRATION ONLY.
-- Do not apply to the live Supabase project until it has been reviewed and
-- the deployment is ready for it. The application fails closed (honest empty
-- state) while this migration is not applied.
--
-- Design:
-- - public.audit_log is APPEND-ONLY. Rows are written exclusively by
--   database triggers on the audited tables, so every mutation is captured
--   regardless of which application route or server action performed it.
-- - No API role (anon / authenticated) holds INSERT/UPDATE/DELETE privilege.
--   Staff read their own organisation's rows through RLS. A BEFORE
--   UPDATE/DELETE trigger rejects mutation attempts even from privileged
--   API roles; only the table owner / service role can administratively
--   bypass it (by disabling the trigger), which is the intended escape hatch.
-- - Audited changes (watched columns only — no notes/PII/secrets):
--     stock:          status, price, agent_id, agent_name,
--                     commission_type, commission_rate
--     agent_projects: agent_id, project_id, commission_type, commission_rate
-- - old_values/new_values contain ONLY the watched fields that changed.
--   context carries small display labels (lot_number, project_id, agent_id).
-- - Actor identity is taken from the request JWT (auth.uid(), role claim,
--   email claim). Sessionless preview/service-role writes are recorded
--   honestly as role 'service_role' with no user id — never fabricated.
-- - No triggers write to audit_log from audit_log itself: no recursion.
--
-- Depends on public.lintel_is_staff_for_org() from the phase 4 migration.

-- -------------------------------------------------------------------------
-- 1. Ledger table
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  entity_table TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  old_values JSONB,
  new_values JSONB,
  context JSONB,
  actor_auth_user_id UUID,
  actor_role TEXT,
  actor_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_org_created_idx
  ON public.audit_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON public.audit_log (entity_table, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_org_action_idx
  ON public.audit_log (org_id, action);

-- -------------------------------------------------------------------------
-- 2. Privileges: nobody appends directly; staff read via RLS
-- -------------------------------------------------------------------------

REVOKE ALL ON public.audit_log FROM PUBLIC;
REVOKE ALL ON public.audit_log FROM anon;
REVOKE ALL ON public.audit_log FROM authenticated;
GRANT SELECT ON public.audit_log TO authenticated;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lintel_audit_log_staff_select ON public.audit_log;
CREATE POLICY lintel_audit_log_staff_select ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.lintel_is_staff_for_org(org_id));

-- No INSERT/UPDATE/DELETE policies: API roles cannot write even if a broad
-- grant were ever reintroduced. Trigger functions below are SECURITY DEFINER
-- (owner-run), so the append path does not depend on caller privileges.

-- -------------------------------------------------------------------------
-- 3. Append-only guard (blocks UPDATE/DELETE for every normal path)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_audit_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'raise_exception';
END;
$$;

DROP TRIGGER IF EXISTS lintel_audit_log_immutable ON public.audit_log;
CREATE TRIGGER lintel_audit_log_immutable
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.lintel_audit_block_mutation();

-- -------------------------------------------------------------------------
-- 4. Actor resolution (honest: NULLs when no user JWT is present)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_audit_actor(
  OUT actor_auth_user_id uuid,
  OUT actor_role text,
  OUT actor_email text
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
BEGIN
  BEGIN
    claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    claims := NULL;
  END;

  BEGIN
    actor_auth_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    actor_auth_user_id := NULL;
  END;

  actor_role := COALESCE(claims->>'role', NULLIF(current_setting('role', true), ''));
  actor_email := claims->>'email';
END;
$$;

-- -------------------------------------------------------------------------
-- 5. Shared append helper (SECURITY DEFINER so triggers can always write)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_audit_write(
  p_org_id uuid,
  p_entity_table text,
  p_entity_id uuid,
  p_action text,
  p_changed_fields text[],
  p_old_values jsonb,
  p_new_values jsonb,
  p_context jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  a record;
BEGIN
  -- Org isolation is mandatory; a row we cannot attribute to an org would be
  -- unreadable and unscopeable, so it is skipped rather than mis-filed.
  IF p_org_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO a FROM public.lintel_audit_actor();

  INSERT INTO public.audit_log (
    org_id, entity_table, entity_id, action, changed_fields,
    old_values, new_values, context,
    actor_auth_user_id, actor_role, actor_email
  ) VALUES (
    p_org_id, p_entity_table, p_entity_id, p_action,
    COALESCE(p_changed_fields, '{}'),
    p_old_values, p_new_values, p_context,
    a.actor_auth_user_id, a.actor_role, a.actor_email
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lintel_audit_write(uuid, text, uuid, text, text[], jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_audit_write(uuid, text, uuid, text, text[], jsonb, jsonb, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.lintel_audit_write(uuid, text, uuid, text, text[], jsonb, jsonb, jsonb) FROM authenticated;

-- -------------------------------------------------------------------------
-- 6. stock trigger
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_audit_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  watched CONSTANT text[] :=
    ARRAY['status', 'price', 'agent_id', 'agent_name',
          'commission_type', 'commission_rate'];
  oldj jsonb;
  newj jsonb;
  f text;
  changed text[] := '{}';
  oldvals jsonb := '{}'::jsonb;
  newvals jsonb := '{}'::jsonb;
  rowj jsonb;
  ctx jsonb;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    oldj := to_jsonb(OLD);
    newj := to_jsonb(NEW);
    FOREACH f IN ARRAY watched LOOP
      IF oldj->f IS DISTINCT FROM newj->f THEN
        changed := changed || f;
        oldvals := oldvals || jsonb_build_object(f, oldj->f);
        newvals := newvals || jsonb_build_object(f, newj->f);
      END IF;
    END LOOP;
    -- Only meaningful changes: skip updates that touch no watched field.
    IF array_length(changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
    ctx := jsonb_build_object('lot_number', NEW.lot_number, 'project_id', NEW.project_id);
    PERFORM public.lintel_audit_write(
      NEW.org_id, 'stock', NEW.id, 'stock.updated',
      changed, oldvals, newvals, ctx);
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    rowj := to_jsonb(NEW);
    FOREACH f IN ARRAY watched LOOP
      IF rowj->f IS NOT NULL AND rowj->f <> 'null'::jsonb THEN
        changed := changed || f;
        newvals := newvals || jsonb_build_object(f, rowj->f);
      END IF;
    END LOOP;
    ctx := jsonb_build_object('lot_number', NEW.lot_number, 'project_id', NEW.project_id);
    PERFORM public.lintel_audit_write(
      NEW.org_id, 'stock', NEW.id, 'stock.created',
      changed, NULL, newvals, ctx);
    RETURN NEW;
  END IF;

  -- DELETE
  rowj := to_jsonb(OLD);
  FOREACH f IN ARRAY watched LOOP
    IF rowj->f IS NOT NULL AND rowj->f <> 'null'::jsonb THEN
      changed := changed || f;
      oldvals := oldvals || jsonb_build_object(f, rowj->f);
    END IF;
  END LOOP;
  ctx := jsonb_build_object('lot_number', OLD.lot_number, 'project_id', OLD.project_id);
  PERFORM public.lintel_audit_write(
    OLD.org_id, 'stock', OLD.id, 'stock.deleted',
    changed, oldvals, NULL, ctx);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS lintel_audit_stock_trigger ON public.stock;
CREATE TRIGGER lintel_audit_stock_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.stock
  FOR EACH ROW EXECUTE FUNCTION public.lintel_audit_stock();

-- -------------------------------------------------------------------------
-- 7. agent_projects trigger (agent↔project assignment + per-project commission)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_audit_agent_projects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  watched CONSTANT text[] :=
    ARRAY['agent_id', 'project_id', 'commission_type', 'commission_rate'];
  oldj jsonb;
  newj jsonb;
  f text;
  changed text[] := '{}';
  oldvals jsonb := '{}'::jsonb;
  newvals jsonb := '{}'::jsonb;
  rowj jsonb;
  v_org uuid;
  v_entity uuid;
  v_project uuid;
  v_agent uuid;
  ctx jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rowj := to_jsonb(OLD);
  ELSE
    rowj := to_jsonb(NEW);
  END IF;
  v_project := (rowj->>'project_id')::uuid;
  v_agent := (rowj->>'agent_id')::uuid;

  -- agent_projects has no org_id column; derive it from the project. If the
  -- project row is already gone (cascaded cleanup) we cannot attribute an
  -- org, so the event is skipped rather than mis-filed or failing the write.
  SELECT p.org_id INTO v_org FROM public.projects p WHERE p.id = v_project;
  IF v_org IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Row PK if the table has one; NULL otherwise (context still identifies it).
  v_entity := NULLIF(rowj->>'id', '')::uuid;
  ctx := jsonb_build_object('agent_id', v_agent, 'project_id', v_project);

  IF TG_OP = 'UPDATE' THEN
    oldj := to_jsonb(OLD);
    newj := to_jsonb(NEW);
    FOREACH f IN ARRAY watched LOOP
      IF oldj->f IS DISTINCT FROM newj->f THEN
        changed := changed || f;
        oldvals := oldvals || jsonb_build_object(f, oldj->f);
        newvals := newvals || jsonb_build_object(f, newj->f);
      END IF;
    END LOOP;
    IF array_length(changed, 1) IS NULL THEN
      RETURN NEW;
    END IF;
    PERFORM public.lintel_audit_write(
      v_org, 'agent_projects', v_entity, 'agent_project.updated',
      changed, oldvals, newvals, ctx);
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    rowj := to_jsonb(NEW);
    FOREACH f IN ARRAY watched LOOP
      IF rowj->f IS NOT NULL AND rowj->f <> 'null'::jsonb THEN
        changed := changed || f;
        newvals := newvals || jsonb_build_object(f, rowj->f);
      END IF;
    END LOOP;
    PERFORM public.lintel_audit_write(
      v_org, 'agent_projects', v_entity, 'agent_project.assigned',
      changed, NULL, newvals, ctx);
    RETURN NEW;
  END IF;

  -- DELETE
  rowj := to_jsonb(OLD);
  FOREACH f IN ARRAY watched LOOP
    IF rowj->f IS NOT NULL AND rowj->f <> 'null'::jsonb THEN
      changed := changed || f;
      oldvals := oldvals || jsonb_build_object(f, rowj->f);
    END IF;
  END LOOP;
  PERFORM public.lintel_audit_write(
    v_org, 'agent_projects', v_entity, 'agent_project.unassigned',
    changed, oldvals, NULL, ctx);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS lintel_audit_agent_projects_trigger ON public.agent_projects;
CREATE TRIGGER lintel_audit_agent_projects_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.agent_projects
  FOR EACH ROW EXECUTE FUNCTION public.lintel_audit_agent_projects();

-- -------------------------------------------------------------------------
-- 8. Document provenance: uploaded_by now stores the acting profile id
--    (user_profiles.id for staff, agents.id for agent uploads). Drop any
--    single-table FK created by the original checkpoint 5a setup so both
--    identity tables are valid sources. No-ops when the constraints do not
--    exist.
-- -------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.project_documents
  DROP CONSTRAINT IF EXISTS project_documents_uploaded_by_fkey;
ALTER TABLE IF EXISTS public.client_documents
  DROP CONSTRAINT IF EXISTS client_documents_uploaded_by_fkey;
