/*
  Efecto "carta holográfica": inspirado en la técnica de
  https://github.com/simeydotme/pokemon-cards-css — mueve el puntero
  sobre la carta y las variables CSS (--rotate-x, --pointer-x, etc.)
  se actualizan en tiempo real. Todo el brillo lo dibuja el CSS
  (carta_auto_media_queries_2026-08-28_v2.css); este script solo
  calcula los números.
*/

const card = document.getElementById("card");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

// traduce un valor de un rango [fromMin, fromMax] a otro [toMin, toMax]
function adjust(value, fromMin, fromMax, toMin, toMax) {
  return toMin + ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin);
}

function handlePointerMove(event) {
  const rect = card.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const percentX = clamp((100 / rect.width) * x);
  const percentY = clamp((100 / rect.height) * y);

  // centro de la carta = 0,0 — a la izquierda/arriba es negativo,
  // a la derecha/abajo es positivo
  const centerX = percentX - 50;
  const centerY = percentY - 50;

  card.style.setProperty("--pointer-x", `${percentX}%`);
  card.style.setProperty("--pointer-y", `${percentY}%`);
  card.style.setProperty("--rotate-x", `${(-centerX / 3.5).toFixed(2)}deg`);
  card.style.setProperty("--rotate-y", `${(centerY / 3.5).toFixed(2)}deg`);
  card.style.setProperty(
    "--background-x",
    `${adjust(percentX, 0, 100, 30, 70).toFixed(2)}%`
  );
  card.style.setProperty(
    "--background-y",
    `${adjust(percentY, 0, 100, 30, 70).toFixed(2)}%`
  );
  card.style.setProperty("--card-opacity", "1");
  card.classList.add("interacting");
}

function handlePointerLeave() {
  card.classList.remove("interacting");
  card.style.setProperty("--rotate-x", "0deg");
  card.style.setProperty("--rotate-y", "0deg");
  card.style.setProperty("--pointer-x", "50%");
  card.style.setProperty("--pointer-y", "50%");
  card.style.setProperty("--background-x", "50%");
  card.style.setProperty("--background-y", "50%");
  card.style.setProperty("--card-opacity", "0");
}

if (!prefersReducedMotion) {
  card.addEventListener("pointermove", handlePointerMove);
  card.addEventListener("pointerleave", handlePointerLeave);
}
