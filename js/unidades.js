import { _supabaseClient } from './supabase-client.js';
import { showScreen, showToast, showLoader, hideLoader } from './ui-manager.js';
import * as Dom from './dom-selectors.js';
import { showAdminDashboardScreen } from './auth.js';

export async function showUnidadesScreen() {
    showLoader();
    await fetchAndRenderUnidades();
    showScreen('screenUnidades');
    hideLoader();
}

async function fetchAndRenderUnidades() {
    Dom.unidadesTableBodyEl.innerHTML = '';
    const { data, error } = await _supabaseClient.from('unidades').select('*').order('nome_unidade');
    if (error) return showToast('Erro ao carregar unidades', 'error');

    data.forEach(unit => {
        const row = Dom.unidadesTableBodyEl.insertRow();
        row.innerHTML = `<td>${unit.nome_unidade}</td><td>${new Date(unit.created_at).toLocaleDateString('pt-BR')}</td><td><button class="btn btn-sm btn-danger" data-id="${unit.id}">Excluir</button></td>`;
    });
}

export async function handleAddUnidade(event) {
    event.preventDefault();
    const nomeUnidade = Dom.nomeUnidadeInputEl.value.trim();
    if (!nomeUnidade) return;
    const { error } = await _supabaseClient.from('unidades').insert({ nome_unidade: nomeUnidade });
    if (error) return showToast(error.message, 'error');
    
    showToast("Unidade adicionada com sucesso!", 'success');
    Dom.addUnidadeFormEl.reset();
    await fetchAndRenderUnidades();
}