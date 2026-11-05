document.addEventListener('DOMContentLoaded', async () => {
    configurarBotaoSidebar();
    await verificarSessaoUsuario();
    await carregarIndicadoresDashboard();
});

function configurarBotaoSidebar() {
    const btnToggle = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    if (btnToggle && sidebar) {
        btnToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
}

async function verificarSessaoUsuario() {
    const spanBoasVindas = document.getElementById('boasVindasUsuario');
    try {
        const response = await fetch('/api/usuario_logado');
        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }
        const usuario = await response.json();
        if (usuario && usuario.nome) {
            spanBoasVindas.textContent = `Olá, ${usuario.nome}`;
            localStorage.setItem('erp_usuario_nome', usuario.nome);
        }
    } catch (error) {
        const nomeSalvo = localStorage.getItem('erp_usuario_nome');
        if (nomeSalvo) {
            spanBoasVindas.textContent = `Olá, ${nomeSalvo}`;
        }
    }
}

async function carregarIndicadoresDashboard() {
    try {
        const response = await fetch('/api/dashboard/resumo');
        if (!response.ok) return;

        const dados = await response.json();
        const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        document.getElementById('kpiTotalClientes').textContent = dados.total_clientes ?? 0;
        document.getElementById('kpiTotalFornecedores').textContent = dados.total_fornecedores ?? 0;
        document.getElementById('kpiContasPagar').textContent = formatadorMoeda.format(dados.contas_pagar_abertas || 0);
        document.getElementById('kpiContasReceber').textContent = formatadorMoeda.format(dados.contas_receber_abertas || 0);
    } catch (error) {
        console.error('Erro ao buscar indicadores do Dashboard:', error);
    }
}

async function realizarLogout() {
    try {
        await fetch('/logout', { method: 'POST' });
    } catch (error) {
        console.error('Erro ao encerrar sessão:', error);
    } finally {
        localStorage.removeItem('erp_usuario_nome');
        window.location.href = '/login.html';
    }
}