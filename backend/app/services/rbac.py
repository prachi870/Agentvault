"""Role + clearance based access control, enforced both in Qdrant filters and again in Python.

Phase 4: multi-tenant isolation — Principal now carries a tenant_id, and tenant-scoped checks
ensure users can only access resources in their own tenant. Setting MULTI_TENANT_ENABLED=true
activates this; when disabled (default) everything works as before (single-tenant).
"""
from __future__ import annotations

from dataclasses import dataclass

ROLES = ("viewer", "employee", "manager", "admin")
CLASSIFICATION_LEVEL = {"public": 0, "internal": 1, "confidential": 2, "restricted": 3}
SOURCE_TYPES = ("upload", "pdf", "sharepoint", "confluence", "jira", "notion", "sql", "email", "drive")

_DEFAULT_ROLES = {
    "public": ["*"],
    "internal": ["employee", "manager", "admin"],
    "confidential": ["manager", "admin"],
    "restricted": ["admin"],
}
DEFAULT_CLEARANCE = {"viewer": 0, "employee": 1, "manager": 2, "admin": 3}


@dataclass(frozen=True)
class Principal:
    user_id: str
    email: str
    role: str
    department: str
    clearance: int
    tenant_id: str | None = None  # Phase 4: multi-tenant isolation

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def default_allowed_roles(classification: str) -> list[str]:
    return list(_DEFAULT_ROLES[classification])


def clearance_level(classification: str) -> int:
    return CLASSIFICATION_LEVEL[classification]


def can_access(principal: Principal, allowed_roles: list[str], level: int) -> bool:
    if principal.is_admin:
        return True
    if level > principal.clearance:
        return False
    return "*" in allowed_roles or principal.role in allowed_roles


def can_ingest_at(principal: Principal, classification: str) -> bool:
    """Managers may only publish at or below their own clearance."""
    if principal.is_admin:
        return True
    return principal.role == "manager" and clearance_level(classification) <= principal.clearance


def same_tenant(principal: Principal, resource_tenant_id: str | None) -> bool:
    """Phase 4: check that a principal belongs to the same tenant as a resource.
    Returns True when multi-tenancy is not active (both tenant_ids are None)."""
    if principal.tenant_id is None and resource_tenant_id is None:
        return True  # single-tenant mode
    return principal.tenant_id == resource_tenant_id


def tenant_filter(principal: Principal) -> dict[str, str | None]:
    """Returns a dict suitable for adding to a SQLAlchemy .where() for tenant scoping.
    When tenant_id is None (single-tenant), returns empty dict (no filter)."""
    if principal.tenant_id is None:
        return {}
    return {"tenant_id": principal.tenant_id}
