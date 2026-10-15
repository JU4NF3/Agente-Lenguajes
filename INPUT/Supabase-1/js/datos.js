// 3° — Funciones de acceso a datos (usan supabaseClient de supabaseClient.js)
const TABLA = 'productos_práctica';

async function obtenerDatos() {
  const { data, error } = await supabaseClient.from(TABLA).select('*');
  if (error) {
    console.error('Error al obtener datos:', error.message);
    return [];
  }
  return data;
}

//https://nirmdpvrhgvdqvcfwnnf.supabase.co/rest/v1/productos_práctica URL IMPORTANTE