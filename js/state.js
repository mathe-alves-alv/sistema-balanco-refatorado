// js/state.js

// Variáveis de estado globais que podem ser acessadas e modificadas por outros módulos
export let appState = {
    currentUser: null,
    adminSelectedEmpresaContextId: null,
    isEmpresaManagerManagingOwnUsers: false,
    managedUsersCache: [], // Cache para usuários de uma empresa sendo gerenciada
    // Outros estados globais podem vir aqui, como configurações, etc.
};

// Constantes que não mudam
export const ADMIN_MASTER_EMAIL = "matheus@mtech.com";

/**
 * Atualiza o objeto currentUser no estado global.
 * @param {object|null} user O novo objeto de usuário ou null.
 */
export function setCurrentUser(user) {
    appState.currentUser = user;
}

/**
 * Atualiza o ID da empresa selecionada no contexto do admin.
 * @param {string|null} id O ID da empresa ou null.
 */
export function setAdminSelectedEmpresaContextId(id) {
    appState.adminSelectedEmpresaContextId = id;
}

/**
 * Define se o gerente da empresa está gerenciando seus próprios usuários.
 * @param {boolean} value O valor booleano.
 */
export function setIsEmpresaManagerManagingOwnUsers(value) {
    appState.isEmpresaManagerManagingOwnUsers = value;
}

/**
 * Atualiza o cache de usuários gerenciados.
 * @param {Array} users O array de usuários para o cache.
 */
export function setManagedUsersCache(users) {
    appState.managedUsersCache = users;
}

/**
 * Reseta o estado global (útil no logout).
 */
export function resetAppState() {
    appState.currentUser = null;
    appState.adminSelectedEmpresaContextId = null;
    appState.isEmpresaManagerManagingOwnUsers = false;
    appState.managedUsersCache = [];
}