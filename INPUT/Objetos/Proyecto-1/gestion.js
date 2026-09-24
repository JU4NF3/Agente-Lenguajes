// Lógica de gestion.html: formulario de login + CRUD. Se carga después de
// data.js, credenciales.js y login.js (ver el orden de los <script defer> en
// gestion.html), así que crearPerritos(), capitalize() y verificarLogin() ya
// existen acá.
//
// TODO el archivo va dentro de una IIFE (Immediately Invoked Function
// Expression): una función sin nombre que se ejecuta apenas se define, con
// el () del final. Todo lo que se declara adentro (perritos, siguienteId,
// iniciarGestion, las funciones del CRUD) queda PRIVADO: existe solo dentro
// de esta función, y la consola del navegador, que trabaja en el scope
// global, no lo puede ver ni llamar (da ReferenceError).
//
// ¿Cómo siguen funcionando los botones si la función ya terminó? Los
// listeners (addEventListener) se crean ACÁ adentro y guardan acceso a las
// variables que tenían alrededor. Eso es un closure. El navegador los llama
// al hacer click; la consola no tiene forma de llegar a ellos.
//
// La única puerta hacia iniciarGestion() es el listener del formulario de
// login (al final), y solo la abre si verificarLogin() (login.js) da true.
//
// OJO: sigue siendo práctica de front-end, no seguridad real. credenciales.js
// se descarga al navegador (se lee en la consola o en Sources), y alguien
// que sepa usar DevTools puede poner un breakpoint acá adentro. En un sistema
// real la contraseña la valida un servidor y nunca llega al navegador.

(() => {
    // Copia PRIVADA de los datos: crearPerritos() arma un array nuevo, y como
    // esta variable vive dentro de la IIFE, nadie fuera de ella puede hacerle
    // push, pop ni splice.
    const perritos = crearPerritos();

    // El id que recibirá el PRÓXIMO perrito que se cree (Crear lo usa y luego le
    // suma 1). Se calcula a partir de los datos en vez de escribir 13 a mano:
    // map saca solo los ids ([1, 2, ..., 12]), el spread (...) los pasa sueltos
    // a Math.max, y +1 da el siguiente libre. Solo sube, nunca baja: el id de un
    // perrito eliminado no se reutiliza. También es privado: desde la consola no
    // se puede cambiar para provocar ids repetidos.
    let siguienteId = Math.max(...perritos.map((perrito) => perrito.id)) + 1;

    // Todavía no existen al cargar la página (el HTML del panel lo crea
    // iniciarGestion), por eso son `let` sin valor y se asignan allá.
    let sidebarItems;
    let gestionContent;

    // Regla única para comparar nombres: sin espacios sobrantes y sin importar
    // mayúsculas ("max", "Max" y " MAX " son el mismo perrito). La usan Crear
    // (para rechazar duplicados), Leer (para buscar) y Actualizar (ambas).
    function normalizarNombre(nombre) {
        return nombre.trim().toLowerCase();
    }

    // Cuando un valor viaja hacia el atributo value="..." o dentro de un
    // <textarea>, una comilla o un "<" en el texto rompería el HTML. Esto los
    // convierte en su versión segura. Hace falta en Actualizar porque ahí SÍ se
    // vuelven a escribir en el formulario datos que ya estaban guardados.
    function escaparHTML(texto) {
        return texto
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // Los campos del perrito (nombre, raza, ..., poderes) son los mismos en
    // Crear y en Actualizar, así que viven acá una sola vez. Con un objeto
    // perrito los pre-llena (Actualizar); sin argumento quedan vacíos (Crear).
    // El tipo de input depende del tipo de dato (number para edad/altura/aura,
    // checkbox para activo, texto para el resto). "poderes" es un array en los
    // datos, así que acá se muestra como texto separado por comas (join) y al
    // guardar se vuelve a convertir en array (ver perritoDesdeFormulario).
    function camposPerritoHTML(perrito = {}) {
        const v = (valor) => escaparHTML(String(valor ?? ""));
        const poderes = (perrito.poderes ?? []).join(", ");
        const activo = perrito.activo ?? true; // por defecto un perrito nuevo está activo

        return `
            <label class="form__field">
                <span>Nombre</span>
                <input type="text" name="nombre" value="${v(perrito.nombre)}" required>
            </label>
            <label class="form__field">
                <span>Raza</span>
                <input type="text" name="raza" value="${v(perrito.raza)}" required>
            </label>
            <label class="form__field">
                <span>Universo</span>
                <input type="text" name="universo" value="${v(perrito.universo)}" required>
            </label>
            <label class="form__field">
                <span>Imagen (URL)</span>
                <input type="url" name="imagen" value="${v(perrito.imagen)}" required>
            </label>
            <label class="form__field form__field--full">
                <span>Descripción</span>
                <textarea name="description" rows="3" required>${v(perrito.description)}</textarea>
            </label>
            <label class="form__field">
                <span>Edad</span>
                <input type="number" name="edad" min="0" value="${v(perrito.edad)}" required>
            </label>
            <label class="form__field">
                <span>Altura (m)</span>
                <input type="number" name="altura" min="0" step="0.01" value="${v(perrito.altura)}" required>
            </label>
            <label class="form__field">
                <span>Aura</span>
                <input type="number" name="aura" min="0" value="${v(perrito.aura)}" required>
            </label>
            <label class="form__field form__field--checkbox">
                <input type="checkbox" name="activo" ${activo ? "checked" : ""}>
                <span>Activo</span>
            </label>
            <label class="form__field form__field--full">
                <span>Poderes (separados por coma)</span>
                <input type="text" name="poderes" value="${v(poderes)}" placeholder="ej: volar, teletransportar juguetes" required>
            </label>
        `;
    }

    // Inverso de camposPerritoHTML: toma un FormData y arma el objeto perrito
    // con los tipos correctos (números como number, activo como boolean,
    // poderes como array). Lo usan Crear y Actualizar.
    function perritoDesdeFormulario(datos) {
        return {
            nombre: datos.get("nombre").trim(),
            raza: datos.get("raza").trim(),
            universo: datos.get("universo").trim(),
            imagen: datos.get("imagen").trim(),
            description: datos.get("description").trim(),
            edad: Number(datos.get("edad")),
            altura: Number(datos.get("altura")),
            aura: Number(datos.get("aura")),
            activo: datos.get("activo") === "on", // el checkbox solo manda "on" cuando está marcado
            // "perro, gato" -> ["perro", "gato"]: separa por coma, quita espacios
            // sobrantes y descarta entradas vacías (ej. si quedó una coma de más).
            // capitalize (definida en data.js) deja cada poder con mayúscula inicial.
            poderes: datos
                .get("poderes")
                .split(",")
                .map((poder) => capitalize(poder.trim()))
                .filter((poder) => poder !== ""),
        };
    }

    // Arma y engancha el formulario de "Crear" dentro de #gestion-content.
    function renderFormularioCrear() {
        gestionContent.innerHTML = `
            <h2 class="gestion-main__title">Crear perrito</h2>
            <form class="form" id="form-crear">
                ${camposPerritoHTML()}
                <fieldset class="form__field form__field--full form__field--radios">
                    <legend>¿Dónde se agrega al arreglo?</legend>
                    <label class="form__radio">
                        <input type="radio" name="posicion" value="inicio">
                        <span>Al inicio</span>
                    </label>
                    <label class="form__radio">
                        <input type="radio" name="posicion" value="final" checked>
                        <span>Al final</span>
                    </label>
                </fieldset>
                <p class="form__error" id="form-crear-error" role="alert" hidden></p>
                <button class="form__submit" type="submit">Agregar</button>
            </form>
        `;

        const formulario = document.getElementById("form-crear");
        const mensajeError = document.getElementById("form-crear-error");

        formulario.addEventListener("submit", (event) => {
            event.preventDefault(); // evita que el form recargue la página
            const datos = new FormData(formulario);

            // some devuelve true si AL MENOS UN perrito cumple la condición.
            // Si el nombre ya existe, se corta acá: no se agrega nada al array.
            const nombreNuevo = normalizarNombre(datos.get("nombre"));
            const yaExiste = perritos.some(
                (perrito) => normalizarNombre(perrito.nombre) === nombreNuevo
            );

            if (yaExiste) {
                // textContent (no innerHTML): el nombre lo escribió el usuario y
                // así nunca se interpreta como HTML.
                mensajeError.textContent = `Ya existe un perrito llamado "${datos.get("nombre").trim()}". Elige otro nombre.`;
                mensajeError.hidden = false;
                return;
            }
            mensajeError.hidden = true;

            // El formulario no trae id: se lo pone el código. Primero el id y
            // después el resto de campos (el spread ... copia todas las
            // propiedades del objeto que arma perritoDesdeFormulario).
            const nuevoPerrito = {
                id: siguienteId,
                ...perritoDesdeFormulario(datos),
            };
            // Se suma DESPUÉS de usarlo, así el próximo perrito recibe otro id.
            siguienteId++;

            // unshift lo pone al inicio (posición 0), push lo pone al final —
            // mismo par de métodos que ya usan los botones de Arrays.
            if (datos.get("posicion") === "inicio") {
                perritos.unshift(nuevoPerrito);
            } else {
                perritos.push(nuevoPerrito);
            }

            // Redirige a "Mostrar todos" para que el perrito recién creado se
            // vea de una vez dentro de la tabla, ya agregado.
            activarSidebarItem("mostrar-todos");
        });
    }

    // Ficha con todos los datos de un perrito. La usan Leer (para mostrar el
    // resultado) y Eliminar (para que se vea qué perrito se va a borrar).
    function fichaPerritoHTML(perrito) {
        return `
            <article class="ficha">
                <img class="ficha__imagen" src="${perrito.imagen}" alt="${perrito.nombre}">
                <div class="ficha__cuerpo">
                    <div class="ficha__header">
                        <h3 class="ficha__nombre">${perrito.nombre}</h3>
                        <span class="card__badge">${perrito.activo ? "Activo" : "Inactivo"}</span>
                    </div>
                    <p class="ficha__meta">${perrito.raza} · ${perrito.universo}</p>
                    <p class="ficha__description">${perrito.description}</p>
                    <div class="ficha__stats">
                        <div class="card__stat">
                            <span class="card__stat-label">Edad</span>
                            <span class="card__stat-value">${perrito.edad}</span>
                        </div>
                        <div class="card__stat">
                            <span class="card__stat-label">Altura</span>
                            <span class="card__stat-value">${perrito.altura}m</span>
                        </div>
                        <div class="card__stat">
                            <span class="card__stat-label">Aura</span>
                            <span class="card__stat-value">${perrito.aura}</span>
                        </div>
                    </div>
                    <h4 class="card__poderes-title">Poderes</h4>
                    <div class="card__poderes">
                        ${perrito.poderes.map((poder) => `<span class="card__poder">${poder}</span>`).join("")}
                    </div>
                </div>
            </article>
        `;
    }

    // Arma el formulario de "Leer": un input de nombre y, debajo, el espacio
    // donde aparece la ficha del perrito encontrado (o el aviso de que no
    // existe). No modifica perritos: solo lo consulta.
    function renderFormularioLeer() {
        gestionContent.innerHTML = `
            <h2 class="gestion-main__title">Leer perrito</h2>
            <form class="form form--buscar" id="form-leer">
                <label class="form__field">
                    <span>Nombre del perrito</span>
                    <input type="text" name="nombre" required>
                </label>
                <button class="form__submit" type="submit">Buscar</button>
            </form>
            <div id="resultado-leer" aria-live="polite"></div>
        `;

        const formulario = document.getElementById("form-leer");
        const resultado = document.getElementById("resultado-leer");

        formulario.addEventListener("submit", (event) => {
            event.preventDefault();
            const nombreBuscado = new FormData(formulario).get("nombre");

            // find devuelve el perrito o undefined. Como Crear no deja repetir
            // nombres, el primero que coincide es el único.
            const perrito = perritos.find(
                (p) => normalizarNombre(p.nombre) === normalizarNombre(nombreBuscado)
            );

            if (!perrito) {
                resultado.innerHTML = `<p class="resultado__vacio"></p>`;
                resultado.firstElementChild.textContent = `No hay ningún perrito llamado "${nombreBuscado.trim()}".`;
                return;
            }

            resultado.innerHTML = fichaPerritoHTML(perrito);
        });
    }

    // Arma el flujo de "Actualizar" en dos pasos: primero un buscador por nombre
    // (igual que Leer) y, si el perrito existe, el formulario pre-llenado para
    // editarlo. Es el único proceso hasta ahora que CAMBIA un elemento que ya
    // estaba en el array.
    function renderFormularioActualizar() {
        gestionContent.innerHTML = `
            <h2 class="gestion-main__title">Actualizar perrito</h2>
            <form class="form form--buscar" id="form-buscar-actualizar">
                <label class="form__field">
                    <span>Nombre del perrito a editar</span>
                    <input type="text" name="nombre" required>
                </label>
                <button class="form__submit" type="submit">Buscar</button>
            </form>
            <div id="editor-actualizar"></div>
        `;

        const formularioBusqueda = document.getElementById("form-buscar-actualizar");
        const editor = document.getElementById("editor-actualizar");

        formularioBusqueda.addEventListener("submit", (event) => {
            event.preventDefault();
            const nombreBuscado = new FormData(formularioBusqueda).get("nombre");

            // findIndex devuelve la POSICIÓN del perrito (o -1 si no existe), no
            // el objeto. La posición es lo que permite reemplazarlo después con
            // perritos[indice] = ..., incluso si el usuario le cambia el nombre.
            const indice = perritos.findIndex(
                (p) => normalizarNombre(p.nombre) === normalizarNombre(nombreBuscado)
            );

            if (indice === -1) {
                editor.innerHTML = `<p class="resultado__vacio"></p>`;
                editor.firstElementChild.textContent = `No hay ningún perrito llamado "${nombreBuscado.trim()}".`;
                return;
            }

            editor.innerHTML = `
                <form class="form" id="form-actualizar">
                    ${camposPerritoHTML(perritos[indice])}
                    <p class="form__error" id="form-actualizar-error" role="alert" hidden></p>
                    <button class="form__submit" type="submit">Guardar cambios</button>
                </form>
            `;

            const formulario = document.getElementById("form-actualizar");
            const mensajeError = document.getElementById("form-actualizar-error");

            formulario.addEventListener("submit", (event) => {
                event.preventDefault();
                const datos = new FormData(formulario);

                // Igual que en Crear, pero saltándose al propio perrito (i !== indice).
                // Sin esa excepción, guardar a Max sin cambiarle el nombre daría
                // "ya existe", porque se estaría comparando consigo mismo.
                const nombreNuevo = normalizarNombre(datos.get("nombre"));
                const yaExiste = perritos.some(
                    (p, i) => i !== indice && normalizarNombre(p.nombre) === nombreNuevo
                );

                if (yaExiste) {
                    mensajeError.textContent = `Ya existe otro perrito llamado "${datos.get("nombre").trim()}". Elige otro nombre.`;
                    mensajeError.hidden = false;
                    return;
                }
                mensajeError.hidden = true;

                // Reemplaza el objeto en la MISMA posición: el perrito editado
                // no se mueve de lugar en el array. El formulario no trae id, así
                // que se copia el del perrito original: sin esta línea, el
                // perrito editado quedaría sin id.
                perritos[indice] = {
                    id: perritos[indice].id,
                    ...perritoDesdeFormulario(datos),
                };

                activarSidebarItem("mostrar-todos");
            });
        });
    }

    // Arma el flujo de "Eliminar": buscador por nombre, ficha del perrito
    // encontrado y confirmación en dos pasos (botón "Eliminar" -> "¿Seguro?").
    // Borrar no se puede deshacer, por eso el segundo paso.
    function renderFormularioEliminar() {
        gestionContent.innerHTML = `
            <h2 class="gestion-main__title">Eliminar perrito</h2>
            <form class="form form--buscar" id="form-buscar-eliminar">
                <label class="form__field">
                    <span>Nombre del perrito a eliminar</span>
                    <input type="text" name="nombre" required>
                </label>
                <button class="form__submit" type="submit">Buscar</button>
            </form>
            <div id="resultado-eliminar" aria-live="polite"></div>
        `;

        const formularioBusqueda = document.getElementById("form-buscar-eliminar");
        const resultado = document.getElementById("resultado-eliminar");

        formularioBusqueda.addEventListener("submit", (event) => {
            event.preventDefault();
            const nombreBuscado = new FormData(formularioBusqueda).get("nombre");

            // Igual que en Actualizar: findIndex da la posición, que es lo que
            // splice necesita para saber cuál quitar.
            const indice = perritos.findIndex(
                (p) => normalizarNombre(p.nombre) === normalizarNombre(nombreBuscado)
            );

            if (indice === -1) {
                resultado.innerHTML = `<p class="resultado__vacio"></p>`;
                resultado.firstElementChild.textContent = `No hay ningún perrito llamado "${nombreBuscado.trim()}".`;
                return;
            }

            const perrito = perritos[indice];
            resultado.innerHTML = `
                ${fichaPerritoHTML(perrito)}
                <div class="acciones" id="acciones-eliminar"></div>
            `;
            const acciones = document.getElementById("acciones-eliminar");

            // Paso 1: solo el botón "Eliminar". Todavía no se borra nada.
            function mostrarBotonEliminar() {
                acciones.innerHTML = `<button class="boton boton--peligro" type="button">🗑️ Eliminar</button>`;
                acciones.querySelector("button").addEventListener("click", mostrarConfirmacion);
            }

            // Paso 2: pregunta y dos salidas. Cancelar vuelve al paso 1.
            function mostrarConfirmacion() {
                acciones.innerHTML = `
                    <p class="acciones__pregunta"></p>
                    <button class="boton boton--peligro" type="button" data-accion="confirmar">Sí, eliminar</button>
                    <button class="boton boton--secundario" type="button" data-accion="cancelar">Cancelar</button>
                `;
                // textContent: el nombre podría traer caracteres especiales
                acciones.querySelector(".acciones__pregunta").textContent =
                    `¿Seguro que quieres eliminar a ${perrito.nombre}? No se puede deshacer.`;

                acciones
                    .querySelector('[data-accion="cancelar"]')
                    .addEventListener("click", mostrarBotonEliminar);

                acciones
                    .querySelector('[data-accion="confirmar"]')
                    .addEventListener("click", () => {
                        // splice(posición, cuántos): quita 1 elemento desde
                        // `indice` y modifica el array original.
                        perritos.splice(indice, 1);
                        activarSidebarItem("mostrar-todos");
                    });
            }

            mostrarBotonEliminar();
        });
    }

    // Arma la tabla con TODOS los perritos y TODAS sus propiedades dentro de
    // #gestion-content. Se vuelve a llamar cada vez que se entra a "Mostrar
    // todos", así que siempre refleja el estado actual del array perritos
    // (incluye los que se hayan creado, editado o eliminado desde los formularios).
    function renderTablaMostrarTodos() {
        // Si se borraron todos, una tabla con solo encabezados confunde: mejor
        // un aviso y salir de la función.
        if (perritos.length === 0) {
            gestionContent.innerHTML = `
                <h2 class="gestion-main__title">Todos los perritos (0)</h2>
                <p class="resultado__vacio">No hay perritos todavía. Crea uno desde "➕ Crear".</p>
            `;
            return;
        }

        const filas = perritos
            .map(
                (perrito) => `
                    <tr>
                        <td>${perrito.id}</td>
                        <td><img class="tabla__imagen" src="${perrito.imagen}" alt="${perrito.nombre}"></td>
                        <td>${perrito.nombre}</td>
                        <td>${perrito.raza}</td>
                        <td>${perrito.universo}</td>
                        <td>${perrito.edad}</td>
                        <td>${perrito.altura}m</td>
                        <td>${perrito.aura}</td>
                        <td>${perrito.activo ? "Sí" : "No"}</td>
                        <td>${perrito.poderes.join(", ")}</td>
                        <td>${perrito.description}</td>
                    </tr>
                `
            )
            .join("");

        gestionContent.innerHTML = `
            <h2 class="gestion-main__title">Todos los perritos (${perritos.length})</h2>
            <div class="tabla-wrapper">
                <table class="tabla">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Imagen</th>
                            <th>Nombre</th>
                            <th>Raza</th>
                            <th>Universo</th>
                            <th>Edad</th>
                            <th>Altura</th>
                            <th>Aura</th>
                            <th>Activo</th>
                            <th>Poderes</th>
                            <th>Descripción</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
        `;
    }

    // Marca como activo el ítem del sidebar con ese data-action y ejecuta su
    // lógica correspondiente. Se usa tanto al hacer click como al redirigir
    // automáticamente desde los formularios de Crear y Actualizar.
    function activarSidebarItem(action) {
        sidebarItems.forEach((item) => {
            item.classList.toggle("active", item.dataset.action === action);
        });

        if (action === "crear") {
            renderFormularioCrear();
        } else if (action === "mostrar-todos") {
            renderTablaMostrarTodos();
        } else if (action === "leer") {
            renderFormularioLeer();
        } else if (action === "actualizar") {
            renderFormularioActualizar();
        } else if (action === "eliminar") {
            renderFormularioEliminar();
        }
    }

    // Arranca el panel CRUD. SOLO la llama el listener del login (abajo), y
    // solo cuando el usuario y la contraseña son correctos: mientras tanto, el
    // sidebar y el espacio principal no existen en la página (no están
    // ocultos, directamente no están). Y como es privada de la IIFE, escribir
    // iniciarGestion() en la consola da ReferenceError.
    function iniciarGestion() {
        // outerHTML reemplaza el elemento ENTERO (la sección de login incluida)
        // por el HTML nuevo: el login desaparece y en su lugar queda el panel.
        // Los data-action son el gancho que usa activarSidebarItem para saber
        // qué ítem se clickeó.
        document.getElementById("login").outerHTML = `
            <div class="gestion-layout">
                <aside class="sidebar">
                    <h2 class="sidebar__title">Gestión</h2>
                    <nav class="sidebar__nav">
                        <button class="sidebar__item" type="button" data-action="mostrar-todos">📋 Mostrar todos</button>
                        <button class="sidebar__item" type="button" data-action="crear">➕ Crear</button>
                        <button class="sidebar__item" type="button" data-action="leer">🔍 Leer</button>
                        <button class="sidebar__item" type="button" data-action="actualizar">✏️ Actualizar</button>
                        <button class="sidebar__item" type="button" data-action="eliminar">🗑️ Eliminar</button>
                    </nav>
                </aside>
                <main class="gestion-main" id="gestion-content"></main>
            </div>
        `;

        // Recién ahora el panel existe, así que recién ahora se pueden buscar.
        sidebarItems = document.querySelectorAll(".sidebar__item");
        gestionContent = document.getElementById("gestion-content");

        // Un listener por botón del sidebar: el data-action (mostrar-todos,
        // crear, leer, actualizar, eliminar) le dice a activarSidebarItem qué
        // proceso ejecutar, sin necesitar una función de click distinta por botón.
        sidebarItems.forEach((item) => {
            item.addEventListener("click", () => activarSidebarItem(item.dataset.action));
        });

        // Se abre "Mostrar todos" de una vez, así el espacio principal nunca
        // queda en blanco esperando el primer click.
        activarSidebarItem("mostrar-todos");
    }

    // ---------------------------------------------------------------------
    // Login: la única puerta hacia iniciarGestion().
    // ---------------------------------------------------------------------

    // Copia PRIVADA de la función de login.js, guardada apenas carga la
    // página. verificarLogin es global, así que desde la consola alguien
    // podría intentar reemplazarla por () => true. Ya es `const`, pero además
    // el listener de abajo usa ESTA referencia, que vive dentro de la IIFE:
    // aunque la global cambiara después, acá sigue la original.
    // typeof: si login.js no cargó, nadie entra (en vez de romper la página).
    const verificar =
        typeof verificarLogin === "function" ? verificarLogin : () => false;

    const formularioLogin = document.getElementById("form-login");
    const mensajeErrorLogin = document.getElementById("form-login-error");

    formularioLogin.addEventListener("submit", (event) => {
        event.preventDefault(); // evita que el form recargue la página
        const datos = new FormData(formularioLogin);

        // La comparación con las credenciales la hace login.js (ver
        // verificar, arriba): acá solo se decide qué hacer con la respuesta.
        const esValido = verificar(datos.get("usuario"), datos.get("contrasena"));

        if (!esValido) {
            // Mismo mensaje sin importar QUÉ falló: decir "el usuario existe
            // pero la contraseña no" le daría pistas a quien esté adivinando.
            mensajeErrorLogin.textContent = "Usuario o contraseña incorrectos.";
            mensajeErrorLogin.hidden = false;
            // Se borra solo la contraseña, para reintentar sin reescribir el usuario.
            formularioLogin.elements.contrasena.value = "";
            formularioLogin.elements.contrasena.focus();
            return; // se corta acá: iniciarGestion() nunca se llama
        }

        iniciarGestion();
    });
})();
