// ============================================================
//  GALERÍA DE PRODUCTOS (lo que ve el cliente)
//  Inspirada en el listado de producto (PLP) de adidas, pero con
//  NUESTRO estilo: blanco y negro, pastillas, líneas finas.
//
//  Los productos salen de TU tabla productos_práctica en Supabase (los
//  mismos que administras en admin.html). Se leen una vez al cargar la
//  página con obtenerProductos() y se guardan en el arreglo PRODUCTOS;
//  de ahí en adelante filtrar, ordenar y buscar trabajan en memoria,
//  sin volver a consultar Supabase.
//
//  Columnas que usamos: id, nombre, descripcion, precio, unidades,
//  descuento (0.30 = 30%), disponible, categorias (arreglo), img_URL.
// ============================================================

// ---- 1) NUESTROS PRODUCTOS ----
// Empieza vacío: obtenerProductos() lo llena con lo que haya en Supabase.
let PRODUCTOS = [];

// ---- 2) ESTADO DE LA VISTA ----
// Todo lo que la persona puede cambiar vive aquí. Cuando algo de esto
// cambia, llamamos a render() y la galería se vuelve a pintar sola.
const estado = {
  categorias: new Set(), // categorías activas (vacío = todas)
  soloDisponibles: false,
  busqueda: '',
  orden: 'destacados',
  visibles: 8, // cuántos se muestran; "Cargar más" lo sube
};

const POR_TANDA = 8; // cuántos productos añade cada "Cargar más"

// favoritos: se guardan en el navegador (como el tema). Un Set de ids.
const FAV_CLAVE = 'galeria-favoritos';
const favoritos = new Set(cargarFavoritos());

function cargarFavoritos() {
  try {
    return JSON.parse(localStorage.getItem(FAV_CLAVE)) ?? [];
  } catch {
    return [];
  }
}

function guardarFavoritos() {
  localStorage.setItem(FAV_CLAVE, JSON.stringify([...favoritos]));
}

// ---- 3) FORMATO DE PRECIOS (igual que en admin.js) ----
// 420000 → "$420.000" (separador de miles colombiano, sin decimales)
function formatoPesos(valor) {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

// precio ya con el descuento aplicado (lo usamos para ordenar por precio)
function precioFinal(p) {
  return p.precio * (1 - (p.descuento ?? 0));
}

// Precio con descuento: el de antes tachado, el de ahora grande y una
// etiqueta "-30%". Sin descuento, solo el precio normal.
function precioHTML(p) {
  const descuento = p.descuento ?? 0;

  if (descuento <= 0) {
    return `<span class="precio"><span class="precio-ahora">${formatoPesos(p.precio)}</span></span>`;
  }

  return `
    <span class="precio">
      <span class="precio-ahora">${formatoPesos(precioFinal(p))}</span>
      <span class="precio-antes">${formatoPesos(p.precio)}</span>
    </span>`;
}

// Las "banderitas" de la esquina de la foto, según los datos reales:
// descuento → "-30%"; pocas unidades → "Últimas"; agotado → "Agotado".
function badgesHTML(p) {
  const badges = [];
  if ((p.descuento ?? 0) > 0) {
    badges.push(`<span class="badge badge-dto">-${Math.round(p.descuento * 100)}%</span>`);
  }
  if (p.disponible && p.unidades > 0 && p.unidades <= 5) {
    badges.push('<span class="badge badge-pocas">Últimas</span>');
  }
  return badges.length ? `<div class="badges">${badges.join('')}</div>` : '';
}

// ---- 4) FILTRAR Y ORDENAR ----
// Devuelve el subconjunto de PRODUCTOS que cumple lo que hay en "estado",
// ya ordenado. No toca el arreglo original (usa filter/sort sobre copias).
function productosFiltrados() {
  let lista = PRODUCTOS.filter((p) => {
    // categorías: si no hay ninguna activa, pasan todas; si hay, el
    // producto debe tener al menos una de las activas
    if (estado.categorias.size > 0) {
      const coincide = p.categorias.some((c) => estado.categorias.has(c));
      if (!coincide) return false;
    }

    if (estado.soloDisponibles && !p.disponible) return false;

    // búsqueda por nombre (sin distinguir mayúsculas)
    if (estado.busqueda) {
      if (!p.nombre.toLowerCase().includes(estado.busqueda.toLowerCase())) return false;
    }

    return true;
  });

  // orden: cada opción es una forma distinta de comparar dos productos
  const comparar = {
    destacados: (a, b) => a.id - b.id,
    'precio-asc': (a, b) => precioFinal(a) - precioFinal(b),
    'precio-desc': (a, b) => precioFinal(b) - precioFinal(a),
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
    descuento: (a, b) => (b.descuento ?? 0) - (a.descuento ?? 0),
  };

  return lista.sort(comparar[estado.orden]);
}

// ---- 5) PINTAR LA GALERÍA ----
const grid = document.getElementById('grid');
const contador = document.getElementById('contador');
const btnCargarMas = document.getElementById('cargar-mas');
const sinResultados = document.getElementById('sin-resultados');

// Arma UNA tarjeta de producto (como texto HTML)
function tarjeta(p) {
  const esFav = favoritos.has(p.id);
  const cats = (p.categorias ?? []).join(' · ');

  return `
    <article class="producto" data-id="${p.id}" tabindex="0">
      <div class="producto-media ${p.disponible ? '' : 'agotado'}">
        <img src="${p.img_URL}" alt="${p.nombre}" loading="lazy"
             onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'sin-foto'}))">
        ${badgesHTML(p)}
        ${p.disponible ? '' : '<span class="etiqueta-agotado">Agotado</span>'}
        <button type="button" class="fav ${esFav ? 'activo' : ''}" data-id="${p.id}"
                aria-pressed="${esFav}" aria-label="Guardar en favoritos">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M12 21s-7.5-4.6-10-9.3C.6 8.9 2 5.5 5.2 5.5c1.9 0 3.1 1 3.8 2 .7.9 1 1.5 1 1.5s.3-.6 1-1.5c.7-1 1.9-2 3.8-2 3.2 0 4.6 3.4 3.2 6.2C19.5 16.4 12 21 12 21z"/>
          </svg>
        </button>
      </div>
      <div class="producto-info">
        ${precioHTML(p)}
        <h3 class="producto-nombre">${p.nombre}</h3>
        <p class="producto-cats">${cats}</p>
      </div>
    </article>`;
}

// Dibuja la galería completa a partir del estado actual
function render() {
  const lista = productosFiltrados();

  // contador (como en adidas: "[N] resultados")
  contador.textContent = lista.length === 1 ? '1 producto' : `${lista.length} productos`;

  if (lista.length === 0) {
    grid.innerHTML = '';
    sinResultados.hidden = false;
    btnCargarMas.hidden = true;
    return;
  }

  sinResultados.hidden = true;

  // solo pintamos hasta "visibles" (el resto espera a "Cargar más")
  const aMostrar = lista.slice(0, estado.visibles);
  grid.innerHTML = aMostrar.map(tarjeta).join('');

  // el botón solo aparece si todavía quedan productos por mostrar
  btnCargarMas.hidden = estado.visibles >= lista.length;
  btnCargarMas.textContent = `Cargar más (${lista.length - aMostrar.length} restantes)`;
}

// ---- 6) PILLS DE CATEGORÍA ----
// Sacamos todas las categorías que existen en los productos (sin repetir)
// y pintamos un botón-pastilla por cada una. "Todos" las desactiva.
const barraCategorias = document.getElementById('categorias');

function todasLasCategorias() {
  const set = new Set();
  PRODUCTOS.forEach((p) => p.categorias.forEach((c) => set.add(c)));
  return [...set].sort();
}

function pintarCategorias() {
  const pills = todasLasCategorias()
    .map((c) => `<button type="button" class="pill" data-cat="${c}">${c}</button>`)
    .join('');

  barraCategorias.innerHTML =
    `<button type="button" class="pill activo" data-cat="">Todos</button>` + pills;
}

function actualizarPillsActivas() {
  barraCategorias.querySelectorAll('.pill').forEach((pill) => {
    const cat = pill.dataset.cat;
    const activa = cat === ''
      ? estado.categorias.size === 0 // "Todos" se ilumina si no hay filtro
      : estado.categorias.has(cat);
    pill.classList.toggle('activo', activa);
    pill.setAttribute('aria-pressed', String(activa));
  });
}

// Clic en una pastilla: "Todos" limpia; las demás se encienden/apagan
barraCategorias.addEventListener('click', (evento) => {
  const pill = evento.target.closest('.pill');
  if (!pill) return;

  const cat = pill.dataset.cat;
  if (cat === '') {
    estado.categorias.clear();
  } else if (estado.categorias.has(cat)) {
    estado.categorias.delete(cat);
  } else {
    estado.categorias.add(cat);
  }

  estado.visibles = POR_TANDA; // al cambiar el filtro, volvemos al principio
  actualizarPillsActivas();
  render();
});

// ---- 7) BUSCADOR ----
const inputBusqueda = document.getElementById('busqueda');
inputBusqueda.addEventListener('input', () => {
  estado.busqueda = inputBusqueda.value.trim();
  estado.visibles = POR_TANDA;
  render();
});

// ---- 8) "SOLO DISPONIBLES" ----
const toggleDisponibles = document.getElementById('solo-disponibles');
toggleDisponibles.addEventListener('change', () => {
  estado.soloDisponibles = toggleDisponibles.checked;
  estado.visibles = POR_TANDA;
  render();
});

// ---- 9) ORDENAR POR (lista desplegable con estilo) ----
// Un <select> normal no se puede estilizar, así que armamos nuestra propia
// lista. Es una versión reducida del mejorarSelect de admin.js.
const ordenBoton = document.getElementById('orden-boton');
const ordenLista = document.getElementById('orden-lista');
const ordenValor = document.getElementById('orden-valor');

function cerrarOrden() {
  ordenLista.hidden = true;
  ordenBoton.setAttribute('aria-expanded', 'false');
}

ordenBoton.addEventListener('click', () => {
  const abierto = ordenBoton.getAttribute('aria-expanded') === 'true';
  ordenLista.hidden = abierto;
  ordenBoton.setAttribute('aria-expanded', String(!abierto));
});

ordenLista.addEventListener('click', (evento) => {
  const opcion = evento.target.closest('button[data-orden]');
  if (!opcion) return;

  estado.orden = opcion.dataset.orden;
  ordenValor.textContent = opcion.textContent;

  // marca la opción elegida (el ✓)
  ordenLista.querySelectorAll('button').forEach((b) =>
    b.setAttribute('aria-selected', String(b === opcion))
  );

  cerrarOrden();
  render();
});

// clic fuera → se cierra
document.addEventListener('click', (evento) => {
  if (!evento.target.closest('#orden')) cerrarOrden();
});

// ---- 10) CARGAR MÁS ----
btnCargarMas.addEventListener('click', () => {
  estado.visibles += POR_TANDA;
  render();
});

// ---- 11) FAVORITOS Y QUICK-VIEW (un solo listener sobre el grid) ----
// Como las tarjetas se crean con innerHTML, no les ponemos listener una por
// una: escuchamos el clic en el grid y miramos dónde cayó (delegación).
grid.addEventListener('click', (evento) => {
  // ¿clic en el corazón? → favorito (y NO abrir la ficha)
  const botonFav = evento.target.closest('.fav');
  if (botonFav) {
    evento.stopPropagation();
    const id = Number(botonFav.dataset.id);
    if (favoritos.has(id)) favoritos.delete(id);
    else favoritos.add(id);
    guardarFavoritos();
    botonFav.classList.toggle('activo', favoritos.has(id));
    botonFav.setAttribute('aria-pressed', String(favoritos.has(id)));
    return;
  }

  // clic en la tarjeta → abrir la ficha del producto
  const tarjetaEl = evento.target.closest('.producto');
  if (tarjetaEl) abrirFicha(Number(tarjetaEl.dataset.id));
});

// Enter sobre una tarjeta enfocada con Tab también abre la ficha
grid.addEventListener('keydown', (evento) => {
  const tarjetaEl = evento.target.closest('.producto');
  if (tarjetaEl && evento.key === 'Enter') abrirFicha(Number(tarjetaEl.dataset.id));
});

// ---- 12) FICHA DEL PRODUCTO (el <dialog>) ----
const ficha = document.getElementById('ficha');
const fichaContenido = document.getElementById('ficha-contenido');

function abrirFicha(id) {
  const p = PRODUCTOS.find((x) => x.id === id);
  if (!p) return;

  const cats = (p.categorias ?? []).length
    ? p.categorias.map((c) => `<span class="etiqueta">${c}</span>`).join('')
    : '—';

  fichaContenido.innerHTML = `
    <div class="ficha-foto ${p.disponible ? '' : 'agotado'}">
      <img src="${p.img_URL}" alt="${p.nombre}"
           onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'sin-foto'}))">
      ${p.disponible ? '' : '<span class="etiqueta-agotado">Agotado</span>'}
    </div>
    <div class="ficha-cuerpo">
      <p class="rotulo">Producto #${p.id}</p>
      <h2>${p.nombre}</h2>
      <p class="ficha-desc">${p.descripcion || 'Sin descripción.'}</p>
      ${precioHTML(p)}
      <p class="ficha-cats">${cats}</p>
      <button type="button" class="btn-agregar" data-id="${p.id}" ${p.disponible ? '' : 'disabled'}>
        ${p.disponible ? 'Agregar al carrito' : 'No disponible'}
      </button>
    </div>`;

  ficha.showModal();
}

ficha.addEventListener('click', (evento) => {
  if (evento.target.closest('.ficha-cerrar')) return ficha.close();

  // "Agregar al carrito": suma 1 unidad de este producto al carrito
  const btnAgregar = evento.target.closest('.btn-agregar');
  if (btnAgregar) {
    agregarAlCarrito(Number(btnAgregar.dataset.id));
    return;
  }

  // clic en el fondo oscuro → cerrar
  if (evento.target === ficha) ficha.close();
});

// ---- 13) CARRITO ----
// Guardamos el carrito como un objeto { id: cantidad }. Vive en el
// navegador (localStorage), así no se pierde al recargar la página.
const CARRITO_CLAVE = 'galeria-carrito';
let carrito = cargarCarrito();

function cargarCarrito() {
  try {
    return JSON.parse(localStorage.getItem(CARRITO_CLAVE)) ?? {};
  } catch {
    return {};
  }
}

function guardarCarrito() {
  localStorage.setItem(CARRITO_CLAVE, JSON.stringify(carrito));
}

// cuántos productos hay en total (sumando las cantidades)
function contarCarrito() {
  return Object.values(carrito).reduce((suma, n) => suma + n, 0);
}

// total en pesos, usando el precio YA con descuento de cada producto
function totalCarrito() {
  return Object.entries(carrito).reduce((suma, [id, cantidad]) => {
    const p = PRODUCTOS.find((x) => x.id === Number(id));
    return p ? suma + precioFinal(p) * cantidad : suma;
  }, 0);
}

// Sumar 1 unidad. No deja pasar del stock (p.unidades) para no vender
// más de lo que hay. Actualiza el globito, el panel y avisa.
function agregarAlCarrito(id) {
  const p = PRODUCTOS.find((x) => x.id === id);
  if (!p || !p.disponible) return;

  const actual = carrito[id] ?? 0;
  if (actual >= p.unidades) {
    mostrarAviso('No hay más unidades de este producto');
    return;
  }

  carrito[id] = actual + 1;
  guardarCarrito();
  actualizarBadge();
  renderCarrito();
  mostrarAviso(`“${p.nombre}” agregado al carrito`);
}

// Cambiar la cantidad de un producto (+1 o -1). Si llega a 0, se quita.
function cambiarCantidad(id, delta) {
  const p = PRODUCTOS.find((x) => x.id === id);
  const nueva = (carrito[id] ?? 0) + delta;

  if (nueva <= 0) {
    delete carrito[id];
  } else if (p && nueva > p.unidades) {
    mostrarAviso('No hay más unidades de este producto');
    return;
  } else {
    carrito[id] = nueva;
  }

  guardarCarrito();
  actualizarBadge();
  renderCarrito();
}

function quitarDelCarrito(id) {
  delete carrito[id];
  guardarCarrito();
  actualizarBadge();
  renderCarrito();
}

function vaciarCarrito() {
  carrito = {};
  guardarCarrito();
  actualizarBadge();
  renderCarrito();
}

// El globito rojo del icono: muestra el número, o se esconde si está vacío
const btnCarrito = document.getElementById('btn-carrito');
const carritoCuenta = document.getElementById('carrito-cuenta');

function actualizarBadge() {
  const n = contarCarrito();
  carritoCuenta.textContent = n;
  carritoCuenta.hidden = n === 0;
}

// Pinta la lista de productos dentro del panel + el total
const carrito_items = document.getElementById('carrito-items');
const carritoTotal = document.getElementById('carrito-total');
const carritoTituloN = document.getElementById('carrito-titulo-n');
const btnPagar = document.getElementById('btn-pagar');

function renderCarrito() {
  const ids = Object.keys(carrito);
  const n = contarCarrito();
  carritoTituloN.textContent = n > 0 ? `(${n})` : '';

  if (ids.length === 0) {
    carrito_items.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío.<br>Agrega productos desde su ficha.</p>';
    carritoTotal.textContent = formatoPesos(0);
    btnPagar.disabled = true;
    return;
  }

  btnPagar.disabled = false;

  carrito_items.innerHTML = ids.map((id) => {
    const p = PRODUCTOS.find((x) => x.id === Number(id));
    if (!p) return ''; // por si un producto ya no existe en la tabla
    const cantidad = carrito[id];

    return `
      <div class="carrito-item" data-id="${p.id}">
        ${p.img_URL
          ? `<img src="${p.img_URL}" alt="${p.nombre}"
                  onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'sin-foto'}))">`
          : '<span class="sin-foto"></span>'}
        <div class="ci-info">
          <strong>${p.nombre}</strong>
          <span class="ci-precio-unit">${formatoPesos(precioFinal(p))} c/u</span>
          <div class="ci-cantidad">
            <button type="button" data-accion="menos" aria-label="Quitar uno">−</button>
            <span>${cantidad}</span>
            <button type="button" data-accion="mas" aria-label="Agregar uno">+</button>
          </div>
        </div>
        <div class="ci-der">
          <button type="button" class="ci-quitar" data-accion="quitar" aria-label="Quitar del carrito">×</button>
          <span class="ci-total">${formatoPesos(precioFinal(p) * cantidad)}</span>
        </div>
      </div>`;
  }).join('');

  carritoTotal.textContent = formatoPesos(totalCarrito());
}

// Abrir / cerrar el panel
const carritoDialog = document.getElementById('carrito');

btnCarrito.addEventListener('click', () => {
  renderCarrito();
  carritoDialog.showModal();
});

carritoDialog.addEventListener('click', (evento) => {
  // botón × → cerrar
  if (evento.target.closest('.drawer-cerrar')) return carritoDialog.close();

  // clic en el fondo oscuro (fuera del panel) → cerrar
  if (evento.target === carritoDialog) return carritoDialog.close();

  // botones de cada producto: +, −, ×
  const boton = evento.target.closest('[data-accion]');
  if (!boton) return;

  const id = Number(boton.closest('.carrito-item').dataset.id);
  if (boton.dataset.accion === 'mas') cambiarCantidad(id, 1);
  else if (boton.dataset.accion === 'menos') cambiarCantidad(id, -1);
  else if (boton.dataset.accion === 'quitar') quitarDelCarrito(id);
});

document.getElementById('btn-vaciar').addEventListener('click', vaciarCarrito);

// "Pagar" todavía no hace nada (no hay pasarela): avisamos y vaciamos
btnPagar.addEventListener('click', () => {
  mostrarAviso(`¡Gracias! Pedido de ${formatoPesos(totalCarrito())} (demo)`);
  vaciarCarrito();
  carritoDialog.close();
});

// ---- 14) AVISO FLOTANTE (igual que en cliente.js) ----
function mostrarAviso(texto) {
  const aviso = document.getElementById('aviso');
  aviso.textContent = texto;
  aviso.hidden = false;
  clearTimeout(aviso.temporizador);
  aviso.temporizador = setTimeout(() => { aviso.hidden = true; }, 3000);
}

// ---- 15) TEMA CLARO / OSCURO (igual que admin.js y cliente.js) ----
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

// ---- 16) LEER PRODUCTOS DE SUPABASE ----
// Mismo patrón de lectura que cargarProductos() en admin.js: pedimos todas
// las filas de productos_práctica ordenadas por id. "await" espera a que la
// respuesta llegue por internet antes de seguir (ver la nota larga en
// admin.js). Devuelve true si cargó bien, false si hubo error.
async function obtenerProductos() {
  const { data, error } = await db
    .from('productos_práctica')
    .select('*')
    .order('id');

  if (error) {
    console.log('Error al leer productos:', error);
    return false;
  }

  // categorias puede llegar como null si una fila no tiene ninguna; lo
  // normalizamos a [] para que .some()/.join() de más abajo no fallen.
  PRODUCTOS = data.map((p) => ({ ...p, categorias: p.categorias ?? [] }));
  return true;
}

// ---- 17) ARRANQUE ----
// Dibujamos lo que no depende de los datos (el botón del tema y el globito
// del carrito guardado) de una vez, mostramos "Cargando..." mientras llega
// la respuesta de Supabase, y solo cuando los productos están cargados
// pintamos las categorías y el grid.
async function iniciar() {
  actualizarBotonTema();
  actualizarBadge();
  grid.innerHTML = '<p class="conteo">Cargando productos…</p>';

  const ok = await obtenerProductos();

  if (!ok) {
    grid.innerHTML = '';
    contador.textContent = '';
    sinResultados.hidden = false;
    sinResultados.textContent = 'No se pudieron cargar los productos. Revisa la consola (F12).';
    return;
  }

  pintarCategorias();
  render();
}

iniciar();
