-- Phase 8: Deal Spine — reservation holds, contract/exchange, deposit/trust,
-- conditions, and settlement readiness.
--
-- LOCAL REVIEW MIGRATION ONLY.
-- Do not apply to the live Supabase project until reviewed. The application
-- fails closed (honest "not enabled" state) while this migration is absent.
--
-- Depends on:
-- - phase 4 helpers: lintel_current_staff_org_id(), lintel_agent_id(),
--   lintel_contact_id(), lintel_is_staff_for_org(uuid)
-- - phase 7 audit ledger: public.audit_log + public.lintel_audit_write(...)
--
-- CANONICAL SOURCE OF TRUTH
-- =========================
-- public.deals is the single canonical record of a lot's sale lifecycle.
-- The legacy per-lot columns on public.stock (reservation_date,
-- reservation_expiry, contract_issued_date, contract_exchanged_date,
-- settlement_date, settlement_status, deposit_amount, deposit_paid,
-- sales_channel) are FROZEN LEGACY: no application code or RPC writes them
-- after this migration; they are backfilled into deals below and retained
-- only as historical seed data. stock.status remains the inventory display
-- status and is kept in sync EXCLUSIVELY by the deal RPCs in this file (and
-- by staff stock edits for lots that have no deal). There is no dual-write:
-- lifecycle facts live in deals, inventory display status lives in
-- stock.status, and only the RPCs bridge the two.
--
-- WRITE MODEL
-- ===========
-- No API role (anon/authenticated) holds INSERT/UPDATE/DELETE on deals.
-- All mutations go through SECURITY DEFINER RPCs that enforce, inside the
-- database: organisation isolation, real agent ownership (derived from
-- auth.uid(), never from client-supplied ids), stage transition rules, and
-- the one-active-deal-per-lot invariant. service_role callers (server-only
-- key; used by the local preview data client) are treated as privileged.
--
-- CONCURRENCY
-- ===========
-- lintel_deal_place_hold locks the stock row (SELECT ... FOR UPDATE) so
-- concurrent reservations serialise; the partial unique index
-- deals_one_active_per_lot is the database-level backstop guaranteeing at
-- most one non-cancelled deal per lot even if a future writer bypasses the
-- RPC with elevated privileges.

-- -------------------------------------------------------------------------
-- 1. Table
-- -------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  stock_id UUID NOT NULL REFERENCES public.stock(id),
  contact_id UUID NOT NULL REFERENCES public.contacts(id),
  -- Referring/selling agent. NULL for direct (no-agent) sales.
  agent_id UUID REFERENCES public.agents(id),

  stage TEXT NOT NULL DEFAULT 'reservation'
    CHECK (stage IN ('reservation', 'contract_issued', 'exchanged', 'settled', 'cancelled')),

  -- Reservation hold
  hold_placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hold_expires_at TIMESTAMPTZ NOT NULL,
  hold_released_at TIMESTAMPTZ,

  -- Terminal cancel/fall-over outcome
  cancelled_at TIMESTAMPTZ,
  cancel_kind TEXT CHECK (cancel_kind IN ('released', 'expired', 'fell_over')),
  cancel_reason TEXT,

  -- Contract / exchange
  contract_issued_date DATE,
  exchanged_date DATE,
  sunset_date DATE,
  cooling_off_ends_date DATE,

  -- Deposit / trust evidence
  deposit_amount NUMERIC(12,2) CHECK (deposit_amount IS NULL OR deposit_amount >= 0),
  deposit_due_date DATE,
  deposit_paid_date DATE,
  deposit_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (deposit_status IN ('pending', 'paid', 'refunded')),
  -- Stable reference to the private trust receipt document row. Never a
  -- storage path or signed URL.
  trust_receipt_document_id UUID REFERENCES public.client_documents(id) ON DELETE SET NULL,

  -- Conditions
  finance_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (finance_status IN ('not_required', 'pending', 'approved', 'declined')),
  finance_due_date DATE,
  firb_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (firb_status IN ('not_required', 'pending', 'approved', 'declined')),
  firb_due_date DATE,

  -- Settlement
  settlement_target_date DATE,
  settlement_actual_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT deals_cancel_state_consistent CHECK (
    (stage = 'cancelled') = (cancelled_at IS NOT NULL AND cancel_kind IS NOT NULL)
  )
);

-- Exactly one active (non-cancelled) deal per lot, enforced by the database.
CREATE UNIQUE INDEX IF NOT EXISTS deals_one_active_per_lot
  ON public.deals (stock_id)
  WHERE stage <> 'cancelled';

CREATE INDEX IF NOT EXISTS deals_org_stage_idx ON public.deals (org_id, stage);
CREATE INDEX IF NOT EXISTS deals_contact_idx ON public.deals (contact_id);
CREATE INDEX IF NOT EXISTS deals_agent_idx ON public.deals (agent_id);
CREATE INDEX IF NOT EXISTS deals_project_idx ON public.deals (project_id);

-- -------------------------------------------------------------------------
-- 2. Privileges + RLS: read-only through the API, writes only via RPCs
-- -------------------------------------------------------------------------

REVOKE ALL ON public.deals FROM PUBLIC;
REVOKE ALL ON public.deals FROM anon;
REVOKE ALL ON public.deals FROM authenticated;
GRANT SELECT ON public.deals TO authenticated;

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lintel_deals_staff_select ON public.deals;
CREATE POLICY lintel_deals_staff_select ON public.deals
  FOR SELECT TO authenticated
  USING (public.lintel_is_staff_for_org(org_id));

DROP POLICY IF EXISTS lintel_deals_agent_select ON public.deals;
CREATE POLICY lintel_deals_agent_select ON public.deals
  FOR SELECT TO authenticated
  USING (
    agent_id IS NOT NULL AND agent_id = public.lintel_agent_id()
  );

DROP POLICY IF EXISTS lintel_deals_client_select ON public.deals;
CREATE POLICY lintel_deals_client_select ON public.deals
  FOR SELECT TO authenticated
  USING (contact_id = public.lintel_contact_id());

-- No INSERT/UPDATE/DELETE policies and no write grants: direct writes from
-- API roles are denied at the privilege layer before RLS is even consulted.

-- -------------------------------------------------------------------------
-- 3. Caller-classification helper
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_is_service_role()
RETURNS boolean
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
  RETURN COALESCE(claims->>'role', NULLIF(current_setting('role', true), ''))
         = 'service_role';
END;
$$;

REVOKE ALL ON FUNCTION public.lintel_is_service_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_is_service_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.lintel_is_service_role() TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- 4. Internal cancel helper (NOT granted to API roles)
-- -------------------------------------------------------------------------
-- Shared by release/expire/fall-over paths. Reverts the lot to Available and
-- unlinks buyers, matching the long-standing "status back to Available clears
-- contact links" behaviour.

CREATE OR REPLACE FUNCTION public.lintel_deal_cancel_internal(
  p_deal_id uuid,
  p_kind text,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  d record;
BEGIN
  SELECT * INTO d FROM public.deals WHERE id = p_deal_id FOR UPDATE;
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal not found' USING ERRCODE = 'P0002';
  END IF;
  IF d.stage IN ('cancelled', 'settled') THEN
    RAISE EXCEPTION 'Deal is already %', d.stage USING ERRCODE = '42501';
  END IF;

  UPDATE public.deals
  SET stage = 'cancelled',
      cancelled_at = now(),
      cancel_kind = p_kind,
      cancel_reason = p_reason,
      hold_released_at = CASE WHEN stage = 'reservation' THEN now() ELSE hold_released_at END,
      updated_at = now()
  WHERE id = p_deal_id;

  UPDATE public.stock
  SET status = 'Available', updated_at = now()
  WHERE id = d.stock_id;

  DELETE FROM public.contact_stock WHERE stock_id = d.stock_id;
END;
$$;

REVOKE ALL ON FUNCTION public.lintel_deal_cancel_internal(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_deal_cancel_internal(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.lintel_deal_cancel_internal(uuid, text, text) FROM authenticated;

-- -------------------------------------------------------------------------
-- 5. RPC: place an atomic reservation hold
-- -------------------------------------------------------------------------
-- acting_agent_id is honoured ONLY for staff/service callers (e.g. staff
-- recording an agent-referred reservation, or the server-only preview
-- client). A real agent session always acts as itself.

CREATE OR REPLACE FUNCTION public.lintel_deal_place_hold(
  target_stock_id uuid,
  target_contact_id uuid,
  hold_hours integer DEFAULT 72,
  acting_agent_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff_org uuid;
  v_agent uuid;
  v_service boolean;
  v_lot record;
  v_contact record;
  v_deal_agent uuid;
  v_hours integer;
  v_stale record;
  v_deal_id uuid;
  v_expires timestamptz;
BEGIN
  v_staff_org := public.lintel_current_staff_org_id();
  v_agent := public.lintel_agent_id();
  v_service := public.lintel_is_service_role();

  IF v_agent IS NULL AND v_staff_org IS NULL AND NOT v_service THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '28000';
  END IF;

  IF target_contact_id IS NULL THEN
    RAISE EXCEPTION 'A buyer contact is required to reserve a lot' USING ERRCODE = '22004';
  END IF;

  -- Serialise concurrent reservations on this lot.
  SELECT s.id, s.org_id, s.project_id, s.status, s.lot_number, s.agent_id
  INTO v_lot
  FROM public.stock s
  WHERE s.id = target_stock_id
  FOR UPDATE;

  IF v_lot.id IS NULL THEN
    RAISE EXCEPTION 'Lot not found' USING ERRCODE = 'P0002';
  END IF;

  -- Organisation isolation + ownership, decided in the database.
  IF v_agent IS NOT NULL THEN
    IF v_lot.agent_id IS DISTINCT FROM v_agent THEN
      RAISE EXCEPTION 'Forbidden: lot is not assigned to you' USING ERRCODE = '42501';
    END IF;
    v_deal_agent := v_agent;
  ELSIF v_staff_org IS NOT NULL THEN
    IF v_lot.org_id IS DISTINCT FROM v_staff_org THEN
      RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
    END IF;
    v_deal_agent := COALESCE(acting_agent_id, v_lot.agent_id);
  ELSE
    -- service_role (server-only privileged caller)
    v_deal_agent := COALESCE(acting_agent_id, v_lot.agent_id);
  END IF;

  IF v_deal_agent IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = v_deal_agent AND a.org_id = v_lot.org_id
    ) THEN
      RAISE EXCEPTION 'Agent does not belong to this organisation' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT c.id, c.org_id, c.referring_agent_id
  INTO v_contact
  FROM public.contacts c
  WHERE c.id = target_contact_id;

  IF v_contact.id IS NULL OR v_contact.org_id IS DISTINCT FROM v_lot.org_id THEN
    RAISE EXCEPTION 'Contact not found in this organisation' USING ERRCODE = '42501';
  END IF;

  -- Agents may only reserve for clients they referred.
  IF v_agent IS NOT NULL AND v_contact.referring_agent_id IS DISTINCT FROM v_agent THEN
    RAISE EXCEPTION 'Forbidden: not your referred client' USING ERRCODE = '42501';
  END IF;

  -- Expire a stale hold on this lot inline so it cannot block forever.
  SELECT d.id INTO v_stale
  FROM public.deals d
  WHERE d.stock_id = target_stock_id
    AND d.stage = 'reservation'
    AND d.hold_expires_at < now();
  IF v_stale.id IS NOT NULL THEN
    PERFORM public.lintel_deal_cancel_internal(v_stale.id, 'expired', 'Hold expired');
    SELECT s.status INTO v_lot.status FROM public.stock s WHERE s.id = target_stock_id;
  END IF;

  IF v_lot.status <> 'Available' THEN
    RAISE EXCEPTION 'Lot % is not available (current status: %)', v_lot.lot_number, v_lot.status
      USING ERRCODE = '55006';
  END IF;

  v_hours := LEAST(GREATEST(COALESCE(hold_hours, 72), 1), 336);
  v_expires := now() + make_interval(hours => v_hours);

  BEGIN
    INSERT INTO public.deals (
      org_id, project_id, stock_id, contact_id, agent_id,
      stage, hold_placed_at, hold_expires_at
    ) VALUES (
      v_lot.org_id, v_lot.project_id, target_stock_id, target_contact_id, v_deal_agent,
      'reservation', now(), v_expires
    )
    RETURNING id INTO v_deal_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Lot % already has an active hold or deal', v_lot.lot_number
      USING ERRCODE = '55006';
  END;

  INSERT INTO public.contact_stock (contact_id, stock_id, project_id, role)
  VALUES (target_contact_id, target_stock_id, v_lot.project_id, 'buyer')
  ON CONFLICT DO NOTHING;

  UPDATE public.stock
  SET status = 'EOI', updated_at = now()
  WHERE id = target_stock_id;

  RETURN jsonb_build_object(
    'deal_id', v_deal_id,
    'stock_id', target_stock_id,
    'lot_number', v_lot.lot_number,
    'stage', 'reservation',
    'hold_expires_at', v_expires
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lintel_deal_place_hold(uuid, uuid, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_deal_place_hold(uuid, uuid, integer, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.lintel_deal_place_hold(uuid, uuid, integer, uuid) TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- 6. RPC: release (or acknowledge expiry of) a reservation hold
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_deal_release_hold(
  target_deal_id uuid,
  release_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff_org uuid;
  v_agent uuid;
  v_service boolean;
  d record;
  v_kind text;
BEGIN
  v_staff_org := public.lintel_current_staff_org_id();
  v_agent := public.lintel_agent_id();
  v_service := public.lintel_is_service_role();

  SELECT * INTO d FROM public.deals WHERE id = target_deal_id FOR UPDATE;
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    v_service
    OR (v_staff_org IS NOT NULL AND v_staff_org = d.org_id)
    OR (v_agent IS NOT NULL AND d.agent_id = v_agent)
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF d.stage <> 'reservation' THEN
    RAISE EXCEPTION 'Only reservation holds can be released (deal stage: %)', d.stage
      USING ERRCODE = '42501';
  END IF;

  v_kind := CASE WHEN d.hold_expires_at < now() THEN 'expired' ELSE 'released' END;
  PERFORM public.lintel_deal_cancel_internal(
    target_deal_id, v_kind, COALESCE(release_reason, 'Hold ' || v_kind));

  RETURN jsonb_build_object(
    'deal_id', target_deal_id,
    'stock_id', d.stock_id,
    'stage', 'cancelled',
    'cancel_kind', v_kind
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lintel_deal_release_hold(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_deal_release_hold(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lintel_deal_release_hold(uuid, text) TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- 7. RPC: expire lapsed holds (staff/service sweep)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_deal_expire_holds()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff_org uuid;
  v_service boolean;
  v_count integer := 0;
  r record;
BEGIN
  v_staff_org := public.lintel_current_staff_org_id();
  v_service := public.lintel_is_service_role();

  IF v_staff_org IS NULL AND NOT v_service THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT d.id
    FROM public.deals d
    WHERE d.stage = 'reservation'
      AND d.hold_expires_at < now()
      AND (v_service OR d.org_id = v_staff_org)
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.lintel_deal_cancel_internal(r.id, 'expired', 'Hold expired');
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('expired', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.lintel_deal_expire_holds() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_deal_expire_holds() FROM anon;
GRANT EXECUTE ON FUNCTION public.lintel_deal_expire_holds() TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- 8. RPC: staff deal detail updates (whitelisted fields only)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_deal_staff_update(
  target_deal_id uuid,
  updates jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff_org uuid;
  v_service boolean;
  d record;
  k text;
  allowed CONSTANT text[] := ARRAY[
    'contract_issued_date', 'exchanged_date', 'sunset_date', 'cooling_off_ends_date',
    'deposit_amount', 'deposit_due_date', 'deposit_paid_date', 'deposit_status',
    'finance_status', 'finance_due_date', 'firb_status', 'firb_due_date',
    'settlement_target_date', 'settlement_actual_date', 'trust_receipt_document_id'
  ];
  v_doc record;
BEGIN
  v_staff_org := public.lintel_current_staff_org_id();
  v_service := public.lintel_is_service_role();

  SELECT * INTO d FROM public.deals WHERE id = target_deal_id FOR UPDATE;
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (v_service OR (v_staff_org IS NOT NULL AND v_staff_org = d.org_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF updates IS NULL OR jsonb_typeof(updates) <> 'object' THEN
    RAISE EXCEPTION 'updates must be a JSON object' USING ERRCODE = '22023';
  END IF;

  FOR k IN SELECT jsonb_object_keys(updates) LOOP
    IF NOT (k = ANY(allowed)) THEN
      RAISE EXCEPTION 'Field % is not updatable', k USING ERRCODE = '42501';
    END IF;
  END LOOP;

  -- Trust receipt reference must be a client document of THIS buyer and org.
  IF updates ? 'trust_receipt_document_id'
     AND updates->>'trust_receipt_document_id' IS NOT NULL THEN
    SELECT cd.id INTO v_doc
    FROM public.client_documents cd
    WHERE cd.id = (updates->>'trust_receipt_document_id')::uuid
      AND cd.org_id = d.org_id
      AND cd.contact_id = d.contact_id;
    IF v_doc.id IS NULL THEN
      RAISE EXCEPTION 'Trust receipt document not found for this buyer'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.deals SET
    contract_issued_date  = CASE WHEN updates ? 'contract_issued_date'  THEN (updates->>'contract_issued_date')::date  ELSE contract_issued_date  END,
    exchanged_date        = CASE WHEN updates ? 'exchanged_date'        THEN (updates->>'exchanged_date')::date        ELSE exchanged_date        END,
    sunset_date           = CASE WHEN updates ? 'sunset_date'           THEN (updates->>'sunset_date')::date           ELSE sunset_date           END,
    cooling_off_ends_date = CASE WHEN updates ? 'cooling_off_ends_date' THEN (updates->>'cooling_off_ends_date')::date ELSE cooling_off_ends_date END,
    deposit_amount        = CASE WHEN updates ? 'deposit_amount'        THEN (updates->>'deposit_amount')::numeric     ELSE deposit_amount        END,
    deposit_due_date      = CASE WHEN updates ? 'deposit_due_date'      THEN (updates->>'deposit_due_date')::date      ELSE deposit_due_date      END,
    deposit_paid_date     = CASE WHEN updates ? 'deposit_paid_date'     THEN (updates->>'deposit_paid_date')::date     ELSE deposit_paid_date     END,
    deposit_status        = CASE WHEN updates ? 'deposit_status'        THEN updates->>'deposit_status'                ELSE deposit_status        END,
    finance_status        = CASE WHEN updates ? 'finance_status'        THEN updates->>'finance_status'                ELSE finance_status        END,
    finance_due_date      = CASE WHEN updates ? 'finance_due_date'      THEN (updates->>'finance_due_date')::date      ELSE finance_due_date      END,
    firb_status           = CASE WHEN updates ? 'firb_status'           THEN updates->>'firb_status'                   ELSE firb_status           END,
    firb_due_date         = CASE WHEN updates ? 'firb_due_date'         THEN (updates->>'firb_due_date')::date         ELSE firb_due_date         END,
    settlement_target_date = CASE WHEN updates ? 'settlement_target_date' THEN (updates->>'settlement_target_date')::date ELSE settlement_target_date END,
    settlement_actual_date = CASE WHEN updates ? 'settlement_actual_date' THEN (updates->>'settlement_actual_date')::date ELSE settlement_actual_date END,
    trust_receipt_document_id = CASE WHEN updates ? 'trust_receipt_document_id' THEN (updates->>'trust_receipt_document_id')::uuid ELSE trust_receipt_document_id END,
    updated_at = now()
  WHERE id = target_deal_id;

  RETURN jsonb_build_object('deal_id', target_deal_id, 'updated', true);
END;
$$;

REVOKE ALL ON FUNCTION public.lintel_deal_staff_update(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_deal_staff_update(uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.lintel_deal_staff_update(uuid, jsonb) TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- 9. RPC: stage transitions (staff/service only)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_deal_advance_stage(
  target_deal_id uuid,
  target_stage text,
  reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff_org uuid;
  v_service boolean;
  d record;
  v_ok boolean := false;
BEGIN
  v_staff_org := public.lintel_current_staff_org_id();
  v_service := public.lintel_is_service_role();

  SELECT * INTO d FROM public.deals WHERE id = target_deal_id FOR UPDATE;
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (v_service OR (v_staff_org IS NOT NULL AND v_staff_org = d.org_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF target_stage = 'cancelled' THEN
    IF reason IS NULL OR btrim(reason) = '' THEN
      RAISE EXCEPTION 'A reason is required to cancel a deal' USING ERRCODE = '22004';
    END IF;
    PERFORM public.lintel_deal_cancel_internal(target_deal_id, 'fell_over', reason);
    RETURN jsonb_build_object('deal_id', target_deal_id, 'stage', 'cancelled');
  END IF;

  v_ok := (d.stage = 'reservation'      AND target_stage = 'contract_issued')
       OR (d.stage = 'contract_issued'  AND target_stage = 'exchanged')
       OR (d.stage = 'exchanged'        AND target_stage = 'settled');
  IF NOT v_ok THEN
    RAISE EXCEPTION 'Invalid stage transition: % -> %', d.stage, target_stage
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.deals SET
    stage = target_stage,
    contract_issued_date = CASE WHEN target_stage = 'contract_issued'
      THEN COALESCE(contract_issued_date, CURRENT_DATE) ELSE contract_issued_date END,
    exchanged_date = CASE WHEN target_stage = 'exchanged'
      THEN COALESCE(exchanged_date, CURRENT_DATE) ELSE exchanged_date END,
    settlement_actual_date = CASE WHEN target_stage = 'settled'
      THEN COALESCE(settlement_actual_date, CURRENT_DATE) ELSE settlement_actual_date END,
    updated_at = now()
  WHERE id = target_deal_id;

  UPDATE public.stock SET
    status = CASE target_stage
      WHEN 'contract_issued' THEN 'Under Contract'
      WHEN 'exchanged' THEN 'Exchanged'
      WHEN 'settled' THEN 'Settled'
    END,
    updated_at = now()
  WHERE id = d.stock_id;

  RETURN jsonb_build_object('deal_id', target_deal_id, 'stage', target_stage);
END;
$$;

REVOKE ALL ON FUNCTION public.lintel_deal_advance_stage(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lintel_deal_advance_stage(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lintel_deal_advance_stage(uuid, text, text) TO authenticated, service_role;

-- -------------------------------------------------------------------------
-- 10. Audit ledger extension (same append-only ledger as phase 7)
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lintel_audit_deals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  watched CONSTANT text[] := ARRAY[
    'stage', 'contact_id', 'agent_id',
    'hold_placed_at', 'hold_expires_at', 'hold_released_at',
    'cancelled_at', 'cancel_kind', 'cancel_reason',
    'contract_issued_date', 'exchanged_date', 'sunset_date', 'cooling_off_ends_date',
    'deposit_amount', 'deposit_due_date', 'deposit_paid_date', 'deposit_status',
    'trust_receipt_document_id',
    'finance_status', 'finance_due_date', 'firb_status', 'firb_due_date',
    'settlement_target_date', 'settlement_actual_date'
  ];
  oldj jsonb;
  newj jsonb;
  f text;
  changed text[] := '{}';
  oldvals jsonb := '{}'::jsonb;
  newvals jsonb := '{}'::jsonb;
  rowj jsonb;
  ctx jsonb;
  v_lot text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rowj := to_jsonb(OLD);
  ELSE
    rowj := to_jsonb(NEW);
  END IF;

  SELECT s.lot_number INTO v_lot FROM public.stock s
  WHERE s.id = (rowj->>'stock_id')::uuid;
  ctx := jsonb_build_object(
    'stock_id', rowj->'stock_id',
    'project_id', rowj->'project_id',
    'lot_number', v_lot
  );

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
      NEW.org_id, 'deals', NEW.id, 'deal.updated',
      changed, oldvals, newvals, ctx);
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    FOREACH f IN ARRAY watched LOOP
      IF rowj->f IS NOT NULL AND rowj->f <> 'null'::jsonb THEN
        changed := changed || f;
        newvals := newvals || jsonb_build_object(f, rowj->f);
      END IF;
    END LOOP;
    PERFORM public.lintel_audit_write(
      NEW.org_id, 'deals', NEW.id, 'deal.created',
      changed, NULL, newvals, ctx);
    RETURN NEW;
  END IF;

  -- DELETE (administrative only — API roles hold no DELETE privilege)
  FOREACH f IN ARRAY watched LOOP
    IF rowj->f IS NOT NULL AND rowj->f <> 'null'::jsonb THEN
      changed := changed || f;
      oldvals := oldvals || jsonb_build_object(f, rowj->f);
    END IF;
  END LOOP;
  PERFORM public.lintel_audit_write(
    OLD.org_id, 'deals', OLD.id, 'deal.deleted',
    changed, oldvals, NULL, ctx);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS lintel_audit_deals_trigger ON public.deals;
CREATE TRIGGER lintel_audit_deals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.lintel_audit_deals();

-- -------------------------------------------------------------------------
-- 11. Backfill from frozen legacy stock columns
-- -------------------------------------------------------------------------
-- One deal per already-progressed lot that has a linked buyer. Lots with no
-- linked contact are skipped (a deal requires a buyer); their legacy columns
-- remain readable history. Runs idempotently: the partial unique index plus
-- NOT EXISTS guard prevents duplicates on re-apply.

INSERT INTO public.deals (
  org_id, project_id, stock_id, contact_id, agent_id,
  stage, hold_placed_at, hold_expires_at,
  cancelled_at, cancel_kind,
  contract_issued_date, exchanged_date,
  deposit_amount, deposit_status,
  finance_status,
  settlement_target_date, settlement_actual_date,
  created_at
)
SELECT
  s.org_id,
  s.project_id,
  s.id,
  buyer.contact_id,
  s.agent_id,
  CASE s.status
    WHEN 'EOI' THEN 'reservation'
    WHEN 'Under Contract' THEN 'contract_issued'
    WHEN 'Exchanged' THEN 'exchanged'
    WHEN 'Settled' THEN 'settled'
  END,
  COALESCE(s.reservation_date::timestamptz, s.created_at, now()),
  COALESCE(
    s.reservation_expiry::timestamptz,
    CASE WHEN s.status = 'EOI'
      THEN now() + interval '72 hours'
      ELSE COALESCE(s.reservation_date::timestamptz, s.created_at, now()) + interval '72 hours'
    END
  ),
  NULL, NULL,
  s.contract_issued_date,
  s.contract_exchanged_date,
  s.deposit_amount,
  CASE WHEN COALESCE(s.deposit_paid, false) THEN 'paid' ELSE 'pending' END,
  CASE
    WHEN s.settlement_status IN ('finance_approved', 'settling_soon', 'settled') THEN 'approved'
    WHEN s.settlement_status = 'finance_pending' THEN 'pending'
    ELSE 'pending'
  END,
  CASE WHEN s.status <> 'Settled' THEN s.settlement_date END,
  CASE WHEN s.status = 'Settled' THEN s.settlement_date END,
  now()
FROM public.stock s
CROSS JOIN LATERAL (
  SELECT cs.contact_id
  FROM public.contact_stock cs
  WHERE cs.stock_id = s.id
  ORDER BY CASE WHEN cs.role = 'buyer' THEN 0 ELSE 1 END, cs.id
  LIMIT 1
) buyer
WHERE s.status IN ('EOI', 'Under Contract', 'Exchanged', 'Settled')
  AND NOT EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.stock_id = s.id AND d.stage <> 'cancelled'
  );
