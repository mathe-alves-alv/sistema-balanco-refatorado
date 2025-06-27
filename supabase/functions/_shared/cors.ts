// supabase/functions/_shared/cors.ts (Versão Corrigida)

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  // CORREÇÃO: O nome do cabeçalho agora está com as letras maiúsculas corretas.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}