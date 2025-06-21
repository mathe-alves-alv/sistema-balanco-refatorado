// js/dom-selectors.js

// -- Indicadores Globais --
export const loadingIndicator = document.getElementById('loadingIndicator');
export const toastContainer = document.body; // Supondo que o toast será adicionado ao body

// -- Telas Principais (para o ui-manager) --
// Seleciona todas as divs que têm a classe 'screen'
export const allScreens = document.querySelectorAll('.screen'); 

// -- Tela de Login --
export const loginForm = document.getElementById('login-form');
// Note que não selecionamos os inputs ou botão individualmente aqui, pois o form nos dá acesso a eles.

// -- Botões Gerais / Navegação --
export const logoutButton = document.getElementById('btnLogoutAdmin'); // Assumindo um logout para todos

// -- Gerenciamento de Empresas e Usuários (Admin) --
export const manageUsersScreen = document.getElementById('screenManageEmpresaUsers');
export const manageUsersList = document.getElementById('adminEmpresaUsersTableBody');
export const manageEmpresaUsersScreenTitleEl = document.getElementById('manageEmpresaUsersScreenTitle');

// -- Formulário de Criação de Usuário --
export const createUserForm = document.getElementById('create-user-form');

// -- Tela e Formulário de Alteração de Senha --
export const changePasswordScreen = document.getElementById('change-password-screen');
export const changePasswordForm = document.getElementById('change-password-form');
export const changingPasswordForUserDisplay = document.getElementById('changing-password-for-user-display');
export const newPasswordInput = document.getElementById('new-password-input');

// Você pode continuar adicionando outros seletores que seu sistema usa aqui...
// Exemplo:
// export const productManagementScreen = document.getElementById('screenProductManagement');
// export const productManagementTableBody = document.getElementById('productManagementTableBody');