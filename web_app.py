from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from datetime import date, datetime
from decimal import Decimal
import os
from db import conectar_banco

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
        if entidade == "clientes": payload["apelido"], payload["tipo"] = dados.get("apelido"), dados.get("tipo")
        else: payload["categoria"], payload["nome_fantasia"] = dados.get("categoria"), dados.get("nome_fantasia")
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
        # Garante que pegamos o id_cidade do formulário
        payload["id_cidade"] = obter_valor(dados, "id_cidade", "cidade_id")
        payload["logradouro"] = dados.get("logradouro")
        payload["numero"] = dados.get("numero")
        payload["bairro"] = dados.get("bairro")
        payload["cep"] = dados.get("cep")
        payload["complemento"] = dados.get("complemento")
        payload["email"] = dados.get("email")
        payload["cpf_cnpj"] = dados.get("cpf_cnpj")
        payload["telefone"] = dados.get("telefone")
        payload["celular"] = dados.get("celular")
        payload["ie"] = dados.get("ie")
        payload["tipo_pessoa"] = dados.get("tipo_pessoa") or "J"
        payload["rg"] = dados.get("rg")
        payload["observacao"] = dados.get("observacao")

    elif entidade == "produtos":
        payload["produto"], payload["sku"], payload["categoria"] = dados.get("produto"), dados.get("sku"), dados.get("categoria")
        payload["unidade"] = dados.get("unidade") or "UN"
        payload["preco_custo"], payload["preco_venda"] = dados.get("preco_custo") or 0, dados.get("preco_venda") or 0
        payload["saldo"] = dados.get("saldo") or 0
   
    elif entidade == "marcas":
        payload["nome"], payload["slug"] = dados.get("nome"), dados.get("slug")
  
    elif entidade == "modelos":
        payload["id_marca"] = obter_valor(dados, "id_marca")
        payload["modelo"], payload["descricao"] = dados.get("modelo"), dados.get("descricao")
        payload["ano_fabricacao"] = dados.get("ano_fabricacao")
 
    elif entidade == "marcas":
        payload["nome"] = dados.get("nome")

    elif entidade == "veiculos":
        # Ajuste para garantir que o ID do modelo venha correto
        payload["fk_modelo"] = obter_valor(dados, "modelo_id", "id_modelo")
        payload["placa"] = dados.get("placa")
        payload["renavam"] = dados.get("renavam")
        payload["chassi"] = dados.get("chassi")
        payload["cor"] = dados.get("cor")
        payload["ano_fabricacao"] = dados.get("ano_fabricacao")
        payload["ano_modelo"] = dados.get("ano_modelo")
        payload["combustivel"] = dados.get("combustivel")
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
        payload["cep"], payload["complemento"] = dados.get("cep"), dados.get("complemento")
        payload["telefone"], payload["email"] = dados.get("telefone"), dados.get("email")

    if coluna_existe(colunas, "ativo"): payload["ativo"] = converter_status_para_ativo(dados.get("ativo", 1))
    return limpar_payload(payload, colunas)

def montar_select(entidade, colunas):
    status = "IF(ativo = 1, 'Ativo', 'Inativo') AS status" if coluna_existe(colunas, "ativo") else "'Ativo' AS status"
    
    if entidade == "paises": return f"SELECT id_pais AS id, pais, sigla, ddi, moeda, {status} FROM paises ORDER BY id_pais DESC"
    if entidade == "estados": return f"SELECT id_estado AS id, id_pais, estado, uf, {status} FROM estados ORDER BY id_estado DESC"
    if entidade == "cidades": return f"SELECT id_cidade AS id, id_estado, cidade, ddd, {status} FROM cidades ORDER BY id_cidade DESC"
    if entidade == "clientes": return f"SELECT id_cliente AS id, cliente, cpf_cnpj, email, telefone, id_cidade, logradouro, numero, bairro, cep, complemento, observacao, {status} FROM clientes ORDER BY id_cliente DESC"
    if entidade == "fornecedores": return f"SELECT id_fornecedor AS id, fornecedor, cpf_cnpj, email, telefone, id_cidade, logradouro, numero, bairro, cep, complemento, observacao, categoria, {status} FROM fornecedores ORDER BY id_fornecedor DESC"
    if entidade == "produtos": return f"SELECT id_produto AS id, produto, sku, categoria, unidade, preco_custo, preco_venda, saldo, {status} FROM produtos ORDER BY id_produto DESC"
    if entidade == "marcas": return f"SELECT id_marca AS id, nome, slug FROM marcas ORDER BY id_marca DESC"
    if entidade == "modelos": return f"SELECT id_modelo AS id, id_marca, modelo, descricao, ano_fabricacao, {status} FROM modelos ORDER BY id_modelo DESC"
    if entidade == "veiculos": return f"SELECT id_veiculo AS id, fk_modelo, placa, renavam, chassi, cor, ano_fabricacao, ano_modelo, combustivel, quilometragem, {status} FROM veiculos ORDER BY id_veiculo DESC"
    if entidade == "transportadores": return f"SELECT id_transportador AS id, transportador, tipo_frete, cpf_cnpj, email, telefone, id_cidade, logradouro, numero, bairro, cep, complemento, {status} FROM transportadores ORDER BY id_transportador DESC"
    if entidade == "condicoes_pagamento": return f"SELECT id_condicao_pagamento AS id, condicao_pagamento, quantidade_parcelas, intervalo_dias, {status} FROM condicoes_pagamento ORDER BY id_condicao_pagamento DESC"
    if entidade == "funcionarios": return f"SELECT id_funcionario AS id, funcionario, cpf, rg, data_nascimento, cargo, salario, data_admissao, id_cidade, logradouro, numero, bairro, cep, complemento, telefone, email, {status} FROM funcionarios ORDER BY id_funcionario DESC"
    return None

def validar_entidade(entidade, dados):
    regras = {
        "paises": [["pais"], ["sigla"], ["ddi"]],
        "estados": [["id_pais"], ["estado"], ["uf"]],
        "cidades": [["id_estado"], ["cidade"]],
        "clientes": [["cliente"], ["cpf_cnpj"]],
        "fornecedores": [["fornecedor"], ["cpf_cnpj"]],
        "produtos": [["produto"]],
        "marcas": [["nome"]],
        "modelos": [["modelo"], ["id_marca"]],
        "veiculos": [["fk_modelo"], ["placa"]],
        "transportadores": [["transportador"]],
        "condicoes_pagamento": [["condicao_pagamento"]],
        "funcionarios": [["funcionario"], ["cpf"], ["id_cidade"]]
    }
    return validar_obrigatorio_flexivel(dados, regras.get(entidade, []))

@app.route("/api/<entidade>", methods=["GET"])
def listar_entidade(entidade):
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)
    sql = montar_select(entidade, obter_colunas(conexao, ENTIDADES[entidade]["table"]))
    cursor.execute(sql)
    registros = cursor.fetchall()
    conexao.close()
    return jsonify(normalizar_registros(registros)), 200

@app.route("/api/<entidade>", methods=["POST"])
def cadastrar_entidade(entidade):
    dados = request.get_json() or {}
    campos_faltando = validar_entidade(entidade, dados)
    if campos_faltando: return jsonify({"status": "erro", "mensagem": f"Faltam campos: {campos_faltando}"}), 400
    conexao = conectar_banco()
    cursor = conexao.cursor()
    payload = montar_payload(entidade, dados, obter_colunas(conexao, ENTIDADES[entidade]["table"]))
    colunas, valores = list(payload.keys()), list(payload.values())
    sql = f"INSERT INTO {ENTIDADES[entidade]['table']} ({', '.join(colunas)}) VALUES ({', '.join(['%s'] * len(colunas))})"
    cursor.execute(sql, valores)
    conexao.commit()
    id_criado = cursor.lastrowid
    conexao.close()
    return jsonify({"status": "sucesso", "id_criado": id_criado}), 201

@app.route("/api/<entidade>/<int:id_registro>", methods=["PUT"])
def atualizar_entidade(entidade, id_registro):
    dados = request.get_json() or {}
    campos_faltando = validar_entidade(entidade, dados)
    if campos_faltando: return jsonify({"status": "erro", "mensagem": f"Faltam campos: {campos_faltando}"}), 400
    conexao = conectar_banco()
    cursor = conexao.cursor()
    payload = montar_payload(entidade, dados, obter_colunas(conexao, ENTIDADES[entidade]["table"]))
    set_sql = ", ".join([f"{col} = %s" for col in payload.keys()])
    valores = list(payload.values()) + [id_registro]
    sql = f"UPDATE {ENTIDADES[entidade]['table']} SET {set_sql} WHERE {ENTIDADES[entidade]['pk']} = %s"
    cursor.execute(sql, valores)
    conexao.commit()
    conexao.close()
    return jsonify({"status": "sucesso"}), 200

@app.route("/api/<entidade>/<int:id_registro>", methods=["DELETE"])
def excluir_entidade(entidade, id_registro):
    conexao = conectar_banco()
    cursor = conexao.cursor()
    try:
        cursor.execute(f"DELETE FROM {ENTIDADES[entidade]['table']} WHERE {ENTIDADES[entidade]['pk']} = %s", (id_registro,))
        conexao.commit()
        return jsonify({"status": "sucesso"}), 200
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 400
    finally:
        conexao.close()


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

    @app.route('/api/veiculos', methods=['POST'])
    def salvar_veiculo():
        try:
            dados = request.get_json()
            
            # ... seu código de INSERT no banco de dados ...
            
            conexao.commit() # Salva definitivamente
            return jsonify({"mensagem": "Sucesso"}), 201

        except Exception as e:
            conexao.rollback() # <--- ESSA É A LINHA MÁGICA
            print(f"Erro ao salvar: {e}")
            return str(e), 500

        finally:
            cursor.close()
            # Não feche a conexão se ela for global, mas garanta que o cursor feche.
    from flask import request, jsonify


    @app.route('/api/modelos', methods=['POST'])
    def salvar_modelo():
        data = request.get_json()
        
        # Capturando os novos campos que o JS está enviando
        modelo_nome = data.get('modelo')
        id_marca = data.get('id_marca') # A chave que faltava
        tipo_veiculo = data.get('tipo')
        descricao = data.get('descricao')

        # Validação básica
        if not modelo_nome or not id_marca:
            return "Erro: Nome do modelo e Marca são obrigatórios", 400

        # Lógica de salvamento no banco (Exemplo com SQLAlchemy)
        try:
            novo_modelo = Modelo(
                modelo=modelo_nome,
                fk_marca=id_marca,    # Mapeando o id_marca para sua coluna no banco
                tipo=tipo_veiculo,    # Mapeando o tipo
                descricao=descricao   # Mapeando a descrição
            )
            db.session.add(novo_modelo)
            db.session.commit()
            
            return jsonify({"id": novo_modelo.id, "mensagem": "Modelo salvo com sucesso"}), 201
            
        except Exception as e:
            print(f"Erro ao salvar: {e}")
            return str(e), 500

# Exemplo de como sua rota no web_app.py deve processar os dados
    @app.route('/api/modelos', methods=['POST'])
    def criar_modelo():
        try:
            data = request.get_json()
            
            # Captura os dados enviados pelo JavaScript
            modelo_nome = data.get('modelo')
            id_marca = data.get('id_marca') # A chave que você pediu
            tipo = data.get('tipo')
            descricao = data.get('descricao')

            # Debug: veja se os dados estão chegando no terminal
            print(f"Dados recebidos: Modelo={modelo_nome}, Marca={id_marca}, Tipo={tipo}, Desc={descricao}")

            # Lógica de persistência
            # Certifique-se de que sua classe Modelo aceita esses campos
            novo_modelo = Modelo(
                modelo=modelo_nome,
                fk_marca=id_marca, 
                tipo=tipo,
                descricao=descricao
            )
            db.session.add(novo_modelo)
            db.session.commit()
            
            return jsonify({"id": novo_modelo.id, "status": "sucesso"}), 201

        except Exception as e:
            # ISSO vai imprimir o erro real no seu terminal para você ver
            print(f"ERRO CRÍTICO NO BACKEND: {e}") 
            return str(e), 500

    @app.route('/api/veiculos', methods=['POST'])
    def salvar_veiculo():
        data = request.get_json()
        
        # É AQUI QUE A MÁGICA ACONTECE:
        novo_veiculo = Veiculo(
            placa=data.get('placa'),
            fk_modelo=data.get('fk_modelo'), # <--- ISSO É O QUE FALTA NO SEU CÓDIGO
            cor=data.get('cor'),
            combustivel=data.get('combustivel'),
            quilometragem=data.get('quilometragem')
        )
        
        db.session.add(novo_veiculo)
        db.session.commit()
        return jsonify({"status": "sucesso"}), 201

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)