//! Transactional email (`services/identity/emailer.py`): verification, password
//! reset and calendar invitations. Without `SMTP_HOST` the message, link
//! included, is logged at WARN so flows can be tested without a provider.

use lettre::{
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
    message::{Attachment, MultiPart, SinglePart, header::ContentType},
    transport::smtp::authentication::Credentials,
};

use crate::{Accounts, accounts::EmailLink, events::Invite};

fn escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}

fn wrap(heading: &str, intro: &str, cta: &str, link: &str, footer: &str) -> String {
    format!(
        "<div style=\"font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a\">\n  \
         <h2 style=\"margin:0 0 12px\">{heading}</h2>\n  \
         <p style=\"margin:0 0 20px;line-height:1.5;color:#444\">{intro}</p>\n  \
         <a href=\"{link}\" style=\"display:inline-block;background:#b91c1c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600\">{cta}</a>\n  \
         <p style=\"margin:24px 0 0;font-size:13px;color:#888\">{footer}</p>\n  \
         <p style=\"margin:8px 0 0;font-size:12px;color:#aaa;word-break:break-all\">Or paste this link: {link}</p>\n</div>"
    )
}

impl Accounts {
    async fn send(
        &self,
        to: &str,
        subject: &str,
        text: &str,
        html: &str,
        ics: Option<(&str, &str)>,
    ) {
        let Some(smtp) = self.config.smtp.clone() else {
            tracing::warn!("[email disabled] To: {to} | Subject: {subject}\n{text}");
            return;
        };
        let from = format!("{} <{}>", smtp.from_name, smtp.from_addr);
        let mut builder = Message::builder().subject(subject);
        let (Ok(f), Ok(t)) = (from.parse(), to.parse()) else {
            tracing::error!("Failed to send email to {to}: bad address");
            return;
        };
        builder = builder.from(f).to(t);
        if let Some(reply) = smtp.reply_to.as_deref().and_then(|r| r.parse().ok()) {
            builder = builder.reply_to(reply);
        }
        let mut alternative = MultiPart::alternative()
            .singlepart(SinglePart::plain(text.to_owned()))
            .singlepart(SinglePart::html(html.to_owned()));
        let body = if let Some((ics, method)) = ics {
            let calendar =
                ContentType::parse(&format!("text/calendar; method={method}; charset=UTF-8"))
                    .unwrap_or(ContentType::TEXT_PLAIN);
            alternative = alternative.singlepart(
                SinglePart::builder()
                    .header(calendar.clone())
                    .body(ics.to_owned()),
            );
            MultiPart::mixed()
                .multipart(alternative)
                .singlepart(Attachment::new("invite.ics".to_owned()).body(ics.to_owned(), calendar))
        } else {
            alternative
        };
        let Ok(message) = builder.multipart(body) else {
            tracing::error!("Failed to send email to {to}: could not build message");
            return;
        };
        let transport = if smtp.use_tls {
            AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&smtp.host)
        } else {
            Ok(AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(
                &smtp.host,
            ))
        };
        let Ok(mut transport) = transport.map(|t| {
            t.port(smtp.port)
                .timeout(Some(std::time::Duration::from_secs(20)))
        }) else {
            tracing::error!("Failed to send email to {to}: bad SMTP host");
            return;
        };
        if !smtp.user.is_empty() {
            transport =
                transport.credentials(Credentials::new(smtp.user.clone(), smtp.password.clone()));
        }
        match transport.build().send(message).await {
            Ok(_) => tracing::info!("Sent '{subject}' email to {to}"),
            Err(e) => tracing::error!(error = %e, "Failed to send email to {to}"),
        }
    }

    /// The verification email.
    pub async fn send_verification_email(&self, link: &EmailLink) {
        let url = format!(
            "{}/verify-email?token={}",
            self.config.frontend_url, link.token
        );
        let text = format!(
            "Welcome to Vedic Patro!\n\nPlease verify your email by opening this link:\n{url}\n\n\
             This link expires in 24 hours. If you didn't sign up, ignore this email."
        );
        let html = wrap(
            "Verify your email",
            "Welcome to Vedic Patro! Confirm your email address to finish setting up your account.",
            "Verify email",
            &url,
            "This link expires in 24 hours.",
        );
        self.send(
            &link.to,
            "Verify your Vedic Patro account",
            &text,
            &html,
            None,
        )
        .await;
    }

    /// The password-reset email.
    pub async fn send_password_reset_email(&self, link: &EmailLink) {
        let url = format!(
            "{}/reset-password?token={}",
            self.config.frontend_url, link.token
        );
        let text = format!(
            "We received a request to reset your password.\n\nReset it here:\n{url}\n\n\
             This link expires in 1 hour. If you didn't request this, ignore this email."
        );
        let html = wrap(
            "Reset your password",
            "We received a request to reset your password. Click below to choose a new one.",
            "Reset password",
            &url,
            "This link expires in 1 hour. If you didn't request this, you can ignore this email.",
        );
        self.send(
            &link.to,
            "Reset your Vedic Patro password",
            &text,
            &html,
            None,
        )
        .await;
    }

    /// A calendar invitation (or its cancellation).
    pub async fn send_event_invite(&self, invite: &Invite) {
        let (method, word) = if invite.cancelled {
            ("CANCEL", "Cancelled")
        } else {
            ("REQUEST", "Invitation")
        };
        let subject = format!("{word}: {}", invite.title);
        let intro = if invite.cancelled {
            format!("{} cancelled \"{}\".", invite.organizer_name, invite.title)
        } else {
            format!(
                "{} invited you to \"{}\". Add it to your calendar from this email.",
                invite.organizer_name, invite.title
            )
        };
        let text = format!("{intro}\n\nSent from Vedic Patro.");
        let html = format!(
            "<div style=\"font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a\">\n  \
             <h2 style=\"margin:0 0 12px\">{}</h2>\n  \
             <p style=\"margin:0 0 20px;line-height:1.5;color:#444\">{}</p>\n  \
             <p style=\"margin:24px 0 0;font-size:13px;color:#888\">Sent from Vedic Patro.</p>\n</div>",
            escape(&invite.title),
            escape(&intro)
        );
        self.send(
            &invite.to,
            &subject,
            &text,
            &html,
            Some((&invite.ics, method)),
        )
        .await;
    }
}
