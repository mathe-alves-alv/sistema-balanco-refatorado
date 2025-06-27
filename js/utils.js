// js/utils.js

export function loadQuantities() {
    try {
        const quantities = localStorage.getItem('quantities');
        return quantities ? JSON.parse(quantities) : {};
    } catch (e) {
        console.error("Erro ao carregar quantidades do localStorage:", e);
        return {};
    }
}

export function saveQuantities(quantities) {
    try {
        localStorage.setItem('quantities', JSON.stringify(quantities));
    } catch (e) {
        console.error("Erro ao salvar quantidades no localStorage:", e);
    }
}

export function clearAllQuantitiesFromStorage() {
    try {
        localStorage.removeItem('quantities');
    } catch (e) {
        console.error("Erro ao limpar quantidades do localStorage:", e);
    }
}

export function triggerDownload(filename, content, type) {
    const isBlob = content instanceof Blob;
    const blob = isBlob ? content : new Blob([content], { type: type });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); 
    a.click();
    document.body.removeChild(a); 
    URL.revokeObjectURL(url); 
}

export function generateTxtContentForDownload(detalhesContagem, produtosCache) {
    if (!detalhesContagem || Object.keys(detalhesContagem).length === 0) {
        return "Nenhum item contado.";
    }

    const lines = [];
    Object.entries(detalhesContagem).forEach(([produtoId, quantidade]) => {
        const produto = produtosCache.find(p => String(p.id) === String(produtoId));
        if (produto) {
            lines.push(`${produto.codigo};${quantidade}`);
        } else {
            lines.push(`N/A;${quantidade}`); 
        }
    });

    return lines.join('\n');
}

/**
 * Sanitizes a string for use in a filename.
 * @param {string} name - The string to sanitize.
 * @returns {string} The sanitized string.
 */
function sanitizeForFilename(name) {
    if (!name || typeof name !== 'string') return 'sem_nome';
    // Replaces invalid characters with underscore
    return name.replace(/[\s/\\?%*:|"<>]/g, '_').replace(/_+/g, '_');
}

/**
 * Generates a standardized filename for a count report.
 * @param {object} metaData - Object containing report metadata.
 * @param {string} metaData.colaborador - The name of the collaborator.
 * @param {string} metaData.unidade - The name of the unit.
 * @param {string} metaData.setor - The name of the sector.
 * @param {Date|string} metaData.data - The date of the count.
 * @param {string} extension - The file extension (e.g., 'txt', 'pdf').
 * @returns {string} The generated filename.
 */
export function generateCountFilename(metaData, extension) {
    const { colaborador, unidade, setor, data } = metaData;
    
    const dateObj = data instanceof Date ? data : new Date(data);
    const dataFormatada = dateObj.getFullYear() +
                         String(dateObj.getMonth() + 1).padStart(2, '0') +
                         String(dateObj.getDate()).padStart(2, '0');

    const sanitizedColaborador = sanitizeForFilename(colaborador);
    const sanitizedUnidade = sanitizeForFilename(unidade);
    const sanitizedSetor = sanitizeForFilename(setor);

    // Ex: "Matheus_Almoxarifado_Unidade_Principal_20250627.txt"
    return `${sanitizedColaborador}_${sanitizedSetor}_${sanitizedUnidade}_${dataFormatada}.${extension}`;
}

/**
 * Gera o conteúdo do PDF para download.
 * @param {object} detalhesContagem - Objeto com { produtoId: quantidade }.
 * @param {Array} produtosCache - O cache de produtos para obter os detalhes.
 * @param {object|null} countMetaData - Metadados da contagem (data, contador, etc.).
 * @returns {Blob} - O PDF gerado como um Blob.
 */
export function generatePdfContent(detalhesContagem, produtosCache, countMetaData = null) {
    // CORREÇÃO: Utiliza a desestruturação direta do objeto window.jspdf, como no sistema antigo.
    const { jsPDF } = window.jspdf;

    if (typeof jsPDF === 'undefined' || typeof jsPDF.API?.autoTable === 'undefined') {
        console.error('jsPDF ou jsPDF-AutoTable não carregado corretamente. Verifique o console e a ordem dos scripts.');
        return new Blob(["Erro: Biblioteca de PDF não carregada."], { type: "text/plain" });
    }

    const doc = new jsPDF();
    
    let yOffset = 15;

    doc.setFontSize(18);
    doc.text("Relatório de Contagem de Estoque", 14, yOffset);
    yOffset += 10;

    doc.setFontSize(10);
    if (countMetaData) {
        doc.text(`ID da Contagem: ${countMetaData.id}`, 14, yOffset); yOffset += 6;
        doc.text(`Data: ${new Date(countMetaData.created_at).toLocaleString('pt-BR')}`, 14, yOffset); yOffset += 6;
        doc.text(`Contador: ${countMetaData.colaborador_nome_display}`, 14, yOffset); yOffset += 6;
        doc.text(`Unidade: ${countMetaData.unidade_nome_display}`, 14, yOffset); yOffset += 6;
        doc.text(`Setor: ${countMetaData.setor_contagem || 'N/A'}`, 14, yOffset); yOffset += 6;
        doc.text(`Total de Itens Contados: ${countMetaData.total_itens}`, 14, yOffset); yOffset += 10;
    } else {
        doc.text("Contagem Atual", 14, yOffset); yOffset += 10;
    }

    const tableColumn = ["Código", "Produto", "Categoria", "Quantidade"];
    const tableRows = [];

    const itemsArray = Object.entries(detalhesContagem)
        .map(([produtoId, quantidade]) => {
            const produto = produtosCache.find(p => String(p.id) === String(produtoId));
            return {
                codigo: produto ? produto.codigo : 'N/A',
                nome_produto: produto ? produto.nome_produto : 'Produto Desconhecido',
                categoria: (produto && produto.produtos_categorias && produto.produtos_categorias.length > 0) 
                            ? produto.produtos_categorias.map(pc => pc.nome_categoria).join(', ') : 'N/A',
                quantidade: quantidade
            };
        })
        .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '')); 

    itemsArray.forEach(item => {
        tableRows.push([
            item.codigo,
            item.nome_produto,
            item.categoria,
            item.quantidade
        ]);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: yOffset,
        headStyles: { fillColor: [34, 139, 34], fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak', halign: 'left' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 40 },
            3: { halign: 'center', cellWidth: 25 }
        },
        margin: { top: 10, left: 14, right: 14, bottom: 10 },
        theme: 'striped', 
        didDrawPage: function (data) {
            let str = "Página " + doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
        }
    });

    return doc.output('blob');
}

export function generateNumericPassword() {
    const length = 8;
    let password = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        password += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return password;
}