// js/admin/users.js (Versão com exclusão de usuário funcional e correção de importação)

import { _supabaseClient } from '../supabase-client.js';
import { state } from '../state.js';
import { showScreen, showToast, showLoader, hideLoader } from '../ui-manager.js';
import { 
    usersTableBodyEl, 
    passwordRevealSectionEl, 
    generatedPasswordDisplayEl,
    createUserFormEl, 
    btnUsersBackEl // Corrigido na iteração anterior
    // REMOVENDO IMPORTAÇÕES NÃO EXISTENTES OU DESNECESSÁRIAS NESTE MÓDULO
    // changePasswordFormEl, 
    // changingPasswordForUserDisplayEl 
} from '../dom-selectors.js';
import { generateNumericPassword } from '../utils.js';
import { showAdminDashboardScreen } from '../auth.js';

export async function showUsersScreen() {
    showLoader();
    try {
        if(btnUsersBackEl) btnUsersBackEl.onclick = showAdminDashboardScreen;
        await fetchAndRenderUsers();
        showScreen('screenManageUsers');
    } catch(e) {
        showToast(`Erro ao carregar usuários: ${e.message}`, 'error');
    } finally {
        hideLoader();
    }
}

async function fetchAndRenderUsers() {
    if (!usersTableBodyEl) return;
    usersTableBodyEl.innerHTML = `<tr><td colspan="3">Carregando...</td></tr>`;
    try {
        const { data: users, error } = await _supabaseClient.from('user_profiles').select('*');
        if (error) throw error;
        usersTableBodyEl.innerHTML = '';
        if (users.length === 0) {
            usersTableBodyEl.innerHTML = '<tr><td colspan="3">Nenhum usuário cadastrado.</td></tr>';
            return;
        }
        users.forEach(user => {
            const row = usersTableBodyEl.insertRow();
            row.innerHTML = `
                <td>${user.user_email || 'N/A'}</td>
                <td>${user.user_role || 'N/A'}</td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-danger btn-delete-user" data-id="${user.id}">Excluir</button>
                </td>
            `;
        });
    } catch(e) {
        usersTableBodyEl.innerHTML = `<tr><td colspan="3" style="color:red;">Erro: ${e.message}</td></tr>`;
    }
}

export async function handleCreateUser(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.email.value;
    const userRole = form.role.value;
    const password = generateNumericPassword();
    
    showLoader();
    try {
        const { data, error } = await _supabaseClient.functions.invoke('create-user-securely', {
            body: { email, password, user_role: userRole, empresa_id: null }, // empresa_id não é mais necessário
        });
        if (error) throw error;
        if (data.error) throw new Error(data.error);

        if(generatedPasswordDisplayEl) generatedPasswordDisplayEl.textContent = password;
        if(passwordRevealSectionEl) passwordRevealSectionEl.style.display = 'block';
        showToast('Usuário criado com sucesso!', 'success');
        form.reset();
        await fetchAndRenderUsers();
    } catch (error) {
        showToast(`Erro ao criar usuário: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

// Event listener para a tabela de usuários, agora com a lógica de exclusão
usersTableBodyEl.addEventListener('click', async (event) => {
    if(event.target.classList.contains('btn-delete-user')) {
        const userIdToDelete = event.target.dataset.id;
        if (confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
            showLoader();
            try {
                if (userIdToDelete === state.currentUser.id) {
                    throw new Error("Não é possível excluir o próprio usuário.");
                }
                
                // Chamando a nova Edge Function segura
                const { error } = await _supabaseClient.functions.invoke('delete-user', {
                    body: { userIdToDelete }
                });

                if (error) throw error;

                showToast("Usuário excluído com sucesso.", "success");
                await fetchAndRenderUsers(); // Atualiza a lista

            } catch (error) {
                showToast(`Erro ao excluir usuário: ${error.message}`, 'error');
            } finally {
                hideLoader();
            }
        }
    }
});