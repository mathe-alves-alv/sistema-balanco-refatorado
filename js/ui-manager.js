// js/ui-manager.js

import { allScreens, loadingIndicator, toastContainer } from './dom-selectors.js';

/**
 * Esconde todas as telas principais da aplicação.
 */
function hideAllScreens() {
    allScreens.forEach(screen => {
        screen.style.display = 'none';
    });
}

/**
 * Mostra uma tela específica pelo seu ID e esconde as outras.
 * ESTA VERSÃO É MAIS SIMPLES E CORRETA. Ela não mexe em nenhum conteúdo,
 * apenas na visibilidade da tela.
 * @param {string} screenId - O ID do elemento da tela a ser exibida.
 */
export function showScreen(screenId) {
    hideAllScreens();
    const screenToShow = document.getElementById(screenId);
    if (screenToShow) {
        screenToShow.style.display = 'block';
    } else {
        console.error(`Tela com ID "${screenId}" não encontrada.`);
    }
}

/**
 * Mostra ou esconde o indicador de carregamento global.
 * @param {boolean} show - True para mostrar, false para esconder.
 */
export function toggleLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Exibe uma mensagem flutuante (toast).
 * @param {string} message - A mensagem a ser exibida.
 * @param {'success'|'error'|'info'} type - O tipo de toast.
 */
export function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, 5000);
}