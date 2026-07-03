document.addEventListener('DOMContentLoaded', () => {
    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        try {
            const res = await fetch('/api/paises');
            const data = await res.json();
            
            tbody.innerHTML = data.map(p => `
                <tr>
                    <td>${p.pais || 'N/A'}</td>
                    <td>${p.moeda || 'N/A'}</td>
                    <td>${p.sigla || 'N/A'}</td>
                    <td>${p.ddi || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" 
                            data-id="${p.id}" data-pais="${p.pais}" data-moeda="${p.moeda}" data-sigla="${p.sigla}" data-ddi="${p.ddi}">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${p.id}">
                            <i class="fa-solid fa-trash"></i> Apagar
                        </button>
                    </td>
                </tr>
            `).join('');

            atribuirEventosBotoes();
        } catch (e) {
            console.error("Erro na busca:", e);
        }
    }

    function atribuirEventosBotoes() {
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('crudForm').reset();
                document.getElementById('recordId').value = btn.dataset.id;
                document.getElementById('nomePais').value = btn.dataset.pais;
                document.getElementById('moedaPais').value = btn.dataset.moeda;
                document.getElementById('sigla').value = btn.dataset.sigla;
                document.getElementById('ddi').value = btn.dataset.ddi;
                new bootstrap.Modal(document.getElementById('crudModal')).show();
            });
        });

        document.querySelectorAll('.btn-apagar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if(confirm("Tem certeza que deseja apagar este país? Esta ação não pode ser desfeita.")) {
                    try {
                        const res = await fetch(`/api/paises/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            await carregarTabela();
                            alert("Apagado com sucesso!");
                        } else {
                            const err = await res.json();
                            alert("Erro ao apagar: " + (err.mensagem || await res.text()));
                        }
                    } catch (e) { alert("Erro: " + e.message); }
                }
            });
        });
    }

    document.getElementById('btnNovo').addEventListener('click', () => {
        document.getElementById('crudForm').reset();
        document.getElementById('recordId').value = '';
        new bootstrap.Modal(document.getElementById('crudModal')).show();
    });

    document.getElementById('crudForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const id = document.getElementById('recordId').value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/paises/${id}` : '/api/paises';

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
                const erro = await res.text();
                alert("Erro do servidor: " + erro);
            }
        } catch (err) {
            alert("Erro na requisição: " + err.message);
        }
    });

    carregarTabela();
});