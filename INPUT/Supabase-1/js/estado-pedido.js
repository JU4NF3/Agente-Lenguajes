// ============================================================
//  ESTADO DEL PEDIDO (seguimiento estilo Mercado Libre)
//  Pinta la línea de progreso con el camioncito, los datos de entrega
//  y el detalle de productos de UN pedido, leído de Supabase.
//
//  ¿Qué pedido? El de la URL (estado-pedido.html?id=12, desde Mis
//  pedidos) o, si no hay, el último que se pagó en este navegador (la
//  "foto" de localStorage que deja pago.js).
//
//  La base guarda casi todo (estado, entrega, productos, precios, total).
//  Lo único que NO guarda es el nombre de la tarjeta y sus últimos 4
//  dígitos: esos solo se ven si la foto local es de ESTE mismo pedido.
//  El RLS solo deja leer los pedidos y el perfil del cliente con sesión.
// ============================================================

const PEDIDO_CLAVE = 'pedido-actual';

// Los 4 pasos, con el título y subtítulo que se muestran arriba cuando
// el pedido está en ese paso.
const PASOS = [
  { titulo: 'Pago confirmado',            sub: 'Recibimos tu pago. Ya preparamos tu pedido.' },
  { titulo: 'Estamos preparando tu pedido', sub: 'Lo estamos empacando para enviarlo.' },
  { titulo: 'Tu pedido está en camino',   sub: 'Vamos en camino. Te avisaremos cuando llegue.' },
  { titulo: '¡Pedido entregado!',         sub: 'Tu pedido fue entregado. ¡Gracias por tu compra!' },
];

// La columna 'estado' de pedidos → en qué paso de la línea va el camión.
// 'confirmado' = ya pagó, así que "Pago confirmado" queda Listo y el paso
// activo es "Preparando". El admin cambia el estado y aquí avanza solo.
const PASO_POR_ESTADO = {
  confirmado: 1,
  enviado: 2,
  entregado: 3,
};

function formatoPesos(valor) {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

function leerFoto() {
  try {
    return JSON.parse(localStorage.getItem(PEDIDO_CLAVE));
  } catch {
    return null;
  }
}

// ?id=12 → 12. Number('') y Number(null) dan 0, y 0 || null → null.
const idURL = Number(new URLSearchParams(window.location.search).get('id')) || null;
const foto = leerFoto();

// Lo que se pinta: { id, items: [{ nombre, cantidad, precio }], total,
// fecha, comprador, tarjeta_final }. Lo llena iniciar().
let pedido = null;

// Botón "Cancelar pedido" y su aviso (ver 0c). Van antes de iniciar()
// porque iniciar() decide si el botón se muestra.
const btnCancelar = document.getElementById('btn-cancelar-pedido');
const mensajePedido = document.getElementById('mensaje-pedido');

iniciar();

// ---- 0) ARRANQUE ----
async function iniciar() {
  const idPedido = idURL ?? foto?.id ?? null;
  const { data: sesion } = await db.auth.getUser();

  // Sin sesión no se puede leer la base (RLS): solo queda la foto local
  if (!sesion.user) {
    if (!idURL && foto?.pagado && foto.items?.length) {
      pedido = foto;
      pintarSeguimiento(PASO_POR_ESTADO.confirmado);
      pintarDetalle();
      mensajeEntrega('Inicia sesión para ver los datos de entrega.');
    } else {
      sinPedido('Inicia sesión para ver tus pedidos', 'Entra a Mi cuenta y vuelve a abrir este pedido.');
    }
    return;
  }

  if (!idPedido) {
    sinPedido();
    return;
  }

  const datos = await leerPedidoDeBase(idPedido, sesion.user.id);
  if (!datos) {
    sinPedido('No encontramos este pedido', 'Puede que no sea de tu cuenta o que todavía sea un carrito.');
    return;
  }

  // nombre de la tarjeta y últimos 4: solo si la foto es de este pedido
  const fotoDeEste = foto?.pagado && foto.id === idPedido ? foto : null;
  pedido = {
    ...datos.vista,
    comprador: fotoDeEste?.comprador,
    tarjeta_final: fotoDeEste?.tarjeta_final,
  };

  // El camión va donde diga la base. ?? 1: un estado que no está en el
  // mapa (no debería pasar: el CHECK de la tabla solo deja los conocidos)
  pintarSeguimiento(
    PASO_POR_ESTADO[datos.fila.estado] ?? 1,
    datos.fila.estado === 'cancelado',
    datos.fila.motivo_cancelacion,
  );
  pintarDetalle();
  pintarEntrega(datos.fila, datos.cliente, sesion.user.email);

  // Solo se puede cancelar mientras está en preparación ('confirmado');
  // la base lo vuelve a revisar en cancelar_pedido.
  btnCancelar.hidden = datos.fila.estado !== 'confirmado';
}

// ---- 0c) CANCELAR EL PEDIDO ----
// El navegador NO cambia el estado ni el stock: llama a cancelar_pedido
// (db.rpc). La base revisa que el pedido sea tuyo y siga en preparación,
// lo pasa a 'cancelado' y un trigger devuelve las unidades al stock.
function mostrarMensaje(texto, tipo) {
  mensajePedido.textContent = texto;
  mensajePedido.className = `mensaje-pedido ${tipo}`;
}

btnCancelar.addEventListener('click', async () => {
  if (!pedido?.id) return;
  if (!confirm(`¿Seguro que quieres cancelar el pedido #${pedido.id}? Esta acción no se puede deshacer.`)) return;

  btnCancelar.disabled = true;
  btnCancelar.textContent = 'Cancelando...';
  mostrarMensaje('', '');

  const { error } = await db.rpc('cancelar_pedido', { p_pedido_id: pedido.id });

  btnCancelar.disabled = false;
  btnCancelar.textContent = 'Cancelar pedido';

  if (error) {
    console.log('Error al cancelar el pedido:', error);
    // el texto lo escribe la función (ej. 'Solo puedes cancelar pedidos que aun estan en preparacion')
    mostrarMensaje(error.message, 'error');
    return;
  }

  // La línea de progreso pasa a "Pedido cancelado" y el botón desaparece.
  // El motivo es el que guarda cancelar_pedido cuando cancela el cliente.
  pintarSeguimiento(PASO_POR_ESTADO.confirmado, true, 'Cancelado por el cliente');
  btnCancelar.hidden = true;
  mostrarMensaje(`Pedido #${pedido.id} cancelado con éxito. Los productos volvieron al stock.`, 'ok');
});

// Pantalla "No tienes un pedido activo" (con otro texto si hace falta)
function sinPedido(titulo, texto) {
  if (titulo) document.querySelector('#sin-pedido h1').textContent = titulo;
  if (texto) document.querySelector('#sin-pedido p').textContent = texto;
  document.body.classList.add('sin-pedido');
}

// ---- 0b) LEER EL PEDIDO DE SUPABASE ----
// Cuatro lecturas que no dependen entre sí → a la vez con Promise.all.
// Devuelve null si el pedido no existe, no es de esta cuenta (el RLS lo
// esconde y maybeSingle da null) o sigue siendo un carrito.
async function leerPedidoDeBase(idPedido, idCliente) {
  const [resPedido, resDetalles, resTotal, resCliente] = await Promise.all([
    db.from('pedidos')
      .select('id, estado, envio, direccion, telefono, observacion, created_at, confirmado_en, motivo_cancelacion')
      .eq('id', idPedido)
      .maybeSingle(),
    db.from('detalles_pedidos')
      .select('producto_id, cantidad, precio_unitario')
      .eq('pedido_id', idPedido),
    db.from('pedidos_con_total')
      .select('total')
      .eq('id', idPedido)
      .maybeSingle(),
    db.from('cliente_práctica')
      .select('nombre, correo, telefono, direccion')
      .eq('id', idCliente)
      .maybeSingle(),
  ]);

  [resPedido, resDetalles, resTotal, resCliente].forEach((r) => {
    if (r.error) console.log('Error al leer el pedido:', r.error);
  });

  const fila = resPedido.data;
  if (!fila || fila.estado === 'carrito') return null;

  // Los nombres de los productos están en otra tabla: una sola consulta
  // con .in() para todos, y un objeto { id: nombre } para buscarlos.
  const detalles = resDetalles.data ?? [];
  const nombres = {};
  if (detalles.length > 0) {
    const { data: productos, error } = await db
      .from('productos_práctica')
      .select('id, nombre')
      .in('id', detalles.map((d) => d.producto_id));
    if (error) console.log('Error al leer los productos:', error);
    (productos ?? []).forEach((p) => { nombres[p.id] = p.nombre; });
  }

  return {
    fila,
    cliente: resCliente.data,
    vista: {
      id: fila.id,
      // precio_unitario lo fijó confirmar_pedido: es lo que se cobró
      items: detalles.map((d) => ({
        nombre: nombres[d.producto_id] ?? `Producto #${d.producto_id}`,
        cantidad: d.cantidad,
        precio: d.precio_unitario ?? 0,
      })),
      total: resTotal.data?.total ?? 0,
      fecha: fila.confirmado_en ?? fila.created_at,
    },
  };
}

// ---- 1) LÍNEA DE PROGRESO + CAMIÓN ----
// paso: 0..3 (posición en PASOS). cancelado: el pedido se anuló.
// motivo: por qué se canceló (columna motivo_cancelacion), si lo hay.
function pintarSeguimiento(paso, cancelado = false, motivo = null) {
  // Título y subtítulo según el paso actual.
  document.getElementById('titulo-estado').textContent =
    cancelado ? 'Pedido cancelado' : PASOS[paso].titulo;
  document.getElementById('subtitulo-estado').textContent =
    cancelado ? 'Este pedido fue cancelado. Si tienes dudas, escríbenos.' : PASOS[paso].sub;

  // Caja con el motivo, solo en pedidos cancelados que lo tengan (los que
  // se cancelaron antes de existir la columna no traen motivo).
  // textContent: el texto llega de la base y no se interpreta como HTML.
  const cajaMotivo = document.getElementById('motivo-cancelacion');
  cajaMotivo.hidden = !(cancelado && motivo);
  document.getElementById('motivo-texto').textContent = motivo ?? '';

  // Número de pedido: el id real de la tabla pedidos (fotos viejas sin id
  // usan un número corto sacado de la fecha, como antes).
  const num = pedido.id
    ?? new Date(pedido.pagado_fecha || pedido.fecha || Date.now()).getTime().toString().slice(-6);
  document.getElementById('pedido-numero').textContent = 'Pedido #' + num;

  // Marcar cada paso como completado / activo / pendiente.
  document.querySelectorAll('.paso').forEach((li) => {
    const i = Number(li.dataset.paso);
    li.classList.remove('completado', 'activo');
    const estado = li.querySelector('.paso-estado');
    if (cancelado) {
      estado.textContent = '—'; // cancelado: ningún paso activo
    } else if (i < paso) {
      li.classList.add('completado');
      estado.textContent = 'Listo';
    } else if (i === paso) {
      li.classList.add('activo');
      estado.textContent = 'Ahora';
    } else {
      estado.textContent = 'Pendiente';
    }
  });

  // La magia de la animación: ponemos --activo DESPUÉS de un instante, para
  // que la línea se llene y el camión se deslice desde el inicio al cargar.
  const progreso = document.getElementById('progreso');
  progreso.style.setProperty('--activo', '0');
  requestAnimationFrame(() => {
    // doble rAF: asegura que el valor inicial (0) ya se pintó antes de cambiarlo
    requestAnimationFrame(() => {
      progreso.style.setProperty('--activo', cancelado ? '0' : String(paso));
    });
  });
}

// ---- 2) DATOS DEL PAGO + PRODUCTOS ----
function pintarDetalle() {
  const fecha = new Date(pedido.pagado_fecha || pedido.fecha || Date.now());
  const fechaTexto = fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  // Nombre y tarjeta solo existen si se pagó en este navegador (no se
  // guardan en la base); la fecha siempre.
  const filas = [];
  if (pedido.comprador) filas.push(filaDato('Nombre', pedido.comprador));
  if (pedido.tarjeta_final) filas.push(filaDato('Tarjeta', `•••• ${pedido.tarjeta_final}`));
  filas.push(filaDato('Fecha', fechaTexto));
  document.getElementById('datos-comprador').replaceChildren(...filas);

  // Productos del pedido.
  document.getElementById('detalle-items').innerHTML = pedido.items.map((it) => `
    <div class="item-linea">
      <span>${it.nombre} <span class="il-cant">×${it.cantidad}</span></span>
      <span class="il-precio">${formatoPesos(it.precio * it.cantidad)}</span>
    </div>
  `).join('');

  document.getElementById('detalle-total').textContent = formatoPesos(pedido.total);
}

// ---- 2b) DATOS DE ENTREGA ----
// Una fila "Etiqueta ...... valor" con las clases .dato/.dk/.dv. Con
// textContent (no innerHTML): la dirección y el nombre los escribió el
// cliente, y así nada de lo que escriba se interpreta como HTML.
function filaDato(etiqueta, valor) {
  const fila = document.createElement('div');
  fila.className = 'dato';
  const dk = document.createElement('span');
  dk.className = 'dk';
  dk.textContent = etiqueta;
  const dv = document.createElement('span');
  dv.className = 'dv';
  dv.textContent = valor || '—';
  fila.append(dk, dv);
  return fila;
}

function mensajeEntrega(texto) {
  const p = document.createElement('p');
  p.className = 'texto-pendiente';
  p.textContent = texto;
  document.getElementById('datos-entrega').replaceChildren(p);
}

// p: fila de pedidos (lo que escribió al pagar). c: su fila de
// cliente_práctica ("Mis datos"), que sirve de respaldo.
function pintarEntrega(p, c, correoSesion) {
  const caja = document.getElementById('datos-entrega');

  caja.replaceChildren(
    filaDato('Cliente', c?.nombre),
    filaDato('Correo', c?.correo ?? correoSesion),
    filaDato('Entrega', p.envio ? 'Envío a domicilio' : 'Recoger en tienda'),
    filaDato('Dirección', p.direccion ?? c?.direccion),
    filaDato('Teléfono', p.telefono ?? c?.telefono),
  );

  if (p.observacion) caja.append(filaDato('Observación', p.observacion));
}

// ---- 3) TEMA CLARO / OSCURO ----
const btnTema = document.getElementById('btn-tema');

function actualizarBotonTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  btnTema.textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
}

btnTema.addEventListener('click', () => {
  const html = document.documentElement;
  if (html.dataset.tema === 'oscuro') {
    delete html.dataset.tema;
    localStorage.setItem('tema', 'claro');
  } else {
    html.dataset.tema = 'oscuro';
    localStorage.setItem('tema', 'oscuro');
  }
  actualizarBotonTema();
});

actualizarBotonTema();
