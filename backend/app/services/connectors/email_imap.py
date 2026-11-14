"""Email connector via IMAP (works for Gmail/M365/any IMAP mailbox with an app password).

Required config: host, username, password, folder (default "INBOX"), optional since_days to limit scope.
No ACL mirroring: a mailbox is inherently single-owner, so `default_classification` /
`default_allowed_roles` on the connector are the access control (e.g. restrict a shared inbox's
connector to the relevant team).
"""
from __future__ import annotations

import email
import imaplib
from datetime import datetime, timedelta, timezone
from email.header import decode_header
from email.utils import parsedate_to_datetime
from typing import Iterator

from app.core.errors import AppError
from app.services.connectors.base import RawItem

MAX_MESSAGES = 2000


class EmailIMAPConnector:
    def __init__(self, config: dict) -> None:
        self.config = config

    def _connect(self) -> imaplib.IMAP4_SSL:
        c = self.config
        conn = imaplib.IMAP4_SSL(c["host"], c.get("port", 993))
        conn.login(c["username"], c["password"])
        return conn

    def validate(self) -> None:
        for key in ("host", "username", "password"):
            if not self.config.get(key):
                raise AppError(f"config.{key} is required for email connectors", 422)
        try:
            conn = self._connect()
            conn.select(self.config.get("folder", "INBOX"), readonly=True)
            conn.logout()
        except (imaplib.IMAP4.error, OSError) as exc:
            raise AppError(f"could not connect to IMAP: {exc}", 422) from exc

    def fetch(self) -> Iterator[RawItem]:
        conn = self._connect()
        try:
            conn.select(self.config.get("folder", "INBOX"), readonly=True)
            criteria = "ALL"
            if self.config.get("since_days"):
                since = (datetime.now(timezone.utc) - timedelta(days=int(self.config["since_days"]))).strftime("%d-%b-%Y")
                criteria = f'(SINCE "{since}")'
            status, data = conn.search(None, criteria)
            if status != "OK":
                return
            ids = data[0].split()[-MAX_MESSAGES:]
            for msg_id in ids:
                status, msg_data = conn.fetch(msg_id, "(RFC822)")
                if status != "OK" or not msg_data or not msg_data[0]:
                    continue
                raw = msg_data[0][1]
                msg = email.message_from_bytes(raw)
                item = _to_item(msg_id.decode(), msg)
                if item:
                    yield item
        finally:
            conn.logout()


def _decode(value: str | None) -> str:
    if not value:
        return ""
    parts = decode_header(value)
    return "".join(p.decode(enc or "utf-8", errors="replace") if isinstance(p, bytes) else p for p, enc in parts)


def _body_text(msg: email.message.Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and "attachment" not in str(part.get("Content-Disposition", "")):
                try:
                    return part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", errors="replace")
                except Exception:
                    continue
        return ""
    try:
        return msg.get_payload(decode=True).decode(msg.get_content_charset() or "utf-8", errors="replace")
    except Exception:
        return ""


def _to_item(msg_id: str, msg: email.message.Message) -> RawItem | None:
    subject = _decode(msg.get("Subject"))
    body = _body_text(msg).strip()
    if not body and not subject:
        return None
    frm = _decode(msg.get("From"))
    text = f"From: {frm}\nSubject: {subject}\n\n{body}"
    try:
        updated = parsedate_to_datetime(msg.get("Date"))
        if updated and updated.tzinfo is None:
            updated = updated.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        updated = None
    return RawItem(
        external_id=msg.get("Message-ID", msg_id) or msg_id,
        title=subject or "(no subject)",
        text=text,
        source_uri=None,
        updated_at=updated,
    )
