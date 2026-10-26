"""Source-stage encrypted owner-memory negative cases. NOT run as QA."""
from __future__ import annotations

import os
import unittest
from unittest.mock import patch
from pydantic import ValidationError
from jrei_memory.contracts import (
    OwnerMemorySave, OwnerMemoryRef, OwnerMemoryRevokeReceipt,
)
from jrei_memory.store import (
    OwnerMemoryUnavailable, save_owner_note, read_owner_note, revoke_owner_note,
)

OWNER="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
RECORD="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"


def save_payload(**change):
    values={
        "owner_account_id":OWNER,
        "request_key":"f"*32,
        "purpose":"OWNER_RESEARCH_NOTE",
        "note":"Only owner-authorized retained research note",
        "retention_days":30,
    }
    values.update(change)
    return values


class OwnerMemoryContractCases(unittest.TestCase):
    def test_retention_bound(self):
        with self.assertRaises(ValidationError):
            OwnerMemorySave.model_validate(save_payload(retention_days=10000))

    def test_cross_tenant_context_not_a_payload_field(self):
        with self.assertRaises(ValidationError):
            OwnerMemorySave.model_validate(
                save_payload(public_tenant_id="other-account")
            )

    def test_no_model_training_purpose(self):
        with self.assertRaises(ValidationError):
            OwnerMemorySave.model_validate(
                save_payload(purpose="PUBLIC_MODEL_TRAINING")
            )

    def test_plaintext_request_never_saves_when_disabled(self):
        req = OwnerMemorySave.model_validate(save_payload())
        with patch.dict(os.environ, {"JREI_PYTHON_OWNER_MEMORY_ENABLED":"0"}):
            with self.assertRaises(OwnerMemoryUnavailable):
                save_owner_note(req)

    def test_read_denied_with_memory_switch_off(self):
        ref = OwnerMemoryRef(owner_account_id=OWNER, record_id=RECORD)
        with patch.dict(os.environ, {"JREI_PYTHON_OWNER_MEMORY_ENABLED":"0"}):
            with self.assertRaises(OwnerMemoryUnavailable):
                read_owner_note(ref)

    def test_revocation_receipt_does_not_claim_backup_eradication(self):
        value=OwnerMemoryRevokeReceipt(
            record_id=RECORD, ciphertext_erased_from_current_row=True
        )
        self.assertFalse(value.historical_backups_erased)
        self.assertFalse(value.used_for_model_training)

    def test_revocation_keeps_no_automatic_privilege(self):
        ref = OwnerMemoryRef(owner_account_id=OWNER, record_id=RECORD)
        with patch.dict(os.environ, {
            "JREI_PYTHON_OWNER_MEMORY_ENABLED":"0",
            "JREI_PYTHON_OWNER_MEMORY_REVOKE_ENABLED":"0",
        }):
            with self.assertRaises(OwnerMemoryUnavailable):
                revoke_owner_note(ref)


if __name__ == "__main__":
    unittest.main()
