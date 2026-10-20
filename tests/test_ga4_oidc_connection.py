"""Offline GA4 OIDC proof contracts; all provider responses are synthetic."""
import importlib.util
import io
import os
from pathlib import Path
from unittest import TestCase, mock, main

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("ga4_oidc_verify", ROOT / "scripts/ga4_oidc_verify.py")
ga4 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ga4)


def metadata():
    return {"metrics": [{"apiName": "eventCount"}, {"apiName": "activeUsers"}]}


def report(values=("0", "0")):
    return {
        "metricHeaders": [{"name": "activeUsers"}, {"name": "eventCount"}],
        "rows": [{"metricValues": [{"value": values[0]}, {"value": values[1]}]}],
    }


class Ga4Contracts(TestCase):
    def test_exact_property_and_approved_endpoints(self):
        self.assertEqual(ga4.PROPERTY, "properties/559754204")
        self.assertTrue(ga4.METADATA.startswith("https://analyticsdata.googleapis.com/"))
        self.assertTrue(ga4.REPORT.endswith("properties/559754204:runReport"))

    def test_real_shape_accepts_existing_rows(self):
        with mock.patch.object(ga4, "google_request", side_effect=[
                (200, metadata()), (200, report(("3", "19")))]) as req:
            result = ga4.inspect("synthetic-token")
        self.assertEqual(result["status"], "authenticated_report_with_rows")
        self.assertEqual(req.call_count, 2)
        self.assertEqual(req.call_args_list[1].args[2]["limit"], "1")
        self.assertEqual(req.call_args_list[1].args[2]["dateRanges"][0]["endDate"], "yesterday")

    def test_valid_empty_report_is_success_not_zero(self):
        with mock.patch.object(ga4, "google_request", side_effect=[
                (200, metadata()), (200, {"metricHeaders": [
                    {"name": "activeUsers"}, {"name": "eventCount"}]})]):
            result = ga4.inspect("synthetic-token")
        self.assertEqual(result["status"], "authenticated_empty_report")
        self.assertEqual(result["rows"], 0)

    def test_real_google_empty_protobuf_report_without_headers_is_valid(self):
        for empty in ({}, {"rowCount": 0}, {"rows": []}):
            with self.subTest(empty=empty):
                with mock.patch.object(ga4, "google_request", side_effect=[
                        (200, metadata()), (200, empty)]):
                    actual = ga4.inspect("synthetic-token")
                self.assertEqual(actual["status"], "authenticated_empty_report")
                self.assertEqual(actual["rows"], 0)

    def test_omitted_headers_must_not_hide_real_rows_or_unknown_fields(self):
        for malformed in (
            {"rowCount": 1},
            {"rows": [{"metricValues": [{"value": "1"}, {"value": "2"}]}]},
            {"error": {"code": 403}},
            {"unexpected": "no"},
            {"rowCount": True},
        ):
            with self.subTest(payload=malformed):
                with mock.patch.object(ga4, "google_request", side_effect=[
                        (200, metadata()), (200, malformed)]):
                    with self.assertRaises(ga4.Ga4VerificationError):
                        ga4.inspect("synthetic-token")

    def test_wrong_metric_headers_are_not_accepted(self):
        with mock.patch.object(ga4, "google_request", side_effect=[
                (200, metadata()), (200, {"metricHeaders": [{"name": "eventCount"}]})]):
            with self.assertRaises(ga4.Ga4VerificationError) as cm:
                ga4.inspect("synthetic-token")
        self.assertEqual(cm.exception.category, "invalid_ga4_metric_headers")

    def test_403_does_not_leak_raw_google_payload(self):
        from urllib.error import HTTPError
        error = HTTPError(ga4.METADATA, 403, "secret token in response", {}, io.BytesIO(b"private"))
        with mock.patch("urllib.request.build_opener") as opener:
            opener.return_value.open.side_effect = error
            with self.assertRaises(ga4.Ga4VerificationError) as cm:
                ga4.google_request("synthetic-private-token", ga4.METADATA)
        self.assertEqual(cm.exception.category, "ga4_permission_or_api_denied")
        self.assertNotIn("private", str(cm.exception))
        self.assertNotIn("synthetic-private-token", str(cm.exception))

    def test_token_must_not_be_sent_to_other_host(self):
        with self.assertRaises(ga4.Ga4VerificationError):
            ga4.google_request("synthetic-private-token", "https://malicious.example/token")

    def test_forged_and_untrusted_github_context_blocked(self):
        for repo, ref in [
            ("other/repo", ga4.EXPECTED_REF), (ga4.EXPECTED_REPO, "refs/heads/main")
        ]:
            with mock.patch.dict(os.environ, {
                "GITHUB_REPOSITORY": repo, "GITHUB_REF": ref, "GA4_ACCESS_TOKEN": "synthetic"
            }):
                with mock.patch.object(ga4, "inspect") as request:
                    self.assertEqual(ga4.main(), 1)
                request.assert_not_called()


if __name__ == "__main__":
    main()
