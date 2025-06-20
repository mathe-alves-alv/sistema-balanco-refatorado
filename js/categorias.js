// js/categorias.js

import { showLoader, hideLoader, showScreen } from './ui-manager.js';
import { 
    categoriasTitleEl, adminCategoriaEmpresaSelectContainerEl, adminCategoriaEmpresaSelectEl,
    nomeCategoriaInputEl, categoriasTableBodyEl, btnAddCategoriaEl, categoriasContextEl,
    thCategoriaEmpresaScopeEl
} from './dom-selectors.js';
import { appState, setCurrentUser, setAdminSelectedEmpresaContextId } from './state.js'; // Importa o appState e seus setters
import { empresasCache, populateEmpresasSelect, categoriasCache } from './data-cache.js'; // Importa categoriasCache
import { showAdminMasterDashboardScreen, showEmpresaDashboardScreen } from './auth.js'; // Para navegação de volta


/**
 * Exibe a tela de gerenciamento de categorias para o Admin Master.
 * Permite que o admin selecione uma empresa para gerenciar as categorias.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function showCategoriasScreen_Admin(_supabaseClient) {
    if (!appState.currentUser || appState.currentUser.role !== 'admin_master') {
        alert("Acesso negado. Apenas Admin Master pode gerenciar categorias globalmente.");
        showScreen('login', {}, appState.currentUser); // Fallback seguro
        return;
    }
    console.log("showCategoriasScreen_Admin called");
    showLoader();
    try {
        // Reinicia o contexto de seleção para admin
        setAdminSelectedEmpresaContextId(null); 

        // Configura o seletor de empresa e a visibilidade da coluna "Empresa"
        if(adminCategoriaEmpresaSelectContainerEl) adminCategoriaEmpresaSelectContainerEl.style.display = 'block';
        if(thCategoriaEmpresaScopeEl) thCategoriaEmpresaScopeEl.style.display = ''; // Exibe a coluna Empresa
        if(btnAddCategoriaEl) btnAddCategoriaEl.disabled = true; // Desabilita o botão adicionar até que uma empresa seja selecionada

        await populateEmpresasSelect(_supabaseClient, adminCategoriaEmpresaSelectEl, true, "-- Selecione uma Empresa --", "");
        if(adminCategoriaEmpresaSelectEl) adminCategoriaEmpresaSelectEl.value = ""; // Garante que nenhum valor esteja selecionado inicialmente

        // Adiciona/garante que o event listener esteja anexado uma única vez
        if (adminCategoriaEmpresaSelectEl && !adminCategoriaEmpresaSelectEl.onchangeAttached_cat_admin) {
            adminCategoriaEmpresaSelectEl.addEventListener('change', async () => {
                const newEmpresaId = adminCategoriaEmpresaSelectEl.value === "" ? null : adminCategoriaEmpresaSelectEl.value;
                setAdminSelectedEmpresaContextId(newEmpresaId); // Atualiza o estado global
                const selectedEmpresa = empresasCache.find(e => e.id === newEmpresaId);
                if(categoriasContextEl) categoriasContextEl.textContent = selectedEmpresa ? `Gerenciando categorias para: ${selectedEmpresa.nome_empresa}` : "Nenhuma empresa selecionada";
                if(btnAddCategoriaEl) btnAddCategoriaEl.disabled = !newEmpresaId; // Habilita/Desabilita botão
                await fetchAndRenderCategorias(_supabaseClient, newEmpresaId, true); // Passa o novo ID e flag de admin view
            });
            adminCategoriaEmpresaSelectEl.onchangeAttached_cat_admin = true; // Marca o listener como anexado
        }
        // Não faz o fetch inicial de categorias aqui, pois não há empresa selecionada por padrão
        showScreen('adminCategorias', { title: 'Gerenciar Categorias (Admin)', context: 'Selecione uma empresa para ver ou adicionar categorias.', isEmpresaContext: false }, appState.currentUser);
    } catch (e) {
        console.error("Erro em showCategoriasScreen_Admin:", e);
        alert("Erro ao carregar tela de categorias (Admin).");
    } finally {
        hideLoader();
    }
}

/**
 * Exibe a tela de gerenciamento de categorias para um Gerente de Empresa.
 * O gerente só pode gerenciar as categorias da sua própria empresa.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function showCategoriasScreen_Empresa(_supabaseClient) {
    if (!appState.currentUser || !(appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal')) {
        alert("Acesso negado à gestão de categorias.");
        showEmpresaDashboardScreen(appState.currentUser); // Redireciona para o dashboard da empresa
        return;
    }
    if (!appState.currentUser.empresa_id) {
        console.error("ID da empresa do usuário não encontrada para categorias.");
        alert("Erro: ID da sua empresa não encontrado. Tente relogar.");
        showScreen('login', {}, appState.currentUser); // Fallback para login
        return;
    }
    console.log("showCategoriasScreen_Empresa called for company:", appState.currentUser.empresa_nome);
    showLoader();
    try {
        setAdminSelectedEmpresaContextId(appState.currentUser.empresa_id); // Define o contexto para a empresa do usuário
        // Esconde o seletor de empresa e a coluna "Empresa"
        if(adminCategoriaEmpresaSelectContainerEl) adminCategoriaEmpresaSelectContainerEl.style.display = 'none';
        if(thCategoriaEmpresaScopeEl) thCategoriaEmpresaScopeEl.style.display = 'none';
        if(btnAddCategoriaEl) btnAddCategoriaEl.disabled = false; // Habilita o botão adicionar

        if(categoriasContextEl) categoriasContextEl.textContent = `Gerenciando categorias para: ${appState.currentUser.empresa_nome || 'sua empresa'}`;
        await fetchAndRenderCategorias(_supabaseClient, appState.currentUser.empresa_id, false); // Passa ID e flag de não-admin view
        
        showScreen('adminCategorias', {
            title: `Gerenciar Categorias (${appState.currentUser.empresa_nome || 'Sua Empresa'})`,
            context: categoriasContextEl.textContent,
            isEmpresaContext: true // Flag para configuração da tela
        }, appState.currentUser); // Passa appState.currentUser
    } catch (e) {
        console.error("Erro em showCategoriasScreen_Empresa:", e);
        alert("Erro ao carregar tela de categorias da empresa.");
    } finally {
        hideLoader();
    }
}

/**
 * Busca e renderiza a lista de categorias para uma empresa específica.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} empresaId O ID da empresa para buscar categorias.
 * @param {boolean} isAdminView Indica se a visualização é de admin (para mostrar a coluna 'Empresa').
 */
export async function fetchAndRenderCategorias(_supabaseClient, empresaId, isAdminView = false) {
    if (!categoriasTableBodyEl) { console.error("categoriasTableBodyEl not found"); return; }
    categoriasTableBodyEl.innerHTML = '<tr><td colspan="4">Carregando categorias...</td></tr>';
    
    if (!empresaId) {
        categoriasTableBodyEl.innerHTML = '<tr><td colspan="4">Selecione uma empresa para visualizar as categorias.</td></tr>';
        hideLoader(); 
        return;
    }

    showLoader();
    try {
        const { data, error } = await _supabaseClient.from('categorias')
            .select('id, nome_categoria, created_at, empresa_id, empresas (nome_empresa)')
            .eq('empresa_id', empresaId)
            .order('nome_categoria');

        if (error) throw error;

        categoriasCache.splice(0, categoriasCache.length, ...(data || [])); // Atualiza o cache global
        categoriasTableBodyEl.innerHTML = ""; // Limpa a tabela

        if (categoriasCache.length > 0) {
            categoriasCache.forEach(cat => {
                const row = categoriasTableBodyEl.insertRow();
                row.insertCell().textContent = cat.nome_categoria;
                
                // Exibe a coluna da empresa apenas se for a visão de admin e a coluna estiver visível
                if (isAdminView && thCategoriaEmpresaScopeEl && thCategoriaEmpresaScopeEl.style.display !== 'none') {
                    row.insertCell().textContent = cat.empresas?.nome_empresa || `Empresa ID: ${cat.empresa_id}`;
                }
                
                row.insertCell().textContent = new Date(cat.created_at).toLocaleDateString('pt-BR');

                const actionsCell = row.insertCell();
                const btnDelete = document.createElement('button');
                btnDelete.textContent = 'Excluir';
                btnDelete.className = 'btn btn-danger table-actions';
                btnDelete.onclick = () => handleDeleteCategoria(_supabaseClient, cat.id, cat.nome_categoria, cat.empresa_id); // Passa _supabaseClient
                actionsCell.appendChild(btnDelete);
            });
        } else {
            categoriasTableBodyEl.innerHTML = '<tr><td colspan="4">Nenhuma categoria cadastrada para esta empresa.</td></tr>';
        }
    } catch (e) {
        console.error("Erro ao buscar/renderizar categorias:", e);
        categoriasTableBodyEl.innerHTML = `<tr><td colspan="4" style="color:var(--danger-color);">Erro ao carregar: ${e.message}</td></tr>`;
    } finally {
        hideLoader();
    }
}

/**
 * Lida com a adição de uma nova categoria.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 */
export async function handleAddCategoria(_supabaseClient) {
    if (!nomeCategoriaInputEl) {
        alert("Erro: Campo de nome da categoria não encontrado.");
        return;
    }
    const nomeCategoria = nomeCategoriaInputEl.value.trim();
    let empresaIdParaNovaCategoria = null;

    // Determina o ID da empresa com base no papel do usuário
    if (appState.currentUser.role === 'admin_master') {
        empresaIdParaNovaCategoria = adminCategoriaEmpresaSelectEl.value; // Pega do select
        if (!empresaIdParaNovaCategoria) {
            alert("Admin: Selecione uma empresa primeiro para adicionar a categoria.");
            return;
        }
    } else if (appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal') {
        empresaIdParaNovaCategoria = appState.currentUser.empresa_id;
        if (!empresaIdParaNovaCategoria) {
            alert("Erro: ID da sua empresa não encontrado. Não é possível adicionar categoria.");
            return;
        }
    } else {
        alert("Permissão negada para adicionar categoria.");
        return;
    }

    if (!nomeCategoria) {
        alert('Digite o nome da categoria.');
        return;
    }
    showLoader();
    try {
        // Verifica se a categoria já existe para a empresa
        const { data: existing, error: checkError } = await _supabaseClient.from('categorias')
            .select('id')
            .eq('nome_categoria', nomeCategoria)
            .eq('empresa_id', empresaIdParaNovaCategoria)
            .maybeSingle();

        if (checkError) throw checkError;
        if (existing) {
            alert(`Uma categoria com o nome "${nomeCategoria}" já existe para esta empresa.`);
            hideLoader();
            return;
        }

        const { data, error } = await _supabaseClient.from('categorias')
            .insert([{ nome_categoria: nomeCategoria, empresa_id: empresaIdParaNovaCategoria }])
            .select();

        if (error) throw error;
        alert('Categoria adicionada com sucesso!');
        nomeCategoriaInputEl.value = '';
        // Re-renderiza as categorias após a adição, mantendo a visão correta (admin ou empresa)
        await fetchAndRenderCategorias(_supabaseClient, empresaIdParaNovaCategoria, appState.currentUser.role === 'admin_master');
    } catch (e) {
        console.error("Erro ao adicionar categoria:", e);
        alert('Falha ao adicionar categoria: ' + e.message);
    } finally {
        hideLoader();
    }
}

/**
 * Lida com a exclusão de uma categoria.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {string} categoriaId O ID da categoria a ser excluída.
 * @param {string} nomeCategoria O nome da categoria (para confirmação).
 * @param {string} catEmpresaId O ID da empresa à qual a categoria pertence.
 */
export async function handleDeleteCategoria(_supabaseClient, categoriaId, nomeCategoria, catEmpresaId) {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${nomeCategoria}"? Esta ação não pode ser desfeita.`)) {
        return;
    }

    let canDelete = false;
    // Apenas o admin master da empresa selecionada ou o gerente da própria empresa podem deletar
    if (appState.currentUser.role === 'admin_master' && catEmpresaId === adminCategoriaEmpresaSelectEl.value) { 
        canDelete = true;
    } else if ((appState.currentUser.role === 'empresa_manager' || appState.currentUser.role === 'empresa_login_principal') && catEmpresaId === appState.currentUser.empresa_id) {
        canDelete = true;
    }

    if (!canDelete) {
        alert("Você não tem permissão para excluir esta categoria.");
        return;
    }

    showLoader();
    try {
        // Verifica associações em 'produtos_categorias'
        const { count, error: productCheckError } = await _supabaseClient
            .from('produtos_categorias')
            .select('id', { count: 'exact', head: true }) // Conta linhas onde esta categoria é usada
            .eq('categoria_id', categoriaId);

        if (productCheckError) throw productCheckError;

        if (count && count > 0) {
            alert(`Não é possível excluir a categoria "${nomeCategoria}" pois ela está sendo utilizada por ${count} produto(s). Remova ou altere a categoria desses produtos primeiro.`);
            hideLoader();
            return;
        }

        // Se não houver dependências, procede com a exclusão
        const { error } = await _supabaseClient.from('categorias').delete().eq('id', categoriaId);
        if (error) throw error;
        alert(`Categoria "${nomeCategoria}" excluída com sucesso!`);
        // Re-renderiza as categorias após a exclusão
        await fetchAndRenderCategorias(_supabaseClient, catEmpresaId, appState.currentUser.role === 'admin_master');
    } catch (e) {
        console.error("Erro ao excluir categoria:", e);
        alert('Falha ao excluir categoria: ' + e.message);
    } finally {
        hideLoader();
    }
}