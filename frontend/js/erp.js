const ERP = {
    // Busca dados para preencher SELECTs (ex: Estados para Cidades)
    async popularSelect(endpoint, selectName, displayField, valueField) {
        const res = await fetch(`/api/${endpoint}`);
        const dados = await res.json();
        const select = document.querySelector(`[name="${selectName}"]`);
        if (select) {
            select.innerHTML = dados.map(d => `<option value="${d[valueField]}">${d[displayField]}</option>`).join('');
        }
    },

    // Inicializa DataTable com configuração padrão para suas tabelas
    initTable(tableId, endpoint, columns) {
        return $(`#mainTable`).DataTable({
            ajax: { url: `/api/${endpoint}`, dataSrc: '' },
            columns: columns
        });
    }
};

// Função genérica para salvar rápido e atualizar o select (Cascata)
async function salvarEntidadeRapido(endpoint, data, selectName) {
    await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    // Após salvar, recarrega o select específico
    if(endpoint === 'estados') CidadesModule.carregarEstados();
    alert("Cadastrado com sucesso!");
}

const api = {
    async get(endpoint) {
        const response = await fetch(`/api/${endpoint}`);
        return response.json();
    },
    async post(endpoint, data) {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    }
};