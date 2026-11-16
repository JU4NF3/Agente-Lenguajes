// ============================================================
//  ELION · layout.js
//  Lo que se repite en TODAS las páginas: header, menú hamburguesa,
//  carrito lateral, footer y aviso flotante. En vez de copiar ese
//  HTML en cada archivo, este script lo inserta: si cambias el
//  footer aquí, cambia en todas las páginas a la vez.
//
//  Cada página solo necesita un <main id="main"> y cargar, en orden:
//  products.js → store.js → layout.js → (script propio de la página)
//  En la página de inicio, <body class="page--home"> hace que el
//  header sea transparente sobre el video.
// ============================================================

const isHome = document.body.classList.contains('page--home');

// ---------------- PLANTILLAS ----------------
const ICONS = {
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

const TOP_HTML = `
  <!-- ISOTIPO como "símbolo": se reutiliza con <svg><use href="#isotype"/></svg>.
       fill="currentColor": toma el color del texto de donde se use. -->
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <symbol id="isotype" viewBox="447.5 175 640 640">
      <path fill="currentColor" d="M805 215 L803 400 C803 450 770 493 715 493 L460 493 C600 470 700 455 740 420 C770 390 790 300 805 215 Z"/>
      <path fill="currentColor" d="M1075 478 L845 478 C790 478 760 520 760 570 L760 775 C775 690 800 600 830 555 C860 520 960 500 1075 478 Z"/>
    </symbol>
  </svg>

  <a class="skip-link" href="#main">Saltar al contenido</a>

  <header class="header" id="header">
    <div class="header__left">
      <button class="icon-btn" id="menu-open" type="button" aria-label="Abrir menú" aria-controls="menu-drawer">${ICONS.menu}</button>
      <button class="icon-btn icon-btn--desktop" type="button" aria-label="Buscar">${ICONS.search}</button>
    </div>

    <a class="header__logo" href="index.html" aria-label="Elion, inicio">
      <span class="header__wordmark">ELION</span>
      <svg class="header__isotype" aria-hidden="true"><use href="#isotype"/></svg>
    </a>

    <div class="header__right">
      <button class="icon-btn icon-btn--mobile" type="button" aria-label="Buscar">${ICONS.search}</button>
      <a class="icon-btn" href="pedido.html" aria-label="Mis pedidos">${ICONS.user}</a>
      <button class="icon-btn" id="cart-open" type="button" aria-label="Abrir carrito" aria-controls="cart-drawer">
        ${ICONS.bag}
        <span class="cart-count" id="cart-count" hidden>0</span>
      </button>
    </div>
  </header>

  <!-- MENÚ HAMBURGUESA (panel izquierdo) -->
  <dialog class="drawer" id="menu-drawer" aria-label="Menú">
    <div class="drawer__inner">
      <div class="drawer__top">
        <span class="drawer__brand">
          <svg class="isotype-icon" aria-hidden="true"><use href="#isotype"/></svg>
          ELION
        </span>
        <button class="icon-btn" data-close type="button" aria-label="Cerrar menú">${ICONS.close}</button>
      </div>
      <nav aria-label="Categorías">
        <ul class="drawer__links">
          <li><a href="index.html#new">Novedades</a></li>
          <li><a href="index.html#new">Hoodies</a></li>
          <li><a href="index.html#new">Camisetas</a></li>
          <li><a href="index.html#best">Crewnecks</a></li>
          <li><a href="index.html#best">Gorras</a></li>
          <li><a href="index.html#best">Más vendidos</a></li>
        </ul>
      </nav>
      <ul class="drawer__secondary">
        <li><a href="pedido.html">Mis pedidos</a></li>
        <li><a href="#footer">Nuestra historia</a></li>
        <li><a href="#footer">Ayuda</a></li>
      </ul>
      <p class="drawer__verse">“Todo lo puedo en Cristo que me fortalece.”<br><span>Filipenses 4:13</span></p>
    </div>
  </dialog>

  <!-- CARRITO (panel derecho). renderCart() llena las partes con id -->
  <dialog class="drawer drawer--right" id="cart-drawer" aria-labelledby="cart-title">
    <div class="drawer__inner cart">
      <div class="drawer__top">
        <h2 class="cart__title" id="cart-title">Tu carrito <span id="cart-title-count"></span></h2>
        <button class="icon-btn" data-close type="button" aria-label="Cerrar carrito">${ICONS.close}</button>
      </div>
      <div class="cart__shipping" id="cart-shipping"></div>
      <div class="cart__lines" id="cart-lines"></div>
      <div class="cart__footer" id="cart-footer">
        <div class="cart__row"><span>Subtotal</span><strong id="cart-subtotal">$0</strong></div>
        <p class="cart__note">El envío y los descuentos se calculan al finalizar la compra.</p>
        <a class="btn btn--dark btn--block" href="checkout.html">Finalizar compra</a>
      </div>
    </div>
  </dialog>`;

const FOOTER_HTML = `
  <footer class="footer" id="footer">
    <div class="footer__newsletter">
      <div>
        <h2 class="footer__title">Únete a la familia Elion</h2>
        <p class="footer__text">Lanzamientos, drops limitados y un versículo cada semana.</p>
      </div>
      <form class="inline-form" id="footer-form" novalidate>
        <label class="visually-hidden" for="footer-email">Correo electrónico</label>
        <input id="footer-email" type="email" placeholder="Tu correo electrónico" autocomplete="email" required>
        <button type="submit" aria-label="Suscribirme">${ICONS.arrow}</button>
      </form>
      <p class="form-message" id="footer-message" role="status"></p>
    </div>

    <div class="footer__columns">
      <nav aria-labelledby="f-shop">
        <h3 id="f-shop">Tienda</h3>
        <ul>
          <li><a href="index.html#new">Novedades</a></li>
          <li><a href="index.html#new">Hoodies</a></li>
          <li><a href="index.html#new">Camisetas</a></li>
          <li><a href="index.html#best">Gorras</a></li>
        </ul>
      </nav>
      <nav aria-labelledby="f-help">
        <h3 id="f-help">Ayuda</h3>
        <ul>
          <li><a href="pedido.html">Rastrear mi pedido</a></li>
          <li><a href="#">Envíos</a></li>
          <li><a href="#">Cambios y devoluciones</a></li>
          <li><a href="#">Guía de tallas</a></li>
        </ul>
      </nav>
      <nav aria-labelledby="f-brand">
        <h3 id="f-brand">Elion</h3>
        <ul>
          <li><a href="#">Nuestra historia</a></li>
          <li><a href="#">Comunidad</a></li>
          <li><a href="#">Ministerio</a></li>
        </ul>
      </nav>
      <div>
        <h3>Síguenos</h3>
        <ul class="social">
          <li><a href="#" aria-label="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.6"/></svg></a></li>
          <li><a href="#" aria-label="TikTok"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.8 2.3 4.5 5 4.8"/></svg></a></li>
          <li><a href="#" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/></svg></a></li>
        </ul>
      </div>
    </div>

    <!-- MARCA: la cruz GRANDE y "ELION" pequeño debajo, como firma -->
    <a class="footer__brand" href="index.html" aria-label="Elion, inicio">
      <svg class="footer__isotype" aria-hidden="true"><use href="#isotype"/></svg>
      <span class="footer__name">ELION</span>
    </a>

    <div class="footer__bottom">
      <p>© 2026 Elion. Todos los derechos reservados.</p>
      <p class="footer__verse">“Todo lo puedo en Cristo que me fortalece.” — Filipenses 4:13</p>
      <ul>
        <li><a href="#">Términos</a></li>
        <li><a href="#">Privacidad</a></li>
      </ul>
    </div>
  </footer>

  <div class="toast" id="toast" role="status" hidden></div>`;

// insertAdjacentHTML: mete el HTML sin borrar lo que ya hay en la página
document.body.insertAdjacentHTML('afterbegin', TOP_HTML);
document.getElementById('main').insertAdjacentHTML('afterend', FOOTER_HTML);

// ---------------- HEADER ----------------
const header = document.getElementById('header');

if (isHome) {
  // inicio: transparente sobre el video; al bajar 40px, barra blanca + cruz
  const updateHeader = () => header.classList.toggle('header--solid', window.scrollY > 40);
  // passive: le promete al navegador que no usaremos preventDefault()
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
} else {
  // las demás páginas no tienen video detrás: barra blanca siempre
  header.classList.add('header--solid');
}

// ---------------- PANELES (menú y carrito) ----------------
const menuDrawer = document.getElementById('menu-drawer');
const cartDrawer = document.getElementById('cart-drawer');

document.getElementById('menu-open').addEventListener('click', () => menuDrawer.showModal());
document.getElementById('cart-open').addEventListener('click', openCart);

function openCart() {
  renderCart();
  if (!cartDrawer.open) cartDrawer.showModal();
}

// lo mismo para los dos paneles: botón × (data-close), clic en el
// fondo oscuro (el clic le llega al <dialog> mismo) o clic en un enlace
[menuDrawer, cartDrawer].forEach((drawer) => {
  drawer.addEventListener('click', (event) => {
    if (event.target === drawer || event.target.closest('[data-close]')) drawer.close();
    else if (event.target.closest('a')) drawer.close();
  });
});

// ---------------- CARRITO ----------------
const cartBadge = document.getElementById('cart-count');

function updateBadge() {
  const n = cartCount();
  cartBadge.textContent = n;
  cartBadge.hidden = n === 0;
}

// Selector de cantidad "− 2 +" (se usa en el carrito y en la ficha)
function qtyHTML(qty, label) {
  return `
    <div class="qty" role="group" aria-label="${label}">
      <button type="button" data-action="dec" aria-label="Quitar uno">−</button>
      <span aria-live="polite">${qty}</span>
      <button type="button" data-action="inc" aria-label="Agregar uno">+</button>
    </div>`;
}

function renderCart() {
  const lines = cartLines();
  const subtotal = cartSubtotal();
  const count = cartCount();

  document.getElementById('cart-title-count').textContent = count ? `(${count})` : '';

  // barra de envío gratis: cuánto falta para los $250.000
  const missing = FREE_SHIPPING_FROM - subtotal;
  const percent = Math.min(subtotal / FREE_SHIPPING_FROM, 1) * 100;
  document.getElementById('cart-shipping').innerHTML = count === 0 ? '' : `
    <p>${missing > 0
      ? `Te faltan <strong>${formatPrice(missing)}</strong> para el <strong>envío gratis</strong>`
      : '¡Tienes <strong>envío gratis</strong>!'}</p>
    <div class="progress" role="progressbar" aria-valuenow="${Math.round(percent)}" aria-valuemin="0" aria-valuemax="100">
      <span style="width:${percent}%"></span>
    </div>`;

  const linesBox = document.getElementById('cart-lines');
  document.getElementById('cart-footer').hidden = count === 0;

  if (count === 0) {
    linesBox.innerHTML = `
      <div class="cart__empty">
        <svg class="isotype-icon" aria-hidden="true"><use href="#isotype"/></svg>
        <p>Tu carrito está vacío.</p>
        <a class="btn btn--dark" href="index.html#new">Ver novedades</a>
      </div>`;
    return;
  }

  linesBox.innerHTML = lines.map((l, i) => `
    <div class="cart-line" data-index="${i}">
      <a class="cart-line__img" href="${productUrl(l.product)}">
        <img src="${productImage(l.product)}" alt="${l.product.name}" width="96" height="120">
      </a>
      <div class="cart-line__info">
        <a class="cart-line__name" href="${productUrl(l.product)}">${l.product.name}</a>
        <p class="cart-line__meta">${l.product.colorName} · Talla ${l.size}</p>
        ${qtyHTML(l.qty, `Cantidad de ${l.product.name}`)}
      </div>
      <div class="cart-line__side">
        <span class="cart-line__price">${formatPrice(l.total)}</span>
        <button class="link-btn" type="button" data-action="remove">Quitar</button>
      </div>
    </div>`).join('');

  document.getElementById('cart-subtotal').textContent = formatPrice(subtotal);
}

// un solo listener para todos los botones de las líneas (delegación)
document.getElementById('cart-lines').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const row = button.closest('.cart-line');
  const index = Number(row.dataset.index);
  const line = getCart()[index];
  const action = button.dataset.action;

  // "Quitar", o "−" con 1 unidad: primero la animación, luego se borra
  if (action === 'remove' || (action === 'dec' && line.qty === 1)) {
    animateRemove(row, line);
    return;
  }

  setLineQty(index, line.qty + (action === 'inc' ? 1 : -1));
  // renderCart() ya pintó una línea nueva: le damos el "pop" a su número
  const qty = document.querySelector(`#cart-lines [data-index="${index}"] .qty span`);
  qty?.classList.add('is-bump');
});

// La línea se va a la derecha, se desvanece y cierra su espacio.
// Se usa element.animate() (Web Animations API) porque la altura
// "auto" no se puede animar con una clase: aquí la medimos en px.
function animateRemove(row, line) {
  if (row.classList.contains('is-removing')) return;   // doble clic
  row.classList.add('is-removing');

  // se busca por producto + talla (no por posición), porque mientras
  // corre la animación el carrito pudo cambiar
  const remove = () => {
    const i = getCart().findIndex((l) => l.id === line.id && l.size === line.size);
    if (i !== -1) removeLine(i);
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return remove();

  const h = `${row.offsetHeight}px`;
  const pad = getComputedStyle(row).paddingTop;
  row.animate([
    { opacity: 1, transform: 'translateX(0)', height: h, paddingTop: pad, paddingBottom: pad },
    { opacity: 0, transform: 'translateX(48px)', height: h, paddingTop: pad, paddingBottom: pad, offset: 0.55 },
    { opacity: 0, transform: 'translateX(48px)', height: '0px', paddingTop: '0px', paddingBottom: '0px', borderBottomWidth: '0px' },
  ], { duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' })
    .finished.then(remove);
}

// store.js avisa "cart:change" cada vez que el carrito cambia
document.addEventListener('cart:change', () => {
  updateBadge();
  if (cartDrawer.open) renderCart();
});
updateBadge();

// "Agregar al carrito" rápido de las tarjetas (en cualquier página):
// agrega la primera talla disponible y abre el carrito para verla
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-quick-add]');
  if (!button) return;
  const product = findProduct(button.dataset.quickAdd);
  addToCart(product.id, defaultSize(product), 1);
  openCart();
});

// ---------------- NEWSLETTER DEL FOOTER ----------------
// valida el correo con la regla del propio navegador (type="email")
function isValidEmail(input) {
  return input.value.trim() !== '' && input.checkValidity();
}

document.getElementById('footer-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('footer-email');
  const message = document.getElementById('footer-message');

  if (!isValidEmail(input)) {
    message.textContent = 'Escribe un correo válido.';
    message.classList.add('is-error');
    return;
  }
  message.classList.remove('is-error');
  message.textContent = '¡Gracias! Ya eres parte de la familia Elion.';
  event.target.reset();
});

// ---------------- AVISO FLOTANTE ----------------
const toast = document.getElementById('toast');

function showToast(text) {
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { toast.hidden = true; }, 2500);
}
