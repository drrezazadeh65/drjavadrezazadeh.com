"""Owner-only, purpose-limited memory API contracts.

The trusted PHP SUPER_ADMIN/MFA session MUST inject owner_account_id.
Never accept a browser-provided account identity as an authentication claim.
This is not public user memory or automatic training consent.
"""
from __future__ import annotations

from typing import Literal
from pydantic import Field, model_validator
from jrei_core.contracts import StrictContract

OwnerId = str
Purpose = Literal["OWNER_WORK_NOTE", "OWNER_RESEARCH_NOTE", "OWNER_PREFERENCE"]


class OwnerMemorySave(StrictContract):
    schema_version: Literal["jr.jrei.owner-memory-save.v1"] = "jr.jrei.owner-memory-save.v1"
    owner_account_id: str = Field(pattern=r"^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$")
    request_key: str = Field(pattern=r"^[a-f0-9]{32}$")
    purpose: Purpose
    note: str = Field(min_length=1, max_length=2000)
    retention_days: int = Field(ge=1, le=365)


class OwnerMemoryRef(StrictContract):
    schema_version: Literal["jr.jrei.owner-memory-ref.v1"] = "jr.jrei.owner-memory-ref.v1"
    owner_account_id: str = Field(pattern=r"^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$")
    record_id: str = Field(pattern=r"^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$")


class OwnerMemoryReceipt(StrictContract):
    schema_version: Literal["jr.jrei.owner-memory-receipt.v1"] = "jr.jrei.owner-memory-receipt.v1"
    record_id: str
    purpose: Purpose
    expires_at: int
    persist_result: Literal["MOTHER_DB_ATOMIC_INSERT"] = "MOTHER_DB_ATOMIC_INSERT"
    idempotent_replay: bool = False
    used_for_model_training: Literal[False] = False
    available_to_other_tenants: Literal[False] = False


class OwnerMemoryReadResult(StrictContract):
    schema_version: Literal["jr.jrei.owner-memory-read.v1"] = "jr.jrei.owner-memory-read.v1"
    found: bool
    record_id: str
    purpose: Purpose | None = None
    note: str | None = None
    expires_at: int | None = None
    used_for_model_training: Literal[False] = False
    available_to_other_tenants: Literal[False] = False


class OwnerMemoryRevokeReceipt(StrictContract):
    schema_version: Literal["jr.jrei.owner-memory-revoked.v1"] = "jr.jrei.owner-memory-revoked.v1"
    record_id: str
    ciphertext_erased_from_current_row: bool
    historical_backups_erased: Literal[False] = False
    used_for_model_training: Literal[False] = False


class OwnerMemoryListQuery(StrictContract):
    schema_version: Literal["jr.jrei.owner-memory-list.v1"] = "jr.jrei.owner-memory-list.v1"
    owner_account_id: str = Field(pattern=r"^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$")
    limit: int = Field(default=25, ge=1, le=50)
    before_created_at: int | None = Field(default=None, ge=1)
    before_record_id: str | None = Field(
        default=None, pattern=r"^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$"
    )

    @model_validator(mode="after")
    def complete_cursor(self) -> "OwnerMemoryListQuery":
        if (self.before_created_at is None) != (self.before_record_id is None):
            raise ValueError("OWNER_MEMORY_CURSOR_INCOMPLETE")
        return self


class OwnerMemoryMetadata(StrictContract):
    record_id: str
    purpose: Purpose
    created_at: int
    expires_at: int


class OwnerMemoryListResult(StrictContract):
    schema_version: Literal["jr.jrei.owner-memory-list-result.v1"] = (
        "jr.jrei.owner-memory-list-result.v1"
    )
    entries: list[OwnerMemoryMetadata] = Field(max_length=50)
    has_more: bool
    next_before_created_at: int | None = None
    next_before_record_id: str | None = None
    payload_contains_plaintext: Literal[False] = False
    used_for_model_training: Literal[False] = False
    available_to_other_tenants: Literal[False] = False
