# Sistema de Balanço de Estoque

Este é um sistema simples para ajudar no balanço e contagem de estoque de produtos.
Ele permite o cadastro de produtos (manualmente ou via importação de arquivo XLSX) e a realização da contagem de estoque, gerando um arquivo TXT como resultado.

## Funcionalidades Principais
* Gerenciamento de cadastro de produtos (Adicionar, Remover, Importar de XLSX)
* Contagem de estoque com filtros por código, nome e categoria
* Geração de arquivo TXT com o resultado do balanço
* Interface com tema escuro
* Persistência de dados de produtos utilizando Supabase

## Tecnologias Utilizadas
* HTML
* CSS (Vanilla CSS com variáveis para o tema)
* JavaScript (Vanilla JS)
* Supabase (para backend e banco de dados)
* SheetJS (xlsx.full.min.js) para leitura de arquivos XLSX