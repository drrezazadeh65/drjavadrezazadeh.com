#!/usr/bin/env python3
"""Export ALL tracked JREI and required integration source into ONE GitHub artifact.

No network calls, no production access and no private local credentials.
The download provided by GitHub Actions is a single ZIP archive.
Source selection is deliberately inclusive: shared platform/API/frontend,
scripts, tests and CI are bundled because JREI imports/uses them.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "JREI_AI_ONE_FILE"
BUNDLE = OUT / "JREI_AI_SOURCE"
SHA = subprocess.check_output(
    ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
).strip()
REPO = "drrezazadeh65/drjavadrezazadeh.com"
BRANCH = "migration/bertina-linux6"

SOURCE_EXT = {
    ".php", ".py", ".mjs", ".js", ".cjs", ".jsx", ".ts", ".tsx", ".ps1",
    ".psm1", ".cmd", ".bat", ".sh", ".sql", ".yaml", ".yml", ".json",
    ".html", ".css", ".scss", ".htaccess", ".webmanifest", ".xml",
    ".md", ".txt", ".toml", ".ini", ".conf", ".config", ".jsonl",
    ".gitignore", ".gitattributes",
}
EXPLICIT = {
    "AGENTS.md", "README.md", "package.json", "package-lock.json",
    "composer.json", "composer.lock", "robots.txt", "sw.js",
    ".htaccess", ".gitignore", ".gitattributes",
}
DANGEROUS = re.compile(
    r"(?:^|/)(?:\.git/|node_modules/|vendor/|__pycache__/|\.venv/|venv/|"
    r"\.env(?:\..*)?$|.*\.(?:pem|p12|pfx|key|jks|keystore|sqlite|db|"
    r"gguf|ggml|onnx|safetensors|pt|pth|ckpt|bin|exe|dll|sys|zip|7z|gz|"
    r"tar|rar)$|.*(?:password|credential|secret[_-]?key)[^/]*$)",
    re.I,
)
AI_PAGE = re.compile(
    r"(?:^|/)(?:jrei|ai|assistant|exams?|konkur|golden[-_]?talent|"
    r"rcas|bahar|news|akhbar|admin|customer-dashboard|student|"
    r"assessments?|choice[-_]?studio|journal)(?:/|[-_.])",
    re.I,
)
AI_DOC = re.compile(
    r"(?:jrei|educational|learning|news|hybrid|exam|konkur|ai[_-]|"
    r"knowledge|mother[_-]database|seo|geo|autonom|master|"
    r"owner|activation|source|study|guardian|testly|"
    r"rights|consent|ai.search)",
    re.I,
)


def classify(path: str) -> str | None:
    p = PurePosixPath(path)
    if p.is_absolute() or ".." in p.parts or DANGEROUS.search(path):
        return None
    if path in EXPLICIT or path.startswith("sitemap") and p.suffix == ".xml":
        return "SITE_CONTRACTS"
    if p.suffix.lower() not in SOURCE_EXT:
        return None
    if path.startswith(("platform/", "api/", "scripts/", "tests/", "database/")):
        return "FULL_CODE_AND_DEPENDENCIES"
    if path.startswith((".github/workflows/", ".github/actions/")):
        return "AUTOMATION_AND_RELEASE"
    if path.startswith(("assets/js/", "assets/css/", "assets/data/")):
        return "FRONTEND_INTEGRATIONS"
    if path.startswith(("docs/migrations/", "docs/governance/")):
        return "GOVERNANCE_AND_DATABASE"
    if path.startswith(("docs/", "foundation/", "identity/")) and AI_DOC.search(path):
        return "ADDITIONAL_RELEVANT_DOCS"
    if path.startswith(("fa/", "en/", "journal/", "app/")) and AI_PAGE.search(path):
        return "AI_PUBLIC_AND_ADMIN_UI"
    if p.name in ("index.php", "site.js", "robots.txt", ".htaccess"):
        return "SITE_CONTRACTS"
    return None


def main() -> int:
    if os.environ.get("GITHUB_REPOSITORY") != REPO or \
       os.environ.get("GITHUB_REF_NAME") != BRANCH:
        raise RuntimeError("JREI_EXPORT_CANONICAL_BRANCH_REQUIRED")
    if not re.fullmatch(r"[a-f0-9]{40}", SHA):
        raise RuntimeError("JREI_EXPORT_INVALID_SHA")
    tracked = subprocess.check_output(
        ["git", "ls-files", "-z"], cwd=ROOT
    ).split(b"\0")
    if OUT.exists():
        shutil.rmtree(OUT)
    BUNDLE.mkdir(parents=True)
    rows: list[dict[str, object]] = []
    totals: dict[str, int] = {}
    skipped_symlinks = 0
    for raw in tracked:
        if not raw:
            continue
        path = raw.decode("utf-8", errors="strict")
        group = classify(path)
        if not group:
            continue
        source = ROOT / path
        if source.is_symlink():
            skipped_symlinks += 1
            continue
        if not source.is_file():
            raise RuntimeError("JREI_EXPORT_TRACKED_SOURCE_MISSING: " + path)
        data = source.read_bytes()
        if len(data) > 3_000_000 or b"\0" in data[:16384]:
            raise RuntimeError("JREI_EXPORT_UNEXPECTED_BINARY_OR_HUGE_SOURCE: " + path)
        target = BUNDLE / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        digest = hashlib.sha256(data).hexdigest()
        rows.append({
            "path": path,
            "category": group,
            "size_bytes": len(data),
            "sha256": digest,
        })
        totals[group] = totals.get(group, 0) + 1

    if len(rows) < 1000 or totals.get("FULL_CODE_AND_DEPENDENCIES", 0) < 700:
        raise RuntimeError("JREI_EXPORT_INCOMPLETE_SOURCE_SELECTION")
    if not any(row["path"] == "platform/jrei-python/jrei_service/windows_command_center.py" for row in rows):
        raise RuntimeError("JREI_EXPORT_COMMAND_CENTER_MISSING")
    if not any(row["path"] == "platform/jrei-v5/windows-worker/jrei-gpu-private-activate.ps1" for row in rows):
        raise RuntimeError("JREI_EXPORT_GPU_RUNTIME_MISSING")
    if not any(row["path"] == "docs/governance/JREI_ALL_AI_MASTER_PROMPTS_AND_OWNER_DIRECTIVES_UNIFIED_20261025.md" for row in rows):
        raise RuntimeError("JREI_EXPORT_MASTER_PROMPTS_MISSING")
    manifest = {
        "schema": "jr.jrei.full-source-onefile.v1",
        "repository": REPO,
        "branch": BRANCH,
        "immutable_commit_sha": SHA,
        "source": "GITHUB_TRACKED_FILES_ONLY",
        "packaging": "ONE_ZIP_BY_GITHUB_ACTIONS_WITH_ORIGINAL_RELATIVE_PATHS",
        "public_site_deployed": False,
        "private_windows_config_included": False,
        "model_weights_included": False,
        "files_total": len(rows),
        "bytes_total": sum(int(row["size_bytes"]) for row in rows),
        "categories": totals,
        "excluded_symlinks": skipped_symlinks,
        "files": sorted(rows, key=lambda row: str(row["path"])),
    }
    (OUT / "JREI_SOURCE_MANIFEST.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    sums = "".join(
        f"{row['sha256']}  {row['path']}\n"
        for row in sorted(rows, key=lambda row: str(row["path"]))
    )
    (OUT / "JREI_SOURCE_SHA256SUMS.txt").write_text(sums, encoding="utf-8")
    readme = f"""# JREI — complete AI source, integration code and original prompts

Repository: {REPO}
Canonical branch: {BRANCH}
IMMUTABLE COMMIT: {SHA}
Source files: {len(rows)}
Total uncompressed source bytes: {manifest['bytes_total']}

The one ZIP downloaded from GitHub Actions contains:
- JREI_AI_SOURCE/: complete JREI Python, PHP, JS, Windows PowerShell,
  news, model adapters, education/exam tools, and shared integrations.
- Existing source tests, workflows, release policies, original master prompts,
  database migration source and the website's JREI interface code.
- JREI_SOURCE_MANIFEST.json: individual paths, file sizes and SHA-256.
- JREI_SOURCE_SHA256SUMS.txt: verification checksums.

Shared source dependencies are deliberately INCLUDED to prevent an incomplete
isolated export. Unrelated images, binary model weights and system-generated
assets are excluded. Tracked source does not include private Bertina
environment, local worker keys, .env files, personal data or installed GPUs.
This archive is a SOURCE SNAPSHOT, not proof of live publication or a
ready-to-install independent Windows executable.

The original folder layout is preserved so every reference remains findable.
For complete repository history, use GitHub at the immutable commit above.
"""
    (OUT / "README_FIRST_JREI.md").write_text(readme, encoding="utf-8")
    print("JREI_EXPORT_HEAD_SHA=" + SHA)
    print("JREI_EXPORT_INCLUDED_FILES=" + str(len(rows)))
    print("JREI_EXPORT_UNCOMPRESSED_BYTES=" + str(manifest["bytes_total"]))
    print("JREI_EXPORT_CATEGORIES=" + json.dumps(totals, sort_keys=True))
    print("JREI_EXPORT_ONEFILE_STAGING=" + str(OUT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
