# Emotion Agency — resumen de análisis

**URL:** https://emotion-agency.com/about · **Fecha:** 2026-09-30
*(Se analizó la página About, que fue la URL entregada, no el home.)*

## Contenido
Página "About" de Emotion, un estudio de diseño e ingeniería de interfaces de Ucrania fundado en 2018 por dos personas. Presenta su filosofía ("people remember how it made them feel"), su historia, los fundadores, su enfoque, un FAQ de 7 preguntas y un CTA para iniciar un proyecto.

## Enfoque
Presentación de marca con storytelling, orientada a captar proyectos (botones "Start project" y "Let's talk" que llevan a `/contact`).

## Público objetivo
Marcas, startups y founders (Web2 y Web3) que buscan sitios de nivel "award".

## Estructura
9 secciones: hero y 4 pantallas de storytelling sobre una escena 3D, historia (Est. 2018), fundadores, approach y FAQ. Otras páginas: Home, Work (`/projects`), Contact y Legal.

## UX
- Al entrar aparece una pantalla que obliga a elegir "Enter with audio" o "Enter without audio".
- El nav es una píldora flotante abajo al centro, con botón de menú, logo y un asistente de IA.
- El menú abre un panel centrado con 4 páginas y ajustes: sonido, modo oscuro y calidad gráfica.
- La navegación es SPA (Nuxt) con transiciones animadas y sonido; la transición cambia según la ruta.
- El footer invita a seguir haciendo scroll para revelar la página siguiente.
- Hay un botón para copiar el email.

## UI
- Fondo lavanda (`#F5EFFF`) con texto morado oscuro (`#2A1647`), y modo oscuro morado.
- Tipografía serif propia (Emotion Serif) combinada con IBM Plex Mono.
- Escena 3D con Three.js en el hero, video de gradiente de fondo y botones con gradiente en `<canvas>`.
- Animaciones con GSAP (ScrollTrigger, SplitText) y scroll suave con Lenis.
