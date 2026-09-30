# Inkspire — resumen de análisis

**URL:** https://inkspire-oly.webflow.io · **Fecha:** 2026-09-30

## Contenido
Template de Webflow (de Olynex) para un estudio ficticio de fotografía y video llamado "Inkspire Studio©". Presenta servicios (Photography Shoot, Cinematic Films, Commercial Work, Custom Projects), 5 trabajos destacados, equipo, cifras, una reseña y contacto.

## Enfoque
Portafolio de estudio creativo orientado a pedir cotización ("Reach out to us for a quote").

## Público objetivo
Parejas y familias (bodas, retratos) y marcas que buscan contenido visual. Como template, también fotógrafos que quieren una base en Webflow.

## Estructura
Landing one-page con 8 secciones: hero tipográfico, intro del estudio, servicios, featured works, creative team, manifiesto con contadores, testimonios (slider) y contacto. Páginas internas: detalle de proyecto (`/work-details/...`, Webflow CMS, con ficha de cliente, categoría y año), Style Guide, Changelog y License.

## UX
- El navbar es `position: fixed`, con redes sociales a la izquierda, logo al centro y hamburguesa a la derecha, en todos los tamaños.
- La hamburguesa abre un menú overlay a pantalla completa con 4 enlaces grandes por anclas, más el teléfono y el correo.
- El contacto tiene teléfono, email, mapa y un formulario de 3 campos.
- No hay transición animada entre páginas: la carga es estándar.
- Detalles con errores: el placeholder dice "Massage", el teléfono del menú tiene `href="#"` y el ícono de Dribbble tiene `alt` "Discover".

## UI
- Fondo casi negro (`#080808`) con texto blanco y gris.
- Una sola familia tipográfica, Inter Tight, con títulos gigantes en mayúsculas (el hero mide 215px).
- Los títulos están duplicados para lograr el efecto "roll" en hover.
- Animaciones con GSAP (SplitText) y Webflow Interactions: aparición de texto al hacer scroll y contadores con dígitos que ruedan.
- La imagen es solo fotografía; no usa video.
