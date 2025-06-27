// js/colaboradores.js (Versão Final para Fazer Adição Funcionar e Limpeza)

import { _supabaseClient } from './supabase-client.js';
import { state } from './state.js';
import { showLoader, hideLoader, showToast } from './ui-manager.js'; 
import { 
    colaboradorNomeInputEl, colaboradoresTableBodyEl, 
    colaboradorUnidadesMultiSelectEl, colaboradoresBackButtonEl,
    addColaboradorFormEl 
} from './dom-selectors.js';
import { unidadesCache } from './data-cache.js';
import { showAdminDashboardScreen } from './auth.js'; 

let currentEditColaboradorId = null;

export async function showEmpresaColaboradoresScreen() {
    console.log('[Colaboradores] showEmpresaColaboradoresScreen chamada.');
    showLoader();
    try {
        // A linha que definia "da Empresa" foi removida, assumindo que o texto já está no HTML
        // if (colaboradoresEmpresaNomeEl) colaboradoresEmpresaNomeEl.textContent = "Gerenciar Colaboradores"; 
        
        await loadUnidadesForMultiSelect();
        await fetchAndRenderColaboradores();
        
        window.showScreen('screenEmpresaColaboradores');
        console.log('[Colaboradores] Tela de Gerenciar Colaboradores exibida.');

        if(colaboradoresBackButtonEl) {
            colaboradoresBackButtonEl.onclick = showAdminDashboardScreen;
        }

    } catch (e) {
        showToast(`Erro ao carregar tela de colaboradores: ${e.message}`, 'error');
        console.error('[Colaboradores] Erro em showEmpresaColaboradoresScreen:', e);
    } finally {
        hideLoader();
    }
}

async function loadUnidadesForMultiSelect() {
    console.log('[Colaboradores] Carregando unidades para o multi-select...');
    if (!colaboradorUnidadesMultiSelectEl) {
        console.warn('[Colaboradores] Elemento colaboradorUnidadesMultiSelectEl não encontrado.');
        return;
    }
    colaboradorUnidadesMultiSelectEl.innerHTML = '<span class="empty-message">Carregando unidades...</span>';
    
    try {
        const { data, error } = await _supabaseClient.from('unidades').select('id, nome_unidade').order('nome_unidade');
        if (error) throw error;
        unidadesCache.splice(0, unidadesCache.length, ...data);

        colaboradorUnidadesMultiSelectEl.innerHTML = '';
        if (unidadesCache.length === 0) {
            colaboradorUnidadesMultiSelectEl.innerHTML = '<span class="empty-message">Nenhuma unidade cadastrada.</span>';
        } else {
            unidadesCache.forEach(unit => {
                const div = document.createElement('div');
                div.className = 'checkbox-group';
                div.innerHTML = `<input type="checkbox" id="colab-unit-${unit.id}" value="${unit.id}"><label for="colab-unit-${unit.id}">${unit.nome_unidade}</label>`;
                colaboradorUnidadesMultiSelectEl.appendChild(div);
            });
        }
        console.log('[Colaboradores] Multi-select de unidades populado.');
    } catch (e) {
        colaboradorUnidadesMultiSelectEl.innerHTML = `<span class="empty-message" style="color:red;">Erro ao carregar unidades.</span>`;
        console.error('[Colaboradores] Erro em loadUnidadesForMultiSelect:', e);
    }
}

async function fetchAndRenderColaboradores() {
    console.log('[Colaboradores] Buscando e renderizando colaboradores...');
    if (!colaboradoresTableBodyEl) {
        console.warn('[Colaboradores] Elemento colaboradoresTableBodyEl não encontrado.');
        return;
    }
    // Colspan ajustado para 4: Nome, Unidades, Ativo, Ações (Criação foi removida da exibição)
    colaboradoresTableBodyEl.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>'; 
    try {
        const { data, error } = await _supabaseClient.from('colaboradores')
            .select('id, nome_colaborador, created_at, ativo, colaboradores_unidades(unidades(id, nome_unidade))')
            .order('nome_colaborador');

        if (error) throw error;
        
        colaboradoresTableBodyEl.innerHTML = "";

        if (data.length > 0) {
            data.forEach(colab => {
                const row = colaboradoresTableBodyEl.insertRow();
                const assignedUnitNames = (colab.colaboradores_unidades || [])
                    .map(item => item.unidades ? item.unidades.nome_unidade : null) 
                    .filter(Boolean); 

                row.innerHTML = `
                    <td>${colab.nome_colaborador}</td>
                    <td>${assignedUnitNames.length > 0 ? assignedUnitNames.join(', ') : 'Nenhuma'}</td>
                    <td>${colab.ativo ? 'Sim' : 'Não'}</td>
                    <td>${new Date(colab.created_at).toLocaleDateString('pt-BR')}</td>
                    <td class="actions-cell">
                        <button class="btn btn-sm ${colab.ativo ? 'btn-warning' : 'btn-success'} btn-toggle-ativo" data-colab-id="${colab.id}" data-new-state="${!colab.ativo}">${colab.ativo ? 'Desativar' : 'Ativar'}</button>
                        <button class="btn btn-sm btn-danger btn-delete-colab" data-colab-id="${colab.id}" data-colab-name="${colab.nome_colaborador}">Excluir</button>
                    </td>
                `;
            });
        } else {
            colaboradoresTableBodyEl.innerHTML = '<tr><td colspan="4">Nenhum colaborador cadastrado.</td></tr>'; 
        }
        console.log('[Colaboradores] Tabela de colaboradores renderizada.');
    } catch (e) {
        showToast(`Erro ao buscar colaboradores: ${e.message}`, 'error');
        console.error('[Colaboradores] Erro em fetchAndRenderColaboradores:', e);
        colaboradoresTableBodyEl.innerHTML = `<tr><td colspan="4" style="color:red;">Erro ao carregar colaboradores: ${e.message}</td></tr>`; 
    } finally {
        hideLoader();
    }
}

export async function handleAddColaborador(event) {
    event.preventDefault(); 
    const nomeColaborador = colaboradorNomeInputEl.value.trim();
    const selectedUnitIds = Array.from(colaboradorUnidadesMultiSelectEl.querySelectorAll('input:checked')).map(cb => cb.value);

    console.log('[Colaboradores] Tentando adicionar colaborador. Dados:', { nomeColaborador, selectedUnitIds });

    if (!nomeColaborador) {
        showToast('Digite o nome do colaborador.', 'error'); 
        return;
    }
    if (selectedUnitIds.length === 0) {
        showToast('Selecione pelo menos uma unidade para o colaborador.', 'error'); 
        return;
    }

    showLoader();
    try {
        const { data: existing } = await _supabaseClient.from('colaboradores').select('id').eq('nome_colaborador', nomeColaborador).maybeSingle();
        if (existing) {
            throw new Error('Um colaborador com este nome já existe.');
        }

        const { data: newColab, error } = await _supabaseClient.from('colaboradores').insert({ nome_colaborador: nomeColaborador, ativo: true }).select('id').single();
        if (error) throw error;
        console.log('[Colaboradores] Colaborador principal criado:', newColab);

        const linksToInsert = selectedUnitIds.map(unitId => ({ colaborador_id: newColab.id, unidade_id: unitId }));
        console.log('[Colaboradores] Inserindo links de unidade:', linksToInsert);
        const { error: linkError } = await _supabaseClient.from('colaboradores_unidades').insert(linksToInsert);
        if (linkError) throw linkError;
        console.log('[Colaboradores] Links de unidade para colaborador inseridos.');

        showToast('Colaborador adicionado com sucesso!', 'success');
        colaboradorNomeInputEl.value = '';
        colaboradorUnidadesMultiSelectEl.querySelectorAll('input:checked').forEach(cb => cb.checked = false);
        await fetchAndRenderColaboradores(); 
    } catch (e) {
        showToast(`Falha ao adicionar colaborador: ${e.message}`, 'error');
        console.error('[Colaboradores] Erro em handleAddColaborador:', e);
    } finally {
        hideLoader();
    }
}

// Event listener para a tabela de colaboradores (para edição, ativação/desativação, exclusão)
if (colaboradoresTableBodyEl) {
    colaboradoresTableBodyEl.addEventListener('click', async (event) => {
        const target = event.target;

        // Lógica para Excluir Colaborador
        if (target.classList.contains('btn-delete-colab')) {
            const colabIdToDelete = target.dataset.colabId;
            const colabNameToDelete = target.dataset.colabName;

            if (confirm(`Tem certeza que deseja remover o colaborador "${colabNameToDelete}"? Esta ação removerá todas as associações de unidades e não pode ser desfeita.`)) {
                showLoader();
                try {
                    console.log('[Colaboradores] Excluindo associações de unidades do colaborador ID:', colabIdToDelete);
                    const { error: assocError } = await _supabaseClient.from('colaboradores_unidades').delete().eq('colaborador_id', colabIdToDelete);
                    if (assocError) throw assocError;
                    console.log('[Colaboradores] Associações de unidades excluídas.');

                    console.log('[Colaboradores] Excluindo colaborador principal ID:', colabIdToDelete);
                    const { error: colabError } = await _supabaseClient.from('colaboradores').delete().eq('id', colabIdToDelete);
                    if (colabError) throw colabError;
                    console.log('[Colaboradores] Colaborador principal excluído.');
                    
                    showToast("Colaborador removido com sucesso.", "success");
                    await fetchAndRenderColaboradores(); 
                } catch (error) {
                    showToast(`Erro ao remover colaborador: ${error.message}`, 'error');
                    console.error('[Colaboradores] Erro na remoção do colaborador:', error);
                } finally {
                    hideLoader();
                }
            }
        } 
        // Lógica para Ativar/Desativar Colaborador
        else if (target.classList.contains('btn-toggle-ativo')) {
            const colabIdToToggle = target.dataset.colabId;
            const newState = target.dataset.newState === 'true'; 

            showLoader();
            try {
                const { error } = await _supabaseClient.from('colaboradores')
                    .update({ ativo: newState })
                    .eq('id', colabIdToToggle);
                if (error) throw error;
                
                showToast(`Colaborador ${newState ? 'ativado' : 'desativado'} com sucesso!`, 'success');
                await fetchAndRenderColaboradores(); 
            } catch (error) {
                showToast(`Erro ao ${newState ? 'ativar' : 'desativar'} colaborador: ${error.message}`, 'error');
                console.error('[Colaboradores] Erro ao ativar/desativar colaborador:', error);
            } finally {
                hideLoader();
            }
        }
        // O bloco para 'Editar Unidades' foi removido deste arquivo.
    });
}

// Event listener para o formulário de adicionar colaborador
if (addColaboradorFormEl) {
    addColaboradorFormEl.addEventListener('submit', handleAddColaborador);
}