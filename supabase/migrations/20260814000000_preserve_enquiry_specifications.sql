alter table public.enquiry_items
  add column if not exists specification text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enquiry_items_specification_length'
      and conrelid = 'public.enquiry_items'::regclass
  ) then
    alter table public.enquiry_items
      add constraint enquiry_items_specification_length
      check (specification is null or char_length(specification) <= 500);
  end if;
end
$$;

create or replace function public.submit_enquiry(
  p_customer_name text,
  p_phone text,
  p_business_name text,
  p_location text,
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$
declare
  v_id uuid := gen_random_uuid();
  v_reference text;
  v_phone text;
  v_item jsonb;
  v_product public.products%rowtype;
  v_product_id bigint;
  v_qty integer;
  v_specification text;
  v_duplicate public.enquiries%rowtype;
  v_customer_id uuid;
begin
  v_phone := regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g');
  if length(regexp_replace(v_phone,'[^0-9]','','g')) < 7 or length(regexp_replace(v_phone,'[^0-9]','','g')) > 15 then raise exception 'Enter a valid phone number'; end if;
  if p_customer_name is not null and length(trim(p_customer_name)) > 120 then raise exception 'Name is too long'; end if;
  if p_business_name is not null and length(trim(p_business_name)) > 160 then raise exception 'Business name is too long'; end if;
  if p_location is not null and length(trim(p_location)) > 180 then raise exception 'Location is too long'; end if;
  if p_notes is not null and length(trim(p_notes)) > 1200 then raise exception 'Notes are too long'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then raise exception 'Your request cart is empty'; end if;
  if jsonb_array_length(p_items) > 30 then raise exception 'A request can contain at most 30 products'; end if;

  select * into v_duplicate from public.enquiries
  where private.normalize_customer_phone(phone)=private.normalize_customer_phone(v_phone)
    and created_at > now()-interval '20 seconds'
  order by created_at desc limit 1;
  if found then return jsonb_build_object('id',v_duplicate.id,'reference_code',v_duplicate.reference_code,'duplicate',true); end if;

  v_customer_id := private.upsert_customer(p_customer_name,v_phone,p_business_name,p_location);
  v_reference := 'YK-' || to_char(now() at time zone 'Asia/Kathmandu','YYMMDD') || '-' || upper(substr(replace(v_id::text,'-',''),1,6));

  insert into public.enquiries(id,reference_code,customer_id,customer_name,phone,business_name,location,notes,status,source)
  values(v_id,v_reference,v_customer_id,nullif(left(trim(coalesce(p_customer_name,'')),120),''),left(v_phone,20),nullif(left(trim(coalesce(p_business_name,'')),160),''),nullif(left(trim(coalesce(p_location,'')),180),''),nullif(left(trim(coalesce(p_notes,'')),1200),''),'new','website');

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'id','') !~ '^[0-9]+$' then raise exception 'Invalid product in request'; end if;
    v_product_id := (v_item->>'id')::bigint;
    if coalesce(v_item->>'qty','') ~ '^[0-9]+$' then v_qty := (v_item->>'qty')::integer; else v_qty := 1; end if;
    v_qty := greatest(1,least(999,v_qty));
    v_specification := nullif(trim(coalesce(v_item->>'specification', v_item->>'variant', '')), '');
    if v_specification is not null and char_length(v_specification) > 500 then raise exception 'Specification is too long'; end if;
    select * into v_product from public.products where id=v_product_id and active=true;
    if not found then raise exception 'A requested product is no longer available'; end if;
    insert into public.enquiry_items(enquiry_id,product_id,product_name,quantity,specification)
    values(v_id,v_product.id,v_product.name,v_qty,v_specification);
  end loop;
  return jsonb_build_object('id',v_id,'reference_code',v_reference,'duplicate',false);
end;
$function$;
