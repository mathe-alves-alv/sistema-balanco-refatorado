// js/supabase-client.js

// Importa a biblioteca Supabase globalmente, que deve ser carregada via CDN no seu index.html
// ou se você estiver usando um bundler, via 'import { createClient } from '@supabase/supabase-js';'

export async function initializeSupabase() {
    // A variável 'supabase' vem do script da CDN carregado no HTML
    const { createClient } = supabase; 
    
    // CHAVES DE PRODUÇÃO - ATUALIZADAS CONFORME SUA ÚLTIMA SOLICITAÇÃO
    // Mantenha estas chaves aqui para conectar ao ambiente de produção.
    const PROD_SUPABASE_URL = 'https://jvtoahmrpzddfammsjwr.supabase.co';
    const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dG9haG1ycHpkZGZhbW1zandyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyOTA0MDYsImV4cCI6MjA2NTg2NjQwNn0.XdYmurPgxjLCEiDZFksgrvhhuJzH6GIBv87mg7kk5FY';

    // Ambiente local (Live Server)
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        console.log("Ambiente local detectado. Conectando ao Supabase de PRODUÇÃO (temporariamente)...");
        try {
            const client = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_ANON_KEY);
            console.log("Cliente Supabase (local) criado com sucesso.");
            return client;
        } catch (error) {
            console.error("Erro CRÍTICO ao criar cliente Supabase local:", error);
            return null;
        }
    }
    
    // Ambiente de produção (Netlify) - Também apontando para PROD diretamente agora
    try {
        console.log("Ambiente de produção (Netlify) detectado. Conectando ao Supabase de PRODUÇÃO (diretamente)...");
        // Nota: A função Netlify para buscar config não será usada agora, pois estamos fixando as chaves de PROD.
        // Se a função '/.netlify/functions/get-supabase-config' for realmente necessária para PROD no futuro,
        // será preciso reavaliar esta seção. Por agora, usamos as chaves fixas.
        const client = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_ANON_KEY);
        console.log("Cliente Supabase (Netlify) criado com sucesso.");
        return client;
    } catch (error) {
        console.error("Falha GERAL ao inicializar Supabase via Netlify (usando chaves fixas de PROD):", error);
        document.body.innerHTML = "<h1>Erro Crítico na Configuração do Sistema.</h1>";
        return null;
    }
}