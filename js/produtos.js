// js/produtos.js

import { showLoader, hideLoader, showScreen } from './ui-manager.js';
import { 
    productManagementBackButton, productManagementTitle, productManagementContext,
    adminProdutoEmpresaSelectorContainer, adminProdutoEmpresaSelect, prodCodigoInput, prodNomeInput,
    prodCategoriasMultiSelect, prodUnidadesMultiSelect, productManagementTableBody, xlsxFileInput, btnAddProductEl, btnImportXLSXEl
} from './dom-selectors.js';
import { appState, setAdminSelectedEmpresaContextId } from './state.js'; // Importa o appState e seus setters
import { empresasCache, produtosCache, categoriasCache, unidadesCache, populateEmpresasSelect } from './data-cache.js';
import { showAdminMasterDashboardScreen, showEmpresaDashboardScreen } from './auth.js'; // Para navegação de volta


/**
 * Exibe a tela de gerenciamento de produtos para o Admin Master.
 * Permite que o admin selecione uma empresa para gerenciar os produtos.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function showProductManagementScreen_AdminGlobal(_supabaseClient) {
    if (!appState.currentUser || appState.currentUser?.role !== 'admin_master') {
        alert("Acesso negado. Apenas Admin Master pode gerenciar produtos globalmente.");
        showScreen('login', {}, appState.currentUser); // Fallback seguro
        return;
    }
    console.log("showProductManagementScreen_AdminGlobal called");
    showLoader();
    try {
        // Reinicia o contexto de seleção para admin
        setAdminSelectedEmpresaContextId(null); 

        // Configura o seletor de empresa e o contexto
        if(adminProdutoEmpresaSelectorContainer) adminProdutoEmpresaSelectorContainer.style.display = 'block';
        if(btnAddProductEl) btnAddProductEl.disabled = true; // Desabilita o botão adicionar até que uma empresa seja selecionada
        if(btnImportXLSXEl) btnImportXLSXEl.disabled = true; // Desabilita o botão importar até que uma empresa seja selecionada

        await populateEmpresasSelect(_supabaseClient, adminProdutoEmpresaSelect, true, "-- Selecione uma Empresa --", "");
        if(adminProdutoEmpresaSelect) adminProdutoEmpresaSelect.value = ""; // Garante que nenhum valor esteja selecionado inicialmente

        // Adiciona/garante que o event listener esteja anexado uma única vez
        if (adminProdutoEmpresaSelect && !adminProdutoEmpresaSelect.onchangeAttached_prod_admin) {
            adminProdutoEmpresaSelect.addEventListener('change', async () => {
                const newEmpresaId = adminProdutoEmpresaSelect.value === "" ? null : adminProdutoEmpresaSelect.value;
                setAdminSelectedEmpresaContextId(newEmpresaId); // Atualiza o contexto global de admin
                const selectedEmpresa = empresasCache.find(e => e.id === newEmpresaId);
                if(productManagementContext) productManagementContext.textContent = selectedEmpresa ? `Gerenciando para: ${selectedEmpresa.nome_empresa}` : "Nenhuma empresa selecionada";
                if(btnAddProductEl) btnAddProductEl.disabled = !newEmpresaId; // Habilita/Desabilita botão
                if(btnImportXLSXEl) btnImportXLSXEl.disabled = !newEmpresaId; // Habilita/Desabilita botão

                if (newEmpresaId) {
                    await populateCategoriaAndUnitMultiSelect_ProdutoForm(_supabaseClient, newEmpresaId); // Popula categorias e unidades para o formulário
                    await fetchProductsFromSupabase(_supabaseClient, newEmpresaId); // Busca produtos para a tabela
                } else {
                    if(prodCategoriasMultiSelect) prodCategoriasMultiSelect.innerHTML = '<span class="empty-message">Selecione uma empresa primeiro.</span>';
                    if(prodUnidadesMultiSelect) prodUnidadesMultiSelect.innerHTML = '<span class="empty-message">Selecione uma empresa primeiro.</span>';
                    produtosCache.splice(0, produtosCache.length); // Limpa o cache de produtos
                }
                renderProductManagementTable(); // Renderiza a tabela (filtrada ou vazia)
            });
            adminProdutoEmpresaSelect.onchangeAttached_prod_admin = true;
        }
        // Não faz o fetch inicial aqui, pois não há empresa selecionada por padrão
        showScreen('productManagement', { title: 'Gerenciar Produtos (Admin)', context: 'Selecione uma empresa para ver ou adicionar produtos.', showEmpresaSelector: true }, appState.currentUser);

    } catch (e) {
        console.error("Erro em showProductManagementScreen_AdminGlobal:", e);
        alert("Erro ao carregar tela de produtos admin.");
    } finally {
        hideLoader();
    }
}

/**
 * Exibe a tela de gerenciamento de produtos para um Gerente de Empresa.
 * O gerente só pode gerenciar os produtos da sua própria empresa.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function showProductManagementScreen_Empresa(_supabaseClient) {
    if (!appState.currentUser || !(appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal')) {
        alert("Acesso negado à gestão de produtos.");
        showEmpresaDashboardScreen(appState.currentUser); // Redireciona para o dashboard da empresa
        return;
    }
    if (!appState.currentUser.empresa_id) {
        console.error("ID da empresa do usuário não encontrada para produtos.");
        alert("Erro: ID da sua empresa não encontrado. Tente relogar.");
        showScreen('login', {}, appState.currentUser); // Fallback para login
        return;
    }
    console.log("showProductManagementScreen_Empresa called for company:", appState.currentUser.empresa_nome);
    showLoader();
    try {
        setAdminSelectedEmpresaContextId(appState.currentUser.empresa_id); // Define o contexto da empresa para a empresa do usuário
        if(adminProdutoEmpresaSelectorContainer) adminProdutoEmpresaSelectorContainer.style.display = 'none'; // Esconde o seletor de empresa
        if(btnAddProductEl) btnAddProductEl.disabled = false; // Habilita o botão adicionar
        if(btnImportXLSXEl) btnImportXLSXEl.disabled = false; // Habilita o botão importar

        if(productManagementTitle) productManagementTitle.textContent = `Gerenciar Produtos (${appState.currentUser.empresa_nome || 'Sua Empresa'})`;
        if(productManagementContext) productManagementContext.textContent = `Gerenciando produtos para ${appState.currentUser.empresa_nome || 'sua empresa'}.`;

        await populateCategoriaAndUnitMultiSelect_ProdutoForm(_supabaseClient, appState.currentUser.empresa_id); // Popula para o formulário
        await fetchProductsFromSupabase(_supabaseClient, appState.currentUser.empresa_id); // Busca para a tabela
        renderProductManagementTable(); // Renderiza a tabela
        
        showScreen('productManagement', {
            title: productManagementTitle.textContent,
            context: productManagementContext.textContent,
            showEmpresaSelector: false
        }, appState.currentUser); // Passa appState.currentUser

    } catch (e) {
        console.error("Erro em showProductManagementScreen_Empresa:", e);
        alert("Erro ao carregar tela de gestão de produtos da empresa.");
    } finally {
        hideLoader();
    }
}


/**
 * Busca produtos do Supabase para uma empresa específica, incluindo suas categorias e unidades.
 * Usa uma RPC para otimização.
 * Atualiza `produtosCache`, `categoriasCache` e `unidadesCache` globais.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaId O ID da empresa para buscar produtos.
 */
export async function fetchProductsFromSupabase(_supabaseClient, empresaId) {
    showLoader();
    if (!empresaId) {
        console.warn("fetchProductsFromSupabase: empresaId é nulo/vazio. Limpando caches de produtos, categorias e unidades.");
        produtosCache.splice(0, produtosCache.length);
        categoriasCache.splice(0, categoriasCache.length);
        unidadesCache.splice(0, unidadesCache.length);
        hideLoader();
        return;
    }
    try {
        // Chamada à função RPC para buscar produtos com suas categorias e unidades
        const { data: productsData, error: productsError } = await _supabaseClient.rpc('get_produtos_com_categorias_e_unidades', { // RPC atualizada
            p_empresa_id: empresaId
        });

        if (productsError) throw productsError;
        produtosCache.splice(0, produtosCache.length, ...(productsData || []));
        console.log(`Products loaded for company ID ${empresaId}:`, produtosCache.length);

        // Reconstroi os caches de categorias e unidades a partir dos produtos carregados
        // para garantir que os filtros mostrem apenas categorias/unidades relevantes aos produtos existentes.
        const uniqueCategories = new Map();
        const uniqueUnidades = new Map();

        produtosCache.forEach(p => {
            (p.produtos_categorias || []).forEach(pc => {
                if (!uniqueCategories.has(pc.categoria_id)) {
                    uniqueCategories.set(pc.categoria_id, { id: pc.categoria_id, nome_categoria: pc.nome_categoria, empresa_id: empresaId });
                }
            });
            (p.produtos_unidades || []).forEach(pu => {
                if (!uniqueUnidades.has(pu.unidade_id)) {
                    uniqueUnidades.set(pu.unidade_id, { id: pu.unidade_id, nome_unidade: pu.nome_unidade, empresa_id: empresaId });
                }
            });
        });

        categoriasCache.splice(0, categoriasCache.length, ...Array.from(uniqueCategories.values()).sort((a,b) => a.nome_categoria.localeCompare(b.nome_categoria)));
        unidadesCache.splice(0, unidadesCache.length, ...Array.from(uniqueUnidades.values()).sort((a,b) => a.nome_unidade.localeCompare(b.nome_unidade)));

        console.log(`Categories cache updated after product fetch: ${categoriasCache.length}`);
        console.log(`Units cache updated after product fetch: ${unidadesCache.length}`);

    } catch (e) {
        console.error("Erro ao buscar produtos, categorias ou unidades:", e);
        produtosCache.splice(0, produtosCache.length);
        categoriasCache.splice(0, categoriasCache.length);
        unidadesCache.splice(0, unidadesCache.length);
        alert(`Erro ao carregar produtos: ${e.message}`);
    } finally {
        hideLoader();
    }
}


/**
 * Renderiza a tabela de gerenciamento de produtos com base no `produtosCache`.
 * Esta função deve ser chamada APÓS `fetchProductsFromSupabase`.
 */
export function renderProductManagementTable() {
    if (!productManagementTableBody) {
        console.error("productManagementTableBody not found");
        return;
    }
    productManagementTableBody.innerHTML = ""; // Limpa a tabela

    if (produtosCache.length === 0) {
        productManagementTableBody.innerHTML = `<tr><td colspan="5">Nenhum produto cadastrado para a empresa selecionada.</td></tr>`;
        return;
    }

    produtosCache.forEach(produto => {
        const row = productManagementTableBody.insertRow();
        row.insertCell().textContent = produto.codigo;
        row.insertCell().textContent = produto.nome_produto;

        // Categorias (vindos da RPC)
        const categoriesCell = row.insertCell();
        const categoryNames = (produto.produtos_categorias || [])
            .map(pc => pc.nome_categoria)
            .filter(Boolean); // Filtra valores vazios
        categoriesCell.textContent = categoryNames.length > 0 ? categoryNames.join(', ') : 'Sem Categoria';

        // Unidades (vindos da RPC)
        const unitsCell = row.insertCell();
        const unitNames = (produto.produtos_unidades || [])
            .map(pu => pu.nome_unidade)
            .filter(Boolean); // Filtra valores vazios
        unitsCell.textContent = unitNames.length > 0 ? unitNames.join(', ') : 'Todas / Nenhuma Específica';

        const actionsCell = row.insertCell();
        const btnRemove = document.createElement('button');
        btnRemove.textContent = 'Remover';
        btnRemove.className = 'btn btn-danger table-actions';
        btnRemove.onclick = () => handleDeleteProduct(_supabaseClient, produto.id, produto.nome_produto, produto.empresa_id); // Passa _supabaseClient
        actionsCell.appendChild(btnRemove);
    });
}

/**
 * Popula os multi-selects de Categorias e Unidades para o formulário de produtos.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaIdParaContexto O ID da empresa para buscar categorias e unidades.
 */
async function populateCategoriaAndUnitMultiSelect_ProdutoForm(_supabaseClient, empresaIdParaContexto) {
    if (!prodCategoriasMultiSelect || !prodUnidadesMultiSelect) {
        console.warn("Multi-selects de categorias ou unidades de produto não encontrados.");
        return;
    }

    // Limpa e exibe mensagem de carregamento para ambos
    prodCategoriasMultiSelect.innerHTML = '<span class="empty-message">Carregando categorias...</span>';
    prodUnidadesMultiSelect.innerHTML = '<span class="empty-message">Carregando unidades...</span>';
    
    // Se não há empresa selecionada, exibe mensagem e retorna
    if (!empresaIdParaContexto) {
        prodCategoriasMultiSelect.innerHTML = '<span class="empty-message">Nenhuma categoria disponível. Selecione uma empresa.</span>';
        prodUnidadesMultiSelect.innerHTML = '<span class="empty-message">Nenhuma unidade disponível. Selecione uma empresa.</span>';
        return;
    }

    try {
        // As categorias e unidades já foram carregadas em `fetchProductsFromSupabase`
        // Usamos o cache global `categoriasCache` e `unidadesCache` diretamente.

        // --- Popula Categorias ---
        prodCategoriasMultiSelect.innerHTML = ''; // Limpa a mensagem de carregamento
        if (categoriasCache.length === 0) {
            prodCategoriasMultiSelect.innerHTML = '<span class="empty-message">Nenhuma categoria cadastrada para esta empresa.</span>';
        } else {
            categoriasCache.forEach(cat => {
                const div = document.createElement('div');
                div.className = 'checkbox-group';
                div.innerHTML = `
                    <input type="checkbox" id="prod-cat-${cat.id}" value="${cat.id}">
                    <label for="prod-cat-${cat.id}">${cat.nome_categoria}</label>
                `;
                prodCategoriasMultiSelect.appendChild(div);
            });
        }

        // --- Popula Unidades ---
        prodUnidadesMultiSelect.innerHTML = ''; // Limpa a mensagem de carregamento
        if (unidadesCache.length === 0) {
            prodUnidadesMultiSelect.innerHTML = '<span class="empty-message">Nenhuma unidade cadastrada para esta empresa.</span>';
        } else {
            unidadesCache.forEach(unit => {
                const div = document.createElement('div');
                div.className = 'checkbox-group';
                div.innerHTML = `
                    <input type="checkbox" id="prod-unit-${unit.id}" value="${unit.id}">
                    <label for="prod-unit-${unit.id}">${unit.nome_unidade}</label>
                `;
                prodUnidadesMultiSelect.appendChild(div);
            });
        }

    } catch (e) {
        console.error("Erro ao popular multi-selects de categorias/unidades para formulário de produtos:", e);
        prodCategoriasMultiSelect.innerHTML = `<span class="empty-message" style="color:var(--danger-color);">Erro ao carregar categorias: ${e.message}</span>`;
        prodUnidadesMultiSelect.innerHTML = `<span class="empty-message" style="color:var(--danger-color);">Erro ao carregar unidades: ${e.message}</span>`;
    }
}

/**
 * Lida com a adição de um novo produto.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function handleAddProduct(_supabaseClient) {
    if (!prodCodigoInput || !prodNomeInput || !prodCategoriasMultiSelect || !prodUnidadesMultiSelect) {
        alert("Erro: Campos do formulário de produto não encontrados.");
        return;
    }
    const codigo = prodCodigoInput.value.trim();
    const nome = prodNomeInput.value.trim();
    const selectedCategoryIds = Array.from(prodCategoriasMultiSelect.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    const selectedUnitIds = Array.from(prodUnidadesMultiSelect.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

    let empresaParaProdutoId = null;
    if (appState.currentUser?.role === 'admin_master') {
        empresaParaProdutoId = adminProdutoEmpresaSelect.value; // Pega do select de admin
        if (!empresaParaProdutoId) {
            alert("Admin: Selecione uma empresa primeiro para adicionar o produto.");
            return;
        }
    } else if (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') {
        empresaParaProdutoId = appState.currentUser.empresa_id;
        if (!empresaParaProdutoId) {
            alert("Erro: ID da sua empresa não encontrado.");
            return;
        }
    } else {
        alert("Permissão negada.");
        return;
    }

    if (!codigo) { alert("Código do produto é obrigatório."); prodCodigoInput.focus(); return; }
    if (!nome) { alert("Nome do produto é obrigatório."); prodNomeInput.focus(); return; }
    if (selectedCategoryIds.length === 0) { alert("Selecione pelo menos uma categoria para o produto."); return; }
    if (selectedUnitIds.length === 0) { alert("Selecione pelo menos uma unidade para o produto."); return; }

    showLoader();
    try {
        // Verifica se já existe um produto com o mesmo código E nome para a mesma empresa
        const { data: existing, error: checkError } = await _supabaseClient.from('produtos')
            .select('id')
            .eq('empresa_id', empresaParaProdutoId)
            .or(`codigo.eq.${codigo},nome_produto.eq.${nome}`) // Verifica se o código OU nome já existem
            .maybeSingle();

        if (checkError) throw checkError;
        if (existing) {
            alert(`Já existe um produto com este código (${codigo}) ou nome (${nome}) para esta empresa.`);
            hideLoader();
            return;
        }

        // Insere o produto
        const { data: newProduct, error } = await _supabaseClient.from('produtos').insert([
            {
                codigo: codigo,
                nome_produto: nome,
                empresa_id: empresaParaProdutoId
            }
        ]).select('id').single(); // Retorna o ID do novo produto

        if (error) throw error;

        // Insere as associações na tabela produtos_categorias
        const categoryLinksToInsert = selectedCategoryIds.map(catId => ({
            produto_id: newProduct.id,
            categoria_id: catId
        }));
        const { error: categoryLinkError } = await _supabaseClient.from('produtos_categorias').insert(categoryLinksToInsert);
        if (categoryLinkError) {
            // Se falhar a associação de categoria, tenta reverter a criação do produto
            await _supabaseClient.from('produtos').delete().eq('id', newProduct.id).catch(e => console.error("Erro ao reverter produto após falha de categoria:", e));
            throw categoryLinkError;
        }

        // Insere as associações na tabela produtos_unidades
        const unitLinksToInsert = selectedUnitIds.map(unitId => ({
            produto_id: newProduct.id,
            unidade_id: unitId
        }));
        const { error: unitLinkError } = await _supabaseClient.from('produtos_unidades').insert(unitLinksToInsert);
        if (unitLinkError) {
            // Se falhar a associação de unidade, tenta reverter o produto e as associações de categoria
            await _supabaseClient.from('produtos_categorias').delete().eq('produto_id', newProduct.id).catch(e => console.error("Erro ao reverter categorias após falha de unidade:", e));
            await _supabaseClient.from('produtos').delete().eq('id', newProduct.id).catch(e => console.error("Erro ao reverter produto após falha de unidade:", e));
            throw unitLinkError;
        }

        alert(`Produto "${nome}" (${codigo}) adicionado com sucesso!`);
        prodCodigoInput.value = '';
        prodNomeInput.value = '';
        // Limpa os checkboxes
        prodCategoriasMultiSelect.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        prodUnidadesMultiSelect.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

        await fetchProductsFromSupabase(_supabaseClient, empresaParaProdutoId);
        renderProductManagementTable();

    } catch (e) {
        console.error("Erro ao adicionar produto:", e);
        alert('Falha ao adicionar produto: ' + e.message);
    } finally {
        hideLoader();
    }
}

/**
 * Lida com a exclusão de um produto.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} produtoId O ID do produto a ser excluído.
 * @param {string} nomeProduto O nome do produto (para confirmação).
 * @param {string} produtoEmpresaId O ID da empresa à qual o produto pertence.
 */
export async function handleDeleteProduct(_supabaseClient, produtoId, nomeProduto, produtoEmpresaId) {
    if (!confirm(`Tem certeza que deseja remover o produto "${nomeProduto}"? Esta ação também removerá suas associações com categorias, unidades e dados de contagem.`)) {
        return;
    }

    let canDelete = false;
    if (appState.currentUser?.role === 'admin_master' && produtoEmpresaId === adminProdutoEmpresaSelect.value) { // Verifica se é a empresa selecionada pelo admin
        canDelete = true;
    } else if ((appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') && produtoEmpresaId === appState.currentUser.empresa_id) {
        canDelete = true;
    }
    if (!canDelete) {
        alert("Você não tem permissão para remover este produto.");
        return;
    }

    showLoader();
    try {
        // Verifica se há itens de contagem associados a este produto
        const { count: countItemsCount, error: countItemsCheckError } = await _supabaseClient
            .from('contagem_itens_por_produto')
            .select('id', { count: 'exact', head: true })
            .eq('produto_id', produtoId);
        
        if (countItemsCheckError) throw countItemsCheckError;

        if (countItemsCount && countItemsCount > 0) {
            alert(`Não é possível excluir o produto "${nomeProduto}" pois ele possui ${countItemsCount} registro(s) em contagens de estoque. Você deve remover esses registros ou arquivar o produto.`);
            hideLoader();
            return;
        }

        // 1. Deleta associações na tabela produtos_categorias
        const { error: categoryLinkDeleteError } = await _supabaseClient.from('produtos_categorias').delete().eq('produto_id', produtoId);
        if (categoryLinkDeleteError) {
            console.error("Erro ao deletar links de categoria do produto:", categoryLinkDeleteError);
            throw new Error(`Falha ao remover associações de categoria para o produto: ${categoryLinkDeleteError.message}`);
        }

        // 2. Deleta associações na tabela produtos_unidades
        const { error: unitLinkDeleteError } = await _supabaseClient.from('produtos_unidades').delete().eq('produto_id', produtoId);
        if (unitLinkDeleteError) {
            console.error("Erro ao deletar links de unidade do produto:", unitLinkDeleteError);
            throw new Error(`Falha ao remover associações de unidade para o produto: ${unitLinkDeleteError.message}`);
        }

        // 3. Deleta o produto
        const { error } = await _supabaseClient.from('produtos').delete().eq('id', produtoId);
        if (error) throw error;

        alert(`Produto "${nomeProduto}" excluído com sucesso!`);
        await fetchProductsFromSupabase(_supabaseClient, produtoEmpresaId);
        renderProductManagementTable();

    } catch (e) {
        console.error("Erro ao remover produto:", e);
        alert('Falha ao remover produto: ' + e.message);
    } finally {
        hideLoader();
    }
}


/**
 * Lida com a importação de produtos via arquivo XLSX.
 * @param {Event} event O objeto de evento do input file.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function handleXLSXImport(event, _supabaseClient) {
    if (!xlsxFileInput || !xlsxFileInput.files || xlsxFileInput.files.length === 0) {
        alert("Por favor, selecione um arquivo XLSX.");
        return;
    }

    let empresaParaImportacaoId = null;
    if (appState.currentUser?.role === 'admin_master') {
        empresaParaImportacaoId = adminProdutoEmpresaSelect.value;
        if (!empresaParaImportacaoId) {
            alert("Admin: Por favor, selecione uma empresa primeiro na tela de 'Gerenciar Produtos' antes de importar.");
            return;
        }
    } else if (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') {
        empresaParaImportacaoId = appState.currentUser.empresa_id;
        if (!empresaParaImportacaoId) {
            alert("Erro: ID da sua empresa não encontrado. Não é possível importar.");
            return;
        }
    } else {
        alert("Permissão negada para importar.");
        return;
    }

    const file = xlsxFileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        showLoader();
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" });

            if (!jsonData || jsonData.length < 1) {
                alert("Planilha vazia ou formato inesperado. Verifique o arquivo XLSX.");
                hideLoader(); return;
            }

            const headerRow = jsonData[0];
            if (!Array.isArray(headerRow)) {
                alert("Formato de cabeçalho inesperado. A primeira linha não é uma lista de células.");
                hideLoader(); return;
            }

            const header = headerRow.map((h) => {
                if (h === null || typeof h === 'undefined') return "";
                return String(h).toLowerCase().trim();
            });

            const codigoIndex = header.indexOf('codigo');
            const produtoIndex = header.indexOf('produto');
            const categoriaIndex = header.indexOf('categoria');
            const unidadeIndex = header.indexOf('unidade');

            if (codigoIndex === -1 || produtoIndex === -1) {
                alert("Cabeçalho inválido. Colunas 'codigo' e 'produto' são obrigatórias. 'categoria' e 'unidade' são opcionais (podem conter múltiplos valores separados por vírgula).");
                hideLoader(); return;
            }

            // Recarrega caches de categorias e unidades para a empresa atual
            await fetchProductsFromSupabase(_supabaseClient, empresaParaImportacaoId); // Atualiza os caches globais de produtos, categorias e unidades

            // Agora, use categoriasCache e unidadesCache que foram atualizados por fetchProductsFromSupabase
            const categoriaMap = new Map(); // Lowercase category name -> id
            categoriasCache.forEach(cat => {
                if (cat.nome_categoria) {
                    categoriaMap.set(String(cat.nome_categoria).toLowerCase().trim(), cat.id);
                }
            });

            const unidadeMap = new Map(); // Lowercase unit name -> id
            unidadesCache.forEach(unit => {
                if (unit.nome_unidade) {
                    unidadeMap.set(String(unit.nome_unidade).toLowerCase().trim(), unit.id);
                }
            });

            const productsToProcess = [];
            const newCategoriesToCreate = new Set();
            const newUnidadesToCreate = new Set();

            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || !Array.isArray(row) || row.every(cell => cell === "" || cell === null || typeof cell === 'undefined') ) {
                    continue; // Pula linhas totalmente vazias
                }

                const codigoValue = row[codigoIndex];
                const nomeProdutoValue = row[produtoIndex];
                const categoriaRawValue = (categoriaIndex !== -1 && typeof row[categoriaIndex] !== 'undefined') ? row[categoriaIndex] : "";
                const unidadeRawValue = (unidadeIndex !== -1 && typeof row[unidadeIndex] !== 'undefined') ? row[unidadeIndex] : "";

                const codigo = (codigoValue !== null && typeof codigoValue !== 'undefined') ? String(codigoValue).trim() : null;
                const nomeProduto = (nomeProdutoValue !== null && typeof nomeProdutoValue !== 'undefined') ? String(nomeProdutoValue).trim() : null;
                
                const categoriaNamesXLSX = categoriaRawValue ? String(categoriaRawValue).split(',').map(s => s.trim()).filter(Boolean) : [];
                const unidadeNamesXLSX = unidadeRawValue ? String(unidadeRawValue).split(',').map(s => s.trim()).filter(Boolean) : [];

                if (!codigo || !nomeProduto) {
                    console.warn(`Linha ${i+1} ignorada: Código ou Nome do Produto vazio.`);
                    continue;
                }
                
                // Coleta novas categorias e unidades que precisariam ser criadas
                categoriaNamesXLSX.forEach(catName => {
                    if (!categoriaMap.has(catName.toLowerCase()) && !newCategoriesToCreate.has(catName.toLowerCase())) {
                        newCategoriesToCreate.add(catName);
                    }
                });
                unidadeNamesXLSX.forEach(unitName => {
                    if (!unidadeMap.has(unitName.toLowerCase()) && !newUnidadesToCreate.has(unitName.toLowerCase())) {
                        newUnidadesToCreate.add(unitName);
                    }
                });

                productsToProcess.push({
                    codigo,
                    nomeProduto,
                    categoriaNamesXLSX,
                    unidadeNamesXLSX
                });
            }

            if (productsToProcess.length === 0) {
                alert("Nenhum produto válido encontrado no arquivo XLSX após a leitura.");
                hideLoader();
                return;
            }

            // 1. Criar novas categorias faltantes
            if (newCategoriesToCreate.size > 0) {
                console.log("Criando novas categorias:", Array.from(newCategoriesToCreate));
                const categoriesToInsert = Array.from(newCategoriesToCreate).map(name => ({ nome_categoria: name, empresa_id: empresaParaImportacaoId }));
                const { data: insertedCats, error: catCreateError } = await _supabaseClient
                    .from('categorias')
                    .insert(categoriesToInsert)
                    .select('id, nome_categoria');
                if (catCreateError) throw catCreateError;
                insertedCats.forEach(cat => categoriaMap.set(cat.nome_categoria.toLowerCase(), cat.id));
                categoriasCache.push(...insertedCats); // Adiciona ao cache global
            }

            // 2. Criar novas unidades faltantes
            if (newUnidadesToCreate.size > 0) {
                console.log("Criando novas unidades:", Array.from(newUnidadesToCreate));
                const unitsToInsert = Array.from(newUnidadesToCreate).map(name => ({ nome_unidade: name, empresa_id: empresaParaImportacaoId }));
                const { data: insertedUnits, error: unitCreateError } = await _supabaseClient
                    .from('unidades')
                    .insert(unitsToInsert)
                    .select('id, nome_unidade');
                if (unitCreateError) throw unitCreateError;
                insertedUnits.forEach(unit => unidadeMap.set(unit.nome_unidade.toLowerCase(), unit.id));
                unidadesCache.push(...insertedUnits); // Adiciona ao cache global
            }

            let productsAddedCount = 0;
            let productsUpdatedCount = 0; // Produtos que já existiam, mas suas associações podem ser adicionadas/atualizadas
            let productsIgnoredCount = 0; // Produtos ignorados (código/nome duplicado, ou erro)
            const categoryLinksToInsert = [];
            const unitLinksToInsert = [];

            // Obter todos os produtos existentes da empresa para checagem rápida
            const { data: currentCompanyProducts, error: currentProductsError } = await _supabaseClient
                .from('produtos')
                .select('id, codigo, nome_produto')
                .eq('empresa_id', empresaParaImportacaoId);
            if (currentProductsError) throw currentProductsError;
            const existingProductsMap = new Map(); // codigo -> id
            const existingProductNamesMap = new Map(); // nome_produto -> id
            (currentCompanyProducts || []).forEach(p => {
                existingProductsMap.set(p.codigo.toLowerCase(), p.id);
                existingProductNamesMap.set(p.nome_produto.toLowerCase(), p.id);
            });

            // 3. Processar produtos
            for (const prod of productsToProcess) {
                let productId;
                let isExistingProduct = false;

                // Tenta encontrar por código primeiro
                if (existingProductsMap.has(prod.codigo.toLowerCase())) {
                    productId = existingProductsMap.get(prod.codigo.toLowerCase());
                    isExistingProduct = true;
                } else if (existingProductNamesMap.has(prod.nomeProduto.toLowerCase())) {
                    productId = existingProductNamesMap.get(prod.nomeProduto.toLowerCase());
                    isExistingProduct = true;
                }

                if (isExistingProduct) {
                    productsUpdatedCount++; 
                } else {
                    // Insere um novo produto
                    const { data: newProd, error: insertProdError } = await _supabaseClient
                        .from('produtos')
                        .insert([{ codigo: prod.codigo, nome_produto: prod.nomeProduto, empresa_id: empresaParaImportacaoId }])
                        .select('id')
                        .single();
                    if (insertProdError) {
                        console.error(`Erro ao inserir produto "${prod.nomeProduto}" (${prod.codigo}):`, insertProdError);
                        productsIgnoredCount++;
                        continue;
                    }
                    productId = newProd.id;
                    productsAddedCount++;
                }

                // Coletar links de categoria
                for (const catName of prod.categoriaNamesXLSX) {
                    const categoryId = categoriaMap.get(catName.toLowerCase());
                    if (categoryId) {
                        categoryLinksToInsert.push({ produto_id: productId, categoria_id: categoryId });
                    }
                }

                // Coletar links de unidade
                for (const unitName of prod.unidadeNamesXLSX) {
                    const unitId = unidadeMap.get(unitName.toLowerCase());
                    if (unitId) {
                        unitLinksToInsert.push({ produto_id: productId, unidade_id: unitId });
                    }
                }
            }

            // 4. Inserir todas as associações de categoria em um lote
            if (categoryLinksToInsert.length > 0) {
                // Para evitar duplicatas, podemos tentar um upsert se a tabela de junção tiver uma constraint UNIQUE(produto_id, categoria_id)
                // Caso contrário, apenas insert (e Supabase vai dar erro em duplicata se não tiver ON CONFLICT)
                const { error: batchCatError } = await _supabaseClient.from('produtos_categorias').insert(categoryLinksToInsert, { onConflict: 'produto_id,categoria_id' });
                if (batchCatError) {
                    console.error("Erro ao inserir associações de categoria em lote:", batchCatError);
                    alert("Aviso: Erro ao associar algumas categorias. Verifique o console.");
                }
            }

            // 5. Inserir todas as associações de unidade em um lote
            if (unitLinksToInsert.length > 0) {
                // Para evitar duplicatas, upsert se a tabela de junção tiver uma constraint UNIQUE(produto_id, unidade_id)
                const { error: batchUnitError } = await _supabaseClient.from('produtos_unidades').insert(unitLinksToInsert, { onConflict: 'produto_id,unidade_id' });
                if (batchUnitError) {
                    console.error("Erro ao inserir associações de unidade em lote:", batchUnitError);
                    alert("Aviso: Erro ao associar algumas unidades. Verifique o console.");
                }
            }
            
            alert(`Importação concluída: ${productsAddedCount} novos produtos adicionados, ${productsUpdatedCount} produtos existentes potencialmente atualizados com novas associações. ${productsIgnoredCount} linhas ignoradas.`);
            
            xlsxFileInput.value = ''; // Limpa o input do arquivo
            await fetchProductsFromSupabase(_supabaseClient, empresaParaImportacaoId); // Atualiza a lista de produtos na tela
            renderProductManagementTable(); // Renderiza a tabela de produtos
            await populateCategoriaAndUnitMultiSelect_ProdutoForm(_supabaseClient, empresaParaImportacaoId); // Atualiza as opções do formulário

        } catch (error) {
            console.error("Erro detalhado na leitura/importação do XLSX:", error);
            alert("Falha ao importar XLSX: " + error.message);
        } finally {
            if(xlsxFileInput) xlsxFileInput.value = ''; // Garante que o input seja limpo mesmo em erro
            hideLoader();
        }
    };

    reader.onerror = (error) => {
        console.error("Erro ao ler o arquivo XLSX:", error);
        alert("Erro ao ler o arquivo XLSX.");
        hideLoader();
    };

    reader.readAsArrayBuffer(file);
}