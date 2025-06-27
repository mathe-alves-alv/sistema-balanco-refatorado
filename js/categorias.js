import { _supabaseClient } from './supabase-client.js';
import { showScreen, showToast, showLoader, hideLoader } from './ui-manager.js';
import * as Dom from './dom-selectors.js';
import { showAdminDashboardScreen } from './auth.js';

console.log('categorias.js carregado.'); // Log para confirmar carregamento do módulo

export async function showCategoriasScreen() {
    showLoader();
    try {
        if(Dom.btnCategoriasBackEl) Dom.btnCategoriasBackEl.onclick = showAdminDashboardScreen;
        await fetchAndRenderCategorias();
        showScreen('screenCategorias');
    } catch(e) {
        showToast(`Erro ao carregar categorias: ${e.message}`, 'error');
    } finally {
        hideLoader();
    }
}

async function fetchAndRenderCategorias() {
    if (!Dom.categoriasTableBodyEl) {
        console.error('ERRO: Dom.categoriasTableBodyEl é null/undefined. O elemento HTML da tbody da tabela de categorias não foi encontrado.');
        return;
    }
    Dom.categoriasTableBodyEl.innerHTML = `<tr><td colspan="3">Carregando...</td></tr>`;
    try {
        const { data, error } = await _supabaseClient.from('categorias').select('*').order('nome_categoria');
        if (error) throw error;
        Dom.categoriasTableBodyEl.innerHTML = '';
        if (data.length === 0) {
            Dom.categoriasTableBodyEl.innerHTML = '<tr><td colspan="3">Nenhuma categoria cadastrada.</td></tr>';
            return;
        }
        data.forEach(cat => {
            const row = Dom.categoriasTableBodyEl.insertRow();
            // ADICIONADO data-name PARA A CONFIRMAÇÃO DE EXCLUSÃO. A CLASSE BTN-DELETE-CATEGORIA É CRÍTICA!
            row.innerHTML = `
                <td>${cat.nome_categoria}</td>
                <td>${new Date(cat.created_at).toLocaleDateString('pt-BR')}</td>
                <td class="actions-cell">
                    <button class="btn btn-sm btn-danger btn-delete-categoria" data-id="${cat.id}" data-name="${cat.nome_categoria}">Excluir</button>
                </td>
            `;
        });
        console.log('Categorias renderizadas. Total:', data.length); // Log de categorias renderizadas
    } catch(e) {
        console.error('Erro em fetchAndRenderCategorias (buscando/renderizando categorias):', e); // Log de erro na busca/renderização
        Dom.categoriasTableBodyEl.innerHTML = `<tr><td colspan="3" style="color:red;">Erro: ${e.message}</td></tr>`;
    }
}

export async function handleAddCategoria(event) {
    event.preventDefault();
    const nomeCategoria = Dom.nomeCategoriaInputEl.value.trim();
    if (!nomeCategoria) {
        showToast('O nome da categoria é obrigatório.', 'error');
        return;
    }
    showLoader();
    try {
        const { error } = await _supabaseClient.from('categorias').insert({ nome_categoria: nomeCategoria });
        if (error) throw error;
        
        showToast("Categoria adicionada com sucesso!", "success");
        Dom.addCategoriaFormEl.reset();
        await fetchAndRenderCategorias();
    } catch (error) {
        showToast(`Erro ao adicionar categoria: ${error.message}`, 'error');
    } finally {
        hideLoader();
    }
}

// Event listener para a tabela de categorias para a exclusão
console.log('Tentando anexar event listener a Dom.categoriasTableBodyEl:', Dom.categoriasTableBodyEl); // LOG CRUCIAL: VERIFICA SE A TBODY FOI ENCONTRADA
if (Dom.categoriasTableBodyEl) {
    Dom.categoriasTableBodyEl.addEventListener('click', async (event) => {
        console.log('Clique detectado na tbody de categorias. Target:', event.target); // LOG: EXECUTADO SE UM CLIQUE CHEGAR NA TBODY
        // Verifica se o elemento clicado (ou um de seus pais) tem a classe 'btn-delete-categoria'
        const clickedButton = event.target.closest('.btn-delete-categoria'); // Busca o botão mais próximo com a classe
        
        if(clickedButton) { // SE O BOTÃO COM A CLASSE ESPECÍFICA FOI CLICADO
            const categoriaIdToDelete = clickedButton.dataset.id;
            const categoriaNomeToDelete = clickedButton.dataset.name;
            
            console.log('Botão de exclusão de categoria clicado!', { categoriaIdToDelete, categoriaNomeToDelete }); // LOG: CONFIRMA QUE É O BOTÃO CORRETO

            if (confirm(`Tem certeza que deseja excluir a categoria "${categoriaNomeToDelete}"? Esta ação não pode ser desfeita.`)) {
                showLoader();
                try {
                    const { error } = await _supabaseClient.from('categorias').delete().eq('id', categoriaIdToDelete);
                    if (error) throw error;
                    
                    showToast("Categoria excluída com sucesso.", "success");
                    await fetchAndRenderCategorias(); 
                } catch (error) {
                    showToast(`Erro ao excluir categoria: ${error.message}`, 'error');
                    console.error('Erro na exclusão da categoria:', error); // Log de erro da exclusão
                } finally {
                    hideLoader();
                }
            }
        } else {
            console.log('Clique não foi no botão de exclusão de categoria (ou classe incorreta).'); // LOG: CLIQUE NA TBODY, MAS NÃO NO BOTÃO
        }
    });
} else {
    console.error('NÃO FOI POSSÍVEL ANEXAR EVENT LISTENER: Dom.categoriasTableBodyEl é nulo/indefinido.'); // LOG: SE O ELEMENTO TBODY NÃO FOI ENCONTRADO
}

// Event listener para o formulário de adicionar setor
if (Dom.addCategoriaFormEl) {
    Dom.addCategoriaFormEl.addEventListener('submit', handleAddCategoria);
}