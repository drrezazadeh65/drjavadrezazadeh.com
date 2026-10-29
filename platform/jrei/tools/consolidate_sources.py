#!/usr/bin/env python3
"""Source-only JREI consolidation: copy tracked AI code into one isolated root.

Run from repository root on canonical branch. No network, deploy, tests,
installation, Windows tasks or production mutation. Original paths retained.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
TARGET = ROOT / "platform" / "jrei" / "workspace"
SOURCES = (
    "platform/jrei-python/",
    "platform/jrei-v5/",
    "platform/jrei-v4/",
    "api/jrei-",
)
EXCLUDED = (".env", ".pem", ".key", ".p12", ".pfx", ".sqlite", ".db", ".gguf", ".safetensors", ".onnx", ".pt", ".pth", ".bin")
MAX_FILE = 5 * 1024 * 1024

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Actually write source-only copies")
    args = parser.parse_args()
    branch = subprocess.check_output(["git", "branch", "--show-current"], cwd=ROOT, text=True).strip()
    if branch != "migration/bertina-linux6":
        raise SystemExit("STOP: canonical branch required")
    paths = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).split(b"\0")
    manifest = []
    for raw in paths:
        if not raw:
            continue
        rel = pathlib.PurePosixPath(raw.decode("utf-8"))
        name = str(rel)
        if not any(name.startswith(p) for p in SOURCES):
            continue
        if rel.suffix.lower() in EXCLUDED or rel.name.startswith(".env"):
            continue
        src = ROOT.joinpath(*rel.parts)
        if src.is_symlink() or not src.is_file() or src.stat().st_size > MAX_FILE:
            continue
        digest = hashlib.sha256(src.read_bytes()).hexdigest()
        dest = TARGET.joinpath(*rel.parts)
        manifest.append({"source": name, "destination": str(dest.relative_to(ROOT)).replace("\\", "/"), "sha256": digest})
        if args.apply:
            dest.parent.mkdir(parents=True, exist_ok=True)
            if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest() != digest:
                raise SystemExit(f"STOP: existing destination differs: {dest}")
            shutil.copy2(src, dest)
    if args.apply:
        (TARGET / "source-manifest.json").write_text(json.dumps({"schema": "jrei.source-consolidation.v1", "entries": manifest}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"mode": "apply" if args.apply else "preview", "files": len(manifest), "target": str(TARGET.relative_to(ROOT))}, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    sys.exit(main())
