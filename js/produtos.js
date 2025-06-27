import { _supabaseClient } from './supabase-client.js';
import { state } from './state.js';
import { showLoader, hideLoader, showToast } from './ui-manager.js'; 
import * as Dom from './dom-selectors.js';
import { produtosCache, categoriasCache, unidadesCache } from './data-cache.js';
import { showAdminDashboardScreen } from './auth.js';

/**
 * Exibe a tela de gerenciamento de produtos.
 */
export async function showProductManagementScreen() {
    console.log('[Produtos] showProductManagementScreen chamada.');
    showLoader();
    try {
        if(Dom.productManagementTitleEl) Dom.productManagementTitleEl.textContent = `Gerenciar Produtos`;
        if(Dom.productManagementBackButtonEl) Dom.productManagementBackButtonEl.onclick = showAdminDashboardScreen;

        await loadAllCategoriasAndUnidadesForForm();
        await fetchProductsFromSupabase();
        renderProductManagementTable();
        
        window.showScreen('screenProductManagement'); 
        console.log('[Produtos] Tela de Gerenciar Produtos exibida.');
    } catch (e) {
        showToast("Erro ao carregar tela de produtos.", 'error');
        console.error('[Produtos] Erro em showProductManagementScreen:', e);
    } finally {
        hideLoader();
    }
}

/**
 * Busca produtos do Supabase, incluindo suas categorias e unidades.
 */
async function fetchProductsFromSupabase() {
    console.log('[Produtos] Buscando produtos existentes do Supabase...');
    try {
        const { data, error } = await _supabaseClient.rpc('get_produtos_com_categorias_e_unidades');
        if (error) {
            console.error('[Produtos] Erro na RPC get_produtos_com_categorias_e_unidades:', error);
            throw error;
        }
        produtosCache.splice(0, produtosCache.length, ...(data || []));
    } catch (e) {
        console.error('[Produtos] Erro ao carregar produtos existentes para tabela:', e);
        showToast(`Erro ao carregar produtos existentes para tabela: ${e.message}`, 'error');
    }
}

/**
 * Renderiza a tabela de gerenciamento de produtos.
 */
function renderProductManagementTable() {
    if (!Dom.productManagementTableBodyEl) return;
    Dom.productManagementTableBodyEl.innerHTML = "";

    if (produtosCache.length === 0) {
        Dom.productManagementTableBodyEl.innerHTML = `<tr><td colspan="5">Nenhum produto cadastrado.</td></tr>`;
        return;
    }
    produtosCache.forEach(produto => {
        const row = Dom.productManagementTableBodyEl.insertRow();
        const categoryNames = (produto.produtos_categorias || []).map(pc => pc.nome_categoria).join(', ') || 'N/A';
        const unitNames = (produto.produtos_unidades || []).map(pu => (pu.unidades ? pu.unidades.nome_unidade : null)).filter(Boolean).join(', ') || 'N/A'; 
        
        row.innerHTML = `
            <td>${produto.codigo}</td>
            <td>${produto.nome_produto}</td>
            <td>${categoryNames}</td>
            <td>${unitNames}</td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-danger" data-id="${produto.id}" data-name="${produto.nome_produto}">Remover</button>
            </td>
        `;
    });
}

/**
 * Popula os formulários de seleção múltipla de categorias e unidades.
 */
async function loadAllCategoriasAndUnidadesForForm() {
    showLoader(); 
    try {
        const { data: categoriasData, error: catError } = await _supabaseClient
            .from('categorias')
            .select('id, nome_categoria')
            .order('nome_categoria');
        if (catError) throw catError;
        categoriasCache.splice(0, categoriasCache.length, ...(categoriasData || []));

        const { data: unidadesData, error: unitError } = await _supabaseClient
            .from('unidades')
            .select('id, nome_unidade')
            .order('nome_unidade');
        if (unitError) throw unitError;
        unidadesCache.splice(0, unidadesCache.length, ...(unidadesData || []));

        populateCategoriaMultiSelect();
        populateUnidadeMultiSelect();

    } catch (e) {
        console.error('[Produtos] Erro ao carregar categorias/unidades para o formulário:', e);
        showToast(`Erro ao carregar categorias/unidades: ${e.message}`, 'error');
    } finally {
        hideLoader(); 
    }
}

function populateCategoriaMultiSelect() {
    if (!Dom.prodCategoriasMultiSelectEl) return;
    Dom.prodCategoriasMultiSelectEl.innerHTML = '';
    if (categoriasCache.length === 0) {
        Dom.prodCategoriasMultiSelectEl.innerHTML = '<span class="empty-message">Nenhuma categoria cadastrada.</span>';
    } else {
        categoriasCache.forEach(cat => {
            const div = document.createElement('div');
            div.className = 'checkbox-group';
            div.innerHTML = `<input type="checkbox" id="prod-cat-${cat.id}" value="${cat.id}"><label for="prod-cat-${cat.id}">${cat.nome_categoria}</label>`;
            Dom.prodCategoriasMultiSelectEl.appendChild(div);
        });
    }
}

function populateUnidadeMultiSelect() {
    if (!Dom.prodUnidadesMultiSelectEl) return;
    Dom.prodUnidadesMultiSelectEl.innerHTML = '';
    if (unidadesCache.length === 0) {
        Dom.prodUnidadesMultiSelectEl.innerHTML = '<span class="empty-message">Nenhuma unidade cadastrada.</span>';
    } else {
        unidadesCache.forEach(unit => {
            const div = document.createElement('div');
            div.className = 'checkbox-group';
            div.innerHTML = `<input type="checkbox" id="prod-unit-${unit.id}" value="${unit.id}"><label for="prod-unit-${unit.id}">${unit.nome_unidade}</label>`;
            Dom.prodUnidadesMultiSelectEl.appendChild(div);
        });
    }
}

/**
 * Lida com a adição de um novo produto.
 * @param {Event} event - O objeto de evento do formulário.
 */
export async function handleAddProduct(event) {
    // CORREÇÃO: Impede que o formulário recarregue a página.
    event.preventDefault();

    const codigo = Dom.prodCodigoInputEl.value.trim();
    const nome = Dom.prodNomeInputEl.value.trim();
    const selectedCategoryIds = Array.from(Dom.prodCategoriasMultiSelectEl.querySelectorAll('input:checked')).map(cb => cb.value);
    const selectedUnitIds = Array.from(Dom.prodUnidadesMultiSelectEl.querySelectorAll('input:checked')).map(cb => cb.value);

    if (!codigo || !nome || selectedCategoryIds.length === 0 || selectedUnitIds.length === 0) {
        showToast("Código, Nome, Categoria e Unidade são obrigatórios.", 'error');
        return;
    }

    showLoader();
    try {
        const { data: existing } = await _supabaseClient.from('produtos').select('id').or(`codigo.eq.${codigo},nome_produto.eq.${nome}`).maybeSingle();
        if (existing) {
            throw new Error(`Produto com este código ou nome já existe.`);
        }

        const { data: newProduct, error } = await _supabaseClient.from('produtos').insert({ codigo, nome_produto: nome }).select('id').single();
        if (error) throw error;

        // Inserir links de categoria
        const categoryLinks = selectedCategoryIds.map(catId => ({ produto_id: newProduct.id, categoria_id: catId }));
        const { error: catLinkError } = await _supabaseClient.from('produtos_categorias').insert(categoryLinks);
        if (catLinkError) throw catLinkError;

        // Inserir links de unidade
        const unitLinks = selectedUnitIds.map(unitId => ({ produto_id: newProduct.id, unidade_id: unitId }));
        const { error: unitLinkError } = await _supabaseClient.from('produtos_unidades').insert(unitLinks);
        if (unitLinkError) throw unitLinkError;

        showToast("Produto adicionado com sucesso!", "success");
        Dom.prodCodigoInputEl.value = '';
        Dom.prodNomeInputEl.value = '';
        Dom.prodCategoriasMultiSelectEl.querySelectorAll('input:checked').forEach(cb => cb.checked = false);
        Dom.prodUnidadesMultiSelectEl.querySelectorAll('input:checked').forEach(cb => cb.checked = false);

        await fetchProductsFromSupabase();
        renderProductManagementTable();

    } catch (e) {
        showToast(`Falha ao adicionar produto: ${e.message}`, 'error');
        console.error('[Produtos] Erro em handleAddProduct:', e);
    } finally {
        hideLoader();
    }
}

// Event listener para a tabela de produtos para a exclusão
if (Dom.productManagementTableBodyEl) {
    Dom.productManagementTableBodyEl.addEventListener('click', async (event) => {
        if(event.target.classList.contains('btn-danger')) {
            const productIdToDelete = event.target.dataset.id;
            const productNameToDelete = event.target.dataset.name;

            if (confirm(`Tem certeza que deseja remover o produto "${productNameToDelete}"?`)) {
                showLoader();
                try {
                    // Excluir links em tabelas de junção primeiro
                    await _supabaseClient.from('produtos_categorias').delete().eq('produto_id', productIdToDelete);
                    await _supabaseClient.from('produtos_unidades').delete().eq('produto_id', productIdToDelete);
                    
                    // Depois, excluir o produto da tabela principal
                    const { error: productError } = await _supabaseClient.from('produtos').delete().eq('id', productIdToDelete);
                    if (productError) throw productError;
                    
                    showToast("Produto removido com sucesso.", "success");
                    await fetchProductsFromSupabase();
                    renderProductManagementTable();
                } catch (error) {
                    showToast(`Erro ao remover produto: ${error.message}`, 'error');
                    console.error('[Produtos] Erro na remoção do produto:', error);
                } finally {
                    hideLoader();
                }
            }
        }
    });
}
