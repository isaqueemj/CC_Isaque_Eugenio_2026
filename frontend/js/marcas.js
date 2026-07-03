document.addEventListener('DOMContentLoaded', () => {
    
    // FUNÇÃO PARA CARREGAR A TABELA
    window.carregarTabela = async function() {
        const tbody = document.querySelector('#mainTable tbody');
        try {
            const res = await fetch('/api/marcas');
            const data = await res.json();
            
            // MANTIDO O SEU MAP, ADICIONANDO toUpperCase() E OS ÍCONES
            tbody.innerHTML = data.map(m => `
                <tr>
                    <td>${m.nome ? m.nome.toUpperCase() : ''}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="editar(${m.id}, '${m.nome}')"><i class="fa-solid fa-pen"></i> EDITAR</button>
                        <button class="btn btn-sm btn-danger" onclick="apagar(${m.id})"><i class="fa-solid fa-trash"></i> APAGAR</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error("ERRO AO CARREGAR TABELA:", error);
        }
    };

    // FUNÇÃO GLOBAL PARA EDITAR (CHAMADA PELO ONCLICK)
    window.editar = function(id, nome) {
        document.getElementById('crudForm').reset();
        
        // PREENCHE O ID OCULTO E O NOME
        document.getElementById('recordId').value = id;
        document.getElementsByName('nome')[0].value = nome.toUpperCase();
        
        // ABRE O MODAL
        new bootstrap.Modal(document.getElementById('crudModal')).show();
    };

    // FUNÇÃO GLOBAL PARA APAGAR (CHAMADA PELO ONCLICK)
    window.apagar = async function(id) {
        if(confirm("DESEJA APAGAR ESTA MARCA?")) {
            const res = await fetch(`/api/marcas/${id}`, { method: 'DELETE' });
            if(res.ok) {
                alert("APAGADO COM SUCESSO!");
                carregarTabela(); // RECARREGA A TABELA SEM PRECISAR DAR RELOAD NA PÁGINA INTEIRA
            } else {
                alert("ERRO AO APAGAR!");
            }
        }
    };

    // EVENTO DO BOTÃO NOVO (LIMPA O FORMULÁRIO ANTES DE ABRIR)
    const btnNovo = document.getElementById('btnNovo');
    if(btnNovo) {
        btnNovo.addEventListener('click', () => {
            document.getElementById('crudForm').reset();
            document.getElementById('recordId').value = ''; // LIMPA O ID PARA GARANTIR QUE É UM POST
            new bootstrap.Modal(document.getElementById('crudModal')).show();
        });
    }

    // O SEU SUBMIT REFORMULADO PARA ATENDER POST (NOVO) E PUT (EDITAR)
    document.getElementById('crudForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const idInput = document.getElementById('recordId');
        const id = idInput ? idInput.value : '';
        const nomeValor = document.getElementsByName('nome')[0].value.toUpperCase();
        
        const data = { nome: nomeValor };
        
        // SE TIVER ID, É PUT (EDITAR). SE NÃO TIVER, É POST (CRIAR).
        const url = id ? `/api/marcas/${id}` : '/api/marcas';
        const metodo = id ? 'PUT' : 'POST';

        const res = await fetch(url, { 
            method: metodo, 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(data) 
        });
        
        if(res.ok) {
            alert("SALVO COM SUCESSO!");
            location.reload(); // MANTIDO O SEU RELOAD
        } else {
            alert("ERRO AO SALVAR!");
        }
    });

    // CARREGA A TABELA INICIALMENTE
    carregarTabela();
});