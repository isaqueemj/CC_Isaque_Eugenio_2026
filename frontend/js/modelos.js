document.addEventListener('DOMContentLoaded', () => {
    let mapMarcas = new Map();
    const formatDataUpper = (form) => {
        const data = Object.fromEntries(new FormData(form));
        Object.keys(data).forEach(k => { if(typeof data[k] === 'string') data[k] = data[k].toUpperCase(); });
        return data;
    };

    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        try {
            const resMarcas = await fetch('/api/marcas');
            const dataMarcas = await resMarcas.json();
            mapMarcas = new Map(dataMarcas.map(m => [m.id, m.nome]));

            const res = await fetch('/api/modelos');
            const data = await res.json();
            
            // Aqui removemos as colunas de ano e descricao, mantendo apenas Modelo, Marca e Ações
            tbody.innerHTML = data.map(i => `
                <tr>
                    <td>${i.modelo || ''}</td>
                    <td>${mapMarcas.get(i.id_marca) || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" data-obj='${JSON.stringify(i)}'><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${i.id}"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', async () => {
                document.getElementById('crudForm').reset();
                await carregarSelectMarcas();
                const obj = JSON.parse(btn.dataset.obj);
                document.getElementById('recordId').value = obj.id;
                Object.keys(obj).forEach(k => {
                    const el = document.getElementsByName(k)[0];
                    if(el) el.value = obj[k];
                });
                new bootstrap.Modal(document.getElementById('crudModal')).show();
            }));

            document.querySelectorAll('.btn-apagar').forEach(btn => btn.addEventListener('click', async () => {
                if(confirm("Deseja apagar?")) {
                    const res = await fetch(`/api/modelos/${btn.dataset.id}`, { method: 'DELETE' });
                    if(res.ok) { await carregarTabela(); alert("Apagado!"); } else alert("Erro!");
                }
            }));
        } catch (e) { console.error(e); }
    }

    async function carregarSelectMarcas(idSelecionado = null) {
        const select = document.getElementById('idMarca');
        try {
            const res = await fetch('/api/marcas');
            const data = await res.json();
            select.innerHTML = '<option value="">Selecione...</option>' + data.map(m => `<option value="${m.id}">${m.nome}</option>`).join('');
            if(idSelecionado) select.value = idSelecionado;
        } catch (e) {}
    }

    document.getElementById('btnNovo').addEventListener('click', () => {
        document.getElementById('crudForm').reset(); document.getElementById('recordId').value = '';
        carregarSelectMarcas();
        new bootstrap.Modal(document.getElementById('crudModal')).show();
    });

    document.getElementById('btnNovaMarca').addEventListener('click', () => {
        document.getElementById('marcaForm').reset();
        new bootstrap.Modal(document.getElementById('marcaModal')).show();
    });

    document.getElementById('crudForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target); data.id_marca = parseInt(data.id_marca);
        const id = document.getElementById('recordId').value;
        const res = await fetch(id ? `/api/modelos/${id}` : '/api/modelos', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) { bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide(); await carregarTabela(); alert("Salvo!"); } else alert("Erro!");
    });

    document.getElementById('marcaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        const res = await fetch('/api/marcas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (res.ok) { 
            const r = await res.json();
            bootstrap.Modal.getInstance(document.getElementById('marcaModal')).hide();
            await carregarSelectMarcas(r.id_criado); alert("Marca salva!"); 
        } else alert("Erro!");
    });

    document.getElementById('marcaModal').addEventListener('hidden.bs.modal', function () {
        if (document.getElementById('crudModal').classList.contains('show')) document.body.classList.add('modal-open');
    });

    carregarTabela();
});