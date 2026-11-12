// ============================================================
//  ESTADO DEL PEDIDO (seguimiento estilo Mercado Libre)
//  Lee el pedido PAGADO de localStorage ('pedido-actual') y pinta:
//   - la línea de progreso con el camioncito en el paso actual
//   - los datos del comprador y el detalle de productos
//
//  TODO Supabase: el estado (0..3) y la dirección de envío saldrán de
//  una tabla pedidos_práctica en vez de estar fijos aquí.
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

// PASO ACTUAL (demo): 2 = "En camino". Cuando conectemos Supabase, este
// número vendrá de la columna 'estado' del pedido.
const PASO_ACTUAL = 2;

function formatoPesos(valor) {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

function leerPedido() {
  try {
    return JSON.parse(localStorage.getItem(PEDIDO_CLAVE));
  } catch {
    return null;
  }
}

const pedido = leerPedido();

// ---- Sin pedido pagado: mostrar la pantalla "No tienes un pedido activo" ----
if (!pedido || !pedido.pagado || !pedido.items || pedido.items.length === 0) {
  document.body.classList.add('sin-pedido');
} else {
  pintarSeguimiento();
  pintarDetalle();
}

// ---- 1) LÍNEA DE PROGRESO + CAMIÓN ----
function pintarSeguimiento() {
  // Título y subtítulo según el paso actual.
  document.getElementById('titulo-estado').textContent = PASOS[PASO_ACTUAL].titulo;
  document.getElementById('subtitulo-estado').textContent = PASOS[PASO_ACTUAL].sub;

  // Número de pedido corto, a partir de la fecha (demo).
  const num = new Date(pedido.pagado_fecha || pedido.fecha || Date.now()).getTime().toString().slice(-6);
  document.getElementById('pedido-numero').textContent = 'Pedido #' + num;

  // Marcar cada paso como completado / activo / pendiente.
  document.querySelectorAll('.paso').forEach((li) => {
    const i = Number(li.dataset.paso);
    li.classList.remove('completado', 'activo');
    const estado = li.querySelector('.paso-estado');
    if (i < PASO_ACTUAL) {
      li.classList.add('completado');
      estado.textContent = 'Listo';
    } else if (i === PASO_ACTUAL) {
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
      progreso.style.setProperty('--activo', String(PASO_ACTUAL));
    });
  });
}

// ---- 2) DATOS DEL COMPRADOR + PRODUCTOS ----
function pintarDetalle() {
  const fecha = new Date(pedido.pagado_fecha || pedido.fecha || Date.now());
  const fechaTexto = fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  // Datos del comprador (lo que escribió en el pago).
  document.getElementById('datos-comprador').innerHTML = `
    <div class="dato"><span class="dk">Nombre</span><span class="dv">${pedido.comprador || '—'}</span></div>
    <div class="dato"><span class="dk">Tarjeta</span><span class="dv">•••• ${pedido.tarjeta_final || '0000'}</span></div>
    <div class="dato"><span class="dk">Fecha</span><span class="dv">${fechaTexto}</span></div>
  `;

  // Productos del pedido.
  document.getElementById('detalle-items').innerHTML = pedido.items.map((it) => `
    <div class="item-linea">
      <span>${it.nombre} <span class="il-cant">×${it.cantidad}</span></span>
      <span class="il-precio">${formatoPesos(it.precio * it.cantidad)}</span>
    </div>
  `).join('');

  document.getElementById('detalle-total').textContent = formatoPesos(pedido.total);
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
