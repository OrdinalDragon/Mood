# Seguridad de MOOD

Este documento describe los controles de seguridad del despliegue y cómo reportar un problema. Los procedimientos operativos detallados están en [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## Reportar una vulnerabilidad

No abras un issue público con detalles explotables. Usá un **security advisory privado** del repositorio o contactá al mantenedor por el canal privado habitual, indicando:

- versión/commit afectado,
- pasos de reproducción,
- impacto estimado,
- evidencia mínima (sin datos de terceros ni secretos).

Objetivo de respuesta: acuse de recibo en 72 h y evaluación inicial en 7 días. No hay recompensa económica.

## Controles implementados

- **Sesiones**: access token JWT corto (~15 min) en memoria; refresh token opaco rotativo en cookie `HttpOnly`, `Secure` (bajo HTTPS), `SameSite=Lax`, con `token_version` para revocación real. Los JWT validan `iss`/`aud` (`mood`/`mood-web` por defecto en Compose).
- **CSRF**: doble submit (`mood_csrf` + `X-CSRF-Token`) y validación de `Origin`/`Referer` en endpoints con cookie.
- **MFA**: TOTP para cuentas con contraseña local; activación/desactivación exige contraseña; códigos de recuperación de un solo uso almacenados hasheados. Las cuentas creadas solo con Google usan la verificación en dos pasos de Google.
- **Tokens de email**: verificación y reseteo se guardan hasheados (SHA-256); el token viaja en el fragmento de la URL de verificación o en el body del reset.
- **Contraseñas**: bcrypt con migración transparente desde SHA-256 legado; mínimo 8 caracteres y máximo 72 bytes; comparación de tiempo constante.
- **Enumeración/timing**: registro y recuperación con respuestas genéricas; hash de relleno para emails inexistentes.
- **Auditoría**: colección `audit_logs` con TTL de 180 días para login, refresh, MFA, cambios de contraseña, roles, bans, uploads, Gemini y mutaciones relevantes.
- **Gemini**: autenticación obligatoria, límites de tamaño/historial, allowlist de funciones, timeout y errores genéricos.
- **Uploads**: límite de 10 MB, validación real de imagen, recompresión a WebP y límite de píxeles.
- **Borde**: Nginx publicado solo en `127.0.0.1:80` (el túnel de Cloudflare accede por la red Docker), CSP con reportes, HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y Trusted Types en modo reporte.
- **Supply chain**: CI con tests, `pip-audit`, `npm audit`, gitleaks, Semgrep y Trivy; Dependabot semanal.
- **Backups**: `mongodump` cifrado con age o GPG, retención diaria/semanal y procedimiento de restore drill.

## Secretos

- `.env` no se versiona y debe tener permisos mínimos (`scripts/harden-env.ps1` / `.sh`).
- No se aceptan claves, tokens, contraseñas ni material personal en commits, issues, capturas o logs.
- Rotación documentada en el runbook. Tras rotar `JWT_SECRET`, todas las sesiones quedan invalidadas (comportamiento esperado). Al habilitar `JWT_ISSUER`/`JWT_AUDIENCE` por primera vez, los tokens viejos sin esos claims también dejan de valer: avisar que hay que volver a iniciar sesión.
- La clave privada de age/GPG para backups debe guardarse fuera del servidor o en un gestor de secretos; sin ella, los backups no se pueden restaurar.

## Riesgos aceptados / pendientes

- `google-generativeai` está deprecado por Google; funciona, pero debe migrarse a `google-genai` en una ventana planificada.
- `npm audit` puede reportar avisos *dev-only* de `esbuild`/Vite. No afectan el bundle de producción; se revisan en cada actualización.
- La CSP permite `style-src 'unsafe-inline'` por compatibilidad con React/estilos existentes y `img-src https:` porque los eventos usan imágenes externas.
- Trusted Types está en modo reporte; pasar a enforcement requiere resolver violaciones primero.
- El túnel de Cloudflare es un punto único de entrada. Su token debe rotarse si se compromete y el túnel no debe recrearse sin ventana.
- MongoDB corre en un solo host; la disponibilidad depende de Docker/host y de los backups.

## Buenas prácticas para contribuir

- No agregar endpoints que acepten cookies sin CSRF/Origin.
- No loguear tokens, contraseñas, prompts completos ni datos personales innecesarios.
- Validar entradas con Pydantic y límites explícitos.
- Ejecutar `pytest`, `npm run lint` y `python -m compileall -q app` antes de un PR.
- Mantener las dependencias fijadas y revisar los avisos de Dependabot.
