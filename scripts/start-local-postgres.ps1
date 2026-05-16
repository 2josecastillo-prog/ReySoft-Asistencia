param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [int]$Port = 55432
)

$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path $Root).Path
$dataPath = Join-Path $rootPath ".pgdata"
$envPath = Join-Path $rootPath "backend\.env"
$envExamplePath = Join-Path $rootPath "backend\.env.example"
$dbName = "reysoft_asistencia"
$dbUser = "reysoft_asistencia"
$dbPassword = "reysoft_asistencia"
# Compatibilidad con clusters .pgdata creados antes del cambio de marca.
$legacyDbName = "edunotify"
$legacyDbUser = "edunotify"
$legacyDbPassword = "edunotify"

function Find-PostgresBin {
  $candidates = @()
  if ($env:PG_BIN) {
    $candidates += $env:PG_BIN
  }

  $candidates += @(
    (Join-Path $env:ProgramFiles "PostgreSQL\18\bin"),
    (Join-Path $env:ProgramFiles "PostgreSQL\17\bin"),
    (Join-Path $env:ProgramFiles "PostgreSQL\16\bin"),
    (Join-Path $env:ProgramFiles "PostgreSQL\15\bin")
  )

  $pgCtl = Get-Command pg_ctl.exe -ErrorAction SilentlyContinue
  if ($pgCtl) {
    $candidates += (Split-Path $pgCtl.Source -Parent)
  }

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path (Join-Path $candidate "pg_ctl.exe"))) {
      return $candidate
    }
  }

  return $null
}

function Update-DatabaseUrl {
  if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $envExamplePath)) {
      throw "No se encontro backend\.env ni backend\.env.example."
    }
    Copy-Item -Path $envExamplePath -Destination $envPath
  }

  $databaseUrl = "postgresql+psycopg://${dbUser}:${dbPassword}@localhost:$Port/$dbName"
  $content = Get-Content -Path $envPath -Raw

  if ($content -match "(?m)^DATABASE_URL=") {
    $content = [regex]::Replace($content, "(?m)^DATABASE_URL=.*$", "DATABASE_URL=$databaseUrl")
  } else {
    $content = $content.TrimEnd() + "`r`nDATABASE_URL=$databaseUrl`r`n"
  }

  Set-Content -Path $envPath -Value $content.TrimEnd() -Encoding UTF8
}

$pgBin = Find-PostgresBin
if (-not $pgBin) {
  throw "No se encontraron binarios de PostgreSQL. Instala PostgreSQL 15+ o usa Docker."
}

$initdb = Join-Path $pgBin "initdb.exe"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$pgIsReady = Join-Path $pgBin "pg_isready.exe"
$psql = Join-Path $pgBin "psql.exe"
$createdb = Join-Path $pgBin "createdb.exe"

if ((Test-Path $dataPath) -and -not (Test-Path (Join-Path $dataPath "PG_VERSION"))) {
  throw ".pgdata existe pero no parece ser un cluster valido de PostgreSQL."
}

if (-not (Test-Path $dataPath)) {
  New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
  $passwordFile = Join-Path $rootPath ".pgpass.tmp"
  Set-Content -Path $passwordFile -Value $dbPassword -NoNewline -Encoding ASCII
  try {
    & $initdb -D $dataPath -U $dbUser -A scram-sha-256 --pwfile=$passwordFile --encoding=UTF8 --locale=C | Write-Host
    if ($LASTEXITCODE -ne 0) {
      throw "initdb fallo con codigo $LASTEXITCODE."
    }
  } finally {
    if (Test-Path $passwordFile) {
      Remove-Item -LiteralPath $passwordFile -Force
    }
  }
}

& $pgIsReady -h localhost -p $Port -q
if ($LASTEXITCODE -ne 0) {
  $logPath = Join-Path $dataPath "server.log"
  & $pgCtl -D $dataPath -o "-p $Port" -l $logPath start | Write-Host
  if ($LASTEXITCODE -ne 0) {
    throw "No se pudo iniciar PostgreSQL local. Revisa $logPath."
  }

  Start-Sleep -Seconds 2
  & $pgIsReady -h localhost -p $Port -q
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL local no respondio en localhost:$Port."
  }
}

function Ensure-Database {
  $oldPgPassword = $env:PGPASSWORD
  try {
    $env:PGPASSWORD = $dbPassword
    $exists = & $psql -h localhost -p $Port -U $dbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$dbName'" 2>$null
    if ($LASTEXITCODE -eq 0) {
      if (($exists -join "").Trim() -ne "1") {
        & $createdb -h localhost -p $Port -U $dbUser $dbName
        if ($LASTEXITCODE -ne 0) {
          throw "No se pudo crear la base de datos $dbName."
        }
      }
      return
    }

    $env:PGPASSWORD = $legacyDbPassword
    $legacyExists = & $psql -h localhost -p $Port -U $legacyDbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$legacyDbName'"
    if ($LASTEXITCODE -ne 0) {
      throw "No se pudo conectar a PostgreSQL local como $dbUser ni como $legacyDbUser."
    }

    $roleExists = & $psql -h localhost -p $Port -U $legacyDbUser -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$dbUser'"
    if ($LASTEXITCODE -ne 0) {
      throw "No se pudo verificar el rol $dbUser."
    }

    if (($roleExists -join "").Trim() -eq "1") {
      $alterRoleSql = 'ALTER ROLE "' + $dbUser + '" WITH LOGIN CREATEDB PASSWORD ''' + $dbPassword + ''''
      & $psql -h localhost -p $Port -U $legacyDbUser -d postgres -c $alterRoleSql | Write-Host
      if ($LASTEXITCODE -ne 0) {
        throw "No se pudo actualizar el rol $dbUser."
      }
    } else {
      $createRoleSql = 'CREATE ROLE "' + $dbUser + '" LOGIN CREATEDB PASSWORD ''' + $dbPassword + ''''
      & $psql -h localhost -p $Port -U $legacyDbUser -d postgres -c $createRoleSql | Write-Host
      if ($LASTEXITCODE -ne 0) {
        throw "No se pudo crear el rol $dbUser."
      }
    }

    $currentDbExists = & $psql -h localhost -p $Port -U $legacyDbUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$dbName'"
    if ($LASTEXITCODE -ne 0) {
      throw "No se pudo verificar la base de datos $dbName."
    }

    if (($currentDbExists -join "").Trim() -ne "1") {
      & $createdb -h localhost -p $Port -U $legacyDbUser -O $dbUser $dbName
      if ($LASTEXITCODE -ne 0) {
        throw "No se pudo crear la base de datos $dbName."
      }
    }

    $env:PGPASSWORD = $dbPassword
    & $psql -h localhost -p $Port -U $dbUser -d postgres -tAc "SELECT 1" | Out-Null
    if ($LASTEXITCODE -ne 0) {
      throw "El rol $dbUser fue preparado, pero aun no puede conectarse."
    }
  } finally {
    $env:PGPASSWORD = $oldPgPassword
  }
}

Ensure-Database

Update-DatabaseUrl
Write-Host "[ReySoft-Asistencia] PostgreSQL local listo en localhost:$Port ($dbName)."
