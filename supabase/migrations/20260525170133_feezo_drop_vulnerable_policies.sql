DROP POLICY IF EXISTS feezo_users_all ON public.feezo_users;
DROP POLICY IF EXISTS feezo_projects_all ON public.feezo_projects;
DROP POLICY IF EXISTS feezo_reg_all ON public.feezo_registration_requests;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;;
