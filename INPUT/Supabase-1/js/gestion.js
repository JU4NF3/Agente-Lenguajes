// 4° — Lógica de la página (usa las funciones de datos.js)
document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  const datos = await obtenerDatos();
  app.textContent = `Registros cargados: ${datos.length}`;
});
