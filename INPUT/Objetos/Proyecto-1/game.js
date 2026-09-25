// Lógica de game.html: acceso del jugador en dos pasos.
//   1. Login con email + contraseña. Si el email está registrado y la
//      contraseña coincide, entra.
//   2. Si el email NO está registrado, un confirm() pregunta si quiere
//      registrarse; si acepta, se piden nombre + alias y se guarda la cuenta.
//
// Todos los campos se validan con expresiones regulares. Una regex es un
// PATRÓN de texto: /[A-Z]/ significa "una letra de la A a la Z".
// regex.test(texto) devuelve true si el texto calza con el patrón.

// ---------------------------------------------------------------------
// Reglas: cada una es una regex + el mensaje que se muestra en la lista.
// ---------------------------------------------------------------------

// Nombre y alias usan las mismas reglas.
//   \S       cualquier carácter que NO sea espacio (o sea: no está vacío)
//   ^        "al inicio del texto"
//   \p{Lu}   cualquier letra MAYÚSCULA, incluidas Ñ y las con tilde (Á, É...).
//            Solo funciona con la bandera u (unicode) al final: /.../u
// El resto del texto puede ser cualquier cosa.
const reglasNombre = [
    { regex: /\S/, mensaje: "No puede estar vacío" },
    { regex: /^\p{Lu}/u, mensaje: "Empieza con mayúscula" },
];

// Contraseña: 4 reglas separadas, así se puede decir CUÁL falta.
//   .{8,}          . = cualquier carácter; {8,} = 8 o más veces
//   (\D*\d){4}     \d = un dígito, \D = cualquier cosa que NO sea dígito.
//                  (\D*\d) = "lo que sea (o nada) y después un dígito";
//                  {4} lo repite 4 veces -> 4 dígitos en CUALQUIER parte,
//                  no hace falta que vayan seguidos ("a1b2c3d4" cumple).
//   [^\p{L}\p{N}\s] el ^ DENTRO de [] significa "que NO sea": ni letra
//                  (\p{L}), ni número (\p{N}), ni espacio (\s). O sea, un
//                  símbolo como ! @ # $ % & *.
//
// Todo junto también se puede escribir en UNA sola regex con lookaheads
// ((?=...) = "más adelante hay..."):
//   /^(?=.*\p{Lu})(?=(?:\D*\d){4})(?=.*[^\p{L}\p{N}\s]).{8,}$/u
// Pero esa solo responde true/false: no dice qué condición falló. Por eso
// acá van separadas.
const reglasContrasena = [
    { regex: /.{8,}/, mensaje: "Al menos 8 caracteres" },
    { regex: /\p{Lu}/u, mensaje: "Al menos 1 letra mayúscula" },
    { regex: /(\D*\d){4}/, mensaje: "Al menos 4 números" },
    { regex: /[^\p{L}\p{N}\s]/u, mensaje: "Al menos 1 carácter especial (! @ # $ % ...)" },
];

// Email: también separado en reglas para decir qué parte falta.
//   [^\s@]+    uno o más caracteres que NO sean espacio ni @
//   ^...@      desde el inicio: texto y después la @ ("juan@")
//   ^[^@]*@[^@]*$   de inicio (^) a fin ($) hay exactamente UNA @: antes
//                   y después solo caracteres que no son @
//   \.         un punto literal (sin la \, el . significa "cualquier cosa")
//   [a-z]{2,}$ termina ($) con 2+ letras: la extensión (com, co, net...).
//              La bandera i (ignore case) acepta también mayúsculas.
// Todo junto en una sola regex sería:
//   /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i
// Es una validación "razonable", no perfecta: la única forma de saber si
// un email existe de verdad es mandarle un correo.
const reglasEmail = [
    { regex: /^[^\s@]+@/, mensaje: "Tiene texto antes de la @" },
    { regex: /^[^@]*@[^@]*$/, mensaje: "Tiene una sola @" },
    { regex: /@[^\s@]+\.[a-z]{2,}$/i, mensaje: "Tiene un dominio después de la @ (ej. gmail.com)" },
];

// Qué reglas usa cada campo (la clave es el name del input) y cómo se
// llama en los mensajes. recortar: si se le quitan los espacios de los
// extremos (trim) antes de validar. La contraseña NO se recorta, porque un
// espacio también es parte de ella.
// Para agregar un campo nuevo: su HTML en game.html + una entrada acá.
const camposConfig = {
    nombre: { label: "Nombre", reglas: reglasNombre, recortar: true },
    alias: { label: "Alias", reglas: reglasNombre, recortar: true },
    email: { label: "Email", reglas: reglasEmail, recortar: true },
    contrasena: { label: "Contraseña", reglas: reglasContrasena, recortar: false },
};

// ---------------------------------------------------------------------
// Contraseñas
// ---------------------------------------------------------------------
//
// leerUsuarios() y guardarUsuarios() viven en usuarios.js (se carga antes
// que este archivo, ver game.html), porque gestion.html también los usa.

// La contraseña NUNCA se guarda tal cual: se guarda su "hash", una huella
// que se calcula con SHA-256. La misma contraseña da siempre el mismo hash,
// pero desde el hash no se puede volver a la contraseña. Para hacer login
// se calcula el hash de lo que escribió el usuario y se compara con el
// guardado. Así, quien lea el localStorage no ve las contraseñas.
//
// crypto.subtle.digest es ASÍNCRONA (devuelve una Promise), por eso la
// función es async y quien la llama usa await. TextEncoder pasa el texto a
// bytes, y el map + padStart convierte los bytes del resultado a texto
// hexadecimal ("9f86d0...").
// (Los sistemas reales usan además una "sal" por usuario y un algoritmo
// lento a propósito, como bcrypt o scrypt, para frenar a quien intente
// adivinar contraseñas por fuerza bruta.)
async function hashContrasena(contrasena) {
    const bytes = new TextEncoder().encode(contrasena);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hashBuffer)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

// ---------------------------------------------------------------------
// Formulario y modos (login / registro)
// ---------------------------------------------------------------------

const formulario = document.getElementById("form-acceso");
const mensajeError = document.getElementById("form-acceso-error");
const camposRegistro = document.getElementById("campos-registro");
const botonEnviar = document.getElementById("acceso-submit");
const botonCancelar = document.getElementById("acceso-cancelar");
const titulo = document.getElementById("acceso-titulo");
const subtitulo = document.getElementById("acceso-subtitulo");

// "login" o "registro". Decide qué campos se validan y qué hace el submit.
let modo = "login";

// Se vuelve true al primer intento de enviar. Antes de eso los campos no se
// pintan en rojo: sería raro marcar como "malo" algo que aún no escribes.
let intentoEnviar = false;

// Qué campos importan en cada modo. En login, nombre y alias ni se ven.
function camposActivos() {
    return modo === "login"
        ? ["email", "contrasena"]
        : ["email", "contrasena", "nombre", "alias"];
}

// Devuelve el valor del campo listo para validar (recortado si corresponde).
function valorDe(nombreCampo) {
    const valor = formulario.elements[nombreCampo].value;
    return camposConfig[nombreCampo].recortar ? valor.trim() : valor;
}

function mostrarError(texto) {
    mensajeError.textContent = texto;
    mensajeError.hidden = false;
}

// Crea un <li> por cada regla dentro de la <ul class="requisitos"> del
// campo. Solo se llama una vez, al cargar la página.
function renderRequisitos(nombreCampo) {
    const lista = document.getElementById(`requisitos-${nombreCampo}`);
    camposConfig[nombreCampo].reglas.forEach((regla) => {
        const item = document.createElement("li");
        item.className = "requisitos__item";
        item.textContent = regla.mensaje;
        lista.appendChild(item);
    });
}

// Revisa las reglas de UN campo: marca cada <li> como cumplido o no, y
// devuelve true si las cumple todas. Los <li> están en el mismo orden que
// las reglas, así que el índice i conecta cada regla con su <li>.
function validarCampo(nombreCampo) {
    const valor = valorDe(nombreCampo);
    const items = document.querySelectorAll(`#requisitos-${nombreCampo} .requisitos__item`);
    let esValido = true;

    camposConfig[nombreCampo].reglas.forEach((regla, i) => {
        const cumple = regla.regex.test(valor);
        items[i].classList.toggle("cumple", cumple);
        if (!cumple) {
            esValido = false;
        }
    });

    // aria-invalid: el CSS lo usa para el borde rojo y un lector de
    // pantalla anuncia "inválido". Solo después del primer intento de enviar.
    if (intentoEnviar) {
        formulario.elements[nombreCampo].setAttribute("aria-invalid", !esValido);
    }
    return esValido;
}

// Paso 2: muestra nombre + alias y cambia textos y botones. intentoEnviar
// vuelve a false para que los campos nuevos no aparezcan en rojo de una.
function activarModoRegistro() {
    modo = "registro";
    intentoEnviar = false;
    camposRegistro.hidden = false;
    botonCancelar.hidden = false;
    botonEnviar.textContent = "Registrarme";
    titulo.textContent = "Crea tu cuenta";
    subtitulo.textContent = "Completa tu nombre y alias para registrarte";
    formulario.elements.contrasena.autocomplete = "new-password";
    mensajeError.hidden = true;
    formulario.elements.nombre.focus();
}

// Vuelve al paso 1 (botón "← Ya tengo cuenta").
function activarModoLogin() {
    modo = "login";
    camposRegistro.hidden = true;
    botonCancelar.hidden = true;
    botonEnviar.textContent = "Entrar";
    titulo.textContent = "Entra al juego";
    subtitulo.textContent = "Ingresa con tu email y contraseña";
    formulario.elements.contrasena.autocomplete = "current-password";
    mensajeError.hidden = true;
    formulario.elements.email.focus();
}

// Pinta las listas al cargar y hace una primera revisión (todo en ❌).
Object.keys(camposConfig).forEach((nombreCampo) => {
    renderRequisitos(nombreCampo);
    validarCampo(nombreCampo);
});

// Validación EN VIVO: "input" se dispara con cada tecla. Un solo listener
// en el <form> alcanza, porque el evento de cada input "burbujea" hasta él
// (igual que el menú de filtros de index.js). event.target es el input
// donde se escribió, y su name dice qué campo validar.
formulario.addEventListener("input", (event) => {
    validarCampo(event.target.name);
});

botonCancelar.addEventListener("click", activarModoLogin);

// async: adentro se usa await para esperar el hash de la contraseña.
formulario.addEventListener("submit", async (event) => {
    // Siempre: el formulario no se envía a ningún servidor, lo maneja JS.
    event.preventDefault();
    intentoEnviar = true;

    // 1) Validar con las regex solo los campos del modo actual. filter se
    //    queda con los que NO pasan; se validan todos (no se corta en el
    //    primero) para que se marquen todos los que están mal.
    const camposInvalidos = camposActivos().filter(
        (nombreCampo) => !validarCampo(nombreCampo)
    );

    if (camposInvalidos.length > 0) {
        const nombres = camposInvalidos.map((nombreCampo) => camposConfig[nombreCampo].label);
        mostrarError(`Revisa lo que falta en: ${nombres.join(", ")}.`);
        formulario.elements[camposInvalidos[0]].focus();
        return; // no deja continuar
    }
    mensajeError.hidden = true;

    // 2) Buscar el email entre los usuarios guardados. Se guarda y se
    //    compara en minúsculas: "Juan@Gmail.com" y "juan@gmail.com" son el
    //    mismo correo.
    const email = valorDe("email").toLowerCase();
    const contrasenaHash = await hashContrasena(valorDe("contrasena"));
    const usuarios = leerUsuarios();
    const usuario = usuarios.find((u) => u.email === email);

    if (modo === "login") {
        if (!usuario) {
            // confirm() muestra un diálogo con "Aceptar" y "Cancelar" y
            // DETIENE el código hasta que el usuario elige: devuelve true
            // (Aceptar) o false (Cancelar).
            const quiereRegistrarse = confirm(
                `No hay ninguna cuenta con el email ${email}.\n¿Deseas registrarte?`
            );
            if (quiereRegistrarse) {
                activarModoRegistro();
            }
            return;
        }

        if (usuario.contrasenaHash !== contrasenaHash) {
            mostrarError("Contraseña incorrecta.");
            formulario.elements.contrasena.value = "";
            validarCampo("contrasena");
            formulario.elements.contrasena.focus();
            return;
        }

        mostrarBienvenida(usuario, false);
        return;
    }

    // Modo registro. Si mientras tanto cambió el email a uno que ya existe,
    // no se crea una cuenta repetida.
    if (usuario) {
        mostrarError('Ya existe una cuenta con ese email. Usa "← Ya tengo cuenta" para entrar.');
        return;
    }

    // id: el siguiente libre (siguienteIdUsuario en usuarios.js). El
    // formulario no lo trae: lo pone el código, igual que en Crear perrito.
    // partidas empieza vacío y se va llenando cada vez que termina un juego.
    const nuevoUsuario = {
        id: siguienteIdUsuario(usuarios),
        nombre: valorDe("nombre"),
        alias: valorDe("alias"),
        email: email,
        contrasenaHash: contrasenaHash,
        fechaRegistro: new Date().toISOString(),
        partidas: [],
    };
    usuarios.push(nuevoUsuario);
    guardarUsuarios(usuarios);

    mostrarBienvenida(nuevoUsuario, true);
});

// Quita el formulario de acceso y arranca el juego de memoria. .remove()
// borra el elemento de la página; ya no hace falta, el login terminó.
// iniciarJuego() vive en juego.js (se carga antes que este archivo, ver
// game.html): este archivo solo se encarga del acceso, y juego.js del
// juego.
function mostrarBienvenida(usuario, esNuevo) {
    document.getElementById("acceso").remove();
    iniciarJuego(usuario, esNuevo);
}
