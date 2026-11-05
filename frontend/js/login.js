document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');

    // Inputs do Login
    const loginEmail = document.getElementById('loginEmail');
    const loginSenha = document.getElementById('loginSenha');

    // Inputs do Cadastro
    const regNome = document.getElementById('regNome');
    const regEmail = document.getElementById('regEmail');
    const regCpf = document.getElementById('regCpf');
    const regSenha = document.getElementById('regSenha');

    // Eventos em tempo real (Login)
    loginEmail.addEventListener('input', () => validarCampoEmail(loginEmail, 'erroLoginEmail'));
    loginSenha.addEventListener('input', () => validarCampoSenha(loginSenha, 'erroLoginSenha', 1));

    // Eventos em tempo real (Cadastro)
    regNome.addEventListener('input', () => validarCampoNome(regNome, 'erroRegNome'));
    regEmail.addEventListener('input', () => validarCampoEmail(regEmail, 'erroRegEmail'));
    regCpf.addEventListener('input', (e) => {
        e.target.value = aplicarMascaraCPF(e.target.value);
        validarCampoCPF(regCpf, 'erroRegCpf');
    });
    regSenha.addEventListener('input', () => validarCampoSenha(regSenha, 'erroRegSenha', 6));

    // Submissão do Login
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailOk = validarCampoEmail(loginEmail, 'erroLoginEmail');
        const senhaOk = validarCampoSenha(loginSenha, 'erroLoginSenha', 1);

        if (!emailOk || !senhaOk) {
            exibirToast('Verifique os campos destacados em vermelho.', 'danger');
            return;
        }

        await enviarLogin({
            email: loginEmail.value.trim(),
            senha: loginSenha.value
        });
    });

    // Submissão do Cadastro
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nomeOk = validarCampoNome(regNome, 'erroRegNome');
        const emailOk = validarCampoEmail(regEmail, 'erroRegEmail');
        const cpfOk = validarCampoCPF(regCpf, 'erroRegCpf');
        const senhaOk = validarCampoSenha(regSenha, 'erroRegSenha', 6);

        if (!nomeOk || !emailOk || !cpfOk || !senhaOk) {
            exibirToast('Corrija os erros do formulário antes de criar a conta.', 'danger');
            return;
        }

        await enviarCadastro({
            nome: regNome.value.trim(),
            email: regEmail.value.trim(),
            cpf: regCpf.value.trim(),
            senha: regSenha.value
        });
    });
});

// Alterna entre "Entrar" e "Criar Conta"
function alternarAba(aba) {
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    if (aba === 'login') {
        formLogin.classList.remove('d-none');
        formRegister.classList.add('d-none');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        formLogin.classList.add('d-none');
        formRegister.classList.remove('d-none');
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
}

function alternarVisibilidadeSenha(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// ==========================================================
// MÁSCARA E VALIDAÇÃO MATEMÁTICA DE CPF
// ==========================================================
function aplicarMascaraCPF(valor) {
    return valor
        .replace(/\D/g, '')
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function validarCPFMatematico(cpf) {
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length !== 11) return false;

    // Bloqueia sequências repetidas (ex: 000.000.000-00, 111.111.111-11)
    if (/^(\d)\1{10}$/.test(limpo)) return false;

    // Cálculo do 1º Dígito Verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(limpo.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.charAt(9))) return false;

    // Cálculo do 2º Dígito Verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(limpo.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.charAt(10))) return false;

    return true;
}

// ==========================================================
// FUNÇÕES DE VALIDAÇÃO DE CAMPOS E FEEDBACK VISUAL
// ==========================================================
function definirEstadoCampo(input, idErro, mensagemErro) {
    const elErro = document.getElementById(idErro);
    if (mensagemErro) {
        input.classList.add('input-error');
        input.classList.remove('input-valid');
        elErro.textContent = mensagemErro;
        return false;
    } else {
        input.classList.remove('input-error');
        input.classList.add('input-valid');
        elErro.textContent = '';
        return true;
    }
}

function validarCampoNome(input, idErro) {
    const valor = input.value.trim();
    if (!valor) {
        return definirEstadoCampo(input, idErro, 'O nome é obrigatório.');
    }
    if (valor.length < 3) {
        return definirEstadoCampo(input, idErro, 'Digite seu nome completo (mín. 3 letras).');
    }
    return definirEstadoCampo(input, idErro, '');
}

function validarCampoEmail(input, idErro) {
    const valor = input.value.trim();
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!valor) {
        return definirEstadoCampo(input, idErro, 'O e-mail é obrigatório.');
    }
    if (!regexEmail.test(valor)) {
        return definirEstadoCampo(input, idErro, 'Formato de e-mail inválido (ex: usuario@dominio.com).');
    }
    return definirEstadoCampo(input, idErro, '');
}

function validarCampoCPF(input, idErro) {
    const valor = input.value.trim();
    const apenasNumeros = valor.replace(/\D/g, '');
    if (!valor) {
        return definirEstadoCampo(input, idErro, 'O CPF é obrigatório.');
    }
    if (apenasNumeros.length !== 11) {
        return definirEstadoCampo(input, idErro, 'O CPF deve conter exatamente 11 números.');
    }
    if (!validarCPFMatematico(valor)) {
        return definirEstadoCampo(input, idErro, 'CPF inválido. Verifique os dígitos informados.');
    }
    return definirEstadoCampo(input, idErro, '');
}

function validarCampoSenha(input, idErro, minLen) {
    const valor = input.value;
    if (!valor) {
        return definirEstadoCampo(input, idErro, 'A senha é obrigatória.');
    }
    if (valor.length < minLen) {
        return definirEstadoCampo(input, idErro, `A senha deve ter pelo menos ${minLen} caracteres.`);
    }
    return definirEstadoCampo(input, idErro, '');
}

// ==========================================================
// COMUNICAÇÃO COM O BACK-END (FETCH API)
// ==========================================================
async function enviarLogin(payload) {
    const btn = document.getElementById('btnSubmitLogin');
    btn.disabled = true;
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const resultado = await response.json();

        if (response.ok) {
            localStorage.setItem('erp_usuario_nome', resultado.usuario.nome);
            exibirToast('Login realizado! Redirecionando...', 'success');
            setTimeout(() => {
                window.location.href = resultado.redirect || '/dashboard.html';
            }, 600);
        } else {
            exibirToast(resultado.mensagem || 'Credenciais inválidas.', 'danger');
        }
    } catch (error) {
        console.error('Erro no login:', error);
        exibirToast('Falha ao conectar com o servidor.', 'danger');
    } finally {
        btn.disabled = false;
    }
}

async function enviarCadastro(payload) {
    const btn = document.getElementById('btnSubmitRegister');
    btn.disabled = true;
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const resultado = await response.json();

        if (response.ok) {
            exibirToast(resultado.mensagem, 'success');
            document.getElementById('formRegister').reset();
            document.querySelectorAll('#formRegister .form-control').forEach(el => el.classList.remove('input-valid'));
            // Preenche o e-mail no login e muda para a aba Entrar
            document.getElementById('loginEmail').value = payload.email;
            alternarAba('login');
        } else {
            exibirToast(resultado.mensagem || 'Erro ao criar conta.', 'danger');
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        exibirToast('Falha ao conectar com o servidor.', 'danger');
    } finally {
        btn.disabled = false;
    }
}

function exibirToast(mensagem, tipo = 'danger') {
    const container = document.getElementById('toastContainer');
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${tipo} border-0 show`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body fw-semibold">${mensagem}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;
    container.appendChild(toastEl);
    setTimeout(() => toastEl.remove(), 4000);
}