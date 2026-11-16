// ============================================================
//  ELION · product.js  (solo producto.html)
//  Lee el id de la URL (producto.html?id=3), pinta la ficha:
//  galería, talla, cantidad, "Agregar al carrito", detalles, y
//  abajo "También te puede gustar".
// ============================================================

// URLSearchParams lee lo que va después del "?" en la URL
const productId = new URLSearchParams(window.location.search).get('id');
const product = findProduct(productId);
const box = document.getElementById('product');

if (!product) {
  box.innerHTML = `
    <div class="not-found">
      <h1 class="page-title">Producto no encontrado</h1>
      <p>Puede que el enlace esté mal escrito o que el producto ya no esté disponible.</p>
      <a class="btn btn--dark" href="index.html#new">Ver novedades</a>
    </div>`;
} else {
  document.title = `${product.name} · Elion`;
  renderProduct();
  renderRelated();
}

function renderProduct() {
  const p = product;
  const soldOut = p.soldOut ?? [];
  const sizes = productSizes(p);
  // si solo hay una talla (gorra), ya viene elegida
  const onlyOne = sizes.length === 1;

  box.innerHTML = `
    <nav class="breadcrumb" aria-label="Ruta">
      <a href="index.html">Inicio</a> <span aria-hidden="true">/</span>
      <a href="index.html#${p.group}">${p.group === 'new' ? 'Novedades' : 'Más vendidos'}</a> <span aria-hidden="true">/</span>
      <span aria-current="page">${p.name}</span>
    </nav>

    <div class="pdp">
      <!-- GALERÍA: miniaturas + foto grande -->
      <div class="pdp__gallery">
        <div class="pdp__thumbs" role="group" aria-label="Fotos del producto">
          ${[1, 2].map((n) => `
            <button type="button" class="pdp__thumb" data-photo="${n}" aria-pressed="${n === 1}" aria-label="Ver foto ${n}">
              <img src="${productImage(p, n)}" alt="" width="160" height="200">
            </button>`).join('')}
        </div>
        <div class="pdp__main">
          ${p.tag ? `<span class="product-card__tag${p.tag === 'Nuevo' ? '' : ' product-card__tag--dark'}">${p.tag}</span>` : ''}
          <img id="pdp-photo" src="${productImage(p, 1)}" alt="${p.name}, ${p.colorName}" width="800" height="1000">
        </div>
      </div>

      <!-- INFORMACIÓN Y COMPRA -->
      <div class="pdp__info">
        <h1 class="pdp__name">${p.name}</h1>
        <p class="pdp__price">${priceHTML(p)}</p>
        <p class="pdp__color">Color: <strong>${p.colorName}</strong></p>

        <form class="pdp__form" id="add-form" novalidate>
          <fieldset class="sizes">
            <legend>Talla <a class="link-inline" href="#">Guía de tallas</a></legend>
            <div class="sizes__options">
              ${sizes.map((s) => {
                const out = soldOut.includes(s);
                return `
                  <label class="size${out ? ' size--out' : ''}">
                    <input type="radio" name="size" value="${s}" ${out ? 'disabled' : ''} ${onlyOne ? 'checked' : ''}>
                    <span>${s}</span>
                    ${out ? '<span class="visually-hidden">(agotada)</span>' : ''}
                  </label>`;
              }).join('')}
            </div>
            <p class="form-message is-error" id="size-message" role="status"></p>
          </fieldset>

          <div class="pdp__buy">
            ${qtyHTML(1, 'Cantidad')}
            <button class="btn btn--dark pdp__add" type="submit">Agregar al carrito · ${formatPrice(finalPrice(p))}</button>
          </div>
        </form>

        <ul class="pdp__perks">
          <li>Envío gratis desde ${formatPrice(FREE_SHIPPING_FROM)}</li>
          <li>Cambios de talla gratis durante 30 días</li>
          <li>Pago seguro: tarjeta, PSE o contraentrega</li>
        </ul>

        <blockquote class="pdp__verse">
          <p>“${p.verse.text}”</p>
          <cite>${p.verse.ref}</cite>
        </blockquote>

        <!-- <details>: acordeón nativo de HTML, se abre y cierra sin JS -->
        <div class="accordion">
          <details open>
            <summary>Descripción</summary>
            <p>${p.description}</p>
          </details>
          <details>
            <summary>Materiales y cuidado</summary>
            <p>${MATERIALS[p.type]}</p>
            <p>Lavar al revés en agua fría. No usar secadora ni planchar sobre el estampado.</p>
          </details>
          <details>
            <summary>Envíos y cambios</summary>
            <p>Estándar: 3 a 5 días hábiles (${formatPrice(SHIPPING_METHODS.standard.price)}, gratis desde ${formatPrice(FREE_SHIPPING_FROM)}). Express: 1 a 2 días hábiles (${formatPrice(SHIPPING_METHODS.express.price)}).</p>
            <p>Tienes 30 días para cambiar la talla. La prenda debe estar sin uso y con sus etiquetas.</p>
          </details>
        </div>
      </div>
    </div>`;

  // ---- galería: clic en una miniatura cambia la foto grande ----
  box.querySelector('.pdp__thumbs').addEventListener('click', (event) => {
    const thumb = event.target.closest('.pdp__thumb');
    if (!thumb) return;
    document.getElementById('pdp-photo').src = productImage(p, Number(thumb.dataset.photo));
    box.querySelectorAll('.pdp__thumb').forEach((t) => t.setAttribute('aria-pressed', String(t === thumb)));
  });

  // ---- cantidad (entre 1 y 10) ----
  let qty = 1;
  const qtyBox = box.querySelector('.qty');
  qtyBox.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    qty = Math.min(10, Math.max(1, qty + (button.dataset.action === 'inc' ? 1 : -1)));
    qtyBox.querySelector('span').textContent = qty;
  });

  // ---- agregar al carrito ----
  const sizeMessage = document.getElementById('size-message');

  // al elegir una talla, se borra el aviso de "elige una talla"
  box.querySelector('.sizes').addEventListener('change', () => { sizeMessage.textContent = ''; });

  document.getElementById('add-form').addEventListener('submit', (event) => {
    event.preventDefault();
    // FormData lee el formulario como lo enviaría el navegador: de un
    // grupo de radios solo trae el marcado (null si no hay ninguno)
    const size = new FormData(event.target).get('size');

    if (!size) {
      sizeMessage.textContent = 'Elige una talla.';
      box.querySelector('.sizes input:not(:disabled)').focus();
      return;
    }

    addToCart(p.id, size, qty);
    openCart();   // de layout.js: muestra el carrito con lo que se agregó
  });
}

// "También te puede gustar": 4 productos distintos a este, primero
// los del mismo tipo (otras camisetas si estás viendo una camiseta)
function renderRelated() {
  const others = PRODUCTS.filter((p) => p.id !== product.id);
  const related = [
    ...others.filter((p) => p.type === product.type),
    ...others.filter((p) => p.type !== product.type),
  ].slice(0, 4);

  document.getElementById('grid-related').innerHTML = related.map(productCard).join('');
  document.getElementById('related').hidden = false;
}
