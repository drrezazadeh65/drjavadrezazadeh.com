"""JREI-owned, from-scratch language dataset builder using approved source data.

Reuses the EXISTING windows_continuous_learning SQLite source/passages schema.
Tokenizer is bundled MIT minBPE *code*; no weights, online downloader, new
database, hosted model, UI or separate process are introduced. This does not
run automatically: it is invoked after explicit owner preparation consent.

Training/heldout groups are separated by source, before training the BPE.
The heldout corpus is never used to fit the tokenizer. Hashes, independent
review boundaries and source revocation are preserved in a local manifest.
"""
from __future__ import annotations

from array import array
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import sys
import time
import unicodedata

SCHEMA = "jr.jrei.native-foundation-corpus.v1"
SHA = re.compile(r"^[a-f0-9]{64}$")
IDENT = re.compile(r"^[a-f0-9]{32}$")
MAX_CHARS = 850_000
MAX_PASSAGE = 6000
MIN_TRAIN_IDS = 512
MIN_HELDOUT_IDS = 128
# Restrict from-scratch model training to genuinely reusable, attribution-
# compatible data sources. "Publicly viewable" is not training permission.
TRAINABLE_LICENSES = frozenset((
    "cc0-1.0", "cc-by-4.0", "mit", "apache-2.0",
    "bsd-2-clause", "bsd-3-clause", "0bsd", "unlicense",
    "public-domain", "public_domain",
))


def _sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def _sha_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _db(path: Path):
    connection = sqlite3.connect(path, timeout=20, isolation_level=None)
    connection.execute("PRAGMA foreign_keys=ON")
    connection.execute("PRAGMA busy_timeout=20000")
    return connection


def _approved_corpus(db_path: Path) -> list[dict]:
    """Read current, explicitly public-reuse-approved versions only."""
    with closing(_db(db_path)) as db:
        db.execute("BEGIN")
        # Bound each source's contribution before applying the global read
        # budget. Ordering by one source ID would otherwise starve other
        # eligible publishers and compromise source-disjoint evaluation.
        rows = db.execute("""SELECT id, last_sha, licence, issuer, text, sha256
          FROM (
            SELECT s.id, s.last_sha, s.licence, s.issuer,
              p.text, p.sha256,
              ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY p.id) AS rank_in_source
            FROM learning_passages p
            JOIN learning_sources s ON s.id=p.source_id
            JOIN learning_versions v ON v.id=p.version_id
            WHERE s.reviewed=1 AND s.active=1
              AND s.rights='PUBLIC_REUSE_APPROVED'
              AND s.last_sha=v.sha256
              AND v.source_id=s.id
          ) WHERE rank_in_source<=64
          ORDER BY id,rank_in_source LIMIT 4500""").fetchall()
        db.commit()
    sources: dict[str, dict] = {}
    for sid, revision, license_id, issuer, passage, digest in rows:
        if (not isinstance(sid, str) or not IDENT.fullmatch(sid)
                or not isinstance(revision, str) or not SHA.fullmatch(revision)
                or not isinstance(license_id, str)
                or license_id.casefold() not in TRAINABLE_LICENSES
                or not isinstance(issuer, str) or not 3 <= len(issuer) <= 120
                or not isinstance(passage, str) or not 40 <= len(passage) <= MAX_PASSAGE
                or not isinstance(digest, str) or _sha_bytes(passage.encode("utf-8")) != digest):
            continue
        source = sources.setdefault(sid, {
            "id": sid, "revision": revision, "license": license_id,
            "issuer": issuer, "passages": []})
        if source["revision"] != revision or source["license"] != license_id:
            raise ValueError("JREI_SOURCE_REVISION_CHANGED_DURING_COLLECTION")
        source["passages"].append(passage)
    result = [item for item in sources.values() if item["passages"]]
    return sorted(result, key=lambda item: _sha_bytes(item["id"].encode("ascii")))



def _publisher_key(issuer: str) -> str:
    """Normalize owner-reviewed publisher identity for partition fencing."""
    return " ".join(unicodedata.normalize(
        "NFKC", issuer).casefold().split())


def _canonical_passage(value: str) -> str:
    """Catch Unicode/whitespace disguises of an identical cross-source text."""
    return " ".join(unicodedata.normalize(
        "NFKC", value).casefold().split())


def _language_counts(value: str) -> dict:
    """Script coverage only; neither a language-ID model nor quality score."""
    return {
        "persian_arabic_script_letters": sum(
            ("\u0621" <= char <= "\u06ff")
            and unicodedata.category(char).startswith("L") for char in value),
        "latin_script_letters": sum(
            ("A" <= char <= "Z") or ("a" <= char <= "z")
            for char in value),
    }


def _source_partitions(groups: list[dict]) -> tuple[list, list, list]:
    """Fence whole publishers, not only individual URLs or source IDs."""
    by_publisher: dict[str, list[dict]] = {}
    for source in groups:
        by_publisher.setdefault(_publisher_key(source["issuer"]), []).append(source)
    # The public source registry defines an issuer as a reviewed provenance
    # label, not proof that two unrelated labels are distinct institutions.
    if len(by_publisher) < 3:
        return [], [], []
    ordered = sorted(by_publisher, key=lambda key: _sha_bytes(
        key.encode("utf-8")))
    test_count = max(1, len(ordered) // 6)
    dev_count = max(1, len(ordered) // 5)
    def flatten(keys):
        return [source for key in keys for source in by_publisher[key]]
    return (flatten(ordered[test_count + dev_count:]),
            flatten(ordered[test_count:test_count + dev_count]),
            flatten(ordered[:test_count]))

def _write_ids(path: Path, ids: list[int]) -> str:
    if sys.byteorder != "little" or array("I").itemsize != 4:
        raise RuntimeError("JREI_NATIVE_CORPUS_U32_LITTLE_ENDIAN_REQUIRED")
    if any(type(x) is not int or not 0 <= x <= 65535 for x in ids):
        raise ValueError("JREI_NATIVE_TOKEN_OUT_OF_RANGE")
    with path.open("xb") as stream:
        array("I", ids).tofile(stream)
    return _sha_file(path)


def prepare(*, db_path: Path, private: Path, owner_approved: bool,
            vocab_size: int = 384) -> dict:
    """Explicitly stage a JREI training *candidate*, not run training."""
    if owner_approved is not True:
        raise ValueError("JREI_NATIVE_CORPUS_OWNER_APPROVAL_REQUIRED")
    if (not isinstance(vocab_size, int) or isinstance(vocab_size, bool)
            or not 256 <= vocab_size <= 768):
        raise ValueError("JREI_NATIVE_VOCAB_OUTSIDE_REVIEWED_LIMITS")
    if private.name != "command-center" or not private.is_dir() or private.is_symlink():
        raise ValueError("JREI_NATIVE_PRIVATE_DIRECTORY_REQUIRED")
    if not db_path.is_file() or db_path.is_symlink() or db_path.parent.resolve() != private.resolve():
        raise ValueError("JREI_NATIVE_EXISTING_SQLITE_DB_REQUIRED")
    source_groups = _approved_corpus(db_path)
    if len(source_groups) < 3:
        return {"state": "NEEDS_THREE_INDEPENDENT_LICENSED_SOURCES",
                "available_source_groups": len(source_groups),
                "training_started": False}
    # Whole reviewed issuer/publisher groups are deterministically separated.
    # Splitting only by source ID would place URLs owned by the same publisher
    # on both sides of the evaluation fence.
    train_groups, heldout_groups, sealed_test_groups = _source_partitions(
        source_groups)
    if not all((train_groups, heldout_groups, sealed_test_groups)):
        return {"state": "NEEDS_THREE_DISTINCT_REVIEWED_PUBLISHERS",
                "available_source_groups": len(source_groups),
                "training_started": False}
    def materialize(groups):
        text, refs, count = [], [], 0
        for group in groups:
            selected = []
            for passage in group["passages"]:
                size = len(passage) + 2
                if count + size > MAX_CHARS:
                    break
                selected.append(passage)
                text.append(passage)
                count += size
            if not selected:
                continue  # Do not claim an unused source was part of training.
            refs.append({
                "id": group["id"], "revision": group["revision"],
                "license": group["license"], "issuer": group["issuer"],
                "selected_passage_count": len(selected),
                "selected_passage_sha256": _sha_bytes(json.dumps(
                    selected, ensure_ascii=False, separators=(",", ":")
                ).encode("utf-8")),
                "passage_selection": "CURRENT_VERSION_BY_PASSAGE_ID_FIRST_64",
            })
        return "\n\n".join(text), refs
    # Refuse identical passages repeated across nominally independent
    # sources. Distinct source IDs alone would not prevent benchmark leakage.
    group_digests = [
        {_sha_bytes(_canonical_passage(text).encode("utf-8"))
         for text in g["passages"]}
        for g in (train_groups + heldout_groups + sealed_test_groups)]
    for i, values in enumerate(group_digests):
        for other in group_digests[i + 1:]:
            if values & other:
                raise ValueError("JREI_NATIVE_CORPUS_CROSS_SOURCE_DUPLICATE_PASSAGES")
    train_text, train_refs = materialize(train_groups)
    heldout_text, heldout_refs = materialize(heldout_groups)
    sealed_test_text, test_refs = materialize(sealed_test_groups)
    if not all((train_refs, heldout_refs, test_refs)):
        return {"state": "TRAIN_DEV_SEALED_SOURCE_BUDGET_MISSING",
                "training_started": False}
    if (len(train_text.encode("utf-8")) < 4000
            or len(heldout_text.encode("utf-8")) < 1000
            or len(sealed_test_text.encode("utf-8")) < 1000):
        return {"state": "INSUFFICIENT_REVIEWED_BILINGUAL_CORPUS",
                "training_started": False}
    script_coverage = {
        "TRAIN": _language_counts(train_text),
        "DEVELOPMENT": _language_counts(heldout_text),
        "SEALED_TEST": _language_counts(sealed_test_text),
    }
    # A Persian–English ability claim requires both scripts on both unseen
    # evaluation partitions. Script coverage is a *minimum input gate*, not
    # evidence of bilingual comprehension, fluent writing, or model quality.
    if any(coverage["persian_arabic_script_letters"] < 120 or
           coverage["latin_script_letters"] < 120
           for coverage in script_coverage.values()):
        return {"state": "BILINGUAL_PARTITION_COVERAGE_INSUFFICIENT",
                "script_coverage": script_coverage,
                "training_started": False}
    # Fit the tokenizer on TRAIN TEXT ONLY. minBPE is MIT licensed and
    # embedded in the JREI Python package; no web or model API is used.
    from jrei_service._vendor.minbpe import BasicTokenizer
    tokenizer = BasicTokenizer()
    tokenizer.train(train_text, vocab_size=vocab_size, verbose=False)
    train_ids = tokenizer.encode(train_text)
    heldout_ids = tokenizer.encode(heldout_text)
    sealed_test_ids = tokenizer.encode(sealed_test_text)
    if (len(train_ids) < MIN_TRAIN_IDS or len(heldout_ids) < MIN_HELDOUT_IDS
            or len(sealed_test_ids) < MIN_HELDOUT_IDS):
        return {"state": "INSUFFICIENT_TOKENS_FOR_HELDOUT_EVALUATION",
                "training_started": False}
    folder = private / "native-foundation-candidates"
    if folder.is_symlink():
        raise ValueError("JREI_NATIVE_CORPUS_DIRECTORY_LINKED")
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    ident = secrets.token_hex(16)
    dest = folder / ident
    dest.mkdir(mode=0o700)
    merge_rules = [[a, b, idx] for (a, b), idx
                   in sorted(tokenizer.merges.items(), key=lambda item: item[1])]
    tokenizer_meta = {"schema": "jr.jrei.native-byte-bpe.v1",
                      "vocab_size": 256 + len(merge_rules),
                      "merges": merge_rules,
                      "trained_on": "TRAIN_SOURCES_ONLY",
                      "external_tokenizer_weights": False}
    tok_bytes = json.dumps(tokenizer_meta, ensure_ascii=False,
                           sort_keys=True, separators=(",", ":")).encode("utf-8")
    with (dest / "tokenizer.json").open("xb") as output:
        output.write(tok_bytes)
    digest_train = _write_ids(dest / "train.u32", train_ids)
    digest_heldout = _write_ids(dest / "heldout.u32", heldout_ids)
    digest_sealed = _write_ids(dest / "sealed-test.u32", sealed_test_ids)
    receipt = {
        "schema": SCHEMA, "id": ident, "state": "REVIEWED_SOURCE_CANDIDATE_ONLY",
        "created": int(time.time()), "owner_approved_preparation": True,
        "train_sources": train_refs, "heldout_sources": heldout_refs,
        "sealed_test_sources": test_refs,
        "train_tokens": len(train_ids), "heldout_tokens": len(heldout_ids),
        "sealed_test_tokens": len(sealed_test_ids),
        "vocab_size": tokenizer_meta["vocab_size"],
        "tokenizer_sha256": _sha_bytes(tok_bytes),
        "train_sha256": digest_train, "heldout_sha256": digest_heldout,
        "sealed_test_sha256": digest_sealed,
        "tokenization": "MIT_MINBPE_BYTE_LEVEL_FROM_SCRATCH",
        "source_training_rights": "PUBLIC_REUSE_APPROVED_OWNER_REVIEWED",
        "source_groups_disjoint": True,
        "source_publishers_disjoint": True,
        "partition_policy": "REVIEWED_ISSUER_GROUP_SHA256_ORDER",
        "cross_partition_exact_match": "NFKC_CASEFOLD_WHITESPACE",
        "bilingual_script_coverage": script_coverage,
        "training_performed": False,
        "independent_evaluation_passed": False,
        "external_pretrained_weights_used": False,
        "production_modified": False,
    }
    with (dest / "manifest.json").open("x", encoding="utf-8") as output:
        json.dump(receipt, output, ensure_ascii=False, indent=2)
    return {"state": receipt["state"], "candidate_id": ident,
            "train_tokens": len(train_ids), "heldout_tokens": len(heldout_ids),
            "sealed_test_tokens": len(sealed_test_ids),
            "source_groups": len(source_groups), "trained_model": False}


def load_verified_candidate(db_path: Path, private: Path, ident: str) -> dict:
    if not isinstance(ident, str) or not IDENT.fullmatch(ident):
        raise ValueError("JREI_NATIVE_CANDIDATE_ID_INVALID")
    folder = private / "native-foundation-candidates"
    dest = folder / ident
    if (folder.is_symlink() or dest.is_symlink() or not dest.is_dir()
            or dest.resolve().parent != folder.resolve()):
        raise ValueError("JREI_NATIVE_CANDIDATE_PATH_INVALID")
    manifest_file = dest / "manifest.json"
    if (manifest_file.is_symlink() or not manifest_file.is_file()
            or manifest_file.stat().st_size > 100_000):
        raise ValueError("JREI_NATIVE_CORPUS_MANIFEST_MISSING")
    data = json.loads(manifest_file.read_text(encoding="utf-8"))
    if (not isinstance(data, dict) or data.get("schema") != SCHEMA
            or data.get("id") != ident
            or data.get("state") != "REVIEWED_SOURCE_CANDIDATE_ONLY"
            or data.get("source_groups_disjoint") is not True
            or data.get("source_publishers_disjoint") is not True
            or data.get("partition_policy") != "REVIEWED_ISSUER_GROUP_SHA256_ORDER"
            or data.get("external_pretrained_weights_used") is not False):
        raise ValueError("JREI_NATIVE_CORPUS_CANDIDATE_INVALID")
    train_refs, heldout_refs = data["train_sources"], data["heldout_sources"]
    test_refs = data.get("sealed_test_sources")
    if (not isinstance(train_refs, list) or not train_refs
            or not isinstance(heldout_refs, list) or not heldout_refs
            or not isinstance(test_refs, list) or not test_refs):
        raise ValueError("JREI_NATIVE_CORPUS_THREE_WAY_SPLIT_MISSING")
    roles = (train_refs, heldout_refs, test_refs)
    for refs in roles:
        for entry in refs:
            if (not isinstance(entry, dict)
                    or not isinstance(entry.get("id"), str)
                    or not IDENT.fullmatch(entry["id"])
                    or not isinstance(entry.get("revision"), str)
                    or not SHA.fullmatch(entry["revision"])
                    or not isinstance(entry.get("license"), str)
                    or entry["license"].casefold() not in TRAINABLE_LICENSES
                    or not isinstance(entry.get("issuer"), str)
                    or not 3 <= len(entry["issuer"]) <= 120
                    or type(entry.get("selected_passage_count")) is not int
                    or not 1 <= entry["selected_passage_count"] <= 64
                    or not SHA.fullmatch(str(entry.get("selected_passage_sha256", "")))
                    or entry.get("passage_selection") !=
                       "CURRENT_VERSION_BY_PASSAGE_ID_FIRST_64"):
                raise ValueError("JREI_NATIVE_CORPUS_SOURCE_REF_INVALID")
    train_ids, dev_ids, test_ids = [
        {entry["id"] for entry in refs} for refs in roles
    ]
    train_publishers, dev_publishers, test_publishers = [
        {_publisher_key(entry["issuer"]) for entry in refs} for refs in roles
    ]
    if (len(train_ids) != len(train_refs)
            or len(dev_ids) != len(heldout_refs)
            or len(test_ids) != len(test_refs)
            or train_ids & dev_ids or train_ids & test_ids or dev_ids & test_ids
            or train_publishers & dev_publishers
            or train_publishers & test_publishers
            or dev_publishers & test_publishers):
        raise ValueError("JREI_NATIVE_CORPUS_SOURCE_OR_PUBLISHER_LEAKAGE")
    for name, field in (("tokenizer.json", "tokenizer_sha256"),
                        ("train.u32", "train_sha256"),
                        ("heldout.u32", "heldout_sha256"),
                        ("sealed-test.u32", "sealed_test_sha256")):
        item = dest / name
        expected_length = 100_000
        if name.endswith(".u32"):
            token_field = {
                "train.u32": "train_tokens",
                "heldout.u32": "heldout_tokens",
                "sealed-test.u32": "sealed_test_tokens",
            }[name]
            count = data.get(token_field)
            min_count = (MIN_TRAIN_IDS if name == "train.u32"
                         else MIN_HELDOUT_IDS)
            if (type(count) is not int or
                    not min_count <= count <= MAX_CHARS * 4):
                raise ValueError("JREI_NATIVE_CORPUS_TOKEN_COUNT_INVALID")
            expected_length = count * 4
        if (item.is_symlink() or not item.is_file()
                or item.stat().st_size > MAX_CHARS * 16
                or (item.stat().st_size != expected_length if name.endswith(".u32")
                    else item.stat().st_size > expected_length)
                or not SHA.fullmatch(str(data.get(field, "")))
                or _sha_file(item) != data[field]):
            raise ValueError("JREI_NATIVE_CORPUS_ARTIFACT_HASH_MISMATCH")
    # Any source revocation or revision change blocks future weight training.
    refs = train_refs + heldout_refs + test_refs
    with closing(_db(db_path)) as db:
        for item in refs:
            row = db.execute("""SELECT last_sha,licence,issuer,reviewed,active,rights
                FROM learning_sources WHERE id=?""", (item["id"],)).fetchone()
            if (item["license"].casefold() not in TRAINABLE_LICENSES or
                    row != (item["revision"], item["license"], item["issuer"],
                            1, 1, "PUBLIC_REUSE_APPROVED")):
                raise ValueError("JREI_NATIVE_SOURCE_REVOKED_OR_REVISED")
            # Hash the *live source passages* rather than merely checking the
            # registry metadata. A mutated/removed passage with unchanged
            # source revision must never keep its old training eligibility.
            passages = db.execute("""SELECT p.text,p.sha256
                FROM learning_passages p
                JOIN learning_versions v ON v.id=p.version_id
                WHERE p.source_id=? AND v.source_id=p.source_id
                  AND v.sha256=?
                ORDER BY p.id LIMIT ?""",
                (item["id"], item["revision"],
                 item["selected_passage_count"])).fetchall()
            if len(passages) != item["selected_passage_count"]:
                raise ValueError("JREI_NATIVE_SOURCE_PASSAGES_MISSING")
            selected = []
            for text, digest in passages:
                if (not isinstance(text, str)
                        or not 40 <= len(text) <= MAX_PASSAGE
                        or not isinstance(digest, str)
                        or _sha_bytes(text.encode("utf-8")) != digest):
                    raise ValueError("JREI_NATIVE_SOURCE_PASSAGE_HASH_CHANGED")
                selected.append(text)
            actual = _sha_bytes(json.dumps(
                selected, ensure_ascii=False,
                separators=(",", ":")).encode("utf-8"))
            if actual != item["selected_passage_sha256"]:
                raise ValueError("JREI_NATIVE_SELECTED_PASSAGES_CHANGED")
    return {"path": dest, "manifest": data}




def readiness(db_path: Path) -> dict:
    """Owner-private, *read-only* source eligibility inventory.

    This is not a language proficiency estimate, rights certification,
    source-text scan, dataset export, tokenizer fit or readiness to train.
    It deliberately does not open owner documents or staged token files.
    """
    try:
        with closing(_db(db_path)) as db:
            records = db.execute("""SELECT s.id,s.issuer,s.licence
                FROM learning_sources s
                WHERE s.active=1 AND s.reviewed=1
                  AND s.rights='PUBLIC_REUSE_APPROVED'
                  AND EXISTS(
                    SELECT 1 FROM learning_passages p
                    JOIN learning_versions v ON v.id=p.version_id
                    WHERE p.source_id=s.id AND v.sha256=s.last_sha
                  )
                ORDER BY s.id LIMIT 1001""").fetchall()
        truncated = len(records) > 1000
        eligible = [(sid, issuer) for sid, issuer, license_id in records[:1000]
                    if isinstance(sid, str) and IDENT.fullmatch(sid)
                    and isinstance(issuer, str) and 3 <= len(issuer) <= 120
                    and isinstance(license_id, str)
                    and license_id.casefold() in TRAINABLE_LICENSES]
        publishers = {_publisher_key(issuer) for _, issuer in eligible}
        if truncated:
            state = "ELIGIBLE_SOURCE_INVENTORY_TRUNCATED_NOT_CERTIFIED"
        elif not eligible:
            state = "NO_ELIGIBLE_REVIEWED_REUSABLE_SOURCES"
        elif len(publishers) < 3:
            state = "NEEDS_THREE_REVIEWED_PUBLISHER_GROUPS"
        else:
            state = "PUBLISHER_DIVERSITY_PRECHECK_ONLY"
        return {
            "schema": "jr.jrei.native-foundation-readiness.v1",
            "state": state,
            "source_count_sample": len(eligible),
            "distinct_reviewed_issuer_labels": len(publishers),
            "sample_truncated": truncated,
            "publisher_identity_independently_audited": False,
            "persian_english_partition_coverage_checked": False,
            "no_pretrained_model_required": True,
            "candidate_prepared": False,
            "training_started": False,
            "quality_evaluated": False,
            "owner_preparation_approval_required": True,
        }
    except (sqlite3.Error, OSError):
        return {
            "schema": "jr.jrei.native-foundation-readiness.v1",
            "state": "SOURCE_INVENTORY_UNAVAILABLE",
            "training_started": False,
            "quality_evaluated": False,
            "owner_preparation_approval_required": True,
        }


def main():
    import argparse
    parser = argparse.ArgumentParser(description="JREI licensed source corpus builder")
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--private", type=Path, required=True)
    parser.add_argument("--vocab-size", type=int, default=384)
    parser.add_argument("--owner-approved", action="store_true")
    args = parser.parse_args()
    result = prepare(db_path=args.db, private=args.private,
                     owner_approved=args.owner_approved,
                     vocab_size=args.vocab_size)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
