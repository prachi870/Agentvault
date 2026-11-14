from __future__ import annotations

from typing import Callable, Iterator

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.errors import RateLimited
from app.core.security import decode_access_token
from app.db.models import User
from app.services.container import Container
from app.services.rbac import Principal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_container(request: Request) -> Container:
    return request.app.state.container


def get_db(container: Container = Depends(get_container)) -> Iterator[Session]:
    db = container.session_factory()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db), container: Container = Depends(get_container)
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
    try:
        claims = decode_access_token(token, container.settings.secret_key)
    except jwt.PyJWTError:
        raise unauthorized
    user = db.get(User, claims.get("sub"))
    if not user or not user.is_active:
        raise unauthorized
    return user


def to_principal(user: User) -> Principal:
    return Principal(user_id=user.id, email=user.email, role=user.role, department=user.department, clearance=user.clearance)


def get_principal(user: User = Depends(get_current_user)) -> Principal:
    return to_principal(user)


def require_roles(*roles: str) -> Callable[[User], User]:
    def dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role for this action")
        return user

    return dep


def rate_limit_query(user: User = Depends(get_current_user), container: Container = Depends(get_container)) -> None:
    import time

    window = int(time.time() // 60)
    count = container.cache.incr(f"rl:query:{user.id}:{window}", ttl=90)
    if count > container.settings.rate_limit_per_minute:
        raise RateLimited("Rate limit exceeded. Try again in a minute.")
