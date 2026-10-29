# ============================================================
# restore-mongo.ps1 - RestauraciÃ³n de un backup cifrado de MOOD
# ============================================================
# !!! DESTRUCTIVO: usa --drop sobre la base indicada. !!!
#
# Uso:
#   $env:AGE_IDENTITY_FILE = "C:\ruta\age-key.txt"
#   .\scripts\restore-mongo.ps1 -Archive .\backups\mood-....age -Confirm
#
# Para GPG:
#   .\scripts\restore-mongo.ps1 -Archive .\backups\mood-....gpg -Encryption gpg -Confirm
#
# RecomendaciÃ³n: probar primero en una base distinta (-Database mood_restore_test)
# y nunca restaurar sobre producciÃ³n sin ventana de mantenimiento. El backup
# contiene la base original (por defecto mood_db), que se remapea al destino.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Archive,
    [string]$Database = "mood_db",
    [string]$SourceDatabase = "mood_db",
    [ValidateSet("age", "gpg")]
    [string]$Encryption = "age",
    [switch]$Confirm
)

$ErrorActionPreference = "Stop"

if (-not $Confirm) {
    throw "RestauraciÃ³n destructiva. RepetÃ­ con -Confirm y una base de prueba si es posible."
}
if (-not (Test-Path -LiteralPath $Archive)) {
    throw "No existe el archivo: $Archive"
}

$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("mood-restore-" + [guid]::NewGuid().ToString("N") + ".archive.gz")
$containerPath = "/tmp/mood-restore.archive.gz"

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "No se encontrÃ³ '$Name' en PATH."
    }
}

try {
    if ($Encryption -eq "age") {
        Assert-Command "age"
        if ([string]::IsNullOrWhiteSpace($env:AGE_IDENTITY_FILE)) {
            throw "DefinÃ­ AGE_IDENTITY_FILE con la clave privada age."
        }
        & age --decrypt --identity "$env:AGE_IDENTITY_FILE" --output "$temp" "$Archive"
    } else {
        Assert-Command "gpg"
        & gpg --batch --yes --output "$temp" --decrypt "$Archive"
    }
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $temp)) {
        throw "No se pudo descifrar el backup."
    }
    if ((Get-Item $temp).Length -lt 1024) {
        throw "El archivo descifrado es sospechosamente pequeÃ±o."
    }

    docker compose cp "$temp" "mongo:$containerPath" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "No se pudo copiar el backup al contenedor." }

    Write-Host "Restaurando '$SourceDatabase' -> '$Database' (--drop)..."
    docker compose exec -T `
        -e "DB_NAME=$Database" `
        -e "SOURCE_DB=$SourceDatabase" `
        -e "MONGO_RESTORE_PATH=$containerPath" `
        mongo sh -c 'mongorestore --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive="$MONGO_RESTORE_PATH" --gzip --drop --nsFrom "$SOURCE_DB.*" --nsTo "$DB_NAME.*"'
    if ($LASTEXITCODE -ne 0) { throw "mongorestore fallÃ³." }

    Write-Host "RestauraciÃ³n completada. VerificÃ¡ la aplicaciÃ³n y los Ã­ndices."
} finally {
    if (Test-Path $temp) { Remove-Item -Force $temp }
    docker compose exec -T mongo rm -f "$containerPath" 2>$null | Out-Null
}
