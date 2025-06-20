// js/contagens.js

import { showLoader, hideLoader, showScreen } from './ui-manager.js';
import { 
    inventoryCountBackButton, inventoryCountTitle, inventoryCountContext, adminContagemEmpresaSelectorContainer,
    adminContagemEmpresaSelect, selectColaboradorContagem, selectUnidadeContagem, pesquisaProdutoInput, pesquisaCodigoInput,
    filtroCategoriaSelect, filtroUnidadeSelect, inventoryTableBody, modalPreviewContagem, previewContagemTableContainer,
    btnGerarTXT, btnGerarPDF
} from './dom-selectors.js';
import { appState, setAdminSelectedEmpresaContextId } from './state.js'; // Importa o appState e seus setters
import { empresasCache, produtosCache, categoriasCache, unidadesCache, populateEmpresasSelect } from './data-cache.js';
import { loadQuantities, saveQuantities, updateExportButtonStates, triggerDownload, clearAllQuantities } from './utils.js'; // Importa funções úteis, incluindo clearAllQuantities
import { showAdminMasterDashboardScreen, showEmpresaDashboardScreen, handleLogout } from './auth.js';


// Variáveis de estado globais para a tela de contagem
export let quantidadesDigitadas = {}; // Manter como 'export' para ser acessível por utils.js

/**
 * Exibe a tela de contagem de estoque para o Admin Master.
 * Permite que o admin selecione uma empresa para realizar a contagem.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function showInventoryCountScreen_AdminGlobal(_supabaseClient) {
    if (!appState.currentUser || appState.currentUser?.role !== 'admin_master') {
        alert("Acesso negado. Apenas Admin Master pode iniciar contagens globalmente.");
        showScreen('login', {}, appState.currentUser); // Fallback seguro
        return;
    }
    console.log("showInventoryCountScreen_AdminGlobal called");
    showLoader();
    try {
        // Reinicia as quantidades salvas do localStorage ao entrar na tela de contagem
        clearAllQuantities(); // Importado de utils.js

        if(adminContagemEmpresaSelectorContainer) adminContagemEmpresaSelectorContainer.style.display = 'block';
        
        await populateEmpresasSelect(_supabaseClient, adminContagemEmpresaSelect, true, "-- Selecione uma Empresa --", "");
        if(adminContagemEmpresaSelect) adminContagemEmpresaSelect.value = ""; // Garante que nenhum valor esteja selecionado inicialmente

        // Adiciona/garante que o event listener esteja anexado uma única vez
        if (adminContagemEmpresaSelect && !adminContagemEmpresaSelect.onchangeAttached_count_admin) {
            adminContagemEmpresaSelect.addEventListener('change', async () => {
                const newEmpresaId = adminContagemEmpresaSelect.value === "" ? null : adminContagemEmpresaSelect.value;
                setAdminSelectedEmpresaContextId(newEmpresaId); // Atualiza o contexto global de admin
                const selectedEmpresa = empresasCache.find(e => e.id === newEmpresaId);
                if(inventoryCountContext) inventoryCountContext.textContent = selectedEmpresa ? `Realizando contagem para: ${selectedEmpresa.nome_empresa}` : "Nenhuma empresa selecionada";

                // Limpa os filtros e inputs de quantidade ao mudar de empresa
                if(pesquisaProdutoInput) pesquisaProdutoInput.value = '';
                if(pesquisaCodigoInput) pesquisaCodigoInput.value = '';
                if(filtroCategoriaSelect) filtroCategoriaSelect.value = '';
                if(filtroUnidadeSelect) filtroUnidadeSelect.value = '';
                clearAllQuantities(); // Limpa quantidades salvas

                if (newEmpresaId) {
                    await loadColaboradoresParaContagem(_supabaseClient, newEmpresaId, true); // Popula colaboradores
                    await loadUnidadesParaContagem(_supabaseClient, newEmpresaId); // Popula unidades
                    await loadProductsForInventory(_supabaseClient, newEmpresaId); // Busca produtos
                    await populateCategoryFilter(); // Popula filtro de categoria (usa categoriasCache)
                    await populateUnitFilter(); // Popula filtro de unidade (usa unidadesCache)
                } else {
                    if(selectColaboradorContagem) selectColaboradorContagem.innerHTML = '<option value="">-- Selecione Empresa Primeiro --</option>';
                    if(selectUnidadeContagem) selectUnidadeContagem.innerHTML = '<option value="">-- Selecione Empresa Primeiro --</option>';
                    produtosCache.splice(0, produtosCache.length); // Limpa o cache de produtos
                    categoriasCache.splice(0, categoriasCache.length); // Limpa o cache de categorias
                    unidadesCache.splice(0, unidadesCache.length); // Limpa o cache de unidades
                }
                displayInventoryProducts(produtosCache); // Renderiza a tabela (filtrada ou vazia)
                updateExportButtonStates(); // Atualiza estado dos botões
            });
            adminContagemEmpresaSelect.onchangeAttached_count_admin = true;
        }
        // Não faz o fetch inicial aqui, pois não há empresa selecionada por padrão
        showScreen('inventoryCount', { title: 'Balanço de Estoque (Admin)', context: 'Selecione uma empresa para realizar a contagem.', showEmpresaSelector: true }, appState.currentUser);

    } catch (e) {
        console.error("Erro em showInventoryCountScreen_AdminGlobal:", e);
        alert("Erro ao carregar tela de contagem admin.");
    } finally {
        hideLoader();
    }
}

/**
 * Exibe a tela de contagem de estoque para um Gerente ou Contador de Empresa.
 * O usuário só pode realizar a contagem para sua própria empresa.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function showInventoryCountScreen_Empresa(_supabaseClient) {
    if (!appState.currentUser || !(appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_counter' || appState.currentUser.role === 'empresa_login_principal')) {
        alert("Acesso negado à contagem de estoque.");
        // Gerentes e log_principais voltam para o dashboard, contadores para o login (conforme lógica do main.js original)
        if(appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen(appState.currentUser);
        else handleLogout(_supabaseClient); // Passa _supabaseClient
        return;
    }
    if (!appState.currentUser.empresa_id) {
        console.error("ID da empresa do usuário não encontrada para contagem.");
        alert("Erro: ID da sua empresa não encontrado. Tente relogar.");
        showScreen('login', {}, appState.currentUser); // Fallback para login
        return;
    }
    console.log("showInventoryCountScreen_Empresa called for role:", appState.currentUser.role);
    showLoader();
    try {
        // Reinicia as quantidades salvas do localStorage ao entrar na tela de contagem
        clearAllQuantities(); // Importado de utils.js

        if(adminContagemEmpresaSelectorContainer) adminContagemEmpresaSelectorContainer.style.display = 'none'; // Esconde o seletor de empresa
        setAdminSelectedEmpresaContextId(appState.currentUser.empresa_id); // Define o contexto da empresa para a empresa do usuário

        const empresaNomeContext = appState.currentUser.empresa_nome || 'Sua Empresa';
        if(inventoryCountTitle) inventoryCountTitle.textContent = `Balanço de Estoque (${empresaNomeContext})`;
        if(inventoryCountContext) inventoryCountContext.textContent = `Contagem para ${empresaNomeContext}`;

        // Limpa os filtros e inputs de quantidade
        if(pesquisaProdutoInput) pesquisaProdutoInput.value = '';
        if(pesquisaCodigoInput) pesquisaCodigoInput.value = '';
        if(filtroCategoriaSelect) filtroCategoriaSelect.value = '';
        if(filtroUnidadeSelect) filtroUnidadeSelect.value = '';

        await loadColaboradoresParaContagem(_supabaseClient, appState.currentUser.empresa_id, false);
        await loadUnidadesParaContagem(_supabaseClient, appState.currentUser.empresa_id);
        await loadProductsForInventory(_supabaseClient, appState.currentUser.empresa_id);
        await populateCategoryFilter();
        await populateUnitFilter();
        displayInventoryProducts(produtosCache); // Renderiza os produtos

        showScreen('inventoryCount', { title: inventoryCountTitle.textContent, context: inventoryCountContext.textContent, showEmpresaSelector: false }, appState.currentUser);

    } catch (e) {
        console.error("Erro em showInventoryCountScreen_Empresa:", e);
        alert("Erro ao carregar tela de contagem da empresa.");
    } finally {
        hideLoader();
    }
}


/**
 * Carrega os colaboradores ativos de uma empresa para o seletor de contagem.
 * Inclui o usuário logado se ele for um admin_master, empresa_manager, empresa_counter ou empresa_login_principal.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaId O ID da empresa para buscar colaboradores.
 * @param {boolean} isAdminAlsoCounter Se o admin também deve ser uma opção de colaborador.
 */
async function loadColaboradoresParaContagem(_supabaseClient, empresaId, isAdminAlsoCounter = false) {
    if (!selectColaboradorContagem) { console.warn("Seletor de colaborador para contagem não encontrado."); return; }
    selectColaboradorContagem.innerHTML = '<option value="">-- Selecione Colaborador --</option>'; // Opção padrão
    
    if (!empresaId) {
        selectColaboradorContagem.innerHTML = '<option value="">-- Selecione Empresa Primeiro --</option>';
        return;
    }
    showLoader();
    try {
        let colaboradoresParaSelect = [];
        const { data, error } = await _supabaseClient.from('colaboradores')
            .select('id, nome_colaborador')
            .eq('empresa_id', empresaId)
            .eq('ativo', true) // Apenas colaboradores ativos
            .order('nome_colaborador');
        if (error) throw error;
        colaboradoresParaSelect = data || [];

        // Adiciona o usuário logado como uma opção de colaborador se aplicável
        if (appState.currentUser?.role === 'admin_master' && isAdminAlsoCounter) {
            colaboradoresParaSelect.unshift({id: `admin_${appState.currentUser.id}`, nome_colaborador: `${appState.currentUser.full_name || appState.currentUser.email} (Admin)`});
        } else if ((appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_counter' || appState.currentUser?.role === 'empresa_login_principal')) {
            const loggedInUserName = appState.currentUser.full_name || appState.currentUser.email;
            // Evita duplicatas se o nome do colaborador logado já existir na lista de colaboradores cadastrados
            if (!colaboradoresParaSelect.some(c => c.nome_colaborador === loggedInUserName && !c.id.startsWith('user_'))) {
                colaboradoresParaSelect.unshift({id: `user_${appState.currentUser.id}`, nome_colaborador: `${loggedInUserName} (Usuário Logado)`});
            }
        }

        if (colaboradoresParaSelect.length > 0) {
            colaboradoresParaSelect.forEach(colab => {
                const option = document.createElement('option');
                option.value = colab.id;
                option.textContent = colab.nome_colaborador;
                selectColaboradorContagem.appendChild(option);
            });
            // Tenta pré-selecionar o usuário logado
            if ((appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_counter' || appState.currentUser?.role === 'empresa_login_principal')) {
                const loggedInUserOption = Array.from(selectColaboradorContagem.options).find(opt => opt.value === `user_${appState.currentUser.id}`);
                if (loggedInUserOption) loggedInUserOption.selected = true;
            } else if (appState.currentUser?.role === 'admin_master' && isAdminAlsoCounter) {
                const adminOption = Array.from(selectColaboradorContagem.options).find(opt => opt.value === `admin_${appState.currentUser.id}`);
                if (adminOption) adminOption.selected = true;
            }
        } else {
            selectColaboradorContagem.innerHTML = '<option value="">Nenhum colaborador ativo encontrado para esta empresa</option>';
        }
    } catch (e) {
        console.error("Erro ao carregar colaboradores para contagem:", e);
        selectColaboradorContagem.innerHTML = '<option value="">Erro ao carregar</option>';
    } finally {
        hideLoader();
    }
}

/**
 * Carrega as unidades de uma empresa para o seletor de contagem.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaId O ID da empresa para buscar unidades.
 */
async function loadUnidadesParaContagem(_supabaseClient, empresaId) {
    if (!selectUnidadeContagem) { console.warn("Seletor de unidade para contagem não encontrado."); return; }
    selectUnidadeContagem.innerHTML = '<option value="">-- Selecione Unidade --</option>'; // Opção padrão

    if (!empresaId) {
        selectUnidadeContagem.innerHTML = '<option value="">-- Selecione Empresa Primeiro --</option>';
        return;
    }
    showLoader();
    try {
        const { data, error } = await _supabaseClient.from('unidades')
            .select('id, nome_unidade')
            .eq('empresa_id', empresaId)
            .order('nome_unidade');

        if (error) throw error;
        unidadesCache.splice(0, unidadesCache.length, ...(data || [])); // Garante que unidadesCache esteja populado

        if (unidadesCache.length > 0) {
            unidadesCache.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit.id;
                option.textContent = unit.nome_unidade;
                selectUnidadeContagem.appendChild(option);
            });
            // Pré-seleciona a primeira unidade por padrão, se houver
            selectUnidadeContagem.value = unidadesCache[0].id;
        } else {
            selectUnidadeContagem.innerHTML = '<option value="">Nenhuma unidade cadastrada para esta empresa</option>';
        }
    } catch (e) {
        console.error("Erro ao carregar unidades para contagem:", e);
        selectUnidadeContagem.innerHTML = '<option value="">Erro ao carregar</option>';
    } finally {
        hideLoader();
    }
}

/**
 * Carrega produtos para a tela de inventário, incluindo categorias e unidades.
 * Atualiza `produtosCache`, `categoriasCache` e `unidadesCache` globais.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaIdContexto O ID da empresa para buscar produtos.
 */
async function loadProductsForInventory(_supabaseClient, empresaIdContexto) {
    showLoader();
    if (!empresaIdContexto) {
        console.warn("loadProductsForInventory: empresaIdContexto é nulo/vazio. Limpando caches.");
        produtosCache.splice(0, produtosCache.length);
        categoriasCache.splice(0, categoriasCache.length);
        unidadesCache.splice(0, unidadesCache.length);
        hideLoader();
        return;
    }
    try {
        // Chama a RPC para obter produtos com suas categorias e unidades
        const { data: productsData, error: productsError } = await _supabaseClient.rpc('get_produtos_com_categorias_e_unidades', {
            p_empresa_id: empresaIdContexto
        });
        if (productsError) throw productsError;
        produtosCache.splice(0, produtosCache.length, ...(productsData || []));
        console.log(`Products loaded for inventory (CID: ${empresaIdContexto}): ${produtosCache.length}`);

        // Reconstroi os caches de categorias e unidades a partir dos produtos carregados
        // para garantir que os filtros mostrem apenas categorias/unidades relevantes aos produtos existentes.
        const uniqueCategories = new Map();
        const uniqueUnidades = new Map();

        produtosCache.forEach(p => {
            (p.produtos_categorias || []).forEach(pc => {
                if (!uniqueCategories.has(pc.categoria_id)) {
                    uniqueCategories.set(pc.categoria_id, { id: pc.categoria_id, nome_categoria: pc.nome_categoria, empresa_id: empresaIdContexto });
                }
            });
            (p.produtos_unidades || []).forEach(pu => {
                if (!uniqueUnidades.has(pu.unidade_id)) {
                    uniqueUnidades.set(pu.unidade_id, { id: pu.unidade_id, nome_unidade: pu.nome_unidade, empresa_id: empresaIdContexto });
                }
            });
        });

        categoriasCache.splice(0, categoriasCache.length, ...Array.from(uniqueCategories.values()).sort((a, b) => a.nome_categoria.localeCompare(b.nome_categoria)));
        unidadesCache.splice(0, unidadesCache.length, ...Array.from(uniqueUnidades.values()).sort((a, b) => a.nome_unidade.localeCompare(b.nome_unidade)));

        console.log(`Categories cache updated after inventory product fetch: ${categoriasCache.length}`);
        console.log(`Units cache updated after inventory product fetch: ${unidadesCache.length}`);

    } catch (e) {
        console.error("Erro ao carregar produtos/categorias/unidades para contagem:", e);
        produtosCache.splice(0, produtosCache.length);
        categoriasCache.splice(0, categoriasCache.length);
        unidadesCache.splice(0, unidadesCache.length);
        alert(`Erro ao carregar produtos para contagem: ${e.message}`);
    } finally {
        hideLoader();
    }
}


/**
 * Popula o filtro de categorias na tela de contagem.
 * @param {string} [selectElementId='filtroCategoria'] O ID do elemento select.
 */
async function populateCategoryFilter(selectElementId = 'filtroCategoria') {
    const filterSelect = filtroCategoriaSelect;
    if (!filterSelect) { console.warn(`Category filter select '${selectElementId}' not found.`); return; }

    const currentFilterValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="">Todas as Categorias</option>';

    let relevantEmpresaId = null;
    if (appState.currentUser.role === 'admin_master') {
        relevantEmpresaId = appState.adminSelectedEmpresaContextId;
    } else if (appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_counter' || appState.currentUser.role === 'empresa_login_principal') {
        relevantEmpresaId = appState.currentUser.empresa_id;
    }

    if (!relevantEmpresaId) {
        filterSelect.innerHTML = '<option value="">-- Selecione Empresa Primeiro --</option>';
        return;
    }
    
    // Filtra as categorias do cache que pertencem à empresa relevante
    const categoriesForFilter = categoriasCache.filter(c => c.empresa_id === relevantEmpresaId);

    const uniqueCategories = new Map();
    categoriesForFilter.forEach(cat => {
        if (cat.id && cat.nome_categoria) {
            if (!uniqueCategories.has(cat.id)) {
                uniqueCategories.set(cat.id, cat.nome_categoria);
            }
        }
    });

    // Adiciona opção "Sem Categoria" se houver produtos sem categoria associada na lista atual
    if (produtosCache.filter(p => p.empresa_id === relevantEmpresaId).some(p => !(p.produtos_categorias && p.produtos_categorias.length > 0))) {
        if (!uniqueCategories.has("NO_CATEGORY_ID_FILTER_VAL")) {
            uniqueCategories.set("NO_CATEGORY_ID_FILTER_VAL", "Sem Categoria");
        }
    }

    const sortedCategories = Array.from(uniqueCategories.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    sortedCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id === "NO_CATEGORY_ID_FILTER_VAL" ? "SEM_CATEGORIA_FILTER" : cat.id;
        option.textContent = cat.name;
        filterSelect.appendChild(option);
    });

    if (Array.from(filterSelect.options).some(opt => opt.value === currentFilterValue)) {
        filterSelect.value = currentFilterValue;
    } else {
        filterSelect.value = "";
    }
}


/**
 * Popula o filtro de unidades na tela de contagem.
 * @param {string} [selectElementId='filtroUnidade'] O ID do elemento select.
 */
async function populateUnitFilter(selectElementId = 'filtroUnidade') {
    const filterSelect = filtroUnidadeSelect;
    if (!filterSelect) { console.warn(`Unit filter select '${selectElementId}' not found.`); return; }

    const currentFilterValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="">Todas as Unidades</option>';

    let relevantEmpresaId = null;
    if (appState.currentUser.role === 'admin_master') {
        relevantEmpresaId = appState.adminSelectedEmpresaContextId;
    } else if (appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_counter' || appState.currentUser.role === 'empresa_login_principal') {
        relevantEmpresaId = appState.currentUser.empresa_id;
    }

    if (!relevantEmpresaId) {
        filterSelect.innerHTML = '<option value="">-- Selecione Empresa Primeiro --</option>';
        return;
    }

    // Filtra as unidades do cache que pertencem à empresa relevante
    const unitsForFilter = unidadesCache.filter(u => u.empresa_id === relevantEmpresaId);
    
    const uniqueUnits = new Map();
    unitsForFilter.forEach(unit => {
        if (unit.id && unit.nome_unidade) {
            if (!uniqueUnits.has(unit.id)) {
                uniqueUnits.set(unit.id, unit.nome_unidade);
            }
        }
    });

    const sortedUnits = Array.from(uniqueUnits.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    sortedUnits.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.id;
        option.textContent = unit.name;
        filterSelect.appendChild(option);
    });

    if (Array.from(filterSelect.options).some(opt => opt.value === currentFilterValue)) {
        filterSelect.value = currentFilterValue;
    } else {
        filterSelect.value = "";
    }
}


/**
 * Renderiza a lista de produtos na tabela de inventário, aplicando filtros se houver.
 * @param {Array} listaProdutos A lista de produtos a ser exibida.
 */
export function displayInventoryProducts(listaProdutos) {
    if (!inventoryTableBody) { console.error("inventoryTableBody not found"); return; }
    inventoryTableBody.innerHTML = "";
    loadQuantities(); // Recarrega quantidades salvas ao renderizar produtos

    if (!listaProdutos || listaProdutos.length === 0) {
        inventoryTableBody.innerHTML = `<tr><td colspan="5">Nenhum produto para exibir. ${appState.currentUser.role === 'admin_master' && !adminContagemEmpresaSelect.value ? 'Selecione uma empresa para carregar produtos.' : 'Verifique os filtros ou cadastre produtos para esta empresa.'}</td></tr>`;
        updateExportButtonStates();
        return;
    }

    listaProdutos.forEach(produto => {
        const row = inventoryTableBody.insertRow();
        row.insertCell().textContent = produto.codigo;
        row.insertCell().textContent = produto.nome_produto;

        // Categorias (vindo da RPC)
        const categoriesDisplay = (produto.produtos_categorias || [])
            .map(pc => pc.nome_categoria)
            .filter(Boolean).join(', ') || 'Sem Categoria';
        row.insertCell().textContent = categoriesDisplay;
        
        // Quantidade input e controles
        const qtdCell = row.insertCell();
        const qtdInput = document.createElement('input');
        qtdInput.type = 'number';
        qtdInput.min = '0';
        qtdInput.className = 'form-control quantidade-input'; // Adiciona classe para fácil seleção
        qtdInput.id = `quantidade-${produto.id}`; // Adiciona ID único
        qtdInput.dataset.produtoId = produto.id; // Para fácil acesso ao ID do produto
        qtdInput.value = quantidadesDigitadas[produto.id] || '';

        const handleQtyChangeOrInput = (e) => {
            const valStr = e.target.value.trim();
            if (valStr === '') {
                delete quantidadesDigitadas[produto.id];
            } else {
                const valNum = parseFloat(valStr);
                if (!isNaN(valNum) && valNum >= 0) {
                    quantidadesDigitadas[produto.id] = valNum;
                } else if (!isNaN(valNum) && valNum < 0 && e.type === 'change') {
                    // Se for um número negativo e o evento for 'change', limpa o campo
                    delete quantidadesDigitadas[produto.id];
                    e.target.value = '';
                }
            }
            if (e.type === 'change') saveQuantities(); // Salva no localStorage apenas no evento 'change'
            updateExportButtonStates(); // Atualiza estado dos botões de exportação
        };

        qtdInput.addEventListener('change', handleQtyChangeOrInput);
        qtdInput.addEventListener('input', handleQtyChangeOrInput); // Para reativar o botão assim que algo é digitado
        qtdInput.addEventListener('focus', (e) => e.target.select()); // Seleciona o texto ao focar

        qtdCell.appendChild(qtdInput);

        // Botões de +/-
        const controlsCell = row.insertCell();
        const btnMinus = document.createElement('button');
        btnMinus.textContent = '-';
        btnMinus.className = 'btn btn-secondary btn-sm me-1'; // Adicionado me-1 para margem
        btnMinus.onclick = () => {
            let currentVal = parseInt(qtdInput.value) || 0;
            if (currentVal > 0) {
                qtdInput.value = currentVal - 1;
                qtdInput.dispatchEvent(new Event('input')); // Dispara evento para atualizar quantidadesDigitadas e estado dos botões
            }
        };
        controlsCell.appendChild(btnMinus);

        const btnPlus = document.createElement('button');
        btnPlus.textContent = '+';
        btnPlus.className = 'btn btn-secondary btn-sm';
        btnPlus.onclick = () => {
            let currentVal = parseInt(qtdInput.value) || 0;
            qtdInput.value = currentVal + 1;
            qtdInput.dispatchEvent(new Event('input')); // Dispara evento para atualizar quantidadesDigitadas e estado dos botões
        };
        controlsCell.appendChild(btnPlus);
    });
    updateExportButtonStates(); // Garante que o estado dos botões seja atualizado após renderizar a tabela
}

/**
 * Filtra os produtos da lista de inventário com base nos critérios de pesquisa e filtros.
 */
export function filterInventoryProducts() {
    const searchTermProduct = pesquisaProdutoInput.value.toLowerCase();
    const searchTermCodigo = pesquisaCodigoInput.value.toLowerCase();
    const filterCategoriaId = filtroCategoriaSelect.value;
    const filterUnidadeId = filtroUnidadeSelect.value; // Novo filtro de unidade

    const produtosFiltrados = produtosCache.filter(produto => {
        const matchesProduct = produto.nome_produto.toLowerCase().includes(searchTermProduct);
        const matchesCodigo = produto.codigo.toLowerCase().includes(searchTermCodigo);

        let matchCategoria = true;
        if (filterCategoriaId) {
            if (filterCategoriaId === "SEM_CATEGORIA_FILTER") {
                matchCategoria = !(produto.produtos_categorias && produto.produtos_categorias.length > 0);
            } else {
                matchCategoria = (produto.produtos_categorias || []).some(pc => pc.categoria_id === filterCategoriaId);
            }
        }

        let matchUnidade = true;
        if (filterUnidadeId) {
            matchUnidade = (produto.produtos_unidades || []).some(pu => pu.unidade_id === filterUnidadeId);
        }

        return matchesProduct && matchesCodigo && matchCategoria && matchUnidade;
    });
    displayInventoryProducts(produtosFiltrados);
}

/**
 * Limpa todas as quantidades digitadas e o localStorage.
 */
// A função clearAllQuantities foi movida para utils.js e importada de lá.
// Esta função não deve mais existir aqui ou deve ser uma wrapper.
// Removi o conteúdo, mas mantive o export para não quebrar a importação em main.js por enquanto.
// Idealmente, a chamada em main.js deveria ser para a clearAllQuantities de utils.js.

// Esta função não precisa ser exportada de contagens.js se main.js a importa de utils.js
// Mas vou manter o export por enquanto para evitar quebras se houver outras dependências.
/*
export function clearAllQuantities() {
    // Conteúdo movido para utils.js
}
*/


/**
 * Exibe o modal de pré-visualização da contagem.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export function showPreviewContagem(_supabaseClient) {
    if (!modalPreviewContagem || !previewContagemTableContainer) {
        console.error("Preview modal or table container not found."); return;
    }
    const tableBody = previewContagemTableContainer.querySelector('tbody');
    if (!tableBody) { console.error("Preview table body not found."); return; }

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

    tableBody.innerHTML = ''; // Limpa o conteúdo anterior
    
    // Filtra apenas os produtos que estão visíveis na tabela e que possuem quantidade > 0
    const produtosContados = produtosCache
        .filter(p => {
            const inputElement = inventoryTableBody.querySelector(`input[data-produto-id="${p.id}"]`);
            return inputElement && quantidadesDigitadas[p.id] !== undefined && parseFloat(quantidadesDigitadas[p.id]) > 0;
        })
        .map(p => ({
            ...p,
            quantidade_digitada: parseFloat(quantidadesDigitadas[p.id])
        }));

    if (produtosContados.length === 0) {
        alert("Nenhum item com quantidade maior que zero para pré-visualizar. Preencha as quantidades e tente novamente.");
        return;
    }
    
    produtosContados.sort((a,b) => (a.nome_produto || "").localeCompare(b.nome_produto || "")).forEach(produto => {
        const row = tableBody.insertRow();
        row.insertCell().textContent = produto.codigo;
        row.insertCell().textContent = produto.nome_produto;
        // Categorias (vindos da RPC)
        const categoriesDisplay = (produto.produtos_categorias || [])
            .map(pc => pc.nome_categoria)
            .filter(Boolean).join(', ') || 'Sem Categoria';
        row.insertCell().textContent = categoriesDisplay;
        // Unidades (vindos da RPC)
        const unitsDisplay = (produto.produtos_unidades || [])
            .map(pu => pu.nome_unidade)
            .filter(Boolean).join(', ') || 'Todas / Nenhuma Específica';
        row.insertCell().textContent = unitsDisplay;
        
        const qtdCell = row.insertCell();
        qtdCell.style.textAlign = 'right';
        qtdCell.textContent = produto.quantidade_digitada;
    });

    // Inserir informações de cabeçalho no modal
    let h4 = modalPreviewContagem.querySelector('h4') || document.createElement('h4');
    h4.textContent = 'Resumo da Contagem';
    if (!modalPreviewContagem.contains(h4)) previewContagemTableContainer.insertAdjacentElement('afterbegin', h4);

    let pColaborador = modalPreviewContagem.querySelector('#previewColaboradorInfo') || document.createElement('p');
    pColaborador.id = 'previewColaboradorInfo';
    pColaborador.innerHTML = `<strong>Colaborador:</strong> ${selectColaboradorContagem.options[selectColaboradorContagem.selectedIndex].text}`;
    if (!modalPreviewContagem.contains(pColaborador)) previewContagemTableContainer.insertAdjacentElement('afterbegin', pColaborador);

    let pUnidade = modalPreviewContagem.querySelector('#previewUnidadeInfo') || document.createElement('p');
    pUnidade.id = 'previewUnidadeInfo';
    pUnidade.innerHTML = `<strong>Unidade:</strong> ${selectUnidadeContagem.options[selectUnidadeContagem.selectedIndex].text}`;
    if (!modalPreviewContagem.contains(pUnidade)) pColaborador.insertAdjacentElement('afterend', pUnidade); // Insere depois do pColaborador

    let hr = modalPreviewContagem.querySelector('hr') || document.createElement('hr');
    if (!modalPreviewContagem.contains(hr)) pUnidade.insertAdjacentElement('afterend', hr);

    let h5 = modalPreviewContagem.querySelector('h5') || document.createElement('h5');
    h5.textContent = `Itens Contados (${produtosContados.length} itens):`;
    if (!modalPreviewContagem.contains(h5)) hr.insertAdjacentElement('afterend', h5);


    // Adiciona o botão de salvar diretamente no modal (já existe no HTML mas o listener precisa ser anexado)
    let btnSalvarContagem = document.getElementById('btnSalvarContagem');
    if (!btnSalvarContagem) {
        const modalActionsDiv = modalPreviewContagem.querySelector('.modal-actions');
        if (modalActionsDiv) {
            btnSalvarContagem = document.createElement('button');
            btnSalvarContagem.id = 'btnSalvarContagem';
            btnSalvarContagem.className = 'btn btn-success';
            btnSalvarContagem.textContent = 'Salvar Contagem';
            modalActionsDiv.insertBefore(btnSalvarContagem, modalActionsDiv.querySelector('#btnClosePreviewModal'));
        }
    }
    if (btnSalvarContagem && !btnSalvarContagem.listenerAttached) {
        btnSalvarContagem.addEventListener('click', () => handleSaveContagem(_supabaseClient, colaboradorId, unidadeId, produtosContados));
        btnSalvarContagem.listenerAttached = true;
    }

    modalPreviewContagem.classList.add('active'); // Exibe o modal
}


/**
 * Fecha o modal de pré-visualização da contagem.
 */
export function closeModalPreviewContagem() {
    if (modalPreviewContagem) {
        modalPreviewContagem.classList.remove('active');
        const headerElements = modalPreviewContagem.querySelectorAll('h4, p#previewColaboradorInfo, p#previewUnidadeInfo, hr, h5');
        headerElements.forEach(el => {
            if (previewContagemTableContainer.contains(el)) { 
                el.parentNode.removeChild(el); 
            }
        });
        const btnSalvar = document.getElementById('btnSalvarContagem');
        if (btnSalvar && btnSalvar.parentNode) {
            btnSalvar.parentNode.removeChild(btnSalvar);
        }
        const tableBody = modalPreviewContagem.querySelector('#previewContagemTable tbody');
        if (tableBody) tableBody.innerHTML = '';
    }
}


/**
 * Lida com o salvamento da contagem no banco de dados.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} colaboradorId ID do colaborador que realizou a contagem.
 * @param {string} unidadeId ID da unidade onde a contagem foi realizada.
 * @param {Array<Object>} itensContados Array de objetos de produtos contados.
 */
export async function handleSaveContagem(_supabaseClient, colaboradorId, unidadeId, itensContados) { // Adicionado export
    showLoader();
    closeModalPreviewContagem(); // Fecha o modal de pré-visualização

    try {
        const empresaId = appState.currentUser?.empresa_id || appState.adminSelectedEmpresaContextId;
        if (!empresaId) {
            throw new Error("ID da empresa não disponível para salvar contagem.");
        }

        // 1. Inserir o registro da contagem principal na tabela 'contagens'
        const { data: contagemData, error: contagemError } = await _supabaseClient
            .from('contagens')
            .insert([{
                empresa_id: empresaId,
                colaborador_id: colaboradorId.startsWith('admin_') || colaboradorId.startsWith('user_') ? null : colaboradorId, // Não salva IDs temporários
                colaborador_nome_display: selectColaboradorContagem.options[selectColaboradorContagem.selectedIndex].text, // Salva o nome de exibição
                unidade_id: unidadeId,
                unidade_nome_display: selectUnidadeContagem.options[selectUnidadeContagem.selectedIndex].text, // Salva o nome de exibição
                data_contagem: new Date().toISOString(),
                total_itens: itensContados.length // Adiciona total de itens para facilitar a consulta
            }])
            .select()
            .single();

        if (contagemError) throw contagemError;

        const novaContagemId = contagemData.id;

        // 2. Preparar e inserir os itens detalhados na tabela 'contagem_itens_por_produto'
        const itensParaInserir = itensContados.map(item => ({
            contagem_id: novaContagemId,
            produto_id: item.id, // Usa o ID real do produto
            quantidade_contada: item.quantidade_digitada
        }));

        const { error: itensError } = await _supabaseClient
            .from('contagem_itens_por_produto')
            .insert(itensParaInserir);

        if (itensError) throw itensError;

        alert("Contagem salva com sucesso!");
        clearAllQuantities(); // Limpa as quantidades do localStorage e dos inputs
        await loadProductsForInventory(_supabaseClient, empresaId); // Recarrega/re-renderiza produtos (limpa a tela de contagem)

    } catch (e) {
        console.error("Erro ao salvar contagem:", e);
        alert(`Erro ao salvar contagem: ${e.message}`);
    } finally {
        hideLoader();
    }
}

/**
 * Gera um arquivo TXT com o resumo da contagem.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function gerarArquivoTXT(_supabaseClient) {
    const produtosContadosComQtdMaiorZero = produtosCache.filter(p => {
        const inputElement = inventoryTableBody.querySelector(`input[data-produto-id="${p.id}"]`);
        return inputElement && quantidadesDigitadas[p.id] !== undefined && parseFloat(quantidadesDigitadas[p.id]) > 0;
    }).map(p => ({
        produto_id: p.id,
        codigo: p.codigo,
        nome_produto: p.nome_produto,
        quantidade: parseFloat(quantidadesDigitadas[p.id]),
        categorias: (p.produtos_categorias || []).map(pc => pc.nome_categoria).filter(Boolean).join(', ') || "Sem Categoria",
        unidades: (p.produtos_unidades || []).map(pu => pu.nome_unidade).filter(Boolean).join(', ') || "Todas / Nenhuma Específica"
    }));

    if (produtosContadosComQtdMaiorZero.length === 0) {
        alert("Nenhum item com quantidade maior que zero para incluir no arquivo TXT ou salvar histórico. Preencha as quantidades e tente novamente.");
        return;
    }

    const colaboradorNome = selectColaboradorContagem.options[selectColaboradorContagem.selectedIndex].text;
    const unidadeNome = selectUnidadeContagem.options[selectUnidadeContagem.selectedIndex].text;
    const dataContagem = new Date().toLocaleString('pt-BR');
    const empresaNome = appState.currentUser?.empresa_nome || (empresasCache.find(e => e.id === appState.adminSelectedEmpresaContextId)?.nome_empresa) || 'N/A'; // Usar appState.adminSelectedEmpresaContextId

    let content = `BALANÇO DE ESTOQUE\n`;
    content += `Empresa: ${empresaNome}\n`;
    content += `Unidade: ${unidadeNome}\n`;
    content += `Colaborador: ${colaboradorNome}\n`;
    content += `Data da Contagem: ${dataContagem}\n\n`;
    content += `--------------------------------------------------\n`;
    content += `CÓDIGO      PRODUTO                         QUANTIDADE\n`;
    content += `--------------------------------------------------\n`;

    // Ordena por nome do produto para o arquivo
    produtosContadosComQtdMaiorZero.sort((a, b) => a.nome_produto.localeCompare(b.nome_produto)).forEach(item => {
        const codigoPad = item.codigo.padEnd(10).substring(0, 10);
        const nomePad = item.nome_produto.padEnd(30).substring(0, 30);
        const quantidadePad = item.quantidade.toString().padStart(10);
        content += `${codigoPad}  ${nomePad}  ${quantidadePad}\n`;
    });

    content += `--------------------------------------------------\n`;
    content += `Total de Itens Contados: ${produtosContadosComQtdMaiorZero.length}\n`;

    const dataAtual = new Date();
    const nomeArquivo = `contagem_estoque_${dataAtual.getFullYear()}${String(dataAtual.getMonth() + 1).padStart(2, '0')}${String(dataAtual.getDate()).padStart(2, '0')}_${String(dataAtual.getHours()).padStart(2, '0')}${String(dataAtual.getMinutes()).padStart(2, '0')}_${unidadeNome.replace(/[^a-zA-Z0-9]/g, '')}.txt`;

    showLoader();
    try {
        // Salva a contagem no histórico (similar ao handleSaveContagem)
        const empresaId = appState.currentUser?.empresa_id || appState.adminSelectedEmpresaContextId;
        if (!empresaId) {
            throw new Error("ID da empresa não disponível para salvar histórico.");
        }

        const { data: contagemData, error: contagemError } = await _supabaseClient
            .from('contagens')
            .insert([{
                empresa_id: empresaId,
                colaborador_id: colaboradorId.startsWith('admin_') || colaboradorId.startsWith('user_') ? null : colaboradorId,
                colaborador_nome_display: colaboradorNome,
                unidade_id: unidadeId,
                unidade_nome_display: unidadeNome,
                data_contagem: new Date().toISOString(),
                total_itens: produtosContadosComQtdMaiorZero.length
            }])
            .select()
            .single();

        if (contagemError) throw contagemError;

        const novaContagemId = contagemData.id;

        const itensParaHistorico = produtosContadosComQtdMaiorZero.map(item => ({
            contagem_id: novaContagemId,
            produto_id: item.produto_id,
            quantidade_contada: item.quantidade
        }));

        const { error: itensHistoricoError } = await _supabaseClient
            .from('contagem_itens_por_produto')
            .insert(itensParaHistorico);

        if (itensHistoricoError) throw itensHistoricoError;

        // Finalmente, aciona o download do TXT
        triggerDownload(nomeArquivo, content);
        alert(`Arquivo "${nomeArquivo}" gerado e histórico salvo com sucesso!`);
        clearAllQuantities(); // Limpa as quantidades e inputs
        await loadProductsForInventory(_supabaseClient, empresaId); // Atualiza a tabela
    } catch (e) {
        console.error("Erro ao gerar TXT ou salvar histórico:", e);
        alert(`Erro: ${e.message}`);
    } finally {
        hideLoader();
    }
}

/**
 * Gera um arquivo PDF com o resumo da contagem.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function gerarPDFContagem(_supabaseClient) {
    const produtosParaPDF = produtosCache.filter(p => {
        const inputElement = inventoryTableBody.querySelector(`input[data-produto-id="${p.id}"]`);
        return inputElement && quantidadesDigitadas[p.id] !== undefined && parseFloat(quantidadesDigitadas[p.id]) > 0;
    }).map(p => ({
        ...p,
        quantidade_digitada: parseFloat(quantidadesDigitadas[p.id])
    }));

    if (produtosParaPDF.length === 0) {
        alert("Nenhum item com quantidade maior que zero para gerar PDF. Preencha as quantidades e tente novamente.");
        return;
    }

    const colaboradorNome = selectColaboradorContagem.options[selectColaboradorContagem.selectedIndex].text;
    const unidadeNome = selectUnidadeContagem.options[selectUnidadeContagem.selectedIndex].text;
    const dataContagem = new Date().toLocaleString('pt-BR');
    const empresaNome = appState.currentUser?.empresa_nome || (empresasCache.find(e => e.id === appState.adminSelectedEmpresaContextId)?.nome_empresa) || 'N/A'; // Usar appState.adminSelectedEmpresaContextId

    showLoader();
    try {
        const { jsPDF } = window.jspdf; // Assume que jspdf está carregado globalmente
        if (typeof jsPDF === 'undefined' || typeof window.jspdf.jsPDF.API === 'undefined' || typeof window.jspdf.jsPDF.API.autoTable === 'undefined') {
            throw new Error("Biblioteca jsPDF ou jsPDF-AutoTable não carregada corretamente.");
        }

        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Relatório de Contagem de Estoque", 14, 22);

        doc.setFontSize(12);
        doc.text(`Empresa: ${empresaNome}`, 14, 30);
        doc.text(`Unidade: ${unidadeNome}`, 14, 37);
        doc.text(`Colaborador: ${colaboradorNome}`, 14, 44);
        doc.text(`Data da Contagem: ${dataContagem}`, 14, 51);

        const tableColumn = ["Código", "Produto", "Categorias", "Unidades", "Quantidade"];
        const tableRows = [];

        produtosParaPDF.sort((a, b) => a.nome_produto.localeCompare(b.nome_produto)).forEach(produto => {
            const categoriesDisplay = (produto.produtos_categorias || [])
                .map(pc => pc.nome_categoria)
                .filter(Boolean).join(', ') || 'Sem Categoria';

            const unitsDisplay = (produto.produtos_unidades || [])
                .map(pu => pu.nome_unidade)
                .filter(Boolean).join(', ') || 'Todas / Nenhuma Específica';

            const produtoData = [
                produto.codigo,
                produto.nome_produto,
                categoriesDisplay,
                unitsDisplay,
                produto.quantidade_digitada
            ];
            tableRows.push(produtoData);
        });

        doc.autoTable({
            startY: 60,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133] },
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 30 }, // Código
                1: { cellWidth: 'auto' }, // Produto
                2: { cellWidth: 40 }, // Categorias
                3: { cellWidth: 40 }, // Unidades
                4: { cellWidth: 25, halign: 'right' } // Quantidade
            }
        });

        const finalY = doc.autoTable.previous.finalY;
        doc.text(`Total de Itens Contados: ${produtosParaPDF.length}`, 14, finalY + 10);

        const nomeArquivoPDF = `contagem_estoque_${new Date().toISOString().slice(0,10).replace(/-/g, '')}_${unidadeNome.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;
        doc.save(nomeArquivoPDF);
        alert(`Arquivo PDF "${nomeArquivoPDF}" gerado com sucesso!`);

    } catch (e) {
        console.error("Erro ao gerar PDF da contagem:", e);
        alert("Falha ao gerar PDF: " + e.message);
    } finally {
        hideLoader();
    }
}