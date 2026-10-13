#!/usr/bin/env python3
"""Render temporary token-gated PHP on GitHub runner; never handle private config."""
import argparse,re,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--digest',required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
assert re.fullmatch(r'[a-f0-9]{64}',args.digest)
src=(root/'scripts/bertina-owner-admin-reuse-template.php').read_text()
assert src.count('__JR_REUSE_TOKEN_HASH__')==1
src=src.replace('__JR_REUSE_TOKEN_HASH__',args.digest)
args.output.write_text(src)
args.output.chmod(0o600)
print('Ephemeral endpoint ready; template SHA256='+hashlib.sha256(src.encode()).hexdigest())
