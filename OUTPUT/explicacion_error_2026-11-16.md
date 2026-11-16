# Explicación de error — 2026-11-16

## Error
```
Failed to load resource: the server responded with a status of 404 ()
Error al crear el carrito: { code: "PGRST205", message: "Could not find the table 'public.pedidos_práctica' in the schema cache" }
```
Archivo: `INPUT/Supabase-1/js/galeria.js` → `buscarCarrito()` y `obtenerOCrearCarrito()`.

## Tipo de error
**Referencia (del lado del servidor):** el código pide algo por un nombre que no existe donde se busca. Aquí quien busca es PostgREST (el servidor que convierte `db.from(...)` en URLs `/rest/v1/...`), en su lista de tablas (*schema cache*).

## Causa
El JS pedía `pedidos_práctica`, pero en la base esa tabla ya no existe: las tablas de pedidos se llaman `pedidos` y `detalles_pedidos` (sin sufijo; también existen `historial_estados_pedido` y `pedidos_con_total`). El esquema que se tenía como referencia estaba desactualizado.

## Cómo se llegó a la causa
1. Se leyó el objeto de error completo (clic en ▸ en la consola): `code` y `message` dicen más que el 404.
2. Se descartó el JS: `productos_práctica` cargaba bien con la misma "á" desde el mismo archivo.
3. Se listaron las tablas reales con `information_schema.tables` (con sus bytes, para descartar una "á" distinta). Ahí apareció `pedidos` en lugar de `pedidos_práctica`.

## Error extra en el camino
`Uncaught SyntaxError: Unexpected identifier 'pgrst'` → se pegó SQL en la consola del navegador. La consola (F12) solo entiende JavaScript; el SQL va en el **SQL Editor** de Supabase.

## Solución
Cambiar el JS (`galeria.js`) para usar los nombres reales: `.from('pedidos')` y `.from('detalles_pedidos')`.

**Lección extra:** antes de escribir SQL o JS contra una tabla, listar lo que existe de verdad (`information_schema.tables`) en vez de confiar en un esquema copiado antes.

## Concepto para recordar
- Un 404 de Supabase casi nunca es "la URL está mal": lee `code` y `message`.
- `PGRST205` = PostgREST no conoce esa tabla. Revisar en orden: ¿existe? ¿el nombre es idéntico (tildes, mayúsculas)? ¿la caché está al día?
- Es la **segunda vez** con `PGRST205` (la anterior, 2026-10-22, fue la "á" mal codificada por falta de `<meta charset>`). Misma pregunta de fondo: ¿el nombre que pide el JS es exactamente el que existe?
