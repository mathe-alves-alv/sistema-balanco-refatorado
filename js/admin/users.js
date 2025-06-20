// js/admin/users.js - CORRIGIDO (Removido select de auth.users direto e comentários na string de select)

import { showLoader, hideLoader, showScreen } from '../ui-manager.js';
import { 
    adminEmpresaUsersTableBody, manageUsersEmpresaMessage, adminEmpresaNewUserEmailEl, adminEmpresaNewUserFullNameEl, adminEmpresaNewUserRoleEl, 
    selectedEmpresaIdForUserManage,
    manageUsersEmpresaScreenTitleEl, // CORREÇÃO JÁ APLICADA PREVIAMENTE
    contextEmpresaNameForUserManageEl, addUserNameForEmpresaDisplayEl, currentPasswordGroup 
} from '../dom-selectors.js';
import { appState, setAdminSelectedEmpresaContextId, setIsEmpresaManagerManagingOwnUsers, setManagedUsersCache } from '../state.js'; 
import { showEmpresaDashboardScreen, showAdminMasterDashboardScreen, showChangePasswordScreen_Admin } from '../auth.js';
import { generateNumericPassword } from '../utils.js'; 


/**
 * Exibe a tela de gerenciamento de usuários para uma empresa específica (chamada pelo Admin Master).
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaId O ID da empresa cujos usuários serão gerenciados.
 * @param {string} empresaNome O nome da empresa cujos usuários serão gerenciados.
 */
export async function showManageUsersScreen_Admin(_supabaseClient, empresaId, empresaNome) {
    if (!appState.currentUser || appState.currentUser?.role !== 'admin_master') {
        alert("Acesso negado. Apenas Admin Master pode gerenciar usuários de outras empresas.");
        showScreen('login', {}, appState.currentUser); 
        return;
    }
    console.log(`showManageUsersScreen_Admin called for company ${empresaNome} (ID: ${empresaId})`);
    setAdminSelectedEmpresaContextId(empresaId); 
    setIsEmpresaManagerManagingOwnUsers(false); 

    if(manageUsersEmpresaScreenTitleEl) manageUsersEmpresaScreenTitleEl.textContent = `Gerenciar Usuários da Empresa`;
    if(contextEmpresaNameForUserManageEl) contextEmpresaNameForUserManageEl.textContent = empresaNome;
    if(addUserNameForEmpresaDisplayEl) addUserNameForEmpresaDisplayEl.textContent = `para ${empresaNome}`;
    
    if(currentPasswordGroup) currentPasswordGroup.style.display = 'none'; 

    if(adminEmpresaNewUserRoleEl) {
        adminEmpresaNewUserRoleEl.innerHTML = `
            <option value="empresa_manager">Gerente da Empresa (Acesso Total)</option>
            <option value="empresa_counter">Contador da Empresa (Apenas Contagem)</option>
        `;
    }

    await fetchAndRenderEmpresaUsers(_supabaseClient, empresaId);
    showScreen('manageUsersEmpresa', {}, appState.currentUser); // Usar 'manageUsersEmpresa' para a screen ID
}

/**
 * Exibe a tela de gerenciamento de usuários para a própria empresa (chamada pelo Gerente da Empresa).
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function showManageUsersScreen_Empresa(_supabaseClient) {
    if (!appState.currentUser || !(appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal')) {
        alert("Acesso negado. Apenas Gerentes da Empresa podem gerenciar usuários.");
        showEmpresaDashboardScreen(appState.currentUser); 
        return;
    }
    if (!appState.currentUser.empresa_id) {
        console.error("ID da empresa não encontrada para o gerente logado.");
        alert("Erro: ID da sua empresa não encontrado. Tente relogar.");
        showScreen('login', {}, appState.currentUser); 
        return;
    }
    console.log(`showManageUsersScreen_Empresa called for company ${appState.currentUser.empresa_nome} (ID: ${appState.currentUser.empresa_id})`);
    setAdminSelectedEmpresaContextId(appState.currentUser.empresa_id); 
    setIsEmpresaManagerManagingOwnUsers(true); 

    if(manageUsersEmpresaScreenTitleEl) manageUsersEmpresaScreenTitleEl.textContent = "Gerenciar Meus Usuários";
    if(contextEmpresaNameForUserManageEl) contextEmpresaNameForUserManageEl.textContent = appState.currentUser.empresa_nome || "Minha Empresa";
    if(addUserNameForEmpresaDisplayEl) addUserNameForEmpresaDisplayEl.textContent = `na ${appState.currentUser.empresa_nome || "Minha Empresa"}`;
    
    if(currentPasswordGroup) currentPasswordGroup.style.display = 'none';

    if(adminEmpresaNewUserRoleEl) {
        adminEmpresaNewUserRoleEl.innerHTML = `
            <option value="empresa_manager">Gerente da Empresa (Acesso Total)</option>
            <option value="empresa_counter">Contador da Empresa (Apenas Contagem)</option>
        `;
    }

    await fetchAndRenderEmpresaUsers(_supabaseClient, appState.currentUser.empresa_id);
    showScreen('manageUsersEmpresa', {}, appState.currentUser); 
}

/**
 * Busca os perfis de usuário de uma empresa e os renderiza na tabela.
 * ATENÇÃO: A seleção de 'auth_users:auth.users(email_confirmed_at)' foi removida para resolver erro de parsing.
 * O status de confirmação do email não será exibido por esta função.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaId O ID da empresa para buscar usuários.
 */
export async function fetchAndRenderEmpresaUsers(_supabaseClient, empresaId) {
    if (!adminEmpresaUsersTableBody || !manageUsersEmpresaMessage) {
        console.error("Elementos DOM para gerenciar usuários não encontrados.");
        hideLoader();
        return;
    }
    adminEmpresaUsersTableBody.innerHTML = '<tr><td colspan="5">Carregando usuários...</td></tr>';
    manageUsersEmpresaMessage.textContent = '';
    manageUsersEmpresaMessage.style.display = 'none';
    showLoader();
    try {
        const { data: users, error } = await _supabaseClient
            .from('user_profiles')
            // O SELECT FOI AJUSTADO PARA CONTER APENAS OS NOMES DAS COLUNAS.
            // REMOVIDO QUALQUER COMENTÁRIO OU CARACTERE ADICIONAL DENTRO DOS BACKTICKS.
            .select(`id,email,full_name,role`) 
            .eq('empresa_id', empresaId)
            .in('role', ['empresa_manager', 'empresa_counter', 'empresa_login_principal'])
            .order('full_name');

        if (error) throw error;

        setManagedUsersCache(users || []); 
        adminEmpresaUsersTableBody.innerHTML = '';

        if (appState.managedUsersCache.length > 0) {
            appState.managedUsersCache.forEach(user => {
                const row = adminEmpresaUsersTableBody.insertRow();
                row.insertCell().textContent = user.full_name || user.email; 
                row.insertCell().textContent = user.email;
                
                let displayRole = user.role;
                if (user.role === 'empresa_login_principal') displayRole = 'Gerente Principal';
                else if (user.role === 'empresa_manager') displayRole = 'Gerente';
                else if (user.role === 'empresa_counter') displayRole = 'Contador';
                row.insertCell().textContent = displayRole;

                // Não é possível exibir status de confirmação do email sem a informação
                // Você pode adicionar uma coluna 'email_confirmed_at' em user_profiles e atualizá-la
                // via um trigger de banco de dados se precisar dessa informação aqui.
                const confirmedCell = row.insertCell();
                confirmedCell.textContent = 'N/A'; // Ou 'Não disponível' ou deixar em branco

                const actionsCell = row.insertCell();

                const btnChangePass = document.createElement('button');
                btnChangePass.textContent = 'Redefinir Senha';
                btnChangePass.className = 'btn btn-warning table-actions';
                btnChangePass.onclick = () => showChangePasswordScreen_Admin(user.id, user.email);
                actionsCell.appendChild(btnChangePass);

                let canDeleteUser = false;
                if (appState.currentUser.role === 'admin_master') {
                    canDeleteUser = true;
                } else if (appState.isEmpresaManagerManagingOwnUsers && appState.currentUser.empresa_id === empresaId) {
                    if (user.id === appState.currentUser.id) {
                        canDeleteUser = false; 
                    } else if (user.role === 'empresa_login_principal') {
                         canDeleteUser = false; 
                    } else {
                        canDeleteUser = true;
                    }
                }

                if (canDeleteUser) {
                    const btnDelete = document.createElement('button');
                    btnDelete.textContent = 'Excluir';
                    btnDelete.className = 'btn btn-danger table-actions';
                    btnDelete.onclick = () => handleDeleteUser(_supabaseClient, user.id, user.email, empresaId);
                    actionsCell.appendChild(btnDelete);
                }
            });
        } else {
            adminEmpresaUsersTableBody.innerHTML = '<tr><td colspan="5">Nenhum usuário cadastrado para esta empresa (com funções gerenciáveis por esta tela).</td></tr>';
        }
    } catch (e) {
        console.error("Erro ao buscar usuários da empresa:", e);
        manageUsersEmpresaMessage.textContent = `Erro ao carregar usuários: ${e.message}`;
        manageUsersEmpresaMessage.style.display = 'block';
    } finally {
        hideLoader();
    }
}

/**
 * Fecha a tela de gerenciamento de usuários, retornando ao dashboard apropriado.
 */
export function closeManageEmpresaUsersScreen() {
    if (manageUsersEmpresaMessage) {
        manageUsersEmpresaMessage.style.display = 'none';
        manageUsersEmpresaMessage.textContent = '';
    }
    if (appState.isEmpresaManagerManagingOwnUsers) {
        showEmpresaDashboardScreen(appState.currentUser); 
    } else {
        showAdminMasterDashboardScreen();
    }
}

/**
 * Lida com a criação de um novo usuário para uma empresa.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function handleCreateEmpresaUser(_supabaseClient) {
    console.log("handleCreateEmpresaUser called");

    if (manageUsersEmpresaMessage) {
        manageUsersEmpresaMessage.style.display = 'none';
        manageUsersEmpresaMessage.textContent = '';
    }

    const empresaId = selectedEmpresaIdForUserManage.value;
    const empresaNome = contextEmpresaNameForUserManageEl.textContent || 'Empresa Desconhecida';

    if (!adminEmpresaNewUserEmailEl || !adminEmpresaNewUserFullNameEl || !adminEmpresaNewUserRoleEl || !empresaId) {
        alert("Erro de interface ou ID da empresa faltando. Recarregue a página.");
        return;
    }

    const email = adminEmpresaNewUserEmailEl.value.trim();
    const fullName = adminEmpresaNewUserFullNameEl.value.trim(); 
    const roleToCreate = adminEmpresaNewUserRoleEl.value;

    if (!email) { alert("O email é obrigatório."); adminEmpresaNewUserEmailEl.focus(); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { alert("Por favor, insira um email válido."); adminEmpresaNewUserEmailEl.focus(); return; }
    if (!roleToCreate) { alert("A função é obrigatória."); adminEmpresaNewUserRoleEl.focus(); return; }

    if (roleToCreate === 'empresa_login_principal' && appState.currentUser.role !== 'admin_master') {
        alert("Você não tem permissão para criar um usuário com a função 'Gerente Principal'.");
        return;
    }
    if (roleToCreate === 'empresa_login_principal' && appState.currentUser.role === 'empresa_manager') {
         alert("Um gerente normal não pode criar outro Gerente Principal.");
         return;
    }

    const password = generateNumericPassword(8); 
    showLoader();

    try {
        console.log("Tentando criar usuário Supabase Auth:", email, "Role:", roleToCreate, "Empresa ID:", empresaId);

        const { data: authData, error: signUpError } = await _supabaseClient.auth.signUp({
            email, password,
            options: {
                data: { 
                    full_name: fullName,
                    user_role: roleToCreate,
                    empresa_id: empresaId 
                }
            }
        });

        if (signUpError) {
            if (signUpError.message.toLowerCase().includes("user already registered") || signUpError.message.toLowerCase().includes("already exists")) {
                throw new Error(`O usuário com o email "${email}" já está registrado no Supabase Auth. Para definir uma nova senha para um login existente, use a opção "Redefinir Senha".`);
            }
            throw signUpError;
        }

        if (!authData.user) {
            console.warn("authData.user is null after signUp. authData:", authData);
            throw new Error("Não foi possível obter dados do usuário após cadastro (authData.user nulo).");
        }
        const newUserId = authData.user.id;
        console.log("Usuário Auth criado com ID:", newUserId);

        const { error: profileError } = await _supabaseClient
            .from('user_profiles')
            .insert({
                id: newUserId,
                email: email,
                full_name: fullName,
                role: roleToCreate,
                empresa_id: empresaId
            });

        if (profileError) {
            console.error("Erro ao criar perfil, tentando apagar o usuário de autenticação para evitar inconsistência:", profileError);
            await _supabaseClient.auth.admin.deleteUser(newUserId).catch(e => console.error("Erro ao apagar usuário Auth após falha no perfil:", e));
            throw profileError;
        }

        let successMsg = `Novo usuário (${roleDisplay(roleToCreate)}) para ${empresaNome} (${email}) criado com sucesso!`;
        successMsg += `\nSenha Temporária: ${password}\nPor favor, anote e informe ao responsável.`;
        if (authData.user.email_confirmed_at === null) {
            successMsg += `\nNota: Se a confirmação de email estiver ATIVA no Supabase, o usuário ${email} precisará confirmar o email.`;
        }

        manageUsersEmpresaMessage.innerHTML = successMsg.replace(/\n/g, '<br>');
        manageUsersEmpresaMessage.style.display = 'block';
        manageUsersEmpresaMessage.style.color = 'var(--success-color)';

        adminEmpresaNewUserEmailEl.value = '';
        adminEmpresaNewUserFullNameEl.value = '';
        adminEmpresaNewUserRoleEl.value = 'empresa_manager'; 
        
        await fetchAndRenderEmpresaUsers(_supabaseClient, empresaId);

    } catch (e) {
        console.error("Final catch in handleCreateEmpresaUser:", e);
        manageUsersEmpresaMessage.textContent = `Erro ao criar usuário: ${e.message}`;
        manageUsersEmpresaMessage.style.color = 'var(--danger-color)';
        manageUsersEmpresaMessage.style.display = 'block';
    } finally {
        hideLoader();
    }
}

/**
 * Lida com a exclusão de um usuário de empresa.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} userId O ID do usuário a ser excluído (do Auth).
 * @param {string} userEmail O email do usuário a ser excluído.
 * @param {string} empresaId O ID da empresa à qual o usuário pertence.
 */
export async function handleDeleteUser(_supabaseClient, userId, userEmail, empresaId) {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${userEmail}? Esta ação é irreversível e removerá o acesso dele ao sistema!`)) {
        return;
    }
    showLoader();
    try {
        const { data: userToDeleteProfile, error: profileCheckError } = await _supabaseClient
            .from('user_profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (profileCheckError) throw profileCheckError;
        
        if (userToDeleteProfile.role === 'empresa_login_principal' && appState.currentUser.role !== 'admin_master') {
            alert("Você não pode excluir o usuário principal da empresa. Apenas um Admin Master pode fazer isso.");
            hideLoader();
            return;
        }

        if (appState.currentUser.role === 'empresa_manager' && userId === appState.currentUser.id) {
            alert("Você não pode excluir seu próprio usuário através desta tela.");
            hideLoader();
            return;
        }

        console.log("Deletando perfil de usuário:", userId);
        const { error: profileDeleteError } = await _supabaseClient.from('user_profiles').delete().eq('id', userId);
        if (profileDeleteError) throw profileDeleteError;

        alert(`Usuário "${userEmail}" excluído com sucesso.`);
        await fetchAndRenderEmpresaUsers(_supabaseClient, empresaId);

    } catch (e) {
        console.error("Erro ao excluir usuário:", e);
        manageUsersEmpresaMessage.textContent = `Erro ao excluir usuário: ${e.message}`;
        manageUsersEmpresaMessage.style.color = 'var(--danger-color)';
        manageUsersEmpresaMessage.style.display = 'block';
    } finally {
        hideLoader();
    }
}


/**
 * Função auxiliar para exibir o nome da função de forma mais amigável.
 * @param {string} roleKey A chave da função (ex: 'empresa_manager').
 * @returns {string} O nome de exibição da função.
 */
function roleDisplay(roleKey) {
    if (roleKey === 'empresa_manager') return 'Gerente';
    if (roleKey === 'empresa_counter') return 'Contador';
    if (roleKey === 'empresa_login_principal') return 'Gerente Principal';
    return roleKey; 
}