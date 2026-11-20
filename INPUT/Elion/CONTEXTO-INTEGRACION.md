# Elion — Guía de la base de datos (Supabase)

> Contexto para futuras sesiones. Explica qué es Elion, de dónde sale su base
> de datos, cómo crearla desde cero y qué falta.
> Última actualización: 2026-11-20.

---

## 1. Contexto

| Carpeta | Qué es | Estado |
|---|---|---|
| `INPUT/Supabase-1/` | Ejercicio de la universidad: tienda genérica con Supabase (login, carrito, pago simulado, pedidos, panel admin, finanzas). | **No se toca.** Es la referencia y la base de la lógica. |
| `INPUT/Elion/` | Tienda de ropa streetwear cristiana. Frontend terminado; hoy guarda todo en `localStorage`. | Se conecta a una **base de datos NUEVA** de Supabase, solo para Elion. |

**Decisiones tomadas:**
- Elion tiene **su propio proyecto de Supabase**, distinto al del ejercicio.
- La lógica es **la misma de Supabase-1** (carrito en la base, stock que se descuenta al confirmar y vuelve al cancelar, transiciones de estado, historial, RLS, total calculado en la base).
- Los **nombres cambian para Elion**, en inglés como el resto de su código (sección 3).
- `galeria.html` y `cliente.html` no se migran como páginas: su función pasa a `index.html` / `producto.html` y al menú de usuario del header (`layout.js`).
- El SQL vive aparte, en `Elion/sql/`. Este documento solo explica.

---

## 2. Archivos

```
Elion/
├── CONTEXTO-INTEGRACION.md      ← este documento
├── sql/
│   ├── 01-tables.sql            tablas, índices, vista orders_with_total
│   ├── 02-rls.sql               is_admin(), RLS y permisos por columna
│   ├── 03-triggers.sql          transiciones, historial, devolver stock, perfil al registrarse
│   ├── 04-functions.sql         confirm_order, cancel_order, check_coupon
│   ├── 05-seed.sql              envíos, cupón FE10, 8 productos y stock por talla
│   ├── 06-admin.sql             nombrar un administrador (a mano)
│   └── 07-payments-wompi.sql    pago real: start_payment, apply_payment_result
└── supabase/functions/wompi-webhook/index.ts   Edge Function que recibe los avisos de Wompi
```

> ⚠️ El SQL se escribió reconstruyendo la lógica de Supabase-1 desde su JS
> (el SQL original de tablas, RLS y `confirmar_pedido` no está guardado en
> `Supabase-1/sql/`). **No se ha ejecutado todavía**: al correrlo en el
> proyecto nuevo, hacerlo script por script y revisar errores.

---

## 3. De Supabase-1 a Elion (equivalencias)

### Tablas y vista

| Supabase-1 | Elion | Cambio |
|---|---|---|
| `productos_práctica` | `products` | + `slug`, `type`, `collection`, `color_name`, `sale_price` (en vez de `descuento`), `tag`, versículo, 2 fotos. Sin `categorias`. |
| `productos_práctica.unidades` | `product_sizes` (`product_id`, `size`, `stock`) | Stock **por talla** (S/M/L/XL, gorra = `Única`). |
| `cliente_práctica` | `customers` | + `doc_number`, `department`, `city`. Sin `rol` (admin = estar en `admins`). |
| `admins_práctica` | `admins` | Ya no se crea desde la web (ver `06-admin.sql`). |
| `pedidos` | `orders` | + `order_number` (`EL-1001`), datos de entrega de Elion, envío, cupón, columnas `payment_*`, fecha de cada paso. |
| `detalles_pedidos` | `order_items` | + `size`. `cantidad` → `quantity`, `precio_unitario` → `unit_price`. |
| historial (trigger) | `order_status_history` | Tabla explícita. |
| `pedidos_con_total` | `orders_with_total` | + `subtotal`, `discount`, `item_count`; `total` incluye cupón y envío. |
| — | `shipping_methods` | Antes fijo en `store.js` (`SHIPPING_METHODS`). |
| — | `coupons` | Antes fijo en `store.js` (`COUPONS`). |

### Estados del pedido

| Supabase-1 | Elion | Texto en pantalla |
|---|---|---|
| `carrito` | `cart` | — |
| — | `pending_payment` | Esperando pago (solo con Wompi) |
| `confirmado` | `confirmed` | Confirmado |
| — | `preparing` | Preparando |
| `enviado` | `shipped` | En camino |
| `entregado` | `delivered` | Entregado |
| `cancelado` | `cancelled` | Cancelado (siempre con `cancel_reason`) |

Transiciones permitidas (trigger `validate_order_status_transition`):
`cart → pending_payment | confirmed` (solo el checkout) ·
`pending_payment → confirmed (solo el webhook) | cancelled` ·
`confirmed → preparing | cancelled` · `preparing → shipped | cancelled` ·
`shipped → delivered | cancelled`.

### Funciones y triggers

| Supabase-1 | Elion |
|---|---|
| `confirmar_pedido(...)` | `confirm_order(...)` — talla, cupón, envío, método de pago |
| `cancelar_pedido(id)` | `cancel_order(id)` — el cliente cancela en `confirmed` o `preparing` |
| `validar_transicion_estado` | `validate_order_status_transition` |
| `pedidos_historial_cambio` | `log_order_status_change` |
| `restaurar_stock_al_cancelar` | `restore_stock_on_cancel` |
| (insert en `cliente.js`) | `handle_new_user` — crea la fila en `customers` al registrarse |
| — | `check_coupon(code)`, `is_admin()` |
| — | `start_payment(...)`, `apply_payment_result(...)` (07) |

---

## 4. Crear la base de datos (paso a paso)

1. Crear un proyecto nuevo en Supabase (región São Paulo: la más cercana a Colombia).
2. **SQL Editor** → ejecutar en orden, uno por uno: `01` → `02` → `03` → `04` → `05`.
3. Registrar tu usuario (o crearlo en Authentication > Users) y ejecutar `06-admin.sql` con tu correo.
4. Copiar URL y `anon key` del proyecto (Project Settings > API) a `Elion/js/supabaseClient.js` (nuevo, basado en el de Supabase-1, con la `storageKey` separada para el admin).
5. Pago real: ver sección 6 (`07` + Edge Function).

---

## 5. Conectar el frontend de Elion

`js/store.js` es la **única capa de datos**: se cambia el interior de sus funciones, las páginas no se enteran. Orden de scripts en cada página: `supabase-js` → `supabaseClient.js` → `products.js` → `store.js` → `layout.js` → script de la página.

| Hoy (localStorage) | Con Supabase |
|---|---|
| `PRODUCTS` fijo en `products.js` | `select` a `products` + `product_sizes` al cargar (los ids son los mismos: 1–8). `MATERIALS` puede seguir en el JS. |
| `getCart` / `addToCart` / `setLineQty` / `removeLine` / `clearCart` | Carrito = fila de `orders` en `cart` + `order_items` (como `galeria.js`). Sin sesión: se puede mantener en `localStorage` y pasarlo a la base al iniciar sesión. |
| `couponRate(code)` | `db.rpc('check_coupon', { p_code })` |
| `SHIPPING_METHODS` / `shippingCost` | `select` a `shipping_methods` (el costo final lo calcula la base). |
| `createOrder(...)` | Contraentrega: `db.rpc('confirm_order', {...})`. Tarjeta/PSE: `db.rpc('start_payment', {...})` + widget Wompi. |
| `getOrders` / `findOrder` | `select` a `orders_with_total` (+ `order_items`). Buscar por `order_number`. |
| `orderStepIndex` (simulado por tiempo) | Leer `status` y las fechas `confirmed_at`, `preparing_at`, `shipped_at`, `delivered_at`. |
| Login / Mis datos (`cliente.html`) | Menú de usuario en `layout.js`. Registro: `db.auth.signUp({ email, password, options: { data: { full_name } } })`. |
| Panel admin (`Supabase-1/admin.html`) | Copiar como `Elion/admin.html` y cambiar nombres de tablas/columnas según la sección 3. Agregar el paso `preparing`. Borrar productos con pedidos falla (FK): usar `is_available = false`. |

---

## 6. Pago real con Wompi

**Por qué Wompi:** cobra en COP; acepta tarjeta, PSE, Nequi y Bancolombia; tiene sandbox gratis y webhooks firmados. Alternativa: Mercado Pago.

**Flujo:**
```
checkout.js ──rpc──> start_payment(...)          descuenta stock, status = pending_payment,
                                                 devuelve reference, amount_in_cents, signature
checkout.js ──────> widget de Wompi              el cliente paga
Wompi ──POST──────> Edge Function wompi-webhook  verifica la firma del evento
wompi-webhook ─rpc─> apply_payment_result(...)   APPROVED → confirmed
                                                 DECLINED/VOIDED/ERROR → cancelled (vuelve el stock)
pedido.html ───────> lee orders_with_total       muestra el estado real
```

**Configuración (sandbox):**
1. Crear cuenta en Wompi → modo pruebas → copiar las 4 llaves: pública (`pub_test_`), privada (`prv_test_`), integridad (`test_integrity_`), eventos (`test_events_`).
2. Guardar el secreto de integridad en Vault (una vez, en el SQL Editor; **no** guardarlo en el repo):
   `select vault.create_secret('test_integrity_XXXX', 'wompi_integrity_secret');`
3. Ejecutar `07-payments-wompi.sql`.
4. Edge Function:
   `supabase secrets set WOMPI_EVENTS_SECRET=test_events_XXXX`
   `supabase functions deploy wompi-webhook --no-verify-jwt`
5. En Wompi → "URL de eventos": `https://<proyecto>.supabase.co/functions/v1/wompi-webhook`.
6. En `checkout.js`, al pagar con tarjeta/PSE:
   ```js
   const { data, error } = await db.rpc('start_payment', { p_order_id, p_shipping_method, /* ... */ p_payment_method: 'card' });
   const pay = data[0];
   const checkout = new WidgetCheckout({
     currency: pay.currency,
     amountInCents: pay.amount_in_cents,
     reference: pay.reference,
     publicKey: 'pub_test_XXXX',
     signature: { integrity: pay.signature },
     redirectUrl: `${location.origin}/pedido.html?n=${pay.order_number}`,
   });
   checkout.open(() => { location.href = `pedido.html?n=${pay.order_number}`; });
   ```
   (script del widget: `https://checkout.wompi.co/widget.js`)
7. Probar con los datos de prueba de Wompi: aprobada, rechazada y PSE pendiente.

**Llaves:** la pública va en el frontend. La privada, integridad y eventos **solo** en Vault / secretos de la Edge Function. Nunca se guarda la tarjeta ni el CVV.

**Casos a tener en cuenta:**
- Si Wompi aprueba un pedido que ya estaba cancelado, `payment_status` queda en `APPROVED` con `status = cancelled` → el admin debe reembolsar desde el panel de Wompi.
- Pagos `pending_payment` abandonados mantienen el stock apartado. Más adelante: tarea programada (`pg_cron`) que los cancele después de X minutos.
- `admin-finanzas`: contar como venta solo `confirmed / preparing / shipped / delivered`.
- Producción: cuenta de comercio verificada (RUT) y cambiar a llaves `prod_`.

---

## 7. Orden de trabajo pendiente

1. Crear el proyecto de Supabase de Elion y ejecutar `01`–`06` (revisar errores).
2. Conectar `store.js` a Supabase (catálogo → carrito → checkout con `confirm_order` en contraentrega).
3. Login y "Mis datos" en el menú de `layout.js`.
4. `pedido.html` con estados reales.
5. Panel admin de Elion (copiado de Supabase-1, con nombres nuevos).
6. Wompi sandbox: `07` + Edge Function + widget.

## 8. Reglas para futuras sesiones

- `Supabase-1/` no se modifica: es la referencia.
- Nombres de Elion: los de la sección 3. No se renombran sin pedirlo al dueño.
- Total, stock y estado se calculan/cambian **en la base**, nunca en el navegador.
- `store.js` es la única capa que habla con los datos.
- Si se agregan columnas a `orders`, volver a crear `orders_with_total` (usa `o.*`).
- Sesiones de admin y cliente separadas (`storageKey` distinta).
