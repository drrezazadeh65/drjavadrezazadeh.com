"""Original JREI character n-gram language-learning baseline, trained from zero.

Native, transparent, small and entirely within the EXISTING JREI Python app.
Uses Python stdlib only; no other app, pretrained weights, API, outbound HTTP,
or new database. Learns frequency statistics from owner-reviewed, rights-cleared
public educational QA lessons already in missions.sqlite3.

This is a REAL next-byte statistical language model, *not* a neural LLM,
assistant, verified fact-generator or suitable independent writing engine.
Heldout comparison measures next-byte prediction, NOT factual correctness.

Algorithms (independent JREI implementation): additive smoothing and variable-
order interpolated Markov language models; no external implementation copied.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from contextlib import closing
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time
import threading

SCHEMA = "jr.jrei.native-byte-language-baseline.v1"
RIGHTS_SCOPE = "REVIEWED_PUBLIC_LESSONS_TRAINING_OWNER_APPROVED"
MAX_TRAIN = 600
MAX_HELDOUT = 150
MAX_BYTES = 1_800_000
ORDER = 4
SHA = re.compile(r"^[a-f0-9]{64}$")
_BASE = 256
_TRAIN_LOCK = threading.Lock()


def _db(path: Path):
    db = sqlite3.connect(path, timeout=15, isolation_level=None)
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=15000")
    return db


def initialize(db_path: Path):
    with closing(_db(db_path)) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_native_brain_runs (
            id TEXT PRIMARY KEY, created INTEGER NOT NULL,
            train_sha256 TEXT NOT NULL, heldout_sha256 TEXT NOT NULL,
            train_sources INTEGER NOT NULL, heldout_sources INTEGER NOT NULL,
            training_examples INTEGER NOT NULL,
            heldout_examples INTEGER NOT NULL,
            artifact_sha256 TEXT NOT NULL,
            bits_per_byte REAL NOT NULL, baseline_bits_per_byte REAL NOT NULL,
            state TEXT NOT NULL, independent_quality_verified INTEGER NOT NULL
                DEFAULT 0)""")
        db.execute("CREATE INDEX IF NOT EXISTS jrei_native_brain_runs_time ON jrei_native_brain_runs(created DESC)")
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_native_brain_controls (
            id INTEGER PRIMARY KEY CHECK(id=1),
            enabled INTEGER NOT NULL DEFAULT 0,
            training_rights_reviewed INTEGER NOT NULL DEFAULT 0,
            changed INTEGER NOT NULL DEFAULT 0)""")
        db.execute("""INSERT OR IGNORE INTO jrei_native_brain_controls
            (id,enabled,training_rights_reviewed,changed)
            VALUES(1,0,0,0)""")


def set_continuous_training(db_path: Path, *, enabled: bool,
                            owner_confirmed: bool,
                            training_rights_reviewed: bool) -> dict:
    """Only an owner-authenticated request can opt into continuous learning.

    Never extends source permissions: private owner documents remain excluded.
    This permission affects only local candidate training, not production.
    """
    if (type(enabled) is not bool or owner_confirmed is not True or
            (enabled and training_rights_reviewed is not True)):
        raise ValueError("JREI_NATIVE_TRAINING_OWNER_RIGHTS_APPROVAL_REQUIRED")
    with closing(_db(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("""UPDATE jrei_native_brain_controls
            SET enabled=?,training_rights_reviewed=?,changed=? WHERE id=1""",
            (int(enabled),int(enabled and training_rights_reviewed),int(time.time())))
        db.commit()
    return {"state":"CONTINUOUS_NATIVE_TRAINING_OPTED_IN" if enabled
            else "CONTINUOUS_NATIVE_TRAINING_DISABLED",
            "private_documents_used":False,
            "network_requests":0,
            "training_performed_by_control":False}


def training_allowed(db_path: Path) -> bool:
    try:
        with closing(_db(db_path)) as db:
            row=db.execute("""SELECT enabled,training_rights_reviewed
                FROM jrei_native_brain_controls WHERE id=1""").fetchone()
        return bool(row and row==(1,1))
    except sqlite3.Error:
        return False



def _rows(db_path: Path):
    """Only active reviewed public source versions, and source-disjoint roles.

    PRIVATE_OWNER_GRANTED is excluded completely; it cannot silently become
    model-training data because the owner indexed a personal document.
    """
    from jrei_service.windows_native_corpus import (
        TRAINABLE_LICENSES, _publisher_key, _canonical_passage)
    with closing(_db(db_path)) as db:
        rows = db.execute("""SELECT l.question,l.answer,l.data_role,
              l.source_id,v.sha256,l.draft_sha256,s.licence,s.issuer
              FROM learning_lessons l
              JOIN learning_sources s ON s.id=l.source_id
              JOIN learning_versions v ON v.id=l.version_id
              WHERE l.review_state='EXTERNALLY_ATTESTED'
                AND l.data_role IN ('LEARNING','HELDOUT')
                AND s.rights='PUBLIC_REUSE_APPROVED'
                AND s.reviewed=1 AND s.active=1
                AND s.last_sha=v.sha256
                AND l.independent_evidence_sha256 IS NOT NULL
              ORDER BY l.id LIMIT 2000""").fetchall()
    eligible = [row for row in rows if
                isinstance(row[6], str)
                and row[6].casefold() in TRAINABLE_LICENSES
                and isinstance(row[7], str) and len(row[7].strip()) >= 3]
    train_full = [r for r in eligible if r[2] == "LEARNING"][:MAX_TRAIN]
    heldout_full = [r for r in eligible if r[2] == "HELDOUT"][:MAX_HELDOUT]
    if ({_publisher_key(r[7]) for r in train_full}
            & {_publisher_key(r[7]) for r in heldout_full}):
        raise ValueError("JREI_NATIVE_TRAIN_HELDOUT_PUBLISHER_LEAKAGE")
    # The same Q&A text under different nominal source IDs is still leakage.
    if ({_canonical_passage(r[0] + "\n" + r[1]) for r in train_full}
            & {_canonical_passage(r[0] + "\n" + r[1]) for r in heldout_full}):
        raise ValueError("JREI_NATIVE_TRAIN_HELDOUT_QA_LEAKAGE")
    train = [r[:6] for r in train_full]
    heldout = [r[:6] for r in heldout_full]
    if ({r[3] for r in train} & {r[3] for r in heldout}):
        raise ValueError("JREI_NATIVE_TRAIN_HELDOUT_SOURCE_LEAKAGE")
    if ({(r[3], r[4]) for r in train} &
            {(r[3], r[4]) for r in heldout}):
        raise ValueError("JREI_NATIVE_TRAIN_HELDOUT_VERSION_LEAKAGE")
    return train, heldout


def _canonical(rows):
    # The published source ID and version SHA are part of each sample digest;
    # a licence revocation or new source version changes future eligibility.
    docs = []
    for question, answer, _role, sid, source_sha, pair_sha in rows:
        if (not isinstance(question, str) or not isinstance(answer, str)
                or not 12 <= len(question) <= 650
                or not 20 <= len(answer) <= 1900
                or not SHA.fullmatch(source_sha)
                or not SHA.fullmatch(pair_sha)):
            raise ValueError("JREI_NATIVE_LESSON_INVALID")
        if hashlib.sha256((question + "\n" + answer).encode("utf-8")).hexdigest() != pair_sha:
            raise ValueError("JREI_NATIVE_LESSON_CHANGED_AFTER_REVIEW")
        docs.append({"source":sid, "source_sha":source_sha,
                     "text":"QUESTION: "+question+"\nANSWER: "+answer+"\n"})
    canonical = json.dumps(docs, ensure_ascii=False, separators=(",",":"),
                           sort_keys=True).encode("utf-8")
    if len(canonical)>MAX_BYTES:
        raise ValueError("JREI_NATIVE_DATASET_TOO_LARGE")
    return docs, hashlib.sha256(canonical).hexdigest()


def _counts(docs):
    unigram = Counter()
    by_context = [defaultdict(Counter) for _ in range(ORDER - 1)]
    total = 0
    for item in docs:
        raw = item["text"].encode("utf-8")
        history = []
        for byte in raw:
            unigram[byte] += 1
            total += 1
            for length, counters in enumerate(by_context, start=1):
                if len(history) >= length:
                    counters[tuple(history[-length:])][byte] += 1
            history.append(byte)
    if total < 1000:
        raise ValueError("JREI_NATIVE_TRAINING_TEXT_INSUFFICIENT")
    if sum(len(x) for x in by_context)>90000:
        raise ValueError("JREI_NATIVE_NGRAM_MODEL_OVERSIZE")
    return unigram, by_context, total


def _probability(byte, history, unigram, by_context, total, *, order=ORDER):
    # Transparent interpolation: sparse contexts are weak evidence and
    # automatically back off to broad statistics.
    probability = (unigram.get(byte, 0) + 0.5) / (total + 0.5*_BASE)
    for length in range(1, order):
        if len(history) < length:
            break
        counts = by_context[length - 1].get(tuple(history[-length:]))
        if not counts:
            continue
        hits = sum(counts.values())
        estimate = (counts.get(byte, 0) + 0.5) / (hits + 0.5*_BASE)
        confidence = min(0.91, hits/(hits+9.0))
        probability = confidence*estimate + (1-confidence)*probability
    return max(probability, 1e-15)


def _bits_per_byte(docs, unigram, by_context, total, *, order):
    bits = 0.0
    length = 0
    for item in docs:
        history = []
        for byte in item["text"].encode("utf-8"):
            probability = _probability(byte, history, unigram, by_context,
                                       total, order=order)
            bits -= math.log2(probability)
            length += 1
            history.append(byte)
    if length < 200:
        raise ValueError("JREI_NATIVE_HELDOUT_TOO_SHORT")
    return round(bits/length, 6), length


def train(*, db_path: Path, private: Path, owner_approved: bool,
          training_rights_reviewed: bool, resources_available: bool) -> dict:
    if owner_approved is not True or training_rights_reviewed is not True:
        raise ValueError("JREI_NATIVE_OWNER_AND_TRAINING_RIGHTS_APPROVAL_REQUIRED")
    if resources_available is not True:
        return {"state":"NATIVE_TRAIN_DEFERRED_LOW_RESOURCES",
                "trained":False}
    train_rows, held_rows = _rows(db_path)
    if len(train_rows)<20 or len(held_rows)<10:
        return {"state":"NATIVE_AWAITING_REVIEWED_BILINGUAL_EXAMPLES",
                "train_samples":len(train_rows),"heldout_samples":len(held_rows),
                "trained":False, "other_models_used":False}
    train_docs, train_sha = _canonical(train_rows)
    # A source unchanged since the latest candidate needs no new training.
    # This is a content-addressed learning cycle, not a fixed daily quota.
    with closing(_db(db_path)) as db:
        prior=db.execute("""SELECT id FROM jrei_native_brain_runs
            WHERE train_sha256=? AND state='CANDIDATE_UNTESTED_NOT_PROMOTED'
            ORDER BY created DESC LIMIT 1""",(train_sha,)).fetchone()
    if prior is not None:
        return {"state":"NATIVE_TRAINING_DATA_UNCHANGED",
                "existing_run_id":prior[0], "trained":False}
    held_docs, held_sha = _canonical(held_rows)
    if train_sha == held_sha:
        raise ValueError("JREI_NATIVE_HELDOUT_DUPLICATES_TRAIN")
    unigram, by_context, total = _counts(train_docs)
    held_bpb, held_bytes = _bits_per_byte(held_docs, unigram, by_context, total,
                                         order=ORDER)
    base_bpb, _ = _bits_per_byte(held_docs, unigram, by_context, total,
                                order=1)
    payload = {
        "schema":SCHEMA,
        "model_family":"jrei-native-statistical",
        "pretrained_weights_used":False,
        "neural_network":False,
        "training_data_sha256":train_sha,
        "heldout_data_sha256":held_sha,
        "order":ORDER, "total_training_bytes":total,
        "unigram":{str(k):int(v) for k,v in sorted(unigram.items())},
        "contexts":[{
            ",".join(map(str,context)):{
                str(k):int(v) for k,v in sorted(counts.items())}
            for context,counts in sorted(layer.items())}
            for layer in by_context],
        "state":"EXPERIMENTAL_NEEDS_INDEPENDENT_ACCEPTANCE",
    }
    encoded = json.dumps(payload,ensure_ascii=False,separators=(",",":"),
                         sort_keys=True).encode("utf-8")
    if len(encoded)>8_000_000:
        raise ValueError("JREI_NATIVE_MODEL_ARTIFACT_OVERSIZE")
    # Never modify an existing snapshot or the current language backend.
    root = private/"native-brain"
    if root.is_symlink():
        raise ValueError("JREI_NATIVE_OUTPUT_DIRECTORY_LINKED")
    root.mkdir(mode=0o700,parents=True,exist_ok=True)
    ident=secrets.token_hex(16)
    target=root/(ident+".model.json.gz")
    with target.open("xb") as handle:
        with gzip.GzipFile(filename="", mode="wb",fileobj=handle,
                           mtime=0) as zipstream:
            zipstream.write(encoded)
    artifact=hashlib.sha256(target.read_bytes()).hexdigest()
    with closing(_db(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("""INSERT INTO jrei_native_brain_runs (
             id,created,train_sha256,heldout_sha256,train_sources,
             heldout_sources,training_examples,heldout_examples,
             artifact_sha256,bits_per_byte,baseline_bits_per_byte,state)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
             (ident,int(time.time()),train_sha,held_sha,
              len({x[3] for x in train_rows}),len({x[3] for x in held_rows}),
              len(train_rows),len(held_rows),artifact,held_bpb,base_bpb,
              "CANDIDATE_UNTESTED_NOT_PROMOTED"))
        db.commit()
    return {"state":"CANDIDATE_UNTESTED_NOT_PROMOTED","id":ident,
            "artifact_sha256":artifact,
            "training_samples":len(train_rows),
            "heldout_samples":len(held_rows),
            "heldout_bytes":held_bytes,
            "heldout_bits_per_byte":held_bpb,
            "unigram_baseline_bits_per_byte":base_bpb,
            "neural_weights_created":False,
            "independent_language_quality_verified":False,
            "published_or_activated":False,
            "other_models_used":False}


def tick(db_path: Path, private: Path, *, resources_available: bool,
         owner_active: bool) -> dict:
    """One bounded owner-opted-in candidate training step while Windows idle."""
    if owner_active or not resources_available:
        return {"state":"NATIVE_TRAINING_DEFERRED"}
    if not training_allowed(db_path):
        return {"state":"NATIVE_TRAINING_NOT_AUTHORIZED"}
    if not _TRAIN_LOCK.acquire(blocking=False):
        return {"state":"NATIVE_TRAINING_ALREADY_RUNNING"}
    try:
        return train(db_path=db_path,private=private,owner_approved=True,
                     training_rights_reviewed=True,
                     resources_available=resources_available)
    finally:
        _TRAIN_LOCK.release()


def snapshot(db_path: Path, private: Path):
    """Passive status; never loads or executes a model file."""
    try:
        with closing(_db(db_path)) as db:
            row=db.execute("""SELECT id,created,train_sha256,
                training_examples,heldout_examples,bits_per_byte,
                baseline_bits_per_byte,state FROM jrei_native_brain_runs
                ORDER BY created DESC,id DESC LIMIT 1""").fetchone()
        if not row:
            return {"state":"NO_NATIVE_TRAINING_RUN",
                    "continuous_training_authorized":training_allowed(db_path),
                    "trained_general_llm":False,
                    "other_models_used":False}
        ident,created,train_sha,examples,held,bpb,baseline,state=row
        return {"state":state,"run_id":ident,"created":created,
                "continuous_training_authorized":training_allowed(db_path),
                "train_data_sha256":train_sha,
                "training_examples":examples,"heldout_examples":held,
                "heldout_bits_per_byte":bpb,
                "unigram_baseline_bits_per_byte":baseline,
                "executable_native_language_model":False,
                "trained_general_llm":False,
                "scientific_quality_verified":False,
                "other_models_used":False}
    except sqlite3.Error:
        return {"state":"NATIVE_TRAINING_STATUS_UNAVAILABLE",
                "trained_general_llm":False}
