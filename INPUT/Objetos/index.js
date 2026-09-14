// Array con los datos de los 12 perritos. Esta es la ÚNICA fuente de datos:
// las cards que se ven en pantalla se generan clonando #card-template por
// cada objeto de este array (ver renderPerrito más abajo).
let perritos = [
    {
        nombre: "Leo",
        poderes: ["dormir", "comer mucho", "Mega Ladrido", "Salto De Fuego"],
        description: "Leo, perro san bernardo. Un pancake radioactivo lo mordió y se convirtió en un perro con poderes",
        raza: "Shih-Tzu",
        imagen: "https://placedog.net/500/280?id=1",
        universo: "Perroid004",
        aura: 10000,
        activo: true,
        altura: 2.00,
        edad: 5,
    },
    {
        nombre: "Mochi",
        poderes: ["teletransportar juguetes", "orejas radar"],
        description: "Mochi lamió un enchufe con sabor a matcha y desde entonces teletransporta cualquier objeto del tamaño de una pelota",
        raza: "Golden Retriever",
        imagen: "https://placedog.net/500/280?id=2",
        universo: "Perroid011",
        aura: 4200,
        activo: true,
        altura: 0.38,
        edad: 3,
    },
    {
        nombre: "Rocko",
        poderes: ["congelar el tiempo (3s)", "siesta táctica"],
        description: "Rocko se tragó una batería de reloj mientras dormía la siesta y ahora puede congelar el tiempo por 3 segundos exactos",
        raza: "Golden Retriever",
        imagen: "https://placedog.net/500/280?id=3",
        universo: "Perroid007",
        aura: 6100,
        activo: false,
        altura: 0.32,
        edad: 4,
    },
    {
        nombre: "Nube",
        poderes: ["electricidad estática", "pelaje escudo"],
        description: "Nube durmió una noche entera bajo una antena de wifi rota y despertó controlando la electricidad estática",
        raza: "Labrador",
        imagen: "https://placedog.net/500/280?id=4",
        universo: "Perroid002",
        aura: 8300,
        activo: true,
        altura: 0.56,
        edad: 2,
    },
    {
        nombre: "Trueno",
        poderes: ["rayos con la cola", "ladrido sónico"],
        description: "Trueno mordió un cable pelado en plena tormenta y ahora genera rayos cada vez que mueve la cola",
        raza: "Lobo Siberiano",
        imagen: "https://placedog.net/500/280?id=5",
        universo: "Perroid015",
        aura: 15400,
        activo: true,
        altura: 0.62,
        edad: 6,
    },
    {
        nombre: "Pixel",
        poderes: ["pausar la realidad", "vidas extra"],
        description: "Pixel se cayó dentro de una consola retro abierta y ahora puede pausar la realidad como si fuera un videojuego",
        raza: "Weimaraner",
        imagen: "https://placedog.net/500/280?id=6",
        universo: "Perroid099",
        aura: 9900,
        activo: true,
        altura: 0.58,
        edad: 3,
    },
    {
        nombre: "Canela",
        poderes: ["escupir fuego al estornudar", "aliento picante"],
        description: "Canela se comió un chile fantasma por accidente y ahora escupe fuego cada vez que estornuda",
        raza: "Schnauzer",
        imagen: "https://placedog.net/500/280?id=7",
        universo: "Perroid021",
        aura: 3300,
        activo: true,
        altura: 0.18,
        edad: 7,
    },
    {
        nombre: "Bruno",
        poderes: ["invisibilidad al bostezar", "olfato fantasma"],
        description: "Bruno encontró un anillo enterrado en el jardín y ahora se vuelve invisible cada vez que bosteza",
        raza: "Border Collie",
        imagen: "https://placedog.net/500/280?id=8",
        universo: "Perroid033",
        aura: 7200,
        activo: false,
        altura: 0.57,
        edad: 8,
    },
    {
        nombre: "Luna",
        poderes: ["controlar las mareas", "aullido eclipse"],
        description: "Luna aulló tan fuerte durante un eclipse que absorbió parte de los poderes de la luna, ahora controla las mareas",
        raza: "Golden Retriever",
        imagen: "https://placedog.net/500/280?id=9",
        universo: "Perroid044",
        aura: 12800,
        activo: true,
        altura: 0.56,
        edad: 4,
    },
    {
        nombre: "Tofu",
        poderes: ["rebote infinito", "esquiva ataques"],
        description: "Tofu cayó sin querer en una fuente de gelatina radioactiva del laboratorio del vecino y ahora rebota como resorte sin cansarse",
        raza: "Braco Alemán",
        imagen: "https://placedog.net/500/280?id=10",
        universo: "Perroid058",
        aura: 5600,
        activo: true,
        altura: 0.35,
        edad: 2,
    },
    {
        nombre: "Max",
        poderes: ["clonarse temporalmente", "velocidad x2"],
        description: "Max persiguió una ardilla directo hacia un portal dimensional en el parque y ahora puede clonarse por un rato",
        raza: "Schnauzer",
        imagen: "https://placedog.net/500/280?id=11",
        universo: "Perroid066",
        aura: 11100,
        activo: true,
        altura: 0.58,
        edad: 5,
    },
    {
        nombre: "Kiwi",
        poderes: ["estirarse como chicle", "colarse por rendijas"],
        description: "Kiwi olfateó un frasco de pegamento extraterrestre caído de un satélite y ahora estira su cuerpo como si fuera chicle",
        raza: "Pastor Alemán",
        imagen: "https://placedog.net/500/280?id=12",
        universo: "Perroid077",
        aura: 4800,
        activo: true,
        altura: 0.33,
        edad: 3,
    },
];

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
