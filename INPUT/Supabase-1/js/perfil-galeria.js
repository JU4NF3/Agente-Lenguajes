// ============================================================
//  PERFIL EN LA BARRA DE LA GALERÍA
//  El mismo componente que en cliente.html: un botón (avatar) con borde
//  verde (con sesión) o rojo (sin sesión), un menú desplegable y la
//  ventana de Configuración. Así el cliente maneja su cuenta sin salir
//  de la tienda ni pasar por la pantalla de "Bienvenido".
//
//  Usa 'db' (de supabaseClient.js) y 'mostrarAviso' (de galeria.js), que
//  ya están cargados antes que este archivo.
// ============================================================

const perfil = document.getElementById('perfil');
const avatar = document.getElementById('avatar');
const menuPerfil = document.getElementById('menu-perfil');
const ventanaConfig = document.getElementById('ventana-config');

// Avisos: reutiliza el de galeria.js si existe; si no, uno mínimo propio.
function avisar(texto) {
  if (typeof mostrarAviso === 'function') mostrarAviso(texto);
}

// ---- 1) ESTADO DE LA SESIÓN: pinta el avatar verde/rojo ----
async function revisarSesion() {
  const { data } = await db.auth.getUser();

  perfil.classList.toggle('con-sesion', Boolean(data.user));
  perfil.classList.toggle('sin-sesion', !data.user);

  if (data.user) {
    document.getElementById('avatar-letra').textContent = data.user.email[0].toUpperCase();
    document.getElementById('perfil-correo').textContent = data.user.email;
  }

  avatar.setAttribute('aria-label', data.user ? 'Abrir menú de perfil' : 'No hay sesión iniciada');
  perfil.hidden = false; // ya sabemos el estado: ahora sí se muestra
  return data.user;
}

// ---- 2) ABRIR / CERRAR EL MENÚ ----
function cerrarMenuPerfil() {
  menuPerfil.hidden = true;
  avatar.setAttribute('aria-expanded', 'false');
}

avatar.addEventListener('click', (event) => {
  event.stopPropagation();
  const abierto = !menuPerfil.hidden;
  menuPerfil.hidden = abierto;
  avatar.setAttribute('aria-expanded', String(!abierto));
});

// clic fuera del perfil → cerrar el menú
document.addEventListener('click', (event) => {
  if (!event.target.closest('#perfil')) cerrarMenuPerfil();
});

// ---- 3) SIN SESIÓN: "Iniciar sesión" → a la página de la cuenta ----
document.getElementById('btn-menu-login').addEventListener('click', () => {
  window.location.href = 'cliente.html';
});

// ---- 4) CERRAR SESIÓN (se queda en la tienda, ahora como invitado) ----
document.getElementById('btn-logout').addEventListener('click', async () => {
  await db.auth.signOut();
  cerrarMenuPerfil();
  await revisarSesion();
  avisar('Sesión cerrada');
});

// ---- 5) VENTANA DE CONFIGURACIÓN ----
// Mismas opciones que en cliente.js. "Actualizar datos" lleva a cliente.html,
// que con sesión abre directo en el formulario "Mis datos".
const opcionesConfig = [
  { id: 'datos',          titulo: 'Actualizar datos',       desc: 'Nombre, identificación, teléfono y dirección', disponible: true },
  { id: 'notificaciones', titulo: 'Notificaciones',         desc: 'Elige qué avisos quieres recibir por correo',  disponible: false },
  { id: 'privacidad',     titulo: 'Privacidad y seguridad', desc: 'Contraseña y control de tus datos',            disponible: false },
  { id: 'soporte',        titulo: 'Soporte',                desc: 'Escríbenos si tienes un problema con tu cuenta', disponible: false },
  { id: 'terminos',       titulo: 'Términos y condiciones', desc: 'Lo que aceptas al usar la tienda',             disponible: false },
];

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

document.getElementById('btn-config').addEventListener('click', () => {
  cerrarMenuPerfil();
  ventanaConfig.showModal();
});

ventanaConfig.addEventListener('click', (event) => {
  // × o clic en el fondo oscuro → cerrar
  if (event.target.closest('.ventana-cerrar') || event.target === ventanaConfig) {
    ventanaConfig.close();
    return;
  }

  const opcion = event.target.closest('.opcion');
  if (!opcion) return;

  ventanaConfig.close();

  if (opcion.dataset.opcion === 'datos') {
    // "Mis datos" vive en cliente.html (una sola fuente de verdad)
    window.location.href = 'cliente.html';
  } else {
    const elegida = opcionesConfig.find((o) => o.id === opcion.dataset.opcion);
    avisar(`${elegida.titulo}: disponible pronto`);
  }
});

// ---- 6) ARRANQUE ----
revisarSesion();
