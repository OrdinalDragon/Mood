# RUNBOOK operativo — MOOD

Procedimientos para operar, recuperar y responder a incidentes. No incluir secretos reales en este documento.

## 0. Comandos base

```powershell
cd C:\Docker\mood
docker compose ps
docker compose logs --tail=200 backend nginx
docker compose up -d --build
docker compose restart backend
```

```bash
cd /opt/mood
docker compose ps
docker compose logs --tail=200 backend nginx
docker compose up -d --build
docker compose restart backend
```

Chequeo rápido:

```powershell
.\scripts\healthcheck.ps1 -PublicUrl https://prototipomood.jesrepresentaciones.com.ar
```

```bash
PUBLIC_URL=https://prototipomood.jesrepresentaciones.com.ar ./scripts/healthcheck.sh
```

## 1. Backups

### 1.1 Crear un backup

Requisitos: `age` (recomendado) o `gpg` en el host, y la clave pública configurada.

```powershell
$env:AGE_RECIPIENT = "age1..."   # solo la clave PÚBLICA
.\scripts\backup-mongo.ps1
```

```bash
AGE_RECIPIENT=age1... ./scripts/backup-mongo.sh
```

Con GPG:

```powershell
$env:GPG_RECIPIENT = "backup@example.com"
.\scripts\backup-mongo.ps1 -Encryption gpg
```

Salida: `backups/mood-<UTC>.archive.gz.age` (o `.gpg`), más copias semanales en `backups/weekly/`. La carpeta `backups/` está en `.gitignore`; nunca se versiona.

Variables útiles: `OUTPUT_DIR`, `DATABASE`, `DAILY_RETENTION` (14), `WEEKLY_RETENTION` (8), `RCLONE_REMOTE` (opcional).

### 1.2 Programar backups

Windows (Task Scheduler, ejecutar como el usuario que tiene la clave age):

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\Docker\mood\scripts\backup-mongo.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00am
Register-ScheduledTask -TaskName "MOOD MongoDB Backup" -Action $action -Trigger $trigger
```

Linux (cron):

```cron
0 3 * * * cd /opt/mood && AGE_RECIPIENT=age1... ./scripts/backup-mongo.sh >> /var/log/mood-backup.log 2>&1
```

Guardar la clave **privada** age/GPG fuera del servidor (gestor de secretos o medio offline). Sin ella los backups son irrecuperables. Probar el restore al menos cada 90 días.

### 1.3 Restaurar

> Destructivo: `--drop` borra la base destino antes de restaurar. Probar primero en `mood_restore_test`.

```powershell
$env:AGE_IDENTITY_FILE = "C:\ruta\age-key.txt"
.\scripts\restore-mongo.ps1 -Archive .\backups\mood-....age `
  -Database mood_restore_test -Confirm
```

```bash
AGE_IDENTITY_FILE=/ruta/age-key.txt DATABASE=mood_restore_test \
  ./scripts/restore-mongo.sh backups/mood-....age --confirm
```

Verificar después:

```bash
docker compose exec -T backend sh -c 'cd /app && python -c "import asyncio; from app.database import init_db; from app.models import User; asyncio.run(init_db()); print(\"ok\")"'
```

Además: abrir la app apuntando a la base de prueba, revisar login, eventos, uploads, auditoría e índices (`users.email`, `users.uid`, `refresh_sessions.expires_at` TTL, `audit_logs.timestamp` TTL). Si todo está bien, repetir sobre producción en ventana de mantenimiento.

### 1.4 Drill de restore (checklist)

- [ ] Descifrar el backup más reciente con la clave privada.
- [ ] Restaurar en `mood_restore_test` y verificar que `mongorestore` termina sin errores.
- [ ] Contar colecciones/documentos clave y comparar con producción.
- [ ] Levantar una instancia de backend de prueba contra esa base y hacer login.
- [ ] Verificar índices y TTL.
- [ ] Borrar la base de prueba.
- [ ] Registrar fecha, responsable y resultado.

## 2. Revocar sesiones de un usuario

Preferido: el usuario usa “cerrar sesión en todos los dispositivos” (`POST /api/auth/logout-all`). Si no puede, un administrador puede:

```powershell
# Incrementa token_version y borra refresh sessions. No cambia la contraseña.
.\scripts\revoke-user.ps1 -Email usuario@example.com
```

Efecto: los access token existentes dejan de valer de inmediato (versión distinta) y los refresh se eliminan. El usuario debe volver a iniciar sesión.

Para un incidente, hacerlo también con la cuenta afectada y con cuentas admin sospechosas.

## 3. Resetear MFA de un usuario

Solo tras verificar identidad por un canal alternativo. Es una acción sensible: auditar.

```powershell
.\scripts\reset-mfa.ps1 -Email usuario@example.com -Actor "admin@example.com"
```

El script limpia `mfa_enabled`, `mfa_secret`, `mfa_pending_secret` y `mfa_recovery_hashes`, incrementa `token_version`, borra sesiones y deja un registro `mfa_reset_manual` en `audit_logs`. El usuario debe enrolar MFA de nuevo.

## 4. Rotación de secretos

### 4.1 `JWT_SECRET`

```powershell
# Generar uno nuevo (32 bytes hex)
openssl rand -hex 32
```

Actualizar `JWT_SECRET` en `.env`, reiniciar backend:

```powershell
docker compose restart backend
```

Esto invalida **todas** las sesiones; avisar antes. Verificar login y refresh.

### 4.2 Contraseña de MongoDB

1. Backup reciente y verificado.
2. Cambiar la contraseña del usuario root:

```bash
docker compose exec -T mongo sh -c 'mongosh --quiet --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "db.getSiblingDB(\"admin\").changeUserPassword(\"$MONGO_INITDB_ROOT_USERNAME\", \"NUEVA_CLAVE\")"'
```

3. Actualizar `MONGO_INITDB_ROOT_PASSWORD` (y `MONGO_URI` si incluye credenciales) en `.env`.
4. `docker compose up -d` (Mongo no cambia la clave al reiniciar; la variable solo se usa en la inicialización).
5. Verificar backend, backups y restore.

### 4.3 SMTP / Google / Gemini / Cloudflare

- SMTP: revocar app password en el proveedor, generar una nueva, actualizar `.env`, reiniciar backend.
- Google OAuth: rotar `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` en Google Cloud, actualizar `.env` y frontend; verificar login Google.
- Gemini: revocar la API key, crear otra, actualizar `.env`, reiniciar backend.
- Cloudflare Tunnel: si el token se compromete, rotarlo en Cloudflare Zero Trust y actualizar el secreto del contenedor. No borrar el túnel si se puede evitar; cambiar el token y reiniciar `cloudflare`.
- age/GPG: generar un nuevo par, actualizar el destinatario; conservar la clave privada anterior hasta que expiren los backups viejos.

## 5. Incidente de seguridad

1. **Contener**
   - Bloquear IP/ASN en Cloudflare WAF si hay abuso.
   - Banear la cuenta (`POST /api/auth/users/{uid}/ban`) y revocar sesiones.
   - Si hay sospecha de compromiso de admin, rotar `JWT_SECRET` y credenciales.
2. **Preservar evidencia**
   - Exportar logs de Docker (`docker compose logs --since ...`) y `audit_logs`.
   - No borrar contenedores/volúmenes antes de copiar evidencia.
3. **Erradicar y recuperar**
   - Corregir la causa, rotar secretos afectados, restaurar backup si hubo corrupción.
   - Verificar que no queden sesiones ni tokens válidos.
4. **Notificar**
   - A responsables y, si corresponde, a usuarios afectados y autoridad.
5. **Postmortem**
   - Línea de tiempo, causa raíz, impacto, acciones y dueños/fechas.

Contacto y escalamiento: definir un responsable primario y uno alternativo antes de necesitarlo; no usar canales públicos para detalles explotables.

## 6. Monitoreo y alertas

- Uptime: monitor externo a `https://<dominio>/` y `/api/health` cada 1–5 min.
- Errores: alertar por 5xx sostenidos y picos de 401/403/429 (Cloudflare Analytics/logs).
- Certificado: Cloudflare gestiona el borde; verificar vencimiento y renovación.
- Backups: alertar si no hay un backup nuevo en 26 h (`healthcheck -RequireBackup`).
- Disco: alertar por debajo de 5 GB libres (los logs rotan a 10 MB × 5 por servicio).
- Seguridad:
  - `login_failed` repetidos por IP/email.
  - `refresh_replay_detected` / `refresh_race` anómalos.
  - cambios de rol/ban y reseteos de MFA.
  - `csp-report` con volumen inusual.

Consultas útiles en `mongosh` (desde el contenedor):

```js
const d = db.getSiblingDB("mood_db");
d.audit_logs.find({ action: "login_failed" }).sort({ timestamp: -1 }).limit(20);
d.audit_logs.aggregate([
  { $match: { action: "login_failed", timestamp: { $gte: new Date(Date.now() - 3600000) } } },
  { $group: { _id: "$ip", n: { $sum: 1 } } },
  { $sort: { n: -1 } }, { $limit: 10 }
]);
d.audit_logs.find({ action: { $in: ["refresh_replay_detected", "role_changed", "user_banned", "mfa_reset_manual"] } })
  .sort({ timestamp: -1 }).limit(20);
```

## 7. MFA de administradores

1. Cada admin inicia sesión, va a Perfil → Seguridad, activa MFA y guarda los códigos de recuperación fuera del navegador.
2. Verificar que el login pida el segundo factor.
3. No desactivar MFA de un admin sin reemplazo y sin auditar.
4. Si se pierde el dispositivo y los códigos, usar `reset-mfa.ps1` tras verificar identidad.
5. Las cuentas creadas solo con Google no usan TOTP local: activan la verificación en dos pasos en su cuenta de Google. Para esas cuentas, el botón de MFA del perfil queda deshabilitado.

## 8. Privacidad y retención

- `audit_logs`: TTL 180 días.
- Refresh sessions: TTL según expiración (7 o 30 días).
- Backups: 14 diarios + 8 semanales (ajustable); cifrados.
- Logs de contenedores: rotación 10 MB × 5.
- Eliminación de cuenta: usar el endpoint admin `DELETE /api/auth/users/{uid}` (borra el usuario y sus refresh sessions). Revisar/eliminar datos asociados (notificaciones, reviews, analytics) según corresponda y verificar que no queden en backups dentro del período de retención.
- Revisar base legal, consentimiento y política de privacidad con quien corresponda.

## 9. CI y supply chain

- `.github/workflows/security.yml`: tests, `pip-audit`, `npm audit`, gitleaks, Semgrep y Trivy.
- Dependabot semanal para pip, npm, Docker y GitHub Actions.
- Si un escaneo falla: actualizar la dependencia o documentar la excepción con justificación y fecha; no desactivar el gate silenciosamente.
- Excepciones conocidas: avisos dev-only de esbuild/Vite; migración pendiente de `google-generativeai`.
- Antes de mergear: revisar que gitleaks no haya detectado secretos; si se filtró uno, rotarlo (no alcanza con borrar el commit).

## 10. Despliegue seguro

1. `git status` sin secretos, backups ni `PLAN_SEGURIDAD.md`.
2. `python -m compileall -q app`, `pytest`, `npm run lint`.
3. `docker compose build` y `docker compose up -d`.
4. `.\scripts\healthcheck.ps1 -PublicUrl https://...`.
5. Probar login, refresh, MFA (si está activo), eventos y Gemini.
6. Verificar sitio público, cookies `Secure`, CSP/HSTS y que Nginx no escuche en LAN.
7. Rollback: `git checkout <commit-anterior>` + rebuild, o imágenes previas; los backups no se tocan.

> Primer despliegue con `JWT_ISSUER`/`JWT_AUDIENCE`: los tokens emitidos antes no incluyen esos claims y dejan de valer. Avisar a los usuarios que deben volver a iniciar sesión; no es un incidente.
