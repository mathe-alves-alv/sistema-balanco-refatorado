import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'std/http/server.ts';

serve(async (req) => {
  // Configuração CORS (Muito Importante!)
  // Adapte 'YOUR_FRONTEND_URL' para o URL exato do seu Codespace
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://vigilant-lamp-69wpxqgr55662rpr6-5502.app.github.dev', // OU '*' para desenvolvimento, mas não recomendado para produção
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Lida com requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, user_role } = await req.json();

    // Cria o cliente Supabase com a Service Role Key (importante para ter privilégios de admin)
    // A service_role key DEVE ser armazenada como um segredo no Supabase.
    // Vá em Project Settings -> Edge Functions -> Secrets
    // Adicione um segredo com nome SUPABASE_SERVICE_ROLE_KEY e o valor da sua Service Role Key.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Criar o usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Opcional: para pular a confirmação de email
    });

    if (authError) {
      console.error('Erro ao criar usuário no Supabase Auth:', authError.message);
      return new Response(JSON.stringify({ error: authError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const newUserId = authData.user?.id;
    if (!newUserId) {
        throw new Error("ID do novo usuário não encontrado.");
    }

    // 2. Inserir o perfil do usuário na tabela 'user_profiles'
    const { error: profileError } = await supabaseAdmin.from('user_profiles').insert([
      { id: newUserId, user_email: email, user_role: user_role }
    ]);

    if (profileError) {
      console.error('Erro ao inserir perfil do usuário:', profileError.message);
      // Opcional: Se a inserção do perfil falhar, você pode querer deletar o usuário recém-criado no Auth.
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: 'Erro ao criar perfil do usuário' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Usuário criado com sucesso!', userId: newUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro geral na função:', error.message);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor: ' + error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});