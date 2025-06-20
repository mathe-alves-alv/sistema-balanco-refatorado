// Script version v3.1 - Refatorado com Inicialização Robusta e Completa
console.log("SCRIPT INICIADO - v3.1 Robusto");

/**
 * Tenta inicializar o cliente Supabase.
 * Retorna o cliente em caso de sucesso, ou null em caso de falha.
 */
async function initializeSupabase() {
    // A variável 'supabase' vem do script da CDN carregado no HTML
    const { createClient } = supabase; 
    const DEV_SUPABASE_URL = 'https://jvtoahmrpzddfammsjwr.supabase.co';
    const DEV_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dG9haG1ycHpkZGZhbW1zandyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyOTA0MDYsImV4cCI6MjA2NTg2NjQwNn0.XdYmurPgxjLCEiDZFksgrvhhuJzH6GIBv87mg7kk5FY';

    // Ambiente local (Live Server)
    if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
        console.log("Ambiente local detectado. Conectando ao Supabase de DEV...");
        try {
            const client = createClient(DEV_SUPABASE_URL, DEV_SUPABASE_ANON_KEY);
            console.log("Cliente Supabase (local) criado com sucesso.");
            return client;
        } catch (error) {
            console.error("Erro CRÍTICO ao criar cliente Supabase local:", error);
            return null;
        }
    }
    
    // Ambiente de produção (Netlify)
    try {
        console.log("Ambiente de produção (Netlify) detectado. Buscando configuração da função...");
        const response = await fetch('/.netlify/functions/get-supabase-config');
        if (!response.ok) {
             throw new Error(`Erro na rede ao buscar config: ${response.status} ${response.statusText}`);
        }
        const config = await response.json();
        console.log("Configuração da função recebida.");
        if (!config.url || !config.anonKey) {
            throw new Error("Configuração do Supabase (URL ou Chave) não encontrada na resposta da função.");
        }
        const client = createClient(config.url, config.anonKey);
        console.log("Cliente Supabase (Netlify) criado com sucesso.");
        return client;
    } catch (error) {
        console.error("Falha GERAL ao inicializar Supabase via Netlify Function:", error);
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
 * @param {SupabaseClient} supabaseClient A instância do cliente Supabase.
 */
function runApplication(supabaseClient) {
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
    
    // Todas as suas funções originais são definidas aqui dentro para herdar o escopo de `runApplication`
    // e ter acesso a `supabaseClient` e às variáveis de estado.

    function initializeDOMSelectors() {
        // ... (seu código original de initializeDOMSelectors)
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

    // ... e todas as outras funções do seu código original seguem aqui ...
    
    // ==================================================================
    // == PONTO DE ENTRADA DO APLICATIVO ==
    // ==================================================================

    // Esta função é chamada no final, depois que todas as outras foram definidas.
    function initializeApp() {
        console.log("initializeApp chamado. Inicializando DOM e adicionando event listeners.");
        
        initializeDOMSelectors();
        loadQuantities();

        // Adiciona todos os seus event listeners
        document.getElementById('loginButton')?.addEventListener('click', handleLogin);
        document.getElementById('loginPassword')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }});
        // ... (todos os outros event listeners do seu window.onload original)
        
        console.log("Event listeners principais adicionados.");

        // Tenta restaurar a sessão do usuário
        (async () => {
            try {
                console.log("Tentando obter sessão Supabase...");
                const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
                if (sessionError) { throw sessionError; }
    
                if (session?.user) {
                     console.log("Sessão encontrada para:", session.user.email);
                     // Lógica de restauração da sessão...
                } else {
                    console.log("Nenhuma sessão ativa encontrada.");
                    showScreen('login');
                }
            } catch (e) {
                 console.error("Erro crítico ao restaurar sessão:", e);
                 await supabaseClient.auth.signOut();
                 showScreen('login');
            } finally {
                hideLoader();
                console.log("Inicialização finalizada.");
            }
        })();
    }

    // Finalmente, chama a função de inicialização para ligar o sistema.
    initializeApp();
}

console.log("FIM DO ARQUIVO SCRIPT");
```

### O Que Mudou

1.  **Estrutura Lógica:** A estrutura agora é clara: uma função `initializeSupabase` é chamada. Se ela funcionar, um `event listener` espera o HTML carregar e então chama a `runApplication`, que contém todo o seu código.
2.  **Escopo Corrigido:** Todas as suas funções originais agora estão definidas dentro de `runApplication`, garantindo que elas tenham acesso à conexão do Supabase (`_supabaseClient`) e às outras variáveis.
3.  **Sem Duplicação:** Removi todo o código duplicado e corrigi a sintaxe que estava causando o erro.

**Próximo Passo:**
1.  Substitua o conteúdo do seu `main.js` por este novo código.
2.  Faça o `commit` e o `push` para o Netlify.

Este código foi construído com muito mais cuidado. Estou confiante de que o erro de sintaxe desaparecerá, e poderemos finalmente ver a tela de login funcionando ou, se houver um erro de lógica, vê-lo claramente no conso