@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "ROOT_ARG=%ROOT:~0,-1%"
cd /d "%ROOT%"

if /I "%~1"=="--docker" goto docker_mode
if /I "%~1"=="docker" goto docker_mode
if /I "%~1"=="--install-node" goto install_node
if /I "%~1"=="--stop" goto stop_mode
if /I "%~1"=="--reinstall" set "FORCE_INSTALL=1"
if /I "%~1"=="--help" goto help
if /I "%~1"=="/?" goto help

echo.
echo [ReySoft-Asistencia] Starting local development mode
echo.

if not exist "backend\.env" (
  echo [ReySoft-Asistencia] Creating backend\.env from backend\.env.example
  copy "backend\.env.example" "backend\.env" >nul
)

echo [ReySoft-Asistencia] Preparing local PostgreSQL on localhost:55432
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start-local-postgres.ps1" -Root "%ROOT_ARG%" -Port 55432
if %ERRORLEVEL% NEQ 0 (
  echo [ReySoft-Asistencia] Local PostgreSQL could not be prepared. Trying Docker Compose fallback.
  where docker >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    docker compose up -d postgres
    if %ERRORLEVEL% NEQ 0 (
      echo [ReySoft-Asistencia] Could not start PostgreSQL with Docker. Check Docker Desktop.
      goto fail
    )
    powershell -NoProfile -Command "$p='%ROOT%backend\.env'; $u='DATABASE_URL=postgresql+psycopg://reysoft_asistencia:reysoft_asistencia@localhost:5432/reysoft_asistencia'; $c=Get-Content -Path $p -Raw; if ($c -match '(?m)^DATABASE_URL=') { $c=[regex]::Replace($c, '(?m)^DATABASE_URL=.*$', $u) } else { $c=$c.TrimEnd()+\"`r`n\"+$u }; Set-Content -Path $p -Value $c.TrimEnd() -Encoding UTF8"
    if %ERRORLEVEL% NEQ 0 goto fail
  ) else (
    echo [ReySoft-Asistencia] Docker was not found either.
    goto fail
  )
)

set "PYTHON_CMD="
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 set "PYTHON_CMD=py -3"

if not defined PYTHON_CMD (
  where python >nul 2>nul
  if %ERRORLEVEL% EQU 0 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
  if exist "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
)

if not defined PYTHON_CMD (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" set "PYTHON_CMD=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
)

if not defined PYTHON_CMD (
  echo [ReySoft-Asistencia] ERROR: Python was not found.
  echo Install Python 3.12+ and enable "Add python.exe to PATH".
  goto fail
)

set "NPM_CMD="
if exist "%ROOT%.tools\node\npm.cmd" set "NPM_CMD=%ROOT%.tools\node\npm.cmd"

where npm.cmd >nul 2>nul
if not defined NPM_CMD if %ERRORLEVEL% EQU 0 set "NPM_CMD=npm.cmd"

if not defined NPM_CMD (
  if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"
)

if not defined NPM_CMD (
  if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd"
)

if not defined NPM_CMD (
  if exist "%LOCALAPPDATA%\Programs\nodejs\npm.cmd" set "NPM_CMD=%LOCALAPPDATA%\Programs\nodejs\npm.cmd"
)

if not defined NPM_CMD (
  if exist "%APPDATA%\npm\npm.cmd" set "NPM_CMD=%APPDATA%\npm\npm.cmd"
)

if not defined NPM_CMD (
  echo [ReySoft-Asistencia] npm was not found. Starting dependency-free local frontend fallback.
  echo [ReySoft-Asistencia] This opens the project at http://127.0.0.1:5173 while Node.js/npm is installed later.
  goto fallback_frontend
)

if not exist "backend\.venv\Scripts\python.exe" (
  echo [ReySoft-Asistencia] Creating backend virtual environment
  %PYTHON_CMD% -m venv "backend\.venv"
  if %ERRORLEVEL% NEQ 0 goto fail
)

call "backend\.venv\Scripts\activate.bat"

if defined FORCE_INSTALL (
  echo [ReySoft-Asistencia] Reinstalling backend dependencies
  goto install_backend_deps
)

if not exist "backend\.venv\.deps-installed" (
  echo [ReySoft-Asistencia] Installing backend dependencies
  goto install_backend_deps
) else (
  echo [ReySoft-Asistencia] Backend dependencies already installed
  goto after_backend_deps
)

:install_backend_deps
python -m pip install -r "backend\requirements.txt"
if %ERRORLEVEL% NEQ 0 goto fail
echo installed > "backend\.venv\.deps-installed"

:after_backend_deps

echo [ReySoft-Asistencia] Running database migrations
pushd "backend"
alembic upgrade head
if %ERRORLEVEL% NEQ 0 (
  popd
  echo.
  echo [ReySoft-Asistencia] ERROR: Migrations failed. Make sure PostgreSQL is running and DATABASE_URL in backend\.env is correct.
  goto fail
)

echo [ReySoft-Asistencia] Running development seed
python -m scripts.seed
if %ERRORLEVEL% NEQ 0 (
  popd
  goto fail
)
popd

echo [ReySoft-Asistencia] Installing frontend dependencies when needed
pushd "frontend"
if not exist "node_modules" (
  call "%NPM_CMD%" install
  if %ERRORLEVEL% NEQ 0 (
    popd
    goto fail
  )
)
popd

echo [ReySoft-Asistencia] Starting backend and frontend services
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start-local-services.ps1" -Root "%ROOT_ARG%" -BackendPort 8000 -FrontendPort 5173
if %ERRORLEVEL% NEQ 0 goto fail

exit /b 0

:fallback_frontend
set "NODE_CMD="
if exist "%ROOT%.tools\node\node.exe" set "NODE_CMD=%ROOT%.tools\node\node.exe"

where node.exe >nul 2>nul
if not defined NODE_CMD if %ERRORLEVEL% EQU 0 set "NODE_CMD=node.exe"

if not defined NODE_CMD (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "NODE_CMD=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
)

if not defined NODE_CMD (
  echo [ReySoft-Asistencia] ERROR: node.exe was not found, so the fallback server cannot start.
  goto fail
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start-fallback-frontend.ps1" -Root "%ROOT_ARG%" -Port 5173
if %ERRORLEVEL% NEQ 0 goto fail
echo.
echo [ReySoft-Asistencia] Frontend fallback is available:
echo   http://127.0.0.1:5173
echo.
echo Install Node.js LTS later to run the full React/Vite app:
echo   https://nodejs.org/
exit /b 0

:install_node
where winget >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ReySoft-Asistencia] ERROR: winget was not found. Install Node.js LTS from https://nodejs.org/
  goto fail
)
echo [ReySoft-Asistencia] Installing Node.js LTS with winget
winget install OpenJS.NodeJS.LTS
echo.
echo [ReySoft-Asistencia] Close and reopen this terminal, then run run-local.bat again.
goto done

:docker_mode
echo.
echo [ReySoft-Asistencia] Starting Docker mode
echo.

if not exist "backend\.env" (
  echo [ReySoft-Asistencia] Creating backend\.env from backend\.env.example
  copy "backend\.env.example" "backend\.env" >nul
)

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ReySoft-Asistencia] ERROR: Docker was not found. Install Docker Desktop or run without --docker.
  goto fail
)

docker compose up --build
exit /b %ERRORLEVEL%

:stop_mode
echo.
echo [ReySoft-Asistencia] Stopping local backend/frontend services
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\stop-local-services.ps1" -Root "%ROOT_ARG%"
exit /b %ERRORLEVEL%

:help
echo ReySoft-Asistencia local runner
echo.
echo Usage:
echo   run-local.bat          Starts local PostgreSQL on 55432, then backend and frontend in background.
echo   run-local.bat --stop   Stops backend and frontend started by the local runner.
echo   run-local.bat --reinstall Reinstalls backend dependencies before starting.
echo   run-local.bat --docker Starts the full stack with Docker Compose.
echo   run-local.bat --install-node Installs Node.js LTS using winget.
echo.
echo Local URLs:
echo   Frontend: http://127.0.0.1:5173
echo   Backend:  http://127.0.0.1:8000
echo.
exit /b 0

:fail
echo.
echo [ReySoft-Asistencia] Startup failed. Read the message above.
echo.
if "%NO_PAUSE%"=="1" exit /b 1
pause
exit /b 1

:done
if "%NO_PAUSE%"=="1" exit /b 0
pause
exit /b 0
