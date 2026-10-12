#!/usr/bin/env python3
"""Owner-local signed retrieval. Never run with an owner private key in GitHub Actions."""
import argparse
import base64
import hashlib
import json
import os
import secrets
import ssl
import stat
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa


def private_file(path):
    p = Path(path)
    info = p.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.geteuid() or info.st_mode & 0o077:
        raise ValueError('private_file_permissions_invalid')
    return p


def write_private(path, value, exclusive=True):
    p = Path(path)
    p.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    if p.is_symlink():
        raise ValueError('private_output_symlink')
    tmp = p.parent / ('.' + p.name + '.pending-' + secrets.token_hex(8))
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    published = False
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(value)
            f.flush()
            os.fsync(f.fileno())
        if exclusive:
            os.link(tmp, p, follow_symlinks=False)
        else:
            os.replace(tmp, p)
        published = True
        directory_fd = os.open(p.parent, os.O_RDONLY | os.O_DIRECTORY)
        try:
            os.fsync(directory_fd)
        finally:
            os.close(directory_fd)
        return p
    except Exception:
        if exclusive and published:
            p.unlink(missing_ok=True)
        raise
    finally:
        tmp.unlink(missing_ok=True)


def load_public(pem):
    key = x509.load_pem_x509_certificate(pem).public_key() if b'BEGIN CERTIFICATE' in pem else serialization.load_pem_public_key(pem)
    if not isinstance(key, rsa.RSAPublicKey) or key.key_size != 4096:
        raise ValueError('request_key_invalid')
    return key


def request(args):
    if len(args.source_release) != 40 or any(c not in '0123456789abcdef' for c in args.source_release):
        raise ValueError('source_release_invalid')
    public = Path(args.public_key).read_bytes()
    load_public(public)
    at = int(time.time())
    body = {'schema': 'bertina-private-backup-v1', 'id': secrets.token_hex(16),
            'issuedAt': at, 'expiresAt': at + args.ttl, 'sourceRelease': args.source_release, 'publicKeyPem': public.decode('ascii')}
    write_private(args.output, (json.dumps(body, indent=2) + '\n').encode())
    print(json.dumps({'ok': True, 'requestId': body['id'], 'expiresAt': body['expiresAt'], 'privateKeyStoredInGitHub': False}))


def render(args):
    r = json.loads(Path(args.request).read_text())
    load_public(r['publicKeyPem'].encode())
    if r['schema'] != 'bertina-private-backup-v1' or not isinstance(r['id'], str) or len(r['id']) != 32 or any(c not in '0123456789abcdef' for c in r['id']):
        raise ValueError('request_invalid')
    if not isinstance(r['issuedAt'], int) or not isinstance(r['expiresAt'], int) or not 1 <= r['expiresAt'] - r['issuedAt'] <= 3600 or not r['issuedAt'] - 30 <= time.time() < r['expiresAt']:
        raise ValueError('request_expired')
    template = Path(args.template).read_text()
    marker = '__CODEX_BACKUP_REQUEST_BASE64__'
    if template.count(marker) != 1:
        raise ValueError('template_marker_invalid')
    text = template.replace(marker, base64.b64encode(json.dumps(r, separators=(',', ':')).encode()).decode())
    directory = Path(args.directory)
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    p = write_private(directory / ('bertina-private-backup-' + r['id'] + '.php'), text.encode())
    print(p.name)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('backup_redirect_refused')


def context(args):
    r = json.loads(Path(args.request).read_text())
    public = load_public(r['publicKeyPem'].encode())
    password = private_file(args.key_password_file).read_bytes().rstrip(b'\r\n') if args.key_password_file else None
    key = serialization.load_pem_private_key(private_file(args.key).read_bytes(), password=password)
    if not isinstance(key, rsa.RSAPrivateKey) or key.key_size != 4096 or key.public_key().public_numbers() != public.public_numbers():
        raise ValueError('request_key_mismatch')
    if not r['issuedAt'] - 30 <= time.time() < r['expiresAt']:
        raise ValueError('request_expired')
    return r, key


def call(r, key, action, range_header='', timeout=60, body=None):
    method = 'POST' if action in ('create', 'retire', 'certify') else 'GET'
    at = str(int(time.time()))
    nonce = secrets.token_hex(32)
    name = 'bertina-private-backup-' + r['id'] + '.php'
    body_hash = hashlib.sha256(body).hexdigest() if action == 'certify' and body is not None else ''
    canonical = '\n'.join(['bertina-private-backup-v1', r['id'], method, action, at, nonce, range_header, name, str(r['expiresAt']), body_hash]).encode()
    signature = key.sign(canonical, padding.PKCS1v15(), hashes.SHA256())
    headers = {'X-Codex-Backup-Action': action, 'X-Codex-Backup-Time': at, 'X-Codex-Backup-Nonce': nonce,
               'X-Codex-Backup-Signature': base64.b64encode(signature).decode(), 'Cache-Control': 'no-store'}
    if range_header:
        headers['Range'] = range_header
    if body_hash:
        headers['X-Codex-Backup-Body-Sha256'] = body_hash
        headers['Content-Type'] = 'application/json'
        headers['X-Codex-Backup-Proof-Signature'] = base64.b64encode(key.sign(body, padding.PKCS1v15(), hashes.SHA256())).decode()
    req = urllib.request.Request('https://drjavadrezazadeh.com/' + name, data=(body or b'') if method == 'POST' else None, headers=headers, method=method)
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ssl.create_default_context()), NoRedirect())
    try:
        with opener.open(req, timeout=timeout) as response:
            body = response.read(16 * 1024 * 1024 + 1)
            if len(body) > 16 * 1024 * 1024:
                raise ValueError('backup_response_limit')
            return response.status, response.headers, body
    except urllib.error.HTTPError as e:
        # Only a fixed, nonsecret stage code can escape the private response.
        try:
            value = json.loads(e.read(2048))
            code = value.get('error', 'backup_request_failed')
            if not isinstance(code, str) or len(code) > 70 or any(c not in 'abcdefghijklmnopqrstuvwxyz_' for c in code):
                code = 'backup_request_failed'
        except Exception:
            code = 'backup_request_failed'
        raise ValueError(code) from None


def run(args):
    r, key = context(args)
    if args.action in ('create', 'status', 'retire', 'certify'):
        body = private_file(args.certification).read_bytes() if args.action == 'certify' and args.certification else None
        if args.action == 'certify' and (body is None or len(body) > 16384):
            raise ValueError('certification_body_invalid')
        status, _, raw = call(r, key, args.action, timeout=args.timeout, body=body)
        value = json.loads(raw)
        if args.output:
            write_private(args.output, raw, exclusive=False)
        safe = {k: value[k] for k in ('ok', 'status', 'id', 'archiveBytes', 'archiveSha256', 'fileCount', 'tableCount', 'objectCount', 'consistentSnapshot', 'metadataComplete', 'retired', 'privateBackupRetained', 'certificationRecorded', 'backupId') if k in value}
        safe['httpStatus'] = status
        print(json.dumps(safe))
        return
    _, _, raw = call(r, key, 'status', timeout=args.timeout)
    value = json.loads(raw)
    if value.get('ok') is not True or value.get('id') != r['id'] or value.get('envelopeAlgorithm') != 'RSA-OAEP-SHA1' or value.get('archiveEncryption') != 'ZIP-AES256-each-entry':
        raise ValueError('backup_not_complete')
    size = value.get('archiveBytes')
    digest = value.get('archiveSha256')
    if not isinstance(size, int) or not 1 <= size <= 2 * 1024 ** 3 or not isinstance(digest, str) or len(digest) != 64:
        raise ValueError('backup_metadata_invalid')
    directory = Path(args.directory)
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if directory.is_symlink() or directory.stat().st_mode & 0o077:
        raise ValueError('private_directory_permissions_invalid')
    archive = directory / ('bertina-private-backup-' + r['id'] + '.zip')
    fd = os.open(archive, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    hasher = hashlib.sha256()
    complete = False
    published = []
    for sidecar in ('envelope.json', 'archive-password.txt'):
        if (directory / sidecar).exists() or (directory / sidecar).is_symlink():
            os.close(fd)
            archive.unlink()
            raise ValueError('private_output_already_exists')
    try:
        with os.fdopen(fd, 'wb') as f:
            chunk_size = 8 * 1024 * 1024
            for start in range(0, size, chunk_size):
                end = min(size, start + chunk_size) - 1
                status, headers, data = call(r, key, 'download', 'bytes=' + str(start) + '-' + str(end), timeout=args.timeout)
                if status != 206 or headers.get('Content-Range') != 'bytes ' + str(start) + '-' + str(end) + '/' + str(size) or len(data) != end - start + 1:
                    raise ValueError('backup_chunk_mismatch')
                f.write(data)
                hasher.update(data)
            f.flush()
            os.fsync(f.fileno())
        if not secrets.compare_digest(hasher.hexdigest(), digest):
            raise ValueError('backup_checksum_mismatch')
        envelope = base64.b64decode(value['passwordEnvelope'], validate=True)
        password = key.decrypt(envelope, padding.OAEP(mgf=padding.MGF1(hashes.SHA1()), algorithm=hashes.SHA1(), label=None))
        if len(password) != 64 or any(c not in b'0123456789abcdef' for c in password):
            raise ValueError('backup_password_invalid')
        published.append(write_private(directory / 'envelope.json', raw))
        published.append(write_private(directory / 'archive-password.txt', password + b'\n'))
        complete = True
        print(json.dumps({'ok': True, 'encryptedArchiveVerified': True, 'archiveBytes': size, 'archiveSha256': digest, 'restoreTested': False}))
    finally:
        if not complete:
            for sidecar in published:
                sidecar.unlink(missing_ok=True)
            archive.unlink(missing_ok=True)


def digest_file(path):
    p = private_file(path)
    digest = hashlib.sha256()
    size = 0
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            size += len(chunk)
            if size > 2 * 1024 ** 3:
                raise ValueError('backup_size_limit')
            digest.update(chunk)
    return size, digest.hexdigest()


def certification(args):
    request_value = json.loads(Path(args.request).read_text())
    meta = json.loads(private_file(args.envelope).read_text())
    restore = json.loads(private_file(args.restore_receipt).read_text())
    public = load_public(request_value['publicKeyPem'].encode())
    spki = hashlib.sha256(public.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)).hexdigest()
    size, digest = digest_file(args.archive)
    copy_size, copy_digest = digest_file(args.secondary_copy)
    if Path(args.archive).resolve() == Path(args.secondary_copy).resolve() or os.path.samefile(args.archive, args.secondary_copy):
        raise ValueError('independent_copy_required')
    if (size, digest) != (copy_size, copy_digest) or size != meta.get('archiveBytes') or digest != meta.get('archiveSha256'):
        raise ValueError('independent_copy_checksum_mismatch')
    required_checks = {'databaseDefinitionsMatch', 'allRowCountsMatch', 'allRowContentHashesMatch', 'allFileHashesMatch', 'viewColumnMetadataMatch',
                       'eventSchedulerDisabled', 'networkDisabled', 'databaseRestoreIsolated', 'systemTimeZoneCompatible'}
    checks = restore.get('checks')
    if restore.get('schema') != 'bertina-private-backup-local-restore-v1' or not isinstance(checks, dict) or set(checks) != required_checks or any(value is not True for value in checks.values()):
        raise ValueError('isolated_restore_evidence_invalid')
    for key in ('archiveSha256', 'archiveBytes', 'contentManifestSha256', 'databaseDefinitionSha256', 'sourceReleaseSha', 'sourceServiceWorkerSha256', 'fileCount', 'tableCount', 'objectCount'):
        if restore.get(key) != meta.get(key):
            raise ValueError('isolated_restore_evidence_mismatch')
    if restore.get('backupId') != request_value.get('id') or meta.get('id') != request_value.get('id') or meta.get('sourceReleaseSha') != request_value.get('sourceRelease') or meta.get('recipientSpkiSha256') != spki:
        raise ValueError('certification_source_invalid')
    now = int(time.time())
    created = meta.get('createdAt')
    verified = restore.get('verifiedAtEpoch')
    if type(created) is not int or type(verified) is not int or not created <= verified <= now or now >= created + 21600:
        raise ValueError('certification_time_invalid')
    proof = {'schema': 'bertina-private-backup-restore-proof-v1', 'backupId': request_value['id'],
             'recipientSpkiSha256': spki, 'sourceRelease': request_value['sourceRelease'], 'createdAtEpoch': created,
             'certifiedAtEpoch': now, 'expiresAtEpoch': created + 21600, 'encryptedSnapshotSha256': digest,
             'encryptedSnapshotBytes': size, 'isolatedRestoreVerified': True,
             'secondaryCiphertextReadbackVerified': True, 'secondaryCiphertextSha256': copy_digest}
    write_private(args.output, json.dumps(proof, separators=(',', ':')).encode())
    print(json.dumps({'ok': True, 'proofPrepared': True, 'backupId': request_value['id'], 'archiveSha256': digest}))

def main():
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    p = commands.add_parser('request')
    p.add_argument('--public-key', required=True)
    p.add_argument('--source-release', required=True)
    p.add_argument('--ttl', type=int, choices=range(60, 3601), default=3600)
    p.add_argument('--output', required=True)
    p.set_defaults(func=request)
    p = commands.add_parser('render')
    p.add_argument('--request', required=True)
    p.add_argument('--template', required=True)
    p.add_argument('--directory', required=True)
    p.set_defaults(func=render)
    p = commands.add_parser('certification')
    p.add_argument('--request', required=True)
    p.add_argument('--envelope', required=True)
    p.add_argument('--archive', required=True)
    p.add_argument('--secondary-copy', required=True, help='Actual private Drive ciphertext download, separate local file')
    p.add_argument('--restore-receipt', required=True)
    p.add_argument('--output', required=True)
    p.set_defaults(func=certification)
    p = commands.add_parser('run')
    p.add_argument('action', choices=('create', 'status', 'download', 'retire', 'certify'))
    p.add_argument('--request', required=True)
    p.add_argument('--key', required=True)
    p.add_argument('--key-password-file')
    p.add_argument('--timeout', type=int, default=60)
    p.add_argument('--output')
    p.add_argument('--certification')
    p.add_argument('--directory', default='private-backup')
    p.set_defaults(func=run)
    args = parser.parse_args()
    try:
        args.func(args)
    except Exception as e:
        code = str(e)
        if not code or len(code) > 70 or any(c not in 'abcdefghijklmnopqrstuvwxyz_' for c in code):
            code = 'private_backup_failed'
        print(json.dumps({'ok': False, 'error': code}), file=sys.stderr)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
