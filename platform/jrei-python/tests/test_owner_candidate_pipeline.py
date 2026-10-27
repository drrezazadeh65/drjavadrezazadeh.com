"""Independent offline tests for JREI source-pinned, isolated coding candidates."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from jrei_service.owner_candidate_pipeline import (
    stage_candidate, parse_response, safe_path,
)
from jrei_service import windows_command_center as cc


class OwnerCandidatePipelineTests(unittest.TestCase):
    SOURCE = "def reviewed_value():\n    return 12 * 7\n"
    PATH = "platform/jrei-python/jrei_learning/sample_reviewed.py"

    def fixtures(self, root: Path):
        repo = root / "repo"
        repo.mkdir()
        source = repo / self.PATH
        source.parent.mkdir(parents=True)
        source.write_text(self.SOURCE, encoding="utf-8")
        sha = hashlib.sha256(self.SOURCE.encode("utf-8")).hexdigest()
        return repo, root / "owner-sandbox", sha

    def response(self, old="    return 12 * 7", new="    return 84"):
        return json.dumps({
            "original_fragment": old,
            "replacement_fragment": new,
        })

    def test_one_real_isolated_syntax_checked_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            repo, sandbox, expected = self.fixtures(root)
            receipt = stage_candidate(
                repo=repo, sandbox=sandbox, target=self.PATH,
                reply=self.response(), expected_sha256=expected)
            self.assertEqual(receipt["syntax"], "PASS")
            self.assertEqual(receipt["state"], "SYNTAX_CHECKED_NOT_FUNCTIONALLY_VERIFIED")
            self.assertFalse(receipt["functional_tests_run"])
            self.assertFalse(receipt["github_committed"])
            self.assertFalse(receipt["published_to_bertina"])
            self.assertFalse(receipt["learned_skill_accepted"])
            self.assertEqual((repo / self.PATH).read_text(encoding="utf-8"), self.SOURCE)
            saved = sandbox / receipt["candidate_id"]
            self.assertEqual((saved / "candidate.py").read_text(encoding="utf-8"),
                             "def reviewed_value():\n    return 84\n")
            self.assertTrue((saved / "receipt.json").exists())

    def test_invalid_syntax_can_be_staged_but_is_not_accepted(self):
        with tempfile.TemporaryDirectory() as directory:
            repo, box, sha = self.fixtures(Path(directory))
            receipt = stage_candidate(
                repo=repo, sandbox=box, target=self.PATH,
                reply=self.response(new="    return ("), expected_sha256=sha)
            self.assertEqual(receipt["syntax"], "FAILED")
            self.assertEqual(receipt["state"], "NOT_VALIDATED")
            self.assertEqual((repo / self.PATH).read_text(), self.SOURCE)

    def test_source_sha_mismatch_rejected_before_candidate_write(self):
        with tempfile.TemporaryDirectory() as directory:
            repo, box, sha = self.fixtures(Path(directory))
            with self.assertRaisesRegex(ValueError, "SOURCE_CHANGED"):
                stage_candidate(repo=repo, sandbox=box, target=self.PATH,
                                reply=self.response(), expected_sha256="0" * 64)
            self.assertFalse(box.exists())

    def test_path_traversal_secrets_and_non_json_rejected(self):
        for name in (
            "platform/jrei-python/jrei_learning/../private.env",
            "platform/jrei-python/jrei_learning/../../data.py",
            "api/payments.php",
            "platform/jrei-python/jrei_learning/new.exe",
            "platform/jrei-python/jrei_learning/a\\b.py",
        ):
            with self.assertRaises(ValueError):
                safe_path(name)
        for message in (
            "model explains changes instead of JSON",
            self.response(new="    password='top-secret-123'"),
            self.response(old="    return 12 * 7", new="    return 12 * 7"),
            '{"original_fragment":"hello","replacement_fragment":"goodbye","run":"rm -rf /"}',
        ):
            with self.assertRaises(ValueError):
                parse_response(message)

    def test_anchored_fragment_must_be_unique_and_early(self):
        with tempfile.TemporaryDirectory() as directory:
            repo, box, sha = self.fixtures(Path(directory))
            with self.assertRaisesRegex(ValueError, "FRAGMENT_NOT_SOURCE_ANCHORED"):
                stage_candidate(repo=repo, sandbox=box, target=self.PATH,
                                reply=self.response(old="    return not_here"), expected_sha256=sha)

    def test_no_sandbox_inside_checkout(self):
        with tempfile.TemporaryDirectory() as directory:
            repo, box, sha = self.fixtures(Path(directory))
            with self.assertRaisesRegex(ValueError, "SANDBOX_NOT_ISOLATED"):
                stage_candidate(repo=repo, sandbox=repo / "candidate",
                                target=self.PATH, reply=self.response(),
                                expected_sha256=sha)

    def test_windows_command_center_actually_calls_candidate_engine(self):
        with tempfile.TemporaryDirectory() as directory:
            repo, sandbox, sha = self.fixtures(Path(directory))
            with patch.object(cc, "REPO", repo), \
                 patch.object(cc, "PRIVATE", Path(directory) / "private"), \
                 patch.object(cc, "CANDIDATE_FILES", (self.PATH,)), \
                 patch.object(cc, "_candidate_index", 0), \
                 patch.object(cc, "reply", return_value={"answer": self.response(),
                                                       "model": "private-gpu"}):
                state, detail = cc.patch_candidate()
            self.assertEqual(state, "SYNTAX_CHECKED_NOT_FUNCTIONALLY_VERIFIED")
            self.assertIn("CANDIDATE_ID=", detail)
            self.assertIn("FUNCTIONAL_TESTS_RUN=false", detail)
            self.assertEqual((repo / self.PATH).read_text(), self.SOURCE)

    def test_invalid_model_output_cannot_claim_patch_success(self):
        with tempfile.TemporaryDirectory() as directory:
            repo, sandbox, sha = self.fixtures(Path(directory))
            with patch.object(cc, "REPO", repo), \
                 patch.object(cc, "PRIVATE", Path(directory) / "private"), \
                 patch.object(cc, "CANDIDATE_FILES", (self.PATH,)), \
                 patch.object(cc, "_candidate_index", 0), \
                 patch.object(cc, "reply", return_value={"answer": "not JSON", "model": "gpu"}):
                state, detail = cc.patch_candidate()
            self.assertEqual(state, "UNACCEPTED_MODEL_PATCH")
            self.assertFalse((Path(directory) / "private").exists())


if __name__ == "__main__":
    unittest.main()
