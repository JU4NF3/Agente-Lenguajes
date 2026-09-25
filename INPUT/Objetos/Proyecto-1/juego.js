// Juego de memoria (flip cards) de game.html.
//
// Basado en "cardGame" de Julián Bejarano (licencia MIT):
// https://codepen.io/julianbejarano/pen/myrzjBG (ver ejemplo-juego/). Cambios
// respecto al original:
//   - usa los perritos de data.js: 6 DISTINTOS al azar en cada partida
//   - la cantidad de pares sale de los datos (PARES_POR_PARTIDA), no de un
//     "8" escrito a mano en varios lugares
//   - las cartas se arman con <template> + textContent (no innerHTML con
//     texto pegado), y son <button> para poder jugar con el teclado
//   - el cronómetro arranca con el PRIMER click, no al cargar el tablero
//   - puntaje por rapidez en cada pareja + ranking por usuario
//   - const/let en vez de var
//
// Se carga después de data.js (crearPerritos) y usuarios.js (récords,
// ranking y formatearTiempo), y antes de game.js, que llama a
// iniciarJuego() cuando el login sale bien (ver el orden en game.html).

// ---------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------

const PARES_POR_PARTIDA = 6; // 6 perritos x 2 = 12 cartas
const DEMORA_NO_COINCIDEN = 900; // ms que se ven 2 cartas distintas antes de taparse

// Puntaje de CADA pareja según cuánto tardaste en encontrarla:
//   puntos = 100 - 5 x segundos   (y nunca menos de 10)
// Ej: 2 s -> 90 pts · 8 s -> 60 pts · 18 s o más -> 10 pts.
// Máximo posible por partida: 6 x 100 = 600.
const PUNTOS_BASE = 100;
const PUNTOS_POR_SEGUNDO = 5;
const PUNTOS_MINIMOS = 10;
const TAMANO_RANKING = 10; // cuántos jugadores muestra la tabla
const TAMANO_HISTORIAL = 10; // cuántas partidas propias muestra "Mis partidas"

// ---------------------------------------------------------------------
// Elementos del HTML
// ---------------------------------------------------------------------

const juegoSeccion = document.getElementById("juego");
const juegoSaludo = document.getElementById("juego-saludo");
const tablero = document.getElementById("tablero");
const cartaTemplate = document.getElementById("carta-template");
const hudTiempo = document.getElementById("hud-tiempo");
const hudIntentos = document.getElementById("hud-intentos");
const hudPares = document.getElementById("hud-pares");
const hudPuntos = document.getElementById("hud-puntos");
const victoria = document.getElementById("victoria");
const rankingCuerpo = document.getElementById("ranking-cuerpo");
const partidasCuerpo = document.getElementById("partidas-cuerpo");
const partidasTotal = document.getElementById("partidas-total");

// ---------------------------------------------------------------------
// Estado de la partida (lo que está pasando AHORA en el juego)
// ---------------------------------------------------------------------

let usuarioActual = null; // quién está jugando (para guardar su récord)
let primeraCarta = null; // la primera carta volteada del turno (o null)
let segundaCarta = null; // la segunda carta volteada del turno (o null)
let bloqueado = false; // true mientras se ven 2 cartas distintas: no deja voltear otra
let paresEncontrados = 0;
let intentos = 0; // cada vez que se voltea una SEGUNDA carta cuenta 1 intento
let puntos = 0;
let timerId = null; // el id de setInterval, para poder detenerlo con clearInterval
let taparId = null; // el id del setTimeout que tapa las cartas distintas

// Los tiempos se miden con Date.now(): los milisegundos que pasaron desde
// el 1/1/1970. No importa el número en sí; lo útil es RESTAR dos: la
// diferencia es cuánto tiempo pasó entre ellos, con precisión de ms.
let inicioPartida = null; // cuándo fue el primer click de la partida
let inicioPar = null; // desde cuándo se está buscando la pareja actual
let tiempoFinal = 0; // duración total (ms) al encontrar el último par

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------

// Mezcla Fisher-Yates: recorre el array de atrás hacia adelante y cambia
// cada elemento con otro al azar de los que quedan antes. Da una mezcla
// justa (todas las ordenaciones igual de probables). Trabaja sobre una
// COPIA ([...array]) para no desordenar el array original.
// [a, b] = [b, a] es desestructuración: intercambia dos valores sin
// necesitar una variable temporal.
function mezclar(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

// Puntos de una pareja según los ms que tardó. Se usan los segundos CON
// decimales (2.4 s -> 88 pts), así cada décima cuenta. Math.max deja el
// resultado en PUNTOS_MINIMOS si la resta da menos (o negativo).
function calcularPuntos(milisegundos) {
    const segundos = milisegundos / 1000;
    const puntosPar = Math.round(PUNTOS_BASE - PUNTOS_POR_SEGUNDO * segundos);
    return Math.max(PUNTOS_MINIMOS, puntosPar);
}

// ---------------------------------------------------------------------
// Cronómetro
// ---------------------------------------------------------------------

// setInterval repite la función cada 250 ms hasta clearInterval(timerId).
// El HUD no suma "1 segundo" por vuelta: calcula el tiempo real con
// Date.now() - inicioPartida. Así el reloj que ves y el tiempo que se
// guarda en el ranking son exactamente el mismo.
function iniciarTimer() {
    inicioPartida = Date.now();
    inicioPar = inicioPartida; // la primera pareja se cuenta desde acá
    timerId = setInterval(() => {
        hudTiempo.textContent = formatearTiempo(Date.now() - inicioPartida);
    }, 250);
}

function detenerTimer() {
    clearInterval(timerId);
    timerId = null;
}

// ---------------------------------------------------------------------
// Tablero
// ---------------------------------------------------------------------

// Crea UNA carta a partir de un perrito (mismo patrón que renderPerrito de
// index.js: clonar el <template> y rellenar con textContent).
// dataset.id guarda el id del perrito en la carta (data-id="3"): así se
// sabe si dos cartas son el mismo perrito sin mirar la imagen.
function crearCarta(perrito) {
    const carta = cartaTemplate.content.cloneNode(true).querySelector(".carta");
    carta.dataset.id = perrito.id;

    const imagen = carta.querySelector(".carta__imagen");
    imagen.src = perrito.imagen;
    imagen.alt = perrito.nombre;
    carta.querySelector(".carta__nombre").textContent = perrito.nombre;
    carta.querySelector(".carta__aura").textContent = `⚡ ${perrito.aura}`;

    carta.addEventListener("click", () => voltearCarta(carta));
    return carta;
}

// Arranca una partida nueva desde cero.
function nuevaPartida() {
    // Si quedó algo corriendo de la partida anterior (el cronómetro, o el
    // setTimeout que iba a tapar 2 cartas), se cancela: si no, seguiría
    // actuando sobre cartas que ya no existen.
    detenerTimer();
    clearTimeout(taparId);

    primeraCarta = null;
    segundaCarta = null;
    bloqueado = false;
    paresEncontrados = 0;
    intentos = 0;
    puntos = 0;
    inicioPartida = null;
    inicioPar = null;
    tiempoFinal = 0;

    // 1) 6 perritos DISTINTOS: se mezclan los 12 de data.js y se toman los
    //    6 primeros (slice). Como cada partida mezcla de nuevo, salen otros.
    const elegidos = mezclar(crearPerritos()).slice(0, PARES_POR_PARTIDA);

    // 2) Cada perrito 2 veces (el spread ... copia los 6 dos veces en un
    //    array de 12) y se mezcla otra vez para repartir las parejas.
    const mazo = mezclar([...elegidos, ...elegidos]);

    // 3) Pintar: vaciar el tablero y agregar una carta por elemento del mazo.
    tablero.innerHTML = "";
    mazo.forEach((perrito) => tablero.appendChild(crearCarta(perrito)));

    actualizarHUD();
    hudTiempo.textContent = formatearTiempo(0);
}

function actualizarHUD() {
    hudIntentos.textContent = intentos;
    hudPares.textContent = `${paresEncontrados}/${PARES_POR_PARTIDA}`;
    hudPuntos.textContent = puntos;
}

// ---------------------------------------------------------------------
// Lógica de un turno
// ---------------------------------------------------------------------

function voltearCarta(carta) {
    // No se puede voltear si: hay 2 cartas distintas a la vista, la carta
    // ya está boca arriba, o ya es parte de un par encontrado.
    if (bloqueado || carta.classList.contains("volteada") || carta.classList.contains("encontrada")) {
        return;
    }

    // El cronómetro arranca con el primer click de la partida.
    if (timerId === null) {
        iniciarTimer();
    }

    // La clase "volteada" dispara el giro en el CSS (rotateY(180deg)).
    carta.classList.add("volteada");
    carta.setAttribute("aria-label", carta.querySelector(".carta__nombre").textContent);

    // Primera carta del turno: se guarda y se espera la segunda.
    if (primeraCarta === null) {
        primeraCarta = carta;
        return;
    }

    // Segunda carta del turno: cuenta como intento y se comparan.
    segundaCarta = carta;
    intentos++;
    actualizarHUD();

    // dataset siempre guarda texto ("3"), pero como se comparan dos textos
    // entre sí, === funciona sin convertir a número.
    if (primeraCarta.dataset.id === segundaCarta.dataset.id) {
        marcarPar();
    } else {
        // Distintas: se dejan a la vista un momento para que el jugador las
        // memorice, y después se tapan. Mientras tanto, bloqueado = true.
        bloqueado = true;
        taparId = setTimeout(taparCartas, DEMORA_NO_COINCIDEN);
    }
}

function marcarPar() {
    // Puntos de ESTA pareja: el tiempo desde el par anterior (o desde el
    // primer click, si es la primera). Después el reloj de la pareja se
    // reinicia para la siguiente.
    const ahora = Date.now();
    const puntosPar = calcularPuntos(ahora - inicioPar);
    puntos += puntosPar;
    inicioPar = ahora;
    mostrarPuntosGanados(segundaCarta, puntosPar);

    // "encontrada" las deja boca arriba para siempre (con borde verde), y
    // disabled saca el <button> del juego: ni click ni Tab.
    [primeraCarta, segundaCarta].forEach((carta) => {
        carta.classList.remove("volteada");
        carta.classList.add("encontrada");
        carta.disabled = true;
    });

    paresEncontrados++;
    actualizarHUD();
    terminarTurno();

    if (paresEncontrados === PARES_POR_PARTIDA) {
        tiempoFinal = ahora - inicioPartida;
        detenerTimer();
        hudTiempo.textContent = formatearTiempo(tiempoFinal); // el tiempo exacto final
        // Un momento para ver el último par antes de la ventana de victoria.
        setTimeout(mostrarVictoria, 700);
    }
}

// "+90" que sube y se desvanece sobre la carta (la animación está en el
// CSS, .carta__puntos). Se borra con setTimeout y no con el evento
// animationend porque, si el usuario tiene "reducir movimiento", no hay
// animación y ese evento nunca llegaría: el "+90" quedaría pegado.
function mostrarPuntosGanados(carta, puntosPar) {
    const etiqueta = document.createElement("span");
    etiqueta.className = "carta__puntos";
    etiqueta.setAttribute("aria-hidden", "true"); // el HUD ya anuncia los puntos
    etiqueta.textContent = `+${puntosPar}`;
    carta.appendChild(etiqueta);
    setTimeout(() => etiqueta.remove(), 1000);
}

function taparCartas() {
    [primeraCarta, segundaCarta].forEach((carta) => {
        carta.classList.remove("volteada");
        carta.setAttribute("aria-label", "Carta boca abajo");
    });
    terminarTurno();
}

function terminarTurno() {
    primeraCarta = null;
    segundaCarta = null;
    bloqueado = false;
}

// ---------------------------------------------------------------------
// Victoria
// ---------------------------------------------------------------------

// El mínimo posible es 6 intentos (acertar todos a la primera). El mensaje
// cambia según qué tan cerca se quedó de eso.
function mensajeSegunIntentos() {
    if (intentos <= PARES_POR_PARTIDA + 2) {
        return "¡Memoria de perrito detective! 🕵️";
    }
    if (intentos <= PARES_POR_PARTIDA * 2) {
        return "¡Muy bien! Tus perritos están orgullosos. 🐶";
    }
    return "¡Completado! La próxima vez con menos intentos. 💪";
}

function mostrarVictoria() {
    // registrarPartida (usuarios.js) SIEMPRE guarda la partida en el
    // historial del usuario, y además actualiza su récord si fue la mejor.
    // Devuelve un objeto; { esRecord } lo desestructura: saca solo esa
    // propiedad en una variable con el mismo nombre. (?? false: por si el
    // usuario ya no existe y registrarPartida devolvió null.)
    const { esRecord } = registrarPartida(usuarioActual.email, puntos, tiempoFinal, intentos) ?? { esRecord: false };

    document.getElementById("victoria-mensaje").textContent = mensajeSegunIntentos();
    document.getElementById("victoria-record").hidden = !esRecord;
    document.getElementById("victoria-puntos").textContent = puntos;
    document.getElementById("victoria-tiempo").textContent = formatearTiempo(tiempoFinal);
    document.getElementById("victoria-intentos").textContent = intentos;

    renderRanking(); // por si cambió la posición del jugador
    renderPartidas(); // la partida recién jugada aparece arriba
    victoria.showModal();
}

// ---------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------

// Una fila de la tabla. Todo con textContent: alias viene de lo que
// escribió cada jugador al registrarse (nada de innerHTML).
function crearFilaRanking(usuario, posicion) {
    const medallas = ["🥇", "🥈", "🥉"];
    const fila = document.createElement("tr");

    // Resalta la fila de quien está jugando.
    if (usuarioActual && usuario.email === usuarioActual.email) {
        fila.classList.add("ranking__fila--yo");
    }

    // posicion empieza en 0: medallas[0] es 🥇. Del 4.º en adelante,
    // medallas[posicion] es undefined y el ?? pone el número.
    // mejorIntentos no existe en récords guardados antes de que se
    // registraran los intentos: ahí se muestra "—".
    return llenarFila(fila, [
        medallas[posicion] ?? `${posicion + 1}`,
        usuario.alias,
        `${usuario.mejorPuntaje} pts`,
        usuario.mejorIntentos ?? "—",
        formatearTiempo(usuario.mejorTiempo),
    ]);
}

// Agrega un <td> por cada texto (con textContent) y devuelve la fila. La
// usan el ranking y "Mis partidas".
function llenarFila(fila, textos) {
    textos.forEach((texto) => {
        const celda = document.createElement("td");
        celda.textContent = texto;
        fila.appendChild(celda);
    });
    return fila;
}

// Fila de una sola celda que ocupa todo el ancho (colSpan): para avisos
// como "todavía no hay..." o el separador "…".
function filaAviso(texto, columnas) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");
    celda.colSpan = columnas;
    celda.className = "ranking__vacio";
    celda.textContent = texto;
    fila.appendChild(celda);
    return fila;
}

// "2026-09-25T18:10:12.000Z" -> "25/9/2026, 13:10:12" (hora local).
function formatearFecha(iso) {
    return new Date(iso).toLocaleString("es");
}

// Muestra el Top 10. Si el jugador actual tiene récord pero quedó más
// abajo, se agrega su fila al final (después de una fila "…"), para que
// siempre vea en qué puesto va.
function renderRanking() {
    const ranking = obtenerRanking(); // usuarios.js: ya viene ordenado
    rankingCuerpo.replaceChildren(); // vacía el <tbody>

    if (ranking.length === 0) {
        rankingCuerpo.appendChild(filaAviso("Todavía no hay puntajes. ¡Sé el primero!", 5));
        return;
    }

    ranking.slice(0, TAMANO_RANKING).forEach((usuario, i) => {
        rankingCuerpo.appendChild(crearFilaRanking(usuario, i));
    });

    const miPosicion = ranking.findIndex((u) => u.email === usuarioActual.email);
    if (miPosicion >= TAMANO_RANKING) {
        rankingCuerpo.appendChild(filaAviso("…", 5));
        rankingCuerpo.appendChild(crearFilaRanking(ranking[miPosicion], miPosicion));
    }
}

// ---------------------------------------------------------------------
// Mis partidas (historial del jugador actual)
// ---------------------------------------------------------------------

// Las últimas partidas de quien está jugando, de la más nueva a la más
// antigua (obtenerPartidasDe en usuarios.js ya las trae ordenadas). La
// partida que es su récord lleva ⭐: se reconoce porque su id es el mismo
// que usuario.partidaRecordId.
function renderPartidas() {
    const partidas = obtenerPartidasDe(usuarioActual.email);
    const usuario = leerUsuarios().find((u) => u.email === usuarioActual.email);
    const idRecord = usuario ? usuario.partidaRecordId : null;

    partidasTotal.textContent = `(${partidas.length} en total)`;
    partidasCuerpo.replaceChildren();

    if (partidas.length === 0) {
        partidasCuerpo.appendChild(filaAviso("Todavía no terminas ninguna partida.", 5));
        return;
    }

    partidas.slice(0, TAMANO_HISTORIAL).forEach((partida) => {
        const fila = document.createElement("tr");
        const esRecord = partida.id === idRecord;
        if (esRecord) {
            fila.classList.add("ranking__fila--yo");
        }
        partidasCuerpo.appendChild(
            llenarFila(fila, [
                `#${partida.id}`,
                formatearFecha(partida.fecha),
                `${partida.puntaje} pts${esRecord ? " ⭐" : ""}`,
                partida.intentos,
                formatearTiempo(partida.tiempo),
            ])
        );
    });
}

// ---------------------------------------------------------------------
// Arranque (lo llama game.js después del login)
// ---------------------------------------------------------------------

// El alias lo escribió el usuario: va con textContent, nunca con innerHTML.
function iniciarJuego(usuario, esNuevo) {
    usuarioActual = usuario;
    juegoSaludo.textContent = esNuevo
        ? `¡Bienvenido, ${usuario.alias}!`
        : `¡Hola de nuevo, ${usuario.alias}!`;
    juegoSeccion.hidden = false;
    renderRanking();
    renderPartidas();
    nuevaPartida();
}

document.getElementById("juego-reiniciar").addEventListener("click", nuevaPartida);

document.getElementById("victoria-jugar").addEventListener("click", () => {
    victoria.close();
    nuevaPartida();
});
