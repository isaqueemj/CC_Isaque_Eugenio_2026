document.addEventListener('DOMContentLoaded', () => {
    let mapCidades = new Map();
    
    const formatDataUpper = (form) => {
        const data = Object.fromEntries(new FormData(form));
        Object.keys(data).forEach(k => { 
            if(typeof data[k] === 'string' && k !== 'email') {
                data[k] = data[k].toUpperCase(); 
            }
        });
        return data;
    };

    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        try {
            const [resCidades, resFornecedores] = await Promise.all([
                fetch('/api/cidades'), 
                fetch('/api/fornecedores')
            ]);
            const dataCidades = await resCidades.json();
            const dataFornecedores = await resFornecedores.json();
            
            dataCidades.forEach(c => mapCidades.set(c.id, c.cidade));

            tbody.innerHTML = dataFornecedores.map(i => `
                <tr>
                    <td>${i.fornecedor || ''}</td>
                    <td>${i.documento || i.cpf_cnpj || ''}</td>
                    <td>${i.categoria || ''}</td>
                    <td>${mapCidades.get(i.id_cidade) || 'N/A'}</td>
                    <td>${i.telefone || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" data-obj='${JSON.stringify(i).replace(/'/g, "&#39;")}'><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${i.id}"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            // Atribui eventos de editar e apagar LOGO APÓS criar a tabela
            document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', async () => {
                const form = document.getElementById('crudForm');
                if (form) form.reset();
                
                await carregarSelectCidades();
                
                const obj = JSON.parse(btn.dataset.obj);
                document.getElementById('recordId').value = obj.id;
                
                // Mapeia chaves vindas do backend para os nomes dos inputs do HTML
                obj.cpf_cnpj = obj.documento || obj.cpf_cnpj;
                obj.cidade_id = obj.id_cidade; 
                
                Object.keys(obj).forEach(k => {
                    const el = document.getElementsByName(k)[0];
                    if(el) el.value = obj[k];
                });
                
                new bootstrap.Modal(document.getElementById('crudModal')).show();
            }));

            document.querySelectorAll('.btn-apagar').forEach(btn => btn.addEventListener('click', async () => {
                if(confirm("Deseja apagar este fornecedor?")) {
                    const res = await fetch(`/api/fornecedores/${btn.dataset.id}`, { method: 'DELETE' });
                    if(res.ok) { 
                        await carregarTabela(); 
                        alert("Apagado com sucesso!"); 
                    } else { 
                        alert("Erro ao apagar!"); 
                    }
                }
            }));
        } catch (e) { console.error(e); }
    }

    // Funções de carregamento de selects
    async function carregarSelectCidades(idSel=null) {
        const select = document.getElementById('idCidade');
        if(!select) return;
        const res = await fetch('/api/cidades'); 
        const data = await res.json();
        select.innerHTML = '<option value="">Selecione a cidade...</option>' + data.map(i => `<option value="${i.id}">${i.cidade}</option>`).join('');
        if(idSel) select.value = idSel;
    }
    
    async function carregarSelectEstados(idSel=null) {
        const select = document.getElementById('idEstado');
        if(!select) return;
        const res = await fetch('/api/estados'); 
        const data = await res.json();
        select.innerHTML = '<option value="">Selecione o estado...</option>' + data.map(i => `<option value="${i.id}">${i.estado} - ${i.uf}</option>`).join('');
        if(idSel) select.value = idSel;
    }
    
    async function carregarSelectPaises(idSel=null) {
        const select = document.getElementById('idPais');
        if(!select) return;
        const res = await fetch('/api/paises'); 
        const data = await res.json();
        select.innerHTML = '<option value="">Selecione o país...</option>' + data.map(i => `<option value="${i.id}">${i.pais}</option>`).join('');
        if(idSel) select.value = idSel;
    }

    // Botão NOVO (Robusto)
    document.getElementById('btnNovo').addEventListener('click', () => {
        const form = document.getElementById('crudForm');
        if (form) form.reset();
        
        const hiddenId = document.getElementById('recordId');
        if (hiddenId) hiddenId.value = '';
        
        carregarSelectCidades(); 
        
        const modalEl = document.getElementById('crudModal');
        if (modalEl) new bootstrap.Modal(modalEl).show();
    });
    
    // Abertura das Cascatas
    document.getElementById('btnNovaCidade').addEventListener('click', () => {
        const form = document.getElementById('cidadeForm');
        if(form) form.reset();
        carregarSelectEstados(); 
        new bootstrap.Modal(document.getElementById('cidadeModal')).show();
    });
    
    document.getElementById('btnNovoEstado').addEventListener('click', () => {
        const form = document.getElementById('estadoForm');
        if(form) form.reset();
        carregarSelectPaises(); 
        new bootstrap.Modal(document.getElementById('estadoModal')).show();
    });
    
    document.getElementById('btnNovoPais').addEventListener('click', () => {
        const form = document.getElementById('paisForm');
        if(form) form.reset();
        new bootstrap.Modal(document.getElementById('paisModal')).show();
    });

    // Envios de Formulários (Submits)
    document.getElementById('crudForm').addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const data = formatDataUpper(e.target); 
        
        // NORMALIZAÇÃO: O backend exige 'id_cidade'. Aqui transformamos o valor recebido e limpamos a chave incorreta.
        data.id_cidade = parseInt(data.cidade_id || data.id_cidade);
        delete data.cidade_id;
        
        const id = document.getElementById('recordId').value;
        const url = id ? `/api/fornecedores/${id}` : '/api/fornecedores';
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, { 
                method: method, 
                headers: {'Content-Type':'application/json'}, 
                body: JSON.stringify(data) 
            });
            
            if(res.ok) { 
                bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide(); 
                await carregarTabela(); 
                alert("Salvo com sucesso!"); 
            } else { 
                const errText = await res.text();
                alert("Erro do servidor: " + errText); 
            }
        } catch (err) { alert("Erro de conexão: " + err.message); }
    });
    
    document.getElementById('cidadeForm').addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const data = formatDataUpper(e.target); 
        data.id_estado = parseInt(data.estado_id);
        delete data.estado_id;
        
        const res = await fetch('/api/cidades', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
        if(res.ok) { 
            const r = await res.json(); 
            bootstrap.Modal.getInstance(document.getElementById('cidadeModal')).hide(); 
            await carregarSelectCidades(r.id_criado); 
            alert("Cidade salva!"); 
        } else { alert("Erro ao salvar cidade."); }
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
        } else { alert("Erro ao salvar estado."); }
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
        } else { alert("Erro ao salvar país."); }
    });

    // Manter o scroll ativo (backdrop funcional) se um modal sobreposto for fechado
    ['cidadeModal', 'estadoModal', 'paisModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('hidden.bs.modal', () => { 
                document.body.classList.add('modal-open'); 
            });
        }
    });

    carregarTabela();
});