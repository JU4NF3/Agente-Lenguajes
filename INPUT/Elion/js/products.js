// ============================================================
//  ELION · products.js
//  El catálogo y las utilidades que usan TODAS las páginas.
//  Las fotos viven en assets/products/<slug>-1.jpg (principal) y
//  <slug>-2.jpg (hover / segunda vista). Para usar fotos reales de
//  Elion, basta con reemplazar los archivos con el mismo nombre.
// ============================================================

const APPAREL_SIZES = ['S', 'M', 'L', 'XL'];

const MATERIALS = {
  hoodie: '80% algodón, 20% poliéster · Felpa perchada de 380 g/m²',
  crew: '80% algodón, 20% poliéster · Felpa perchada de 380 g/m²',
  tee: '100% algodón peinado · 220 g/m² · Corte oversize',
  cap: 'Frente de espuma, malla trasera · Cierre ajustable',
};

const PRODUCTS = [
  // ---- Novedades ----
  { id: 1, group: 'new', type: 'crew', slug: 'jesus-saves-crew',
    name: 'Jesus Saves Crewneck', colorName: 'Gris carbón', price: 169000, tag: 'Nuevo',
    description: 'Crewneck lavado con la cruz “Jesus Saves” estampada en la espalda. Un recordatorio de que la salvación ya fue pagada.',
    verse: { text: 'Y en ningún otro hay salvación.', ref: 'Hechos 4:12' } },
  { id: 2, group: 'new', type: 'hoodie', slug: 'ask-me-hoodie',
    name: 'Ask Me About Jesus Hoodie', colorName: 'Negro', price: 199000, tag: 'Nuevo',
    soldOut: ['S'],
    description: 'Hoodie pesado con letra gótica en la espalda. Hecho para abrir conversaciones donde vayas.',
    verse: { text: 'Estad siempre preparados para presentar defensa de la esperanza que hay en vosotros.', ref: '1 Pedro 3:15' } },
  { id: 3, group: 'new', type: 'tee', slug: 'jesus-loves-tee',
    name: 'Jesus Loves You Tee', colorName: 'Negro lavado', price: 99000,
    description: 'Camiseta de algodón con acabado lavado y estampado en la espalda. Simple, directa y para todos los días.',
    verse: { text: 'Nosotros le amamos a él, porque él nos amó primero.', ref: '1 Juan 4:19' } },
  { id: 4, group: 'new', type: 'tee', slug: 'left-the-99-tee',
    name: 'He Left the 99 Tee', colorName: 'Arena', price: 99000, tag: 'Nuevo',
    description: 'Inspirada en la parábola de la oveja perdida: Él dejó las 99 para venir por ti.',
    verse: { text: '¿Qué hombre de vosotros, teniendo cien ovejas, si pierde una de ellas, no deja las noventa y nueve…?', ref: 'Lucas 15:4' } },

  // ---- Más vendidos ----
  { id: 5, group: 'best', type: 'hoodie', slug: 'jesus-hoodie',
    name: 'Jesús Hoodie', colorName: 'Negro', price: 189000, salePrice: 159000, tag: '-15%',
    description: 'Nuestro hoodie más vendido: el nombre que está sobre todo nombre, bordado en el pecho.',
    verse: { text: 'Para que en el nombre de Jesús se doble toda rodilla.', ref: 'Filipenses 2:10' } },
  { id: 6, group: 'best', type: 'tee', slug: 'john-14-6-tee',
    name: 'John 14:6 Tee', colorName: 'Blanco', price: 89000, tag: 'Más vendido',
    description: 'Camiseta blanca con el versículo completo en la espalda, en tipografía redondeada.',
    verse: { text: 'Yo soy el camino, y la verdad, y la vida.', ref: 'Juan 14:6' } },
  { id: 7, group: 'best', type: 'hoodie', slug: 'essential-hoodie',
    name: 'Essential Hoodie', colorName: 'Blanco', price: 179000,
    soldOut: ['XL'],
    description: 'La base de cualquier outfit: hoodie liso de felpa gruesa, con el isotipo de Elion en la manga.',
    verse: { text: 'Y todo lo que hagáis, hacedlo de corazón, como para el Señor.', ref: 'Colosenses 3:23' } },
  { id: 8, group: 'best', type: 'cap', slug: 'trucker-cap',
    name: 'Trucker Cap', colorName: 'Blanco / Negro', price: 79000, tag: 'Últimas',
    description: 'Gorra trucker de frente blanco y malla negra, con cierre ajustable atrás.',
    verse: { text: 'Alzaré mis ojos a los montes; ¿de dónde vendrá mi socorro?', ref: 'Salmos 121:1' } },
];

// ---- UTILIDADES ----

// Convierte < > & " ' en texto inofensivo antes de meterlo con
// innerHTML. Se usa con todo lo que escribe el usuario o viene de la
// URL: si alguien escribe "<img onerror=...>" se muestra como texto
// y no se ejecuta (eso sería un ataque XSS).
function escapeHTML(text) {
  return String(text ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

// 189000 → "$189.000"
function formatPrice(value) {
  return '$' + Math.round(value).toLocaleString('es-CO');
}

function findProduct(id) {
  return PRODUCTS.find((p) => p.id === Number(id));
}

// precio que se cobra (con descuento si lo tiene)
function finalPrice(p) {
  return p.salePrice ?? p.price;
}

function productSizes(p) {
  return p.type === 'cap' ? ['Única'] : APPAREL_SIZES;
}

// primera talla disponible (la que usa el "Agregar" rápido de las tarjetas)
function defaultSize(p) {
  return productSizes(p).find((s) => !(p.soldOut ?? []).includes(s));
}

// n = 1 (principal) o 2 (segunda vista)
function productImage(p, n = 1) {
  return `assets/products/${p.slug}-${n}.jpg`;
}

function productUrl(p) {
  return `producto.html?id=${p.id}`;
}

function priceHTML(p) {
  return p.salePrice
    ? `<s>${formatPrice(p.price)}</s>${formatPrice(p.salePrice)}`
    : formatPrice(p.price);
}

// Una tarjeta de producto (inicio y "También te puede gustar").
// Toda la foto lleva a la ficha; el botón "Agregar" va aparte, porque
// un <button> no puede ir dentro de un <a>.
function productCard(p) {
  const tagClass = p.tag === 'Nuevo' ? '' : ' product-card__tag--dark';
  return `
    <article class="product-card">
      <div class="product-card__media">
        <a class="product-card__link" href="${productUrl(p)}" aria-label="${p.name}">
          <img class="product-card__img product-card__img--front" src="${productImage(p, 1)}"
               alt="${p.name}, ${p.colorName}" loading="lazy" width="800" height="1000">
          <img class="product-card__img product-card__img--back" src="${productImage(p, 2)}"
               alt="" loading="lazy" width="800" height="1000">
        </a>
        ${p.tag ? `<span class="product-card__tag${tagClass}">${p.tag}</span>` : ''}
        <button class="product-card__quick" type="button" data-quick-add="${p.id}">Agregar al carrito</button>
      </div>
      <div class="product-card__info">
        <div>
          <h3 class="product-card__name"><a href="${productUrl(p)}">${p.name}</a></h3>
          <p class="product-card__variant">${p.colorName}</p>
        </div>
        <p class="product-card__price">${priceHTML(p)}</p>
      </div>
    </article>`;
}
