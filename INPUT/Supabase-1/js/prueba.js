// prueba.js — código de los Pasos 2, 3 y 4
// Aquí ya están disponibles: "db" (el cliente de Supabase),
// el botón #btn-traer y el div #resultado de prueba.html

// Paso 2: tomar los elementos del HTML
const btnTraer = document.getElementById('btn-traer');
const resultado = document.getElementById('resultado');

// Paso 3: al hacer clic, pedir los productos a Supabase
// "async" convierte esta función (el listener del clic) en una función
// ASÍNCRONA: una función que PUEDE usar "await" adentro para esperar
// algo que tarda, sin congelar el resto de la página mientras espera.
//
// Diferencia clave con localStorage (semana 7): localStorage.getItem()
// y localStorage.setItem() son operaciones SINCRÓNICAS — ocurren al
// instante, en tu propio computador, sin viajar a ningún lado. Por eso
// nunca necesitaste "async"/"await" para leer o escribir en
// localStorage. Una consulta a Supabase, en cambio, viaja por internet
// hasta el servidor de Supabase y la respuesta tiene que volver — eso
// toma un tiempo real (aunque sea poco), y JavaScript necesita una
// forma explícita de decir "espera aquí a que llegue la respuesta".
btnTraer.addEventListener('click', async () => {
  resultado.textContent = 'Cargando...';

  // "await" pausa la ejecución DE ESTA FUNCIÓN (no de toda la página)
  // hasta que la consulta a Supabase responda. Mientras tanto, el resto
  // de tu página sigue funcionando con normalidad — solo esta función
  // en particular se detiene en esta línea hasta tener respuesta real.
  // Sin "await" en la línea de abajo, "data" y "error" NO tendrían el
  // resultado todavía — tendrías una "Promise" (promesa) sin resolver,
  // no los datos reales. Eso es justo lo que "await" evita: te obliga
  // a esperar antes de seguir usando el resultado.
  const { data, error } = await db.from('productos_práctica').select('*');

  if (error) {
    resultado.textContent = 'Error: ' + error.message;
    console.error(error);
    return;
  }

  // Paso 4: mostrar los productos en la página como cards
  // (va DENTRO del listener porque "data" solo existe aquí adentro)
  // Misma idea que la lista: map convierte cada objeto en un string de
  // HTML (ahora un <article> en vez de un <li>) y join('') las une.
  // Aquí la arrow function usa llaves { } y "return" porque antes de
  // armar el HTML necesitamos calcular algunas variables.
  const cards = data.map(producto => {
    const porcentaje = Math.round(producto.descuento * 100);   // 0.15 → 15
    const precioFinal = Math.round(producto.precio * (1 - producto.descuento)); // precio con el descuento aplicado
    const tieneDescuento = producto.descuento > 0;

    // Si hay descuento: precio anterior tachado + precio nuevo + etiqueta "-15%".
    // Si no: solo el precio normal.
    const bloquePrecio = tieneDescuento
      ? `
        <p class="precio-antes">$${producto.precio.toLocaleString('es-CO')}</p>
        <p class="precio">
          $${precioFinal.toLocaleString('es-CO')}
          <span class="badge-descuento">-${porcentaje}%</span>
        </p>`
      : `<p class="precio">$${producto.precio.toLocaleString('es-CO')}</p>`;

    return `
    <article class="card">
      <img src="${producto.img_URL}" alt="${producto.nombre}">
      <div class="card-body">
        <h3>${producto.nombre}</h3>
        <p class="descripcion">${producto.descripcion}</p>
        ${bloquePrecio}
        <p>Unidades: ${producto.unidades}</p>
        <p class="${producto.disponible ? 'disponible' : 'agotado'}">
          ${producto.disponible ? 'Disponible' : 'No disponible'}
        </p>
        <p class="categorias">
          ${Array.isArray(producto.categorias) ? producto.categorias.map(c => `<span>${c}</span>`).join('') : ''}
        </p>
      </div>
    </article>
  `;
  });
  // cards es ahora un array de strings, uno por producto:
  // ["<article class="card">...</article>", "<article ...>...</article>", ...]

  resultado.innerHTML = `<div class="cards">${cards.join('')}</div>`;
});
