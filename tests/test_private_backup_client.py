"""Local unit checks. Network is mocked; RSA keys exist only in test-process memory."""
import base64
import contextlib
import datetime
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import stat
import tempfile
from types import SimpleNamespace
import unittest
import urllib.error
from unittest import mock

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.x509.oid import NameOID


TESTS = Path(__file__).resolve().parent
SCRIPTS = TESTS.parent / 'scripts'
SPEC = importlib.util.spec_from_file_location('private_backup_client', SCRIPTS / 'bertina-private-backup-client.py')
CLIENT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CLIENT)


class Response:
    def __init__(self, data=b'{}', status=200, headers=None):
        self.data, self.status, self.headers = data, status, headers or {}

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, limit):
        return self.data[:limit]


class ClientTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
        cls.now = 1800000000
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'local-private-backup-test.invalid')])
        date = datetime.datetime.fromtimestamp(cls.now, datetime.timezone.utc)
        cls.certificate = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
                           .public_key(cls.key.public_key()).serial_number(x509.random_serial_number())
                           .not_valid_before(date - datetime.timedelta(days=1))
                           .not_valid_after(date + datetime.timedelta(days=1))
                           .sign(cls.key, hashes.SHA256()))
        cls.public = cls.certificate.public_bytes(serialization.Encoding.PEM)
        cls.request = {'schema': 'bertina-private-backup-v1', 'id': 'a' * 32,
                       'issuedAt': cls.now - 20, 'expiresAt': cls.now + 1800,
                       'publicKeyPem': cls.public.decode(), 'sourceRelease': 'b' * 40}

    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix='bertina-client-fixture-'))
        self.addCleanup(shutil.rmtree, self.root)
        # Any accidental real network attempt fails the suite, including helper code.
        network = mock.patch('socket.create_connection', side_effect=AssertionError('network_forbidden_in_local_tests'))
        network.start()
        self.addCleanup(network.stop)

    def args(self, **kwargs):
        values = {'action': 'download', 'directory': str(self.root / 'download'),
                  'timeout': 13, 'output': None, 'certification': None}
        values.update(kwargs)
        return SimpleNamespace(**values)

    def run_mocked(self, args, call):
        out = io.StringIO()
        with mock.patch.object(CLIENT, 'context', return_value=(self.request, self.key)), \
                mock.patch.object(CLIENT, 'call', side_effect=call), contextlib.redirect_stdout(out):
            CLIENT.run(args)
        return out.getvalue()

    def metadata(self, data, password=None):
        password = password if password is not None else b'c' * 64
        envelope = self.key.public_key().encrypt(password, padding.OAEP(
            mgf=padding.MGF1(hashes.SHA1()), algorithm=hashes.SHA1(), label=None))
        return {'ok': True, 'id': self.request['id'], 'envelopeAlgorithm': 'RSA-OAEP-SHA1',
                'archiveEncryption': 'ZIP-AES256-each-entry', 'archiveBytes': len(data),
                'archiveSha256': hashlib.sha256(data).hexdigest(),
                'passwordEnvelope': base64.b64encode(envelope).decode()}

    def download_call(self, data, meta=None, corrupt_chunk=False):
        meta = meta or self.metadata(data)
        def call(request, key, action, range_header='', **kwargs):
            if action == 'status':
                return 200, {}, json.dumps(meta).encode()
            self.assertEqual(action, 'download')
            start, end = map(int, range_header.removeprefix('bytes=').split('-'))
            self.assertLessEqual(end - start + 1, 8 * 1024 * 1024)
            chunk = data[start:end + 1]
            if corrupt_chunk:
                chunk = chunk[:-1]
            return 206, {'Content-Range': f'bytes {start}-{end}/{len(data)}'}, chunk
        return call

    def certification_fixture(self):
        """An explicitly synthetic receipt; no real restore or storage evidence."""
        directory = self.root / 'certification-fixture'
        directory.mkdir(mode=0o700)
        data = b'synthetic local ciphertext fixture; not a production archive'
        archive, secondary = directory / 'archive.zip', directory / 'readback.zip'
        spki = hashlib.sha256(self.key.public_key().public_bytes(
            serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)).hexdigest()
        meta = {'schema': 'bertina-private-backup-metadata-v1', 'ok': True,
                'id': self.request['id'], 'createdAt': self.now - 30,
                'archiveSha256': hashlib.sha256(data).hexdigest(), 'archiveBytes': len(data),
                'contentManifestSha256': 'c' * 64, 'databaseDefinitionSha256': 'd' * 64,
                'sourceReleaseSha': self.request['sourceRelease'], 'recipientSpkiSha256': spki,
                'sourceServiceWorkerSha256': 'e' * 64,
                'fileCount': 3, 'tableCount': 2, 'objectCount': 4}
        bound_fields = ('archiveSha256', 'archiveBytes', 'contentManifestSha256',
                        'databaseDefinitionSha256', 'sourceReleaseSha', 'sourceServiceWorkerSha256', 'fileCount', 'tableCount', 'objectCount')
        receipt = {'schema': 'bertina-private-backup-local-restore-v1',
                   'backupId': self.request['id'], 'verifiedAtEpoch': self.now - 1,
                   **{field: meta[field] for field in bound_fields},
                   'checks': {name: True for name in (
                       'databaseDefinitionsMatch', 'allRowCountsMatch', 'allRowContentHashesMatch', 'allFileHashesMatch',
                       'viewColumnMetadataMatch', 'eventSchedulerDisabled', 'networkDisabled',
                       'databaseRestoreIsolated', 'systemTimeZoneCompatible')}}
        args = self.args(request=str(directory / 'public-request.json'),
                         envelope=str(directory / 'envelope.json'), archive=str(archive),
                         secondary_copy=str(secondary), restore_receipt=str(directory / 'restore-fixture.json'),
                         output=str(directory / 'proof-fixture.json'))
        for path, value in [(archive, data), (secondary, data),
                            (Path(args.request), json.dumps(self.request).encode()),
                            (Path(args.envelope), json.dumps(meta).encode()),
                            (Path(args.restore_receipt), json.dumps(receipt).encode())]:
            CLIENT.write_private(path, value)
        return args, meta, receipt

    def certification_run(self, args):
        output = io.StringIO()
        with mock.patch.object(CLIENT.time, 'time', return_value=self.now), contextlib.redirect_stdout(output):
            CLIENT.certification(args)
        return output.getvalue()

    def replace_fixture_json(self, path, value):
        CLIENT.write_private(path, json.dumps(value).encode(), exclusive=False)

    def test_signed_call_binds_request_range_and_body(self):
        for action, range_header, body in [('download', 'bytes=2-7', None), ('certify', '', b'{"local":"fixture"}')]:
            with self.subTest(action=action):
                opener = mock.Mock()
                opener.open.return_value = Response(b'{"ok":true}')
                with mock.patch.object(CLIENT.time, 'time', return_value=self.now), \
                        mock.patch.object(CLIENT.secrets, 'token_hex', return_value='d' * 64), \
                        mock.patch.object(CLIENT.urllib.request, 'build_opener', return_value=opener):
                    status, _, response = CLIENT.call(self.request, self.key, action, range_header,
                                                     timeout=13, body=body)
                self.assertEqual((status, response), (200, b'{"ok":true}'))
                request = opener.open.call_args.args[0]
                self.assertEqual(opener.open.call_args.kwargs, {'timeout': 13})
                self.assertEqual(request.full_url, 'https://drjavadrezazadeh.com/bertina-private-backup-' + 'a' * 32 + '.php')
                headers = {k.lower(): v for k, v in request.header_items()}
                method = 'POST' if action == 'certify' else 'GET'
                self.assertEqual(request.get_method(), method)
                body_hash = hashlib.sha256(body).hexdigest() if body else ''
                canonical = '\n'.join(['bertina-private-backup-v1', 'a' * 32, method, action,
                                        str(self.now), 'd' * 64, range_header,
                                        'bertina-private-backup-' + 'a' * 32 + '.php',
                                        str(self.request['expiresAt']), body_hash]).encode()
                signature = base64.b64decode(headers['x-codex-backup-signature'], validate=True)
                self.key.public_key().verify(signature, canonical, padding.PKCS1v15(), hashes.SHA256())
                self.assertEqual(headers.get('range', ''), range_header)
                self.assertEqual(headers.get('x-codex-backup-body-sha256', ''), body_hash)
                if action == 'certify':
                    proof_signature = base64.b64decode(headers['x-codex-backup-proof-signature'], validate=True)
                    self.key.public_key().verify(proof_signature, body, padding.PKCS1v15(), hashes.SHA256())
                    self.assertEqual(request.data, body)

    def test_redirect_refused(self):
        with self.assertRaisesRegex(ValueError, '^backup_redirect_refused$'):
            CLIENT.NoRedirect().redirect_request(None, None, 302, 'Found', {}, 'https://other.invalid/')

    def test_response_limit_refused(self):
        opener = mock.Mock()
        opener.open.return_value = Response(b'x' * (16 * 1024 * 1024 + 1))
        with mock.patch.object(CLIENT.urllib.request, 'build_opener', return_value=opener), \
                self.assertRaisesRegex(ValueError, '^backup_response_limit$'):
            CLIENT.call(self.request, self.key, 'status')

    def test_server_errors_release_only_fixed_stage_codes(self):
        for error, expected in [('nonce_replayed', 'nonce_replayed'),
                                ('secret/value/token', 'backup_request_failed'),
                                ('a' * 71, 'backup_request_failed'),
                                (123, 'backup_request_failed')]:
            with self.subTest(error=error):
                opener = mock.Mock()
                opener.open.side_effect = urllib.error.HTTPError('https://local.invalid/', 503, 'failed', {},
                                                                io.BytesIO(json.dumps({'error': error}).encode()))
                with mock.patch.object(CLIENT.urllib.request, 'build_opener', return_value=opener), \
                        self.assertRaisesRegex(ValueError, '^' + expected + '$'):
                    CLIENT.call(self.request, self.key, 'status')

    def test_private_files_and_symlinks(self):
        file = self.root / 'data.bin'
        CLIENT.write_private(file, b'local fixture')
        self.assertEqual(file.stat().st_mode & 0o777, 0o600)
        self.assertEqual(CLIENT.private_file(file), file)
        with self.assertRaises(FileExistsError):
            CLIENT.write_private(file, b'replace')
        link = self.root / 'link.bin'
        link.symlink_to(file)
        with self.assertRaisesRegex(ValueError, '^private_output_symlink$'):
            CLIENT.write_private(link, b'replace', exclusive=False)
        with self.assertRaisesRegex(ValueError, '^private_file_permissions_invalid$'):
            CLIENT.private_file(link)
        file.chmod(0o644)
        with self.assertRaisesRegex(ValueError, '^private_file_permissions_invalid$'):
            CLIENT.private_file(file)
        self.assertEqual(file.read_bytes(), b'local fixture')

    def test_private_write_sync_failure_removes_unpublished_file(self):
        output = self.root / 'failed-write.json'
        with mock.patch.object(CLIENT.os, 'fsync', side_effect=OSError('synthetic sync failure')), \
                self.assertRaises(OSError):
            CLIENT.write_private(output, b'partially written local fixture')
        self.assertFalse(output.exists())
        self.assertEqual(list(self.root.iterdir()), [])

    def test_private_replacement_sync_failure_preserves_previous_file(self):
        output = self.root / 'existing-output.json'
        CLIENT.write_private(output, b'existing owner artifact')
        with mock.patch.object(CLIENT.os, 'fsync', side_effect=OSError('synthetic sync failure')), \
                self.assertRaises(OSError):
            CLIENT.write_private(output, b'failed replacement', exclusive=False)
        self.assertEqual(output.read_bytes(), b'existing owner artifact')
        self.assertEqual(list(self.root.iterdir()), [output])

    def test_download_sidecar_sync_failure_removes_all_new_artifacts(self):
        original = CLIENT.write_private
        for sidecar in ('envelope.json', 'archive-password.txt'):
            with self.subTest(sidecar=sidecar):
                args = self.args(directory=str(self.root / ('download-failure-' + sidecar)))
                def write(path, value, exclusive=True):
                    if Path(path).name == sidecar:
                        with mock.patch.object(CLIENT.os, 'fsync', side_effect=OSError('synthetic sidecar sync failure')):
                            return original(path, value, exclusive=exclusive)
                    return original(path, value, exclusive=exclusive)
                with mock.patch.object(CLIENT, 'write_private', side_effect=write), self.assertRaises(OSError):
                    self.run_mocked(args, self.download_call(b'synthetic archive'))
                self.assertEqual(list(Path(args.directory).iterdir()), [])

    def test_download_sidecar_directory_sync_failure_removes_all_new_artifacts(self):
        original_write = CLIENT.write_private
        original_sync = CLIENT.os.fsync
        for sidecar in ('envelope.json', 'archive-password.txt'):
            with self.subTest(sidecar=sidecar):
                args = self.args(directory=str(self.root / ('directory-sync-failure-' + sidecar)))
                def sync(fd):
                    if stat.S_ISDIR(os.fstat(fd).st_mode):
                        raise OSError('synthetic directory sync failure')
                    return original_sync(fd)
                def write(path, value, exclusive=True):
                    if Path(path).name == sidecar:
                        with mock.patch.object(CLIENT.os, 'fsync', side_effect=sync):
                            return original_write(path, value, exclusive=exclusive)
                    return original_write(path, value, exclusive=exclusive)
                with mock.patch.object(CLIENT, 'write_private', side_effect=write), self.assertRaises(OSError):
                    self.run_mocked(args, self.download_call(b'synthetic archive'))
                self.assertEqual(list(Path(args.directory).iterdir()), [])

    def test_download_multiple_chunks_and_private_artifacts(self):
        data = b'x' * (8 * 1024 * 1024) + b'end'
        args = self.args()
        output = self.run_mocked(args, self.download_call(data))
        directory = Path(args.directory)
        archive = directory / ('bertina-private-backup-' + 'a' * 32 + '.zip')
        self.assertEqual(archive.read_bytes(), data)
        for file in (archive, directory / 'envelope.json', directory / 'archive-password.txt'):
            self.assertEqual(file.stat().st_mode & 0o777, 0o600)
        self.assertEqual(directory.stat().st_mode & 0o777, 0o700)
        self.assertEqual((directory / 'archive-password.txt').read_bytes(), b'c' * 64 + b'\n')
        reported = json.loads(output)
        self.assertTrue(reported['encryptedArchiveVerified'])
        self.assertFalse(reported['restoreTested'])
        self.assertNotIn('passwordEnvelope', reported)
        self.assertNotIn('c' * 64, output)

    def test_short_download_removes_partial_archive(self):
        args = self.args()
        with self.assertRaisesRegex(ValueError, '^backup_chunk_mismatch$'):
            self.run_mocked(args, self.download_call(b'synthetic archive', corrupt_chunk=True))
        self.assertEqual(list(Path(args.directory).iterdir()), [])

    def test_checksum_failure_removes_downloaded_archive(self):
        args = self.args()
        data = b'synthetic archive'
        meta = self.metadata(data)
        meta['archiveSha256'] = 'f' * 64
        with self.assertRaisesRegex(ValueError, '^backup_checksum_mismatch$'):
            self.run_mocked(args, self.download_call(data, meta))
        self.assertEqual(list(Path(args.directory).iterdir()), [])

    def test_invalid_password_removes_downloaded_archive(self):
        args = self.args()
        data = b'synthetic archive'
        with self.assertRaisesRegex(ValueError, '^backup_password_invalid$'):
            self.run_mocked(args, self.download_call(data, self.metadata(data, b'not valid')))
        self.assertEqual(list(Path(args.directory).iterdir()), [])

    def test_existing_archive_is_preserved(self):
        args = self.args()
        directory = Path(args.directory)
        directory.mkdir(mode=0o700)
        archive = directory / ('bertina-private-backup-' + 'a' * 32 + '.zip')
        archive.write_bytes(b'existing owner artifact')
        with self.assertRaises(FileExistsError):
            self.run_mocked(args, self.download_call(b'new synthetic archive'))
        self.assertEqual(archive.read_bytes(), b'existing owner artifact')

    def test_existing_sidecars_are_preserved_on_download_refusal(self):
        for sidecar in ('envelope.json', 'archive-password.txt'):
            with self.subTest(sidecar=sidecar):
                args = self.args(directory=str(self.root / ('existing-sidecar-' + sidecar)))
                directory = Path(args.directory)
                directory.mkdir(mode=0o700)
                existing = directory / sidecar
                CLIENT.write_private(existing, b'existing owner artifact')
                with self.assertRaisesRegex(ValueError, '^private_output_already_exists$'):
                    self.run_mocked(args, self.download_call(b'synthetic archive'))
                self.assertEqual(existing.read_bytes(), b'existing owner artifact')
                self.assertEqual(list(directory.iterdir()), [existing])

    def test_nonprivate_download_directory_refused(self):
        args = self.args()
        directory = Path(args.directory)
        directory.mkdir(mode=0o755)
        directory.chmod(0o755)
        with self.assertRaisesRegex(ValueError, '^private_directory_permissions_invalid$'):
            self.run_mocked(args, self.download_call(b'synthetic archive'))
        self.assertEqual(list(directory.iterdir()), [])

    def test_render_refuses_expired_and_overlong_requests(self):
        for change in [{'expiresAt': self.now}, {'issuedAt': self.now + 31, 'expiresAt': self.now + 100},
                       {'expiresAt': self.request['issuedAt'] + 3601}]:
            with self.subTest(change=change):
                request = dict(self.request, **change)
                request_file = self.root / 'request.json'
                request_file.write_text(json.dumps(request))
                args = self.args(request=str(request_file),
                                 template=str(SCRIPTS / 'bertina-private-backup-template.php'))
                with mock.patch.object(CLIENT.time, 'time', return_value=self.now), \
                        self.assertRaisesRegex(ValueError, '^request_expired$'):
                    CLIENT.render(args)
                self.assertFalse(Path(args.directory).exists())

    def test_request_pins_source_release_without_private_key(self):
        public_file = self.root / 'public-certificate.pem'
        public_file.write_bytes(self.public)
        output_file = self.root / 'request-output.json'
        args = self.args(public_key=str(public_file), source_release='b' * 40,
                         ttl=600, output=str(output_file))
        with mock.patch.object(CLIENT.time, 'time', return_value=self.now), \
                contextlib.redirect_stdout(io.StringIO()):
            CLIENT.request(args)
        value = json.loads(output_file.read_text())
        self.assertEqual(value['sourceRelease'], 'b' * 40)
        self.assertEqual(value['expiresAt'] - value['issuedAt'], 600)
        self.assertEqual(value['publicKeyPem'], self.public.decode())
        self.assertNotIn('PRIVATE KEY', output_file.read_text())
        self.assertEqual(output_file.stat().st_mode & 0o777, 0o600)
        args.source_release = 'main'
        with self.assertRaisesRegex(ValueError, '^source_release_invalid$'):
            CLIENT.request(args)

    def test_certify_reads_only_private_proof_and_prints_safe_receipt(self):
        proof_file = self.root / 'proof.json'
        CLIENT.write_private(proof_file, b'{"local":"synthetic proof"}')
        args = self.args(action='certify', certification=str(proof_file))
        def call(request, key, action, **kwargs):
            self.assertEqual(action, 'certify')
            self.assertEqual(kwargs['body'], proof_file.read_bytes())
            return 200, {}, b'{"ok":true,"certificationRecorded":true,"backupId":"local","passwordEnvelope":"hidden"}'
        value = json.loads(self.run_mocked(args, call))
        self.assertTrue(value['certificationRecorded'])
        self.assertNotIn('passwordEnvelope', value)
        proof_file.chmod(0o644)
        with self.assertRaisesRegex(ValueError, '^private_file_permissions_invalid$'):
            self.run_mocked(args, call)

    def test_certification_builder_accepts_bound_synthetic_fixture(self):
        args, meta, receipt = self.certification_fixture()
        reported = json.loads(self.certification_run(args))
        proof = json.loads(Path(args.output).read_text())
        self.assertEqual(set(proof), {'schema', 'backupId', 'recipientSpkiSha256', 'sourceRelease',
                                     'createdAtEpoch', 'certifiedAtEpoch', 'expiresAtEpoch',
                                     'encryptedSnapshotSha256', 'encryptedSnapshotBytes',
                                     'isolatedRestoreVerified', 'secondaryCiphertextReadbackVerified',
                                     'secondaryCiphertextSha256'})
        self.assertEqual(proof['schema'], 'bertina-private-backup-restore-proof-v1')
        self.assertEqual(proof['backupId'], self.request['id'])
        self.assertEqual(proof['recipientSpkiSha256'], meta['recipientSpkiSha256'])
        self.assertEqual(proof['sourceRelease'], self.request['sourceRelease'])
        self.assertEqual(proof['createdAtEpoch'], meta['createdAt'])
        self.assertEqual(proof['certifiedAtEpoch'], self.now)
        self.assertEqual(proof['expiresAtEpoch'], meta['createdAt'] + 21600)
        self.assertEqual(proof['encryptedSnapshotSha256'], meta['archiveSha256'])
        self.assertEqual(proof['secondaryCiphertextSha256'], meta['archiveSha256'])
        self.assertEqual(proof['encryptedSnapshotBytes'], meta['archiveBytes'])
        self.assertIs(proof['isolatedRestoreVerified'], True)
        self.assertIs(proof['secondaryCiphertextReadbackVerified'], True)
        self.assertEqual(Path(args.output).stat().st_mode & 0o777, 0o600)
        self.assertTrue(reported['proofPrepared'])
        self.assertNotIn('checks', reported)

    def test_certification_builder_requires_distinct_copy_file(self):
        args, _, _ = self.certification_fixture()
        original = args.secondary_copy
        args.secondary_copy = args.archive
        with self.assertRaisesRegex(ValueError, '^independent_copy_required$'):
            self.certification_run(args)
        self.assertFalse(Path(args.output).exists())
        Path(original).unlink()
        os.link(args.archive, original)
        args.secondary_copy = original
        with self.assertRaisesRegex(ValueError, '^independent_copy_required$'):
            self.certification_run(args)
        self.assertFalse(Path(args.output).exists())

    def test_certification_builder_rejects_corrupted_copy(self):
        args, _, _ = self.certification_fixture()
        secondary = Path(args.secondary_copy)
        original = secondary.read_bytes()
        for changed in (b'X' + original[1:], original[:-1]):
            with self.subTest(size=len(changed)):
                CLIENT.write_private(secondary, changed, exclusive=False)
                with self.assertRaisesRegex(ValueError, '^independent_copy_checksum_mismatch$'):
                    self.certification_run(args)
                self.assertFalse(Path(args.output).exists())

    def test_certification_builder_requires_all_exact_true_restore_checks(self):
        args, _, receipt = self.certification_fixture()
        valid_checks = receipt['checks']
        changes = [None, {}, {k: v for k, v in valid_checks.items() if k != 'allRowCountsMatch'},
                   {k: v for k, v in valid_checks.items() if k != 'allRowContentHashesMatch'},
                   dict(valid_checks, allRowCountsMatch=False), dict(valid_checks, allRowCountsMatch=1),
                   dict(valid_checks, allRowContentHashesMatch=False), dict(valid_checks, allRowContentHashesMatch=1),
                   dict(valid_checks, unrecognizedCheck=True)]
        for checks in changes:
            with self.subTest(checks=checks):
                invalid = dict(receipt, checks=checks)
                self.replace_fixture_json(args.restore_receipt, invalid)
                with self.assertRaisesRegex(ValueError, '^isolated_restore_evidence_invalid$'):
                    self.certification_run(args)
                self.assertFalse(Path(args.output).exists())

    def test_certification_builder_requires_matching_bound_receipt_fields(self):
        args, _, receipt = self.certification_fixture()
        fields = ('archiveSha256', 'archiveBytes', 'contentManifestSha256', 'databaseDefinitionSha256',
                  'sourceReleaseSha', 'sourceServiceWorkerSha256', 'fileCount', 'tableCount', 'objectCount')
        for field in fields:
            with self.subTest(field=field):
                previous = receipt[field]
                changed = previous + 1 if isinstance(previous, int) else 'f' * len(previous)
                self.replace_fixture_json(args.restore_receipt, dict(receipt, **{field: changed}))
                with self.assertRaisesRegex(ValueError, '^isolated_restore_evidence_mismatch$'):
                    self.certification_run(args)
                self.assertFalse(Path(args.output).exists())

    def test_certification_builder_requires_matching_archive_metadata(self):
        args, meta, receipt = self.certification_fixture()
        for field, changed in [('archiveSha256', 'f' * 64), ('archiveBytes', meta['archiveBytes'] + 1)]:
            with self.subTest(field=field):
                self.replace_fixture_json(args.envelope, dict(meta, **{field: changed}))
                self.replace_fixture_json(args.restore_receipt, dict(receipt, **{field: changed}))
                with self.assertRaisesRegex(ValueError, '^independent_copy_checksum_mismatch$'):
                    self.certification_run(args)
                self.assertFalse(Path(args.output).exists())

    def test_certification_builder_requires_pinned_source_and_recipient(self):
        args, meta, receipt = self.certification_fixture()
        for field, changed in [('sourceReleaseSha', 'f' * 40), ('id', 'f' * 32),
                               ('recipientSpkiSha256', 'f' * 64)]:
            with self.subTest(field=field):
                self.replace_fixture_json(args.envelope, dict(meta, **{field: changed}))
                adjusted_receipt = dict(receipt)
                if field == 'sourceReleaseSha':
                    adjusted_receipt[field] = changed
                self.replace_fixture_json(args.restore_receipt, adjusted_receipt)
                with self.assertRaisesRegex(ValueError, '^certification_source_invalid$'):
                    self.certification_run(args)
                self.assertFalse(Path(args.output).exists())
        self.replace_fixture_json(args.envelope, meta)
        self.replace_fixture_json(args.restore_receipt, dict(receipt, backupId='f' * 32))
        with self.assertRaisesRegex(ValueError, '^certification_source_invalid$'):
            self.certification_run(args)
        self.assertFalse(Path(args.output).exists())

    def test_certification_builder_rejects_wrong_times_and_types(self):
        args, meta, receipt = self.certification_fixture()
        cases = [({'createdAt': str(meta['createdAt'])}, {}), ({'createdAt': float(meta['createdAt'])}, {}),
                 ({'createdAt': True}, {}), ({}, {'verifiedAtEpoch': True}),
                 ({}, {'verifiedAtEpoch': meta['createdAt'] - 1}), ({}, {'verifiedAtEpoch': self.now + 1}),
                 ({'createdAt': self.now - 21600}, {})]
        for meta_change, receipt_change in cases:
            with self.subTest(meta=meta_change, receipt=receipt_change):
                self.replace_fixture_json(args.envelope, dict(meta, **meta_change))
                self.replace_fixture_json(args.restore_receipt, dict(receipt, **receipt_change))
                with self.assertRaisesRegex(ValueError, '^certification_time_invalid$'):
                    self.certification_run(args)
                self.assertFalse(Path(args.output).exists())

    def test_certification_builder_preserves_existing_output(self):
        args, _, _ = self.certification_fixture()
        CLIENT.write_private(args.output, b'existing owner artifact')
        with self.assertRaises(FileExistsError):
            self.certification_run(args)
        self.assertEqual(Path(args.output).read_bytes(), b'existing owner artifact')

    def test_render_includes_only_public_request_and_private_mode(self):
        request_file = self.root / 'request.json'
        request_file.write_text(json.dumps(self.request))
        args = self.args(request=str(request_file), template=str(SCRIPTS / 'bertina-private-backup-template.php'))
        with mock.patch.object(CLIENT.time, 'time', return_value=self.now), contextlib.redirect_stdout(io.StringIO()):
            CLIENT.render(args)
        helper = Path(args.directory) / ('bertina-private-backup-' + 'a' * 32 + '.php')
        text = helper.read_text()
        self.assertNotIn('__CODEX_BACKUP_REQUEST_BASE64__', text)
        self.assertNotIn('PRIVATE KEY', text)
        self.assertEqual(helper.stat().st_mode & 0o777, 0o600)

    def test_public_key_rejects_wrong_size_and_kind(self):
        smaller = rsa.generate_private_key(public_exponent=65537, key_size=2048).public_key()
        pem = smaller.public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        with self.assertRaisesRegex(ValueError, '^request_key_invalid$'):
            CLIENT.load_public(pem)
        self.assertEqual(CLIENT.load_public(self.public).public_numbers(), self.key.public_key().public_numbers())


if __name__ == '__main__':
    unittest.main(verbosity=2)
