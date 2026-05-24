"""
services/notification_service.py — Notifications Telegram + Email SMTP
"""
import logging
from datetime import datetime

import httpx
import aiosmtplib
from email.mime.text import MIMEText
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from models.alerte import Alerte
from models.notification import Notification, Canal

logger   = logging.getLogger(__name__)
settings = get_settings()


class NotificationService:

    # Envoi Telegram 
    async def envoyer_telegram(self, message: str) -> bool:
        """Envoie un message via Telegram Bot API."""
        if not settings.telegram_token or not settings.telegram_chat_id:
            logger.warning("⚠️ Telegram non configuré")
            return False
        try:
            url = f"https://api.telegram.org/bot{settings.telegram_token}/sendMessage"
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(url, json={
                    "chat_id":    settings.telegram_chat_id,
                    "text":       message,
                    "parse_mode": "HTML",
                })
            ok = r.status_code == 200
            if ok:
                logger.info("✅ Telegram envoyé")
            return ok
        except Exception as e:
            logger.error(f"❌ Telegram error : {e}")
            return False

    # Envoi Email SMTP 
    async def envoyer_email(self, destinataire: str, sujet: str, corps: str) -> bool:
        """Envoie un email via SMTP async."""
        if not settings.smtp_user or not settings.smtp_password:
            logger.warning("⚠️ SMTP non configuré")
            return False
        try:
            msg = MIMEText(corps, "html", "utf-8")
            msg["Subject"] = sujet
            msg["From"]    = settings.smtp_user
            msg["To"]      = destinataire

            await aiosmtplib.send(
                msg,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_user,
                password=settings.smtp_password,
                start_tls=True,
            )
            logger.info(f"✅ Email envoyé à {destinataire}")
            return True
        except Exception as e:
            logger.error(f"❌ SMTP error : {e}")
            return False

    # Formatage du message 
    def _formater_message(self, alerte: Alerte) -> str:
        emoji = "🔴" if alerte.niveau.value == "CRITIQUE" else "🟡"
        return (
            f"{emoji} <b>Alerte {alerte.niveau.value}</b>\n"
            f"📍 {alerte.message}\n"
            f"🕐 {alerte.timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"📊 CPU: {alerte.valeur_cpu:.1f}% | RAM: {alerte.valeur_ram:.1f}%"
        )

    # Pipeline principal
    async def envoyer(self, db: AsyncSession, alerte: Alerte):
        """
        Envoie les notifications Telegram + Email et enregistre en DB.
        BF06 : délai < 30 secondes après détection.
        """
        message = self._formater_message(alerte)

        # Telegram 
        ok_telegram = await self.envoyer_telegram(message)
        notif_telegram = Notification(
            alerte_id=alerte.id,
            canal=Canal.TELEGRAM,
            destinataire=settings.telegram_chat_id or "non configuré",
            contenu=message,
            envoye=ok_telegram,
            envoye_le=datetime.utcnow() if ok_telegram else None,
            erreur=None if ok_telegram else "Envoi échoué",
        )
        db.add(notif_telegram)

        # Email
        if settings.smtp_user:
            sujet = f"[Supervision] Alerte {alerte.niveau.value} — Équipement #{alerte.equipement_id}"
            ok_email = await self.envoyer_email(settings.smtp_user, sujet, message)
            notif_email = Notification(
                alerte_id=alerte.id,
                canal=Canal.EMAIL,
                destinataire=settings.smtp_user,
                contenu=message,
                envoye=ok_email,
                envoye_le=datetime.utcnow() if ok_email else None,
                erreur=None if ok_email else "Envoi échoué",
            )
            db.add(notif_email)

        await db.flush()
        logger.info(f"✅ Notifications envoyées pour alerte #{alerte.id}")