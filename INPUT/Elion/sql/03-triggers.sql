-- ============================================================
--  ELION · 03 · TRIGGERS
--  Ejecutar después de 02-rls.sql.
--  Los mismos tres de Supabase-1, adaptados:
--    validar_transicion_estado  -> validate_order_status_transition
--    pedidos_historial_cambio   -> log_order_status_change
--    restaurar_stock_al_cancelar -> restore_stock_on_cancel
--  Y uno nuevo: handle_new_user (crea el perfil del cliente al registrarse).
-- ============================================================

-- ---------- 1) TRANSICIONES DE ESTADO PERMITIDAS ----------
--   cart            -> pending_payment | confirmed   (solo el proceso de pago)
--   pending_payment -> confirmed (solo el webhook)   | cancelled
--   confirmed       -> preparing | cancelled
--   preparing       -> shipped   | cancelled
--   shipped         -> delivered | cancelled
--   delivered, cancelled -> nada
-- "Solo el proceso de pago": las funciones de 04 y 07 encienden la
-- variable elion.checkout durante su transacción. Un admin que intente
-- pasar un carrito a 'confirmed' a mano es rechazado (no descontaría stock).
create or replace function public.validate_order_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $fn$
declare
  v_from_checkout boolean := coalesce(current_setting('elion.checkout', true), '') = 'on';
  v_allowed text[];
begin
  if new.status = old.status then
    -- el motivo solo se escribe en el momento de cancelar
    if new.cancel_reason is distinct from old.cancel_reason then
      raise exception 'El motivo de cancelación solo se puede poner al cancelar';
    end if;
    return new;
  end if;

  v_allowed := case old.status
    when 'cart'            then array['pending_payment', 'confirmed']
    when 'pending_payment' then array['confirmed', 'cancelled']
    when 'confirmed'       then array['preparing', 'cancelled']
    when 'preparing'       then array['shipped', 'cancelled']
    when 'shipped'         then array['delivered', 'cancelled']
    else array[]::text[]
  end;

  if not (new.status = any (v_allowed)) then
    raise exception 'Transición de estado no permitida: % -> %', old.status, new.status;
  end if;

  if (old.status = 'cart' or (old.status = 'pending_payment' and new.status = 'confirmed'))
     and not v_from_checkout then
    raise exception 'Este cambio solo lo puede hacer el proceso de pago';
  end if;

  -- fecha de cada paso (el seguimiento de pedido.html las muestra)
  case new.status
    when 'pending_payment' then new.checkout_at := now();
    when 'confirmed'       then new.confirmed_at := now();
                                new.checkout_at := coalesce(new.checkout_at, now());
    when 'preparing'       then new.preparing_at := now();
    when 'shipped'         then new.shipped_at := now();
    when 'delivered'       then new.delivered_at := now();
    when 'cancelled'       then new.cancelled_at := now();
    else null;
  end case;

  return new;
end;
$fn$;

drop trigger if exists orders_validate_status on public.orders;
create trigger orders_validate_status
before update of status, cancel_reason on public.orders
for each row
execute function public.validate_order_status_transition();

-- ---------- 2) HISTORIAL DE CAMBIOS ----------
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer           -- el cliente no tiene permiso de INSERT en el historial
set search_path = ''
as $fn$
begin
  insert into public.order_status_history (order_id, old_status, new_status, cancel_reason, changed_by)
  values (new.id, old.status, new.status, new.cancel_reason, auth.uid());
  return new;
end;
$fn$;

drop trigger if exists orders_log_status on public.orders;
create trigger orders_log_status
after update of status on public.orders
for each row
when (old.status is distinct from new.status)
execute function public.log_order_status_change();

-- ---------- 3) DEVOLVER STOCK AL CANCELAR ----------
-- Solo si el pedido YA había descontado stock (desde pending_payment en
-- adelante). Va en un trigger para que funcione igual si cancela el
-- cliente, el admin o el webhook de pagos.
create or replace function public.restore_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_item record;
begin
  -- mismo orden que el checkout (producto, talla): evita bloqueos cruzados
  for v_item in
    select product_id, size, quantity
      from public.order_items
     where order_id = new.id
     order by product_id, size
  loop
    update public.product_sizes
       set stock = stock + v_item.quantity
     where product_id = v_item.product_id and size = v_item.size;
  end loop;
  return new;
end;
$fn$;

drop trigger if exists orders_restore_stock on public.orders;
create trigger orders_restore_stock
after update of status on public.orders
for each row
when (old.status in ('pending_payment', 'confirmed', 'preparing', 'shipped')
      and new.status = 'cancelled')
execute function public.restore_stock_on_cancel();

-- ---------- 4) PERFIL DEL CLIENTE AL REGISTRARSE ----------
-- En Supabase-1, cliente.js insertaba la fila después del signUp (y falla
-- si el proyecto pide confirmar el correo, porque aún no hay sesión).
-- Aquí la crea la base. El nombre llega en el signUp:
--   db.auth.signUp({ email, password, options: { data: { full_name } } })
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.customers (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- Las funciones de los triggers no se pueden llamar por la API
revoke all on function public.validate_order_status_transition() from public, anon, authenticated;
revoke all on function public.log_order_status_change()         from public, anon, authenticated;
revoke all on function public.restore_stock_on_cancel()         from public, anon, authenticated;
revoke all on function public.handle_new_user()                 from public, anon, authenticated;
