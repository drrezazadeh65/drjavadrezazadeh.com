"""Optional atomic replay claiming in the EXISTING mother MySQL.

This is an additive, fail-closed alternative to the single-process replay
cache in auth.py. It is not enabled by creating the source or migration.
A constrained DB account needs INSERT on the single nonce table. No read of
users, payments, model/worker keys or conversations is performed here.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path


class ReplayStoreUnavailable(RuntimeError):
    """Never fall back to a weaker local cache if durable replay fails."""


class NonceAlreadyClaimed(RuntimeError):
    """The same signed request nonce has already been used."""


def claim_mother_mysql_nonce(nonce: str, now: int, expiry: int) -> None:
    """Atomically claim a nonce using the UNIQUE mother-DB primary key.

    May raise ReplayStoreUnavailable or NonceAlreadyClaimed. Requires the
    separately approved additive migration and restricted TLS DB credentials.
    """
    host = os.environ.get("JREI_PYTHON_REPLAY_MYSQL_HOST", "").strip()
    username = os.environ.get("JREI_PYTHON_REPLAY_MYSQL_USER", "").strip()
    password = os.environ.get("JREI_PYTHON_REPLAY_MYSQL_PASSWORD", "")
    ca = os.environ.get("JREI_PYTHON_REPLAY_MYSQL_CA", "").strip()
    db = os.environ.get("JREI_PYTHON_REPLAY_MYSQL_DB", "")
    raw_port = os.environ.get("JREI_PYTHON_REPLAY_MYSQL_PORT", "3306")
    if not (host and username and password and ca and db == "drjavad1_store"):
        raise ReplayStoreUnavailable("MOTHER_REPLAY_CREDENTIALS_MISSING")
    if not raw_port.isascii() or not raw_port.isdigit() or not 1 <= int(raw_port) <= 65535:
        raise ReplayStoreUnavailable("MOTHER_REPLAY_PORT_INVALID")
    if not Path(ca).is_file():
        raise ReplayStoreUnavailable("MOTHER_REPLAY_TLS_CA_MISSING")
    if expiry <= now or expiry > now + 600:
        raise ReplayStoreUnavailable("MOTHER_REPLAY_EXPIRY_INVALID")
    try:
        import pymysql
    except ImportError as exc:
        raise ReplayStoreUnavailable("MOTHER_REPLAY_DRIVER_MISSING") from exc

    digest = hashlib.sha256(nonce.encode("ascii")).hexdigest()
    try:
        conn = pymysql.connect(
            host=host, port=int(raw_port), user=username,
            password=password, database=db,
            ssl_ca=ca, ssl_verify_cert=True, ssl_verify_identity=True,
            connect_timeout=3, read_timeout=3, write_timeout=3,
            autocommit=False,
        )
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO jrei_python_hmac_nonces "
                    "(service_name, nonce_sha256, first_seen_at, expires_at) "
                    "VALUES (%s,%s,%s,%s)",
                    ("bertina-owner-gateway", digest, now, expiry),
                )
            conn.commit()
        except pymysql.IntegrityError as exc:
            conn.rollback()
            if exc.args and exc.args[0] == 1062:
                raise NonceAlreadyClaimed("REPLAYED_REQUEST") from exc
            raise ReplayStoreUnavailable("MOTHER_REPLAY_INTEGRITY_FAILURE") from exc
        finally:
            conn.close()
    except NonceAlreadyClaimed:
        raise
    except (pymysql.MySQLError, OSError, ValueError) as exc:
        raise ReplayStoreUnavailable("MOTHER_REPLAY_UNAVAILABLE") from exc
