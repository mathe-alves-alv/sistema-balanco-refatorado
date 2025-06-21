// js/auth.js - CÓDIGO CORRIGIDO (Lógica de handleChangePassword para admin_master usando Edge Function)

import { 
    loginEmailInput, loginPasswordInput, loginErrorMessage,
    adminMasterNameDisplay, empresaDashboardTitle, empresaUserNameSpan, empresaUserRoleDisplaySpan,
    currentPasswordInput, newPasswordInput, confirmNewPasswordInput, changePasswordMessage,
    changePasswordBackButton, changingPasswordForUserDisplay, currentPasswordGroup
} from './dom-selectors.js';

import { showScreen, showLoader, hideLoader } from './ui-manager.js'; 
import { populateEmpresasSelect } from './data-cache.js'; 
import { fetchAndRenderEmpresas } from './admin/empresas.js';
import { showInventoryCountScreen_Empresa } from './contagens.js';
import { appState, setCurrentUser, setAdminSelectedEmpresaContextId, setIsEmpresaManagerManagingOwnUsers, ADMIN_MASTER_EMAIL } from './state.js'; 
import { generateNumericPassword } from './utils.js'; 

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
                setCurrentUser(null); 
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
                setCurrentUser(null); 
                throw new Error("Perfil do usuário não encontrado ou função não definida.");
            }
        }
        
        setCurrentUser(tempUser); 

        if (appState.currentUser.role === 'admin_master') {
            await Promise.all([
                populateEmpresasSelect(_supabaseClient, document.getElementById('adminCategoriaEmpresaSelect'), true, "-- Selecione uma Empresa --", ""),
                populateEmpresasSelect(_supabaseClient, document.getElementById('adminProdutoEmpresaSelect'), true, "-- Selecione uma Empresa --", ""),
                populateEmpresasSelect(_supabaseClient, document.getElementById('adminContagemEmpresaSelect'), true, "-- Selecione uma Empresa --", ""),
                populateEmpresasSelect(_supabaseClient, document.getElementById('adminHistoricoEmpresaSelect'), true, "-- Selecione uma Empresa --", ""),
                populateEmpresasSelect(_supabaseClient, document.getElementById('adminUnidadeEmpresaSelect'), true, "-- Selecione uma Empresa --", "")
            ]);
            await fetchAndRenderEmpresas(_supabaseClient); 
            showAdminMasterDashboardScreen();
        } else if ((appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal') && appState.currentUser.empresa_id) {
            showEmpresaDashboardScreen();
        } else if (appState.currentUser.role === 'empresa_counter' && appState.currentUser.empresa_id) {
            showInventoryCountScreen_Empresa(_supabaseClient);
        }
        else {
            console.warn("Login successful but role unclear or company data missing:", appState.currentUser);
            await _supabaseClient.auth.signOut();
            setCurrentUser(null); 
            throw new Error("Função do usuário não definida ou dados da empresa ausentes.");
        }

    } catch (e) {
        console.error("Catch in login (auth.js):", e);
        setCurrentUser(null); 
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
        
        setCurrentUser(null);
        setAdminSelectedEmpresaContextId(null);
        setIsEmpresaManagerManagingOwnUsers(false);
        
        localStorage.removeItem('balancoQuantities_v3.1'); 
        
        if(loginEmailInput) loginEmailInput.value = "";
        if(loginPasswordInput) loginPasswordInput.value = "";
        
        showScreen('login', {}, appState.currentUser); 
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
    setAdminSelectedEmpresaContextId(null); 
    setIsEmpresaManagerManagingOwnUsers(false); 
    showScreen('adminMasterDashboard', {}, appState.currentUser); 
    if (adminMasterNameDisplay && appState.currentUser) {
        adminMasterNameDisplay.textContent = appState.currentUser.full_name || appState.currentUser.email;
    }
}

/**
 * Exibe a tela de dashboard da empresa.
 */
export async function showEmpresaDashboardScreen() {
    setAdminSelectedEmpresaContextId(appState.currentUser?.empresa_id); 
    setIsEmpresaManagerManagingOwnUsers(false); 
    showScreen('empresaDashboard', {}, appState.currentUser); 
    
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
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function showChangePasswordScreen_Empresa(_supabaseClient) { // Adicionado _supabaseClient aqui
    if (!appState.currentUser) { handleLogout(_supabaseClient); return; } 
    if (changingPasswordForUserDisplay) {
        changingPasswordForUserDisplay.textContent = appState.currentUser.email; // Exibe o email do usuário logado
    }
    if(currentPasswordGroup) currentPasswordGroup.style.display = 'block'; // Mostra o campo de senha atual
    if(changePasswordBackButton) changePasswordBackButton.style.display = 'block'; 
    showScreen('changePassword', {}, appState.currentUser); 
}

/**
 * Exibe a tela de alteração de senha para um usuário específico (Admin Master).
 * @param {string} userIdToChange ID do usuário cuja senha será alterada.
 * @param {string} userEmailToChange Email do usuário cuja senha será alterada.
 */
export async function showChangePasswordScreen_Admin(userIdToChange, userEmailToChange) {
    if (!appState.currentUser || appState.currentUser.role !== 'admin_master') { handleLogout(_supabaseClient); return; } 
    if(changingPasswordForUserDisplay) changingPasswordForUserDisplay.textContent = userEmailToChange; // Exibe o email do usuário TARGET
    if(currentPasswordGroup) currentPasswordGroup.style.display = 'none'; // Esconde o campo de senha atual para admin_master
    if(changePasswordBackButton) changePasswordBackButton.style.display = 'block'; 
    changePasswordBackButton.dataset.userIdToChange = userIdToChange;
    showScreen('changePassword', {}, appState.currentUser); 
}

/**
 * Lida com a alteração de senha.
 * Se admin_master, tentará chamar uma Edge Function para redefinir a senha de outro usuário.
 * Se usuário comum, tentará alterar a própria senha.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function handleChangePassword(_supabaseClient) {
    if (!newPasswordInput || !confirmNewPasswordInput || !changePasswordMessage) {
        console.error("Elementos de input de senha não encontrados.");
        return;
    }

    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;
    const currentPassword = currentPasswordInput ? currentPasswordInput.value : null; 
    changePasswordMessage.textContent = '';
    changePasswordMessage.className = 'message'; 

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
    if (appState.currentUser?.role !== 'admin_master' && currentPasswordGroup.style.display === 'block' && !currentPassword) {
        changePasswordMessage.textContent = 'Por favor, insira sua senha atual.';
        changePasswordMessage.classList.add('error-message');
        return;
    }

    showLoader();
    try {
        let error;
        // Se o usuário logado for admin_master e tentar redefinir senha de OUTRO usuário
        if (appState.currentUser?.role === 'admin_master' && changePasswordBackButton?.dataset.userIdToChange) {
            const userIdToReset = changePasswordBackButton.dataset.userIdToChange;
            console.log(`Admin Master tentando redefinir senha para o usuário ID: ${userIdToReset} via Edge Function.`);
            
            // AQUI ESTÁ A CHAMADA PARA A EDGE FUNCTION
            // Você precisará criar uma Edge Function chamada 'reset-user-password' no seu projeto Supabase
            // que use a service_role key para chamar supabase.auth.admin.updateUserById
            const { data: edgeFunctionData, error: edgeFunctionError } = await _supabaseClient.functions.invoke('reset-user-password', {
                body: JSON.stringify({
                    target_user_id: userIdToReset,
                    new_password: newPassword
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (edgeFunctionError) {
                throw new Error(edgeFunctionError.message || "Erro na chamada da Edge Function.");
            }
            if (edgeFunctionData && edgeFunctionData.error) {
                throw new Error(edgeFunctionData.error);
            }
            
            // Se a Edge Function retornar sucesso, e opcionalmente a senha (para exibir)
            changePasswordMessage.textContent = `Senha redefinida com sucesso para o usuário!`;
            if (edgeFunctionData && edgeFunctionData.new_password) { // Se a Edge Function retornar a senha
                changePasswordMessage.textContent += ` Nova Senha: ${edgeFunctionData.new_password}`;
            }
            changePasswordMessage.classList.add('success-message');

        } else {
            // Para usuários comuns (gerente/contador) alterando a própria senha
            console.log(`Usuário comum (${appState.currentUser?.email}) alterando a própria senha.`);
            const { error: userUpdateError } = await _supabaseClient.auth.updateUser({
                password: newPassword
            });
            error = userUpdateError;

            if (error) throw error; // Se deu erro na alteração da própria senha
            
            changePasswordMessage.textContent = 'Senha alterada com sucesso!';
            changePasswordMessage.classList.add('success-message');
        }

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