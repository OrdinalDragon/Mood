# ============================================================
# healthcheck.ps1 - Chequeo operativo de MOOD
# ============================================================
# Verifica contenedores, API local, cabeceras, disco y (opcionalmente)
# el sitio público y la frescura del último backup.
#
# Uso:
#   .\scripts\healthcheck.ps1
#   .\scripts\healthcheck.ps1 -PublicUrl https://prototipomood.jesrepresentaciones.com.ar -RequireBackup

[CmdletBinding()]
param(
    [string]$BaseUrl = "http://127.0.0.1",
    [string]$PublicUrl = "",
    [string]$BackupDir = (Join-Path (Get-Location) "backups"),
    [switch]$RequireBackup,
    [int]$MinFreeGB = 5
)

$ErrorActionPreference = "Stop"
$failures = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Add-Failure([string]$Message) {
    $script:failures.Add($Message)
    Write-Host "FAIL  $Message" -ForegroundColor Red
}

function Add-Warning([string]$Message) {
    $script:warnings.Add($Message)
    Write-Host "WARN  $Message" -ForegroundColor Yellow
}

function Add-Ok([string]$Message) {
    Write-Host "OK    $Message" -ForegroundColor Green
}

# Contenedores
try {
    $lines = docker compose ps --format "{{.Service}}|{{.Status}}"
    if ($LASTEXITCODE -ne 0) { throw "docker compose ps falló" }
    $status = @{}
    foreach ($line in $lines) {
        $parts = $line -split "\|", 2
        if ($parts.Count -eq 2) { $status[$parts[0]] = $parts[1] }
    }
    foreach ($service in @("mongo", "backend", "frontend", "nginx", "cloudflare")) {
        if (-not $status.ContainsKey($service)) {
            Add-Failure "contenedor $service no está corriendo"
        } elseif ($status[$service] -notmatch "Up|healthy") {
            Add-Failure "contenedor $service en estado: $($status[$service])"
        } else {
            Add-Ok "contenedor ${service}: $($status[$service])"
        }
    }
} catch {
    Add-Failure "no se pudo consultar Docker: $($_.Exception.Message)"
}

# API local
try {
    $health = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/api/health" -TimeoutSec 10
    if ($health.StatusCode -eq 200) {
        Add-Ok "API /api/health 200"
    } else {
        Add-Failure "API /api/health devolvió $($health.StatusCode)"
    }
} catch {
    Add-Failure "API /api/health inaccesible: $($_.Exception.Message)"
}

try {
    $root = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/" -TimeoutSec 10
    if ($root.StatusCode -ne 200) {
        Add-Failure "frontend local devolvió $($root.StatusCode)"
    } elseif (-not $root.Headers["Content-Security-Policy"]) {
        Add-Failure "frontend local sin Content-Security-Policy"
    } else {
        Add-Ok "frontend local 200 con CSP"
    }
} catch {
    Add-Failure "frontend local inaccesible: $($_.Exception.Message)"
}

# Sitio público (Cloudflare)
if ($PublicUrl) {
    try {
        $public = Invoke-WebRequest -UseBasicParsing -Uri $PublicUrl -TimeoutSec 20
        if ($public.StatusCode -eq 200) {
            Add-Ok "sitio público 200"
        } else {
            Add-Failure "sitio público devolvió $($public.StatusCode)"
        }
        if (-not $public.Headers["Strict-Transport-Security"]) {
            Add-Warning "sitio público sin HSTS (¿Cloudflare/Nginx?)"
        }
    } catch {
        Add-Failure "sitio público inaccesible: $($_.Exception.Message)"
    }
}

# Disco
try {
    $driveName = (Get-Item (Get-Location)).PSDrive.Name
    $freeGB = [math]::Round((Get-PSDrive $driveName).Free / 1GB, 1)
    if ($freeGB -lt $MinFreeGB) {
        Add-Failure "poco espacio libre: ${freeGB} GB (mínimo $MinFreeGB GB)"
    } else {
        Add-Ok "espacio libre: ${freeGB} GB"
    }
} catch {
    Add-Warning "no se pudo leer el espacio libre"
}

# Backup reciente
if (Test-Path $BackupDir) {
    $latest = Get-ChildItem -File -Path $BackupDir -Filter "mood-*.archive.gz.*" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if (-not $latest) {
        if ($RequireBackup) { Add-Failure "no hay backups en $BackupDir" }
        else { Add-Warning "no hay backups en $BackupDir" }
    } elseif ($latest.LastWriteTimeUtc -lt (Get-Date).ToUniversalTime().AddHours(-26)) {
        if ($RequireBackup) { Add-Failure "el último backup tiene más de 26 h" }
        else { Add-Warning "el último backup tiene más de 26 h" }
    } else {
        Add-Ok "último backup: $($latest.LastWriteTimeUtc.ToString('u'))"
    }
} elseif ($RequireBackup) {
    Add-Failure "no existe el directorio de backups $BackupDir"
} else {
    Add-Warning "no existe el directorio de backups $BackupDir"
}

if ($failures.Count -gt 0) {
    Write-Host "`n$($failures.Count) fallo(s), $($warnings.Count) advertencia(s)." -ForegroundColor Red
    exit 1
}
Write-Host "`nTodo OK ($($warnings.Count) advertencia(s))." -ForegroundColor Green
exit 0
