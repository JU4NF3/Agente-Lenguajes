// ============================================================
//  MIS PEDIDOS
//  Lista los pedidos del cliente con sesión (todos menos el carrito
//  abierto), del más nuevo al más viejo. Cada tarjeta lleva a
//  estado-pedido.html?id=N, que muestra el seguimiento y el detalle.
//  El RLS de pedidos ya filtra por cliente; el .eq('cliente_id') es
//  para que la consulta diga lo que queremos aunque el RLS cambie.
// ============================================================

const lista = document.getElementById('lista-pedidos');

// Texto que se ve en la pastilla de cada estado
const NOMBRE_ESTADO = {
  confirmado: 'Preparando',
  enviado: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

function formatoPesos(valor) {
  return '$' + Math.round(valor).toLocaleString('es-CO');
}

function mostrarVacio(html) {
  lista.innerHTML = `<p class="vacio">${html}</p>`;
}

async function cargarPedidos() {
  const { data: sesion } = await db.auth.getUser();
  if (!sesion.user) {
    mostrarVacio('Inicia sesión en <a href="cliente.html">Mi cuenta</a> para ver tus pedidos.');
    return;
  }

  // 1) Los pedidos (sin el carrito abierto: ese todavía no es un pedido)
  const { data: pedidos, error } = await db
    .from('pedidos')
    .select('id, estado, created_at, confirmado_en')
    .eq('cliente_id', sesion.user.id)
    .neq('estado', 'carrito')
    .order('created_at', { ascending: false });

  if (error) {
    console.log('Error al leer los pedidos:', error);
    mostrarVacio('No se pudieron cargar tus pedidos. Revisa la consola (F12).');
    return;
  }

  if (pedidos.length === 0) {
    mostrarVacio('Todavía no tienes pedidos. <a href="galeria.html">Ir a la tienda</a>');
    return;
  }

  // 2) Totales y cantidades de TODOS esos pedidos en 2 consultas (con .in),
  // en vez de 2 consultas por cada pedido. Van a la vez con Promise.all.
  const ids = pedidos.map((p) => p.id);
  const [resTotales, resDetalles] = await Promise.all([
    db.from('pedidos_con_total').select('id, total').in('id', ids),
    db.from('detalles_pedidos').select('pedido_id, cantidad').in('pedido_id', ids),
  ]);

  if (resTotales.error) console.log('Error al leer los totales:', resTotales.error);
  if (resDetalles.error) console.log('Error al leer los productos:', resDetalles.error);

  // { id_pedido: total } y { id_pedido: unidades } para buscarlos rápido
  const totales = {};
  (resTotales.data ?? []).forEach((t) => { totales[t.id] = t.total; });

  const unidades = {};
  (resDetalles.data ?? []).forEach((d) => {
    unidades[d.pedido_id] = (unidades[d.pedido_id] ?? 0) + d.cantidad;
  });

  // 3) Una tarjeta-enlace por pedido. Aquí todo son números, fechas y
  // estados de la base (nada escrito por el cliente), así que innerHTML
  // es seguro, igual que en la galería.
  // Cancelar un pedido se hace en su detalle (estado-pedido.html).
  lista.innerHTML = pedidos.map((p) => {
    const fecha = new Date(p.confirmado_en ?? p.created_at)
      .toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    const n = unidades[p.id] ?? 0;

    return `
      <a class="pedido" href="estado-pedido.html?id=${p.id}">
        <span class="pedido-num">
          Pedido #${p.id}
          <span class="estado estado-${p.estado}">${NOMBRE_ESTADO[p.estado] ?? p.estado}</span>
        </span>
        <span class="pedido-meta">${fecha} · ${n} ${n === 1 ? 'producto' : 'productos'}</span>
        <span class="pedido-total">
          ${totales[p.id] != null ? formatoPesos(totales[p.id]) : '—'}
          <small>Ver detalle →</small>
        </span>
      </a>`;
  }).join('');
}

cargarPedidos();

// ---- TEMA CLARO / OSCURO (igual que en el resto de páginas) ----
const btnTema = document.getElementById('btn-tema');

function actualizarBotonTema() {
  const oscuro = document.documentElement.dataset.tema === 'oscuro';
  btnTema.textContent = oscuro ? 'Modo claro' : 'Modo oscuro';
}

btnTema.addEventListener('click', () => {
  const html = document.documentElement;
  if (html.dataset.tema === 'oscuro') {
    delete html.dataset.tema;
    localStorage.setItem('tema', 'claro');
  } else {
    html.dataset.tema = 'oscuro';
    localStorage.setItem('tema', 'oscuro');
  }
  actualizarBotonTema();
});

actualizarBotonTema();
