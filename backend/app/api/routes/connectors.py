from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_container, get_db, require_roles
from app.core.errors import AppError
from app.db.models import Connector, Document
from app.schemas.connectors import ConnectorCreate, ConnectorOut
from app.services.connectors.registry import build_connector, sync_connector
from app.services.connectors.sql import redact_config
from app.services.container import Container
from app.services.rbac import ROLES

router = APIRouter(prefix="/connectors", tags=["connectors"], dependencies=[Depends(require_roles("admin"))])


def _out(c: Connector) -> ConnectorOut:
    return ConnectorOut(id=c.id, name=c.name, kind=c.kind, source_type=c.source_type, config=redact_config(c.config),
                        default_classification=c.default_classification, status=c.status, last_error=c.last_error,
                        last_sync_at=c.last_sync_at, doc_count=c.doc_count, sync_interval_minutes=c.sync_interval_minutes)


@router.post("", response_model=ConnectorOut, status_code=201)
def create_connector(body: ConnectorCreate, db: Session = Depends(get_db), container: Container = Depends(get_container)):
    if any(r != "*" and r not in ROLES for r in body.default_allowed_roles):
        raise HTTPException(422, "default_allowed_roles contains an unknown role")
    try:
        build_connector(body.kind, body.config, container.settings).validate()
    except AppError as exc:
        raise HTTPException(exc.status_code, exc.message)
    conn = Connector(name=body.name, kind=body.kind, source_type=body.source_type, config=body.config,
                     default_classification=body.default_classification, default_allowed_roles=body.default_allowed_roles,
                     sync_interval_minutes=body.sync_interval_minutes)
    db.add(conn)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A connector with this name already exists")
    return _out(conn)


@router.get("", response_model=list[ConnectorOut])
def list_connectors(db: Session = Depends(get_db)):
    return [_out(c) for c in db.scalars(select(Connector).order_by(Connector.name)).all()]


@router.post("/{connector_id}/sync")
def sync(connector_id: str, db: Session = Depends(get_db), container: Container = Depends(get_container)):
    conn = db.get(Connector, connector_id)
    if not conn:
        raise HTTPException(404, "Connector not found")
    try:
        return {"connector": conn.name, "stats": sync_connector(db, conn, container.ingestion, container.settings)}
    except AppError as exc:
        raise HTTPException(exc.status_code, exc.message)


@router.delete("/{connector_id}", status_code=204)
def delete_connector(connector_id: str, db: Session = Depends(get_db), container: Container = Depends(get_container)):
    conn = db.get(Connector, connector_id)
    if not conn:
        raise HTTPException(404, "Connector not found")
    for doc in db.scalars(select(Document).where(Document.connector_id == conn.id)).all():
        container.ingestion.delete(db, doc)
    db.delete(conn)
    db.commit()
