-- The event trigger function is only ever run by Postgres itself. Nobody
-- should be able to reach it through /rest/v1/rpc.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
