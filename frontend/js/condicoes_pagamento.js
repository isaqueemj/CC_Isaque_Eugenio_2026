document.addEventListener('DOMContentLoaded', () => {
    const inputNumParcelas = document.getElementById('cp_num_parcelas');
    
    // Dispara a geração das parcelas ao perder o foco ou apertar Enter
    inputNumParcelas.addEventListener('change', gerarLinhasParcelas);
    inputNumParcelas.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') gerarLinhasParcelas();
    });
});

function gerarLinhasParcelas() {
    const num = parseInt(document.getElementById('cp_num_parcelas').value) || 0;
    const container = document.getElementById('container-parcelas');
    
    if (num <= 0) {
        container.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3 small">Informe o Nº de Parcelas para gerar a lista.</td></tr>`;
        atualizarTotalizador();
        return;
    }

    container.innerHTML = ''; // Limpa a tabela

    // Lógica para divisão cravada em 100% (ex: 3 parcelas = 33.33 + 33.33 + 33.34)
    const percBase = (100 / num).toFixed(2);
    let somaAtePenultimo = 0;

    for (let i = 1; i <= num; i++) {
        let percAtual = parseFloat(percBase);
        
        // Se for a última parcela, absorve a diferença de dízimas
        if (i === num) {
            percAtual = parseFloat((100 - somaAtePenultimo).toFixed(2));
        } else {
            somaAtePenultimo += percAtual;
        }

        const diasVencimento = i * 30;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center fw-bold align-middle">${i}</td>
            <td>
                <input type="number" class="form-control rounded-3 input-perc" step="0.01" value="${percAtual.toFixed(2)}" oninput="atualizarTotalizador()">
            </td>
            <td>
                <input type="number" class="form-control rounded-3 input-dias" value="${diasVencimento}">
            </td>
            <td>
                <div class="d-flex gap-2">
                    <select class="form-select rounded-3 select-forma">
                        <option value="">Selecione...</option>
                        <option value="1">Boleto</option>
                        <option value="2">Pix</option>
                        <option value="3">Cartão de Crédito</option>
                    </select>
                    <button type="button" class="btn btn-success btn-sm rounded-3 px-3" title="Adicionar Forma">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </td>
        `;
        container.appendChild(tr);
    }
    
    atualizarTotalizador();
}

function atualizarTotalizador() {
    const inputsPerc = document.querySelectorAll('.input-perc');
    let total = 0;
    
    inputsPerc.forEach(input => {
        total += parseFloat(input.value) || 0;
    });

    const indicador = document.getElementById('indicador-total');
    
    if (Math.abs(total - 100.00) < 0.01) {
        // Exatamente 100%
        indicador.innerHTML = `Total: 100.00% ✔`;
        indicador.classList.remove('erro-total');
    } else {
        // Diferente de 100%
        indicador.innerHTML = `Total: ${total.toFixed(2)}% ✖`;
        indicador.classList.add('erro-total');
    }
}

async function salvarCondicao() {
    // 1. Extração do Cabeçalho
    const dados = {
        condicao: document.getElementById('cp_condicao').value.trim(),
        num_parcelas: parseInt(document.getElementById('cp_num_parcelas').value),
        taxa_desconto: document.getElementById('cp_taxa_desconto').value,
        taxa_multa: document.getElementById('cp_taxa_multa').value,
        taxa_juros: document.getElementById('cp_taxa_juros').value,
        ativo: document.getElementById('cp_ativo').checked,
        parcelas: []
    };

    if (!dados.condicao || !dados.num_parcelas) {
        alert("Preencha a Condição de Pagamento e o Número de Parcelas.");
        return;
    }

    // 2. Validação dos 100%
    const inputsPerc = document.querySelectorAll('.input-perc');
    let somaValidacao = 0;
    inputsPerc.forEach(i => somaValidacao += parseFloat(i.value) || 0);
    
    if (Math.abs(somaValidacao - 100.00) > 0.01) {
        alert("A soma dos percentuais das parcelas deve ser exatamente 100%.");
        return;
    }

    // 3. Extração das Linhas da Tabela
    const linhas = document.querySelectorAll('#container-parcelas tr');
    linhas.forEach((tr, index) => {
        const perc = tr.querySelector('.input-perc').value;
        const dias = tr.querySelector('.input-dias').value;
        const forma = tr.querySelector('.select-forma').value;

        dados.parcelas.push({
            numero_parcela: index + 1,
            percentual: perc,
            dias: dias,
            id_forma_pagamento: forma || null
        });
    });

    // 4. Envio POST
    try {
        const response = await fetch('/api/condicoes_pagamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.mensagem);
            bootstrap.Modal.getInstance(document.getElementById('modalCondicaoPagamento')).hide();
            document.getElementById('formCondicaoPagamento').reset();
            document.getElementById('container-parcelas').innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3 small">Informe o Nº de Parcelas para gerar a lista.</td></tr>`;
            atualizarTotalizador();
        } else {
            alert("Erro: " + result.mensagem);
        }
    } catch (error) {
        console.error("Erro ao salvar condição:", error);
        alert("Falha ao comunicar com o servidor.");
    }
}   