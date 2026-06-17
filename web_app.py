from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import date, datetime
from decimal import Decimal
import os
from db import conectar_banco


diretorio_atual = os.path.dirname(os.path.abspath(__file__))
frontend_path = os.path.join(diretorio_atual, "frontend")

app = Flask(
    __name__,
    static_folder=frontend_path,
    static_url_path=""
)

CORS(app)


# ============================================================
# CONFIGURAÇÃO DAS ENTIDADES
# ============================================================

ENTIDADES = {
    "paises": {
        "table": "paises",
        "pk": "id_pais"
    },
    "estados": {
        "table": "estados",
        "pk": "id_estado"
    },
    "cidades": {
        "table": "cidades",
        "pk": "id_cidade"
    },
    "enderecos": {
        "table": "enderecos",
        "pk": "id_endereco"
    },
    "informacoes": {
        "table": "informacoes",
        "pk": "id_informacao"
    },
    "clientes": {
        "table": "clientes",
        "pk": "id_cliente"
    },
    "fornecedores": {
        "table": "fornecedores",
        "pk": "id_fornecedor"
    },
    "produtos": {
        "table": "produtos",
        "pk": "id_produto"
    },
    "modelos": {
        "table": "modelos",
        "pk": "id_modelo"
    },
    "veiculos": {
        "table": "veiculos",
        "pk": "id_veiculo"
    },
    "transportadores": {
        "table": "transportadores",
        "pk": "id_transportador"
    },
    "condicoes_pagamento": {
        "table": "condicoes_pagamento",
        "pk": "id_condicao_pagamento"
    },
    "formas_pagamento": {
        "table": "formas_pagamento",
        "pk": "id_forma_pagamento"
    },
    "funcionarios": {
        "table": "funcionarios",
        "pk": "id_funcionario"
    }
}


# ============================================================
# FUNÇÕES AUXILIARES
# ============================================================

def valor_para_json(valor):
    if isinstance(valor, Decimal):
        return float(valor)

    if isinstance(valor, (date, datetime)):
        return valor.isoformat()

    return valor


def normalizar_registros(registros):
    lista = []

    for registro in registros:
        item = {}

        for chave, valor in registro.items():
            item[chave] = valor_para_json(valor)

        lista.append(item)

    return lista


def obter_colunas(conexao, tabela):
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute(f"SHOW COLUMNS FROM {tabela}")
        resultado = cursor.fetchall()
        return [coluna["Field"] for coluna in resultado]

    finally:
        cursor.close()


def coluna_existe(colunas, coluna):
    return coluna in colunas


def selecionar_coluna(colunas, coluna, alias=None, padrao="NULL"):
    if coluna in colunas:
        if alias:
            return f"{coluna} AS {alias}"

        return coluna

    if alias:
        return f"{padrao} AS {alias}"

    return f"{padrao} AS {coluna}"


def converter_status_para_ativo(valor):
    if valor is None:
        return 1

    texto = str(valor).strip().lower()

    if texto in ["ativo", "1", "true", "sim", "s"]:
        return 1

    if texto in ["inativo", "0", "false", "nao", "não", "n"]:
        return 0

    return 1


def valor_inteiro_ou_zero(valor):
    try:
        if valor is None or valor == "":
            return 0

        return int(valor)

    except Exception:
        return 0


def limpar_payload(payload, colunas):
    novo_payload = {}

    for chave, valor in payload.items():
        if chave in colunas:
            novo_payload[chave] = valor

    return novo_payload


def obter_valor(dados, *chaves):
    for chave in chaves:
        valor = dados.get(chave)

        if valor is not None and valor != "":
            return valor

    return None


def validar_obrigatorio_flexivel(dados, campos):
    campos_faltando = []

    for grupo in campos:
        if isinstance(grupo, str):
            grupo = [grupo]

        encontrado = False

        for campo in grupo:
            valor = dados.get(campo)

            if valor is not None and valor != "":
                encontrado = True
                break

        if not encontrado:
            campos_faltando.append(grupo[0])

    return campos_faltando


# ============================================================
# PAYLOADS PARA INSERT E UPDATE
# ============================================================

def montar_payload(entidade, dados, colunas):
    payload = {}

    if entidade == "paises":
        payload["pais"] = dados.get("nome")
        payload["sigla"] = dados.get("sigla")
        payload["ddi"] = dados.get("ddi")
        payload["moeda"] = dados.get("moeda")
        payload["nacionalidade"] = dados.get("nacionalidade")
        payload["codigo_ibge"] = dados.get("codigo_ibge") or dados.get("codigoIbge")

    elif entidade == "estados":
        payload["id_pais"] = obter_valor(dados, "pais_id", "paisId")
        payload["estado"] = dados.get("nome")
        payload["uf"] = dados.get("uf")
        payload["codigo_ibge"] = dados.get("codigo_ibge") or dados.get("codigoIbge")

    elif entidade == "cidades":
        payload["id_estado"] = obter_valor(dados, "estado_id", "estadoId")
        payload["cidade"] = dados.get("nome")
        payload["ddd"] = dados.get("ddd") or "000"
        payload["codigo_ibge"] = dados.get("codigo_ibge") or dados.get("codigoIbge")

    elif entidade == "enderecos":
        payload["id_cidade"] = obter_valor(dados, "cidade_id", "cidadeId")
        payload["bairro"] = dados.get("bairro")
        payload["endereco"] = dados.get("logradouro") or dados.get("endereco")
        payload["numero"] = dados.get("numero")
        payload["logradouro"] = dados.get("logradouro")
        payload["cep"] = dados.get("cep")
        payload["complemento"] = dados.get("complemento")

    elif entidade == "informacoes":
        payload["email"] = dados.get("email")
        payload["cpf_cnpj"] = dados.get("documento") or dados.get("cpf_cnpj") or "00000000000000"
        payload["telefone"] = dados.get("telefone")
        payload["celular"] = dados.get("celular")
        payload["ie"] = dados.get("ie")
        payload["tipo_pessoa"] = dados.get("tipo_pessoa") or "F"
        payload["rg"] = dados.get("rg")
        payload["nome_fantasia"] = dados.get("nome_fantasia")
        payload["observacao"] = dados.get("observacao")

    elif entidade == "clientes":
        payload["cliente"] = dados.get("nome")
        payload["apelido"] = dados.get("apelido") or dados.get("nome")
        payload["tipo"] = dados.get("tipo")
        payload["fk_endereco"] = obter_valor(dados, "endereco_id", "enderecoId")
        payload["id_informacao"] = obter_valor(dados, "informacao_id", "informacaoId")

    elif entidade == "fornecedores":
        payload["fornecedor"] = dados.get("nome")
        payload["categoria"] = dados.get("categoria")
        payload["fk_endereco"] = obter_valor(dados, "endereco_id", "enderecoId")
        payload["id_informacao"] = obter_valor(dados, "informacao_id", "informacaoId")

    elif entidade == "produtos":
        payload["produto"] = dados.get("nome")
        payload["sku"] = dados.get("sku")
        payload["categoria"] = dados.get("categoria")
        payload["unidade"] = dados.get("unidade") or "UN"
        payload["preco_custo"] = dados.get("preco_custo") or 0
        payload["preco_venda"] = dados.get("preco") or dados.get("preco_venda") or 0
        payload["saldo"] = dados.get("estoque") or dados.get("saldo") or 0
        payload["valor_ultima_compra"] = dados.get("valor_ultima_compra") or 0
        payload["data_ultima_compra"] = dados.get("data_ultima_compra") or date.today().isoformat()

    elif entidade == "modelos":
        payload["modelo"] = dados.get("nome")
        payload["descricao"] = dados.get("descricao")
        payload["marca"] = dados.get("marca")
        payload["ano_fabricacao"] = dados.get("ano")
        payload["ativo"] = converter_status_para_ativo(dados.get("status"))

    elif entidade == "veiculos":
        # Se a coluna "veiculo" existir como INT no banco, envia 0 para evitar erro de texto em inteiro.
        if coluna_existe(colunas, "veiculo"):
            payload["veiculo"] = valor_inteiro_ou_zero(dados.get("veiculo"))

        payload["fk_modelo"] = obter_valor(dados, "modelo_id", "modeloId")
        payload["placa"] = dados.get("placa")
        payload["renavam"] = dados.get("renavam")
        payload["chassi"] = dados.get("chassi")
        payload["cor"] = dados.get("cor") or "Não informado"
        payload["ano_fabricacao"] = (
            dados.get("ano_fabricacao")
            or dados.get("ano")
            or date.today().year
        )
        payload["ano_modelo"] = (
            dados.get("ano_modelo")
            or dados.get("ano")
            or date.today().year
        )
        payload["combustivel"] = dados.get("combustivel")
        payload["quilometragem"] = dados.get("quilometragem") or 0

    elif entidade == "transportadores":
        payload["transportador"] = dados.get("nome") or dados.get("transportador")
        payload["fk_endereco"] = obter_valor(dados, "endereco_id", "enderecoId")
        payload["fk_informacao"] = obter_valor(dados, "informacao_id", "informacaoId")

    elif entidade == "condicoes_pagamento":
        payload["condicao_pagamento"] = dados.get("nome") or dados.get("condicao_pagamento")
        payload["quantidade_parcelas"] = dados.get("quantidade_parcelas") or 1
        payload["intervalo_dias"] = dados.get("intervalo_dias") or 30

    elif entidade == "formas_pagamento":
        payload["forma_pagamento"] = dados.get("nome") or dados.get("forma_pagamento")

    elif entidade == "funcionarios":
        payload["funcionario"] = dados.get("nome") or dados.get("funcionario")
        payload["cargo"] = dados.get("cargo")
        payload["salario"] = dados.get("salario")
        payload["id_informacao"] = obter_valor(dados, "informacao_id", "informacaoId")
        payload["fk_endereco"] = obter_valor(dados, "endereco_id", "enderecoId")

    if coluna_existe(colunas, "ativo"):
        payload["ativo"] = converter_status_para_ativo(dados.get("status"))

    return limpar_payload(payload, colunas)


# ============================================================
# SELECTS
# ============================================================

def montar_select(entidade, colunas):
    if entidade == "paises":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status"

        return f"""
            SELECT
                id_pais AS id,
                pais AS nome,
                {selecionar_coluna(colunas, "sigla")},
                {selecionar_coluna(colunas, "ddi")},
                {selecionar_coluna(colunas, "moeda")},
                {selecionar_coluna(colunas, "nacionalidade")},
                {selecionar_coluna(colunas, "codigo_ibge")},
                {status}
            FROM paises
            ORDER BY id_pais DESC
        """

    if entidade == "estados":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status"

        return f"""
            SELECT
                id_estado AS id,
                id_pais AS pais_id,
                estado AS nome,
                {selecionar_coluna(colunas, "uf")},
                {selecionar_coluna(colunas, "codigo_ibge")},
                {status}
            FROM estados
            ORDER BY id_estado DESC
        """

    if entidade == "cidades":
        return """
            SELECT
                c.id_cidade AS id,
                e.id_pais AS pais_id,
                c.id_estado AS estado_id,
                c.cidade AS nome,
                c.ddd AS ddd,
                c.codigo_ibge AS codigo_ibge,
                'Ativo' AS status
            FROM cidades c
            INNER JOIN estados e ON e.id_estado = c.id_estado
            ORDER BY c.id_cidade DESC
        """

    if entidade == "enderecos":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(en.ativo = 1, 'Ativo', 'Inativo') AS status"

        campo_endereco = "en.endereco AS logradouro"

        if not coluna_existe(colunas, "endereco") and coluna_existe(colunas, "logradouro"):
            campo_endereco = "en.logradouro AS logradouro"

        complemento = "NULL AS complemento"

        if coluna_existe(colunas, "complemento"):
            complemento = "en.complemento AS complemento"

        return f"""
            SELECT
                en.id_endereco AS id,
                p.id_pais AS pais_id,
                e.id_estado AS estado_id,
                en.id_cidade AS cidade_id,
                {campo_endereco},
                en.numero AS numero,
                en.bairro AS bairro,
                en.cep AS cep,
                {complemento},
                {status}
            FROM enderecos en
            INNER JOIN cidades c ON c.id_cidade = en.id_cidade
            INNER JOIN estados e ON e.id_estado = c.id_estado
            INNER JOIN paises p ON p.id_pais = e.id_pais
            ORDER BY en.id_endereco DESC
        """

    if entidade == "informacoes":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status"

        return f"""
            SELECT
                id_informacao AS id,
                {selecionar_coluna(colunas, "telefone")},
                {selecionar_coluna(colunas, "email")},
                {selecionar_coluna(colunas, "cpf_cnpj", "documento", "'00000000000000'")},
                {selecionar_coluna(colunas, "celular")},
                {selecionar_coluna(colunas, "ie")},
                {selecionar_coluna(colunas, "tipo_pessoa")},
                {selecionar_coluna(colunas, "rg")},
                {selecionar_coluna(colunas, "nome_fantasia")},
                {selecionar_coluna(colunas, "observacao")},
                {status}
            FROM informacoes
            ORDER BY id_informacao DESC
        """

    if entidade == "clientes":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status"

        return f"""
            SELECT
                id_cliente AS id,
                cliente AS nome,
                {selecionar_coluna(colunas, "apelido")},
                {selecionar_coluna(colunas, "tipo")},
                fk_endereco AS endereco_id,
                id_informacao AS informacao_id,
                {status}
            FROM clientes
            ORDER BY id_cliente DESC
        """

    if entidade == "fornecedores":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status"

        return f"""
            SELECT
                id_fornecedor AS id,
                fornecedor AS nome,
                {selecionar_coluna(colunas, "categoria")},
                fk_endereco AS endereco_id,
                id_informacao AS informacao_id,
                {status}
            FROM fornecedores
            ORDER BY id_fornecedor DESC
        """

    if entidade == "produtos":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status"

        return f"""
            SELECT
                id_produto AS id,
                produto AS nome,
                {selecionar_coluna(colunas, "sku")},
                {selecionar_coluna(colunas, "categoria")},
                {selecionar_coluna(colunas, "unidade")},
                {selecionar_coluna(colunas, "preco_custo")},
                preco_venda AS preco,
                saldo AS estoque,
                {selecionar_coluna(colunas, "valor_ultima_compra")},
                {selecionar_coluna(colunas, "data_ultima_compra")},
                {status}
            FROM produtos
            ORDER BY id_produto DESC
        """

    if entidade == "modelos":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status"

        return f"""
            SELECT
                id_modelo AS id,
                modelo AS nome,
                {selecionar_coluna(colunas, "descricao")},
                {selecionar_coluna(colunas, "marca")},
                {selecionar_coluna(colunas, "ano_fabricacao", "ano")},
                {status}
            FROM modelos
            ORDER BY id_modelo DESC
        """

    if entidade == "veiculos":
        return """
            SELECT
                v.id_veiculo AS id,
                v.fk_modelo AS modelo_id,
                m.marca AS marca,
                m.descricao AS descricao,
                m.ano_fabricacao AS ano,
                v.placa AS placa,
                v.renavam AS renavam,
                v.chassi AS chassi,
                v.cor AS cor,
                v.ano_fabricacao AS ano_fabricacao,
                v.ano_modelo AS ano_modelo,
                v.combustivel AS combustivel,
                v.quilometragem AS quilometragem,
                'Ativo' AS status
            FROM veiculos v
            INNER JOIN modelos m ON m.id_modelo = v.fk_modelo
            ORDER BY v.id_veiculo DESC
        """

    if entidade == "transportadores":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(t.ativo = 1, 'Ativo', 'Inativo') AS status"

        return f"""
            SELECT
                t.id_transportador AS id,
                t.transportador AS nome,
                NULL AS tipo_frete,
                t.fk_endereco AS endereco_id,
                t.fk_informacao AS informacao_id,
                {status}
            FROM transportadores t
            ORDER BY t.id_transportador DESC
        """

    if entidade == "condicoes_pagamento":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status"

        return f"""
            SELECT
                id_condicao_pagamento AS id,
                condicao_pagamento AS nome,
                {selecionar_coluna(colunas, "quantidade_parcelas")},
                {selecionar_coluna(colunas, "intervalo_dias")},
                {status}
            FROM condicoes_pagamento
            ORDER BY id_condicao_pagamento DESC
        """

    if entidade == "formas_pagamento":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status"

        return f"""
            SELECT
                id_forma_pagamento AS id,
                forma_pagamento AS nome,
                {status}
            FROM formas_pagamento
            ORDER BY id_forma_pagamento DESC
        """

    if entidade == "funcionarios":
        status = "'Ativo' AS status"

        if coluna_existe(colunas, "ativo"):
            status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status"

        return f"""
            SELECT
                id_funcionario AS id,
                funcionario AS nome,
                {selecionar_coluna(colunas, "cargo")},
                {selecionar_coluna(colunas, "salario")},
                {selecionar_coluna(colunas, "id_informacao", "informacao_id")},
                {selecionar_coluna(colunas, "fk_endereco", "endereco_id")},
                {status}
            FROM funcionarios
            ORDER BY id_funcionario DESC
        """

    return None


# ============================================================
# VALIDAÇÕES
# ============================================================

def validar_entidade(entidade, dados):
    if entidade == "paises":
        return validar_obrigatorio_flexivel(dados, [
            ["nome"],
            ["sigla"],
            ["ddi"]
        ])

    if entidade == "estados":
        return validar_obrigatorio_flexivel(dados, [
            ["pais_id", "paisId"],
            ["nome"],
            ["uf"]
        ])

    if entidade == "cidades":
        return validar_obrigatorio_flexivel(dados, [
            ["estado_id", "estadoId"],
            ["nome"]
        ])

    if entidade == "enderecos":
        return validar_obrigatorio_flexivel(dados, [
            ["cidade_id", "cidadeId"]
        ])

    if entidade == "informacoes":
        return []

    if entidade == "clientes":
        return validar_obrigatorio_flexivel(dados, [
            ["nome"],
            ["endereco_id", "enderecoId"],
            ["informacao_id", "informacaoId"]
        ])

    if entidade == "fornecedores":
        return validar_obrigatorio_flexivel(dados, [
            ["nome"],
            ["endereco_id", "enderecoId"],
            ["informacao_id", "informacaoId"]
        ])

    if entidade == "produtos":
        return validar_obrigatorio_flexivel(dados, [
            ["nome"]
        ])

    if entidade == "modelos":
        return validar_obrigatorio_flexivel(dados, [
            ["nome"]
        ])

    if entidade == "veiculos":
        return validar_obrigatorio_flexivel(dados, [
            ["modelo_id", "modeloId"],
            ["placa"]
        ])

    if entidade == "transportadores":
        return validar_obrigatorio_flexivel(dados, [
            ["nome", "transportador"],
            ["endereco_id", "enderecoId"],
            ["informacao_id", "informacaoId"]
        ])

    return []


# ============================================================
# ROTAS DO FRONT-END
# ============================================================

@app.route("/")
def index():
    return send_from_directory(frontend_path, "index.html")


@app.route("/dashboard")
def dashboard():
    return send_from_directory(frontend_path, "dashboard.html")


@app.route("/dashboard.html")
def dashboard_html():
    return send_from_directory(frontend_path, "dashboard.html")


@app.route("/pages/<path:nome_arquivo>")
def pages(nome_arquivo):
    return send_from_directory(os.path.join(frontend_path, "pages"), nome_arquivo)


@app.route("/css/<path:nome_arquivo>")
def css(nome_arquivo):
    return send_from_directory(os.path.join(frontend_path, "css"), nome_arquivo)


@app.route("/js/<path:nome_arquivo>")
def js(nome_arquivo):
    return send_from_directory(os.path.join(frontend_path, "js"), nome_arquivo)


@app.route("/assets/<path:nome_arquivo>")
def assets(nome_arquivo):
    return send_from_directory(os.path.join(frontend_path, "assets"), nome_arquivo)


# ============================================================
# ROTAS DE TESTE
# ============================================================

@app.route("/api/testar-conexao", methods=["GET"])
def testar_conexao():
    conexao = conectar_banco()

    if conexao:
        conexao.close()

        return jsonify({
            "status": "sucesso",
            "mensagem": "Banco de dados conectado com sucesso."
        }), 200

    return jsonify({
        "status": "erro",
        "mensagem": "Não foi possível conectar ao banco de dados."
    }), 500


@app.route("/api/status-banco", methods=["GET"])
def status_banco():
    conexao = conectar_banco()

    if not conexao:
        return jsonify({
            "status": "erro",
            "mensagem": "Não foi possível conectar ao banco de dados.",
            "conectado": False
        }), 500

    cursor = None

    try:
        cursor = conexao.cursor(dictionary=True)

        totais = {}

        for entidade, config in ENTIDADES.items():
            tabela = config["table"]

            try:
                cursor.execute(f"SELECT COUNT(*) AS total FROM {tabela}")
                resultado = cursor.fetchone()
                totais[entidade] = resultado["total"]

            except Exception:
                totais[entidade] = "Tabela não encontrada"

        return jsonify({
            "status": "sucesso",
            "mensagem": "Banco de dados conectado com sucesso.",
            "conectado": True,
            "totais": totais
        }), 200

    except Exception as erro:
        return jsonify({
            "status": "erro",
            "mensagem": str(erro),
            "conectado": False
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conexao.is_connected():
            conexao.close()


# ============================================================
# API GENÉRICA
# ============================================================

@app.route("/api/<entidade>", methods=["GET"])
def listar_entidade(entidade):
    if entidade not in ENTIDADES:
        return jsonify({
            "status": "erro",
            "mensagem": f"Entidade '{entidade}' não encontrada."
        }), 404

    conexao = conectar_banco()

    if not conexao:
        return jsonify({
            "status": "erro",
            "mensagem": "Erro ao conectar ao banco de dados."
        }), 500

    cursor = None

    try:
        tabela = ENTIDADES[entidade]["table"]
        colunas = obter_colunas(conexao, tabela)
        sql = montar_select(entidade, colunas)

        if not sql:
            return jsonify({
                "status": "erro",
                "mensagem": f"SELECT da entidade '{entidade}' não configurado."
            }), 500

        cursor = conexao.cursor(dictionary=True)
        cursor.execute(sql)

        registros = cursor.fetchall()

        return jsonify(normalizar_registros(registros)), 200

    except Exception as erro:
        print(f"ERRO AO LISTAR {entidade.upper()}:", erro)

        return jsonify({
            "status": "erro",
            "mensagem": str(erro)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conexao and conexao.is_connected():
            conexao.close()


@app.route("/api/<entidade>", methods=["POST"])
def cadastrar_entidade(entidade):
    if entidade not in ENTIDADES:
        return jsonify({
            "status": "erro",
            "mensagem": f"Entidade '{entidade}' não encontrada."
        }), 404

    dados = request.get_json() or {}

    campos_faltando = validar_entidade(entidade, dados)

    if campos_faltando:
        return jsonify({
            "status": "erro",
            "mensagem": f"Campos obrigatórios não preenchidos: {', '.join(campos_faltando)}",
            "campos_faltando": campos_faltando,
            "dados_recebidos": dados
        }), 400

    conexao = conectar_banco()

    if not conexao:
        return jsonify({
            "status": "erro",
            "mensagem": "Erro ao conectar ao banco de dados."
        }), 500

    cursor = None

    try:
        tabela = ENTIDADES[entidade]["table"]
        colunas_tabela = obter_colunas(conexao, tabela)
        payload = montar_payload(entidade, dados, colunas_tabela)

        if not payload:
            return jsonify({
                "status": "erro",
                "mensagem": "Nenhum campo válido recebido.",
                "dados_recebidos": dados
            }), 400

        colunas = list(payload.keys())
        valores = list(payload.values())

        placeholders = ", ".join(["%s"] * len(colunas))
        colunas_sql = ", ".join(colunas)

        sql = f"""
            INSERT INTO {tabela} ({colunas_sql})
            VALUES ({placeholders})
        """

        print(f"CADASTRANDO EM {tabela}")
        print("SQL:", sql)
        print("VALORES:", valores)

        cursor = conexao.cursor()
        cursor.execute(sql, valores)
        conexao.commit()

        return jsonify({
            "status": "sucesso",
            "mensagem": f"Registro cadastrado com sucesso em {entidade}.",
            "tabela": tabela,
            "id_criado": cursor.lastrowid,
            "dados_recebidos": dados
        }), 201

    except Exception as erro:
        conexao.rollback()

        print(f"ERRO AO CADASTRAR {entidade.upper()}:", erro)

        return jsonify({
            "status": "erro",
            "mensagem": str(erro),
            "dados_recebidos": dados
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conexao and conexao.is_connected():
            conexao.close()


@app.route("/api/<entidade>/<int:id_registro>", methods=["PUT"])
def atualizar_entidade(entidade, id_registro):
    if entidade not in ENTIDADES:
        return jsonify({
            "status": "erro",
            "mensagem": f"Entidade '{entidade}' não encontrada."
        }), 404

    dados = request.get_json() or {}

    campos_faltando = validar_entidade(entidade, dados)

    if campos_faltando:
        return jsonify({
            "status": "erro",
            "mensagem": f"Campos obrigatórios não preenchidos: {', '.join(campos_faltando)}",
            "campos_faltando": campos_faltando,
            "dados_recebidos": dados
        }), 400

    conexao = conectar_banco()

    if not conexao:
        return jsonify({
            "status": "erro",
            "mensagem": "Erro ao conectar ao banco de dados."
        }), 500

    cursor = None

    try:
        config = ENTIDADES[entidade]
        tabela = config["table"]
        pk = config["pk"]

        colunas_tabela = obter_colunas(conexao, tabela)
        payload = montar_payload(entidade, dados, colunas_tabela)

        if not payload:
            return jsonify({
                "status": "erro",
                "mensagem": "Nenhum campo válido recebido.",
                "dados_recebidos": dados
            }), 400

        set_sql = ", ".join([f"{coluna} = %s" for coluna in payload.keys()])
        valores = list(payload.values())
        valores.append(id_registro)

        sql = f"""
            UPDATE {tabela}
            SET {set_sql}
            WHERE {pk} = %s
        """

        print(f"ATUALIZANDO {tabela}")
        print("SQL:", sql)
        print("VALORES:", valores)

        cursor = conexao.cursor()
        cursor.execute(sql, valores)
        conexao.commit()

        return jsonify({
            "status": "sucesso",
            "mensagem": f"Registro atualizado com sucesso em {entidade}.",
            "tabela": tabela,
            "id_atualizado": id_registro,
            "dados_recebidos": dados
        }), 200

    except Exception as erro:
        conexao.rollback()

        print(f"ERRO AO ATUALIZAR {entidade.upper()}:", erro)

        return jsonify({
            "status": "erro",
            "mensagem": str(erro),
            "dados_recebidos": dados
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conexao and conexao.is_connected():
            conexao.close()


@app.route("/api/<entidade>/<int:id_registro>", methods=["DELETE"])
def excluir_entidade(entidade, id_registro):
    if entidade not in ENTIDADES:
        return jsonify({
            "status": "erro",
            "mensagem": f"Entidade '{entidade}' não encontrada."
        }), 404

    conexao = conectar_banco()

    if not conexao:
        return jsonify({
            "status": "erro",
            "mensagem": "Erro ao conectar ao banco de dados."
        }), 500

    cursor = None

    try:
        tabela = ENTIDADES[entidade]["table"]
        pk = ENTIDADES[entidade]["pk"]

        sql = f"""
            DELETE FROM {tabela}
            WHERE {pk} = %s
        """

        cursor = conexao.cursor()
        cursor.execute(sql, (id_registro,))
        conexao.commit()

        return jsonify({
            "status": "sucesso",
            "mensagem": f"Registro excluído com sucesso de {entidade}.",
            "tabela": tabela,
            "id_excluido": id_registro
        }), 200

    except Exception as erro:
        conexao.rollback()

        print(f"ERRO AO EXCLUIR {entidade.upper()}:", erro)

        return jsonify({
            "status": "erro",
            "mensagem": str(erro)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if conexao and conexao.is_connected():
            conexao.close()


# ============================================================
# TRATAMENTO DE ERROS
# ============================================================

@app.errorhandler(404)
def erro_404(erro):
    if request.path.startswith("/api/"):
        return jsonify({
            "status": "erro",
            "mensagem": "Rota da API não encontrada.",
            "rota": request.path
        }), 404

    return send_from_directory(frontend_path, "index.html")


@app.errorhandler(500)
def erro_500(erro):
    if request.path.startswith("/api/"):
        return jsonify({
            "status": "erro",
            "mensagem": "Erro interno no servidor.",
            "detalhe": str(erro)
        }), 500

    return jsonify({
        "status": "erro",
        "mensagem": "Erro interno no servidor.",
        "detalhe": str(erro)
    }), 500


# ============================================================
# INICIALIZAÇÃO
# ============================================================

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
