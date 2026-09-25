// Los datos viven en data.js, que se carga antes que este script (ver el
// orden de los <script defer> en index.html). crearPerritos() devuelve una
// copia nueva del array; la galería solo lee los datos, no los modifica.
const perritos = crearPerritos();

// Practicando acceso a arrays/objetos: .length cuenta elementos, [n] accede
// por índice (empieza en 0), y .map transforma cada elemento del array.
console.log(perritos.length);
console.log(perritos[0].nombre);
console.log(perritos[3].poderes[0]);
console.log(perritos.map((perrito) => perrito.nombre));

// Si el usuario tiene activado "reducir movimiento" en su sistema operativo,
// no inclinamos las cards — respeta esa preferencia de accesibilidad.
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Fuerza un número a quedar dentro de [min, max]. Se usa para que el
// porcentaje del mouse dentro de la card nunca se pase de 0-100, incluso
// si el cursor se mueve muy rápido y el evento se dispara "fuera" del borde.
function clamp(value, min = 0, max = 100) {
    return Math.min(Math.max(value, min), max);
}

// Traduce un valor de un rango [fromMin, fromMax] a otro [toMin, toMax].
// Ejemplo: adjust(50, 0, 100, 30, 70) da 50 (el punto medio de ambos rangos).
// Se usa para que el brillo (--background-x/y) se mueva menos que el mouse.
function adjust(value, fromMin, fromMax, toMin, toMax) {
    return toMin + ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin);
}

// Engancha el efecto de "carta holográfica" a UNA card: mientras el mouse
// se mueve encima, calcula qué tan lejos está del centro y actualiza las
// variables CSS (--rotate-x, --pointer-x, etc.) que style.css usa para
// inclinarla y mover el brillo. Al salir, todo vuelve a su valor de reposo.
function setupTilt(cardElement) {
    if (prefersReducedMotion) {
        return;
    }

    function handlePointerMove(event) {
        // posición del mouse relativa a la card (no a la pantalla completa)
        const rect = cardElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // la misma posición, pero como porcentaje del ancho/alto de la card (0-100)
        const percentX = clamp((100 / rect.width) * x);
        const percentY = clamp((100 / rect.height) * y);

        // centro de la card = 0,0 — a la izquierda/arriba es negativo,
        // a la derecha/abajo es positivo. Esto es lo que define el ángulo.
        const centerX = percentX - 50;
        const centerY = percentY - 50;

        cardElement.style.setProperty("--pointer-x", `${percentX}%`);
        cardElement.style.setProperty("--pointer-y", `${percentY}%`);
        cardElement.style.setProperty("--rotate-x", `${(-centerX / 3.5).toFixed(2)}deg`);
        cardElement.style.setProperty("--rotate-y", `${(centerY / 3.5).toFixed(2)}deg`);
        cardElement.style.setProperty("--background-x", `${adjust(percentX, 0, 100, 30, 70).toFixed(2)}%`);
        cardElement.style.setProperty("--background-y", `${adjust(percentY, 0, 100, 30, 70).toFixed(2)}%`);
        cardElement.style.setProperty("--card-opacity", "1"); // muestra el brillo (.card__shine/.card__glare)
        cardElement.classList.add("interacting"); // le quita la transición para que responda al instante
    }

    function handlePointerLeave() {
        // al salir el mouse, todo vuelve a su posición neutra (la card se endereza)
        cardElement.classList.remove("interacting");
        cardElement.style.setProperty("--rotate-x", "0deg");
        cardElement.style.setProperty("--rotate-y", "0deg");
        cardElement.style.setProperty("--pointer-x", "50%");
        cardElement.style.setProperty("--pointer-y", "50%");
        cardElement.style.setProperty("--background-x", "50%");
        cardElement.style.setProperty("--background-y", "50%");
        cardElement.style.setProperty("--card-opacity", "0");
    }

    cardElement.addEventListener("pointermove", handlePointerMove);
    cardElement.addEventListener("pointerleave", handlePointerLeave);
}

const cardTemplate = document.getElementById("card-template");
const cardContainer = document.getElementById("card-container");

// Crea UNA card a partir de un objeto perrito: clona la estructura del
// <template>, busca cada "gancho" [data-field="..."] con querySelector y le
// pone el valor correspondiente (mismo patrón campo por campo de siempre,
// solo que ahora se repite una vez por perrito en vez de escribirse a mano).
function renderPerrito(perrito) {
    const cardFragment = cardTemplate.content.cloneNode(true);
    const cardElement = cardFragment.querySelector(".card");

    const imagenElement = cardElement.querySelector('[data-field="imagen"]');
    imagenElement.src = perrito.imagen;
    imagenElement.alt = perrito.nombre;

    cardElement.querySelector('[data-field="nombre"]').textContent = perrito.nombre;
    cardElement.querySelector('[data-field="raza"]').textContent = perrito.raza;
    cardElement.querySelector('[data-field="universo"]').textContent = perrito.universo;
    cardElement.querySelector('[data-field="badge"]').textContent = perrito.activo ? "Activo" : "Inactivo";
    cardElement.querySelector('[data-field="description"]').textContent = perrito.description;
    cardElement.querySelector('[data-field="edad"]').textContent = perrito.edad;
    cardElement.querySelector('[data-field="altura"]').textContent = `${perrito.altura}m`;
    cardElement.querySelector('[data-field="aura"]').textContent = perrito.aura;

    // los poderes son un array de tamaño variable, así que se arman con un
    // loop: un <span class="card__poder"> por cada poder del perrito.
    const poderesElement = cardElement.querySelector('[data-field="poderes"]');
    perrito.poderes.forEach((poder) => {
        const poderElement = document.createElement("span");
        poderElement.className = "card__poder";
        poderElement.textContent = poder;
        poderesElement.appendChild(poderElement);
    });

    setupTilt(cardElement); // activa la inclinación/brillo en esta card en particular
    cardElement.addEventListener("click", () => openModal(perrito)); // abre la ventana de detalle
    cardContainer.appendChild(cardElement);
}

// Pinta en el grid UNA card por cada objeto de listaObjetos. Primero vacía
// el grid: como renderPerrito agrega con appendChild, sin esta limpieza
// llamar a la función dos veces dejaría las cards duplicadas (mismo motivo
// por el que openModal vacía los poderes antes de rellenarlos). Recibir la
// lista como parámetro, en vez de usar `perritos` directo, permite pintar
// cualquier array: por ejemplo, uno filtrado o reordenado.
function renderizarObjetos(listaObjetos) {
    cardContainer.innerHTML = "";
    listaObjetos.forEach(renderPerrito);
}

// ---------------------------------------------------------------------
// Menú de filtros (botón "🔽 Filtros" de index.html).
// ---------------------------------------------------------------------

// ÚNICO lugar donde se definen los filtros del menú. Cada objeto se
// convierte en un <select> (ver renderFiltros):
//   id        el name del <select>; con él se lee qué opción está elegida
//   label     el título que se ve arriba del <select>
//   opciones  cada una con su valor, su texto y una función cumple(perrito)
//             que devuelve true si ese perrito pasa el filtro
// La opción "Todos" no va acá: renderFiltros la agrega sola al inicio de
// cada <select>, con valor "" (vacío = ese filtro no descarta a nadie).
// Para sumar un filtro nuevo (raza, universo...) basta con agregar otro
// objeto a este array: el HTML y aplicarFiltro no se tocan.
// (El estado NO va acá: tiene sus propios 3 botones, ver más abajo.)
const filtrosConfig = [
    {
        id: "edad",
        label: "Edad",
        opciones: [
            { valor: "cachorro", label: "Cachorro (0–2 años)", cumple: (perrito) => perrito.edad <= 2 },
            { valor: "adulto", label: "Adulto (3–5 años)", cumple: (perrito) => perrito.edad >= 3 && perrito.edad <= 5 },
            { valor: "senior", label: "Senior (6+ años)", cumple: (perrito) => perrito.edad >= 6 },
        ],
    },
];

const filtrosToggle = document.getElementById("filtros-toggle");
const filtrosPanel = document.getElementById("filtros-panel"); // es un <form>
const filtrosCampos = document.getElementById("filtros-campos");
const filtrosToggleContador = document.getElementById("filtros-toggle-contador");
const filtrosLimpiar = document.getElementById("filtros-limpiar");
const filtrosContador = document.getElementById("filtros-contador");

// Crea un <label> con su título y su <select> por cada filtro de
// filtrosConfig (mismo estilo createElement + textContent que renderPerrito).
// new Option(texto, valor) es un atajo para crear un <option>.
function renderFiltros() {
    filtrosConfig.forEach((filtro) => {
        const campo = document.createElement("label");
        campo.className = "filtros__campo";

        const titulo = document.createElement("span");
        titulo.textContent = filtro.label;

        const select = document.createElement("select");
        select.name = filtro.id;
        select.add(new Option("Todos", ""));
        filtro.opciones.forEach((opcion) => {
            select.add(new Option(opcion.label, opcion.valor));
        });

        campo.append(titulo, select);
        filtrosCampos.appendChild(campo);
    });
}

renderFiltros();

// Slider de Aura mínima (panel flotante de index.html).
const auraSlider = document.getElementById("aura-slider");
const auraValorElement = document.getElementById("aura-valor");

// Los límites del slider salen de los datos, no se escriben a mano: map
// saca solo las auras y el spread (...) las pasa sueltas a Math.min/Math.max
// (mismo truco que siguienteId en gestion.js). Arranca en el mínimo, así al
// cargar la página no se oculta ningún perrito.
const auras = perritos.map((perrito) => perrito.aura);
auraSlider.min = Math.min(...auras);
auraSlider.max = Math.max(...auras);
auraSlider.value = auraSlider.min;
document.getElementById("aura-min").textContent = auraSlider.min;
document.getElementById("aura-max").textContent = auraSlider.max;

// Filtro por estado (botones Todos / Activos / Inactivos de index.html).
const filtroBotones = document.querySelectorAll(".filtros__boton");

// Recuerda qué botón de estado está elegido. Hace falta porque hay otros
// filtros (menú y slider): cuando cambian, hay que volver a filtrar también
// por estado, y ellos no tienen forma de saber qué botón se clickeó antes.
let estadoElegido = "todos";

// true si el perrito corresponde al botón de estado elegido.
function cumpleEstado(perrito) {
    if (estadoElegido === "activos") {
        return perrito.activo;
    }
    if (estadoElegido === "inactivos") {
        return !perrito.activo;
    }
    return true; // "todos": no descarta a nadie
}

// Arma la lista aplicando TODOS los filtros a la vez y se la pasa a
// renderizarObjetos, que ya se encarga de vaciar el grid y pintar. filter NO
// modifica `perritos`: devuelve un array NUEVO solo con los que cumplen,
// así que al volver a "Todos" el array original sigue completo.
function aplicarFiltro() {
    // 1) Por cada filtro del menú, busca la opción elegida en su <select>.
    //    filtrosPanel es un <form>, y form.elements[name] da el campo con ese
    //    name. Si el <select> está en "Todos" (valor ""), find no encuentra
    //    ninguna opción y devuelve undefined; el filter de después descarta
    //    esos undefined. Queda un array solo con las opciones ACTIVAS.
    const opcionesActivas = filtrosConfig
        .map((filtro) => {
            const valorElegido = filtrosPanel.elements[filtro.id].value;
            return filtro.opciones.find((opcion) => opcion.valor === valorElegido);
        })
        .filter((opcion) => opcion !== undefined);

    // 2) .value de un input SIEMPRE es un string ("4200"), aunque sea
    //    type="range". Number() lo convierte para comparar números con números.
    const auraMinima = Number(auraSlider.value);
    auraValorElement.textContent = auraMinima;

    // 3) Un perrito se muestra si cumple su estado (botones), TODAS las
    //    opciones activas del menú (every da true solo si la función da true
    //    para cada elemento; con un array vacío da true, o sea, sin filtros
    //    activos pasan todos) Y además llega al aura mínima del slider.
    const listaFiltrada = perritos.filter(
        (perrito) =>
            cumpleEstado(perrito) &&
            opcionesActivas.every((opcion) => opcion.cumple(perrito)) &&
            perrito.aura >= auraMinima
    );

    renderizarObjetos(listaFiltrada);

    // Resalta solo el botón de estado elegido (toggle con true/false, igual
    // que el sidebar de gestion.js) y sincroniza aria-pressed para lectores
    // de pantalla.
    filtroBotones.forEach((boton) => {
        const estaElegido = boton.dataset.filtro === estadoElegido;
        boton.classList.toggle("active", estaElegido);
        boton.setAttribute("aria-pressed", estaElegido);
    });

    // Número dentro del botón "Filtros": avisa que hay filtros puestos aunque
    // el menú esté cerrado. Con 0 se esconde, y "Limpiar" se desactiva.
    filtrosToggleContador.textContent = opcionesActivas.length;
    filtrosToggleContador.hidden = opcionesActivas.length === 0;
    filtrosLimpiar.disabled = opcionesActivas.length === 0;

    filtrosContador.textContent = `Mostrando ${listaFiltrada.length} de ${perritos.length}`;
}

// Un solo listener en el <form> en vez de uno por <select>: el evento
// "change" de cualquier <select> "burbujea" (sube) hasta su form. Así los
// filtros que se agreguen a futuro quedan escuchados sin escribir nada más.
filtrosPanel.addEventListener("change", aplicarFiltro);

// Un listener por botón de estado: guarda cuál se eligió (su data-filtro) y
// vuelve a filtrar con todo lo demás como estaba.
filtroBotones.forEach((boton) => {
    boton.addEventListener("click", () => {
        estadoElegido = boton.dataset.filtro;
        aplicarFiltro();
    });
});

// form.reset() devuelve cada <select> a su primera opción ("Todos"). No
// toca el slider de aura: ese vive fuera del menú y se ajusta aparte.
filtrosLimpiar.addEventListener("click", () => {
    filtrosPanel.reset();
    aplicarFiltro();
});

// Un popover se abre por defecto en el CENTRO de la pantalla. "toggle" se
// dispara cada vez que se abre o se cierra; al abrirse, se ubica justo
// debajo del botón midiendo dónde está (getBoundingClientRect, igual que en
// setupTilt). Math.min evita que se salga por la derecha en pantallas angostas.
filtrosPanel.addEventListener("toggle", (event) => {
    if (event.newState !== "open") {
        return;
    }
    const rect = filtrosToggle.getBoundingClientRect();
    const maxLeft = window.innerWidth - filtrosPanel.offsetWidth - 12;
    filtrosPanel.style.top = `${rect.bottom + 8}px`;
    filtrosPanel.style.left = `${Math.max(12, Math.min(rect.left, maxLeft))}px`;
});

// El panel queda fijo en la pantalla, así que si se hace scroll el botón se
// movería y el panel no: mejor cerrarlo. :popover-open es la pseudo-clase
// que indica si un popover está abierto.
window.addEventListener("scroll", () => {
    if (filtrosPanel.matches(":popover-open")) {
        filtrosPanel.hidePopover();
    }
});

// "input" (y no "change") es lo que hace que se actualice EN VIVO: "input" se
// dispara en cada paso mientras se arrastra el botón del slider; "change"
// solo una vez, al soltarlo.
auraSlider.addEventListener("input", aplicarFiltro);

// Primera pintada: con todo en "Todos" y el slider en el mínimo, muestra los
// 12 perritos y además escribe el contador.
aplicarFiltro();

// Ventana de detalle: hay un solo <dialog> en el HTML, se reutiliza para
// cualquier perrito que se clickee (por eso acá SÍ usamos ids, a diferencia
// de las cards que se repiten 12 veces).
const modalElement = document.getElementById("perrito-modal");
const modalImagenElement = document.getElementById("modal-imagen");
const modalNombreElement = document.getElementById("modal-nombre");
const modalRazaElement = document.getElementById("modal-raza");
const modalUniversoElement = document.getElementById("modal-universo");
const modalBadgeElement = document.getElementById("modal-badge");
const modalDescriptionElement = document.getElementById("modal-description");
const modalEdadElement = document.getElementById("modal-edad");
const modalAlturaElement = document.getElementById("modal-altura");
const modalAuraElement = document.getElementById("modal-aura");
const modalPoderesElement = document.getElementById("modal-poderes");
const modalCloseElement = document.getElementById("modal-close");

// Rellena el <dialog> único con los datos de UN perrito y lo abre. Como se
// reutiliza para cualquier perrito, hay que limpiar lo del anterior: los
// poderes se agregan con appendChild, así que sin vaciar el contenedor se
// irían acumulando en cada apertura.
function openModal(perrito) {
    modalImagenElement.src = perrito.imagen;
    modalImagenElement.alt = perrito.nombre;
    modalNombreElement.textContent = perrito.nombre;
    modalRazaElement.textContent = perrito.raza;
    modalUniversoElement.textContent = perrito.universo;
    modalBadgeElement.textContent = perrito.activo ? "Activo" : "Inactivo";
    modalDescriptionElement.textContent = perrito.description;
    modalEdadElement.textContent = perrito.edad;
    modalAlturaElement.textContent = `${perrito.altura}m`;
    modalAuraElement.textContent = perrito.aura;

    modalPoderesElement.innerHTML = ""; // limpia los poderes del perrito anterior
    perrito.poderes.forEach((poder) => {
        const poderElement = document.createElement("span");
        poderElement.className = "card__poder";
        poderElement.textContent = poder;
        modalPoderesElement.appendChild(poderElement);
    });

    modalElement.showModal(); // método nativo: abre el <dialog> como modal + backdrop
}

modalCloseElement.addEventListener("click", () => modalElement.close());

// El <dialog> nativo se cierra solo con la tecla Escape. Esto agrega que
// también se cierre al hacer click afuera del contenido (en el backdrop):
// si el click cae directo sobre el <dialog> (y no sobre .modal__content,
// que detiene la propagación abajo) es porque fue en el borde/backdrop.
modalElement.addEventListener("click", () => modalElement.close());
modalElement.querySelector(".modal__content").addEventListener("click", (event) => {
    event.stopPropagation();
});

// Botón de modo oscuro/claro: solo alterna una clase en <body>, todos los
// colores los resuelve style.css con variables (ver body.dark-mode).
const themeToggleElement = document.getElementById("theme-toggle");

themeToggleElement.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    const isDarkMode = document.body.classList.contains("dark-mode");
    themeToggleElement.textContent = isDarkMode ? "☀️ Modo claro" : "🌙 Modo oscuro";
});
