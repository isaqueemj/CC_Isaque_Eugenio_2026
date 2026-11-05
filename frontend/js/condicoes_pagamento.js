let formasPagamentoDisponiveis = [
    { id: 1, nome: 'DINHEIRO' },
    { id: 2, nome: 'PIX' },
    { id: 3, nome: 'BOLETO' },
    { id: 4, nome: 'CARTÃO DE CRÉDITO' },
    { id: 5, nome: 'CARTÃO DE DÉBITO' }
];

let modalCondicaoInstance = null;
let modalFormaInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Controle de recolher sidebar
    const btnToggle = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    if (btnToggle && sidebar) {
        btnToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // Instâncias das Modais Bootstrap
    const elModalCondicao = document.getElementById('modalCondicaoPagamento');
    if (elModalCondicao) {
        modalCondicaoInstance = new bootstrap.Modal(elModalCondicao);
    }

    const elModalForma = document.getElementById('modalNovaFormaPgto');
    if (elModalForma) {
        modalFormaInstance = new bootstrap.Modal(elModalForma);
    }

    // Botão "+ Nova Condição"
    const btnAbrir = document.getElementById('btnAbrirModalCondicao');
    if (btnAbrir) {
        btnAbrir.addEventListener('click', abrirModalNovaCondicao);
    }

    // Eventos do campo Nº de Parcelas
    const inputNumParcelas = document.getElementById('cp_num_parcelas');
    if (inputNumParcelas) {
        inputNumParcelas.addEventListener('input', gerarLinhasParcelas);
        inputNumParcelas.addEventListener('change', gerarLinhasParcelas);
    }

    await carregarFormasPagamento();
    await carregarListaCondicoes();
    gerarLinhasParcelas();
});

async function carregarFormasPagamento() {
    try {
        const res = await fetch('/api/formas_pagamento');
        if (res.ok) {
            const dados = await res.json();
            if (Array.isArray(dados) && dados.length > 0) {
                formasPagamentoDisponiveis = dados.map(f => ({
                    id: f.id || f.id_forma_pagamento,
                    nome: f.forma_pagamento || f.descricao || f.nome
                }));
            }
        }
    } catch (err) {
        // Mantém a lista padrão caso a rota ainda não responda
    }
}

function abrirModalNovaCondicao() {
    document.getElementById('formCondicaoPagamento').reset();
    document.getElementById('cp_id').value = '';
    document.getElementById('cp_codigo').value = '—';
    document.getElementById('cp_num_parcelas').value = 1;
    document.getElementById('cp_taxa_desconto').value = 0;
    document.getElementById('cp_taxa_multa').value = 0;
    document.getElementById('cp_taxa_juros').value = 0;
    document.getElementById('cp_ativo').checked = true;

    gerarLinhasParcelas();
    if (modalCondicaoInstance) {
        modalCondicaoInstance.show();
    }
}

function montarOpcoesSelectForma(valorSelecionado = '') {
    let html = '<option value="">Selecione...</option>';
    formasPagamentoDisponiveis.forEach(f => {
        const selected = String(f.id) === String(valorSelecionado) ? 'selected' : '';
        html += `<option value="${f.id}" ${selected}>${f.nome}</option>`;
    });
    return html;
}

function gerarLinhasParcelas() {
    const inputNum = document.getElementById('cp_num_parcelas');
    let num = parseInt(inputNum.value, 10);

    if (isNaN(num) || num < 1) {
        num = 1;
    }
    if (num > 120) {
        num = 120;
        inputNum.value = 120;
    }

    const container = document.getElementById('container-parcelas');
    container.innerHTML = '';

    const percBase = Math.floor((100 / num) * 100) / 100;
    let somaAtePenultimo = 0;

    for (let i = 1; i <= num; i++) {
        let percAtual = percBase;
        if (i === num) {
            percAtual = parseFloat((100 - somaAtePenultimo).toFixed(2));
        } else {
            somaAtePenultimo += percAtual;
        }

        const diasVencimento = i * 30;
        const percFormatado = Number.isInteger(percAtual) ? percAtual : percAtual.toFixed(2);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-secondary">${i}</td>
            <td>
                <input type="number" class="form-control cp-input text-end input-perc" step="0.01" value="${percFormatado}" oninput="atualizarTotalizador()" required>
            </td>
            <td>
                <input type="number" class="form-control cp-input text-end input-dias" value="${diasVencimento}" min="0" required>
            </td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <select class="form-select cp-input select-forma">
                        ${montarOpcoesSelectForma()}
                    </select>
                    <button type="button" class="btn-novo-verde" onclick="abrirModalNovaForma()">
                        + Novo
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
    if (!indicador) return;

    if (Math.abs(total - 100.00) < 0.01) {
        indicador.innerHTML = `Total: 100.00% ✔`;
        indicador.className = 'total-percentual-ok';
    } else {
        indicador.innerHTML = `Total: ${total.toFixed(2)}% ✖`;
        indicador.className = 'total-percentual-erro';
    }
}

function abrirModalNovaForma() {
    document.getElementById('formNovaFormaPgto').reset();
    if (modalFormaInstance) {
        modalFormaInstance.show();
    }
}

async function salvarNovaFormaPagamento() {
    const nomeInput = document.getElementById('inputNomeFormaPgto');
    const nome = nomeInput.value.trim().toUpperCase();
    if (!nome) return;

    try {
        const res = await fetch('/api/formas_pagamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ forma_pagamento: nome, ativo: true })
        });

        if (res.ok) {
            await carregarFormasPagamento();
        } else {
            const novoId = formasPagamentoDisponiveis.length + 1;
            formasPagamentoDisponiveis.push({ id: novoId, nome });
        }
    } catch (e) {
        const novoId = formasPagamentoDisponiveis.length + 1;
        formasPagamentoDisponiveis.push({ id: novoId, nome });
    }

    // Atualiza todos os selects das linhas mantendo o que já estava selecionado
    document.querySelectorAll('.select-forma').forEach(select => {
        const valorAtual = select.value;
        select.innerHTML = montarOpcoesSelectForma(valorAtual);
    });

    if (modalFormaInstance) {
        modalFormaInstance.hide();
    }
}

async function carregarListaCondicoes() {
    const tbody = document.getElementById('listaCondicoes');
    if (!tbody) return;

    try {
        const response = await fetch('/api/condicoes_pagamento');
        if (!response.ok) throw new Error('Falha ao buscar condições');

        const dados = await response.json();
        tbody.innerHTML = '';

        if (!Array.isArray(dados) || dados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Nenhuma condição de pagamento cadastrada.</td></tr>`;
            return;
        }

        dados.forEach(item => {
            const id = item.id || item.id_condicao_pagamento;
            const nomeCondicao = item.condicao || item.condicao_pagamento || item.condicoes_de_parcelamento || '-';
            const numParcelas = item.num_parcelas || item.parcelas || 1;
            const desconto = parseFloat(item.taxa_desconto ?? item.desconto ?? 0).toFixed(2);
            const multa = parseFloat(item.taxa_multa ?? item.multa ?? 0).toFixed(2);
            const juros = parseFloat(item.taxa_juros ?? item.juros ?? 0).toFixed(2);
            const ativo = item.ativo === 1 || item.ativo === true || item.status === 'Ativo';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold text-secondary">#${id}</td>
                <td class="fw-semibold">${nomeCondicao}</td>
                <td class="text-center">${numParcelas}x</td>
                <td class="text-center">${desconto}%</td>
                <td class="text-center">${multa}%</td>
                <td class="text-center">${juros}%</td>
                <td class="text-center">
                    <span class="badge ${ativo ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}">
                        ${ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td class="text-end">
                    <button type="button" class="btn btn-outline-danger btn-sm rounded-3" onclick="excluirCondicao(${id})">
                        <i class="fa-solid fa-trash me-1"></i> Excluir
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Nenhuma condição encontrada. Clique em "+ Nova Condição" para cadastrar.</td></tr>`;
    }
}

async function salvarCondicao() {
    const condicao = document.getElementById('cp_condicao').value.trim();
    const num_parcelas = parseInt(document.getElementById('cp_num_parcelas').value, 10) || 1;
    const taxa_desconto = parseFloat(document.getElementById('cp_taxa_desconto').value) || 0;
    const taxa_multa = parseFloat(document.getElementById('cp_taxa_multa').value) || 0;
    const taxa_juros = parseFloat(document.getElementById('cp_taxa_juros').value) || 0;
    const ativo = document.getElementById('cp_ativo').checked;

    if (!condicao) {
        alert('Informe o nome da Condição de Pagamento.');
        return;
    }

    const inputsPerc = document.querySelectorAll('.input-perc');
    let somaPerc = 0;
    inputsPerc.forEach(i => somaPerc += parseFloat(i.value) || 0);

    if (Math.abs(somaPerc - 100.00) > 0.01) {
        alert('A soma dos percentuais das parcelas deve fechar exatamente em 100.00%.');
        return;
    }

    const parcelas = [];
    const linhas = document.querySelectorAll('#container-parcelas tr');
    linhas.forEach((tr, idx) => {
        const perc = parseFloat(tr.querySelector('.input-perc').value) || 0;
        const dias = parseInt(tr.querySelector('.input-dias').value, 10) || 0;
        const forma = tr.querySelector('.select-forma').value;

        parcelas.push({
            numero_parcela: idx + 1,
            percentual: perc,
            dias: dias,
            id_forma_pagamento: forma ? parseInt(forma, 10) : null
        });
    });

    const payload = {
        condicao,
        condicao_pagamento: condicao,
        num_parcelas,
        taxa_desconto,
        taxa_multa,
        taxa_juros,
        ativo,
        parcelas
    };

    try {
        const response = await fetch('/api/condicoes_pagamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            if (modalCondicaoInstance) modalCondicaoInstance.hide();
            await carregarListaCondicoes();
        } else {
            alert('Erro ao salvar: ' + (result.mensagem || result.erro || 'Verifique os dados informados.'));
        }
    } catch (error) {
        console.error('Erro ao salvar condição:', error);
        alert('Erro de comunicação com o servidor.');
    }
}

async function excluirCondicao(id) {
    if (!confirm('Deseja realmente excluir esta condição de pagamento?')) return;

    try {
        const response = await fetch(`/api/condicoes_pagamento/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            await carregarListaCondicoes();
        } else {
            alert('Não foi possível excluir o registro.');
        }
    } catch (error) {
        console.error('Erro ao excluir:', error);
    }
}