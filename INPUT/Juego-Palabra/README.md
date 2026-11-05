# Letrario — juego de la palabra del día

Juego de adivinar una palabra de 5 letras en 6 intentos (verde = letra en su lugar,
amarillo = está en otro lugar, gris = no está). Sirve para practicar el **CRUD**:
cada partida es una fila de una tabla `games` guardada en `localStorage`, que se
maneja con la misma forma que usamos con Supabase (`db.from('games').insert / select / update / delete`).

Para jugar: abrir `index.html` en el navegador (no necesita servidor).

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | Tablero, teclado y ventanas (ayuda, estadísticas, historial, ajustes) |
| `css/style.css` | Diseño, animaciones y tema claro / oscuro |
| `js/words.js` | Listas de palabras (posibles respuestas e intentos válidos) |
| `js/storage.js` | Mini base de datos en `localStorage` con los 4 métodos CRUD |
| `js/game.js` | Lógica: palabra del día, revisar intentos y estadísticas |
| `js/app.js` | Interfaz: usa el CRUD en cada momento del juego |
| `js/dev.js` | Modo developer: explica en tarjetas qué pasa por detrás |
| `analisis_crud.xml` | Análisis de cómo el juego usa el CRUD y su relación con `Supabase-1` |

## Dónde está el CRUD

| Operación | Cuándo pasa | Función (`js/app.js`) |
|---|---|---|
| Create | Al empezar una partida o "Jugar de nuevo" | `startGame()` |
| Read | Al abrir el juego, estadísticas e historial | `loadGame()`, `openStats()`, `renderHistory()` |
| Update | Cada vez que envías una palabra | `saveGuess()` |
| Delete | Borrar una partida del historial o "Borrar todo" | `deleteGame()`, `resetAll()` |

## Extras

- **Modo developer** (botón `</> Modo developer`): muestra tarjetas con la operación CRUD
  y el código que se ejecutó, y un contador C·R·U·D que se enciende al usarlas.
  Al tocar el contador se ve la tabla `games` en JSON.
- **Jugar de nuevo**: partida de práctica con una palabra que no hayas jugado antes.
- Historial con filtro, estadísticas con rachas, modo oscuro y alto contraste.
