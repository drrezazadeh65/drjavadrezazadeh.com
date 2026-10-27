"""Source-only JREI birth safety and persistence checks (CI fixture; no host IO)."""
from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from jrei_orchestrator.continuous_autocode import (
    _signed_manifest, _open_private_db, _write_observable_status,
    ContinuousCodingManifest, stage_one,
)
from jrei_orchestrator.owner_grant import sign_standing_manifest
from jrei_orchestrator.sandbox_patch import (
    SandboxPatchRequest, materialize_preview,
)
from jrei_orchestrator.standing_discovery import discover_candidates
from jrei_core.local_model_draft import LocalDraftResult


class ContinuousBirthSafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "canonical"
        self.workspace = self.root / "private"
        source = self.repo / "platform/jrei-python/jrei_learning/example.py"
        source.parent.mkdir(parents=True)
        self.original = b"def calculate(x):\n    # TODO: improve error diagnosis\n    return x + 1\n"
        source.write_bytes(self.original)
        self.source = source
        self.scope = "a" * 64
        self.sha = hashlib.sha256(self.original).hexdigest()

    def test_signed_standing_grant_and_tamper_detection(self):
        key = Ed25519PrivateKey.generate()
        private = self.root / "private-key.pem"
        private.write_bytes(key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ))
        pub = base64.b64encode(key.public_key().public_bytes(
            serialization.Encoding.Raw,
            serialization.PublicFormat.Raw,
        )).decode("ascii")
        owner = {
            "schema_version": "jr.jrei.continuous-autocode-manifest.v1",
            "policy_digest": self.scope,
            "owner_approved": True, "emergency_stop": False,
            "autonomous_source_discovery_enabled": True,
            "tasks": [],
        }
        source = self.root / "owner-manifest.json"
        source.write_text(json.dumps(owner), encoding="utf-8")
        output = self.root / "owner-signed.json"
        sign_standing_manifest(private, source, output)
        with patch.dict("os.environ", {"JREI_AUTOCODE_OWNER_PUBLIC_KEY_B64": pub}):
            parsed = _signed_manifest(output.read_bytes())
            self.assertTrue(parsed.autonomous_source_discovery_enabled)
            tampered = json.loads(output.read_text(encoding="utf-8"))
            tampered["manifest"]["emergency_stop"] = True
            with self.assertRaises(ValueError):
                _signed_manifest(json.dumps(tampered).encode("utf-8"))

    def test_isolated_code_preview_never_mutates_checkout(self):
        request = SandboxPatchRequest(
            proposal_id="birth.patch.01",
            owner_policy_digest=self.scope,
            target_path="platform/jrei-python/jrei_learning/example.py",
            original_sha256=self.sha,
            evidence_sha256="b" * 64,
            original_fragment="return x + 1",
            replacement_fragment="return x + 2",
        )
        report = materialize_preview(
            self.repo, self.workspace / "sandbox-previews", request,
        )
        self.assertEqual(self.source.read_bytes(), self.original)
        self.assertFalse(report.tests_run)
        self.assertFalse(report.production_deployed)
        self.assertFalse(report.ready_to_release)
        sandbox_file = self.workspace / "sandbox-previews" / report.sandbox_relative_source
        self.assertIn("return x + 2", sandbox_file.read_text(encoding="utf-8"))
        self.assertTrue(
            (self.workspace / "sandbox-previews" / report.preview_relative_html).is_file()
        )
        with self.assertRaises(ValueError):
            SandboxPatchRequest(
                proposal_id="birth.patch.02", owner_policy_digest=self.scope,
                target_path="../../danger.py", original_sha256=self.sha,
                evidence_sha256="b" * 64,
                original_fragment="return x + 1",
                replacement_fragment="return x + 2",
            )

    def test_persistent_candidate_and_status_are_not_quality_claims(self):
        discovered = discover_candidates(
            self.repo, self.scope, discovered_at=1800000000,
        )
        self.assertEqual(len(discovered), 1)
        task = discovered[0]
        self.assertEqual(task["source_sha256"], self.sha)
        manifest = ContinuousCodingManifest(
            policy_digest=self.scope, owner_approved=True,
            emergency_stop=False, autonomous_source_discovery_enabled=False,
            tasks=[task],
        )
        from jrei_core.local_model_draft import LocalDraftRequest
        draft_request = LocalDraftRequest(
            request_id=task["task_id"],
            language="en", academic_task="CODING_PATCH_JSON",
            question="Create a reversible, isolated source improvement.",
        )
        output = json.dumps({
            "original_fragment": "return x + 1",
            "replacement_fragment": "return x + 2",
        })
        draft = LocalDraftResult(
            request_id=draft_request.request_id, language="en",
            academic_task="CODING_PATCH_JSON",
            model_output=output,
            response_sha256=hashlib.sha256(output.encode("utf-8")).hexdigest(),
            inference_latency_ms=1,
        )
        conn = _open_private_db(self.workspace)
        self.addCleanup(conn.close)
        with patch.dict("os.environ", {"JREI_CONTINUOUS_AUTOCODE_ENABLED": "1"}):
            with patch(
                "jrei_orchestrator.continuous_autocode._headroom",
                return_value=True,
            ), patch(
                "jrei_orchestrator.continuous_autocode.create_local_owner_draft",
                return_value=draft,
            ):
                self.assertEqual(
                    stage_one(self.repo, self.workspace, conn, manifest),
                    "STAGED_UNVERIFIED",
                )
                self.assertEqual(
                    stage_one(self.repo, self.workspace, conn, manifest),
                    "NO_ELIGIBLE_NEW_WORK",
                )
        row = conn.execute("SELECT COUNT(*) FROM source_proposals").fetchone()
        self.assertEqual(row[0], 1)
        _write_observable_status(self.workspace, conn, "STAGED_UNVERIFIED")
        state = json.loads(
            (self.workspace / "jrei-autocode-status.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(state["staged_unverified_proposals"], 1)
        self.assertFalse(state["independent_learning_improvement_verified"])
        self.assertFalse(state["production_deployed"])
        self.assertEqual(self.source.read_bytes(), self.original)


if __name__ == "__main__":
    unittest.main()
