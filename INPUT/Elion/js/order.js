// ============================================================
//  ELION · order.js  (solo pedido.html)
//  Con ?n=EL-1001: seguimiento del pedido (estado, a dónde va,
//  productos y pago). Sin ?n: "Mis pedidos" (buscar + lista).
// ============================================================

const params = new URLSearchParams(window.location.search);
const orderNumber = params.get('n');
const isNew = params.get('nuevo') === '1';   // recién comprado
const view = document.getElementById('order-view');

// "16 nov 2026, 3:42 p. m."
const dateTime = (d) => new Date(d).toLocaleString('es-CO', {
  day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});
// "jueves 20 de noviembre"
const longDate = (d) => new Date(d).toLocaleDateString('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long',
});

if (orderNumber) {
  const order = findOrder(orderNumber);
  if (order) {
    document.title = `Pedido ${order.number} · Elion`;
    renderOrder(order);
    // el estado avanza con el tiempo: se repinta cada 30 s sin recargar
    setInterval(() => renderTracker(order), 30000);
  } else {
    renderList(`No encontramos el pedido <strong>${escapeHTML(orderNumber.toUpperCase())}</strong> en este navegador.`);
  }
} else {
  renderList();
}

// ============================================================
//  SEGUIMIENTO DE UN PEDIDO
// ============================================================
function renderOrder(order) {
  const s = order.shipping;
  const c = order.customer;

  view.innerHTML = `
    <a class="link-back" href="pedido.html">← Mis pedidos</a>

    ${isNew ? `
      <div class="thanks">
        <svg class="isotype-icon" aria-hidden="true"><use href="#isotype"/></svg>
        <div>
          <p class="thanks__title">¡Gracias por tu compra, ${escapeHTML(c.name.split(' ')[0])}!</p>
          <p>Te enviamos la confirmación a <strong>${escapeHTML(c.email)}</strong>. Guarda tu número de pedido para seguirlo.</p>
        </div>
      </div>` : ''}

    <!-- order.js repinta esta parte cada 30 s (renderTracker) -->
    <section class="tracker-card" aria-labelledby="order-status">
      <div id="tracker"></div>
    </section>

    <div class="order-grid">
      <section class="order-block" aria-labelledby="ship-title">
        <h2 class="order-block__title" id="ship-title">Se envía a</h2>
        <p class="order-address">
          <strong>${escapeHTML(c.name)}</strong><br>
          ${escapeHTML(s.address)}${s.notes ? `, ${escapeHTML(s.notes)}` : ''}<br>
          ${escapeHTML(s.city)}, ${s.department}<br>
          Cel. ${escapeHTML(c.phone)}
        </p>
        <dl class="order-facts">
          <div><dt>Envío</dt><dd>${s.methodLabel} · ${s.price === 0 ? 'Gratis' : formatPrice(s.price)}</dd></div>
          <div><dt>Entrega estimada</dt><dd>Entre el ${longDate(s.etaFrom)} y el ${longDate(s.etaTo)}</dd></div>
          <div><dt>Pago</dt><dd>${escapeHTML(order.payment.label)}</dd></div>
          <div><dt>Correo</dt><dd>${escapeHTML(c.email)}</dd></div>
        </dl>
      </section>

      <section class="order-block" aria-labelledby="items-title">
        <h2 class="order-block__title" id="items-title">Tu pedido</h2>
        <div class="summary__lines">
          ${order.items.map((it) => `
            <div class="summary__line">
              <span class="summary__img">
                <img src="${it.image}" alt="" width="64" height="80">
                <span class="summary__qty">${it.qty}</span>
              </span>
              <span class="summary__name">${it.name}<small>${it.colorName} · Talla ${it.size}</small></span>
              <span>${formatPrice(it.unitPrice * it.qty)}</span>
            </div>`).join('')}
        </div>
        <dl class="summary__totals">
          <div><dt>Subtotal</dt><dd>${formatPrice(order.subtotal)}</dd></div>
          ${order.coupon ? `<div class="summary__discount"><dt>Descuento (${order.coupon.code})</dt><dd>−${formatPrice(order.coupon.amount)}</dd></div>` : ''}
          <div><dt>Envío</dt><dd>${s.price === 0 ? 'Gratis' : formatPrice(s.price)}</dd></div>
          <div class="summary__total"><dt>Total</dt><dd>${formatPrice(order.total)}</dd></div>
        </dl>
      </section>
    </div>

    <p class="demo-note">Demostración: sin base de datos, el estado avanza solo con el tiempo
      (Preparando a los 2 min, Enviado a los 5, En camino a los 10 y Entregado a los 20).</p>

    <a class="btn btn--outline" href="index.html#new">Seguir comprando</a>`;

  renderTracker(order);
}

// La línea de estados: pasos hechos, el actual y los que faltan
function renderTracker(order) {
  const current = orderStepIndex(order);
  const step = ORDER_STEPS[current];

  document.getElementById('tracker').innerHTML = `
    <p class="eyebrow eyebrow--dark">Pedido ${order.number} · ${dateTime(order.createdAt)}</p>
    <h1 class="page-title" id="order-status">${step.label}</h1>
    <p class="tracker__text">${step.text}</p>

    <!-- --progress: hasta dónde se llena la línea (0 a 1) -->
    <ol class="tracker" style="--progress:${current / (ORDER_STEPS.length - 1)}">
      ${ORDER_STEPS.map((st, i) => {
        const status = i < current ? 'done' : i === current ? 'current' : 'pending';
        return `
          <li class="tracker__step tracker__step--${status}" ${i === current ? 'aria-current="step"' : ''}>
            <span class="tracker__dot" aria-hidden="true"></span>
            <span class="tracker__label">${st.label}</span>
            <span class="tracker__time">${i <= current ? dateTime(orderStepDate(order, st)) : 'Pendiente'}</span>
          </li>`;
      }).join('')}
    </ol>`;
}

// ============================================================
//  MIS PEDIDOS (buscar + lista)
// ============================================================
function renderList(notice = '') {
  const orders = getOrders();

  view.innerHTML = `
    <h1 class="page-title">Mis pedidos</h1>
    <p class="page-intro">Busca tu pedido con el número que recibiste al comprar (por ejemplo, EL-1001).</p>

    <form class="search-order" id="search-order" novalidate>
      <label class="visually-hidden" for="order-number">Número de pedido</label>
      <input id="order-number" type="text" placeholder="EL-1001" autocomplete="off" value="${escapeHTML(orderNumber)}">
      <button class="btn btn--dark" type="submit">Rastrear</button>
    </form>
    ${notice ? `<p class="form-message is-error">${notice}</p>` : ''}

    <h2 class="order-block__title">Pedidos hechos en este navegador</h2>
    ${orders.length === 0
      ? '<p class="page-intro">Todavía no tienes pedidos. <a class="link-inline" href="index.html#new">Ver novedades</a></p>'
      : `<ul class="order-list">
          ${orders.map((o) => {
            const st = ORDER_STEPS[orderStepIndex(o)];
            const units = o.items.reduce((sum, it) => sum + it.qty, 0);
            return `
              <li>
                <a class="order-row" href="pedido.html?n=${o.number}">
                  <img src="${o.items[0].image}" alt="" width="56" height="70">
                  <span class="order-row__main">
                    <strong>${o.number}</strong>
                    <small>${dateTime(o.createdAt)} · ${units} ${units === 1 ? 'prenda' : 'prendas'}</small>
                  </span>
                  <span class="badge-status badge-status--${st.key}">${st.label}</span>
                  <span class="order-row__total">${formatPrice(o.total)}</span>
                </a>
              </li>`;
          }).join('')}
        </ul>`}`;

  document.getElementById('search-order').addEventListener('submit', (event) => {
    event.preventDefault();
    const n = document.getElementById('order-number').value.trim().toUpperCase();
    if (n) window.location.href = `pedido.html?n=${encodeURIComponent(n)}`;
  });
}
