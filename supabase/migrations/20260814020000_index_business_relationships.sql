-- Index the foreign-key relationships used by YK's operational screens and
-- reports. Low-value created_by audit columns are intentionally left unindexed
-- to avoid adding write overhead without a corresponding query pattern.
create index if not exists cash_transactions_expense_category_id_idx
  on public.cash_transactions (expense_category_id);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create index if not exists order_items_product_id_idx
  on public.order_items (product_id);

create index if not exists orders_enquiry_id_idx
  on public.orders (enquiry_id);

create index if not exists purchase_order_items_purchase_order_id_idx
  on public.purchase_order_items (purchase_order_id);

create index if not exists purchase_order_items_product_id_idx
  on public.purchase_order_items (product_id);

create index if not exists purchase_orders_supplier_id_idx
  on public.purchase_orders (supplier_id);

create index if not exists quotation_items_quotation_id_idx
  on public.quotation_items (quotation_id);

create index if not exists quotation_items_product_id_idx
  on public.quotation_items (product_id);

create index if not exists quotations_enquiry_id_idx
  on public.quotations (enquiry_id);

create index if not exists sales_invoice_items_product_id_idx
  on public.sales_invoice_items (product_id);
