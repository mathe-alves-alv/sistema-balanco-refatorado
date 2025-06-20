// Script version v3.1 - Refatorado com Inicialização Robusta
console.log("SCRIPT INICIADO - v3.1 Robusto");

// Variáveis globais movidas para o topo para referência
const DEV_SUPABASE_URL = 'https://jvtoahmrpzddfammsjwr.supabase.co';
const DEV_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2dG9haG1ycHpkZGZhbW1zandyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyOTA0MDYsImV4cCI6MjA2NTg2NjQwNn0.XdYmurPgxjLCEiDZFksgrvhhuJzH6GIBv87mg7kk5FY';

/**
 * Tenta inicializar o cliente Supabase.
 * Retorna o cliente em caso de sucesso, ou null em caso de falha.
 */
async function initializeSupabase() {
    const { createClient } = supabase;

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
        console.log("Configuração da função recebida:", config);
        
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


/**
 * Função principal que roda o aplicativo.
 * Só é chamada DEPOIS que o cliente Supabase é criado com sucesso.
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

    // Referências de elementos DOM
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


    // Suas funções originais vão aqui (initializeDOMSelectors, handleLogin, etc.)
    // A única mudança é que elas usarão a variável `supabaseClient` que foi passada como argumento.
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
    
    // ... TODAS AS SUAS OUTRAS FUNÇÕES (saveQuantities, handleLogin, etc.) VÃO AQUI ...
    // ... Elas usarão a variável `supabaseClient` em vez de `_supabaseClient` ...
    
    // Exemplo de como a função handleLogin ficaria:
    async function handleLogin() {
        console.log("handleLogin v3.1 Robusto chamada"); // Novo log
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
            // AQUI ESTÁ A MUDANÇA: usamos `supabaseClient` em vez de `_supabaseClient`
            const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
            
            // ... O resto da sua função handleLogin continua exatamente igual ...

        } catch (e) {
            // ...
        } finally {
            hideLoader();
        }
    }


    // Ponto de entrada do aplicativo, executado quando a página carrega
    window.onload = () => {
        console.log("window.onload disparado. Inicializando DOM e event listeners.");
        
        initializeDOMSelectors();
        showLoader();
        if (typeof loadQuantities === "function") loadQuantities();
        else console.error("CRITICAL: loadQuantities não está definida!");
    
        // Adiciona todos os seus event listeners aqui
        document.getElementById('loginButton')?.addEventListener('click', handleLogin);
        document.getElementById('loginPassword')?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }});
        
        // ... E todos os outros ...
        console.log("Event listeners principais adicionados.");
    
        // Tenta restaurar a sessão do usuário
        (async () => {
            try {
                console.log("Tentando obter sessão Supabase no onload...");
                // Usando `supabaseClient`
                const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
                if (sessionError) { throw sessionError; }
    
                if (session?.user) {
                     // ... O resto da sua lógica de restauração de sessão ...
                     console.log("Sessão encontrada e restaurada para:", session.user.email);
                } else {
                    console.log("Nenhuma sessão ativa encontrada.");
                    showScreen('login');
                }
            } catch (e) {
                 console.error("Erro crítico ao restaurar sessão no onload:", e);
                 showScreen('login');
            } finally {
                hideLoader();
                console.log("Inicialização (onload) finalizada.");
            }
        })();
    };

    console.log("Função runApplication finalizada.");
}

// ==================================================================
// PONTO DE ENTRADA PRINCIPAL DO SCRIPT
// ==================================================================
(async () => {
    const _supabaseClient = await initializeSupabase();

    if (_supabaseClient) {
        // Se o cliente foi criado com sucesso, executa o resto do aplicativo.
        runApplication(_supabaseClient);
    } else {
        // Se a inicialização falhou, uma mensagem de erro já foi exibida.
        console.error("A inicialização do Supabase falhou. O aplicativo não será executado.");
    }
})();

console.log("FIM DO ARQUIVO SCRIPT");

```

### Último Ajuste: `index.html`
Para que esta nova estrutura funcione, por favor, confirme que a tag `<script>` no seu `index.html` está com `type="module"` e `defer`. **Ambos são importantes.**

```html
<script src="js/main.js" type="module" defer></script>
```

---
Depois de substituir o `main.js` e garantir que a tag `<script>` está correta, faça um `git push` para o Netlify.

Quando o deploy terminar, abra o console do navegador e você verá uma sequência de logs muito mais detalhada, nos mostrando exatamente onde o processo está. Isso nos dará a pista final para resolver o problema de log