const API_URL = '/api/formas_pagamento';
let modalFormaInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Menu Sidebar responsivo
    const btnToggle = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    if (btnToggle && sidebar) {
        btnToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // Instanciar Modal do Bootstrap
    const elModal = document.getElementById('modalForma');
    if (elModal) {
        modalFormaInstance = new bootstrap.Modal(elModal);
    }

    // Ação do Botão Novo
    const btnNovo = document.getElementById('btnNovo');
    if (btnNovo) {
        btnNovo.addEventListener('click', () => {
            document.getElementById('formForma').reset();
            document.getElementById('forma_id').value = '';
            document.getElementById('tituloModal').innerText = 'Nova Forma de Pagamento';
            document.getElementById('forma_ativo').checked = true;
            modalFormaInstance.show();
        });
    }

    carregarFormas();
});

async function carregarFormas() {
    const tbody = document.getElementById('tabela-formas');
    if (!tbody) return;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Falha ao buscar formas de pagamento');
        
        const dados = await response.json();
        tbody.innerHTML = '';

        if (!Array.isArray(dados) || dados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">Nenhuma forma de pagamento encontrada.</td></tr>`;
            return;
        }

        dados.forEach(item => {
            const id = item.id_forma_pagamento || item.id;
            const nome = item.forma_pagamento;
            const ativo = item.ativo === 1 || item.ativo === true;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4 text-secondary fw-bold">#${id}</td>
                <td class="fw-semibold">${nome}</td>
                <td class="text-center">
                    <span class="badge ${ativo ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">
                        ${ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td class="text-end pe-4">
                    <button class="btn btn-outline-primary btn-sm rounded-3 me-1" onclick="editarForma(${id}, '${nome}', ${ativo})" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm rounded-3" onclick="excluirForma(${id})" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger">Erro de conexão com o servidor.</td></tr>`;
    }
}

async function salvarForma() {
    const id = document.getElementById('forma_id').value;
    const nome = document.getElementById('forma_descricao').value.trim().toUpperCase();
    const ativo = document.getElementById('forma_ativo').checked;

    const payload = { forma_pagamento: nome, ativo: ativo };
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            modalFormaInstance.hide();
            carregarFormas();
        } else {
            alert(result.mensagem || 'Erro ao salvar forma de pagamento.');
        }
    } catch (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao se comunicar com o backend.');
    }
}

function editarForma(id, nome, ativo) {
    document.getElementById('formForma').reset();
    document.getElementById('forma_id').value = id;
    document.getElementById('forma_descricao').value = nome;
    document.getElementById('forma_ativo').checked = ativo;
    document.getElementById('tituloModal').innerText = 'Editar Forma de Pagamento';
    
    modalFormaInstance.show();
}

async function excluirForma(id) {
    if (!confirm('Atenção: Deseja realmente excluir esta forma de pagamento?')) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        const result = await response.json();

        if (response.ok) {
            carregarFormas();
        } else {
            alert(result.mensagem || 'Não foi possível excluir.');
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao se comunicar com o backend.');
    }
}