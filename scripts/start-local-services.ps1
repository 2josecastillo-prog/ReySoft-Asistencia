param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [int]$BackendPort = 8000,
  [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path $Root).Path
$runtimePath = Join-Path $rootPath ".runtime"
$backendDir = Join-Path $rootPath "backend"
$frontendDir = Join-Path $rootPath "frontend"
$backendPython = Join-Path $backendDir ".venv\Scripts\python.exe"

New-Item -ItemType Directory -Force -Path $runtimePath | Out-Null

function Test-HttpOk([string]$Url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

function Find-Node {
  $candidates = @(
    (Join-Path $rootPath ".tools\node\node.exe"),
    (Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
    (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")
  ) | Where-Object { $_ -and (Test-Path $_) }

  if (-not $candidates) {
    throw "No se encontro node.exe para levantar Vite."
  }

  return $candidates[0]
}

function Assert-PortAvailable([int]$Port, [string]$HealthUrl, [string]$ServiceName) {
  if (Test-HttpOk $HealthUrl) {
    Write-Host "[ReySoft-Asistencia] $ServiceName ya esta corriendo en $HealthUrl"
    return $false
  }

  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) {
    throw "El puerto $Port esta ocupado por otro proceso. Libera el puerto o ejecuta run-local.bat --stop."
  }

  return $true
}

function Wait-ForService([string]$Url, [string]$Name, [string]$LogPath) {
  for ($i = 0; $i -lt 30; $i++) {
    if (Test-HttpOk $Url) {
      Write-Host "[ReySoft-Asistencia] $Name listo en $Url"
      return
    }
    Start-Sleep -Seconds 1
  }

  if (Test-Path $LogPath) {
    Write-Host "[ReySoft-Asistencia] Ultimas lineas de $LogPath"
    Get-Content -Path $LogPath -Tail 30
  }
  throw "$Name no respondio en $Url."
}

if (-not (Test-Path $backendPython)) {
  throw "No se encontro el interprete del backend en backend\.venv."
}

$backendHealth = "http://127.0.0.1:$BackendPort/health"
$frontendUrl = "http://127.0.0.1:$FrontendPort/"

$shouldStartBackend = Assert-PortAvailable -Port $BackendPort -HealthUrl $backendHealth -ServiceName "Backend"
$shouldStartFrontend = Assert-PortAvailable -Port $FrontendPort -HealthUrl $frontendUrl -ServiceName "Frontend"

if ($shouldStartBackend) {
  $backendOut = Join-Path $runtimePath "backend.out.log"
  $backendErr = Join-Path $runtimePath "backend.err.log"
  $backendProcess = Start-Process `
    -FilePath $backendPython `
    -ArgumentList "-m uvicorn app.main:app --reload --host 127.0.0.1 --port $BackendPort" `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr `
    -WindowStyle Hidden `
    -PassThru
  Set-Content -Path (Join-Path $runtimePath "backend.pid") -Value $backendProcess.Id -Encoding ASCII
  Wait-ForService -Url $backendHealth -Name "Backend" -LogPath $backendErr
}

if ($shouldStartFrontend) {
  $node = Find-Node
  $viteScript = "node_modules\vite\bin\vite.js"
  $frontendOut = Join-Path $runtimePath "frontend.out.log"
  $frontendErr = Join-Path $runtimePath "frontend.err.log"
  $frontendProcess = Start-Process `
    -FilePath $node `
    -ArgumentList "$viteScript --host 127.0.0.1 --port $FrontendPort" `
    -WorkingDirectory $frontendDir `
    -RedirectStandardOutput $frontendOut `
    -RedirectStandardError $frontendErr `
    -WindowStyle Hidden `
    -PassThru
  Set-Content -Path (Join-Path $runtimePath "frontend.pid") -Value $frontendProcess.Id -Encoding ASCII
  Wait-ForService -Url $frontendUrl -Name "Frontend" -LogPath $frontendErr
}

Write-Host ""
Write-Host "[ReySoft-Asistencia] Proyecto local corriendo:"
Write-Host "  Frontend: $frontendUrl"
Write-Host "  Backend:  http://127.0.0.1:$BackendPort"
Write-Host "  Logs:     $runtimePath"
