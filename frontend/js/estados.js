document.addEventListener('DOMContentLoaded', () => {
    const crudModal = new bootstrap.Modal(document.getElementById('crudModal'));
    const paisModal = new bootstrap.Modal(document.getElementById('paisModal'));
    const crudForm = document.getElementById('crudForm');
    const paisForm = document.getElementById('paisForm');
    const btnNovo = document.getElementById('btnNovo');
    const btnNovoPais = document.getElementById('btnNovoPais'); // Botão "+"
    
    let tsPais; // Variável global para a busca inteligente

    // 1. CARREGAR SELECT COM TOMSELECT (Padrão Funcionando)
    async function carregarPaises() {
        try {
            const res = await fetch('/api/paises');
            const paises = await res.json();
            const select = document.getElementById('idPais');
            
            // Limpa e recarrega as opções
            select.innerHTML = '<option value="">Selecione ou busque...</option>' + 
                paises.map(p => `<option value="${p.id}">${p.pais}</option>`).join('');

            // Destrói instância anterior se existir para não dar erro
            if (tsPais) tsPais.destroy();

            // Inicializa a busca inteligente
            tsPais = new TomSelect('#idPais', {
                create: function(input, callback) {
                    paisForm.reset();
                    document.getElementById('pais').value = input.toUpperCase();
                    paisModal.show();
                    callback(false);
                },
                dropdownParent: 'body' // Impede que o dropdown fique cortado no Modal
            });
        } catch (e) {
            console.error("Erro ao carregar países:", e);
        }
    }

    // 2. CARREGAR TABELA DE ESTADOS
    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        try {
            const resPaises = await fetch('/api/paises');
            const dataPaises = await resPaises.json();
            const mapPaises = new Map(dataPaises.map(p => [p.id, p.pais]));

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

            // Re-atribui eventos após desenhar a tabela
            document.querySelectorAll('.btn-editar').forEach(btn => {
                btn.addEventListener('click', () => {
                    crudForm.reset();
                    document.getElementById('recordId').value = btn.dataset.id;
                    document.getElementById('nomeEstado').value = btn.dataset.estado;
                    document.getElementById('uf').value = btn.dataset.uf;
                    if (tsPais) tsPais.setValue(btn.dataset.id_pais);
                    crudModal.show();
                });
            });

            document.querySelectorAll('.btn-apagar').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    if(confirm("Tem certeza que deseja apagar este estado?")) {
                        const res = await fetch(`/api/estados/${id}`, { method: 'DELETE' });
                        if(res.ok) {
                            await carregarTabela();
                            alert("Apagado com sucesso!");
                        } else {
                            alert("Erro ao apagar registro.");
                        }
                    }
                });
            });
        } catch (e) {
            console.error("Erro na busca de estados:", e);
        }
    }

    // 3. AÇÕES DOS BOTÕES (Novo Estado e + País)
    if (btnNovo) {
        btnNovo.addEventListener('click', () => {
            crudForm.reset();
            document.getElementById('recordId').value = '';
            if (tsPais) tsPais.clear();
            crudModal.show();
        });
    }

    if (btnNovoPais) {
        btnNovoPais.addEventListener('click', () => {
            paisForm.reset();
            paisModal.show();
        });
    }

    // 4. SALVAR ESTADO
    crudForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        if (tsPais) data.id_pais = tsPais.getValue();
        
        const id = document.getElementById('recordId').value;
        const res = await fetch(id ? `/api/estados/${id}` : '/api/estados', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            crudModal.hide();
            await carregarTabela();
        } else {
            alert("Erro ao salvar.");
        }
    });

    // 5. SALVAR NOVO PAÍS
    paisForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const res = await fetch('/api/paises', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if (res.ok) {
            const result = await res.json();
            paisModal.hide();
            await carregarPaises(); // Recarrega o dropdown
            if (tsPais) tsPais.addItem(result.id_criado); // Seleciona o novo
        } else {
            alert("Erro ao cadastrar país.");
        }
    });

    carregarPaises();
    carregarTabela();
});