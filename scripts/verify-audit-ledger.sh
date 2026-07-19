#!/usr/bin/env bash
# Local-only verification of the audit ledger migration
# (supabase/migrations/20260719090000_lintel_audit_ledger.sql).
#
# Spins up a throwaway Postgres container, stubs the minimum Supabase
# environment (roles, auth.uid(), phase-4 helper, audited tables), applies
# the migration, and asserts trigger capture, meaningful-change filtering,
# append-only enforcement, and org-scoped RLS. Never touches any remote
# Supabase project.
#
# Usage: ./scripts/verify-audit-ledger.sh

set -euo pipefail

cd "$(dirname "$0")/.."

MIGRATION="supabase/migrations/20260719090000_lintel_audit_ledger.sql"
CONTAINER="lintel-audit-verify"
PG_IMAGE="postgres:15-alpine"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres "$PG_IMAGE" >/dev/null

echo "waiting for postgres…"
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$CONTAINER" pg_isready -U postgres >/dev/null

psql_run() { docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -q "$@"; }

echo "creating Supabase environment stub…"
psql_run <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE SCHEMA auth;
-- Mirrors Supabase's auth.uid(): sub claim of the request JWT.
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
$$;

-- Minimal audited tables. agent_projects deliberately has NO id/org_id
-- columns to exercise the defensive derivation in the trigger.
CREATE TABLE public.projects (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  name text NOT NULL
);
CREATE TABLE public.stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  org_id uuid NOT NULL,
  lot_number text NOT NULL,
  price numeric(12,2),
  status text NOT NULL DEFAULT 'Available',
  agent_id uuid,
  agent_name text,
  commission_type text,
  commission_rate numeric(5,2),
  notes text
);
CREATE TABLE public.agent_projects (
  agent_id uuid NOT NULL,
  project_id uuid NOT NULL,
  commission_type text,
  commission_rate numeric(5,2)
);
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  org_id uuid,
  role text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock, public.agent_projects, public.projects TO authenticated, service_role;

-- Phase-4 helpers the migration depends on (verbatim shape).
CREATE FUNCTION public.lintel_current_staff_org_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT up.org_id FROM public.user_profiles up
  WHERE up.auth_user_id = auth.uid() AND up.role = 'staff' LIMIT 1
$$;
CREATE FUNCTION public.lintel_is_staff_for_org(target_org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT target_org_id IS NOT NULL AND public.lintel_current_staff_org_id() = target_org_id
$$;

-- Seed
INSERT INTO public.projects VALUES
  ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','6 Cross Street'),
  ('b0000000-0000-0000-0000-000000000099','a9000000-0000-0000-0000-000000000009','Other Org Project');
INSERT INTO public.user_profiles (auth_user_id, org_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','staff');
SQL

echo "applying migration…"
psql_run < "$MIGRATION"

echo "running assertions…"
psql_run <<'SQL'
-- Simulate an authenticated staff request for actor capture.
SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"am@mproperty.melbourne","role":"authenticated"}', false);

-- 1. stock INSERT captured
INSERT INTO public.stock (id, project_id, org_id, lot_number, price, status)
VALUES ('c1000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001', '202', 510000, 'Available');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.audit_log WHERE action='stock.created') <> 1 THEN
    RAISE EXCEPTION 'FAIL: stock.created not captured'; END IF;
END $$;

-- 2. watched UPDATE captured with old/new + actor
UPDATE public.stock SET status='EOI', price=520000 WHERE lot_number='202';
DO $$ DECLARE r record; BEGIN
  SELECT * INTO r FROM public.audit_log WHERE action='stock.updated';
  IF r IS NULL THEN RAISE EXCEPTION 'FAIL: stock.updated not captured'; END IF;
  IF NOT (r.changed_fields @> ARRAY['status','price'] AND array_length(r.changed_fields,1)=2) THEN
    RAISE EXCEPTION 'FAIL: changed_fields wrong: %', r.changed_fields; END IF;
  IF r.old_values->>'status' <> 'Available' OR r.new_values->>'status' <> 'EOI' THEN
    RAISE EXCEPTION 'FAIL: before/after values wrong'; END IF;
  IF r.actor_auth_user_id <> '11111111-1111-1111-1111-111111111111'
     OR r.actor_email <> 'am@mproperty.melbourne' THEN
    RAISE EXCEPTION 'FAIL: actor not captured'; END IF;
  IF r.context->>'lot_number' <> '202' THEN
    RAISE EXCEPTION 'FAIL: context missing lot_number'; END IF;
END $$;

-- 3. non-watched UPDATE ignored (meaningful changes only)
UPDATE public.stock SET notes='internal note' WHERE lot_number='202';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.audit_log) <> 2 THEN
    RAISE EXCEPTION 'FAIL: non-watched update was logged'; END IF;
  IF EXISTS (SELECT 1 FROM public.audit_log
             WHERE old_values ? 'notes' OR new_values ? 'notes') THEN
    RAISE EXCEPTION 'FAIL: notes leaked into ledger'; END IF;
END $$;

-- 4. stock DELETE captured
DELETE FROM public.stock WHERE lot_number='202';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.audit_log WHERE action='stock.deleted') <> 1 THEN
    RAISE EXCEPTION 'FAIL: stock.deleted not captured'; END IF;
END $$;

-- 5. agent_projects lifecycle (no id/org_id columns on the table)
INSERT INTO public.agent_projects VALUES
  ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','percentage',2.5);
UPDATE public.agent_projects SET commission_rate=3.0
  WHERE project_id='b0000000-0000-0000-0000-000000000001';
DELETE FROM public.agent_projects;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.audit_log WHERE entity_table='agent_projects') <> 3 THEN
    RAISE EXCEPTION 'FAIL: agent_projects events missing'; END IF;
  IF EXISTS (SELECT 1 FROM public.audit_log WHERE entity_table='agent_projects'
             AND org_id <> 'a0000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'FAIL: agent_projects org derivation wrong'; END IF;
END $$;

-- 6. append-only: UPDATE/DELETE rejected even as superuser
DO $$ BEGIN
  BEGIN
    UPDATE public.audit_log SET action='tampered';
    RAISE EXCEPTION 'FAIL: audit_log UPDATE was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; -- expected block
  END;
  BEGIN
    DELETE FROM public.audit_log;
    RAISE EXCEPTION 'FAIL: audit_log DELETE was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
  END;
END $$;

-- 6b. append works when the mutating caller is a plain API role
SET ROLE authenticated;
INSERT INTO public.stock (project_id, org_id, lot_number, status)
VALUES ('b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001', '303', 'Available');
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.audit_log
                 WHERE action='stock.created' AND context->>'lot_number'='303') THEN
    RAISE EXCEPTION 'FAIL: trigger did not append for authenticated caller'; END IF;
END $$;

-- 7. RLS: staff read own org only; no direct INSERT privilege
SET ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.audit_log) < 5 THEN
    RAISE EXCEPTION 'FAIL: staff cannot read own org ledger'; END IF;
  IF EXISTS (SELECT 1 FROM public.audit_log
             WHERE org_id <> 'a0000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'FAIL: cross-org rows visible'; END IF;
  BEGIN
    INSERT INTO public.audit_log (org_id, entity_table, action)
    VALUES ('a0000000-0000-0000-0000-000000000001','stock','forged');
    RAISE EXCEPTION 'FAIL: direct INSERT allowed for authenticated';
  EXCEPTION WHEN insufficient_privilege THEN NULL; -- expected
  END;
END $$;
RESET ROLE;

-- 8. RLS: non-staff (agent JWT, no user_profiles row) sees nothing
SELECT set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
SET ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.audit_log) <> 0 THEN
    RAISE EXCEPTION 'FAIL: non-staff can read ledger'; END IF;
END $$;
RESET ROLE;

-- 9. anon: no access at all
SET ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM count(*) FROM public.audit_log;
    RAISE EXCEPTION 'FAIL: anon can select audit_log';
  EXCEPTION WHEN insufficient_privilege THEN NULL; -- expected
  END;
END $$;
RESET ROLE;

SELECT 'ALL AUDIT LEDGER ASSERTIONS PASSED' AS result;
SQL

echo "OK"
