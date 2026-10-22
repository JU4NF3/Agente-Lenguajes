# Explicación de error — 2026-10-22

**Error:** `Could not find the table 'public.productos_prÃ¡ctica' in the schema cache`
**Archivo:** `INPUT/Supabase-1/prueba.html` + `js/prueba.js` (línea 33)

## Tipo de error
Error de **codificación de caracteres (encoding)**: el texto se guardó con un sistema de letras (UTF-8) y se leyó con otro (Windows-1252/Latin-1), así que las letras especiales se dañan.

## Qué pasó
- `prueba.js` está guardado en UTF-8, donde la `á` ocupa 2 bytes.
- `prueba.html` no tenía `<meta charset="UTF-8">`, así que el navegador adivinó otra codificación y leyó esos 2 bytes como 2 letras: `Ã¡`.
- Supabase recibió `productos_prÃ¡ctica`, una tabla que no existe.
- Pista para reconocerlo: `Ã` seguida de otro símbolo (`Ã¡`, `Ã©`, `Ã±`) casi siempre es un problema de UTF-8.

## Corrección
```html
<head>
  <meta charset="UTF-8">
  ...
```

## Buena práctica
Usa nombres de tablas y columnas sin tildes, sin ñ y sin espacios (ej. `productos_practica`), así no dependes de la codificación.
