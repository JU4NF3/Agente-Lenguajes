// LÓGICA DEL JUEGO (sin tocar el HTML)
// Aquí solo hay funciones que reciben datos y devuelven datos: elegir la
// palabra del día, revisar un intento y calcular estadísticas.

const WORD_LENGTH = 5;
const MAX_TRIES = 6;

// fecha local como texto 'AAAA-MM-DD' (sirve de "llave" de la partida diaria)
function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// días que pasaron desde una fecha fija: el número de partida de hoy
function dayNumber(dateKey = todayKey()) {
  const start = Date.UTC(2026, 0, 1);
  const [y, m, d] = dateKey.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - start) / 86400000);
}

// La palabra del día sale siempre igual para todos en la misma fecha:
// se usa el número de día para "saltar" por la lista con un paso primo,
// así palabras parecidas (que están juntas por orden alfabético) no salen seguidas.
function dailyWord(dateKey = todayKey()) {
  const index = (dayNumber(dateKey) * 37) % SOLUTIONS.length;
  return SOLUTIONS[(index + SOLUTIONS.length) % SOLUTIONS.length];
}

// palabra al azar que NO esté en "played" (las que ya salieron en tus
// partidas). Si ya jugaste todas, vuelve a elegir entre la lista completa.
function randomWord(played = []) {
  const used = new Set(played);
  const fresh = SOLUTIONS.filter((word) => !used.has(word));
  const pool = fresh.length ? fresh : SOLUTIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// quita tildes y diéresis pero respeta la Ñ: 'ÁRBOL' → 'ARBOL', 'NIÑO' sigue igual
function normalize(text) {
  return text
    .toUpperCase()
    .replace(/Ñ/g, '#')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/#/g, 'Ñ');
}

// Revisa un intento contra la solución y devuelve un estado por letra:
//   'correct' → letra en su lugar (verde)
//   'present' → la letra está, pero en otro lugar (amarillo)
//   'absent'  → no está (gris)
// Se hace en dos pasadas para que las letras repetidas cuenten bien:
// si la solución tiene una sola A, solo una A del intento se pinta.
function evaluateGuess(guess, solution) {
  const guessLetters = [...guess];
  const solutionLetters = [...solution];
  const result = Array(WORD_LENGTH).fill('absent');
  const remaining = {};

  // 1ª pasada: verdes, y contamos las letras de la solución que sobran
  solutionLetters.forEach((letter, i) => {
    if (guessLetters[i] === letter) {
      result[i] = 'correct';
    } else {
      remaining[letter] = (remaining[letter] ?? 0) + 1;
    }
  });

  // 2ª pasada: amarillos, gastando las letras que sobraron
  guessLetters.forEach((letter, i) => {
    if (result[i] === 'correct') return;
    if (remaining[letter] > 0) {
      result[i] = 'present';
      remaining[letter] -= 1;
    }
  });

  return result;
}

// Estadísticas calculadas a partir de las filas de la tabla 'games'
// (solo partidas diarias terminadas). No se guardan aparte: se LEEN.
function computeStats(games) {
  const finished = games
    .filter((g) => g.mode === 'daily' && g.status !== 'playing')
    .sort((a, b) => a.date.localeCompare(b.date));

  const wins = finished.filter((g) => g.status === 'won');
  const distribution = Array(MAX_TRIES).fill(0);
  wins.forEach((g) => { distribution[g.guesses.length - 1] += 1; });

  // racha: días seguidos ganados
  let maxStreak = 0;
  let streak = 0;
  let prevDay = null;
  finished.forEach((g) => {
    const day = dayNumber(g.date);
    if (g.status === 'won') {
      streak = prevDay !== null && day === prevDay + 1 ? streak + 1 : 1;
    } else {
      streak = 0;
    }
    maxStreak = Math.max(maxStreak, streak);
    prevDay = day;
  });

  // la racha actual se pierde si el último día ganado no fue hoy ni ayer
  const today = dayNumber();
  const currentStreak = prevDay !== null && today - prevDay <= 1 ? streak : 0;

  return {
    played: finished.length,
    winRate: finished.length ? Math.round((wins.length / finished.length) * 100) : 0,
    currentStreak,
    maxStreak,
    distribution,
  };
}
