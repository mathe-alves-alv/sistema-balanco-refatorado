import * as Dom from './dom-selectors.js';

// Variável interna para rastrear a tela atualmente ativa
let _currentActiveScreenId = 'screenLogin'; 

export function showScreen(screenId) {
    Dom.allScreens.forEach(screen => screen.classList.remove('active'));
    const screenToShow = document.getElementById(screenId);
    if (screenToShow) {
        screenToShow.classList.add('active');
        _currentActiveScreenId = screenId; // Atualiza a tela ativa aqui
        console.log('[UI-Manager] Tela ativa atualizada para:', _currentActiveScreenId);
    } else {
        console.error(`[UI-Manager] Tela com ID "${screenId}" não encontrada.`);
    }
}

// Função para obter a tela ativa atual
export function getCurrentActiveScreenId() {
    return _currentActiveScreenId;
}

export function showLoader() { 
    if(Dom.loadingIndicatorEl) Dom.loadingIndicatorEl.style.display = 'block'; 
}

export function hideLoader() { 
    if(Dom.loadingIndicatorEl) Dom.loadingIndicatorEl.style.display = 'none'; 
}

export function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    if (Dom.toastContainerEl) { // Adicionado verificação
        Dom.toastContainerEl.appendChild(toast);
        setTimeout(() => { toast.classList.add('show'); }, 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    } else {
        console.warn('Toast container não encontrado. Mensagem:', message);
    }
}