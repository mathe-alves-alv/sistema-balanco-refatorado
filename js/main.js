// Script version v3.1 - Refatorado com Inicialização Robusta e Completa
// js/main.js

console.log("SCRIPT INICIADO - v3.1 Robusto (main.js)");

import { initializeDOMSelectors,
    loginEmailInput, loginPasswordInput,
    btnCategoriasVoltarEl, btnAddCategoriaEl,
    btnManageEmpresaUsersVoltarEl, btnUnidadesVoltarEl, btnAddUnidadeEl,
    btnAddProductEl, btnImportXLSXEl, btnGerarTXT, btnGerarPDF,
    modalPreviewContagem, previewContagemTableContainer,
    modalDetalhesContagem, detalhesContagemConteudo,
    changePasswordBackButton, productManagementBackButton, inventoryCountBackButton, historicoBackButton,
    pesquisaProdutoInput, pesquisaCodigoInput, filtroCategoriaSelect, filtroUnidadeSelect
} from './dom-selectors.js';

import { initializeSupabase } from './supabase-client.js';
// Importa as funções de autenticação e o objeto de estado do usuário
import { handleLogin, handleLogout, showAdminMasterDashboardScreen, showEmpresaDashboardScreen, showChangePasswordScreen_Empresa, handleChangePassword } from './auth.js';
import { appState, setCurrentUser, resetAppState } from './state.js'; // Importa o estado global e funcs de set
import { showScreen, showLoader, hideLoader } from './ui-manager.js';
import { loadQuantities, saveQuantities, generateNumericPassword, clearAllQuantities, updateExportButtonStates } from './utils.js';
import { showManageEmpresasAndUsersScreen_Admin, handleAdminAddEmpresa } from './admin/empresas.js';
import { showManageUsersScreen_Admin, showManageUsersScreen_Empresa, closeManageEmpresaUsersScreen, handleCreateEmpresaUser } from './admin/users.js';
import { showUnidadesScreen, handleAddUnidade } from './unidades.js';
import { showCategoriasScreen_Admin, showCategoriasScreen_Empresa, handleAddCategoria } from './categorias.js';
import { showEmpresaColaboradoresScreen, handleAddColaborador } from './colaboradores.js';
import { showProductManagementScreen_AdminGlobal, showProductManagementScreen_Empresa, handleAddProduct, handleXLSXImport } from './produtos.js';
import { showInventoryCountScreen_AdminGlobal, showInventoryCountScreen_Empresa, showPreviewContagem, handleSaveContagem, gerarArquivoTXT, gerarPDFContagem, filterInventoryProducts, closeModalPreviewContagem } from './contagens.js';
import { showHistoricoContagensScreen_Admin, showHistoricoContagensScreen, closeModalDetalhesContagem, showDetalhesContagem } from './historico.js';


// ==================================================================
// == PONTO DE ENTRADA PRINCIPAL DO SCRIPT ==
// ==================================================================
// Este bloco auto-executável é a primeira coisa que roda.
(async () => {
    // 1. Tenta criar a conexão com o Supabase
    const supabaseClient = await initializeSupabase(); 

    // 2. Se a conexão falhar, interrompe tudo.
    if (!supabaseClient) {
        console.error("A inicialização do Supabase falhou. O aplicativo não será executado.");
        return; 
    }

    // 3. Se a conexão for bem-sucedida, espera o HTML estar pronto.
    document.addEventListener('DOMContentLoaded', () => {
        // 4. Quando o HTML estiver pronto, executa o aplicativo principal, passando a conexão como argumento.
        runApplication(supabaseClient);
    });
})();


/**
 * Função principal que contém toda a lógica do seu aplicativo.
 * Ela só é chamada depois que a conexão com o Supabase é estabelecida e o HTML está pronto.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
function runApplication(_supabaseClient) {
    console.log("runApplication iniciada. Configurando o sistema...");
    
    initializeDOMSelectors();
    loadQuantities(); // Importado de utils.js

    // Adiciona todos os seus event listeners
    document.getElementById('loginButton')?.addEventListener('click', () => handleLogin(_supabaseClient));
    document.getElementById('loginPassword')?.addEventListener('keypress', e => { 
        if (e.key === 'Enter') { 
            e.preventDefault(); 
            handleLogin(_supabaseClient); 
        }
    });
    document.getElementById('btnLogoutAdmin')?.addEventListener('click', () => {
        resetAppState(); // Reseta o estado ao deslogar
        handleLogout(_supabaseClient);
    });
    document.getElementById('btnLogoutEmpresa')?.addEventListener('click', () => {
        resetAppState(); // Reseta o estado ao deslogar
        handleLogout(_supabaseClient);
    });
    document.getElementById('btnAdminGerenciarEmpresas')?.addEventListener('click', () => showManageEmpresasAndUsersScreen_Admin(_supabaseClient));
    document.getElementById('btnAdminGerenciarUnidades')?.addEventListener('click', () => showUnidadesScreen(_supabaseClient, null, null, true));
    document.getElementById('btnAdminGerenciarCategorias')?.addEventListener('click', () => showCategoriasScreen_Admin(_supabaseClient));
    document.getElementById('btnAdminGerenciarProdutos')?.addEventListener('click', () => showProductManagementScreen_AdminGlobal(_supabaseClient));
    document.getElementById('btnAdminContagemEstoque')?.addEventListener('click', () => showInventoryCountScreen_AdminGlobal(_supabaseClient));
    document.getElementById('btnAdminHistoricoContagens')?.addEventListener('click', () => showHistoricoContagensScreen_Admin(_supabaseClient));
    document.getElementById('btnEmpresaGerenciarUsuarios')?.addEventListener('click', () => showManageUsersScreen_Empresa(_supabaseClient));
    document.getElementById('btnEmpresaGerenciarUnidades')?.addEventListener('click', () => showUnidadesScreen(_supabaseClient, null, null, false));
    document.getElementById('btnEmpresaGerenciarColaboradores')?.addEventListener('click', () => showEmpresaColaboradoresScreen(_supabaseClient, null, null, false));
    document.getElementById('btnEmpresaGerenciarCategorias')?.addEventListener('click', () => showCategoriasScreen_Empresa(_supabaseClient));
    document.getElementById('btnEmpresaGerenciarProdutos')?.addEventListener('click', () => showProductManagementScreen_Empresa(_supabaseClient));
    document.getElementById('btnEmpresaContagemEstoque')?.addEventListener('click', () => showInventoryCountScreen_Empresa(_supabaseClient));
    document.getElementById('btnEmpresaHistoricoContagens')?.addEventListener('click', () => showHistoricoContagensScreen(_supabaseClient));
    document.getElementById('btnEmpresaAlterarSenha')?.addEventListener('click', showChangePasswordScreen_Empresa); 
    
    btnCategoriasVoltarEl?.addEventListener('click', () => {
        if (appState.currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
        else if (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
        else showScreen('login', {}, appState.currentUser); // Passa appState.currentUser
    });
    btnAddCategoriaEl?.addEventListener('click', () => handleAddCategoria(_supabaseClient));
    document.getElementById('btnAdminEmpresasVoltar')?.addEventListener('click', showAdminMasterDashboardScreen);
    document.getElementById('btnAdminAddEmpresa')?.addEventListener('click', () => handleAdminAddEmpresa(_supabaseClient));
    btnManageEmpresaUsersVoltarEl?.addEventListener('click', closeManageEmpresaUsersScreen);
    document.getElementById('btnExecuteCreateNewEmpresaUser')?.addEventListener('click', () => handleCreateEmpresaUser(_supabaseClient));
    btnUnidadesVoltarEl?.addEventListener('click', () => {
        if (appState.currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
        else if (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
        else showScreen('login', {}, appState.currentUser); // Passa appState.currentUser
    });
    btnAddUnidadeEl?.addEventListener('click', () => handleAddUnidade(_supabaseClient));
    document.getElementById('btnAddColaborador')?.addEventListener('click', () => handleAddColaborador(_supabaseClient));
    document.getElementById('btnSalvarNovaSenha')?.addEventListener('click', () => handleChangePassword(_supabaseClient));
    btnAddProductEl?.addEventListener('click', () => handleAddProduct(_supabaseClient));
    btnImportXLSXEl?.addEventListener('click', (e) => handleXLSXImport(e, _supabaseClient));
    document.getElementById('btnShowPreviewContagem')?.addEventListener('click', () => showPreviewContagem(_supabaseClient)); // Passa _supabaseClient
    btnGerarTXT?.addEventListener('click', () => gerarArquivoTXT(_supabaseClient)); // Passa _supabaseClient
    btnGerarPDF?.addEventListener('click', () => gerarPDFContagem(_supabaseClient)); // Passa _supabaseClient
    document.getElementById('btnClearAllQuantities')?.addEventListener('click', clearAllQuantities);
    document.getElementById('btnClosePreviewModal')?.addEventListener('click', closeModalPreviewContagem);
    document.getElementById('btnCloseDetalhesModal')?.addEventListener('click', closeModalDetalhesContagem);
    
    // Funções de retorno (backs)
    changePasswordBackButton?.addEventListener('click', () => {
        if (appState.currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
        else if (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
        else showScreen('login', {}, appState.currentUser);
    });
    productManagementBackButton?.addEventListener('click', () => {
        if (appState.currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
        else if (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
        else showScreen('login', {}, appState.currentUser);
    });
    inventoryCountBackButton?.addEventListener('click', () => {
        if (appState.currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
        else if (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
        else if (appState.currentUser?.role === 'empresa_counter') handleLogout(_supabaseClient); // Contador volta para login
        else showScreen('login', {}, appState.currentUser);
    });
    historicoBackButton?.addEventListener('click', () => {
        if (appState.currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
        else if (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
        else showScreen('login', {}, appState.currentUser);
    });
        
    console.log("Event listeners principais adicionados.");

    // Event listeners de filtro
    if (pesquisaProdutoInput) pesquisaProdutoInput.addEventListener("input", filterInventoryProducts);
    if (pesquisaCodigoInput) pesquisaCodigoInput.addEventListener("input", filterInventoryProducts);
    if (filtroCategoriaSelect) filtroCategoriaSelect.addEventListener("change", filterInventoryProducts);
    if (filtroUnidadeSelect) filtroUnidadeSelect.addEventListener("change", filterInventoryProducts);

    // Tenta restaurar a sessão do usuário
    try {
        console.log("Tentando obter sessão Supabase (main.js)...");
        const { data: { session }, error: sessionError } = await _supabaseClient.auth.getSession();
        if (sessionError) { throw sessionError; }

        if (session?.user) {
            console.log("Sessão encontrada para:", session.user.email);
            const { data: profile, error: profileError } = await _supabaseClient.from('user_profiles').select('*, empresas (id, nome_empresa)').eq('id', session.user.id).single();
            if(profileError) {
                if (profileError.code === 'PGRST116') {
                    console.warn("Sessão de autenticação válida, mas perfil não encontrado. Deslogando.");
                    await _supabaseClient.auth.signOut();
                    resetAppState(); // Reseta o estado ao deslogar
                    showScreen('login', {}, appState.currentUser);
                    return;
                }
                throw profileError;
            }
            
            // ATUALIZA O ESTADO GLOBAL USANDO A FUNÇÃO SETTER
            setCurrentUser({
                id: session.user.id,
                email: session.user.email,
                user_metadata: session.user.user_metadata,
                full_name: profile.full_name || session.user.email,
                role: profile.role,
                empresa_id: profile.empresa_id,
                empresa_nome: profile.empresas?.nome_empresa
            });
            console.log("Usuário restaurado da sessão (main.js):", appState.currentUser);

            // As chamadas para showScreen agora também precisam de currentUser
            if (appState.currentUser.role === 'admin_master') {
                await fetchAndRenderEmpresas(_supabaseClient); // fetchAndRenderEmpresas precisa ser ajustada para usar appState.currentUser.role
                showAdminMasterDashboardScreen();
            } else if (appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal') {
                showEmpresaDashboardScreen();
            } else if (appState.currentUser.role === 'empresa_counter') {
                showInventoryCountScreen_Empresa(_supabaseClient);
            } else {
                showScreen('login', {}, appState.currentUser);
            }
        } else {
            console.log("Nenhuma sessão ativa encontrada (main.js).");
            showScreen('login', {}, appState.currentUser);
        }
    } catch (e) {
        console.error("Erro crítico ao restaurar sessão (main.js):", e);
        await _supabaseClient.auth.signOut();
        resetAppState(); // Reseta o estado ao deslogar
        showScreen('login', {}, appState.currentUser);
    } finally {
        hideLoader();
        console.log("Inicialização finalizada (main.js).");
    }
}