#!/usr/bin/env python3
"""Render a one-shot owner-authorized Bertina clean master PHP helper.

The SQL bundle is code only, never live customer data. Output remains local to
the GitHub Actions runner and must not be uploaded as an artifact or committed.
"""
import argparse
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import zlib

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = [
    "docs/BERTINA_MYSQL_SCHEMA.sql",
    "docs/migrations/20261012_stage09_commerce.sql",
    "docs/BERTINA_ORGANIC_GROWTH_SCHEMA.sql",
] + [p.relative_to(ROOT).as_posix()
     for p in sorted((ROOT / "database/unified").glob("[0-9]*.sql"))]
assert len(BUNDLE) == 19, "exactly 3 operational + 16 unified schema files"
EXPECTED_TABLES = 5 + 8 + 2 + 7 + 198
assert EXPECTED_TABLES == 220


def render(digest: str, live_sha: str, outfile: Path) -> dict:
    assert re.fullmatch(r"[a-f0-9]{64}", digest), "token digest must be SHA-256"
    assert re.fullmatch(r"[a-f0-9]{40}", live_sha), "live release must be SHA-1"
    template = (ROOT / "scripts/bertina-clean-master-apply-template.php").read_text()
    assert template.count("__JR_REBUILD_TOKEN_DIGEST__") == 1
    assert template.count("__JR_MASTER_BUNDLE_BASE64__") == 1
    assert template.count("__JR_MASTER_BUNDLE_SHA256__") == 1
    assert template.count("__JR_EXPECTED_LIVE_SHA__") == 2
    contents = {}
    for name in BUNDLE:
        sql = (ROOT / name).read_text()
        assert "CREATE TABLE" in sql, name
        contents[name] = sql
    # A 2026 source-only owner-approved stock migration contains seed INSERTS:
    # intentionally use the 20261012 *non-seeding* version instead.
    assert "20261013_stage09_bertina_owner_approved.sql" not in contents
    bundle = json.dumps(contents, separators=(",", ":"), ensure_ascii=False).encode()
    # Use zlib framing: PHP gzuncompress() supports this, unlike gzip-only framing.
    packed = base64.b64encode(zlib.compress(bundle, level=9)).decode()
    output = (template.replace("__JR_REBUILD_TOKEN_DIGEST__", digest)
              .replace("__JR_EXPECTED_LIVE_SHA__", live_sha)
              .replace("__JR_MASTER_BUNDLE_SHA256__", hashlib.sha256(bundle).hexdigest())
              .replace("__JR_MASTER_BUNDLE_BASE64__", packed))
    assert not re.search(r"__JR_[A-Z_]+__", output)
    outfile.parent.mkdir(parents=True, exist_ok=True)
    outfile.write_text(output)
    outfile.chmod(0o600)
    return {"sourceCount": len(contents), "expectedTables": EXPECTED_TABLES,
            "bundleSha256": hashlib.sha256(bundle).hexdigest(),
            "renderedPhpSha256": hashlib.sha256(output.encode()).hexdigest()}


def main():
    cli = argparse.ArgumentParser()
    cli.add_argument("--token-digest", required=True)
    cli.add_argument("--live-sha", required=True)
    cli.add_argument("--output", type=Path, required=True)
    args = cli.parse_args()
    print(json.dumps(render(args.token_digest, args.live_sha, args.output),
                     sort_keys=True))


if __name__ == "__main__":
    main()
