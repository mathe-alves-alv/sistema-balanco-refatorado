// js/ui-manager.js

import { loadingIndicator, screens } from './dom-selectors.js';

/**
 * Exibe o indicador de carregamento.
 */
export function showLoader() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
}

/**
 * Esconde o indicador de carregamento.
 */
export function hideLoader() {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

/**
 * Mostra uma tela específica da aplicação e ajusta a visibilidade dos elementos conforme a tela.
 * @param {string} screenId O ID da tela a ser exibida (ex: 'login', 'adminMasterDashboard').
 * @param {object} [screenConfig={}] Objeto de configuração para a tela, contendo propriedades como title, context, showEmpresaSelector, etc.
 * @param {object} currentUser O objeto do usuário atualmente logado (passado de auth.js).
 */
export function showScreen(screenId, screenConfig = {}, currentUser) { // Adicionamos currentUser como parâmetro
    hideLoader();
    const mainCont = document.getElementById('mainContainer');
    const targetScreenElement = screens[screenId];

    // Esconde todas as telas primeiro
    Object.values(screens).forEach(sE => {
        if (sE && sE.classList) {
            sE.classList.remove('active');
        }
    });

    if (targetScreenElement && targetScreenElement.classList) {
        targetScreenElement.classList.add('active');

        // Ajusta a classe do container principal para layout diferente em certas telas
        if (mainCont) {
            mainCont.classList.toggle('content-container', ['adminEmpresas', 'manageEmpresaUsers', 'unidades', 'adminCategorias', 'productManagement', 'inventoryCount', 'empresaColaboradores', 'historicoContagens'].includes(screenId));
        }

        // Esconde todos os seletores de empresa/filtros por padrão
        ['adminProdutoEmpresaSelectorContainer', 'adminContagemEmpresaSelectorContainer', 'adminHistoricoEmpresaSelectorContainer',
         'adminCategoriaEmpresaSelectContainer', 'adminUnidadeEmpresaSelectContainer',
         'colEmpresaHistorico', 'historicoUnidadeFilterContainer'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });

        // Aplica configurações específicas da tela
        const { title, context, showEmpresaSelector, showEmpresaColumnInTable, isEmpresaContext = false } = screenConfig;
        
        // As referências DOM específicas para cada tela (como 'categoriasTitleEl')
        // ainda precisam ser importadas ou passadas. Por enquanto, estou usando 'document.getElementById'
        // diretamente para evitar uma importação gigante aqui. No futuro, poderemos otimizar.

        if (screenId === 'adminCategorias') {
            const categoriasTitleEl = document.getElementById('categoriasTitle');
            const categoriasContextEl = document.getElementById('categoriasContext');
            const adminCategoriaEmpresaSelectContainerEl = document.getElementById('adminCategoriaEmpresaSelectContainer');
            const thCategoriaEmpresaScopeEl = document.getElementById('thCategoriaEmpresaScope');

            if(categoriasTitleEl) categoriasTitleEl.textContent = title || 'Gerenciar Categorias';
            if(categoriasContextEl) categoriasContextEl.textContent = context || '';
            if(adminCategoriaEmpresaSelectContainerEl) adminCategoriaEmpresaSelectContainerEl.style.display = isEmpresaContext ? 'none' : 'block';
            if(thCategoriaEmpresaScopeEl) thCategoriaEmpresaScopeEl.style.display = isEmpresaContext ? 'none': '';
        } else if (screenId === 'unidades') {
            const unidadesTitleEl = document.getElementById('unidadesTitle');
            const unidadesContextEl = document.getElementById('unidadesContext');
            const adminUnidadeEmpresaSelectContainerEl = document.getElementById('adminUnidadeEmpresaSelectContainer');
            const thUnidadeEmpresaScopeEl = document.getElementById('thUnidadeEmpresaScope');

            if(unidadesTitleEl) unidadesTitleEl.textContent = title || 'Gerenciar Unidades';
            if(unidadesContextEl) unidadesContextEl.textContent = context || '';
            if(adminUnidadeEmpresaSelectContainerEl) adminUnidadeEmpresaSelectContainerEl.style.display = isEmpresaContext ? 'none' : 'block';
            if(thUnidadeEmpresaScopeEl) thUnidadeEmpresaScopeEl.style.display = isEmpresaContext ? 'none': '';
        }
        else if (screenId === 'productManagement') {
            if(document.getElementById('productManagementTitle')) document.getElementById('productManagementTitle').textContent = title || 'Gerenciar Produtos';
            if(document.getElementById('productManagementContext') && context !== undefined) document.getElementById('productManagementContext').textContent = context;
            else if (document.getElementById('productManagementContext')) document.getElementById('productManagementContext').textContent = '';
            // Usa o currentUser passado como parâmetro
            if (currentUser?.role === 'admin_master' && showEmpresaSelector && document.getElementById('adminProdutoEmpresaSelectorContainer')) document.getElementById('adminProdutoEmpresaSelectorContainer').style.display = 'block';
        } else if (screenId === 'inventoryCount') {
            if(document.getElementById('inventoryCountTitle')) document.getElementById('inventoryCountTitle').textContent = title || 'Balanço de Estoque';
            if(document.getElementById('inventoryCountContext') && context !== undefined) document.getElementById('inventoryCountContext').textContent = context;
            else if (document.getElementById('inventoryCountContext')) document.getElementById('inventoryCountContext').textContent = '';
            // Usa o currentUser passado como parâmetro
            if (currentUser?.role === 'admin_master' && showEmpresaSelector && document.getElementById('adminContagemEmpresaSelectorContainer')) document.getElementById('adminContagemEmpresaSelectorContainer').style.display = 'block';
            if (document.getElementById('filtroUnidade')) document.getElementById('filtroUnidade').style.display = 'block';
            // updateExportButtonStates() precisa ser chamada de um módulo que tenha acesso a 'quantidadesDigitadas'
        } else if (screenId === 'historicoContagens') {
            if(document.getElementById('historicoTitle')) document.getElementById('historicoTitle').textContent = title || 'Histórico de Contagens';
            // Usa o currentUser passado como parâmetro
            if(document.getElementById('historicoEmpresaNomeSpan') && (currentUser?.role === 'empresa_manager' || currentUser?.role === 'empresa_counter' || currentUser?.role === 'empresa_login_principal')) document.getElementById('historicoEmpresaNomeSpan').textContent = currentUser.empresa_nome || '';
            else if(document.getElementById('historicoEmpresaNomeSpan')) document.getElementById('historicoEmpresaNomeSpan').textContent = '';
            
            if(document.getElementById('historicoContext') && context !== undefined) document.getElementById('historicoContext').textContent = context;
            else if (document.getElementById('historicoContext')) document.getElementById('historicoContext').textContent = '';

            // Usa o currentUser passado como parâmetro
            if (currentUser?.role === 'admin_master' && showEmpresaSelector && document.getElementById('adminHistoricoEmpresaSelectorContainer')) document.getElementById('adminHistoricoEmpresaSelectorContainer').style.display = 'block';
            if (document.getElementById('colEmpresaHistorico')) document.getElementById('colEmpresaHistorico').style.display = (currentUser?.role === 'admin_master' && showEmpresaColumnInTable) ? '' : 'none';
            if (document.getElementById('historicoUnidadeFilterContainer')) document.getElementById('historicoUnidadeFilterContainer').style.display = 'block';
        } else if (screenId === 'empresaDashboard' && currentUser) {
            const empresaDashboardTitle = document.getElementById('empresaDashboardTitle');
            const empresaUserNameSpan = document.getElementById('empresaUserName');
            const empresaUserRoleDisplaySpan = document.getElementById('empresaUserRoleDisplay');

            if(empresaDashboardTitle) empresaDashboardTitle.textContent = `Painel: ${currentUser.empresa_nome || 'Minha Empresa'}`;
            if(empresaUserNameSpan) empresaUserNameSpan.textContent = currentUser.full_name || currentUser.email;

            if(empresaUserRoleDisplaySpan) {
                let displayRole = currentUser.role;
                if (currentUser.role === 'empresa_manager' || currentUser.role === 'empresa_login_principal') displayRole = 'Gerente';
                else if (currentUser.role === 'empresa_counter') displayRole = 'Contador';
                empresaUserRoleDisplaySpan.textContent = displayRole;
            }

            const dashboardButtons = document.querySelectorAll('#screenEmpresaDashboard .dashboard-options .btn');
            dashboardButtons.forEach(btn => {
                const roleReq = btn.dataset.roleReq;
                const roleContext = btn.dataset.roleContext;
                let canAccess = false;

                if (roleReq) {
                    canAccess = (currentUser.role === roleReq) || (roleReq === 'empresa_manager' && (currentUser.role === 'empresa_login_principal' || currentUser.role === 'empresa_manager'));
                } else if (roleContext === 'empresa_manager_self') {
                    canAccess = (currentUser.role === 'empresa_manager' || currentUser.role === 'empresa_login_principal');
                } else {
                    canAccess = true;
                }
                btn.style.display = canAccess ? 'block' : 'none';
            });
        } else if (screenId === 'adminMasterDashboard' && currentUser) { // currentUser já vem como parâmetro
            const adminMasterNameDisplay = document.getElementById('adminMasterNameDisplay');
            if(adminMasterNameDisplay) adminMasterNameDisplay.textContent = currentUser.full_name || currentUser.email;
        } else if (screenId === 'changePassword' && currentUser) { // currentUser já vem como parâmetro
            const changingPasswordForUserDisplay = document.getElementById('changingPasswordForUserDisplay');
            const currentPasswordGroup = document.getElementById('currentPasswordGroup');

            if(changingPasswordForUserDisplay) changingPasswordForUserDisplay.textContent = currentUser.email;
            // A lógica de exibição de currentPasswordGroup será tratada nas funções showChangePasswordScreen_*
            // Não precisa de ajuste aqui se a visibilidade já foi definida antes de chamar showScreen
        }
    } else {
        console.error(`CRITICAL: Screen '${screenId}' not found. Fallback to login.`);
        const loginSc = document.getElementById('screenLogin');
        if (loginSc) {
            loginSc.classList.add('active');
        } else if(document.body) {
            document.body.innerHTML="UI Error. No login screen found.";
        }
    }
    window.scrollTo(0,0);
}