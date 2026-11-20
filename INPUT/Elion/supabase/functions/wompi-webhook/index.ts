// ============================================================
//  ELION · Edge Function: wompi-webhook
//  Wompi llama a esta URL cada vez que cambia una transacción.
//  1) Verifica la firma del evento (que de verdad venga de Wompi).
//  2) Llama a apply_payment_result con la service_role (ver 07-payments-wompi.sql).
//
//  Secretos (nunca en el repo):
//    supabase secrets set WOMPI_EVENTS_SECRET=test_events_XXXXXXXX
//  SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya los pone Supabase.
//
//  Publicar (Wompi no manda el JWT de Supabase, por eso --no-verify-jwt):
//    supabase functions deploy wompi-webhook --no-verify-jwt
//  URL para Wompi > Desarrolladores > "URL de eventos":
//    https://<tu-proyecto>.supabase.co/functions/v1/wompi-webhook
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const EVENTS_SECRET = Deno.env.get('WOMPI_EVENTS_SECRET') ?? '';
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// "transaction.status" -> data.transaction.status
function readPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<any>((value, key) => value?.[key], source);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!EVENTS_SECRET) return new Response('Missing WOMPI_EVENTS_SECRET', { status: 500 });

  let event: any;
  try {
    event = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Firma de Wompi: SHA256(valores de signature.properties + timestamp + secreto de eventos)
  const properties: string[] = event?.signature?.properties ?? [];
  const values = properties.map((p) => String(readPath(event.data, p) ?? '')).join('');
  const expected = await sha256Hex(values + event.timestamp + EVENTS_SECRET);

  if (!event?.signature?.checksum || expected !== String(event.signature.checksum).toLowerCase()) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Solo interesan los cambios de transacción
  if (event.event !== 'transaction.updated') return new Response('Ignored', { status: 200 });

  const tx = event.data.transaction;
  const { error } = await supabase.rpc('apply_payment_result', {
    p_reference: tx.reference,
    p_transaction_id: tx.id,
    p_status: tx.status,
    p_amount_in_cents: tx.amount_in_cents,
  });

  if (error) {
    console.error('apply_payment_result failed:', error);
    // 500 = Wompi lo vuelve a intentar más tarde
    return new Response('Error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
});
