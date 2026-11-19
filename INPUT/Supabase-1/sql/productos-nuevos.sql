-- ============================================================
--  10 PRODUCTOS NUEVOS PARA LA GALERIA (Elion)
--  Ejecutar en el SQL Editor de Supabase.
--  Se puede ejecutar mas de una vez: un producto que ya existe
--  (mismo nombre) no se vuelve a insertar.
--
--  Mismo formato que los productos que ya tienes:
--   - precio en pesos (bigint), descuento como fraccion (0.10 = 10%)
--   - categorias como lista JSON, con "Tecnología" igual que los iPhone
--   - imagen de Unsplash con ?w=400&q=80 (todas revisadas)
-- ============================================================

insert into "productos_práctica"
  (nombre, descripcion, precio, unidades, descuento, disponible, categorias, "img_URL")
select v.nombre, v.descripcion, v.precio, v.unidades, v.descuento, true, v.categorias::json, v.img
from (values
  -- ---------- JOYERIA ----------
  ('Pulsera Dorada con Circonias',
   'Pulsera rígida bañada en oro con circonias en forma de lágrima',
   189000, 15, 0.10, '["Joyería", "Pulseras"]',
   'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&q=80'),

  ('Pulsera Plateada de Cristales',
   'Pulsera de plata con cristales tallados, ideal para ocasiones especiales',
   159000, 20, 0, '["Joyería", "Pulseras"]',
   'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&q=80'),

  -- ---------- COMPUTADORES ----------
  ('MacBook Pro 14"',
   'Portátil Apple con pantalla Liquid Retina, 16 GB de RAM y 512 GB SSD',
   8900000, 6, 0.05, '["Tecnología", "Computadores"]',
   'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80'),

  ('MacBook Air 13"',
   'Portátil Apple ultraliviano, 8 GB de RAM y 256 GB SSD, batería de todo el día',
   4999000, 10, 0.10, '["Tecnología", "Computadores"]',
   'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=400&q=80'),

  -- ---------- CELULARES ----------
  ('iPhone 15 128 GB',
   'iPhone 15 con Dynamic Island, cámara de 48 MP y puerto USB-C',
   3899000, 15, 0.08, '["Tecnología", "Celulares"]',
   'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80'),

  ('iPhone 11 Pro Reacondicionado',
   'iPhone 11 Pro de 256 GB, triple cámara, revisado y con garantía de 6 meses',
   1599000, 5, 0, '["Tecnología", "Celulares"]',
   'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80'),

  ('Samsung Galaxy S21 Ultra',
   'Celular Samsung 5G con zoom espacial de 100x y pantalla de 6,8"',
   2799000, 8, 0.15, '["Tecnología", "Celulares"]',
   'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&q=80'),

  ('Xiaomi Redmi Note',
   'Celular Android de 128 GB con pantalla AMOLED y carga rápida',
   899000, 25, 0.10, '["Tecnología", "Celulares"]',
   'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&q=80'),

  -- ---------- RELOJES ----------
  ('Apple Watch Negro 45 mm',
   'Reloj inteligente Apple con monitor de ritmo cardíaco y GPS',
   1899000, 12, 0.05, '["Tecnología", "Relojes"]',
   'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&q=80'),

  ('Reloj Inteligente Minimal Blanco',
   'Smartwatch de esfera redonda con correa de silicona y notificaciones',
   349000, 30, 0.20, '["Tecnología", "Relojes"]',
   'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80')
) as v(nombre, descripcion, precio, unidades, descuento, categorias, img)
-- no duplicar si ya se ejecutó antes
where not exists (
  select 1 from "productos_práctica" p where p.nombre = v.nombre
);

-- Para revisar: deben salir los 10 nuevos al final
select id, nombre, precio, unidades, descuento, categorias
  from "productos_práctica"
 order by id;
