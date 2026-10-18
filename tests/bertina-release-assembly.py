#!/usr/bin/env python3
"""Compile the exact generated Bertina PHP deploy endpoint, without uploading it."""
from pathlib import Path
import re
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
workflow = (root / '.github/workflows/deploy-bertina.yml').read_text()
gate = (root / 'scripts/bertina-private-recovery-gate.php').read_text()
controlled = (root / 'scripts/bertina-controlled-cpanel-gate.php').read_text()
hosting = (root / 'scripts/bertina-hosting-managed-release.php').read_text()
assert gate.startswith('<?php\n') and controlled.startswith('<?php\n') and hosting.startswith('<?php\n')
marker = '          cat > "/tmp/$SCRIPT_NAME" <<PHP\n'
assert workflow.count(marker) == 1
body = workflow.split(marker, 1)[1].split('\n          PHP\n', 1)[0]
body = '\n'.join(line[10:] if line.startswith('          ') else line for line in body.splitlines())
assert body.startswith('<?php\n')
assert body.count('$HOSTING_GATE_SOURCE') == 1
assert body.count('$RECOVERY_GATE_SOURCE') == 1
assert body.count('$CONTROLLED_GATE_SOURCE') == 1
body = body.replace('$HOSTING_GATE_SOURCE', hosting.split('\n', 1)[1])
body = body.replace('$RECOVERY_GATE_SOURCE', gate.split('\n', 1)[1])
body = body.replace('$CONTROLLED_GATE_SOURCE', controlled.split('\n', 1)[1])
# Simulate a Bash expanding its named release/request variables; literal \$ in
# the source here-document is intentionally retained as PHP variable syntax.
body = re.sub(r'(?<!\\)\$[A-Z][A-Z0-9_]*', 'fixture', body)
body = body.replace('\\$', '$')
assert body.count('function drjrHostingManagedReleaseCheck(') == 1
assert body.count('function drjrRecoveryCheck(') == 1
assert body.count('function drjrCpanelBackupCheck(') == 1
assert body.count('drjrHostingManagedReleaseCheck(__DIR__') == 1
assert body.count('drjrRecoveryCheck(__DIR__') == 1
assert body.count('drjrCpanelBackupCheck(__DIR__') == 1
assert body.index('drjrHostingManagedReleaseCheck(__DIR__') < body.index('->extractTo(__DIR__)')
assert body.index('drjrRecoveryCheck(__DIR__') < body.index('->extractTo(__DIR__)')
assert body.index('drjrCpanelBackupCheck(__DIR__') < body.index('->extractTo(__DIR__)')
assert "if ('fixture'==='hosting_managed')" in body
assert "elseif ('fixture'==='signed_restore')" in body
assert "elseif ('fixture'==='owner_cpanel_custody')" in body
# Source checkout now requires Stage09's eight additive tables, authoritative
# payment uniqueness and legacy order columns. Never replace existing live
# storefront PHP until DB compatibility is observed AFTER selected recovery policy.
assert "release_policy_preflight_failed" in body
assert "backupVerifiedByRelease'=>false" in body
assert "stage09_schema_preflight_required" in body
assert body.count("stage09_schema_preflight_required") == 1
assert body.index('drjrHostingManagedReleaseCheck(__DIR__') < body.index("SHOW COLUMNS FROM commerce_orders")
assert body.index('drjrRecoveryCheck(__DIR__') < body.index("SHOW COLUMNS FROM commerce_orders")
assert body.index('drjrCpanelBackupCheck(__DIR__') < body.index("SHOW COLUMNS FROM commerce_orders")
assert body.index("SHOW COLUMNS FROM commerce_orders") < body.index("->extractTo(__DIR__)")
assert body.index("SHOW INDEX FROM commerce_payment_claims") < body.index("->extractTo(__DIR__)")
for table in [
    "commerce_book_stock", "commerce_book_reservations",
    "commerce_stock_movements", "commerce_payment_claims", "commerce_outbox",
    "commerce_service_cases", "commerce_parcels", "commerce_refund_requests",
]:
    assert table in body, f"Missing gated table: {table}"
assert "uq_payment_order" in body
assert "information_schema.TABLES" in body
assert "non_transactional_commerce_table" in body
assert "commerce_orders" in body
assert body.index("information_schema.TABLES") < body.index("->extractTo(__DIR__)")
with tempfile.TemporaryDirectory(prefix='drjr-deploy-assembly-') as folder:
    candidate = Path(folder) / 'deploy.php'
    candidate.write_text(body)
    result = subprocess.run(['php', '-l', str(candidate)], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stdout + result.stderr
assert "RECOVERY_MODE_INPUT: ${{ inputs.recovery_mode }}" in workflow
assert 'test "$GITHUB_ACTOR" = drrezazadeh65' in workflow
assert 'test "$APPROVED_COMMIT_SHA_INPUT" = "$GITHUB_SHA"' in workflow
assert "ACCEPT_UNTESTED_RESTORE_RISK_V5" in workflow
assert 'test "$GITHUB_EVENT_NAME" = workflow_dispatch' in workflow
assert "  group: bertina-production-deploy" in workflow
assert "  cancel-in-progress: false" in workflow
assert 'BERTINA_AUTO_DEPLOY_SCOPE: full' in workflow
# One-click owner-controlled release defaults; owner explicitly accepts untested backup restoration.
assert 'default: phased_live_audit' in workflow
assert 'default: hosting_managed' in workflow
assert 'default: ACCEPT_UNTESTED_RESTORE_RISK_V5' in workflow
assert 'default: I_APPROVE_GUARDED_LIVE_AUDIT_RELEASE_WITH_PDF_AND_SQL_DEFERRED' in workflow
assert 'id: owner_release' in workflow
assert 'APPROVED_COMMIT_SHA_INPUT: ${{ steps.owner_release.outputs.target_sha }}' in workflow
assert 'EXPECTED_LIVE_SHA_INPUT: ${{ steps.owner_release.outputs.live_sha }}' in workflow
assert 'test "$current" = "$GITHUB_SHA"' in workflow
assert 'test "$APPROVED_COMMIT_SHA_INPUT" = "$GITHUB_SHA"' in workflow
assert 'drjrCpanelBackupCheck(__DIR__' in body
assert "hosting_managed" in workflow
print('PASS: assembled PHP compiles; host-managed release SHA gate before extraction, FULL scope and schema/actor protections retained')
