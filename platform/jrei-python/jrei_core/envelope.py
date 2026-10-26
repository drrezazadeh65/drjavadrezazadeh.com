"""Typed portable JREI event envelope; schema only, no durable event storage."""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any, Literal
from uuid import UUID
from pydantic import Field, model_validator
from .contracts import Digest, Identifier, StrictContract

class MissionActionState(str, Enum):
    PLANNED = "PLANNED"
    AUTHORIZED = "AUTHORIZED"
    RUNNING = "RUNNING"
    EXECUTED = "EXECUTED"
    VERIFIED = "VERIFIED"
    FAILED = "FAILED"
    UNKNOWN_RESULT = "UNKNOWN_RESULT"
    CANCELLED = "CANCELLED"
    REQUIRES_REVIEW = "REQUIRES_REVIEW"

class JreiEventEnvelope(StrictContract):
    schema_version: Literal["jr.jrei.event-envelope.v1"] = "jr.jrei.event-envelope.v1"
    event_id: UUID
    correlation_id: UUID
    idempotency_key: Identifier
    producer: Identifier
    event_type: Identifier
    created_at: datetime
    evidence_sha256: Digest
    data_class: Literal["PUBLIC", "INTERNAL", "OWNER_PRIVATE"]
    tenant_scope: Literal["OWNER", "PUBLIC"]
    payload: dict[str, Any] = Field(default_factory=dict, max_length=24)

    @model_validator(mode="after")
    def check_trust_boundary(self):
        if self.created_at.tzinfo is None or self.created_at.utcoffset() is None:
            raise ValueError("TIMESTAMP_REQUIRES_TIMEZONE")
        if self.tenant_scope == "PUBLIC" and self.data_class == "OWNER_PRIVATE":
            raise ValueError("OWNER_DATA_CANNOT_ENTER_PUBLIC_EVENT")
        if any(k in self.payload for k in
               ("shell", "sql", "private_key", "password", "owner_authorized")):
            raise ValueError("UNAUTHORIZED_EXECUTION_FIELD")
        return self
