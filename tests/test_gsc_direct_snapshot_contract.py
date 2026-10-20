"""Offline security and data-contract tests for direct GSC snapshots."""
import copy
import json
import sys
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from gsc_direct_snapshot_contract import PROPERTY, SCHEMA, SnapshotError, parse_snapshot, validate_snapshot


class DirectGscSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 10, 20, 12, 0, tzinfo=timezone.utc)
        self.sample = {
            "schema": SCHEMA, "source": "google-search-console-api-direct",
            "property": PROPERTY, "collectedAtUtc": "2026-10-20T11:00:00Z",
            "startDate": "2026-10-02", "endDate": "2026-10-16",
            "rows": [{"clicks": 3, "impressions": 30, "ctr": 0.1, "position": 4.5}],
        }

    def test_valid_snapshot_only_returns_metadata(self):
        result = parse_snapshot(json.dumps(self.sample).encode(), self.now)
        self.assertEqual(result["rows"], 1)
        self.assertNotIn("clicks", result)

    def test_wrong_property_rejected(self):
        self.sample["property"] = "sc-domain:drjavadrezazadeh.com"
        with self.assertRaises(SnapshotError):
            validate_snapshot(self.sample, self.now)

    def test_wizard_provenance_rejected(self):
        self.sample["source"] = "GSC Wizard"
        with self.assertRaises(SnapshotError):
            validate_snapshot(self.sample, self.now)

    def test_stale_rejected(self):
        self.sample["collectedAtUtc"] = "2026-10-10T11:00:00Z"
        with self.assertRaises(SnapshotError):
            validate_snapshot(self.sample, self.now)

    def test_future_rejected(self):
        self.sample["collectedAtUtc"] = "2026-10-21T11:00:00Z"
        with self.assertRaises(SnapshotError):
            validate_snapshot(self.sample, self.now)

    def test_unexpected_fields_rejected(self):
        self.sample["token"] = "synthetic"
        with self.assertRaises(SnapshotError):
            validate_snapshot(self.sample, self.now)

    def test_boolean_and_negative_metrics_rejected(self):
        for value in [True, -1, "3"]:
            sample = copy.deepcopy(self.sample)
            sample["rows"][0]["clicks"] = value
            with self.subTest(value=value), self.assertRaises(SnapshotError):
                validate_snapshot(sample, self.now)

    def test_nonfinite_metrics_rejected(self):
        for value in [float('nan'), float('inf'), float('-inf')]:
            sample = copy.deepcopy(self.sample)
            sample['rows'][0]['position'] = value
            with self.subTest(value=value), self.assertRaises(SnapshotError):
                validate_snapshot(sample, self.now)

    def test_nonstring_dates_rejected(self):
        for value in [None, 20261020, [], {}]:
            sample = copy.deepcopy(self.sample)
            sample['startDate'] = value
            with self.subTest(value=value), self.assertRaises(SnapshotError):
                validate_snapshot(sample, self.now)

    def test_ambiguous_multiple_aggregate_rows_rejected(self):
        self.sample['rows'].append(copy.deepcopy(self.sample['rows'][0]))
        with self.assertRaises(SnapshotError):
            validate_snapshot(self.sample, self.now)

    def test_oversized_rejected(self):
        with self.assertRaises(SnapshotError):
            parse_snapshot(b" " * 65537, self.now)

    def test_date_window_rejected(self):
        self.sample["endDate"] = "2026-05-01"
        with self.assertRaises(SnapshotError):
            validate_snapshot(self.sample, self.now)

    def test_invalid_ctr_rejected(self):
        self.sample["rows"][0]["ctr"] = 1.1
        with self.assertRaises(SnapshotError):
            validate_snapshot(self.sample, self.now)


if __name__ == "__main__":
    unittest.main()
