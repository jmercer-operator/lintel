-- FEEZO tokenized share links.
--
-- NOT YET APPLIED TO THE LIVE DATABASE. Apply manually through Supabase
-- migrations/SQL editor BEFORE deploying the app code that ships alongside
-- this file (the public route looks up share_token only; the old raw-UUID
-- lookup is removed).
--
-- Effect on existing links: previously shared projects stay shared and are
-- backfilled with fresh tokens, but their old /shared/<project-uuid> URLs
-- stop working. Owners copy the new link from the project list (the share
-- button on an already-shared project re-copies the current link).

-- Opaque public token. Unique index doubles as the public-route lookup index.
create extension if not exists pgcrypto with schema extensions;
alter table public.feezo_projects
  add column if not exists share_token text unique;
-- Defence in depth: only server-minted 48-char lowercase-hex tokens are valid,
-- so a project UUID (hyphenated) can never be stored or matched as a token.
alter table public.feezo_projects
  drop constraint if exists feezo_projects_share_token_format;
alter table public.feezo_projects
  add constraint feezo_projects_share_token_format
  check (share_token is null or share_token ~ '^[0-9a-f]{48}$');
-- Backfill: keep currently-shared projects shared under fresh tokens.
update public.feezo_projects
  set share_token = encode(extensions.gen_random_bytes(24), 'hex')
  where shared = true and share_token is null;
-- The old partial index served raw-UUID public lookups; no longer used.
drop index if exists feezo_projects_shared_idx;
-- Share state becomes server-managed only (/api/shared-projects with the
-- service role). Clients keep column-scoped update rights for normal editing,
-- but can no longer flip `shared` or write `share_token` directly. RLS row
-- policies (owner-only) remain unchanged and still apply on top.
revoke update on public.feezo_projects from anon, authenticated;
grant update (
  name,
  project_number,
  description,
  country,
  currency,
  status,
  data,
  scenarios,
  updated_at,
  last_opened_at
) on public.feezo_projects to authenticated;
-- Same for inserts: a client must not be able to create a row that is already
-- shared or carries a self-chosen token. `shared` defaults to false and
-- `share_token` to null. (Client insert code must not send `shared` anymore.)
revoke insert on public.feezo_projects from anon, authenticated;
grant insert (
  user_id,
  name,
  project_number,
  description,
  country,
  currency,
  status,
  data,
  scenarios,
  updated_at,
  last_opened_at
) on public.feezo_projects to authenticated;
