#!/usr/bin/env python3
"""Compile the exact generated Bertina PHP deploy endpoint, without uploading it."""
from pathlib import Path
import re
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
workflow = (root / '.github/workflows/deploy-bertina.yml').read_text()
gate = (root / 'scripts/bertina-private-recovery-gate.php').read_text()
assert gate.startswith('<?php\n')
marker = '          cat > "/tmp/$SCRIPT_NAME" <<PHP\n'
assert workflow.count(marker) == 1
body = workflow.split(marker, 1)[1].split('\n          PHP\n', 1)[0]
body = '\n'.join(line[10:] if line.startswith('          ') else line for line in body.splitlines())
assert body.startswith('<?php\n')
assert body.count('$RECOVERY_GATE_SOURCE') == 1
body = body.replace('$RECOVERY_GATE_SOURCE', gate.split('\n', 1)[1])
# Simulate a Bash expanding its named release/request variables; literal \$ in
# the source here-document is intentionally retained as PHP variable syntax.
body = re.sub(r'(?<!\\)\$[A-Z][A-Z0-9_]*', 'fixture', body)
body = body.replace('\\$', '$')
assert body.count('function drjrRecoveryCheck(') == 1
assert body.count('drjrRecoveryCheck(__DIR__') == 1
assert body.index('drjrRecoveryCheck(__DIR__') < body.index('->extractTo(__DIR__)')
assert "verified_private_recovery_required" in body
with tempfile.TemporaryDirectory(prefix='drjr-deploy-assembly-') as folder:
    candidate = Path(folder) / 'deploy.php'
    candidate.write_text(body)
    result = subprocess.run(['php', '-l', str(candidate)], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stdout + result.stderr
print('PASS: exact assembled PHP release endpoint compiles; pinned gate executes before extraction')
