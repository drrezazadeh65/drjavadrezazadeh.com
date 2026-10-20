"""Offline contracts for the direct read-only GSC probes."""
import importlib.util
import os
import sys
from pathlib import Path
from unittest import TestCase, mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("gsc_readonly_probes", ROOT / "scripts/gsc_readonly_probes.py")
probes = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probes)


class ReadonlyProbeContracts(TestCase):
    def test_exact_property_and_bounded_readonly_requests(self):
        with mock.patch.object(probes, "request_google", side_effect=[
            (200, {"sitemap": [{"path": "https://drjavadrezazadeh.com/sitemap.xml"}]}),
            (200, {"inspectionResult": {"indexStatusResult": {"coverageState": "Indexed"}}}),
        ]) as req:
            result = probes.probe("synthetic-token")
        self.assertEqual(result["sitemapsReturned"], 1)
        self.assertTrue(result["inspectionResultPresent"])
        self.assertEqual(req.call_count, 2)
        self.assertIn("/sitemaps", req.call_args_list[0].args[1])
        self.assertEqual(req.call_args_list[0].args[0], "synthetic-token")
        self.assertEqual(req.call_args_list[0].args[2] if len(req.call_args_list[0].args) > 2 else None, None)
        self.assertEqual(req.call_args_list[1].args[2]["siteUrl"], probes.EXPECTED_PROPERTY)
        self.assertEqual(req.call_args_list[1].args[2]["inspectionUrl"], "https://drjavadrezazadeh.com/fa/")
        self.assertNotIn("coverageState", result)

    def test_no_sitemaps_is_not_a_failure(self):
        with mock.patch.object(probes, "request_google", side_effect=[
            (200, {}), (200, {"inspectionResult": {"indexStatusResult": {}}}),
        ]):
            self.assertEqual(probes.probe("synthetic-token")["sitemapsReturned"], 0)

    def test_malformed_inspection_is_not_reported_as_success(self):
        with mock.patch.object(probes, "request_google", side_effect=[
            (200, {}), (200, {"inspectionResult": {}}),
        ]):
            with self.assertRaises(probes.VerificationError):
                probes.probe("synthetic-token")

    def test_untrusted_context_blocks_before_request(self):
        with mock.patch.dict(os.environ, {
            "GITHUB_REPOSITORY": "untrusted/repo",
            "GITHUB_REF": probes.EXPECTED_REF,
            "GSC_ACCESS_TOKEN": "synthetic-token",
        }):
            with mock.patch.object(probes, "request_google") as req:
                self.assertEqual(probes.main(), 1)
                req.assert_not_called()
