// 2° — Conexión con Supabase
// Reemplaza estos valores con los de tu proyecto (Project Settings > API)
const SUPABASE_URL = 'https://nirmdpvrhgvdqvcfwnnf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pcm1kcHZyaGd2ZHF2Y2Z3bm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwODEyMzAsImV4cCI6MjEwNzY1NzIzMH0.pOt5r36SfOedbwBRWsTbj5MTHlHprHlvp42D3w9TpJg';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
