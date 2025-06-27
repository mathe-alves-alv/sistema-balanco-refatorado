// ATENÇÃO: Cole suas credenciais do NOVO projeto aqui.
const supabaseUrl = 'https://hugdoxqycaygqvtybpre.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1Z2RveHF5Y2F5Z3F2dHlicHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NTg2MTYsImV4cCI6MjA2NjEzNDYxNn0.0dPvVlTuwEVGnK1akhhWWHtGBuBU5z4oRLUq1stm-Sg';

export const _supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);