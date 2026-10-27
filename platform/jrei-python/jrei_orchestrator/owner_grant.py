"""Offline one-time standing owner authorization for local JREI development.

The private signing key never enters GitHub, Bertina, PHP or model context.
Signed scopes allow repeated sandbox development without per-task prompts.
Revocation: set emergency_stop, remove the public-key environment setting,
disable the service, or replace the local trust key. No production privileges.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
import sys
import time

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from jrei_orchestrator.continuous_autocode import ContinuousCodingManifest

_SIGN_DOMAIN = b"JREI-AUTOCODE-OWNER-GRANT-V1\\n"


def _safe_exclusive_write(path: Path, payload: bytes) -> None:
    if path.exists() or path.is_symlink():
        raise ValueError("OWNER_GRANT_OUTPUT_ALREADY_EXISTS")
    if not path.parent.is_dir() or path.parent.is_symlink():
        raise ValueError("OWNER_GRANT_PRIVATE_DIRECTORY_REQUIRED")
    with path.open("xb") as output:
        if os.name != "nt":
            os.chmod(path, 0o600)
        output.write(payload)
        output.flush()
        os.fsync(output.fileno())


def create_owner_key(private_file: Path, public_file: Path) -> str:
    if private_file.resolve() == public_file.resolve():
        raise ValueError("OWNER_GRANT_KEY_PATH_COLLISION")
    if private_file.exists() or public_file.exists():
        raise ValueError("OWNER_GRANT_WILL_NOT_OVERWRITE_KEYS")
    key = Ed25519PrivateKey.generate()
    private_bytes = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_bytes = key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    _safe_exclusive_write(private_file, private_bytes)
    _safe_exclusive_write(public_file, base64.b64encode(public_bytes) + b"\n")
    return base64.b64encode(public_bytes).decode("ascii")


def sign_standing_manifest(
    private_file: Path, manifest_file: Path, signed_file: Path,
    *, expires_at: int | None = None,
) -> None:
    if private_file.is_symlink() or manifest_file.is_symlink():
        raise ValueError("OWNER_GRANT_SYMLINK_DENIED")
    raw = manifest_file.read_bytes()
    if len(raw) > 100_000:
        raise ValueError("OWNER_GRANT_MANIFEST_TOO_LARGE")
    manifest = ContinuousCodingManifest.model_validate_json(raw)
    if not manifest.owner_approved or manifest.emergency_stop:
        raise ValueError("OWNER_GRANT_MANIFEST_NOT_APPROVED")
    key_bytes = private_file.read_bytes()
    key = serialization.load_pem_private_key(key_bytes, password=None)
    if not isinstance(key, Ed25519PrivateKey):
        raise ValueError("OWNER_GRANT_ED25519_REQUIRED")
    envelope = {
        "schema_version": "jr.jrei.continuous-autocode-envelope.v1",
        "issued_at": int(time.time()),
        "expires_at": expires_at,
        "manifest": manifest.model_dump(mode="json"),
    }
    signed_data = json.dumps([
        envelope["schema_version"], envelope["issued_at"],
        envelope["expires_at"], envelope["manifest"]
    ], sort_keys=True, ensure_ascii=False,
        separators=(",", ":")).encode("utf-8")
    envelope["signature_b64"] = base64.b64encode(
        key.sign(_SIGN_DOMAIN + signed_data)
    ).decode("ascii")
    _safe_exclusive_write(
        signed_file,
        (json.dumps(envelope, sort_keys=True, ensure_ascii=False,
                    separators=(",", ":")) + "\n").encode("utf-8"),
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Local JREI standing development authorization; no production access"
    )
    sub = parser.add_subparsers(dest="action", required=True)
    generate = sub.add_parser("generate-key")
    generate.add_argument("--private-key", required=True, type=Path)
    generate.add_argument("--public-key", required=True, type=Path)
    sign = sub.add_parser("sign")
    sign.add_argument("--private-key", required=True, type=Path)
    sign.add_argument("--manifest", required=True, type=Path)
    sign.add_argument("--output", required=True, type=Path)
    sign.add_argument("--expires-at", type=int, default=None)
    args = parser.parse_args()
    if args.action == "generate-key":
        public = create_owner_key(args.private_key, args.public_key)
        print("JREI_AUTOCODE_OWNER_PUBLIC_KEY_B64=" + public)
    else:
        sign_standing_manifest(
            args.private_key, args.manifest, args.output,
            expires_at=args.expires_at,
        )
        print("SIGNED_OWNER_SANDBOX_DEVELOPMENT_SCOPE_WRITTEN")


if __name__ == "__main__":
    main()
