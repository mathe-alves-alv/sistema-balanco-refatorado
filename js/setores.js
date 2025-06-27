// js/setores.js (Versão com Unidade Vinculada e Redirecionamento Corrigido)

import { _supabaseClient } from './supabase-client.js';
import { showLoader, hideLoader, showToast } from './ui-manager.js';
import { 
    addSetorFormEl, nomeSetorInputEl, setoresTableBodyEl, btnSetoresBackEl,
    selectUnidadeSetorEl 
} from './dom-selectors.js';
import { showAdminDashboardScreen, showInventoryCountScreenProtected } from './auth.js'; 
import { unidadesCache } from './data-cache.js'; 

let currentEditSetorId = null; // Para futura funcionalidade de edição

export async function showSetoresScreen() {
    console.log('[Setores] showSetoresScreen chamada.');
    showLoader();
    try {
        await loadUnidadesForSetorForm(); // Carregar unidades para o formulário
        await fetchAndRenderSetores();
        window.showScreen('screenSetores');
        console.log('[Setores] Tela de Gerenciar Setores exibida.');

        if(btnSetoresBackEl) {
            btnSetoresBackEl.onclick = showAdminDashboardScreen;
        }

    } catch (e) {
        showToast(`Erro ao carregar tela de setores: ${e.message}`, 'error');
        console.error('[Setores] Erro em showSetoresScreen:', e);
    } finally {
        hideLoader();
    }
}

// Função para carregar e popular o select de unidades para o formulário de setor
async function loadUnidadesForSetorForm() {
    console.log('[Setores] Carregando unidades para o formulário de setor...');
    if (!selectUnidadeSetorEl) {
        console.warn('[Setores] Elemento selectUnidadeSetorEl não encontrado.');
        return;
    }
    selectUnidadeSetorEl.innerHTML = '<option value="">-- Carregando Unidades --</option>'; // Opção temporária
    try {
        const { data, error } = await _supabaseClient.from('unidades').select('id, nome_unidade').order('nome_unidade');
        if (error) throw error;
        unidadesCache.splice(0, unidadesCache.length, ...(data || [])); // Atualiza o cache de unidades

        selectUnidadeSetorEl.innerHTML = '<option value="">-- Selecione a Unidade --</option>'; // Opção padrão
        if (unidadesCache.length === 0) {
            selectUnidadeSetorEl.innerHTML = '<option value="">Nenhuma unidade cadastrada.</option>';
        } else {
            unidadesCache.forEach(unit => {
                selectUnidadeSetorEl.add(new Option(unit.nome_unidade, unit.id));
            });
        }
        console.log('[Setores] Select de unidades para setor populado.');
    } catch (e) {
        console.error('[Setores] Erro ao carregar unidades para o formulário de setor:', e);
        showToast('Erro ao carregar unidades para seleção de setor.', 'error');
        selectUnidadeSetorEl.innerHTML = '<option value="">Erro ao carregar unidades</option>';
    }
}


async function fetchAndRenderSetores() {
    console.log('[Setores] Buscando e renderizando setores...');
    if (!setoresTableBodyEl) {
        console.warn('[Setores] Elemento setoresTableBodyEl não encontrado.');
        return;
    }
    // Ajuste o colspan para 4 (Nome, Unidade, Criação, Ações) se adicionar a coluna Unidade
    setoresTableBodyEl.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>'; 
    try {
        const { data, error } = await _supabaseClient.from('setores')
            .select('id, nome_setor, created_at, unidade_id, unidades(nome_unidade)') 
            .order('nome_setor');

        if (error) throw error;
        
        setoresTableBodyEl.innerHTML = "";

        if (data.length > 0) {
            data.forEach(setor => {
                const row = setoresTableBodyEl.insertRow();
                const unidadeNome = setor.unidades ? setor.unidades.nome_unidade : 'N/A'; 
                row.innerHTML = `
                    <td>${setor.nome_setor}</td>
                    <td>${unidadeNome}</td> 
                    <td>${new Date(setor.created_at).toLocaleDateString('pt-BR')}</td>
                    <td class="actions-cell">
                        <button class="btn btn-sm btn-danger btn-delete-setor" data-setor-id="${setor.id}" data-setor-name="${setor.nome_setor}">Excluir</button>
                    </td>
                `;
            });
        } else {
            setoresTableBodyEl.innerHTML = '<tr><td colspan="4">Nenhum setor cadastrado.</td></tr>'; 
        }
        console.log('[Setores] Tabela de setores renderizada.');
    } catch (e) {
        showToast(`Erro ao buscar setores: ${e.message}`, 'error');
        console.error('[Setores] Erro em fetchAndRenderSetores:', e);
        setoresTableBodyEl.innerHTML = `<tr><td colspan="4" style="color:red;">Erro ao carregar setores: ${e.message}</td></tr>`; 
    } finally {
        hideLoader();
    }
}

export async function handleAddSetor(event) {
    event.preventDefault(); 
    const nomeSetor = nomeSetorInputEl.value.trim();
    const unidadeId = selectUnidadeSetorEl.value; 

    console.log('[Setores] Tentando adicionar setor. Nome:', nomeSetor, 'Unidade ID:', unidadeId);

    if (!nomeSetor) {
        showToast('Digite o nome do setor.', 'error'); 
        return;
    }
    if (!unidadeId) { 
        showToast('Selecione uma unidade para o setor.', 'error');
        return;
    }

    showLoader();
    try {
        const { data: existing } = await _supabaseClient.from('setores').select('id').eq('nome_setor', nomeSetor).maybeSingle();
        if (existing) {
            throw new Error('Um setor com este nome já existe.');
        }

        const { data: newSetor, error } = await _supabaseClient.from('setores').insert({ nome_setor: nomeSetor, unidade_id: unidadeId }).select('id').single(); 
        if (error) throw error;
        console.log('[Setores] Setor criado:', newSetor);

        showToast('Setor adicionado com sucesso!', 'success');
        nomeSetorInputEl.value = ''; 
        selectUnidadeSetorEl.value = ''; 
        await fetchAndRenderSetores(); // Atualiza a lista na tela de setores

        // --- CORREÇÃO: REMOVIDO O REDIRECIONAMENTO PARA A TELA DE CONTAGEM ---
        // console.log('[Setores] Redirecionando para a tela de contagem após adicionar setor.');
        // showInventoryCountScreenProtected(); 
        // --------------------------------------------------------------------

    } catch (e) {
        showToast(`Falha ao adicionar setor: ${e.message}`, 'error');
        console.error('[Setores] Erro em handleAddSetor:', e);
    } finally {
        hideLoader();
    }
}

// Event listener para a tabela de setores (para exclusão)
if (setoresTableBodyEl) {
    setoresTableBodyEl.addEventListener('click', async (event) => {
        const target = event.target;

        if (target.classList.contains('btn-delete-setor')) {
            const setorIdToDelete = target.dataset.setorId;
            const setorNameToDelete = target.dataset.setorName;

            if (confirm(`Tem certeza que deseja remover o setor "${setorNameToDelete}"? Esta ação não pode ser desfeita.`)) {
                showLoader();
                try {
                    console.log('[Setores] Excluindo setor ID:', setorIdToDelete);
                    const { error } = await _supabaseClient.from('setores').delete().eq('id', setorIdToDelete);
                    if (error) throw error;
                    
                    showToast("Setor removido com sucesso.", "success");
                    await fetchAndRenderSetores(); 
                } catch (error) {
                    showToast(`Erro ao remover setor: ${error.message}`, 'error');
                    console.error('[Setores] Erro na remoção do setor:', error);
                } finally {
                    hideLoader();
                }
            }
        } 
    });
}

// Event listener para o formulário de adicionar setor
if (addSetorFormEl) {
    addSetorFormEl.addEventListener('submit', handleAddSetor);
}