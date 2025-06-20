// js/unidades.js

import { showLoader, hideLoader, showScreen } from './ui-manager.js';
import { 
    unidadesTitleEl, adminUnidadeEmpresaSelectContainerEl, adminUnidadeEmpresaSelectEl,
    nomeUnidadeInputEl, unidadesTableBodyEl, btnAddUnidadeEl, unidadesContextEl,
    thUnidadeEmpresaScopeEl
} from './dom-selectors.js';
import { appState, setCurrentUser, setAdminSelectedEmpresaContextId, setIsEmpresaManagerManagingOwnUsers } from './state.js'; // Importa o appState e seus setters
import { empresasCache, populateEmpresasSelect, unidadesCache } from './data-cache.js'; // Importa unidadesCache também
import { showAdminMasterDashboardScreen, showEmpresaDashboardScreen } from './auth.js'; // Para navegação de volta


/**
 * Exibe a tela de gerenciamento de unidades.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string|null} empresaIdParaAdmin O ID da empresa (se chamado pelo admin).
 * @param {string|null} nomeEmpresaParaAdmin O nome da empresa (se chamado pelo admin).
 * @param {boolean} isAdminCalling Indica se a função foi chamada pelo Admin Master.
 */
export async function showUnidadesScreen(_supabaseClient, empresaIdParaAdmin = null, nomeEmpresaParaAdmin = null, isAdminCalling = false) {
    let targetEmpresaId = null;
    let targetEmpresaNome = null;

    if (isAdminCalling && appState.currentUser?.role === 'admin_master') {
        // Admin master pode gerenciar unidades de qualquer empresa
        if (!empresaIdParaAdmin) {
            // Se o admin não selecionou uma empresa ainda, mostra a tela e espera a seleção
            if(unidadesTitleEl) unidadesTitleEl.textContent = 'Gerenciar Unidades (Admin)';
            if(unidadesContextEl) unidadesContextEl.textContent = "Selecione uma empresa para gerenciar as unidades.";
            if(adminUnidadeEmpresaSelectContainerEl) adminUnidadeEmpresaSelectContainerEl.style.display = 'block';
            if(thUnidadeEmpresaScopeEl) thUnidadeEmpresaScopeEl.style.display = ''; // Exibe a coluna Empresa
            if(btnAddUnidadeEl) btnAddUnidadeEl.disabled = true; // Desabilita o botão adicionar até que uma empresa seja selecionada
            
            await populateEmpresasSelect(_supabaseClient, adminUnidadeEmpresaSelectEl, true, "-- Selecione uma Empresa --", "");
            // Garante que o listener seja adicionado apenas uma vez
            if (!adminUnidadeEmpresaSelectEl.onchangeAttached_unit_admin) {
                adminUnidadeEmpresaSelectEl.addEventListener('change', async () => {
                    const newEmpresaId = adminUnidadeEmpresaSelectEl.value === "" ? null : adminUnidadeEmpresaSelectEl.value;
                    setAdminSelectedEmpresaContextId(newEmpresaId); // Atualiza o estado global
                    const selectedEmpresa = empresasCache.find(e => e.id === newEmpresaId);
                    if(unidadesContextEl) unidadesContextEl.textContent = selectedEmpresa ? `Gerenciando unidades para: ${selectedEmpresa.nome_empresa}` : "Nenhuma empresa selecionada";
                    if(btnAddUnidadeEl) btnAddUnidadeEl.disabled = !newEmpresaId; // Habilita/Desabilita botão
                    await fetchAndRenderUnidades(_supabaseClient, newEmpresaId, true); // Passa o novo ID e flag de admin view
                });
                adminUnidadeEmpresaSelectEl.onchangeAttached_unit_admin = true; // Marca o listener como anexado
            }
            // Não faz o fetch inicial de unidades aqui, pois não há empresa selecionada por padrão
            showScreen('unidades', { title: 'Gerenciar Unidades (Admin)', context: 'Selecione uma empresa para gerenciar as unidades.', isEmpresaContext: false }, appState.currentUser);
            hideLoader();
            return;
        } else {
            // Admin master já selecionou uma empresa ou veio de um botão de 'unidades' de uma empresa específica
            targetEmpresaId = empresaIdParaAdmin;
            targetEmpresaNome = nomeEmpresaParaAdmin || `Empresa ID: ${empresaIdParaAdmin}`;
            setAdminSelectedEmpresaContextId(targetEmpresaId); // Atualiza o estado global
            if(adminUnidadeEmpresaSelectContainerEl) adminUnidadeEmpresaSelectContainerEl.style.display = 'block';
            if(thUnidadeEmpresaScopeEl) thUnidadeEmpresaScopeEl.style.display = ''; // Exibe a coluna Empresa
            if(btnAddUnidadeEl) btnAddUnidadeEl.disabled = false; // Habilita o botão adicionar
            
            await populateEmpresasSelect(_supabaseClient, adminUnidadeEmpresaSelectEl, true, "-- Selecione uma Empresa --", "");
            if (adminUnidadeEmpresaSelectEl) {
                adminUnidadeEmpresaSelectEl.value = targetEmpresaId;
                // Dispara o evento de mudança para carregar as unidades e atualizar o contexto
                if (!adminUnidadeEmpresaSelectEl.onchangeAttached_unit_admin) {
                     adminUnidadeEmpresaSelectEl.addEventListener('change', async () => {
                        const newEmpresaId = adminUnidadeEmpresaSelectEl.value === "" ? null : adminUnidadeEmpresaSelectEl.value;
                        setAdminSelectedEmpresaContextId(newEmpresaId); // Atualiza o estado global
                        const selectedEmpresa = empresasCache.find(e => e.id === newEmpresaId);
                        if(unidadesContextEl) unidadesContextEl.textContent = selectedEmpresa ? `Gerenciando unidades para: ${selectedEmpresa.nome_empresa}` : "Nenhuma empresa selecionada";
                        if(btnAddUnidadeEl) btnAddUnidadeEl.disabled = !newEmpresaId;
                        await fetchAndRenderUnidades(_supabaseClient, newEmpresaId, true);
                    });
                    adminUnidadeEmpresaSelectEl.onchangeAttached_unit_admin = true;
                }
                adminUnidadeEmpresaSelectEl.dispatchEvent(new Event('change')); // Simula a mudança
            }
        }
    } else if (!isAdminCalling && (appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal')) {
        // Gerente de empresa gerencia apenas as unidades da sua própria empresa
        targetEmpresaId = appState.currentUser.empresa_id;
        targetEmpresaNome = appState.currentUser.empresa_nome;
        setAdminSelectedEmpresaContextId(targetEmpresaId); // Define o contexto da empresa para a empresa do usuário
        if(adminUnidadeEmpresaSelectContainerEl) adminUnidadeEmpresaSelectContainerEl.style.display = 'none'; // Esconde o seletor de empresa
        if(thUnidadeEmpresaScopeEl) thUnidadeEmpresaScopeEl.style.display = 'none'; // Esconde a coluna Empresa
        if(btnAddUnidadeEl) btnAddUnidadeEl.disabled = false; // Habilita o botão adicionar
        if(unidadesContextEl) unidadesContextEl.textContent = `Gerenciando unidades para: ${appState.currentUser.empresa_nome || 'sua empresa'}`;
        await fetchAndRenderUnidades(_supabaseClient, targetEmpresaId, false);
    } else {
        alert("Acesso negado à gestão de unidades.");
        showScreen('login', {}, appState.currentUser); // Fallback seguro
        return;
    }

    console.log(`showUnidadesScreen for Company ID: ${targetEmpresaId}, Name: ${targetEmpresaNome}`);
    showLoader();
    try {
        if (unidadesTitleEl) unidadesTitleEl.textContent = `Gerenciar Unidades (${targetEmpresaNome || 'Geral'})`;
        
        showScreen('unidades', {
            title: `Gerenciar Unidades (${targetEmpresaNome || 'Geral'})`,
            context: unidadesContextEl.textContent,
            showEmpresaSelector: isAdminCalling, // Apenas admin vê o seletor
            isEmpresaContext: !isAdminCalling // Flag para configuração da tela (esconde/mostra coluna Empresa)
        }, appState.currentUser); // Passa appState.currentUser

    } catch (e) {
        console.error("Erro em showUnidadesScreen:", e);
        alert("Erro ao carregar tela de unidades.");
    } finally {
        hideLoader();
    }
}

/**
 * Busca e renderiza a lista de unidades para uma empresa específica.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaId O ID da empresa para buscar unidades.
 * @param {boolean} isAdminView Indica se a visualização é de admin (para mostrar a coluna 'Empresa').
 */
export async function fetchAndRenderUnidades(_supabaseClient, empresaId, isAdminView = false) {
    if (!unidadesTableBodyEl) { console.error("unidadesTableBodyEl not found"); return; }
    unidadesTableBodyEl.innerHTML = '<tr><td colspan="4">Carregando unidades...</td></tr>';
    
    if (!empresaId) {
        unidadesTableBodyEl.innerHTML = '<tr><td colspan="4">Selecione uma empresa para visualizar as unidades.</td></tr>';
        hideLoader(); 
        return;
    }

    showLoader();
    try {
        const { data, error } = await _supabaseClient.from('unidades')
            .select('id, nome_unidade, created_at, empresa_id, empresas(nome_empresa)')
            .eq('empresa_id', empresaId)
            .order('nome_unidade');

        if (error) throw error;

        unidadesCache.splice(0, unidadesCache.length, ...(data || [])); // Atualiza o cache global
        unidadesTableBodyEl.innerHTML = ""; // Limpa a tabela

        if (unidadesCache.length > 0) {
            unidadesCache.forEach(unidade => {
                const row = unidadesTableBodyEl.insertRow();
                row.insertCell().textContent = unidade.nome_unidade;
                
                // Exibe a coluna da empresa apenas se for a visão de admin e a coluna estiver visível
                if (isAdminView && thUnidadeEmpresaScopeEl && thUnidadeEmpresaScopeEl.style.display !== 'none') {
                    row.insertCell().textContent = unidade.empresas?.nome_empresa || `Empresa ID: ${unidade.empresa_id}`;
                } else if (!isAdminView && thUnidadeEmpresaScopeEl) {
                    // Se não é admin view e a coluna está oculta, adicione uma célula vazia para manter o alinhamento de colunas,
                    // ou remova o <th> correspondente no HTML se não for necessário para alinhamento.
                    // Por enquanto, o CSS `display: none` no <th> já deve gerenciar isso.
                }
                
                row.insertCell().textContent = new Date(unidade.created_at).toLocaleDateString('pt-BR');

                const actionsCell = row.insertCell();
                const btnDelete = document.createElement('button');
                btnDelete.textContent = 'Excluir';
                btnDelete.className = 'btn btn-danger table-actions';
                btnDelete.onclick = () => handleDeleteUnidade(_supabaseClient, unidade.id, unidade.nome_unidade, unidade.empresa_id); // Passa _supabaseClient
                actionsCell.appendChild(btnDelete);
            });
        } else {
            unidadesTableBodyEl.innerHTML = '<tr><td colspan="4">Nenhuma unidade cadastrada para esta empresa.</td></tr>';
        }
    } catch (e) {
        console.error("Erro ao buscar/renderizar unidades:", e);
        unidadesTableBodyEl.innerHTML = `<tr><td colspan="4" style="color:var(--danger-color);">Erro ao carregar: ${e.message}</td></tr>`;
    } finally {
        hideLoader();
    }
}

/**
 * Lida com a adição de uma nova unidade.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function handleAddUnidade(_supabaseClient) {
    if (!nomeUnidadeInputEl) {
        alert("Erro: Campo de nome da unidade não encontrado.");
        return;
    }
    const nomeUnidade = nomeUnidadeInputEl.value.trim();
    let empresaIdParaNovaUnidade = null;

    // Determina o ID da empresa com base no papel do usuário
    if (appState.currentUser.role === 'admin_master') {
        empresaIdParaNovaUnidade = adminUnidadeEmpresaSelectEl.value; // Pega do select
        if (!empresaIdParaNovaUnidade) {
            alert("Admin: Selecione uma empresa primeiro para adicionar a unidade.");
            return;
        }
    } else if (appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal') {
        empresaIdParaNovaUnidade = appState.currentUser.empresa_id;
        if (!empresaIdParaNovaUnidade) {
            alert("Erro: ID da sua empresa não encontrado. Não é possível adicionar unidade.");
            return;
        }
    } else {
        alert("Permissão negada para adicionar unidade.");
        return;
    }

    if (!nomeUnidade) {
        alert('Digite o nome da unidade.');
        return;
    }
    showLoader();
    try {
        // Verifica se a unidade já existe para a empresa
        const { data: existing, error: checkError } = await _supabaseClient.from('unidades')
            .select('id')
            .eq('nome_unidade', nomeUnidade)
            .eq('empresa_id', empresaIdParaNovaUnidade)
            .maybeSingle();

        if (checkError) throw checkError;
        if (existing) {
            alert(`Uma unidade com o nome "${nomeUnidade}" já existe para esta empresa.`);
            hideLoader();
            return;
        }

        const { data, error } = await _supabaseClient.from('unidades')
            .insert([{ nome_unidade: nomeUnidade, empresa_id: empresaIdParaNovaUnidade }])
            .select();

        if (error) throw error;
        alert('Unidade adicionada com sucesso!');
        nomeUnidadeInputEl.value = '';
        // Re-renderiza as unidades após a adição, mantendo a visão correta (admin ou empresa)
        await fetchAndRenderUnidades(_supabaseClient, empresaIdParaNovaUnidade, appState.currentUser.role === 'admin_master');
    } catch (e) {
        console.error("Erro ao adicionar unidade:", e);
        alert('Falha ao adicionar unidade: ' + e.message);
    } finally {
        hideLoader();
    }
}

/**
 * Lida com a exclusão de uma unidade.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} unidadeId O ID da unidade a ser excluída.
 * @param {string} nomeUnidade O nome da unidade (para confirmação).
 * @param {string} unidadeEmpresaId O ID da empresa à qual a unidade pertence.
 */
export async function handleDeleteUnidade(_supabaseClient, unidadeId, nomeUnidade, unidadeEmpresaId) {
    if (!confirm(`Tem certeza que deseja excluir a unidade "${nomeUnidade}"? Esta ação não pode ser desfeita.`)) {
        return;
    }

    let canDelete = false;
    // Apenas o admin master da empresa selecionada ou o gerente da própria empresa podem deletar
    if (appState.currentUser.role === 'admin_master' && unidadeEmpresaId === adminUnidadeEmpresaSelectEl.value) { 
        canDelete = true;
    } else if ((appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal') && unidadeEmpresaId === appState.currentUser.empresa_id) {
        canDelete = true;
    }

    if (!canDelete) {
        alert("Você não tem permissão para excluir esta unidade.");
        return;
    }

    showLoader();
    try {
        // Verifica associações em 'colaboradores_unidades'
        const { count: colabCount, error: colabCheckError } = await _supabaseClient
            .from('colaboradores_unidades')
            .select('id', { count: 'exact', head: true })
            .eq('unidade_id', unidadeId); // Correção: coluna id_unidade em colaboradores_unidades
        if (colabCheckError) throw colabCheckError;
        if (colabCount && colabCount > 0) {
            alert(`Não é possível excluir a unidade "${nomeUnidade}" pois ela está sendo utilizada por ${colabCount} colaborador(es). Desvincule os colaboradores primeiro.`);
            hideLoader(); return;
        }

        // Verifica associações em 'contagens'
        const { count: contagemCount, error: contagemCheckError } = await _supabaseClient
            .from('contagens')
            .select('id', { count: 'exact', head: true })
            .eq('unidade_id', unidadeId);
        if (contagemCheckError) throw contagemCheckError;
        if (contagemCount && contagemCount > 0) {
            alert(`Não é possível excluir a unidade "${nomeUnidade}" pois ela possui ${contagemCount} registro(s) de contagem associado(s).`);
            hideLoader(); return;
        }

        // Verifica associações em 'produtos_unidades' (se produtos estão diretamente ligados a unidades)
        const { count: prodUnitCount, error: prodUnitCheckError } = await _supabaseClient
            .from('produtos_unidades')
            .select('id', { count: 'exact', head: true })
            .eq('unidade_id', unidadeId);
        if (prodUnitCheckError) throw prodUnitCheckError;
        if (prodUnitCount && prodUnitCount > 0) {
            alert(`Não é possível excluir a unidade "${nomeUnidade}" pois ela está associada a ${prodUnitCount} produto(s). Remova a unidade dos produtos primeiro.`);
            hideLoader(); return;
        }


        // Se não houver dependências, procede com a exclusão
        const { error } = await _supabaseClient.from('unidades').delete().eq('id', unidadeId);
        if (error) throw error;
        alert(`Unidade "${nomeUnidade}" excluída com sucesso!`);
        // Re-renderiza as unidades após a exclusão
        await fetchAndRenderUnidades(_supabaseClient, unidadeEmpresaId, appState.currentUser.role === 'admin_master');
    } catch (e) {
        console.error("Erro ao excluir unidade:", e);
        alert('Falha ao excluir unidade: ' + e.message);
    } finally {
        hideLoader();
    }
}