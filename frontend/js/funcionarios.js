let mapaCidades = {};

document.addEventListener('DOMContentLoaded', () => {
    
    // Utilitário para formatar inputs em Maiúsculo
    const formatDataUpper = (form) => {
        const data = Object.fromEntries(new FormData(form));
        Object.keys(data).forEach(k => { 
            if(typeof data[k] === 'string') data[k] = data[k].toUpperCase().trim(); 
        });
        return data;
    };

    // -------------------------------------------------------------------------
    // LOADERS DOS SELECTS (País, Estado, Cidade)
    // -------------------------------------------------------------------------
    async function carregarPaises() {
        try {
            const res = await fetch('/api/paises');
            const data = await res.json();
            const select = document.getElementById('idPais');
            select.innerHTML = '<option value="">SELECIONE O PAÍS...</option>' + 
                data.map(i => `<option value="${i.id_pais || i.id}">${i.pais}</option>`).join('');
        } catch (e) { console.error("Erro ao carregar países:", e); }
    }

    async function carregarEstados() {
        try {
            const res = await fetch('/api/estados');
            const data = await res.json();
            const select = document.getElementById('idEstado');
            select.innerHTML = '<option value="">SELECIONE O ESTADO...</option>' + 
                data.map(i => `<option value="${i.id_estado || i.id}">${i.estado} - ${i.uf}</option>`).join('');
        } catch (e) { console.error("Erro ao carregar estados:", e); }
    }

    async function carregarCidades() {
        try {
            const res = await fetch('/api/cidades');
            const data = await res.json();
            const select = document.getElementById('idCidade');
            select.innerHTML = '<option value="">SELECIONE A CIDADE...</option>' + 
            data.map(i => `<option value="${i.id_cidade || i.id}">${i.cidade}</option>`).join('');
            
            mapaCidades = {};
            data.forEach(c => {
                mapaCidades[c.id_cidade || c.id] = c.cidade;
        }); 
        } catch (e) { console.error("Erro ao carregar cidades:", e); }
    }


    // -------------------------------------------------------------------------
    // CRUD FUNCIONÁRIOS
    // -------------------------------------------------------------------------
    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        if (!tbody) return;
        
        try {
            const res = await fetch('/api/funcionarios'); 
            const data = await res.json();
            
            tbody.innerHTML = data.map(i => {
                const recordId = i.id_funcionario || i.id;
                
                // Aqui buscamos o nome no mapa usando o ID que veio do funcionário
                const idCidade = i.id_cidade;
                const nomeCidade = mapaCidades[idCidade] || 'NÃO ENCONTRADO';
                
                return `
                <tr>
                    <td class="align-middle">${i.funcionario || ''}</td>
                    <td class="align-middle">${i.cpf || ''}</td>
                    <td class="align-middle">${i.cargo || ''}</td>
                    <td class="align-middle">${nomeCidade}</td> 
                    <td class="align-middle">${i.telefone || i.celular || ''}</td>
                    <td class="align-middle">
                        <button class="btn btn-sm btn-warning btn-editar" data-obj='${JSON.stringify(i).replace(/'/g, "&#39;")}' title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${recordId}" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `}).join('');

            // Evento Botão EDITAR
            document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', () => {
                document.getElementById('crudForm').reset();
                const obj = JSON.parse(btn.dataset.obj);
                
                document.getElementById('recordId').value = obj.id_funcionario || obj.id;
                
                // Distribui os dados no form iterando as chaves
                Object.keys(obj).forEach(k => {
                    const el = document.getElementsByName(k)[0];
                    if (el) {
                        // Se o campo for data, precisamos fatiar caso venha timestamp (ex: 2024-01-01T00:00:00.000Z)
                        if (el.type === 'date' && obj[k]) {
                            el.value = String(obj[k]).substring(0, 10);
                        } else {
                            el.value = obj[k];
                        }
                    }
                });
                new bootstrap.Modal(document.getElementById('crudModal')).show();
            }));

            // Evento Botão APAGAR
            document.querySelectorAll('.btn-apagar').forEach(btn => btn.addEventListener('click', async () => {
                if(confirm("Deseja realmente apagar este funcionário?")) {
                    const res = await fetch(`/api/funcionarios/${btn.dataset.id}`, { method: 'DELETE' });
                    if(res.ok) { 
                        await carregarTabela(); 
                        alert("Funcionário apagado com sucesso!"); 
                    } else { 
                        alert("Erro ao apagar funcionário!"); 
                    }
                }
            }));
        } catch (e) { console.error("Erro ao carregar tabela de funcionários:", e); }
    }

    // Botão NOVO FUNCIONÁRIO
    document.getElementById('btnNovo').addEventListener('click', () => {
        document.getElementById('crudForm').reset();
        document.getElementById('recordId').value = '';
        new bootstrap.Modal(document.getElementById('crudModal')).show();
    });

    // Submeter Formulário FUNCIONÁRIOS
    document.getElementById('crudForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        const id = document.getElementById('recordId').value;
        
        const res = await fetch(id ? `/api/funcionarios/${id}` : '/api/funcionarios', {
            method: id ? 'PUT' : 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data)
        });
        
        if (res.ok) { 
            bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide(); 
            await carregarTabela(); 
            alert("Funcionário salvo com sucesso!"); 
        } else { 
            alert("Erro ao salvar funcionário."); 
        }
    });

    // -------------------------------------------------------------------------
    // LÓGICA DOS MODAIS CASCATA (Cidade, Estado, País)
    // -------------------------------------------------------------------------

    // Abrir modais correspondentes
    document.getElementById('btnNovaCidade').addEventListener('click', () => {
        document.getElementById('cidadeForm').reset();
        new bootstrap.Modal(document.getElementById('cidadeModal')).show();
    });

    document.getElementById('btnNovoEstado').addEventListener('click', () => {
        document.getElementById('estadoForm').reset();
        new bootstrap.Modal(document.getElementById('estadoModal')).show();
    });

    document.getElementById('btnNovoPais').addEventListener('click', () => {
        document.getElementById('paisForm').reset();
        new bootstrap.Modal(document.getElementById('paisModal')).show();
    });

    // Salvar Nova Cidade
    document.getElementById('cidadeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        const res = await fetch('/api/cidades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('cidadeModal')).hide();
            await carregarCidades(); // Recarrega o select de cidades
            alert("Cidade salva com sucesso!");
        } else { alert("Erro ao salvar Cidade."); }
    });

    // Salvar Novo Estado
    document.getElementById('estadoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        const res = await fetch('/api/estados', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('estadoModal')).hide();
            await carregarEstados(); // Recarrega o select de estados
            alert("Estado salvo com sucesso!");
        } else { alert("Erro ao salvar Estado."); }
    });

    // Salvar Novo País
    document.getElementById('paisForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        const res = await fetch('/api/paises', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('paisModal')).hide();
            await carregarPaises(); // Recarrega o select de países
            alert("País salvo com sucesso!");
        } else { alert("Erro ao salvar País."); }
    });

    // Inicialização ao carregar a página
    carregarPaises();
    carregarEstados();
    carregarCidades();
    carregarTabela();
});