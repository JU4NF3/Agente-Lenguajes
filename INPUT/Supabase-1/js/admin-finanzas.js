// ============================================================
//  ADMIN: FINANZAS
//  Ventas de los pedidos PAGADOS, como una gráfica de inversiones:
//   - indicadores: ventas del periodo con su flecha (▲ verde si subió
//     frente al periodo anterior, ▼ roja si bajó, ▬ gris si quedó igual),
//     pedidos pagados, ticket promedio y cancelados;
//   - gráfica de línea con las ventas de cada día (verde o roja según la
//     tendencia del periodo), con recuadro al pasar el mouse o con teclado;
//   - tabla "Ventas por día" con la flecha de cambio en cada fila.
//
//  Pagado = 'confirmado' (Preparando), 'enviado' o 'entregado'. Un pedido
//  'cancelado' no cuenta: el dinero se devolvió y el stock volvió.
//  "Ventas" = el total cobrado (pedidos_con_total). La tienda no guarda el
//  costo de los productos, así que aquí ventas = ganancias brutas.
//
//  No consulta Supabase: usa pedidosAdmin, que ya llenó admin-pedidos.js.
//  admin-pedidos.js llama a pintarFinanzas() cada vez que pinta la tabla
//  de pedidos (al cargar, al cambiar un estado...) y limpiarFinanzas() al
//  cerrar sesión. Usa formatoPesos() de admin.js.
// ============================================================

const ESTADOS_PAGADOS = ['confirmado', 'enviado', 'entregado'];

const kpisFinanzas = document.getElementById('kpis-finanzas');
const graficaFinanzas = document.getElementById('grafica-finanzas');
const tablaFinanzas = document.getElementById('tabla-finanzas');
const periodoFinanzas = document.getElementById('periodo-finanzas');
const botonesRango = document.querySelectorAll('.rango-finanzas button');

let rangoDias = 30;   // 7, 30 o null (= "Todo")
let serieActual = []; // los días que dibuja la gráfica (para el recuadro)

// ---- AYUDAS ----
function inicioDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sumarDias(fecha, n) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + n);
  return d;
}

// "2026-11-19": clave para agrupar por día (en la hora de este computador)
function claveDia(fecha) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fechaDelPedido(p) {
  return new Date(p.confirmado_en ?? p.created_at);
}

// "21 oct" (sin el "de", para que quepa en el eje)
function fechaCortaFin(d) {
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace(' de ', ' ');
}

// Para el eje y la etiqueta final: 1.250.000 → "$1,3 M", 85.000 → "$85 mil"
function pesosCompactos(v) {
  if (v >= 1e6) return '$' + (v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M';
  if (v >= 1e3) return '$' + Math.round(v / 1e3).toLocaleString('es-CO') + ' mil';
  return '$' + Math.round(v);
}

// Compara dos valores y devuelve la dirección y el texto de la flecha.
// Sin valor anterior no hay porcentaje posible: se dice "Nuevo".
function compararValores(actual, anterior) {
  if (anterior === null || anterior === undefined) return null;
  if (actual === anterior) return { dir: 'igual', flecha: '▬', texto: 'Sin cambio' };
  if (anterior === 0) return { dir: 'sube', flecha: '▲', texto: 'Nuevo' };
  const pct = ((actual - anterior) / anterior) * 100;
  const texto = (pct > 0 ? '+' : '') + pct.toLocaleString('es-CO', { maximumFractionDigits: 1 }) + '%';
  return pct > 0
    ? { dir: 'sube', flecha: '▲', texto }
    : { dir: 'baja', flecha: '▼', texto };
}

// <span class="cambio sube"><span class="flecha">▲</span> +12%</span> (con DOM, no innerHTML)
function elementoCambio(cambio, vsTexto) {
  const span = document.createElement('span');
  if (!cambio) {
    span.className = 'cambio igual';
    span.textContent = '—';
    return span;
  }
  span.className = `cambio ${cambio.dir}`;
  const flecha = document.createElement('span');
  flecha.className = 'flecha';
  flecha.setAttribute('aria-hidden', 'true');
  flecha.textContent = cambio.flecha;
  const palabra = { sube: 'Subió', baja: 'Bajó', igual: '' }[cambio.dir];
  // el lector de pantalla oye "Subió +12%", no "triángulo"
  const texto = document.createElement('span');
  texto.textContent = cambio.texto;
  if (palabra) texto.setAttribute('aria-label', `${palabra} ${cambio.texto}`);
  span.append(flecha, texto);
  if (vsTexto) {
    const vs = document.createElement('span');
    vs.className = 'cambio-vs';
    vs.textContent = vsTexto;
    span.append(vs);
  }
  return span;
}

// ---- 1) CALCULAR ----
function calcularFinanzas(pedidos) {
  const hoy = inicioDelDia(new Date());
  const pagados = pedidos.filter((p) => ESTADOS_PAGADOS.includes(p.estado));
  const cancelados = pedidos.filter((p) => p.estado === 'cancelado');

  // Desde cuándo: N días hasta hoy, o desde el primer pedido ("Todo")
  let desde;
  if (rangoDias) {
    desde = sumarDias(hoy, -(rangoDias - 1));
  } else {
    const fechas = [...pagados, ...cancelados].map(fechaDelPedido);
    desde = fechas.length ? inicioDelDia(new Date(Math.min(...fechas))) : hoy;
  }
  const hasta = sumarDias(hoy, 1); // exclusivo: incluye todo el día de hoy

  // Un casillero por día (los días sin ventas quedan en 0: la línea baja)
  const dias = [];
  const porClave = {};
  for (let d = new Date(desde); d < hasta; d = sumarDias(d, 1)) {
    const dia = { fecha: new Date(d), ventas: 0, pedidos: 0 };
    dias.push(dia);
    porClave[claveDia(d)] = dia;
  }

  pagados.forEach((p) => {
    const dia = porClave[claveDia(fechaDelPedido(p))];
    if (dia) {
      dia.ventas += Number(p.total ?? 0);
      dia.pedidos += 1;
    }
  });

  const enRango = (p) => { const f = fechaDelPedido(p); return f >= desde && f < hasta; };
  const ventas = dias.reduce((s, d) => s + d.ventas, 0);
  const numPedidos = dias.reduce((s, d) => s + d.pedidos, 0);
  const canceladosRango = cancelados.filter(enRango);

  // El periodo anterior del mismo largo (solo con 7 o 30 días)
  let ventasAnteriores = null;
  if (rangoDias) {
    const antDesde = sumarDias(desde, -rangoDias);
    ventasAnteriores = pagados
      .filter((p) => { const f = fechaDelPedido(p); return f >= antDesde && f < desde; })
      .reduce((s, p) => s + Number(p.total ?? 0), 0);
  }

  return {
    dias,
    desde,
    ventas,
    numPedidos,
    ticket: numPedidos ? ventas / numPedidos : 0,
    ventasAnteriores,
    canceladosCantidad: canceladosRango.length,
    canceladosMonto: canceladosRango.reduce((s, p) => s + Number(p.total ?? 0), 0),
    hayVentasAlgunaVez: pagados.length > 0,
  };
}

// ---- 2) PINTAR TODO ----
function pintarFinanzas() {
  const pedidos = typeof pedidosAdmin !== 'undefined' ? pedidosAdmin : [];
  const datos = calcularFinanzas(pedidos);

  periodoFinanzas.textContent = rangoDias
    ? `(últimos ${rangoDias} días)`
    : `(desde el ${datos.desde.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })})`;

  pintarKpis(datos);
  pintarGrafica(datos);
  pintarTablaFinanzas(datos);
}

function limpiarFinanzas() {
  serieActual = [];
  kpisFinanzas.replaceChildren();
  graficaFinanzas.innerHTML = '<p class="grafica-vacia">Cargando finanzas...</p>';
  tablaFinanzas.className = 'vacio';
  tablaFinanzas.textContent = 'Cargando...';
  periodoFinanzas.textContent = '';
}

// ---- 3) INDICADORES ----
function crearKpi(rotulo, valor, nota, principal = false) {
  const div = document.createElement('div');
  div.className = principal ? 'kpi principal' : 'kpi';
  const r = document.createElement('span');
  r.className = 'kpi-rotulo';
  r.textContent = rotulo;
  const v = document.createElement('span');
  v.className = 'kpi-valor';
  v.textContent = valor;
  div.append(r, v);
  if (nota) div.append(nota);
  return div;
}

function nota(texto) {
  const span = document.createElement('span');
  span.className = 'kpi-nota';
  span.textContent = texto;
  return span;
}

function pintarKpis(datos) {
  // La flecha del número principal: este periodo vs el anterior
  const cambio = compararValores(datos.ventas, datos.ventasAnteriores);
  const notaVentas = rangoDias
    ? elementoCambio(cambio, `vs ${rangoDias} días anteriores`)
    : nota('Todas las ventas de la tienda');

  kpisFinanzas.replaceChildren(
    crearKpi('Ventas del periodo', formatoPesos(datos.ventas), notaVentas, true),
    crearKpi('Pedidos pagados', String(datos.numPedidos), nota('Preparando, en camino y entregados')),
    crearKpi('Ticket promedio', datos.numPedidos ? formatoPesos(datos.ticket) : '—', nota('Venta promedio por pedido')),
    crearKpi('Cancelados', String(datos.canceladosCantidad),
      nota(datos.canceladosCantidad ? `${formatoPesos(datos.canceladosMonto)} devueltos` : 'Ninguno en el periodo')),
  );
}

// ---- 4) GRÁFICA (SVG a mano: una línea, su área y un eje) ----
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

// Tope "redondo" del eje Y y su paso (ej. 1.730.000 → tope 2.000.000, paso 500.000)
function escalaBonita(max) {
  if (max <= 0) return { tope: 100000, paso: 25000 };
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / pot;
  const lindo = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  const paso = lindo * pot;
  return { tope: Math.ceil(max / paso) * paso, paso };
}

function pintarGrafica(datos) {
  serieActual = datos.dias;

  if (!datos.hayVentasAlgunaVez) {
    graficaFinanzas.innerHTML =
      '<p class="grafica-vacia">Todavía no hay pedidos pagados, así que aún no hay ganancias que mostrar.</p>';
    return;
  }

  // Color de la línea = tendencia del periodo (como en la bolsa).
  // Con "Todo" no hay periodo anterior: se compara el primer día con ventas
  // contra el último.
  let cambio = compararValores(datos.ventas, datos.ventasAnteriores);
  if (!rangoDias) {
    const conVentas = datos.dias.filter((d) => d.ventas > 0);
    cambio = conVentas.length > 1
      ? compararValores(conVentas[conVentas.length - 1].ventas, conVentas[0].ventas)
      : { dir: 'sube' };
  }
  const tono = { sube: '--fin-sube', baja: '--fin-baja', igual: '--fin-igual' }[cambio?.dir ?? 'igual'];
  const color = `var(${tono})`;

  const ancho = Math.max(graficaFinanzas.clientWidth, 300);
  const alto = 260;
  const m = { arriba: 16, derecha: 76, abajo: 28, izquierda: 64 };
  const w = ancho - m.izquierda - m.derecha;
  const h = alto - m.arriba - m.abajo;

  const maxVentas = Math.max(...datos.dias.map((d) => d.ventas));
  const { tope, paso } = escalaBonita(maxVentas);
  const n = datos.dias.length;
  const x = (i) => m.izquierda + (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v) => m.arriba + h - (v / tope) * h;

  const svg = svgEl('svg', {
    viewBox: `0 0 ${ancho} ${alto}`,
    role: 'img',
    tabindex: '0',
    'aria-label': `Ventas por día. Total del periodo ${formatoPesos(datos.ventas)}. Usa las flechas izquierda y derecha para recorrer los días.`,
  });

  // Rejilla y eje Y: líneas finas grises, números redondos
  for (let v = 0; v <= tope + 1; v += paso) {
    svg.append(svgEl('line', {
      x1: m.izquierda, x2: m.izquierda + w, y1: y(v), y2: y(v),
      stroke: 'var(--fin-linea)', 'stroke-width': 1,
    }));
    const t = svgEl('text', { x: m.izquierda - 10, y: y(v) + 4, 'text-anchor': 'end', class: 'eje-texto' });
    t.textContent = pesosCompactos(v);
    svg.append(t);
  }

  // Eje X: hasta 5 fechas, una cada ~90px como mínimo (en celular salen
  // menos, para que no se monten). Se cuentan hacia atrás desde HOY con un
  // paso fijo de días: así hoy siempre aparece y quedan a igual distancia.
  const marcas = Math.max(2, Math.min(5, Math.floor(w / 90)));
  const pasoDias = Math.max(1, Math.ceil((n - 1) / (marcas - 1)));
  for (let i = n - 1; i >= 0; i -= pasoDias) {
    const t = svgEl('text', {
      x: x(i), y: alto - 6,
      'text-anchor': n === 1 ? 'middle' : i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle',
      class: 'eje-texto',
    });
    t.textContent = fechaCortaFin(datos.dias[i].fecha);
    svg.append(t);
  }

  // Área (lavado al 10%) y línea de 2px
  const puntos = datos.dias.map((d, i) => `${x(i)},${y(d.ventas)}`);
  svg.append(svgEl('path', {
    d: `M${x(0)},${y(0)} L${puntos.join(' L')} L${x(n - 1)},${y(0)} Z`,
    fill: color, 'fill-opacity': 0.1, stroke: 'none',
  }));
  svg.append(svgEl('path', {
    d: `M${puntos.join(' L')}`,
    fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
  }));

  // Punto final con anillo blanco y su valor al lado (la única etiqueta fija)
  const ultimo = datos.dias[n - 1];
  svg.append(svgEl('circle', {
    cx: x(n - 1), cy: y(ultimo.ventas), r: 4.5, fill: color, stroke: '#ffffff', 'stroke-width': 2,
  }));
  const etiqueta = svgEl('text', { x: x(n - 1) + 10, y: y(ultimo.ventas) + 4, class: 'valor-final' });
  etiqueta.textContent = pesosCompactos(ultimo.ventas);
  svg.append(etiqueta);

  // Capa del mouse: línea vertical + punto que siguen al día más cercano
  const guia = svgEl('line', {
    y1: m.arriba, y2: m.arriba + h, stroke: '#0a0a0a', 'stroke-width': 1, visibility: 'hidden',
  });
  const marcador = svgEl('circle', {
    r: 5, fill: color, stroke: '#ffffff', 'stroke-width': 2, visibility: 'hidden',
  });
  const zona = svgEl('rect', {
    x: m.izquierda - 8, y: m.arriba, width: w + 16, height: h, fill: 'transparent',
  });
  svg.append(guia, marcador, zona);

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip-fin';
  tooltip.hidden = true;

  graficaFinanzas.replaceChildren(svg, tooltip);

  let indice = n - 1;

  function mostrar(i) {
    indice = i;
    const d = datos.dias[i];
    const cx = x(i);
    const cy = y(d.ventas);
    guia.setAttribute('x1', cx);
    guia.setAttribute('x2', cx);
    guia.setAttribute('visibility', 'visible');
    marcador.setAttribute('cx', cx);
    marcador.setAttribute('cy', cy);
    marcador.setAttribute('visibility', 'visible');

    // El valor manda (en grande); la fecha y los pedidos, en gris
    const valor = document.createElement('strong');
    valor.textContent = formatoPesos(d.ventas);
    const fecha = document.createElement('span');
    fecha.textContent = d.fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' });
    const pedidosTxt = document.createElement('span');
    pedidosTxt.textContent = `${d.pedidos} ${d.pedidos === 1 ? 'pedido pagado' : 'pedidos pagados'}`;
    const cambioDia = i > 0
      ? elementoCambio(compararValores(d.ventas, datos.dias[i - 1].ventas), 'vs día anterior')
      : null;
    tooltip.replaceChildren(valor, fecha, pedidosTxt, ...(cambioDia ? [cambioDia] : []));
    tooltip.hidden = false;

    // a la derecha del punto, o a la izquierda si no cabe
    const escala = graficaFinanzas.clientWidth / ancho;
    const izq = cx * escala;
    const anchoTip = tooltip.offsetWidth;
    tooltip.style.left = (izq + 14 + anchoTip > graficaFinanzas.clientWidth ? izq - anchoTip - 14 : izq + 14) + 'px';
    tooltip.style.top = Math.max(0, cy * (svg.clientHeight / alto) - 20) + 'px';
  }

  function ocultar() {
    guia.setAttribute('visibility', 'hidden');
    marcador.setAttribute('visibility', 'hidden');
    tooltip.hidden = true;
  }

  // el día más cercano al mouse (no hay que atinarle a la línea)
  zona.addEventListener('pointermove', (e) => {
    const caja = svg.getBoundingClientRect();
    const px = ((e.clientX - caja.left) / caja.width) * ancho;
    const i = n === 1 ? 0 : Math.round(((px - m.izquierda) / w) * (n - 1));
    mostrar(Math.min(n - 1, Math.max(0, i)));
  });
  zona.addEventListener('pointerleave', ocultar);

  // teclado: Tab a la gráfica y flechas ← → entre días
  svg.addEventListener('focus', () => mostrar(indice));
  svg.addEventListener('blur', ocultar);
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      mostrar(Math.min(n - 1, Math.max(0, indice + (e.key === 'ArrowRight' ? 1 : -1))));
    } else if (e.key === 'Escape') {
      ocultar();
    }
  });
}

// Al cambiar el ancho de la ventana, la gráfica se vuelve a dibujar
let anchoAnterior = 0;
new ResizeObserver(() => {
  const ancho = graficaFinanzas.clientWidth;
  if (ancho && Math.abs(ancho - anchoAnterior) > 4 && serieActual.length) {
    anchoAnterior = ancho;
    pintarFinanzas();
  }
}).observe(graficaFinanzas);

// ---- 5) TABLA "VENTAS POR DÍA" ----
// Solo los días con ventas, del más nuevo al más viejo. El cambio se
// compara con el día ANTERIOR que tuvo ventas.
function pintarTablaFinanzas(datos) {
  const conVentas = datos.dias.filter((d) => d.pedidos > 0);

  if (conVentas.length === 0) {
    tablaFinanzas.className = 'vacio';
    tablaFinanzas.textContent = datos.hayVentasAlgunaVez
      ? 'No hubo ventas en este periodo.'
      : 'Todavía no hay pedidos pagados ni ganancias.';
    return;
  }

  const tbody = document.createElement('tbody');
  conVentas.forEach((d, i) => {
    const anterior = i > 0 ? conVentas[i - 1] : null;
    const tr = document.createElement('tr');

    const tdFecha = document.createElement('td');
    tdFecha.className = 'num';
    tdFecha.textContent = d.fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    const tdPedidos = document.createElement('td');
    tdPedidos.className = 'num';
    tdPedidos.textContent = d.pedidos;

    const tdVentas = document.createElement('td');
    tdVentas.className = 'num';
    tdVentas.textContent = formatoPesos(d.ventas);

    const tdCambio = document.createElement('td');
    tdCambio.append(anterior
      ? elementoCambio(compararValores(d.ventas, anterior.ventas))
      : Object.assign(document.createElement('small'), { textContent: 'Primera venta del periodo' }));

    tr.append(tdFecha, tdPedidos, tdVentas, tdCambio);
    tbody.prepend(tr); // el más nuevo arriba
  });

  const tabla = document.createElement('table');
  tabla.className = 'tabla-datos';
  tabla.innerHTML = '<thead><tr><th>Fecha</th><th>Pedidos</th><th>Ventas</th><th>Cambio vs día anterior con ventas</th></tr></thead>';
  tabla.append(tbody);

  const envoltura = document.createElement('div');
  envoltura.className = 'tabla-wrap';
  envoltura.append(tabla);

  tablaFinanzas.className = '';
  tablaFinanzas.replaceChildren(envoltura);
}

// ---- 6) PERIODO: 7 días / 30 días / Todo ----
botonesRango.forEach((btn) => {
  btn.addEventListener('click', () => {
    rangoDias = btn.dataset.dias === 'todo' ? null : Number(btn.dataset.dias);
    botonesRango.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    pintarFinanzas();
  });
});
