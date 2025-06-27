import { _supabaseClient } from './supabase-client.js';
import { state, ADMIN_MASTER_EMAIL } from './state.js';
import { showLoader, hideLoader, showToast, showScreen } from './ui-manager.js';
import * as Auth from './auth.js';
import * as Users from './admin/users.js';
import * as Unidades from './unidades.js';
import * as Categorias from './categorias.js';
import * as Setores from './setores.js';
import * as Dom from './dom-selectors.js';
import * as Contagens from './contagens.js';
import * as Historico from './historico.js';
import * as Produtos from './produtos.js';
import * as Colaboradores from './colaboradores.js'; // NOVO: Importa o módulo de colaboradores

// Variável para armazenar a tela atualmente ativa
let currentActiveScreenId = 'screenLogin';

// Sobrescreve a função showScreen para rastrear a tela ativa
const originalShowScreen = showScreen;
window.showScreen = function(screenId) {
    originalShowScreen(screenId);
    currentActiveScreenId = screenId;
    console.log('[Main] Tela ativa atualizada para:', currentActiveScreenId);
};

// Variável para rastrear se o usuário estava logado antes do evento
let wasLoggedInBeforeEvent = false;


async function handleUserSession(session, eventType) {
    console.log('[Main] handleUserSession chamada. Sessão:', session, 'Evento:', eventType);
    showLoader();

    const isCurrentlyLoggedIn = !!session;

    if (isCurrentlyLoggedIn) {
        state.currentUser = session.user;
        console.log('[Main] Usuário autenticado (início do handleUserSession):', state.currentUser);

        const isCurrentlyOnLoginScreen = currentActiveScreenId === 'screenLogin'; 
        
        let shouldForceInitialRedirect = false;

        if (eventType === 'SIGNED_OUT' && isCurrentlyLoggedIn) {
            console.warn('[Main] Condição de Redirecionamento: SIGNED_OUT mas ainda está logado, forçando logout.');
            wasLoggedInBeforeEvent = false;
            return await Auth.handleLogout();
        } 
        else if (eventType === 'SIGNED_IN' && !wasLoggedInBeforeEvent) {
            shouldForceInitialRedirect = true;
            console.log('[Main] Condição de Redirecionamento: SIGNED_IN (verdadeiro primeiro login).');
        } else if (eventType === 'INITIAL_SESSION' && isCurrentlyOnLoginScreen) {
            shouldForceInitialRedirect = true;
            console.log('[Main] Condição de Redirecionamento: INITIAL_SESSION na tela de login.');
        } 
        // DEFESA ROBUSTA CONTRA INITIAL_SESSION INDEVIDO: Se já logado e não na tela de login, não redireciona.
        else if (eventType === 'INITIAL_SESSION' && state.currentUser && !isCurrentlyOnLoginScreen) {
             shouldForceInitialRedirect = false;
             console.log('[Main] DEFESA FINAL ATIVADA: INITIAL_SESSION com usuário existente e NÃO na tela de login. NÃO redirecionando.');
             hideLoader(); 
             return; 
        }
        else if (eventType === 'TOKEN_REFRESHED') {
            shouldForceInitialRedirect = false;
            console.log('[Main] Condição de Redirecionamento: TOKEN_REFRESHED, mantendo na tela atual.');
        }
        else {
            console.log('[Main] Condição de Redirecionamento: Sessão ativa em tela esperada ou evento não requer redirecionamento forçado.');
        }

        console.log('[Main] FINAL shouldForceInitialRedirect:', shouldForceInitialRedirect, 'Evento:', eventType, 'Estava logado antes?', wasLoggedInBeforeEvent, 'Na tela de login?', isCurrentlyOnLoginScreen, 'currentActiveScreenId:', currentActiveScreenId);

        if (!shouldForceInitialRedirect && state.currentUser && state.currentUser.user_role) {
             console.log('[Main] Não há redirecionamento forçado e role já definida. Pulando busca de perfil.');
        } else {
            const { data: profile, error: profileError } = await _supabaseClient
                .from('user_profiles')
                .select('user_role')
                .eq('id', session.user.id)
                .single();

            if (profileError || !profile) {
                console.error('[Main] Erro ao carregar perfil do usuário ou perfil não encontrado (após decisão):', profileError);
                showToast('Erro ao carregar perfil do usuário.', 'error');
                wasLoggedInBeforeEvent = false;
                hideLoader(); 
                return await Auth.handleLogout();
            }

            state.currentUser.user_role = profile.user_role;
            console.log('[Main] Role do usuário (após busca):', state.currentUser.user_role);

            if (shouldForceInitialRedirect) {
                console.log('[Main] Redirecionamento FORÇADO acionado.');
                if (state.currentUser.user_role === 'admin' || state.currentUser.user_role === 'gerente') {
                    Auth.showAdminDashboardScreen();
                    console.log('[Main] Redirecionando para Painel Admin/Gerente.');
                } else if (state.currentUser.user_role === 'contador') {
                    Auth.showInventoryCountScreenProtected();
                    console.log('[Main] Redirecionando para Tela de Contagem.');
                } else {
                    console.warn('[Main] Role de usuário desconhecida. Redirecionando para login.');
                    showToast('Sua função de usuário não foi reconhecida. Por favor, contate o administrador.', 'error');
                    Auth.handleLogout();
                }
            }
        }
    } else { // Sem sessão (SIGNED_OUT ou session é null)
        state.currentUser = null;
        console.log('[Main] Nenhuma sessão. Redirecionando para Login.');
        window.showScreen('screenLogin');
    }

    wasLoggedInBeforeEvent = isCurrentlyLoggedIn;
    hideLoader(); 
}

function setupEventListeners() {
    if (Dom.loginFormEl) Dom.loginFormEl.addEventListener('submit', Auth.handleLoginFormSubmit);
    if (Dom.btnLogoutEl) Dom.btnLogoutEl.addEventListener('click', Auth.handleLogout);

    if (Dom.btnGoToManageUsersEl) Dom.btnGoToManageUsersEl.addEventListener('click', () => Auth.showProtectedAdminScreen('screenManageUsers', Users.showUsersScreen));
    if (Dom.btnGoToManageUnidadesEl) Dom.btnGoToManageUnidadesEl.addEventListener('click', () => Auth.showProtectedAdminScreen('screenUnidades', Unidades.showUnidadesScreen));
    if (Dom.btnGoToManageCategoriasEl) Dom.btnGoToManageCategoriasEl.addEventListener('click', () => Auth.showProtectedAdminScreen('screenCategorias', Categorias.showCategoriasScreen));
    if (Dom.btnGoToManageProductsEl) Dom.btnGoToManageProductsEl.addEventListener('click', () => Auth.showProtectedAdminScreen('screenProductManagement', Produtos.showProductManagementScreen));
    if (Dom.btnGoToManageSetoresEl) Dom.btnGoToManageSetoresEl.addEventListener('click', () => Auth.showProtectedAdminScreen('screenSetores', Setores.showSetoresScreen));
    
    // NOVO: Listener para o botão de Gerenciar Colaboradores
    if (Dom.btnGoToManageColaboradoresEl) Dom.btnGoToManageColaboradoresEl.addEventListener('click', () => Auth.showProtectedAdminScreen('screenEmpresaColaboradores', Colaboradores.showEmpresaColaboradoresScreen));
    // FIM NOVO

    if (Dom.btnGoToInventoryCountEl) Dom.btnGoToInventoryCountEl.addEventListener('click', Auth.showInventoryCountScreenProtected);
    if (Dom.btnGoToHistoricoContagensEl) Dom.btnGoToHistoricoContagensEl.addEventListener('click', Auth.showHistoricoContagensScreenProtected);


    if (Dom.btnUsersBackEl) Dom.btnUsersBackEl.addEventListener('click', Auth.showAdminDashboardScreen);
    if (Dom.btnUnidadesBackEl) Dom.btnUnidadesBackEl.addEventListener('click', Auth.showAdminDashboardScreen);
    if (Dom.btnCategoriasBackEl) Dom.btnCategoriasBackEl.addEventListener('click', Auth.showAdminDashboardScreen);
    if (Dom.productManagementBackButtonEl) Dom.productManagementBackButtonEl.addEventListener('click', Auth.showAdminDashboardScreen);
    if (Dom.btnSetoresBackEl) Dom.btnSetoresBackEl.addEventListener('click', Auth.showAdminDashboardScreen);
    // NOVO: Listener para o botão de voltar da tela de Colaboradores
    if (Dom.colaboradoresBackButtonEl) Dom.colaboradoresBackButtonEl.addEventListener('click', Auth.showAdminDashboardScreen);
    // FIM NOVO
    if (Dom.inventoryCountBackButtonEl) Dom.inventoryCountBackButtonEl.addEventListener('click', Auth.showAdminDashboardScreen);
    if (Dom.historicoBackButtonEl) Dom.historicoBackButtonEl.addEventListener('click', Auth.showAdminDashboardScreen);

    if (Dom.createUserFormEl) Dom.createUserFormEl.addEventListener('submit', Users.handleCreateUser);
    if (Dom.addUnidadeFormEl) Dom.addUnidadeFormEl.addEventListener('submit', Unidades.handleAddUnidade);
    if (Dom.addCategoriaFormEl) Dom.addCategoriaFormEl.addEventListener('submit', Categorias.handleAddCategoria);
    if (Dom.addProductFormEl) Dom.addProductFormEl.addEventListener('submit', Produtos.handleAddProduct);
    if (Dom.addSetorFormEl) Dom.addSetorFormEl.addEventListener('submit', Setores.handleAddSetor);
    // O event listener para addColaboradorFormEl JÁ está no colaboradores.js, então não precisa aqui.
}

function runApplication() {
    setupEventListeners();
    console.log('[Main] Aplicação iniciada. Configurando listener de autenticação.');

    initializeSessionAndNavigate();

    _supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('[Main] Evento de autenticação no onAuthStateChange (subsequente):', event, 'Sessão:', session);
        handleUserSession(session, event);
    });
}

async function initializeSessionAndNavigate() {
    showLoader();
    try {
        const { data: { session }, error } = await _supabaseClient.auth.getSession();
        if (error) throw error;

        wasLoggedInBeforeEvent = !!session;
        console.log('[Main] Estado inicial de login após getSession:', wasLoggedInBeforeEvent);

        if (session) {
            const { data: profile, error: profileError } = await _supabaseClient
                .from('user_profiles')
                .select('user_role')
                .eq('id', session.user.id)
                .single();

            if (profileError || !profile) {
                console.error('[Main] Erro ao carregar perfil durante inicialização:', profileError);
                showToast('Erro ao carregar perfil na inicialização.', 'error');
                window.showScreen('screenLogin');
                state.currentUser = null;
            } else {
                state.currentUser = { ...session.user, user_role: profile.user_role };
                console.log('[Main] Usuário logado na inicialização:', state.currentUser.user_role);

                if (state.currentUser.user_role === 'admin' || state.currentUser.user_role === 'gerente') {
                    Auth.showAdminDashboardScreen();
                    console.log('[Main] Redirecionando para Painel Admin/Gerente.');
                } else if (state.currentUser.user_role === 'contador') {
                    Auth.showInventoryCountScreenProtected();
                    console.log('[Main] Redirecionando para Tela de Contagem.');
                } else {
                    console.warn('[Main] Role de usuário desconhecida. Redirecionando para login.');
                    showToast('Sua função de usuário não foi reconhecida. Por favor, contate o administrador.', 'error');
                    Auth.handleLogout();
                }
            }
        } else {
            window.showScreen('screenLogin');
            state.currentUser = null;
            console.log('[Main] Nenhuma sessão inicial, exibindo tela de login.');
        }
    } catch (e) {
        console.error('[Main] Erro na inicialização da sessão e navegação:', e);
        showToast('Erro crítico na inicialização. Tentando logout.', 'error');
        Auth.handleLogout();
    } finally {
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', runApplication);