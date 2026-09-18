// El array `perritos` ya no vive acá: se declara en data.js, que se carga
// antes que este script (ver el orden de los <script defer> en index.html).

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

// Pone en mayúscula solo la primera letra de un texto (el resto queda
// igual). Se usa al mostrar los poderes, porque en el array de datos están
// escritos en minúscula ("dormir", "comer mucho") pero en pantalla se ven
// mejor como "Dormir", "Comer mucho".
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
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
        poderElement.textContent = capitalize(poder);
        poderesElement.appendChild(poderElement);
    });

    setupTilt(cardElement); // activa la inclinación/brillo en esta card en particular
    cardElement.addEventListener("click", () => openModal(perrito)); // abre la ventana de detalle
    cardContainer.appendChild(cardElement);
}

// Genera las 12 cards, una por cada perrito del array.
perritos.forEach(renderPerrito);

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
        poderElement.textContent = capitalize(poder);
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
