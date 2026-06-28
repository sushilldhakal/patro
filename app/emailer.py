"""Transactional email (verification + password reset).

If SMTP is not configured, the message (including the action link) is logged at
WARNING level so flows can be tested in development without an email provider.
"""

from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app import config

logger = logging.getLogger(__name__)


def _send(to_addr: str, subject: str, text_body: str, html_body: str) -> None:
    smtp = config.smtp_config()
    if smtp is None:
        logger.warning(
            "[email disabled] To: %s | Subject: %s\n%s", to_addr, subject, text_body
        )
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{smtp['from_name']} <{smtp['from_addr']}>"
    msg["To"] = to_addr
    if smtp.get("reply_to"):
        msg["Reply-To"] = str(smtp["reply_to"])
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(str(smtp["host"]), int(smtp["port"]), timeout=20) as server:
            if smtp["use_tls"]:
                server.starttls()
            if smtp["user"]:
                server.login(str(smtp["user"]), str(smtp["password"]))
            server.send_message(msg)
        logger.info("Sent '%s' email to %s", subject, to_addr)
    except Exception:  # pragma: no cover - logged, never crashes the request
        logger.exception("Failed to send email to %s", to_addr)


def send_verification_email(to_addr: str, token: str) -> None:
    link = f"{config.frontend_url()}/verify-email?token={token}"
    subject = "Verify your Vedic Patro account"
    text = (
        "Welcome to Vedic Patro!\n\n"
        f"Please verify your email by opening this link:\n{link}\n\n"
        "This link expires in 24 hours. If you didn't sign up, ignore this email."
    )
    html = _wrap(
        "Verify your email",
        "Welcome to Vedic Patro! Confirm your email address to finish setting up your account.",
        "Verify email",
        link,
        "This link expires in 24 hours.",
    )
    _send(to_addr, subject, text, html)


def send_password_reset_email(to_addr: str, token: str) -> None:
    link = f"{config.frontend_url()}/reset-password?token={token}"
    subject = "Reset your Vedic Patro password"
    text = (
        "We received a request to reset your password.\n\n"
        f"Reset it here:\n{link}\n\n"
        "This link expires in 1 hour. If you didn't request this, ignore this email."
    )
    html = _wrap(
        "Reset your password",
        "We received a request to reset your password. Click below to choose a new one.",
        "Reset password",
        link,
        "This link expires in 1 hour. If you didn't request this, you can ignore this email.",
    )
    _send(to_addr, subject, text, html)


def _wrap(heading: str, intro: str, cta: str, link: str, footer: str) -> str:
    return f"""\
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin:0 0 12px">{heading}</h2>
  <p style="margin:0 0 20px;line-height:1.5;color:#444">{intro}</p>
  <a href="{link}" style="display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">{cta}</a>
  <p style="margin:24px 0 0;font-size:13px;color:#888">{footer}</p>
  <p style="margin:8px 0 0;font-size:12px;color:#aaa;word-break:break-all">Or paste this link: {link}</p>
</div>"""
