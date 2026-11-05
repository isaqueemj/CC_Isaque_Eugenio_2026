from flask import Flask, request, jsonify, session, redirect
from flask_cors import CORS
from datetime import date, datetime
from decimal import Decimal
import os
import re
from db import conectar_banco
import time
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash

diretorio_atual = os.path.dirname(os.path.abspath(__file__))
frontend_path = os.path.join(diretorio_atual, "frontend")

app = Flask(__name__, static_folder=frontend_path, static_url_path="")
CORS(app)

ENTIDADES = {
    "paises": {"table": "paises", "pk": "id_pais"},
    "estados": {"table": "estados", "pk": "id_estado"},
    "cidades": {"table": "cidades", "pk": "id_cidade"},
    "clientes": {"table": "clientes", "pk": "id_cliente"},
    "fornecedores": {"table": "fornecedores", "pk": "id_fornecedor"},
    "produtos": {"table": "produtos", "pk": "id_produto"},
    "categorias": {"table": "categorias", "pk": "id"},    
    "marcas": {"table": "marcas", "pk": "id_marca"},
    "modelos": {"table": "modelos", "pk": "id_modelo"},
    "veiculos": {"table": "veiculos", "pk": "id_veiculo"},
    "transportadores": {"table": "transportadores", "pk": "id_transportador"},
    "condicoes_pagamento": {"table": "condicoes_pagamento", "pk": "id_condicao_pagamento"},
    "formas_pagamento": {"table": "formas_pagamento", "pk": "id_forma_pagamento"},
    "funcionarios": {"table": "funcionarios", "pk": "id_funcionario"}
}

def valor_para_json(valor):
    if isinstance(valor, Decimal): return float(valor)
    if isinstance(valor, (date, datetime)): return valor.isoformat()
    return valor

def normalizar_registros(registros):
    return [{chave: valor_para_json(valor) for chave, valor in registro.items()} for registro in registros]

def obter_colunas(conexao, tabela):
    cursor = conexao.cursor(dictionary=True)
    try:
        cursor.execute(f"SHOW COLUMNS FROM {tabela}")
        return [coluna["Field"] for coluna in cursor.fetchall()]
    finally:
        cursor.close()

def coluna_existe(colunas, coluna): return coluna in colunas

def selecionar_coluna(colunas, coluna, alias=None, padrao="NULL"):
    if coluna in colunas: return f"{coluna} AS {alias}" if alias else coluna
    return f"{padrao} AS {alias}" if alias else f"{padrao} AS {coluna}"

def converter_status_para_ativo(valor):
    if valor is None: return 1
    texto = str(valor).strip().lower()
    if texto in ["inativo", "0", "false", "nao", "não", "n"]: return 0
    return 1

def valor_inteiro_ou_zero(valor):
    try: return int(valor) if valor else 0
    except Exception: return 0

def limpar_payload(payload, colunas):
    return {k: v for k, v in payload.items() if k in colunas}

def obter_valor(dados, *chaves):
    for chave in chaves:
        valor = dados.get(chave)
        if valor is not None and valor != "": return valor
    return None

def validar_obrigatorio_flexivel(dados, campos):
    campos_faltando = []
    for grupo in campos:
        grupo = [grupo] if isinstance(grupo, str) else grupo
        if not any(dados.get(c) for c in grupo): campos_faltando.append(grupo[0])
    return campos_faltando

def validar_entidade(entidade, dados):
    regras = {
        "produtos": [["produto"], ["categoria_id"]],
        "categorias": [["categoria"]],
        "marcas": [["marca"]],
        "paises": [["pais"]],
        "estados": [["estado"], ["id_pais"]],
        "cidades": [["cidade"], ["id_estado"]],
    }
    return validar_obrigatorio_flexivel(dados, regras.get(entidade, []))

def montar_payload(entidade, dados, colunas):
    payload = {}
    
    if entidade == "paises":
        payload["pais"] = dados.get("pais")
        payload["sigla"] = dados.get("sigla")
        payload["ddi"] = dados.get("ddi")
        payload["moeda"] = dados.get("moeda")
        payload["nacionalidade"] = dados.get("nacionalidade")
        payload["codigo_ibge"] = dados.get("codigo_ibge")

    elif entidade == "estados":
        payload["id_pais"] = obter_valor(dados, "id_pais")
        payload["estado"] = dados.get("estado")
        payload["uf"] = dados.get("uf")

    elif entidade == "cidades":
        payload["id_estado"] = obter_valor(dados, "id_estado")
        payload["cidade"] = dados.get("cidade")
        payload["ddd"] = dados.get("ddd") or "000"

    elif entidade == "clientes":
        nome_campo = "cliente" if entidade == "clientes" else "fornecedor"
        payload[nome_campo] = dados.get(nome_campo)
        payload["apelido"], payload["tipo"] = dados.get("apelido"), dados.get("tipo")
        payload["id_cidade"] = obter_valor(dados, "id_cidade")
        payload["logradouro"], payload["numero"], payload["bairro"] = dados.get("logradouro"), dados.get("numero"), dados.get("bairro")
        payload["cep"], payload["complemento"] = dados.get("cep"), dados.get("complemento")
        payload["email"], payload["cpf_cnpj"] = dados.get("email"), dados.get("cpf_cnpj")
        payload["telefone"], payload["celular"] = dados.get("telefone"), dados.get("celular")
        payload["ie"], payload["tipo_pessoa"], payload["rg"] = dados.get("ie"), dados.get("tipo_pessoa"), dados.get("rg")
        payload["observacao"] = dados.get("observacao")
    
    elif entidade == "fornecedores":
        payload["fornecedor"] = dados.get("fornecedor")
        payload["categoria"] = dados.get("categoria")
        payload["nome_fantasia"] = dados.get("nome_fantasia")
        payload["id_cidade"] = obter_valor(dados, "id_cidade", "cidade_id")
        payload["logradouro"], payload["numero"], payload["bairro"] = dados.get("logradouro"), dados.get("numero"), dados.get("bairro")
        payload["cep"], payload["complemento"] = dados.get("cep"), dados.get("complemento")
        payload["email"], payload["cpf_cnpj"] = dados.get("email"), dados.get("cpf_cnpj")
        payload["telefone"], payload["celular"] = dados.get("telefone"), dados.get("celular")
        payload["ie"], payload["tipo_pessoa"], payload["rg"] = dados.get("ie"), dados.get("tipo_pessoa") or "J", dados.get("rg")
        payload["observacao"] = dados.get("observacao")

    elif entidade == "categorias":
        payload["categoria"] = dados.get("categoria")

    elif entidade == "marcas":
        payload["marca"] = dados.get("marca")
        
    elif entidade == "produtos":
        payload["produto"] = dados.get("produto")
        payload["sku"] = dados.get("sku")
        payload["categoria_id"] = dados.get("categoria_id")
        payload["marca_id"] = dados.get("marca_id")
        payload["unidade"] = dados.get("unidade") or "UN"
        payload["preco_custo"] = float(dados.get("preco_custo") or 0)
        payload["preco_venda"] = float(dados.get("preco_venda") or 0)
        payload["saldo"] = float(dados.get("saldo") or 0)
        
        # Converte de forma segura para float e evita travamento do banco (Table Locks)
        try: payload["preco_custo"] = float(dados.get("preco_custo") or 0)
        except ValueError: payload["preco_custo"] = 0.0
        
        try: payload["preco_venda"] = float(dados.get("preco_venda") or 0)
        except ValueError: payload["preco_venda"] = 0.0
        
        try: payload["saldo"] = float(dados.get("saldo") or 0)
        except ValueError: payload["saldo"] = 0.0

    elif entidade == "modelos":
        payload["id_marca"] = obter_valor(dados, "id_marca")
        payload["modelo"], payload["descricao"] = dados.get("modelo"), dados.get("descricao")
        payload["ano_fabricacao"] = dados.get("ano_fabricacao")

    elif entidade == "veiculos":
        payload["fk_modelo"] = obter_valor(dados, "modelo_id", "id_modelo")
        payload["placa"], payload["renavam"], payload["chassi"] = dados.get("placa"), dados.get("renavam"), dados.get("chassi")
        payload["cor"], payload["combustivel"] = dados.get("cor"), dados.get("combustivel")
        payload["ano_fabricacao"], payload["ano_modelo"] = dados.get("ano_fabricacao"), dados.get("ano_modelo")
        payload["quilometragem"] = dados.get("quilometragem") or 0

    elif entidade == "transportadores":
        payload["transportador"], payload["tipo_frete"] = dados.get("transportador"), dados.get("tipo_frete")
        payload["cpf_cnpj"], payload["rg"], payload["ie"] = dados.get("cpf_cnpj"), dados.get("rg"), dados.get("ie")
        payload["telefone"], payload["celular"], payload["email"] = dados.get("telefone"), dados.get("celular"), dados.get("email")
        payload["id_cidade"] = obter_valor(dados, "id_cidade")
        payload["logradouro"], payload["numero"], payload["bairro"] = dados.get("logradouro"), dados.get("numero"), dados.get("bairro")
        payload["cep"], payload["complemento"] = dados.get("cep"), dados.get("complemento")

    elif entidade == "condicoes_pagamento":
        payload["condicao_pagamento"] = dados.get("condicao_pagamento")
        payload["quantidade_parcelas"] = dados.get("quantidade_parcelas") or 1
        payload["intervalo_dias"] = dados.get("intervalo_dias") or 30

    elif entidade == "funcionarios":
        payload["funcionario"], payload["cpf"], payload["rg"] = dados.get("funcionario"), dados.get("cpf"), dados.get("rg")
        payload["data_nascimento"], payload["cargo"], payload["salario"] = dados.get("data_nascimento"), dados.get("cargo"), dados.get("salario") or 0
        payload["data_admissao"], payload["id_cidade"] = dados.get("data_admissao"), obter_valor(dados, "id_cidade")
        payload["logradouro"], payload["numero"], payload["bairro"] = dados.get("logradouro"), dados.get("numero"), dados.get("bairro")
        payload["cep"], payload["complemento"], payload["telefone"], payload["email"] = dados.get("cep"), dados.get("complemento"), dados.get("telefone"), dados.get("email")

    if coluna_existe(colunas, "ativo"): 
        payload["ativo"] = converter_status_para_ativo(dados.get("ativo", 1))
        
    return limpar_payload(payload, colunas)

def montar_select(entidade, colunas):
    status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status" if coluna_existe(colunas, "ativo") else "'Ativo' AS status"

    if entidade == "paises": return f"SELECT id_pais AS id, pais, sigla, ddi, moeda, {status} FROM paises ORDER BY id_pais DESC"
    if entidade == "estados": return f"SELECT id_estado AS id, id_pais, estado, uf, {status} FROM estados ORDER BY id_estado DESC"
    if entidade == "cidades": return f"SELECT id_cidade AS id, id_estado, cidade, ddd, {status} FROM cidades ORDER BY id_cidade DESC"
    if entidade == "clientes": return f"SELECT id_cliente AS id, cliente, cpf_cnpj, email, telefone, id_cidade, logradouro, numero, bairro, cep, complemento, observacao, {status} FROM clientes ORDER BY id_cliente DESC"
    if entidade == "fornecedores": return f"SELECT id_fornecedor AS id, fornecedor, cpf_cnpj, email, telefone, id_cidade, logradouro, numero, bairro, cep, complemento, observacao, categoria, {status} FROM fornecedores ORDER BY id_fornecedor DESC"
    
    # Ajustado: JOINs corretos e alias (ex: 'categoria', 'marca') para o front-end
    if entidade == "produtos": return f"SELECT *, {status} FROM produtos ORDER BY id_produto DESC"    
    if entidade == "modelos": return f"SELECT id_modelo AS id, id_marca, modelo, descricao, ano_fabricacao, {status} FROM modelos ORDER BY id_modelo DESC"
    if entidade == "veiculos": return f"SELECT id_veiculo AS id, fk_modelo, placa, renavam, chassi, cor, ano_fabricacao, ano_modelo, combustivel, quilometragem, {status} FROM veiculos ORDER BY id_veiculo DESC"
    if entidade == "transportadores": return f"SELECT id_transportador AS id, transportador, tipo_frete, cpf_cnpj, email, telefone, id_cidade, logradouro, numero, bairro, cep, complemento, {status} FROM transportadores ORDER BY id_transportador DESC"
    if entidade == "condicoes_pagamento": return f"SELECT id_condicao_pagamento AS id, condicao_pagamento, quantidade_parcelas, intervalo_dias, {status} FROM condicoes_pagamento ORDER BY id_condicao_pagamento DESC"
    if entidade == "funcionarios": return f"SELECT id_funcionario AS id, funcionario, cpf, rg, data_nascimento, cargo, salario, data_admissao, id_cidade, logradouro, numero, bairro, cep, complemento, telefone, email, {status} FROM funcionarios ORDER BY id_funcionario DESC"
    
    # Ajustado: De 'categoria' para 'nome' (conforme seu print da tabela de categorias)
    if entidade == "categorias": return "SELECT id, categoria FROM categorias ORDER BY categoria ASC"
    
    # Ajustado: id_marca AS id (para padronização)
    if entidade == "marcas": return "SELECT id_marca AS id, marca FROM marcas ORDER BY marca ASC"

    return f"SELECT * FROM {ENTIDADES[entidade]['table']}"
# ============================================================
# ROTAS DA API - ROBUSTAS E SEM BLOQUEIOS DE TABELA (TABLE LOCKS)
# ============================================================

@app.route("/api/<entidade>", methods=["GET"])
def listar_entidade(entidade):
    if entidade not in ENTIDADES: return jsonify({"status": "erro", "mensagem": "Entidade inválida"}), 404
    
    conexao = None
    cursor = None
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)
        sql = montar_select(entidade, obter_colunas(conexao, ENTIDADES[entidade]["table"]))
        cursor.execute(sql)
        registros = cursor.fetchall()
        return jsonify(normalizar_registros(registros)), 200
    except Exception as e:
        print(f"Erro ao listar {entidade}: {e}")
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conexao and conexao.is_connected(): conexao.close()

@app.route("/api/<entidade>", methods=["POST"])
def cadastrar_entidade(entidade):
    if entidade not in ENTIDADES: return jsonify({"status": "erro", "mensagem": "Entidade inválida"}), 404
    
    dados = request.get_json() or {}
    campos_faltando = validar_entidade(entidade, dados)
    if campos_faltando: 
        return jsonify({"status": "erro", "mensagem": f"Faltam campos obrigatórios: {campos_faltando}"}), 400
    
    conexao = None
    cursor = None
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()
        
        payload = montar_payload(entidade, dados, obter_colunas(conexao, ENTIDADES[entidade]["table"]))
        colunas = list(payload.keys())
        valores = list(payload.values())
        
        sql = f"INSERT INTO {ENTIDADES[entidade]['table']} ({', '.join(colunas)}) VALUES ({', '.join(['%s'] * len(colunas))})"
        cursor.execute(sql, valores)
        
        conexao.commit()
        return jsonify({"status": "sucesso", "id_criado": cursor.lastrowid}), 201
        
    except Exception as e:
        if conexao: conexao.rollback()
        print(f"Erro Crítico POST {entidade}: {e}")
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conexao and conexao.is_connected(): conexao.close()

@app.route("/api/<entidade>/<int:id_registro>", methods=["PUT"])
def atualizar_entidade(entidade, id_registro):
    if entidade not in ENTIDADES: return jsonify({"status": "erro", "mensagem": "Entidade inválida"}), 404
    
    dados = request.get_json() or {}
    campos_faltando = validar_entidade(entidade, dados)
    if campos_faltando: 
        return jsonify({"status": "erro", "mensagem": f"Faltam campos obrigatórios: {campos_faltando}"}), 400
    
    conexao = None
    cursor = None
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()
        
        payload = montar_payload(entidade, dados, obter_colunas(conexao, ENTIDADES[entidade]["table"]))
        set_sql = ", ".join([f"{col} = %s" for col in payload.keys()])
        valores = list(payload.values()) + [id_registro]
        
        sql = f"UPDATE {ENTIDADES[entidade]['table']} SET {set_sql} WHERE {ENTIDADES[entidade]['pk']} = %s"
        cursor.execute(sql, valores)
        
        conexao.commit()
        return jsonify({"status": "sucesso"}), 200
        
    except Exception as e:
        if conexao: conexao.rollback()
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conexao and conexao.is_connected(): conexao.close()

@app.route("/api/<entidade>/<int:id_registro>", methods=["DELETE"])
def excluir_entidade(entidade, id_registro):
    if entidade not in ENTIDADES: return jsonify({"status": "erro", "mensagem": "Entidade inválida"}), 404
    
    conexao = None
    cursor = None
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()
        cursor.execute(f"DELETE FROM {ENTIDADES[entidade]['table']} WHERE {ENTIDADES[entidade]['pk']} = %s", (id_registro,))
        conexao.commit()
        return jsonify({"status": "sucesso"}), 200
    except Exception as e:
        if conexao: conexao.rollback()
        # Tratamento especial para apanhar erro de chave estrangeira
        msg_erro = "Erro ao apagar. Possivelmente existem outros registos vinculados a este." if "foreign key constraint" in str(e).lower() else str(e)
        return jsonify({"status": "erro", "mensagem": msg_erro}), 500
    finally:
        if cursor: cursor.close()
        if conexao and conexao.is_connected(): conexao.close()

@app.route("/api/relatorio/compras_contas_pagar", methods=["GET"])
def relatorio_compras_contas():
    conexao = None
    cursor = None
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)
        
        sql = """
            SELECT 
                c.id_compra, c.numero_nota_fiscal, c.data_emissao,
                f.fornecedor AS nome_fornecedor, c.valor_total AS total_compra,
                c.status AS status_compra, cap.numero_parcela,
                cap.data_vencimento, cap.valor_parcela, cap.valor_pago,
                cap.status AS status_pagamento
            FROM compras c
            INNER JOIN fornecedores f ON c.id_fornecedor = f.id_fornecedor
            LEFT JOIN contas_pagar cap ON c.id_compra = cap.id_compra
            WHERE c.ativo = TRUE 
            ORDER BY c.data_emissao DESC, cap.data_vencimento ASC
        """
        cursor.execute(sql)
        registros = cursor.fetchall()
        
        return jsonify(normalizar_registros(registros)), 200
    except Exception as e:
        print(f"Erro ao gerar relatório: {e}")
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conexao and conexao.is_connected(): conexao.close()

@app.route("/api/compras_lancamento", methods=["POST"])
def lancar_compra():
    dados = request.get_json() or {}
    
    # Validação básica
    obrigatorios = ["id_fornecedor", "id_condicao_pagamento", "id_forma_pagamento", "valor_total", "data_emissao"]
    if not all(dados.get(c) for c in obrigatorios):
        return jsonify({"status": "erro", "mensagem": "Preencha todos os campos obrigatórios."}), 400
        
    conexao = None
    cursor = None
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()
        
        # Gera o Número da Nota Fiscal automaticamente pelo sistema
        # Ex: NF-20261015173045
        numero_nf = datetime.now().strftime("NF-%Y%m%d%H%M%S")
        
        # 1. Inserir a Compra
        sql_compra = """
            INSERT INTO compras 
            (id_fornecedor, id_condicao_pagamento, id_forma_pagamento, numero_nota_fiscal, data_emissao, valor_total, observacao) 
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        valores_compra = (
            dados["id_fornecedor"], dados["id_condicao_pagamento"], dados["id_forma_pagamento"], 
            numero_nf, dados["data_emissao"], float(dados["valor_total"]), dados.get("observacao", "")
        )
        cursor.execute(sql_compra, valores_compra)
        id_compra_gerada = cursor.lastrowid
        
        # 2. Inserir a primeira parcela no Contas a Pagar automaticamente
        sql_conta = """
            INSERT INTO contas_pagar 
            (id_compra, id_fornecedor, id_forma_pagamento, numero_parcela, descricao, data_vencimento, valor_parcela, status) 
            VALUES (%s, %s, %s, 1, %s, %s, %s, 'ABERTA')
        """
        # Simplificando o vencimento para 30 dias após a emissão como padrão
        valores_conta = (
            id_compra_gerada, dados["id_fornecedor"], dados["id_forma_pagamento"],
            f"Parcela 1 da {numero_nf}", dados["data_emissao"], float(dados["valor_total"])
        )
        cursor.execute(sql_conta, valores_conta)
        
        conexao.commit()
        return jsonify({"status": "sucesso", "mensagem": "Lançamento realizado com sucesso!", "nota_fiscal": numero_nf}), 201
        
    except Exception as e:
        if conexao: conexao.rollback()
        print(f"Erro ao lançar compra: {e}")
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conexao and conexao.is_connected(): conexao.close()

@app.route("/api/condicoes_pagamento", methods=["POST"])
def salvar_condicao_pagamento():
    dados = request.get_json() or {}
    
    # Validação dos campos obrigatórios
    if not dados.get("condicao") or not dados.get("num_parcelas"):
        return jsonify({"status": "erro", "mensagem": "Os campos Condição e Nº de Parcelas são obrigatórios."}), 400
        
    conexao = None
    cursor = None
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor()
        
        # 1. Inserir Cabeçalho da Condição
        sql_cabecalho = """
            INSERT INTO condicoes_pagamento 
            (condicao, num_parcelas, taxa_desconto, taxa_multa, taxa_juros, ativo) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        valores_cabecalho = (
            dados["condicao"].upper(),
            int(dados["num_parcelas"]),
            float(dados.get("taxa_desconto", 0)),
            float(dados.get("taxa_multa", 0)),
            float(dados.get("taxa_juros", 0)),
            bool(dados.get("ativo", True))
        )
        cursor.execute(sql_cabecalho, valores_cabecalho)
        id_condicao_gerada = cursor.lastrowid
        
        # 2. Inserir as N Parcelas vinculadas
        parcelas = dados.get("parcelas", [])
        if parcelas:
            sql_parcela = """
                INSERT INTO condicoes_pagamento_parcelas 
                (id_condicao_pagamento, numero_parcela, percentual, dias, id_forma_pagamento) 
                VALUES (%s, %s, %s, %s, %s)
            """
            for p in parcelas:
                forma_pgto = p.get("id_forma_pagamento")
                valores_parcela = (
                    id_condicao_gerada,
                    int(p["numero_parcela"]),
                    float(p["percentual"]),
                    int(p["dias"]),
                    int(forma_pgto) if forma_pgto else None
                )
                cursor.execute(sql_parcela, valores_parcela)
        
        # Consolida a transação
        conexao.commit()
        return jsonify({"status": "sucesso", "mensagem": "Condição de pagamento cadastrada com sucesso!"}), 201
        
    except Exception as e:
        if conexao: conexao.rollback() # Evita inserção pela metade
        print(f"Erro ao salvar Condição de Pagamento: {e}")
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conexao and conexao.is_connected(): conexao.close()
# ============================================================
# ROTAS DO FRONTEND
# ============================================================

app.secret_key = os.environ.get("SECRET_KEY", "chave_secreta_erp_financeiro_2026_segura")

# ==========================================================
# MIDDLEWARE E DECORATOR DE PROTEÇÃO DE ROTAS
# ==========================================================
def login_obrigatorio(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "usuario_id" not in session:
            # Se for chamada de API, retorna 401 JSON
            if request.path.startswith("/api/"):
                return jsonify({"status": "erro", "mensagem": "Sessão expirada ou usuário não autenticado."}), 401
            # Se for acesso a página HTML, redireciona para o login
            return redirect("/login.html")
        return f(*args, **kwargs)
    return decorated_function

@app.before_request
def verificar_autenticacao_global():
    """Protege automaticamente o Dashboard, páginas internas e rotas da API."""
    rotas_publicas = [
        "/login", "/register", "/logout",
        "/login.html", "/css/login.css", "/js/login.js",
        "/css/style.css"
    ]
    caminho = request.path

    # Permite arquivos públicos de login e rotas de autenticação
    if caminho in rotas_publicas or caminho.startswith("/static/"):
        return None

    # Bloqueia acesso não autenticado a qualquer página HTML ou rota da API
    if "usuario_id" not in session:
        if caminho.startswith("/api/"):
            return jsonify({"status": "erro", "mensagem": "Acesso não autorizado. Faça login."}), 401
        return redirect("/login.html")


# ==========================================================
# VALIDAÇÃO MATEMÁTICA DE CPF NO BACK-END
# ==========================================================
def validar_cpf_backend(cpf: str) -> bool:
    numeros = re.sub(r"\D", "", cpf or "")
    if len(numeros) != 11 or numeros == numeros[0] * 11:
        return False
    for i in range(9, 11):
        soma = sum(int(numeros[num]) * ((i + 1) - num) for num in range(0, i))
        digito = ((soma * 10) % 11) % 10
        if digito != int(numeros[i]):
            return False
    return True


# ==========================================================
# ROTAS DE AUTENTICAÇÃO (/register, /login, /logout)
# ==========================================================
@app.route("/register", methods=["POST"])
def registrar_usuario():
    dados = request.get_json() or {}
    nome = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").strip().lower()
    cpf = (dados.get("cpf") or "").strip()
    senha = dados.get("senha") or ""

    if not nome or not email or not cpf or not senha:
        return jsonify({"status": "erro", "mensagem": "Preencha todos os campos obrigatórios."}), 400

    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$", email):
        return jsonify({"status": "erro", "mensagem": "Formato de e-mail inválido."}), 400

    if not validar_cpf_backend(cpf):
        return jsonify({"status": "erro", "mensagem": "CPF inválido."}), 400

    if len(senha) < 6:
        return jsonify({"status": "erro", "mensagem": "A senha deve ter pelo menos 6 caracteres."}), 400

    # Formata o CPF no padrão 000.000.000-00
    apenas_digitos = re.sub(r"\D", "", cpf)
    cpf_formatado = f"{apenas_digitos[:3]}.{apenas_digitos[3:6]}.{apenas_digitos[6:9]}-{apenas_digitos[9:]}"

    conexao = None
    cursor = None
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        # Verifica duplicidade de E-mail ou CPF
        cursor.execute(
            "SELECT id_usuario, email, cpf FROM usuarios WHERE email = %s OR cpf = %s",
            (email, cpf_formatado)
        )
        existente = cursor.fetchone()
        if existente:
            if existente["email"] == email:
                return jsonify({"status": "erro", "mensagem": "Este e-mail já está cadastrado."}), 409
            return jsonify({"status": "erro", "mensagem": "Este CPF já está cadastrado."}), 409

        # Gera o Hash seguro da senha
        senha_hash = generate_password_hash(senha)

        sql = """
            INSERT INTO usuarios (nome, email, cpf, senha_hash, ativo)
            VALUES (%s, %s, %s, %s, TRUE)
        """
        cursor.execute(sql, (nome.upper(), email, cpf_formatado, senha_hash))
        conexao.commit()

        return jsonify({"status": "sucesso", "mensagem": "Conta criada com sucesso! Faça seu login."}), 201

    except Exception as e:
        if conexao:
            conexao.rollback()
        print(f"Erro no cadastro de usuário: {e}")
        return jsonify({"status": "erro", "mensagem": "Erro interno ao cadastrar usuário."}), 500
    finally:
        if cursor:
            cursor.close()
        if conexao and conexao.is_connected():
            conexao.close()


@app.route("/login", methods=["POST"])
def login_usuario():
    dados = request.get_json() or {}
    identificador = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""

    if not identificador or not senha:
        return jsonify({"status": "erro", "mensagem": "Informe seu e-mail e senha."}), 400

    conexao = None
    cursor = None
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        cursor.execute(
            "SELECT id_usuario, nome, email, cpf, senha_hash, ativo FROM usuarios WHERE email = %s LIMIT 1",
            (identificador,)
        )
        usuario = cursor.fetchone()

        if not usuario or not check_password_hash(usuario["senha_hash"], senha):
            return jsonify({"status": "erro", "mensagem": "E-mail ou senha incorretos."}), 401

        if not usuario.get("ativo", True):
            return jsonify({"status": "erro", "mensagem": "Usuário inativo. Contate o administrador."}), 403

        # Cria sessão segura do usuário
        session.clear()
        session["usuario_id"] = usuario["id_usuario"]
        session["usuario_nome"] = usuario["nome"]
        session["usuario_email"] = usuario["email"]

        return jsonify({
            "status": "sucesso",
            "mensagem": "Login realizado com sucesso!",
            "usuario": {
                "id": usuario["id_usuario"],
                "nome": usuario["nome"],
                "email": usuario["email"]
            },
            "redirect": "/dashboard.html"
        }), 200

    except Exception as e:
        print(f"Erro no login: {e}")
        return jsonify({"status": "erro", "mensagem": "Erro interno ao processar login."}), 500
    finally:
        if cursor:
            cursor.close()
        if conexao and conexao.is_connected():
            conexao.close()


@app.route("/logout", methods=["POST", "GET"])
def logout_usuario():
    session.clear()
    if request.method == "GET":
        return redirect("/login.html")
    return jsonify({"status": "sucesso", "redirect": "/login.html"}), 200


@app.route("/api/usuario_logado", methods=["GET"])
@login_obrigatorio
def obter_usuario_logado():
    return jsonify({
        "id": session.get("usuario_id"),
        "nome": session.get("usuario_nome"),
        "email": session.get("usuario_email")
    }), 200


# ==========================================================
# ROTA DE RESUMO DO DASHBOARD (KPIs FINANCEIROS E CADASTRAIS)
# ==========================================================
@app.route("/api/dashboard/resumo", methods=["GET"])
@login_obrigatorio
def resumo_dashboard():
    conexao = None
    cursor = None
    resumo = {
        "total_clientes": 0,
        "total_fornecedores": 0,
        "contas_pagar_abertas": 0.0,
        "contas_receber_abertas": 0.0
    }
    try:
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)

        # 1. Total de Clientes Ativos
        try:
            cursor.execute("SELECT COUNT(*) AS total FROM clientes WHERE ativo = TRUE")
            row = cursor.fetchone()
            resumo["total_clientes"] = int(row["total"] or 0)
        except Exception:
            pass

        # 2. Total de Fornecedores Ativos
        try:
            cursor.execute("SELECT COUNT(*) AS total FROM fornecedores WHERE ativo = TRUE")
            row = cursor.fetchone()
            resumo["total_fornecedores"] = int(row["total"] or 0)
        except Exception:
            pass

        # 3. Soma de Contas a Pagar em Aberto
        try:
            cursor.execute("""
                SELECT COALESCE(SUM(valor_parcela - COALESCE(valor_pago, 0)), 0) AS total
                FROM contas_pagar
                WHERE status = 'ABERTA' AND ativo = TRUE
            """)
            row = cursor.fetchone()
            resumo["contas_pagar_abertas"] = float(row["total"] or 0.0)
        except Exception:
            pass

        # 4. Soma de Contas a Receber em Aberto
        try:
            cursor.execute("""
                SELECT COALESCE(SUM(valor_parcela - COALESCE(valor_recebido, 0)), 0) AS total
                FROM contas_receber
                WHERE status = 'ABERTA' AND ativo = TRUE
            """)
            row = cursor.fetchone()
            resumo["contas_receber_abertas"] = float(row["total"] or 0.0)
        except Exception:
            pass

        return jsonify(resumo), 200
    except Exception as e:
        print(f"Erro ao carregar resumo do dashboard: {e}")
        return jsonify(resumo), 200
    finally:
        if cursor:
            cursor.close()
        if conexao and conexao.is_connected():
            conexao.close()
@app.route("/")
def index(): 
    return send_from_directory(frontend_path, "index.html")

@app.route("/<path:nome_arquivo>")
def assets(nome_arquivo): 
    return send_from_directory(frontend_path, nome_arquivo)

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)