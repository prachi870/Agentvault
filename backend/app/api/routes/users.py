from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_container, get_db, require_roles
from app.core.security import hash_password
from app.db.models import Document, User
from app.schemas.auth import AccessImpactOut, AccessImpactRequest, UserCreate, UserOut, UserUpdate
from app.services.container import Container
from app.services.rbac import CLASSIFICATION_LEVEL, DEFAULT_CLEARANCE, Principal, can_access, clearance_level

router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_roles("admin"))])
_IMPACT_SAMPLE_LIMIT = 5


def _access_reason(document: Document, role: str, clearance: int, is_active: bool) -> str:
    if not is_active:
        return "Account is disabled"
    if role == "admin":
        return "Admin role bypasses document role and clearance gates"
    if clearance_level(document.classification) > clearance:
        return f"{document.classification.title()} exceeds clearance level {clearance}"
    if "*" not in document.allowed_roles and role not in document.allowed_roles:
        return f"Document ACL does not include the {role} role"
    return "Role and clearance allow access"


def _has_access(document: Document, role: str, clearance: int, is_active: bool) -> bool:
    if not is_active:
        return False
    return can_access(
        Principal(user_id="access-simulation", email="", role=role, department="", clearance=clearance),
        document.allowed_roles,
        clearance_level(document.classification),
    )


@router.post("", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, db: Session = Depends(get_db), container: Container = Depends(get_container)):
    if db.scalars(select(User).where(User.email == body.email.lower())).first():
        raise HTTPException(409, "A user with this email already exists")
    user = User(
        email=body.email.lower(), full_name=body.full_name, hashed_password=hash_password(body.password, container.settings.bcrypt_rounds), role=body.role,
        department=body.department, clearance=body.clearance if body.clearance is not None else DEFAULT_CLEARANCE[body.role],
    )
    db.add(user)
    db.commit()
    return user


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.created_at)).all()


@router.post("/{user_id}/access-impact", response_model=AccessImpactOut)
def simulate_access_impact(
    user_id: str,
    body: AccessImpactRequest,
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "User not found")

    documents_query = select(Document).order_by(Document.title, Document.id)
    if container.settings.multi_tenant_enabled:
        documents_query = documents_query.where(Document.tenant_id == target.tenant_id)
    documents = db.scalars(documents_query).all()

    classes = {name: {"current": 0, "proposed": 0, "newly_granted": 0, "revoked": 0}
               for name in CLASSIFICATION_LEVEL}
    newly_granted: list[dict] = []
    revoked: list[dict] = []
    totals = {"current": 0, "proposed": 0, "newly_granted": 0, "revoked": 0}

    for document in documents:
        classification = document.classification
        was_visible = _has_access(document, target.role, target.clearance, target.is_active)
        will_be_visible = _has_access(document, body.role, body.clearance, body.is_active)
        if was_visible:
            totals["current"] += 1
            classes[classification]["current"] += 1
        if will_be_visible:
            totals["proposed"] += 1
            classes[classification]["proposed"] += 1
        if not was_visible and will_be_visible:
            totals["newly_granted"] += 1
            classes[classification]["newly_granted"] += 1
            newly_granted.append({
                "id": document.id,
                "title": document.title,
                "classification": classification,
                "source_type": document.source_type,
                "reason": _access_reason(document, body.role, body.clearance, body.is_active),
            })
        elif was_visible and not will_be_visible:
            totals["revoked"] += 1
            classes[classification]["revoked"] += 1
            revoked.append({
                "id": document.id,
                "title": document.title,
                "classification": classification,
                "source_type": document.source_type,
                "reason": _access_reason(document, body.role, body.clearance, body.is_active),
            })

    return {
        "current_role": target.role,
        "current_clearance": target.clearance,
        "current_active": target.is_active,
        "proposed_role": body.role,
        "proposed_clearance": body.clearance,
        "proposed_active": body.is_active,
        "totals": totals,
        "by_classification": [
            {"classification": name, **counts} for name, counts in classes.items()
        ],
        "newly_granted": newly_granted[:_IMPACT_SAMPLE_LIMIT],
        "revoked": revoked[:_IMPACT_SAMPLE_LIMIT],
        "sample_limit": _IMPACT_SAMPLE_LIMIT,
    }


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    body: UserUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles("admin")),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    updates = body.model_dump(exclude_unset=True)
    if user.is_active and user.role == "admin":
        active_admins = db.scalar(
            select(func.count()).select_from(User).where(User.role == "admin", User.is_active.is_(True))
        )
        if active_admins <= 1 and (updates.get("role", user.role) != "admin" or not updates.get("is_active", user.is_active)):
            raise HTTPException(409, "At least one active administrator must remain")
    if user.id == actor.id and (
        updates.get("role", user.role) != user.role or not updates.get("is_active", user.is_active)
    ):
        raise HTTPException(409, "You cannot change your own role or deactivate your own account")
    for field, value in updates.items():
        setattr(user, field, value)
    db.commit()
    return user
