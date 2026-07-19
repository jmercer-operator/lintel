-- FEEZO project write guards: server-side project limit + duplicate-name guard.
--
-- Why a trigger and not client code: projects are created/duplicated by the
-- browser writing straight to feezo_projects through RLS (components/
-- project-list.tsx). Any client-side maxProjectsPerUser check is advisory —
-- a user with a valid session token can insert unlimited rows via the REST
-- API. This trigger is the authoritative enforcement point.
--
-- Why a trigger and not a unique index for names: live data may already
-- contain case-insensitive duplicate names, so `create unique index` could
-- fail on apply and silently blocks nothing until then. The trigger only
-- rejects NEW duplicates (insert, or update that changes the name), which is
-- exactly the behaviour the client already promises via lib/project-names.ts
-- and the autosave duplicate pre-check. See
-- supabase/DESIGN-project-name-uniqueness.md for the eventual index plan.
--
-- Error contract (stable tokens the client matches on):
--   PROJECT_LIMIT_REACHED  (errcode 23514) — per-user project cap hit
--   PROJECT_NAME_TAKEN     (errcode 23505) — case-insensitive duplicate name
--   PROJECT_NAME_REQUIRED  (errcode 23514) — blank/whitespace-only name
--
-- Limit semantics mirror the existing client + admin route behaviour:
--   * read from feezo_settings key 'feature_flags' -> maxProjectsPerUser
--   * non-numeric/missing -> default 50; clamped to [1, 500]
--     (same clamp as app/api/admin/settings/route.ts via lib/project-limit.ts)
--   * ALL of the user's projects count, including archived — this matches the
--     client check (projects.length) so UX and enforcement agree.

create or replace function public.feezo_projects_write_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_raw_limit text;
  v_limit integer := 50;
  v_count integer;
begin
  new.name := btrim(coalesce(new.name, ''));
  if new.name = '' then
    raise exception 'PROJECT_NAME_REQUIRED: project name cannot be empty'
      using errcode = '23514';
  end if;

  -- Data-only autosave updates (name unchanged) skip the guards entirely so
  -- the per-user lock below never serialises routine saves.
  if tg_op = 'UPDATE' and lower(new.name) = lower(old.name) then
    return new;
  end if;

  -- Serialise limit/name checks per user so concurrent inserts cannot race
  -- past the count or the duplicate check inside the same window.
  perform pg_advisory_xact_lock(
    hashtextextended('feezo_projects_write_guard:' || new.user_id::text, 0)
  );

  if tg_op = 'INSERT' then
    select value ->> 'maxProjectsPerUser'
      into v_raw_limit
      from public.feezo_settings
     where key = 'feature_flags';

    if v_raw_limit ~ '^-?[0-9]+(\.[0-9]+)?$' then
      v_limit := least(greatest(round(v_raw_limit::numeric)::integer, 1), 500);
    end if;

    select count(*)::integer
      into v_count
      from public.feezo_projects
     where user_id = new.user_id;

    if v_count >= v_limit then
      raise exception
        'PROJECT_LIMIT_REACHED: this account already has % of % allowed projects',
        v_count, v_limit
        using errcode = '23514';
    end if;
  end if;

  if exists (
    select 1
      from public.feezo_projects p
     where p.user_id = new.user_id
       and p.id <> new.id
       and lower(p.name) = lower(new.name)
  ) then
    raise exception 'PROJECT_NAME_TAKEN: a project named "%" already exists', new.name
      using errcode = '23505';
  end if;

  return new;
end;
$$;
-- Lock down direct execution; the trigger runs it regardless of grants.
revoke all on function public.feezo_projects_write_guard() from public, anon, authenticated;
drop trigger if exists feezo_projects_write_guard on public.feezo_projects;
create trigger feezo_projects_write_guard
  before insert or update of name on public.feezo_projects
  for each row execute function public.feezo_projects_write_guard();
