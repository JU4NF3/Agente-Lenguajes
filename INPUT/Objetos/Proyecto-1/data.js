// Datos compartidos por las dos páginas: index.html (galería de cards) y
// gestion.html (CRUD). Las dos cargan este archivo ANTES que su propio
// script (ver el orden de los <script defer>), así que crearPerritos() y
// capitalize() ya existen cuando index.js y gestion.js arrancan.
//
// Cada perrito es un objeto con estos campos:
//   id           number    único y fijo: se asigna al crear el perrito y no
//                          cambia nunca, ni al editarlo (ver siguienteId en
//                          gestion.js)
//   nombre       string    gestion.js no deja repetirlo (sin distinguir
//                          mayúsculas ni espacios sobrantes)
//   raza         string
//   universo     string    código del universo de origen (ej. "Perroid004")
//   imagen       string    URL de la foto
//   description  string    historia de cómo consiguió sus poderes
//   edad         number    en años
//   altura       number    en metros (se muestra como "0.38m")
//   aura         number    nivel de poder
//   activo       boolean   true se muestra "Activo", false "Inactivo"
//   poderes      string[]  lista de tamaño variable; cada poder empieza con
//                          mayúscula (ver capitalize abajo)
//
// Es una FUNCIÓN y no un array global (`let perritos = [...]`) por
// seguridad: lo global se puede modificar desde la consola del navegador.
// Cada llamada a crearPerritos() arma un array NUEVO con objetos nuevos, así
// que gestion.js guarda su propia copia privada dentro de su closure, y
// aunque alguien haga crearPerritos().push(...) en la consola, solo cambia
// otra copia que nadie usa.
// Los cambios viven solo en memoria: al recargar la página se pierden.
function crearPerritos() {
    return [
        {
            id: 1,
            nombre: "Leo",
            poderes: ["Dormir", "Comer mucho", "Mega Ladrido", "Salto De Fuego"],
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
            id: 2,
            nombre: "Mochi",
            poderes: ["Teletransportar juguetes", "Orejas radar"],
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
            id: 3,
            nombre: "Rocko",
            poderes: ["Congelar el tiempo (3s)", "Siesta táctica"],
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
            id: 4,
            nombre: "Nube",
            poderes: ["Electricidad estática", "Pelaje escudo"],
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
            id: 5,
            nombre: "Trueno",
            poderes: ["Rayos con la cola", "Ladrido sónico"],
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
            id: 6,
            nombre: "Pixel",
            poderes: ["Pausar la realidad", "Vidas extra"],
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
            id: 7,
            nombre: "Canela",
            poderes: ["Escupir fuego al estornudar", "Aliento picante"],
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
            id: 8,
            nombre: "Bruno",
            poderes: ["Invisibilidad al bostezar", "Olfato fantasma"],
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
            id: 9,
            nombre: "Luna",
            poderes: ["Controlar las mareas", "Aullido eclipse"],
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
            id: 10,
            nombre: "Tofu",
            poderes: ["Rebote infinito", "Esquiva ataques"],
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
            id: 11,
            nombre: "Max",
            poderes: ["Clonarse temporalmente", "Velocidad x2"],
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
            id: 12,
            nombre: "Kiwi",
            poderes: ["Estirarse como chicle", "Colarse por rendijas"],
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
}

// Pone en mayúscula solo la primera letra de un texto (el resto queda
// igual): "saltar alto" -> "Saltar alto". Vive acá, junto a los datos, para
// que haya UNA sola versión: gestion.js la usa al guardar los poderes que se
// escriben en los formularios, y así quedan con el mismo formato que los de
// este archivo.
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
