"""Offline acceptance for the actual JREI Windows console (no GPU or cloud)."""
from __future__ import annotations

from contextlib import closing

import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from jrei_service import windows_command_center as cc


class WindowsCommandCenterTests(unittest.TestCase):
    def test_local_binding_and_fixed_actions(self):
        self.assertEqual(cc.HOST, "127.0.0.1")
        self.assertEqual(cc.PORT, 8092)
        self.assertIn("seo_audit", cc.JOBS)
        self.assertIn("geo_audit", cc.JOBS)
        for _, argv, seconds in cc.JOBS.values():
            self.assertIsInstance(argv, list)
            self.assertNotIn("cmd.exe", argv)
            self.assertNotIn("powershell.exe", argv)
            self.assertGreater(seconds, 0)

    def test_news_and_database_writes_not_counterfeit(self):
        for prompt in ("امروز اخبار را منتشر کن", "publish education news"):
            result = cc.route_directive(prompt)
            self.assertEqual(result["state"], "NOT_CONNECTED")
        for prompt in ("دیتابیس را تغییر بده", "DROP SQL tables"):
            self.assertEqual(cc.route_directive(prompt)["state"], "NOT_CONNECTED")
        for prompt in ("deploy website", "git push live"):
            self.assertEqual(cc.route_directive(prompt)["state"], "NOT_CONNECTED")

    def test_owner_commands_call_registered_real_tools_only(self):
        with patch.object(cc, "run_job", return_value={"state": "PASS"}) as caller:
            for phrase, task in (
                ("سئو سایت را بررسی کن", "seo_audit"),
                ("learn from our code", "study"),
                ("اخبار امروز چطور است؟", "news_readiness"),
                ("check sitemap", "robots_audit"),
                ("بررسی کد مخزن", "source_audit"),
            ):
                self.assertEqual(cc.route_directive(phrase)["state"], "PASS")
                caller.assert_called_with(task)
            self.assertEqual(cc.route_directive("rm -rf /")["state"], "UNRECOGNIZED")
            self.assertEqual(caller.call_count, 5)

    def test_no_direct_arbitrary_executable(self):
        with self.assertRaisesRegex(ValueError, "UNREGISTERED_ACTION"):
            cc.execute("rm -rf C:\\")
        with self.assertRaisesRegex(ValueError, "UNREGISTERED_ACTION"):
            cc.execute("news_publish")

    def test_private_sqlite_events_persist_but_do_not_claim_approval(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "mission.sqlite3"
            with patch.object(cc.private_storage, "select_private_storage", return_value=Path(directory)), \
                 patch.object(cc, "PRIVATE", Path(directory)), \
                 patch.object(cc, "TOKEN_PATH", Path(directory) / "owner-token"), \
                 patch.object(cc, "DB_PATH", path):
                token_a = cc.setup()
                self.assertGreater(len(token_a), 45)
                self.assertEqual(token_a, cc.setup())
                cc.record("study", "PROPOSED_NOT_VERIFIED", "source draft, not model training")
                rows = cc.recent(5)
                self.assertEqual(rows[0]["state"], "PROPOSED_NOT_VERIFIED")
                with closing(sqlite3.connect(path)) as db:
                    self.assertEqual(db.execute("SELECT COUNT(*) FROM events").fetchone()[0], 1)

    def test_study_uses_source_anchor_and_marks_model_draft_not_verified(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            name = cc.STUDY[0]
            file = repo / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text("def learning_gap():\n    return 12*7\n", encoding="utf-8")
            with patch.object(cc, "REPO", repo), patch.object(cc, "_cycle", 0), \
                 patch.object(cc, "reply", return_value={"answer": "Test the calculation with an exact arithmetic fixture.", "model": "local-gpu"}):
                status, details = cc.study()
                self.assertEqual(status, "PROPOSED_NOT_VERIFIED")
                self.assertIn("SHA=", details)
                self.assertIn(name, details)
                self.assertNotIn("model weights trained", details)
                self.assertFalse((repo / ".git").exists())

    def assert_retired_recovery_has_no_side_effects(self, *, owner_requested=False):
        with patch.object(cc.subprocess, "run") as run, \
             patch.object(cc.subprocess, "Popen") as popen, \
             patch.object(cc, "get_json") as probe, \
             patch.object(cc, "record") as record:
            result = cc.gpu_task_recovery(owner_requested=owner_requested)
            self.assertEqual(result["state"], "RETIRED")
            self.assertIn("excluded", result["detail"])
            run.assert_not_called()
            popen.assert_not_called()
            probe.assert_not_called()
            record.assert_not_called()

    def test_gpu_recovery_never_restarts_retired_owner_task(self):
        self.assert_retired_recovery_has_no_side_effects()

    def test_gpu_recovery_cannot_be_reactivated_by_owner_request(self):
        self.assert_retired_recovery_has_no_side_effects(owner_requested=True)

    def test_gpu_recovery_never_intervenes_during_owner_mission(self):
        cc._BUSY.acquire()
        try:
            self.assert_retired_recovery_has_no_side_effects()
        finally:
            cc._BUSY.release()

    def test_unconfigured_local_backend_does_not_probe_legacy_ports(self):
        with tempfile.TemporaryDirectory() as directory, \
             patch.object(cc, "PRIVATE", Path(directory)), \
             patch.object(cc.language_backend, "_exchange") as exchange:
            self.assertEqual(cc.local_model(), (None, None))
            exchange.assert_not_called()

    def test_local_backend_uses_only_explicit_discovery_and_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory, \
             patch.object(cc, "PRIVATE", Path(directory)), \
             patch.object(cc.language_backend, "discover", side_effect=ValueError("invalid engine")) as discover:
            self.assertEqual(cc.local_model(), (None, None))
            discover.assert_called_once_with(Path(directory))

    def test_client_has_actual_tools_and_private_token_path(self):
        html = cc.render_html()
        self.assertIn("/api/chat", html)
        self.assertIn("/api/directive", html)
        self.assertIn("seo_audit", html)
        self.assertIn("token=", html)
        self.assertIn("Authorization", html)
        self.assertEqual(cc.language_backend.LEGACY_PORTS, frozenset((8081, 8082)))
        self.assertNotIn("0.0.0.0", cc.HOST)

    def test_invalid_chat_request_not_forwarded_to_model(self):
        with patch.object(cc, "local_model", return_value=("http://127.0.0.1:8095/v1/chat/completions", "jrei-native-fixture")):
            with self.assertRaises(ValueError):
                cc.reply([{"role": "system", "content": "bad"}])
            with self.assertRaises(ValueError):
                cc.reply([{"role": "user", "content": "x"*3600}])

if __name__ == "__main__":
    unittest.main()
