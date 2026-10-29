"""Owner-local private storage selection for the ORIGINAL JREI 8092 engine.

Do not fix a frozen executable's Windows access-denied by changing ACLs,
disabling Defender, using elevation, losing credentials or writing in a
versioned application directory. The *same running Python interpreter*
probes exclusive file creation and SQLite transactions before setup().
An existing store is retained; if a same-PC alternate is required, make
a verified copy WITHOUT deleting/moving/overwriting the original.
This is a per-PC local recovery path, not cross-PC identity enrollment.
"""
from __future__ import annotations

from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import sqlite3

_MARKER = ".jrei-active-private-store-v1.json"
_MAX_FILES = 40000
_MAX_BYTES = 2 * 1024**3


class PrivateStorageError(RuntimeError):
    """Stable diagnostics only; do not print sensitive paths or credentials."""


def candidates() -> tuple[Path, ...]:
    local = os.environ.get("LOCALAPPDATA")
    profile = os.environ.get("USERPROFILE")
    if os.name == "nt" and (not local or not profile):
        raise PrivateStorageError("JREI_WINDOWS_OWNER_PROFILE_MISSING")
    local_root = Path(local or Path.home()).resolve()
    profile_root = Path(profile or Path.home()).resolve()
    return (
        local_root / "JREI" / "command-center",
        local_root / "JREI-Owner" / "command-center",
        profile_root / "JREI-Owner" / "command-center",
    )


def _safe_directory(path: Path) -> None:
    """Reject unexpected reparse links inside our per-user private roots."""
    if path.is_symlink() or (hasattr(path, "is_junction") and path.is_junction()):
        raise PrivateStorageError("JREI_PRIVATE_STORAGE_LINK_REJECTED")
    if path.exists() and not path.is_dir():
        raise PrivateStorageError("JREI_PRIVATE_STORAGE_NOT_DIRECTORY")


def _digest(path: Path) -> bytes:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while True:
            chunk = stream.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.digest()


def _files(root: Path) -> list[tuple[Path, Path]]:
    """Inventory files without traversing links or copying arbitrary junctions."""
    if not root.exists():
        return []
    total = 0
    found: list[tuple[Path, Path]] = []
    for parent, dirs, files in os.walk(root, followlinks=False):
        current = Path(parent)
        _safe_directory(current)
        for name in dirs:
            _safe_directory(current / name)
        for name in files:
            source = current / name
            if source.is_symlink() or not source.is_file():
                raise PrivateStorageError("JREI_PRIVATE_STORAGE_ENTRY_UNSAFE")
            stat = source.stat()
            if stat.st_size < 0 or stat.st_size > _MAX_BYTES - total:
                raise PrivateStorageError("JREI_PRIVATE_STORAGE_COPY_SIZE_LIMIT")
            total += stat.st_size
            found.append((source.relative_to(root), source))
            if len(found) > _MAX_FILES:
                raise PrivateStorageError("JREI_PRIVATE_STORAGE_FILE_COUNT_LIMIT")
    return found


def _probe(folder: Path) -> None:
    """Exercise precisely the operations used by the frozen engine.

    SQLite must be able to create/write its rollback journal, not just open
    an existing readonly database. The probe touches no owner file.
    """
    prefix = ".jrei-access-" + secrets.token_hex(12)
    exclusive = folder / (prefix + ".token")
    dbfile = folder / (prefix + ".sqlite3")
    try:
        with exclusive.open("x", encoding="ascii") as handle:
            handle.write("JREI_PROBE_ONLY")
        with closing(sqlite3.connect(str(dbfile), timeout=3)) as conn:
            conn.execute("BEGIN IMMEDIATE")
            conn.execute("CREATE TABLE probe (n INTEGER)")
            conn.execute("INSERT INTO probe VALUES (1)")
            conn.commit()
    except (OSError, sqlite3.Error) as exc:
        raise PrivateStorageError("JREI_FROZEN_RUNTIME_PRIVATE_WRITE_DENIED") from exc
    finally:
        for file in (exclusive, dbfile, Path(str(dbfile) + "-journal"),
                     Path(str(dbfile) + "-wal"), Path(str(dbfile) + "-shm")):
            try:
                file.unlink(missing_ok=True)
            except OSError:
                pass


def _probe_real_owner_files(root: Path) -> None:
    """Check actual token and DB paths, not just random test filenames.

    An existing token is never overwritten; an existing DB is touched only
    within a rolled-back SQLite transaction. On a fresh store, the legitimate
    token and empty database are initialized here by the same runtime that
    later operates the engine.
    """
    token = root / "owner-token"
    database = root / "missions.sqlite3"
    if token.is_symlink() or database.is_symlink():
        raise PrivateStorageError("JREI_PRIVATE_FILE_LINK_REJECTED")
    try:
        if token.exists():
            # Verify that THIS process can open the named file for writing,
            # without changing its bytes or disclosing the credential.
            with token.open("r+b") as stream:
                if stream.read(1) == b"":
                    raise PrivateStorageError("JREI_EXISTING_OWNER_TOKEN_EMPTY")
        else:
            with token.open("x", encoding="ascii") as stream:
                stream.write(secrets.token_urlsafe(48))
                stream.flush()
                os.fsync(stream.fileno())
        # The DDL statement forces a real SQLite write attempt to the exact
        # database path. ROLLBACK guarantees the probe table is not retained.
        with closing(sqlite3.connect(str(database), timeout=3)) as conn:
            try:
                conn.execute("BEGIN IMMEDIATE")
                # A unique table ensures a real write even if an earlier
                # abandoned probe left a similarly named schema entry.
                table = "_jrei_preflight_" + secrets.token_hex(8)
                conn.execute(f"CREATE TABLE {table} (n INTEGER)")
            finally:
                conn.rollback()
    except PrivateStorageError:
        raise
    except sqlite3.OperationalError as exc:
        if "locked" in str(exc).lower() or "busy" in str(exc).lower():
            raise PrivateStorageError("JREI_PRIVATE_DB_BUSY_PRESERVE_CURRENT_ENGINE") from exc
        raise PrivateStorageError("JREI_FROZEN_RUNTIME_OWNER_FILES_WRITE_DENIED") from exc
    except (OSError, sqlite3.Error) as exc:
        raise PrivateStorageError("JREI_FROZEN_RUNTIME_OWNER_FILES_WRITE_DENIED") from exc


def _marked(root: Path) -> bool:
    marker = root / _MARKER
    if not marker.is_file() or marker.is_symlink():
        return False
    try:
        if marker.stat().st_size > 2048:
            return False
        data = json.loads(marker.read_text(encoding="utf-8"))
        return data == {
            "schema": "jr.jrei.owner-private-storage-selection.v1",
            "selected": True,
        }
    except (OSError, ValueError, UnicodeError):
        return False


def _write_marker(root: Path) -> None:
    marker = root / _MARKER
    # Exclusive create; a conflicting/unknown marker is not overwritten.
    with marker.open("x", encoding="utf-8") as out:
        json.dump({"schema": "jr.jrei.owner-private-storage-selection.v1",
                   "selected": True}, out, separators=(",", ":"))


def _copy_preserving_original(original: Path, dest: Path) -> None:
    """Same-user, same-PC copy with SHA verification and atomic promotion.

    The original private data remains untouched, even if a copy fails.
    Refuse any preexisting destination without an exact selection marker.
    """
    files = _files(original)
    if dest.exists():
        raise PrivateStorageError("JREI_PRIVATE_FALLBACK_ALREADY_OCCUPIED")
    dest.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    _safe_directory(dest.parent)
    stage = dest.parent / (".jrei-private-stage-" + secrets.token_hex(12))
    stage.mkdir(mode=0o700)
    try:
        _probe(stage)
        for relative, source in files:
            target = stage / relative
            target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            _safe_directory(target.parent)
            expected = _digest(source)
            with source.open("rb") as reader, target.open("xb") as writer:
                shutil.copyfileobj(reader, writer, length=1024 * 1024)
            if _digest(target) != expected or _digest(source) != expected:
                raise PrivateStorageError("JREI_PRIVATE_COPY_VERIFICATION_FAILED")
        _probe_real_owner_files(stage)
        _write_marker(stage)
        # Refuse a race in which another owner process claimed destination.
        if dest.exists():
            raise PrivateStorageError("JREI_PRIVATE_FALLBACK_RACE")
        stage.rename(dest)
        _probe(dest)
        _probe_real_owner_files(dest)
    finally:
        if stage.exists():
            shutil.rmtree(stage)


def select_private_storage() -> Path:
    """Call once before initializing DB, background workers or owner token.

    Prioritize a previously selected verified alternative. Otherwise prefer
    the established original path. An inaccessible original is copied intact
    to a fresh alternative, not replaced, and migration never crosses PCs.
    """
    primary, *alternatives = candidates()
    for root in (primary, *alternatives):
        _safe_directory(root)
    selected = [p for p in alternatives if _marked(p)]
    if len(selected) > 1:
        raise PrivateStorageError("JREI_MULTIPLE_ACTIVE_PRIVATE_STORES")
    if selected:
        root = selected[0]
        try:
            _probe(root)
            _probe_real_owner_files(root)
        except PrivateStorageError as exc:
            raise PrivateStorageError("JREI_SELECTED_PRIVATE_STORAGE_INACCESSIBLE") from exc
        return root
    try:
        primary.mkdir(mode=0o700, parents=True, exist_ok=True)
        _probe(primary)
        _probe_real_owner_files(primary)
        return primary
    except PrivateStorageError as exc:
        if str(exc) in (
            "JREI_PRIVATE_DB_BUSY_PRESERVE_CURRENT_ENGINE",
            "JREI_EXISTING_OWNER_TOKEN_EMPTY",
            "JREI_PRIVATE_FILE_LINK_REJECTED",
        ):
            raise
    except OSError:
        pass
    # Existing owner identities and databases must not be dropped in an
    # empty fallback. Copy the original atomically, verify and retain it.
    last_error = None
    for alternative in alternatives:
        try:
            _copy_preserving_original(primary, alternative)
            return alternative
        except (OSError, sqlite3.Error, PrivateStorageError) as exc:
            last_error = exc
    raise PrivateStorageError("JREI_FROZEN_RUNTIME_NO_WRITABLE_PRIVATE_STORE") from last_error
