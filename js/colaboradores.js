// js/colaboradores.js

import { showLoader, hideLoader, showScreen } from './ui-manager.js';
import { 
    colaboradoresEmpresaNomeSpan, colaboradorNomeInput, colaboradoresTableBody, colaboradorUnidadesMultiSelect
} from './dom-selectors.js';
import { appState } from './state.js'; // Importa o appState
import { unidadesCache } from './data-cache.js'; // Importa unidadesCache
import { showAdminMasterDashboardScreen, showEmpresaDashboardScreen } from './auth.js'; // Para navegação de volta
import { showManageEmpresasAndUsersScreen_Admin } from './admin/empresas.js'; // Para voltar do contexto admin


// Variáveis de estado para o modal de edição de unidades do colaborador (podem ser movidas para o state.js se necessário)
let currentEditColaboradorId = null;
let currentEditColaboradorEmpresaId = null;


/**
 * Exibe a tela de gerenciamento de colaboradores para uma empresa específica.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string|null} empresaIdParaAdmin O ID da empresa (se chamado pelo admin).
 * @param {string|null} nomeEmpresaParaAdmin O nome da empresa (se chamado pelo admin).
 * @param {boolean} isAdminCalling Indica se a função foi chamada pelo Admin Master.
 */
export async function showEmpresaColaboradoresScreen(_supabaseClient, empresaIdParaAdmin = null, nomeEmpresaParaAdmin = null, isAdminCalling = false) {
    let targetEmpresaId = null;
    let targetEmpresaNome = null;

    if (isAdminCalling && appState.currentUser?.role === 'admin_master') {
        if (!empresaIdParaAdmin) {
            alert("Admin: ID da empresa não fornecido para gerenciar colaboradores.");
            // Volta para a tela de gerenciamento de empresas do admin
            showManageEmpresasAndUsersScreen_Admin(_supabaseClient); 
            return;
        }
        targetEmpresaId = empresaIdParaAdmin;
        targetEmpresaNome = nomeEmpresaParaAdmin || `Empresa ID: ${empresaIdParaAdmin}`;
    } else if (!isAdminCalling && (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal')) {
        targetEmpresaId = appState.currentUser.empresa_id;
        targetEmpresaNome = appState.currentUser.empresa_nome;
    } else {
        alert("Acesso negado à gestão de colaboradores.");
        showScreen('login', {}, appState.currentUser); // Fallback seguro
        return;
    }

    console.log(`showEmpresaColaboradoresScreen for Company ID: ${targetEmpresaId}, Name: ${targetEmpresaNome}`);
    showLoader();
    try {
        if (colaboradoresEmpresaNomeSpan) colaboradoresEmpresaNomeSpan.textContent = targetEmpresaNome || 'Empresa';
        
        // Carrega as unidades para o multi-select de adição/edição de colaboradores
        await loadUnidadesForMultiSelect(_supabaseClient, targetEmpresaId);
        // Busca e renderiza os colaboradores da empresa
        await fetchAndRenderColaboradores(_supabaseClient, targetEmpresaId);
        
        showScreen('empresaColaboradores', {
            title: `Gerenciar Colaboradores (${targetEmpresaNome || 'Sua Empresa'})`,
            context: `Gerencie os colaboradores de ${targetEmpresaNome || 'sua empresa'}.`
        }, appState.currentUser); // Passa appState.currentUser

        // Configura o botão de voltar dinamicamente
        const backBtn = document.getElementById('colaboradoresBackButton');
        if(backBtn) {
            // Remove qualquer listener anterior para evitar duplicação
            if(backBtn.currentListener) {
                backBtn.removeEventListener('click', backBtn.currentListener);
            }
            if (isAdminCalling) {
                backBtn.currentListener = () => showManageEmpresasAndUsersScreen_Admin(_supabaseClient);
            } else {
                backBtn.currentListener = () => showEmpresaDashboardScreen(appState.currentUser); // Passa appState.currentUser para showEmpresaDashboardScreen
            }
            backBtn.addEventListener('click', backBtn.currentListener);
        }

    } catch (e) {
        console.error("Erro em showEmpresaColaboradoresScreen:", e);
        alert("Erro ao carregar tela de colaboradores.");
    } finally {
        hideLoader();
    }
}

/**
 * Popula o multi-select de unidades para a tela de colaboradores.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaId O ID da empresa para buscar as unidades.
 */
async function loadUnidadesForMultiSelect(_supabaseClient, empresaId) {
    if (!colaboradorUnidadesMultiSelect) {
        console.warn("colaboradorUnidadesMultiSelect not found.");
        return;
    }
    colaboradorUnidadesMultiSelect.innerHTML = '<span class="empty-message">Carregando unidades...</span>';
    unidadesCache.splice(0, unidadesCache.length); // Limpa o cache de unidades

    if (!empresaId) {
        colaboradorUnidadesMultiSelect.innerHTML = '<span class="empty-message">Nenhuma unidade disponível. Selecione uma empresa.</span>';
        return;
    }

    try {
        const { data, error } = await _supabaseClient.from('unidades')
            .select('id, nome_unidade')
            .eq('empresa_id', empresaId)
            .order('nome_unidade');

        if (error) throw error;
        unidadesCache.splice(0, unidadesCache.length, ...(data || [])); // Preenche o cache
        colaboradorUnidadesMultiSelect.innerHTML = ''; // Limpa a mensagem de carregamento

        if (unidadesCache.length === 0) {
            colaboradorUnidadesMultiSelect.innerHTML = '<span class="empty-message">Nenhuma unidade cadastrada para esta empresa.</span>';
        } else {
            unidadesCache.forEach(unit => {
                const div = document.createElement('div');
                div.className = 'checkbox-group';
                div.innerHTML = `
                    <input type="checkbox" id="colab-unit-${unit.id}" value="${unit.id}">
                    <label for="colab-unit-${unit.id}">${unit.nome_unidade}</label>
                `;
                colaboradorUnidadesMultiSelect.appendChild(div);
            });
        }
    } catch (e) {
        console.error("Erro ao carregar unidades para multi-select de colaborador:", e);
        colaboradorUnidadesMultiSelect.innerHTML = `<span class="empty-message" style="color:var(--danger-color);">Erro ao carregar unidades: ${e.message}</span>`;
    }
}

/**
 * Busca e renderiza a lista de colaboradores para uma empresa específica.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaId O ID da empresa para buscar colaboradores.
 */
export async function fetchAndRenderColaboradores(_supabaseClient, empresaId) {
    if (!colaboradoresTableBody) { console.error("colaboradoresTableBody not found"); return; }
    colaboradoresTableBody.innerHTML = '<tr><td colspan="5">Carregando colaboradores...</td></tr>';
    
    if (!empresaId) {
        colaboradoresTableBody.innerHTML = '<tr><td colspan="5">ID da empresa não fornecido.</td></tr>';
        hideLoader();
        return;
    }
    showLoader();
    try {
        // Busca colaboradores e suas unidades associadas através da tabela de junção
        const { data, error } = await _supabaseClient.from('colaboradores')
            .select('id, nome_colaborador, created_at, ativo, colaboradores_unidades(unidade_id)')
            .eq('empresa_id', empresaId)
            .order('nome_colaborador');

        if (error) throw error;

        // Note: colaboradoresCache é um cache local para esta tela, não é global como empresasCache
        // Se precisar de um cache global de colaboradores, mova essa let para data-cache.js
        const colaboradoresCacheLocal = data || []; 
        colaboradoresTableBody.innerHTML = "";

        if (colaboradoresCacheLocal.length > 0) {
            colaboradoresCacheLocal.forEach(colab => {
                const row = colaboradoresTableBody.insertRow();
                row.insertCell().textContent = colab.nome_colaborador;

                // Mapeia os IDs das unidades associadas para seus nomes
                const unitsCell = row.insertCell();
                const assignedUnitNames = (colab.colaboradores_unidades || [])
                    .map(cu => unidadesCache.find(u => u.id === cu.unidade_id)?.nome_unidade)
                    .filter(Boolean); // Remove null/undefined se a unidade não for encontrada no cache
                unitsCell.textContent = assignedUnitNames.length > 0 ? assignedUnitNames.join(', ') : 'Nenhuma';

                row.insertCell().textContent = colab.ativo ? 'Sim' : 'Não';
                row.insertCell().textContent = new Date(colab.created_at).toLocaleDateString('pt-BR');

                const actionsCell = row.insertCell();
                const btnEditUnits = document.createElement('button');
                btnEditUnits.textContent = 'Editar Unidades';
                btnEditUnits.className = 'btn btn-info table-actions';
                btnEditUnits.onclick = () => showEditColaboradorUnitsModal(_supabaseClient, colab.id, colab.nome_colaborador, colab.colaboradores_unidades.map(cu => cu.unidade_id), empresaId);
                actionsCell.appendChild(btnEditUnits);

                const btnToggleAtivo = document.createElement('button');
                btnToggleAtivo.textContent = colab.ativo ? 'Desativar' : 'Ativar';
                btnToggleAtivo.className = `btn ${colab.ativo ? 'btn-warning' : 'btn-success'} table-actions`;
                btnToggleAtivo.onclick = () => handleToggleAtivoColaborador(_supabaseClient, colab.id, !colab.ativo, empresaId);
                actionsCell.appendChild(btnToggleAtivo);

                const btnDelete = document.createElement('button');
                btnDelete.textContent = 'Excluir';
                btnDelete.className = 'btn btn-danger table-actions';
                btnDelete.onclick = () => handleDeleteColaborador(_supabaseClient, colab.id, colab.nome_colaborador, empresaId);
                actionsCell.appendChild(btnDelete);
            });
        } else {
            colaboradoresTableBody.innerHTML = '<tr><td colspan="5">Nenhum colaborador cadastrado para esta empresa.</td></tr>';
        }
    } catch (e) {
        console.error("Erro ao buscar/renderizar colaboradores:", e);
        colaboradoresTableBody.innerHTML = `<tr><td colspan="5" style="color:var(--danger-color);">Erro ao carregar: ${e.message}</td></tr>`;
    } finally {
        hideLoader();
    }
}

/**
 * Lida com a adição de um novo colaborador.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function handleAddColaborador(_supabaseClient) {
    if (!colaboradorNomeInput || !colaboradorUnidadesMultiSelect) {
        alert("Erro: Campos do formulário de colaborador não encontrados.");
        return;
    }

    const nomeColaborador = colaboradorNomeInput.value.trim();
    // Colaboradores são sempre da empresa do usuário logado (gerente)
    const empresaId = appState.currentUser?.empresa_id || appState.adminSelectedEmpresaContextId; 
    const selectedUnitIds = Array.from(colaboradorUnidadesMultiSelect.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

    if (!empresaId) {
        alert("Erro: ID da empresa não identificado para adicionar colaborador.");
        return;
    }
    if (!nomeColaborador) {
        alert('Digite o nome do colaborador.');
        return;
    }
    if (selectedUnitIds.length === 0) {
        alert('Selecione pelo menos uma unidade para o colaborador.');
        return;
    }

    showLoader();
    try {
        // Verifica se o colaborador já existe para a empresa
        const { data: existing, error: checkError } = await _supabaseClient.from('colaboradores')
            .select('id')
            .eq('nome_colaborador', nomeColaborador)
            .eq('empresa_id', empresaId)
            .maybeSingle();

        if (checkError) throw checkError;
        if (existing) {
            alert('Um colaborador com este nome já existe nesta empresa.');
            hideLoader();
            return;
        }

        // Insere o colaborador
        const { data: newColaborador, error } = await _supabaseClient.from('colaboradores')
            .insert([{ nome_colaborador: nomeColaborador, empresa_id: empresaId, ativo: true }])
            .select('id')
            .single();

        if (error) throw error;

        // Insere na tabela de junção (colaboradores_unidades)
        const linksToInsert = selectedUnitIds.map(unitId => ({
            colaborador_id: newColaborador.id,
            unidade_id: unitId
        }));

        const { error: linkError } = await _supabaseClient.from('colaboradores_unidades')
            .insert(linksToInsert);

        if (linkError) {
            // Se a vinculação falhar, tenta reverter a criação do colaborador
            await _supabaseClient.from('colaboradores').delete().eq('id', newColaborador.id).catch(e => console.error("Erro ao reverter criação de colaborador:", e));
            throw linkError;
        }

        alert('Colaborador adicionado com sucesso!');
        colaboradorNomeInput.value = '';
        // Desmarca todos os checkboxes no multi-select
        colaboradorUnidadesMultiSelect.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

        await fetchAndRenderColaboradores(_supabaseClient, empresaId);
    } catch (e) {
        console.error("Erro ao adicionar colaborador:", e);
        alert('Falha ao adicionar colaborador: ' + e.message);
    } finally {
        hideLoader();
    }
}

/**
 * Lida com a exclusão de um colaborador.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} colaboradorId O ID do colaborador a ser excluído.
 * @param {string} nomeColaborador O nome do colaborador (para confirmação).
 * @param {string} empresaId O ID da empresa à qual o colaborador pertence.
 */
export async function handleDeleteColaborador(_supabaseClient, colaboradorId, nomeColaborador, empresaId) {
    if (!confirm(`Tem certeza que deseja excluir o colaborador "${nomeColaborador}"? Esta ação também removerá suas associações com unidades e registros de contagem.`)) {
        return;
    }
    showLoader();
    try {
        // Verifica se o colaborador tem registros em 'contagens'
        const { count: contagemCount, error: contagemCheckError } = await _supabaseClient
            .from('contagens')
            .select('id', { count: 'exact', head: true })
            .eq('colaborador_id', colaboradorId);

        if (contagemCheckError) throw contagemCheckError;
        if (contagemCount && contagemCount > 0) {
            alert(`Não é possível excluir o colaborador "${nomeColaborador}" pois ele possui ${contagemCount} registro(s) de contagem associado(s).`);
            hideLoader(); return;
        }

        // Primeiro, remove as associações na tabela 'colaboradores_unidades'
        const { error: linkDeleteError } = await _supabaseClient.from('colaboradores_unidades')
            .delete()
            .eq('colaborador_id', colaboradorId);
        if (linkDeleteError) {
            console.error("Erro ao deletar links de unidades do colaborador:", linkDeleteError);
            throw new Error(`Falha ao remover associações de unidades para o colaborador: ${linkDeleteError.message}`);
        }

        // Em seguida, remove o colaborador da tabela 'colaboradores'
        const { error: colabDeleteError } = await _supabaseClient.from('colaboradores')
            .delete()
            .eq('id', colaboradorId);
        if (colabDeleteError) throw colabDeleteError;

        alert(`Colaborador "${nomeColaborador}" excluído com sucesso!`);
        await fetchAndRenderColaboradores(_supabaseClient, empresaId);
    } catch (e) {
        console.error("Erro ao excluir colaborador:", e);
        alert('Falha ao excluir colaborador: ' + e.message);
    } finally {
        hideLoader();
    }
}

/**
 * Altera o status 'ativo' de um colaborador.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} colaboradorId O ID do colaborador a ser alterado.
 * @param {boolean} novoEstadoAtivo O novo estado (true para ativo, false para inativo).
 * @param {string} empresaId O ID da empresa à qual o colaborador pertence.
 */
export async function handleToggleAtivoColaborador(_supabaseClient, colaboradorId, novoEstadoAtivo, empresaId) {
    if (!confirm(`Tem certeza que deseja ${novoEstadoAtivo ? 'ATIVAR' : 'DESATIVAR'} este colaborador?`)) return;
    showLoader();
    try {
        const { error } = await _supabaseClient.from('colaboradores')
            .update({ ativo: novoEstadoAtivo })
            .eq('id', colaboradorId);
        if (error) throw error;
        alert(`Colaborador ${novoEstadoAtivo ? 'ativado' : 'desativado'} com sucesso!`);
        await fetchAndRenderColaboradores(_supabaseClient, empresaId);
    } catch (e) {
        console.error(`Erro ao ${novoEstadoAtivo ? 'ativar' : 'desativar'} colaborador:`, e);
        alert(`Falha: ${e.message}`);
    } finally {
        hideLoader();
    }
}


// --- Funções para o Modal de Edição de Unidades de Colaborador ---
/**
 * Exibe o modal para edição das unidades associadas a um colaborador.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} colaboradorId O ID do colaborador a ser editado.
 * @param {string} colaboradorNome O nome do colaborador.
 * @param {string[]} currentUnitIds Array de IDs das unidades atualmente associadas.
 * @param {string} empresaId O ID da empresa à qual o colaborador pertence.
 */
export function showEditColaboradorUnitsModal(_supabaseClient, colaboradorId, colaboradorNome, currentUnitIds, empresaId) {
    currentEditColaboradorId = colaboradorId; // Variáveis de estado local para o modal
    currentEditColaboradorEmpresaId = empresaId; // Variáveis de estado local para o modal

    // Cria o overlay e o conteúdo do modal dinamicamente
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay active'; // Começa ativo para exibir
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <h4>Editar Unidades para "${colaboradorNome}"</h4>
            <div id="editColaboradorUnitsMultiSelect" class="multi-select-container">
                <span class="empty-message">Carregando unidades...</span>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="btnCancelEditUnits">Cancelar</button>
                <button class="btn btn-primary" id="btnSaveColaboradorUnits">Salvar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    const editSelectContainer = modalOverlay.querySelector('#editColaboradorUnitsMultiSelect');
    if (editSelectContainer) {
        editSelectContainer.innerHTML = '';
        if (unidadesCache.length === 0) { // Usa o cache global de unidades
            editSelectContainer.innerHTML = '<span class="empty-message">Nenhuma unidade disponível.</span>';
        } else {
            unidadesCache.forEach(unit => {
                const div = document.createElement('div');
                div.className = 'checkbox-group';
                const isChecked = currentUnitIds.includes(unit.id); // Verifica se a unidade já está associada
                div.innerHTML = `
                    <input type="checkbox" id="edit-colab-unit-${unit.id}" value="${unit.id}" ${isChecked ? 'checked' : ''}>
                    <label for="edit-colab-unit-${unit.id}">${unit.nome_unidade}</label>
                `;
                editSelectContainer.appendChild(div);
            });
        }
    }

    // Adiciona event listeners para os botões do modal
    modalOverlay.querySelector('#btnCancelEditUnits')?.addEventListener('click', () => {
        document.body.removeChild(modalOverlay); // Remove o modal do DOM
    });
    modalOverlay.querySelector('#btnSaveColaboradorUnits')?.addEventListener('click', () => {
        handleSaveColaboradorUnits(_supabaseClient, colaboradorId, empresaId, modalOverlay); // Passa _supabaseClient
    });
}

/**
 * Lida com o salvamento das unidades selecionadas para um colaborador no modal de edição.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} colaboradorId O ID do colaborador a ser atualizado.
 * @param {string} empresaId O ID da empresa à qual o colaborador pertence.
 * @param {HTMLElement} modalOverlay A referência ao elemento modal overlay para fechá-lo.
 */
async function handleSaveColaboradorUnits(_supabaseClient, colaboradorId, empresaId, modalOverlay) {
    showLoader();
    const selectedUnitIds = Array.from(modalOverlay.querySelectorAll('#editColaboradorUnitsMultiSelect input[type="checkbox"]:checked')).map(cb => cb.value);

    try {
        // 1. Deleta todas as associações existentes para este colaborador na tabela de junção
        const { error: deleteError } = await _supabaseClient.from('colaboradores_unidades')
            .delete()
            .eq('colaborador_id', colaboradorId);
        if (deleteError) throw deleteError;

        // 2. Insere as novas associações (se houver unidades selecionadas)
        if (selectedUnitIds.length > 0) {
            const linksToInsert = selectedUnitIds.map(unitId => ({
                colaborador_id: colaboradorId,
                unidade_id: unitId
            }));
            const { error: insertError } = await _supabaseClient.from('colaboradores_unidades')
                .insert(linksToInsert);
            if (insertError) throw insertError;
        }

        alert('Unidades do colaborador atualizadas com sucesso!');
        document.body.removeChild(modalOverlay); // Fecha o modal
        await fetchAndRenderColaboradores(_supabaseClient, empresaId); // Re-renderiza a tabela de colaboradores
    } catch (e) {
        console.error("Erro ao salvar unidades do colaborador:", e);
        alert('Falha ao atualizar unidades do colaborador: ' + e.message);
    } finally {
        hideLoader();
    }
}