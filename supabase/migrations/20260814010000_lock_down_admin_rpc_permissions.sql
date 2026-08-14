-- Keep admin RPCs callable only by signed-in users and server-side clients.
-- Each user-facing admin RPC also performs its own private.is_admin() check.
revoke execute on function public.adjust_inventory(bigint, numeric, text, text, text, text)
  from public, anon;
grant execute on function public.adjust_inventory(bigint, numeric, text, text, text, text)
  to authenticated, service_role;

revoke execute on function public.adjust_stock(bigint, text, numeric, numeric, text)
  from public, anon;
grant execute on function public.adjust_stock(bigint, text, numeric, numeric, text)
  to authenticated, service_role;

revoke execute on function public.convert_quotation_to_order(uuid)
  from public, anon;
grant execute on function public.convert_quotation_to_order(uuid)
  to authenticated, service_role;

revoke execute on function public.management_accounts_report(date)
  from public, anon;
grant execute on function public.management_accounts_report(date)
  to authenticated, service_role;

revoke execute on function public.party_ledger_report(text, uuid, date, date)
  from public, anon;
grant execute on function public.party_ledger_report(text, uuid, date, date)
  to authenticated, service_role;

revoke execute on function public.set_inventory_balance(bigint, numeric, numeric, numeric, text, boolean, text)
  from public, anon;
grant execute on function public.set_inventory_balance(bigint, numeric, numeric, numeric, text, boolean, text)
  to authenticated, service_role;

-- The base report is an implementation detail called by the checked wrapper.
revoke execute on function public.management_accounts_report_base(date)
  from public, anon, authenticated;
grant execute on function public.management_accounts_report_base(date)
  to service_role;

-- Retire the unused legacy overload without dropping it. The current storefront
-- uses the six-argument overload below and still requires anonymous access.
revoke execute on function public.submit_enquiry(uuid, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_enquiry(uuid, text, text, text, text, text, jsonb)
  to service_role;

-- Preserve the intentionally public, validated storefront enquiry endpoint.
revoke execute on function public.submit_enquiry(text, text, text, text, text, jsonb)
  from public;
grant execute on function public.submit_enquiry(text, text, text, text, text, jsonb)
  to anon, authenticated, service_role;
