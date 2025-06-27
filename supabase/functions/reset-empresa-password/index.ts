// supabase/functions/create-user-securely/index.ts (VERSÃO DE TESTE DE CORS)

import { corsHeaders } from '../_shared/cors.ts'

console.log('FUNÇÃO DE TESTE "create-user-securely" INICIADA.');

Deno.serve(async (req) => {
  console.log(`Requisição recebida: ${req.method}`);

  // Esta é a única lógica importante para o teste: responder ao pedido de permissão do navegador.
  if (req.method === 'OPTIONS') {
    console.log('Respondendo à requisição OPTIONS com cabeçalhos CORS.');
    return new Response('ok', { headers: corsHeaders });
  }

  // Para qualquer outra requisição (como o POST), apenas retornamos uma mensagem de teste.
  console.log('Respondendo à requisição não-OPTIONS.');
  return new Response(
    JSON.stringify({ message: 'A função de teste foi chamada com sucesso.' }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
});