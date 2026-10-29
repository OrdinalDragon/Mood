# ============================================================
# backup-mongo.ps1 - Backup cifrado de MongoDB para MOOD
# ============================================================
# Requiere: Docker Compose, mongodump dentro del contenedor mongo,
# y age (recomendado) o gpg en el host.
#
# Uso:
#   $env:AGE_RECIPIENT = "age1..."      # clave pÃºblica age
#   .\scripts\backup-mongo.ps1
#
#   # o con GPG
#   $env:GPG_RECIPIENT = "backup@example.com"
#   .\scripts\backup-mongo.ps1 -Encryption gpg
#
# El archivo se guarda en .\backups (ignorado por git) y se cifra antes
# de escribir disco. Nunca se imprime la contraseÃ±a de Mongo ni secretos.

[CmdletBinding()]
param(
    [string]$OutputDir = (Join-Path (Get-Location) "backups"),
    [string]$Database = "mood_db",
    [ValidateSet("age", "gpg")]
    [string]$Encryption = "age",
    [string]$Recipient = $env:AGE_RECIPIENT,
    [string]$GpgRecipient = $env:GPG_RECIPIENT,
    [int]$DailyRetention = 14,
    [int]$WeeklyRetention = 8,
    [string]$RcloneRemote = $env:RCLONE_REMOTE
)

$ErrorActionPreference = "Stop"
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$containerPath = "/tmp/mood-$stamp.archive.gz"
$raw = Join-Path $OutputDir ".mood-$stamp.archive.gz"
$extension = "gpg"
if ($Encryption -eq "age") { $extension = "age" }
$encrypted = Join-Path $OutputDir "mood-$stamp.archive.gz.$extension"

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "No se encontrÃ³ '$Name' en PATH."
    }
}

if ($Encryption -eq "age") {
    Assert-Command "age"
    if ([string]::IsNullOrWhiteSpace($Recipient)) {
        throw "DefinÃ­ AGE_RECIPIENT o pasÃ¡ -Recipient con la clave pÃºblica age."
    }
} else {
    Assert-Command "gpg"
    if ([string]::IsNullOrWhiteSpace($GpgRecipient)) {
        throw "DefinÃ­ GPG_RECIPIENT o pasÃ¡ -GpgRecipient con el destinatario GPG."
    }
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $OutputDir "weekly") | Out-Null

$running = docker compose ps --services --filter "status=running"
if ($LASTEXITCODE -ne 0 -or $running -notcontains "mongo") {
    throw "El servicio mongo no estÃ¡ corriendo. LevantÃ¡ el stack primero."
}

try {
    Write-Host "Generando dump de '$Database'..."
    docker compose exec -T `
        -e "DB_NAME=$Database" `
        -e "MONGO_DUMP_PATH=$containerPath" `
        mongo sh -c 'mongodump --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db "$DB_NAME" --archive="$MONGO_DUMP_PATH" --gzip'
    if ($LASTEXITCODE -ne 0) { throw "mongodump fallÃ³." }

    docker compose cp "mongo:$containerPath" "$raw" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "No se pudo copiar el dump desde el contenedor." }
    if ((Get-Item $raw).Length -lt 1024) { throw "El dump es sospechosamente pequeÃ±o." }

    Write-Host "Cifrando con $Encryption..."
    if ($Encryption -eq "age") {
        & age --recipient "$Recipient" --output "$encrypted" "$raw"
    } else {
        & gpg --batch --yes --trust-model always --recipient "$GpgRecipient" --output "$encrypted" --encrypt "$raw"
    }
    if ($LASTEXITCODE -ne 0) { throw "El cifrado fallÃ³." }
    if (-not (Test-Path $encrypted) -or (Get-Item $encrypted).Length -lt 1024) {
        throw "El archivo cifrado no se generÃ³ correctamente."
    }
    Write-Host "Backup creado: $encrypted"

    # RetenciÃ³n diaria: se conservan los Ãºltimos N archivos.
    $all = Get-ChildItem -File -Path $OutputDir -Filter "mood-*.archive.gz.$extension" |
        Sort-Object LastWriteTimeUtc -Descending
    if ($all.Count -gt $DailyRetention) {
        $all | Select-Object -Skip $DailyRetention | Remove-Item -Force
    }

    # RetenciÃ³n semanal: una copia por semana ISO, hasta N semanas.
    $weeklyDir = Join-Path $OutputDir "weekly"
    $seenWeeks = @{}
    foreach ($file in $all) {
        $week = $file.LastWriteTimeUtc.ToString("yyyy-ww")
        if (-not $seenWeeks.ContainsKey($week)) {
            $seenWeeks[$week] = $true
            $target = Join-Path $weeklyDir $file.Name
            if (-not (Test-Path $target)) {
                Copy-Item -Path $file.FullName -Destination $target
            }
        }
    }
    Get-ChildItem -File -Path $weeklyDir -Filter "mood-*.archive.gz.$extension" |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -Skip $WeeklyRetention |
        Remove-Item -Force

    if ($RcloneRemote) {
        Assert-Command "rclone"
        Write-Host "Copiando a $RcloneRemote..."
        & rclone copy "$encrypted" "$RcloneRemote" --immutable
        if ($LASTEXITCODE -ne 0) { throw "rclone fallÃ³." }
    }

    Write-Host "RetenciÃ³n: $DailyRetention diarios / $WeeklyRetention semanales."
} finally {
    if (Test-Path $raw) { Remove-Item -Force $raw }
    docker compose exec -T mongo rm -f "$containerPath" 2>$null | Out-Null
}
