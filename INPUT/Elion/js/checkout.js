// ============================================================
//  ELION · checkout.js  (solo checkout.html)
//  Formulario en 3 pasos (dirección → envío → pago), validación de
//  cada campo, cupón de descuento y resumen del pedido. Al pagar
//  crea el pedido (store.js) y lleva a pedido.html?n=EL-1001.
// ============================================================

const DEPARTMENTS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Boyacá',
  'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca',
  'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
  'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia',
  'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada',
];

const form = document.getElementById('checkout-form');
const steps = [...document.querySelectorAll('.step')];

// estado de la compra (lo que el usuario va eligiendo)
const state = {
  step: 1,
  shippingMethod: 'standard',
  coupon: getSavedCoupon() ?? '',   // el del pop-up se aplica solo
  shippingChosen: false,            // el envío se muestra desde el paso 2
};

// ---- carrito vacío: no hay nada que pagar ----
if (cartCount() === 0) {
  document.getElementById('checkout').hidden = true;
  document.getElementById('checkout-empty').hidden = false;
}

// ---- opciones de departamento ----
document.getElementById('department').innerHTML =
  '<option value="">Elige un departamento</option>' +
  DEPARTMENTS.map((d) => `<option>${d}</option>`).join('');

// ============================================================
//  PASOS
// ============================================================
// scroll = false al cargar la página (no mover la pantalla)
function showStep(n, scroll = true) {
  state.step = n;
  steps.forEach((section) => {
    const s = Number(section.dataset.step);
    section.classList.toggle('is-active', s === n);
    section.classList.toggle('is-done', s < n);
  });
  // lleva la pantalla al paso que se abrió (útil en celular). Espera a
  // que termine la animación de abrir/cerrar (0.5 s en styles.css):
  // antes, el paso todavía se está moviendo y el scroll quedaría corto.
  if (!scroll) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    steps[n - 1].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, reduce ? 0 : 500);
}

// "Continuar": valida el paso actual antes de abrir el siguiente
form.addEventListener('click', (event) => {
  const next = event.target.closest('[data-next]');
  const edit = event.target.closest('[data-edit]');

  if (next) {
    const ok = state.step === 1 ? validateAddress() : true;
    if (!ok) return;
    if (state.step === 1) {
      fillSummary1();
      renderShippingOptions();
    }
    if (state.step === 2) {
      state.shippingChosen = true;
      fillSummary2();
      renderSummary();
    }
    showStep(Number(next.dataset.next));
  }

  if (edit) showStep(Number(edit.dataset.edit));
});

// ============================================================
//  VALIDACIÓN
//  Cada regla devuelve '' si está bien, o el mensaje de error.
// ============================================================
const value = (name) => form.elements[name].value.trim();

const RULES = {
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Escribe un correo válido.'),
  fullName: (v) => (v.split(/\s+/).length >= 2 ? '' : 'Escribe tu nombre y apellido.'),
  docNumber: (v) => (/^\d{6,10}$/.test(v) ? '' : 'La cédula debe tener entre 6 y 10 números.'),
  phone: (v) => (/^3\d{9}$/.test(v) ? '' : 'El celular debe tener 10 números y empezar por 3.'),
  department: (v) => (v ? '' : 'Elige un departamento.'),
  city: (v) => (v.length >= 3 ? '' : 'Escribe tu ciudad.'),
  address: (v) => (v.length >= 6 ? '' : 'Escribe la dirección completa.'),
  cardNumber: (v) => (/^\d{16}$/.test(v.replace(/\s/g, '')) ? '' : 'El número debe tener 16 dígitos.'),
  cardName: (v) => (v.length >= 3 ? '' : 'Escribe el nombre como aparece en la tarjeta.'),
  cardExp: (v) => validateExpiry(v),
  cardCvv: (v) => (/^\d{3,4}$/.test(v) ? '' : 'El CVV tiene 3 o 4 números.'),
  pseBank: (v) => (v ? '' : 'Elige tu banco.'),
};

// MM/AA que no esté vencida
function validateExpiry(v) {
  const match = v.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return 'Usa el formato MM/AA.';
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return 'El mes debe estar entre 01 y 12.';
  // el último día del mes de vencimiento (día 0 del mes siguiente)
  const lastDay = new Date(year, month, 0, 23, 59);
  return lastDay >= new Date() ? '' : 'La tarjeta está vencida.';
}

// revisa una lista de campos, pinta los errores y devuelve si todo
// está bien; además pone el foco en el primer campo con error
function validateFields(names) {
  let firstBad = null;
  names.forEach((name) => {
    const message = RULES[name](value(name));
    const input = form.elements[name];
    form.querySelector(`[data-error-for="${name}"]`).textContent = message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
    if (message && !firstBad) firstBad = input;
  });
  if (firstBad) firstBad.focus();
  return !firstBad;
}

function validateAddress() {
  return validateFields(['email', 'fullName', 'docNumber', 'phone', 'department', 'city', 'address']);
}

// al corregir un campo, su error se borra apenas sale de él
form.addEventListener('focusout', (event) => {
  const name = event.target.name;
  if (RULES[name] && event.target.getAttribute('aria-invalid') === 'true') {
    validateFields([name]);
  }
});

// formatos mientras se escribe: solo números, tarjeta en grupos de 4,
// vencimiento con la barra
form.addEventListener('input', (event) => {
  const input = event.target;
  if (['docNumber', 'phone', 'cardCvv'].includes(input.name)) {
    input.value = input.value.replace(/\D/g, '');
  }
  if (input.name === 'cardNumber') {
    input.value = input.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }
  if (input.name === 'cardExp') {
    const d = input.value.replace(/\D/g, '').slice(0, 4);
    input.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }
});

// ============================================================
//  PASO 1 → resumen de la dirección
// ============================================================
function fillSummary1() {
  document.getElementById('summary-1').textContent =
    `${value('fullName')} · ${value('address')}, ${value('city')} (${value('department')})`;
}

// ============================================================
//  PASO 2: MÉTODO DE ENVÍO
// ============================================================
// "jue 20 nov"
const shortDate = (d) => d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });

function etaRange(method, from = new Date()) {
  const [min, max] = SHIPPING_METHODS[method].days;
  return { from: addBusinessDays(from, min), to: addBusinessDays(from, max) };
}

function renderShippingOptions() {
  const subtotal = cartSubtotal();
  const box = document.getElementById('shipping-options');

  box.innerHTML = '<legend class="visually-hidden">Método de envío</legend>' +
    Object.entries(SHIPPING_METHODS).map(([key, m]) => {
      const cost = shippingCost(key, subtotal);
      const eta = etaRange(key);
      return `
        <label class="option">
          <input type="radio" name="shipMethod" value="${key}" ${key === state.shippingMethod ? 'checked' : ''}>
          <span class="option__text">
            <strong>${m.label}</strong>
            <small>Llega entre el ${shortDate(eta.from)} y el ${shortDate(eta.to)}</small>
          </span>
          <span class="option__price">${cost === 0 ? 'Gratis' : formatPrice(cost)}</span>
        </label>`;
    }).join('');
}

document.getElementById('shipping-options').addEventListener('change', (event) => {
  state.shippingMethod = event.target.value;
  state.shippingChosen = true;
  renderSummary();
});

function fillSummary2() {
  const m = SHIPPING_METHODS[state.shippingMethod];
  const cost = shippingCost(state.shippingMethod, cartSubtotal());
  document.getElementById('summary-2').textContent =
    `${m.label} · ${cost === 0 ? 'Gratis' : formatPrice(cost)}`;
}

// ============================================================
//  PASO 3: PAGO
// ============================================================
// al cambiar de método, se muestra solo su panel de campos
form.addEventListener('change', (event) => {
  if (event.target.name !== 'payMethod') return;
  form.querySelectorAll('.option__panel').forEach((panel) => {
    panel.hidden = panel.dataset.panel !== event.target.value;
  });
});

const payButton = document.getElementById('pay-button');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (state.step !== 3) return;

  const method = form.elements.payMethod.value;
  const fields = {
    card: ['cardNumber', 'cardName', 'cardExp', 'cardCvv'],
    pse: ['pseBank'],
    cod: [],
  }[method];
  if (!validateFields(fields)) return;

  // qué se guarda del pago: NUNCA la tarjeta completa ni el CVV
  const payment = {
    card: { method, label: `Tarjeta •••• ${value('cardNumber').replace(/\s/g, '').slice(-4)}` },
    pse: { method, label: `PSE · ${value('pseBank')}` },
    cod: { method, label: 'Contraentrega (efectivo)' },
  }[method];

  payButton.disabled = true;
  payButton.textContent = 'Procesando pago…';

  // un instante de "procesando", como en una pasarela real
  setTimeout(() => {
    const eta = etaRange(state.shippingMethod);
    const order = createOrder({
      customer: {
        email: value('email'),
        name: value('fullName'),
        docNumber: value('docNumber'),
        phone: value('phone'),
      },
      shipping: {
        method: state.shippingMethod,
        methodLabel: SHIPPING_METHODS[state.shippingMethod].label,
        department: value('department'),
        city: value('city'),
        address: value('address'),
        notes: value('addressNotes'),
        etaFrom: eta.from.toISOString(),
        etaTo: eta.to.toISOString(),
      },
      payment,
      couponCode: state.coupon,
    });

    clearCart();
    saveCoupon(null);   // el cupón es de primera compra: ya se usó
    window.location.href = `pedido.html?n=${order.number}&nuevo=1`;
  }, 1200);
});

// ============================================================
//  RESUMEN (columna derecha)
// ============================================================
function totals() {
  const subtotal = cartSubtotal();
  const discount = Math.round(subtotal * couponRate(state.coupon));
  const shipping = state.shippingChosen ? shippingCost(state.shippingMethod, subtotal) : null;
  return { subtotal, discount, shipping, total: subtotal - discount + (shipping ?? 0) };
}

function renderSummary() {
  const t = totals();

  document.getElementById('summary-lines').innerHTML = cartLines().map((l) => `
    <div class="summary__line">
      <span class="summary__img">
        <img src="${productImage(l.product)}" alt="" width="64" height="80">
        <span class="summary__qty">${l.qty}</span>
      </span>
      <span class="summary__name">${l.product.name}<small>${l.product.colorName} · Talla ${l.size}</small></span>
      <span>${formatPrice(l.total)}</span>
    </div>`).join('');

  document.getElementById('summary-totals').innerHTML = `
    <div><dt>Subtotal</dt><dd>${formatPrice(t.subtotal)}</dd></div>
    ${t.discount ? `<div class="summary__discount"><dt>Descuento (${state.coupon.toUpperCase()})</dt><dd>−${formatPrice(t.discount)}</dd></div>` : ''}
    <div><dt>Envío</dt><dd>${t.shipping === null ? 'Se calcula en el paso 2' : (t.shipping === 0 ? 'Gratis' : formatPrice(t.shipping))}</dd></div>
    <div class="summary__total"><dt>Total</dt><dd>${formatPrice(t.total)}</dd></div>`;

  document.getElementById('summary-total-top').textContent = formatPrice(t.total);
  payButton.textContent = `Pagar ${formatPrice(t.total)}`;
}

// ---- cupón ----
const couponInput = document.getElementById('coupon');
const couponMessage = document.getElementById('coupon-message');
couponInput.value = state.coupon;

document.getElementById('coupon-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const code = couponInput.value.trim();

  if (!code) {
    state.coupon = '';
    couponMessage.textContent = '';
  } else if (couponRate(code) > 0) {
    state.coupon = code;
    couponMessage.classList.remove('is-error');
    couponMessage.textContent = `Código ${code.toUpperCase()} aplicado: ${couponRate(code) * 100}% de descuento.`;
  } else {
    state.coupon = '';
    couponMessage.classList.add('is-error');
    couponMessage.textContent = 'Ese código no existe o ya no está vigente.';
  }
  renderSummary();
});

if (state.coupon) {
  couponMessage.textContent = `Código ${state.coupon} aplicado: ${couponRate(state.coupon) * 100}% de descuento.`;
}

// si cambian cantidades desde el carrito lateral, el resumen se repinta
document.addEventListener('cart:change', () => {
  if (cartCount() === 0) window.location.reload();
  renderSummary();
  if (state.step >= 2) renderShippingOptions();
});

// en celular el resumen arranca plegado (solo se ve el total)
if (window.matchMedia('(max-width: 900px)').matches) {
  document.getElementById('summary-details').open = false;
}

renderSummary();
showStep(1, false);
