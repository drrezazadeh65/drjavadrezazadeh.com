#!/usr/bin/env python3
"""Regression tests: temporary MariaDB bootstrap must not satisfy restore readiness."""
import importlib.util
import pathlib
import subprocess
import unittest
from unittest import mock

PATH = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'bertina-private-backup-restore.py'
spec = importlib.util.spec_from_file_location('bertina_private_backup_restore', PATH)
restore = importlib.util.module_from_spec(spec)
spec.loader.exec_module(restore)


class FinalDatabaseReadinessTests(unittest.TestCase):
    def setUp(self):
        self.db = mock.Mock(docker='docker', container='disposable-restore')

    def test_only_final_server_names_qualify(self):
        for name, accepted in [('docker-entrypoint.sh', False), ('mariadbd', True),
                               ('mysqld', True), ('bash', False), ('', False)]:
            with self.subTest(name=name), mock.patch.object(restore, 'run',
                                                              return_value=(name + '\n').encode('ascii')):
                self.assertEqual(restore.final_database_pid_one(self.db), accepted)

    def test_pid_probe_failures_are_not_readiness(self):
        with mock.patch.object(restore, 'run', side_effect=restore.CheckFailed('not_running')):
            self.assertFalse(restore.final_database_pid_one(self.db))
        with mock.patch.object(restore, 'run', side_effect=subprocess.TimeoutExpired('docker', 15)):
            self.assertFalse(restore.final_database_pid_one(self.db))

    def test_temporary_server_query_is_not_accepted(self):
        # Initial entrypoint can expose a temporary working Unix socket, but must
        # be ignored until the final mariadbd/mysqld has replaced PID 1.
        with mock.patch.object(restore, 'final_database_pid_one', side_effect=[False, True, True]), \
             mock.patch.object(restore.time, 'sleep') as sleeping:
            restore.wait_for_final_database(self.db, 5)
            self.db.one.assert_called_once_with('SELECT 1 AS ready')
            sleeping.assert_called_once_with(1)

    def test_socket_failure_retries_after_final_pid(self):
        self.db.one.side_effect = [restore.CheckFailed('isolated_database_query_failed'), {'ready': '1'}]
        with mock.patch.object(restore, 'final_database_pid_one', return_value=True), \
             mock.patch.object(restore.time, 'sleep') as sleeping:
            restore.wait_for_final_database(self.db, 5)
            self.assertEqual(self.db.one.call_count, 2)
            sleeping.assert_called_once_with(1)

    def test_non_final_server_times_out(self):
        with mock.patch.object(restore, 'final_database_pid_one', return_value=False), \
             mock.patch.object(restore.time, 'monotonic', side_effect=[100, 103]), \
             mock.patch.object(restore.time, 'sleep'):
            with self.assertRaisesRegex(restore.CheckFailed, 'isolated_database_ready_timeout'):
                restore.wait_for_final_database(self.db, 2)
        self.db.one.assert_not_called()


if __name__ == '__main__':
    unittest.main()
