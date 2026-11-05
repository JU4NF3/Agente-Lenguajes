// INTERFAZ DEL JUEGO
// Une todo: lee/guarda partidas con db (storage.js), revisa intentos con
// game.js y pinta el tablero, el teclado y las ventanas.
//
// Cada partida es UNA FILA de la tabla 'games':
//   { id, mode, date, solution, guesses: [...], status, createdAt, updatedAt }
// CREATE  → al empezar una partida nueva          (startGame)
// READ    → al abrir la página, stats e historial (loadGame, openStats, renderHistory)
// UPDATE  → después de cada intento               (submitGuess)
// DELETE  → borrar del historial o borrar todo    (deleteGame, resetAll)

const games = db.from('games');

const state = {
  mode: 'daily',
  game: null,        // la fila de la partida actual
  current: '',       // letras escritas en la fila activa, aún sin enviar
  locked: false,     // true mientras corre la animación de revelar
};

const boardEl = document.getElementById('board');
const keyboardEl = document.getElementById('keyboard');

const WIN_MESSAGES = ['¡Genio!', '¡Magnífico!', '¡Impresionante!', '¡Muy bien!', '¡Bien!', '¡Por poco!'];
const STATUS_RANK = { absent: 1, present: 2, correct: 3 };

//PARTIDAS (CRUD sobre la tabla 'games')

// CREATE: inserta una fila nueva con la partida vacía
function startGame(mode) {
  // READ antes del CREATE: las palabras que ya salieron, para no repetirlas
  const played = (games.select().data ?? []).map((g) => g.solution);

  const { data, error } = games.insert([{
    mode,
    date: todayKey(),
    solution: mode === 'daily' ? dailyWord() : randomWord(played),
    guesses: [],
    status: 'playing',
  }]);

  if (error) {
    showToast('No se pudo guardar la partida');
    return null;
  }
  devLog('create', { row: data[0] });
  return data[0];
}

// READ: busca la partida que toca; si no existe, la crea
function loadGame(mode) {
  state.mode = mode;
  state.current = '';

  // diaria → la de hoy (puede estar ya terminada);
  // práctica → la última que quedó sin terminar
  const filter = mode === 'daily'
    ? { mode: 'daily', date: todayKey() }
    : { mode: 'practice', status: 'playing' };

  const { data } = games.select(filter);
  const existing = data && data.length ? data[data.length - 1] : null;

  if (existing) devLog('load', { row: existing });
  state.game = existing ?? startGame(mode);
  renderAll();
}

// UPDATE: guarda el intento nuevo y el estado de la partida
function saveGuess(guess) {
  const guesses = [...state.game.guesses, guess];
  let status = 'playing';
  if (guess === state.game.solution) status = 'won';
  else if (guesses.length === MAX_TRIES) status = 'lost';

  const { data, error } = games.update(state.game.id, { guesses, status });

  if (error || data.length === 0) {
    showToast('No se pudo guardar el intento');
    return null;
  }
  devLog('update', { before: state.game, after: data[0] });
  state.game = data[0];
  return state.game;
}

// DELETE: borra una partida del historial
function deleteGame(id) {
  const { data, error } = games.delete(id);
  if (error || data.length === 0) {
    showToast('No se pudo borrar');
    return;
  }
  devLog('delete', { id });
  // si borraste la partida que estás jugando, empieza una nueva
  if (state.game && state.game.id === id) loadGame(state.mode);
  renderHistory();
  showToast('Partida borrada');
}

// DELETE de toda la tabla
function resetAll() {
  const { data } = games.delete();
  devLog('reset', { count: data?.length ?? 0 });
  loadGame(state.mode);
  showToast('Historial y estadísticas borrados');
}

//TABLERO

function buildBoard() {
  boardEl.innerHTML = Array.from({ length: MAX_TRIES }, () =>
    `<div class="row">${'<div class="tile"></div>'.repeat(WORD_LENGTH)}</div>`
  ).join('');
}

function rowEl(index) {
  return boardEl.children[index];
}

// pinta todo el tablero a partir de la fila guardada (sin animaciones)
function renderBoard() {
  const { guesses, solution } = state.game;

  for (let r = 0; r < MAX_TRIES; r++) {
    const tiles = rowEl(r).children;
    const guess = guesses[r];
    const result = guess ? evaluateGuess(guess, solution) : null;
    const letters = guess ? [...guess] : r === guesses.length ? [...state.current] : [];

    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = tiles[c];
      tile.textContent = letters[c] ?? '';
      tile.className = 'tile';
      if (result) tile.classList.add(result[c]);
      else if (letters[c]) tile.classList.add('filled');
    }
  }
}

// solo la fila activa (cuando escribes o borras una letra)
function renderCurrentRow() {
  const tiles = rowEl(state.game.guesses.length).children;
  const letters = [...state.current];
  for (let c = 0; c < WORD_LENGTH; c++) {
    const had = tiles[c].textContent;
    tiles[c].textContent = letters[c] ?? '';
    tiles[c].classList.toggle('filled', Boolean(letters[c]));
    // reinicia la animación "pop" solo en la letra nueva
    if (!had && letters[c]) {
      tiles[c].classList.remove('filled');
      void tiles[c].offsetWidth;
      tiles[c].classList.add('filled');
    }
  }
}

//TECLADO

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKLÑ', '⏎ZXCVBNM⌫'];

function buildKeyboard() {
  keyboardEl.innerHTML = KEY_ROWS.map((row) => `
    <div class="kb-row">
      ${[...row].map((k) => {
        if (k === '⏎') return '<button class="key wide" data-key="Enter">ENVIAR</button>';
        if (k === '⌫') return '<button class="key wide" data-key="Backspace" aria-label="Borrar"><svg viewBox="0 0 24 24"><path d="M9 5h11v14H9l-6-7z M13 9l5 6 M18 9l-5 6"/></svg></button>';
        return `<button class="key" data-key="${k}">${k}</button>`;
      }).join('')}
    </div>
  `).join('');
}

// cada tecla toma el "mejor" color que haya tenido: verde > amarillo > gris
function renderKeyboard() {
  const best = {};
  state.game.guesses.forEach((guess) => {
    const result = evaluateGuess(guess, state.game.solution);
    [...guess].forEach((letter, i) => {
      if (!best[letter] || STATUS_RANK[result[i]] > STATUS_RANK[best[letter]]) {
        best[letter] = result[i];
      }
    });
  });

  keyboardEl.querySelectorAll('.key[data-key]').forEach((key) => {
    key.classList.remove('correct', 'present', 'absent');
    const status = best[key.dataset.key];
    if (status) key.classList.add(status);
  });
}

function renderAll() {
  renderBoard();
  renderKeyboard();
  renderPlayAgain();
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.setAttribute('aria-selected', String(btn.dataset.mode === state.mode));
  });
  // el CSS usa este atributo para deslizar la "pastilla" del modo elegido
  document.querySelector('.mode-switch').dataset.mode = state.mode;
  document.getElementById('mode-label').textContent =
    state.mode === 'daily' ? `Palabra del día · #${dayNumber() + 1}` : 'Modo práctica';
}

//JUGAR

function handleKey(key) {
  if (state.locked || !state.game) return;

  // partida terminada: Enter hace lo mismo que el botón "Jugar de nuevo"
  if (state.game.status !== 'playing') {
    if (key === 'Enter') playAgain();
    return;
  }

  if (key === 'Enter') return submitGuess();

  if (key === 'Backspace') {
    state.current = [...state.current].slice(0, -1).join('');
    return renderCurrentRow();
  }

  if (/^[A-ZÑ]$/.test(key) && [...state.current].length < WORD_LENGTH) {
    state.current += key;
    renderCurrentRow();
    devLog('typing');
  }
}

function submitGuess() {
  const guess = state.current;
  const row = rowEl(state.game.guesses.length);

  if ([...guess].length < WORD_LENGTH) {
    devLog('invalid', { guess, reason: 'short' });
    return rejectRow(row, 'Faltan letras');
  }
  if (!VALID_WORDS.has(guess)) {
    devLog('invalid', { guess, reason: 'unknown' });
    return rejectRow(row, 'No está en la lista de palabras');
  }

  const game = saveGuess(guess);
  if (!game) return;
  state.current = '';
  revealRow(row, guess, game);
}

function rejectRow(row, message) {
  showToast(message);
  row.classList.remove('shake');
  void row.offsetWidth;
  row.classList.add('shake');
}

// voltea las 5 casillas una tras otra; a la mitad del giro cambia el color
function revealRow(row, guess, game) {
  state.locked = true;
  const result = evaluateGuess(guess, game.solution);
  const tiles = [...row.children];
  const STEP = 280;

  tiles.forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add('flip');
      setTimeout(() => {
        tile.classList.remove('filled');
        tile.classList.add(result[i]);
      }, 250);
    }, i * STEP);
  });

  setTimeout(() => {
    tiles.forEach((t) => t.classList.remove('flip'));
    renderKeyboard();
    state.locked = false;
    finishTurn(row, game);
  }, WORD_LENGTH * STEP + 250);
}

function finishTurn(row, game) {
  if (game.status === 'won') {
    showToast(WIN_MESSAGES[game.guesses.length - 1]);
    [...row.children].forEach((tile, i) => {
      tile.style.animationDelay = `${i * 90}ms`;
      tile.classList.add('bounce');
    });
  } else if (game.status === 'lost') {
    showToast(`La palabra era ${game.solution}`, 4000);
  } else {
    return;
  }

  renderPlayAgain();
  if (state.mode === 'daily') setTimeout(openStats, 1800);
}

function newPractice() {
  state.game = startGame('practice');
  state.current = '';
  renderAll();
}

// "Jugar de nuevo": siempre una palabra nueva (en modo práctica),
// aunque vengas de terminar la diaria
function playAgain() {
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  state.mode = 'practice';
  newPractice();
}

// el botón solo aparece cuando la partida ya terminó
function renderPlayAgain() {
  document.getElementById('btn-play-again').hidden = state.game.status === 'playing';
}

//ESTADÍSTICAS

function openStats() {
  const { data } = games.select({ mode: 'daily' });
  const stats = computeStats(data ?? []);

  document.getElementById('st-played').textContent = stats.played;
  document.getElementById('st-rate').textContent = stats.winRate;
  document.getElementById('st-streak').textContent = stats.currentStreak;
  document.getElementById('st-max').textContent = stats.maxStreak;

  const max = Math.max(1, ...stats.distribution);
  const today = data?.find((g) => g.date === todayKey() && g.status === 'won');
  document.getElementById('distribution').innerHTML = stats.distribution.map((count, i) => `
    <div class="dist-row">
      <span>${i + 1}</span>
      <div class="dist-bar ${today && today.guesses.length === i + 1 ? 'highlight' : ''}"
           style="width: ${Math.max(8, (count / max) * 100)}%">${count}</div>
    </div>
  `).join('');

  // compartir solo tiene sentido con la diaria terminada
  const daily = data?.find((g) => g.date === todayKey());
  document.getElementById('btn-share').hidden = !daily || daily.status === 'playing';

  openDialog('dlg-stats');
  devLog('stats', { count: data?.length ?? 0 });
}

function updateCountdown() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const secs = Math.floor((midnight - now) / 1000);
  const hh = String(Math.floor(secs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  document.getElementById('countdown').textContent = `${hh}:${mm}:${ss}`;

  // si cambió el día con la página abierta, carga la nueva palabra
  if (state.game && state.mode === 'daily' && state.game.date !== todayKey()) {
    loadGame('daily');
  }
}

async function shareResult() {
  const { data } = games.select({ mode: 'daily', date: todayKey() });
  const game = data?.[0];
  if (!game) return;

  const emoji = { correct: '🟩', present: '🟨', absent: '⬜' };
  const grid = game.guesses
    .map((g) => evaluateGuess(g, game.solution).map((s) => emoji[s]).join(''))
    .join('\n');
  const score = game.status === 'won' ? game.guesses.length : 'X';
  const text = `Letrario #${dayNumber() + 1} ${score}/${MAX_TRIES}\n\n${grid}`;

  try {
    await navigator.clipboard.writeText(text);
    showToast('Resultado copiado');
  } catch {
    showToast('No se pudo copiar');
  }
}

//HISTORIAL (Read + Delete)

// explain: true solo cuando el jugador abre o filtra el historial (no al
// repintarlo después de borrar), para que el modo developer no repita el Read
function renderHistory(explain = false) {
  const filter = document.getElementById('history-filter').value;
  const { data } = games.select(filter === 'all' ? {} : { mode: filter });
  const list = document.getElementById('history-list');

  // más recientes primero
  const rows = (data ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (explain) devLog('history', { filter, count: rows.length });

  if (rows.length === 0) {
    list.innerHTML = '<li class="empty">Todavía no hay partidas</li>';
    return;
  }

  const statusText = { won: 'Ganada', lost: 'Perdida', playing: 'En juego' };

  list.innerHTML = rows.map((g, i) => {
    const cells = g.guesses
      .map((guess) => evaluateGuess(guess, g.solution).map((s) => `<i class="${s}"></i>`).join(''))
      .join('');
    // la solución solo se muestra si la partida ya terminó (no hacer trampa)
    const word = g.status === 'playing' ? '?????' : g.solution;
    return `
      <li class="history-item" style="--i: ${Math.min(i, 10)}">
        <div class="grid-mini">${cells || '<i></i>'.repeat(WORD_LENGTH)}</div>
        <div class="history-info">
          <strong>${word}</strong><span class="badge ${g.status}">${statusText[g.status]}</span>
          <span>${g.mode === 'daily' ? 'Diaria' : 'Práctica'} · ${g.date} · ${g.guesses.length}/${MAX_TRIES} intentos</span>
        </div>
        <button class="btn danger small" data-delete="${g.id}">Borrar</button>
      </li>
    `;
  }).join('');
}

// borrar en dos clics, igual que en prueba2.html: el primero pide confirmación
document.getElementById('history-list').addEventListener('click', (event) => {
  const btn = event.target.closest('[data-delete]');
  if (!btn) return;

  if (!btn.classList.contains('confirm')) {
    btn.classList.add('confirm');
    btn.textContent = '¿Seguro?';
    return;
  }
  deleteGame(btn.dataset.delete);
});

document.getElementById('history-filter').addEventListener('change', () => renderHistory(true));

//LISTA DESPLEGABLE CON ESTILO
// Mismo truco que mejorarSelect() en prueba2.js: las opciones de un
// <select> las dibuja el navegador y no se pueden estilizar, así que lo
// ocultamos y ponemos al lado nuestra propia lista. Al elegir, cambiamos el
// valor del <select> oculto y disparamos su "change": el resto del código
// (renderHistory) sigue usando select.value sin enterarse del cambio.
function enhanceSelect(select) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dropdown';
  select.before(wrapper);
  wrapper.append(select);
  select.hidden = true;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dropdown-btn';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  const list = document.createElement('ul');
  list.className = 'dropdown-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;

  wrapper.append(button, list);

  function update() {
    button.querySelector('span').textContent = select.options[select.selectedIndex].textContent;
  }

  function open() {
    list.innerHTML = [...select.options].map((op) => `
      <li><button type="button" role="option" data-value="${op.value}"
                  aria-selected="${op.value === select.value}">${op.textContent}</button></li>
    `).join('');
    list.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    (list.querySelector('[aria-selected="true"]') ?? list.querySelector('button')).focus();
  }

  function close() {
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  button.addEventListener('click', () => (list.hidden ? open() : close()));

  list.addEventListener('click', (event) => {
    const option = event.target.closest('[data-value]');
    if (!option) return;
    close();
    button.focus();
    if (select.value !== option.dataset.value) {
      select.value = option.dataset.value;
      update();
      select.dispatchEvent(new Event('change'));
    }
  });

  // teclado: ↑ ↓ entre opciones; Escape cierra la lista (y no la ventana)
  list.addEventListener('keydown', (event) => {
    const options = [...list.querySelectorAll('button')];
    const current = options.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      options[(current + step + options.length) % options.length].focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
      button.focus();
    }
  });

  // clic fuera de la lista → se cierra
  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) close();
  });

  update();
  return { update, close };
}

const historyFilter = enhanceSelect(document.getElementById('history-filter'));

//VENTANAS Y AVISOS

function openDialog(id) {
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  document.getElementById(id).showModal();
}

document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('click', (event) => {
    // botón × o clic en el fondo oscuro → cerrar
    if (event.target.closest('.modal-close') || event.target === dialog) dialog.close();
  });
});

function showToast(text, ms = 1600) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { toast.hidden = true; }, ms);
}

//AJUSTES (preferencias simples, fuera de la tabla de partidas)

function savePref(name, value) {
  try { localStorage.setItem(`letrario:${name}`, value); } catch {}
}
function readPref(name) {
  try { return localStorage.getItem(`letrario:${name}`); } catch { return null; }
}

function applyPrefs() {
  const dark = readPref('theme') === 'dark';
  const contrast = readPref('contrast') === 'high';
  if (dark) document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  if (contrast) document.documentElement.dataset.contrast = 'high';
  else delete document.documentElement.dataset.contrast;
  document.getElementById('sw-theme').setAttribute('aria-checked', String(dark));
  document.getElementById('sw-contrast').setAttribute('aria-checked', String(contrast));
}

document.getElementById('sw-theme').addEventListener('click', () => {
  const value = readPref('theme') === 'dark' ? 'light' : 'dark';
  savePref('theme', value);
  applyPrefs();
  devLog('pref', { name: 'theme', value });
});
document.getElementById('sw-contrast').addEventListener('click', () => {
  const value = readPref('contrast') === 'high' ? 'normal' : 'high';
  savePref('contrast', value);
  applyPrefs();
  devLog('pref', { name: 'contrast', value });
});

const btnReset = document.getElementById('btn-reset');
btnReset.addEventListener('click', () => {
  if (!btnReset.classList.contains('confirm')) {
    btnReset.classList.add('confirm');
    btnReset.textContent = '¿Seguro?';
    return;
  }
  resetAll();
  document.getElementById('dlg-settings').close();
});
document.getElementById('dlg-settings').addEventListener('close', () => {
  btnReset.classList.remove('confirm');
  btnReset.textContent = 'Borrar';
});

//EVENTOS

keyboardEl.addEventListener('click', (event) => {
  const key = event.target.closest('[data-key]');
  if (key) {
    handleKey(key.dataset.key);
    key.blur(); // si no, Enter en el teclado físico "presionaría" este botón
  }
});

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (document.querySelector('dialog[open]')) return;

  if (event.key === 'Enter' || event.key === 'Backspace') {
    event.preventDefault();
    handleKey(event.key);
    return;
  }
  const letter = normalize(event.key);
  if (/^[A-ZÑ]$/.test(letter)) handleKey(letter);
});

document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.mode !== state.mode && !state.locked) loadGame(btn.dataset.mode);
  });
});

document.getElementById('btn-help').addEventListener('click', () => openDialog('dlg-help'));
document.getElementById('btn-stats').addEventListener('click', openStats);
document.getElementById('btn-settings').addEventListener('click', () => openDialog('dlg-settings'));
document.getElementById('btn-share').addEventListener('click', shareResult);
document.getElementById('btn-play-again').addEventListener('click', playAgain);
document.getElementById('btn-stats-again').addEventListener('click', playAgain);
document.getElementById('btn-history').addEventListener('click', () => {
  document.getElementById('history-filter').value = 'all';
  historyFilter.update();
  historyFilter.close();
  openDialog('dlg-history'); // primero la ventana, para que la tarjeta dev quede encima
  renderHistory(true);
});

//INICIO

buildBoard();
buildKeyboard();
applyPrefs();
initDevMode(); // antes de loadGame, para que explique el primer Read / Create
loadGame('daily');
updateCountdown();
setInterval(updateCountdown, 1000);

// primera visita (tabla vacía salvo la partida recién creada) → cómo jugar
if (games.select().data?.length === 1 && state.game.guesses.length === 0) {
  openDialog('dlg-help');
}
