# ============================================================
# reset-mfa.ps1 - Reset administrativo de MFA
# ============================================================
# Limpia MFA, revoca sesiones y deja auditorÃ­a. Verificar identidad del
# usuario por un canal alternativo antes de ejecutarlo.
#
# Uso: .\scripts\reset-mfa.ps1 -Email usuario@example.com -Actor admin@example.com

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Email,
    [string]$Actor = "manual",
    [string]$Database = "mood_db"
)

$ErrorActionPreference = "Stop"
if ($Email -notmatch '^[^@\s]+@[^@\s]+$') {
    throw "Email invÃ¡lido"
}

$containerScript = "/tmp/mood-reset-mfa-" + [guid]::NewGuid().ToString("N") + ".js"
$tempScript = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetFileName($containerScript))

$js = @'
const d = db.getSiblingDB(process.env.MOOD_DB);
const u = d.users.findOne({ email: process.env.TARGET_EMAIL });
if (!u) { print("not found"); quit(2); }
d.users.updateOne(
  { uid: u.uid },
  {
    $set: {
      mfa_enabled: false,
      mfa_secret: null,
      mfa_pending_secret: null,
      mfa_recovery_hashes: []
    },
    $inc: { token_version: 1 }
  }
);
d.refresh_sessions.deleteMany({ uid: u.uid });
d.audit_logs.insertOne({
  action: "mfa_reset_manual",
  actor_email: process.env.ACTOR_EMAIL,
  target: u.uid,
  timestamp: new Date(),
  success: true
});
print("mfa reset");
'@

try {
    Set-Content -LiteralPath $tempScript -Value $js -Encoding ASCII
    docker compose cp "$tempScript" "mongo:$containerScript" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "No se pudo copiar el script al contenedor." }

    docker compose exec -T `
        -e "TARGET_EMAIL=$Email" `
        -e "ACTOR_EMAIL=$Actor" `
        -e "MOOD_DB=$Database" `
        mongo sh -c 'mongosh --quiet --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --file "$0"' $containerScript

    if ($LASTEXITCODE -eq 2) {
        throw "No existe el usuario $Email"
    }
    if ($LASTEXITCODE -ne 0) {
        throw "mongosh fallÃ³ (cÃ³digo $LASTEXITCODE)"
    }
    Write-Host "MFA reseteado para $Email. El usuario debe enrolar de nuevo."
} finally {
    Remove-Item -LiteralPath $tempScript -Force -ErrorAction SilentlyContinue
    docker compose exec -T mongo rm -f "$containerScript" 2>$null | Out-Null
}
