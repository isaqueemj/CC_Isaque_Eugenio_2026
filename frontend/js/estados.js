document.addEventListener('DOMContentLoaded', () => {
    let mapPaises = new Map();

    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        try {
            // Carrega os países para transformar o ID em Nome
            const resPaises = await fetch('/api/paises');
            const dataPaises = await resPaises.json();
            mapPaises = new Map(dataPaises.map(p => [p.id, p.pais]));

            const res = await fetch('/api/estados');
            const data = await res.json();
            
            tbody.innerHTML = data.map(e => `
                <tr>
                    <td>${e.estado || 'N/A'}</td>
                    <td>${e.uf || 'N/A'}</td>
                    <td>${mapPaises.get(e.id_pais) || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" 
                            data-id="${e.id}" data-estado="${e.estado}" data-uf="${e.uf}" data-id_pais="${e.id_pais}">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${e.id}">
                            <i class="fa-solid fa-trash"></i> Apagar
                        </button>
                    </td>
                </tr>
            `).join('');

            atribuirEventosBotoes();
        } catch (e) {
            console.error("Erro na busca de estados:", e);
        }
    }

    async function carregarSelectPaises(idSelecionado = null) {
        const select = document.getElementById('idPais');
        try {
            const res = await fetch('/api/paises');
            const data = await res.json();
            select.innerHTML = '<option value="">Selecione um país...</option>' + 
                data.map(p => `<option value="${p.id}">${p.pais}</option>`).join('');
            
            if(idSelecionado) select.value = idSelecionado;
        } catch (e) {
            console.error("Erro na busca de países:", e);
        }
    }

    function atribuirEventosBotoes() {
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.getElementById('crudForm').reset();
                await carregarSelectPaises();
                
                document.getElementById('recordId').value = btn.dataset.id;
                document.getElementById('nomeEstado').value = btn.dataset.estado;
                document.getElementById('uf').value = btn.dataset.uf;
                document.getElementById('idPais').value = btn.dataset.id_pais;
                
                new bootstrap.Modal(document.getElementById('crudModal')).show();
            });
        });

        document.querySelectorAll('.btn-apagar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if(confirm("Tem certeza que deseja apagar este estado?")) {
                    try {
                        const res = await fetch(`/api/estados/${id}`, { method: 'DELETE' });
                        if(res.ok) {
                            await carregarTabela();
                            alert("Apagado com sucesso!");
                        } else {
                            const err = await res.json();
                            alert("Erro ao apagar: " + (err.mensagem || await res.text()));
                        }
                    } catch(e) { alert("Erro: " + e.message); }
                }
            });
        });
    }

    // Abertura de modais
    document.getElementById('btnNovo').addEventListener('click', () => {
        document.getElementById('crudForm').reset();
        document.getElementById('recordId').value = '';
        carregarSelectPaises();
        new bootstrap.Modal(document.getElementById('crudModal')).show();
    });

    document.getElementById('btnNovoPais').addEventListener('click', () => {
        document.getElementById('paisForm').reset();
        new bootstrap.Modal(document.getElementById('paisModal')).show();
    });

    // Envio do formulário Principal (Estado)
    document.getElementById('crudForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        data.id_pais = parseInt(data.id_pais); // Garante o formato correto para o banco
        
        const id = document.getElementById('recordId').value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/estados/${id}` : '/api/estados';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide();
                await carregarTabela();
                alert("Salvo com sucesso!");
            } else {
                alert("Erro do servidor: " + await res.text());
            }
        } catch (err) {
            alert("Erro na requisição: " + err.message);
        }
    });

    // Envio do formulário Cascata (País)
    document.getElementById('paisForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
            const res = await fetch('/api/paises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const result = await res.json();
                bootstrap.Modal.getInstance(document.getElementById('paisModal')).hide();
                // O backend envia "id_criado" de volta no insert. Atualiza o select de países no form de estado.
                await carregarSelectPaises(result.id_criado); 
                alert("País cadastrado com sucesso!");
            } else {
                alert("Erro ao cadastrar país: " + await res.text());
            }
        } catch (err) {
            alert("Erro na requisição: " + err.message);
        }
    });

    // Garante que ao fechar a modal de país, a barra de rolagem da modal principal volte a funcionar caso haja necessidade
    document.getElementById('paisModal').addEventListener('hidden.bs.modal', function () {
        if (document.getElementById('crudModal').classList.contains('show')) {
            document.body.classList.add('modal-open');
        }
    });

    carregarTabela();
});