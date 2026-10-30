document.addEventListener('DOMContentLoaded', () => {
    
    // FUNÇÃO PARA CARREGAR A TABELA
    window.carregarTabela = async function() {
        const tbody = document.querySelector('#mainTable tbody');
        try {
            const res = await fetch('/api/marcas');
            const data = await res.json();
            
            tbody.innerHTML = data.map(m => `
                <tr>
                    <td>${m.marca ? m.marca.toUpperCase() : ''}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="editar(${m.id}, '${m.marca}')"><i class="fa-solid fa-pen"></i> EDITAR</button>
                        <button class="btn btn-sm btn-danger" onclick="apagar(${m.id})"><i class="fa-solid fa-trash"></i> APAGAR</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error("ERRO AO CARREGAR TABELA:", error);
        }
    };

    // FUNÇÃO GLOBAL PARA EDITAR
    window.editar = function(id, nome) {
        document.getElementById('crudForm').reset();
        
        // PREENCHE O ID OCULTO
        document.getElementById('recordId').value = id;
        
        // PREENCHE O CAMPO DE TEXTO (Corrigido para usar a variável 'nome')
        const inputMarca = document.querySelector('input[name="marca"]');
        if (inputMarca) {
            inputMarca.value = nome ? nome.toUpperCase() : '';
        }
        
        // ABRE O MODAL
        new bootstrap.Modal(document.getElementById('crudModal')).show();
    };

    // FUNÇÃO GLOBAL PARA APAGAR
    window.apagar = async function(id) {
        if(confirm("DESEJA APAGAR ESTA MARCA?")) {
            const res = await fetch(`/api/marcas/${id}`, { method: 'DELETE' });
            if(res.ok) {
                alert("APAGADO COM SUCESSO!");
                carregarTabela();
            } else {
                alert("ERRO AO APAGAR!");
            }
        }
    };

    // EVENTO DO BOTÃO NOVO
    const btnNovo = document.getElementById('btnNovo');
    if(btnNovo) {
        btnNovo.addEventListener('click', () => {
            document.getElementById('crudForm').reset();
            document.getElementById('recordId').value = ''; 
            new bootstrap.Modal(document.getElementById('crudModal')).show();
        });
    }

    // SUBMIT REFORMULADO (SALVAR)
    document.getElementById('crudForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('recordId').value;
        const nomeValor = document.querySelector('input[name="marca"]').value.trim().toUpperCase();
        
        const url = id ? `/api/marcas/${id}` : '/api/marcas';
        const metodo = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, { 
                method: metodo, 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ marca: nomeValor }) 
            });
            
            if (res.ok) {
                alert("SALVO COM SUCESSO!");
                bootstrap.Modal.getInstance(document.getElementById('crudModal')).hide();
                carregarTabela();
            } else {
                alert("ERRO AO SALVAR!");
            }
        } catch (error) {
            console.error("Erro na requisição:", error);
        }
    });

    // CARREGA A TABELA INICIALMENTE
    carregarTabela();
});