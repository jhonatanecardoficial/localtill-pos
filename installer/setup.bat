@echo off
chcp 65001 >nul 2>&1
title LocalTill POS - Instalador
color 0B

echo.
echo ╔══════════════════════════════════════════════╗
echo ║     LocalTill POS - Instalacao Automatica    ║
echo ╚══════════════════════════════════════════════╝
echo.

:: =====================================================
:: CONFIGURACOES
:: =====================================================
set PG_VERSION=16
set PG_PASSWORD=postgres
set PG_PORT=5432
set DB_NAME=pdv_local
set PG_INSTALLER=postgresql-16.8-1-windows-x64.exe
set PG_DOWNLOAD_URL=https://get.enterprisedb.com/postgresql/%PG_INSTALLER%
set PG_INSTALL_DIR=C:\Program Files\PostgreSQL\%PG_VERSION%

:: =====================================================
:: VERIFICAR ADMIN
:: =====================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Este instalador precisa ser executado como Administrador!
    echo        Clique com botao direito ^> "Executar como administrador"
    echo.
    pause
    exit /b 1
)

:: =====================================================
:: VERIFICAR SE POSTGRESQL JA ESTA INSTALADO
:: =====================================================
echo [1/4] Verificando PostgreSQL...

where pg_isready >nul 2>&1
if %errorlevel% equ 0 (
    echo       PostgreSQL ja esta instalado!
    goto :check_service
)

if exist "%PG_INSTALL_DIR%\bin\pg_isready.exe" (
    echo       PostgreSQL encontrado em %PG_INSTALL_DIR%
    set "PATH=%PG_INSTALL_DIR%\bin;%PATH%"
    goto :check_service
)

:: =====================================================
:: BAIXAR POSTGRESQL
:: =====================================================
echo       PostgreSQL nao encontrado. Baixando...
echo.

:: Verificar se o instalador já existe na pasta
if exist "%~dp0%PG_INSTALLER%" (
    echo       Instalador encontrado localmente.
    goto :install_pg
)

echo       Baixando PostgreSQL %PG_VERSION%...
echo       URL: %PG_DOWNLOAD_URL%
echo       Isso pode levar alguns minutos...
echo.

:: Tentar com curl (Windows 10+)
curl -L -o "%~dp0%PG_INSTALLER%" "%PG_DOWNLOAD_URL%" 2>nul
if %errorlevel% neq 0 (
    :: Fallback: PowerShell
    powershell -Command "Invoke-WebRequest -Uri '%PG_DOWNLOAD_URL%' -OutFile '%~dp0%PG_INSTALLER%'" 2>nul
    if %errorlevel% neq 0 (
        echo.
        echo [ERRO] Nao foi possivel baixar o PostgreSQL.
        echo        Baixe manualmente de: https://www.postgresql.org/download/windows/
        echo        Coloque o arquivo %PG_INSTALLER% nesta pasta e execute novamente.
        echo.
        pause
        exit /b 1
    )
)

echo       Download concluido!

:: =====================================================
:: INSTALAR POSTGRESQL
:: =====================================================
:install_pg
echo.
echo [2/4] Instalando PostgreSQL %PG_VERSION%...
echo       Isso pode levar alguns minutos...
echo.

"%~dp0%PG_INSTALLER%" --mode unattended --unattendedmodeui minimal --superpassword "%PG_PASSWORD%" --serverport %PG_PORT% --prefix "%PG_INSTALL_DIR%" --datadir "%PG_INSTALL_DIR%\data" --install_runtimes 0

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha na instalacao do PostgreSQL.
    echo        Tente instalar manualmente: https://www.postgresql.org/download/windows/
    echo.
    pause
    exit /b 1
)

set "PATH=%PG_INSTALL_DIR%\bin;%PATH%"
echo       PostgreSQL instalado com sucesso!

:: Aguardar o serviço iniciar
echo       Aguardando servico iniciar...
timeout /t 5 /nobreak >nul

:: =====================================================
:: VERIFICAR SERVICO
:: =====================================================
:check_service
echo.
echo [3/4] Verificando servico PostgreSQL...

:: Tentar pg_isready até 5 vezes
set RETRIES=0
:retry_connection
set /a RETRIES+=1
if %RETRIES% gtr 5 (
    echo.
    echo [AVISO] PostgreSQL instalado mas o servico nao esta respondendo.
    echo         Tente iniciar manualmente o servico "postgresql-x64-%PG_VERSION%"
    echo.
    goto :create_db
)

pg_isready -h localhost -p %PG_PORT% >nul 2>&1
if %errorlevel% neq 0 (
    echo       Tentativa %RETRIES%/5 - Aguardando servico...
    timeout /t 3 /nobreak >nul
    goto :retry_connection
)

echo       Servico PostgreSQL ativo!

:: =====================================================
:: CRIAR BANCO DE DADOS
:: =====================================================
:create_db
echo.
echo [4/4] Configurando banco de dados...

:: Verificar se o banco já existe
set PGPASSWORD=%PG_PASSWORD%
psql -h localhost -p %PG_PORT% -U postgres -lqt 2>nul | findstr /C:"%DB_NAME%" >nul 2>&1
if %errorlevel% equ 0 (
    echo       Banco de dados '%DB_NAME%' ja existe!
    goto :done
)

:: Criar banco
echo       Criando banco de dados '%DB_NAME%'...
createdb -h localhost -p %PG_PORT% -U postgres %DB_NAME% 2>nul
if %errorlevel% neq 0 (
    :: Tentar via psql como fallback
    psql -h localhost -p %PG_PORT% -U postgres -c "CREATE DATABASE %DB_NAME%;" 2>nul
    if %errorlevel% neq 0 (
        echo [AVISO] Nao foi possivel criar o banco automaticamente.
        echo         O banco sera criado na primeira execucao do PDV.
        goto :done
    )
)

echo       Banco de dados '%DB_NAME%' criado com sucesso!

:: =====================================================
:: CONCLUIDO
:: =====================================================
:done
echo.
echo ╔══════════════════════════════════════════════╗
echo ║        Instalacao concluida com sucesso!     ║
echo ╚══════════════════════════════════════════════╝
echo.
echo   PostgreSQL: localhost:%PG_PORT%
echo   Banco:      %DB_NAME%
echo   Usuario:    postgres
echo   Senha:      postgres
echo.
echo   Agora abra o "LocalTill POS.exe" para iniciar.
echo.
pause
