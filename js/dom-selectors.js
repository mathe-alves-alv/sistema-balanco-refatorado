// js/dom-selectors.js

// Variáveis para armazenar as referências dos elementos DOM
export let mainContainer, screens = {}, loadingIndicator, loginEmailInput, loginPasswordInput, loginErrorMessage;
export let adminMasterNameDisplay, adminNomeEmpresaInput, adminEmpresasTableBody, adminEmpresasTitleEl;
export let manageUsersEmpresaSection, manageUsersEmpresaTitleEl, selectedEmpresaIdForUserManage;
export let adminEmpresaUsersTableBody, manageUsersEmpresaMessage;
export let adminEmpresaNewUserEmailEl, adminEmpresaNewUserFullNameEl, adminEmpresaNewUserRoleEl, addUserNameForEmpresaDisplayEl;
export let manageUsersEmpresaScreenTitleEl, btnManageEmpresaUsersVoltarEl, contextEmpresaNameForUserManageEl;
export let unidadesTitleEl, adminUnidadeEmpresaSelectContainerEl, adminUnidadeEmpresaSelectEl;
export let nomeUnidadeInputEl, unidadesTableBodyEl, btnUnidadesVoltarEl, btnAddUnidadeEl, unidadesContextEl;
export let thUnidadeEmpresaScopeEl;
export let categoriasTitleEl, adminCategoriaEmpresaSelectContainerEl, adminCategoriaEmpresaSelectEl;
export let nomeCategoriaInputEl, categoriasTableBodyEl, btnCategoriasVoltarEl, btnAddCategoriaEl, categoriasContextEl;
export let thCategoriaEmpresaScopeEl;
export let colaboradoresEmpresaNomeSpan, colaboradorNomeInput, colaboradoresTableBody, colaboradorUnidadesMultiSelect;
export let currentPasswordInput, newPasswordInput, confirmNewPasswordInput, changePasswordMessage;
export let changePasswordBackButton, changingPasswordForUserDisplay, currentPasswordGroup;
export let historicoEmpresaNomeSpan, historicoContagensTableBody, modalDetalhesContagem, detalhesContagemConteudo;
export let adminHistoricoEmpresaSelectorContainer, adminHistoricoEmpresaSelect, historicoBackButton, historicoTitle, historicoContext, colEmpresaHistorico;
export let historicoUnidadeFilterContainer, historicoUnidadeFilter;
export let productManagementBackButton, productManagementTitle, productManagementContext;
export let adminProdutoEmpresaSelectorContainer, adminProdutoEmpresaSelect, prodCodigoInput, prodNomeInput;
export let prodCategoriasMultiSelect, prodUnidadesMultiSelect, productManagementTableBody, xlsxFileInput, btnAddProductEl, btnImportXLSXEl;
export let inventoryCountBackButton, inventoryCountTitle, inventoryCountContext, adminContagemEmpresaSelectorContainer;
export let adminContagemEmpresaSelect, selectColaboradorContagem, selectUnidadeContagem, pesquisaProdutoInput, pesquisaCodigoInput;
export let filtroCategoriaSelect, filtroUnidadeSelect, inventoryTableBody, modalPreviewContagem, previewContagemTableContainer;
export let empresaDashboardTitle, empresaUserNameSpan, empresaUserRoleDisplaySpan;
export let btnGerarTXT, btnGerarPDF;

export function initializeDOMSelectors() {
    console.log("initializeDOMSelectors v3.1 called (from dom-selectors.js)");
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

    console.log("DOM Selectors initialization complete (from dom-selectors.js).");
}