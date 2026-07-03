document.addEventListener('DOMContentLoaded', () => {
    console.log("veiculos.js carregado.");

    // Instanciar Modais
    const elVeiculo = document.getElementById('crudModal');
    const elModelo = document.getElementById('modalNovoModelo');
    const elMarca = document.getElementById('marcaModal');

    const modalVeiculo = elVeiculo ? new bootstrap.Modal(elVeiculo) : null;
    const modalModelo = elModelo ? new bootstrap.Modal(elModelo) : null;
    const modalMarca = elMarca ? new bootstrap.Modal(elMarca) : null;

    // Seletores
    const crudForm = document.getElementById('crudForm');
    const modeloForm = document.getElementById('formNovoModelo');
    const marcaForm = document.getElementById('marcaForm');
    
    // Certifique-se de que estes IDs existem no seu HTML
    const idModeloSelect = document.getElementById('idModelo');
    const idMarcaSelect = document.getElementById('idMarcaNovoModelo');

    // ==========================================
    // FUNÇÕES DE CARREGAMENTO
    // ==========================================
    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        if (!tbody) return;
        try {
            const [resM, resV] = await Promise.all([fetch('/api/modelos'), fetch('/api/veiculos')]);
            const modelos = await resM.json();
            const veiculos = await resV.json();
            const mapM = new Map(modelos.map(m => [m.id, m.modelo]));

            tbody.innerHTML = veiculos.map(i => `
                <tr>
                    <td>${i.placa || ''}</td>
                    <td>${mapM.get(i.fk_modelo || i.modelo_id) || 'N/A'}</td>
                    <td>${i.cor || ''}</td>
                    <td>${i.combustivel || ''}</td>
                    <td>${i.quilometragem || i.km || '0'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" data-obj='${JSON.stringify(i).replace(/'/g, "&#39;")}'><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${i.id}"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } catch (e) { console.error("Erro ao carregar tabela:", e); }
    }

    async function carregarModelosNoSelect(idSelecionado = null) {
        if (!idModeloSelect) return;
        try {
            const res = await fetch('/api/modelos');
            const modelos = await res.json();
            idModeloSelect.innerHTML = '<option value="">Selecione um modelo...</option>' + 
                modelos.map(m => `<option value="${m.id}" ${m.id == idSelecionado ? 'selected' : ''}>${m.modelo}</option>`).join('');
        } catch (e) { console.error("Erro ao carregar modelos"); }
    }

    async function carregarMarcasNoSelect(idSelecionado = null) {
        if (!idMarcaSelect) return;
        try {
            const res = await fetch('/api/marcas');
            const marcas = await res.json();
            idMarcaSelect.innerHTML = '<option value="">Selecione uma marca...</option>' + 
                marcas.map(m => `<option value="${m.id}" ${m.id == idSelecionado ? 'selected' : ''}>${m.nome}</option>`).join('');
        } catch (e) { console.error("Erro ao carregar marcas"); }
    }

    // ==========================================
    // LOGICA DE SUBMIT
    // ==========================================

    // 1. SALVAR VEÍCULO
    if (crudForm) {
        crudForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target).entries());
            
            // GARANTIA: Pegando o valor diretamente do select
            const valorModelo = parseInt(document.getElementById('idModelo').value);

            if (isNaN(valorModelo) || valorModelo <= 0) { 
                alert("Selecione um Modelo válido!"); 
                return; 
            }

            const payload = {
                fk_modelo: valorModelo, // Chave que o seu DB espera
                modelo_id: valorModelo, // Chave de segurança
                placa: (data.placa || "").toUpperCase(),
                cor: (data.cor || "").toUpperCase(),
                combustivel: (data.combustivel || "").toUpperCase(),
                quilometragem: parseInt(data.quilometragem) || 0
            };

            console.log("DEBUG: Enviando payload:", payload); // Olhe isso no F12 -> Console

            const id = document.getElementById('recordId').value;
            const res = await fetch(id ? `/api/veiculos/${id}` : '/api/veiculos', {
                method: id ? 'PUT' : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                if (modalVeiculo) modalVeiculo.hide();
                await carregarTabela();
            } else {
                const erro = await res.text();
                alert("Erro no servidor: " + erro);
            }
        });
    }

    // 2. SALVAR MODELO
    if (modeloForm) {
        modeloForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target).entries());
            const idMarca = parseInt(idMarcaSelect.value);

            const payload = {
                modelo: data.modelo.toUpperCase(),
                fk_marca: idMarca,
                id_marca: idMarca, // Enviando ambos para garantir
                tipo: data.tipo,
                descricao: data.descricao
            };

            const res = await fetch('/api/modelos', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const novoModelo = await res.json();
                await carregarModelosNoSelect(novoModelo.id);
                modeloForm.reset();
                if (modalModelo) modalModelo.hide();
                setTimeout(() => { if (modalVeiculo) modalVeiculo.show(); }, 300);
            }
        });
    }

    // ==========================================
    // CLIQUES GERAIS
    // ==========================================
    document.body.addEventListener('click', async (e) => {
            
        // 1. ABRIR MODAL (NOVO)
        if (e.target.closest('#btnNovo')) {
            crudForm.reset();
            document.getElementById('recordId').value = ""; // Limpa ID oculto
            await carregarModelosNoSelect();
            if (modalVeiculo) modalVeiculo.show();
        }

        // 2. ABRIR MODAL MODELO (+)
        if (e.target.closest('#btnNovoModelo')) {
            await carregarMarcasNoSelect();
        }

        // 3. EDITAR VEÍCULO
        const btnEditar = e.target.closest('.btn-editar');
        if (btnEditar) {
            e.preventDefault();
            const obj = JSON.parse(btnEditar.dataset.obj);
            
            // Preenche o ID oculto
            document.getElementById('recordId').value = obj.id;
            
            // Preenche os campos de texto
            crudForm.querySelector('[name="placa"]').value = obj.placa || '';
            crudForm.querySelector('[name="cor"]').value = obj.cor || '';
            crudForm.querySelector('[name="combustivel"]').value = obj.combustivel || '';
            crudForm.querySelector('[name="quilometragem"]').value = obj.quilometragem || '';
            crudForm.querySelector('[name="renavam"]').value = obj.renavam || '';
            crudForm.querySelector('[name="chassi"]').value = obj.chassi || '';
            
            // Preenche o Select de Modelo (carrega e seleciona o correto)
            await carregarModelosNoSelect(obj.fk_modelo || obj.modelo_id);
            
            if (modalVeiculo) modalVeiculo.show();
        }

        // 4. EXCLUIR VEÍCULO
        const btnApagar = e.target.closest('.btn-apagar');
        if (btnApagar) {
            e.preventDefault();
            const id = btnApagar.dataset.id;
            
            if (confirm("Tem certeza que deseja apagar este veículo?")) {
                try {
                    const res = await fetch(`/api/veiculos/${id}`, { 
                        method: 'DELETE' 
                    });
                    
                    if (res.ok) {
                        alert("Veículo excluído com sucesso!");
                        await carregarTabela();
                    } else {
                        alert("Erro ao excluir veículo.");
                    }
                } catch (err) {
                    console.error("Erro na exclusão:", err);
                }
            }
        }
    });

    carregarTabela();
});