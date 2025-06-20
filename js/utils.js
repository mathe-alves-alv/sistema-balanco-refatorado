// js/utils.js

// IMPORTANTE: quantitiesDigitadas agora é importado de contagens.js
import { quantidadesDigitadas } from './contagens.js'; // Importa quantidadesDigitadas do módulo contagens
import { btnGerarTXT, btnGerarPDF, inventoryTableBody } from './dom-selectors.js'; // Importa elementos DOM que utils.js precisa


/**
 * Salva as quantidades digitadas no localStorage.
 */
export function saveQuantities() {
    try {
        localStorage.setItem('balancoQuantities_v3.1', JSON.stringify(quantidadesDigitadas));
    } catch (e) {
        console.error("Error saving quantities to localStorage:", e);
    }
}

/**
 * Carrega as quantidades digitadas do localStorage.
 * Atualiza a variável `quantidadesDigitadas` no módulo `contagens.js`.
 */
export function loadQuantities() {
    try {
        const stored = localStorage.getItem('balancoQuantities_v3.1');
        const parsed = stored ? JSON.parse(stored) : {};
        // Limpa o objeto existente e adiciona os novos valores
        for (const key in quantidadesDigitadas) {
            delete quantidadesDigitadas[key];
        }
        for (const key in parsed) {
            quantidadesDigitadas[key] = parsed[key];
        }
    } catch (e) {
        console.error("Error loading quantities:", e);
        // Garante que o objeto esteja vazio em caso de erro
        for (const key in quantidadesDigitadas) {
            delete quantidadesDigitadas[key];
        }
    }
}

/**
 * Gera uma senha numérica aleatória de um determinado comprimento.
 * @param {number} length O comprimento da senha.
 * @returns {string} A senha numérica gerada.
 */
export function generateNumericPassword(length = 6) {
    let pw = '';
    for (let i = 0; i < length; i++) {
        pw += Math.floor(Math.random() * 10);
    }
    return pw;
}

/**
 * Verifica se o dispositivo é um dispositivo móvel.
 * @returns {boolean} True se for um dispositivo móvel, false caso contrário.
 */
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Aciona o download de um arquivo com o conteúdo fornecido.
 * @param {string} filename O nome do arquivo para download.
 * @param {string} textContent O conteúdo do arquivo.
 */
export function triggerDownload(filename, textContent) {
    const blob = new Blob([textContent],{type:'text/plain;charset=utf-8'});
    const link=document.createElement("a");
    link.href=URL.createObjectURL(blob);
    link.download=filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    console.log(`Download ${filename} triggered.`);
}

/**
 * Atualiza o estado (disabled/enabled) dos botões de exportação (TXT/PDF)
 * com base na existência de quantidades digitadas.
 */
export function updateExportButtonStates() {
    // Agora 'quantidadesDigitadas' é importado de 'contagens.js'
    const hasQuantities = Object.keys(quantidadesDigitadas).some(key => quantidadesDigitadas[key] > 0);
    if (btnGerarTXT) btnGerarTXT.disabled = !hasQuantities;
    if (btnGerarPDF) btnGerarPDF.disabled = !hasQuantities;
}

/**
 * Limpa todas as quantidades digitadas e o localStorage.
 * Esta função foi movida de contagens.js para utils.js para ser mais genérica.
 * @param {HTMLElement} [tableBody=inventoryTableBody] O tbody da tabela de inventário.
 */
export function clearAllQuantities(tableBody = inventoryTableBody) {
    // Zera o objeto quantidadesDigitadas (que é importado de contagens.js)
    for (const key in quantidadesDigitadas) {
        delete quantidadesDigitadas[key];
    }
    saveQuantities(); // Salva o estado vazio no localStorage

    // Limpa os inputs visíveis na tela
    if (tableBody) {
        const inputs = tableBody.querySelectorAll('.quantidade-input');
        inputs.forEach(input => input.value = '');
    }
    console.log("Quantities cleared.");
    updateExportButtonStates(); // Atualiza o estado dos botões de exportação
}