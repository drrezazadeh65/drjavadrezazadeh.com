"""Non-network acceptance of independently gated owner-only local model drafts."""
from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from pydantic import ValidationError

from jrei_core.local_model_draft import (
    LocalDraftRequest, LocalDraftResult, LocalModelUnavailable,
    create_local_owner_draft,
)


def owner_request() -> LocalDraftRequest:
    return LocalDraftRequest(
        request_id="owner-draft-regression-001",
        language="fa",
        question="چگونه کیفیت یک تمرین آموزشی را به صورت مقدماتی ارزیابی کنیم؟",
    )


class OwnerLocalDraftBoundaryTests(unittest.TestCase):
    def test_private_model_is_off_without_explicit_switch(self):
        with patch.dict(os.environ, {
            "JREI_PYTHON_OWNER_MODEL_DRAFT_ENABLED": "0",
            "JREI_PYTHON_LOCAL_MODEL_RIGHTS_OWNER_REVIEWED": "0",
        }), patch("jrei_core.local_model_draft.build_opener",
                 side_effect=AssertionError("network must not be touched")):
            with self.assertRaisesRegex(
                LocalModelUnavailable, "OWNER_MODEL_DRAFT_NOT_ENABLED"
            ):
                create_local_owner_draft(owner_request())

    def test_private_model_rights_are_independently_required(self):
        with patch.dict(os.environ, {
            "JREI_PYTHON_OWNER_MODEL_DRAFT_ENABLED": "1",
            "JREI_PYTHON_LOCAL_MODEL_RIGHTS_OWNER_REVIEWED": "0",
        }), patch("jrei_core.local_model_draft.build_opener",
                 side_effect=AssertionError("network must not be touched")):
            with self.assertRaisesRegex(
                LocalModelUnavailable, "MODEL_USE_OWNER_REVIEW_REQUIRED"
            ):
                create_local_owner_draft(owner_request())

    def test_secrets_and_unfounded_citation_digest_are_rejected(self):
        with self.assertRaises(ValidationError):
            LocalDraftRequest(
                request_id="owner-draft-regression-002",
                language="en",
                question="password=do-not-submit-this-secret",
            )
        with self.assertRaises(ValidationError):
            LocalDraftRequest(
                request_id="owner-draft-regression-003",
                language="en",
                question="Explain a safe classroom formative check.",
                source_evidence_sha256="a" * 64,
            )

    def test_result_cannot_claim_publication_or_independent_review(self):
        values = dict(
            request_id="owner-draft-regression-004", language="en",
            model_output="Unverified private classroom draft.",
            response_sha256="a" * 64,
            inference_latency_ms=1,
        )
        result = LocalDraftResult(**values)
        self.assertFalse(result.public_publish_authorized)
        self.assertFalse(result.source_citations_independently_verified)
        self.assertTrue(result.owner_scientific_review_required)
        with self.assertRaises(ValidationError):
            LocalDraftResult(**values, public_publish_authorized=True)


if __name__ == "__main__":
    unittest.main()
