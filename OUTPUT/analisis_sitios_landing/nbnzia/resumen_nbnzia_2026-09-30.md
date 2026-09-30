# NBNZIA — resumen de análisis

**URL:** https://www.nbnzia.com/#process · **Fecha:** 2026-09-30
*(El ancla `#process` apunta a una sección del home, así que se analizó el home completo.)*

## Contenido
Portafolio de Yevhenii Nebenzia, desarrollador Webflow certificado (7+ años) y exilusionista profesional. Todo el sitio usa la metáfora del truco de magia en tres actos: The Pledge, The Turn, The Prestige.

## Enfoque
Captar clientes: "Let's talk" lleva a Calendly, hay un formulario de contacto y un "See the work".

## Público objetivo
Empresas y startups que buscan un sitio Webflow a medida con animación avanzada.

## Estructura
One-page con 8 secciones: hero, about y CTAs, marquee de cifras, video que escala, servicios, trabajos, proceso y contacto. No hay páginas internas: los 5 casos enlazan a los sitios de cada cliente.

## UX
- Loader tipográfico al entrar.
- En el hero hay enlaces por anclas (About, Services, Work, Process).
- Al hacer scroll aparece una hamburguesa `fixed` que abre un menú a pantalla completa.
- El formulario pide solo Name y Email, con Cloudflare Turnstile.
- Hay un easter egg "Emoji Rain".
- Detalles con errores: el menú muestra "hello@osmo.supply" (email de otra marca), el marquee dice "117+" y "50+ projects" a la vez, y hay erratas ("Nofluff", "todo").

## UI
- Fondo claro (`#F5F2F3`) con texto `#1F1F1F` y acento naranja.
- Una sola familia tipográfica: BDO Grotesk.
- Títulos sobre curvas SVG (`textPath`), video con HLS (`hls.js`) y máscara radial al pasar el cursor en el contacto.
- Animaciones con GSAP (ScrollTrigger, SplitText, Flip, Inertia) y scroll suave con Lenis.
- GSAP se carga dos veces (3.13 desde jsDelivr y 3.15 desde Webflow).
- Los nombres de clase (`willem-*`, `bold-nav-full`, `mwg0xx`) coinciden con componentes de Osmo y Made With GSAP.
