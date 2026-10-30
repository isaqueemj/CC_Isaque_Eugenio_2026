const API_URL = '/api/categorias';
let crudModalInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('crudModal');
    if (modalEl) {
        crudModalInstance = new bootstrap.Modal(modalEl);
    }

    // Carrega a listagem vinda do banco de dados
    carregarCategorias();

    // Limpa o formulário ao clicar em "Nova Categoria"
    const btnNovo = document.getElementById('btnNovo');
    if (btnNovo) {
        btnNovo.addEventListener('click', () => {
            document.getElementById('crudForm').reset();
            document.getElementById('recordId').value = '';
            document.getElementById('crudModalTitle').innerText = 'Nova Categoria';
        });
    }

    // Salvar registro (POST ou PUT)
    const form = document.getElementById('crudForm');
    if (form) {
        form.addEventListener('submit', salvarCategoria);
    }
});

async function carregarCategorias() {
    const tbody = document.querySelector('#tableCategorias tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4">Carregando categorias...</td></tr>';

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Falha ao comunicar com o servidor');
        const dados = await response.json();

        tbody.innerHTML = '';

        if (!dados || dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-muted">Nenhuma categoria cadastrada.</td></tr>';
            return;
        }

        dados.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold">${item.categoria || ''}</td>
                <td class="text-center">
                    <button class="btn btn-warning btn-sm me-1 text-white" onclick="editarCategoria(${item.id}, '${item.categoria}')" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="excluirCategoria(${item.id})" title="Excluir">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Erro ao listar categorias:', error);
        tbody.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-danger">Erro ao carregar dados do banco. Verifique o servidor.</td></tr>';
    }
}

function editarCategoria(id, nome) {
    document.getElementById('recordId').value = id;
    document.getElementById('categoriaInput').value = nome;
    document.getElementById('crudModalTitle').innerText = 'Editar Categoria';
    crudModalInstance.show();
}

async function salvarCategoria(event) {
    event.preventDefault();
    const id = document.getElementById('recordId').value;
    const nomeCategoria = document.getElementById('categoriaInput').value.trim();

    if (!nomeCategoria) {
        alert('Informe o nome da categoria.');
        return;
    }

    const payload = { categoria: nomeCategoria };
    const metodo = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    try {
        const response = await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const resultado = await response.json();

        if (response.ok) {
            crudModalInstance.hide();
            document.getElementById('crudForm').reset();
            carregarCategorias();
        } else {
            alert(resultado.mensagem || 'Erro ao salvar categoria.');
        }
    } catch (error) {
        console.error('Erro ao salvar categoria:', error);
        alert('Erro ao conectar ao servidor backend.');
    }
}

async function excluirCategoria(id) {
    if (!confirm('Deseja realmente excluir esta categoria?')) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        const resultado = await response.json();

        if (response.ok) {
            carregarCategorias();
        } else {
            alert(resultado.mensagem || 'Erro ao excluir categoria.');
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
        alert('Erro ao conectar ao servidor backend.');
    }
}