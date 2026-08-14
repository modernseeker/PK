-- Scope catalog policies to the roles that actually use them. This avoids
-- evaluating admin authorization for anonymous storefront reads and removes
-- overlapping permissive SELECT policies.

alter policy "admin manage app config"
  on public.app_config
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "admin read app config"
  on public.app_config;

alter policy "admin manage brands"
  on public.brands
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "public read brands"
  on public.brands
  to anon
  using (active = true);

alter policy "admin manage categories"
  on public.categories
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "public read categories"
  on public.categories
  to anon
  using (active = true);

alter policy "admin manage trending"
  on public.homepage_trending
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "public read trending"
  on public.homepage_trending
  to anon
  using (true);

alter policy "admin manage products"
  on public.products
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "public read products"
  on public.products
  to anon
  using (active = true);

alter policy "admin manage settings"
  on public.store_settings
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

alter policy "public read settings"
  on public.store_settings
  to anon
  using (true);
