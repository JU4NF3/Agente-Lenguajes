# Explicación de error — 2026-09-18

**Archivo:** `INPUT/Arrays/index2.html`, función `modificarElemento` (líneas 116-137 antes de la corrección).

## Tipo de error
**ReferenceError**: JavaScript intenta leer un nombre (variable o función) que no existe en ese punto del programa. No es que el valor esté mal — el nombre nunca se declaró así. Mayúsculas y minúsculas cuentan.

## Qué pasaba
- Línea 122: se declaró `let inde = arr.indexOf(valorBuscado)`, pero en las líneas 123 y 126 se usaba `indice` → `indice is not defined`.
- Líneas 131 y 142: se llamaba a `mostrarlista()`, pero la función se llama `mostrarLista` (con L mayúscula, definida en la línea 73) → `mostrarlista is not defined`.

## Corrección aplicada
- `inde` → `indice` en las 3 líneas donde se usaba.
- `mostrarlista()` → `mostrarLista()` en las 2 llamadas.

## Concepto detrás
`indexOf` devuelve una posición (número), no el elemento. Esa posición se guarda en una variable y se reutiliza para comparar contra `-1` y para escribir `arr[indice] = nuevoValor`. Si el nombre no coincide en todas las veces que se usa, la cadena se rompe. El mismo patrón, ya completo, se puede ver en `eliminarElemento` (líneas 97-113 del mismo archivo).

## Patrón repetido
Este es el **tercer** ReferenceError registrado en `WORK-MEMORY/registro_errores.csv` (después de `mouseXPos` y `circleSize`, ambos en sketches de p5.js). Los tres son la misma causa raíz: un nombre usado que no coincide exactamente con el nombre declarado. Vale la pena repasar declaración de variables/funciones y el hábito de revisar que los nombres se escriban igual en todo el bloque antes de correr el código.
