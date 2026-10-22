document.getElementById('btn-traer').addEventListener('click', async () => {

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

  // "await" pausa la ejecución DE ESTA FUNCIÓN (no de toda la página)
  // hasta que la consulta a Supabase responda. Mientras tanto, el resto
  // de tu página sigue funcionando con normalidad — solo esta función
  // en particular se detiene en esta línea hasta tener respuesta real.
  const { data, error } = await db.from('productos_práctica').select('*');

  // Sin "await" en la línea de arriba, "data" y "error" NO tendrían el
  // resultado todavía — tendrías una "Promise" (promesa) sin resolver,
  // no los datos reales. Eso es justo lo que "await" evita: te obliga
  // a esperar antes de seguir usando el resultado.
  console.log(data, error);

  if (error) {
    // Revisamos "error" ANTES de tocar "data": si la consulta falló,
    // "data" llega como null, y usar null más adelante (ej. null.map())
    // rompería el script. Mismo patrón de "validar antes de operar"
    // que ya usaste en el CRUD de la semana 7.
    document.getElementById('resultado').textContent = 'Error: ' + error.message;
    return;
  }
  else {
  // JSON.stringify(data, null, 2) convierte el array completo a texto,
  // con sangría (el "2") para que se lea ordenado. Esta línea SÍ es
  // sincrónica (no necesita await) — ya no estamos esperando nada de
  // Supabase, solo transformando el array "data" que ya llegó.
  document.getElementById('resultado').textContent = JSON.stringify(data, null, 2);
  }

  const nombres = data.map(producto => producto.nombre);
  // nombres es ahora un array de solo strings:
  // ["Audífonos Bluetooth X200", "Camiseta Básica Algodón", "Silla Gamer ProMax"]
  // — ya no objetos completos

  document.getElementById('resultado2').innerHTML =
    '<ul>' + nombres.map(n => `<li>${n}</li>`).join('') + '</ul>';

      const descripcion = data.map(producto => producto.descripcion);
  // nombres es ahora un array de solo strings:
  // ["Audífonos Bluetooth X200", "Camiseta Básica Algodón", "Silla Gamer ProMax"]
  // — ya no objetos completos

  document.getElementById('resultado3').innerHTML =
    '<ul>' + descripcion.map(n => `<li>${n}</li>`).join('') + '</ul>';

      const precio = data.map(producto => producto.precio);
  // nombres es ahora un array de solo strings:
  // ["Audífonos Bluetooth X200", "Camiseta Básica Algodón", "Silla Gamer ProMax"]
  // — ya no objetos completos

  document.getElementById('resultado4').innerHTML =
    '<ul>' + precio.map(n => `<li>${n}</li>`).join('') + '</ul>';
});
// ↑ aquí TERMINA el listener de btn-traer. Todo lo de abajo queda
// afuera, para que el botón "agregar" también pueda usarlo (scope).

//CRUD
// AHORA (Supabase):
async function agregarProducto(datos) {

  const { data, error } = await db
    .from('productos_práctica')  // la tabla
    .insert([datos])             // insert() siempre recibe un ARRAY de objetos,
                                  // aunque insertes uno solo
    .select();                    // .select() le pide a Supabase que te
                                   // devuelva la fila ya creada (con su id
                                   // nuevo) — sin esto, insert() no te
                                   // devuelve nada útil

  if (error) {
    console.log("Error al agregar:", error);
    return null;
  }

  return data[0];   // data siempre es un array — tomamos el primer
                     // elemento, que es la fila recién creada
}

// Escuchamos el "submit" del FORM, no el "click" del botón: así también
// funciona si la persona presiona Enter dentro de un campo.
const formProducto = document.getElementById('form-producto');

formProducto.addEventListener('submit', async (evento) => {
  // Por defecto, enviar un form RECARGA la página (y perderíamos todo).
  // preventDefault() le dice al navegador: "no hagas eso, yo me encargo".
  evento.preventDefault();

  // FormData lee todos los inputs del form; .get('nombre') busca el
  // input que tiene name="nombre". Todo lo que devuelve es TEXTO (string),
  // por eso abajo convertimos cada valor al tipo que espera la tabla.
  const campos = new FormData(formProducto);

  const datos = {
    nombre: campos.get('nombre'),
    descripcion: campos.get('descripcion'),
    precio: Number(campos.get('precio')),             // "150000" → 150000
    unidades: Number(campos.get('unidades')),
    descuento: Number(campos.get('descuento')) / 100, // 15 → 0.15
    // un checkbox sin marcar NO aparece en FormData → get() da null
    disponible: campos.get('disponible') !== null,
    // "tecnología, audio" → ["tecnología", "audio"]
    categorias: campos.get('categorias')
      .split(',')
      .map(c => c.trim())       // quita los espacios de los lados
      .filter(c => c !== ''),   // quita las vacías (ej. si quedó una coma al final)
    img_URL: campos.get('img_URL'),
  };

  document.getElementById('notificación').textContent = 'Guardando...';

  const respuesta = await agregarProducto(datos);

  // agregarProducto devuelve null si hubo error (ver el if de arriba)
  if (respuesta) {
    document.getElementById('notificación').textContent = 'Producto agregado con id ' + respuesta.id;
    formProducto.reset(); // limpia los campos para agregar otro
  } else {
    document.getElementById('notificación').textContent = 'No se pudo agregar (mira la consola con F12)';
  }
});