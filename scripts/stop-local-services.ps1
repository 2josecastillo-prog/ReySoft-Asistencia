param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path $Root).Path
$runtimePath = Join-Path $rootPath ".runtime"
$pidFiles = @(
  Join-Path $runtimePath "backend.pid",
  Join-Path $runtimePath "frontend.pid"
)

foreach ($pidFile in $pidFiles) {
  if (-not (Test-Path $pidFile)) {
    continue
  }

  $processId = (Get-Content -Path $pidFile -Raw).Trim()
  if (-not $processId) {
    Remove-Item -LiteralPath $pidFile -Force
    continue
  }

  $process = Get-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
  if ($process) {
    Stop-Process -Id $process.Id -Force
    Write-Host "[ReySoft-Asistencia] Proceso detenido: $($process.Id)"
  }

  Remove-Item -LiteralPath $pidFile -Force
}

Write-Host "[ReySoft-Asistencia] Servicios locales detenidos."
