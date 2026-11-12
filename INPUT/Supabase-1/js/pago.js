// ============================================================
//  PANTALLA DE PAGO (demo)
//  Lee la "foto" del pedido que galeria.js guardó en localStorage
//  ('pedido-actual'), muestra el resumen y un formulario de pago FALSO.
//  Al enviar: marca el pedido como pagado, guarda el nombre del comprador
//  y los últimos 4 dígitos (NUNCA la tarjeta completa) y muestra la
//  animación de éxito, que lleva a estado-pedido.html.
//
//  TODO Supabase: en vez de localStorage, aquí se insertará el pedido en
//  una tabla pedidos_práctica (con el id del cliente autenticado).
// ============================================================

const PEDIDO_CLAVE = 'pedido-actual';

// ---- formato de pesos, igual que en galeria.js/admin.js ----
function formatoPesos(valor) {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

// ---- 1) LEER EL PEDIDO ----
function leerPedido() {
  try {
    return JSON.parse(localStorage.getItem(PEDIDO_CLAVE));
  } catch {
    return null;
  }
}

const pedido = leerPedido();

// ---- 2) PINTAR EL RESUMEN ----
const resumenItems = document.getElementById('resumen-items');
const resumenTotal = document.getElementById('resumen-total');
const btnMonto = document.getElementById('btn-monto');

function pintarResumen() {
  // Sin pedido (entró directo a pago.html): aviso y volver a la tienda.
  if (!pedido || !pedido.items || pedido.items.length === 0) {
    resumenItems.innerHTML =
      '<p class="resumen-vacio">No hay ningún pedido. Vuelve a la tienda y agrega productos al carrito.</p>';
    resumenTotal.textContent = formatoPesos(0);
    const form = document.getElementById('form-pago');
    form.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  resumenItems.innerHTML = pedido.items.map((it) => `
    <div class="resumen-item">
      <span class="ri-nombre">${it.nombre} <span class="ri-cant">×${it.cantidad}</span></span>
      <span class="ri-precio">${formatoPesos(it.precio * it.cantidad)}</span>
    </div>
  `).join('');

  resumenTotal.textContent = formatoPesos(pedido.total);
  btnMonto.textContent = formatoPesos(pedido.total);
}

pintarResumen();

// ---- 3) FORMATEAR LOS CAMPOS MIENTRAS SE ESCRIBE ----
const inputNombre = document.getElementById('nombre');
const inputTarjeta = document.getElementById('tarjeta');
const inputVence = document.getElementById('vence');
const inputCvv = document.getElementById('cvv');

// Número de tarjeta: solo dígitos, en grupos de 4 → "4242 4242 4242 4242"
inputTarjeta.addEventListener('input', () => {
  const soloDigitos = inputTarjeta.value.replace(/\D/g, '').slice(0, 16);
  inputTarjeta.value = soloDigitos.replace(/(.{4})/g, '$1 ').trim();
});

// Vencimiento: MM/AA
inputVence.addEventListener('input', () => {
  const d = inputVence.value.replace(/\D/g, '').slice(0, 4);
  inputVence.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
});

// CVV: solo dígitos
inputCvv.addEventListener('input', () => {
  inputCvv.value = inputCvv.value.replace(/\D/g, '').slice(0, 4);
});

// ---- 4) VALIDACIÓN (básica, de demo) ----
const errorNombre = document.getElementById('error-nombre');
const errorTarjeta = document.getElementById('error-tarjeta');

function validar() {
  let ok = true;
  errorNombre.textContent = '';
  errorTarjeta.textContent = '';

  if (inputNombre.value.trim().length < 3) {
    errorNombre.textContent = 'Escribe el nombre que aparece en la tarjeta.';
    ok = false;
  }

  const digitos = inputTarjeta.value.replace(/\D/g, '');
  if (digitos.length !== 16) {
    errorTarjeta.textContent = 'El número debe tener 16 dígitos.';
    ok = false;
  }

  return ok;
}

// ---- 5) ENVIAR: "pagar" ----
const form = document.getElementById('form-pago');
const btnPagarAhora = document.getElementById('btn-pagar-ahora');
const exitoTotal = document.getElementById('exito-total');

form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  if (!pedido || !pedido.items || pedido.items.length === 0) return;
  if (!validar()) return;

  // "Procesando..." un instante, para que se sienta como un pago real.
  btnPagarAhora.disabled = true;
  btnPagarAhora.textContent = 'Procesando...';

  setTimeout(() => {
    // Guardamos el pedido como PAGADO. Solo los últimos 4 dígitos.
    const digitos = inputTarjeta.value.replace(/\D/g, '');
    const pedidoPagado = {
      ...pedido,
      pagado: true,
      pagado_fecha: new Date().toISOString(),
      comprador: inputNombre.value.trim(),
      tarjeta_final: digitos.slice(-4),
    };
    localStorage.setItem(PEDIDO_CLAVE, JSON.stringify(pedidoPagado));

    // Mostrar la vista de éxito (el CSS la enseña con body.pagado).
    exitoTotal.textContent = 'Total pagado: ' + formatoPesos(pedido.total);
    document.body.classList.add('pagado');
    window.scrollTo(0, 0);
  }, 700);
});

// ---- 6) TEMA CLARO / OSCURO (igual que en el resto de páginas) ----
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
