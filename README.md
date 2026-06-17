Se necessário caso nao funcione ao rodar os arquivos, executar os comando seguintes:

cd venv
cd Scripts
Activate

Comecando pela ativação do venv

python -m pip install --upgrade pip setuptools wheel
python -m pip install --no-cache-dir --force-reinstall -r requirements.txt

python -c "from werkzeug.routing import Map; print('Werkzeug OK')"

python main.py


Os mesmos encontram-se presente em comands