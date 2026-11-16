// ============================================================
//  PANTALLA DE PAGO
//  Lee la "foto" del carrito que galeria.js guardó en localStorage
//  ('pedido-actual') para el resumen, pide los datos de ENTREGA
//  (rellenados con "Mis datos" del cliente) y un pago de tarjeta FALSO.
//  Al enviar: llama a la función confirmar_pedido de Supabase, que revisa
//  stock, guarda la entrega y pasa el pedido a 'confirmado'. El total que
//  se muestra al final es el que calculó la base (pedidos_con_total).
//  De la tarjeta solo se guardan los últimos 4 dígitos (NUNCA la completa).
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
  // Sin pedido (entró directo a pago.html, o la foto es de antes de
  // conectar Supabase y no trae id): aviso y volver a la tienda.
  if (!pedido || !pedido.id || pedido.pagado || !pedido.items || pedido.items.length === 0) {
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

// ---- 2b) DATOS DE ENTREGA ----
const checkEnvio = document.getElementById('envio');
const inputDireccion = document.getElementById('direccion');
const inputTelefono = document.getElementById('telefono');
const inputObservacion = document.getElementById('observacion');
const mensajePago = document.getElementById('mensaje-pago');

// Rellena dirección y teléfono con los de "Mis datos" (cliente_práctica).
// Con el RLS nuevo, cada cliente solo puede leer SU fila: por eso basta
// con filtrar por su id. Si no hay sesión o no hay datos, quedan vacíos.
async function rellenarEntrega() {
  const { data: sesion } = await db.auth.getUser();
  if (!sesion.user) return;

  const { data, error } = await db
    .from('cliente_práctica')
    .select('direccion, telefono')
    .eq('id', sesion.user.id)
    .maybeSingle();

  if (error) {
    console.log('Error al leer los datos del cliente:', error);
    return;
  }
  if (!data) return;

  inputDireccion.value = data.direccion ?? '';
  inputTelefono.value = data.telefono ?? '';
  // si ya tiene dirección guardada, lo más probable es que quiera envío
  checkEnvio.checked = Boolean(data.direccion);
}

rellenarEntrega();

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
const errorDireccion = document.getElementById('error-direccion');
const errorTelefono = document.getElementById('error-telefono');

function validar() {
  let ok = true;
  errorNombre.textContent = '';
  errorTarjeta.textContent = '';
  errorDireccion.textContent = '';
  errorTelefono.textContent = '';

  // dirección y teléfono solo son obligatorios con envío a domicilio
  // (la función de la base también lo revisa: esto es para avisar rápido)
  if (checkEnvio.checked && !inputDireccion.value.trim()) {
    errorDireccion.textContent = 'Escribe la dirección de entrega.';
    ok = false;
  }
  if (checkEnvio.checked && !inputTelefono.value.trim()) {
    errorTelefono.textContent = 'Escribe un teléfono de contacto.';
    ok = false;
  }

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

// El navegador NO calcula el total ni cambia el estado: solo llama a la
// función confirmar_pedido (db.rpc). Todo lo de adentro pasa en una sola
// transacción: o se aplica completo o no se aplica nada.
form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!pedido || !pedido.id || !pedido.items || pedido.items.length === 0) return;
  if (!validar()) return;

  btnPagarAhora.disabled = true;
  btnPagarAhora.textContent = 'Procesando...';
  mensajePago.textContent = '';

  // trim() || null: un campo vacío viaja como null, no como ''
  const { data, error } = await db.rpc('confirmar_pedido', {
    p_pedido_id: pedido.id,
    p_envio: checkEnvio.checked,
    p_direccion: inputDireccion.value.trim() || null,
    p_telefono: inputTelefono.value.trim() || null,
    p_observacion: inputObservacion.value.trim() || null,
  });

  if (error) {
    console.log('Error al confirmar el pedido:', error);
    // el texto lo escribe la función (ej. 'Stock insuficiente para el producto 2')
    mensajePago.textContent = error.message;
    btnPagarAhora.disabled = false;
    btnPagarAhora.innerHTML = 'Pagar <span id="btn-monto"></span>';
    document.getElementById('btn-monto').textContent = formatoPesos(pedido.total);
    return;
  }

  // El total definitivo lo calculó la base, no el navegador
  const { data: conTotal, error: errorTotal } = await db
    .from('pedidos_con_total')
    .select('total')
    .eq('id', data.id)
    .single();

  if (errorTotal) console.log('Error al leer el total:', errorTotal);
  const total = conTotal ? conTotal.total : pedido.total;

  // Foto del pedido PAGADO para estado-pedido.html. Solo los últimos 4 dígitos.
  const digitos = inputTarjeta.value.replace(/\D/g, '');
  const pedidoPagado = {
    ...pedido,
    total,
    pagado: true,
    pagado_fecha: data.confirmado_en ?? new Date().toISOString(),
    comprador: inputNombre.value.trim(),
    tarjeta_final: digitos.slice(-4),
    envio: data.envio,
    direccion: data.direccion,
  };
  localStorage.setItem(PEDIDO_CLAVE, JSON.stringify(pedidoPagado));

  // Mostrar la vista de éxito (el CSS la enseña con body.pagado).
  exitoTotal.textContent = `Pedido #${data.id} · Total pagado: ${formatoPesos(total)}`;
  document.body.classList.add('pagado');
  window.scrollTo(0, 0);
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
