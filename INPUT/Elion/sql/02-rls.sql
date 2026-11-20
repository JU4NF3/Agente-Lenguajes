-- ============================================================
--  ELION · 02 · SEGURIDAD: RLS Y PERMISOS
--  Ejecutar después de 01-tables.sql.
--  Regla de oro (igual que Supabase-1): el navegador solo puede hacer
--  lo que estas políticas permiten. Total, stock y estado los cambia
--  la base (funciones y triggers), nunca el navegador.
-- ============================================================

-- ¿El usuario con sesión es admin? security definer: lee admins sin
-- chocar con el RLS de admins (si no, la política se llamaría a sí misma).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where id = (select auth.uid()));
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- 1) ACTIVAR RLS EN TODAS LAS TABLAS ----------
alter table public.admins               enable row level security;
alter table public.customers            enable row level security;
alter table public.products             enable row level security;
alter table public.product_sizes        enable row level security;
alter table public.shipping_methods     enable row level security;
alter table public.coupons              enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;

-- ---------- 2) PERMISOS POR COLUMNA ----------
-- Supabase da TODO a anon/authenticated por defecto. Se quita y se da
-- solo lo necesario: así un permiso por columna (ej. solo "quantity")
-- de verdad limita lo que se puede cambiar.
revoke all on all tables in schema public from anon, authenticated;

-- catálogo: lo ve cualquiera, incluso sin sesión
grant select on public.products, public.product_sizes, public.shipping_methods to anon, authenticated;
-- el admin lo administra (el RLS de abajo deja escribir solo a admins)
grant insert, update, delete on public.products, public.product_sizes, public.shipping_methods to authenticated;
grant select, insert, update, delete on public.coupons to authenticated;

-- perfiles
grant select on public.admins to authenticated;
grant select on public.customers to authenticated;
grant update (full_name, doc_number, phone, department, city, address) on public.customers to authenticated;

-- pedidos: el cliente solo CREA su carrito; el admin solo cambia estado y motivo
grant select on public.orders to authenticated;
grant insert (customer_id) on public.orders to authenticated;
grant update (status, cancel_reason) on public.orders to authenticated;

-- líneas del carrito: nunca el precio (lo pone la base al confirmar)
grant select, delete on public.order_items to authenticated;
grant insert (order_id, product_id, size, quantity) on public.order_items to authenticated;
grant update (quantity) on public.order_items to authenticated;

grant select on public.order_status_history to authenticated;
grant select on public.orders_with_total to authenticated;

-- ---------- 3) POLÍTICAS ----------

-- admins: cada admin ve su fila (admin.js lee su nombre); nadie se crea admin desde la web
create policy admins_read on public.admins
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- customers: cada cliente ve y edita SU fila; el admin ve todas
create policy customers_read on public.customers
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy customers_update_own on public.customers
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- products / product_sizes / shipping_methods: lectura pública, escritura solo admin
create policy products_read on public.products
  for select to anon, authenticated using (true);
create policy products_admin_insert on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy products_admin_update on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy products_admin_delete on public.products
  for delete to authenticated using ((select public.is_admin()));

create policy product_sizes_read on public.product_sizes
  for select to anon, authenticated using (true);
create policy product_sizes_admin_insert on public.product_sizes
  for insert to authenticated with check ((select public.is_admin()));
create policy product_sizes_admin_update on public.product_sizes
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy product_sizes_admin_delete on public.product_sizes
  for delete to authenticated using ((select public.is_admin()));

create policy shipping_methods_read on public.shipping_methods
  for select to anon, authenticated using (true);
create policy shipping_methods_admin_insert on public.shipping_methods
  for insert to authenticated with check ((select public.is_admin()));
create policy shipping_methods_admin_update on public.shipping_methods
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy shipping_methods_admin_delete on public.shipping_methods
  for delete to authenticated using ((select public.is_admin()));

-- coupons: solo el admin ve la tabla. El cliente valida con check_coupon() (04).
create policy coupons_admin_all on public.coupons
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- orders
create policy orders_read on public.orders
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_admin()));

-- el cliente solo puede crear SU carrito (status queda en su default 'cart')
create policy orders_insert_own_cart on public.orders
  for insert to authenticated
  with check (customer_id = (select auth.uid()) and status = 'cart');

-- solo el admin actualiza (y solo status / cancel_reason, por el grant de arriba)
create policy orders_admin_update on public.orders
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- order_items: el dueño las ve siempre; las cambia SOLO mientras el pedido es carrito
create policy order_items_read on public.order_items
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.orders o
                where o.id = order_id and o.customer_id = (select auth.uid()))
  );

create policy order_items_insert_cart on public.order_items
  for insert to authenticated
  with check (exists (select 1 from public.orders o
                       where o.id = order_id
                         and o.customer_id = (select auth.uid())
                         and o.status = 'cart'));

create policy order_items_update_cart on public.order_items
  for update to authenticated
  using (exists (select 1 from public.orders o
                  where o.id = order_id
                    and o.customer_id = (select auth.uid())
                    and o.status = 'cart'))
  with check (exists (select 1 from public.orders o
                       where o.id = order_id
                         and o.customer_id = (select auth.uid())
                         and o.status = 'cart'));

create policy order_items_delete_cart on public.order_items
  for delete to authenticated
  using (exists (select 1 from public.orders o
                  where o.id = order_id
                    and o.customer_id = (select auth.uid())
                    and o.status = 'cart'));

-- historial: el dueño del pedido y el admin
create policy order_status_history_read on public.order_status_history
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.orders o
                where o.id = order_id and o.customer_id = (select auth.uid()))
  );
