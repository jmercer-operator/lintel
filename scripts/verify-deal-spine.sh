#!/usr/bin/env bash
# Local-only verification of the deal spine migration
# (supabase/migrations/20260719140000_lintel_deal_spine.sql).
#
# Spins up a throwaway Postgres container, stubs the minimum Supabase
# environment (roles, auth.uid(), phase-4 helpers, base tables), applies the
# phase-7 audit ledger migration then the deal spine migration, and asserts:
# hold atomicity under true concurrency, the one-active-deal-per-lot
# invariant, expiry, release, stage transitions, staff/agent authorization,
# cross-org denial, direct-write denial, RLS reads for all three roles, and
# audit capture. Never touches any remote Supabase project.
#
# Usage: ./scripts/verify-deal-spine.sh

set -euo pipefail

cd "$(dirname "$0")/.."

AUDIT_MIGRATION="supabase/migrations/20260719090000_lintel_audit_ledger.sql"
DEAL_MIGRATION="supabase/migrations/20260719140000_lintel_deal_spine.sql"
CONTAINER="lintel-deal-verify"
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
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
$$;

-- Base tables (minimal real shapes the migration depends on)
CREATE TABLE public.organisations (
  id uuid PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE public.projects (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  name text NOT NULL
);
CREATE TABLE public.stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  lot_number text NOT NULL,
  price numeric(12,2),
  status text NOT NULL DEFAULT 'Available',
  agent_id uuid,
  agent_name text,
  commission_type text,
  commission_rate numeric(5,2),
  notes text,
  reservation_date date,
  reservation_expiry date,
  contract_issued_date date,
  contract_exchanged_date date,
  settlement_date date,
  settlement_status text DEFAULT 'not_applicable',
  deposit_amount numeric(12,2),
  deposit_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.agents (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  auth_user_id uuid,
  first_name text,
  last_name text
);
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  auth_user_id uuid,
  referring_agent_id uuid,
  first_name text,
  last_name text
);
CREATE TABLE public.contact_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  stock_id uuid NOT NULL REFERENCES public.stock(id),
  project_id uuid,
  role text,
  UNIQUE (contact_id, stock_id)
);
CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  document_type text,
  file_name text
);
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  org_id uuid,
  role text
);
CREATE TABLE public.agent_projects (
  agent_id uuid NOT NULL,
  project_id uuid NOT NULL,
  commission_type text,
  commission_rate numeric(5,2)
);
GRANT SELECT ON public.stock, public.projects, public.contacts, public.contact_stock,
  public.agents, public.client_documents, public.organisations
  TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.stock, public.contact_stock
  TO authenticated, service_role;

-- Phase-4 helpers the migrations depend on (verbatim shape).
CREATE FUNCTION public.lintel_current_staff_org_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT up.org_id FROM public.user_profiles up
  WHERE up.auth_user_id = auth.uid() AND up.role = 'staff' LIMIT 1
$$;
CREATE FUNCTION public.lintel_is_staff_for_org(target_org_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT target_org_id IS NOT NULL AND public.lintel_current_staff_org_id() = target_org_id
$$;
CREATE FUNCTION public.lintel_agent_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT a.id FROM public.agents a WHERE a.auth_user_id = auth.uid() LIMIT 1
$$;
CREATE FUNCTION public.lintel_contact_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT c.id FROM public.contacts c WHERE c.auth_user_id = auth.uid() LIMIT 1
$$;

-- Seed: two orgs, projects, agents, contacts, lots.
INSERT INTO public.organisations VALUES
  ('a0000000-0000-0000-0000-000000000001','M Property Group'),
  ('a9000000-0000-0000-0000-000000000009','Other Org');
INSERT INTO public.projects VALUES
  ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','6 Cross Street'),
  ('b9000000-0000-0000-0000-000000000009','a9000000-0000-0000-0000-000000000009','Elsewhere');
INSERT INTO public.user_profiles (auth_user_id, org_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111','a0000000-0000-0000-0000-000000000001','staff'),
  ('99999999-9999-9999-9999-999999999999','a9000000-0000-0000-0000-000000000009','staff');
INSERT INTO public.agents VALUES
  ('c0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222','Sarah','Mitchell'),
  ('c0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',
   '33333333-3333-3333-3333-333333333333','James','Turner');
INSERT INTO public.contacts VALUES
  ('d0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001',
   '44444444-4444-4444-4444-444444444444','c0000000-0000-0000-0000-000000000001','David','Chen'),
  ('d0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',
   NULL,'c0000000-0000-0000-0000-000000000002','Priya','Kaur'),
  ('d9000000-0000-0000-0000-000000000009','a9000000-0000-0000-0000-000000000009',
   NULL,NULL,'Other','Org');
INSERT INTO public.stock (id, project_id, org_id, lot_number, price, status, agent_id) VALUES
  ('e0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001','101',485000,'Available',
   'c0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001','102',375000,'Available',
   'c0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001','103',425000,'Available',
   'c0000000-0000-0000-0000-000000000002'),
  ('e9000000-0000-0000-0000-000000000009','b9000000-0000-0000-0000-000000000009',
   'a9000000-0000-0000-0000-000000000009','901',500000,'Available',NULL);
-- Legacy-backfill fixture: an exchanged lot with linked buyer + legacy dates.
INSERT INTO public.stock (id, project_id, org_id, lot_number, price, status, agent_id,
  reservation_date, contract_exchanged_date, settlement_date, settlement_status,
  deposit_amount, deposit_paid) VALUES
  ('e0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001','301',680000,'Exchanged',
   'c0000000-0000-0000-0000-000000000001',
   CURRENT_DATE - 30, CURRENT_DATE - 10, CURRENT_DATE + 60, 'finance_approved',
   68000, true);
INSERT INTO public.contact_stock (contact_id, stock_id, project_id, role) VALUES
  ('d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000004',
   'b0000000-0000-0000-0000-000000000001','buyer');
INSERT INTO public.client_documents (id, contact_id, org_id, document_type, file_name) VALUES
  ('f0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001','Trust Receipt','receipt.pdf'),
  ('f9000000-0000-0000-0000-000000000009','d9000000-0000-0000-0000-000000000009',
   'a9000000-0000-0000-0000-000000000009','Trust Receipt','other-org.pdf');
SQL

echo "applying audit ledger migration…"
psql_run < "$AUDIT_MIGRATION"
echo "applying deal spine migration…"
psql_run < "$DEAL_MIGRATION"

echo "running assertions…"
psql_run <<'SQL'
\set ON_ERROR_STOP on

-- ── 0. Backfill created a deal from frozen legacy columns ──
DO $$ DECLARE d record; BEGIN
  SELECT * INTO d FROM public.deals
  WHERE stock_id='e0000000-0000-0000-0000-000000000004';
  IF d IS NULL THEN RAISE EXCEPTION 'FAIL: backfill missing'; END IF;
  IF d.stage <> 'exchanged' OR d.deposit_status <> 'paid'
     OR d.exchanged_date <> CURRENT_DATE - 10
     OR d.settlement_target_date <> CURRENT_DATE + 60
     OR d.finance_status <> 'approved'
     OR d.contact_id <> 'd0000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'FAIL: backfill values wrong: % % %', d.stage, d.deposit_status, d.finance_status;
  END IF;
END $$;

-- ── 1. Staff places a hold ──
SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"am@mproperty.melbourne","role":"authenticated"}', false);
SET ROLE authenticated;
SELECT public.lintel_deal_place_hold(
  'e0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000002', 48, NULL);
RESET ROLE;
DO $$ DECLARE d record; s record; BEGIN
  SELECT * INTO d FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000003' AND stage='reservation';
  IF d IS NULL THEN RAISE EXCEPTION 'FAIL: staff hold not created'; END IF;
  IF d.agent_id <> 'c0000000-0000-0000-0000-000000000002' THEN
    RAISE EXCEPTION 'FAIL: hold should default to lot agent'; END IF;
  IF d.hold_expires_at < now() + interval '47 hours' OR d.hold_expires_at > now() + interval '49 hours' THEN
    RAISE EXCEPTION 'FAIL: hold expiry wrong'; END IF;
  SELECT * INTO s FROM public.stock WHERE id='e0000000-0000-0000-0000-000000000003';
  IF s.status <> 'EOI' THEN RAISE EXCEPTION 'FAIL: stock not moved to EOI'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.contact_stock
                 WHERE stock_id='e0000000-0000-0000-0000-000000000003'
                   AND contact_id='d0000000-0000-0000-0000-000000000002') THEN
    RAISE EXCEPTION 'FAIL: buyer link missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.audit_log WHERE entity_table='deals' AND action='deal.created'
                 AND entity_id=d.id AND actor_auth_user_id='11111111-1111-1111-1111-111111111111') THEN
    RAISE EXCEPTION 'FAIL: deal.created audit row missing'; END IF;
END $$;

-- ── 2. Double reservation blocked ──
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.lintel_deal_place_hold(
      'e0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000001', 24, NULL);
    RAISE EXCEPTION 'FAIL: double reservation allowed';
  EXCEPTION WHEN SQLSTATE '55006' THEN NULL; -- expected
  END;
END $$;
RESET ROLE;

-- ── 3. Agent authorization ──
-- Sarah (agent 1) reserves her own lot for her referred client: OK.
SELECT set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
SET ROLE authenticated;
SELECT public.lintel_deal_place_hold(
  'e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001', 72, NULL);
DO $$ BEGIN
  -- Not her lot (lot 103 belongs to James):
  BEGIN
    PERFORM public.lintel_deal_place_hold(
      'e0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000001', 72, NULL);
    RAISE EXCEPTION 'FAIL: agent reserved another agent''s lot';
  EXCEPTION WHEN insufficient_privilege OR SQLSTATE '55006' THEN NULL;
  END;
  -- Not her referred client (Priya is referred by James):
  BEGIN
    PERFORM public.lintel_deal_place_hold(
      'e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000002', 72, NULL);
    RAISE EXCEPTION 'FAIL: agent reserved for a non-referred client';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- acting_agent_id from a real agent session is ignored (cannot spoof):
  BEGIN
    PERFORM public.lintel_deal_place_hold(
      'e0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000001', 72,
      'c0000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'FAIL: agent spoofed acting_agent_id';
  EXCEPTION WHEN insufficient_privilege OR SQLSTATE '55006' THEN NULL;
  END;
END $$;
RESET ROLE;
DO $$ DECLARE d record; BEGIN
  SELECT * INTO d FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000001' AND stage='reservation';
  IF d IS NULL OR d.agent_id <> 'c0000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'FAIL: agent hold missing or wrong agent attribution'; END IF;
END $$;

-- ── 4. Cross-org staff denial ──
-- Capture the real deal id while privileged: the cross-org test must exercise
-- the RPC's own org check with a valid id (RLS hiding the row is not enough).
CREATE TEMP TABLE _org_a_deal AS
  SELECT id FROM public.deals
  WHERE stock_id='e0000000-0000-0000-0000-000000000001' AND stage='reservation';
GRANT SELECT ON _org_a_deal TO authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}', false);
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.lintel_deal_place_hold(
      'e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000002', 72, NULL);
    RAISE EXCEPTION 'FAIL: cross-org staff placed hold';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- Cross-org staff cannot mutate org A's deal even with a leaked deal id:
  BEGIN
    PERFORM public.lintel_deal_advance_stage(
      (SELECT id FROM _org_a_deal), 'contract_issued', NULL);
    RAISE EXCEPTION 'FAIL: cross-org staff advanced deal';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- RLS additionally hides the row from cross-org reads:
  IF EXISTS (SELECT 1 FROM public.deals WHERE id = (SELECT id FROM _org_a_deal)) THEN
    RAISE EXCEPTION 'FAIL: cross-org staff can read org A deal via RLS';
  END IF;
END $$;
RESET ROLE;

-- ── 5. Concurrency is verified separately (two parallel sessions, see below) ──

-- ── 6. Release hold ──
SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
SET ROLE authenticated;
SELECT public.lintel_deal_release_hold(
  (SELECT id FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000003' AND stage='reservation'),
  'Buyer withdrew');
RESET ROLE;
DO $$ DECLARE d record; s record; BEGIN
  SELECT * INTO d FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000003' AND stage='cancelled';
  IF d IS NULL OR d.cancel_kind <> 'released' OR d.cancel_reason <> 'Buyer withdrew'
     OR d.cancelled_at IS NULL OR d.hold_released_at IS NULL THEN
    RAISE EXCEPTION 'FAIL: release state wrong'; END IF;
  SELECT * INTO s FROM public.stock WHERE id='e0000000-0000-0000-0000-000000000003';
  IF s.status <> 'Available' THEN RAISE EXCEPTION 'FAIL: release did not revert stock'; END IF;
  IF EXISTS (SELECT 1 FROM public.contact_stock WHERE stock_id='e0000000-0000-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'FAIL: release did not unlink buyers'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.audit_log WHERE entity_table='deals' AND action='deal.updated'
                 AND entity_id=d.id AND new_values->>'stage'='cancelled'
                 AND old_values->>'stage'='reservation') THEN
    RAISE EXCEPTION 'FAIL: release audit row missing before/after'; END IF;
END $$;

-- ── 7. Re-reserve after release works; expiry sweep ──
SET ROLE authenticated;
SELECT public.lintel_deal_place_hold(
  'e0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000002', 1, NULL);
RESET ROLE;
-- Backdate the hold administratively (owner bypass — simulates lapse).
UPDATE public.deals SET hold_expires_at = now() - interval '1 minute'
WHERE stock_id='e0000000-0000-0000-0000-000000000003' AND stage='reservation';
SET ROLE authenticated;
SELECT public.lintel_deal_expire_holds();
RESET ROLE;
DO $$ DECLARE d record; s record; BEGIN
  SELECT * INTO d FROM public.deals
  WHERE stock_id='e0000000-0000-0000-0000-000000000003' AND cancel_kind='expired';
  IF d IS NULL OR d.stage <> 'cancelled' THEN RAISE EXCEPTION 'FAIL: expiry sweep missed hold'; END IF;
  SELECT * INTO s FROM public.stock WHERE id='e0000000-0000-0000-0000-000000000003';
  IF s.status <> 'Available' THEN RAISE EXCEPTION 'FAIL: expiry did not revert stock'; END IF;
END $$;

-- ── 8. Stage transitions + stock sync + invalid transition ──
SET ROLE authenticated;
SELECT public.lintel_deal_advance_stage(
  (SELECT id FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000001' AND stage='reservation'),
  'contract_issued', NULL);
DO $$ DECLARE v_id uuid; BEGIN
  SELECT id INTO v_id FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000001' AND stage='contract_issued';
  IF v_id IS NULL THEN RAISE EXCEPTION 'FAIL: advance to contract_issued failed'; END IF;
  BEGIN
    PERFORM public.lintel_deal_advance_stage(v_id, 'settled', NULL); -- skipping exchanged
    RAISE EXCEPTION 'FAIL: illegal transition allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SELECT public.lintel_deal_advance_stage(
  (SELECT id FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000001'),
  'exchanged', NULL);
RESET ROLE;
DO $$ DECLARE d record; s record; BEGIN
  SELECT * INTO d FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000001';
  IF d.stage <> 'exchanged' OR d.exchanged_date <> CURRENT_DATE OR d.contract_issued_date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'FAIL: stage dates not defaulted'; END IF;
  SELECT * INTO s FROM public.stock WHERE id='e0000000-0000-0000-0000-000000000001';
  IF s.status <> 'Exchanged' THEN RAISE EXCEPTION 'FAIL: stock status not synced to Exchanged'; END IF;
END $$;

-- ── 9. Staff detail update: whitelist, enums, trust receipt validation ──
SET ROLE authenticated;
SELECT public.lintel_deal_staff_update(
  (SELECT id FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000001'),
  '{"deposit_amount": 48500, "deposit_due_date": "2026-08-01", "deposit_status": "paid",
    "deposit_paid_date": "2026-07-18", "finance_status": "approved",
    "sunset_date": "2027-12-31",
    "trust_receipt_document_id": "f0000000-0000-0000-0000-000000000001"}'::jsonb);
DO $$ DECLARE v_id uuid; BEGIN
  SELECT id INTO v_id FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000001';
  -- Unknown field rejected:
  BEGIN
    PERFORM public.lintel_deal_staff_update(v_id, '{"stage": "settled"}'::jsonb);
    RAISE EXCEPTION 'FAIL: non-whitelisted field accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- Invalid enum rejected (table CHECK):
  BEGIN
    PERFORM public.lintel_deal_staff_update(v_id, '{"deposit_status": "maybe"}'::jsonb);
    RAISE EXCEPTION 'FAIL: invalid enum accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  -- Another buyer's / another org's document rejected:
  BEGIN
    PERFORM public.lintel_deal_staff_update(v_id,
      '{"trust_receipt_document_id": "f9000000-0000-0000-0000-000000000009"}'::jsonb);
    RAISE EXCEPTION 'FAIL: foreign trust receipt accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
DO $$ DECLARE d record; BEGIN
  SELECT * INTO d FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000001';
  IF d.deposit_amount <> 48500 OR d.deposit_status <> 'paid'
     OR d.trust_receipt_document_id <> 'f0000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'FAIL: staff update not applied'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.audit_log WHERE entity_table='deals' AND entity_id=d.id
                 AND action='deal.updated' AND changed_fields @> ARRAY['deposit_status']) THEN
    RAISE EXCEPTION 'FAIL: deposit change not audited'; END IF;
END $$;

-- ── 10. Agents cannot advance stage or run staff updates ──
SELECT set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
SET ROLE authenticated;
DO $$ DECLARE v_id uuid; BEGIN
  SELECT id INTO v_id FROM public.deals WHERE stock_id='e0000000-0000-0000-0000-000000000001';
  BEGIN
    PERFORM public.lintel_deal_advance_stage(v_id, 'settled', NULL);
    RAISE EXCEPTION 'FAIL: agent advanced stage';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.lintel_deal_staff_update(v_id, '{"deposit_status": "refunded"}'::jsonb);
    RAISE EXCEPTION 'FAIL: agent ran staff update';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.lintel_deal_expire_holds();
    RAISE EXCEPTION 'FAIL: agent ran expire sweep';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- ── 11. Direct table writes denied for API roles ──
SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.deals (org_id, project_id, stock_id, contact_id, hold_expires_at)
    VALUES ('a0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001',
            'e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000001', now());
    RAISE EXCEPTION 'FAIL: direct INSERT allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.deals SET deposit_status='paid';
    RAISE EXCEPTION 'FAIL: direct UPDATE allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.deals;
    RAISE EXCEPTION 'FAIL: direct DELETE allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- ── 12. RLS reads: staff org-scoped; agent own deals; client own deal; anon denied ──
SET ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.deals) < 2 THEN
    RAISE EXCEPTION 'FAIL: staff cannot read own org deals'; END IF;
  IF EXISTS (SELECT 1 FROM public.deals WHERE org_id <> 'a0000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'FAIL: staff sees cross-org deals'; END IF;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
SET ROLE authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.deals WHERE agent_id IS DISTINCT FROM 'c0000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'FAIL: agent sees deals that are not theirs'; END IF;
  IF (SELECT count(*) FROM public.deals) < 1 THEN
    RAISE EXCEPTION 'FAIL: agent cannot see own deals'; END IF;
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', false);
SET ROLE authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.deals WHERE contact_id <> 'd0000000-0000-0000-0000-000000000001') THEN
    RAISE EXCEPTION 'FAIL: client sees other buyers'' deals'; END IF;
  IF (SELECT count(*) FROM public.deals) < 1 THEN
    RAISE EXCEPTION 'FAIL: client cannot see own deal'; END IF;
END $$;
RESET ROLE;

SET ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM count(*) FROM public.deals;
    RAISE EXCEPTION 'FAIL: anon can select deals';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.lintel_deal_place_hold(
      'e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000001', 72, NULL);
    RAISE EXCEPTION 'FAIL: anon can execute place_hold';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- ── 13. Audit ledger remains append-only for deal rows ──
DO $$ BEGIN
  BEGIN
    UPDATE public.audit_log SET action='tampered' WHERE entity_table='deals';
    RAISE EXCEPTION 'FAIL: deal audit rows mutable';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF;
  END;
END $$;

SELECT 'ALL DEAL SPINE ASSERTIONS PASSED' AS result;
SQL

echo "running true-concurrency hold race (two parallel sessions)…"
# Two sessions race to reserve lot 102 for different buyers. Exactly one may win.
RACE_SQL_A="SELECT set_config('request.jwt.claims','{\"sub\":\"11111111-1111-1111-1111-111111111111\",\"role\":\"authenticated\"}',false); SET ROLE authenticated; SELECT public.lintel_deal_place_hold('e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000001',72,NULL);"
RACE_SQL_B="SELECT set_config('request.jwt.claims','{\"sub\":\"11111111-1111-1111-1111-111111111111\",\"role\":\"authenticated\"}',false); SET ROLE authenticated; SELECT public.lintel_deal_place_hold('e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000002',72,NULL);"

set +e
docker exec "$CONTAINER" psql -U postgres -q -c "$RACE_SQL_A" >/tmp/lintel-race-a.out 2>&1 &
PID_A=$!
docker exec "$CONTAINER" psql -U postgres -q -c "$RACE_SQL_B" >/tmp/lintel-race-b.out 2>&1 &
PID_B=$!
wait $PID_A; RC_A=$?
wait $PID_B; RC_B=$?
set -e

if [ $RC_A -eq 0 ] && [ $RC_B -eq 0 ]; then
  echo "FAIL: both concurrent reservations succeeded"; exit 1
fi
if [ $RC_A -ne 0 ] && [ $RC_B -ne 0 ]; then
  echo "FAIL: both concurrent reservations failed"; cat /tmp/lintel-race-a.out /tmp/lintel-race-b.out; exit 1
fi

psql_run <<'SQL'
DO $$ BEGIN
  IF (SELECT count(*) FROM public.deals
      WHERE stock_id='e0000000-0000-0000-0000-000000000002' AND stage <> 'cancelled') <> 1 THEN
    RAISE EXCEPTION 'FAIL: race left other than exactly one active deal'; END IF;
  IF (SELECT status FROM public.stock WHERE id='e0000000-0000-0000-0000-000000000002') <> 'EOI' THEN
    RAISE EXCEPTION 'FAIL: race winner did not move stock to EOI'; END IF;
END $$;
SELECT 'CONCURRENCY RACE PASSED' AS result;
SQL

echo "OK — all deal spine verifications passed"
