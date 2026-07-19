-- FEEZO billing entitlements.
-- Adds Stripe subscription state and enforces paid/trial access at the project RLS layer.

alter table public.feezo_users add column if not exists stripe_customer_id text unique;
alter table public.feezo_users add column if not exists billing_status text not null default 'none';
alter table public.feezo_users add column if not exists billing_plan text;
alter table public.feezo_users add column if not exists billing_price_id text;
alter table public.feezo_users add column if not exists billing_access_until timestamptz;
alter table public.feezo_users add column if not exists billing_trial_ends_at timestamptz;
alter table public.feezo_users add column if not exists billing_current_period_ends_at timestamptz;
alter table public.feezo_users add column if not exists billing_cancel_at_period_end boolean not null default false;
alter table public.feezo_users add column if not exists billing_updated_at timestamptz;
-- Preserve controlled beta/internal access for already-approved users when the
-- billing gate is first introduced. Future public users should come through
-- Stripe trial/subscription state instead.
update public.feezo_users
set
  billing_access_until = coalesce(billing_access_until, now() + interval '30 days'),
  billing_updated_at = coalesce(billing_updated_at, now()),
  updated_at = now()
where approved = true
  and role <> 'superadmin'
  and billing_access_until is null
  and billing_status = 'none';
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'feezo_users_billing_status_check'
  ) then
    alter table public.feezo_users
      add constraint feezo_users_billing_status_check
      check (billing_status in (
        'none',
        'checkout_started',
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused'
      ));
  end if;
end $$;
create table if not exists public.feezo_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.feezo_users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text,
  stripe_product_id text,
  status text not null,
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.feezo_billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  user_id uuid references public.feezo_users(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text,
  livemode boolean not null default false,
  payload jsonb not null default '{}',
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists feezo_users_stripe_customer_id_idx on public.feezo_users(stripe_customer_id);
create index if not exists feezo_users_billing_status_idx on public.feezo_users(billing_status);
create index if not exists feezo_subscriptions_user_id_idx on public.feezo_subscriptions(user_id);
create index if not exists feezo_subscriptions_customer_idx on public.feezo_subscriptions(stripe_customer_id);
create index if not exists feezo_subscriptions_status_idx on public.feezo_subscriptions(status);
create index if not exists feezo_billing_events_user_created_idx on public.feezo_billing_events(user_id, created_at desc);
create index if not exists feezo_billing_events_type_created_idx on public.feezo_billing_events(event_type, created_at desc);
alter table public.feezo_subscriptions enable row level security;
alter table public.feezo_billing_events enable row level security;
drop policy if exists feezo_subscriptions_self_select on public.feezo_subscriptions;
drop policy if exists feezo_subscriptions_no_client_write on public.feezo_subscriptions;
drop policy if exists feezo_billing_events_no_client_access on public.feezo_billing_events;
create policy feezo_subscriptions_self_select on public.feezo_subscriptions
  for select
  using (
    exists (
      select 1
      from public.feezo_users u
      where u.id = feezo_subscriptions.user_id
        and u.auth_id = auth.uid()
    )
  );
create policy feezo_subscriptions_no_client_write on public.feezo_subscriptions
  for all
  using (false)
  with check (false);
create policy feezo_billing_events_no_client_access on public.feezo_billing_events
  for all
  using (false)
  with check (false);
create or replace function public.feezo_user_has_app_access(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.feezo_users u
    where u.id = target_user_id
      and (
        u.role = 'superadmin'
        or (
          u.approved = true
          and (
            u.billing_status in ('trialing', 'active')
            or (u.billing_access_until is not null and u.billing_access_until > now())
          )
        )
      )
  );
$$;
revoke all on function public.feezo_user_has_app_access(uuid) from public;
grant execute on function public.feezo_user_has_app_access(uuid) to anon, authenticated;
drop policy if exists feezo_projects_user_select on public.feezo_projects;
drop policy if exists feezo_projects_user_insert on public.feezo_projects;
drop policy if exists feezo_projects_user_update on public.feezo_projects;
drop policy if exists feezo_projects_user_delete on public.feezo_projects;
create policy feezo_projects_user_select on public.feezo_projects
  for select
  using (
    exists (
      select 1 from public.feezo_users u
      where u.id = feezo_projects.user_id
        and u.auth_id = auth.uid()
        and public.feezo_user_has_app_access(u.id)
    )
  );
create policy feezo_projects_user_insert on public.feezo_projects
  for insert
  with check (
    exists (
      select 1 from public.feezo_users u
      where u.id = feezo_projects.user_id
        and u.auth_id = auth.uid()
        and public.feezo_user_has_app_access(u.id)
    )
  );
create policy feezo_projects_user_update on public.feezo_projects
  for update
  using (
    exists (
      select 1 from public.feezo_users u
      where u.id = feezo_projects.user_id
        and u.auth_id = auth.uid()
        and public.feezo_user_has_app_access(u.id)
    )
  )
  with check (
    exists (
      select 1 from public.feezo_users u
      where u.id = feezo_projects.user_id
        and u.auth_id = auth.uid()
        and public.feezo_user_has_app_access(u.id)
    )
  );
create policy feezo_projects_user_delete on public.feezo_projects
  for delete
  using (
    exists (
      select 1 from public.feezo_users u
      where u.id = feezo_projects.user_id
        and u.auth_id = auth.uid()
        and public.feezo_user_has_app_access(u.id)
    )
  );
