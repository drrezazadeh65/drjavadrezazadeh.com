"""Explicit owner-approved official Apache-2.0 Granite GGUF acquisition.

Only the original IBM Granite repository is considered. We fetch its current
full commit SHA and per-file LFS SHA256 using the official Hugging Face API.
Download is accepted only when the exact byte size and SHA256 match.
No ChatGPT subscription, paid inference API, shell execution or cloud upload.

This is an *opt-in installer component*, never run by JREI inference,
scheduler, crawling or an untrusted model prompt.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import time
import urllib.request

REPO_ID = "ibm-granite/granite-4.1-3b-GGUF"
MODEL_FILE = "granite-4.1-3b-Q4_K_M.gguf"
API = "https://huggingface.co/api/models/" + REPO_ID
REV = re.compile(r"^[0-9a-f]{40}$")
SHA = re.compile(r"^[0-9a-f]{64}$")
MAX_MODEL_BYTES = 7_000_000_000
MODEL_PREFIX = "granite-4.1-3b"
MANIFEST = "jr.jrei.windows-granite-artifact.v1"


def _json(url: str):
    request = urllib.request.Request(
        url, headers={"User-Agent": "JREI-Windows-Owner-Installer/1",
                      "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as result:
        raw = result.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("JREI_HF_METADATA_OVERSIZE")
        return json.loads(raw)


def official_manifest() -> dict:
    info = _json(API)
    sha = info.get("sha") if isinstance(info, dict) else None
    if not isinstance(sha, str) or not REV.fullmatch(sha):
        raise ValueError("JREI_HF_MODEL_REVISION_UNVERIFIED")
    license_id = (info.get("cardData") or {}).get("license")
    if license_id != "apache-2.0":
        raise ValueError("JREI_HF_MODEL_LICENSE_CHANGED")
    listing = _json(API + "/tree/" + sha + "?recursive=true")
    if not isinstance(listing, list):
        raise ValueError("JREI_HF_TREE_INVALID")
    matches = [item for item in listing if isinstance(item, dict)
               and item.get("path") == MODEL_FILE and item.get("type") == "file"]
    if len(matches) != 1:
        raise ValueError("JREI_HF_QUANTIZATION_NOT_UNIQUE")
    item = matches[0]
    digest = (item.get("lfs") or {}).get("oid")
    size = item.get("size")
    if (not isinstance(digest, str) or not SHA.fullmatch(digest)
            or type(size) is not int or not 1_000_000_000 <= size <= MAX_MODEL_BYTES):
        raise ValueError("JREI_HF_GGUF_UNVERIFIED_LFS")
    return {"schema": MANIFEST, "repository": REPO_ID,
            "revision": sha, "filename": MODEL_FILE,
            "sha256": digest, "size_bytes": size, "license": "apache-2.0",
            "source": f"https://huggingface.co/{REPO_ID}/resolve/{sha}/{MODEL_FILE}"}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for piece in iter(lambda: stream.read(4 * 1024 * 1024), b""):
            digest.update(piece)
    return digest.hexdigest()


def stage_model(*, private: Path, owner_approved: bool,
                rights_reviewed: bool) -> dict:
    if owner_approved is not True or rights_reviewed is not True:
        raise ValueError("JREI_MODEL_OWNER_AND_RIGHTS_APPROVAL_REQUIRED")
    if private.is_symlink() or not private.is_dir() or private.name != "command-center":
        raise ValueError("JREI_MODEL_OWNER_PRIVATE_LOCATION_REQUIRED")
    data = official_manifest()
    store = private.parent / "models"
    if store.is_symlink():
        raise ValueError("JREI_MODEL_STORE_LINKED")
    store.mkdir(mode=0o700, parents=True, exist_ok=True)
    target = store / (MODEL_PREFIX + "-" + data["revision"][:12] + "-Q4_K_M.gguf")
    if target.exists():
        if target.is_symlink() or target.stat().st_size != data["size_bytes"] or _sha256(target) != data["sha256"]:
            raise ValueError("JREI_MODEL_EXISTING_ARTIFACT_NOT_TRUSTED")
    else:
        if shutil.disk_usage(store).free < data["size_bytes"] * 2:
            raise ValueError("JREI_MODEL_INSUFFICIENT_DOWNLOAD_HEADROOM")
        # Resume across transient network failures without redownloading
        # the entire multi-gigabyte artifact. The part filename includes
        # the pinned revision and final integrity is always the full SHA256.
        partial = store / (target.name + ".partial")
        lock = store / (target.name + ".downloading.lock")
        if lock.is_symlink() or partial.is_symlink():
            raise ValueError("JREI_MODEL_LOCAL_DOWNLOAD_LINK_REFUSED")
        try:
            with lock.open("x", encoding="utf-8") as claim:
                claim.write(str(os.getpid()))
        except FileExistsError as exc:
            raise ValueError("JREI_MODEL_ALREADY_DOWNLOADING_OR_STALE_LOCK") from exc
        try:
            already = partial.stat().st_size if partial.exists() else 0
            if already > data["size_bytes"]:
                raise ValueError("JREI_MODEL_INVALID_PARTIAL_LENGTH")
            if already == data["size_bytes"]:
                if _sha256(partial) != data["sha256"]:
                    raise ValueError("JREI_MODEL_PARTIAL_SHA_MISMATCH")
            else:
                headers = {"User-Agent": "JREI-Owner-Model/1",
                           "Accept-Encoding": "identity"}
                if already:
                    headers["Range"] = f"bytes={already}-"
                request = urllib.request.Request(data["source"], headers=headers)
                with urllib.request.urlopen(request, timeout=120) as stream:
                    if already and stream.status == 206:
                        needed = f"bytes {already}-{data['size_bytes']-1}/{data['size_bytes']}"
                        if stream.headers.get("Content-Range") != needed:
                            raise ValueError("JREI_MODEL_RANGE_INVALID")
                        mode = "ab"
                    elif stream.status == 200:
                        # Server ignored Range; restart rather than splice
                        # unrelated content into a trusted artifact.
                        already = 0
                        mode = "wb"
                    else:
                        raise ValueError("JREI_MODEL_HTTP_STATUS_INVALID")
                    received = already
                    with partial.open(mode) as output:
                        for block in iter(lambda: stream.read(4 * 1024 * 1024), b""):
                            received += len(block)
                            if received > data["size_bytes"]:
                                raise ValueError("JREI_MODEL_SIZE_CHANGED")
                            output.write(block)
                    if received != data["size_bytes"]:
                        raise ValueError("JREI_MODEL_TRANSFER_INTERRUPTED_RESUMABLE")
                if _sha256(partial) != data["sha256"]:
                    raise ValueError("JREI_MODEL_SHA256_MISMATCH")
            os.replace(partial, target)
        finally:
            lock.unlink(missing_ok=True)
    manifest = {**data, "model_file": str(target),
                "state": "OWNER_LOCAL_WEIGHTS_STAGED_UNTESTED",
                "installed_in_JREI": False,
                "model_executed": False,
                "persian_accepted": False,
                "weights_trained_by_JREI": False,
                "stage_timestamp": int(time.time())}
    receipt = store / (target.name + ".json")
    if receipt.is_symlink():
        raise ValueError("JREI_MODEL_RECEIPT_LINKED")
    candidate = store / ("." + secrets.token_hex(12) + ".json")
    try:
        with candidate.open("x", encoding="utf-8") as out:
            json.dump(manifest, out, ensure_ascii=False, indent=2)
        os.replace(candidate, receipt)
    finally:
        candidate.unlink(missing_ok=True)
    return {"state": manifest["state"], "model_file": str(target),
            "model_sha256": data["sha256"],
            "source_revision": data["revision"],
            "receipt": str(receipt), "model_executed": False,
            "need_runtime_activation": True}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--private", type=Path, required=True)
    parser.add_argument("--owner-approved", action="store_true")
    parser.add_argument("--rights-reviewed", action="store_true")
    args = parser.parse_args()
    result = stage_model(private=args.private, owner_approved=args.owner_approved,
                         rights_reviewed=args.rights_reviewed)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
