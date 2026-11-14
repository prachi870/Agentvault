from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterator, Protocol


@dataclass
class RawItem:
    external_id: str
    title: str
    text: str | None = None
    filename: str | None = None
    data: bytes | None = None
    source_uri: str | None = None
    updated_at: datetime | None = None
    # ACL mirroring (Phase 3): when a connector can resolve source-side permissions to roles, it sets
    # these and they override the connector's static default_classification / default_allowed_roles.
    allowed_roles: list[str] | None = None
    classification: str | None = None


class Connector(Protocol):
    def validate(self) -> None: ...
    def fetch(self) -> Iterator[RawItem]: ...
