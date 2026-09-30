# Novasite — resumen de análisis

**URL:** https://novasite-oly.webflow.io · **Fecha:** 2026-09-30

## Contenido
Template de Webflow (hecho por Flowoly) para un estudio ficticio de diseño UI/UX llamado "Novasite". Presenta servicios (Brand Identity, UI/UX Design, Development, Product Design), un proceso de trabajo, proyectos, testimonios y premios.

## Enfoque
Portafolio de agencia pensado para captar clientes: el recorrido termina en un formulario de contacto y en el correo del estudio.

## Público objetivo
Marcas y startups que buscan contratar diseño de producto digital. Como template, también está dirigido a diseñadores que quieren comprar una base en Webflow.

## Estructura
Landing one-page con 10 secciones: hero con slider, about, work process (3 pasos), services, latest projects, testimonials (slider), imagen parallax, awards, contacto y CTA con marquee. Páginas internas: detalle de proyecto (`/project/...`, Webflow CMS), Style Guide, License y Changelog.

## UX
- El menú usa anclas (`/#about`, `/#service`…) sobre el mismo home.
- En desktop el navbar es `position: absolute`: se va con el scroll, y para navegar hay que volver arriba.
- Desde tablet el menú se colapsa en hamburguesa (dropdown de ancho completo).
- Tiene scroll suave con Lenis.
- Los formularios de contacto y newsletter están protegidos con Cloudflare Turnstile.
- No hay transición animada entre páginas: la carga es estándar.
- Hay erratas en los textos: "patner", "Your Massage", "PORTOFIO".

## UI
- Fondo casi negro (`#0D0D0D`) con texto blanco y fotografías con acento rojo en el hero.
- Tipografía display Clash Display (títulos en mayúsculas) combinada con Inter Tight en el nav.
- Animaciones con GSAP (SplitText, ScrollTrigger), Webflow Interactions y Lottie.
- Tres sliders y dos marquees de texto.
- No usa video: toda la imagen es fotografía.
