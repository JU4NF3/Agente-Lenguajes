# Fragmento de código con error — ejemplo para practicar

Código (p5.js):

```js
function setup() {
  createCanvas(400, 400);
}

function draw() {
  background(220);
  fill(255, 0, 0);
  circle(posX, posY, 50);
}
```

Mensaje de error en consola:

```
Uncaught ReferenceError: posX is not defined
    at draw (sketch.js:9)
```

Contexto: el estudiante quería que el círculo se moviera con el mouse, pero nunca declaró
`posX` ni `posY` — asumió que `mouseX`/`mouseY` se llamaban así porque las vio en un ejemplo
de otro compañero.
