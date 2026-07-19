-- FEEZO production hardening migration.
-- Run this through Supabase migrations/SQL editor, not through a public app route.
-- This file intentionally does not create auth users or contain passwords.

create extension if not exists pgcrypto;
create table if not exists public.feezo_users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique,
  email text unique not null,
  name text,
  role text not null default 'user' check (role in ('user', 'superadmin')),
  approved boolean not null default false,
  mobile text,
  company text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postcode text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.feezo_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.feezo_users(id) on delete cascade,
  name text not null,
  project_number text,
  description text,
  country text not null default 'AE',
  currency text not null default 'AED',
  status text not null default 'active',
  shared boolean not null default false,
  data jsonb not null,
  scenarios jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_opened_at timestamptz
);
create table if not exists public.feezo_registration_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  auth_id uuid,
  company text,
  phone text,
  address text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.feezo_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.feezo_users add column if not exists mobile text;
alter table public.feezo_users add column if not exists company text;
alter table public.feezo_users add column if not exists address_line_1 text;
alter table public.feezo_users add column if not exists address_line_2 text;
alter table public.feezo_users add column if not exists city text;
alter table public.feezo_users add column if not exists state text;
alter table public.feezo_users add column if not exists postcode text;
alter table public.feezo_users add column if not exists country text;
alter table public.feezo_projects add column if not exists shared boolean not null default false;
alter table public.feezo_registration_requests add column if not exists company text;
alter table public.feezo_registration_requests add column if not exists phone text;
alter table public.feezo_registration_requests add column if not exists address text;
alter table public.feezo_registration_requests add column if not exists updated_at timestamptz not null default now();
create index if not exists feezo_users_auth_id_idx on public.feezo_users(auth_id);
create index if not exists feezo_users_email_idx on public.feezo_users(lower(email));
create index if not exists feezo_projects_user_updated_idx on public.feezo_projects(user_id, updated_at desc);
create index if not exists feezo_projects_shared_idx on public.feezo_projects(id) where shared = true;
create index if not exists feezo_projects_status_idx on public.feezo_projects(status);
create index if not exists feezo_registration_requests_status_created_idx on public.feezo_registration_requests(status, created_at desc);
create index if not exists feezo_registration_requests_email_idx on public.feezo_registration_requests(lower(email));
alter table public.feezo_users enable row level security;
alter table public.feezo_projects enable row level security;
alter table public.feezo_registration_requests enable row level security;
alter table public.feezo_settings enable row level security;
-- Keep normal client profile edits narrow. Service-role admin routes bypass RLS
-- for privileged changes such as role, approval status, auth_id, and email.
revoke update on public.feezo_users from anon, authenticated;
grant update (
  name,
  mobile,
  company,
  address_line_1,
  address_line_2,
  city,
  state,
  postcode,
  country,
  updated_at
) on public.feezo_users to authenticated;
drop policy if exists feezo_settings_write on public.feezo_settings;
drop policy if exists feezo_settings_read on public.feezo_settings;
drop policy if exists feezo_projects_user_select on public.feezo_projects;
drop policy if exists feezo_projects_user_insert on public.feezo_projects;
drop policy if exists feezo_projects_user_update on public.feezo_projects;
drop policy if exists feezo_projects_user_delete on public.feezo_projects;
drop policy if exists feezo_users_self_select on public.feezo_users;
drop policy if exists feezo_users_self_update on public.feezo_users;
drop policy if exists feezo_users_self_insert on public.feezo_users;
drop policy if exists feezo_registration_requests_no_client_access on public.feezo_registration_requests;
create policy feezo_users_self_select on public.feezo_users
  for select
  using (auth_id = auth.uid());
create policy feezo_users_self_update on public.feezo_users
  for update
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());
create policy feezo_users_self_insert on public.feezo_users
  for insert
  with check (
    auth_id = auth.uid()
    and role = 'user'
    and approved = false
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
create policy feezo_projects_user_select on public.feezo_projects
  for select
  using (
    exists (
      select 1 from public.feezo_users u
      where u.id = feezo_projects.user_id
        and u.auth_id = auth.uid()
        and (u.approved = true or u.role = 'superadmin')
    )
  );
create policy feezo_projects_user_insert on public.feezo_projects
  for insert
  with check (
    exists (
      select 1 from public.feezo_users u
      where u.id = feezo_projects.user_id
        and u.auth_id = auth.uid()
        and (u.approved = true or u.role = 'superadmin')
    )
  );
create policy feezo_projects_user_update on public.feezo_projects
  for update
  using (
    exists (
      select 1 from public.feezo_users u
      where u.id = feezo_projects.user_id
        and u.auth_id = auth.uid()
        and (u.approved = true or u.role = 'superadmin')
    )
  )
  with check (
    exists (
      select 1 from public.feezo_users u
      where u.id = feezo_projects.user_id
        and u.auth_id = auth.uid()
        and (u.approved = true or u.role = 'superadmin')
    )
  );
create policy feezo_projects_user_delete on public.feezo_projects
  for delete
  using (
    exists (
      select 1 from public.feezo_users u
      where u.id = feezo_projects.user_id
        and u.auth_id = auth.uid()
        and (u.approved = true or u.role = 'superadmin')
    )
  );
-- Registration requests are written/read by server routes using the service role only.
-- This deny policy documents the intent for anon/authenticated clients.
create policy feezo_registration_requests_no_client_access on public.feezo_registration_requests
  for all
  using (false)
  with check (false);
create policy feezo_settings_public_read on public.feezo_settings
  for select
  using (true);
insert into public.feezo_settings (key, value) values
  ('feature_flags', '{"enableSharing": true, "enableScenarios": true, "enableTenancy": true, "enableBanking": true, "enableCustomReports": true, "maxProjectsPerUser": 50, "maintenanceMode": false}'),
  ('announcement', '{"text": "", "enabled": false}')
on conflict (key) do nothing;
