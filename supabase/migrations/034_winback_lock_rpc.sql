-- Harden win-back RPCs: their internal guard only enforces owner/staff when
-- auth.uid() is set, so an anonymous PostgREST caller (auth.uid() = null) would
-- bypass it and read customer PII. Restrict EXECUTE to signed-in users and the
-- trusted service role only.
revoke execute on function at_risk_customers(uuid, int) from public, anon;
revoke execute on function winback_stats(uuid) from public, anon;
grant execute on function at_risk_customers(uuid, int) to authenticated, service_role;
grant execute on function winback_stats(uuid) to authenticated, service_role;
