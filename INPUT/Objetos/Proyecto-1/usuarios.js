// "Base de datos" de usuarios del juego: un array en formato JSON guardado
// en localStorage. Lo comparten dos páginas (mismo patrón que data.js):
//   - game.html    registra usuarios nuevos (guardarUsuarios), hace login
//                  (leerUsuarios), guarda cada partida y el récord
//                  (registrarPartida), y muestra el ranking
//                  (obtenerRanking) y el historial (obtenerPartidasDe)
//   - gestion.html los lista en la pestaña "👥 Usuarios" (leerUsuarios)
// Por eso vive en su propio archivo: si la clave o el formato cambian, se
// cambian UNA vez acá y las dos páginas quedan al día.
//
// El navegador NO puede escribir archivos en el computador (por seguridad:
// si pudiera, cualquier página web podría escribir en tu disco). Lo más
// parecido que tiene es localStorage: un "cajón" de texto que guarda el
// navegador y que sobrevive a recargar o cerrar la pestaña. Es por
// ORIGEN: las dos páginas lo comparten solo si se abren desde el mismo
// lugar (las dos con doble click, o las dos con Live Server).
//
// localStorage solo guarda TEXTO, así que el array de usuarios se convierte
// a texto JSON al guardar (JSON.stringify) y de vuelta a array al leer
// (JSON.parse). Cada usuario queda así:
//   {
//     "id": 1,                          <- autogenerado, único, no cambia
//     "nombre": "Juan", "alias": "Juancho", "email": "juan@gmail.com",
//     "contrasenaHash": "9f86d0...", "fechaRegistro": "2026-09-25T...",
//     "mejorPuntaje": 520, "mejorTiempo": 40000, "mejorIntentos": 9,
//     "fechaRecord": "...", "partidaRecordId": 4,
//     "partidas": [                     <- TODAS las partidas que jugó
//       { "id": 1, "fecha": "2026-09-25T...", "puntaje": 430,
//         "intentos": 12, "tiempo": 58300 },
//       { "id": 4, "fecha": "...", "puntaje": 520, "intentos": 9, "tiempo": 40000 }
//     ]
//   }
// Los tiempos van en MILISEGUNDOS (58300 = 58,3 s) y las fechas en formato
// ISO (el de new Date().toISOString()).
// Para verlo: F12 -> Application -> Local Storage, o en la consola:
//   JSON.parse(localStorage.getItem("game-usuarios"))
//
// OJO: sigue siendo práctica de front-end. Cualquiera con DevTools puede
// leer, editar o borrar este cajón. En un sistema real los usuarios viven
// en un servidor, y el navegador solo le manda los datos con fetch().

const CLAVE_USUARIOS = "game-usuarios";

// ---------------------------------------------------------------------
// IDs autogenerados
// ---------------------------------------------------------------------

// El siguiente id libre de una lista: el mayor + 1 (mismo truco que
// siguienteId en gestion.js). map saca los ids, el spread (...) los pasa
// sueltos a Math.max.
// OJO con la lista vacía: Math.max() sin argumentos da -Infinity, y
// -Infinity + 1 sigue siendo -Infinity. Por eso, si no hay ids, arranca en 1.
// Solo sube: el id de algo borrado no se reutiliza.
function siguienteId(lista) {
    const ids = lista
        .map((elemento) => elemento.id)
        .filter((id) => typeof id === "number");
    return ids.length === 0 ? 1 : Math.max(...ids) + 1;
}

function siguienteIdUsuario(usuarios) {
    return siguienteId(usuarios);
}

// El id de partida es único en TODO el sistema (no se reinicia por usuario),
// como en una tabla de base de datos. flatMap junta las partidas de todos
// los usuarios en un solo array: [[p1, p2], [p3]] -> [p1, p2, p3].
function siguienteIdPartida(usuarios) {
    return siguienteId(usuarios.flatMap((usuario) => usuario.partidas));
}

// ---------------------------------------------------------------------
// Leer y guardar
// ---------------------------------------------------------------------

// Los usuarios registrados ANTES de que existieran los ids y el historial
// no tienen "id" ni "partidas". Esta función los completa (en el orden en
// que se registraron) y avisa si cambió algo, para guardarlo una sola vez.
// Así nadie pierde su cuenta al actualizar el código: eso es una
// "migración" de datos.
function migrarUsuarios(usuarios) {
    let huboCambios = false;
    let proximoId = siguienteId(usuarios);

    usuarios.forEach((usuario) => {
        if (typeof usuario.id !== "number") {
            usuario.id = proximoId;
            proximoId++;
            huboCambios = true;
        }
        if (!Array.isArray(usuario.partidas)) {
            usuario.partidas = [];
            huboCambios = true;
        }
    });

    return huboCambios;
}

// Devuelve el array de usuarios guardados ([] si todavía no hay ninguno).
// try/catch: si el texto guardado está roto (alguien lo editó a mano en
// DevTools), JSON.parse lanza un error; en vez de romper la página, se
// trata como si no hubiera usuarios. Array.isArray cubre el caso en que el
// JSON es válido pero no es una lista (ej. alguien guardó "hola").
function leerUsuarios() {
    let usuarios;
    try {
        const texto = localStorage.getItem(CLAVE_USUARIOS);
        usuarios = texto ? JSON.parse(texto) : [];
    } catch {
        return [];
    }
    if (!Array.isArray(usuarios)) {
        return [];
    }

    if (migrarUsuarios(usuarios)) {
        guardarUsuarios(usuarios);
    }
    return usuarios;
}

// JSON.stringify(valor, null, 2): el 2 lo deja indentado, más fácil de leer
// si lo abres en DevTools.
function guardarUsuarios(usuarios) {
    localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios, null, 2));
}

// ---------------------------------------------------------------------
// Partidas y récords del juego de memoria
// ---------------------------------------------------------------------
//
// Cada partida terminada se agrega a usuario.partidas (el historial). Además,
// el MEJOR resultado se copia en campos "mejor..." del usuario:
//   mejorPuntaje     number  puntos de su mejor partida
//   mejorTiempo      number  cuánto duró, en MILISEGUNDOS
//   mejorIntentos    number  cuántos intentos le tomó
//   fechaRecord      string  cuándo la jugó
//   partidaRecordId  number  el id de esa partida dentro de "partidas"
// Es un "resumen": se podría calcular recorriendo las partidas, pero así el
// ranking se arma rápido y cada jugador aparece UNA sola vez.

// ¿Esta partida es mejor que la anterior? Más puntos gana; con los mismos
// puntos, gana la más rápida.
function esMejorPartida(partida, usuario) {
    if (typeof usuario.mejorPuntaje !== "number") {
        return true; // su primera partida siempre es récord
    }
    return (
        partida.puntaje > usuario.mejorPuntaje ||
        (partida.puntaje === usuario.mejorPuntaje && partida.tiempo < usuario.mejorTiempo)
    );
}

// Guarda SIEMPRE la partida en el historial del usuario, y además actualiza
// su récord si fue la mejor. Devuelve { esRecord, partida } (o null si el
// email no existe): el juego usa esRecord para mostrar "🎉 ¡Nuevo récord!".
// Se vuelve a leer el array completo, se modifica el usuario y se guarda
// todo de nuevo: localStorage no sabe cambiar "un pedacito" del JSON.
function registrarPartida(email, puntaje, tiempo, intentos) {
    const usuarios = leerUsuarios();
    const usuario = usuarios.find((u) => u.email === email);
    if (!usuario) {
        return null;
    }

    const partida = {
        id: siguienteIdPartida(usuarios),
        fecha: new Date().toISOString(),
        puntaje: puntaje,
        intentos: intentos,
        tiempo: tiempo,
    };
    usuario.partidas.push(partida);

    const esRecord = esMejorPartida(partida, usuario);
    if (esRecord) {
        usuario.mejorPuntaje = partida.puntaje;
        usuario.mejorTiempo = partida.tiempo;
        usuario.mejorIntentos = partida.intentos;
        usuario.fechaRecord = partida.fecha;
        usuario.partidaRecordId = partida.id;
    }

    guardarUsuarios(usuarios);
    return { esRecord, partida };
}

// Las partidas de un usuario, de la más nueva a la más antigua. Como los ids
// solo suben, un id mayor = una partida más reciente. slice() hace una
// copia antes de sort, porque sort DESORDENA el array original.
function obtenerPartidasDe(email) {
    const usuario = leerUsuarios().find((u) => u.email === email);
    if (!usuario) {
        return [];
    }
    return usuario.partidas.slice().sort((a, b) => b.id - a.id);
}

// Usuarios que ya jugaron al menos una vez, del mejor al peor.
// sort con una función de comparación: si devuelve un número negativo, a va
// antes que b; si es positivo, b va antes.
//   b.mejorPuntaje - a.mejorPuntaje  -> más puntos primero (orden descendente)
//   || a.mejorTiempo - b.mejorTiempo -> si la resta de puntos da 0 (empate),
//      el || pasa al segundo criterio: menos tiempo primero
function obtenerRanking() {
    return leerUsuarios()
        .filter((usuario) => typeof usuario.mejorPuntaje === "number")
        .sort(
            (a, b) =>
                b.mejorPuntaje - a.mejorPuntaje || a.mejorTiempo - b.mejorTiempo
        );
}

// 75300 ms -> "01:15". Vive acá porque lo usan el juego (HUD, victoria y
// ranking) y la tabla de usuarios de gestion.html.
// padStart(2, "0") agrega un 0 adelante si hace falta.
function formatearTiempo(milisegundos) {
    const totalSegundos = Math.floor(milisegundos / 1000);
    const mm = String(Math.floor(totalSegundos / 60)).padStart(2, "0");
    const ss = String(totalSegundos % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}
