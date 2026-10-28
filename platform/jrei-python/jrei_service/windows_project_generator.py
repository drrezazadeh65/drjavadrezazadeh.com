"""Generate real local draft project files for the owner, only after confirmation.

The model proposes code, never executes it. No arbitrary filesystem writes:
flat allowlisted filenames in a newly created private Windows directory only.
This is not a repository commit, a test result or a deployed application.
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import secrets

from jrei_service.owner_candidate_pipeline import SENSITIVE

VALID_NAME = re.compile(r"^[a-zA-Z][a-zA-Z0-9_-]{0,49}\.(?:py|js|mjs|html|css|md|json|txt)$")
MAX_FILES = 3
MAX_FILE_BYTES = 16000
MAX_TOTAL_BYTES = 27000


def _safe_output_directory(private: Path) -> Path:
    root = private.resolve(strict=True)
    parent = root / "generated-projects"
    if parent.is_symlink():
        raise ValueError("JREI_PROJECT_OUTPUT_LINKED")
    parent.mkdir(parents=True, exist_ok=True)
    resolved = parent.resolve(strict=True)
    if not resolved.is_relative_to(root):
        raise ValueError("JREI_PROJECT_OUTPUT_OUTSIDE_PRIVATE_ROOT")
    return parent


def generate(*, private: Path, objective: str, model_reply) -> dict:
    if not isinstance(objective, str) or not 12 <= len(objective.strip()) <= 1800:
        raise ValueError("JREI_PROJECT_OBJECTIVE_INVALID")
    prompt = (
        "Create a coherent small code project as real source files, to be "
        "saved to a PRIVATE OWNER-ONLY Windows draft directory. "
        "Never claim that it has been executed, deployed, debugged, or tested. "
        "Return ONLY one valid JSON object with exactly these two keys: "
        "files and description. Files must contain 1 to 3 objects with "
        "exactly name and content string fields. File names must be flat "
        "safe ASCII names (for example main.py, index.html, style.css) "
        "without any path separators. File extensions may only be py, js, "
        "mjs, html, css, md, json or txt. Prefer a small, meaningful "
        "standalone implementation. Add explanatory comments where useful. "
        "Do not include credentials, hidden network control, remote shell, "
        "production changes, malware, passwords, deployment or system "
        "administration code. This prompt authorizes draft creation only. "
        "OWNER REQUEST: " + objective.strip()
    )
    result = model_reply([{"role": "user", "content": prompt}], max_tokens=2500)
    if result.get("quality") == "REJECTED_REPETITION":
        raise ValueError("JREI_PROJECT_MODEL_QUALITY_REJECTED")
    raw = str(result["answer"]).strip()
    if len(raw) > 42000:
        raise ValueError("JREI_PROJECT_MODEL_OUTPUT_TOO_LARGE")
    fence = chr(96) * 3
    if raw.startswith(fence):
        raw = re.sub(r"^.{3}(?:json)?\s*|\s*.{3}$", "", raw)
    try:
        response = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("JREI_PROJECT_MODEL_JSON_INVALID") from exc
    if not isinstance(response, dict) or set(response) != {"files", "description"}:
        raise ValueError("JREI_PROJECT_MODEL_STRUCTURE_INVALID")
    files = response["files"]
    description = response["description"]
    if not isinstance(files, list) or not 1 <= len(files) <= MAX_FILES or \
       not isinstance(description, str) or len(description) > 800:
        raise ValueError("JREI_PROJECT_MODEL_FILE_LIST_INVALID")
    clean = []
    used = set()
    total = 0
    for entry in files:
        if not isinstance(entry, dict) or set(entry) != {"name", "content"}:
            raise ValueError("JREI_PROJECT_MODEL_ENTRY_INVALID")
        name = entry["name"]
        code = entry["content"]
        if not isinstance(name, str) or not VALID_NAME.fullmatch(name) or \
           name.casefold() in used or not isinstance(code, str):
            raise ValueError("JREI_PROJECT_FILE_NAME_OR_CONTENT_INVALID")
        payload = (code.rstrip() + "\n").encode("utf-8")
        total += len(payload)
        if not 10 <= len(payload) <= MAX_FILE_BYTES or total > MAX_TOTAL_BYTES:
            raise ValueError("JREI_PROJECT_FILE_SIZE_LIMIT")
        if SENSITIVE.search(code) or "\x00" in code:
            raise ValueError("JREI_PROJECT_SENSITIVE_SOURCE_REFUSED")
        used.add(name.casefold())
        clean.append((name, payload))

    parent = _safe_output_directory(private)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ-") + secrets.token_hex(6)
    folder = parent / run_id
    folder.mkdir(mode=0o700)
    records = []
    created = []
    try:
        for name, payload in clean:
            destination = folder / name
            with destination.open("xb") as stream:
                stream.write(payload)
            created.append(destination)
            records.append({"name": name, "sha256": hashlib.sha256(payload).hexdigest(),
                            "bytes": len(payload), "path": str(destination)})
        receipt = {
            "schema": "jr.jrei.windows-generated-project.v1",
            "id": run_id, "state": "PRIVATE_DRAFT_FILES_CREATED_UNTESTED",
            "objective": objective[:700], "description": description.strip()[:800],
            "files": records, "total_bytes": total,
            "model": str(result.get("model", "LOCAL"))[:100],
            "path": str(folder), "executed": False, "tested": False,
            "canonical_repository_modified": False, "production_modified": False
        }
        receipt_path = folder / "jrei-receipt.json"
        with receipt_path.open("x", encoding="utf-8") as out:
            json.dump(receipt, out, ensure_ascii=False, indent=2)
        return receipt
    except (OSError, ValueError, TypeError):
        # Remove only files created in this new private directory on a
        # failed write. Never delete a repository or a user-provided path.
        if not folder.is_symlink():
            for candidate in [folder / "jrei-receipt.json", *created]:
                if candidate.is_file() and not candidate.is_symlink():
                    candidate.unlink(missing_ok=True)
            try:
                folder.rmdir()
            except OSError:
                pass
        raise


def read_generated(*, private: Path, project_id: str, filename: str) -> bytes:
    """Return exactly an already-created local draft, never an arbitrary file."""
    if not isinstance(project_id, str) or not re.fullmatch(
        r"[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}", project_id
    ):
        raise ValueError("JREI_DRAFT_ID_INVALID")
    if not isinstance(filename, str) or not VALID_NAME.fullmatch(filename):
        raise ValueError("JREI_DRAFT_NAME_INVALID")
    parent = private.resolve(strict=True) / "generated-projects"
    folder = parent / project_id
    receipt = folder / "jrei-receipt.json"
    if parent.is_symlink() or folder.is_symlink() or receipt.is_symlink():
        raise ValueError("JREI_DRAFT_SYMLINK_BLOCKED")
    if not receipt.is_file() or receipt.stat().st_size > 9000:
        raise ValueError("JREI_DRAFT_RECEIPT_UNAVAILABLE")
    manifest = json.loads(receipt.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict) or manifest.get("id") != project_id:
        raise ValueError("JREI_DRAFT_MANIFEST_INVALID")
    entries = manifest.get("files", [])
    if not isinstance(entries, list) or len(entries) > MAX_FILES:
        raise ValueError("JREI_DRAFT_MANIFEST_FILES_INVALID")
    entry = next((v for v in entries if isinstance(v, dict) and
                  v.get("name") == filename), None)
    if not entry:
        raise ValueError("JREI_DRAFT_FILE_NOT_REGISTERED")
    path = folder / filename
    if path.is_symlink() or not path.is_file() or path.stat().st_size > MAX_FILE_BYTES:
        raise ValueError("JREI_DRAFT_FILE_NOT_AVAILABLE")
    if not path.resolve(strict=True).is_relative_to(folder.resolve(strict=True)):
        raise ValueError("JREI_DRAFT_PATH_INVALID")
    contents = path.read_bytes()
    if (hashlib.sha256(contents).hexdigest() != entry.get("sha256") or
            len(contents) != entry.get("bytes")):
        raise ValueError("JREI_DRAFT_FILE_CHANGED_SINCE_RECEIPT")
    return contents
