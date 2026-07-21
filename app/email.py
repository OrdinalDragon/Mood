import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_email(to: str, subject: str, body_html: str, body_text: str = ""):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)

    msg = MIMEMultipart("alternative")
    msg["From"] = f"MOOD <{smtp_from}>"
    msg["To"] = to
    msg["Subject"] = subject

    if body_text:
        msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html, "html"))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_from, to, msg.as_string())


def send_verification_email(to: str, token: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost")
    link = f"{frontend_url}/verify-email?token={token}"
    body_text = f"Verificá tu cuenta: {link}"
    body_html = f"""\
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;padding:20px;max-width:600px;margin:auto">
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="color:#1e293b;margin:0">MOOD</h1>
    <p style="color:#64748b">Descubrí eventos según tu estado de ánimo</p>
  </div>
  <div style="background:#f8fafc;padding:32px;border-radius:12px;text-align:center">
    <h2 style="color:#1e293b;margin:0 0 8px">Verificá tu correo electrónico</h2>
    <p style="color:#475569;margin:0 0 24px">Hacé clic en el botón para confirmar tu cuenta en MOOD.</p>
    <a href="{link}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600">Verificar email</a>
  </div>
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px">Si no creaste una cuenta en MOOD, ignorá este mensaje.</p>
</body>
</html>"""
    send_email(to, "Verificá tu email — MOOD", body_html, body_text)


def send_reset_password_email(to: str, token: str):
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost")
    link = f"{frontend_url}/reset-password?token={token}"
    body_text = f"Restablecé tu contraseña: {link}"
    body_html = f"""\
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;padding:20px;max-width:600px;margin:auto">
  <div style="text-align:center;margin-bottom:24px">
    <h1 style="color:#1e293b;margin:0">MOOD</h1>
    <p style="color:#64748b">Descubrí eventos según tu estado de ánimo</p>
  </div>
  <div style="background:#f8fafc;padding:32px;border-radius:12px;text-align:center">
    <h2 style="color:#1e293b;margin:0 0 8px">Restablecé tu contraseña</h2>
    <p style="color:#475569;margin:0 0 24px">Hacé clic en el botón para crear una nueva contraseña.</p>
    <a href="{link}" style="display:inline-block;padding:14px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600">Restablecer contraseña</a>
  </div>
  <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px">Si no solicitaste este cambio, ignorá este mensaje.</p>
</body>
</html>"""
    send_email(to, "Restablecé tu contraseña — MOOD", body_html, body_text)
