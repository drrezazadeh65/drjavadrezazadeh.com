"""JREI CI observation tests; no GitHub access, credentials or deployment."""
import unittest
from unittest.mock import patch

from jrei_service import ci_observer as observer
from jrei_service import windows_command_center as command


HEAD = "b" * 40
OLDER = "a" * 40


def runs_for_head(states=None):
    states = states or {}
    return {"workflow_runs": [
        {"name": name, "id": 100 + i, "head_branch": observer.CANONICAL,
         "head_sha": HEAD, "status": "completed",
         "conclusion": states.get(name, "success")}
        for i, name in enumerate(observer.REQUIRED)
    ]}


class CIObserverTests(unittest.TestCase):
    def test_all_workflows_at_same_head_pass_when_independently_reported(self):
        result = observer.inspect_ci({"commit": {"sha": HEAD}}, runs_for_head())
        self.assertEqual(result["state"], "PASS_AT_HEAD")
        self.assertEqual(len(result["findings"]), len(observer.REQUIRED))
        self.assertTrue(all(row["state"] == "PASS" for row in result["findings"]))
        self.assertFalse(result["production_deployed"])
        self.assertRegex(result["receipt_sha256"], r"^[a-f0-9]{64}$")

    def test_any_real_failure_blocks_pass(self):
        failed = {observer.REQUIRED[0]: "failure"}
        result = observer.inspect_ci({"commit": {"sha": HEAD}},
                                     runs_for_head(failed))
        self.assertEqual(result["state"], "FAILED_AT_HEAD")
        self.assertEqual(result["findings"][0]["id"], 100)

    def test_old_sha_is_stale_not_current_success(self):
        old_runs = runs_for_head()
        for row in old_runs["workflow_runs"]:
            row["head_sha"] = OLDER
        result = observer.inspect_ci({"commit": {"sha": HEAD}}, old_runs)
        self.assertEqual(result["state"], "INCOMPLETE_AT_HEAD")
        self.assertTrue(all(row["state"] == "MISSING_OR_STALE" for row in result["findings"]))

    def test_pending_action_is_not_a_pass(self):
        rows = runs_for_head()
        rows["workflow_runs"][0]["status"] = "in_progress"
        rows["workflow_runs"][0]["conclusion"] = None
        result = observer.inspect_ci({"commit": {"sha": HEAD}}, rows)
        self.assertEqual(result["state"], "INCOMPLETE_AT_HEAD")

    def test_malformed_or_unverified_external_input_rejected(self):
        for invalid in ("", "Z" * 40, 123, None):
            with self.assertRaises(ValueError):
                observer.inspect_ci({"commit": {"sha": invalid}}, runs_for_head())
        with self.assertRaises(ValueError):
            observer.inspect_ci({"commit": {"sha": HEAD}}, {"workflow_runs": [None] * 61})

    def test_cannot_fetch_an_arbitrary_url(self):
        with self.assertRaisesRegex(ValueError, "UNAPPROVED_GITHUB_URL"):
            observer.fetch_json("https://example.com/submit?a=private")

    def test_windows_owner_uses_exact_evidence_without_issuing_model_claims(self):
        result = observer.inspect_ci({"commit": {"sha": HEAD}},
                                     runs_for_head({observer.REQUIRED[2]: "failure"}))
        with patch.object(command, "observe_ci", return_value=result):
            state, detail = command.execute("ci_health")
        self.assertEqual(state, "FAILED_AT_HEAD")
        self.assertIn("HEAD=" + HEAD, detail)
        self.assertIn("RECEIPT=", detail)
        self.assertIn("JREI Windows Command Center", detail)
        with patch.object(command, "run_job", return_value={"state": "FAILED_AT_HEAD"}) as dispatched:
            self.assertEqual(
                command.route_directive("خطاهای گیت هاب را بررسی کن")["state"],
                "FAILED_AT_HEAD")
            dispatched.assert_called_once_with("ci_health")

    def test_network_error_is_explicit_unavailable_not_zero_failures(self):
        with patch.object(command, "observe_ci", side_effect=OSError("offline")):
            state, detail = command.execute("ci_health")
        self.assertEqual(state, "UNAVAILABLE")
        self.assertIn("NOT_AVAILABLE", detail)


if __name__ == "__main__":
    unittest.main()
