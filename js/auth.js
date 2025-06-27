import { _supabaseClient } from './supabase-client.js';
import { state, ADMIN_MASTER_EMAIL } from './state.js';
// CORREÇÃO: Removido 'showScreen' desta importação! Agora ele será acessado via 'window.showScreen'
import { showLoader, hideLoader, showToast } from './ui-manager.js'; 
import * as Dom from './dom-selectors.js';
import * as Contagens from './contagens.js'; 
import * as Historico from './historico.js'; 

export async function handleLoginFormSubmit(event) {
    event.preventDefault();
    showLoader();
    const { email, password } = Object.fromEntries(new FormData(event.target));
    const { error } = await _supabaseClient.auth.signInWithPassword({ email, password });
    hideLoader();

    if (error) {
        Dom.loginErrorMessageEl.textContent = 'Email ou senha inválidos.';
        console.error('Erro no login:', error.message); 
    } else {
        Dom.loginErrorMessageEl.textContent = '';
    }
}

export async function handleLogout() {
    showLoader(); 
    const { error } = await _supabaseClient.auth.signOut();
    hideLoader(); 
    if (error) {
        showToast('Erro ao fazer logout.', 'error');
        console.error('Erro no logout:', error.message);
    } else {
        showToast('Sessão encerrada.', 'success');
    }
}

/**
 * Funções de navegação protegidas por role.
 * Se o usuário não tiver permissão, ele será redirecionado para a tela de contagem.
 */
export function showAdminDashboardScreen() {
    if (state.currentUser && (state.currentUser.user_role === 'admin' || state.currentUser.user_role === 'gerente')) {
        if (Dom.adminNameDisplayEl && state.currentUser) {
            Dom.adminNameDisplayEl.textContent = state.currentUser.email;
        }
        // CORREÇÃO: Use window.showScreen para garantir que o rastreamento de tela funcione
        window.showScreen('screenAdminDashboard');
    } else {
        console.warn('Tentativa de acesso não autorizado ao Dashboard. Redirecionando para tela de contador.');
        showToast('Acesso negado. Você não tem permissão para esta área.', 'error');
        // CORREÇÃO: Chame a função protegida que usa window.showScreen internamente
        showInventoryCountScreenProtected(); 
    }
}

export function showProtectedAdminScreen(screenId, callbackFunction) {
    if (state.currentUser && (state.currentUser.user_role === 'admin' || state.currentUser.user_role === 'gerente')) {
        if (callbackFunction) {
            // A callbackFunction (ex: Users.showUsersScreen, Produtos.showProductManagementScreen)
            // DEVE usar window.showScreen internamente para a exibição da tela.
            callbackFunction(); 
        } else {
            // CORREÇÃO: Use window.showScreen para garantir que o rastreamento de tela funcione
            window.showScreen(screenId); 
        }
    } else {
        console.warn(`Tentativa de acesso não autorizado à tela ${screenId}.`);
        showToast('Acesso negado. Você não tem permissão para esta área.', 'error');
        // CORREÇÃO: Chame a função protegida que usa window.showScreen internamente
        showInventoryCountScreenProtected(); 
    }
}

// Essa função será chamada ao tentar acessar o histórico de contagens
export function showHistoricoContagensScreenProtected() {
    if (state.currentUser && (state.currentUser.user_role === 'admin' || state.currentUser.user_role === 'gerente')) {
        // Historico.showHistoricoContagensScreen() DEVE usar window.showScreen internamente
        Historico.showHistoricoContagensScreen(); 
    } else {
        console.warn('Tentativa de acesso não autorizado ao Histórico de Contagens.');
        showToast('Acesso negado. Você não tem permissão para esta área.', 'error');
        // CORREÇÃO: Chame a função protegida que usa window.showScreen internamente
        showInventoryCountScreenProtected();
    }
}

// Essa função será chamada ao tentar acessar a tela de contagem (tanto admin quanto contador podem)
export function showInventoryCountScreenProtected() {
    if (state.currentUser) {
        // Contagens.showInventoryCountScreen() DEVE usar window.showScreen internamente
        Contagens.showInventoryCountScreen(); 
    } else {
        console.warn('Tentativa de acesso à tela de contagem sem autenticação.');
        showToast('Você precisa estar logado para acessar esta área.', 'error');
        // CORREÇÃO: Use window.showScreen para garantir que o rastreamento de tela funcione
        window.showScreen('screenLogin');
    }
}