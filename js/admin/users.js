// js/admin/users.js

import { _supabaseClient } from '../supabase-client.js';
import { state } from '../state.js';
import { showScreen, showToast } from '../ui-manager.js';
import { 
    manageUsersScreen, 
    manageUsersList, 
    manageEmpresaUsersScreenTitleEl, 
    changePasswordForm, 
    changingPasswordForUserDisplay 
} from '../dom-selectors.js';
import { generatePassword } from '../utils.js';

/**
 * Exibe a lista de usuários para a empresa selecionada.
 */
export async function showUsersForSelectedCompany() {
    // ... (Sua função existente para listar os usuários provavelmente está aqui)
    // Dentro do loop que cria a lista de usuários, o botão de alterar senha deve
    // chamar a função 'showChangePasswordScreenForUser'.
    // Exemplo de como o botão poderia ser criado dentro do seu loop:
    /*
    const users = []; // Seus usuários viriam do Supabase
    manageUsersList.innerHTML = ''; // Limpa a lista
    users.forEach(user => {
        const userItem = document.createElement('li');
        userItem.innerHTML = `
            <span>${user.email}</span>
            <button class="btn-reset-password" data-user-id="${user.id}" data-user-email="${user.email}">
                Alterar Senha
            </button>
        `;
        manageUsersList.appendChild(userItem);
    });

    // Adiciona o event listener para todos os botões de alterar senha
    document.querySelectorAll('.btn-reset-password').forEach(button => {
        button.addEventListener('click', (event) => {
            const userId = event.target.dataset.userId;
            const userEmail = event.target.dataset.userEmail;
            showChangePasswordScreenForUser(userId, userEmail);
        });
    });
    */
}

/**
 * Prepara e exibe a tela para alterar a senha de um usuário específico.
 * ISSO CORRIGE O BUG de sempre mostrar o seu próprio e-mail.
 * @param {string} userId - O ID do usuário-alvo.
 * @param {string} userEmail - O email do usuário-alvo.
 */
export function showChangePasswordScreenForUser(userId, userEmail) {
    // 1. Guarda o ID do usuário no formulário para uso posterior
    changePasswordForm.dataset.targetUserId = userId;

    // 2. Atualiza o texto na tela para mostrar para quem é a alteração
    changingPasswordForUserDisplay.textContent = userEmail;

    // 3. Mostra a tela de alteração de senha
    showScreen('change-password-screen');
}

/**
 * Lida com o envio do formulário de alteração de senha pelo Admin.
 * ESTA É A MUDANÇA PRINCIPAL: Usa .rpc() em vez de .functions.invoke()
 */
async function handleAdminChangePasswordSubmit(event) {
    event.preventDefault();

    const newPassword = document.getElementById('new-password-input').value;
    const targetUserId = changePasswordForm.dataset.targetUserId;

    if (!targetUserId || !newPassword) {
        showToast('Erro: ID do usuário ou nova senha estão ausentes.', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
        return;
    }

    showToast('Alterando senha, por favor aguarde...', 'info');

    // CHAVE DA MUDANÇA: Chamando a função SQL (RPC) 'admin_reset_user_password'
    const { data, error } = await _supabaseClient.rpc('admin_reset_user_password', {
        target_user_id: targetUserId,
        new_password: newPassword
    });

    if (error) {
        console.error('Erro ao chamar RPC para redefinir senha:', error);
        showToast(`Falha ao redefinir senha: ${error.message}`, 'error');
    } else {
        // A 'data' aqui é a mensagem de retorno da sua função SQL
        console.log('Resposta da RPC:', data);
        showToast(data, 'success'); // Ex: 'Senha do usuário redefinida com sucesso via RPC.'
        
        changePasswordForm.reset(); // Limpa o formulário
        showScreen('manage-users-screen'); // Volta para a tela de gerenciamento de usuários
    }
}

// A função de criação de usuário que corrigimos anteriormente.
// Verifique se a sua está assim, usando .upsert()
export async function handleCreateEmpresaUser(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.email.value;
    const empresaId = form.empresa.value;

    const randomPassword = generatePassword();

    try {
        const { data: authData, error: authError } = await _supabaseClient.auth.admin.createUser({
            email: email,
            password: randomPassword,
            email_confirm: true,
            user_metadata: {
                empresa_id: empresaId,
                user_role: 'gerente_empresa'
            }
        });

        if (authError) throw authError;

        const newUserId = authData.user.id;
        
        const { error: profileError } = await _supabaseClient
            .from('user_profiles')
            .upsert({
                id: newUserId,
                empresa_id: empresaId,
                user_role: 'gerente_empresa'
            }, { onConflict: 'id' });

        if (profileError) throw profileError;

        document.getElementById('generated-password-display').textContent = randomPassword;
        document.getElementById('password-reveal-section').style.display = 'block';
        showToast('Usuário criado com sucesso! Anote a senha gerada.');
        form.reset();

    } catch (error) {
        console.error('Falha na criação do usuário:', error);
        showToast(`Erro: ${error.message}`, 'error');
    }
}


// Exportar a função que será chamada pelo event listener no main.js
export { handleAdminChangePasswordSubmit };