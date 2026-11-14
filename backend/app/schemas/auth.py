from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["viewer", "employee", "manager", "admin"]


class UserCreate(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(default="", max_length=255)
    role: Role = "employee"
    department: str = Field(default="", max_length=64)
    clearance: int | None = Field(default=None, ge=0, le=3)


class UserUpdate(BaseModel):
    role: Role | None = None
    department: str | None = Field(default=None, max_length=64)
    clearance: int | None = Field(default=None, ge=0, le=3)
    is_active: bool | None = None


class AccessImpactRequest(BaseModel):
    role: Role
    clearance: int = Field(ge=0, le=3)
    is_active: bool = True


class AccessImpactCount(BaseModel):
    current: int
    proposed: int
    newly_granted: int
    revoked: int


class AccessImpactClassification(BaseModel):
    classification: str
    current: int
    proposed: int
    newly_granted: int
    revoked: int


class AccessImpactSample(BaseModel):
    id: str
    title: str
    classification: str
    source_type: str
    reason: str


class AccessImpactOut(BaseModel):
    current_role: Role
    current_clearance: int
    current_active: bool
    proposed_role: Role
    proposed_clearance: int
    proposed_active: bool
    totals: AccessImpactCount
    by_classification: list[AccessImpactClassification]
    newly_granted: list[AccessImpactSample]
    revoked: list[AccessImpactSample]
    sample_limit: int


class ProfileUpdate(BaseModel):
    full_name: str = Field(max_length=255)
    department: str = Field(max_length=64)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    full_name: str
    role: str
    department: str
    clearance: int
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
