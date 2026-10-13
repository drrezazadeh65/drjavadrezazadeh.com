#!/usr/bin/env python3
"""Render an ephemeral authenticated owner admin provisioning endpoint."""
from pathlib import Path
import argparse,hashlib,re
root=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser()
p.add_argument('--digest',required=True)
p.add_argument('--output',required=True)
args=p.parse_args()
assert re.fullmatch(r'[a-f0-9]{64}',args.digest)
text=(root/'scripts/bertina-owner-admin-provision-template.php').read_text()
assert text.count('__JR_OWNER_TOKEN_HASH__')==1
text=text.replace('__JR_OWNER_TOKEN_HASH__',args.digest)
destination=Path(args.output);destination.parent.mkdir(parents=True,exist_ok=True)
destination.write_text(text)
destination.chmod(0o600)
print('Rendered one-use owner provisioning PHP; source sha256='+hashlib.sha256(text.encode()).hexdigest())
