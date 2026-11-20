// ============================================================
//  INICIO (index.html) — la portada de la tienda, vista del cliente
//  1) Revisa si hay sesión: cambia "Iniciar sesión" por "Mi cuenta"
//     y saluda al cliente.
//  2) Todos los botones con [data-entrar] llevan a la tienda:
//       - CON sesión de cliente → galeria.html
//       - SIN sesión            → cliente.html (login). Al iniciar
//         sesión, cliente.js ya manda al cliente a galeria.html.
//  3) Muestra 4 productos con descuento de productos_práctica.
//  Usa 'db' de supabaseClient.js (se carga antes).
// ============================================================

const btnCuenta = document.getElementById('btn-cuenta');
const btnCrear = document.getElementById('btn-crear');
const saludo = document.getElementById('saludo');

// Lo que se sabe de la sesión (se llena en revisarSesion)
let clienteActual = null;

function formatoPesos(valor) {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

// Escapa lo que viene de la base antes de meterlo con innerHTML
function escaparHTML(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// ---- 1) SESIÓN ----
// Solo cuenta como "cliente" quien tiene su fila en cliente_práctica con
// rol 'cliente' (la misma regla que usa cliente.js para mandar a la galería).
async function revisarSesion() {
  const { data } = await db.auth.getUser();
  if (!data.user) return;

  const { data: cliente, error } = await db
    .from('cliente_práctica')
    .select('nombre, rol')
    .eq('id', data.user.id)
    .maybeSingle();

  if (error) {
    console.log('Error al leer el cliente:', error);
    return;
  }
  if (cliente?.rol !== 'cliente') return; // un admin no entra por aquí

  clienteActual = cliente;
  btnCuenta.innerHTML = '<span class="punto-sesion" aria-hidden="true"></span>Mi cuenta';
  btnCrear.hidden = true;
  saludo.textContent = `Hola, ${cliente.nombre || 'de nuevo'}. Tu carrito te espera.`;
}

// Promesa guardada: si alguien hace clic antes de que termine de revisar,
// el clic espera a que termine (así no lo manda al login por error).
const sesionLista = revisarSesion();

// ---- 2) ENTRAR A LA TIENDA ----
// Un solo listener en el documento: sirve también para las tarjetas de
// destacados, que se crean después (delegación de eventos).
document.addEventListener('click', async (evento) => {
  const boton = evento.target.closest('[data-entrar]');
  if (!boton) return;
  boton.disabled = true;
  await sesionLista;
  window.location.href = clienteActual ? 'galeria.html' : 'cliente.html';
});

// ---- 3) DESTACADOS ----
const contenedor = document.getElementById('destacados');
const seccionDestacados = document.getElementById('seccion-destacados');

function tarjetaProducto(p) {
  const conDescuento = p.descuento > 0;
  const precioFinal = p.precio * (1 - (p.descuento ?? 0));
  return `
    <button type="button" class="producto" data-entrar>
      <span class="producto__foto">
        <img src="${escaparHTML(p.img_URL)}" alt="${escaparHTML(p.nombre)}" loading="lazy">
        ${conDescuento ? `<span class="producto__descuento">-${Math.round(p.descuento * 100)}%</span>` : ''}
      </span>
      <span>
        <span class="producto__nombre">${escaparHTML(p.nombre)}</span>
        <span class="producto__precio">
          ${conDescuento ? `<s>${formatoPesos(p.precio)}</s>` : ''}${formatoPesos(precioFinal)}
        </span>
      </span>
    </button>`;
}

async function cargarDestacados() {
  // los de mayor descuento, solo disponibles y con stock
  const { data, error } = await db
    .from('productos_práctica')
    .select('id, nombre, precio, descuento, img_URL')
    .eq('disponible', true)
    .gt('unidades', 0)
    .order('descuento', { ascending: false })
    .limit(4);

  // sin permiso de lectura (RLS) o sin productos: la sección no se muestra
  if (error || !data || data.length === 0) {
    if (error) console.log('Error al leer los destacados:', error);
    seccionDestacados.hidden = true;
    return;
  }

  contenedor.classList.remove('cargando');
  contenedor.innerHTML = data.map(tarjetaProducto).join('');
}

cargarDestacados();

// ---- 4) TEMA CLARO / OSCURO (igual que en el resto de páginas) ----
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
