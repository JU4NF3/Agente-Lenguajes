// MODO DEVELOPER
// Cuando está activado, cada vez que el juego hace algo "por detrás"
// aparece una tarjetita que lo explica: qué operación CRUD fue, en una
// frase, y la línea de código que se ejecutó.
//
// app.js solo llama devLog('nombre-del-evento', datos). Aquí se decide
// qué mostrar. Si el modo está apagado, devLog() no hace nada.

const dev = {
  on: false,
  used: { C: false, R: false, U: false, D: false }, // operaciones ya explicadas
  seen: new Set(),                                   // explicaciones que salen una sola vez
};

// tipo → letra del contador, color y etiqueta
const DEV_TYPES = {
  create: { letter: 'C', label: 'CREATE' },
  read:   { letter: 'R', label: 'READ' },
  update: { letter: 'U', label: 'UPDATE' },
  delete: { letter: 'D', label: 'DELETE' },
  info:   { letter: null, label: 'DETRÁS' },
};

// recorta un id largo: '3f1c9a2e-41b0-...' → '3f1c9a2e…'
const shortId = (id) => `${String(id).slice(0, 8)}…`;

// Cada evento devuelve { type, title, text, code } a partir de los datos.
// once: true → solo se explica la primera vez (para no repetir lo mismo).
const DEV_EVENTS = {
  intro: () => ({
    type: 'info',
    title: 'Modo developer activado',
    text: 'Cada partida es una fila de una tabla llamada games, guardada en tu navegador. Mientras juegas te muestro qué pasa por detrás. Las letras C·R·U·D se encienden con cada operación (tócalas para ver la tabla). Para salir, toca Modo developer otra vez.',
  }),

  create: ({ row }) => ({
    type: 'create',
    title: 'Nueva fila',
    text: 'Empezó una partida: se insertó una fila nueva en la tabla, con 0 intentos y estado "playing".',
    code: `games.insert([{\n  mode: '${row.mode}',\n  guesses: [],\n  status: 'playing'\n}])\n// id generado: ${shortId(row.id)}`,
  }),

  load: ({ row }) => ({
    type: 'read',
    title: 'Partida recuperada',
    text: 'Ya existía una partida, así que se LEYÓ de la tabla. Por eso tus intentos siguen ahí aunque recargues la página.',
    code: row.mode === 'daily'
      ? `games.select({ mode: 'daily', date: '${row.date}' })\n// → 1 fila, ${row.guesses.length} intentos`
      : `games.select({ mode: 'practice', status: 'playing' })\n// → 1 fila, ${row.guesses.length} intentos`,
  }),

  typing: () => ({
    once: true,
    type: 'info',
    title: 'Todavía no se guarda nada',
    text: 'Las letras que escribes viven solo en una variable en memoria. Nada se guarda en la tabla hasta que pulses ENVIAR.',
    code: `state.current = '${state.current}'`,
  }),

  invalid: ({ guess, reason }) => ({
    type: 'info',
    title: 'Validación antes de guardar',
    text: reason === 'short'
      ? 'Faltan letras. Se revisa ANTES de tocar la tabla, así que no se hizo ningún UPDATE.'
      : `La palabra se busca en un Set de ${VALID_WORDS.size} palabras. Como no está, no se hizo ningún UPDATE.`,
    code: reason === 'short'
      ? `[...'${guess}'].length < 5  // true → se cancela`
      : `VALID_WORDS.has('${guess}')  // false → se cancela`,
  }),

  update: ({ before, after }) => {
    // la primera vez también se explica de dónde salen los colores
    const firstTime = !dev.seen.has('colors');
    dev.seen.add('colors');

    let text = after.status === 'playing'
      ? 'No se creó una fila nueva: se MODIFICÓ la misma, cambiando solo la columna guesses.'
      : 'El mismo UPDATE cambió también la columna status. La fila queda terminada.';
    if (firstTime) {
      text += ' Los colores los calcula evaluateGuess(): es pura lógica, no se guardan.';
    }

    return {
      type: 'update',
      title: after.status === 'playing' ? 'Intento guardado' : `Partida ${after.status === 'won' ? 'ganada' : 'perdida'}`,
      text,
      code: `games.update('${shortId(after.id)}', {\n  guesses: [${after.guesses.map((g) => `'${g}'`).join(', ')}],\n  status: '${after.status}'\n})\n// guesses: ${before.guesses.length} → ${after.guesses.length} intentos`,
    };
  },

  stats: ({ count }) => ({
    type: 'read',
    title: 'Estadísticas calculadas',
    text: 'Las estadísticas no están guardadas en ningún lado: se leen todas las partidas diarias y se calculan al momento.',
    code: `const { data } = games.select({ mode: 'daily' })\n// → ${count} fila${count === 1 ? '' : 's'}\ncomputeStats(data)`,
  }),

  history: ({ filter, count }) => ({
    type: 'read',
    title: 'Read con filtro',
    text: 'El historial es una consulta a la tabla. El filtro funciona como .eq() de Supabase.',
    code: `games.select(${filter === 'all' ? '' : `{ mode: '${filter}' }`})\n// → ${count} fila${count === 1 ? '' : 's'}`,
  }),

  delete: ({ id }) => ({
    type: 'delete',
    title: 'Fila borrada',
    text: 'Se eliminó la fila con ese id. Las estadísticas cambian solas porque se calculan leyendo la tabla.',
    code: `games.delete('${shortId(id)}')`,
  }),

  reset: ({ count }) => ({
    type: 'delete',
    title: 'Tabla vacía',
    text: 'Sin id, delete() borra TODAS las filas. Después se crea una partida nueva para seguir jugando.',
    code: `games.delete()  // ${count} fila${count === 1 ? '' : 's'} borrada${count === 1 ? '' : 's'}`,
  }),

  pref: ({ name, value }) => ({
    type: 'info',
    title: 'Esto no es una partida',
    text: 'Los ajustes son un solo valor en localStorage, no filas de la tabla games. Es lo mismo que hicimos con el tema en prueba2.js.',
    code: `localStorage.setItem('letrario:${name}', '${value}')`,
  }),

  complete: () => ({
    type: 'info',
    title: '¡CRUD completo!',
    text: 'Usaste las 4 operaciones: Create, Read, Update y Delete. Así funciona casi cualquier app que guarda datos.',
  }),
};

function devLog(event, payload = {}) {
  if (!dev.on) return;

  const info = DEV_EVENTS[event](payload);
  if (info.once) {
    if (dev.seen.has(event)) return;
    dev.seen.add(event);
  }
  showDevCard(info);

  const { letter } = DEV_TYPES[info.type];
  if (letter && !dev.used[letter]) {
    dev.used[letter] = true;
    renderDevCounter(letter);
    if (Object.values(dev.used).every(Boolean)) {
      setTimeout(() => devLog('complete'), 600);
    }
  }
}

//TARJETAS

const escapeHTML = (text) =>
  String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// Las tarjetas NO se cierran solas: se quedan hasta que pulses la ×.
// Si llega una nueva y ya no cabe, se va la más vieja.
function showDevCard({ type, title, text, code }) {
  const stack = document.getElementById('dev-stack');
  // en pantallas angostas cabe una sola tarjeta; en anchas, hasta 3
  const max = window.matchMedia('(min-width: 1000px)').matches ? 3 : 1;
  while (stack.children.length >= max) stack.firstElementChild.remove();

  const card = document.createElement('article');
  card.className = `dev-card ${type}`;
  card.innerHTML = `
    <header>
      <span class="dev-badge">${DEV_TYPES[type].label}</span>
      <strong>${escapeHTML(title)}</strong>
      <button class="dev-card-close" aria-label="Cerrar explicación" title="Cerrar">×</button>
    </header>
    <p>${escapeHTML(text)}</p>
    ${code ? `<pre><code>${escapeHTML(code)}</code></pre>` : ''}
  `;
  stack.append(card);
  bringStackToFront(stack);

  card.querySelector('.dev-card-close').addEventListener('click', () => closeDevCard(card));
}

function closeDevCard(card) {
  card.classList.add('leaving');
  card.addEventListener('animationend', () => {
    card.remove();
    const stack = document.getElementById('dev-stack');
    if (!stack.children.length && stack.hidePopover) stack.hidePopover();
  }, { once: true });
}

// Las ventanas <dialog> se dibujan en una "capa superior" por encima de todo.
// Un popover también va a esa capa, y queda encima del último que se abrió:
// cerrarlo y abrirlo de nuevo lo sube por encima de cualquier ventana abierta.
// Además, mientras hay una ventana abierta el navegador bloquea los clics
// FUERA de ella, así que las tarjetas se mueven adentro de la ventana.
function bringStackToFront(stack) {
  if (!stack.showPopover) return; // navegador viejo: se queda debajo, pero funciona
  const host = document.querySelector('dialog[open]') ?? document.body;
  if (stack.parentElement !== host) host.append(stack);
  if (stack.matches(':popover-open')) stack.hidePopover();
  stack.showPopover();
}

// al cerrarse una ventana, las tarjetas que estaban adentro vuelven al <body>
function watchDialogs() {
  const stack = document.getElementById('dev-stack');
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('close', () => {
      if (stack.parentElement !== dialog) return;
      document.body.append(stack);
      if (stack.children.length) bringStackToFront(stack);
    });
  });
}

//CONTADOR C·R·U·D Y TABLA EN VIVO

// enciende la letra de la operación recién usada, con un saltito
function renderDevCounter(justUsed) {
  document.querySelectorAll('#dev-crud [data-crud]').forEach((el) => {
    const letter = el.dataset.crud;
    el.classList.toggle('used', dev.used[letter]);
    if (letter === justUsed) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  });
}

// muestra la tabla tal como está guardada (JSON), con la fila actual primero
function openDevTable() {
  const { data } = games.select();
  const rows = (data ?? []).sort((a, b) => (a.id === state.game?.id ? -1 : b.id === state.game?.id ? 1 : 0));

  document.getElementById('dev-table-count').textContent =
    `${rows.length} fila${rows.length === 1 ? '' : 's'} en localStorage → 'letrario:games'`;

  document.getElementById('dev-table-rows').innerHTML = rows.map((row) => {
    // la solución de una partida sin terminar se tapa, para no hacer trampa
    const shown = row.status === 'playing' ? { ...row, solution: '•••••' } : row;
    const json = JSON.stringify(shown, null, 2);
    const current = row.id === state.game?.id;
    return `
      <div class="dev-row ${current ? 'current' : ''}">
        ${current ? '<span class="dev-row-tag">partida actual</span>' : ''}
        <pre><code>${escapeHTML(json)}</code></pre>
      </div>`;
  }).join('') || '<p class="empty">La tabla está vacía</p>';

  openDialog('dlg-dev-table');
}

function setDevMode(on) {
  dev.on = on;
  const chip = document.getElementById('dev-chip');
  chip.classList.toggle('off', !on);
  chip.setAttribute('aria-pressed', String(on));
  chip.title = on ? 'Desactivar modo developer' : 'Activar modo developer';
  document.getElementById('dev-crud').hidden = !on;
  document.getElementById('sw-dev').setAttribute('aria-checked', String(on));
  if (!on) {
    const stack = document.getElementById('dev-stack');
    stack.innerHTML = '';
    if (stack.hidePopover && stack.matches(':popover-open')) stack.hidePopover();
  }
}

function initDevMode() {
  setDevMode(readPref('dev') === 'on');
  watchDialogs();

  function toggleDevMode(on) {
    savePref('dev', on ? 'on' : 'off');
    setDevMode(on);
    if (on) devLog('intro');
    else showToast('Modo developer desactivado');
  }

  document.getElementById('sw-dev').addEventListener('click', () => {
    document.getElementById('dlg-settings').close();
    toggleDevMode(!dev.on);
  });

  // el botón prende y apaga; la tabla se abre desde el contador C·R·U·D
  document.getElementById('dev-chip').addEventListener('click', () => toggleDevMode(!dev.on));
  document.getElementById('dev-crud').addEventListener('click', openDevTable);

  document.getElementById('btn-dev-off').addEventListener('click', () => {
    document.getElementById('dlg-dev-table').close();
    toggleDevMode(false);
  });
}
