document.addEventListener('DOMContentLoaded', () => {
    let tsEstado, tsPais;

    const formatDataUpper = (form) => {
        const data = Object.fromEntries(new FormData(form));
        Object.keys(data).forEach(k => { 
            if(typeof data[k] === 'string') data[k] = data[k].toUpperCase(); 
        });
        return data;
    };

    // FUNÇÃO PARA INICIALIZAR TOMSELECT
    function initTomSelects() {
        if (tsEstado) tsEstado.destroy();
        if (tsPais) tsPais.destroy();

        tsEstado = new TomSelect('#idEstado', {
            create: false, // Se estado não deve ser criado via busca, coloque false
            dropdownParent: 'body',
            dropdownDirection: 'top',
            placeholder: 'SELECIONE OU BUSQUE O ESTADO...'
        });

        tsPais = new TomSelect('#idPais', {
            create: function(input, callback) {
                document.getElementById('paisForm').reset();
                document.getElementById('pais').value = input.toUpperCase();
                new bootstrap.Modal(document.getElementById('paisModal')).show();
                callback(false);
            },
            dropdownParent: 'body',
            dropdownDirection: 'top',
            placeholder: 'SELECIONE OU BUSQUE O PAIS...'
        });
    }

    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        if (!tbody) return;
        
        try {
            const [resCidades, resEstados, resPaises] = await Promise.all([
                fetch('/api/cidades'), fetch('/api/estados'), fetch('/api/paises')
            ]);
            
            const dataCidades = await resCidades.json();
            const dataEstados = await resEstados.json();
            const dataPaises = await resPaises.json();
            
            const mapPaises = new Map(dataPaises.map(p => [p.id, p.pais]));
            const mapEstados = new Map(dataEstados.map(e => [e.id, {nome: `${e.estado} (${e.uf})`, id_pais: e.id_pais}]));

            tbody.innerHTML = dataCidades.map(c => {
                const est = mapEstados.get(c.id_estado);
                return `
                <tr>
                    <td>${c.cidade || ''}</td>
                    <td>${c.ddd || ''}</td>
                    <td>${est ? est.nome : 'N/A'}</td>
                    <td>${est ? (mapPaises.get(est.id_pais) || 'N/A') : 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" 
                                data-id="${c.id}" data-cidade="${c.cidade}" 
                                data-id_estado="${c.id_estado}">EDITAR</button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${c.id}">APAGAR</button>
                    </td>
                </tr>`;
            }).join('');

            // RE-VINCULAR BOTÕES APÓS ATUALIZAR TABELA
            atribuirEventosBotoes();
            
        } catch (e) { console.error("Erro na tabela:", e); }
    }

    function atribuirEventosBotoes() {
        // Editar
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.getElementById('crudForm').reset();
                // Importante: Recarregar selects antes de editar para garantir que o TomSelect exista
                await carregarSelects(); 
                
                document.getElementById('recordId').value = btn.dataset.id;
                document.getElementsByName('cidade')[0].value = btn.dataset.cidade;
                if(tsEstado) tsEstado.setValue(btn.dataset.id_estado);
                
                new bootstrap.Modal(document.getElementById('crudModal')).show();
            });
        });

        // Apagar
        document.querySelectorAll('.btn-apagar').forEach(btn => {
            btn.addEventListener('click', async () => {
                if(confirm("Deseja apagar esta cidade?")) {
                    const res = await fetch(`/api/cidades/${btn.dataset.id}`, { method: 'DELETE' });
                    if(res.ok) { await carregarTabela(); alert("Sucesso!"); } 
                    else alert("Erro ao apagar");
                }
            });
        });

        document.getElementById('btnNovo').addEventListener('click', async () => {
            document.getElementById('crudForm').reset();
            document.getElementById('recordId').value = '';
            await carregarSelects();
            // O clear() garante que comece vazio
            if(tsEstado) tsEstado.clear();
            if(tsPais) tsPais.clear();
            new bootstrap.Modal(document.getElementById('crudModal')).show();
        });

        document.getElementById('btnNovoEstado').addEventListener('click', () => {
            document.getElementById('estadoForm').reset();
            new bootstrap.Modal(document.getElementById('estadoModal')).show();
        });

        document.getElementById('btnNovoPais').addEventListener('click', () => {
            document.getElementById('paisForm').reset();
            new bootstrap.Modal(document.getElementById('paisModal')).show();
        });
    }

    async function carregarSelects() {
        const selEstado = document.getElementById('idEstado');
        const selPais = document.getElementById('idPais');
        
        try {
            const [resE, resP] = await Promise.all([fetch('/api/estados'), fetch('/api/paises')]);
            const dataE = await resE.json();
            const dataP = await resP.json();

            selEstado.innerHTML = dataE.map(e => `<option value="${e.id}">${e.estado} - ${e.uf}</option>`).join('');
            selPais.innerHTML = dataP.map(p => `<option value="${p.id}">${p.pais}</option>`).join('');
            
            initTomSelects(); // Inicializa o TomSelect após o HTML estar pronto
        } catch (e) { console.error(e); }
    }

    // ABERTURA DE MODAIS
    document.getElementById('btnNovo').addEventListener('click', async () => {
        document.getElementById('crudForm').reset();
        document.getElementById('recordId').value = '';
        await carregarSelects();
        new bootstrap.Modal(document.getElementById('crudModal')).show();
    });



    // SUBMIT CIDADE
    document.getElementById('crudForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        if(tsEstado) data.id_estado = tsEstado.getValue();
        
        const id = document.getElementById('recordId').value;
        const res = await fetch(id ? `/api/cidades/${id}` : '/api/cidades', {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            // 1. Fecha o modal
            bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide();
            
            // 2. A MÁGICA: Atualiza a tabela imediatamente
            await carregarTabela(); 
            
            // 3. Feedback ao usuário
            console.log("Tabela atualizada com sucesso.");
        } else { 
            alert("Erro ao salvar cidade."); 
        }       
    });

    // SUBMIT PAIS
    document.getElementById('paisForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        
        try {
            const res = await fetch('/api/paises', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                const result = await res.json(); // Espera-se que retorne {id: X, pais: 'NOME'}
                
                // 1. Fecha apenas o modal do país
                bootstrap.Modal.getInstance(document.getElementById('paisModal')).hide();
                
                // 2. A MÁGICA: Adiciona o novo país ao seletor sem resetar o formulário pai
                if (tsPais) {
                    tsPais.addOption({value: result.id_criado, text: data.pais});
                    tsPais.addItem(result.id_criado);
                }
                
                alert("PAÍS CADASTRADO E SELECIONADO!");
            } else { 
                alert("ERRO AO CADASTRAR PAÍS: " + await res.text()); 
            }
        } catch (err) { alert(err.message); }
    });

    document.getElementById('estadoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        data.id_pais = tsPais ? tsPais.getValue() : data.id_pais; // Pega o país selecionado atual

        try {
            const res = await fetch('/api/estados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (res.ok) {
                const result = await res.json();
                
                // 1. Fecha apenas o modal do estado
                bootstrap.Modal.getInstance(document.getElementById('estadoModal')).hide();
                
                // 2. A MÁGICA: Adiciona o novo estado ao seletor sem resetar a cidade
                if (tsEstado) {
                    tsEstado.addOption({value: result.id_criado, text: data.estado});
                    tsEstado.addItem(result.id_criado);
                }
                
                alert("ESTADO CADASTRADO E SELECIONADO!");
            } else { alert("ERRO AO CADASTRAR ESTADO: " + await res.text()); }
        } catch (err) { alert(err.message); }
    });

    document.querySelectorAll('.modal').forEach(modalEl => {
        modalEl.addEventListener('hidden.bs.modal', function () {
            // Remove o efeito de tela escura preso no body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            
            // Remove qualquer div de backdrop que tenha ficado no HTML
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(b => b.remove());
        });
    });

    carregarTabela();
});