// Script version v3.1 - Refatorado com Inicialização Robusta e Completa
console.log("SCRIPT INICIADO - v3.1 Robusto");

/**
 * Tenta inicializar o cliente Supabase.
 * Retorna o cliente em caso de sucesso, ou null em caso de falha.
 */
async function initializeSupabase() {
    // A variável 'supabase' vem do script da CDN carregado no HTML
    const { createClient } = supabase; 
    // CHAVES DE PRODUÇÃO - TEMPORÁRIO PARA DEBUG
    const PROD_SUPABASE_URL = 'https://jvtoahmrpzddfammsjwr.supabase.co';
    const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dG9haG1ycHpkZGZhbW1zandyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyOTA0MDYsImV4cCI6MjA2NTg2NjQwNn0.XdYmurPgxjLCEiDZFksgrvhhuJzH6GIBv87mg7kk5FY';

    // Ambiente local (Live Server)
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        console.log("Ambiente local detectado. Conectando ao Supabase de PRODUÇÃO (temporariamente)...");
        try {
            const client = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_ANON_KEY);
            console.log("Cliente Supabase (local) criado com sucesso.");
            return client;
        } catch (error) {
            console.error("Erro CRÍTICO ao criar cliente Supabase local:", error);
            return null;
        }
    }
    
    // Ambiente de produção (Netlify) - Também apontando para PROD diretamente agora
    try {
        console.log("Ambiente de produção (Netlify) detectado. Conectando ao Supabase de PRODUÇÃO (diretamente)...");
        // Nota: A função Netlify para buscar config não será usada agora, pois estamos fixando as chaves de PROD.
        // Se a função '/.netlify/functions/get-supabase-config' for realmente necessária para PROD no futuro,
        // será preciso reavaliar esta seção. Por agora, usamos as chaves fixas.
        const client = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_ANON_KEY);
        console.log("Cliente Supabase (Netlify) criado com sucesso.");
        return client;
    } catch (error) {
        console.error("Falha GERAL ao inicializar Supabase via Netlify (usando chaves fixas de PROD):", error);
        document.body.innerHTML = "<h1>Erro Crítico na Configuração do Sistema.</h1>";
        return null;
    }
}

// ==================================================================
// PONTO DE ENTRADA PRINCIPAL DO SCRIPT
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
    // Usar DOMContentLoaded garante que o script pode rodar antes de imagens, etc.
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

    // Suas variáveis e estado globais
    let produtosCache = [], categoriasCache = [], empresasCache = [], colaboradoresCache = [], unidadesCache = [];
    let quantidadesDigitadas = {};
    const ADMIN_MASTER_EMAIL = "matheus@mtech.com";
    let currentUser = null;
    let adminSelectedEmpresaContextId = null;
    let isEmpresaManagerManagingOwnUsers = false;
    let managedUsersCache = [];

    // Referências de elementos DOM (serão preenchidas por initializeDOMSelectors)
    let mainContainer, screens = {}, loadingIndicator, loginEmailInput, loginPasswordInput, loginErrorMessage,
        adminMasterNameDisplay, adminNomeEmpresaInput, adminEmpresasTableBody, adminEmpresasTitleEl,
        manageUsersEmpresaSection, manageUsersEmpresaTitleEl, selectedEmpresaIdForUserManage,
        adminEmpresaUsersTableBody, manageUsersEmpresaMessage,
        adminEmpresaNewUserEmailEl, adminEmpresaNewUserFullNameEl, adminEmpresaNewUserRoleEl, addUserNameForEmpresaDisplayEl,
        manageUsersEmpresaScreenTitleEl, btnManageEmpresaUsersVoltarEl, contextEmpresaNameForUserManageEl,
        unidadesTitleEl, adminUnidadeEmpresaSelectContainerEl, adminUnidadeEmpresaSelectEl,
        nomeUnidadeInputEl, unidadesTableBodyEl, btnUnidadesVoltarEl, btnAddUnidadeEl, unidadesContextEl,
        thUnidadeEmpresaScopeEl,
        categoriasTitleEl, adminCategoriaEmpresaSelectContainerEl, adminCategoriaEmpresaSelectEl,
        nomeCategoriaInputEl, categoriasTableBodyEl, btnCategoriasVoltarEl, btnAddCategoriaEl, categoriasContextEl,
        thCategoriaEmpresaScopeEl,
        colaboradoresEmpresaNomeSpan, colaboradorNomeInput, colaboradoresTableBody, colaboradorUnidadesMultiSelect,
        currentPasswordInput, newPasswordInput, confirmNewPasswordInput, changePasswordMessage,
        changePasswordBackButton, changingPasswordForUserDisplay, currentPasswordGroup,
        historicoEmpresaNomeSpan, historicoContagensTableBody, modalDetalhesContagem, detalhesContagemConteudo,
        adminHistoricoEmpresaSelectorContainer, adminHistoricoEmpresaSelect, historicoBackButton, historicoTitle, historicoContext, colEmpresaHistorico,
        historicoUnidadeFilterContainer, historicoUnidadeFilter,
        productManagementBackButton, productManagementTitle, productManagementContext,
        adminProdutoEmpresaSelectorContainer, adminProdutoEmpresaSelect, prodCodigoInput, prodNomeInput,
        prodCategoriasMultiSelect, prodUnidadesMultiSelect, productManagementTableBody, xlsxFileInput, btnAddProductEl, btnImportXLSXEl,
        inventoryCountBackButton, inventoryCountTitle, inventoryCountContext, adminContagemEmpresaSelectorContainer,
        adminContagemEmpresaSelect, selectColaboradorContagem, selectUnidadeContagem, pesquisaProdutoInput, pesquisaCodigoInput,
        filtroCategoriaSelect, filtroUnidadeSelect, inventoryTableBody, modalPreviewContagem, previewContagemTableContainer,
        empresaDashboardTitle, empresaUserNameSpan, empresaUserRoleDisplaySpan,
        btnGerarTXT, btnGerarPDF;
        
    // ==================================================================
    // == INÍCIO DAS FUNÇÕES ORIGINAIS DO SEU APLICATIVO ==
    // ==================================================================
    
    function initializeDOMSelectors() {
        console.log("initializeDOMSelectors v3.1 called");
        mainContainer = document.getElementById('mainContainer');
        screens = {
            login: document.getElementById('screenLogin'),
            adminMasterDashboard: document.getElementById('screenAdminMasterDashboard'),
            empresaDashboard: document.getElementById('screenEmpresaDashboard'),
            adminEmpresas: document.getElementById('screenAdminEmpresas'),
            manageEmpresaUsers: document.getElementById('screenManageEmpresaUsers'),
            unidades: document.getElementById('screenUnidades'),
            adminCategorias: document.getElementById('screenAdminCategorias'),
            empresaColaboradores: document.getElementById('screenEmpresaColaboradores'),
            changePassword: document.getElementById('screenChangePassword'),
            historicoContagens: document.getElementById('screenHistoricoContagens'),
            productManagement: document.getElementById('screenProductManagement'),
            inventoryCount: document.getElementById('screenInventoryCount')
        };
        loadingIndicator = document.getElementById('loadingIndicator');
        loginEmailInput = document.getElementById('loginEmail');
        loginPasswordInput = document.getElementById('loginPassword');
        loginErrorMessage = document.getElementById('loginErrorMessage');
    
        function safeGetElementById(id, context = document) {
            const el = context.getElementById(id);
            if (!el) console.warn(`Element with ID '${id}' NOT found in initializeDOMSelectors.`);
            return el;
        }
    
        Object.keys(screens).forEach(key => {
            if (!screens[key]) console.warn(`Screen element screens.${key} (Reference ID: ${key}) NOT found in initial assignment.`);
        });
    
        adminMasterNameDisplay = safeGetElementById('adminMasterNameDisplay');
        adminNomeEmpresaInput = safeGetElementById('adminNomeEmpresa');
        adminEmpresasTableBody = safeGetElementById('adminEmpresasTableBody');
        adminEmpresasTitleEl = safeGetElementById('adminEmpresasTitle');
        manageUsersEmpresaSection = safeGetElementById('manageUsersEmpresaSection');
        manageUsersEmpresaTitleEl = safeGetElementById('manageUsersEmpresaTitle');
        selectedEmpresaIdForUserManage = safeGetElementById('selectedEmpresaIdForUserManage');
        adminEmpresaUsersTableBody = safeGetElementById('adminEmpresaUsersTableBody');
        manageUsersEmpresaMessage = safeGetElementById('manageUsersEmpresaMessage');
        adminEmpresaNewUserEmailEl = safeGetElementById('adminEmpresaNewUserEmail');
        adminEmpresaNewUserFullNameEl = safeGetElementById('adminEmpresaNewUserFullName');
        adminEmpresaNewUserRoleEl = safeGetElementById('adminEmpresaNewUserRole');
        addUserNameForEmpresaDisplayEl = safeGetElementById('addUserNameForEmpresaDisplay');
        manageUsersEmpresaScreenTitleEl = safeGetElementById('manageEmpresaUsersScreenTitle');
        btnManageEmpresaUsersVoltarEl = safeGetElementById('btnManageEmpresaUsersVoltar');
        contextEmpresaNameForUserManageEl = safeGetElementById('contextEmpresaNameForUserManage');
        unidadesTitleEl = safeGetElementById('unidadesTitle');
        adminUnidadeEmpresaSelectContainerEl = safeGetElementById('adminUnidadeEmpresaSelectContainer');
        adminUnidadeEmpresaSelectEl = safeGetElementById('adminUnidadeEmpresaSelect');
        nomeUnidadeInputEl = safeGetElementById('nomeUnidadeInput');
        unidadesTableBodyEl = safeGetElementById('unidadesTableBody');
        btnUnidadesVoltarEl = safeGetElementById('btnUnidadesVoltar');
        btnAddUnidadeEl = safeGetElementById('btnAddUnidade');
        unidadesContextEl = safeGetElementById('unidadesContext');
        thUnidadeEmpresaScopeEl = safeGetElementById('thUnidadeEmpresaScope');
        categoriasTitleEl = safeGetElementById('categoriasTitle');
        adminCategoriaEmpresaSelectContainerEl = safeGetElementById('adminCategoriaEmpresaSelectContainer');
        adminCategoriaEmpresaSelectEl = safeGetElementById('adminCategoriaEmpresaSelect');
        nomeCategoriaInputEl = safeGetElementById('nomeCategoriaInput');
        categoriasTableBodyEl = safeGetElementById('categoriasTableBody');
        btnCategoriasVoltarEl = safeGetElementById('btnCategoriasVoltar');
        btnAddCategoriaEl = safeGetElementById('btnAddCategoria');
        categoriasContextEl = safeGetElementById('categoriasContext');
        thCategoriaEmpresaScopeEl = safeGetElementById('thCategoriaEmpresaScope');
        colaboradoresEmpresaNomeSpan = safeGetElementById('colaboradoresEmpresaNome');
        colaboradorNomeInput = safeGetElementById('colaboradorNome');
        colaboradoresTableBody = safeGetElementById('colaboradoresTableBody');
        colaboradorUnidadesMultiSelect = safeGetElementById('colaboradorUnidadesMultiSelect');
        currentPasswordInput = safeGetElementById('currentPasswordInput');
        newPasswordInput = safeGetElementById('newPasswordInput');
        confirmNewPasswordInput = safeGetElementById('confirmNewPasswordInput');
        changePasswordMessage = safeGetElementById('changePasswordMessage');
        changePasswordBackButton = safeGetElementById('changePasswordBackButton');
        changingPasswordForUserDisplay = safeGetElementById('changingPasswordForUserDisplay');
        currentPasswordGroup = safeGetElementById('currentPasswordGroup');
        historicoEmpresaNomeSpan = safeGetElementById('historicoEmpresaNomeSpan');
        historicoContagensTableBody = safeGetElementById('historicoContagensTableBody');
        modalDetalhesContagem = safeGetElementById('modalDetalhesContagem');
        detalhesContagemConteudo = safeGetElementById('detalhesContagemConteudo');
        adminHistoricoEmpresaSelectorContainer = safeGetElementById('adminHistoricoEmpresaSelectorContainer');
        adminHistoricoEmpresaSelect = safeGetElementById('adminHistoricoEmpresaSelect');
        historicoBackButton = safeGetElementById('historicoBackButton');
        historicoTitle = safeGetElementById('historicoTitle');
        historicoContext = safeGetElementById('historicoContext');
        colEmpresaHistorico = safeGetElementById('colEmpresaHistorico');
        historicoUnidadeFilterContainer = safeGetElementById('historicoUnidadeFilterContainer');
        historicoUnidadeFilter = safeGetElementById('historicoUnidadeFilter');
        productManagementBackButton = safeGetElementById('productManagementBackButton');
        productManagementTitle = safeGetElementById('productManagementTitle');
        productManagementContext = safeGetElementById('productManagementContext');
        adminProdutoEmpresaSelectorContainer = safeGetElementById('adminProdutoEmpresaSelectorContainer');
        adminProdutoEmpresaSelect = safeGetElementById('adminProdutoEmpresaSelect');
        prodCodigoInput = safeGetElementById('prodCodigo');
        prodNomeInput = safeGetElementById('prodNome');
        prodCategoriasMultiSelect = safeGetElementById('prodCategoriasMultiSelect');
        prodUnidadesMultiSelect = safeGetElementById('prodUnidadesMultiSelect');
        productManagementTableBody = safeGetElementById('productManagementTableBody');
        xlsxFileInput = safeGetElementById('xlsxFile');
        btnAddProductEl = safeGetElementById('btnAddProduct');
        btnImportXLSXEl = safeGetElementById('btnImportXLSX');
        inventoryCountBackButton = safeGetElementById('inventoryCountBackButton');
        inventoryCountTitle = safeGetElementById('inventoryCountTitle');
        inventoryCountContext = safeGetElementById('inventoryCountContext');
        adminContagemEmpresaSelectorContainer = safeGetElementById('adminContagemEmpresaSelectorContainer');
        adminContagemEmpresaSelect = safeGetElementById('adminContagemEmpresaSelect');
        selectColaboradorContagem = safeGetElementById('selectColaboradorContagem');
        selectUnidadeContagem = safeGetElementById('selectUnidadeContagem');
        pesquisaProdutoInput = safeGetElementById('pesquisaProduto');
        pesquisaCodigoInput = safeGetElementById('pesquisaCodigo');
        filtroCategoriaSelect = document.getElementById('filtroCategoria');
        filtroUnidadeSelect = document.getElementById('filtroUnidade');
        inventoryTableBody = safeGetElementById('inventoryTableBody');
        modalPreviewContagem = safeGetElementById('modalPreviewContagem');
        previewContagemTableContainer = safeGetElementById('previewContagemTableContainer');
        empresaDashboardTitle = safeGetElementById('empresaDashboardTitle');
        empresaUserNameSpan = safeGetElementById('empresaUserName');
        empresaUserRoleDisplaySpan = safeGetElementById('empresaUserRoleDisplay');
        btnGerarTXT = safeGetElementById('btnGerarTXT');
        btnGerarPDF = safeGetElementById('btnGerarPDF');
    
        console.log("DOM Selectors initialization complete.");
    }
    
    function saveQuantities() { try { localStorage.setItem('balancoQuantities_v3.1', JSON.stringify(quantidadesDigitadas)); } catch (e) { console.error("Error saving quantities to localStorage:", e); }}
    function loadQuantities() { try { const stored = localStorage.getItem('balancoQuantities_v3.1'); quantidadesDigitadas = stored ? JSON.parse(stored) : {}; } catch (e) { console.error("Error loading quantities:", e); quantidadesDigitadas = {}; }}
    function showLoader() { if (loadingIndicator) loadingIndicator.style.display = 'block'; }
    function hideLoader() { if (loadingIndicator) loadingIndicator.style.display = 'none'; }
    function generateNumericPassword(length = 6) { let pw = ''; for (let i = 0; i < length; i++) { pw += Math.floor(Math.random() * 10); } return pw; }

    async function populateEmpresasSelect(selectElement, includeSpecialOption = false, specialOptionText = "-- Selecione uma Empresa --", specialOptionValue = "") {
        const selectEl = (typeof selectElement === 'string') ? document.getElementById(selectElement) : selectElement;
    
        if (!selectEl) { console.warn(`Company select element/ID '${selectElement}' not found.`); return; }
        const currentValue = selectEl.value;
        selectEl.innerHTML = '';
        if (includeSpecialOption) {
            const opt = document.createElement('option'); opt.value = specialOptionValue; opt.textContent = specialOptionText; selectEl.appendChild(opt);
        }
        if (empresasCache.length === 0) {
            try {
                console.log("Populating global empresasCache from DB...");
                const { data, error } = await _supabaseClient.from('empresas').select('id, nome_empresa').order('nome_empresa');
                if (error) throw error;
                empresasCache = data || [];
                console.log("Global empresasCache populated:", empresasCache.length);
            } catch (e) { console.error("Error fetching companies for select:", e); if(selectEl) selectEl.innerHTML = '<option value="">Erro ao carregar</option>'; return; }
        }
        empresasCache.forEach(emp => { const option = document.createElement('option'); option.value = emp.id; option.textContent = emp.nome_empresa; selectEl.appendChild(option); });
    
        if (currentValue && Array.from(selectEl.options).some(opt => opt.value === currentValue)) {
            selectEl.value = currentValue;
        } else if (adminSelectedEmpresaContextId && Array.from(selectEl.options).some(opt => opt.value === adminSelectedEmpresaContextId)) {
            selectEl.value = adminSelectedEmpresaContextId;
        } else if (includeSpecialOption) {
            selectEl.value = specialOptionValue;
        }
        if(selectEl.value && selectEl.value !== specialOptionValue) selectEl.dispatchEvent(new Event('change'));
    }
    
    function showScreen(screenId, screenConfig = {}) {
        hideLoader();
        const mainCont = document.getElementById('mainContainer');
        const targetScreenElement = screens[screenId];
        Object.values(screens).forEach(sE => { if (sE && sE.classList) sE.classList.remove('active');});
        if (targetScreenElement && targetScreenElement.classList) {
            targetScreenElement.classList.add('active');
            if (mainCont) { mainCont.classList.toggle('content-container', ['adminEmpresas', 'manageEmpresaUsers', 'unidades', 'adminCategorias', 'productManagement', 'inventoryCount', 'empresaColaboradores', 'historicoContagens'].includes(screenId));}
    
            ['adminProdutoEmpresaSelectorContainer', 'adminContagemEmpresaSelectorContainer', 'adminHistoricoEmpresaSelectorContainer',
             'adminCategoriaEmpresaSelectContainer', 'adminUnidadeEmpresaSelectContainer',
             'colEmpresaHistorico', 'historicoUnidadeFilterContainer'].forEach(id => {
                const el = document.getElementById(id); if(el) el.style.display = 'none';
            });
    
            const { title, context, showEmpresaSelector, showEmpresaColumnInTable, isEmpresaContext = false } = screenConfig;
    
            if (screenId === 'adminCategorias') {
                if(categoriasTitleEl) categoriasTitleEl.textContent = title || 'Gerenciar Categorias';
                if(categoriasContextEl) categoriasContextEl.textContent = context || '';
                if(adminCategoriaEmpresaSelectContainerEl) adminCategoriaEmpresaSelectContainerEl.style.display = isEmpresaContext ? 'none' : 'block';
                if(thCategoriaEmpresaScopeEl) thCategoriaEmpresaScopeEl.style.display = isEmpresaContext ? 'none': '';
            } else if (screenId === 'unidades') {
                if(unidadesTitleEl) unidadesTitleEl.textContent = title || 'Gerenciar Unidades';
                if(unidadesContextEl) unidadesContextEl.textContent = context || '';
                if(adminUnidadeEmpresaSelectContainerEl) adminUnidadeEmpresaSelectContainerEl.style.display = isEmpresaContext ? 'none' : 'block';
                if(thUnidadeEmpresaScopeEl) thUnidadeEmpresaScopeEl.style.display = isEmpresaContext ? 'none': '';
            }
            else if (screenId === 'productManagement') {
                if(document.getElementById('productManagementTitle')) document.getElementById('productManagementTitle').textContent = title || 'Gerenciar Produtos';
                if(document.getElementById('productManagementContext') && context !== undefined) document.getElementById('productManagementContext').textContent = context;
                else if (document.getElementById('productManagementContext')) document.getElementById('productManagementContext').textContent = '';
                if (currentUser?.role === 'admin_master' && showEmpresaSelector && document.getElementById('adminProdutoEmpresaSelectorContainer')) document.getElementById('adminProdutoEmpresaSelectorContainer').style.display = 'block';
            } else if (screenId === 'inventoryCount') {
                if(document.getElementById('inventoryCountTitle')) document.getElementById('inventoryCountTitle').textContent = title || 'Balanço de Estoque';
                if(document.getElementById('inventoryCountContext') && context !== undefined) document.getElementById('inventoryCountContext').textContent = context;
                else if (document.getElementById('inventoryCountContext')) document.getElementById('inventoryCountContext').textContent = '';
                if (currentUser?.role === 'admin_master' && showEmpresaSelector && document.getElementById('adminContagemEmpresaSelectorContainer')) document.getElementById('adminContagemEmpresaSelectorContainer').style.display = 'block';
                if (document.getElementById('filtroUnidade')) document.getElementById('filtroUnidade').style.display = 'block';
                updateExportButtonStates();
            } else if (screenId === 'historicoContagens') {
                if(document.getElementById('historicoTitle')) document.getElementById('historicoTitle').textContent = title || 'Histórico de Contagens';
                if(document.getElementById('historicoEmpresaNomeSpan') && (currentUser?.role === 'empresa_manager' || currentUser?.role === 'empresa_counter' || currentUser?.role === 'empresa_login_principal')) document.getElementById('historicoEmpresaNomeSpan').textContent = currentUser.empresa_nome || '';
                else if(document.getElementById('historicoEmpresaNomeSpan')) document.getElementById('historicoEmpresaNomeSpan').textContent = '';
    
                if(document.getElementById('historicoContext') && context !== undefined) document.getElementById('historicoContext').textContent = context;
                else if (document.getElementById('historicoContext')) document.getElementById('historicoContext').textContent = '';
    
                if (currentUser?.role === 'admin_master' && showEmpresaSelector && document.getElementById('adminHistoricoEmpresaSelectorContainer')) document.getElementById('adminHistoricoEmpresaSelectorContainer').style.display = 'block';
                if (document.getElementById('colEmpresaHistorico')) document.getElementById('colEmpresaHistorico').style.display = (currentUser?.role === 'admin_master' && showEmpresaColumnInTable) ? '' : 'none';
                if (document.getElementById('historicoUnidadeFilterContainer')) document.getElementById('historicoUnidadeFilterContainer').style.display = 'block';
            } else if (screenId === 'empresaDashboard' && currentUser) {
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
            } else if (screenId === 'adminMasterDashboard' && currentUser && adminMasterNameDisplay) {
                adminMasterNameDisplay.textContent = currentUser.full_name || currentUser.email;
            } else if (screenId === 'changePassword' && currentUser) {
                if(changingPasswordForUserDisplay) changingPasswordForUserDisplay.textContent = currentUser.email;
                const isChangingOwnPasswordAsManager = (currentUser?.role === 'empresa_manager' || currentUser?.role === 'empresa_login_principal');
                if(currentPasswordGroup) currentPasswordGroup.style.display = isChangingOwnPasswordAsManager ? 'block' : 'none';
            }
        } else {
            console.error(`CRITICAL: Screen '${screenId}' not found. Fallback to login.`);
            const loginSc = document.getElementById('screenLogin'); if (loginSc) loginSc.classList.add('active'); else if(document.body) document.body.innerHTML="UI Error.";
        }
        window.scrollTo(0,0);
    }
    
    function isMobileDevice() { return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent); }
    function triggerDownload(filename, textContent) { const blob = new Blob([textContent],{type:'text/plain;charset=utf-8'}); const link=document.createElement("a"); link.href=URL.createObjectURL(blob); link.download=filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href); console.log(`Download ${filename} triggered.`); }

    async function handleLogin() {
        console.log("handleLogin v3.1 Robusto chamada");
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
            currentUser = {
                id: signInData.user.id,
                email: signInData.user.email,
                user_metadata: signInData.user.user_metadata,
                full_name: signInData.user.user_metadata?.full_name || signInData.user.email,
                role: null
            };
    
            if (currentUser.user_metadata?.user_role) {
                currentUser.role = currentUser.user_metadata.user_role;
                console.log("Role assigned from JWT user_metadata:", currentUser.role);
            }
    
            if (!currentUser.role || ['empresa_manager', 'empresa_counter', 'empresa_login_principal'].includes(currentUser.role) || !currentUser.empresa_id) {
                console.log("Fetching profile for user (or to get empresa_id/nome):", currentUser.id);
                const { data: profile, error: profileError } = await _supabaseClient
                    .from('user_profiles')
                    .select('empresa_id, role, full_name, empresas (id, nome_empresa)')
                    .eq('id', signInData.user.id)
                    .single();
                console.log("Profile fetch result - Data:", profile, "Error:", profileError);
    
                if (profileError && profileError.code !== 'PGRST116') {
                    console.error("Error fetching profile:", profileError);
                    await _supabaseClient.auth.signOut();
                    currentUser = null;
                    throw profileError;
                }
    
                if (profile) {
                    currentUser.role = profile.role;
                    currentUser.empresa_id = profile.empresa_id;
                    currentUser.empresa_nome = profile.empresas ? profile.empresas.nome_empresa : (profile.empresa_id ? 'Empresa Associada (Nome não carregado)' : 'N/A');
                    currentUser.full_name = profile.full_name || currentUser.full_name;
                    console.log("User profile fetched and merged:", currentUser);
                } else if (currentUser.email === ADMIN_MASTER_EMAIL && !currentUser.role) {
                    currentUser.role = 'admin_master';
                    console.warn("Admin Master identified by email (profile/JWT role missing):", currentUser.id);
                } else if (!currentUser.role) {
                    console.error("User profile not found and not admin_master by email; no role in JWT. User ID:", signInData.user.id);
                    await _supabaseClient.auth.signOut();
                    currentUser = null;
                    throw new Error("Perfil do usuário não encontrado ou função não definida.");
                }
            }
    
            if (currentUser.role === 'admin_master') {
                const { data: adminEmpresas, error: adminEmpresasError } = await _supabaseClient.from('empresas').select('id, nome_empresa').order('nome_empresa');
                if (adminEmpresasError) console.error("Error fetching companies for admin selects on login:", adminEmpresasError);
                else empresasCache = adminEmpresas || [];
    
                await Promise.all([
                    populateEmpresasSelect(adminCategoriaEmpresaSelectEl, true, "-- Selecione uma Empresa --", ""),
                    populateEmpresasSelect(adminProdutoEmpresaSelect, true, "-- Selecione uma Empresa --", ""),
                    populateEmpresasSelect(adminContagemEmpresaSelect, true, "-- Selecione uma Empresa --", ""),
                    populateEmpresasSelect(adminHistoricoEmpresaSelect, true, "-- Selecione uma Empresa --", ""),
                    populateEmpresasSelect(adminUnidadeEmpresaSelectEl, true, "-- Selecione uma Empresa --", "")
                ]);
                await fetchAndRenderEmpresas();
                showAdminMasterDashboardScreen();
            } else if ((currentUser.role === 'empresa_manager' || currentUser.role === 'empresa_login_principal') && currentUser.empresa_id) {
                await showEmpresaDashboardScreen();
            } else if (currentUser.role === 'empresa_counter' && currentUser.empresa_id) {
                await showInventoryCountScreen_Empresa();
            }
            else {
                console.warn("Login successful but role unclear or company data missing:", currentUser);
                await _supabaseClient.auth.signOut();
                currentUser = null;
                throw new Error("Função do usuário não definida ou dados da empresa ausentes.");
            }
    
        } catch (e) {
            console.error("Catch in login:", e);
            currentUser = null;
            loginErrorMessage.textContent = e.message.includes("Invalid login credentials") ? "Email ou senha inválidos."
                                             : (e.message.includes("Email not confirmed") ? "Email não confirmado."
                                             : (e.message || "Erro desconhecido."));
            loginErrorMessage.style.display = "block";
        } finally {
            hideLoader();
        }
    }
    
    async function handleLogout() { console.log("handleLogout called"); showLoader(); try { const { error } = await _supabaseClient.auth.signOut(); if (error) { console.error("Error in Supabase logout:", error); } currentUser = null; adminSelectedEmpresaContextId = null; isEmpresaManagerManagingOwnUsers = false; if(loginEmailInput) loginEmailInput.value = ""; if(loginPasswordInput) loginPasswordInput.value = ""; produtosCache = []; categoriasCache = []; empresasCache = []; colaboradoresCache = []; unidadesCache = []; quantidadesDigitadas = {}; localStorage.removeItem('balancoQuantities_v3.1'); showScreen('login'); console.log("User logged out."); } catch (e) { console.error("Error logout:", e); } finally { hideLoader(); } }
    function showAdminMasterDashboardScreen() { adminSelectedEmpresaContextId = null; isEmpresaManagerManagingOwnUsers = false; showScreen('adminMasterDashboard'); }
    async function showEmpresaDashboardScreen() { adminSelectedEmpresaContextId = currentUser?.empresa_id; isEmpresaManagerManagingOwnUsers = false; showScreen('empresaDashboard');}
    async function showManageEmpresasAndUsersScreen_Admin() { if (!currentUser || currentUser?.role !== 'admin_master') { handleLogout(); return; } isEmpresaManagerManagingOwnUsers = false; if(adminEmpresasTitleEl) adminEmpresasTitleEl.textContent = "Gerenciar Empresas e Seus Usuários"; showLoader(); try { await fetchAndRenderEmpresas(); showScreen('adminEmpresas'); } catch (e) { console.error("Error showManageEmpresasAndUsersScreen_Admin:", e); alert("Erro ao carregar tela de empresas."); hideLoader(); } }
    async function fetchAndRenderEmpresas() { if (!adminEmpresasTableBody) {console.error("adminEmpresasTableBody not found"); hideLoader(); return;} adminEmpresasTableBody.innerHTML = '<tr><td colspan="3">Carregando empresas...</td></tr>'; showLoader(); try { const { data: companiesData, error: companiesError } = await _supabaseClient .from('empresas') .select('id, nome_empresa, created_at') .order('nome_empresa'); if (companiesError) throw companiesError; empresasCache = companiesData || []; adminEmpresasTableBody.innerHTML = ""; if (empresasCache.length > 0) { empresasCache.forEach(empresa => { const row = adminEmpresasTableBody.insertRow(); row.insertCell().textContent = empresa.nome_empresa; row.insertCell().textContent = new Date(empresa.created_at).toLocaleDateString('pt-BR'); const actionsCell = row.insertCell(); const btnManageUsers = document.createElement('button'); btnManageUsers.textContent = 'Gerenciar Usuários'; btnManageUsers.className = 'btn btn-info table-actions'; btnManageUsers.onclick = () => showManageUsersScreen_Admin(empresa.id, empresa.nome_empresa); actionsCell.appendChild(btnManageUsers); const btnManageUnits = document.createElement('button'); btnManageUnits.textContent = 'Unidades'; btnManageUnits.className = 'btn btn-primary table-actions'; btnManageUnits.onclick = () => showUnidadesScreen(empresa.id, empresa.nome_empresa, true); actionsCell.appendChild(btnManageUnits); const btnManageColabs = document.createElement('button'); btnManageColabs.textContent = 'Colaboradores'; btnManageColabs.className = 'btn btn-secondary table-actions'; btnManageColabs.onclick = () => showEmpresaColaboradoresScreen(empresa.id, empresa.nome_empresa, true); actionsCell.appendChild(btnManageColabs); }); } else { adminEmpresasTableBody.innerHTML = '<tr><td colspan="3">Nenhuma empresa cadastrada.</td></tr>'; } } catch (e) { console.error("Error listing companies:", e); if(adminEmpresasTableBody) adminEmpresasTableBody.innerHTML = `<tr><td colspan="3" style="color:var(--danger-color);">Erro ao carregar empresas: ${e.message}</td></tr>`; } finally { hideLoader(); } }
    async function handleAdminAddEmpresa() {
        console.log("handleAdminAddEmpresa called");
        if (!adminNomeEmpresaInput) {
            console.error("adminNomeEmpresaInput not found.");
            return;
        }
        const nomeEmpresa = adminNomeEmpresaInput.value.trim();
        if (!nomeEmpresa) {
            alert("Por favor, insira o nome da empresa.");
            return;
        }
        showLoader();
        try {
            // Primeiro, cria o usuário administrador principal da empresa no Supabase Auth
            const newPassword = generateNumericPassword(); // Gerar uma senha numérica padrão
            const emailEmpresa = `login_${nomeEmpresa.toLowerCase().replace(/\s/g, '')}@balanco.com`; // Exemplo: login_minhaempresa@balanco.com
            const { data: userData, error: userError } = await _supabaseClient.auth.signUp({
                email: emailEmpresa,
                password: newPassword,
                options: {
                    data: {
                        full_name: `Gerente ${nomeEmpresa}`,
                        user_role: 'empresa_login_principal' // Define o papel no user_metadata
                    }
                }
            });
            if (userError) {
                // Se o erro for "User already registered", tenta criar a empresa e associar
                if (userError.message.includes("User already registered")) {
                    console.warn(`Usuário ${emailEmpresa} já existe. Tentando encontrar e associar.`);
                    const { data: existingUser, error: existingUserError } = await _supabaseClient.auth.admin.getUserByEmail(emailEmpresa);
                    if (existingUserError || !existingUser) {
                        throw new Error(`Erro ao verificar usuário existente: ${existingUserError?.message || 'usuário não encontrado'}`);
                    }
                    userData.user = existingUser.user; // Usar o usuário existente
                    console.log(`Usuário ${emailEmpresa} encontrado. ID: ${userData.user.id}`);
                } else {
                    throw userError;
                }
            }
    
            const userId = userData.user.id;
            console.log("Usuário administrador da empresa criado/encontrado:", emailEmpresa, "ID:", userId);
    
            // Em seguida, insere a nova empresa na tabela 'empresas'
            const { data: empresaData, error: empresaError } = await _supabaseClient
                .from('empresas')
                .insert([{ nome_empresa: nomeEmpresa }])
                .select()
                .single();
    
            if (empresaError) throw empresaError;
    
            const empresaId = empresaData.id;
            console.log("Empresa criada:", nomeEmpresa, "ID:", empresaId);
    
            // Finalmente, atualiza o perfil do usuário recém-criado para associá-lo à empresa
            const { data: profileUpdateData, error: profileUpdateError } = await _supabaseClient
                .from('user_profiles')
                .upsert({ id: userId, empresa_id: empresaId, role: 'empresa_login_principal', full_name: `Gerente ${nomeEmpresa}` });
    
            if (profileUpdateError) throw profileUpdateError;
    
            alert(`Empresa "${nomeEmpresa}" criada com sucesso!\n\nUsuário Administrador Principal: ${emailEmpresa}\nSenha Temporária: ${newPassword}\n\nPor favor, anote e altere a senha no primeiro acesso.`);
            adminNomeEmpresaInput.value = '';
            await fetchAndRenderEmpresas(); // Atualiza a lista de empresas
        } catch (e) {
            console.error("Erro ao adicionar empresa:", e);
            alert(`Erro ao adicionar empresa: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    async function showManageUsersScreen_Admin(empresaId, empresaNome) {
        if (!currentUser || currentUser.role !== 'admin_master') { handleLogout(); return; }
        adminSelectedEmpresaContextId = empresaId;
        isEmpresaManagerManagingOwnUsers = false; // Admin master gerenciando usuários de uma empresa
        if(manageUsersEmpresaScreenTitleEl) manageUsersEmpresaScreenTitleEl.textContent = `Gerenciar Usuários da Empresa`;
        if(contextEmpresaNameForUserManageEl) contextEmpresaNameForUserManageEl.textContent = `${empresaNome}`;
        if(addUserNameForEmpresaDisplayEl) addUserNameForEmpresaDisplayEl.textContent = `para ${empresaNome}`;
        if(btnManageEmpresaUsersVoltarEl) btnManageEmpresaUsersVoltarEl.style.display = 'block'; // Admin master pode voltar para a lista de empresas
        if(currentPasswordGroup) currentPasswordGroup.style.display = 'none'; // Não exibe o campo de senha atual para admin master
        await fetchAndRenderEmpresaUsers(empresaId);
        showScreen('manageEmpresaUsers');
    }
    
    async function showManageUsersScreen_Empresa() {
        if (!currentUser || (currentUser.role !== 'empresa_manager' && currentUser.role !== 'empresa_login_principal')) { handleLogout(); return; }
        if (!currentUser.empresa_id) { console.error("ID da empresa não encontrada para o gerente."); alert("Erro: ID da empresa não encontrada."); handleLogout(); return; }
        adminSelectedEmpresaContextId = currentUser.empresa_id; // O gerente só gerencia a própria empresa
        isEmpresaManagerManagingOwnUsers = true; // Gerente gerenciando seus próprios usuários
    
        if(manageUsersEmpresaScreenTitleEl) manageUsersEmpresaScreenTitleEl.textContent = "Gerenciar Meus Usuários";
        if(contextEmpresaNameForUserManageEl) contextEmpresaNameForUserManageEl.textContent = currentUser.empresa_nome || "Minha Empresa";
        if(addUserNameForEmpresaDisplayEl) addUserNameForEmpresaDisplayEl.textContent = `na ${currentUser.empresa_nome || "Minha Empresa"}`;
        if(btnManageEmpresaUsersVoltarEl) btnManageEmpresaUsersVoltarEl.style.display = 'block'; // Gerente pode voltar para o dashboard da empresa
        if(currentPasswordGroup) currentPasswordGroup.style.display = 'none'; // Não exibe o campo de senha atual para admin master
    
        await fetchAndRenderEmpresaUsers(currentUser.empresa_id);
        showScreen('manageEmpresaUsers');
    }
    
    async function fetchAndRenderEmpresaUsers(empresaId) {
        if (!adminEmpresaUsersTableBody || !manageUsersEmpresaMessage) {
            console.error("Elementos DOM para gerenciar usuários não encontrados.");
            hideLoader();
            return;
        }
        adminEmpresaUsersTableBody.innerHTML = '<tr><td colspan="5">Carregando usuários...</td></tr>';
        manageUsersEmpresaMessage.textContent = '';
        showLoader();
        try {
            const { data: users, error } = await _supabaseClient
                .from('user_profiles')
                .select(`
                    id,
                    email,
                    full_name,
                    role,
                    auth_users:auth.users(
                        email_confirmed_at
                    )
                `)
                .eq('empresa_id', empresaId)
                .order('full_name');
    
            if (error) throw error;
    
            managedUsersCache = users || [];
            adminEmpresaUsersTableBody.innerHTML = '';
    
            if (managedUsersCache.length > 0) {
                managedUsersCache.forEach(user => {
                    const row = adminEmpresaUsersTableBody.insertRow();
                    row.insertCell().textContent = user.full_name;
                    row.insertCell().textContent = user.email;
                    
                    let displayRole = user.role;
                    if (user.role === 'empresa_login_principal') displayRole = 'Gerente Principal';
                    else if (user.role === 'empresa_manager') displayRole = 'Gerente';
                    else if (user.role === 'empresa_counter') displayRole = 'Contador';
                    row.insertCell().textContent = displayRole;
    
                    const confirmedCell = row.insertCell();
                    confirmedCell.textContent = user.auth_users?.email_confirmed_at ? 'Sim' : 'Não';
    
                    const actionsCell = row.insertCell();
    
                    // Botão para alterar senha
                    const btnChangePass = document.createElement('button');
                    btnChangePass.textContent = 'Redefinir Senha';
                    btnChangePass.className = 'btn btn-warning table-actions';
                    btnChangePass.onclick = () => showChangePasswordScreen_Admin(user.id, user.email);
                    actionsCell.appendChild(btnChangePass);
    
                    // Botão para excluir usuário (admin_master sempre pode excluir)
                    // Gerente da empresa pode excluir se o usuário não for o gerente principal
                    if (currentUser.role === 'admin_master' || (isEmpresaManagerManagingOwnUsers && user.role !== 'empresa_login_principal')) {
                        const btnDelete = document.createElement('button');
                        btnDelete.textContent = 'Excluir';
                        btnDelete.className = 'btn btn-danger table-actions';
                        btnDelete.onclick = () => handleDeleteUser(user.id, user.email, empresaId);
                        actionsCell.appendChild(btnDelete);
                    }
                });
            } else {
                adminEmpresaUsersTableBody.innerHTML = '<tr><td colspan="5">Nenhum usuário cadastrado para esta empresa.</td></tr>';
            }
        } catch (e) {
            console.error("Erro ao buscar usuários da empresa:", e);
            manageUsersEmpresaMessage.textContent = `Erro ao carregar usuários: ${e.message}`;
        } finally {
            hideLoader();
        }
    }
    
    async function handleCreateEmpresaUser() {
        if (!adminEmpresaNewUserEmailEl || !adminEmpresaNewUserFullNameEl || !adminEmpresaNewUserRoleEl || !selectedEmpresaIdForUserManage) {
            console.error("Elementos de input para novo usuário não encontrados.");
            alert("Erro interno: formulário incompleto.");
            return;
        }
        const email = adminEmpresaNewUserEmailEl.value.trim();
        const fullName = adminEmpresaNewUserFullNameEl.value.trim();
        const role = adminEmpresaNewUserRoleEl.value;
        const empresaId = adminSelectedEmpresaContextId; // Obtido do contexto
    
        if (!email || !fullName || !role || !empresaId) {
            alert("Por favor, preencha todos os campos do novo usuário.");
            return;
        }
    
        // Validação básica de email
        if (!/\S+@\S+\.\S+/.test(email)) {
            alert("Por favor, insira um endereço de email válido.");
            return;
        }
    
        showLoader();
        try {
            // Gerar uma senha temporária
            const tempPassword = generateNumericPassword();
            console.log("Tentando criar usuário Supabase Auth:", email, "Role:", role, "Empresa ID:", empresaId);
    
            // Cria o usuário no Supabase Auth
            const { data: authUserData, error: authUserError } = await _supabaseClient.auth.signUp({
                email: email,
                password: tempPassword,
                options: {
                    data: {
                        full_name: fullName,
                        user_role: role // Define o papel no user_metadata do Auth
                    }
                }
            });
    
            if (authUserError) {
                if (authUserError.message.includes("User already registered")) {
                    alert(`O usuário com o email "${email}" já está registrado no sistema de autenticação. Tente redefinir a senha se for um usuário existente ou use outro email.`);
                }
                throw authUserError;
            }
    
            const newUserId = authUserData.user.id;
            console.log("Usuário Auth criado com ID:", newUserId);
    
            // Cria o perfil do usuário na tabela 'user_profiles'
            const { error: profileError } = await _supabaseClient
                .from('user_profiles')
                .insert({
                    id: newUserId,
                    email: email,
                    full_name: fullName,
                    role: role,
                    empresa_id: empresaId
                });
    
            if (profileError) {
                // Se falhar a criação do perfil, tenta apagar o usuário de autenticação para evitar inconsistência
                console.error("Erro ao criar perfil, tentando reverter criação de usuário Auth:", profileError);
                await _supabaseClient.auth.admin.deleteUser(newUserId);
                throw profileError;
            }
    
            alert(`Usuário "${fullName}" criado com sucesso!\n\nEmail: ${email}\nSenha Temporária: ${tempPassword}\n\nPor favor, anote esta senha para o usuário.`);
            adminEmpresaNewUserEmailEl.value = '';
            adminEmpresaNewUserFullNameEl.value = '';
            adminEmpresaNewUserRoleEl.value = ''; // Limpa a seleção
            await fetchAndRenderEmpresaUsers(empresaId); // Atualiza a lista
        } catch (e) {
            console.error("Erro ao criar usuário da empresa:", e);
            alert(`Erro ao criar usuário: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    async function handleDeleteUser(userId, userEmail, empresaId) {
        if (!confirm(`Tem certeza que deseja excluir o usuário ${userEmail}? Esta ação é irreversível.`)) {
            return;
        }
        showLoader();
        try {
            // Primeiro, apaga da tabela user_profiles
            console.log("Deletando perfil de usuário:", userId);
            const { error: profileError } = await _supabaseClient.from('user_profiles').delete().eq('id', userId);
            if (profileError) throw profileError;
    
            // Em seguida, apaga do Supabase Auth
            console.log("Deletando usuário Auth:", userId);
            const { error: authError } = await _supabaseClient.auth.admin.deleteUser(userId);
            if (authError) {
                // Se a deleção do auth falhar, pelo menos o perfil foi removido, mas logamos o erro
                console.error(`Atenção: Falha ao deletar usuário do Auth (${userId}). Pode ser necessário remover manualmente. Erro:`, authError);
                alert(`Usuário "${userEmail}" removido do sistema, mas houve um erro ao apagar o registro de autenticação. Pode ser necessária remoção manual no painel do Supabase. Erro: ${authError.message}`);
            } else {
                alert(`Usuário "${userEmail}" excluído com sucesso.`);
            }
    
            await fetchAndRenderEmpresaUsers(empresaId); // Atualiza a lista
        } catch (e) {
            console.error("Erro ao excluir usuário:", e);
            alert(`Erro ao excluir usuário: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    function closeManageEmpresaUsersScreen() {
        if (currentUser?.role === 'admin_master') {
            showManageEmpresasAndUsersScreen_Admin();
        } else if (currentUser?.role === 'empresa_manager' || currentUser?.role === 'empresa_login_principal') {
            showEmpresaDashboardScreen();
        } else {
            showScreen('login'); // Fallback
        }
    }
    
    async function showUnidadesScreen(empresaId = null, empresaNome = null, isAdminContext = false) {
        showLoader();
        // Se for admin, configura o select para escolher a empresa
        if (isAdminContext) {
            adminUnidadeEmpresaSelectContainerEl.style.display = 'block';
            thUnidadeEmpresaScopeEl.style.display = ''; // Exibe a coluna Empresa
            await populateEmpresasSelect(adminUnidadeEmpresaSelectEl, true, "-- Selecione uma Empresa --", "");
            if (empresaId) {
                adminUnidadeEmpresaSelectEl.value = empresaId;
                // Dispara manualmente o evento change se já houver um empresaId para carregar as unidades
                adminUnidadeEmpresaSelectEl.dispatchEvent(new Event('change'));
                unidadesContextEl.textContent = `para ${empresaNome || 'Empresa Selecionada'}`;
            } else {
                unidadesContextEl.textContent = ''; // Limpa o contexto se nenhuma empresa for selecionada por padrão
            }
            // Adiciona listener para a mudança do select
            adminUnidadeEmpresaSelectEl.onchange = () => fetchAndRenderUnidades(adminUnidadeEmpresaSelectEl.value);
            unidadesTitleEl.textContent = 'Gerenciar Unidades (Admin)';
        } else {
            // Se for gerente/contador, usa a empresa do currentUser
            adminUnidadeEmpresaSelectContainerEl.style.display = 'none';
            thUnidadeEmpresaScopeEl.style.display = 'none'; // Esconde a coluna Empresa
            if (currentUser?.empresa_id) {
                unidadesContextEl.textContent = `da ${currentUser.empresa_nome}`;
                await fetchAndRenderUnidades(currentUser.empresa_id);
            } else {
                console.error("ID da empresa do usuário não encontrada para unidades.");
                unidadesContextEl.textContent = "Erro ao carregar unidades.";
            }
            unidadesTitleEl.textContent = 'Minhas Unidades';
        }
        showScreen('unidades', { isEmpresaContext: !isAdminContext, title: unidadesTitleEl.textContent, context: unidadesContextEl.textContent });
        hideLoader();
    }
    
    async function fetchAndRenderUnidades(empresaId) {
        if (!unidadesTableBodyEl || !nomeUnidadeInputEl) {
            console.error("Elementos DOM para unidades não encontrados.");
            return;
        }
        unidadesTableBodyEl.innerHTML = '<tr><td colspan="3">Carregando unidades...</td></tr>';
        showLoader();
        try {
            let query = _supabaseClient.from('unidades').select('id, nome_unidade');
            if (empresaId) {
                query = query.eq('empresa_id', empresaId);
            } else if (currentUser.role !== 'admin_master') {
                // Se não for admin_master e empresaId não for fornecido, usa a empresa do usuário
                query = query.eq('empresa_id', currentUser.empresa_id);
            }
            query = query.order('nome_unidade');
    
            const { data, error } = await query;
            if (error) throw error;
    
            unidadesCache = data || [];
            unidadesTableBodyEl.innerHTML = '';
    
            if (unidadesCache.length > 0) {
                unidadesCache.forEach(unidade => {
                    const row = unidadesTableBodyEl.insertRow();
                    row.insertCell().textContent = unidade.nome_unidade;
                    const actionsCell = row.insertCell();
                    const btnDelete = document.createElement('button');
                    btnDelete.textContent = 'Excluir';
                    btnDelete.className = 'btn btn-danger table-actions';
                    btnDelete.onclick = () => handleDeleteUnidade(unidade.id, unidade.nome_unidade, empresaId);
                    actionsCell.appendChild(btnDelete);
                });
            } else {
                unidadesTableBodyEl.innerHTML = '<tr><td colspan="3">Nenhuma unidade cadastrada.</td></tr>';
            }
        } catch (e) {
            console.error("Erro ao buscar unidades:", e);
            unidadesTableBodyEl.innerHTML = `<tr><td colspan="3" style="color:var(--danger-color);">Erro ao carregar unidades: ${e.message}</td></tr>`;
        } finally {
            hideLoader();
        }
    }
    
    async function handleAddUnidade() {
        if (!nomeUnidadeInputEl) return;
        const nomeUnidade = nomeUnidadeInputEl.value.trim();
        const empresaId = adminUnidadeEmpresaSelectEl.value || currentUser?.empresa_id; // Pega do select ou do usuário logado
    
        if (!nomeUnidade) {
            alert("Por favor, insira o nome da unidade.");
            return;
        }
        if (!empresaId) {
            alert("Por favor, selecione uma empresa para a unidade.");
            return;
        }
    
        showLoader();
        try {
            const { data, error } = await _supabaseClient
                .from('unidades')
                .insert([{ nome_unidade: nomeUnidade, empresa_id: empresaId }])
                .select();
    
            if (error) throw error;
            alert(`Unidade "${nomeUnidade}" adicionada com sucesso.`);
            nomeUnidadeInputEl.value = '';
            await fetchAndRenderUnidades(empresaId);
        } catch (e) {
            console.error("Erro ao adicionar unidade:", e);
            alert(`Erro ao adicionar unidade: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    async function handleDeleteUnidade(unidadeId, unidadeNome, empresaId) {
        if (!confirm(`Tem certeza que deseja excluir a unidade "${unidadeNome}"?`)) {
            return;
        }
        showLoader();
        try {
            const { error } = await _supabaseClient
                .from('unidades')
                .delete()
                .eq('id', unidadeId);
    
            if (error) {
                // Verificar se o erro é devido a chave estrangeira
                if (error.code === '23503') { // Código de erro PostgreSQL para foreign key violation
                    throw new Error(`Não é possível excluir a unidade "${unidadeNome}". Ela está associada a produtos ou contagens existentes.`);
                }
                throw error;
            }
            alert(`Unidade "${unidadeNome}" excluída com sucesso.`);
            await fetchAndRenderUnidades(empresaId);
        } catch (e) {
            console.error("Erro ao excluir unidade:", e);
            alert(`Erro ao excluir unidade: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    async function showCategoriasScreen_Admin() {
        if (!currentUser || currentUser.role !== 'admin_master') { handleLogout(); return; }
        showLoader();
        adminCategoriaEmpresaSelectContainerEl.style.display = 'block';
        thCategoriaEmpresaScopeEl.style.display = '';
        await populateEmpresasSelect(adminCategoriaEmpresaSelectEl, true, "-- Selecione uma Empresa --", "");
        adminCategoriaEmpresaSelectEl.onchange = () => fetchAndRenderCategorias(adminCategoriaEmpresaSelectEl.value);
        categoriasTitleEl.textContent = 'Gerenciar Categorias (Admin)';
        categoriasContextEl.textContent = '';
        showScreen('adminCategorias', { isEmpresaContext: false, title: categoriasTitleEl.textContent, context: categoriasContextEl.textContent });
        hideLoader();
    }
    
    async function showCategoriasScreen_Empresa() {
        if (!currentUser || (currentUser.role !== 'empresa_manager' && currentUser.role !== 'empresa_login_principal')) { handleLogout(); return; }
        showLoader();
        adminCategoriaEmpresaSelectContainerEl.style.display = 'none';
        thCategoriaEmpresaScopeEl.style.display = 'none';
        if (currentUser?.empresa_id) {
            categoriasContextEl.textContent = `da ${currentUser.empresa_nome}`;
            await fetchAndRenderCategorias(currentUser.empresa_id);
        } else {
            console.error("ID da empresa do usuário não encontrada para categorias.");
            categoriasContextEl.textContent = "Erro ao carregar categorias.";
        }
        categoriasTitleEl.textContent = 'Minhas Categorias';
        showScreen('adminCategorias', { isEmpresaContext: true, title: categoriasTitleEl.textContent, context: categoriasContextEl.textContent });
        hideLoader();
    }
    
    async function fetchAndRenderCategorias(empresaId) {
        if (!categoriasTableBodyEl || !nomeCategoriaInputEl) {
            console.error("Elementos DOM para categorias não encontrados.");
            return;
        }
        categoriasTableBodyEl.innerHTML = '<tr><td colspan="3">Carregando categorias...</td></tr>';
        showLoader();
        try {
            let query = _supabaseClient.from('categorias').select('id, nome_categoria');
            if (empresaId) {
                query = query.eq('empresa_id', empresaId);
            } else if (currentUser.role !== 'admin_master') {
                // Se não for admin_master e empresaId não for fornecido, usa a empresa do usuário
                query = query.eq('empresa_id', currentUser.empresa_id);
            }
            query = query.order('nome_categoria');
    
            const { data, error } = await query;
            if (error) throw error;
    
            categoriasCache = data || [];
            categoriasTableBodyEl.innerHTML = '';
    
            if (categoriasCache.length > 0) {
                categoriasCache.forEach(categoria => {
                    const row = categoriasTableBodyEl.insertRow();
                    row.insertCell().textContent = categoria.nome_categoria;
                    const actionsCell = row.insertCell();
                    const btnDelete = document.createElement('button');
                    btnDelete.textContent = 'Excluir';
                    btnDelete.className = 'btn btn-danger table-actions';
                    btnDelete.onclick = () => handleDeleteCategoria(categoria.id, categoria.nome_categoria, empresaId);
                    actionsCell.appendChild(btnDelete);
                });
            } else {
                categoriasTableBodyEl.innerHTML = '<tr><td colspan="3">Nenhuma categoria cadastrada.</td></tr>';
            }
        } catch (e) {
            console.error("Erro ao buscar categorias:", e);
            categoriasTableBodyEl.innerHTML = `<tr><td colspan="3" style="color:var(--danger-color);">Erro ao carregar categorias: ${e.message}</td></tr>`;
        } finally {
            hideLoader();
        }
    }
    
    async function handleAddCategoria() {
        if (!nomeCategoriaInputEl) return;
        const nomeCategoria = nomeCategoriaInputEl.value.trim();
        const empresaId = adminCategoriaEmpresaSelectEl.value || currentUser?.empresa_id; // Pega do select ou do usuário logado
    
        if (!nomeCategoria) {
            alert("Por favor, insira o nome da categoria.");
            return;
        }
        if (!empresaId) {
            alert("Por favor, selecione uma empresa para a categoria.");
            return;
        }
    
        showLoader();
        try {
            const { data, error } = await _supabaseClient
                .from('categorias')
                .insert([{ nome_categoria: nomeCategoria, empresa_id: empresaId }])
                .select();
    
            if (error) throw error;
            alert(`Categoria "${nomeCategoria}" adicionada com sucesso.`);
            nomeCategoriaInputEl.value = '';
            await fetchAndRenderCategorias(empresaId);
        } catch (e) {
            console.error("Erro ao adicionar categoria:", e);
            alert(`Erro ao adicionar categoria: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    async function handleDeleteCategoria(categoriaId, categoriaNome, empresaId) {
        if (!confirm(`Tem certeza que deseja excluir a categoria "${categoriaNome}"?`)) {
            return;
        }
        showLoader();
        try {
            const { error } = await _supabaseClient
                .from('categorias')
                .delete()
                .eq('id', categoriaId);
    
            if (error) {
                // Verificar se o erro é devido a chave estrangeira
                if (error.code === '23503') { // Código de erro PostgreSQL para foreign key violation
                    throw new Error(`Não é possível excluir a categoria "${categoriaNome}". Ela está associada a produtos existentes.`);
                }
                throw error;
            }
            alert(`Categoria "${categoriaNome}" excluída com sucesso.`);
            await fetchAndRenderCategorias(empresaId);
        } catch (e) {
            console.error("Erro ao excluir categoria:", e);
            alert(`Erro ao excluir categoria: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    async function showEmpresaColaboradoresScreen(empresaId = null, empresaNome = null, isAdminContext = false) {
        if (!currentUser || (currentUser.role !== 'admin_master' && currentUser.role !== 'empresa_manager' && currentUser.role !== 'empresa_login_principal')) {
            handleLogout();
            return;
        }
        showLoader();
        // Colaboradores sempre são do contexto de uma empresa.
        // Se for admin master, a empresaId virá do parâmetro ou de um select futuro.
        // Se for manager, a empresaId será a do próprio currentUser.
        let targetEmpresaId = empresaId || currentUser.empresa_id;
        if (!targetEmpresaId) {
            console.error("Não foi possível determinar a empresa para colaboradores.");
            alert("Erro: Empresa não identificada para gerenciar colaboradores.");
            hideLoader();
            return;
        }
    
        colaboradoresEmpresaNomeSpan.textContent = empresaNome || currentUser.empresa_nome || 'Empresa';
        await fetchAndRenderColaboradores(targetEmpresaId);
        await populateUnidadesMultiSelect(targetEmpresaId); // Popula o multiselect de unidades
        showScreen('empresaColaboradores');
        hideLoader();
    }
    
    async function fetchAndRenderColaboradores(empresaId) {
        if (!colaboradoresTableBody) { console.error("colaboradoresTableBody não encontrado"); return; }
        colaboradoresTableBody.innerHTML = '<tr><td colspan="4">Carregando colaboradores...</td></tr>';
        showLoader();
        try {
            const { data, error } = await _supabaseClient
                .from('colaboradores')
                .select('id, nome_colaborador, unidades(id, nome_unidade)') // Seleciona unidades relacionadas
                .eq('empresa_id', empresaId)
                .order('nome_colaborador');
    
            if (error) throw error;
            colaboradoresCache = data || [];
            colaboradoresTableBody.innerHTML = '';
    
            if (colaboradoresCache.length > 0) {
                colaboradoresCache.forEach(colaborador => {
                    const row = colaboradoresTableBody.insertRow();
                    row.insertCell().textContent = colaborador.nome_colaborador;
                    // Mostra as unidades associadas
                    const unidadesCell = row.insertCell();
                    if (colaborador.unidades && colaborador.unidades.length > 0) {
                        unidadesCell.textContent = colaborador.unidades.map(u => u.nome_unidade).join(', ');
                    } else {
                        unidadesCell.textContent = 'Nenhuma';
                    }
    
                    const actionsCell = row.insertCell();
                    const btnEdit = document.createElement('button');
                    btnEdit.textContent = 'Editar';
                    btnEdit.className = 'btn btn-primary table-actions';
                    btnEdit.onclick = () => editColaborador(colaborador.id); // Implementar editColaborador
                    actionsCell.appendChild(btnEdit);
    
                    const btnDelete = document.createElement('button');
                    btnDelete.textContent = 'Excluir';
                    btnDelete.className = 'btn btn-danger table-actions';
                    btnDelete.onclick = () => handleDeleteColaborador(colaborador.id, colaborador.nome_colaborador, empresaId);
                    actionsCell.appendChild(btnDelete);
                });
            } else {
                colaboradoresTableBody.innerHTML = '<tr><td colspan="4">Nenhum colaborador cadastrado.</td></tr>';
            }
        } catch (e) {
            console.error("Erro ao buscar colaboradores:", e);
            colaboradoresTableBody.innerHTML = `<tr><td colspan="4" style="color:var(--danger-color);">Erro ao carregar colaboradores: ${e.message}</td></tr>`;
        } finally {
            hideLoader();
        }
    }
    
    async function populateUnidadesMultiSelect(empresaId) {
        if (!colaboradorUnidadesMultiSelect) {
            console.error("colaboradorUnidadesMultiSelect not found.");
            return;
        }
        colaboradorUnidadesMultiSelect.innerHTML = ''; // Limpa opções antigas
        try {
            const { data, error } = await _supabaseClient
                .from('unidades')
                .select('id, nome_unidade')
                .eq('empresa_id', empresaId)
                .order('nome_unidade');
    
            if (error) throw error;
            unidadesCache = data || []; // Atualiza o cache global de unidades
    
            if (unidadesCache.length > 0) {
                unidadesCache.forEach(unidade => {
                    const option = document.createElement('option');
                    option.value = unidade.id;
                    option.textContent = unidade.nome_unidade;
                    colaboradorUnidadesMultiSelect.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Nenhuma unidade disponível';
                option.disabled = true;
                colaboradorUnidadesMultiSelect.appendChild(option);
            }
        } catch (e) {
            console.error("Erro ao popular unidades para multi-select:", e);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Erro ao carregar unidades';
            option.disabled = true;
            colaboradorUnidadesMultiSelect.appendChild(option);
        }
    }
    
    async function handleAddColaborador() {
        if (!colaboradorNomeInput || !colaboradorUnidadesMultiSelect) return;
    
        const nomeColaborador = colaboradorNomeInput.value.trim();
        const empresaId = currentUser?.empresa_id || adminSelectedEmpresaContextId; // Pega da sessão do usuário ou do contexto admin
        const selectedUnidadeIds = Array.from(colaboradorUnidadesMultiSelect.selectedOptions).map(option => option.value);
    
        if (!nomeColaborador) {
            alert("Por favor, insira o nome do colaborador.");
            return;
        }
        if (!empresaId) {
            alert("Erro: ID da empresa não identificado.");
            return;
        }
    
        showLoader();
        try {
            // Insere o colaborador
            const { data: colaboradorData, error: colaboradorError } = await _supabaseClient
                .from('colaboradores')
                .insert([{ nome_colaborador: nomeColaborador, empresa_id: empresaId }])
                .select()
                .single();
    
            if (colaboradorError) throw colaboradorError;
    
            const novoColaboradorId = colaboradorData.id;
    
            // Se houver unidades selecionadas, insere na tabela de junção
            if (selectedUnidadeIds.length > 0) {
                const unidadesParaInserir = selectedUnidadeIds.map(unidade_id => ({
                    colaborador_id: novoColaboradorId,
                    unidade_id: unidade_id
                }));
    
                const { error: juncaoError } = await _supabaseClient
                    .from('colaboradores_unidades')
                    .insert(unidadesParaInserir);
    
                if (juncaoError) throw juncaoError;
            }
    
            alert(`Colaborador "${nomeColaborador}" adicionado com sucesso.`);
            colaboradorNomeInput.value = '';
            // Limpa as seleções no multi-select
            Array.from(colaboradorUnidadesMultiSelect.options).forEach(option => {
                option.selected = false;
            });
            await fetchAndRenderColaboradores(empresaId);
        } catch (e) {
            console.error("Erro ao adicionar colaborador:", e);
            alert(`Erro ao adicionar colaborador: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    async function handleDeleteColaborador(colaboradorId, colaboradorNome, empresaId) {
        if (!confirm(`Tem certeza que deseja excluir o colaborador "${colaboradorNome}"? Isso também removerá suas associações com unidades e contagens.`)) {
            return;
        }
        showLoader();
        try {
            // Supabase tem exclusão em cascata se configurado,
            // mas é mais seguro primeiro remover associações e depois o colaborador.
    
            // Remove associações na tabela colaboradores_unidades
            const { error: juncaoError } = await _supabaseClient
                .from('colaboradores_unidades')
                .delete()
                .eq('colaborador_id', colaboradorId);
            if (juncaoError) throw juncaoError;
    
            // Remove o colaborador
            const { error: colaboradorError } = await _supabaseClient
                .from('colaboradores')
                .delete()
                .eq('id', colaboradorId);
            if (colaboradorError) throw colaboradorError;
    
            alert(`Colaborador "${colaboradorNome}" excluído com sucesso.`);
            await fetchAndRenderColaboradores(empresaId);
        } catch (e) {
            console.error("Erro ao excluir colaborador:", e);
            alert(`Erro ao excluir colaborador: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    async function showChangePasswordScreen_Empresa() {
        if (!currentUser) { handleLogout(); return; }
        if (changingPasswordForUserDisplay) {
            changingPasswordForUserDisplay.textContent = currentUser.email;
        }
        // Para o próprio usuário logado, mostra o campo de "senha atual"
        if(currentPasswordGroup) currentPasswordGroup.style.display = 'block';
        if(changePasswordBackButton) changePasswordBackButton.style.display = 'block'; // Mostra o botão voltar
        showScreen('changePassword');
    }
    
    async function showChangePasswordScreen_Admin(userIdToChange, userEmailToChange) {
        if (!currentUser || currentUser.role !== 'admin_master') { handleLogout(); return; }
        // Admin master pode alterar a senha de qualquer usuário sem saber a senha atual
        if(changingPasswordForUserDisplay) changingPasswordForUserDisplay.textContent = userEmailToChange;
        if(currentPasswordGroup) currentPasswordGroup.style.display = 'none'; // Esconde o campo de senha atual
        if(changePasswordBackButton) changePasswordBackButton.style.display = 'block'; // Mostra o botão voltar
        // Armazena o ID do usuário que o admin master está alterando a senha
        changePasswordBackButton.dataset.userIdToChange = userIdToChange;
        showScreen('changePassword');
    }
    
    async function handleChangePassword() {
        if (!newPasswordInput || !confirmNewPasswordInput || !changePasswordMessage) {
            console.error("Elementos de input de senha não encontrados.");
            return;
        }
    
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;
        const currentPassword = currentPasswordInput ? currentPasswordInput.value : null; // Pode ser nulo para admin_master
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
    
        showLoader();
        try {
            let error;
            // Se o usuário logado for admin_master, ele pode redefinir a senha sem a senha atual
            if (currentUser?.role === 'admin_master' && changePasswordBackButton?.dataset.userIdToChange) {
                const userId = changePasswordBackButton.dataset.userIdToChange;
                console.log(`Admin Master redefinindo senha para o usuário ID: ${userId}`);
                const { error: adminError } = await _supabaseClient.auth.admin.updateUserById(userId, {
                    password: newPassword
                });
                error = adminError;
            } else {
                // Para usuários comuns (gerente/contador) alterando a própria senha
                console.log(`Usuário comum (${currentUser?.email}) alterando a própria senha.`);
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
            console.error("Erro ao alterar senha:", e);
            changePasswordMessage.textContent = `Erro ao alterar senha: ${e.message}`;
            changePasswordMessage.classList.add('error-message');
        } finally {
            hideLoader();
        }
    }
    
    async function showProductManagementScreen_AdminGlobal() {
        if (!currentUser || currentUser.role !== 'admin_master') { handleLogout(); return; }
        showLoader();
        if (adminProdutoEmpresaSelectContainer) adminProdutoEmpresaSelectContainer.style.display = 'block';
        await populateEmpresasSelect(adminProdutoEmpresaSelect, true, "-- Selecione uma Empresa --", "");
        adminProdutoEmpresaSelect.onchange = () => fetchAndRenderProducts(adminProdutoEmpresaSelect.value);
        if(productManagementTitle) productManagementTitle.textContent = 'Gerenciar Produtos (Admin)';
        if(productManagementContext) productManagementContext.textContent = '';
        showScreen('productManagement', { showEmpresaSelector: true });
        hideLoader();
    }
    
    async function showProductManagementScreen_Empresa() {
        if (!currentUser || (currentUser.role !== 'empresa_manager' && currentUser.role !== 'empresa_login_principal')) { handleLogout(); return; }
        if (!currentUser.empresa_id) { console.error("ID da empresa não encontrada para produtos."); alert("Erro: ID da empresa não encontrada."); handleLogout(); return; }
        showLoader();
        if (adminProdutoEmpresaSelectContainer) adminProdutoEmpresaSelectContainer.style.display = 'none'; // Esconde para o gerente
        if(productManagementTitle) productManagementTitle.textContent = 'Meus Produtos';
        if(productManagementContext) productManagementContext.textContent = `da ${currentUser.empresa_nome}`;
        await fetchAndRenderProducts(currentUser.empresa_id);
        await populateCategoriasSelect(currentUser.empresa_id, prodCategoriasMultiSelect); // Popula categorias para o formulário de produto
        await populateUnidadesSelect(currentUser.empresa_id, prodUnidadesMultiSelect); // Popula unidades para o formulário de produto
        showScreen('productManagement', { showEmpresaSelector: false });
        hideLoader();
    }
    
    async function fetchAndRenderProducts(empresaId) {
        if (!productManagementTableBody) return;
        productManagementTableBody.innerHTML = '<tr><td colspan="6">Carregando produtos...</td></tr>';
        showLoader();
    
        try {
            if (!empresaId) {
                productManagementTableBody.innerHTML = '<tr><td colspan="6">Selecione uma empresa para listar produtos.</td></tr>';
                hideLoader();
                return;
            }
    
            const { data, error } = await _supabaseClient
                .from('produtos')
                .select(`
                    id,
                    codigo,
                    nome_produto,
                    categorias(id, nome_categoria),
                    unidades(id, nome_unidade)
                `)
                .eq('empresa_id', empresaId)
                .order('nome_produto');
    
            if (error) throw error;
    
            produtosCache = data || [];
            productManagementTableBody.innerHTML = '';
    
            if (produtosCache.length > 0) {
                produtosCache.forEach(produto => {
                    const row = productManagementTableBody.insertRow();
                    row.insertCell().textContent = produto.codigo;
                    row.insertCell().textContent = produto.nome_produto;
                    const categoriasCell = row.insertCell();
                    categoriasCell.textContent = produto.categorias ? produto.categorias.map(c => c.nome_categoria).join(', ') : 'N/A';
                    const unidadesCell = row.insertCell();
                    unidadesCell.textContent = produto.unidades ? produto.unidades.map(u => u.nome_unidade).join(', ') : 'N/A';
    
                    const actionsCell = row.insertCell();
                    const btnEdit = document.createElement('button');
                    btnEdit.textContent = 'Editar';
                    btnEdit.className = 'btn btn-primary table-actions';
                    btnEdit.onclick = () => editProduct(produto.id); // Implementar editProduct
                    actionsCell.appendChild(btnEdit);
    
                    const btnDelete = document.createElement('button');
                    btnDelete.textContent = 'Excluir';
                    btnDelete.className = 'btn btn-danger table-actions';
                    btnDelete.onclick = () => handleDeleteProduct(produto.id, produto.nome_produto, empresaId);
                    actionsCell.appendChild(btnDelete);
                });
            } else {
                productManagementTableBody.innerHTML = '<tr><td colspan="6">Nenhum produto cadastrado para esta empresa.</td></tr>';
            }
        } catch (e) {
            console.error("Erro ao buscar produtos:", e);
            productManagementTableBody.innerHTML = `<tr><td colspan="6" style="color:var(--danger-color);">Erro ao carregar produtos: ${e.message}</td></tr>`;
        } finally {
            hideLoader();
        }
    }
    
    async function populateCategoriasSelect(empresaId, selectElement) {
        if (!selectElement) { console.error("Elemento select de categorias não encontrado."); return; }
        selectElement.innerHTML = '';
        try {
            const { data, error } = await _supabaseClient
                .from('categorias')
                .select('id, nome_categoria')
                .eq('empresa_id', empresaId)
                .order('nome_categoria');
            if (error) throw error;
            categoriasCache = data || []; // Atualiza o cache global
            if (categoriasCache.length > 0) {
                categoriasCache.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.nome_categoria;
                    selectElement.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Nenhuma categoria disponível';
                option.disabled = true;
                selectElement.appendChild(option);
            }
        } catch (e) {
            console.error("Erro ao popular categorias para select:", e);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Erro ao carregar categorias';
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }
    
    async function populateUnidadesSelect(empresaId, selectElement) {
        if (!selectElement) { console.error("Elemento select de unidades não encontrado."); return; }
        selectElement.innerHTML = '';
        try {
            const { data, error } = await _supabaseClient
                .from('unidades')
                .select('id, nome_unidade')
                .eq('empresa_id', empresaId)
                .order('nome_unidade');
            if (error) throw error;
            unidadesCache = data || []; // Atualiza o cache global
            if (unidadesCache.length > 0) {
                unidadesCache.forEach(uni => {
                    const option = document.createElement('option');
                    option.value = uni.id;
                    option.textContent = uni.nome_unidade;
                    selectElement.appendChild(option);
                });
            } else {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Nenhuma unidade disponível';
                option.disabled = true;
                selectElement.appendChild(option);
            }
        } catch (e) {
            console.error("Erro ao popular unidades para select:", e);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Erro ao carregar unidades';
            option.disabled = true;
            selectElement.appendChild(option);
        }
    }
    
    async function handleAddProduct() {
        if (!prodCodigoInput || !prodNomeInput || !prodCategoriasMultiSelect || !prodUnidadesMultiSelect) {
            alert("Erro interno: elementos do formulário de produto não encontrados.");
            return;
        }
        const codigo = prodCodigoInput.value.trim();
        const nomeProduto = prodNomeInput.value.trim();
        const selectedCategoriaIds = Array.from(prodCategoriasMultiSelect.selectedOptions).map(option => option.value);
        const selectedUnidadeIds = Array.from(prodUnidadesMultiSelect.selectedOptions).map(option => option.value);
        const empresaId = adminProdutoEmpresaSelect.value || currentUser?.empresa_id;
    
        if (!codigo || !nomeProduto) {
            alert("Por favor, preencha o código e o nome do produto.");
            return;
        }
        if (selectedCategoriaIds.length === 0) {
            alert("Por favor, selecione ao menos uma categoria.");
            return;
        }
        if (selectedUnidadeIds.length === 0) {
            alert("Por favor, selecione ao menos uma unidade.");
            return;
        }
        if (!empresaId) {
            alert("Erro: Empresa não identificada para adicionar produto.");
            return;
        }
    
        showLoader();
        try {
            // Verificar se já existe um produto com o mesmo código e nome para a empresa
            const { data: existingProducts, error: existingError } = await _supabaseClient
                .from('produtos')
                .select('id')
                .eq('empresa_id', empresaId)
                .or(`codigo.eq.${codigo},nome_produto.eq.${nomeProduto}`);
    
            if (existingError) throw existingError;
    
            if (existingProducts && existingProducts.length > 0) {
                alert("Já existe um produto com este código ou nome para esta empresa. Por favor, use um código e nome únicos.");
                hideLoader();
                return;
            }
    
            // Insere o produto
            const { data: produtoData, error: produtoError } = await _supabaseClient
                .from('produtos')
                .insert([{
                    codigo: codigo,
                    nome_produto: nomeProduto,
                    empresa_id: empresaId
                }])
                .select()
                .single();
    
            if (produtoError) throw produtoError;
    
            const novoProdutoId = produtoData.id;
    
            // Insere as associações de categorias
            const categoriasParaInserir = selectedCategoriaIds.map(cat_id => ({
                produto_id: novoProdutoId,
                categoria_id: cat_id
            }));
            const { error: catJuncaoError } = await _supabaseClient.from('produtos_categorias').insert(categoriasParaInserir);
            if (catJuncaoError) throw catJuncaoError;
    
            // Insere as associações de unidades
            const unidadesParaInserir = selectedUnidadeIds.map(uni_id => ({
                produto_id: novoProdutoId,
                unidade_id: uni_id
            }));
            const { error: uniJuncaoError } = await _supabaseClient.from('produtos_unidades').insert(unidadesParaInserir);
            if (uniJuncaoError) throw uniJuncaoError;
    
            alert(`Produto "${nomeProduto}" (${codigo}) adicionado com sucesso.`);
            prodCodigoInput.value = '';
            prodNomeInput.value = '';
            Array.from(prodCategoriasMultiSelect.options).forEach(option => { option.selected = false; });
            Array.from(prodUnidadesMultiSelect.options).forEach(option => { option.selected = false; });
            await fetchAndRenderProducts(empresaId);
        } catch (e) {
            console.error("Erro ao adicionar produto:", e);
            alert(`Erro ao adicionar produto: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    async function handleDeleteProduct(produtoId, produtoNome, empresaId) {
        if (!confirm(`Tem certeza que deseja excluir o produto "${produtoNome}"? Isso também removerá suas associações com categorias, unidades e dados de contagem.`)) {
            return;
        }
        showLoader();
        try {
            // Excluir associações primeiro (se não houver onDelete('CASCADE') configurado no DB)
            await _supabaseClient.from('produtos_categorias').delete().eq('produto_id', produtoId);
            await _supabaseClient.from('produtos_unidades').delete().eq('produto_id', produtoId);
            // Se houver contagens relacionadas a produtos, elas também precisariam ser tratadas.
            // Assumindo CASCADE DELETE no DB para contagem_itens_por_produto ou que você irá gerenciar isso.
    
            const { error } = await _supabaseClient
                .from('produtos')
                .delete()
                .eq('id', produtoId);
    
            if (error) {
                if (error.code === '23503') { // Foreign key violation
                    throw new Error(`Não foi possível excluir o produto "${produtoNome}" porque ele ainda possui registros de contagem associados ou outras dependências no banco de dados.`);
                }
                throw error;
            }
            alert(`Produto "${produtoNome}" excluído com sucesso.`);
            await fetchAndRenderProducts(empresaId);
        } catch (e) {
            console.error("Erro ao excluir produto:", e);
            alert(`Erro ao excluir produto: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    async function handleXLSXImport(event) {
        if (!xlsxFileInput || !xlsxFileInput.files || xlsxFileInput.files.length === 0) {
            alert("Por favor, selecione um arquivo XLSX.");
            return;
        }
    
        const file = xlsxFileInput.files[0];
        const reader = new FileReader();
        const empresaId = adminProdutoEmpresaSelect.value || currentUser?.empresa_id;
    
        if (!empresaId) {
            alert("Erro: Empresa não identificada para importação de produtos.");
            return;
        }
    
        showLoader();
    
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                // Assume que a primeira linha é o cabeçalho
                // Mapeia colunas: Código, Nome, Categoria, Unidade
                const productsToInsert = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
                if (productsToInsert.length < 2) { // 1 linha de cabeçalho + 0 dados
                    alert("O arquivo XLSX está vazio ou não contém dados.");
                    hideLoader();
                    return;
                }
    
                const header = productsToInsert[0];
                const rows = productsToInsert.slice(1);
    
                const codigoCol = header.indexOf('Codigo');
                const nomeCol = header.indexOf('Nome');
                const categoriaCol = header.indexOf('Categoria');
                const unidadeCol = header.indexOf('Unidade');
    
                if (codigoCol === -1 || nomeCol === -1 || categoriaCol === -1 || unidadeCol === -1) {
                    alert("O arquivo XLSX deve conter as colunas 'Codigo', 'Nome', 'Categoria' e 'Unidade'. Verifique a capitalização.");
                    hideLoader();
                    return;
                }
    
                const products = [];
                const newCategories = new Set();
                const newUnidades = new Set();
    
                rows.forEach(row => {
                    const codigo = row[codigoCol]?.toString().trim();
                    const nome = row[nomeCol]?.toString().trim();
                    const categoria = row[categoriaCol]?.toString().trim();
                    const unidade = row[unidadeCol]?.toString().trim();
    
                    if (codigo && nome && categoria && unidade) {
                        products.push({ codigo, nome, categoria, unidade });
                        newCategories.add(categoria);
                        newUnidades.add(unidade);
                    } else {
                        console.warn("Linha ignorada por dados incompletos:", row);
                    }
                });
    
                if (products.length === 0) {
                    alert("Nenhum produto válido encontrado no arquivo XLSX após a leitura.");
                    hideLoader();
                    return;
                }
    
                // 1. Inserir novas categorias
                const existingCategories = (await _supabaseClient.from('categorias').select('id, nome_categoria').eq('empresa_id', empresaId)).data || [];
                const categoriesMap = new Map(existingCategories.map(c => [c.nome_categoria.toLowerCase(), c.id]));
                const categoriesToInsert = Array.from(newCategories).filter(catName => !categoriesMap.has(catName.toLowerCase()));
    
                if (categoriesToInsert.length > 0) {
                    console.log("Inserindo novas categorias:", categoriesToInsert);
                    const { data: insertedCats, error: catError } = await _supabaseClient
                        .from('categorias')
                        .insert(categoriesToInsert.map(name => ({ nome_categoria: name, empresa_id: empresaId })))
                        .select('id, nome_categoria');
                    if (catError) throw catError;
                    insertedCats.forEach(cat => categoriesMap.set(cat.nome_categoria.toLowerCase(), cat.id));
                }
    
                // 2. Inserir novas unidades
                const existingUnidades = (await _supabaseClient.from('unidades').select('id, nome_unidade').eq('empresa_id', empresaId)).data || [];
                const unidadesMap = new Map(existingUnidades.map(u => [u.nome_unidade.toLowerCase(), u.id]));
                const unidadesToInsert = Array.from(newUnidades).filter(uniName => !unidadesMap.has(uniName.toLowerCase()));
    
                if (unidadesToInsert.length > 0) {
                    console.log("Inserindo novas unidades:", unidadesToInsert);
                    const { data: insertedUnis, error: uniError } = await _supabaseClient
                        .from('unidades')
                        .insert(unidadesToInsert.map(name => ({ nome_unidade: name, empresa_id: empresaId })))
                        .select('id, nome_unidade');
                    if (uniError) throw uniError;
                    insertedUnis.forEach(uni => unidadesMap.set(uni.nome_unidade.toLowerCase(), uni.id));
                }
    
                // 3. Inserir produtos e suas associações
                let productsAddedCount = 0;
                for (const prod of products) {
                    const categoriaId = categoriesMap.get(prod.categoria.toLowerCase());
                    const unidadeId = unidadesMap.get(prod.unidade.toLowerCase());
    
                    if (!categoriaId || !unidadeId) {
                        console.warn(`Produto "${prod.nome}" ignorado: Categoria ou Unidade não encontrada após inserção/busca.`);
                        continue;
                    }
    
                    // Verificar se o produto já existe (código ou nome)
                    const { data: existingProd, error: checkError } = await _supabaseClient
                        .from('produtos')
                        .select('id')
                        .eq('empresa_id', empresaId)
                        .or(`codigo.eq.${prod.codigo},nome_produto.eq.${prod.nome}`);
    
                    if (checkError) {
                        console.error(`Erro ao verificar produto existente (${prod.nome}):`, checkError);
                        continue;
                    }
    
                    let produtoId;
                    if (existingProd && existingProd.length > 0) {
                        console.warn(`Produto "${prod.nome}" (${prod.codigo}) já existe. Pulando inserção.`);
                        produtoId = existingProd[0].id;
                        // Opcional: Atualizar associações se o produto já existir e as associações não.
                        // Isso complicaria o fluxo, por ora, vamos apenas pular.
                    } else {
                        const { data: newProd, error: insertProdError } = await _supabaseClient
                            .from('produtos')
                            .insert([{ codigo: prod.codigo, nome_produto: prod.nome, empresa_id: empresaId }])
                            .select('id')
                            .single();
                        if (insertProdError) {
                            console.error(`Erro ao inserir produto "${prod.nome}":`, insertProdError);
                            continue;
                        }
                        produtoId = newProd.id;
                        productsAddedCount++;
                    }
    
                    // Inserir associações de categoria e unidade (se o produto foi realmente adicionado ou se for uma atualização de associações)
                    // Verificação para evitar duplicatas nas tabelas de junção
                    const { data: existingProdCat, error: checkProdCatError } = await _supabaseClient
                        .from('produtos_categorias')
                        .select('id')
                        .eq('produto_id', produtoId)
                        .eq('categoria_id', categoriaId)
                        .limit(1);
                    if (checkProdCatError) console.error("Erro ao verificar prod_cat:", checkProdCatError);
    
                    if (!existingProdCat || existingProdCat.length === 0) {
                        const { error: insertProdCatError } = await _supabaseClient.from('produtos_categorias').insert([{ produto_id: produtoId, categoria_id: categoriaId }]);
                        if (insertProdCatError) console.error(`Erro ao associar produto ${prod.nome} à categoria ${prod.categoria}:`, insertProdCatError);
                    }
    
                    const { data: existingProdUni, error: checkProdUniError } = await _supabaseClient
                        .from('produtos_unidades')
                        .select('id')
                        .eq('produto_id', produtoId)
                        .eq('unidade_id', unidadeId)
                        .limit(1);
                    if (checkProdUniError) console.error("Erro ao verificar prod_uni:", checkProdUniError);
    
                    if (!existingProdUni || existingProdUni.length === 0) {
                        const { error: insertProdUniError } = await _supabaseClient.from('produtos_unidades').insert([{ produto_id: produtoId, unidade_id: unidadeId }]);
                        if (insertProdUniError) console.error(`Erro ao associar produto ${prod.nome} à unidade ${prod.unidade}:`, insertProdUniError);
                    }
                }
    
                alert(`Importação concluída. ${productsAddedCount} novos produtos adicionados (e categorias/unidades, se novas).`);
                xlsxFileInput.value = ''; // Limpa o input do arquivo
                await fetchAndRenderProducts(empresaId); // Atualiza a lista de produtos na tela
    
            } catch (error) {
                console.error("Erro na leitura/importação do XLSX:", error);
                alert(`Erro ao importar arquivo: ${error.message}`);
            } finally {
                hideLoader();
            }
        };
    
        reader.onerror = (error) => {
            console.error("Erro ao ler o arquivo:", error);
            alert("Erro ao ler o arquivo XLSX.");
            hideLoader();
        };
    
        reader.readAsArrayBuffer(file);
    }
    
    // As próximas 3 funções, showInventoryCountScreen_AdminGlobal, showInventoryCountScreen_Empresa, e fetchAndRenderInventoryProducts
    // precisam ter um controle mais fino sobre o "adminContagemEmpresaSelect" para exibir/esconder corretamente
    // e também sobre os filtros de unidade e colaborador.
    
    async function showInventoryCountScreen_AdminGlobal() {
        if (!currentUser || currentUser.role !== 'admin_master') { handleLogout(); return; }
        showLoader();
        if (adminContagemEmpresaSelectorContainer) adminContagemEmpresaSelectorContainer.style.display = 'block';
        if (selectColaboradorContagem) selectColaboradorContagem.style.display = 'block';
        if (selectUnidadeContagem) selectUnidadeContagem.style.display = 'block';
    
        await populateEmpresasSelect(adminContagemEmpresaSelect, true, "-- Selecione uma Empresa --", "");
        adminContagemEmpresaSelect.onchange = async () => {
            const selectedEmpresaId = adminContagemEmpresaSelect.value;
            if (selectedEmpresaId) {
                await populateColaboradoresSelect(selectedEmpresaId);
                await populateUnidadesSelect(selectedEmpresaId, selectUnidadeContagem);
                await populateCategoriasSelect(selectedEmpresaId, filtroCategoriaSelect); // Popula filtro de categoria
                await fetchAndRenderInventoryProducts(selectedEmpresaId);
            } else {
                inventoryTableBody.innerHTML = '<tr><td colspan="6">Selecione uma empresa para iniciar a contagem.</td></tr>';
                if (selectColaboradorContagem) selectColaboradorContagem.innerHTML = '<option value="">-- Selecione um Colaborador --</option>';
                if (selectUnidadeContagem) selectUnidadeContagem.innerHTML = '<option value="">-- Selecione uma Unidade --</option>';
                if (filtroCategoriaSelect) filtroCategoriaSelect.innerHTML = '<option value="">Todas as Categorias</option>';
                quantidadesDigitadas = {};
                saveQuantities();
            }
        };
        if(inventoryCountTitle) inventoryCountTitle.textContent = 'Balanço de Estoque (Admin)';
        if(inventoryCountContext) inventoryCountContext.textContent = '';
        showScreen('inventoryCount', { showEmpresaSelector: true });
        hideLoader();
    }
    
    async function showInventoryCountScreen_Empresa() {
        if (!currentUser || (currentUser.role !== 'empresa_manager' && currentUser.role !== 'empresa_counter' && currentUser.role !== 'empresa_login_principal')) { handleLogout(); return; }
        if (!currentUser.empresa_id) { console.error("ID da empresa não encontrada para contagem."); alert("Erro: ID da empresa não encontrada."); handleLogout(); return; }
        showLoader();
        if (adminContagemEmpresaSelectorContainer) adminContagemEmpresaSelectorContainer.style.display = 'none'; // Esconde para a empresa
        if (selectColaboradorContagem) selectColaboradorContagem.style.display = 'block'; // Sempre visível para empresa
        if (selectUnidadeContagem) selectUnidadeContagem.style.display = 'block'; // Sempre visível para empresa
    
        if(inventoryCountTitle) inventoryCountTitle.textContent = 'Balanço de Estoque';
        if(inventoryCountContext) inventoryCountContext.textContent = `da ${currentUser.empresa_nome}`;
    
        await populateColaboradoresSelect(currentUser.empresa_id);
        await populateUnidadesSelect(currentUser.empresa_id, selectUnidadeContagem);
        await populateCategoriasSelect(currentUser.empresa_id, filtroCategoriaSelect); // Popula filtro de categoria
        await fetchAndRenderInventoryProducts(currentUser.empresa_id);
        showScreen('inventoryCount', { showEmpresaSelector: false });
        hideLoader();
    }
    
    async function populateColaboradoresSelect(empresaId) {
        if (!selectColaboradorContagem) { console.error("selectColaboradorContagem not found."); return; }
        selectColaboradorContagem.innerHTML = '<option value="">-- Selecione um Colaborador --</option>'; // Opção padrão
        try {
            const { data, error } = await _supabaseClient
                .from('colaboradores')
                .select('id, nome_colaborador')
                .eq('empresa_id', empresaId)
                .order('nome_colaborador');
            if (error) throw error;
            colaboradoresCache = data || [];
            colaboradoresCache.forEach(colab => {
                const option = document.createElement('option');
                option.value = colab.id;
                option.textContent = colab.nome_colaborador;
                selectColaboradorContagem.appendChild(option);
            });
        } catch (e) {
            console.error("Erro ao popular colaboradores para select:", e);
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Erro ao carregar colaboradores';
            option.disabled = true;
            selectColaboradorContagem.appendChild(option);
        }
    }
    
    async function fetchAndRenderInventoryProducts(empresaId) {
        if (!inventoryTableBody) return;
        inventoryTableBody.innerHTML = '<tr><td colspan="7">Carregando produtos para contagem...</td></tr>';
        showLoader();
        loadQuantities(); // Recarrega quantidades salvas ao renderizar
    
        try {
            if (!empresaId) {
                inventoryTableBody.innerHTML = '<tr><td colspan="7">Selecione uma empresa para listar produtos.</td></tr>';
                hideLoader();
                return;
            }
    
            const { data, error } = await _supabaseClient
                .from('produtos')
                .select(`
                    id,
                    codigo,
                    nome_produto,
                    categorias(id, nome_categoria),
                    unidades(id, nome_unidade)
                `)
                .eq('empresa_id', empresaId)
                .order('nome_produto');
    
            if (error) throw error;
    
            produtosCache = data || []; // Atualiza o cache global de produtos
            renderFilteredInventoryProducts(); // Renderiza os produtos (e aplica filtros)
    
        } catch (e) {
            console.error("Erro ao buscar produtos para inventário:", e);
            inventoryTableBody.innerHTML = `<tr><td colspan="7" style="color:var(--danger-color);">Erro ao carregar produtos: ${e.message}</td></tr>`;
        } finally {
            hideLoader();
        }
    }
    
    function filterInventoryProducts() {
        renderFilteredInventoryProducts();
    }
    
    function renderFilteredInventoryProducts() {
        if (!inventoryTableBody) return;
        inventoryTableBody.innerHTML = '';
    
        const searchTermProduct = pesquisaProdutoInput.value.toLowerCase();
        const searchTermCodigo = pesquisaCodigoInput.value.toLowerCase();
        const filterCategoriaId = filtroCategoriaSelect.value;
        const filterUnidadeId = filtroUnidadeSelect.value;
    
        let filteredProducts = produtosCache.filter(produto => {
            const matchesProduct = produto.nome_produto.toLowerCase().includes(searchTermProduct);
            const matchesCodigo = produto.codigo.toLowerCase().includes(searchTermCodigo);
            
            const matchesCategoria = !filterCategoriaId || 
                                     produto.categorias.some(cat => cat.id.toString() === filterCategoriaId);
            
            const matchesUnidade = !filterUnidadeId ||
                                   produto.unidades.some(uni => uni.id.toString() === filterUnidadeId);
    
            return matchesProduct && matchesCodigo && matchesCategoria && matchesUnidade;
        });
    
        if (filteredProducts.length > 0) {
            filteredProducts.forEach(produto => {
                const row = inventoryTableBody.insertRow();
                row.insertCell().textContent = produto.codigo;
                row.insertCell().textContent = produto.nome_produto;
                
                const categoriasCell = row.insertCell();
                categoriasCell.textContent = produto.categorias ? produto.categorias.map(c => c.nome_categoria).join(', ') : 'N/A';
                
                const unidadesCell = row.insertCell();
                unidadesCell.textContent = produto.unidades ? produto.unidades.map(u => u.nome_unidade).join(', ') : 'N/A';
    
                const quantidadeCell = row.insertCell();
                const inputQuantidade = document.createElement('input');
                inputQuantidade.type = 'number';
                inputQuantidade.min = '0';
                inputQuantidade.className = 'form-control quantidade-input';
                inputQuantidade.id = `quantidade-${produto.id}`;
                inputQuantidade.value = quantidadesDigitadas[produto.id] || '';
                inputQuantidade.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 0) {
                        quantidadesDigitadas[produto.id] = value;
                    } else {
                        delete quantidadesDigitadas[produto.id]; // Remove se for inválido/vazio
                    }
                    saveQuantities();
                    updateExportButtonStates();
                });
                quantidadeCell.appendChild(inputQuantidade);
    
                // Botões de +/-
                const controlsCell = row.insertCell();
                const btnMinus = document.createElement('button');
                btnMinus.textContent = '-';
                btnMinus.className = 'btn btn-secondary btn-sm me-1';
                btnMinus.onclick = () => {
                    let currentVal = parseInt(inputQuantidade.value) || 0;
                    if (currentVal > 0) {
                        inputQuantidade.value = currentVal - 1;
                        inputQuantidade.dispatchEvent(new Event('input')); // Trigger input event
                    }
                };
                controlsCell.appendChild(btnMinus);
    
                const btnPlus = document.createElement('button');
                btnPlus.textContent = '+';
                btnPlus.className = 'btn btn-secondary btn-sm';
                btnPlus.onclick = () => {
                    let currentVal = parseInt(inputQuantidade.value) || 0;
                    inputQuantidade.value = currentVal + 1;
                    inputQuantidade.dispatchEvent(new Event('input')); // Trigger input event
                };
                controlsCell.appendChild(btnPlus);
            });
        } else {
            inventoryTableBody.innerHTML = '<tr><td colspan="7">Nenhum produto encontrado com os filtros aplicados.</td></tr>';
        }
        updateExportButtonStates(); // Atualiza o estado dos botões de exportação
    }
    
    function updateExportButtonStates() {
        const hasQuantities = Object.keys(quantidadesDigitadas).some(key => quantidadesDigitadas[key] > 0);
        if (btnGerarTXT) btnGerarTXT.disabled = !hasQuantities;
        if (btnGerarPDF) btnGerarPDF.disabled = !hasQuantities;
    }
    
    async function showPreviewContagem() {
        if (!selectColaboradorContagem || !selectUnidadeContagem || !previewContagemTableContainer || !modalPreviewContagem) {
            alert("Erro interno: Elementos da pré-visualização não encontrados.");
            return;
        }
    
        const colaboradorId = selectColaboradorContagem.value;
        const unidadeId = selectUnidadeContagem.value;
    
        if (!colaboradorId) {
            alert("Por favor, selecione o colaborador responsável pela contagem.");
            return;
        }
        if (!unidadeId) {
            alert("Por favor, selecione a unidade onde a contagem foi realizada.");
            return;
        }
    
        const itensContados = [];
        for (const produtoId in quantidadesDigitadas) {
            const quantidade = quantidadesDigitadas[produtoId];
            if (quantidade > 0) {
                const produto = produtosCache.find(p => p.id.toString() === produtoId);
                if (produto) {
                    itensContados.push({
                        produto_id: produto.id,
                        codigo: produto.codigo,
                        nome_produto: produto.nome_produto,
                        quantidade: quantidade
                    });
                }
            }
        }
    
        if (itensContados.length === 0) {
            alert("Nenhum item com quantidade digitada para pré-visualizar.");
            return;
        }
    
        // Construir a tabela de pré-visualização
        let previewHtml = `
            <h4>Resumo da Contagem</h4>
            <p><strong>Colaborador:</strong> ${selectColaboradorContagem.options[selectColaboradorContagem.selectedIndex].text}</p>
            <p><strong>Unidade:</strong> ${selectUnidadeContagem.options[selectUnidadeContagem.selectedIndex].text}</p>
            <table class="table table-striped table-bordered mt-3">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Produto</th>
                        <th>Quantidade</th>
                    </tr>
                </thead>
                <tbody>
        `;
    
        itensContados.sort((a, b) => a.nome_produto.localeCompare(b.nome_produto)).forEach(item => {
            previewHtml += `
                <tr>
                    <td>${item.codigo}</td>
                    <td>${item.nome_produto}</td>
                    <td>${item.quantidade}</td>
                </tr>
            `;
        });
    
        previewHtml += `
                </tbody>
            </table>
            <div class="modal-footer justify-content-between">
                <button type="button" class="btn btn-secondary" onclick="closeModalPreviewContagem()">Cancelar</button>
                <button type="button" class="btn btn-success" id="btnSalvarContagem">Salvar Contagem</button>
            </div>
        `;
    
        previewContagemTableContainer.innerHTML = previewHtml;
        modalPreviewContagem.style.display = 'block';
        modalPreviewContagem.classList.add('show');
    
        // Adicionar o event listener para o botão de salvar APENAS após ele ser inserido no DOM
        document.getElementById('btnSalvarContagem').addEventListener('click', () => handleSaveContagem(colaboradorId, unidadeId, itensContados));
    }
    
    function closeModalPreviewContagem() {
        if (modalPreviewContagem) {
            modalPreviewContagem.style.display = 'none';
            modalPreviewContagem.classList.remove('show');
        }
    }
    
    async function handleSaveContagem(colaboradorId, unidadeId, itensContados) {
        showLoader();
        closeModalPreviewContagem();
        try {
            const empresaId = currentUser?.empresa_id || adminContagemEmpresaSelect.value;
            if (!empresaId) {
                throw new Error("ID da empresa não disponível para salvar contagem.");
            }
    
            // 1. Inserir o registro da contagem principal
            const { data: contagemData, error: contagemError } = await _supabaseClient
                .from('contagens')
                .insert([{
                    empresa_id: empresaId,
                    colaborador_id: colaboradorId,
                    unidade_id: unidadeId,
                    data_contagem: new Date().toISOString()
                }])
                .select()
                .single();
    
            if (contagemError) throw contagemError;
    
            const novaContagemId = contagemData.id;
    
            // 2. Inserir os itens detalhados da contagem
            const itensParaInserir = itensContados.map(item => ({
                contagem_id: novaContagemId,
                produto_id: item.produto_id,
                quantidade_contada: item.quantidade
            }));
    
            const { error: itensError } = await _supabaseClient
                .from('contagem_itens_por_produto')
                .insert(itensParaInserir);
    
            if (itensError) throw itensError;
    
            alert("Contagem salva com sucesso!");
            clearAllQuantities(); // Limpa as quantidades do localStorage e dos inputs
            await fetchAndRenderInventoryProducts(empresaId); // Atualiza a tabela para refletir a limpeza
        } catch (e) {
            console.error("Erro ao salvar contagem:", e);
            alert(`Erro ao salvar contagem: ${e.message}`);
        } finally {
            hideLoader();
        }
    }
    
    function clearAllQuantities() {
        quantidadesDigitadas = {};
        saveQuantities(); // Limpa o localStorage
        // Limpa os inputs visíveis na tela
        const inputs = document.querySelectorAll('.quantidade-input');
        inputs.forEach(input => {
            input.value = '';
        });
        updateExportButtonStates();
        console.log("Todas as quantidades foram limpas.");
    }
    
    async function showHistoricoContagensScreen_Admin() {
        if (!currentUser || currentUser.role !== 'admin_master') { handleLogout(); return; }
        showLoader();
        // Exibe o seletor de empresa e a coluna "Empresa" na tabela
        if (adminHistoricoEmpresaSelectorContainer) adminHistoricoEmpresaSelectorContainer.style.display = 'block';
        if (colEmpresaHistorico) colEmpresaHistorico.style.display = '';
        if (historicoUnidadeFilterContainer) historicoUnidadeFilterContainer.style.display = 'block';
    
        await populateEmpresasSelect(adminHistoricoEmpresaSelect, true, "-- Selecione uma Empresa --", "");
        adminHistoricoEmpresaSelect.onchange = async () => {
            const selectedEmpresaId = adminHistoricoEmpresaSelect.value;
            if (selectedEmpresaId) {
                // Ao mudar a empresa, repopula o filtro de unidades para a nova empresa
                await populateUnidadesSelect(selectedEmpresaId, historicoUnidadeFilter);
                await fetchAndRenderHistoricoContagens(selectedEmpresaId);
            } else {
                historicoContagensTableBody.innerHTML = '<tr><td colspan="7">Selecione uma empresa para ver o histórico.</td></tr>';
                historicoUnidadeFilter.innerHTML = '<option value="">Todas as Unidades</option>';
            }
        };
        historicoUnidadeFilter.onchange = () => fetchAndRenderHistoricoContagens(adminHistoricoEmpresaSelect.value, historicoUnidadeFilter.value);
        
        if(historicoTitle) historicoTitle.textContent = 'Histórico de Contagens (Admin)';
        if(historicoContext) historicoContext.textContent = '';
        showScreen('historicoContagens', { showEmpresaSelector: true, showEmpresaColumnInTable: true });
        hideLoader();
    }
    
    async function showHistoricoContagensScreen() {
        if (!currentUser || (currentUser.role !== 'empresa_manager' && currentUser.role !== 'empresa_counter' && currentUser.role !== 'empresa_login_principal')) { handleLogout(); return; }
        if (!currentUser.empresa_id) { console.error("ID da empresa não encontrada para histórico."); alert("Erro: ID da empresa não encontrada."); handleLogout(); return; }
        showLoader();
        // Esconde o seletor de empresa e a coluna "Empresa" na tabela
        if (adminHistoricoEmpresaSelectorContainer) adminHistoricoEmpresaSelectorContainer.style.display = 'none';
        if (colEmpresaHistorico) colEmpresaHistorico.style.display = 'none';
        if (historicoUnidadeFilterContainer) historicoUnidadeFilterContainer.style.display = 'block';
    
        await populateUnidadesSelect(currentUser.empresa_id, historicoUnidadeFilter);
        historicoUnidadeFilter.onchange = () => fetchAndRenderHistoricoContagens(currentUser.empresa_id, historicoUnidadeFilter.value);
    
        if(historicoTitle) historicoTitle.textContent = 'Meu Histórico de Contagens';
        if(historicoContext) historicoContext.textContent = `da ${currentUser.empresa_nome}`;
        
        await fetchAndRenderHistoricoContagens(currentUser.empresa_id);
        showScreen('historicoContagens', { showEmpresaSelector: false, showEmpresaColumnInTable: false });
        hideLoader();
    }
    
    async function fetchAndRenderHistoricoContagens(empresaId, unidadeFilterId = null) {
        if (!historicoContagensTableBody) return;
        historicoContagensTableBody.innerHTML = '<tr><td colspan="7">Carregando histórico...</td></tr>';
        showLoader();
        try {
            if (!empresaId) {
                historicoContagensTableBody.innerHTML = '<tr><td colspan="7">Selecione uma empresa para ver o histórico.</td></tr>';
                hideLoader();
                return;
            }
    
            let query = _supabaseClient
                .from('contagens')
                .select(`
                    id,
                    data_contagem,
                    colaboradores(nome_colaborador),
                    unidades(nome_unidade),
                    empresas(nome_empresa)
                `)
                .eq('empresa_id', empresaId);
            
            if (unidadeFilterId) {
                query = query.eq('unidade_id', unidadeFilterId);
            }
    
            query = query.order('data_contagem', { ascending: false });
    
            const { data, error } = await query;
            if (error) throw error;
    
            historicoContagensTableBody.innerHTML = '';
            if (data && data.length > 0) {
                data.forEach(contagem => {
                    const row = historicoContagensTableBody.insertRow();
                    row.insertCell().textContent = new Date(contagem.data_contagem).toLocaleString('pt-BR');
                    row.insertCell().textContent = contagem.colaboradores?.nome_colaborador || 'N/A';
                    row.insertCell().textContent = contagem.unidades?.nome_unidade || 'N/A';
    
                    // Mostra a coluna da empresa apenas se for admin_master
                    if (currentUser?.role === 'admin_master') {
                        row.insertCell().textContent = contagem.empresas?.nome_empresa || 'N/A';
                    }
    
                    const actionsCell = row.insertCell();
                    const btnViewDetails = document.createElement('button');
                    btnViewDetails.textContent = 'Ver Detalhes';
                    btnViewDetails.className = 'btn btn-info table-actions';
                    btnViewDetails.onclick = () => showDetalhesContagem(contagem.id);
                    actionsCell.appendChild(btnViewDetails);
                });
            } else {
                historicoContagensTableBody.innerHTML = '<tr><td colspan="7">Nenhuma contagem encontrada.</td></tr>';
            }
        } catch (e) {
            console.error("Erro ao buscar histórico de contagens:", e);
            historicoContagensTableBody.innerHTML = `<tr><td colspan="7" style="color:var(--danger-color);">Erro ao carregar histórico: ${e.message}</td></tr>`;
        } finally {
            hideLoader();
        }
    }
    
    async function showDetalhesContagem(contagemId) {
        if (!modalDetalhesContagem || !detalhesContagemConteudo) return;
        showLoader();
        detalhesContagemConteudo.innerHTML = '<p>Carregando detalhes...</p>';
    
        try {
            const { data: contagem, error: contagemError } = await _supabaseClient
                .from('contagens')
                .select(`
                    id,
                    data_contagem,
                    colaboradores(nome_colaborador),
                    unidades(nome_unidade),
                    contagem_itens_por_produto(
                        quantidade_contada,
                        produtos(codigo, nome_produto)
                    )
                `)
                .eq('id', contagemId)
                .single();
    
            if (contagemError) throw contagemError;
            if (!contagem) {
                detalhesContagemConteudo.innerHTML = '<p>Detalhes da contagem não encontrados.</p>';
                return;
            }
    
            let detailsHtml = `
                <h4>Detalhes da Contagem #${contagem.id}</h4>
                <p><strong>Data/Hora:</strong> ${new Date(contagem.data_contagem).toLocaleString('pt-BR')}</p>
                <p><strong>Colaborador:</strong> ${contagem.colaboradores?.nome_colaborador || 'N/A'}</p>
                <p><strong>Unidade:</strong> ${contagem.unidades?.nome_unidade || 'N/A'}</p>
                <hr>
                <h5>Itens Contados:</h5>
                <table class="table table-striped table-bordered">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Produto</th>
                            <th>Quantidade</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
    
            if (contagem.contagem_itens_por_produto && contagem.contagem_itens_por_produto.length > 0) {
                // Ordenar por nome do produto
                contagem.contagem_itens_por_produto.sort((a, b) => 
                    (a.produtos?.nome_produto || '').localeCompare(b.produtos?.nome_produto || '')
                );
    
                contagem.contagem_itens_por_produto.forEach(item => {
                    detailsHtml += `
                        <tr>
                            <td>${item.produtos?.codigo || 'N/A'}</td>
                            <td>${item.produtos?.nome_produto || 'N/A'}</td>
                            <td>${item.quantidade_contada}</td>
                        </tr>
                    `;
                });
            } else {
                detailsHtml += '<tr><td colspan="3">Nenhum item encontrado para esta contagem.</td></tr>';
            }
    
            detailsHtml += `
                    </tbody>
                </table>
            `;
    
            detalhesContagemConteudo.innerHTML = detailsHtml;
            modalDetalhesContagem.style.display = 'block';
            modalDetalhesContagem.classList.add('show');
    
        } catch (e) {
            console.error("Erro ao buscar detalhes da contagem:", e);
            detalhesContagemConteudo.innerHTML = `<p style="color:var(--danger-color);">Erro ao carregar detalhes: ${e.message}</p>`;
        } finally {
            hideLoader();
        }
    }
    
    function closeModalDetalhesContagem() {
        if (modalDetalhesContagem) {
            modalDetalhesContagem.style.display = 'none';
            modalDetalhesContagem.classList.remove('show');
        }
    }
    
    // Funções de exportação
    async function gerarArquivoTXT() {
        if (!selectColaboradorContagem || !selectUnidadeContagem) {
            alert("Por favor, selecione o colaborador e a unidade antes de gerar o arquivo.");
            return;
        }
    
        const colaboradorNome = selectColaboradorContagem.options[selectColaboradorContagem.selectedIndex].text;
        const unidadeNome = selectUnidadeContagem.options[selectUnidadeContagem.selectedIndex].text;
        const dataContagem = new Date().toLocaleString('pt-BR');
        const empresaNome = currentUser?.empresa_nome || 'N/A';
    
        let content = `BALANÇO DE ESTOQUE\n`;
        content += `Empresa: ${empresaNome}\n`;
        content += `Unidade: ${unidadeNome}\n`;
        content += `Colaborador: ${colaboradorNome}\n`;
        content += `Data da Contagem: ${dataContagem}\n\n`;
        content += `--------------------------------------------------\n`;
        content += `CÓDIGO      PRODUTO                         QUANTIDADE\n`;
        content += `--------------------------------------------------\n`;
    
        const itensContados = [];
        for (const produtoId in quantidadesDigitadas) {
            const quantidade = quantidadesDigitadas[produtoId];
            if (quantidade > 0) {
                const produto = produtosCache.find(p => p.id.toString() === produtoId);
                if (produto) {
                    itensContados.push({
                        codigo: produto.codigo,
                        nome_produto: produto.nome_produto,
                        quantidade: quantidade
                    });
                }
            }
        }
    
        itensContados.sort((a, b) => a.nome_produto.localeCompare(b.nome_produto)).forEach(item => {
            const codigoPad = item.codigo.padEnd(10).substring(0, 10);
            const nomePad = item.nome_produto.padEnd(30).substring(0, 30);
            const quantidadePad = item.quantidade.toString().padStart(10);
            content += `${codigoPad}  ${nomePad}  ${quantidadePad}\n`;
        });
    
        content += `--------------------------------------------------\n`;
        content += `Total de Itens Contados: ${itensContados.length}\n`;
    
        triggerDownload(`contagem_estoque_${empresaNome.replace(/\s/g, '_')}_${new Date().toISOString().slice(0,10)}.txt`, content);
        alert("Arquivo TXT gerado com sucesso!");
    }
    
    async function gerarPDFContagem() {
        if (!selectColaboradorContagem || !selectUnidadeContagem) {
            alert("Por favor, selecione o colaborador e a unidade antes de gerar o PDF.");
            return;
        }
    
        const colaboradorNome = selectColaboradorContagem.options[selectColaboradorContagem.selectedIndex].text;
        const unidadeNome = selectUnidadeContagem.options[selectUnidadeContagem.selectedIndex].text;
        const dataContagem = new Date().toLocaleString('pt-BR');
        const empresaNome = currentUser?.empresa_nome || 'N/A';
    
        const itensContados = [];
        for (const produtoId in quantidadesDigitadas) {
            const quantidade = quantidadesDigitadas[produtoId];
            if (quantidade > 0) {
                const produto = produtosCache.find(p => p.id.toString() === produtoId);
                if (produto) {
                    itensContados.push({
                        codigo: produto.codigo,
                        nome_produto: produto.nome_produto,
                        quantidade: quantidade
                    });
                }
            }
        }
    
        if (itensContados.length === 0) {
            alert("Nenhum item com quantidade digitada para gerar PDF.");
            return;
        }
    
        itensContados.sort((a, b) => a.nome_produto.localeCompare(b.nome_produto));
    
        // Estrutura para jsPDF autoTable
        const head = [['Código', 'Produto', 'Quantidade']];
        const body = itensContados.map(item => [item.codigo, item.nome_produto, item.quantidade]);
    
        const doc = new window.jspdf.jsPDF(); // Certifique-se de que jspdf esteja carregado globalmente
    
        doc.setFontSize(18);
        doc.text("Balanço de Estoque", 14, 22);
    
        doc.setFontSize(12);
        doc.text(`Empresa: ${empresaNome}`, 14, 30);
        doc.text(`Unidade: ${unidadeNome}`, 14, 37);
        doc.text(`Colaborador: ${colaboradorNome}`, 14, 44);
        doc.text(`Data da Contagem: ${dataContagem}`, 14, 51);
    
        doc.autoTable({
            startY: 60,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133] },
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 30 }, // Código
                1: { cellWidth: 'auto' }, // Produto
                2: { cellWidth: 25, halign: 'right' } // Quantidade
            }
        });
    
        const finalY = doc.autoTable.previous.finalY;
        doc.text(`Total de Itens Contados: ${itensContados.length}`, 14, finalY + 10);
    
        doc.save(`contagem_estoque_${empresaNome.replace(/\s/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
        alert("Arquivo PDF gerado com sucesso!");
    }
    
    // Funções de edição de itens (apenas placeholders)
    function editColaborador(colaboradorId) {
        alert(`Funcionalidade de editar colaborador (ID: ${colaboradorId}) a ser implementada.`);
        // Implementar lógica para carregar dados do colaborador no formulário
        // e permitir a edição.
    }
    
    function editProduct(productId) {
        alert(`Funcionalidade de editar produto (ID: ${productId}) a ser implementada.`);
        // Implementar lógica para carregar dados do produto no formulário
        // e permitir a edição.
    }
    
    // ==================================================================
    // == PONTO DE ENTRADA DO APLICATIVO ==
    // ==================================================================

    // Esta função é chamada no final, depois que todas as outras foram definidas.
    async function initializeApp() {
        console.log("initializeApp chamado. Inicializando DOM e adicionando event listeners.");
        
        initializeDOMSelectors();
        loadQuantities();

        // Adiciona todos os seus event listeners
        document.getElementById('loginButton')?.addEventListener('click', handleLogin);
        document.getElementById('loginPassword')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }});
        document.getElementById('btnLogoutAdmin')?.addEventListener('click', handleLogout);
        document.getElementById('btnLogoutEmpresa')?.addEventListener('click', handleLogout);
        document.getElementById('btnAdminGerenciarEmpresas')?.addEventListener('click', showManageEmpresasAndUsersScreen_Admin);
        document.getElementById('btnAdminGerenciarUnidades')?.addEventListener('click', () => showUnidadesScreen(null, null, true));
        document.getElementById('btnAdminGerenciarCategorias')?.addEventListener('click', showCategoriasScreen_Admin);
        document.getElementById('btnAdminGerenciarProdutos')?.addEventListener('click', showProductManagementScreen_AdminGlobal);
        document.getElementById('btnAdminContagemEstoque')?.addEventListener('click', showInventoryCountScreen_AdminGlobal);
        document.getElementById('btnAdminHistoricoContagens')?.addEventListener('click', showHistoricoContagensScreen_Admin);
        document.getElementById('btnEmpresaGerenciarUsuarios')?.addEventListener('click', showManageUsersScreen_Empresa);
        document.getElementById('btnEmpresaGerenciarUnidades')?.addEventListener('click', () => showUnidadesScreen(null, null, false));
        document.getElementById('btnEmpresaGerenciarColaboradores')?.addEventListener('click', () => showEmpresaColaboradoresScreen(null, null, false));
        document.getElementById('btnEmpresaGerenciarCategorias')?.addEventListener('click', showCategoriasScreen_Empresa);
        document.getElementById('btnEmpresaGerenciarProdutos')?.addEventListener('click', showProductManagementScreen_Empresa);
        document.getElementById('btnEmpresaContagemEstoque')?.addEventListener('click', showInventoryCountScreen_Empresa);
        document.getElementById('btnEmpresaHistoricoContagens')?.addEventListener('click', showHistoricoContagensScreen);
        document.getElementById('btnEmpresaAlterarSenha')?.addEventListener('click', showChangePasswordScreen_Empresa);
        btnCategoriasVoltarEl?.addEventListener('click', () => {
            if (currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
            else if (currentUser?.role === 'empresa_manager' || currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
            else showScreen('login');
        });
        btnAddCategoriaEl?.addEventListener('click', handleAddCategoria);
        document.getElementById('btnAdminEmpresasVoltar')?.addEventListener('click', showAdminMasterDashboardScreen);
        document.getElementById('btnAdminAddEmpresa')?.addEventListener('click', handleAdminAddEmpresa);
        btnManageEmpresaUsersVoltarEl?.addEventListener('click', closeManageEmpresaUsersScreen);
        document.getElementById('btnExecuteCreateNewEmpresaUser')?.addEventListener('click', handleCreateEmpresaUser);
        btnUnidadesVoltarEl?.addEventListener('click', () => {
            if (currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
            else if (currentUser?.role === 'empresa_manager' || currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
            else showScreen('login');
        });
        btnAddUnidadeEl?.addEventListener('click', handleAddUnidade);
        document.getElementById('btnAddColaborador')?.addEventListener('click', handleAddColaborador);
        document.getElementById('btnSalvarNovaSenha')?.addEventListener('click', handleChangePassword);
        btnAddProductEl?.addEventListener('click', handleAddProduct);
        btnImportXLSXEl?.addEventListener('click', handleXLSXImport);
        document.getElementById('btnShowPreviewContagem')?.addEventListener('click', showPreviewContagem);
        btnGerarTXT?.addEventListener('click', gerarArquivoTXT);
        btnGerarPDF?.addEventListener('click', gerarPDFContagem);
        document.getElementById('btnClearAllQuantities')?.addEventListener('click', clearAllQuantities);
        document.getElementById('btnClosePreviewModal')?.addEventListener('click', closeModalPreviewContagem);
        document.getElementById('btnCloseDetalhesModal')?.addEventListener('click', closeModalDetalhesContagem);
        const changePassBackBtn = document.getElementById('changePasswordBackButton');
        if(changePassBackBtn) {
            changePassBackBtn.addEventListener('click', () => {
                if (currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
                else if (currentUser?.role === 'empresa_manager' || currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
                else showScreen('login');
            });
        }
        const prodMgmtBackBtn = document.getElementById('productManagementBackButton');
        if(prodMgmtBackBtn) {
            prodMgmtBackBtn.addEventListener('click', () => {
                if (currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
                else if (currentUser?.role === 'empresa_manager' || currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
                else showScreen('login');
            });
        }
        const invCountBackBtn = document.getElementById('inventoryCountBackButton');
        if(invCountBackBtn) {
            invCountBackBtn.addEventListener('click', () => {
                if (currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
                else if (currentUser?.role === 'empresa_manager' || currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
                else if (currentUser?.role === 'empresa_counter') handleLogout();
                else showScreen('login');
            });
        }
        const histBackBtn = document.getElementById('historicoBackButton');
           if(histBackBtn) {
            histBackBtn.addEventListener('click', () => {
                if (currentUser?.role === 'admin_master') showAdminMasterDashboardScreen();
                else if (currentUser?.role === 'empresa_manager' || currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen();
                else showScreen('login');
            });
        }
        
        console.log("Event listeners principais adicionados.");

        const localPesquisaProdutoInput = document.getElementById('pesquisaProduto');
        const localPesquisaCodigoInput = document.getElementById('pesquisaCodigo');
        const localFiltroCategoriaSelect = document.getElementById('filtroCategoria');
        const localFiltroUnidadeSelect = document.getElementById('filtroUnidade');

        if (localPesquisaProdutoInput) localPesquisaProdutoInput.addEventListener("input", filterInventoryProducts);
        if (localPesquisaCodigoInput) localPesquisaCodigoInput.addEventListener("input", filterInventoryProducts);
        if (localFiltroCategoriaSelect) localFiltroCategoriaSelect.addEventListener("change", filterInventoryProducts);
        if (localFiltroUnidadeSelect) localFiltroUnidadeSelect.addEventListener("change", filterInventoryProducts);

        // Tenta restaurar a sessão do usuário
        
        try {
            console.log("Tentando obter sessão Supabase...");
            const { data: { session }, error: sessionError } = await _supabaseClient.auth.getSession();
            if (sessionError) { throw sessionError; }

            if (session?.user) {
                console.log("Sessão encontrada para:", session.user.email);
                const { data: profile, error: profileError } = await _supabaseClient.from('user_profiles').select('*, empresas (id, nome_empresa)').eq('id', session.user.id).single();
                if(profileError) {
                    if (profileError.code === 'PGRST116') {
                        console.warn("Sessão de autenticação válida, mas perfil não encontrado. Deslogando.");
                        await _supabaseClient.auth.signOut();
                        showScreen('login');
                        return;
                    }
                    throw profileError;
                }
                
                currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    user_metadata: session.user.user_metadata,
                    full_name: profile.full_name || session.user.email,
                    role: profile.role,
                    empresa_id: profile.empresa_id,
                    empresa_nome: profile.empresas?.nome_empresa
                   };
                console.log("Usuário restaurado da sessão:", currentUser);

                if (currentUser.role === 'admin_master') {
                    await fetchAndRenderEmpresas();
                    showAdminMasterDashboardScreen();
                } else if (currentUser.role === 'empresa_manager' || currentUser.role === 'empresa_login_principal') {
                    showEmpresaDashboardScreen();
                } else if (currentUser.role === 'empresa_counter') {
                    showInventoryCountScreen_Empresa();
                } else {
                    showScreen('login');
                }
            } else {
                console.log("Nenhuma sessão ativa encontrada.");
                showScreen('login');
            }
        } catch (e) {
            console.error("Erro crítico ao restaurar sessão:", e);
            await _supabaseClient.auth.signOut();
            showScreen('login');
        } finally {
            hideLoader();
            console.log("Inicialização finalizada.");
        }
    }

    // Finalmente, chama a função de inicialização para ligar o sistema.
    initializeApp();
}

console.log("FIM DO ARQUIVO SCRIPT");