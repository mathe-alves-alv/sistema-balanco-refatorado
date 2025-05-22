// Caminho completo do arquivo: sistema-balanco-estoque/supabase/functions/reset-empresa-password/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"; // Ou a versão mais recente do std que seja compatível
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Função para gerar senha numérica
function generateNumericPassword(length = 6): string {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += Math.floor(Math.random() * 10).toString();
  }
  return password;
}

console.log("Edge Function 'reset-empresa-password' (vCustomEnv) está inicializando...");

serve(async (req: Request) => {
  const requestStartTime = Date.now();
  console.log(`[${new Date(requestStartTime).toISOString()}] Request recebida para 'reset-empresa-password' - Método: ${req.method}, URL: ${req.url}`);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Em produção, restrinja ao seu domínio.
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 
  };

  if (req.method === 'OPTIONS') {
    console.log(`[${new Date().toISOString()}] Respondendo à requisição OPTIONS.`);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Usando nomes personalizados para os secrets que você definirá no painel.
    // A SUPABASE_URL também é injetada automaticamente pelo Supabase, então podemos usá-la como fallback.
    const projectUrl = Deno.env.get("CUSTOM_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("CUSTOM_SERVICE_ROLE_KEY") ?? "";

    if (!projectUrl) {
        console.error(`[${new Date().toISOString()}] Variável de ambiente CUSTOM_SUPABASE_URL (ou SUPABASE_URL injetada) não está definida.`);
        return new Response(JSON.stringify({ error: "Configuração da URL do Supabase incompleta no servidor." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    if (!serviceKey) {
        console.error(`[${new Date().toISOString()}] Variável de ambiente CUSTOM_SERVICE_ROLE_KEY não está definida.`);
        return new Response(JSON.stringify({ error: "Configuração da chave de serviço incompleta no servidor." }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const supabaseAdminClient: SupabaseClient = createClient(projectUrl, serviceKey);
    console.log(`[${new Date().toISOString()}] Cliente Supabase Admin inicializado para a função reset.`);

    if (req.method !== 'POST') {
        console.warn(`[${new Date().toISOString()}] Método não permitido: ${req.method}`);
        return new Response(JSON.stringify({ error: 'Método não permitido. Use POST.' }), {
            status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    let body;
    try {
        body = await req.json();
    } catch (jsonError) {
        console.error(`[${new Date().toISOString()}] Erro ao parsear JSON do corpo da requisição:`, jsonError);
        return new Response(JSON.stringify({ error: "Corpo da requisição inválido ou não é JSON." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    
    const { target_user_id } = body;
    console.log(`[${new Date().toISOString()}] Corpo da requisição para reset de senha:`, body);

    if (!target_user_id) {
      console.warn(`[${new Date().toISOString()}] target_user_id não fornecido no corpo da requisição.`);
      return new Response(JSON.stringify({ error: "O parâmetro 'target_user_id' é obrigatório no corpo da requisição." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[${new Date().toISOString()}] Tentando resetar senha para user_id: ${target_user_id}`);

    const newPassword = generateNumericPassword(6);

    const { data: updatedUserData, error: updateError } = await supabaseAdminClient.auth.admin.updateUserById(
      target_user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error(`[${new Date().toISOString()}] Erro ao atualizar senha para user_id ${target_user_id}:`, updateError);
      return new Response(JSON.stringify({ error: `Falha ao atualizar senha: ${updateError.message}` }), {
        status: (updateError as any).status || 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const userEmailForLog = updatedUserData?.user?.email || target_user_id;
    console.log(`[${new Date().toISOString()}] Senha resetada com sucesso para user_id: ${target_user_id}, email: ${userEmailForLog}. Nova senha: ${newPassword}`);
    
    return new Response(
      JSON.stringify({
        message: `Senha para o usuário ${userEmailForLog} foi resetada com sucesso.`,
        newPassword: newPassword 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 200 
      }
    );

  } catch (error) {
    const errorTime = Date.now();
    console.error(`[${new Date(errorTime).toISOString()}] Erro geral não capturado na Edge Function 'reset-empresa-password':`, error);
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro interno desconhecido na Edge Function.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: (error instanceof Object && 'status' in error && typeof error.status === 'number') ? error.status : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } finally {
    const duration = Date.now() - requestStartTime;
    console.log(`[${new Date().toISOString()}] Execução da função 'reset-empresa-password' concluída em ${duration}ms.`);
  }
});