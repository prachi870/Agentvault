"""Ingest a folder of files (synced SharePoint/Drive export, network share, S3 mount, ...)."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

from app.core.errors import AppError
from app.services.connectors.base import RawItem
from app.services.parsers import SUPPORTED_EXTENSIONS


class DirectoryConnector:
    def __init__(self, config: dict, allowed_root: str) -> None:
        self.config = config
        self.root = Path(allowed_root).resolve()

    def _target(self) -> Path:
        rel = self.config.get("path", ".")
        target = (self.root / rel).resolve()
        if target != self.root and self.root not in target.parents:
            raise AppError("path must be inside the configured connector root", 422)
        return target

    def validate(self) -> None:
        if not self._target().is_dir():
            raise AppError("directory does not exist under the connector root", 422)

    def fetch(self) -> Iterator[RawItem]:
        target = self._target()
        pattern = "**/*" if self.config.get("recursive", True) else "*"
        for path in sorted(target.glob(pattern)):
            if not path.is_file() or path.suffix.lower() not in SUPPORTED_EXTENSIONS or path.is_symlink():
                continue
            rel = path.relative_to(self.root).as_posix()
            yield RawItem(
                external_id=rel,
                title=path.stem.replace("_", " ").replace("-", " ").strip() or path.name,
                filename=path.name,
                data=path.read_bytes(),
                source_uri=f"file://{rel}",
                updated_at=datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc),
            )
