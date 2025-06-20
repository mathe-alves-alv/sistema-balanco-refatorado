// js/auth.js

import { 
    loginEmailInput, loginPasswordInput, loginErrorMessage,
    adminMasterNameDisplay, empresaDashboardTitle, empresaUserNameSpan, empresaUserRoleDisplaySpan,
    currentPasswordInput, newPasswordInput, confirmNewPasswordInput, changePasswordMessage,
    changePasswordBackButton, changingPasswordForUserDisplay, currentPasswordGroup
} from './dom-selectors.js';

import { showScreen, showLoader, hideLoader } from './ui-manager.js'; // Importa showLoader e hideLoader de ui-manager.js
import { populateEmpresasSelect } from './data-cache.js'; 
import { fetchAndRenderEmpresas } from './admin/empresas.js';
import { showInventoryCountScreen_Empresa } from './contagens.js';
import { appState, setCurrentUser, setAdminSelectedEmpresaContextId, setIsEmpresaManagerManagingOwnUsers, ADMIN_MASTER_EMAIL } from './state.js'; // Importa o appState e seus setters
import { generateNumericPassword } from './utils.js'; // Importa generateNumericPassword de utils.js

/**
 * Lida com o processo de login do usuário.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function handleLogin(_supabaseClient) {
    console.log("handleLogin v3.1 Robusto chamada (from auth.js)");
    if (!loginEmailInput || !loginPasswordInput || !loginErrorMessage) {
        console.error("handleLogin: Elementos do formulário de login não encontrados!");
        alert("Erro crítico no formulário de login. Tente recarregar."); hideLoader(); return;
    }
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value.trim();
    loginErrorMessage.textContent = ""; loginErrorMessage.style.display = "none";

    if (!email || !password) {
        loginErrorMessage.textContent = "Por favor, preencha email e senha.";
        loginErrorMessage.style.display = "block"; return;
    }
    showLoader();
    console.log("Tentando login com Supabase para:", email);

    try {
        const { data: signInData, error: signInError } = await _supabaseClient.auth.signInWithPassword({ email, password });

        if (signInError) { console.error("Supabase signIn Error:", signInError); throw signInError; }
        if (!signInData || !signInData.user) { console.error("No user data from Supabase signIn."); throw new Error("Usuário não retornado. Verifique credenciais.");}

        console.log("Supabase signIn OK. User ID:", signInData.user.id, "Metadata:", signInData.user.user_metadata);
        
        // Crie um objeto de usuário temporário para buscar o perfil
        let tempUser = {
            id: signInData.user.id,
            email: signInData.user.email,
            user_metadata: signInData.user.user_metadata,
            full_name: signInData.user.user_metadata?.full_name || signInData.user.email,
            role: null
        };

        if (tempUser.user_metadata?.user_role) {
            tempUser.role = tempUser.user_metadata.user_role;
            console.log("Role assigned from JWT user_metadata:", tempUser.role);
        }

        // Se o role não estiver no JWT ou for um dos roles de empresa sem empresa_id no JWT, busca no perfil
        if (!tempUser.role || ['empresa_manager', 'empresa_counter', 'empresa_login_principal'].includes(tempUser.role) || !tempUser.empresa_id) {
            console.log("Fetching profile for user (or to get empresa_id/nome):", tempUser.id);
            const { data: profile, error: profileError } = await _supabaseClient
                .from('user_profiles')
                .select('empresa_id, role, full_name, empresas (id, nome_empresa)')
                .eq('id', signInData.user.id)
                .single();
            console.log("Profile fetch result - Data:", profile, "Error:", profileError);

            if (profileError && profileError.code !== 'PGRST116') {
                console.error("Error fetching profile:", profileError);
                await _supabaseClient.auth.signOut();
                setCurrentUser(null); // Atualiza o estado global
                throw profileError;
            }

            if (profile) {
                tempUser.role = profile.role;
                tempUser.empresa_id = profile.empresa_id;
                tempUser.empresa_nome = profile.empresas ? profile.empresas.nome_empresa : (profile.empresa_id ? 'Empresa Associada (Nome não carregado)' : 'N/A');
                tempUser.full_name = profile.full_name || tempUser.full_name;
                console.log("User profile fetched and merged:", tempUser);
            } else if (tempUser.email === ADMIN_MASTER_EMAIL && !tempUser.role) {
                tempUser.role = 'admin_master';
                console.warn("Admin Master identified by email (profile/JWT role missing):", tempUser.id);
            } else if (!tempUser.role) {
                console.error("User profile not found and not admin_master by email; no role in JWT. User ID:", signInData.user.id);
                await _supabaseClient.auth.signOut();
                setCurrentUser(null); // Atualiza o estado global
                throw new Error("Perfil do usuário não encontrado ou função não definida.");
            }
        }
        
        // DEFINE O USUÁRIO NO ESTADO GLOBAL APÓS TODA A VERIFICAÇÃO
        setCurrentUser(tempUser); 

        if (appState.currentUser.role === 'admin_master') {
            // As caches globais de dados (empresasCache, etc.) são atualizadas em data-cache.js
            // ou pelos módulos que os usam e populam.
            // Aqui, apenas chamamos populateEmpresasSelect para preencher os selects do DOM.
            await Promise.all([
                populateEmpresasSelect(_supabaseClient, document.getElementById('adminCategoriaEmpresaSelect'), true, "-- Selecione uma Empresa --", ""),
                populateEmpresasSelect(_supabaseClient, document.getElementById('adminProdutoEmpresaSelect'), true, "-- Selecione uma Empresa --", ""),
                populateEmpresasSelect(_supabaseClient, document.getElementById('adminContagemEmpresaSelect'), true, "-- Selecione uma Empresa --", ""),
                populateEmpresasSelect(_supabaseClient, document.getElementById('adminHistoricoEmpresaSelect'), true, "-- Selecione uma Empresa --", ""),
                populateEmpresasSelect(_supabaseClient, document.getElementById('adminUnidadeEmpresaSelect'), true, "-- Selecione uma Empresa --", "")
            ]);
            await fetchAndRenderEmpresas(_supabaseClient); // Esta função será no módulo de empresas
            showAdminMasterDashboardScreen();
        } else if ((appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal') && appState.currentUser.empresa_id) {
            showEmpresaDashboardScreen();
        } else if (appState.currentUser.role === 'empresa_counter' && appState.currentUser.empresa_id) {
            showInventoryCountScreen_Empresa(_supabaseClient);
        }
        else {
            console.warn("Login successful but role unclear or company data missing:", appState.currentUser);
            await _supabaseClient.auth.signOut();
            setCurrentUser(null); // Atualiza o estado global
            throw new Error("Função do usuário não definida ou dados da empresa ausentes.");
        }

    } catch (e) {
        console.error("Catch in login (auth.js):", e);
        setCurrentUser(null); // Atualiza o estado global
        loginErrorMessage.textContent = e.message.includes("Invalid login credentials") ? "Email ou senha inválidos."
                                         : (e.message.includes("Email not confirmed") ? "Email não confirmado."
                                         : (e.message || "Erro desconhecido."));
        loginErrorMessage.style.display = "block";
    } finally {
        hideLoader();
    }
}

/**
 * Lida com o processo de logout do usuário.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function handleLogout(_supabaseClient) {
    console.log("handleLogout called (from auth.js)");
    showLoader();
    try {
        const { error } = await _supabaseClient.auth.signOut();
        if (error) { console.error("Error in Supabase logout:", error); }
        
        // Zera o estado global ao fazer logout
        setCurrentUser(null);
        setAdminSelectedEmpresaContextId(null);
        setIsEmpresaManagerManagingOwnUsers(false);
        
        // Limpa o cache de quantidades local do usuário (mantido aqui ou num reset mais amplo)
        localStorage.removeItem('balancoQuantities_v3.1'); 
        
        if(loginEmailInput) loginEmailInput.value = "";
        if(loginPasswordInput) loginPasswordInput.value = "";
        
        showScreen('login', {}, appState.currentUser); // Passa o estado atualizado
        console.log("User logged out.");
    } catch (e) {
        console.error("Error logout (auth.js):", e);
    } finally {
        hideLoader();
    }
}

/**
 * Exibe a tela de dashboard do admin master.
 */
export function showAdminMasterDashboardScreen() {
    setAdminSelectedEmpresaContextId(null); // Zera o contexto de empresa selecionada para admin
    setIsEmpresaManagerManagingOwnUsers(false); // Zera o flag
    showScreen('adminMasterDashboard', {}, appState.currentUser); // Passa o estado atual do usuário
    if (adminMasterNameDisplay && appState.currentUser) {
        adminMasterNameDisplay.textContent = appState.currentUser.full_name || appState.currentUser.email;
    }
}

/**
 * Exibe a tela de dashboard da empresa.
 */
export async function showEmpresaDashboardScreen() {
    // Define o contexto da empresa selecionada para a empresa do usuário logado
    setAdminSelectedEmpresaContextId(appState.currentUser?.empresa_id); 
    setIsEmpresaManagerManagingOwnUsers(false); // Não está gerenciando outros usuários nesta tela
    showScreen('empresaDashboard', {}, appState.currentUser); // Passa o estado atual do usuário
    
    if (empresaDashboardTitle && appState.currentUser) {
        empresaDashboardTitle.textContent = `Painel: ${appState.currentUser.empresa_nome || 'Minha Empresa'}`;
    }
    if (empresaUserNameSpan && appState.currentUser) {
        empresaUserNameSpan.textContent = appState.currentUser.full_name || appState.currentUser.email;
    }
    if (empresaUserRoleDisplaySpan && appState.currentUser) {
        let displayRole = appState.currentUser.role;
        if (appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal') displayRole = 'Gerente';
        else if (appState.currentUser.role === 'empresa_counter') displayRole = 'Contador';
        empresaUserRoleDisplaySpan.textContent = displayRole;
    }

    // Gerenciar visibilidade dos botões do dashboard
    const dashboardButtons = document.querySelectorAll('#screenEmpresaDashboard .dashboard-options .btn');
    dashboardButtons.forEach(btn => {
        const roleReq = btn.dataset.roleReq;
        const roleContext = btn.dataset.roleContext;
        let canAccess = false;

        if (roleReq) {
            canAccess = (appState.currentUser.role === roleReq) || (roleReq === 'empresa_manager' && (appState.currentUser.role === 'empresa_login_principal' || appState.currentUser.role === 'empresa_manager'));
        } else if (roleContext === 'empresa_manager_self') {
            canAccess = (appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal');
        } else {
            canAccess = true;
        }
        btn.style.display = canAccess ? 'block' : 'none';
    });
}

/**
 * Exibe a tela de alteração de senha para o usuário logado (Empresa).
 */
export async function showChangePasswordScreen_Empresa() {
    if (!appState.currentUser) { handleLogout(_supabaseClient); return; } // Passa _supabaseClient
    if (changingPasswordForUserDisplay) {
        changingPasswordForUserDisplay.textContent = appState.currentUser.email;
    }
    // Para o próprio usuário logado, mostra o campo de "senha atual"
    if(currentPasswordGroup) currentPasswordGroup.style.display = 'block';
    if(changePasswordBackButton) changePasswordBackButton.style.display = 'block'; // Mostra o botão voltar
    showScreen('changePassword', {}, appState.currentUser); // Passa o estado atual do usuário
}

/**
 * Exibe a tela de alteração de senha para um usuário específico (Admin Master).
 * @param {string} userIdToChange ID do usuário cuja senha será alterada.
 * @param {string} userEmailToChange Email do usuário cuja senha será alterada.
 */
export async function showChangePasswordScreen_Admin(userIdToChange, userEmailToChange) {
    if (!appState.currentUser || appState.currentUser.role !== 'admin_master') { handleLogout(_supabaseClient); return; } // Passa _supabaseClient
    // Admin master pode alterar a senha de qualquer usuário sem saber a senha atual
    if(changingPasswordForUserDisplay) changingPasswordForUserDisplay.textContent = userEmailToChange;
    if(currentPasswordGroup) currentPasswordGroup.style.display = 'none'; // Esconde o campo de senha atual
    if(changePasswordBackButton) changePasswordBackButton.style.display = 'block'; // Mostra o botão voltar
    // Armazena o ID do usuário que o admin master está alterando a senha
    changePasswordBackButton.dataset.userIdToChange = userIdToChange;
    showScreen('changePassword', {}, appState.currentUser); // Passa o estado atual do usuário
}

/**
 * Lida com a alteração de senha.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function handleChangePassword(_supabaseClient) {
    if (!newPasswordInput || !confirmNewPasswordInput || !changePasswordMessage) {
        console.error("Elementos de input de senha não encontrados.");
        return;
    }

    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;
    // currentPassword pode ser nulo para admin_master ou quando a lógica é de redefinir sem senha antiga.
    const currentPassword = currentPasswordInput ? currentPasswordInput.value : null; // Pega o valor se o campo existe
    changePasswordMessage.textContent = '';
    changePasswordMessage.className = 'message'; // Reseta a classe

    if (newPassword !== confirmNewPassword) {
        changePasswordMessage.textContent = 'A nova senha e a confirmação não coincidem.';
        changePasswordMessage.classList.add('error-message');
        return;
    }
    if (newPassword.length < 6) {
        changePasswordMessage.textContent = 'A nova senha deve ter pelo menos 6 caracteres.';
        changePasswordMessage.classList.add('error-message');
        return;
    }
    // Se não for admin_master e o campo de senha atual for visível, valida a senha atual (opcional, Supabase não valida diretamente)
    if (appState.currentUser?.role !== 'admin_master' && currentPasswordGroup.style.display === 'block' && !currentPassword) {
        changePasswordMessage.textContent = 'Por favor, insira sua senha atual.';
        changePasswordMessage.classList.add('error-message');
        return;
    }

    showLoader();
    try {
        let error;
        // Se o usuário logado for admin_master, ele pode redefinir a senha sem a senha atual
        if (appState.currentUser?.role === 'admin_master' && changePasswordBackButton?.dataset.userIdToChange) {
            const userId = changePasswordBackButton.dataset.userIdToChange;
            console.log(`Admin Master redefinindo senha para o usuário ID: ${userId}`);
            const { error: adminError } = await _supabaseClient.auth.admin.updateUserById(userId, {
                password: newPassword
            });
            error = adminError;
        } else {
            // Para usuários comuns (gerente/contador) alterando a própria senha
            console.log(`Usuário comum (${appState.currentUser?.email}) alterando a própria senha.`);
            // No seu código original, a atualização do usuário logado via `updateUser` não exige a senha atual.
            // Para uma validação da senha atual, você precisaria tentar logar com ela novamente ou usar uma RPC.
            const { error: userUpdateError } = await _supabaseClient.auth.updateUser({
                password: newPassword
            });
            error = userUpdateError;
        }

        if (error) throw error;

        changePasswordMessage.textContent = 'Senha alterada com sucesso!';
        changePasswordMessage.classList.add('success-message');
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
        if (currentPasswordInput) currentPasswordInput.value = ''; // Limpa se existir
    } catch (e) {
        console.error("Erro ao alterar senha (auth.js):", e);
        changePasswordMessage.textContent = `Erro ao alterar senha: ${e.message}`;
        changePasswordMessage.classList.add('error-message');
    } finally {
        hideLoader();
    }
}