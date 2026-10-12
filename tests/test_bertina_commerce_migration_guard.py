#!/usr/bin/env python3
"""Offline, no-network proof that the one-time commerce migration fails closed.

Never connects to Bertina or a database. Runs the actual assembled PHP in an
empty fake public_html tree, with a canary for an accidental config/DB access.
"""
import base64
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import textwrap

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = (ROOT / '.github/workflows/bertina-commerce-schema-migrate.yml').read_text()
GUARD = (ROOT / 'scripts/bertina-private-recovery-gate.php').read_text()
PUBLIC_REQUEST = (ROOT / '.bertina-backup-trigger').read_bytes()

assert "workflow_dispatch:" in WORKFLOW
RELEASE = (ROOT / '.github/workflows/deploy-bertina.yml').read_text()
for source in [WORKFLOW, RELEASE]:
    assert '  group: bertina-production-deploy' in source, (
        'A commerce migration and a production release must share one environment concurrency group'
    )
    assert '  cancel-in-progress: false' in source, 'Never cancel an in-flight production mutation'
assert "confirmation:" in WORKFLOW and "AUTHORIZE_AFTER_SIGNED_RESTORE" in WORKFLOW
assert "expected_source_sha:" in WORKFLOW and "expected_live_sha:" in WORKFLOW
assert 'test "$EXPECTED_SOURCE" = "$GITHUB_SHA"' in WORKFLOW
assert 'test "$live" = "$EXPECTED_LIVE"' in WORKFLOW
assert "drjrRecoveryCheck(dirname(__DIR__)" in WORKFLOW
assert "verified_private_recovery_required" in WORKFLOW
assert "curl -k" not in WORKFLOW, 'Migrations must use trusted HTTPS'
assert WORKFLOW.count('git ls-remote origin refs/heads/migration/bertina-linux6') >= 3
assert '  push:' not in WORKFLOW and '  schedule:' not in WORKFLOW, 'No unattended schema changes'

match = re.search(
    r'(?ms)^          cat > "/tmp/\$\{SCRIPT_NAME\}" <<\'PHP\'\n(.*?)^          PHP\s*$',
    WORKFLOW,
)
assert match, 'Unable to find migration PHP heredoc'
script = textwrap.dedent(match.group(1))
assert script.startswith('<?php\n')
assert script.index("drjrRecoveryCheck(dirname(__DIR__)") < script.index(
    "require __DIR__.'/config.local.php'"
), 'Private signed restore must run before any database access'
assert '__PINNED_RECOVERY_GATE__' in script
assert '__RECOVERY_REQUEST_B64__' in script
assert 'ALTER TABLE commerce_orders' in script

token = 'offline-migration-unit-token'
script = script.replace('__TOKEN_HASH__', hashlib.sha256(token.encode()).hexdigest())
script = script.replace('__PINNED_RECOVERY_GATE__', GUARD.removeprefix('<?php').lstrip('\n'))
script = script.replace('__RECOVERY_REQUEST_B64__', base64.b64encode(PUBLIC_REQUEST).decode('ascii'))
assert '__PINNED_RECOVERY_GATE__' not in script
assert '__RECOVERY_REQUEST_B64__' not in script

with tempfile.TemporaryDirectory(prefix='jr-commerce-guard-') as name:
    site = Path(name) / 'public_html'
    api = site / 'api'
    api.mkdir(parents=True, exist_ok=True)
    migration = api / 'commerce-schema-offline-test.php'
    migration.write_text(script)
    marker = Path(name) / 'DANGEROUS_CONFIG_READ'
    # If the signed recovery guard is bypassed, even loading config sets the marker.
    (api / 'config.local.php').write_text(
        "<?php file_put_contents("
        + json.dumps(str(marker))
        + ", 'unacceptable'); return [];"
    )

    lint = subprocess.run(['php', '-l', str(migration)], text=True,
                          capture_output=True, timeout=15, check=False)
    assert lint.returncode == 0, lint.stdout + lint.stderr
    php = '$_SERVER["HTTP_X_MIGRATION_TOKEN"]=' + json.dumps(token) + (
        '; require ' + json.dumps(str(migration)) + ';'
    )
    result = subprocess.run(['php', '-r', php], text=True, capture_output=True,
                            timeout=15, check=False)
    assert result.returncode == 0, result.stdout + result.stderr
    assert not marker.exists(), 'Recovery gate permitted loading private DB config'
    assert not migration.exists(), 'Rejected one-time endpoint did not self-remove'
    payload = json.loads(result.stdout.strip())
    assert payload == {'ok': False, 'error': 'verified_private_recovery_required'}, payload

print('PASS: migration assembly compiles and rejects absent private signed restore before config/SQL.')
