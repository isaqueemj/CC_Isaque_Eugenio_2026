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
            const [resCidades, resTransportadores] = await Promise.all([fetch('/api/cidades'), fetch('/api/transportadores')]);
            const dataCidades = await resCidades.json();
            const dataTransportadores = await resTransportadores.json();
            dataCidades.forEach(c => mapCidades.set(c.id, c.cidade));

            tbody.innerHTML = dataTransportadores.map(i => `
                <tr>
                    <td>${i.transportador || ''}</td>
                    <td>${i.cpf_cnpj || i.documento || ''}</td>
                    <td>${i.tipo_frete || ''}</td>
                    <td>${mapCidades.get(i.id_cidade) || 'N/A'}</td>
                    <td>${i.telefone || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" data-obj='${JSON.stringify(i).replace(/'/g, "&#39;")}'><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${i.id}"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', async () => {
                document.getElementById('crudForm').reset();
                await carregarSelectCidades();
                const obj = JSON.parse(btn.dataset.obj);
                document.getElementById('recordId').value = obj.id;
                obj.cidade_id = obj.id_cidade; // ajuste para payload match
                obj.cpf_cnpj = obj.cpf_cnpj || obj.documento;
                Object.keys(obj).forEach(k => {
                    const el = document.getElementsByName(k)[0];
                    if(el) el.value = obj[k];
                });
                new bootstrap.Modal(document.getElementById('crudModal')).show();
            }));

            document.querySelectorAll('.btn-apagar').forEach(btn => btn.addEventListener('click', async () => {
                if(confirm("Deseja apagar este transportador?")) {
                    const res = await fetch(`/api/transportadores/${btn.dataset.id}`, { method: 'DELETE' });
                    if(res.ok) { await carregarTabela(); alert("Apagado!"); } else alert("Erro ao apagar!");
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
// Substitua todo o bloco de eventos de submit pelo código abaixo:

document.getElementById('crudForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const data = formatDataUpper(e.target); 
    
    // Normalização: O backend espera id_cidade
    data.id_cidade = parseInt(data.cidade_id); 
    delete data.cidade_id; 
    
    const id = document.getElementById('recordId').value;
    const url = id ? `/api/transportadores/${id}` : '/api/transportadores';
    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, { 
            method: method, 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(data) 
        });
        
        if(res.ok) { 
            bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide(); 
            await carregarTabela(); 
            alert("Salvo com sucesso!"); 
        } else {
            const err = await res.json();
            alert("Erro ao salvar: " + (err.mensagem || "Verifique os dados"));
        }
    } catch (err) { alert("Erro de conexão!"); }
});

    document.getElementById('cidadeForm').addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const data = formatDataUpper(e.target); 
        data.id_estado = parseInt(data.estado_id); // Alinhado com o backend
        delete data.estado_id;

        const res = await fetch('/api/cidades', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
        if(res.ok) { 
            const r = await res.json(); 
            bootstrap.Modal.getInstance(document.getElementById('cidadeModal')).hide(); 
            await carregarSelectCidades(r.id_criado); 
            alert("Cidade salva!"); 
        } else { alert("Erro ao salvar cidade!"); }
    });

    document.getElementById('estadoForm').addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const data = formatDataUpper(e.target); 
        data.id_pais = parseInt(data.id_pais);

        const res = await fetch('/api/estados', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
        if(res.ok) { 
            const r = await res.json(); 
            bootstrap.Modal.getInstance(document.getElementById('estadoModal')).hide(); 
            await carregarSelectEstados(r.id_criado); 
            alert("Estado salvo!"); 
        } else { alert("Erro ao salvar estado!"); }
    });

    document.getElementById('paisForm').addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const data = formatDataUpper(e.target);
        const res = await fetch('/api/paises', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
        if(res.ok) { 
            const r = await res.json(); 
            bootstrap.Modal.getInstance(document.getElementById('paisModal')).hide(); 
            await carregarSelectPaises(r.id_criado); 
            alert("País salvo!"); 
        } else { alert("Erro ao salvar país!"); }
    });

    ['cidadeModal', 'estadoModal', 'paisModal'].forEach(id => {
        document.getElementById(id).addEventListener('hidden.bs.modal', () => { document.body.classList.add('modal-open'); });
    });

    carregarTabela();
});