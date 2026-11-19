-- ============================================================
--  CANCELAR PEDIDO Y RESTAURAR STOCK (Elion)
--  Ejecutar UNA vez en el SQL Editor de Supabase. Se puede volver a
--  ejecutar sin problema (create or replace / drop if exists).
-- ============================================================

-- 1) Trigger: cuando un pedido que YA descontó stock (confirmado o enviado)
--    pasa a 'cancelado', se devuelven sus unidades a "productos_práctica".
--    Va en un trigger (y no solo en la función del cliente) para que
--    también funcione cuando un admin cancela desde el panel.
--    Un carrito que se cancela no toca el stock: nunca lo descontó.
create or replace function restaurar_stock_al_cancelar()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  d record;
begin
  -- Mismo orden que confirmar_pedido (por producto_id): evita bloqueos cruzados
  for d in
    select producto_id, cantidad
      from detalles_pedidos
     where pedido_id = new.id
     order by producto_id
  loop
    update "productos_práctica"
       set unidades = coalesce(unidades, 0) + d.cantidad
     where id = d.producto_id;
  end loop;

  return new;
end;
$fn$;

drop trigger if exists pedidos_restaurar_stock on pedidos;
create trigger pedidos_restaurar_stock
after update of estado on pedidos
for each row
when (old.estado in ('confirmado', 'enviado') and new.estado = 'cancelado')
execute function restaurar_stock_al_cancelar();


-- 2) Funcion que llama el cliente desde "Mis pedidos".
--    El cliente no tiene permiso de UPDATE sobre pedidos: cancela solo por aqui.
--    Solo puede cancelar SUS pedidos y solo mientras estan en 'confirmado'
--    (Preparando). Si ya salio ('enviado'), solo un admin puede cancelarlo.
--    El historial lo registra el trigger pedidos_historial_cambio.
create or replace function cancelar_pedido(p_pedido_id bigint)
returns pedidos
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_pedido pedidos;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesion';
  end if;

  -- Bloquea la fila: dos cancelaciones simultaneas no devuelven el stock dos veces
  select * into v_pedido
    from pedidos
   where id = p_pedido_id and cliente_id = auth.uid()
     for update;

  if not found then
    raise exception 'Pedido no encontrado';
  end if;

  if v_pedido.estado = 'cancelado' then
    raise exception 'Este pedido ya estaba cancelado';
  end if;

  if v_pedido.estado <> 'confirmado' then
    raise exception 'Solo puedes cancelar pedidos que aun estan en preparacion';
  end if;

  -- Este UPDATE dispara pedidos_restaurar_stock (devuelve las unidades)
  -- y pedidos_historial_cambio (confirmado -> cancelado).
  update pedidos
     set estado = 'cancelado'
   where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$fn$;

revoke all on function cancelar_pedido(bigint) from public, anon;
grant execute on function cancelar_pedido(bigint) to authenticated;

-- La funcion del trigger no debe poder llamarse por la API
revoke all on function restaurar_stock_al_cancelar() from public, anon, authenticated;
