from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_container, get_current_user, get_db
from app.core.errors import RateLimited
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import User
from app.schemas.auth import ProfileUpdate, Token, UserCreate, UserOut
from app.services.container import Container
from app.services.rbac import DEFAULT_CLEARANCE

router = APIRouter(prefix="/auth", tags=["auth"])

# Constant-time-ish dummy hash so unknown users cost the same as wrong passwords.
_DUMMY_HASH = hash_password("dummy-password-for-timing")


@router.post("/bootstrap", response_model=UserOut, status_code=201)
def bootstrap_admin(body: UserCreate, db: Session = Depends(get_db), container: Container = Depends(get_container)):
    """Creates the first admin. Disabled once any user exists."""
    if (db.scalar(select(func.count()).select_from(User)) or 0) > 0:
        raise HTTPException(409, "Already bootstrapped; ask an admin to create your account")
    user = User(email=body.email.lower(), full_name=body.full_name, hashed_password=hash_password(body.password, container.settings.bcrypt_rounds),
                role="admin", department=body.department, clearance=3)
    db.add(user)
    db.commit()
    return user


@router.post("/login", response_model=Token)
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db),
          container: Container = Depends(get_container)):
    s = container.settings
    ip = request.client.host if request.client else "unknown"
    attempts = container.cache.incr(f"rl:login:{ip}:{form.username.lower()}:{int(time.time() // 60)}", ttl=90)
    if attempts > s.login_rate_limit_per_minute:
        raise RateLimited("Too many login attempts. Try again in a minute.")
    user = db.scalars(select(User).where(User.email == form.username.lower())).first()
    ok = verify_password(form.password, user.hashed_password if user else _DUMMY_HASH)
    if not user or not ok or not user.is_active:
        raise HTTPException(401, "Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    token = create_access_token(user.id, s.secret_key, s.access_token_expire_minutes, {"role": user.role})
    return Token(access_token=token, expires_in=s.access_token_expire_minutes * 60)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(body: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user.full_name = body.full_name.strip()
    user.department = body.department.strip()
    db.commit()
    db.refresh(user)
    return user


@router.post("/signup", response_model=UserOut, status_code=201)
def signup(body: UserCreate, db: Session = Depends(get_db), container: Container = Depends(get_container)):
    """Public self-service user registration. New users get 'employee' role by default."""
    # Check if user already exists
    existing = db.scalars(select(User).where(User.email == body.email.lower())).first()
    if existing:
        raise HTTPException(409, "An account with this email already exists")
    
    # Force role to employee for self-signup (security: users can't make themselves admin)
    role = "employee"
    clearance = DEFAULT_CLEARANCE.get(role, 1)
    
    # Create new user
    user = User(
        email=body.email.lower(),
        full_name=body.full_name,
        hashed_password=hash_password(body.password, container.settings.bcrypt_rounds),
        role=role,
        department=body.department if body.department else "",
        clearance=clearance
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
