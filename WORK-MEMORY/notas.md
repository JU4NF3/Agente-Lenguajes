# Notas de mi agente

- El taller que más se atrasa suele ser el de Narrativas — priorizar sus entregas cuando haya empate de fechas.
- Prefiero que las referencias de color se agrupen aparte de las de tipografía, aunque compartan la misma fuente.
- Supabase-1 (tienda): el carrito usa las tablas `pedidos` y `detalles_pedidos` (SIN sufijo `_práctica`, como en la guía del curso); `pedidos_práctica` ya no existe. Antes de escribir SQL/JS contra una tabla, listar las reales con `information_schema.tables` — el esquema pegado puede estar desactualizado.
- Errores frecuentes: `ReferenceError` (variable no declarada) en sketches de p5.js — repasar declaración de variables (`let`) antes de usarlas.
- Elion (`INPUT/Elion`, tienda de ropa cristiana B/N): sin base de datos, todo en `localStorage` (`elion-cart`, `elion-orders`, `elion-coupon`, `elion-popup-seen`); el estado del pedido avanza solo con el tiempo (demo). JS repartido en `js/` (products → store → layout → página); header/footer/carrito los inyecta `layout.js`. Preferencias: nav cambia "ELION" → cruz con transición animada solo en el navbar; footer con la cruz GRANDE y "ELION" pequeño, sin animación; micro-animaciones en acordeón (+ → ×), quitar del carrito y pasos del checkout. Pendiente posible: conectar pedidos a Supabase.
