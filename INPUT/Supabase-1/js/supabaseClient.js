// 2° — Conexión con Supabase
// Reemplaza estos valores con los de tu proyecto (Project Settings > API)
const SUPABASE_URL = 'https://nirmdpvrhgvdqvcfwnnf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcm1kcHZyaGd2ZHF2Y2Z3bm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODEyMzAsImV4cCI6MjEwNzY1NzIzMH0.pOt5r36SfOedbwBRWsTbj5MTHlHprHlvp42D3w9TpJg';

const { createClient } = supabase;

// SESIONES INDEPENDIENTES: Supabase guarda la sesión en localStorage con
// UNA clave por proyecto, y todas las páginas de este sitio comparten ese
// localStorage. Sin esto, entrar como admin en admin.html también te deja
// "logueado como admin" en cliente.html, galeria.html, etc.
// Solución: el panel del admin guarda su sesión en OTRA clave. Así puedes
// tener un admin abierto en admin.html y un cliente en la tienda a la vez.
const esPanelAdmin = /\/admin(\.html)?$/i.test(window.location.pathname);

const db = esPanelAdmin
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { storageKey: 'elion-sesion-admin' } })
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // tienda y cuenta: la clave de siempre
