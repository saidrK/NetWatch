"""
services/notification_service.py — Notifications asynchrones & robustes (BLOC 2)
Fonctionnalités :
  - Déduplication
  - Escalade intelligente : CRITIQUE → Telegram + Email + Webhook
  - Fallback & Timeout strict de 5 secondes sur les appels externes
  - Enregistrement immédiat du statut en BDD
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
import aiosmtplib
from email.mime.text import MIMEText
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from models.alerte import Alerte
from models.notification import Notification, Canal
from database.postgresql import AsyncSessionLocal

logger   = logging.getLogger(__name__)
settings = get_settings()

_dedup_cache: dict[str, datetime] = {}
DEDUP_WINDOW_MINUTES = 30
EXTERNAL_TIMEOUT = 5.0  # Timeout strict de 5 secondes


class NotificationService:

    def _is_duplicate(self, alerte: Alerte) -> bool:
        key = f"{alerte.equipement_id}_{alerte.niveau.value}"
        last_sent = _dedup_cache.get(key)
        if last_sent and (datetime.utcnow() - last_sent) < timedelta(minutes=DEDUP_WINDOW_MINUTES):
            return True
        return False

    def _mark_sent(self, alerte: Alerte):
        key = f"{alerte.equipement_id}_{alerte.niveau.value}"
        _dedup_cache[key] = datetime.utcnow()

    async def envoyer_telegram(self, message: str) -> (bool, Optional[str]):
        """Envoie un message via Telegram Bot API avec timeout strict."""
        if not settings.telegram_token or not settings.telegram_chat_id:
            return False, "Telegram non configuré"
        try:
            url = f"https://api.telegram.org/bot{settings.telegram_token}/sendMessage"
            async with httpx.AsyncClient(timeout=EXTERNAL_TIMEOUT) as client:
                r = await client.post(url, json={
                    "chat_id":    settings.telegram_chat_id,
                    "text":       message,
                    "parse_mode": "HTML",
                })
                r.raise_for_status()
            logger.info("✅ Telegram envoyé")
            return True, None
        except httpx.TimeoutException:
            logger.error("❌ Telegram error : Timeout")
            return False, "Timeout Telegram API"
        except Exception as e:
            logger.error(f"❌ Telegram error : {e}")
            return False, str(e)

    async def envoyer_email(self, destinataire: str, sujet: str, corps: str) -> (bool, Optional[str]):
        """Envoie un email via SMTP async avec timeout strict."""
        if not settings.smtp_user or not settings.smtp_password:
            return False, "SMTP non configuré"
        try:
            msg = MIMEText(corps, "html", "utf-8")
            msg["Subject"] = sujet
            msg["From"]    = settings.smtp_user
            msg["To"]      = destinataire

            await asyncio.wait_for(
                aiosmtplib.send(
                    msg,
                    hostname=settings.smtp_host,
                    port=settings.smtp_port,
                    username=settings.smtp_user,
                    password=settings.smtp_password,
                    start_tls=True,
                ),
                timeout=EXTERNAL_TIMEOUT
            )
            logger.info(f"✅ Email envoyé à {destinataire}")
            return True, None
        except asyncio.TimeoutError:
            logger.error("❌ SMTP error : Timeout")
            return False, "Timeout serveur SMTP"
        except Exception as e:
            logger.error(f"❌ SMTP error : {e}")
            return False, str(e)

    async def envoyer_webhook(self, webhook_url: str, alerte: Alerte) -> (bool, Optional[str]):
        """Envoie via Webhook avec timeout strict."""
        if not webhook_url:
            return False, "Webhook non configuré"
        try:
            emoji = "🔴" if alerte.niveau.value == "CRITIQUE" else "🟡"
            payload = {
                "text": f"{emoji} *ALERTE {alerte.niveau.value}* — Équipement #{alerte.equipement_id}",
                "attachments": [
                    {
                        "color": "#FF4E00" if alerte.niveau.value == "CRITIQUE" else "#FFD700",
                        "fields": [
                            {"title": "Message", "value": alerte.message, "short": False},
                            {"title": "Timestamp", "value": str(alerte.timestamp), "short": True},
                        ]
                    }
                ]
            }
            async with httpx.AsyncClient(timeout=EXTERNAL_TIMEOUT) as client:
                r = await client.post(webhook_url, json=payload)
                r.raise_for_status()
            logger.info(f"✅ Webhook envoyé vers {webhook_url[:40]}...")
            return True, None
        except httpx.TimeoutException:
            logger.error("❌ Webhook error : Timeout")
            return False, "Timeout Webhook"
        except Exception as e:
            logger.error(f"❌ Webhook error : {e}")
            return False, str(e)

    def _formater_message(self, alerte: Alerte) -> str:
        emoji = "🔴" if alerte.niveau.value == "CRITIQUE" else "🟡"
        cpu = alerte.valeur_cpu if alerte.valeur_cpu else 0.0
        ram = alerte.valeur_ram if alerte.valeur_ram else 0.0
        return (
            f"{emoji} <b>Alerte {alerte.niveau.value}</b>\n"
            f"📍 {alerte.message}\n"
            f"🕐 {alerte.timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"📊 CPU: {cpu:.1f}% | RAM: {ram:.1f}%"
        )

    async def _enregistrer_notification(self, alerte_id: int, canal: Canal, dest: str, contenu: str, success: bool, erreur: str):
        """Fonction utilitaire pour écrire en BDD via une session courte (évite les locks prolongés)."""
        try:
            async with AsyncSessionLocal() as db:
                notif = Notification(
                    alerte_id=alerte_id,
                    canal=canal,
                    destinataire=dest,
                    contenu=contenu,
                    envoye=success,
                    envoye_le=datetime.utcnow() if success else None,
                    erreur=erreur if not success else None,
                )
                db.add(notif)
                await db.commit()
        except Exception as e:
            logger.warning(f"⚠️ Notification non sauvegardée en DB (alerte_id={alerte_id}): {e}")

    async def envoyer_tache_fond(self, alerte: Alerte):
        """
        Méthode conçue pour être appelée via fastapi.BackgroundTasks.
        Gère l'escalade, le fallback et écrit dans la DB de manière atomique.
        """
        if self._is_duplicate(alerte):
            return

        message = self._formater_message(alerte)
        niveau = alerte.niveau.value

        if niveau == "INFO":
            logger.info(f"ℹ️ Alerte INFO #{alerte.id} — notification log uniquement")
            self._mark_sent(alerte)
            return

        # 1. Telegram (WARNING & CRITIQUE)
        dest_tg = settings.telegram_chat_id or "N/A"
        ok_tg, err_tg = await self.envoyer_telegram(message)
        await self._enregistrer_notification(alerte.id, Canal.TELEGRAM, dest_tg, message, ok_tg, err_tg)

        # 2. Escalade CRITIQUE : Email + Webhook
        if niveau == "CRITIQUE":
            if settings.smtp_user:
                sujet = f"🔴 [CRITIQUE] Alerte #{alerte.id} — Équipement #{alerte.equipement_id}"
                cpu = alerte.valeur_cpu if alerte.valeur_cpu else 0.0
                ram = alerte.valeur_ram if alerte.valeur_ram else 0.0
                corps_html = f"""
                <html><body style="font-family: monospace; background: #111; color: #E0E0E0; padding: 20px;">
                <h2 style="color: #FF4E00;">🔴 ALERTE CRITIQUE DÉTECTÉE</h2>
                <p><strong>Message:</strong> {alerte.message}</p>
                <p><strong>Équipement ID:</strong> {alerte.equipement_id}</p>
                <p><strong>Timestamp:</strong> {alerte.timestamp}</p>
                <p><strong>CPU:</strong> {cpu:.1f}% | <strong>RAM:</strong> {ram:.1f}%</p>
                <hr style="border-color: #333;"/>
                <p style="color: #555; font-size: 10px;">Plateforme Supervision Réseau — FSBM Hassan II</p>
                </body></html>
                """
                ok_em, err_em = await self.envoyer_email(settings.smtp_user, sujet, corps_html)
                await self._enregistrer_notification(alerte.id, Canal.EMAIL, settings.smtp_user, sujet, ok_em, err_em)

            webhook_url: Optional[str] = getattr(settings, 'webhook_url', None)
            if webhook_url:
                ok_wh, err_wh = await self.envoyer_webhook(webhook_url, alerte)
                # Enregistrement Webhook (si vous avez un Canal.WEBHOOK, sinon omis ici)
                
        self._mark_sent(alerte)