# Pragadheesh Raj — resumen de análisis

**URL:** https://spragadheeshraj.com · **Fecha:** 2026-09-30

## Contenido
Portafolio personal de Pragadheesh Raj, fundador, diseñador y artista de Coimbatore (India), cofundador de Deep Holistics y Smitch. Muestra capacidades, casos de producto, marca y salud, su trayectoria y una mención Honors de Awwwards.

## Enfoque
Portafolio de marca personal: presenta su trabajo más que vender servicios. El contacto es por email y LinkedIn; no hay formulario.

## Público objetivo
Startups y reclutadores que buscan liderazgo de producto y diseño.

## Estructura
One-page con 6 secciones: hero, what I do, featured work, selected work, about me y punchline, más un footer de contacto. Tiene 11 páginas de caso de estudio (`/deep-holistics`, `/kickash`…) con índice por anclas y "Back to portfolio".

## UX
- Al entrar aparece una pantalla que pide permiso de movimiento del dispositivo: el hero reacciona al inclinar el teléfono. Se puede saltar con "Skip".
- Hay un loader con contador.
- El header es `fixed`, con 4 anclas (Intro, Work, About, Contact) visibles también en móvil, sin hamburguesa.
- Los casos se abren en una pestaña nueva (`target="_blank"`), así que no hay transición entre páginas.
- Un tooltip "Under the hood" muestra la fórmula de una animación.
- Los enlaces del footer duplican cada letra en el DOM: su texto accesible queda "EEMMAAIILL".

## UI
- Fondo negro con texto hueso (`#F2F0EB`).
- Tipografías: PP Editorial New (serif) en el nombre, PP Neue Montreal en los títulos y Courier New (mono) en el texto.
- 4 videos en el hero y un canvas WebGL con shader escrito a mano: imágenes de proyectos al hover y el nombre en el footer.
- Animaciones con GSAP 3.12 + ScrollTrigger y scroll suave con Lenis.
