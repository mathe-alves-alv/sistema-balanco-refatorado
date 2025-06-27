// supabase/functions/delete-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Lida com a requisição preflight de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userIdToDelete } = await req.json()

    if (!userIdToDelete) {
      throw new Error("ID do usuário para deletar não foi fornecido.");
    }

    // Cria um cliente admin que pode deletar usuários.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Usa os superpoderes de admin para deletar o usuário do Auth.
    // O perfil em user_profiles será deletado automaticamente por causa do 'ON DELETE CASCADE' que definimos no banco.
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: "Usuário deletado com sucesso!", user: data.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})