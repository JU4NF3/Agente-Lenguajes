-- ============================================================
--  MOTIVO DE CANCELACION (Elion)
--  Ejecutar UNA vez en el SQL Editor de Supabase, completo.
--  Se puede volver a ejecutar sin problema.
-- ============================================================

-- 1) Columna nueva en pedidos: por que se cancelo.
alter table pedidos add column if not exists motivo_cancelacion text;

-- 2) Solo se aceptan los motivos predeterminados (los mismos que ofrece
--    el panel del admin en admin-pedidos.js), y solo en pedidos cancelados.
--    "not valid": no revisa los pedidos que ya estaban cancelados sin motivo;
--    solo se aplica a lo que se guarde de ahora en adelante.
alter table pedidos drop constraint if exists pedidos_motivo_cancelacion_check;
alter table pedidos add constraint pedidos_motivo_cancelacion_check check (
  motivo_cancelacion is null
  or (
    estado = 'cancelado'
    and motivo_cancelacion in (
      'Se agotó el stock del producto',
      'No pudimos confirmar el pago',
      'Dirección fuera de nuestra zona de entrega',
      'No pudimos contactarte para coordinar la entrega',
      'El producto llegó dañado a nuestra bodega',
      'Pedido duplicado',
      'Cancelado a solicitud del cliente',
      'Cancelado por el cliente'
    )
  )
) not valid;

-- Un pedido que se cancele de ahora en adelante SIEMPRE lleva motivo
alter table pedidos drop constraint if exists pedidos_cancelado_con_motivo_check;
alter table pedidos add constraint pedidos_cancelado_con_motivo_check check (
  estado <> 'cancelado' or motivo_cancelacion is not null
) not valid;

-- 3) El admin puede escribir el motivo (junto con el estado). El cliente
--    no tiene politica de UPDATE en pedidos, asi que este permiso no le sirve:
--    el RLS (admin_actualiza_estado) solo deja actualizar a un admin.
grant update (motivo_cancelacion) on pedidos to authenticated;

-- 4) Cuando cancela el propio cliente, el motivo es 'Cancelado por el cliente'.
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

  -- Dispara pedidos_restaurar_stock (devuelve las unidades)
  -- y pedidos_historial_cambio (confirmado -> cancelado).
  update pedidos
     set estado = 'cancelado',
         motivo_cancelacion = 'Cancelado por el cliente'
   where id = p_pedido_id
  returning * into v_pedido;

  return v_pedido;
end;
$fn$;

revoke all on function cancelar_pedido(bigint) from public, anon;
grant execute on function cancelar_pedido(bigint) to authenticated;

-- 5) La vista pedidos_con_total fijo sus columnas (p.*) cuando se creo, asi
--    que no ve la columna nueva. Se borra y se crea otra vez (un
--    "create or replace" no deja meter una columna antes de "total").
--    Al borrarla se pierden sus permisos: se vuelven a dar abajo.
drop view if exists pedidos_con_total;

create view pedidos_con_total
with (security_invoker = true)
as
select p.*, coalesce(sum(d.cantidad * d.precio_unitario), 0)::bigint as total
  from pedidos p
  left join detalles_pedidos d on d.pedido_id = p.id
 group by p.id;

revoke all on pedidos_con_total from anon, authenticated;
grant select on pedidos_con_total to authenticated;

-- 6) Que la API vea la columna nueva de inmediato
notify pgrst, 'reload schema';
