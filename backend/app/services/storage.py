"""Object storage for original uploaded files: S3 in production, local disk in dev."""
from __future__ import annotations

import re
from pathlib import Path
from typing import Protocol


def safe_filename(name: str) -> str:
    name = Path(name).name or "file"
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)[:200]


class Storage(Protocol):
    backend: str

    def put(self, key: str, data: bytes) -> None: ...
    def get(self, key: str) -> bytes: ...
    def delete(self, key: str) -> None: ...
    def ping(self) -> bool: ...


class LocalStorage:
    backend = "local"

    def __init__(self, root: str) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root not in path.parents:
            raise ValueError("invalid storage key")
        return path

    def put(self, key: str, data: bytes) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def get(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)

    def ping(self) -> bool:
        return self.root.exists()


class S3Storage:
    backend = "s3"

    def __init__(self, bucket: str, region: str, endpoint_url: str | None = None) -> None:
        import boto3

        self.bucket = bucket
        self._sse = endpoint_url is None  # plain MinIO/localstack usually has no KMS configured
        self._s3 = boto3.client("s3", region_name=region, endpoint_url=endpoint_url)

    def put(self, key: str, data: bytes) -> None:
        extra = {"ServerSideEncryption": "AES256"} if self._sse else {}
        self._s3.put_object(Bucket=self.bucket, Key=key, Body=data, **extra)

    def get(self, key: str) -> bytes:
        return self._s3.get_object(Bucket=self.bucket, Key=key)["Body"].read()

    def delete(self, key: str) -> None:
        self._s3.delete_object(Bucket=self.bucket, Key=key)

    def ping(self) -> bool:
        try:
            self._s3.head_bucket(Bucket=self.bucket)
            return True
        except Exception:
            return False
