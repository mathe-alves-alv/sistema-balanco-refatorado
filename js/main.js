// Script version v3.1 - Refatorado para Múltiplos Ambientes
console.log("SCRIPT START - v3.1 Refatorado");

/**
 * Inicializa o cliente Supabase de forma segura, detectando o ambiente.
 * Em ambiente local (Live Server), usa as chaves de DEV diretamente.
 * Em produção (Netlify), busca as chaves de uma Netlify Function.
 */
async function initializeSupabase() {
    // Em ambiente de desenvolvimento local (Live Server), usa as chaves de DEV diretamente.
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        console.log("Ambiente local detectado. Usando chaves de DESENVOLVIMENTO.");
        const DEV_SUPABASE_URL = 'https://jvtoahmrpzddfammsjwr.supabase.co';
        const DEV_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dG9haG1ycHpkZGZhbW1zandyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyOTA0MDYsImV4cCI6MjA2NTg2NjQwNn0.XdYmurPgxjLCEiDZFksgrvhhuJzH6GIBv87mg7kk5FY';
        return supabase.createClient(DEV_SUPABASE_URL, DEV_SUPABASE_ANON_KEY);
    }
    
    // Em produção (Netlify), busca as chaves da Netlify Function
    try {
        console.log("Ambiente de produção (Netlify) detectado. Buscando configuração.");
        const response = await fetch('/.netlify/functions/get-supabase-config');
        const config = await response.json();
        
        if (!config.url || !config.anonKey) {
            throw new Error("Configuração do Supabase não encontrada na Netlify Function.");
        }

        return supabase.createClient(config.url, config.anonKey);
    } catch (error) {
        console.error("Falha ao inicializar Supabase:", error);
        document.body.innerHTML = "<h1>Erro Crítico na Configuração do Sistema.</h1>";
        return null;
    }
}

const { createClient } = supabase;
const _supabaseClient = await initializeSupabase();


// --- O RESTO DO SEU CÓDIGO ORIGINAL COMEÇA AQUI ---

let produtosCache = [], categoriasCache = [], empresasCache = [], colaboradoresCache = [], unidadesCache = [];
let quantidadesDigitadas = {};
const ADMIN_MASTER_EMAIL = "matheus@mtech.com";
let currentUser = null;
let adminSelectedEmpresaContextId = null;
let isEmpresaManagerManagingOwnUsers = false;
let managedUsersCache = []; // Cache for profiles of ONE company being managed at a time. Cleared when context changes.

// Global DOM element references (to be initialized in initializeDOMSelectors)
let mainContainer, screens = {}, loadingIndicator, loginEmailInput, loginPasswordInput, loginErrorMessage,
    adminMasterNameDisplay, adminNomeEmpresaInput, adminEmpresasTableBody, adminEmpresasTitleEl,
    manageUsersEmpresaSection, manageUsersEmpresaTitleEl, selectedEmpresaIdForUserManage,
    adminEmpresaUsersTableBody, manageUsersEmpresaMessage,
    adminEmpresaNewUserEmailEl, adminEmpresaNewUserFullNameEl, adminEmpresaNewUserRoleEl, addUserNameForEmpresaDisplayEl,
    manageEmpresaUsersScreenTitleEl, btnManageEmpresaUsersVoltarEl, contextEmpresaNameForUserManageEl,
    
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


function initializeDOMSelectors() {
    console.log("initializeDOMSelectors v3.1 called");
    mainContainer = document.getElementById('mainContainer');
    screens = {
        login: document.getElementById('screenLogin'),
        adminMasterDashboard: document.getElementById('screenAdminMasterDashboard'),
        empresaDashboard: document.getElementById('screenEmpresaDashboard'),
        adminEmpresas: document.getElementById('screenAdminEmpresas'),
        manageEmpresaUsers: document.getElementById('screenManageEmpresaUsers'),
        unidades: document.getElementById('screenUnidades'), // New screen
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
    manageEmpresaUsersScreenTitleEl = safeGetElementById('manageEmpresaUsersScreenTitle');
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

// ... [O restante do seu código JavaScript original continua aqui, sem alterações] ...
// ... Todas as funções como handleLogin, handleLogout, showScreen, etc. ...

window.onload = async () => {
    // A função window.onload original, que chama initializeDOMSelectors e adiciona os event listeners
    console.log("window.onload v3.1 (Unidades & Multi-Associações + RPC Produtos) started");
    initializeDOMSelectors();
    showLoader();
    if (typeof loadQuantities === "function") loadQuantities();
    else console.error("CRITICAL: loadQuantities is not defined!");

    document.getElementById('loginButton')?.addEventListener('click', handleLogin);
    // ... Todos os outros event listeners ...

    // O código de verificação de sessão também permanece aqui
    // ...

    console.log("window.onload finished.");
    hideLoader();
};

console.log("SCRIPT END - v3.1 Refatorado");