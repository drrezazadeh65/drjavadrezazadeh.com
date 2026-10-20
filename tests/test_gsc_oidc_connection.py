"""Offline security/measurement contracts for the existing GSC OIDC-only workflow."""
import datetime as dt
import importlib.util
import io
import os
from pathlib import Path
from unittest import TestCase, main, mock

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("gsc_oidc_verify", ROOT / "scripts/gsc_oidc_verify.py")
gsc = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gsc)


def properties(permission="siteFullUser"):
    return {"siteEntry": [
        {"siteUrl": "https://unrelated.example/", "permissionLevel": "siteOwner"},
        {"siteUrl": gsc.EXPECTED_PROPERTY, "permissionLevel": permission},
    ]}


def aggregate():
    return {"rows": [{"clicks": 8, "impressions": 100, "ctr": 0.08, "position": 11.5}]}


class GscContracts(TestCase):
    def test_fixed_google_api_and_delayed_historical_dates(self):
        self.assertEqual(gsc.historical_range(dt.date(2026, 10, 20)),
                         ("2026-10-02", "2026-10-16"))
        self.assertEqual(gsc.EXPECTED_PROPERTY, "https://drjavadrezazadeh.com/")
        self.assertEqual(gsc.DOMAIN_PROPERTY, "sc-domain:drjavadrezazadeh.com")

    def test_accepts_only_exact_url_prefix_and_one_historical_aggregate(self):
        with mock.patch.object(gsc, "request_google", side_effect=[
                (200, properties()), (200, aggregate())]) as req:
            result = gsc.inspect("synthetic-test-token", dt.date(2026, 10, 20))
        self.assertEqual(result["property"]["siteUrl"], gsc.EXPECTED_PROPERTY)
        self.assertEqual(result["property"]["permission"], "siteFullUser")
        self.assertEqual(result["searchAnalytics"]["status"], "observed_aggregate")
        self.assertEqual(result["searchAnalytics"]["aggregate"]["clicks"], 8)
        self.assertEqual(req.call_count, 2)
        second = req.call_args_list[1]
        self.assertIn("%3A%2F%2Fdrjavadrezazadeh.com%2F", second.args[1])
        body = second.args[2]
        self.assertEqual(body["dimensions"], [])
        self.assertEqual(body["rowLimit"], 1)
        self.assertEqual(body["dataState"], "final")
        self.assertEqual(body["type"], "web")
        self.assertEqual(body["startDate"], "2026-10-02")
        self.assertEqual(body["endDate"], "2026-10-16")

    def test_legitimate_empty_result_is_not_auth_failure_or_fake_zero(self):
        with mock.patch.object(gsc, "request_google", side_effect=[
                (200, properties()), (200, {})]):
            result = gsc.inspect("synthetic-test-token", dt.date(2026, 10, 20))
        self.assertEqual(result["searchAnalytics"]["status"], "no_rows")
        self.assertEqual(result["searchAnalytics"]["returnedRows"], 0)
        self.assertIsNone(result["searchAnalytics"]["aggregate"])

    def test_only_domain_property_does_not_silently_replace_url_property(self):
        with mock.patch.object(gsc, "request_google", return_value=
                (200, {"siteEntry": [{"siteUrl": gsc.DOMAIN_PROPERTY,
                                      "permissionLevel": "siteOwner"}]})):
            with self.assertRaises(gsc.VerificationError) as cm:
                gsc.inspect("synthetic-test-token")
        self.assertEqual(cm.exception.category, "only_domain_property_accessible")

    def test_restricted_permission_does_not_count_as_full(self):
        with mock.patch.object(gsc, "request_google", return_value=
                (200, properties("siteRestrictedUser"))):
            with self.assertRaises(gsc.VerificationError) as cm:
                gsc.inspect("synthetic-test-token")
        self.assertEqual(cm.exception.category, "insufficient_property_permission")

    def test_upstream_http_errors_are_categorised_without_leaking_body(self):
        from urllib.error import HTTPError
        for code, expected in ((401, "authentication_rejected"),
                               (403, "permission_or_api_denied"),
                               (429, "google_quota_limited")):
            with self.subTest(code=code):
                e = HTTPError(gsc.SITES_ENDPOINT, code, "sensitive-body", {}, io.BytesIO(b"secret"))
                with mock.patch("urllib.request.build_opener") as build:
                    build.return_value.open.side_effect = e
                    with self.assertRaises(gsc.VerificationError) as cm:
                        gsc.request_google("synthetic-private-token", gsc.SITES_ENDPOINT)
                self.assertEqual(cm.exception.category, expected)
                self.assertNotIn("secret", str(cm.exception))
                self.assertNotIn("synthetic-private-token", str(cm.exception))

    def test_no_non_google_endpoint_can_receive_bearer_token(self):
        with self.assertRaises(gsc.VerificationError) as cm:
            gsc.request_google("synthetic-private-token", "https://wrong.example/collect")
        self.assertEqual(cm.exception.category, "unapproved_google_endpoint")

    def test_untrusted_repo_or_ref_fails_before_token_usage(self):
        for repo, ref in [
                ("other/repo", "refs/heads/migration/bertina-linux6"),
                ("drrezazadeh65/drjavadrezazadeh.com", "refs/heads/untrusted")]:
            with mock.patch.dict(os.environ, {
                "GITHUB_REPOSITORY": repo, "GITHUB_REF": ref,
                "GSC_ACCESS_TOKEN": "synthetic-private-token",
            }):
                with mock.patch.object(gsc, "inspect") as inspect, \
                        mock.patch("builtins.print") as printed:
                    self.assertEqual(gsc.main(), 1)
                inspect.assert_not_called()
                self.assertNotIn("synthetic-private-token", str(printed.call_args_list))

    def test_hardcoded_workflow_must_remain_keyless_and_unchanged_deploy(self):
        yaml = (ROOT / ".github/workflows/google-search-console-sync.yml").read_text()
        deploy = (ROOT / ".github/workflows/deploy-bertina.yml").read_text()
        for text in ("workflow_dispatch:", "id-token: write",
                     "google-github-actions/auth@v2", "webmasters.readonly",
                     "gsc_oidc_verify.py", "migration/bertina-linux6"):
            self.assertIn(text, yaml)
        for forbidden in ("credentials_json", "service_account_key",
                          "upload-artifact", "BERTINA_FTP_PASSWORD", "deploy-bertina.yml",
                          "gcloud auth activate-service-account"):
            self.assertNotIn(forbidden, yaml)
        self.assertIn("cancel-in-progress: false", deploy)


if __name__ == "__main__":
    main()
