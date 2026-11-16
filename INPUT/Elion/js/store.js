// ============================================================
//  ELION · store.js
//  Todo lo que se GUARDA: carrito, cupón y pedidos.
//  Por ahora vive en el navegador (localStorage). Cuando Elion tenga
//  base de datos (Supabase), solo cambia el interior de estas
//  funciones; las páginas que las usan no se enteran.
// ============================================================

const KEYS = {
  cart: 'elion-cart',
  orders: 'elion-orders',
  coupon: 'elion-coupon',
};

// localStorage puede fallar (modo incógnito, bloqueado): nunca rompe
function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin memoria: seguimos */ }
}

// ---------------- CARRITO ----------------
// Un arreglo de líneas: [{ id, size, qty }]. La misma prenda en otra
// talla es OTRA línea (así funciona en cualquier tienda).

function getCart() {
  // si algún producto dejó de existir en el catálogo, se ignora
  return readJSON(KEYS.cart, []).filter((line) => findProduct(line.id));
}

// Guarda y avisa a toda la página con un evento propio ("cart:change"):
// el globito, el carrito lateral y el checkout lo escuchan y se repintan.
function saveCart(cart) {
  writeJSON(KEYS.cart, cart);
  document.dispatchEvent(new CustomEvent('cart:change'));
}

function addToCart(id, size, qty = 1) {
  const cart = getCart();
  const line = cart.find((l) => l.id === Number(id) && l.size === size);
  if (line) line.qty = Math.min(line.qty + qty, 10);
  else cart.push({ id: Number(id), size, qty });
  saveCart(cart);
}

function setLineQty(index, qty) {
  const cart = getCart();
  if (!cart[index]) return;
  if (qty <= 0) cart.splice(index, 1);
  else cart[index].qty = Math.min(qty, 10);
  saveCart(cart);
}

function removeLine(index) {
  setLineQty(index, 0);
}

function clearCart() {
  saveCart([]);
}

function cartCount() {
  return getCart().reduce((sum, l) => sum + l.qty, 0);
}

// líneas con los datos del producto ya pegados (para pintar)
function cartLines() {
  return getCart().map((line) => {
    const p = findProduct(line.id);
    return { ...line, product: p, unitPrice: finalPrice(p), total: finalPrice(p) * line.qty };
  });
}

function cartSubtotal() {
  return cartLines().reduce((sum, l) => sum + l.total, 0);
}

// ---------------- CUPÓN ----------------
// El pop-up de la página de inicio entrega FE10 (10% en la 1.ª compra).
const COUPONS = { FE10: 0.10 };

function couponRate(code) {
  return COUPONS[String(code).trim().toUpperCase()] ?? 0;
}
function getSavedCoupon() { return readJSON(KEYS.coupon, null); }
function saveCoupon(code) { writeJSON(KEYS.coupon, code); }

// ---------------- ENVÍO ----------------
const FREE_SHIPPING_FROM = 250000;

const SHIPPING_METHODS = {
  standard: { label: 'Estándar', price: 15000, days: [3, 5], note: 'Gratis desde $250.000' },
  express:  { label: 'Express',  price: 25000, days: [1, 2], note: 'Llega más rápido' },
};

function shippingCost(method, subtotal) {
  if (method === 'standard' && subtotal >= FREE_SHIPPING_FROM) return 0;
  return SHIPPING_METHODS[method].price;
}

// fecha + N días hábiles (sin sábados ni domingos)
function addBusinessDays(date, days) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}

// ---------------- PEDIDOS ----------------
function getOrders() {
  return readJSON(KEYS.orders, []);
}

function findOrder(number) {
  return getOrders().find((o) => o.number === String(number).trim().toUpperCase());
}

// número legible: EL-1001, EL-1002…
function nextOrderNumber() {
  const orders = getOrders();
  return `EL-${1001 + orders.length}`;
}

// Arma y guarda el pedido con una FOTO de los productos y precios de
// este momento (si mañana cambia un precio, el pedido no cambia).
function createOrder({ customer, shipping, payment, couponCode }) {
  const lines = cartLines();
  const subtotal = cartSubtotal();
  const rate = couponRate(couponCode);
  const discount = Math.round(subtotal * rate);
  const shippingPrice = shippingCost(shipping.method, subtotal);

  const order = {
    number: nextOrderNumber(),
    createdAt: new Date().toISOString(),
    items: lines.map((l) => ({
      id: l.id,
      name: l.product.name,
      colorName: l.product.colorName,
      image: productImage(l.product, 1),
      size: l.size,
      qty: l.qty,
      unitPrice: l.unitPrice,
    })),
    customer,
    shipping: { ...shipping, price: shippingPrice },
    payment,
    coupon: rate > 0 ? { code: couponCode.toUpperCase(), amount: discount } : null,
    subtotal,
    total: subtotal - discount + shippingPrice,
  };

  writeJSON(KEYS.orders, [order, ...getOrders()]);
  return order;
}

// ---------------- ESTADO DEL PEDIDO (simulado) ----------------
// Sin backend nadie mueve el pedido, así que para la demostración el
// estado avanza con el tiempo desde que se creó. Con Supabase, el
// estado vendría de una columna que cambia el administrador.
const ORDER_STEPS = [
  { key: 'confirmed', label: 'Confirmado', text: 'Recibimos tu pedido y tu pago.',        after: 0 },
  { key: 'preparing', label: 'Preparando', text: 'Estamos empacando tus prendas.',         after: 2 },
  { key: 'shipped',   label: 'Enviado',    text: 'Lo entregamos a la transportadora.',     after: 5 },
  { key: 'transit',   label: 'En camino',  text: 'Va rumbo a tu dirección.',               after: 10 },
  { key: 'delivered', label: 'Entregado',  text: '¡Llegó! Gracias por llevar el mensaje.', after: 20 },
]; // "after" = minutos desde la compra (solo en esta demo)

// índice del paso actual (0..4) según los minutos que han pasado
function orderStepIndex(order, now = Date.now()) {
  const minutes = (now - new Date(order.createdAt).getTime()) / 60000;
  let index = 0;
  ORDER_STEPS.forEach((step, i) => { if (minutes >= step.after) index = i; });
  return index;
}

// fecha/hora en que se alcanzó (o se alcanzará) cada paso
function orderStepDate(order, step) {
  return new Date(new Date(order.createdAt).getTime() + step.after * 60000);
}
