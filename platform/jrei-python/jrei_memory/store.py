"""Encrypted mother-DB owner memory; stage OFF until independent QA.

No new database, model call, public tenant access, automatic training or
unreviewed retention extension. The existing PHP MFA gateway supplies owner
identity. AES-GCM keys and the table-specific MySQL credentials remain private.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
from pathlib import Path
import secrets
import time
import uuid

from .contracts import (
    OwnerMemorySave, OwnerMemoryRef, OwnerMemoryReceipt,
    OwnerMemoryReadResult, OwnerMemoryRevokeReceipt,
    OwnerMemoryListQuery, OwnerMemoryMetadata, OwnerMemoryListResult,
)


class OwnerMemoryUnavailable(RuntimeError):
    pass


class OwnerMemoryConflict(OwnerMemoryUnavailable):
    """An already-used request key cannot mutate its original note."""
    pass


def _key() -> bytes:
    if os.environ.get("JREI_PYTHON_OWNER_MEMORY_ENABLED") != "1":
        raise OwnerMemoryUnavailable("OWNER_MEMORY_DISABLED")
    text = os.environ.get("JREI_PYTHON_OWNER_MEMORY_KEY_B64", "")
    try:
        key = base64.b64decode(text, validate=True)
    except Exception as exc:
        raise OwnerMemoryUnavailable("OWNER_MEMORY_KEY_INVALID") from exc
    if len(key) != 32:
        raise OwnerMemoryUnavailable("OWNER_MEMORY_KEY_INVALID")
    return key


def _connect(*, for_revoke: bool = False):
    """Open a TLS-verified connection with table-restricted credentials."""
    if (os.environ.get("JREI_PYTHON_OWNER_MEMORY_ENABLED") != "1" and
        not (for_revoke and os.environ.get("JREI_PYTHON_OWNER_MEMORY_REVOKE_ENABLED") == "1")):
        raise OwnerMemoryUnavailable("OWNER_MEMORY_DISABLED")
    host = os.environ.get("JREI_PYTHON_OWNER_MEMORY_MYSQL_HOST", "").strip()
    user = os.environ.get("JREI_PYTHON_OWNER_MEMORY_MYSQL_USER", "").strip()
    password = os.environ.get("JREI_PYTHON_OWNER_MEMORY_MYSQL_PASSWORD", "")
    ca = os.environ.get("JREI_PYTHON_OWNER_MEMORY_MYSQL_CA", "").strip()
    port = os.environ.get("JREI_PYTHON_OWNER_MEMORY_MYSQL_PORT", "3306")
    if not (host and user and password and ca and Path(ca).is_file() and
            os.environ.get("JREI_PYTHON_OWNER_MEMORY_MYSQL_DB") == "drjavad1_store" and
            port.isascii() and port.isdigit() and 1 <= int(port) <= 65535):
        raise OwnerMemoryUnavailable("OWNER_MEMORY_DB_CONFIGURATION_MISSING")
    try:
        import pymysql
        return pymysql.connect(
            host=host, user=user, password=password, port=int(port),
            database="drjavad1_store", ssl_ca=ca,
            ssl_verify_cert=True, ssl_verify_identity=True,
            connect_timeout=3, read_timeout=3, write_timeout=3,
            autocommit=False,
        )
    except Exception as exc:
        raise OwnerMemoryUnavailable("OWNER_MEMORY_DB_UNAVAILABLE") from exc


def _cipher():
    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    except ImportError as exc:
        raise OwnerMemoryUnavailable("OWNER_MEMORY_ENCRYPTION_DRIVER_MISSING") from exc
    return AESGCM(_key())


def _aad(owner_id: str, record_id: str, purpose: str, expires_at: int) -> bytes:
    return f"jr.jrei.owner-memory.v1|{owner_id}|{record_id}|{purpose}|{expires_at}".encode("ascii")


def save_owner_note(request: OwnerMemorySave) -> OwnerMemoryReceipt:
    """Atomically persist a note or recover an identical idempotent submission.

    A repeated request key is never allowed to change a note, restore a
    revoked note, or extend its original retention interval. Reconciliation
    reads the existing ciphertext under a row lock, not another data store.
    """
    aes = _cipher()
    now = int(time.time())
    expiry = now + request.retention_days * 86400
    record_id = str(uuid.uuid4())
    replayed = False
    nonce = secrets.token_bytes(12)
    plaintext = request.note.encode("utf-8")
    ciphertext = aes.encrypt(
        nonce, plaintext,
        _aad(request.owner_account_id, record_id, request.purpose, expiry),
    )
    checksum = hashlib.sha256(ciphertext).hexdigest()
    conn = _connect()
    try:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    "INSERT INTO jrei_python_owner_memory_records "
                    "(record_id,owner_account_id,request_key,purpose,nonce,"
                    "ciphertext,ciphertext_sha256,created_at,expires_at,revoked_at) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,NULL)",
                    (record_id, request.owner_account_id, request.request_key,
                     request.purpose, nonce, ciphertext, checksum, now, expiry),
                )
            except Exception as exc:
                # Only a unique-key collision is a possible idempotent replay.
                # Never reinterpret schema, connectivity or permission failures.
                if not getattr(exc, "args", ()) or exc.args[0] != 1062:
                    raise
                cur.execute(
                    "SELECT record_id,purpose,nonce,ciphertext,"
                    "ciphertext_sha256,created_at,expires_at,revoked_at "
                    "FROM jrei_python_owner_memory_records "
                    "WHERE owner_account_id=%s AND request_key=%s "
                    "LIMIT 1 FOR UPDATE",
                    (request.owner_account_id, request.request_key),
                )
                row = cur.fetchone()
                if row is None:
                    raise OwnerMemoryConflict("OWNER_MEMORY_IDEMPOTENCY_CONFLICT") from exc
                old_id, old_purpose, old_nonce, old_cipher, old_hash, created, old_expiry, revoked = row
                if (revoked is not None or int(old_expiry) <= now
                        or old_purpose != request.purpose
                        or int(old_expiry) - int(created) != request.retention_days * 86400
                        or not isinstance(old_nonce, bytes)
                        or not isinstance(old_cipher, bytes)
                        or len(old_nonce) != 12
                        or not isinstance(old_hash, str)
                        or not hmac.compare_digest(
                            hashlib.sha256(old_cipher).hexdigest(), old_hash
                        )):
                    raise OwnerMemoryConflict("OWNER_MEMORY_IDEMPOTENCY_CONFLICT") from exc
                try:
                    existing = aes.decrypt(
                        old_nonce, old_cipher,
                        _aad(request.owner_account_id, old_id, old_purpose, int(old_expiry)),
                    )
                except Exception as decrypt_exc:
                    raise OwnerMemoryConflict("OWNER_MEMORY_IDEMPOTENCY_CONFLICT") from decrypt_exc
                if not hmac.compare_digest(existing, plaintext):
                    raise OwnerMemoryConflict("OWNER_MEMORY_IDEMPOTENCY_CONFLICT") from exc
                record_id, expiry = old_id, int(old_expiry)
                replayed = True
        conn.commit()
    except OwnerMemoryUnavailable:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise OwnerMemoryUnavailable("OWNER_MEMORY_WRITE_UNAVAILABLE") from exc
    finally:
        conn.close()
    return OwnerMemoryReceipt(
        record_id=record_id, purpose=request.purpose, expires_at=expiry,
        idempotent_replay=replayed,
        persist_result=("MOTHER_DB_VERIFIED_REPLAY" if replayed else "MOTHER_DB_ATOMIC_INSERT"),
    )


def read_owner_note(request: OwnerMemoryRef) -> OwnerMemoryReadResult:
    aes = _cipher()
    now = int(time.time())
    conn = _connect()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT purpose,nonce,ciphertext,ciphertext_sha256,expires_at "
                "FROM jrei_python_owner_memory_records "
                "WHERE owner_account_id=%s AND record_id=%s "
                "AND revoked_at IS NULL AND expires_at>%s LIMIT 1",
                (request.owner_account_id, request.record_id, now),
            )
            row = cur.fetchone()
    except Exception as exc:
        raise OwnerMemoryUnavailable("OWNER_MEMORY_READ_UNAVAILABLE") from exc
    finally:
        conn.close()
    if not row:
        return OwnerMemoryReadResult(found=False, record_id=request.record_id)
    purpose, nonce, ciphertext, checksum, expiry = row
    if (not isinstance(nonce, bytes) or not isinstance(ciphertext, bytes)
            or len(nonce) != 12 or
            hashlib.sha256(ciphertext).hexdigest() != checksum):
        raise OwnerMemoryUnavailable("OWNER_MEMORY_CIPHERTEXT_INVALID")
    try:
        raw = aes.decrypt(
            nonce, ciphertext,
            _aad(request.owner_account_id, request.record_id, purpose, int(expiry)),
        )
        plaintext = raw.decode("utf-8")
    except Exception as exc:
        raise OwnerMemoryUnavailable("OWNER_MEMORY_DECRYPTION_FAILED") from exc
    return OwnerMemoryReadResult(
        found=True, record_id=request.record_id, purpose=purpose,
        note=plaintext, expires_at=int(expiry),
    )



def list_owner_memory_metadata(request: OwnerMemoryListQuery) -> OwnerMemoryListResult:
    """Page an owner's live encrypted-note metadata without retrieving bytes.

    Only original-session-injected owner identity may reach this route.
    Cursor pairs make ties deterministic; neither ciphertext nor private
    note content is selected, logged, returned, or used for model training.
    """
    now = int(time.time())
    limit = request.limit + 1
    conn = _connect()
    try:
        with conn.cursor() as cur:
            if request.before_created_at is None:
                cur.execute(
                    "SELECT record_id,purpose,created_at,expires_at "
                    "FROM jrei_python_owner_memory_records "
                    "WHERE owner_account_id=%s AND revoked_at IS NULL "
                    "AND expires_at>%s "
                    "ORDER BY created_at DESC,record_id DESC LIMIT %s",
                    (request.owner_account_id, now, limit),
                )
            else:
                cur.execute(
                    "SELECT record_id,purpose,created_at,expires_at "
                    "FROM jrei_python_owner_memory_records "
                    "WHERE owner_account_id=%s AND revoked_at IS NULL "
                    "AND expires_at>%s AND "
                    "(created_at<%s OR (created_at=%s AND record_id<%s)) "
                    "ORDER BY created_at DESC,record_id DESC LIMIT %s",
                    (
                        request.owner_account_id, now,
                        request.before_created_at, request.before_created_at,
                        request.before_record_id, limit,
                    ),
                )
            rows = cur.fetchall()
    except Exception as exc:
        raise OwnerMemoryUnavailable("OWNER_MEMORY_LIST_UNAVAILABLE") from exc
    finally:
        conn.close()

    more = len(rows) > request.limit
    current = rows[:request.limit]
    entries = [
        OwnerMemoryMetadata(
            record_id=row[0], purpose=row[1],
            created_at=int(row[2]), expires_at=int(row[3]),
        )
        for row in current
    ]
    # Expose a continuation cursor only when a next page truly exists.
    last = entries[-1] if more and entries else None
    return OwnerMemoryListResult(
        entries=entries, has_more=more,
        next_before_created_at=last.created_at if last else None,
        next_before_record_id=last.record_id if last else None,
    )


def revoke_owner_note(request: OwnerMemoryRef) -> OwnerMemoryRevokeReceipt:
    # Deletion is available under a separate owner-controlled switch even
    # when new saves/reads are disabled; no encryption key is needed.
    now = int(time.time())
    conn = _connect(for_revoke=True)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE jrei_python_owner_memory_records "
                "SET nonce=NULL,ciphertext=NULL,revoked_at=%s "
                "WHERE owner_account_id=%s AND record_id=%s "
                "AND revoked_at IS NULL",
                (now, request.owner_account_id, request.record_id),
            )
            changed = cur.rowcount == 1
        conn.commit()
    except Exception as exc:
        conn.rollback()
        raise OwnerMemoryUnavailable("OWNER_MEMORY_REVOKE_UNAVAILABLE") from exc
    finally:
        conn.close()
    return OwnerMemoryRevokeReceipt(
        record_id=request.record_id,
        ciphertext_erased_from_current_row=changed,
    )
