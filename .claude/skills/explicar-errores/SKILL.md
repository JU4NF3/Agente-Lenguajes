---
name: explicar-errores
description: Explica un mensaje de error de código en lenguaje claro, identifica su causa y la registra en WORK-MEMORY/registro_errores.csv para detectar qué temas repasar. Use when the user pastes an error message, describes a bug, or asks what concept to review based on mistakes they keep making.
---

Cuando se active esta skill:

1. Si el estudiante no pegó ya el mensaje de error completo y el fragmento de código, pídeselos
   (o usa `INPUT/fragmento_codigo_con_error.md` como ejemplo si es una demostración).
2. Identifica el tipo de error (sintaxis, referencia/nombre no definido, tipo de dato, lógica) y
   explica en una frase qué significa ese tipo de error en general, antes de entrar al caso puntual.
3. Señala la línea o parte exacta del código que lo causa y por qué.
4. Sugiere la corrección, pero explica el concepto detrás — el objetivo es que el estudiante
   entienda, no que copie una solución.
5. Guarda una copia breve de la explicación en `OUTPUT/explicacion_error_[fecha].md`,
   siguiendo la convención de nombres y versionado de `CLAUDE.md`.
6. Agrega una fila nueva a `WORK-MEMORY/registro_errores.csv` (créalo con el encabezado si todavía
   no existe) con estas columnas, en este orden:
   - `fecha` — fecha de hoy.
   - `error` — el tipo o mensaje del error (ej. `ReferenceError: posX is not defined`).
   - `explicacion` — la causa general del tipo de error, en una frase.
   - `estrategia_de_acompanamiento` — cómo guiaste al estudiante (ej. "se le pidió ubicar dónde
     debía declararse la variable antes de dar la corrección").
   - `ejemplo_de_solucion` — un fragmento corto de código ya corregido.
   - `solucion` — una frase de qué se hizo para resolverlo.
7. Revisa `WORK-MEMORY/registro_errores.csv`: si ya hay 3 o más filas con el mismo tipo de error
   (columna `error`), dilo explícitamente y sugiere qué tema repasar — esta es la parte que ayuda
   a mejorar el conocimiento, no solo a corregir el error de hoy.
