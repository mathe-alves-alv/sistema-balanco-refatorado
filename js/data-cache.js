// js/data-cache.js

// Variáveis de cache globais para os dados do banco de dados
export let produtosCache = [];
export let categoriasCache = [];
export let empresasCache = [];
export let colaboradoresCache = [];
export let unidadesCache = [];

/**
 * Popula um elemento <select> com opções de empresas.
 * Também preenche o 'empresasCache' se estiver vazio.
 * @param {SupabaseClient} _supabaseClient A instância do cliente Supabase.
 * @param {HTMLSelectElement} selectElement O elemento select DOM a ser populado.
 * @param {boolean} includeSpecialOption Se deve incluir uma opção padrão no início.
 * @param {string} specialOptionText O texto para a opção padrão.
 * @param {string} specialOptionValue O valor para a opção padrão.
 */
export async function populateEmpresasSelect(_supabaseClient, selectElement, includeSpecialOption = false, specialOptionText = "-- Selecione uma Empresa --", specialOptionValue = "") {
    const selectEl = selectElement; // Já é passado o elemento HTML diretamente

    if (!selectEl) {
        console.warn(`Company select element not found.`);
        return;
    }
    const currentValue = selectEl.value; // Salva o valor atual para tentar restaurar
    selectEl.innerHTML = ''; // Limpa as opções existentes

    if (includeSpecialOption) {
        const opt = document.createElement('option');
        opt.value = specialOptionValue;
        opt.textContent = specialOptionText;
        selectEl.appendChild(opt);
    }

    // Se o cache de empresas estiver vazio, tenta preenchê-lo do banco de dados
    if (empresasCache.length === 0) {
        try {
            console.log("Populating global empresasCache from DB...");
            const { data, error } = await _supabaseClient.from('empresas').select('id, nome_empresa').order('nome_empresa');
            if (error) throw error;
            empresasCache.splice(0, empresasCache.length, ...(data || [])); // Atualiza o array mutável
            console.log("Global empresasCache populated:", empresasCache.length);
        } catch (e) {
            console.error("Error fetching companies for select:", e);
            if(selectEl) selectEl.innerHTML = '<option value="">Erro ao carregar</option>';
            return;
        }
    }

    // Adiciona as empresas do cache ao select
    empresasCache.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.nome_empresa;
        selectEl.appendChild(option);
    });

    // Tenta restaurar a seleção anterior ou define a opção padrão/contexto
    if (currentValue && Array.from(selectEl.options).some(opt => opt.value === currentValue)) {
        selectEl.value = currentValue;
    } else if (selectEl.dataset.adminSelectedEmpresaContextId && Array.from(selectEl.options).some(opt => opt.value === selectEl.dataset.adminSelectedEmpresaContextId)) {
        // Usa um dataset para armazenar o contexto da empresa selecionada pelo admin (se existir)
        selectEl.value = selectEl.dataset.adminSelectedEmpresaContextId;
    } else if (includeSpecialOption) {
        selectEl.value = specialOptionValue;
    }
    
    // Dispara o evento 'change' se um valor válido foi definido (e não é a opção padrão vazia)
    if(selectEl.value && selectEl.value !== specialOptionValue) {
        selectEl.dispatchEvent(new Event('change'));
    }
}