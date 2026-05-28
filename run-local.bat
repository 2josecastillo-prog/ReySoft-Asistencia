@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
set "ROOT_ARG=%ROOT:~0,-1%"
cd /d "%ROOT%"

set "BACKEND_PORT=8000"
set "FRONTEND_PORT=5173"
set "POSTGRES_PORT=55432"
set "DOCKER_FALLBACK=1"
set "FORCE_INSTALL=0"
set "REQUESTED_DOCKER=0"

:parse_args
if "%~1"=="" goto after_args
if /I "%~1"=="--docker" set "REQUESTED_DOCKER=1"
if /I "%~1"=="docker" set "REQUESTED_DOCKER=1"
if /I "%~1"=="--install-node" goto install_node
if /I "%~1"=="--stop" goto stop_mode
if /I "%~1"=="--reinstall" set "FORCE_INSTALL=1"
if /I "%~1"=="--no-docker-fallback" set "DOCKER_FALLBACK=0"
if /I "%~1"=="--backend-port" (
  if "%~2"=="" goto help
  set "BACKEND_PORT=%~2"
  shift
  shift
  goto parse_args
)
if /I "%~1"=="--frontend-port" (
  if "%~2"=="" goto help
  set "FRONTEND_PORT=%~2"
  shift
  shift
  goto parse_args
)
if /I "%~1"=="--postgres-port" (
  if "%~2"=="" goto help
  set "POSTGRES_PORT=%~2"
  shift
  shift
  goto parse_args
)
if /I "%~1"=="--help" goto help
if /I "%~1"=="/?" goto help
shift
goto parse_args

:after_args
if "%REQUESTED_DOCKER%"=="1" goto docker_mode

echo.
echo [ReySoft-Asistencia] Starting local development mode
echo.

if not exist "backend\.env" (
  echo [ReySoft-Asistencia] Creating backend\.env from backend\.env.example
  copy "backend\.env.example" "backend\.env" >nul
)

call :find_python
if errorlevel 1 call :auto_docker_or_fail "Python 3.12+ was not found"

call :find_npm
if errorlevel 1 call :auto_docker_or_fail "Node.js/npm was not found"

echo [ReySoft-Asistencia] Preparing local PostgreSQL on localhost:%POSTGRES_PORT%
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start-local-postgres.ps1" -Root "%ROOT_ARG%" -Port %POSTGRES_PORT%
if errorlevel 1 (
  echo [ReySoft-Asistencia] Local PostgreSQL could not be prepared. Trying Docker Compose fallback.
  call :docker_ready
  if not errorlevel 1 (
    docker compose up -d postgres
    if errorlevel 1 (
      echo [ReySoft-Asistencia] Could not start PostgreSQL with Docker. Check Docker Desktop.
      goto fail
    )
    powershell -NoProfile -Command "$p='%ROOT%backend\.env'; $u='DATABASE_URL=postgresql+psycopg://reysoft_asistencia:reysoft_asistencia@localhost:5432/reysoft_asistencia'; $c=Get-Content -Path $p -Raw; if ($c -match '(?m)^DATABASE_URL=') { $c=[regex]::Replace($c, '(?m)^DATABASE_URL=.*$', $u) } else { $c=$c.TrimEnd()+\"`r`n\"+$u }; Set-Content -Path $p -Value $c.TrimEnd() -Encoding UTF8"
    if errorlevel 1 goto fail
  ) else (
    echo [ReySoft-Asistencia] Docker Desktop is not available or is not running.
    goto fail
  )
)

if not exist "backend\.venv\Scripts\python.exe" (
  echo [ReySoft-Asistencia] Creating backend virtual environment
  "%PYTHON_EXE%" %PYTHON_ARGS% -m venv "backend\.venv"
  if errorlevel 1 goto fail
)

call "backend\.venv\Scripts\activate.bat"

if "%FORCE_INSTALL%"=="1" (
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
if errorlevel 1 goto fail
echo installed > "backend\.venv\.deps-installed"

:after_backend_deps

echo [ReySoft-Asistencia] Running database migrations
pushd "backend"
alembic upgrade head
if errorlevel 1 (
  popd
  echo.
  echo [ReySoft-Asistencia] ERROR: Migrations failed. Make sure PostgreSQL is running and DATABASE_URL in backend\.env is correct.
  goto fail
)

echo [ReySoft-Asistencia] Running development seed
python -m scripts.seed
if errorlevel 1 (
  popd
  goto fail
)
popd

echo [ReySoft-Asistencia] Installing frontend dependencies when needed
pushd "frontend"
if not exist "node_modules" (
  call "%NPM_CMD%" install
  if errorlevel 1 (
    popd
    goto fail
  )
)
popd

echo [ReySoft-Asistencia] Starting backend and frontend services
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start-local-services.ps1" -Root "%ROOT_ARG%" -BackendPort %BACKEND_PORT% -FrontendPort %FRONTEND_PORT%
if errorlevel 1 goto fail

exit /b 0

:install_node
where winget >nul 2>nul
if errorlevel 1 (
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

call :docker_ready
if errorlevel 1 (
  echo [ReySoft-Asistencia] ERROR: Docker Desktop is not available or is not running.
  echo Install/start Docker Desktop or run without --docker using Python, Node.js and PostgreSQL locally.
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
echo   run-local.bat --backend-port 8001 --frontend-port 5174 --postgres-port 55433
echo   run-local.bat --no-docker-fallback
echo.
echo Requirements for native mode:
echo   Python 3.12+, Node.js LTS/npm, and PostgreSQL 15+.
echo   If PostgreSQL, Python, or npm are missing and Docker exists, the runner switches to Docker mode.
echo.
echo Local URLs:
echo   Frontend: http://127.0.0.1:%FRONTEND_PORT%
echo   Backend:  http://127.0.0.1:%BACKEND_PORT%
echo.
exit /b 0

:find_python
set "PYTHON_EXE="
set "PYTHON_ARGS="

where py >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_EXE=py"
  set "PYTHON_ARGS=-3"
  call :test_python
  if not errorlevel 1 exit /b 0
)

for /f "delims=" %%P in ('where python.exe 2^>nul') do (
  set "PYTHON_EXE=%%P"
  set "PYTHON_ARGS="
  call :test_python
  if not errorlevel 1 exit /b 0
)

for %%P in (
  "%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
  "%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
  "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
  "%ProgramFiles%\Python314\python.exe"
  "%ProgramFiles%\Python313\python.exe"
  "%ProgramFiles%\Python312\python.exe"
  "%ProgramFiles(x86)%\Python314\python.exe"
  "%ProgramFiles(x86)%\Python313\python.exe"
  "%ProgramFiles(x86)%\Python312\python.exe"
  "%LOCALAPPDATA%\Python\pythoncore-3.14-64\python.exe"
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
) do (
  if exist "%%~fP" (
    set "PYTHON_EXE=%%~fP"
    set "PYTHON_ARGS="
    call :test_python
    if not errorlevel 1 exit /b 0
  )
)

set "PYTHON_EXE="
set "PYTHON_ARGS="
exit /b 1

:test_python
"%PYTHON_EXE%" %PYTHON_ARGS% -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)" >nul 2>nul
exit /b %ERRORLEVEL%

:find_npm
set "NPM_CMD="

for %%N in (
  "%ROOT%.tools\node\npm.cmd"
  "%ProgramFiles%\nodejs\npm.cmd"
  "%ProgramFiles(x86)%\nodejs\npm.cmd"
  "%LOCALAPPDATA%\Programs\nodejs\npm.cmd"
  "%APPDATA%\npm\npm.cmd"
) do (
  if not defined NPM_CMD if exist "%%~fN" set "NPM_CMD=%%~fN"
)

if not defined NPM_CMD (
  for /f "delims=" %%N in ('where npm.cmd 2^>nul') do (
    if not defined NPM_CMD set "NPM_CMD=%%N"
  )
)

if defined NPM_CMD (
  call "%NPM_CMD%" --version >nul 2>nul
  if not errorlevel 1 exit /b 0
)

set "NPM_CMD="
exit /b 1

:auto_docker_or_fail
set "FAIL_REASON=%~1"
if "%DOCKER_FALLBACK%"=="1" (
  call :docker_ready
  if not errorlevel 1 (
    echo [ReySoft-Asistencia] %FAIL_REASON%.
    echo [ReySoft-Asistencia] Docker was found, so the runner will start the full stack with Docker Compose.
    goto docker_mode
  )
)
echo [ReySoft-Asistencia] ERROR: %FAIL_REASON%.
echo Install the missing dependency or install Docker Desktop, then run run-local.bat again.
goto fail

:docker_ready
where docker >nul 2>nul
if errorlevel 1 exit /b 1
docker info >nul 2>nul
if errorlevel 1 exit /b 1
docker compose version >nul 2>nul
if errorlevel 1 exit /b 1
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
