document.addEventListener('DOMContentLoaded', () => {
    const formatDataUpper = (form) => {
        const data = Object.fromEntries(new FormData(form));
        Object.keys(data).forEach(k => { if(typeof data[k] === 'string') data[k] = data[k].toUpperCase(); });
        return data;
    };

    async function carregarTabela() {
        const tbody = document.querySelector('#mainTable tbody');
        if (!tbody) return;
        
        try {
            const res = await fetch('/api/produtos');
            const data = await res.json();
            tbody.innerHTML = data.map(i => `
                <tr>
                    <td>${i.produto || ''}</td>
                    <td>${i.sku || ''}</td>
                    <td>${i.categoria || ''}</td>
                    <td>R$ ${parseFloat(i.preco_venda||0).toFixed(2)}</td>
                    <td>${i.saldo || '0'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning btn-editar" data-obj='${JSON.stringify(i).replace(/'/g, "&#39;")}'><i class="fa-solid fa-pen"></i></button>
                        <button class="btn btn-sm btn-danger btn-apagar" data-id="${i.id}"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            document.querySelectorAll('.btn-editar').forEach(btn => btn.addEventListener('click', () => {
                document.getElementById('crudForm').reset();
                const obj = JSON.parse(btn.dataset.obj);
                document.getElementById('recordId').value = obj.id;
                Object.keys(obj).forEach(k => {
                    const el = document.getElementsByName(k)[0];
                    if(el) el.value = obj[k];
                });
                new bootstrap.Modal(document.getElementById('crudModal')).show();
            }));

            document.querySelectorAll('.btn-apagar').forEach(btn => btn.addEventListener('click', async () => {
                if(confirm("Deseja apagar este produto?")) {
                    const res = await fetch(`/api/produtos/${btn.dataset.id}`, { method: 'DELETE' });
                    if(res.ok) { await carregarTabela(); alert("Apagado!"); } else alert("Erro ao apagar!");
                }
            }));
        } catch (e) { console.error(e); }
    }

    document.getElementById('btnNovo').addEventListener('click', () => {
        document.getElementById('crudForm').reset();
        document.getElementById('recordId').value = '';
        new bootstrap.Modal(document.getElementById('crudModal')).show();
    });

    document.getElementById('crudForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = formatDataUpper(e.target);
        const id = document.getElementById('recordId').value;
        const res = await fetch(id ? `/api/produtos/${id}` : '/api/produtos', {
            method: id ? 'PUT' : 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data)
        });
        
        if (res.ok) { 
            bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide(); 
            await carregarTabela(); 
            alert("Salvo com sucesso!"); 
        } else { alert("Erro ao salvar produto."); }
    });

    carregarTabela();
});
