import subprocess
import sys
import os
import webbrowser
import time


class Main:
    def __init__(self):
        self.diretorio_atual = os.path.dirname(os.path.abspath(__file__))

    def iniciar_servidor(self):
        caminho_flask = os.path.join(self.diretorio_atual, "web_app.py")

        print(f"Procurando arquivo em: {caminho_flask}")

        if not os.path.exists(caminho_flask):
            print("Erro: arquivo web_app.py não encontrado.")
            return

        print("\n🚀 INICIANDO SERVIDOR WEB...")
        print("🔗 Acesse o sistema pelo navegador:")
        print("http://127.0.0.1:5000")
        print("\nPressione CTRL + C para parar o servidor.\n")

        try:
            processo = subprocess.Popen([sys.executable, caminho_flask])

            time.sleep(2)
            webbrowser.open("http://127.0.0.1:5000")

            processo.wait()

        except KeyboardInterrupt:
            print("\nServidor parado pelo usuário.")


if __name__ == "__main__":
    main = Main()
    main.iniciar_servidor()