// ============================================================
//  ELION · home.js  (solo index.html)
//  1) Grillas de productos   2) Pop-up de descuento   3) Video del hero
// ============================================================

// ---- 1) GRILLAS: "Novedades" y "Más vendidos" ----
function renderGrid(gridId, group) {
  document.getElementById(gridId).innerHTML = PRODUCTS
    .filter((p) => p.group === group)
    .map(productCard)
    .join('');
}

renderGrid('grid-new', 'new');
renderGrid('grid-best', 'best');

// ---- 2) POP-UP DE DESCUENTO ----
// Aparece a los 5 s, solo la primera visita (se recuerda en el navegador).
const POPUP_KEY = 'elion-popup-seen';
const popup = document.getElementById('discount-popup');

function popupSeen() {
  try { return localStorage.getItem(POPUP_KEY); } catch { return null; }
}
function markPopupSeen() {
  try { localStorage.setItem(POPUP_KEY, '1'); } catch { /* sin memoria */ }
}

if (!popupSeen()) {
  setTimeout(() => {
    // si justo tiene un panel abierto, no le tapamos la pantalla
    if (!document.querySelector('dialog[open]')) popup.showModal();
  }, 5000);
}

// se cierre como se cierre (×, "No, gracias", Esc, fondo), queda recordado
popup.addEventListener('close', markPopupSeen);
document.getElementById('popup-close').addEventListener('click', () => popup.close());
document.getElementById('popup-dismiss').addEventListener('click', () => popup.close());
popup.addEventListener('click', (event) => {
  if (event.target === popup) popup.close();
});

document.getElementById('popup-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('popup-email');
  const message = document.getElementById('popup-message');

  if (!isValidEmail(input)) {   // isValidEmail está en layout.js
    message.textContent = 'Escribe un correo válido.';
    message.classList.add('is-error');
    input.focus();
    return;
  }

  // TODO backend: aquí se guardaría el correo (ej. una tabla en Supabase).
  // El cupón queda guardado: el checkout lo aplica solo.
  saveCoupon('FE10');
  message.textContent = '';
  document.getElementById('popup-step-form').hidden = true;
  document.getElementById('popup-step-done').hidden = false;
});

document.getElementById('popup-shop').addEventListener('click', () => {
  popup.close();
  document.getElementById('new').scrollIntoView();
});

// ---- 3) VIDEO DEL HERO ----
// Quien pidió "menos movimiento" en su sistema: video quieto
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelector('.hero__video').pause();
}
