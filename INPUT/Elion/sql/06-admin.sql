-- ============================================================
--  ELION · 06 · CREAR UN ADMINISTRADOR
--  En Supabase-1 cualquiera podía registrarse como admin desde
--  admin.html (insertaba su propia fila en admins_práctica). En Elion
--  eso no se permite: el admin se nombra aquí, a mano.
--
--  Pasos:
--   1) Crea el usuario: Authentication > Users > Add user
--      (o regístrate en la tienda con ese correo).
--   2) Cambia el nombre y el correo de abajo y ejecuta.
-- ============================================================

insert into public.admins (id, full_name, email)
select u.id, 'NOMBRE DEL ADMIN', u.email
  from auth.users u
 where u.email = 'CORREO-DEL-ADMIN@ejemplo.com'
on conflict (id) do nothing;

-- Revisar quiénes son admin
select a.full_name, a.email, a.created_at from public.admins a order by a.created_at;

-- Quitarle el rol a alguien:
-- delete from public.admins where email = 'CORREO-DEL-ADMIN@ejemplo.com';
