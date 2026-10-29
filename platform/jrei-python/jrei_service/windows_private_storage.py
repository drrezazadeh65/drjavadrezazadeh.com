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


def _mkdir_owner(path: Path, *, parents: bool = False, exist_ok: bool = False) -> None:
    """Create a directory using the existing OWNER-profile ACL on Windows.

    CPython 3.13 gives mode=0o700 a special Windows DACL. When a process is
    elevated, the owner can become BUILTIN\\Administrators; later non-elevated
    engine processes then cannot create children. Windows mode=0o777 has no
    chmod-like 'world readable' meaning: the directory INHERITS the ACL of its
    existing per-user profile parent. POSIX must still use private 0o700.
    Never chmod, take ownership, reset ACLs, or touch an existing directory.
    Actual token/SQLite writes must pass independent preflight afterward.
    """
    path.mkdir(
        mode=(0o777 if os.name == "nt" else 0o700),
        parents=parents, exist_ok=exist_ok,
    )


class PrivateStorageError(RuntimeError):
    """Stable diagnostics only; do not print sensitive paths or credentials."""


def _install_adjacent_private(profile_root: Path) -> Path | None:
    """A stable, same-owner fallback beside the *versioned* release family.

    The Go installer already verified it can create files at its owner-local
    program destination. The engine must not guess Downloads or arbitrary
    writable directories. This directory is sibling of `releases`, NOT
    inside a disposable vX release. Refuse other users, reparse points,
    unversioned developer checkouts and network/UNC roots.
    """
    module = Path(__file__).absolute()
    try:
        source = module.parents[3]
        match = __import__("re").fullmatch(r"source-v(\d+\.\d+\.\d+)", source.name)
        release = source.parent
        if (not match or release.name != "v" + match.group(1)
                or release.parent.name != "releases"
                or not (release / "jrei-engine-manifest.json").is_file()):
            return None
        container = release.parent.parent
        user = profile_root.absolute()
        if os.name == "nt" and (
                os.path.commonpath((str(container), str(user))).casefold()
                != str(user).casefold()):
            return None
        if os.name != "nt":
            return None
        path = container
        while path != user:
            if path.is_symlink() or (
                    hasattr(path, "is_junction") and path.is_junction()):
                return None
            if path == path.parent:
                return None
            path = path.parent
        if user.is_symlink() or (
                hasattr(user, "is_junction") and user.is_junction()):
            return None
        return container / "JREI-Owner-Private" / "command-center"
    except (OSError, ValueError, IndexError):
        return None


def candidates() -> tuple[Path, ...]:
    local = os.environ.get("LOCALAPPDATA")
    profile = os.environ.get("USERPROFILE")
    roaming = os.environ.get("APPDATA")
    if os.name == "nt" and (not local or not profile):
        raise PrivateStorageError("JREI_WINDOWS_OWNER_PROFILE_MISSING")
    local_root = Path(local or Path.home()).absolute()
    profile_root = Path(profile or Path.home()).absolute()
    options = [
        local_root / "JREI" / "command-center",
        local_root / "JREI-Owner" / "command-center",
        profile_root / "JREI-Owner" / "command-center",
        local_root / "JREI-Private-v2" / "command-center",
        profile_root / ".jrei-owner" / "command-center",
    ]
    if roaming and os.path.isabs(roaming):
        roaming_root = Path(roaming).absolute()
        if not roaming_root.is_symlink() and not (
                hasattr(roaming_root, "is_junction")
                and roaming_root.is_junction()):
            # Do not select UNC roaming folders for private SQLite storage.
            if os.name != "nt" or not str(roaming_root).startswith("\\\\"):
                options.append(roaming_root / "JREI-Owner" / "command-center")
    adjacent = _install_adjacent_private(profile_root)
    if adjacent is not None:
        options.append(adjacent)
    return tuple(dict.fromkeys(options))


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
            # Existing owner credentials are read-only for engine startup.
            # Requiring 'r+b' needlessly rejects a valid protected token:
            # setup() creates ONLY missing tokens and must never overwrite.
            with token.open("rb") as stream:
                prefix = stream.read(1)
                if prefix == b"":
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
    """Preserve the exact original credentials and DB; never silently reset.

    Distinguish read-denied originals from write-denied destinations without
    exposing user paths. Cleanup must not mask the earlier root failure.
    """
    phase = "SOURCE_INVENTORY"
    stage: Path | None = None
    try:
        files = _files(original)
        phase = "TARGET_ALREADY_OCCUPIED"
        if dest.exists():
            raise PrivateStorageError("JREI_PRIVATE_FALLBACK_ALREADY_OCCUPIED")
        phase = "TARGET_DIRECTORY"
        _mkdir_owner(dest.parent, parents=True, exist_ok=True)
        _safe_directory(dest.parent)
        phase = "STAGING_DIRECTORY"
        stage = dest.parent / (".jrei-private-stage-" + secrets.token_hex(12))
        _mkdir_owner(stage)
        phase = "STAGING_WRITE_PROBE"
        _probe(stage)
        for relative, source in files:
            phase = "STAGING_FILE_DIRECTORY"
            target = stage / relative
            _mkdir_owner(target.parent, parents=True, exist_ok=True)
            _safe_directory(target.parent)
            phase = "SOURCE_FILE_READ"
            expected = _digest(source)
            phase = "SOURCE_COPY_OPEN"
            with source.open("rb") as reader:
                phase = "STAGING_COPY_WRITE"
                with target.open("xb") as writer:
                    shutil.copyfileobj(reader, writer, length=1024 * 1024)
            phase = "SOURCE_COPY_VERIFY"
            if _digest(target) != expected or _digest(source) != expected:
                raise PrivateStorageError("JREI_PRIVATE_COPY_VERIFICATION_FAILED")
        phase = "STAGING_OWNER_FILE_CHECK"
        _probe_real_owner_files(stage)
        phase = "STAGING_MARKER"
        _write_marker(stage)
        if dest.exists():
            raise PrivateStorageError("JREI_PRIVATE_FALLBACK_RACE")
        phase = "STAGING_PROMOTION"
        stage.rename(dest)
        phase = "PROMOTED_STORE_CHECK"
        _probe(dest)
        _probe_real_owner_files(dest)
    except PermissionError as exc:
        raise PrivateStorageError(
            "JREI_PRIVATE_" + phase + "_ACCESS_DENIED"
        ) from exc
    finally:
        if stage is not None and stage.exists():
            try:
                shutil.rmtree(stage)
            except OSError:
                # Original is never touched. A denied cleanup must not
                # replace the precise earlier read/write failure.
                pass


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
        _mkdir_owner(primary, parents=True, exist_ok=True)
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
    # Return the final stable, path-free root reason rather than hiding
    # every distinct source-copy or target-access failure in a generic code.
    # This never prints an owner's profile name, token or SQLite contents.
    if isinstance(last_error, PrivateStorageError):
        raise PrivateStorageError(str(last_error)) from last_error
    if isinstance(last_error, PermissionError):
        raise PrivateStorageError("JREI_PRIVATE_FALLBACK_FILESYSTEM_ACCESS_DENIED") from last_error
    if isinstance(last_error, sqlite3.Error):
        raise PrivateStorageError("JREI_PRIVATE_FALLBACK_SQLITE_UNAVAILABLE") from last_error
    raise PrivateStorageError("JREI_FROZEN_RUNTIME_NO_WRITABLE_PRIVATE_STORE") from last_error
