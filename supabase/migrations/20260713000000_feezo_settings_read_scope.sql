-- Scope the public settings read policy to the known public keys.
--
-- The original policy (`using (true)`) exposed every row in feezo_settings to
-- anon/authenticated clients. Only feature_flags and announcement are meant to
-- be public; any future operational/internal settings rows must stay
-- service-role only by default (fail closed).

drop policy if exists feezo_settings_public_read on public.feezo_settings;
create policy feezo_settings_public_read on public.feezo_settings
  for select
  using (key in ('feature_flags', 'announcement'));
