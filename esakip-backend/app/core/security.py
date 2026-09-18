"""
Enterprise Security: authentication + RBAC.

Design:
- Every authenticated request resolves to a `Principal` (user id + roles + allowed
  source scopes).
- RBAC is enforced in two places, deliberately redundant:
    1. Retrieval-time: the retriever only queries sources/collections the
       principal's roles permit (app/services/retriever.py).
    2. Response-time: any chunk that slips through without a matching
       permission tag is dropped before it reaches context building.
- This module currently ships a static role table for development. Swap
  `get_principal_roles` for a real identity provider (SSO/OIDC/LDAP) call
  without touching the rest of the pipeline.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import get_settings

security_scheme = HTTPBearer(auto_error=False)


class Principal(BaseModel):
    user_id: str
    roles: list[str] = []
    allowed_sources: list[str] = []  # e.g. ["confluence:eng-space", "sharepoint:hr"]


# TODO: replace with a real identity/roles lookup (DB table or IdP claims).
_DEV_USER_TABLE = {
    "dev-user": Principal(
        user_id="dev-user",
        roles=["employee"],
        allowed_sources=["local_files"],
    ),
    "dev-admin": Principal(
        user_id="dev-admin",
        roles=["admin"],
        allowed_sources=["*"],
    ),
}


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def _decode_token(token: str) -> str:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_id
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


async def get_current_principal(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> Principal:
    settings = get_settings()

    if settings.app_env == "development" and credentials is None:
        # Dev convenience only — never falls through in production.
        return _DEV_USER_TABLE["dev-user"]

    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")

    user_id = _decode_token(credentials.credentials)
    principal = _DEV_USER_TABLE.get(user_id)
    if principal is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unknown principal")
    return principal


def require_role(*allowed_roles: str):
    def _checker(principal: Principal = Depends(get_current_principal)) -> Principal:
        if not set(principal.roles) & set(allowed_roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return principal

    return _checker


def filter_sources_by_permission(principal: Principal, requested_sources: list[str]) -> list[str]:
    """Intersect what the agent wants to query with what this principal may see."""
    if "*" in principal.allowed_sources:
        return requested_sources
    return [s for s in requested_sources if s in principal.allowed_sources]
