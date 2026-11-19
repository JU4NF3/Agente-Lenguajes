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
      <div class="tarjeta-compra">
        <div class="tc-cantidad">
          <button type="button" class="btn-restar" data-id="${p.id}" aria-label="Quitar uno" ${p.disponible ? '' : 'disabled'}>−</button>
          <span class="tc-contador">${cantidadesSeleccionadas[p.id] ?? 1}</span>
          <button type="button" class="btn-sumar" data-id="${p.id}" aria-label="Sumar uno" ${p.disponible ? '' : 'disabled'}>+</button>
        </div>
        <button type="button" class="btn-agregar" data-id="${p.id}" ${p.disponible ? '' : 'disabled'}>Agregar</button>
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
grid.addEventListener('click', async (evento) => {
  // ¿clic en − o +? → cambia cuántas unidades se van a agregar (entre 1 y
  // lo que queda en stock descontando lo que ya está en el carrito)
  const btnCambio = evento.target.closest('.btn-restar, .btn-sumar');
  if (btnCambio) {
    evento.stopPropagation();
    const id = btnCambio.dataset.id;
    const p = PRODUCTOS.find((x) => x.id === Number(id));
    const restantes = p.unidades - (carrito[id] ?? 0);
    const delta = btnCambio.classList.contains('btn-sumar') ? 1 : -1;
    const nueva = (cantidadesSeleccionadas[id] ?? 1) + delta;

    if (nueva > restantes) {
      mostrarAviso('No hay más unidades de este producto');
      return;
    }
    cantidadesSeleccionadas[id] = Math.max(1, nueva);
    btnCambio.closest('.tarjeta-compra').querySelector('.tc-contador').textContent =
      cantidadesSeleccionadas[id];
    return;
  }

  // ¿clic en "Agregar"? → manda al carrito la cantidad del contador
  const btn = evento.target.closest('.btn-agregar');
  if (btn) {
    evento.stopPropagation();
    const id = btn.dataset.id;
    const cantidad = cantidadesSeleccionadas[id] ?? 1;
    const p = PRODUCTOS.find((x) => x.id === Number(id));
    if ((carrito[id] ?? 0) + cantidad > p.unidades) {
      mostrarAviso('No hay más unidades de este producto');
      return;
    }

    btn.disabled = true; // evita el doble clic mientras responde Supabase
    const ok = await agregarAlCarrito(id, cantidad);
    btn.disabled = false;

    // el contador vuelve a 1 para la próxima vez
    cantidadesSeleccionadas[id] = 1;
    btn.closest('.tarjeta-compra').querySelector('.tc-contador').textContent = 1;

    // aviso en el propio botón durante 1,2 s, luego vuelve a "Agregar"
    btn.textContent = ok ? 'Agregado' : 'Error';
    btn.classList.add(ok ? 'ok' : 'error');
    setTimeout(() => {
      btn.textContent = 'Agregar';
      btn.classList.remove('ok', 'error');
    }, 1200);

    actualizarCarrito();
    return;
  }

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
  // Enter sobre un botón ya hace su propio clic: no abrir la ficha encima
  if (evento.target.closest('button')) return;
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

ficha.addEventListener('click', async (evento) => {
  if (evento.target.closest('.ficha-cerrar')) return ficha.close();

  // "Agregar al carrito": suma 1 unidad de este producto al carrito
  const btnAgregar = evento.target.closest('.btn-agregar');
  if (btnAgregar) {
    const id = btnAgregar.dataset.id; // texto, como lo espera agregarAlCarrito
    const p = PRODUCTOS.find((x) => x.id === Number(id));
    if (!p || !p.disponible) return;

    // no dejar pasar del stock (p.unidades)
    if ((carrito[id] ?? 0) + 1 > p.unidades) {
      mostrarAviso('No hay más unidades de este producto');
      return;
    }

    // deshabilitado mientras responde Supabase: evita el doble clic
    btnAgregar.disabled = true;
    const ok = await agregarAlCarrito(id, 1);
    btnAgregar.disabled = false;

    if (ok) {
      actualizarCarrito();
      mostrarAviso(`“${p.nombre}” agregado al carrito`);
    } else {
      mostrarAviso('No se pudo agregar. Revisa la consola (F12).');
    }
    return;
  }

  // clic en el fondo oscuro → cerrar
  if (evento.target === ficha) ficha.close();
});

// ---- 13) CARRITO ----
// Guardamos el carrito como un objeto { id: cantidad }. Vive en el
// navegador (localStorage), así no se pierde al recargar la página.
const CARRITO_CLAVE = 'galeria-carrito';
let carrito = cargarCarrito(); // { producto_id: cantidad }
const cantidadesSeleccionadas = {}; // { producto_id: cantidad elegida en la ficha }

// Lo que conecta el carrito con Supabase:
// pedidoId   → id de la fila en pedidos de este cliente con estado 'carrito'
// detalleIds → { producto_id: id de su fila en detalles_pedidos }, para
//              saber qué fila actualizar o borrar sin volver a buscarla
let pedidoId = null;
const detalleIds = {};

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

// Suma "cantidad" unidades de un producto al carrito. El id llega como
// texto (sale de btn.dataset.id): sirve tal cual como clave de los
// objetos carrito/detalleIds, y lo pasamos a Number() solo para la base.
// Devuelve true si salió bien, false si falló.
async function agregarAlCarrito(id, cantidad) {
  const usuario = await obtenerUsuario();
  const nueva = (carrito[id] ?? 0) + cantidad;

  // Sin sesión: modo demostración, solo en memoria (nada va a Supabase)
  if (!usuario) {
    carrito[id] = nueva;
    return true;
  }

  const idPedido = await obtenerOCrearCarrito(usuario);
  if (!idPedido) return false;

  if (detalleIds[id]) {
    // Ya hay una fila de este producto en el pedido → solo cambia cantidad
    const { data, error } = await db
      .from('detalles_pedidos')
      .update({ cantidad: nueva })
      .eq('id', detalleIds[id])
      .select();

    if (error) {
      console.log('Error al actualizar la cantidad:', error);
      return false;
    }

    // Si el RLS bloquea el UPDATE no hay error: solo 0 filas cambiadas
    if (data.length === 0) {
      console.log('No se actualizó ninguna fila: revisa el RLS de detalles_pedidos');
      return false;
    }
  } else {
    // Primera vez de este producto → fila nueva. El precio NO se manda:
    // lo copia el trigger de la base, así nadie puede ponerse su precio.
    const { data, error } = await db
      .from('detalles_pedidos')
      .insert([{ pedido_id: idPedido, producto_id: Number(id), cantidad: nueva }])
      .select('id')
      .single();

    if (error) {
      console.log('Error al agregar el producto:', error);
      return false;
    }

    detalleIds[id] = data.id;
  }

  carrito[id] = nueva;
  return true;
}

// Cambiar la cantidad de un producto (+1 o -1). Si llega a 0, se quita.
// Reusa agregarAlCarrito con delta = -1: suma "−1" y hace el mismo UPDATE.
async function cambiarCantidad(id, delta) {
  const p = PRODUCTOS.find((x) => x.id === id);
  const nueva = (carrito[id] ?? 0) + delta;

  if (nueva <= 0) {
    // llegar a 0 es quitarlo: que también se borre en Supabase
    await quitarDelCarrito(id);
    return;
  }
  if (p && nueva > p.unidades) {
    mostrarAviso('No hay más unidades de este producto');
    return;
  }

  const ok = await agregarAlCarrito(String(id), delta);
  if (!ok) mostrarAviso('No se pudo cambiar la cantidad. Revisa la consola (F12).');
  actualizarCarrito();
}

// Quita un producto del carrito. Si tiene fila en detalles_pedidos, la
// borra primero en la base; si eso falla, el carrito local NO se toca,
// para que la pantalla no muestre algo distinto a lo guardado.
// El pedido NO se borra aunque quede vacío: ese carrito se reutiliza.
async function quitarDelCarrito(id) {
  if (detalleIds[id]) {
    const { data, error } = await db
      .from('detalles_pedidos')
      .delete()
      .eq('id', detalleIds[id])
      .select();

    if (error) {
      console.log('Error al quitar el producto:', error);
      return;
    }

    // igual que en el UPDATE: si el RLS bloquea el DELETE no hay error,
    // solo 0 filas borradas
    if (data.length === 0) {
      console.log('No se borró ninguna fila: revisa el RLS de detalles_pedidos');
      return;
    }

    delete detalleIds[id];
  }

  // con o sin sesión
  delete carrito[id];
  actualizarCarrito();
}

// Borra todos los productos del carrito. Con sesión, borra sus filas de
// detalles_pedidos (todas las de este pedido de una vez); el pedido se
// queda, vacío, para reutilizarlo. Si la base falla, no se toca nada.
async function vaciarCarrito() {
  if (pedidoId) {
    const { error } = await db
      .from('detalles_pedidos')
      .delete()
      .eq('pedido_id', pedidoId);

    if (error) {
      console.log('Error al vaciar el carrito:', error);
      mostrarAviso('No se pudo vaciar el carrito. Revisa la consola (F12).');
      return;
    }
  }

  carrito = {};
  Object.keys(detalleIds).forEach((id) => delete detalleIds[id]);
  actualizarCarrito();
}

// Al entrar a la página: con sesión, el carrito de verdad es el de la
// base (no el de localStorage); se leen sus detalles para llenar carrito
// y detalleIds. Sin sesión se queda el de localStorage (modo demostración).
async function cargarCarritoDesdeBD() {
  // a) el panel necesita PRODUCTOS para mostrar nombres y precios
  await productosListos;

  // b) se parte de cero: el carrito de verdad es el de la base
  vaciarCarritoLocal();

  // c) sin sesión no hay nada que leer
  const usuario = await obtenerUsuario();
  if (!usuario) return;

  // d) UNA sola consulta: el pedido en 'carrito' y, anidados, sus detalles.
  // Funciona porque detalles_pedidos.pedido_id es FK a pedidos.id.
  const { data, error } = await db
    .from('pedidos')
    .select('id, detalles_pedidos(id, producto_id, cantidad)')
    .eq('cliente_id', usuario.id)
    .eq('estado', 'carrito')
    .maybeSingle();

  // e) error o sin carrito abierto → termina
  if (error) {
    console.log('Error al leer el carrito:', error);
    return;
  }
  if (!data) return;

  // f) llena carrito y detalleIds con lo guardado en la base
  pedidoId = data.id;
  data.detalles_pedidos.forEach((d) => {
    carrito[d.producto_id] = d.cantidad;
    detalleIds[d.producto_id] = d.id;
  });
  actualizarCarrito();
}

// ---- 13b) CARRITO EN SUPABASE ----
// El usuario con sesión, o null si no hay nadie logueado. Es el mismo
// getUser() que usa mostrarEstadoSesion() en cliente.js.
async function obtenerUsuario() {
  const { data } = await db.auth.getUser();
  return data.user ?? null;
}

// Busca el pedido de este cliente que sigue en estado 'carrito'.
// maybeSingle(): si no hay ninguno devuelve null en vez de error. Solo
// puede haber uno gracias al índice único de la tabla pedidos.
async function buscarCarrito(usuario) {
  const { data, error } = await db
    .from('pedidos')
    .select('id')
    .eq('cliente_id', usuario.id)
    .eq('estado', 'carrito')
    .maybeSingle();

  if (error) {
    console.log('Error al buscar el carrito:', error);
    return null;
  }

  return data ? data.id : null;
}

// Devuelve el id del carrito abierto; si no existe, lo crea.
async function obtenerOCrearCarrito(usuario) {
  // 1) ya lo teníamos en memoria → no preguntamos otra vez
  if (pedidoId) return pedidoId;

  // 2) ¿ya existe en la base (de otra visita u otra pestaña)?
  pedidoId = await buscarCarrito(usuario);
  if (pedidoId) return pedidoId;

  // 3) no existe → lo creamos. Solo mandamos cliente_id: el estado
  // 'carrito' lo pone el default de la columna.
  const { data, error } = await db
    .from('pedidos')
    .insert([{ cliente_id: usuario.id }])
    .select('id')
    .single();

  if (error) {
    // 23505 = unique_violation: alguien (un doble clic, otra pestaña)
    // creó el carrito justo antes que nosotros. No es un fallo real:
    // ese carrito ya existe, así que lo buscamos y usamos ese.
    if (error.code === '23505') {
      pedidoId = await buscarCarrito(usuario);
      return pedidoId;
    }
    console.log('Error al crear el carrito:', error);
    return null;
  }

  pedidoId = data.id;
  return pedidoId;
}

// Olvida el carrito en este navegador (por ejemplo, al pagar o al cerrar
// sesión). detalleIds es const, así que se vacía borrando sus claves.
function vaciarCarritoLocal() {
  carrito = {};
  Object.keys(detalleIds).forEach((id) => delete detalleIds[id]);
  pedidoId = null;
  actualizarCarrito();
}

// Refresca todo lo que muestra el carrito: el globito y el panel.
function actualizarCarrito() {
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
const btnCheckout = document.getElementById('btn-checkout');
const mensajeCarrito = document.getElementById('mensaje-carrito');

function renderCarrito() {
  const ids = Object.keys(carrito);
  const n = contarCarrito();
  carritoTituloN.textContent = n > 0 ? `(${n})` : '';

  if (ids.length === 0) {
    carrito_items.innerHTML = '<p class="carrito-vacio">Tu carrito está vacío.<br>Agrega productos desde su ficha.</p>';
    carritoTotal.textContent = formatoPesos(0);
    return;
  }

  mensajeCarrito.textContent = ''; // ya hay productos: el aviso viejo sobra

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
          <button type="button" class="ci-quitar btn-quitar" data-accion="quitar" aria-label="Quitar del carrito">×</button>
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

// ---- 13c) CHECKOUT ----
// "Continuar": con productos y con sesión, deja una FOTO del carrito para
// el resumen de pago.html y pasa a esa página. Allí se piden los datos de
// entrega y de pago, y se confirma el pedido en la base.
btnCheckout.addEventListener('click', async () => {
  mensajeCarrito.textContent = '';

  if (contarCarrito() === 0) {
    mensajeCarrito.textContent = 'Tu carrito está vacío.';
    return;
  }

  const usuario = await obtenerUsuario();
  if (!usuario || !pedidoId) {
    mensajeCarrito.textContent = 'Para comprar, inicia sesión en Mi cuenta (cliente.html).';
    return;
  }

  guardarFotoPedido(pedidoId);
  carritoDialog.close();
  window.location.href = 'pago.html';
});

// Guarda una FOTO del carrito en localStorage para el resumen de pago.html
// (y luego estado-pedido.html). El total de aquí es solo una vista previa:
// el definitivo lo calcula la base al confirmar (pedidos_con_total).
// Las filas siguen en Supabase: si la persona vuelve a la tienda, el
// carrito se recarga desde la base con cargarCarritoDesdeBD().
function guardarFotoPedido(idPedido) {
  const items = Object.entries(carrito).map(([id, cantidad]) => {
    const p = PRODUCTOS.find((x) => x.id === Number(id));
    return {
      id: Number(id),
      nombre: p ? p.nombre : 'Producto',
      cantidad,
      precio: p ? precioFinal(p) : 0,
    };
  });

  const pedido = {
    id: idPedido,
    items,
    total: totalCarrito(),
    fecha: new Date().toISOString(),
    pagado: false,
  };

  localStorage.setItem('pedido-actual', JSON.stringify(pedido));
}

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
// Es async, así que devuelve una promesa que termina cuando acabó la carga
// (también si hubo error): eso es lo que espera cargarCarritoDesdeBD().
async function cargarProductos() {
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

const productosListos = cargarProductos();
cargarCarritoDesdeBD(); // espera a productosListos por dentro
