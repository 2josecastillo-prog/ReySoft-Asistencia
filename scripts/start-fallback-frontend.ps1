param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [int]$Port = 5173
)

$nodeCandidates = @(
  (Join-Path $Root ".tools\node\node.exe"),
  (Get-Command node.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
  (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe")
)

foreach ($basePath in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA)) {
  if ($basePath) {
    $relativeNodePath = if ($basePath -eq $env:LOCALAPPDATA) { "Programs\nodejs\node.exe" } else { "nodejs\node.exe" }
    $nodeCandidates += Join-Path $basePath $relativeNodePath
  }
}

$nodeCandidates = $nodeCandidates | Where-Object { $_ -and (Test-Path $_) }

if (-not $nodeCandidates) {
  throw "node.exe was not found. Install Node.js LTS or use the bundled Codex runtime."
}

$node = $nodeCandidates[0]
$script = Join-Path $Root "scripts\serve-frontend-fallback.mjs"

$existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($existing) {
  Write-Host "ReySoft-Asistencia frontend is already listening on http://127.0.0.1:$Port"
  exit 0
}

$psi = [System.Diagnostics.ProcessStartInfo]::new($node, "scripts\serve-frontend-fallback.mjs")
$psi.WorkingDirectory = $Root
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$process = [System.Diagnostics.Process]::Start($psi)
Start-Sleep -Seconds 1

try {
  $health = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/health" -TimeoutSec 3
  Write-Host "ReySoft-Asistencia fallback frontend started at http://127.0.0.1:$Port"
  Write-Host "Process ID: $($process.Id)"
  Write-Host $health.Content
} catch {
  throw "Fallback frontend did not respond after startup. $($_.Exception.Message)"
}
