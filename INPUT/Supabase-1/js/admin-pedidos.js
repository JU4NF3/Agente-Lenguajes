// ============================================================
//  ADMIN: PEDIDOS Y CLIENTES
//  Dos secciones debajo del inventario:
//   - Pedidos: todos los pedidos de los clientes (menos los carritos
//     abiertos), con sus productos, la entrega, el total y un selector
//     para cambiar el estado.
//   - Clientes: todas las filas de cliente_práctica.
//
//  Lo que deja hacer la base (no el navegador):
//   - ver_pedidos / ver_detalles / ver_mi_perfil: un admin lee TODO.
//   - admin_actualiza_estado + grant update (estado): solo cambia 'estado'.
//   - trigger validar_transicion_estado: solo los pasos permitidos.
//   - trigger pedidos_restaurar_stock: al cancelar, devuelve el stock.
//   - trigger pedidos_historial_cambio: guarda quién cambió qué.
//
//  Usa formatoPesos() y cargarProductos() de admin.js (se carga antes).
//  admin.js llama a cargarPanelPedidos() / limpiarPanelPedidos() desde
//  aplicarAcceso(), cuando confirma (o pierde) la sesión de admin.
// ============================================================

// Texto de cada estado (el mismo que ve el cliente en Mis pedidos)
const NOMBRE_ESTADO_ADMIN = {
  confirmado: 'Preparando',
  enviado: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

// A qué estados se puede pasar desde cada uno. Es copia de las reglas del
// trigger validar_transicion_estado: así el selector solo ofrece lo que la
// base va a aceptar (si alguien lo fuerza, la base igual lo rechaza).
const SIGUIENTES_ESTADOS = {
  confirmado: ['enviado', 'cancelado'],
  enviado: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

// Texto del botón que pasa el pedido a cada estado
const ACCION_ESTADO = {
  enviado: 'Marcar en camino',
  entregado: 'Marcar entregado',
  cancelado: 'Cancelar',
};

const listaPedidosAdmin = document.getElementById('lista-pedidos-admin');
const listaClientes = document.getElementById('lista-clientes');
const filtroEstado = document.getElementById('filtro-estado');
const avisoPedidos = document.getElementById('aviso-pedidos');

// "Mostrar": la misma lista con estilo que "Nombre / ID" y "Elige un producto"
mejorarSelect(filtroEstado);

// Lo último que se leyó de la base (para filtrar sin volver a consultar)
let pedidosAdmin = [];
let clientesPorId = {};

// La dirección, la observación y el nombre los escribe el CLIENTE: antes de
// meterlos en innerHTML se escapan, para que nada se interprete como HTML.
function escaparHTML(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function fechaCorta(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function avisar(texto, tipo) {
  avisoPedidos.textContent = texto;
  avisoPedidos.className = `aviso-admin ${tipo ?? ''}`;
}

// ---- 1) LEER TODO DE SUPABASE ----
async function cargarPanelPedidos() {
  listaPedidosAdmin.className = 'vacio';
  listaPedidosAdmin.textContent = 'Cargando pedidos...';
  listaClientes.className = 'vacio';
  listaClientes.textContent = 'Cargando clientes...';

  // Tres lecturas que no dependen entre sí → a la vez
  const [resPedidos, resClientes, resProductos] = await Promise.all([
    db.from('pedidos_con_total')
      .select('id, cliente_id, estado, envio, direccion, telefono, observacion, created_at, confirmado_en, motivo_cancelacion, total')
      .neq('estado', 'carrito') // un carrito abierto todavía no es un pedido
      .order('id', { ascending: false }),
    db.from('cliente_práctica')
      .select('id, nombre, correo, telefono, direccion, numero_identificacion, created_at')
      .order('created_at', { ascending: false }),
    db.from('productos_práctica').select('id, nombre'),
  ]);

  if (resClientes.error) {
    console.log('Error al leer los clientes:', resClientes.error);
    listaClientes.textContent = 'Error: ' + resClientes.error.message;
  }
  clientesPorId = {};
  (resClientes.data ?? []).forEach((c) => { clientesPorId[c.id] = c; });

  if (resPedidos.error) {
    console.log('Error al leer los pedidos:', resPedidos.error);
    listaPedidosAdmin.textContent = 'Error: ' + resPedidos.error.message;
    pedidosAdmin = [];
    if (!resClientes.error) pintarClientes();
    return;
  }

  const nombres = {};
  (resProductos.data ?? []).forEach((p) => { nombres[p.id] = p.nombre; });

  // Los productos de TODOS esos pedidos en una sola consulta (.in)
  const pedidos = resPedidos.data;
  const detallesPorPedido = {};
  if (pedidos.length > 0) {
    const { data: detalles, error } = await db
      .from('detalles_pedidos')
      .select('pedido_id, producto_id, cantidad, precio_unitario')
      .in('pedido_id', pedidos.map((p) => p.id));

    if (error) console.log('Error al leer los productos de los pedidos:', error);
    (detalles ?? []).forEach((d) => {
      (detallesPorPedido[d.pedido_id] ??= []).push({
        nombre: nombres[d.producto_id] ?? `Producto #${d.producto_id}`,
        cantidad: d.cantidad,
      });
    });
  }

  pedidosAdmin = pedidos.map((p) => ({ ...p, items: detallesPorPedido[p.id] ?? [] }));

  pintarPedidos();
  if (!resClientes.error) pintarClientes();
}

// Al cerrar sesión: no dejar datos de clientes en la página
function limpiarPanelPedidos() {
  pedidosAdmin = [];
  clientesPorId = {};
  if (typeof limpiarFinanzas === 'function') limpiarFinanzas();
  listaPedidosAdmin.className = 'vacio';
  listaPedidosAdmin.textContent = 'Cargando pedidos...';
  listaClientes.className = 'vacio';
  listaClientes.textContent = 'Cargando clientes...';
  document.getElementById('contador-pedidos').textContent = '';
  document.getElementById('contador-clientes').textContent = '';
  avisar('');
}

// ---- 2) TABLA DE PEDIDOS ----
function pintarPedidos() {
  // Finanzas sale de estos mismos pedidos: se actualiza con cada cambio
  if (typeof pintarFinanzas === 'function') pintarFinanzas();

  const filtro = filtroEstado.value;
  const todos = filtro === 'todos';
  const visibles = todos ? pedidosAdmin : pedidosAdmin.filter((p) => p.estado === filtro);

  document.getElementById('contador-pedidos').textContent =
    todos ? `(${pedidosAdmin.length})` : `(${visibles.length} de ${pedidosAdmin.length})`;

  if (visibles.length === 0) {
    listaPedidosAdmin.className = 'vacio';
    listaPedidosAdmin.textContent = pedidosAdmin.length === 0
      ? 'Todavía no hay pedidos de clientes.'
      : 'No hay pedidos con ese estado.';
    return;
  }

  const filas = visibles.map((p) => {
    const c = clientesPorId[p.cliente_id];
    const entrega = p.envio
      ? `<strong>Domicilio</strong>
         <small>${escaparHTML(p.direccion ?? c?.direccion ?? '—')}</small>
         <small>Tel. ${escaparHTML(p.telefono ?? c?.telefono ?? '—')}</small>`
      : '<strong>Recoger en tienda</strong>';
    const observacion = p.observacion ? `<small>Nota: ${escaparHTML(p.observacion)}</small>` : '';
    const productos = p.items.length
      ? p.items.map((it) => `<span class="etiqueta">${escaparHTML(it.nombre)} ×${it.cantidad}</span>`).join('')
      : '—';

    // Un botón por cada paso permitido (mismo molde que "Editar").
    // Cancelar va en rojo y pide un segundo clic, como "Eliminar".
    const siguientes = SIGUIENTES_ESTADOS[p.estado] ?? [];
    const cambiar = siguientes.length
      ? `<div class="cambiar-estado">
           ${siguientes.map((e) => `
             <button type="button" class="btn-editar${e === 'cancelado' ? ' btn-cancelar-pedido' : ''}"
                     data-id="${p.id}" data-estado="${e}">${ACCION_ESTADO[e]}</button>`).join('')}
         </div>`
      : '<small>Sin cambios posibles</small>';

    return `
      <tr>
        <td class="num">#${p.id}</td>
        <td class="num">${fechaCorta(p.confirmado_en ?? p.created_at)}</td>
        <td><strong>${escaparHTML(c?.nombre ?? 'Cliente')}</strong><small>${escaparHTML(c?.correo ?? '')}</small></td>
        <td>${entrega}${observacion}</td>
        <td>${productos}</td>
        <td class="num">${formatoPesos(p.total ?? 0)}</td>
        <td>
          <span class="estado ped-${p.estado}">${NOMBRE_ESTADO_ADMIN[p.estado] ?? p.estado}</span>
          ${p.estado === 'cancelado' && p.motivo_cancelacion
            ? `<small class="motivo-tabla">${escaparHTML(p.motivo_cancelacion)}</small>`
            : ''}
        </td>
        <td>${cambiar}</td>
      </tr>`;
  }).join('');

  listaPedidosAdmin.className = '';
  listaPedidosAdmin.innerHTML = `
    <div class="tabla-wrap">
      <table class="tabla-datos">
        <thead>
          <tr>
            <th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Entrega</th>
            <th>Productos</th><th>Total</th><th>Estado</th><th>Cambiar estado</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

filtroEstado.addEventListener('change', pintarPedidos);

document.getElementById('btn-recargar-pedidos').addEventListener('click', () => {
  avisar('');
  cargarPanelPedidos();
});

// ---- 3) CAMBIAR EL ESTADO ----
// Guarda el estado nuevo (y el motivo, si es una cancelación).
// Solo se mandan 'estado' y 'motivo_cancelacion': son las únicas columnas
// con permiso de UPDATE. .select(): si el RLS bloquea el UPDATE no hay
// error, solo 0 filas. Devuelve null si salió bien, o el texto del error.
async function guardarEstado(id, nuevo, motivo = null) {
  const cambios = { estado: nuevo };
  if (nuevo === 'cancelado') cambios.motivo_cancelacion = motivo;

  const { data, error } = await db
    .from('pedidos')
    .update(cambios)
    .eq('id', id)
    .select('id, estado, motivo_cancelacion');

  if (error) {
    console.log('Error al cambiar el estado:', error);
    // el texto lo pone la base (ej. 'Transicion de estado no permitida: ...')
    return error.message;
  }
  if (data.length === 0) return 'No se pudo cambiar el estado: revisa que tu cuenta sea admin.';

  // Se actualiza la fila en memoria y se vuelve a pintar
  const pedido = pedidosAdmin.find((p) => p.id === id);
  if (pedido) {
    pedido.estado = data[0].estado;
    pedido.motivo_cancelacion = data[0].motivo_cancelacion;
  }
  pintarPedidos();

  if (nuevo === 'cancelado') {
    avisar(`Pedido #${id} cancelado (${motivo}). Las unidades volvieron al stock.`);
    cargarProductos(); // la tabla de productos muestra las unidades nuevas
  } else {
    avisar(`Pedido #${id} ahora está: ${NOMBRE_ESTADO_ADMIN[nuevo]}.`);
  }
  return null;
}

// Un solo listener en la sección (las filas se crean con innerHTML)
listaPedidosAdmin.addEventListener('click', async (evento) => {
  const btn = evento.target.closest('.btn-editar[data-estado]');
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const nuevo = btn.dataset.estado;

  // Cancelar: primero se elige el motivo en la ventana (sección 3b)
  if (nuevo === 'cancelado') {
    abrirVentanaCancelar(id);
    return;
  }

  // mientras responde la base, ningún botón de ese pedido se puede pulsar
  btn.closest('.cambiar-estado').querySelectorAll('button').forEach((b) => { b.disabled = true; });
  btn.textContent = 'Guardando...';
  avisar('');

  const fallo = await guardarEstado(id, nuevo);
  if (fallo) {
    avisar(fallo, 'error');
    pintarPedidos(); // los botones vuelven a su estado normal
  }
});

// ---- 3b) VENTANA "¿POR QUÉ SE CANCELA?" ----
// El admin no escribe el motivo: lo elige de esta lista. Es la misma lista
// que acepta la base (CHECK pedidos_motivo_cancelacion_check en
// sql/motivo-cancelacion.sql): si cambias una, cambia la otra.
// ('Cancelado por el cliente' no está aquí: lo pone cancelar_pedido
// cuando el propio cliente cancela desde su seguimiento.)
const MOTIVOS_CANCELACION = [
  'Se agotó el stock del producto',
  'No pudimos confirmar el pago',
  'Dirección fuera de nuestra zona de entrega',
  'No pudimos contactarte para coordinar la entrega',
  'El producto llegó dañado a nuestra bodega',
  'Pedido duplicado',
  'Cancelado a solicitud del cliente',
];

const ventanaCancelar = document.getElementById('ventana-cancelar');
const formMotivo = document.getElementById('form-motivo');
const listaMotivos = document.getElementById('lista-motivos');
const avisoMotivo = document.getElementById('aviso-motivo');
const btnConfirmarCancelar = document.getElementById('btn-confirmar-cancelar');
let idACancelar = null;

// Una opción (radio) por motivo, después del <legend>. Los textos son
// nuestros (no del cliente), así que innerHTML es seguro.
listaMotivos.insertAdjacentHTML('beforeend', MOTIVOS_CANCELACION.map((m, i) => `
  <label class="motivo">
    <input type="radio" name="motivo" value="${m}" ${i === 0 ? 'required' : ''}>
    <span>${m}</span>
  </label>`).join(''));

function abrirVentanaCancelar(id) {
  idACancelar = id;
  formMotivo.reset();
  avisoMotivo.textContent = '';
  avisoMotivo.className = 'aviso-admin';
  btnConfirmarCancelar.disabled = false;
  btnConfirmarCancelar.textContent = 'Cancelar pedido';
  document.getElementById('cancelar-num').textContent = id;
  ventanaCancelar.showModal();
}

formMotivo.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const motivo = formMotivo.elements.motivo.value;
  if (!motivo) {
    avisoMotivo.textContent = 'Elige un motivo para cancelar el pedido.';
    avisoMotivo.className = 'aviso-admin error';
    return;
  }

  btnConfirmarCancelar.disabled = true;
  btnConfirmarCancelar.textContent = 'Cancelando...';

  const fallo = await guardarEstado(idACancelar, 'cancelado', motivo);
  if (fallo) {
    avisoMotivo.textContent = fallo;
    avisoMotivo.className = 'aviso-admin error';
    btnConfirmarCancelar.disabled = false;
    btnConfirmarCancelar.textContent = 'Cancelar pedido';
    return;
  }
  ventanaCancelar.close();
});

// Cerrar: la ×, "Volver" o un clic en el fondo oscuro (como la tarjeta)
ventanaCancelar.addEventListener('click', (evento) => {
  if (evento.target === ventanaCancelar || evento.target.closest('[data-cerrar]')) {
    ventanaCancelar.close();
  }
});

// ---- 4) TABLA DE CLIENTES ----
function pintarClientes() {
  const clientes = Object.values(clientesPorId);
  document.getElementById('contador-clientes').textContent = `(${clientes.length})`;

  if (clientes.length === 0) {
    listaClientes.className = 'vacio';
    listaClientes.textContent = 'Todavía no hay clientes registrados.';
    return;
  }

  // cuántos pedidos (no carritos) tiene cada cliente
  const pedidosPorCliente = {};
  pedidosAdmin.forEach((p) => {
    pedidosPorCliente[p.cliente_id] = (pedidosPorCliente[p.cliente_id] ?? 0) + 1;
  });

  const filas = clientes.map((c) => `
    <tr>
      <td><strong>${escaparHTML(c.nombre)}</strong></td>
      <td>${escaparHTML(c.correo ?? '—')}</td>
      <td class="num">${escaparHTML(c.numero_identificacion ?? '—')}</td>
      <td class="num">${escaparHTML(c.telefono ?? '—')}</td>
      <td>${escaparHTML(c.direccion ?? '—')}</td>
      <td class="num">${fechaCorta(c.created_at)}</td>
      <td class="num">${pedidosPorCliente[c.id] ?? 0}</td>
    </tr>`).join('');

  listaClientes.className = '';
  listaClientes.innerHTML = `
    <div class="tabla-wrap">
      <table class="tabla-datos">
        <thead>
          <tr>
            <th>Nombre</th><th>Correo</th><th>Identificación</th><th>Teléfono</th>
            <th>Dirección</th><th>Registro</th><th>Pedidos</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}
