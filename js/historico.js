import { _supabaseClient } from './supabase-client.js';
import { showLoader, hideLoader, showToast } from './ui-manager.js';
import * as Dom from './dom-selectors.js';
import { produtosCache, unidadesCache } from './data-cache.js'; 
import { showAdminDashboardScreen } from './auth.js'; 
import * as Auth from './auth.js'; 
import { triggerDownload, generateTxtContentForDownload, generatePdfContent, generateCountFilename } from './utils.js'; 

let historicoContagensCache = []; 

export async function showHistoricoContagensScreen() {
    showLoader();
    try {
        if(Dom.historicoBackButtonEl) Dom.historicoBackButtonEl.onclick = showAdminDashboardScreen;
        
        // CORREÇÃO: Força a atualização do cache de unidades sempre que a tela é carregada.
        // Isso garante que o filtro sempre tenha os dados mais recentes.
        unidadesCache.length = 0;

        await loadProductsForHistoryDetails(); 
        await populateHistoricoUnidadeFilter(); 
        await filterAndRenderHistoricoContagens(); 
        
        window.showScreen('screenHistoricoContagens');
    } catch (e) {
        showToast(`Erro ao carregar histórico: ${e.message}`, 'error');
        console.error('[Historico] Erro em showHistoricoContagensScreen:', e);
    } finally {
        hideLoader();
    }
}

async function loadProductsForHistoryDetails() {
    if (produtosCache.length > 0) return;
    try {
        const { data, error } = await _supabaseClient.rpc('get_produtos_com_categorias_e_unidades');
        if (error) throw error; 
        produtosCache.splice(0, produtosCache.length, ...(data || []));
    } catch (e) { 
        showToast(`Erro ao carregar produtos para detalhes do histórico: ${e.message}`, 'error'); 
        console.error('[Historico] Erro em loadProductsForHistoryDetails:', e); 
        throw e;
    }
}

async function populateHistoricoUnidadeFilter() {
    if (!Dom.historicoUnidadeFilterEl) return;
    Dom.historicoUnidadeFilterEl.innerHTML = '<option value="">Todas as Unidades</option>';
    
    // O cache é forçado a recarregar pela chamada em showHistoricoContagensScreen.
    if (unidadesCache.length === 0) {
        try {
            const { data, error } = await _supabaseClient.from('unidades').select('id, nome_unidade').order('nome_unidade');
            if (error) throw error;
            unidadesCache.splice(0, unidadesCache.length, ...(data || []));
        } catch (e) {
            console.error('[Historico] Erro ao carregar unidades para o filtro de histórico (fallback):', e);
            showToast('Erro ao carregar unidades para o filtro.', 'error');
            Dom.historicoUnidadeFilterEl.innerHTML = '<option value="">Erro ao carregar unidades</option>';
            return;
        }
    }

    unidadesCache.forEach(unit => {
        Dom.historicoUnidadeFilterEl.add(new Option(unit.nome_unidade, unit.id));
    });

    // CORREÇÃO: Garante que o event listener seja adicionado apenas uma vez.
    if (!Dom.historicoUnidadeFilterEl.onchange) {
        Dom.historicoUnidadeFilterEl.onchange = filterAndRenderHistoricoContagens;
    }
}

async function filterAndRenderHistoricoContagens() {
    if (!Dom.historicoContagensTableBodyEl) return;
    // CORREÇÃO: Ajustado o colspan para a nova coluna "Setor"
    Dom.historicoContagensTableBodyEl.innerHTML = '<tr><td colspan="6">Carregando...</td></tr>';
    const filterUnidadeId = Dom.historicoUnidadeFilterEl ? Dom.historicoUnidadeFilterEl.value : '';

    try {
        let query = _supabaseClient.from('contagens')
            .select('id, created_at, colaborador_nome_display, unidade_nome_display, setor_contagem, total_itens, detalhes_contagem, unidade_id') 
            .order('created_at', { ascending: false });

        if (filterUnidadeId) {
            query = query.eq('unidade_id', filterUnidadeId);
        }

        const { data, error } = await query;
        if (error) throw error;

        historicoContagensCache.splice(0, historicoContagensCache.length, ...(data || []));
        Dom.historicoContagensTableBodyEl.innerHTML = '';

        if (historicoContagensCache.length === 0) {
            Dom.historicoContagensTableBodyEl.innerHTML = '<tr><td colspan="6">Nenhum registro de contagem encontrado para os filtros selecionados.</td></tr>';
        } else {
            // Atualiza o cabeçalho da tabela para incluir a nova coluna
            const tableHead = Dom.historicoContagensTableBodyEl.parentElement.querySelector('thead tr');
            if (tableHead) {
                tableHead.innerHTML = `<th>Data/Hora</th><th>Contador</th><th>Unidade</th><th>Setor</th><th>Total Itens</th><th>Ações</th>`;
            }

            historicoContagensCache.forEach(contagem => {
                const row = Dom.historicoContagensTableBodyEl.insertRow();
                const dateTime = new Date(contagem.created_at).toLocaleString('pt-BR');
                // CORREÇÃO: Adicionada a coluna "Setor" na tabela
                row.innerHTML = `
                    <td>${dateTime}</td>
                    <td>${contagem.colaborador_nome_display}</td>
                    <td>${contagem.unidade_nome_display}</td>
                    <td>${contagem.setor_contagem || 'N/A'}</td>
                    <td>${contagem.total_itens}</td>
                    <td class="actions-cell">
                        <button class="btn btn-sm btn-info btn-view-details" data-id="${contagem.id}">Detalhes</button>
                    </td>
                `;
            });
        }
    } catch (e) {
        showToast(`Erro ao buscar histórico: ${e.message}`, 'error');
        console.error('[Historico] Erro em filterAndRenderHistoricoContagens:', e);
        Dom.historicoContagensTableBodyEl.innerHTML = `<tr><td colspan="6" style="color:red;">Erro ao carregar histórico: ${e.message}</td></tr>`;
    } finally {
        hideLoader();
    }
}

if (Dom.historicoContagensTableBodyEl) {
    Dom.historicoContagensTableBodyEl.addEventListener('click', async (event) => {
        if(event.target.classList.contains('btn-view-details')) {
            const countId = event.target.dataset.id; 
            await showCountDetailsScreen(countId); 
        }
    });
}

async function showCountDetailsScreen(countId) {
    showLoader();
    try {
        let countData = historicoContagensCache.find(c => String(c.id) === countId); 

        if (!countData) {
            const { data, error } = await _supabaseClient.from('contagens')
                .select('id, created_at, colaborador_nome_display, unidade_nome_display, setor_contagem, total_itens, detalhes_contagem')
                .eq('id', countId)
                .single();
            if (error || !data) throw new Error("Contagem não encontrada ou erro ao buscar do banco de dados.");
            countData = data;
        }

        if (Dom.detailsCountIdEl) Dom.detailsCountIdEl.textContent = countData.id;
        if (Dom.detailsCountDateTimeEl) Dom.detailsCountDateTimeEl.textContent = new Date(countData.created_at).toLocaleString('pt-BR');
        if (Dom.detailsCountContadorEl) Dom.detailsCountContadorEl.textContent = countData.colaborador_nome_display;
        if (Dom.detailsCountUnidadeEl) Dom.detailsCountUnidadeEl.textContent = countData.unidade_nome_display;
        if (Dom.detailsCountSetorEl) Dom.detailsCountSetorEl.textContent = countData.setor_contagem;
        if (Dom.detailsCountTotalItemsEl) Dom.detailsCountTotalItemsEl.textContent = countData.total_itens;

        renderCountDetailsTable(countData.detalhes_contagem);

        if(Dom.countDetailsBackButtonEl) Dom.countDetailsBackButtonEl.onclick = showHistoricoContagensScreen;

        window.showScreen('screenCountDetails'); 

        if (Dom.btnDownloadDetailsPDFEl) Dom.btnDownloadDetailsPDFEl.onclick = () => {
            const pdfBlob = generatePdfContent(countData.detalhes_contagem, produtosCache, countData); 
            triggerDownload(`contagem_${countData.id}.pdf`, pdfBlob, 'application/pdf'); 
            showToast('PDF da contagem baixado!', 'success');
        };

        if (Dom.btnDownloadDetailsTXTEl) {
            Dom.btnDownloadDetailsTXTEl.onclick = () => {
                const txtContent = generateTxtContentForDownload(countData.detalhes_contagem, produtosCache);
                const nomeArquivo = generateCountFilename({
                    colaborador: countData.colaborador_nome_display,
                    setor: countData.setor_contagem,
                    unidade: countData.unidade_nome_display,
                    data: countData.created_at
                }, 'txt');
                triggerDownload(nomeArquivo, txtContent, 'text/plain');
                showToast('Arquivo TXT da contagem baixado!', 'success');
            };
        }

    } catch (e) {
        showToast(`Erro ao exibir detalhes da contagem: ${e.message}`, 'error');
        console.error('[Historico] Erro em showCountDetailsScreen:', e);
    } finally {
        hideLoader();
    }
}

function renderCountDetailsTable(detalhesContagem) {
    if (!Dom.detailsCountItemsTableBodyEl) return;
    Dom.detailsCountItemsTableBodyEl.innerHTML = '';

    if (!detalhesContagem || Object.keys(detalhesContagem).length === 0) {
        Dom.detailsCountItemsTableBodyEl.innerHTML = '<tr><td colspan="4">Nenhum item contado para esta contagem.</td></tr>';
        return;
    }

    const itemsArray = Object.entries(detalhesContagem)
        .map(([produtoId, quantidade]) => {
            const produto = produtosCache.find(p => String(p.id) === String(produtoId));
            return {
                codigo: produto ? produto.codigo : 'N/A',
                nome_produto: produto ? produto.nome_produto : 'Produto Desconhecido',
                categoria: (produto && produto.produtos_categorias && produto.produtos_categorias.length > 0) 
                            ? produto.produtos_categorias.map(pc => pc.nome_categoria).join(', ') : 'N/A',
                quantidade: quantidade
            };
        })
        .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '')); 

    itemsArray.forEach(item => {
        const row = Dom.detailsCountItemsTableBodyEl.insertRow();
        row.innerHTML = `
            <td>${item.codigo}</td>
            <td>${item.nome_produto}</td>
            <td>${item.categoria}</td>
            <td>${item.quantidade}</td>
        `; 
    });
}
