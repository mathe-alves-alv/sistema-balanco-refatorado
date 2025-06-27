import { _supabaseClient } from './supabase-client.js';
import { state } from './state.js'; 
import { showLoader, hideLoader, showToast } from './ui-manager.js'; 
import * as Dom from './dom-selectors.js';
import { produtosCache, categoriasCache, unidadesCache, setoresCache } from './data-cache.js'; 
import { loadQuantities, saveQuantities, triggerDownload, clearAllQuantitiesFromStorage, generatePdfContent, generateTxtContentForDownload, generateCountFilename } from './utils.js';
import { showAdminDashboardScreen } from './auth.js'; 
import * as Auth from './auth.js'; 

let quantidadesDigitadas = {};

/**
 * Verifica se todos os campos de quantidade visíveis na tabela estão preenchidos.
 * @returns {boolean} - Retorna true se todos os campos estiverem preenchidos, false caso contrário.
 */
function areAllVisibleInputsFilled() {
    const inputs = Dom.inventoryTableBodyEl.querySelectorAll('.quantidade-input');
    // Se não houver produtos visíveis, não há nada a validar.
    if (inputs.length === 0) return true; 

    for (const input of inputs) {
        if (input.value.trim() === '') {
            return false; // Encontrou um campo em branco
        }
    }
    return true; // Todos os campos estão preenchidos
}

/**
 * Atualiza o estado dos botões de ação com base no preenchimento dos campos.
 */
function updateExportButtonStates() {
    const allHeadersSelected = Dom.selectColaboradorContagemEl?.value && Dom.selectSetorContagemEl?.value && Dom.selectUnidadeContagemEl?.value;
    const allInputsFilled = areAllVisibleInputsFilled(); // Usa a nova função de validação

    // O botão de finalizar só é habilitado se os cabeçalhos estiverem selecionados E todos os campos de quantidade preenchidos.
    if (Dom.btnFinalizarContagemEl) Dom.btnFinalizarContagemEl.disabled = !allHeadersSelected || !allInputsFilled;
    if (Dom.btnGerarPDFAvulsoEl) Dom.btnGerarPDFAvulsoEl.disabled = !allHeadersSelected || !allInputsFilled;
}

function clearAllQuantitiesOnScreen() {
    quantidadesDigitadas = {};
    clearAllQuantitiesFromStorage();
    document.querySelectorAll('.quantidade-input').forEach(input => {
        if (input) input.value = '';
    });
    updateExportButtonStates();
}

function showPreviewModal() {
    if (!Dom.modalPreviewContagemEl || !Dom.previewContagemTableBodyEl) return;
    
    Dom.previewContagemTableBodyEl.innerHTML = ''; // Limpa a tabela
    const itemsContados = Object.entries(quantidadesDigitadas)
        .filter(([, quantidade]) => quantidade > 0)
        .map(([produtoId, quantidade]) => {
            const produto = produtosCache.find(p => String(p.id) === produtoId);
            return {
                codigo: produto ? produto.codigo : 'N/A',
                nome_produto: produto ? produto.nome_produto : 'Produto Desconhecido',
                categoria: (produto && produto.produtos_categorias && produto.produtos_categorias.length > 0) 
                            ? produto.produtos_categorias.map(pc => pc.nome_categoria).join(', ') : 'N/A',
                quantidade: quantidade
            };
        })
        .sort((a, b) => a.nome_produto.localeCompare(b.nome_produto));

    if (itemsContados.length === 0) {
        Dom.previewContagemTableBodyEl.innerHTML = '<tr><td colspan="4">Nenhum item com quantidade maior que zero.</td></tr>';
    } else {
        itemsContados.forEach(item => {
            const row = Dom.previewContagemTableBodyEl.insertRow();
            row.innerHTML = `
                <td>${item.codigo}</td>
                <td>${item.nome_produto}</td>
                <td>${item.categoria}</td>
                <td style="text-align: right;">${item.quantidade}</td>
            `;
        });
    }

    Dom.modalPreviewContagemEl.style.display = 'flex'; // Exibe o modal
}

function hidePreviewModal() {
    if (Dom.modalPreviewContagemEl) {
        Dom.modalPreviewContagemEl.style.display = 'none'; // Esconde o modal
    }
}

async function handleFinalizarContagem() {
    showLoader();
    try {
        // Validação dos campos
        const colaboradorId = Dom.selectColaboradorContagemEl.value;
        const unidadeId = Dom.selectUnidadeContagemEl.value;
        const setorId = Dom.selectSetorContagemEl.value;

        if (!colaboradorId || !unidadeId || !setorId) {
            throw new Error('Selecione o contador, a unidade e o setor da contagem antes de finalizar.');
        }
        
        // Validação para garantir que não há campos em branco (dupla checagem)
        if (!areAllVisibleInputsFilled()) {
            throw new Error('Por favor, preencha todos os campos de quantidade. Use o valor 0 (zero) se necessário.');
        }

        const colaboradorNome = Dom.selectColaboradorContagemEl.options[Dom.selectColaboradorContagemEl.selectedIndex].text;
        const unidadeNome = Dom.selectUnidadeContagemEl.options[Dom.selectUnidadeContagemEl.selectedIndex].text;
        const setorNome = setoresCache.find(s => String(s.id) === String(setorId))?.nome_setor || 'N/A';
        const totalItens = Object.values(quantidadesDigitadas).reduce((sum, qty) => sum + qty, 0);

        // Salvar no histórico
        const { error } = await _supabaseClient.from('contagens').insert({
            colaborador_id: colaboradorId,
            unidade_id: unidadeId,
            setor_contagem: setorNome,
            colaborador_nome_display: colaboradorNome,
            unidade_nome_display: unidadeNome,
            total_itens: totalItens,
            detalhes_contagem: quantidadesDigitadas
        });

        if (error) throw new Error(`Erro ao salvar no histórico: ${error.message}`);
        
        // Gerar e baixar o arquivo TXT
        const txtContent = generateTxtContentForDownload(quantidadesDigitadas, produtosCache);
        const nomeArquivo = generateCountFilename({
            colaborador: colaboradorNome,
            setor: setorNome,
            unidade: unidadeNome,
            data: new Date()
        }, 'txt');
        triggerDownload(nomeArquivo, txtContent, 'text/plain');

        // CORREÇÃO: Limpa a tela para uma nova contagem, mas permanece na mesma página.
        clearAllQuantitiesOnScreen();
        showToast('Contagem finalizada, salva e arquivo gerado!', 'success');
        
    } catch (e) {
        showToast(e.message, 'error');
        console.error('[Contagens] Erro ao finalizar contagem:', e);
    } finally {
        hideLoader();
    }
}

export async function showInventoryCountScreen() {
    showLoader();
    try {
        clearAllQuantitiesOnScreen();
        if (Dom.inventoryCountTitleEl) Dom.inventoryCountTitleEl.textContent = 'Balanço de Estoque';
        const isAdminOrGerente = state.currentUser && (state.currentUser.user_role === 'admin' || state.currentUser.user_role === 'gerente');
        if (Dom.inventoryCountBackButtonEl) {
            Dom.inventoryCountBackButtonEl.style.display = isAdminOrGerente ? 'inline-block' : 'none'; 
            Dom.inventoryCountBackButtonEl.onclick = showAdminDashboardScreen;
        }
        if (Dom.btnLogoutContadorEl) {
            Dom.btnLogoutContadorEl.style.display = isAdminOrGerente ? 'none' : 'inline-block'; 
            Dom.btnLogoutContadorEl.onclick = Auth.handleLogout; 
        }
        if(Dom.pesquisaProdutoInputEl) Dom.pesquisaProdutoInputEl.value = '';
        if(Dom.pesquisaCodigoInputEl) Dom.pesquisaCodigoInputEl.value = '';
        if(Dom.filtroCategoriaSelectEl) Dom.filtroCategoriaSelectEl.value = ''; 
        if(Dom.filtroUnidadeSelectEl) Dom.filtroUnidadeSelectEl.value = '';      
        if(Dom.selectSetorContagemEl) Dom.selectSetorContagemEl.value = ''; 
        if(Dom.selectUnidadeContagemEl) {
            Dom.selectUnidadeContagemEl.innerHTML = '<option value="">-- Unidade (auto-preenchida) --</option>';
            Dom.selectUnidadeContagemEl.value = ''; 
            Dom.selectUnidadeContagemEl.disabled = true; 
        }
        await loadDataForCountScreen();
        displayInventoryProducts(); 
        window.showScreen('screenInventoryCount'); 
    } catch (e) {
        showToast(`Erro ao carregar tela de contagem: ${e.message}`, 'error');
        console.error('[Contagens] Erro em showInventoryCountScreen:', e); 
    } finally {
        hideLoader();
    }
}

async function loadDataForCountScreen() {
    await Promise.all([ loadColaboradoresParaContagem(), loadUnidadesParaContagem(), loadProductsForInventory() ]);
    await loadSetoresParaContagem(); 
    await populateCategoryFilter();
    await populateUnitFilter(); 
}

async function loadColaboradoresParaContagem() {
    if (!Dom.selectColaboradorContagemEl) return;
    Dom.selectColaboradorContagemEl.innerHTML = '<option value="">-- Colaborador --</option>';
    try {
        const { data, error } = await _supabaseClient.from('colaboradores').select('id, nome_colaborador').eq('ativo', true).order('nome_colaborador');
        if (error) throw error;
        (data || []).forEach(colab => Dom.selectColaboradorContagemEl.add(new Option(colab.nome_colaborador, colab.id)));
    } catch (e) { console.error("Erro ao carregar colaboradores:", e); }
}

async function loadUnidadesParaContagem() {
    if (!Dom.selectUnidadeContagemEl) return;
    try {
        const { data, error } = await _supabaseClient.from('unidades').select('id, nome_unidade').order('nome_unidade');
        if (error) throw error;
        unidadesCache.splice(0, unidadesCache.length, ...(data || [])); 
    } catch (e) { console.error("Erro ao carregar unidades:", e); showToast("Erro ao carregar unidades.", 'error'); }
}

async function loadSetoresParaContagem() { 
    if (!Dom.selectSetorContagemEl) return;
    Dom.selectSetorContagemEl.innerHTML = '<option value="">-- Selecione um Setor --</option>'; 
    try {
        const { data, error } = await _supabaseClient.from('setores').select('id, nome_setor, unidade_id').order('nome_setor');
        if (error) throw error;
        setoresCache.splice(0, setoresCache.length, ...(data || []).map(s => ({ ...s, unidade_nome: unidadesCache.find(u => u.id === s.unidade_id)?.nome_unidade || 'N/A' }))); 
        (setoresCache || []).forEach(setor => Dom.selectSetorContagemEl.add(new Option(setor.nome_setor, setor.id)));
    } catch (e) { console.error("[Contagens] Erro ao carregar setores:", e); showToast("Erro ao carregar setores.", 'error'); }
}

async function loadProductsForInventory() {
    try {
        const { data, error } = await _supabaseClient.rpc('get_produtos_com_categorias_e_unidades');
        if (error) throw error; 
        produtosCache.splice(0, produtosCache.length, ...(data || []));
        const uniqueCategories = new Map();
        const uniqueUnidades = new Map(); 
        produtosCache.forEach(p => {
            (p.produtos_categorias || []).forEach(pc => { if (pc && pc.categoria_id && pc.nome_categoria) uniqueCategories.set(pc.categoria_id, pc.nome_categoria); });
            (p.produtos_unidades || []).forEach(pu => { if (pu && pu.unidades && pu.unidades.id && pu.unidades.nome_unidade) uniqueUnidades.set(pu.unidades.id, pu.unidades.nome_unidade); });
        });
        categoriasCache.splice(0, categoriasCache.length, ...Array.from(uniqueCategories.entries()).map(([id, name]) => ({id, nome_categoria: name})).sort((a,b) => a.nome_categoria.localeCompare(b.nome_categoria))); 
        unidadesCache.splice(0, unidadesCache.length, ...Array.from(uniqueUnidades.entries()).map(([id, name]) => ({id, nome_unidade: name})).sort((a,b) => a.nome_unidade.localeCompare(b.nome_unidade))); 
    } catch (e) { showToast(`Erro ao carregar produtos: ${e.message}`, 'error'); console.error('[Contagens] Erro em loadProductsForInventory:', e); }
}

async function populateCategoryFilter() {
    if (!Dom.filtroCategoriaSelectEl) return;
    Dom.filtroCategoriaSelectEl.innerHTML = '<option value="">Todas Categorias</option>';
    categoriasCache.forEach(cat => Dom.filtroCategoriaSelectEl.add(new Option(cat.nome_categoria, cat.id)));
}

async function populateUnitFilter() {
    if (!Dom.filtroUnidadeSelectEl) return;
    Dom.filtroUnidadeSelectEl.innerHTML = '<option value="">Todas Unidades</option>';
    unidadesCache.forEach(unit => Dom.filtroUnidadeSelectEl.add(new Option(unit.nome_unidade, unit.id)));
}

function displayInventoryProducts() {
    if (!Dom.inventoryTableBodyEl) return;
    Dom.inventoryTableBodyEl.innerHTML = "";
    quantidadesDigitadas = loadQuantities();
    const produtosFiltrados = filterProducts();
    if (produtosFiltrados.length === 0) {
        Dom.inventoryTableBodyEl.innerHTML = `<tr><td colspan="4">Nenhum produto encontrado.</td></tr>`;
    } else {
        produtosFiltrados.forEach(produto => {
            const row = Dom.inventoryTableBodyEl.insertRow();
            row.innerHTML = `
                <td>${produto.codigo}</td>
                <td>${produto.nome_produto}</td>
                <td>${(produto.produtos_categorias || []).map(pc => pc.nome_categoria).join(', ') || 'N/A'}</td>
                <td><input type="number" min="0" class="form-control quantidade-input" data-produto-id="${produto.id}" value="${quantidadesDigitadas[produto.id] || ''}"></td>
            `;
        });
    }
    updateExportButtonStates();
}

function filterProducts() {
    const searchTermProduct = (Dom.pesquisaProdutoInputEl?.value || '').toLowerCase();
    const searchTermCodigo = (Dom.pesquisaCodigoInputEl?.value || '').toLowerCase();
    const filterCategoriaId = Dom.filtroCategoriaSelectEl?.value;
    const filterUnidadeProdutosId = Dom.filtroUnidadeSelectEl?.value;
    return produtosCache.filter(p => 
        p.nome_produto.toLowerCase().includes(searchTermProduct) &&
        p.codigo.toLowerCase().includes(searchTermCodigo) &&
        (!filterCategoriaId || (p.produtos_categorias || []).some(pc => pc.categoria_id === filterCategoriaId)) &&
        (!filterUnidadeProdutosId || (p.produtos_unidades || []).some(pu => pu.unidade_id === filterUnidadeProdutosId))
    );
}

[Dom.pesquisaProdutoInputEl, Dom.pesquisaCodigoInputEl, Dom.filtroCategoriaSelectEl, Dom.filtroUnidadeSelectEl].filter(el => el).forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', displayInventoryProducts));
[Dom.selectColaboradorContagemEl, Dom.selectSetorContagemEl, Dom.selectUnidadeContagemEl].filter(el => el).forEach(el => el.addEventListener('change', updateExportButtonStates));

if (Dom.selectSetorContagemEl) {
    Dom.selectSetorContagemEl.addEventListener('change', async () => {
        const selectedSetorId = Dom.selectSetorContagemEl.value;
        if (selectedSetorId) {
            const setor = setoresCache.find(s => String(s.id) === String(selectedSetorId));
            if (setor?.unidade_id) {
                const unidade = unidadesCache.find(u => String(u.id) === String(setor.unidade_id));
                Dom.selectUnidadeContagemEl.innerHTML = ''; 
                Dom.selectUnidadeContagemEl.add(new Option(unidade?.nome_unidade || '-- Unidade Inválida --', unidade?.id || ''));
                Dom.selectUnidadeContagemEl.value = unidade?.id || '';
                Dom.selectUnidadeContagemEl.disabled = true;
            } else {
                Dom.selectUnidadeContagemEl.innerHTML = '<option value="">-- Setor sem Unidade --</option>';
                Dom.selectUnidadeContagemEl.value = ''; Dom.selectUnidadeContagemEl.disabled = false;
            }
        } else {
            Dom.selectUnidadeContagemEl.innerHTML = '<option value="">-- Unidade (auto-preenchida) --</option>'; 
            Dom.selectUnidadeContagemEl.value = ''; Dom.selectUnidadeContagemEl.disabled = false;
        }
        displayInventoryProducts(); 
        updateExportButtonStates();
    });
}

if (Dom.inventoryTableBodyEl) { 
    Dom.inventoryTableBodyEl.addEventListener('input', event => {
        if (event.target.classList.contains('quantidade-input')) {
            const val = event.target.value.trim();
            if (val === '' || parseFloat(val) < 0) delete quantidadesDigitadas[event.target.dataset.produtoId];
            else quantidadesDigitadas[event.target.dataset.produtoId] = parseFloat(val);
            saveQuantities(quantidadesDigitadas);
            updateExportButtonStates();
        }
    });
}

// Listeners dos botões de ação
if (Dom.btnFinalizarContagemEl) Dom.btnFinalizarContagemEl.addEventListener('click', handleFinalizarContagem);
if (Dom.btnVerResumoEl) Dom.btnVerResumoEl.addEventListener('click', showPreviewModal);
if (Dom.btnClosePreviewModalEl) Dom.btnClosePreviewModalEl.addEventListener('click', hidePreviewModal);
if (Dom.btnGerarPDFAvulsoEl) Dom.btnGerarPDFAvulsoEl.addEventListener('click', () => {
    const pdfContent = generatePdfContent(quantidadesDigitadas, produtosCache); 
    triggerDownload('contagem_avulsa.pdf', pdfContent, 'application/pdf'); 
    showToast('PDF Avulso gerado!', 'success');
});
if (Dom.btnLimparContagemEl) Dom.btnLimparContagemEl.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja limpar toda a contagem atual?')) {
        clearAllQuantitiesOnScreen();
        showToast('Contagem limpa!', 'info');
    }
});
