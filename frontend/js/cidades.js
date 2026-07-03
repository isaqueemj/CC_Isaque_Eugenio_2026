document.addEventListener('DOMContentLoaded', () => {
    let mapEstados = new Map();
    let mapPaises = new Map();

    const formatDataUpper = (form) => {
        const data = Object.fromEntries(new FormData(form));
        Object.keys(data).forEach(k => { 
            if(typeof data[k] === 'string') data[k] = data[k].toUpperCase(); 
        });
        return data;
    };

    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        try {
            const [resEstados, resPaises, resCidades] = await Promise.all([
                fetch('/api/estados'),
                fetch('/api/paises'),
                fetch('/api/cidades')
            ]);
            
            const dataEstados = await resEstados.json();
            const dataPaises = await resPaises.json();
            const dataCidades = await resCidades.json();

            dataEstados.forEach(e => mapEstados.set(e.id, `${e.estado ? e.estado.toUpperCase() : ''} (${e.uf ? e.uf.toUpperCase() : ''})`));
            dataPaises.forEach(p => mapPaises.set(p.id, p.pais ? p.pais.toUpperCase() : ''));

            // CORREÇÃO: Tratando id_estado corretamente no dataset[cite: 3]
            tbody.innerHTML = dataCidades.map(c => {
                const estadoIdCorreto = c.id_estado || c.estado_id;
                return `
                <tr>
                    <td>${c.cidade ? c.cidade.toUpperCase() : 'N/A'}</td>
                    <td>${c.ddd || 'N/A'}</td>
                    <td>${mapEstados.get(estadoIdCorreto) || 'N/A'}</td>
                    <td>${mapPaises.get(c.id_pais) || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" 
                            data-id="${c.id}" data-cidade="${c.cidade}" data-ddd="${c.ddd}" data-id_estado="${estadoIdCorreto}">
                            <i class="fa-solid fa-pen"></i> EDITAR
                        </button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${c.id}">
                            <i class="fa-solid fa-trash"></i> APAGAR
                        </button>
                    </td>
                </tr>
            `}).join('');

            atribuirEventosBotoes();
        } catch (e) { console.error(e); }
    }

    async function carregarSelectEstados(idSelecionado = null) {
        const select = document.getElementById('idEstado');
        try {
            const res = await fetch('/api/estados');
            const data = await res.json();
            select.innerHTML = '<option value="">SELECIONE UM ESTADO...</option>' + 
                data.map(e => `<option value="${e.id}">${e.estado ? e.estado.toUpperCase() : ''} - ${e.uf ? e.uf.toUpperCase() : ''}</option>`).join('');
            
            if(idSelecionado) select.value = idSelecionado;
        } catch (e) { console.error(e); }
    }

    async function carregarSelectPaises(idSelecionado = null) {
        const select = document.getElementById('idPais');
        try {
            const res = await fetch('/api/paises');
            const data = await res.json();
            select.innerHTML = '<option value="">SELECIONE UM PAÍS...</option>' + 
                data.map(p => `<option value="${p.id}">${p.pais ? p.pais.toUpperCase() : ''}</option>`).join('');
            
            if(idSelecionado) select.value = idSelecionado;
        } catch (e) { console.error(e); }
    }

    function atribuirEventosBotoes() {
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.getElementById('crudForm').reset();
                await carregarSelectEstados();
                
                document.getElementById('recordId').value = btn.dataset.id;
                document.getElementsByName('cidade')[0].value = btn.dataset.cidade ? btn.dataset.cidade.toUpperCase() : '';
                document.getElementsByName('ddd')[0].value = btn.dataset.ddd;
                // CORREÇÃO: Lendo id_estado do dataset
                document.getElementById('idEstado').value = btn.dataset.id_estado; 

                new bootstrap.Modal(document.getElementById('crudModal')).show();
            });
        });

        document.querySelectorAll('.btn-apagar').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                if(confirm("TEM CERTEZA QUE DESEJA APAGAR ESTA CIDADE?")) {
                    try {
                        const res = await fetch(`/api/cidades/${id}`, { method: 'DELETE' });
                        if(res.ok) {
                            await carregarTabela();
                            alert("APAGADA COM SUCESSO!");
                        } else {
                            const err = await res.json();
                            alert("ERRO AO APAGAR: " + (err.mensagem || await res.text()));
                        }
                    } catch(e) { alert("ERRO: " + e.message); }
                }
            });
        });
    }

    document.getElementById('btnNovo').addEventListener('click', () => {
        document.getElementById('crudForm').reset();
        document.getElementById('recordId').value = '';
        carregarSelectEstados();
        new bootstrap.Modal(document.getElementById('crudModal')).show();
    });

    document.getElementById('btnNovoEstado').addEventListener('click', () => {
        document.getElementById('estadoForm').reset();
        carregarSelectPaises();
        new bootstrap.Modal(document.getElementById('estadoModal')).show();
    });

    document.getElementById('btnNovoPais').addEventListener('click', () => {
        document.getElementById('paisForm').reset();
        new bootstrap.Modal(document.getElementById('paisModal')).show();
    });

    document.getElementById('crudForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        
        data.id_estado = parseInt(data.id_estado); 
        
        const id = document.getElementById('recordId').value;
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/cidades/${id}` : '/api/cidades';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide();
                await carregarTabela();
                alert("SALVO COM SUCESSO!");
            } else { 
                const erro = await res.text();
                alert("ERRO DO SERVIDOR: " + erro); 
            }
        } catch (err) { alert(err.message); }
    });

    // POST: ESTADO (CASCATA 1)
    document.getElementById('estadoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        data.id_pais = parseInt(data.id_pais);

        try {
            const res = await fetch('/api/estados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const result = await res.json();
                bootstrap.Modal.getInstance(document.getElementById('estadoModal')).hide();
                await carregarSelectEstados(result.id_criado);
                alert("ESTADO CADASTRADO COM SUCESSO!");
            } else { alert("ERRO AO CADASTRAR ESTADO: " + await res.text()); }
        } catch (err) { alert(err.message); }
    });

    document.getElementById('paisForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        
        if(data.moeda) data.moeda = data.moeda.substring(0, 3);
        if(data.sigla) data.sigla = data.sigla.substring(0, 3);
        if(data.ddi) data.ddi = data.ddi.substring(0, 5);

        try {
            const res = await fetch('/api/paises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                const result = await res.json();
                bootstrap.Modal.getInstance(document.getElementById('paisModal')).hide();
                await carregarSelectPaises(result.id_criado); 
                alert("PAÍS CADASTRADO COM SUCESSO!");
            } else { alert("ERRO AO CADASTRAR PAÍS: " + await res.text()); }
        } catch (err) { alert(err.message); }
    });

    // FOCO DOS MODAIS
    document.getElementById('estadoModal').addEventListener('hidden.bs.modal', function () {
        if (document.getElementById('crudModal').classList.contains('show')) document.body.classList.add('modal-open');
    });

    document.getElementById('paisModal').addEventListener('hidden.bs.modal', function () {
        if (document.getElementById('estadoModal').classList.contains('show')) document.body.classList.add('modal-open');
    });

    carregarTabela();
});