document.getElementById('form-registro-admin').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const form = evento.target;

  const { data, error } = await db.auth.signUp({
    email: form.elements['admin-registro-correo'].value,
    password: form.elements['admin-registro-password'].value,
  });

  if (error) {
    document.getElementById('estado-sesion-admin').innerText = 'Error al registrar: ' + error.message;
    return;
  }

  const { error: errorPerfil } = await db.from('admins_práctica').insert([{
    id: data.user.id,
    nombre: form.elements['admin-registro-nombre'].value.trim(),
    correo: form.elements['admin-registro-correo'].value.trim(),
  }]);

  if (errorPerfil) {
    document.getElementById('estado-sesion-admin').innerText = 'Cuenta creada, pero falló el perfil: ' + errorPerfil.message;
    return;
  }

  document.getElementById('estado-sesion-admin').innerText = 'Cuenta de administrador creada. Ya puedes iniciar sesión.';
  form.reset();

  // vuelve al form de login para que entre con la cuenta recién creada
  form.hidden = true;
  document.getElementById('form-login-admin').hidden = false;
});

document.getElementById('form-login-admin').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const form = evento.target;

  const { error } = await db.auth.signInWithPassword({
    email: form.elements['admin-login-correo'].value,
    password: form.elements['admin-login-password'].value,
  });

  if (error) {
    document.getElementById('estado-sesion-admin').innerText = 'Error al iniciar sesión: ' + error.message;
    return;
  }

  mostrarEstadoSesionAdmin();
});

// Muestra la zona de acceso (login/registro) o el panel con el CRUD,
// según si quien entra es un admin confirmado. Un solo interruptor:
// #zona-acceso-admin y #panel-admin siempre quedan al revés uno del otro.
function aplicarAcceso(esAdmin) {
  document.getElementById('zona-acceso-admin').hidden = esAdmin;
  document.getElementById('panel-admin').hidden = !esAdmin;

  if (esAdmin) {
    // Al entrar como admin saltamos directo al inventario: revelamos
    // #contenido (que empieza oculto) y lo traemos a la vista, así no hay
    // que pasar por el hero ni pulsar "Ver productos".
    const contenido = document.getElementById('contenido');
    contenido.hidden = false;
    contenido.classList.add('revelado');
    contenido.scrollIntoView(); // salto directo, sin animación de scroll
  } else {
    // Al cerrar sesión volvemos arriba para ver bien la pantalla de login.
    window.scrollTo(0, 0);
  }
}

async function mostrarEstadoSesionAdmin() {
  const { data } = await db.auth.getUser();
  const estado = document.getElementById('estado-sesion-admin');

  if (!data.user) {
    estado.innerText = 'No has iniciado sesión.';
    aplicarAcceso(false); // sin sesión → solo se ve la zona de acceso
    return;
  }

  // Importante: tener sesión no basta — confirmamos que además exista
  // su fila en admins_práctica.
  const { data: perfil } = await db.from('admins_práctica').select('nombre').eq('id', data.user.id).single();

  // Solo abrimos el panel si hay perfil de administrador. Una sesión sin
  // perfil (p. ej. un usuario normal) se queda fuera.
  if (perfil) {
    estado.innerText = 'Sesión iniciada como ' + perfil.nombre + ' (admin).';
    aplicarAcceso(true);
  } else {
    estado.innerText = 'Sesión iniciada, pero sin perfil de administrador.';
    aplicarAcceso(false);
  }
}

// Alternar entre iniciar sesión y registrarse: solo se ve uno a la vez.
const formLogin = document.getElementById('form-login-admin');
const formRegistro = document.getElementById('form-registro-admin');

document.getElementById('ir-a-registro').addEventListener('click', () => {
  formLogin.hidden = true;
  formRegistro.hidden = false;
});

document.getElementById('ir-a-login').addEventListener('click', () => {
  formRegistro.hidden = true;
  formLogin.hidden = false;
});

// Vacía los dos forms y deja las contraseñas otra vez ocultas (ojo "cerrado").
// Lo usamos al cerrar sesión para no dejar los datos escritos.
function limpiarAcceso() {
  formLogin.reset();
  formRegistro.reset();
  document.querySelectorAll('.campo-clave input').forEach((campo) => campo.type = 'password');
  document.querySelectorAll('.ojo').forEach((boton) => {
    boton.classList.remove('activo');
    boton.setAttribute('aria-pressed', 'false');
    boton.setAttribute('aria-label', 'Mostrar contraseña');
  });
}

document.getElementById('btn-logout-admin').addEventListener('click', async () => {
  await db.auth.signOut();
  limpiarAcceso();          // borra lo escrito antes de volver al login
  mostrarEstadoSesionAdmin();
});

// OJITO para ver/ocultar la contraseña. Un solo comportamiento para todos
// los botones .ojo: alterna el type del input vecino entre password y text.
document.querySelectorAll('.ojo').forEach((boton) => {
  boton.addEventListener('click', () => {
    const campo = boton.closest('.campo-clave').querySelector('input');
    const mostrar = campo.type === 'password'; // true = pasamos a mostrarla
    campo.type = mostrar ? 'text' : 'password';
    boton.classList.toggle('activo', mostrar); // dispara la animación del tachado
    boton.setAttribute('aria-pressed', String(mostrar));
    boton.setAttribute('aria-label', mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
});

mostrarEstadoSesionAdmin();
//LEER TODOS (READ)
// Antes esto era el listener del botón "Traer productos". Ahora es una
// función con nombre: la llamamos al cargar la página y otra vez después
// de agregar o modificar, para que la tabla siempre esté al día.
async function cargarProductos() {

  // "async" convierte esta función en una función
  // ASÍNCRONA: una función que PUEDE usar "await" adentro para esperar
  // algo que tarda, sin congelar el resto de la página mientras espera.
  //
  // Diferencia clave con localStorage (semana 7): localStorage.getItem()
  // y localStorage.setItem() son operaciones SINCRÓNICAS — ocurren al
  // instante, en tu propio computador, sin viajar a ningún lado. Por eso
  // nunca necesitaste "async"/"await" para leer o escribir en
  // localStorage. Una consulta a Supabase, en cambio, viaja por internet
  // hasta el servidor de Supabase y la respuesta tiene que volver — eso
  // toma un tiempo real (aunque sea poco), y JavaScript necesita una
  // forma explícita de decir "espera aquí a que llegue la respuesta".

  // "await" pausa la ejecución DE ESTA FUNCIÓN (no de toda la página)
  // hasta que la consulta a Supabase responda. Mientras tanto, el resto
  // de tu página sigue funcionando con normalidad — solo esta función
  // en particular se detiene en esta línea hasta tener respuesta real.
  const { data, error } = await db
    .from('productos_práctica')
    .select('*')
    .order('id'); // ordenados por id, así no cambian de lugar al modificarlos

  // Sin "await" en la línea de arriba, "data" y "error" NO tendrían el
  // resultado todavía — tendrías una "Promise" (promesa) sin resolver,
  // no los datos reales. Eso es justo lo que "await" evita: te obliga
  // a esperar antes de seguir usando el resultado.
  const contenedor = document.getElementById('todos-productos');

  if (error) {
    // Revisamos "error" ANTES de tocar "data": si la consulta falló,
    // "data" llega como null, y usar null más adelante (ej. null.map())
    // rompería el script. Mismo patrón de "validar antes de operar"
    // que ya usaste en el CRUD de la semana 7.
    contenedor.textContent = 'Error: ' + error.message;
    return;
  }

  document.getElementById('contador').textContent = '(' + data.length + ')';
  llenarSelectEliminar(data); // la lista de "¿Quieres eliminar...?" también se actualiza
  contenedor.innerHTML = data.length === 0
    ? 'Todavía no hay productos.'
    : tablaProductos(data);
}

// Se llama sola apenas carga el archivo: los productos se cargan de una vez,
// aunque estén ocultos hasta que se pulse "Ver productos"
cargarProductos();

//PORTADA → CONTENIDO
const contenido = document.getElementById('contenido');
const btnVerProductos = document.getElementById('btn-ver-productos');

// Muestra el panel y la tabla (que empiezan con hidden) con una animación
// y baja la pantalla hasta ellos. Si ya estaban visibles, solo baja.
function mostrarContenido() {
  if (contenido.hidden) {
    contenido.hidden = false;
    contenido.classList.add('revelado'); // dispara la animación "subir" del CSS
    btnVerProductos.classList.add('usado'); // el botón se desvanece
  }
  contenido.scrollIntoView({ behavior: 'smooth' });
}

btnVerProductos.addEventListener('click', mostrarContenido);

//CRUD
// AHORA (Supabase):
async function agregarProducto(datos) {

  const { data, error } = await db
    .from('productos_práctica')  // la tabla
    .insert([datos])             // insert() siempre recibe un ARRAY de objetos,
                                  // aunque insertes uno solo
    .select();                    // .select() le pide a Supabase que te
                                   // devuelva la fila ya creada (con su id
                                   // nuevo) — sin esto, insert() no te
                                   // devuelve nada útil

  if (error) {
    console.log("Error al agregar:", error);
    return null;
  }

  return data[0];   // data siempre es un array — tomamos el primer
                     // elemento, que es la fila recién creada
}

// Escuchamos el "submit" del FORM, no el "click" del botón: así también
// funciona si la persona presiona Enter dentro de un campo.
const formProducto = document.getElementById('form-producto');

formProducto.addEventListener('submit', async (evento) => {
  // Por defecto, enviar un form RECARGA la página (y perderíamos todo).
  // preventDefault() le dice al navegador: "no hagas eso, yo me encargo".
  evento.preventDefault();

  const datos = leerFormulario();
  const notificacion = document.getElementById('notificación');
  notificacion.textContent = 'Guardando...';

  // idEditando decide qué operación del CRUD hacemos:
  // null → CREATE (agregar) | un número → UPDATE (modificar ese id)
  if (idEditando) {
    const respuesta = await modificarProducto(idEditando, datos);

    if (respuesta) {
      notificacion.textContent = 'Producto ' + respuesta.id + ' modificado';
      salirDeEdicion();
      cargarProductos(); // la tabla grande muestra el cambio
      // si había una búsqueda, la repetimos para actualizar el panel también
      if (inputBusqueda.value.trim() !== '') formFiltro.requestSubmit();
    } else {
      notificacion.textContent = 'No se pudo modificar (mira la consola con F12)';
    }
    return;
  }

  const respuesta = await agregarProducto(datos);

  // agregarProducto devuelve null si hubo error (ver el if de arriba)
  if (respuesta) {
    notificacion.textContent = 'Producto agregado con id ' + respuesta.id;
    formProducto.reset(); // limpia los campos para agregar otro
    cargarProductos();    // el producto nuevo aparece en la tabla
  } else {
    notificacion.textContent = 'No se pudo agregar (mira la consola con F12)';
  }
});
// ↑ aquí TERMINA el listener del form. Antes las dos funciones de abajo
// estaban ADENTRO de este listener, así que solo existían mientras corría
// el submit — el botón de filtrar no las podía ver (scope). Ahora quedan
// en el nivel superior del archivo y cualquier listener las puede usar.

// Lee el form y devuelve el objeto listo para Supabase. Lo usan tanto
// agregar como modificar, por eso está en su propia función.
function leerFormulario() {
  // FormData lee todos los inputs del form; .get('nombre') busca el
  // input que tiene name="nombre". Todo lo que devuelve es TEXTO (string),
  // por eso abajo convertimos cada valor al tipo que espera la tabla.
  const campos = new FormData(formProducto);

  return {
    nombre: campos.get('nombre'),
    descripcion: campos.get('descripcion'),
    precio: Number(campos.get('precio')),             // "150000" → 150000
    unidades: Number(campos.get('unidades')),
    descuento: Number(campos.get('descuento')) / 100, // 15 → 0.15
    // un checkbox sin marcar NO aparece en FormData → get() da null
    disponible: campos.get('disponible') !== null,
    // "tecnología, audio" → ["tecnología", "audio"]
    categorias: campos.get('categorias')
      .split(',')
      .map(c => c.trim())       // quita los espacios de los lados
      .filter(c => c !== ''),   // quita las vacías (ej. si quedó una coma al final)
    img_URL: campos.get('img_URL'),
  };
}

//BÚSQUEDA
async function buscarProductoPorId(id) {
  const { data, error } = await db
    .from('productos_práctica')
    .select('*')
    .eq('id', id)    // eq = "equal" (igual a) — equivalente a find(p => p.id === id)
    .single();         // single() = "espero exactamente una fila, dámela
                        // como objeto, no como array de un elemento"

  if (error) return null;
  return data;
}

async function buscarProductosPorNombre(texto) {
  const { data, error } = await db
    .from('productos_práctica')
    .select('*')
    .ilike('nombre', `%${texto}%`);
    // ilike = "like" insensible a mayúsculas/minúsculas.
    // los símbolos % significan "cualquier texto antes/después" —
    // equivalente a .toLowerCase().includes(texto)

  if (error) return [];
  return data;
}

//FILTRO
const formFiltro = document.getElementById('form-filtro');
const selectTipo = document.getElementById('tipo-busqueda');

//LISTAS DESPLEGABLES CON ESTILO
// Las opciones de un <select> las dibuja el navegador y no se pueden
// estilizar. mejorarSelect() oculta el <select> y pone al lado nuestra
// propia lista. Al elegir una opción le cambiamos el valor al <select>
// oculto y disparamos su evento "change": así todo el código que ya lo
// usaba (selectTipo.value, selectEliminar.value...) sigue funcionando igual.
// Si una <option> tiene data-img, la lista muestra esa foto al lado.
// Devuelve { actualizar, abrir } para cuando el JS cambia las opciones.
function mejorarSelect(select) {
  // estructura: <div.selector> [select oculto] [botón] [lista] </div>
  const contenedor = document.createElement('div');
  contenedor.className = 'selector';
  select.before(contenedor);
  contenedor.append(select);
  select.hidden = true;
  select.tabIndex = -1;

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'selector-boton';
  boton.setAttribute('aria-haspopup', 'listbox');
  boton.setAttribute('aria-expanded', 'false');
  boton.setAttribute('aria-label', select.getAttribute('aria-label') ?? '');
  boton.innerHTML = '<span class="selector-valor"></span>';
  const valor = boton.querySelector('.selector-valor');

  const lista = document.createElement('ul');
  lista.className = 'selector-lista';
  lista.setAttribute('role', 'listbox');
  lista.hidden = true;

  contenedor.append(boton, lista);

  // el texto del botón = la opción elegida (o el "Elige..." en gris)
  function actualizar() {
    const elegida = select.options[select.selectedIndex];
    valor.textContent = elegida ? elegida.textContent : '';
    valor.classList.toggle('sin-elegir', !select.value);
  }

  // arma la lista a partir de las <option> actuales (menos la vacía)
  function pintarOpciones() {
    lista.innerHTML = [...select.options]
      .filter(op => op.value !== '')
      .map(op => `
        <li>
          <button type="button" role="option" data-valor="${op.value}"
                  aria-selected="${op.value === select.value}">
            ${op.dataset.img !== undefined
              ? (op.dataset.img
                  ? `<img src="${op.dataset.img}" alt="">`
                  : '<span class="sin-foto" aria-hidden="true"></span>')
              : ''}
            <span class="opcion-texto">${op.textContent}</span>
          </button>
        </li>`)
      .join('');
  }

  function abrir() {
    pintarOpciones();
    lista.hidden = false;
    boton.setAttribute('aria-expanded', 'true');
    // el foco va a la opción elegida (o a la primera), para usar las flechas
    const foco = lista.querySelector('[aria-selected="true"]') ?? lista.querySelector('button');
    foco?.focus();
  }

  function cerrar() {
    lista.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
  }

  boton.addEventListener('click', () => {
    lista.hidden ? abrir() : cerrar();
  });

  lista.addEventListener('click', (evento) => {
    const opcion = evento.target.closest('button');
    if (!opcion) return;

    cerrar();
    boton.focus();
    if (select.value !== opcion.dataset.valor) {
      select.value = opcion.dataset.valor;
      actualizar();
      select.dispatchEvent(new Event('change')); // avisa a los listeners del select
    }
  });

  // teclado: ↑ ↓ entre opciones, Escape cierra y vuelve al botón
  lista.addEventListener('keydown', (evento) => {
    const opciones = [...lista.querySelectorAll('button')];
    const actual = opciones.indexOf(document.activeElement);

    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      const paso = evento.key === 'ArrowDown' ? 1 : -1;
      opciones[(actual + paso + opciones.length) % opciones.length].focus();
    } else if (evento.key === 'Escape') {
      cerrar();
      boton.focus();
    }
  });

  // clic en cualquier otro lado de la página → se cierra
  document.addEventListener('click', (evento) => {
    if (!contenedor.contains(evento.target)) cerrar();
  });

  actualizar();
  return { actualizar, abrir };
}

mejorarSelect(selectTipo);

// Al cambiar "Buscar por", adaptamos el campo: el teclado del celular,
// el texto de ayuda y limpiamos lo escrito (un nombre no sirve como id)
selectTipo.addEventListener('change', () => {
  const porId = selectTipo.value === 'id';
  inputBusqueda.placeholder = porId ? 'Id del producto (ej: 4)' : 'Nombre del producto';
  inputBusqueda.inputMode = porId ? 'numeric' : 'text'; // teclado numérico en el celular
  inputBusqueda.value = '';
  ocultarSugerencias();
  inputBusqueda.focus();
});

formFiltro.addEventListener('submit', async (evento) => {
  evento.preventDefault(); // igual que en el form de agregar: no recargar
  ocultarSugerencias();
  // los resultados salen en el panel: si sigue oculto, lo mostramos
  // (solo si está oculto: así no salta la pantalla al refrescar una búsqueda)
  if (contenido.hidden) mostrarContenido();

  // trim() quita espacios de los lados: "  3 " → "3"
  const texto = document.getElementById('busqueda').value.trim();
  const contenedor = document.getElementById('resultado-filtro');

  // lo que eligió en la lista desplegable: "nombre" o "id"
  const tipo = selectTipo.value;

  if (texto === '') {
    contenedor.textContent = tipo === 'id' ? 'Escribe un id para buscar.' : 'Escribe un nombre para buscar.';
    return;
  }

  // Number("3") → 3 (entero) | Number("silla") → NaN (no es entero).
  const comoNumero = Number(texto);
  if (tipo === 'id' && !Number.isInteger(comoNumero)) {
    contenedor.textContent = 'El id tiene que ser un número entero.';
    return;
  }

  contenedor.textContent = 'Buscando...';
  let productos;

  if (tipo === 'id') {
    const producto = await buscarProductoPorId(comoNumero);
    // buscarProductoPorId devuelve UN objeto (o null), no un array.
    // Lo metemos en un array para pintar ambos casos con el mismo código.
    productos = producto ? [producto] : [];
  } else {
    productos = await buscarProductosPorNombre(texto); // ya es un array
  }

  if (productos.length === 0) {
    contenedor.textContent = 'No se encontraron productos.';
    return;
  }

  // en el panel angosto va la versión reducida (tarjetas), no la tabla
  contenedor.innerHTML = tarjetasProductos(productos);
});

// Versión reducida para el panel: foto, nombre, precio y botón Editar
function tarjetasProductos(productos) {
  return '<div class="mini-lista">' + productos.map(p => `
    <div class="mini" data-id="${p.id}">
      ${p.img_URL ? `<img src="${p.img_URL}" alt="">` : '<span class="sin-foto" aria-hidden="true"></span>'}
      <div class="mini-info">
        <strong title="${p.nombre}">${p.nombre}</strong>
        ${precioHTML(p)}
        ${estadoHTML(p)}
      </div>
      ${botonesAcciones(p.id)}
    </div>`).join('') + '</div>';
}

// 150000 → "150.000" (separador de miles colombiano, sin decimales)
function formatoPesos(valor) {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

// Precio con descuento: el de antes tachado, el de ahora grande y una
// etiqueta "-15%". Si no hay descuento, solo el precio normal.
function precioHTML(p) {
  const precio = Number(p.precio);
  const descuento = p.descuento ?? 0;   // en la tabla está como 0.15

  if (descuento <= 0) {
    return `<span class="precio"><span class="precio-ahora">${formatoPesos(precio)}</span></span>`;
  }

  const ahora = precio * (1 - descuento); // 100.000 con 0.15 → 85.000
  return `
    <span class="precio">
      <span class="precio-antes">${formatoPesos(precio)}</span>
      <span class="precio-ahora">${formatoPesos(ahora)}</span>
      <span class="badge-descuento">-${Math.round(descuento * 100)}%</span>
    </span>`;
}

// Disponible / No disponible como una pastilla de color con un puntito
function estadoHTML(p) {
  return p.disponible
    ? '<span class="estado si">Disponible</span>'
    : '<span class="estado no">No disponible</span>';
}

// El botón Editar, igual en la tabla y en las tarjetas
// (eliminar tiene su propio desplegable en el panel izquierdo)
function botonesAcciones(id) {
  return `<button type="button" class="btn-editar" data-id="${id}">Editar</button>`;
}

//AUTOCOMPLETADO
const inputBusqueda = document.getElementById('busqueda');
const listaSugerencias = document.getElementById('sugerencias');
let temporizador = null;  // para esperar a que la persona deje de escribir
let indiceActivo = -1;    // sugerencia marcada con las flechas (-1 = ninguna)

// "input" se dispara con CADA letra que se escribe o se borra
inputBusqueda.addEventListener('input', () => {
  const texto = inputBusqueda.value.trim();

  // Si escribimos "ip", no queremos 2 consultas a Supabase (una por "i" y
  // otra por "ip"). Cancelamos la anterior y esperamos 250 ms sin teclear:
  // a esto se le llama "debounce".
  clearTimeout(temporizador);

  // vacío o buscando por id → no hay nada que sugerir
  if (texto === '' || selectTipo.value === 'id') {
    ocultarSugerencias();
    return;
  }

  temporizador = setTimeout(async () => {
    const productos = await buscarProductosPorNombre(texto); // la misma de BÚSQUEDA

    // Mientras esperábamos a Supabase la persona pudo seguir escribiendo.
    // Si el campo ya cambió, esta respuesta es vieja y la ignoramos.
    if (inputBusqueda.value.trim() !== texto) return;

    mostrarSugerencias(productos.slice(0, 6), texto); // máximo 6 sugerencias
  }, 250);
});

function mostrarSugerencias(productos, texto) {
  indiceActivo = -1;

  if (productos.length === 0) {
    ocultarSugerencias();
    return;
  }

  listaSugerencias.innerHTML = productos
    .map(p => `
      <li data-nombre="${p.nombre}">
        ${p.img_URL
          ? `<img src="${p.img_URL}" alt="">`               /* alt vacío: el nombre ya está al lado */
          : '<span class="sin-foto" aria-hidden="true"></span>'}
        <span>${resaltar(p.nombre, texto)}</span>
      </li>`)
    .join('');
  listaSugerencias.hidden = false;
}

function ocultarSugerencias() {
  listaSugerencias.hidden = true;
  listaSugerencias.innerHTML = '';
  indiceActivo = -1;
}

// "iPhone 15" + "ph" → "i<mark>Ph</mark>one 15" (la parte escrita en negrita)
function resaltar(nombre, texto) {
  const inicio = nombre.toLowerCase().indexOf(texto.toLowerCase());
  if (inicio === -1) return nombre;
  const fin = inicio + texto.length;
  return nombre.slice(0, inicio) + '<mark>' + nombre.slice(inicio, fin) + '</mark>' + nombre.slice(fin);
}

// Elegir una sugerencia: la pone en el campo y busca de una vez
function elegirSugerencia(li) {
  inputBusqueda.value = li.dataset.nombre;
  ocultarSugerencias();
  formFiltro.requestSubmit();
}

// Delegación de eventos otra vez: los <li> se crean con innerHTML.
// "mousedown" en vez de "click": ocurre ANTES de que el campo pierda el
// foco, así la lista no se cierra antes de registrar la elección.
listaSugerencias.addEventListener('mousedown', (evento) => {
  const li = evento.target.closest('li');
  if (li) elegirSugerencia(li);
});

// Flechas ↑ ↓ para moverse, Enter para elegir, Escape para cerrar
inputBusqueda.addEventListener('keydown', (evento) => {
  const items = listaSugerencias.querySelectorAll('li');
  if (listaSugerencias.hidden || items.length === 0) return;

  if (evento.key === 'ArrowDown') {
    evento.preventDefault(); // que el cursor no salte al final del texto
    indiceActivo = (indiceActivo + 1) % items.length; // al final vuelve al primero
  } else if (evento.key === 'ArrowUp') {
    evento.preventDefault();
    indiceActivo = (indiceActivo - 1 + items.length) % items.length;
  } else if (evento.key === 'Enter' && indiceActivo >= 0) {
    evento.preventDefault(); // no enviar el form con el texto a medias
    elegirSugerencia(items[indiceActivo]);
    return;
  } else if (evento.key === 'Escape') {
    ocultarSugerencias();
    return;
  } else {
    return;
  }

  items.forEach((li, i) => li.classList.toggle('activa', i === indiceActivo));
});

// al salir del campo (clic en otro lado) se cierra la lista
inputBusqueda.addEventListener('blur', ocultarSugerencias);

//TEMA CLARO / OSCURO
// El tema guardado ya se aplicó en el <head> (ver admin.html). Aquí solo
// manejamos el botón. Los colores viven en variables CSS: al cambiar
// data-tema en <html>, el CSS usa los valores de :root[data-tema="oscuro"].
const btnTema = document.getElementById('btn-tema');

function actualizarBotonTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  // el botón dice a qué modo VAS a cambiar, no en cuál estás
  btnTema.textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
}

btnTema.addEventListener('click', () => {
  const html = document.documentElement;

  if (html.dataset.tema === 'oscuro') {
    delete html.dataset.tema;              // sin el atributo → tema claro
    localStorage.setItem('tema', 'claro');
  } else {
    html.dataset.tema = 'oscuro';
    localStorage.setItem('tema', 'oscuro'); // se recuerda al recargar
  }

  actualizarBotonTema();
});

actualizarBotonTema(); // texto correcto apenas carga la página

// Arma una <table> con una fila por producto. Devuelve el HTML como texto.
function tablaProductos(productos) {
  // data-id en la fila: al pulsarla sabemos qué producto mostrar en la tarjeta.
  // tabindex="0": la fila se puede enfocar con Tab y abrir con Enter
  const filas = productos.map(p => `
    <tr data-id="${p.id}" tabindex="0">
      <td>${p.id}</td>
      <td>${p.img_URL ? `<img src="${p.img_URL}" alt="${p.nombre}">` : '<span class="sin-foto" style="width:64px;height:64px" aria-hidden="true"></span>'}</td>
      <td><strong>${p.nombre}</strong></td>
      <td>${p.descripcion ?? ''}</td>
      <td>${precioHTML(p)}</td>
      <td>${p.unidades}</td>
      <td>${(p.categorias ?? []).map(c => `<span class="etiqueta">${c}</span>`).join('')}</td>
      <td>${estadoHTML(p)}</td>
      <!-- data-id guarda el id en el botón, para saber cuál producto editar o borrar -->
      <td>${botonesAcciones(p.id)}</td>
    </tr>`).join('');

  return `
    <div class="tabla-wrap">
      <table class="tabla-productos">
        <thead>
          <tr>
            <th>Id</th><th>Imagen</th><th>Nombre</th><th>Descripción</th><th>Precio</th>
            <th>Unidades</th><th>Categorías</th><th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>`;
}

async function modificarProducto(id, cambios) {

  const { data, error } = await db
    .from('productos_práctica')  // con tilde, igual que en las otras consultas
    .update(cambios)   // solo actualiza las propiedades que vengan en "cambios"
    .eq('id', id)        // ...de la fila donde el id coincida
    .select();

  if (error) {
    console.log("Error al modificar:", error);
    return null;
  }
  // si ninguna fila coincidió (o RLS bloqueó el update), data llega como []
  // y data[0] sería undefined — lo convertimos a null, igual que un error
  return data[0] ?? null;
}

//EDICIÓN
// null = el form está en modo "agregar"; un número = está editando ese id
let idEditando = null;

const tituloForm = document.getElementById('titulo-form');
const btnAgregar = document.getElementById('btn-agregar');
const btnCancelar = document.getElementById('btn-cancelar');
const panelAgregar = document.getElementById('panel-agregar'); // el <details>

// Lo contrario de leerFormulario(): pone los datos del producto en los inputs
function llenarFormulario(producto) {
  const campos = formProducto.elements; // elements.nombre = el input con name="nombre"

  campos.nombre.value = producto.nombre;
  campos.descripcion.value = producto.descripcion ?? '';
  campos.precio.value = producto.precio;
  campos.unidades.value = producto.unidades;
  campos.descuento.value = Math.round((producto.descuento ?? 0) * 100); // 0.15 → 15
  campos.categorias.value = (producto.categorias ?? []).join(', ');    // ["a","b"] → "a, b"
  campos.img_URL.value = producto.img_URL ?? '';
  campos.disponible.checked = producto.disponible;

  idEditando = producto.id;
  tituloForm.textContent = 'Modificar producto #' + producto.id;
  btnAgregar.textContent = 'Guardar cambios';
  btnCancelar.hidden = false;
  panelAgregar.open = true; // abre el desplegable para que se vea el form
  formProducto.scrollIntoView({ behavior: 'smooth' });
}

function salirDeEdicion() {
  idEditando = null;
  formProducto.reset();
  tituloForm.textContent = 'Agregar producto';
  btnAgregar.textContent = 'Agregar producto';
  btnCancelar.hidden = true;
  panelAgregar.open = false; // vuelve a quedar solo el botón "¿Quieres agregar...?"
}

btnCancelar.addEventListener('click', () => {
  salirDeEdicion();
  document.getElementById('notificación').textContent = '';
});

// Delegación de eventos: los botones "Editar" se crean con innerHTML
// DESPUÉS de cargar la página, así que no podemos ponerle un listener a
// cada uno. Escuchamos el clic en el contenedor y miramos qué se pulsó.
// Usamos .layout porque hay botones Editar en el panel Y en la tabla grande.
document.querySelector('.layout').addEventListener('click', async (evento) => {
  const boton = evento.target.closest('.btn-editar');

  // el clic no fue en Editar: ¿fue en una fila de la tabla o en una tarjetita?
  if (!boton) {
    const fila = evento.target.closest('.tabla-productos tbody tr, .mini-lista .mini');
    if (fila) abrirTarjeta(Number(fila.dataset.id));
    return;
  }

  editarPorId(Number(boton.dataset.id));
});

// Enter sobre una fila enfocada con Tab también abre la tarjeta
document.querySelector('.layout').addEventListener('keydown', (evento) => {
  const fila = evento.target.closest('.tabla-productos tbody tr');
  if (fila && evento.key === 'Enter') abrirTarjeta(Number(fila.dataset.id));
});

// Trae el producto de Supabase y lo pone en el form (lo usan el botón
// Editar de la tabla, el de las tarjetitas y el de la tarjeta grande)
async function editarPorId(id) {
  const producto = await buscarProductoPorId(id);
  if (producto) {
    llenarFormulario(producto);
  } else {
    document.getElementById('notificación').textContent = 'No se encontró el producto';
  }
}

//TARJETA DEL PRODUCTO
const tarjeta = document.getElementById('tarjeta-producto'); // el <dialog>
const tarjetaContenido = document.getElementById('tarjeta-contenido');

async function abrirTarjeta(id) {
  // primero lo buscamos entre los que ya cargamos (instantáneo);
  // si no está, lo pedimos a Supabase
  const producto = productosCargados.find(p => p.id === id) ?? await buscarProductoPorId(id);
  if (!producto) return;

  const categorias = (producto.categorias ?? []).length > 0
    ? producto.categorias.map(c => `<span class="etiqueta">${c}</span>`).join('')
    : '—';

  tarjetaContenido.innerHTML = `
    <div class="tarjeta-foto">
      ${producto.img_URL
        ? `<img src="${producto.img_URL}" alt="${producto.nombre}">`
        : '<span class="sin-foto" aria-hidden="true"></span>'}
    </div>
    <div class="tarjeta-cuerpo">
      <p class="rotulo">Producto #${producto.id}</p>
      <h2 id="tarjeta-nombre">${producto.nombre}</h2>
      <p class="tarjeta-desc">${producto.descripcion || 'Sin descripción.'}</p>
      ${precioHTML(producto)}
      <dl class="tarjeta-datos">
        <div><dt>Unidades</dt><dd>${producto.unidades}</dd></div>
        <div><dt>Estado</dt><dd>${estadoHTML(producto)}</dd></div>
        <div><dt>Categorías</dt><dd>${categorias}</dd></div>
      </dl>
      <button type="button" class="btn-editar" data-id="${producto.id}">Editar producto</button>
    </div>`;

  tarjeta.showModal(); // la abre encima de todo, con el fondo oscurecido
}

tarjeta.addEventListener('click', (evento) => {
  // botón × → cerrar
  if (evento.target.closest('.tarjeta-cerrar')) {
    tarjeta.close();
    return;
  }

  // "Editar producto" → cerrar la tarjeta y abrir el form con sus datos
  const btnEditarTarjeta = evento.target.closest('.btn-editar');
  if (btnEditarTarjeta) {
    tarjeta.close();
    editarPorId(Number(btnEditarTarjeta.dataset.id));
    return;
  }

  // clic en el fondo oscuro (fuera de la tarjeta) → cerrar.
  // Ese clic le llega al <dialog> mismo, no a algo de adentro.
  if (evento.target === tarjeta) tarjeta.close();
});

//ELIMINAR (DELETE)
const formEliminar = document.getElementById('form-eliminar');
const selectEliminar = document.getElementById('select-eliminar');
const vistaEliminar = document.getElementById('vista-eliminar');
const btnEliminar = document.getElementById('btn-eliminar');
let productosCargados = []; // los guarda llenarSelectEliminar para la vista previa
let temporizadorEliminar = null;

// la misma lista con estilo de "Nombre / ID", pero con fotos
const listaEliminar = mejorarSelect(selectEliminar);

// Pone una <option> por producto: "#4 — Iphone 15 Pro Max".
// data-img: la lista con estilo muestra la foto al lado del nombre
function llenarSelectEliminar(productos) {
  productosCargados = productos;
  selectEliminar.innerHTML =
    '<option value="">Elige un producto...</option>' +
    productos.map(p => `<option value="${p.id}" data-img="${p.img_URL ?? ''}">#${p.id} — ${p.nombre}</option>`).join('');
  listaEliminar.actualizar(); // el botón vuelve a decir "Elige un producto..."
  vistaEliminar.innerHTML = '';
  reiniciarBotonEliminar();
}

// Al elegir un producto mostramos su tarjetita (la misma de los resultados,
// pero sin botones), así se ve QUÉ se va a borrar antes de hacerlo
selectEliminar.addEventListener('change', () => {
  reiniciarBotonEliminar(); // si cambió de producto, la confirmación empieza de cero
  const producto = productosCargados.find(p => p.id === Number(selectEliminar.value));

  vistaEliminar.innerHTML = producto
    ? `<div class="mini">
        ${producto.img_URL ? `<img src="${producto.img_URL}" alt="">` : '<span class="sin-foto" aria-hidden="true"></span>'}
        <div class="mini-info">
          <strong title="${producto.nombre}">${producto.nombre}</strong>
          ${precioHTML(producto)} · ${producto.unidades} unidades
        </div>
      </div>`
    : '';
});

function reiniciarBotonEliminar() {
  clearTimeout(temporizadorEliminar);
  btnEliminar.classList.remove('confirmando');
  btnEliminar.textContent = 'Eliminar';
  btnEliminar.disabled = false;
}

// Confirmación en dos clics, sin ventanas del navegador:
// 1er clic → el botón cambia a "¿Seguro?" durante 3 segundos
// 2do clic (dentro de esos 3 s) → se borra de verdad
formEliminar.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const id = Number(selectEliminar.value);
  const notificacion = document.getElementById('notificación');

  // antes lo hacía el "required" del select; ahora que está oculto, lo
  // validamos aquí: sin producto elegido, abrimos la lista para que elija
  if (!selectEliminar.value) {
    notificacion.textContent = 'Primero elige qué producto eliminar.';
    listaEliminar.abrir();
    return;
  }

  // PRIMER CLIC: todavía no está confirmando → pedimos confirmación
  if (!btnEliminar.classList.contains('confirmando')) {
    btnEliminar.classList.add('confirmando');
    btnEliminar.textContent = '¿Seguro? Pulsa otra vez';
    // si en 3 s no vuelve a pulsar, el botón regresa a la normalidad
    temporizadorEliminar = setTimeout(reiniciarBotonEliminar, 3000);
    return;
  }

  // SEGUNDO CLIC: confirmado → cancelamos el temporizador y borramos
  clearTimeout(temporizadorEliminar);
  btnEliminar.disabled = true; // evita que un tercer clic intente borrar otra vez
  btnEliminar.textContent = 'Eliminando...';

  const borrado = await eliminarProducto(id);

  if (!borrado) {
    notificacion.textContent = 'No se pudo eliminar (mira la consola con F12)';
    reiniciarBotonEliminar();
    return;
  }

  notificacion.textContent = 'Producto #' + id + ' eliminado';
  formEliminar.closest('details').open = false; // cerramos el desplegable

  // si justo estábamos editando ese producto, cerramos el form
  if (idEditando === id) salirDeEdicion();

  cargarProductos(); // la tabla grande ya no lo muestra
  // si había una búsqueda, la repetimos para que desaparezca del panel
  if (inputBusqueda.value.trim() !== '') formFiltro.requestSubmit();
});

async function eliminarProducto(id) {

  const { data, error } = await db
    .from('productos_práctica')
    .delete()
    .eq('id', id)
    .select();       // devuelve las filas que SÍ se borraron

  if (error) {
    console.log("Error al eliminar:", error);
    return false;
  }
  // Si RLS no deja borrar (o el id no existe) NO hay error, pero data
  // llega vacío: solo es "true" si de verdad se borró una fila
  return data.length > 0;
}