// js/admin/empresas.js

import { showLoader, hideLoader, showScreen } from '../ui-manager.js';
import { adminEmpresasTableBody, adminNomeEmpresaInput, adminEmpresasTitleEl, 
         adminUnidadeEmpresaSelectEl, adminCategoriaEmpresaSelectEl, 
         adminProdutoEmpresaSelect, adminContagemEmpresaSelect, adminHistoricoEmpresaSelect 
} from '../dom-selectors.js';
import { appState, setCurrentUser, setAdminSelectedEmpresaContextId, setIsEmpresaManagerManagingOwnUsers, ADMIN_MASTER_EMAIL } from '../state.js'; // Importa o appState e seus setters
import { empresasCache, populateEmpresasSelect } from '../data-cache.js';
import { showManageUsersScreen_Admin } from './users.js'; 
import { showUnidadesScreen } from '../unidades.js';
import { showEmpresaColaboradoresScreen } from '../colaboradores.js'; 
import { generateNumericPassword } from '../utils.js'; // Importa generateNumericPassword de utils.js

/**
 * Exibe a tela de gerenciamento de empresas para o Admin Master.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function showManageEmpresasAndUsersScreen_Admin(_supabaseClient) {
    if (!appState.currentUser || appState.currentUser?.role !== 'admin_master') {
        alert("Acesso negado. Apenas Admin Master pode gerenciar empresas.");
        // Não é necessário chamar handleLogout aqui, showScreen('login') já faz a limpeza da sessão se for o caso
        showScreen('login', {}, appState.currentUser); 
        return;
    }
    console.log("showManageEmpresasAndUsersScreen_Admin called");
    setIsEmpresaManagerManagingOwnUsers(false); // Atualiza o estado global
    if(adminEmpresasTitleEl) adminEmpresasTitleEl.textContent = "Gerenciar Empresas e Seus Usuários";
    showLoader();
    try {
        await fetchAndRenderEmpresas(_supabaseClient);
        showScreen('adminEmpresas', {}, appState.currentUser); // Passa appState.currentUser
    } catch (e) {
        console.error("Erro ao carregar tela de empresas para Admin:", e);
        alert("Erro ao carregar tela de empresas.");
    } finally {
        hideLoader();
    }
}

/**
 * Busca e renderiza a lista de empresas na tabela de gerenciamento de empresas.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function fetchAndRenderEmpresas(_supabaseClient) {
    if (!adminEmpresasTableBody) {
        console.error("adminEmpresasTableBody not found");
        hideLoader();
        return;
    }
    adminEmpresasTableBody.innerHTML = '<tr><td colspan="3">Carregando empresas...</td></tr>';
    showLoader();
    try {
        const { data: companiesData, error: companiesError } = await _supabaseClient
            .from('empresas')
            .select('id, nome_empresa, created_at')
            .order('nome_empresa');
        if (companiesError) throw companiesError;
        
        // Atualiza o cache global de empresas em data-cache.js
        empresasCache.splice(0, empresasCache.length, ...(companiesData || []));

        adminEmpresasTableBody.innerHTML = "";
        if (empresasCache.length > 0) {
            empresasCache.forEach(empresa => {
                const row = adminEmpresasTableBody.insertRow();
                row.insertCell().textContent = empresa.nome_empresa;
                row.insertCell().textContent = new Date(empresa.created_at).toLocaleDateString('pt-BR');
                const actionsCell = row.insertCell();

                const btnManageUsers = document.createElement('button');
                btnManageUsers.textContent = 'Gerenciar Usuários';
                btnManageUsers.className = 'btn btn-info table-actions';
                btnManageUsers.onclick = () => showManageUsersScreen_Admin(_supabaseClient, empresa.id, empresa.nome_empresa); // Passa _supabaseClient
                actionsCell.appendChild(btnManageUsers);

                const btnManageUnits = document.createElement('button');
                btnManageUnits.textContent = 'Unidades';
                btnManageUnits.className = 'btn btn-primary table-actions';
                btnManageUnits.onclick = () => showUnidadesScreen(_supabaseClient, empresa.id, empresa.nome_empresa, true); // Passa _supabaseClient e isAdminCalling=true
                actionsCell.appendChild(btnManageUnits);

                const btnManageColabs = document.createElement('button');
                btnManageColabs.textContent = 'Colaboradores';
                btnManageColabs.className = 'btn btn-secondary table-actions';
                btnManageColabs.onclick = () => showEmpresaColaboradoresScreen(_supabaseClient, empresa.id, empresa.nome_empresa, true); // Passa _supabaseClient e isAdminCalling=true
                actionsCell.appendChild(btnManageColabs);
            });
        } else {
            adminEmpresasTableBody.innerHTML = '<tr><td colspan="3">Nenhuma empresa cadastrada.</td></tr>';
        }
    } catch (e) {
        console.error("Erro ao listar empresas:", e);
        if(adminEmpresasTableBody) adminEmpresasTableBody.innerHTML = `<tr><td colspan="3" style="color:var(--danger-color);">Erro ao carregar empresas: ${e.message}</td></tr>`;
    } finally {
        hideLoader();
    }
}

/**
 * Lida com a adição de uma nova empresa.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function handleAdminAddEmpresa(_supabaseClient) {
    if(!adminNomeEmpresaInput) {
        console.error("adminNomeEmpresaInput not found.");
        return;
    }
    const nomeEmpresa = adminNomeEmpresaInput.value.trim();
    if (!nomeEmpresa) {
        alert('Digite o nome da empresa.');
        return;
    }
    showLoader();
    try {
        // Verifica se a empresa já existe (case-insensitive)
        const { data: existingCompany, error: checkError } = await _supabaseClient
            .from('empresas')
            .select('id')
            .ilike('nome_empresa', nomeEmpresa)
            .maybeSingle(); 

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 é "No rows found"
            throw checkError;
        }
        if (existingCompany) {
            alert('Uma empresa com este nome já existe.');
            hideLoader();
            return;
        }

        // Primeiro, cria o usuário administrador principal da empresa no Supabase Auth
        const newPassword = generateNumericPassword();
        const emailEmpresa = `login_${nomeEmpresa.toLowerCase().replace(/\s/g, '')}@balanco.com`;

        console.log("Tentando criar usuário auth para nova empresa:", emailEmpresa);
        const { data: userData, error: signUpError } = await _supabaseClient.auth.signUp({
            email: emailEmpresa,
            password: newPassword,
            options: {
                data: {
                    full_name: `Gerente Principal ${nomeEmpresa}`,
                    user_role: 'empresa_login_principal'
                }
            }
        });
        
        if (signUpError) {
            // Se o erro for "User already registered", tenta encontrar o usuário para reutilizar
            if (signUpError.message.includes("User already registered") || signUpError.message.includes("already exists")) {
                console.warn(`Usuário ${emailEmpresa} já existe no Auth. Tentando encontrar para associar à nova empresa.`);
                const { data: existingAuthUser, error: getUserByEmailError } = await _supabaseClient.auth.admin.getUserByEmail(emailEmpresa);
                if (getUserByEmailError || !existingAuthUser?.user) {
                    throw new Error(`Erro ao encontrar usuário existente: ${getUserByEmailError?.message || 'usuário não encontrado.'}`);
                }
                userData.user = existingAuthUser.user; // Reutiliza o usuário existente do Auth
            } else {
                throw signUpError;
            }
        }

        const userId = userData.user.id;
        console.log("Usuário Auth para empresa criado/encontrado:", userId);

        // Em seguida, insere a nova empresa na tabela 'empresas'
        const { data: empresaData, error: empresaError } = await _supabaseClient
            .from('empresas')
            .insert([{ nome_empresa: nomeEmpresa }])
            .select()
            .single();

        if (empresaError) throw empresaError;
        const empresaId = empresaData.id;
        console.log("Empresa criada:", nomeEmpresa, "ID:", empresaId);

        // Atualiza o perfil do usuário criado para vinculá-lo à nova empresa e definir o role
        const { error: profileUpdateError } = await _supabaseClient
            .from('user_profiles')
            .upsert({
                id: userId,
                empresa_id: empresaId,
                role: 'empresa_login_principal', // Garante que o role esteja no user_profiles
                full_name: `Gerente Principal ${nomeEmpresa}`,
                email: emailEmpresa // Garante que o email esteja no perfil
            });
        
        if (profileUpdateError) throw profileUpdateError;


        alert(`Empresa "${nomeEmpresa}" criada com sucesso!\n\nUsuário Admin Principal: ${emailEmpresa}\nSenha Temporária: ${newPassword}\n\nPor favor, anote e altere a senha no primeiro acesso.`);
        adminNomeEmpresaInput.value = '';
        await fetchAndRenderEmpresas(_supabaseClient); // Atualiza a lista de empresas (repassa _supabaseClient)

        // Atualiza os selects de empresa em outros módulos (categorias, produtos, contagem, histórico, unidades)
        // Usando o populateEmpresasSelect que agora aceita _supabaseClient
        await populateEmpresasSelect(_supabaseClient, adminCategoriaEmpresaSelectEl, true, "-- Selecione uma Empresa --", "");
        await populateEmpresasSelect(_supabaseClient, adminProdutoEmpresaSelect, true, "-- Selecione uma Empresa --", "");
        await populateEmpresasSelect(_supabaseClient, adminContagemEmpresaSelect, true, "-- Selecione uma Empresa --", "");
        await populateEmpresasSelect(_supabaseClient, adminHistoricoEmpresaSelect, true, "-- Selecione uma Empresa --", "");
        await populateEmpresasSelect(_supabaseClient, adminUnidadeEmpresaSelectEl, true, "-- Selecione uma Empresa --", "");

    } catch (e) {
        console.error("Erro ao adicionar empresa:", e);
        alert(`Erro ao adicionar empresa: ${e.message}`);
    } finally {
        hideLoader();
    }
}