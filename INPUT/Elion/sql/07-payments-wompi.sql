-- ============================================================
--  ELION · 07 · PAGO REAL CON WOMPI (tarjeta y PSE)
--  Ejecutar cuando ya tengas las llaves de Wompi (sandbox primero).
--  Las columnas payment_* ya existen desde 01-tables.sql.
--
--  Flujo:
--   1) checkout.js llama start_payment(...)  -> descuenta stock, deja el
--      pedido en 'pending_payment' y devuelve referencia, monto y firma.
--   2) checkout.js abre el widget de Wompi con esos datos.
--   3) Wompi avisa al webhook (Edge Function wompi-webhook), que llama
--      apply_payment_result(...)  -> 'confirmed' si se aprobó, o
--      'cancelled' (y el stock vuelve) si se rechazó.
--  Contraentrega ('cod') sigue usando confirm_order, sin pasarela.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- 0) SECRETO DE INTEGRIDAD EN VAULT ----------
-- Wompi > Desarrolladores > "Secreto de integridad" (test_integrity_...).
-- Ejecuta ESTA línea una sola vez, con tu secreto, y no la guardes en el repo:
--   select vault.create_secret('test_integrity_XXXXXXXX', 'wompi_integrity_secret');
-- Para cambiarlo luego:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'wompi_integrity_secret'),
--     'prod_integrity_XXXXXXXX');

create or replace function private.wompi_integrity_secret()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'wompi_integrity_secret';
$$;

revoke all on function private.wompi_integrity_secret() from public, anon, authenticated;

-- ---------- 1) INICIAR EL PAGO (la llama checkout.js) ----------
create or replace function public.start_payment(
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
  p_payment_method  text default 'card'
)
returns table (
  order_id        bigint,
  order_number    text,
  reference       text,
  amount_in_cents bigint,
  currency        text,
  signature       text
)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_order     public.orders;
  v_total     bigint;
  v_cents     bigint;
  v_reference text;
  v_secret    text := private.wompi_integrity_secret();
begin
  if p_payment_method not in ('card', 'pse') then
    raise exception 'Para contraentrega usa confirm_order';
  end if;
  if v_secret is null then
    raise exception 'Falta configurar el secreto de integridad de Wompi';
  end if;

  -- valida, descuenta stock, fija precios, cupón y envío
  v_order := private.prepare_checkout(
    p_order_id, p_shipping_method, p_recipient_name, p_doc_number, p_phone,
    p_department, p_city, p_address, p_address_notes, p_coupon_code,
    p_payment_method, null);

  select t.total into v_total from public.orders_with_total t where t.id = p_order_id;
  v_cents := v_total * 100;   -- Wompi trabaja en centavos
  -- referencia única por intento: EL-1001-20261120153000
  v_reference := v_order.order_number || '-' || to_char(now(), 'YYYYMMDDHH24MISS');

  perform set_config('elion.checkout', 'on', true);
  update public.orders
     set status                  = 'pending_payment',
         payment_provider        = 'wompi',
         payment_reference       = v_reference,
         payment_status          = 'PENDING',
         payment_amount_in_cents = v_cents,
         payment_label           = case p_payment_method when 'card' then 'Tarjeta' else 'PSE' end
   where id = p_order_id;
  perform set_config('elion.checkout', 'off', true);

  -- Firma de integridad de Wompi: SHA256(referencia + centavos + moneda + secreto)
  return query
  select p_order_id,
         v_order.order_number,
         v_reference,
         v_cents,
         'COP'::text,
         encode(extensions.digest(v_reference || v_cents::text || 'COP' || v_secret, 'sha256'), 'hex');
end;
$fn$;

-- ---------- 2) RESULTADO DEL PAGO (la llama SOLO el webhook) ----------
-- Wompi puede mandar el mismo evento varias veces: si el pedido ya no
-- está en 'pending_payment', no se vuelve a procesar.
create or replace function public.apply_payment_result(
  p_reference       text,
  p_transaction_id  text,
  p_status          text,      -- APPROVED | DECLINED | VOIDED | ERROR | PENDING
  p_amount_in_cents bigint
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_order public.orders;
begin
  select * into v_order
    from public.orders
   where payment_reference = p_reference
     for update;

  if not found then
    raise exception 'Referencia de pago desconocida: %', p_reference;
  end if;

  -- Ya procesado. Caso raro: llega APPROVED de un pedido que ya se canceló
  -- -> se marca el pago como aprobado para que el admin haga el reembolso.
  if v_order.status <> 'pending_payment' then
    if p_status = 'APPROVED' and v_order.payment_status is distinct from 'APPROVED' then
      update public.orders
         set payment_status = 'APPROVED', payment_transaction_id = p_transaction_id
       where id = v_order.id
      returning * into v_order;
    end if;
    return v_order;
  end if;

  if p_status = 'APPROVED' and p_amount_in_cents = v_order.payment_amount_in_cents then
    perform set_config('elion.checkout', 'on', true);
    update public.orders
       set status = 'confirmed',
           payment_status = 'APPROVED',
           payment_transaction_id = p_transaction_id,
           paid_at = now()
     where id = v_order.id
    returning * into v_order;
    perform set_config('elion.checkout', 'off', true);

  elsif p_status in ('APPROVED', 'DECLINED', 'VOIDED', 'ERROR') then
    -- rechazado, o aprobado por un monto distinto (no se confía): se cancela
    -- y el trigger orders_restore_stock devuelve las unidades
    update public.orders
       set status = 'cancelled',
           cancel_reason = 'No pudimos confirmar el pago',
           payment_status = case when p_status = 'APPROVED' then 'ERROR' else p_status end,
           payment_transaction_id = p_transaction_id
     where id = v_order.id
    returning * into v_order;

  else
    -- PENDING (PSE a veces tarda): solo se guarda el id de la transacción
    update public.orders
       set payment_transaction_id = p_transaction_id
     where id = v_order.id
    returning * into v_order;
  end if;

  return v_order;
end;
$fn$;

-- ---------- 3) CONFIRM_ORDER QUEDA SOLO PARA CONTRAENTREGA ----------
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
  if p_payment_method <> 'cod' then
    raise exception 'Los pagos con tarjeta o PSE se hacen con start_payment';
  end if;

  perform private.prepare_checkout(
    p_order_id, p_shipping_method, p_recipient_name, p_doc_number, p_phone,
    p_department, p_city, p_address, p_address_notes, p_coupon_code,
    'cod', 'Contraentrega (efectivo)');

  perform set_config('elion.checkout', 'on', true);
  update public.orders set status = 'confirmed' where id = p_order_id
  returning * into v_order;
  perform set_config('elion.checkout', 'off', true);

  return v_order;
end;
$fn$;

-- ---------- PERMISOS ----------
revoke all on function public.start_payment(bigint, text, text, text, text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.start_payment(bigint, text, text, text, text, text, text, text, text, text, text)
  to authenticated;

-- SOLO el servidor (service_role, que usa la Edge Function). Nunca el navegador.
revoke all on function public.apply_payment_result(text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.apply_payment_result(text, text, text, bigint) to service_role;

notify pgrst, 'reload schema';
