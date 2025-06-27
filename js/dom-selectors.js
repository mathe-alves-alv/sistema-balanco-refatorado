// js/dom-selectors.js

export const loadingIndicatorEl = document.getElementById('loadingIndicator');
export const toastContainerEl = document.getElementById('toast-container');
export const allScreens = document.querySelectorAll('.screen'); 

// Telas principais
export const loginScreenEl = document.getElementById('screenLogin');
export const adminDashboardScreenEl = document.getElementById('screenAdminDashboard');
export const manageUsersScreenEl = document.getElementById('screenManageUsers');
export const unidadesScreenEl = document.getElementById('screenUnidades');
export const categoriasScreenEl = document.getElementById('screenCategorias');
export const productManagementScreenEl = document.getElementById('screenProductManagement'); 
export const screenSetoresEl = document.getElementById('screenSetores'); 
export const screenInventoryCountEl = document.getElementById('screenInventoryCount'); 
export const screenHistoricoContagensEl = document.getElementById('screenHistoricoContagens'); 
export const screenChangePasswordEl = document.getElementById('screenChangePassword'); 
export const screenEmpresaColaboradoresEl = document.getElementById('screenEmpresaColaboradores'); 
export const screenCountDetailsEl = document.getElementById('screenCountDetails');

// Login
export const loginFormEl = document.getElementById('login-form');
export const loginEmailEl = document.getElementById('loginEmail'); 
export const loginPasswordEl = document.getElementById('loginPassword'); 
export const loginErrorMessageEl = document.getElementById('loginErrorMessage');

// Dashboard Admin
export const adminNameDisplayEl = document.getElementById('adminNameDisplay');
export const btnGoToManageUsersEl = document.getElementById('btnGoToManageUsers');
export const btnGoToManageUnidadesEl = document.getElementById('btnGoToManageUnidades');
export const btnGoToManageCategoriasEl = document.getElementById('btnGoToManageCategorias');
export const btnGoToManageProductsEl = document.getElementById('btnGoToManageProducts'); 
export const btnGoToManageSetoresEl = document.getElementById('btnGoToManageSetores'); 
export const btnGoToManageColaboradoresEl = document.getElementById('btnGoToManageColaboradores'); 
export const btnGoToInventoryCountEl = document.getElementById('btnGoToInventoryCount'); 
export const btnGoToHistoricoContagensEl = document.getElementById('btnGoToHistoricoContagens'); 
export const btnLogoutEl = document.getElementById('btnLogout');

// Gerenciar Usuários
export const btnUsersBackEl = document.getElementById('btnUsersBack');
export const usersTableBodyEl = document.getElementById('usersTableBody');
export const createUserFormEl = document.getElementById('create-user-form');
export const newUserEmailEl = document.getElementById('newUserEmail'); 
export const newUserRoleEl = document.getElementById('newUserRole'); 
export const passwordRevealSectionEl = document.getElementById('password-reveal-section');
export const generatedPasswordDisplayEl = document.getElementById('generated-password-display');
export const changePasswordFormEl = document.getElementById('changePasswordForm'); 
export const changingPasswordForUserDisplayEl = document.getElementById('changingPasswordForUserDisplay');
export const changePasswordBackButtonEl = document.getElementById('changePasswordBackButton'); 
export const currentPasswordEl = document.getElementById('currentPassword'); 
export const newPasswordEl = document.getElementById('newPassword'); 
export const confirmNewPasswordEl = document.getElementById('confirmNewPassword'); 
export const changePasswordErrorMessageEl = document.getElementById('changePasswordErrorMessage'); 

// Gerenciar Unidades
export const btnUnidadesBackEl = document.getElementById('btnUnidadesBack');
export const addUnidadeFormEl = document.getElementById('add-unidade-form');
export const nomeUnidadeInputEl = document.getElementById('nomeUnidadeInput');
export const unidadesTableBodyEl = document.getElementById('unidadesTableBody');

// Gerenciar Categorias
export const btnCategoriasBackEl = document.getElementById('btnCategoriasBack');
export const addCategoriaFormEl = document.getElementById('add-categoria-form');
export const nomeCategoriaInputEl = document.getElementById('nomeCategoriaInput');
export const categoriasTableBodyEl = document.getElementById('categoriasTableBody');

// Gerenciar Produtos
export const productManagementTitleEl = document.getElementById('productManagementTitleEl');
export const productManagementBackButtonEl = document.getElementById('productManagementBackButton');
export const addProductFormEl = document.getElementById('addProductForm'); 
export const prodCodigoInputEl = document.getElementById('prodCodigoInput');
export const prodNomeInputEl = document.getElementById('prodNomeInput');
export const prodCategoriasMultiSelectEl = document.getElementById('prodCategoriasMultiSelect');
export const prodUnidadesMultiSelectEl = document.getElementById('prodUnidadesMultiSelect');
export const btnAdicionarProdutoEl = document.getElementById('btnAdicionarProduto'); 
export const importProductFileInputEl = document.getElementById('importProductFileInput'); 
export const btnImportProductsEl = document.getElementById('btnImportProducts'); 
export const productManagementTableBodyEl = document.getElementById('productManagementTableBody');

// Gerenciar Setores
export const btnSetoresBackEl = document.getElementById('btnSetoresBack');
export const addSetorFormEl = document.getElementById('add-setor-form');
export const nomeSetorInputEl = document.getElementById('nomeSetorInput');
export const selectUnidadeSetorEl = document.getElementById('selectUnidadeSetor'); 
export const setoresTableBodyEl = document.getElementById('setoresTableBody');

// Gerenciar Colaboradores
export const colaboradoresBackButtonEl = document.getElementById('colaboradoresBackButton');
export const colaboradoresEmpresaNomeEl = document.getElementById('colaboradoresEmpresaNomeEl'); 
export const addColaboradorFormEl = document.getElementById('add-colaborador-form');
export const colaboradorNomeInputEl = document.getElementById('colaboradorNomeInput');
export const colaboradorUnidadesMultiSelectEl = document.getElementById('colaboradorUnidadesMultiSelect');
export const colaboradoresTableBodyEl = document.getElementById('colaboradoresTableBody');

// Tela de Contagem de Estoque
export const inventoryCountBackButtonEl = document.getElementById('inventoryCountBackButton');
export const btnLogoutContadorEl = document.getElementById('btnLogoutContador'); 
export const inventoryCountTitleEl = document.getElementById('inventoryCountTitleEl');
export const selectColaboradorContagemEl = document.getElementById('selectColaboradorContagem');
export const selectSetorContagemEl = document.getElementById('selectSetorContagem'); 
export const selectUnidadeContagemEl = document.getElementById('selectUnidadeContagem');
export const pesquisaProdutoInputEl = document.getElementById('pesquisaProdutoInput');
export const pesquisaCodigoInputEl = document.getElementById('pesquisaCodigoInput');
export const filtroCategoriaSelectEl = document.getElementById('filtroCategoriaSelect');
export const filtroUnidadeSelectEl = document.getElementById('filtroUnidadeSelect');
export const inventoryTableBodyEl = document.getElementById('inventoryTableBody');
// Botões atualizados
export const btnFinalizarContagemEl = document.getElementById('btnFinalizarContagem');
export const btnVerResumoEl = document.getElementById('btnVerResumo');
export const btnGerarPDFAvulsoEl = document.getElementById('btnGerarPDFAvulso');
export const btnLimparContagemEl = document.getElementById('btnLimparContagem');

// Modal de Resumo da Contagem
export const modalPreviewContagemEl = document.getElementById('modalPreviewContagem');
export const previewContagemTableBodyEl = document.getElementById('previewContagemTableBody');
export const btnClosePreviewModalEl = document.getElementById('btnClosePreviewModal');

// Tela de Histórico de Contagens
export const historicoBackButtonEl = document.getElementById('historicoBackButton');
export const historicoTitleEl = document.getElementById('historicoTitleEl');
export const adminHistoricoEmpresaSelectorContainerEl = document.getElementById('adminHistoricoEmpresaSelectorContainer');
export const historicoUnidadeFilterEl = document.getElementById('historicoUnidadeFilter');
export const historicoContagensTableBodyEl = document.getElementById('historicoContagensTableBody');

// Seletores para a tela de Detalhes da Contagem
export const countDetailsBackButtonEl = document.getElementById('countDetailsBackButton');
export const countDetailsTitleEl = document.getElementById('countDetailsTitleEl');
export const detailsCountIdEl = document.getElementById('detailsCountId');
export const detailsCountDateTimeEl = document.getElementById('detailsCountDateTime');
export const detailsCountContadorEl = document.getElementById('detailsCountContador');
export const detailsCountUnidadeEl = document.getElementById('detailsCountUnidade');
export const detailsCountSetorEl = document.getElementById('detailsCountSetor');
export const detailsCountTotalItemsEl = document.getElementById('detailsCountTotalItems');
export const btnDownloadDetailsPDFEl = document.getElementById('btnDownloadDetailsPDF');
export const btnDownloadDetailsTXTEl = document.getElementById('btnDownloadDetailsTXT');
export const detailsCountItemsTableBodyEl = document.getElementById('detailsCountItemsTableBody');
