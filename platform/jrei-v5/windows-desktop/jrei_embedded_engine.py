"""Entry point for the ORIGINAL JREI private 8092 engine, Windows frozen build.

Bundled into the same Inno Setup EXE as the Tk client. This is NOT a
second model, AI service, remote API, deployment agent or extra command center.
All JREI private database/token/owner history live in the existing user
%LOCALAPPDATA%\JREI\command-center path, not under {app}.
"""
from __future__ import annotations

import sys

from jrei_service import windows_command_center as command_center
from jrei_service import windows_site_image_studio as image_studio


def main() -> None:
    if sys.argv[1:] == ["--serve"]:
        # Reuse exactly the existing command center, including its private
        # loopback endpoint, scheduler, model gates and SQLite.
        command_center.main()
        return
    if len(sys.argv) >= 2 and sys.argv[1] == "--render-owner-image":
        # Same frozen executable, separate original module entry point;
        # bypassing the owner-queued proof is not possible in the renderer.
        sys.argv = [sys.argv[0]] + sys.argv[2:]
        image_studio.main()
        return
    raise SystemExit("JREI_PRIVATE_ENGINE_REQUIRES_EXPLICIT_OWNER_TASK_MODE")


if __name__ == "__main__":
    main()
