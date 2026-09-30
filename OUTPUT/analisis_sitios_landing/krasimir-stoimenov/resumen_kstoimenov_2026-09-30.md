# Krasimir Stoimenov — resumen de análisis

**URL:** https://kstoimenov.com · **Fecha:** 2026-09-30

## Contenido
Portafolio personal real de Krasimir Stoimenov, design lead de UX/producto. Muestra métricas (12 años, 87 proyectos), servicios, casos (Acronis, Polygon, Deutsche Bank, Macmillan), testimonios y partners.

## Enfoque
Captar clientes: el CTA principal, "Book a call" / "Let's talk", lleva a una agenda en Cal.

## Público objetivo
Founders de startups y equipos de producto de empresas grandes ("from pre-seed start-ups to the Fortune 500").

## Estructura
Home con 10 secciones: hero, about, showreel, métricas, services, works, CTA a works, testimonios, quote y partners. Páginas internas: `/work` (con vista lista/grid), `/work/[caso]`, `/services`, `/pricing`, `/about`, `/privacy` y `/terms`.

## UX
- En desktop, el nav es una "píldora" `fixed` centrada en la parte inferior de la pantalla, con enlaces, toggle de tema claro/oscuro y CTA.
- En móvil, el nav se reemplaza por un botón "open menu".
- Hay un preloader con contador de %.
- Transición entre páginas: 6 paneles cubren la pantalla (900 ms), luego se recarga la página completa y los paneles se retiran.
- El cambio lista/grid en `/work` usa View Transitions API.
- Respeta `prefers-reduced-motion`.

## UI
- Fondo oscuro (`#121212`) con tema claro opcional.
- Tipografía sans Lausanne combinada con serif Manier en los títulos.
- Hero con shader WebGL propio en `<canvas>`.
- Animaciones con GSAP (ScrollTrigger, SplitText) integrado en el código del sitio.
- Showreel en video `.webm`.
- 67 imágenes, entre fotos de casos y logos.
