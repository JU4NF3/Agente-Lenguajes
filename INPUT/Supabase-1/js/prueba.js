// prueba.js — código de los Pasos 2, 3 y 4
// Aquí ya están disponibles: "db" (el cliente de Supabase),
// el botón #btn-traer y el div #resultado de prueba.html

// Paso 2: tomar los elementos del HTML
const btnTraer = document.getElementById('btn-traer');
const resultado = document.getElementById('resultado');

// Paso 3: al hacer clic, pedir los productos a Supabase
btnTraer.addEventListener('click', async () => {
  resultado.textContent = 'Cargando...';

  const { data, error } = await db.from('productos_práctica').select('*');

  if (error) {
    resultado.textContent = 'Error: ' + error.message;
    console.error(error);
    return;
  }

  // Paso 4: mostrar los productos en la página
  resultado.innerHTML = '';
  data.forEach((producto) => {
    const p = document.createElement('p');
    p.textContent = `${producto.nombre} — $${producto.precio}`;
    resultado.appendChild(p);
  });
});
