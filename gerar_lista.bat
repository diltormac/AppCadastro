@echo off
setlocal

REM Detecta automaticamente a pasta onde o .bat está
set PASTA_ATUAL=%~dp0

REM Remove a barra final se necessário
cd /d "%PASTA_ATUAL%"

REM Escreve o caminho no arquivo (cria/sobrescreve)
echo Caminho da pasta: %CD% > lista_arquivos.txt

REM Adiciona a estrutura de árvore (anexa ao arquivo)
tree /F /A >> lista_arquivos.txt

echo Estrutura gerada em: %PASTA_ATUAL%lista_arquivos.txt
pause