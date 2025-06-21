// js/main.js

import { _supabaseClient } from './supabase-client.js';
import { state } from './state.js';
import { showScreen } from './ui-manager.js';
import { handleLoginFormSubmit, handleLogout } from './auth.js';
import { 
    handleAdminChangePasswordSubmit, 
    handleCreateEmpresaUser 
} from './admin/users.js';
import { 
    loginForm, 
    logoutButton, 
    changePasswordForm,
    createUserForm // Supondo que o ID do formulário de criação de usuário seja 'create-user-form'
} from './dom-selectors.js';

/**
 * Função principal que inicializa a aplicação.
 */
async function runApplication() {
    // Verifica a sessão do usuário ao carregar a página
    const { data: { session } } = await _supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            state.currentUser = session.user;
            // Aqui você adicionaria a lógica para mostrar o dashboard correto
            // com base na role do usuário (admin_master ou gerente_empresa)
            showScreen('main-dashboard'); // Exemplo
        } else {
            state.currentUser = null;
            showScreen('login-screen');
        }
    });

    // Adiciona os 'escutadores' de eventos
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginFormSubmit);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    // **EVENT LISTENER CORRIGIDO**
    // Conecta o formulário de alteração de senha à nossa nova função RPC.
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleAdminChangePasswordSubmit);
    }

    // Event listener para o formulário de criação de usuário
    if (createUserForm) {
        createUserForm.addEventListener('submit', handleCreateEmpresaUser);
    }
    
    // ... Adicionar outros event listeners aqui (gerenciar empresas, produtos, etc.)
}

// Garante que o DOM está carregado antes de rodar a aplicação
document.addEventListener('DOMContentLoaded', runApplication);