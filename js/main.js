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
import { handleLogin, handleLogout, showAdminMasterDashboardScreen, showEmpresaDashboardScreen, showChangePasswordScreen_Empresa, handleChangePassword } from './auth.js';
import { appState, setCurrentUser, resetAppState } from './state.js';
import { showScreen, showLoader, hideLoader } from './ui-manager.js';
import { loadQuantities, saveQuantities, generateNumericPassword, clearAllQuantities, updateExportButtonStates } from './utils.js';
import { showManageEmpresasAndUsersScreen_Admin, handleAdminAddEmpresa, fetchAndRenderEmpresas } from './admin/empresas.js'; // <-- ADICIONADA AQUI
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
(async () => {
    const supabaseClient = await initializeSupabase(); 

    if (!supabaseClient) {
        console.error("A inicialização do Supabase falhou. O aplicativo não será executado.");
        return; 
    }

    document.addEventListener('DOMContentLoaded', () => {
        runApplication(supabaseClient);
    });
})();


/**
 * Função principal que contém toda a lógica de inicialização do seu aplicativo.
 * Ela só é chamada depois que a conexão com o Supabase é estabelecida e o HTML está pronto.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
async function runApplication(_supabaseClient) {
    console.log("runApplication iniciada. Configurando o sistema...");
    
    initializeDOMSelectors();
    loadQuantities();

    // Adiciona todos os seus event listeners
    document.getElementById('loginButton')?.addEventListener('click', () => handleLogin(_supabaseClient));
    document.getElementById('loginPassword')?.addEventListener('keypress', e => { 
        if (e.key === 'Enter') { 
            e.preventDefault(); 
            handleLogin(_supabaseClient); 
        }
    });
    document.getElementById('btnLogoutAdmin')?.addEventListener('click', () => {
        resetAppState(); 
        handleLogout(_supabaseClient);
    });
    document.getElementById('btnLogoutEmpresa')?.addEventListener('click', () => {
        resetAppState(); 
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
    document.getElementById('btnEmpresaAlterarSenha')?.addEventListener('click', () => showChangePasswordScreen_Empresa(_supabaseClient));
    
    btnCategoriasVoltarEl?.addEventListener('click', () => {
        if (appState.currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
        else if (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
        else showScreen('login', {}, appState.currentUser);
    });
    btnAddCategoriaEl?.addEventListener('click', () => handleAddCategoria(_supabaseClient));
    document.getElementById('btnAdminEmpresasVoltar')?.addEventListener('click', showAdminMasterDashboardScreen);
    document.getElementById('btnAdminAddEmpresa')?.addEventListener('click', () => handleAdminAddEmpresa(_supabaseClient));
    btnManageEmpresaUsersVoltarEl?.addEventListener('click', closeManageEmpresaUsersScreen);
    document.getElementById('btnExecuteCreateNewEmpresaUser')?.addEventListener('click', () => handleCreateEmpresaUser(_supabaseClient));
    btnUnidadesVoltarEl?.addEventListener('click', () => {
        if (appState.currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
        else if (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
        else showScreen('login', {}, appState.currentUser);
    });
    btnAddUnidadeEl?.addEventListener('click', () => handleAddUnidade(_supabaseClient));
    document.getElementById('btnAddColaborador')?.addEventListener('click', () => handleAddColaborador(_supabaseClient));
    document.getElementById('btnSalvarNovaSenha')?.addEventListener('click', () => handleChangePassword(_supabaseClient));
    btnAddProductEl?.addEventListener('click', () => handleAddProduct(_supabaseClient));
    btnImportXLSXEl?.addEventListener('click', (e) => handleXLSXImport(e, _supabaseClient));
    document.getElementById('btnShowPreviewContagem')?.addEventListener('click', () => showPreviewContagem(_supabaseClient));
    btnGerarTXT?.addEventListener('click', () => gerarArquivoTXT(_supabaseClient));
    btnGerarPDF?.addEventListener('click', () => gerarPDFContagem(_supabaseClient));
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
        else if (appState.currentUser?.role === 'empresa_counter') handleLogout(_supabaseClient);
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
        console.log("Tentando obter sessão Supabase (runApplication - main.js)...");
        const { data: { session }, error: sessionError } = await _supabaseClient.auth.getSession();
        if (sessionError) { throw sessionError; }

        if (session?.user) {
            console.log("Sessão encontrada para:", session.user.email);
            const { data: profile, error: profileError } = await _supabaseClient.from('user_profiles').select('*, empresas (id, nome_empresa)').eq('id', session.user.id).single();
            if(profileError) {
                if (profileError.code === 'PGRST116') {
                    console.warn("Sessão de autenticação válida, mas perfil não encontrado. Deslogando.");
                    await _supabaseClient.auth.signOut();
                    resetAppState();
                    showScreen('login', {}, appState.currentUser);
                    return;
                }
                throw profileError;
            }
            
            setCurrentUser({
                id: session.user.id,
                email: session.user.email,
                user_metadata: session.user.user_metadata,
                full_name: profile.full_name || session.user.email,
                role: profile.role,
                empresa_id: profile.empresa_id,
                empresa_nome: profile.empresas?.nome_empresa
            });
            console.log("Usuário restaurado da sessão (runApplication - main.js):", appState.currentUser);

            if (appState.currentUser.role === 'admin_master') {
                await fetchAndRenderEmpresas(_supabaseClient); 
                showAdminMasterDashboardScreen();
            } else if (appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal') {
                showEmpresaDashboardScreen();
            } else if (appState.currentUser.role === 'empresa_counter') {
                showInventoryCountScreen_Empresa(_supabaseClient);
            } else {
                showScreen('login', {}, appState.currentUser);
            }
        } else {
            console.log("Nenhuma sessão ativa encontrada (runApplication - main.js).");
            showScreen('login', {}, appState.currentUser);
        }
    } catch (e) {
        console.error("Erro crítico ao restaurar sessão (runApplication - main.js):", e);
        await _supabaseClient.auth.signOut();
        resetAppState();
        showScreen('login', {}, appState.currentUser);
    } finally {
        hideLoader();
        console.log("Inicialização finalizada (runApplication - main.js).");
    }
}