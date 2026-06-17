import mysql.connector
from mysql.connector import Error


def conectar_banco():
    try:
        conexao = mysql.connector.connect(
            host="localhost",
            user="root",
            password="1234",
            database="Sistema"
        )

        if conexao.is_connected():
            print("Banco de dados conectado com sucesso.")
            return conexao

    except Error as erro:
        print(f"Erro ao conectar ao banco de dados: {erro}")
        return None