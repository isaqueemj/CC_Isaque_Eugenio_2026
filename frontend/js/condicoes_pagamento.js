document.addEventListener('DOMContentLoaded', () => {
    
    // Função para converter os campos de texto para maiúsculas antes de enviar
    const formatDataUpper = (form) => {
        const data = Object.fromEntries(new FormData(form));
        Object.keys(data).forEach(k => { 
            if(typeof data[k] === 'string') {
                data[k] = data[k].toUpperCase(); 
            }
        });
        return data;
    };

    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        if (!tbody) return;

        try {
            const res = await fetch('/api/condicoes_pagamento');
            const data = await res.json();
            
            tbody.innerHTML = data.map(i => `
                <tr>
                    <td>${i.condicao_pagamento || 'N/A'}</td>
                    <td>${i.quantidade_parcelas || 'N/A'}</td>
                    <td>${i.intervalo_dias || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" data-obj='${JSON.stringify(i).replace(/'/g, "&#39;")}'><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${i.id}"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            // Atribui os eventos de edição
            document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', () => {
                const form = document.getElementById('crudForm');
                if (form) form.reset();
                
                const obj = JSON.parse(btn.dataset.obj);
                document.getElementById('recordId').value = obj.id;
                
                Object.keys(obj).forEach(k => {
                    const el = document.getElementsByName(k)[0];
                    if(el) el.value = obj[k];
                });
                
                new bootstrap.Modal(document.getElementById('crudModal')).show();
            }));

            // Atribui os eventos de exclusão
            document.querySelectorAll('.btn-apagar').forEach(btn => btn.addEventListener('click', async () => {
                if(confirm("Deseja apagar esta condição de pagamento?")) {
                    try {
                        const res = await fetch(`/api/condicoes_pagamento/${btn.dataset.id}`, { method: 'DELETE' });
                        if(res.ok) { 
                            await carregarTabela(); 
                            alert("Apagado com sucesso!"); 
                        } else { 
                            const errText = await res.text();
                            alert("Erro ao apagar: " + errText); 
                        }
                    } catch (e) {
                        alert("Erro de conexão ao apagar.");
                    }
                }
            }));
        } catch (e) { console.error("Erro ao carregar a tabela:", e); }
    }

    // Botão NOVO (Robusto - evita o erro de não abrir o modal)
    const btnNovo = document.getElementById('btnNovo');
    if (btnNovo) {
        btnNovo.addEventListener('click', () => {
            const form = document.getElementById('crudForm');
            if (form) form.reset();
            
            const hiddenId = document.getElementById('recordId');
            if (hiddenId) hiddenId.value = '';
            
            const modalEl = document.getElementById('crudModal');
            if (modalEl) {
                new bootstrap.Modal(modalEl).show();
            } else {
                console.error("Erro: Modal #crudModal não encontrado no HTML.");
            }
        });
    }

    // Envio do Formulário (Submit)
    const crudForm = document.getElementById('crudForm');
    if (crudForm) {
        crudForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            const data = formatDataUpper(e.target);
            
            // Garante que quantidade de parcelas e intervalo sejam números inteiros
            data.quantidade_parcelas = parseInt(data.quantidade_parcelas) || 1;
            data.intervalo_dias = parseInt(data.intervalo_dias) || 0;
            
            const id = document.getElementById('recordId').value;
            const url = id ? `/api/condicoes_pagamento/${id}` : '/api/condicoes_pagamento';
            const method = id ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method, 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(data)
                });
                
                if (res.ok) { 
                    bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide(); 
                    await carregarTabela(); 
                    alert("Salvo com sucesso!"); 
                } else { 
                    const errText = await res.text();
                    alert("Erro ao salvar: " + errText); 
                }
            } catch (err) { 
                alert("Erro de conexão: " + err.message); 
            }
        });
    }

    carregarTabela();
});