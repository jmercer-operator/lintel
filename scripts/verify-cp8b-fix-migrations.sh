#!/usr/bin/env bash
# Local-only verification of the 2026-07-20 fix migrations:
#   20260720020000_lintel_client_document_types.sql
#   20260720021000_lintel_client_documents_project_nullable.sql
#   20260720022000_lintel_contacts_agent_select_returning.sql
#
# Spins up a throwaway Postgres container, stubs the minimum Supabase
# environment (roles, auth.uid(), phase-4 helper functions, original CP5a
# client_documents constraint, original contacts RLS policies), reproduces
# each bug first, applies the three migrations, then asserts:
#   - agent INSERT ... RETURNING on contacts succeeds (was blocked by the
#     SELECT-policy snapshot problem)
#   - agents still cannot see other agents' contacts
#   - the linked-stock access path through lintel_agent_can_access_contact()
#     still works
#   - client_documents accepts display-label document types and NULL
#     project_id, and rejects the retired CP5a slugs
# Never touches any remote Supabase project.
#
# Usage: ./scripts/verify-cp8b-fix-migrations.sh

set -euo pipefail

cd "$(dirname "$0")/.."

MIG_TYPES="supabase/migrations/20260720020000_lintel_client_document_types.sql"
MIG_NULLABLE="supabase/migrations/20260720021000_lintel_client_documents_project_nullable.sql"
MIG_POLICY="supabase/migrations/20260720022000_lintel_contacts_agent_select_returning.sql"
CONTAINER="lintel-fixmig-verify"
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

echo "creating Supabase environment stub (pre-fix state)…"
psql_run <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
$$;

CREATE TABLE public.organisations (id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE public.projects (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  name text NOT NULL
);
CREATE TABLE public.agents (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  auth_user_id uuid UNIQUE,
  first_name text
);
CREATE TABLE public.agent_projects (
  agent_id uuid NOT NULL REFERENCES public.agents(id),
  project_id uuid NOT NULL REFERENCES public.projects(id)
);
CREATE TABLE public.stock (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id),
  agent_id uuid REFERENCES public.agents(id)
);
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  referring_agent_id uuid REFERENCES public.agents(id),
  auth_user_id uuid
);
CREATE TABLE public.contact_stock (
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  stock_id uuid NOT NULL REFERENCES public.stock(id),
  project_id uuid REFERENCES public.projects(id)
);

-- client_documents in its pre-fix remote shape: CP5a slug constraint and
-- an out-of-band NOT NULL on project_id.
CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id),
  org_id uuid NOT NULL REFERENCES public.organisations(id),
  name text,
  document_type text NOT NULL,
  file_name text,
  file_path text,
  file_size bigint,
  mime_type text,
  stock_id uuid,
  project_id uuid NOT NULL,
  visibility text,
  uploaded_by uuid,
  CONSTRAINT client_documents_document_type_check CHECK (document_type IN (
    'signed_contract', 'id_document', 'proof_of_funds',
    'solicitor_letter', 'deposit_receipt', 'other'
  ))
);

-- Phase-4 helper functions (real definitions from 20260703214200)
CREATE OR REPLACE FUNCTION public.lintel_agent_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT a.id FROM public.agents a WHERE a.auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.lintel_agent_in_org(target_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = public.lintel_agent_id() AND a.org_id = target_org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.lintel_agent_assigned_project(target_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT target_project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.agent_projects ap
        WHERE ap.agent_id = public.lintel_agent_id()
          AND ap.project_id = target_project_id
      )
      OR EXISTS (
        SELECT 1 FROM public.stock s
        WHERE s.agent_id = public.lintel_agent_id()
          AND s.project_id = target_project_id
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.lintel_agent_can_access_contact(target_contact_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT target_contact_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.contacts c
        WHERE c.id = target_contact_id
          AND c.referring_agent_id = public.lintel_agent_id()
      )
      OR EXISTS (
        SELECT 1
        FROM public.contact_stock cs
        JOIN public.stock s ON s.id = cs.stock_id
        WHERE cs.contact_id = target_contact_id
          AND (
            s.agent_id = public.lintel_agent_id()
            OR public.lintel_agent_assigned_project(s.project_id)
          )
      )
    )
$$;

GRANT EXECUTE ON FUNCTION public.lintel_agent_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_agent_in_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_agent_assigned_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lintel_agent_can_access_contact(uuid) TO authenticated;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.contacts TO authenticated;

-- Original (pre-fix) contacts policies from 20260703214200
CREATE POLICY lintel_contacts_agent_select ON contacts
  FOR SELECT USING (public.lintel_agent_can_access_contact(id));

CREATE POLICY lintel_contacts_agent_insert ON contacts
  FOR INSERT WITH CHECK (
    public.lintel_agent_in_org(org_id)
    AND referring_agent_id = public.lintel_agent_id()
  );

-- Seed: one org, two agents, one lot owned by agent B, one contact linked
-- to that lot but referred by nobody (exercises the linked-stock path).
INSERT INTO organisations VALUES ('11111111-1111-1111-1111-111111111111', 'Org One');
INSERT INTO projects VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Project P');
INSERT INTO agents VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
   'a1111111-1111-1111-1111-111111111111', 'Agent A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
   'b1111111-1111-1111-1111-111111111111', 'Agent B');
INSERT INTO stock VALUES
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
INSERT INTO contacts (id, org_id, first_name, last_name, referring_agent_id) VALUES
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111',
   'Linked', 'ViaStock', NULL);
INSERT INTO contact_stock VALUES
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333',
   '22222222-2222-2222-2222-222222222222');
SQL

echo "reproducing the three bugs against pre-fix state…"
psql_run <<'SQL'
-- Bug 3 repro: agent INSERT ... RETURNING blocked by SELECT policy snapshot
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111"}';
DO $do$
DECLARE cid uuid;
BEGIN
  INSERT INTO contacts (org_id, first_name, last_name, referring_agent_id)
  VALUES ('11111111-1111-1111-1111-111111111111', 'New', 'Buyer',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  RETURNING id INTO cid;
  RAISE EXCEPTION 'REPRO FAILED: pre-fix INSERT..RETURNING unexpectedly succeeded (id=%)', cid;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'repro OK (contacts): %', SQLERRM;
END
$do$;
RESET ROLE;
RESET request.jwt.claims;

-- Bug 1 repro: display-label document type rejected by CP5a slug constraint
DO $do$
BEGIN
  INSERT INTO client_documents (contact_id, org_id, document_type, project_id)
  VALUES ('44444444-4444-4444-4444-444444444444',
          '11111111-1111-1111-1111-111111111111',
          'Trust Receipt', '22222222-2222-2222-2222-222222222222');
  RAISE EXCEPTION 'REPRO FAILED: pre-fix constraint accepted display label';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'repro OK (document_type): %', SQLERRM;
END
$do$;

-- Bug 2 repro: NULL project_id rejected
DO $do$
BEGIN
  INSERT INTO client_documents (contact_id, org_id, document_type, project_id)
  VALUES ('44444444-4444-4444-4444-444444444444',
          '11111111-1111-1111-1111-111111111111',
          'signed_contract', NULL);
  RAISE EXCEPTION 'REPRO FAILED: pre-fix NOT NULL accepted NULL project_id';
EXCEPTION WHEN not_null_violation THEN
  RAISE NOTICE 'repro OK (project_id): %', SQLERRM;
END
$do$;
SQL

echo "applying fix migrations…"
psql_run < "$MIG_TYPES"
psql_run < "$MIG_NULLABLE"
psql_run < "$MIG_POLICY"

echo "asserting post-fix behavior…"
psql_run <<'SQL'
-- Fix 3: agent INSERT ... RETURNING now succeeds and the row is readable
SET ROLE authenticated;
SET request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111"}';
DO $do$
DECLARE cid uuid; n int;
BEGIN
  INSERT INTO contacts (org_id, first_name, last_name, referring_agent_id)
  VALUES ('11111111-1111-1111-1111-111111111111', 'New', 'Buyer',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  RETURNING id INTO cid;
  IF cid IS NULL THEN
    RAISE EXCEPTION 'FAIL: INSERT..RETURNING returned NULL id';
  END IF;
  SELECT count(*) INTO n FROM contacts WHERE id = cid;
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: agent cannot re-select own inserted contact';
  END IF;
  RAISE NOTICE 'fix OK: agent INSERT..RETURNING + re-select succeeded';
END
$do$;

-- Isolation: agent B must not see agent A's referred contact
SET request.jwt.claims = '{"sub": "b1111111-1111-1111-1111-111111111111"}';
DO $do$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM contacts
  WHERE referring_agent_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  IF n <> 0 THEN
    RAISE EXCEPTION 'FAIL: agent B can see agent A''s contacts (%)', n;
  END IF;
  RAISE NOTICE 'isolation OK: agent B sees 0 of agent A''s contacts';
END
$do$;

-- Linked-stock path retained: agent B sees the contact linked to their lot
DO $do$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM contacts
  WHERE id = '44444444-4444-4444-4444-444444444444';
  IF n <> 1 THEN
    RAISE EXCEPTION 'FAIL: linked-stock access path broken (saw % rows)', n;
  END IF;
  RAISE NOTICE 'fix OK: linked-stock contact access path retained';
END
$do$;
RESET ROLE;
RESET request.jwt.claims;

-- Fixes 1+2: display labels + NULL project_id accepted, old slugs rejected
DO $do$
BEGIN
  INSERT INTO client_documents (contact_id, org_id, document_type, project_id)
  VALUES ('44444444-4444-4444-4444-444444444444',
          '11111111-1111-1111-1111-111111111111', 'Trust Receipt', NULL);
  INSERT INTO client_documents (contact_id, org_id, document_type, project_id)
  VALUES ('44444444-4444-4444-4444-444444444444',
          '11111111-1111-1111-1111-111111111111', 'Exchanged Contract',
          '22222222-2222-2222-2222-222222222222');
  RAISE NOTICE 'fix OK: display-label types + NULL project_id accepted';
END
$do$;

DO $do$
BEGIN
  INSERT INTO client_documents (contact_id, org_id, document_type, project_id)
  VALUES ('44444444-4444-4444-4444-444444444444',
          '11111111-1111-1111-1111-111111111111', 'signed_contract', NULL);
  RAISE EXCEPTION 'FAIL: retired CP5a slug still accepted';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'fix OK: retired slug rejected: %', SQLERRM;
END
$do$;

SELECT 'ALL FIX MIGRATION ASSERTIONS PASSED' AS result;
SQL

echo "OK — all fix-migration verifications passed"
