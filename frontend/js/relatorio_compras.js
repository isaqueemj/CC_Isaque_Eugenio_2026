document.addEventListener('DOMContentLoaded', async () => {
    await carregarRelatorio();
    await carregarFornecedores();
});

async function carregarRelatorio() {
    const tbody = document.getElementById('tabela-relatorio');
    try {
        const response = await fetch('/api/relatorio/compras_contas_pagar');
        const dados = await response.json();
        tbody.innerHTML = ''; 

        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Nenhum registro encontrado.</td></tr>';
            return;
        }
        
        dados.forEach(item => {
            const dataEmissao = item.data_emissao ? new Date(item.data_emissao).toLocaleDateString('pt-BR') : '-';
            const dataVencimento = item.data_vencimento ? new Date(item.data_vencimento).toLocaleDateString('pt-BR') : '-';
            
            let badgeClass = 'bg-secondary';
            if (item.status_pagamento === 'PAGA') badgeClass = 'bg-success';
            if (item.status_pagamento === 'ABERTA') badgeClass = 'bg-warning text-dark';
            if (item.status_pagamento === 'CANCELADA') badgeClass = 'bg-danger';

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${item.numero_nota_fiscal || '-'}</td>
                    <td>${dataEmissao}</td>
                    <td>${item.nome_fornecedor || '-'}</td>
                    <td>R$ ${parseFloat(item.total_compra || 0).toFixed(2)}</td>
                    <td>${item.numero_parcela || '-'}</td>
                    <td>${dataVencimento}</td>
                    <td>R$ ${parseFloat(item.valor_parcela || 0).toFixed(2)}</td>
                    <td><span class="badge ${badgeClass}">${item.status_pagamento || 'N/A'}</span></td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Erro:", error);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Erro ao carregar.</td></tr>';
    }
}

async function carregarFornecedores() {
    const select = document.getElementById('id_fornecedor');
    try {
        const response = await fetch('/api/fornecedores');
        const fornecedores = await response.json();
        
        select.innerHTML = '<option value="">Selecione um Fornecedor</option>';
        fornecedores.forEach(f => {
            if (f.ativo === 1 || f.status === 'Ativo') {
                select.innerHTML += `<option value="${f.id}">${f.fornecedor}</option>`;
            }
        });
    } catch (error) {
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function salvarLancamento() {
    const dados = {
        data_emissao: document.getElementById('data_emissao').value,
        valor_total: document.getElementById('valor_total').value,
        id_fornecedor: document.getElementById('id_fornecedor').value,
        id_forma_pagamento: document.getElementById('id_forma_pagamento').value,
        id_condicao_pagamento: document.getElementById('id_condicao_pagamento').value,
        observacao: document.getElementById('observacao').value
    };

    if (!dados.data_emissao || !dados.valor_total || !dados.id_fornecedor || !dados.id_forma_pagamento || !dados.id_condicao_pagamento) {
        alert("Preencha todos os campos obrigatórios marcados com *.");
        return;
    }

    try {
        const response = await fetch('/api/compras_lancamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Sucesso! Nota Fiscal gerada: ${result.nota_fiscal}`);
            // Fecha o modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalLancamento'));
            modal.hide();
            // Limpa o formulário
            document.getElementById('formLancamento').reset();
            // Recarrega a tabela para mostrar o novo lançamento
            carregarRelatorio();
        } else {
            alert("Erro: " + result.mensagem);
        }
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Ocorreu um erro ao tentar salvar o lançamento.");
    }
}