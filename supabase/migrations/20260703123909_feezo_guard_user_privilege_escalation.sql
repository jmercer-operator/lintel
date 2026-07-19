-- Blocks self-escalation on feezo_users: a signed-in user can no longer
-- change their own `role` or `approved` columns. Admin approvals still work
-- because the service role (admin backend / edge functions) is exempted.

CREATE OR REPLACE FUNCTION public.feezo_guard_user_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_is_superadmin boolean;
BEGIN
  -- Service role (server-side admin path) may change anything.
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Only intervene if a protected column is actually changing.
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.approved IS DISTINCT FROM OLD.approved THEN

    SELECT EXISTS (
      SELECT 1 FROM public.feezo_users u
      WHERE u.auth_id = auth.uid()
        AND u.role = 'superadmin'
    ) INTO caller_is_superadmin;

    IF NOT caller_is_superadmin THEN
      RAISE EXCEPTION 'Not authorised to modify role or approval status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feezo_users_guard_privileges ON public.feezo_users;

CREATE TRIGGER feezo_users_guard_privileges
  BEFORE UPDATE ON public.feezo_users
  FOR EACH ROW
  EXECUTE FUNCTION public.feezo_guard_user_privileges();;
