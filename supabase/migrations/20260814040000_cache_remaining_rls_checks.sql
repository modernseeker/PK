-- Cache stable authorization helpers once per statement instead of once per row.
alter policy "admins manage credit securities"
  on public.credit_securities
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "yk email can enroll admin"
  on public.admin_profiles
  to authenticated
  with check (
    user_id = (select auth.uid())
    and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'ykelectricnepal@gmail.com'
  );
