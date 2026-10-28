"""Optional FTS5 scale-out for the EXISTING owner-private JREI knowledge tables.

SQLite FTS5 is used only if compiled into the installed Windows Python.
No package installation, new database, external embeddings service, internet
or model training. Its search results are still filtered by current source
rights and version in the canonical local learning_* tables.
"""
from __future__ import annotations

from contextlib import closing
from pathlib import Path
import re
import sqlite3
import time

_STATUS = "learning_fts_state"
_VALID_TERM = re.compile(r"^[\w\u0600-\u06ff]{3,64}$")


def _db(path: Path):
    db=sqlite3.connect(path,timeout=15,isolation_level=None)
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=15000")
    return db


def initialize(db_path: Path) -> dict:
    """Initialize optional FTS index and triggers without a forced rebuild."""
    with closing(_db(db_path)) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS learning_fts_state(
          id INTEGER PRIMARY KEY CHECK(id=1),
          ready INTEGER NOT NULL DEFAULT 0,
          updated INTEGER NOT NULL DEFAULT 0,
          version INTEGER NOT NULL DEFAULT 1)""")
        db.execute("""INSERT OR IGNORE INTO learning_fts_state
          (id,ready,updated,version) VALUES(1,0,0,1)""")
        try:
            db.execute("""CREATE VIRTUAL TABLE IF NOT EXISTS
              learning_passages_fts USING fts5(
                text, content='learning_passages',
                content_rowid='rowid',tokenize='unicode61')""")
            db.executescript("""
              CREATE TRIGGER IF NOT EXISTS learning_fts_ai
              AFTER INSERT ON learning_passages BEGIN
                INSERT INTO learning_passages_fts(rowid,text)
                VALUES(new.rowid,new.text);
              END;
              CREATE TRIGGER IF NOT EXISTS learning_fts_ad
              AFTER DELETE ON learning_passages BEGIN
                INSERT INTO learning_passages_fts(
                   learning_passages_fts,rowid,text)
                VALUES('delete',old.rowid,old.text);
              END;
              CREATE TRIGGER IF NOT EXISTS learning_fts_au
              AFTER UPDATE OF text ON learning_passages BEGIN
                INSERT INTO learning_passages_fts(
                   learning_passages_fts,rowid,text)
                VALUES('delete',old.rowid,old.text);
                INSERT INTO learning_passages_fts(rowid,text)
                VALUES(new.rowid,new.text);
              END;
            """)
            return {"state":"FTS5_SOURCE_STAGED","rebuild_executed":False}
        except sqlite3.OperationalError:
            # The original bounded lexical scan must remain operational if
            # Windows Python is compiled without FTS5 support.
            return {"state":"FTS5_UNAVAILABLE_FALLBACK","rebuild_executed":False}


def ready(db_path: Path) -> bool:
    try:
        with closing(_db(db_path)) as db:
            row=db.execute(
                "SELECT ready FROM learning_fts_state WHERE id=1"
            ).fetchone()
        return bool(row and row[0])
    except sqlite3.Error:
        return False


def rebuild_when_idle(db_path: Path, *, resources_available: bool,
                      owner_active: bool=False) -> dict:
    """One-time index of pre-existing knowledge, only during approved idle.

    Rebuild may block SQLite briefly on a large archive; the caller must
    defer it when the owner is active or Windows resource headroom is low.
    """
    if owner_active or not resources_available:
        return {"state":"FTS_REBUILD_DEFERRED"}
    try:
        with closing(_db(db_path)) as db:
            db.execute("BEGIN IMMEDIATE")
            state=db.execute("""SELECT ready FROM learning_fts_state
              WHERE id=1""").fetchone()
            if state is None:
                db.rollback()
                return {"state":"FTS_NOT_INITIALIZED"}
            if state[0]==1:
                db.commit()
                return {"state":"FTS_ALREADY_READY"}
            db.execute(
                "INSERT INTO learning_passages_fts(learning_passages_fts) "
                "VALUES('rebuild')")
            db.execute("""UPDATE learning_fts_state SET ready=1,
                updated=? WHERE id=1""",(int(time.time()),))
            db.commit()
            return {"state":"FTS_REBUILT_LOCALLY","model_weights_changed":False}
    except sqlite3.Error:
        return {"state":"FTS_REBUILD_UNAVAILABLE_FALLBACK"}


def lookup_rows(db_path: Path, terms: list[str], limit: int=350):
    """Return canonical row shape or None if the optional index is unavailable.

    An empty list is an authoritative 'no lexical match in indexed sources'.
    User questions are never stored in this index, only source passages.
    """
    if not ready(db_path):
        return None
    if not isinstance(terms,list):
        return None
    safe=[word for word in dict.fromkeys(terms)
          if isinstance(word,str) and _VALID_TERM.fullmatch(word)]
    if not safe:
        return []
    expression=" OR ".join('"'+word.replace('"','')+'"' for word in safe[:12])
    try:
        with closing(_db(db_path)) as db:
            return db.execute("""SELECT s.url,s.issuer,s.rights,s.licence,
              v.sha256,p.anchor,p.text,p.sha256
              FROM learning_passages_fts
              JOIN learning_passages p ON p.rowid=learning_passages_fts.rowid
              JOIN learning_sources s ON s.id=p.source_id
              JOIN learning_versions v ON v.id=p.version_id
              WHERE learning_passages_fts MATCH ?
                AND s.reviewed=1
                AND (s.active=1 OR s.rights='PRIVATE_OWNER_GRANTED')
                AND s.last_sha=v.sha256
              ORDER BY bm25(learning_passages_fts),p.created DESC
              LIMIT ?""",(expression,min(700,max(1,limit)))).fetchall()
    except sqlite3.Error:
        return None


def snapshot(db_path: Path) -> dict:
    try:
        with closing(_db(db_path)) as db:
            row=db.execute("""SELECT ready,updated FROM learning_fts_state
              WHERE id=1""").fetchone()
        return {"state":"INDEX_READY" if row and row[0] else "NOT_READY",
                "indexed_at":row[1] if row else None,
                "semantic_embedding_search":False}
    except sqlite3.Error:
        return {"state":"FTS_UNAVAILABLE","semantic_embedding_search":False}
