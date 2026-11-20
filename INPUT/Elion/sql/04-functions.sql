-- ============================================================
--  ELION · 04 · FUNCIONES (RPC)
--  Ejecutar después de 03-triggers.sql.
--    confirmar_pedido -> confirm_order   (ahora con talla, cupón y envío)
--    cancelar_pedido  -> cancel_order
--    (nueva)          -> check_coupon    (para el pop-up / checkout)
--  Las piezas internas viven en el esquema "private": la API no las ve.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------- 1) ¿CUÁNTO DESCUENTA UN CUPÓN? (interna) ----------
-- 0 = no vale (no existe, inactivo, vencido o ya hizo su primera compra)
create or replace function private.coupon_rate(p_code text, p_customer_id uuid)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select c.rate
      from public.coupons c
     where c.code = upper(trim(p_code))
       and c.is_active
       and (c.expires_at is null or c.expires_at > now())
       and (not c.first_purchase_only
            or not exists (select 1 from public.orders o
                            where o.customer_id = p_customer_id
                              and o.status in ('pending_payment', 'confirmed', 'preparing',
                                               'shipped', 'delivered')))
  ), 0);
$$;

-- ---------- 2) PREPARAR EL CHECKOUT (interna) ----------
-- Lo que tienen en común el pago simulado/contraentrega (confirm_order)
-- y el pago real (start_payment, en 07). En UNA transacción:
--   valida datos de entrega -> revisa y DESCUENTA stock por talla ->
--   fija el precio de cada línea -> aplica cupón y envío.
-- NO cambia el estado: eso lo hace quien la llama.
create or replace function private.prepare_checkout(
  p_order_id        bigint,
  p_shipping_method text,
  p_recipient_name  text,
  p_doc_number      text,
  p_phone           text,
  p_department      text,
  p_city            text,
  p_address         text,
  p_address_notes   text,
  p_coupon_code     text,
  p_payment_method  text,
  p_payment_label   text
)
returns public.orders
language plpgsql
set search_path = ''
as $fn$
declare
  v_order    public.orders;
  v_ship     public.shipping_methods;
  v_item     record;
  v_subtotal bigint := 0;
  v_lines    integer := 0;
  v_code     text := nullif(upper(trim(p_coupon_code)), '');
  v_rate     numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  -- Bloquea el pedido: dos clics en "Pagar" no descuentan el stock dos veces
  select * into v_order
    from public.orders
   where id = p_order_id and customer_id = auth.uid()
     for update;

  if not found then
    raise exception 'Pedido no encontrado';
  end if;
  if v_order.status <> 'cart' then
    raise exception 'Este pedido ya no es un carrito';
  end if;

  -- Datos de entrega: mismas reglas que checkout.js (el navegador avisa
  -- rápido, pero la que manda es la base)
  if coalesce(array_length(regexp_split_to_array(trim(p_recipient_name), '\s+'), 1), 0) < 2 then
    raise exception 'Escribe tu nombre y apellido';
  end if;
  if coalesce(p_doc_number, '') !~ '^\d{6,10}$' then
    raise exception 'La cédula debe tener entre 6 y 10 números';
  end if;
  if coalesce(p_phone, '') !~ '^3\d{9}$' then
    raise exception 'El celular debe tener 10 números y empezar por 3';
  end if;
  if coalesce(trim(p_department), '') = '' then
    raise exception 'Elige un departamento';
  end if;
  if length(coalesce(trim(p_city), '')) < 3 then
    raise exception 'Escribe tu ciudad';
  end if;
  if length(coalesce(trim(p_address), '')) < 6 then
    raise exception 'Escribe la dirección completa';
  end if;
  if p_payment_method is null or p_payment_method not in ('card', 'pse', 'cod') then
    raise exception 'Método de pago no válido';
  end if;

  select * into v_ship
    from public.shipping_methods
   where code = p_shipping_method and is_active;
  if not found then
    raise exception 'Método de envío no válido';
  end if;

  -- Stock y precios, en orden (producto, talla) para evitar bloqueos cruzados
  for v_item in
    select i.id, i.product_id, i.size, i.quantity,
           p.name, p.is_available,
           coalesce(p.sale_price, p.price) as price,
           s.stock
      from public.order_items i
      join public.products p      on p.id = i.product_id
      join public.product_sizes s on s.product_id = i.product_id and s.size = i.size
     where i.order_id = p_order_id
     order by i.product_id, i.size
       for update of s
  loop
    if not v_item.is_available then
      raise exception 'El producto % ya no está disponible', v_item.name;
    end if;
    if v_item.stock < v_item.quantity then
      raise exception 'Stock insuficiente para % (talla %): quedan %',
        v_item.name, v_item.size, v_item.stock;
    end if;

    update public.product_sizes
       set stock = stock - v_item.quantity
     where product_id = v_item.product_id and size = v_item.size;

    update public.order_items
       set unit_price = v_item.price
     where id = v_item.id;

    v_subtotal := v_subtotal + v_item.price * v_item.quantity;
    v_lines := v_lines + 1;
  end loop;

  if v_lines = 0 then
    raise exception 'El carrito está vacío';
  end if;

  if v_code is not null then
    v_rate := private.coupon_rate(v_code, auth.uid());
    if v_rate = 0 then
      raise exception 'El cupón % no es válido o ya fue usado', v_code;
    end if;
  end if;

  update public.orders
     set recipient_name  = trim(p_recipient_name),
         doc_number      = p_doc_number,
         phone           = p_phone,
         department      = trim(p_department),
         city            = trim(p_city),
         address         = trim(p_address),
         address_notes   = nullif(trim(p_address_notes), ''),
         shipping_method = v_ship.code,
         -- envío gratis según el subtotal ANTES del cupón (igual que store.js)
         shipping_cost   = case when v_ship.free_from is not null and v_subtotal >= v_ship.free_from
                                then 0 else v_ship.price end,
         coupon_code     = case when v_rate > 0 then v_code end,
         discount_rate   = v_rate,
         payment_method  = p_payment_method,
         payment_label   = nullif(trim(p_payment_label), '')
   where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$fn$;

-- ---------- 3) CONFIRMAR PEDIDO (la llama checkout.js) ----------
-- Pago simulado o contraentrega: pasa el carrito directo a 'confirmed'.
-- Cuando se active el pago real, 07-payments-wompi.sql la reemplaza para
-- que solo acepte contraentrega ('cod').
-- p_payment_label: SOLO texto como 'Tarjeta •••• 4242'. Nunca la tarjeta completa.
create or replace function public.confirm_order(
  p_order_id        bigint,
  p_shipping_method text,
  p_recipient_name  text,
  p_doc_number      text,
  p_phone           text,
  p_department      text,
  p_city            text,
  p_address         text,
  p_address_notes   text default null,
  p_coupon_code     text default null,
  p_payment_method  text default 'cod',
  p_payment_label   text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_order public.orders;
begin
  perform private.prepare_checkout(
    p_order_id, p_shipping_method, p_recipient_name, p_doc_number, p_phone,
    p_department, p_city, p_address, p_address_notes, p_coupon_code,
    p_payment_method, p_payment_label);

  -- permiso para el paso cart -> confirmed (lo revisa el trigger)
  perform set_config('elion.checkout', 'on', true);

  update public.orders
     set status = 'confirmed'
   where id = p_order_id
  returning * into v_order;

  perform set_config('elion.checkout', 'off', true);
  return v_order;
end;
$fn$;

-- ---------- 4) CANCELAR PEDIDO (la llama el cliente desde "Mis pedidos") ----------
-- Solo SUS pedidos y solo antes de salir a la transportadora.
create or replace function public.cancel_order(p_order_id bigint)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_order public.orders;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select * into v_order
    from public.orders
   where id = p_order_id and customer_id = auth.uid()
     for update;

  if not found then
    raise exception 'Pedido no encontrado';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'Este pedido ya estaba cancelado';
  end if;
  if v_order.status not in ('confirmed', 'preparing') then
    raise exception 'Solo puedes cancelar pedidos que aún no han sido enviados';
  end if;

  -- dispara orders_restore_stock y orders_log_status
  update public.orders
     set status = 'cancelled',
         cancel_reason = 'Cancelado por el cliente'
   where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$fn$;

-- ---------- 5) VALIDAR CUPÓN (pop-up y checkout) ----------
-- Devuelve el porcentaje (0.10) o 0. No deja ver la tabla de cupones.
create or replace function public.check_coupon(p_code text)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select private.coupon_rate(p_code, auth.uid());
$$;

-- ---------- PERMISOS ----------
-- Postgres deja ejecutar cualquier función a todos por defecto: se quita.
revoke all on function private.coupon_rate(text, uuid) from public, anon, authenticated;
revoke all on function private.prepare_checkout(bigint, text, text, text, text, text, text, text, text, text, text, text)
  from public, anon, authenticated;

revoke all on function public.confirm_order(bigint, text, text, text, text, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.confirm_order(bigint, text, text, text, text, text, text, text, text, text, text, text)
  to authenticated;

revoke all on function public.cancel_order(bigint) from public, anon;
grant execute on function public.cancel_order(bigint) to authenticated;

revoke all on function public.check_coupon(text) from public;
grant execute on function public.check_coupon(text) to anon, authenticated;

-- que la API vea las funciones nuevas de inmediato
notify pgrst, 'reload schema';
