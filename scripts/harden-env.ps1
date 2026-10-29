# ============================================================
# harden-env.ps1 - Permisos mínimos para .env en Windows
# ============================================================
# Quita herencia y deja lectura/escritura solo para:
#   - el usuario actual
#   - SYSTEM (S-1-5-18)
#   - Administradores (S-1-5-32-544)
# No imprime el contenido de .env.
#
# Uso: .\scripts\harden-env.ps1
# Requiere ejecutarse en el repositorio, con permisos sobre el archivo.

[CmdletBinding()]
param(
    [string]$EnvFile = (Join-Path (Get-Location) ".env")
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $EnvFile)) {
    throw "No existe $EnvFile"
}

$resolved = (Resolve-Path -LiteralPath $EnvFile).Path
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

Write-Host "Aplicando ACL mínima a $resolved"
& icacls $resolved /inheritance:r | Out-Null
if ($LASTEXITCODE -ne 0) { throw "No se pudo quitar la herencia de ACL." }

& icacls $resolved `
    /grant:r "${currentUser}:(R,W)" `
    "*S-1-5-18:(R,W)" `
    "*S-1-5-32-544:(R,W)" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "No se pudieron aplicar los permisos." }

$acl = Get-Acl -LiteralPath $resolved
Write-Host "ACL aplicada. Reglas:"
$acl.Access | ForEach-Object {
    Write-Host ("  {0} -> {1}" -f $_.IdentityReference, $_.FileSystemRights)
}

# Comprobaciones de higiene (sin mostrar valores).
$jwtLine = Get-Content -LiteralPath $resolved | Where-Object { $_ -match '^JWT_SECRET=' } | Select-Object -First 1
if ($jwtLine) {
    $jwt = $jwtLine.Substring("JWT_SECRET=".Length).Trim()
    if ($jwt.Length -lt 32) {
        Write-Warning "JWT_SECRET tiene menos de 32 caracteres. Rotarlo con: openssl rand -hex 32"
    }
} else {
    Write-Warning "No se encontró JWT_SECRET en .env"
}

try {
    $ignored = git check-ignore .env
    if ($LASTEXITCODE -eq 0 -and $ignored) {
        Write-Host ".env está ignorado por git."
    } else {
        Write-Warning ".env NO está ignorado por git. Revisá .gitignore antes de commitear."
    }
} catch {
    Write-Warning "No se pudo verificar .gitignore (¿git disponible?)."
}

try {
    $systemDrive = (Get-Item $resolved).PSDrive.Name + ":"
    $bitlocker = Get-BitLockerVolume -MountPoint $systemDrive -ErrorAction Stop
    if ($bitlocker.ProtectionStatus -ne "On") {
        Write-Warning "BitLocker no está activo en $systemDrive. El disco no está cifrado en reposo."
    } else {
        Write-Host "BitLocker activo en $systemDrive."
    }
} catch {
    Write-Warning "No se pudo verificar BitLocker (¿PowerShell sin permisos de administrador?)."
}

Write-Host "Listo. Guardá la clave privada age/GPG fuera de este equipo o en un gestor de secretos."
