"""Owner-only frozen entry point for the EXISTING private JREI service.

The private runtime (including its same-user storage self-check) is bundled
with the GUI; this process is not a second AI model or independent server.
Only sanitized diagnostic identifiers are printed when private storage or
the original 8092 listener cannot be initialized. No secrets/paths in logs.
"""
from __future__ import annotations

import sqlite3
import sys

from jrei_service import windows_command_center as command_center
from jrei_service import windows_site_image_studio as image_studio
from jrei_service.windows_private_storage import PrivateStorageError


def main() -> None:
    if sys.argv[1:] == ["--serve"]:
        try:
            command_center.main()
        except PrivateStorageError as exc:
            # No Python traceback with token paths or Windows profile names.
            print(f"[JREI] {exc}", file=sys.stderr, flush=True)
            raise SystemExit(19) from None
        except (PermissionError, sqlite3.OperationalError):
            print("[JREI] JREI_OWNER_PRIVATE_SETUP_ACCESS_FAILED",
                  file=sys.stderr, flush=True)
            raise SystemExit(20) from None
        except OSError:
            print("[JREI] JREI_OWNER_LOCAL_RUNTIME_OS_ERROR",
                  file=sys.stderr, flush=True)
            raise SystemExit(21) from None
        return
    if len(sys.argv) >= 2 and sys.argv[1] == "--render-owner-image":
        # Reuse exactly the original queued image renderer. The renderer's
        # owner-queued authorization remains enforced by its own module.
        sys.argv = [sys.argv[0]] + sys.argv[2:]
        image_studio.main()
        return
    raise SystemExit("JREI_PRIVATE_ENGINE_REQUIRES_EXPLICIT_OWNER_TASK_MODE")


if __name__ == "__main__":
    main()
