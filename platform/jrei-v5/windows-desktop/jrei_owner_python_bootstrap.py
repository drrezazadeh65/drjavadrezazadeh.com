"""Owner-only entrypoint for a compatible local CPython 3.13.

This is an *optional* engine transport for Windows installations where the
bundled Python executable is denied owner-private SQLite access. The full
runtime and pinned libraries still ship in the ONE installer. This bootstrap
does not clone credentials, install packages, call a remote service or start
a second JREI engine. It imports the original 8092 engine from the exactly
matching immutable version directory.
"""
from __future__ import annotations

import re
import runpy
import sys
from pathlib import Path


def main() -> None:
    if sys.version_info[:2] != (3, 13):
        raise SystemExit("JREI_OWNER_SYSTEM_PYTHON_VERSION_UNSUPPORTED")
    source_file = Path(__file__).resolve()
    source_root = source_file.parents[3]
    match = re.fullmatch(r"source-v(\d+\.\d+\.\d+)", source_root.name)
    if match is None:
        raise SystemExit("JREI_OWNER_SOURCE_RELEASE_INVALID")
    release_root = source_root.parent
    bundled_python = release_root / ("python-v" + match.group(1))
    vendor = bundled_python / "Lib" / "site-packages"
    native_source = source_root / "platform" / "jrei-python"
    original = source_file.with_name("jrei_embedded_engine.py")
    required = (
        vendor / "fastapi" / "__init__.py",
        vendor / "cryptography" / "__init__.py",
        native_source / "jrei_service" / "windows_command_center.py",
        original,
        release_root / "jrei-engine-manifest.json",
    )
    if any(not p.is_file() or p.is_symlink() for p in required):
        raise SystemExit("JREI_OWNER_MATCHING_OFFLINE_DEPENDENCIES_MISSING")
    if source_file.is_symlink() or source_root.is_symlink():
        raise SystemExit("JREI_OWNER_SOURCE_LINK_REJECTED")
    # -I prevents PYTHONPATH and user-site injection; imports below are the
    # exact on-disk package dependencies from the versioned setup.
    sys.path[:0] = [str(native_source), str(vendor)]
    if sys.argv[1:] == ["--verify-packaging"]:
        # Source-only check used by the isolated GitHub packaging runner:
        # exercise this exact entrypoint and the original command center's
        # immutable release-layout validation; do NOT start port 8092,
        # initialize the owner's database or read the token.
        from jrei_service import windows_command_center  # noqa: F401
        print("JREI_OWNER_OFFLINE_BOOTSTRAP_VERIFIED")
        return
    if sys.argv[1:] != ["--serve"]:
        raise SystemExit("JREI_OWNER_BOOTSTRAP_MODE_UNSUPPORTED")
    runpy.run_path(str(original), run_name="__main__")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ImportError, ValueError) as exc:
        # Print ONLY a known bounded code. No traceback, username, Windows
        # path, credentials or internal package contents escape to setup logs.
        code = str(exc)
        if not re.fullmatch(r"JREI_[A-Z0-9_]{4,110}", code):
            code = "JREI_OWNER_PYTHON_BOOTSTRAP_EXECUTION_FAILED"
        print("[JREI] " + code, file=sys.stderr, flush=True)
        raise SystemExit(23) from None
    except SystemExit as exc:
        if isinstance(exc.code, str):
            code = exc.code
            if not re.fullmatch(r"JREI_[A-Z0-9_]{4,110}", code):
                code = "JREI_OWNER_PYTHON_BOOTSTRAP_MODE_FAILED"
            print("[JREI] " + code, file=sys.stderr, flush=True)
            raise SystemExit(24) from None
        raise
