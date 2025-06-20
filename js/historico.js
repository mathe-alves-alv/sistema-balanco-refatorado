// js/historico.js

import { showLoader, hideLoader, showScreen } from './ui-manager.js';
import { 
    historicoEmpresaNomeSpan, historicoContagensTableBody, modalDetalhesContagem, detalhesContagemConteudo,
    adminHistoricoEmpresaSelectorContainer, adminHistoricoEmpresaSelect, historicoBackButton, historicoTitle, historicoContext, colEmpresaHistorico,
    historicoUnidadeFilterContainer, historicoUnidadeFilter
} from './dom-selectors.js';
import { appState, setAdminSelectedEmpresaContextId } from './state.js'; // Importa o appState e seus setters
import { empresasCache, unidadesCache, produtosCache } from './data-cache.js'; // Importa caches globais
import { populateEmpresasSelect } from './data-cache.js'; // Para popular o seletor de empresas no admin
import { showAdminMasterDashboardScreen, showEmpresaDashboardScreen } from './auth.js'; // Para navegação de volta


/**
 * Exibe a tela de histórico de contagens para o Admin Master.
 * Permite que o admin selecione uma empresa para ver o histórico.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function showHistoricoContagensScreen_Admin(_supabaseClient) {
    if (!appState.currentUser || appState.currentUser.role !== 'admin_master') {
        alert("Acesso negado. Apenas Admin Master pode visualizar histórico globalmente.");
        showScreen('login', {}, appState.currentUser); // Fallback seguro
        return;
    }
    console.log("showHistoricoContagensScreen_Admin called");
    showLoader();
    try {
        // Reinicia o contexto de seleção para admin
        setAdminSelectedEmpresaContextId(null); 

        // Exibe o seletor de empresa e a coluna "Empresa" na tabela
        if(adminHistoricoEmpresaSelectorContainer) adminHistoricoEmpresaSelectorContainer.style.display = 'block';
        if(colEmpresaHistorico) colEmpresaHistorico.style.display = ''; // Exibe a coluna Empresa
        if(historicoUnidadeFilterContainer) historicoUnidadeFilterContainer.style.display = 'block'; // Exibe o filtro de unidade

        await populateEmpresasSelect(_supabaseClient, adminHistoricoEmpresaSelect, true, "-- Selecione uma Empresa --", "");
        if(adminHistoricoEmpresaSelect) adminHistoricoEmpresaSelect.value = ""; // Garante que nenhum valor esteja selecionado inicialmente

        // Adiciona/garante que o event listener esteja anexado uma única vez
        if (adminHistoricoEmpresaSelect && !adminHistoricoEmpresaSelect.onchangeAttached_hist_admin) {
            adminHistoricoEmpresaSelect.addEventListener('change', async () => {
                const newEmpresaId = adminHistoricoEmpresaSelect.value === "" ? null : adminHistoricoEmpresaSelect.value;
                setAdminSelectedEmpresaContextId(newEmpresaId); // Atualiza o contexto global de admin
                const selectedEmpresa = empresasCache.find(e => e.id === newEmpresaId);
                if(historicoContext) historicoContext.textContent = selectedEmpresa ? `Empresa: ${selectedEmpresa.nome_empresa}` : "Nenhuma empresa selecionada";
                
                // Popula o filtro de unidades com base na empresa selecionada
                await populateUnidadesForHistoricoFilter(_supabaseClient, newEmpresaId, 'historicoUnidadeFilter');
                await fetchAndRenderHistoricoContagens(_supabaseClient, newEmpresaId, true, historicoUnidadeFilter.value);
            });
            adminHistoricoEmpresaSelect.onchangeAttached_hist_admin = true;
        }

        // Event listener para o filtro de unidade (precisa ser anexado apenas uma vez)
        if (historicoUnidadeFilter && !historicoUnidadeFilter.onchangeAttached_hist_unit) {
            historicoUnidadeFilter.addEventListener('change', async () => {
                // Usa o ID da empresa atualmente selecionada no adminHistoricoEmpresaSelect ou a empresa do usuário logado
                const empresaIdParaFiltro = appState.adminSelectedEmpresaContextId || appState.currentUser.empresa_id;
                await fetchAndRenderHistoricoContagens(_supabaseClient, empresaIdParaFiltro, appState.currentUser.role === 'admin_master', historicoUnidadeFilter.value);
            });
            historicoUnidadeFilter.onchangeAttached_hist_unit = true;
        }

        // Não faz o fetch inicial aqui, pois não há empresa selecionada por padrão
        showScreen('historicoContagens', {
            title: 'Histórico de Contagens (Admin)',
            context: 'Selecione uma empresa para filtrar o histórico.',
            showEmpresaSelector: true,
            showEmpresaColumnInTable: true
        }, appState.currentUser);

    } catch (e) {
        console.error("Erro em showHistoricoContagensScreen_Admin:", e);
        alert("Erro ao carregar histórico de admin.");
    } finally {
        hideLoader();
    }
}


/**
 * Exibe a tela de histórico de contagens para um Gerente ou Contador de Empresa.
 * O usuário só pode ver o histórico da sua própria empresa.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function showHistoricoContagensScreen(_supabaseClient) {
    if (!appState.currentUser || !(appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_counter' || appState.currentUser.role === 'empresa_login_principal')) {
        alert("Acesso negado ao histórico de contagens.");
        // Redireciona para o dashboard da empresa ou login
        if(appState.currentUser?.role === 'empresa_manager' || appState.currentUser?.role === 'empresa_login_principal') showEmpresaDashboardScreen(appState.currentUser);
        else showScreen('login', {}, appState.currentUser);
        return;
    }
    if (!appState.currentUser.empresa_id) {
        console.error("ID da empresa do usuário não encontrada para histórico.");
        alert("Erro: ID da sua empresa não encontrado. Tente relogar.");
        showScreen('login', {}, appState.currentUser); // Fallback para login
        return;
    }
    console.log("showHistoricoContagensScreen (Empresa) called for company:", appState.currentUser.empresa_nome);
    showLoader();
    try {
        setAdminSelectedEmpresaContextId(appState.currentUser.empresa_id); // Define o contexto da empresa para a empresa do usuário
        if(historicoEmpresaNomeSpan) historicoEmpresaNomeSpan.textContent = appState.currentUser.empresa_nome || 'Sua Empresa';

        // Esconde o seletor de empresa e a coluna "Empresa"
        if(adminHistoricoEmpresaSelectorContainer) adminHistoricoEmpresaSelectorContainer.style.display = 'none';
        if(colEmpresaHistorico) colEmpresaHistorico.style.display = 'none';
        if(historicoUnidadeFilterContainer) historicoUnidadeFilterContainer.style.display = 'block'; // Exibe o filtro de unidade

        if(historicoTitle) historicoTitle.textContent = `Meu Histórico de Contagens (${appState.currentUser.empresa_nome})`;
        if(historicoContext) historicoContext.textContent = `Visualizando contagens para ${appState.currentUser.empresa_nome}.`;

        await populateUnidadesForHistoricoFilter(_supabaseClient, appState.currentUser.empresa_id, 'historicoUnidadeFilter');
        
        // Garante que o event listener para o filtro de unidade esteja anexado uma única vez
        if (historicoUnidadeFilter && !historicoUnidadeFilter.onchangeAttached_hist_unit) {
            historicoUnidadeFilter.addEventListener('change', async () => {
                await fetchAndRenderHistoricoContagens(_supabaseClient, appState.currentUser.empresa_id, false, historicoUnidadeFilter.value);
            });
            historicoUnidadeFilter.onchangeAttached_hist_unit = true;
        }
        
        await fetchAndRenderHistoricoContagens(_supabaseClient, appState.currentUser.empresa_id, false, historicoUnidadeFilter.value); // Busca histórico inicial

        showScreen('historicoContagens', {
            title: historicoTitle.textContent,
            context: historicoContext.textContent,
            showEmpresaSelector: false,
            showEmpresaColumnInTable: false
        }, appState.currentUser);

    } catch (e) {
        console.error("Erro em showHistoricoContagensScreen (Empresa):", e);
        alert("Erro ao carregar histórico.");
    } finally {
        hideLoader();
    }
}


/**
 * Popula o filtro de unidades para a tela de histórico.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaId O ID da empresa para buscar unidades.
 * @param {string} selectElementId O ID do elemento select.
 */
async function populateUnidadesForHistoricoFilter(_supabaseClient, empresaId, selectElementId) {
    const selectEl = document.getElementById(selectElementId);
    if (!selectEl) { console.warn(`Unit filter select '${selectElementId}' not found.`); return; }
    
    selectEl.innerHTML = '<option value="">Todas as Unidades</option>'; // Opção padrão
    if (!empresaId) return; // Não carrega unidades se nenhuma empresa estiver selecionada

    try {
        const { data, error } = await _supabaseClient.from('unidades')
            .select('id, nome_unidade')
            .eq('empresa_id', empresaId)
            .order('nome_unidade');

        if (error) throw error;
        // Não atualiza o cache global de unidades aqui, pois ele é gerenciado em data-cache ou produtos/contagens.
        // Apenas usa os dados para preencher o filtro.
        const unidadesDoFiltro = data || []; 

        unidadesDoFiltro.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.id;
            option.textContent = unit.nome_unidade;
            selectEl.appendChild(option);
        });
    } catch (e) {
        console.error("Erro ao carregar unidades para filtro de histórico:", e);
    }
}


/**
 * Busca e renderiza o histórico de contagens.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string|null} empresaIdFiltro O ID da empresa para filtrar o histórico.
 * @param {boolean} isAdminView Indica se é a visão de admin (para exibir coluna Empresa).
 * @param {string|null} unidadeIdFiltro O ID da unidade para filtrar o histórico.
 */
export async function fetchAndRenderHistoricoContagens(_supabaseClient, empresaIdFiltro = null, isAdminView = false, unidadeIdFiltro = null) {
    if (!historicoContagensTableBody) { console.error("historicoContagensTableBody not found."); return; }

    const initialColspan = isAdminView ? 6 : 5; // Empresa, Data, Colab, Unidade, Itens, Ações
    historicoContagensTableBody.innerHTML = `<tr><td colspan="${initialColspan}">Carregando histórico...</td></tr>`;

    if (isAdminView && !empresaIdFiltro) {
        historicoContagensTableBody.innerHTML = `<tr><td colspan="${initialColspan}">Selecione uma empresa para ver o histórico.</td></tr>`;
        hideLoader(); return;
    }

    showLoader();
    try {
        let query = _supabaseClient.from('contagens')
            .select(`
                id,
                created_at,
                colaborador_id,
                colaborador_nome_display,
                unidade_id,
                unidade_nome_display,
                total_itens,
                empresa_id,
                empresas(nome_empresa)
            `)
            .order('created_at', { ascending: false });

        // Aplica filtro por empresa
        if (empresaIdFiltro) {
            query = query.eq('empresa_id', empresaIdFiltro);
        } else if (!isAdminView && appState.currentUser?.empresa_id) { // Caso de gerente/contador vendo seu próprio histórico
            query = query.eq('empresa_id', appState.currentUser.empresa_id);
        }
        
        // Aplica filtro por unidade
        if (unidadeIdFiltro) {
            query = query.eq('unidade_id', unidadeIdFiltro);
        }

        const { data, error } = await query;
        if (error) throw error;

        historicoContagensTableBody.innerHTML = "";
        if (data && data.length > 0) {
            data.forEach(reg => {
                const row = historicoContagensTableBody.insertRow();
                // Coluna da empresa (visível apenas para admin master)
                if (isAdminView && colEmpresaHistorico.style.display !== 'none') {
                    row.insertCell().textContent = reg.empresas?.nome_empresa || (reg.empresa_id ? `ID: ${reg.empresa_id}`: 'N/A');
                }
                row.insertCell().textContent = new Date(reg.created_at).toLocaleString('pt-BR');
                row.insertCell().textContent = reg.colaborador_nome_display || "N/A";
                row.insertCell().textContent = reg.unidade_nome_display || "N/A";
                row.insertCell().textContent = reg.total_itens;

                const actionsCell = row.insertCell();
                const btnDetalhes = document.createElement('button');
                btnDetalhes.textContent = 'Detalhes';
                btnDetalhes.className = 'btn btn-info table-actions';
                btnDetalhes.onclick = () => showDetalhesContagem(_supabaseClient, reg.id); // Passa _supabaseClient e ID da contagem
                actionsCell.appendChild(btnDetalhes);
            });
        } else {
            historicoContagensTableBody.innerHTML = `<tr><td colspan="${initialColspan}">Nenhum registro de contagem encontrado para a seleção.</td></tr>`;
        }
    } catch (e) {
        console.error("Erro ao buscar/renderizar histórico de contagens:", e);
        historicoContagensTableBody.innerHTML = `<tr><td colspan="${initialColspan}" style="color:var(--danger-color);">Erro: ${e.message}</td></tr>`;
    } finally {
        hideLoader();
    }
}

/**
 * Exibe os detalhes de uma contagem específica em um modal.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} contagemId O ID da contagem para buscar detalhes.
 */
export async function showDetalhesContagem(_supabaseClient, contagemId) {
    if (!modalDetalhesContagem || !detalhesContagemConteudo) { console.error("Details modal or content not found."); return;}
    
    showLoader();
    detalhesContagemConteudo.innerHTML = '<p>Carregando detalhes...</p>'; // Mensagem de carregamento

    try {
        const { data: contagem, error: contagemError } = await _supabaseClient
            .from('contagens')
            .select(`
                id,
                created_at,
                colaborador_id,
                colaborador_nome_display,
                unidade_id,
                unidade_nome_display,
                total_itens,
                contagem_itens_por_produto(
                    quantidade_contada,
                    produtos(codigo, nome_produto,
                        produtos_categorias(nome_categoria),
                        produtos_unidades(nome_unidade)
                    )
                )
            `)
            .eq('id', contagemId)
            .single();

        if (contagemError) throw contagemError;
        if (!contagem) {
            detalhesContagemConteudo.innerHTML = '<p>Detalhes da contagem não encontrados.</p>';
            return;
        }

        let htmlConteudo = '';
        htmlConteudo += `<p><strong>Data:</strong> ${new Date(contagem.created_at).toLocaleString('pt-BR')}</p>`;
        htmlConteudo += `<p><strong>Colaborador:</strong> ${contagem.colaborador_nome_display || 'N/A'}</p>`;
        htmlConteudo += `<p><strong>Unidade:</strong> ${contagem.unidade_nome_display || 'N/A'}</p>`;
        htmlConteudo += `<p><strong>Total de Itens Contados:</strong> ${contagem.total_itens}</p>`;
        htmlConteudo += `<hr>`;
        htmlConteudo += `<h5>Itens Detalhados:</h5>`;

        if (contagem.contagem_itens_por_produto && contagem.contagem_itens_por_produto.length > 0) {
            htmlConteudo += '<table class="table table-striped table-bordered" style="width:100%; font-size:0.9em;"><thead><tr><th>Cód.</th><th>Produto</th><th>Categorias</th><th>Unidades</th><th>Qtd.</th></tr></thead><tbody>';
            
            // Ordena os itens por nome do produto
            contagem.contagem_itens_por_produto.sort((a,b) => (a.produtos?.nome_produto || "").localeCompare(b.produtos?.nome_produto || "")).forEach(item => {
                const categoriasDisplay = (item.produtos?.produtos_categorias || [])
                    .map(pc => pc.nome_categoria)
                    .filter(Boolean).join(', ') || 'Sem Categoria';
                
                const unidadesDisplay = (item.produtos?.produtos_unidades || [])
                    .map(pu => pu.nome_unidade)
                    .filter(Boolean).join(', ') || 'N/A';

                htmlConteudo += `<tr>
                    <td>${item.produtos?.codigo || 'N/A'}</td>
                    <td>${item.produtos?.nome_produto || 'N/A'}</td>
                    <td>${categoriasDisplay}</td>
                    <td>${unidadesDisplay}</td>
                    <td style="text-align:right;">${item.quantidade_contada}</td>
                </tr>`;
            });
            htmlConteudo += '</tbody></table>';
        } else {
            htmlConteudo += '<p>Nenhum item detalhado encontrado para esta contagem.</p>';
        }
        detalhesContagemConteudo.innerHTML = htmlConteudo;
        modalDetalhesContagem.classList.add('active'); // Exibe o modal

    } catch (e) {
        console.error("Erro ao buscar detalhes da contagem:", e);
        detalhesContagemConteudo.innerHTML = `<p style="color:var(--danger-color);">Erro ao carregar detalhes: ${e.message}</p>`;
    } finally {
        hideLoader();
    }
}

/**
 * Fecha o modal de detalhes da contagem.
 */
export function closeModalDetalhesContagem() {
    if(modalDetalhesContagem) {
        modalDetalhesContagem.classList.remove('active');
        // Limpa o conteúdo do modal ao fechar para garantir que dados antigos não apareçam em uma nova abertura
        detalhesContagemConteudo.innerHTML = '';
    }
}