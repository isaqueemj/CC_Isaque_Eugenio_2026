document.addEventListener('DOMContentLoaded', () => {
    let mapCidades = new Map();
    const formatDataUpper = (form) => {
        const data = Object.fromEntries(new FormData(form));
        Object.keys(data).forEach(k => { if(typeof data[k] === 'string') data[k] = data[k].toUpperCase(); });
        return data;
    };

    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        try {
            const [resCidades, resClientes] = await Promise.all([fetch('/api/cidades'), fetch('/api/clientes')]);
            const dataCidades = await resCidades.json();
            const dataClientes = await resClientes.json();
            dataCidades.forEach(c => mapCidades.set(c.id, c.cidade));

            tbody.innerHTML = dataClientes.map(i => `
                <tr>
                    <td>${i.cliente || ''}</td>
                    <td>${i.documento || ''}</td>
                    <td>${mapCidades.get(i.id_cidade) || 'N/A'}</td>
                    <td>${i.telefone || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" data-obj='${JSON.stringify(i)}'><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${i.id}"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', async () => {
                document.getElementById('crudForm').reset();
                await carregarSelectCidades();
                const obj = JSON.parse(btn.dataset.obj);
                document.getElementById('recordId').value = obj.id;
                obj.cpf_cnpj = obj.documento; // map for form
                Object.keys(obj).forEach(k => {
                    const el = document.getElementsByName(k)[0];
                    if(el) el.value = obj[k];
                });
                new bootstrap.Modal(document.getElementById('crudModal')).show();
            }));

            document.querySelectorAll('.btn-apagar').forEach(btn => btn.addEventListener('click', async () => {
                if(confirm("Deseja apagar?")) {
                    const res = await fetch(`/api/clientes/${btn.dataset.id}`, { method: 'DELETE' });
                    if(res.ok) { await carregarTabela(); alert("Apagado!"); } else alert("Erro!");
                }
            }));
        } catch (e) { console.error(e); }
    }

    async function carregarSelectCidades(idSel=null) {
        const select = document.getElementById('idCidade');
        const res = await fetch('/api/cidades'); const data = await res.json();
        select.innerHTML = '<option value="">Selecione...</option>' + data.map(i => `<option value="${i.id}">${i.cidade}</option>`).join('');
        if(idSel) select.value = idSel;
    }
    async function carregarSelectEstados(idSel=null) {
        const select = document.getElementById('idEstado');
        const res = await fetch('/api/estados'); const data = await res.json();
        select.innerHTML = '<option value="">Selecione...</option>' + data.map(i => `<option value="${i.id}">${i.estado} - ${i.uf}</option>`).join('');
        if(idSel) select.value = idSel;
    }
    async function carregarSelectPaises(idSel=null) {
        const select = document.getElementById('idPais');
        const res = await fetch('/api/paises'); const data = await res.json();
        select.innerHTML = '<option value="">Selecione...</option>' + data.map(i => `<option value="${i.id}">${i.pais}</option>`).join('');
        if(idSel) select.value = idSel;
    }

    document.getElementById('btnNovo').addEventListener('click', () => {
        document.getElementById('crudForm').reset(); document.getElementById('recordId').value = '';
        carregarSelectCidades(); new bootstrap.Modal(document.getElementById('crudModal')).show();
    });
    
    // Cascatas
    document.getElementById('btnNovaCidade').addEventListener('click', () => {
        document.getElementById('cidadeForm').reset(); carregarSelectEstados(); new bootstrap.Modal(document.getElementById('cidadeModal')).show();
    });
    document.getElementById('btnNovoEstado').addEventListener('click', () => {
        document.getElementById('estadoForm').reset(); carregarSelectPaises(); new bootstrap.Modal(document.getElementById('estadoModal')).show();
    });
    document.getElementById('btnNovoPais').addEventListener('click', () => {
        document.getElementById('paisForm').reset(); new bootstrap.Modal(document.getElementById('paisModal')).show();
    });

    // Submits
    document.getElementById('crudForm').addEventListener('submit', async (e) => {
        e.preventDefault(); const data = formatDataUpper(e.target); data.id_cidade = parseInt(data.id_cidade);
        const id = document.getElementById('recordId').value;
        const res = await fetch(id ? `/api/clientes/${id}` : '/api/clientes', { method: id ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
        if(res.ok) { bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide(); await carregarTabela(); alert("Salvo!"); } else alert("Erro!");
    });
    document.getElementById('cidadeForm').addEventListener('submit', async (e) => {
        e.preventDefault(); const data = formatDataUpper(e.target); data.estado_id = parseInt(data.estado_id);
        const res = await fetch('/api/cidades', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
        if(res.ok) { const r = await res.json(); bootstrap.Modal.getInstance(document.getElementById('cidadeModal')).hide(); await carregarSelectCidades(r.id_criado); alert("Salvo!"); }
    });
    document.getElementById('estadoForm').addEventListener('submit', async (e) => {
        e.preventDefault(); const data = formatDataUpper(e.target); data.id_pais = parseInt(data.id_pais);
        const res = await fetch('/api/estados', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
        if(res.ok) { const r = await res.json(); bootstrap.Modal.getInstance(document.getElementById('estadoModal')).hide(); await carregarSelectEstados(r.id_criado); alert("Salvo!"); }
    });
    document.getElementById('paisForm').addEventListener('submit', async (e) => {
        e.preventDefault(); const data = formatDataUpper(e.target);
        const res = await fetch('/api/paises', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
        if(res.ok) { const r = await res.json(); bootstrap.Modal.getInstance(document.getElementById('paisModal')).hide(); await carregarSelectPaises(r.id_criado); alert("Salvo!"); }
    });

    // Manter backdrops
    ['cidadeModal', 'estadoModal', 'paisModal'].forEach(id => {
        document.getElementById(id).addEventListener('hidden.bs.modal', () => { document.body.classList.add('modal-open'); });
    });

    carregarTabela();
});