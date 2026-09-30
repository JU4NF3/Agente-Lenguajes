---
name: analizar-sitio-web
description: Analiza un sitio web de referencia y produce siempre tres entregables juntos — resumen .md (<300 palabras), estructura semántica .xml y una fila para la matriz comparativa CSV. Use when the user gives a website URL (or has it open in the browser panel) and asks to analyze, review, or compare a reference site or landing page.
---

Cuando se active esta skill:

## 1. Obtener el sitio

1. Usa la URL que te dé el estudiante. Si no da URL, usa la pestaña abierta en el browser panel
   (`tabs_context` → `get_page_text` / `read_page`).
2. Recorre el home completo (scroll hasta el footer) y, si hay navegación, abre al menos una
   página interna para observar la transición entre páginas.
3. Para detectar tecnologías, inspecciona el DOM y los scripts cargados
   (`javascript_tool`, `read_network_requests`): busca pistas como `wp-content` (WordPress),
   `webflow`, `framer`, `wix`, `shopify`, `gsap`, `ScrollTrigger`, `lenis`, `locomotive`,
   `three`, `barba`, `swup`, `__NEXT_DATA__` (Next.js), `data-reactroot`, `__nuxt`, etc.
   La tipografía se saca de `getComputedStyle` sobre `body` y los títulos.
4. **No inventes datos.** Si algo no se puede verificar (ej. la librería de animación),
   escribe `no_detectado` en vez de adivinar. No opines sobre la calidad artística;
   describe decisiones de UX/UI de forma objetiva.

## 2. Nombres de archivo

- Slug del sitio: dominio sin `www.` ni TLD, en minúsculas y con `-` (ej. `studio-xyz`).
- Carpeta del sitio: cada sitio tiene su propia carpeta con el **nombre de la página**
  (el nombre de la marca/sitio, en minúsculas y con `-`, ej. `novasite`), para que los
  análisis no se mezclen: `OUTPUT/analisis_sitios_landing/[nombre-pagina]/`
- Resumen: `OUTPUT/analisis_sitios_landing/[nombre-pagina]/resumen_[slug]_[AAAA-MM-DD].md`
- XML: `OUTPUT/analisis_sitios_landing/[nombre-pagina]/estructura_[slug]_[AAAA-MM-DD].xml`
- La matriz comparativa **no** va dentro de la carpeta del sitio: es una sola para todos,
  en `OUTPUT/analisis_sitios_landing/matriz_comparativa.csv`.
- Antes de guardar, revisa si ya existe un archivo con ese nombre. Si existe, **no lo
  sobreescribas**: agrega `_v2`, `_v3`, etc. antes de la extensión y avisa que es una nueva
  versión (convención de `CLAUDE.md`).
- Crea las carpetas si no existen.

## 3. Entregables (siempre los tres, juntos y marcados)

### Entregable 1 — Resumen (.md)

Menos de 300 palabras. Cubre, con subtítulos breves:
- **Contenido**: de qué trata el sitio.
- **Enfoque**: propósito (vender, portafolio, informar, captar leads…).
- **Público objetivo**.
- **Estructura**: secciones principales del home y páginas internas.
- **UX**: navegación, flujo, llamados a la acción, respuesta en móvil.
- **UI**: paleta, tipografía, uso de imagen/video, animaciones.

Cuenta las palabras antes de guardar; si pasa de 299, recorta.

### Entregable 2 — Estructura semántica (.xml)

Usa exactamente este esquema, con etiquetas semánticas de HTML5 y **sin inventar nombres
de etiqueta nuevos** (los detalles van en atributos `tipo` o como texto):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitio nombre="..." url="...">
  <header>
    <logo>...</logo>
    <nav tipo="fija | hamburguesa | mega-menu | overlay-fullscreen">
      <enlace>...</enlace>
    </nav>
  </header>
  <main>
    <section tipo="hero">...</section>
    <section tipo="...">...</section>
  </main>
  <footer>
    <redes>...</redes>
    <contacto>...</contacto>
  </footer>
</sitio>
```

- Elige **un solo** valor de `nav tipo` entre los cuatro permitidos.
- Un `<section>` por cada sección real del home, en el orden en que aparecen; el primero
  con `tipo="hero"` si existe.
- Un `<enlace>` por cada ítem del menú principal.
- Escapa caracteres especiales (`&` → `&amp;`, `<` → `&lt;`) y verifica que el XML esté
  bien formado.

### Entregable 3 — Fila de la matriz comparativa

Exactamente 14 campos, en este orden, separados por ` ; ` (espacio, punto y coma, espacio):

```
url ; tipo_de_sitio ; cms_o_builder ; libreria_animacion ; libreria_frontend ; patron_navegacion ; num_secciones_home ; transicion_entre_paginas ; tipografia_principal ; estilo_visual ; fortaleza_ux ; oportunidad_mejora ; nombre_archivo_md ; nombre_archivo_xml
```

- `patron_navegacion` usa el mismo valor que `nav tipo` del XML.
- `num_secciones_home` = número de `<section>` del XML (entero).
- `nombre_archivo_md` y `nombre_archivo_xml` = solo el nombre del archivo (con `_vN` si aplica).
- Ningún campo puede contener `;`. Usa `no_detectado` para lo que no se pudo verificar.
- Guarda en `OUTPUT/analisis_sitios_landing/matriz_comparativa.csv`:
  - Si el archivo no existe, créalo con la línea de encabezado de arriba como primera línea.
  - Si existe, **agrega** la fila al final sin borrar ni modificar las anteriores.

## 4. Respuesta al estudiante

Muestra en el chat los tres entregables en este orden, cada uno con su título:

- **📄 Entregable 1 — Resumen** → ruta del archivo + el texto del resumen.
- **🧩 Entregable 2 — Estructura XML** → ruta del archivo + el XML.
- **📊 Entregable 3 — Fila de la matriz** → la fila en un bloque de código + confirmación de
  que se agregó al CSV.

Al final, lista los campos que quedaron como `no_detectado`, si hay alguno.
