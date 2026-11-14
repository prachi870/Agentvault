"""Index rows from a SQL database (read-only SELECT) as searchable documents."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from app.core.errors import AppError
from app.services.connectors.base import RawItem

_FORBIDDEN = re.compile(
    r"\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|attach|pragma|copy|exec|execute|call|merge|into)\b", re.I
)
MAX_ROWS = 5000


def redact_config(config: dict) -> dict:
    out = dict(config)
    if out.get("url"):
        try:
            out["url"] = make_url(out["url"]).render_as_string(hide_password=True)
        except Exception:
            out["url"] = "***"
    return out


class SQLConnector:
    def __init__(self, config: dict) -> None:
        self.config = config

    def validate(self) -> None:
        for key in ("url", "query", "id_column", "text_columns"):
            if not self.config.get(key):
                raise AppError(f"config.{key} is required for sql connectors", 422)
        query = self.config["query"].strip().rstrip(";")
        if not re.match(r"^\s*select\b", query, re.I) or ";" in query or _FORBIDDEN.search(query):
            raise AppError("query must be a single read-only SELECT statement", 422)

    def fetch(self) -> Iterator[RawItem]:
        url = make_url(self.config["url"])
        engine = create_engine(url)
        id_col = self.config["id_column"]
        title_col = self.config.get("title_column")
        text_cols: list[str] = self.config["text_columns"]
        upd_col = self.config.get("updated_at_column")
        table = self.config.get("table_label", "record")
        try:
            with engine.connect() as conn:
                if url.get_backend_name() == "postgresql":
                    conn.execute(text("SET TRANSACTION READ ONLY"))
                result = conn.execute(text(self.config["query"].strip().rstrip(";")))
                for i, row in enumerate(result.mappings()):
                    if i >= MAX_ROWS:
                        break
                    r = dict(row)
                    body = "\n".join(f"{c}: {r[c]}" for c in text_cols if r.get(c) not in (None, ""))
                    if not body:
                        continue
                    updated = r.get(upd_col) if upd_col else None
                    if isinstance(updated, str):
                        try:
                            updated = datetime.fromisoformat(updated)
                        except ValueError:
                            updated = None
                    if isinstance(updated, datetime) and updated.tzinfo is None:
                        updated = updated.replace(tzinfo=timezone.utc)
                    yield RawItem(
                        external_id=str(r[id_col]),
                        title=str(r.get(title_col) or f"{table} {r[id_col]}") if title_col else f"{table} {r[id_col]}",
                        text=body,
                        source_uri=f"sql://{url.host or url.database}/{table}/{r[id_col]}",
                        updated_at=updated if isinstance(updated, datetime) else None,
                    )
        finally:
            engine.dispose()
