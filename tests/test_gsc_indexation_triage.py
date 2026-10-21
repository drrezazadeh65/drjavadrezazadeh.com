"""Offline, synthetic, no-network contracts for the optional direct-GSC triage."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
from unittest import TestCase, mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("gsc_indexation_triage", ROOT / "scripts/gsc_indexation_triage.py")
triage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(triage)

def index_xml(locations):
    rows = "".join("<sitemap><loc>" + x + "</loc></sitemap>" for x in locations)
    return '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + rows + '</sitemapindex>'

def urls_xml(locations):
    rows = "".join("<url><loc>" + x + "</loc></url>" for x in locations)
    return '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + rows + '</urlset>'


class GscIndexationTriageContracts(TestCase):
    def test_index_verdict_does_not_mask_explicit_exclusion(self):
        self.assertEqual(triage.coverage_group({"coverageState": "Crawled - currently not indexed", "verdict": "PASS"}), "crawled_not_indexed")
        self.assertEqual(triage.coverage_group({"coverageState": "Discovered - currently not indexed"}), "discovered_not_indexed")
        self.assertEqual(triage.coverage_group({"coverageState": "Submitted and indexed", "verdict": "PASS"}), "indexed")
        self.assertEqual(triage.coverage_group({"verdict": "NEUTRAL"}), "other_or_unknown")
        self.assertEqual(triage.coverage_group({"coverageState": "Alternate page with proper canonical tag"}), "canonicalized_or_duplicate")

    def test_only_frozen_indexable_same_origin_html_from_sitemap(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "platform").mkdir()
            (root / "assets/data").mkdir(parents=True)
            for name in ("service-catalog.json", "vip-catalog.json"):
                (root / "assets/data" / name).write_text(json.dumps({"services": []}), encoding="utf-8")
            (root / "fa").mkdir()
            (root / "fa" / "index.html").write_text("<html></html>", encoding="utf-8")
            (root / "platform/public-url-stability-manifest.json").write_text(json.dumps({
                "production_origin": "https://drjavadrezazadeh.com",
                "frozen_indexable_routes": ["/fa/"]
            }), encoding="utf-8")
            (root / "sitemap.xml").write_text(index_xml(["https://drjavadrezazadeh.com/sitemap-fa.xml"]), encoding="utf-8")
            (root / "sitemap-fa.xml").write_text(urls_xml([
                "https://drjavadrezazadeh.com/fa/",
                "https://drjavadrezazadeh.com/fa/customer-dashboard/",
                "https://another.example.org/fa/"
            ]), encoding="utf-8")
            self.assertEqual(triage.sitemap_inventory(root), ["https://drjavadrezazadeh.com/fa/"])

    def test_readonly_exact_property_no_url_level_result_leak(self):
        with mock.patch.object(triage, "request_google", side_effect=[
            (200, {"inspectionResult": {"indexStatusResult": {"verdict": "PASS", "coverageState": "Submitted and indexed"}}}),
            (200, {"inspectionResult": {"indexStatusResult": {"verdict": "NEUTRAL", "coverageState": "Discovered - currently not indexed"}}}),
        ]) as req:
            result = triage.inspect_sample("synthetic-token", [
                "https://drjavadrezazadeh.com/fa/",
                "https://drjavadrezazadeh.com/en/",
            ])
        self.assertEqual(result["buckets"], {"discovered_not_indexed": 1, "indexed": 1})
        self.assertEqual(req.call_count, 2)
        self.assertEqual(req.call_args_list[0].args[1], triage.API)
        self.assertEqual(req.call_args_list[0].args[2]["siteUrl"], triage.EXPECTED_PROPERTY)
        self.assertNotIn("inspectionUrl", result)

    def test_private_routes_rejected_before_google_call(self):
        with mock.patch.object(triage, "request_google") as req:
            with self.assertRaises(ValueError):
                triage.inspect_sample("synthetic-token", ["https://drjavadrezazadeh.com/api/"])
            req.assert_not_called()

    def test_wrong_github_context_fails_before_external_read(self):
        with mock.patch.dict(os.environ, {"GITHUB_REPOSITORY": "other/repo", "GITHUB_REF": triage.REF,
                                          "GITHUB_EVENT_NAME": "workflow_dispatch", "GSC_ACCESS_TOKEN": "fake"}):
            with mock.patch.object(triage, "request_google") as req:
                self.assertEqual(triage.main(), 1)
                req.assert_not_called()
