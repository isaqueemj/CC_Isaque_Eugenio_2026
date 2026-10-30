document.addEventListener('DOMContentLoaded', () => {
    const crudModal = new bootstrap.Modal(document.getElementById('crudModal'));
    const crudForm = document.getElementById('crudForm');
    const btnSalvar = document.getElementById('btnSalvar');
    const btnNovo = document.getElementById('btnNovo');
    
    let tsCat, tsMarca; // Variáveis globais para os selects inteligentes

    // ==========================================
    // 1. AÇÃO DO BOTÃO NOVO
    // ==========================================
    if (btnNovo) {
        btnNovo.addEventListener('click', () => {
            if (crudForm) {
                crudForm.reset();
                document.getElementById('recordId').value = '';
                
                // Limpar campos do TomSelect visualmente
                if (tsCat) tsCat.clear();
                if (tsMarca) tsMarca.clear();
                
                crudModal.show();
            }
        });
    }

    // ==========================================
    // 2. FUNÇÃO QUE PREPARA OS DADOS PRO BACKEND
    // ==========================================
    const formatDataForAPI = (form) => {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (['preco_custo', 'preco_venda', 'saldo'].includes(key)) {
                // Previne erros se digitar vírgula e converte para número
                const numStr = value.toString().replace(',', '.');
                data[key] = numStr ? parseFloat(numStr) : 0;
            } else {
                // Textos para maiúsculo
                data[key] = typeof value === 'string' ? value.toUpperCase() : value;
            }
        }
        return data;
    };

    // ==========================================
    // 3. INICIALIZADOR DO TOM-SELECT (BARRA INTELIGENTE)
    // ==========================================
    async function initSearchableSelect(id, apiEndpoint, valueField, labelField, payloadField) {
        try {
            const res = await fetch(apiEndpoint);
            const data = await res.json();
            
            const selectElement = document.getElementById(id);
            selectElement.innerHTML = '<option value="">Buscar...</option>' + 
                data.map(item => `<option value="${item[valueField]}">${item[labelField]}</option>`).join('');

            return new TomSelect(`#${id}`, {
                create: async function(input, callback) {
                    try {
                        const res = await fetch(apiEndpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ [payloadField]: input.toUpperCase() })
                        });
                        const result = await res.json();
                        if (res.ok) {
                            callback({ value: result.id_criado, text: input.toUpperCase() });
                        } else {
                            alert("Erro ao criar: " + (result.mensagem || "Verifique"));
                            callback(false);
                        }
                    } catch (e) {
                        callback(false);
                    }
                }
            });
        } catch (e) {
            console.error(`Erro ao carregar lista de ${id}`, e);
        }
    }

    // ==========================================
    // 4. PREENCHE OS MENUS DROPDOWN (Categorias e Marcas)
    // ==========================================
    async function carregarFormulario() {
        // Categoria no banco chama-se "nome", Marca chama-se "marca"
        tsCat = await initSearchableSelect('selectCategoria', '/api/categorias', 'id', 'categoria', 'categoria');
        tsMarca = await initSearchableSelect('selectMarca', '/api/marcas', 'id', 'marca', 'marca');
    }

    // ==========================================
    // 5. CARREGA E DESENHA A TABELA
    // ==========================================
    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        if (!tbody) return;
        
        try {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Carregando dados...</td></tr>';
            
            // 1. Busca Produtos, Categorias e Marcas do backend ao mesmo tempo
            const [resProd, resCat, resMarca] = await Promise.all([
                fetch('/api/produtos'),
                fetch('/api/categorias'),
                fetch('/api/marcas')
            ]);

            const dataProd = await resProd.json();
            const dataCat = await resCat.json();
            const dataMarca = await resMarca.json();
            
            // 2. Cria "Mapas" para traduzir o ID no Nome textual rapidamente
            const mapaCategorias = {};
            if (Array.isArray(dataCat)) {
                dataCat.forEach(c => mapaCategorias[c.id] = c.categoria);
            }

            const mapaMarcas = {};
            if (Array.isArray(dataMarca)) {
                dataMarca.forEach(m => mapaMarcas[m.id] = m.marca);
            }

            // 3. Verifica se tem produtos
            if (dataProd.length === 0 || dataProd.status === "erro") {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhum produto cadastrado.</td></tr>';
                return;
            }

            // 4. Desenha a tabela usando os Mapas (Traduzindo ID para Texto)
            tbody.innerHTML = dataProd.map(i => `
                <tr>
                    <td>${i.produto || ''}</td>
                    <td>${i.sku || ''}</td>
                    <td>${mapaCategorias[i.categoria_id] || 'SEM CATEGORIA'}</td>
                    <td>${mapaMarcas[i.marca_id] || 'SEM MARCA'}</td>
                    <td>R$ ${parseFloat(i.preco_venda || 0).toFixed(2).replace('.', ',')}</td>
                    <td>${i.saldo || '0'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" data-obj='${JSON.stringify(i).replace(/'/g, "&#39;")}'><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${i.id_produto || i.id}"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            // ==========================================
            // RE-ANEXA EVENTOS DE CLIQUE (EDITAR E APAGAR)
            // ==========================================
            document.querySelectorAll('.btn-editar').forEach(btn => {
                btn.addEventListener('click', () => {
                    if(crudForm) crudForm.reset();
                    const obj = JSON.parse(btn.dataset.obj);
                    
                    document.getElementById('recordId').value = obj.id_produto || obj.id;
                    
                    // Preenche inputs normais
                    Object.keys(obj).forEach(k => {
                        const el = document.getElementsByName(k)[0];
                        if (el && el.tagName !== 'SELECT') el.value = obj[k];
                    });

                    // Seleciona as opções corretas nas barras inteligentes (TomSelect)
                    if (typeof tsCat !== 'undefined' && tsCat) tsCat.setValue(obj.categoria_id || '');
                    if (typeof tsMarca !== 'undefined' && tsMarca) tsMarca.setValue(obj.marca_id || '');
                    
                    crudModal.show();
                });
            });

            document.querySelectorAll('.btn-apagar').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm("Tem certeza que deseja apagar permanentemente?")) {
                        const res = await fetch(`/api/produtos/${btn.dataset.id}`, { method: 'DELETE' });
                        if(res.ok) await carregarTabela();
                        else alert("Erro ao apagar o registro.");
                    }
                });
            });

        } catch (e) { 
            console.error("Erro no carregamento:", e);
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar a tabela.</td></tr>';
        }
    }

    // ==========================================
    // 6. EVENTO DE SALVAR NO BANCO
    // ==========================================
    if (crudForm) {
        crudForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // CORRIGIDO: Agora aponta para a função com o nome correto
            const data = formatDataForAPI(e.target);
            
            // GARANTIA: Pegar os IDs selecionados no TomSelect
            if (tsCat) data.categoria_id = tsCat.getValue();
            if (tsMarca) data.marca_id = tsMarca.getValue();
            
            const id = document.getElementById('recordId').value;
            const url = id ? `/api/produtos/${id}` : '/api/produtos';
            const method = id ? 'PUT' : 'POST';

            try {
                if (btnSalvar) {
                    btnSalvar.disabled = true;
                    btnSalvar.textContent = "Salvando...";
                }

                const res = await fetch(url, {
                    method: method, 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(data)
                });
                
                if (res.ok) { 
                    crudModal.hide(); 
                    await carregarTabela(); 
                } else { 
                    const err = await res.json().catch(() => ({}));
                    alert("Erro ao salvar: " + (err.mensagem || "Verifique os dados"));
                }
            } catch (err) {
                alert("Falha de comunicação com o servidor.");
            } finally {
                if (btnSalvar) {
                    btnSalvar.disabled = false;
                    btnSalvar.textContent = "Salvar";
                }
            }
        });
    }

    // ==========================================
    // 7. ARRANQUE (Start)
    // ==========================================
    carregarFormulario();
    carregarTabela();
});