async function registrarCliente(nombre, correo, contrasena) {

  // db.auth.signUp() NO toca ninguna tabla tuya todavía — habla directo con
  // el sistema de autenticación interno de Supabase (algo así como una
  // tabla especial, auth.users, que tú no administras a mano). Le mandas
  // correo y contraseña, y Supabase por detrás: valida el formato del
  // correo, guarda la contraseña de forma segura (nunca en texto plano),
  // y crea un identificador único nuevo (un uuid) para esta persona.
  //
  // El resultado llega en dos partes, igual que en todas las llamadas a
  // Supabase que ya conoces (data / error):
  //   - data.user   → los datos del usuario recién creado. data.user.id
  //                   es el uuid real — EL MISMO que vamos a usar como id
  //                   en clientes_practica, dos líneas más abajo.
  //   - data.session → si tu proyecto exige confirmar el correo antes de
  //                   dejar entrar (ver guía, sección 7), esto llega en
  //                   null: el usuario ya existe, pero todavía no hay
  //                   sesión iniciada hasta que confirme.
  const { data, error } = await db.auth.signUp({
    email: correo,
    password: contrasena,
  });

  // Mismo patrón de "revisar error antes de seguir" que ya usaste en el
  // CRUD de productos — si signUp() falló (correo repetido, contraseña
  // muy corta, etc.), ni siquiera intentamos el segundo paso.
  if (error) {
    console.log('Error al registrar:', error);
    return null;
  }

  // Ahora sí tocamos una tabla tuya: clientes_practica. Este insert() es
  // igual al que ya usaste en agregarProducto() — la única diferencia es
  // que aquí SÍ mandamos el id a mano (data.user.id), en vez de dejar que
  // Supabase lo autogenere, porque este id tiene que coincidir exactamente
  // con el que Auth le acaba de asignar al usuario.
  const { data: cliente, error: errorCliente } = await db
    .from('cliente_práctica')
    .insert([{ id: data.user.id, nombre, correo, rol: 'cliente' }])
    .select();

  if (errorCliente) {
    console.log('Error al crear el perfil:', errorCliente);
    return null;
  }

  return cliente[0];
}

// 'submit' es el evento que dispara un <form> cuando alguien hace clic en
// su botón de tipo submit (o presiona Enter dentro de un campo). Por
// defecto, ese evento hace que el navegador RECARGUE la página entera —
// comportamiento heredado de cuando los formularios mandaban sus datos a
// otra página de servidor, décadas atrás. Como aquí todo lo manejamos con
// JavaScript (sin recargar nada), hay que apagar ese comportamiento a
// propósito.
document.getElementById('form-registro').addEventListener('submit', async (event) => {

  // event.preventDefault() le dice al navegador "no hagas lo que harías
  // normalmente con este evento" — en este caso, no recargues la página.
  // Sin esta línea, la página se refrescaría apenas se hiciera clic en
  // "Crear cuenta", y perderías cualquier mensaje que fueras a mostrar.
  event.preventDefault();

  // event.target es el elemento que disparó el evento — en un 'submit',
  // siempre es el propio <form>. Lo guardamos en una variable para poder
  // usarlo más abajo (form.reset()) sin tener que volver a buscarlo.
  const form = event.target;

  const cliente = await registrarCliente(
    document.getElementById('registro-nombre').value.trim(),
    document.getElementById('registro-correo').value.trim(),
    document.getElementById('registro-password').value
  );

  if (cliente) {
    document.getElementById('estado-sesion').textContent =
      'Cuenta creada. Ahora inicia sesión con ese correo y contraseña.';
    form.reset(); // vacía los 3 campos del formulario, para la próxima persona
    mostrarVista('login'); // lo llevamos directo al formulario de iniciar sesión
  } else {
    document.getElementById('estado-sesion').textContent =
      'No se pudo crear la cuenta. Revisa la consola.';
  }
});

async function iniciarSesion(correo, contrasena) {

  // db.auth.signInWithPassword() es para alguien que YA se registró antes
  // (sección 4.1) — no crea ningún usuario nuevo, solo verifica que el
  // correo y la contraseña coincidan con uno que ya existe en Auth.
  //
  // Lo importante pasa "por detrás", sin que se vea en este código: si la
  // verificación sale bien, el cliente de Supabase (la variable db, la
  // misma de siempre) GUARDA la sesión internamente — normalmente en el
  // almacenamiento del navegador — y, desde este momento, la adjunta sola
  // a cada petición futura que hagas con db, sea a productos_practica, a
  // clientes_practica o a cualquier otra tabla. No hay que "pasarle" el
  // usuario a mano a ninguna otra función.
  const { data, error } = await db.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });

  if (error) {
    console.log('Error al iniciar sesión:', error);
    return null;
  }

  // Aquí data.user también trae el id real del usuario — el mismo valor
  // que auth.uid() va a devolver dentro de cualquier política de RLS
  // mientras esta sesión siga activa.
  return data.user;
}

// Mismo patrón explicado en el formulario de registro: 'submit' es el
// evento del <form>, y hay que apagar la recarga automática de página.
document.getElementById('form-login').addEventListener('submit', async (event) => {
  event.preventDefault(); // evita que el navegador recargue la página
  const form = event.target; // el propio <form>, guardado para usar después

  const usuario = await iniciarSesion(
    document.getElementById('login-correo').value.trim(),
    document.getElementById('login-password').value
  );

  if (usuario) {
    form.reset();
    mostrarEstadoSesion(); // definida en la sección 5
    mostrarAviso('Sesión iniciada');
  } else {
    document.getElementById('estado-sesion').textContent =
      'Correo o contraseña incorrectos.';
  }
});

// en una función propia porque se usa desde dos lugares: el menú del
// perfil y la ventana de configuración
async function cerrarSesion() {
  await db.auth.signOut();
  cerrarMenuPerfil();
  mostrarEstadoSesion();
}

document.getElementById('btn-logout').addEventListener('click', cerrarSesion);

//VENTANA DE CONFIGURACIÓN
const ventanaConfig = document.getElementById('ventana-config');

// Las opciones de la ventana salen de este arreglo de objetos: para
// agregar una nueva basta con sumar un objeto aquí, sin tocar el HTML.
// disponible: false → todavía no hace nada, solo avisa "próximamente".
const opcionesConfig = [
  { id: 'datos',          titulo: 'Actualizar datos',       desc: 'Nombre, identificación, teléfono y dirección', disponible: true },
  { id: 'notificaciones', titulo: 'Notificaciones',         desc: 'Elige qué avisos quieres recibir por correo',  disponible: false },
  { id: 'privacidad',     titulo: 'Privacidad y seguridad', desc: 'Contraseña y control de tus datos',            disponible: false },
  { id: 'soporte',        titulo: 'Soporte',                desc: 'Escríbenos si tienes un problema con tu cuenta', disponible: false },
  { id: 'terminos',       titulo: 'Términos y condiciones', desc: 'Lo que aceptas al usar la tienda',             disponible: false },
];

// Recorre el arreglo con map() y arma un <li> por cada opción; join('')
// junta todos esos textos en uno solo para meterlo en el <ul>
function pintarOpcionesConfig() {
  document.getElementById('lista-opciones').innerHTML = opcionesConfig.map((opcion) => `
    <li>
      <button type="button" class="opcion" data-opcion="${opcion.id}">
        <span class="opcion-titulo">${opcion.titulo}${opcion.disponible ? '' : '<span class="opcion-pronto">Pronto</span>'}</span>
        <span class="opcion-desc">${opcion.desc}</span>
      </button>
    </li>
  `).join('');
}

pintarOpcionesConfig();

// "Configuración" en el menú del perfil → cierra el menú y abre la ventana
document.getElementById('btn-config').addEventListener('click', () => {
  cerrarMenuPerfil();
  ventanaConfig.showModal(); // la abre encima de todo, con el fondo oscurecido
});

// Un solo listener para toda la ventana (igual que la tarjeta en prueba2.js):
// según dónde fue el clic, hacemos una cosa u otra
ventanaConfig.addEventListener('click', (event) => {
  // botón × → cerrar
  if (event.target.closest('.ventana-cerrar')) {
    ventanaConfig.close();
    return;
  }

  // clic en el fondo oscuro (fuera de la ventana) → cerrar.
  // Ese clic le llega al <dialog> mismo, no a algo de adentro.
  if (event.target === ventanaConfig) {
    ventanaConfig.close();
    return;
  }

  // ¿se hizo clic en una opción? data-opcion dice cuál
  const opcion = event.target.closest('.opcion');
  if (!opcion) return;

  ventanaConfig.close();

  if (opcion.dataset.opcion === 'datos') {
    // los datos ya se leyeron al iniciar sesión; solo mostramos el form
    mostrarVista('perfil');
    document.querySelector('#form-perfil [name="nombre"]').focus();
  } else {
    // find(): busca en el arreglo el objeto con ese id, para usar su título
    const elegida = opcionesConfig.find((o) => o.id === opcion.dataset.opcion);
    mostrarAviso(`${elegida.titulo}: disponible pronto`);
  }
});

//MENÚ DEL PERFIL
// Clic en la foto → se abre o se cierra el menú con el correo
const avatar = document.getElementById('avatar');
const menuPerfil = document.getElementById('menu-perfil');

function cerrarMenuPerfil() {
  menuPerfil.hidden = true;
  avatar.setAttribute('aria-expanded', 'false');
}

avatar.addEventListener('click', () => {
  const abierto = !menuPerfil.hidden;
  menuPerfil.hidden = abierto; // si estaba abierto lo cierra, y al revés
  avatar.setAttribute('aria-expanded', String(!abierto));
});

// sin sesión: "Iniciar sesión" cierra el menú y deja el formulario de
// login listo (por si estaba en la vista de registro)
document.getElementById('btn-menu-login').addEventListener('click', () => {
  cerrarMenuPerfil();
  mostrarVista('login');
  document.getElementById('login-correo').focus();
});

// clic en cualquier otra parte de la página → se cierra el menú
document.addEventListener('click', (event) => {
  // closest('#perfil'): ¿el clic fue dentro de la foto o del menú?
  if (!event.target.closest('#perfil')) {
    cerrarMenuPerfil();
  }
});

// tecla Escape → también se cierra
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    cerrarMenuPerfil();
  }
});

// Ya no escribe un mensaje: muestra (o esconde) la foto de perfil de la
// barra de arriba. Devuelve el usuario para saber si había sesión.
async function mostrarEstadoSesion() {
  const { data } = await db.auth.getUser();
  const perfil = document.getElementById('perfil');

  document.getElementById('estado-sesion').textContent = ''; // limpia mensajes viejos

  // classList.toggle(clase, condición): pone la clase si la condición es
  // true y la quita si es false. El CSS usa estas clases para el borde
  // verde o rojo y para elegir qué mostrar en el menú.
  perfil.classList.toggle('con-sesion', Boolean(data.user));
  perfil.classList.toggle('sin-sesion', !data.user);

  if (data.user) {
    // la "foto" es la primera letra del correo, dentro del círculo verde
    document.getElementById('avatar-letra').textContent = data.user.email[0].toUpperCase();
    // el correo completo va dentro del menú que se abre al hacer clic
    document.getElementById('perfil-correo').textContent = data.user.email;
  }

  avatar.setAttribute('aria-label', data.user ? 'Abrir menú de perfil' : 'No hay sesión iniciada');
  perfil.hidden = false; // ya sabemos el estado: ahora sí se muestra

  // con sesión → mensaje de bienvenida (y se leen sus datos para el
  // nombre y para tener listo el formulario "Mis datos");
  // sin sesión → de vuelta al formulario de iniciar sesión
  if (data.user) {
    // mientras llegan los datos, el correo hace de nombre provisional
    document.getElementById('bienvenida-nombre').textContent = data.user.email;
    mostrarVista('bienvenida');
    cargarDatosCliente(data.user.id);
  } else {
    mostrarVista('login');
  }

  return data.user;
}

//DATOS DEL CLIENTE (Read + Update)
// READ: trae la fila de cliente_práctica cuyo id es el del usuario con
// sesión. Es el mismo uuid que se guardó al registrarse (data.user.id).
async function leerCliente(id) {
  // maybeSingle() es como single() (devuelve UN objeto, no un arreglo),
  // pero si no encuentra ninguna fila devuelve null en vez de un error
  const { data, error } = await db
    .from('cliente_práctica')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.log('Error al leer los datos del cliente:', error);
    return null;
  }

  return data;
}

// Pone cada valor de la fila en el input que tiene el mismo "name".
// form.elements['nombre'] es el <input name="nombre"> de ese form.
function llenarFormularioPerfil(cliente) {
  const form = document.getElementById('form-perfil');
  const columnas = ['nombre', 'numero_identificacion', 'telefono', 'direccion', 'correo', 'rol'];

  columnas.forEach((columna) => {
    // ?? '': si la columna está vacía (null) el campo queda en blanco,
    // en vez de mostrar la palabra "null"
    form.elements[columna].value = cliente[columna] ?? '';
  });

  // el mismo nombre va en la bienvenida; así, si lo cambias en
  // "Mis datos", el saludo también se actualiza
  if (cliente.nombre) {
    document.getElementById('bienvenida-nombre').textContent = cliente.nombre;
  }
}

async function cargarDatosCliente(id) {
  const cliente = await leerCliente(id);

  if (cliente) {
    llenarFormularioPerfil(cliente);
  } else {
    // pasa si el registro creó el usuario en Auth pero falló el insert
    // en cliente_práctica (o si el RLS no deja leer la fila)
    document.getElementById('estado-sesion').textContent =
      'No se encontraron tus datos. Revisa la consola.';
  }
}

// UPDATE: mismo .update() que en prueba2.js; el .eq('id', id) asegura
// que solo se cambie la fila de este cliente, no toda la tabla
async function actualizarCliente(id, cambios) {
  const { data, error } = await db
    .from('cliente_práctica')
    .update(cambios)
    .eq('id', id)
    .select(); // que devuelva la fila ya actualizada

  if (error) {
    console.log('Error al actualizar los datos:', error);
    return null;
  }

  // Ojo: si el RLS no permite el UPDATE, Supabase NO devuelve error,
  // simplemente no cambia ninguna fila y data llega vacío
  if (data.length === 0) {
    console.log('No se actualizó ninguna fila: revisa la política de UPDATE (RLS) de cliente_práctica');
    return null;
  }

  return data[0];
}

document.getElementById('form-perfil').addEventListener('submit', async (event) => {
  event.preventDefault(); // evita que el navegador recargue la página
  const form = event.target;

  const { data } = await db.auth.getUser();
  if (!data.user) {
    mostrarEstadoSesion(); // la sesión se cerró: lo devuelve al login
    return;
  }

  // Solo mandamos las columnas que el cliente puede cambiar (correo y rol
  // quedan fuera). trim() || null: un campo vacío se guarda como null,
  // no como texto vacío
  const cambios = {
    nombre: form.elements.nombre.value.trim(),
    numero_identificacion: form.elements.numero_identificacion.value.trim() || null,
    telefono: form.elements.telefono.value.trim() || null,
    direccion: form.elements.direccion.value.trim() || null,
  };

  const clienteActualizado = await actualizarCliente(data.user.id, cambios);

  if (clienteActualizado) {
    llenarFormularioPerfil(clienteActualizado); // muestra lo que quedó guardado de verdad
    document.getElementById('estado-sesion').textContent = '';
    mostrarAviso('Datos guardados');
  } else {
    document.getElementById('estado-sesion').textContent =
      'No se pudieron guardar los cambios. Revisa la consola.';
  }
});

// Mensajito flotante que aparece unos segundos y se va solo
function mostrarAviso(texto) {
  const aviso = document.getElementById('aviso');
  aviso.textContent = texto;
  aviso.hidden = false;

  // si ya había un aviso esperando para irse, reiniciamos su reloj
  clearTimeout(aviso.temporizador);
  aviso.temporizador = setTimeout(() => {
    aviso.hidden = true;
  }, 3000); // 3000 ms = 3 segundos
}

// Al cargar la página, revisa si ya había una sesión activa:
// si la hay, avisa con el mensajito; si no, no muestra nada
mostrarEstadoSesion().then((usuario) => {
  if (usuario) {
    mostrarAviso('Ya hay una sesión iniciada');
  }
});

//CAMBIAR ENTRE VISTAS: LOGIN, REGISTRO, BIENVENIDA Y MIS DATOS
// Las vistas están siempre en el HTML; solo mostramos una a la vez
// con el atributo hidden (igual que #contenido en prueba2.html).
function mostrarVista(vista) {
  document.getElementById('vista-login').hidden = vista !== 'login';
  document.getElementById('vista-registro').hidden = vista !== 'registro';
  document.getElementById('vista-bienvenida').hidden = vista !== 'bienvenida';
  document.getElementById('vista-perfil').hidden = vista !== 'perfil';
  // la bienvenida necesita más ancho para la frase grande
  document.getElementById('panel-cuenta').classList.toggle('ancho', vista === 'bienvenida');
}

// "← Volver al inicio" en Mis datos → de vuelta a la bienvenida
document.getElementById('volver-inicio').addEventListener('click', (event) => {
  event.preventDefault();
  mostrarVista('bienvenida');
});

document.getElementById('ir-registro').addEventListener('click', (event) => {
  event.preventDefault(); // que el link no salte ni cambie la URL
  mostrarVista('registro');
  document.getElementById('registro-nombre').focus(); // cursor listo en el primer campo
});

document.getElementById('ir-login').addEventListener('click', (event) => {
  event.preventDefault();
  mostrarVista('login');
  document.getElementById('login-correo').focus();
});

//VER / OCULTAR CONTRASEÑA
// El truco: un <input type="password"> muestra puntitos, y uno
// type="text" muestra lo escrito. Solo cambiamos ese atributo.
function ponerClaveVisible(boton, visible) {
  // el input está justo antes del botón, dentro del mismo .campo-clave
  const input = boton.previousElementSibling;
  input.type = visible ? 'text' : 'password';
  // aria-pressed lo usa el CSS para dibujar la raya sobre el ojo
  boton.setAttribute('aria-pressed', String(visible));
  boton.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
}

document.querySelectorAll('.ver-clave').forEach((boton) => {
  boton.addEventListener('click', () => {
    const visible = boton.getAttribute('aria-pressed') !== 'true';
    ponerClaveVisible(boton, visible);

    // reinicia la animación del parpadeo: se quita la clase, se fuerza al
    // navegador a "notarlo" (offsetWidth) y se vuelve a poner
    boton.classList.remove('parpadeo');
    void boton.offsetWidth;
    boton.classList.add('parpadeo');

    boton.previousElementSibling.focus(); // el cursor vuelve al campo
  });
});

// cuando un formulario se vacía con form.reset(), la clave vuelve a ocultarse
document.querySelectorAll('#form-login, #form-registro').forEach((form) => {
  form.addEventListener('reset', () => {
    form.querySelectorAll('.ver-clave').forEach((boton) => ponerClaveVisible(boton, false));
  });
});

//TEMA CLARO / OSCURO
// Mismo código que en prueba2.js. El tema guardado ya se aplicó en el
// <head> de cliente.html; aquí solo manejamos el botón.
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