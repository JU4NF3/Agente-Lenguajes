-- ============================================================
--  ELION · 05 · DATOS INICIALES
--  Ejecutar después de 04-functions.sql. Se puede repetir sin duplicar.
--  Los 8 productos son los de js/products.js, con los MISMOS ids, para
--  que los enlaces producto.html?id=N sigan funcionando.
-- ============================================================

-- ---------- ENVÍO (antes SHIPPING_METHODS en store.js) ----------
insert into public.shipping_methods (code, label, price, free_from, min_days, max_days)
values
  ('standard', 'Estándar', 15000, 250000, 3, 5),
  ('express',  'Express',  25000, null,   1, 2)
on conflict (code) do nothing;

-- ---------- CUPÓN DEL POP-UP (antes COUPONS en store.js) ----------
insert into public.coupons (code, rate, first_purchase_only)
values ('FE10', 0.10, true)
on conflict (code) do nothing;

-- ---------- PRODUCTOS ----------
insert into public.products
  (id, slug, name, description, type, collection, color_name, price, sale_price, tag,
   verse_text, verse_ref, image_main, image_hover)
values
  (1, 'jesus-saves-crew', 'Jesus Saves Crewneck',
   'Crewneck lavado con la cruz “Jesus Saves” estampada en la espalda. Un recordatorio de que la salvación ya fue pagada.',
   'crew', 'new', 'Gris carbón', 169000, null, 'Nuevo',
   'Y en ningún otro hay salvación.', 'Hechos 4:12',
   'assets/products/jesus-saves-crew-1.jpg', 'assets/products/jesus-saves-crew-2.jpg'),

  (2, 'ask-me-hoodie', 'Ask Me About Jesus Hoodie',
   'Hoodie pesado con letra gótica en la espalda. Hecho para abrir conversaciones donde vayas.',
   'hoodie', 'new', 'Negro', 199000, null, 'Nuevo',
   'Estad siempre preparados para presentar defensa de la esperanza que hay en vosotros.', '1 Pedro 3:15',
   'assets/products/ask-me-hoodie-1.jpg', 'assets/products/ask-me-hoodie-2.jpg'),

  (3, 'jesus-loves-tee', 'Jesus Loves You Tee',
   'Camiseta de algodón con acabado lavado y estampado en la espalda. Simple, directa y para todos los días.',
   'tee', 'new', 'Negro lavado', 99000, null, null,
   'Nosotros le amamos a él, porque él nos amó primero.', '1 Juan 4:19',
   'assets/products/jesus-loves-tee-1.jpg', 'assets/products/jesus-loves-tee-2.jpg'),

  (4, 'left-the-99-tee', 'He Left the 99 Tee',
   'Inspirada en la parábola de la oveja perdida: Él dejó las 99 para venir por ti.',
   'tee', 'new', 'Arena', 99000, null, 'Nuevo',
   '¿Qué hombre de vosotros, teniendo cien ovejas, si pierde una de ellas, no deja las noventa y nueve…?', 'Lucas 15:4',
   'assets/products/left-the-99-tee-1.jpg', 'assets/products/left-the-99-tee-2.jpg'),

  (5, 'jesus-hoodie', 'Jesús Hoodie',
   'Nuestro hoodie más vendido: el nombre que está sobre todo nombre, bordado en el pecho.',
   'hoodie', 'best', 'Negro', 189000, 159000, '-15%',
   'Para que en el nombre de Jesús se doble toda rodilla.', 'Filipenses 2:10',
   'assets/products/jesus-hoodie-1.jpg', 'assets/products/jesus-hoodie-2.jpg'),

  (6, 'john-14-6-tee', 'John 14:6 Tee',
   'Camiseta blanca con el versículo completo en la espalda, en tipografía redondeada.',
   'tee', 'best', 'Blanco', 89000, null, 'Más vendido',
   'Yo soy el camino, y la verdad, y la vida.', 'Juan 14:6',
   'assets/products/john-14-6-tee-1.jpg', 'assets/products/john-14-6-tee-2.jpg'),

  (7, 'essential-hoodie', 'Essential Hoodie',
   'La base de cualquier outfit: hoodie liso de felpa gruesa, con el isotipo de Elion en la manga.',
   'hoodie', 'best', 'Blanco', 179000, null, null,
   'Y todo lo que hagáis, hacedlo de corazón, como para el Señor.', 'Colosenses 3:23',
   'assets/products/essential-hoodie-1.jpg', 'assets/products/essential-hoodie-2.jpg'),

  (8, 'trucker-cap', 'Trucker Cap',
   'Gorra trucker de frente blanco y malla negra, con cierre ajustable atrás.',
   'cap', 'best', 'Blanco / Negro', 79000, null, 'Últimas',
   'Alzaré mis ojos a los montes; ¿de dónde vendrá mi socorro?', 'Salmos 121:1',
   'assets/products/trucker-cap-1.jpg', 'assets/products/trucker-cap-2.jpg')
on conflict (id) do nothing;

-- El contador de ids sigue después del 8 (si no, el próximo producto chocaría con el id 1)
select setval(pg_get_serial_sequence('public.products', 'id'),
              (select max(id) from public.products));

-- ---------- STOCK POR TALLA ----------
-- Stock de prueba: 20 por talla. Las tallas agotadas de products.js
-- (soldOut) quedan en 0 y la gorra "Últimas" con 5.
insert into public.product_sizes (product_id, size, stock)
select p.id, s.size, 20
  from public.products p
 cross join (values ('S'), ('M'), ('L'), ('XL')) as s(size)
 where p.type <> 'cap'
on conflict (product_id, size) do nothing;

insert into public.product_sizes (product_id, size, stock)
select id, 'Única', 5 from public.products where type = 'cap'
on conflict (product_id, size) do nothing;

update public.product_sizes set stock = 0 where product_id = 2 and size = 'S';   -- Ask Me About Jesus
update public.product_sizes set stock = 0 where product_id = 7 and size = 'XL';  -- Essential

-- Para revisar
select p.id, p.name, coalesce(p.sale_price, p.price) as price,
       string_agg(s.size || ':' || s.stock, '  ' order by s.size) as stock
  from public.products p
  join public.product_sizes s on s.product_id = p.id
 group by p.id
 order by p.id;
