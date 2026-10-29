"""Code-specialist, FROM-SCRATCH JREI dataset preparation, no training.

Reuses bundled MIT minBPE and the original JREI SQLite/local private store.
Accepts ONLY source-pinned first-party coding cohorts whose individual
lessons have passed explicit rights AND quality review. No GitHub/GitLab/
Codeberg code excerpts are ingested into model weights from public visibility.

Produces a code-only training candidate with source-file-disjoint train,
development and sealed test partitions. This is NOT the original bilingual
foundation dataset and MUST NEVER automatically activate a chat model.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import secrets
import sqlite3
import time

from jrei_service.windows_native_corpus import _write_ids
from jrei_service.windows_code_learning_curriculum import (
    _db, _canonical_text, _sha,
)

SCHEMA = "jr.jrei.native-code-dataset-prep.v1"
IDENT = re.compile(r"^[a-f0-9]{32}$")
DIGEST = re.compile(r"^[a-f0-9]{64}$")
MAX_DATASET_FILE = 64_000_000
MAX_EXAMPLE_COUNT = 30_000
MIN_TRAIN_CHARS = 6000
MIN_VALIDATION_CHARS = 1000
PARTS = ("TRAIN", "DEVELOPMENT", "SEALED_TEST")


def _checked_file(path: Path, max_size: int) -> bytes:
    if (not path.is_file() or path.is_symlink() or
            not 0 < path.stat().st_size <= max_size):
        raise ValueError("JREI_CODE_CORPUS_FILE_INVALID")
    with path.open("rb") as stream:
        data=stream.read(max_size+1)
    if len(data)>max_size:
        raise ValueError("JREI_CODE_CORPUS_FILE_TOO_LARGE")
    return data


def _cohort(db_path: Path, private: Path,
            cohort_id: str) -> dict:
    """Independently verify candidate hashes and current lesson approvals."""
    if not isinstance(cohort_id,str) or not DIGEST.fullmatch(cohort_id):
        raise ValueError("JREI_CODE_CORPUS_COHORT_ID_INVALID")
    root=private.resolve(strict=True)
    if root.name!="command-center":
        raise ValueError("JREI_CODE_CORPUS_PRIVATE_LOCATION_INVALID")
    parent=root/"native-code-curriculum-candidates"
    folder=parent/cohort_id
    if (parent.is_symlink() or folder.is_symlink() or
            not folder.is_dir() or
            not folder.resolve(strict=True).is_relative_to(root)):
        raise ValueError("JREI_CODE_CORPUS_COHORT_NOT_FOUND")
    manifest_bytes=_checked_file(folder/"manifest.json",18000)
    manifest=json.loads(manifest_bytes.decode("utf-8"))
    if (not isinstance(manifest,dict) or
            manifest.get("schema")!=
                "jr.jrei.first-party-coding-dataset-candidate.v1" or
            manifest.get("cohort_sha256")!=cohort_id or
            manifest.get("training_rights_and_quality_approved") is not True or
            manifest.get("public_oss_code_used_for_training") is not False or
            manifest.get("model_weights_trained") is not False):
        raise ValueError("JREI_CODE_CORPUS_TRAINING_PERMISSION_MISSING")
    refs=manifest.get("partitions")
    if not isinstance(refs,dict) or set(refs)!=set(PARTS):
        raise ValueError("JREI_CODE_CORPUS_PARTITION_SHAPE")
    recomputed=_sha(json.dumps(refs,sort_keys=True,
                               separators=(",",":")).encode("utf-8"))
    if recomputed!=cohort_id:
        raise ValueError("JREI_CODE_CORPUS_COHORT_HASH_MISMATCH")
    source_groups={}
    partitions={}
    total=0
    all_ids=[]
    for part in PARTS:
        description=refs[part]
        if not isinstance(description,dict):
            raise ValueError("JREI_CODE_CORPUS_PARTITION_INVALID")
        data=_checked_file(folder/(part.lower()+".jsonl"),MAX_DATASET_FILE)
        if _sha(data)!=description.get("sha256"):
            raise ValueError("JREI_CODE_CORPUS_DATA_TAMPERED")
        examples=[]
        for raw in data.splitlines():
            entry=json.loads(raw.decode("utf-8"))
            if (not isinstance(entry,dict) or
                    entry.get("schema")!=
                        "jr.jrei.source-code-reading-example.v1" or
                    entry.get("human_quality_reviewed") is not True or
                    entry.get("model_training_permitted") is not True or
                    not isinstance(entry.get("id"),str) or
                    not DIGEST.fullmatch(entry["id"]) or
                    not isinstance(entry.get("source_path"),str) or
                    not entry["source_path"].startswith(
                        "platform/jrei-python/") or
                    not isinstance(entry.get("source_sha256"),str) or
                    not DIGEST.fullmatch(entry["source_sha256"]) or
                    not isinstance(entry.get("prompt"),str) or
                    not isinstance(entry.get("reference_answer"),str)):
                raise ValueError("JREI_CODE_CORPUS_EXAMPLE_NOT_AUTHORIZED")
            source=entry["source_path"]
            if source in source_groups and source_groups[source]!=part:
                raise ValueError("JREI_CODE_CORPUS_SOURCE_SPLIT_LEAK")
            source_groups[source]=part
            all_ids.append(entry["id"])
            examples.append(entry)
            total+=1
            if total>MAX_EXAMPLE_COUNT:
                raise ValueError("JREI_CODE_CORPUS_EXAMPLE_COUNT_EXCEEDED")
        if len(examples)!=description.get("count") or not examples:
            raise ValueError("JREI_CODE_CORPUS_EXAMPLE_COUNT_INCONSISTENT")
        if sorted(set(x["source_path"] for x in examples))!=description.get(
                "source_files"):
            raise ValueError("JREI_CODE_CORPUS_SOURCE_LIST_MISMATCH")
        partitions[part]=examples
    if len(set(all_ids))!=len(all_ids):
        raise ValueError("JREI_CODE_CORPUS_LESSON_DUPLICATED")
    # Verify CURRENT SQLite review decisions; a later rights revocation
    # invalidates the candidate without deleting research history.
    with _db(db_path) as db:
        for part in PARTS:
            for entry in partitions[part]:
                row=db.execute("""SELECT source_sha256,
                    reference_answer,ownership_reviewed,
                    human_quality_reviewed,model_training_permitted
                    FROM jrei_code_curriculum_lessons
                    WHERE id=? AND source_path=?""",
                    (entry["id"],entry["source_path"])).fetchone()
                if (row is None or
                        row[0]!=entry["source_sha256"] or
                        row[1]!=entry["reference_answer"] or
                        tuple(row[2:])!=(1,1,1)):
                    raise ValueError("JREI_CODE_CORPUS_RIGHTS_OR_QA_REVOKED")
                current=db.execute("""SELECT source_sha256 FROM
                    jrei_code_curriculum_inventory WHERE source_path=?""",
                    (entry["source_path"],)).fetchone()
                if current is None or current[0]!=entry["source_sha256"]:
                    raise ValueError("JREI_CODE_CORPUS_SOURCE_STALE")
    # Cross-group exact normalization must be independent of lesson IDs.
    hashes={}
    for part,entries in partitions.items():
        signatures={_sha(_canonical_text(
            e["prompt"]).encode("utf-8")) for e in entries}
        hashes[part]=signatures
    if any(hashes[PARTS[i]] & hashes[PARTS[j]]
           for i in range(3) for j in range(i+1,3)):
        raise ValueError("JREI_CODE_CORPUS_EXACT_EVAL_LEAK")
    return {
        "folder":folder,"manifest":manifest,
        "manifest_sha256":_sha(manifest_bytes),
        "partitions":partitions,
        "total_examples":total,
        "source_file_count":len(source_groups),
    }


def _study_text(entries: list[dict]) -> str:
    chunks=[]
    for lesson in entries:
        # Language tokens are ordinary bytes; a from-scratch tokenizer
        # learns them from TRAIN only. No external source is imported here.
        chunks.append(
            "JREI CODING TASK\n" + lesson["prompt"] +
            "\nJREI VERIFIED AST REFERENCE ANSWER\n" +
            lesson["reference_answer"] + "\nEND JREI CODING TASK\n"
        )
    return "\n".join(chunks)


def prepare(*, db_path: Path, private: Path, cohort_id: str,
            owner_approved: bool, vocab_size: int = 384) -> dict:
    """Prepare disjoint code tokens with original MIT minBPE, no training."""
    if owner_approved is not True:
        raise ValueError("JREI_CODE_DATASET_OWNER_PREPARATION_APPROVAL_REQUIRED")
    if type(vocab_size) is not int or not 256<=vocab_size<=768:
        raise ValueError("JREI_CODE_DATASET_VOCAB_SIZE_INVALID")
    if (not db_path.is_file() or db_path.is_symlink() or
            db_path.parent.resolve()!=private.resolve()):
        raise ValueError("JREI_CODE_DATASET_ORIGINAL_DB_REQUIRED")
    data=_cohort(db_path,private,cohort_id)
    texts={name:_study_text(data["partitions"][name]) for name in PARTS}
    if (len(texts["TRAIN"])<MIN_TRAIN_CHARS or
            len(texts["DEVELOPMENT"])<MIN_VALIDATION_CHARS or
            len(texts["SEALED_TEST"])<MIN_VALIDATION_CHARS):
        return {
            "schema":SCHEMA,"state":"INSUFFICIENT_CODE_TRAIN_DEV_SEALED_TEXT",
            "characters":{k:len(v) for k,v in texts.items()},
            "training_started":False,
        }
    from jrei_service._vendor.minbpe import BasicTokenizer
    bpe=BasicTokenizer()
    bpe.train(texts["TRAIN"],vocab_size=vocab_size,verbose=False)
    tokens={part:bpe.encode(text) for part,text in texts.items()}
    if (len(tokens["TRAIN"])<512 or
            any(len(tokens[name])<128 for name in
                ("DEVELOPMENT","SEALED_TEST"))):
        return {"schema":SCHEMA,"state":"INSUFFICIENT_CODE_TOKEN_COVERAGE",
                "training_started":False}
    root=private/"native-code-neural-candidates"
    if root.is_symlink():
        raise ValueError("JREI_CODE_DATASET_OUTPUT_LINKED")
    root.mkdir(parents=True,exist_ok=True,mode=0o700)
    ident=secrets.token_hex(16)
    dest=root/ident
    dest.mkdir(mode=0o700)
    merges=[[a,b,idx] for (a,b),idx in sorted(
        bpe.merges.items(),key=lambda item:item[1])]
    tokenizer_meta={
        "schema":"jr.jrei.native-byte-bpe.v1",
        "vocab_size":256+len(merges),
        "merges":merges,
        "trained_on":"FIRST_PARTY_CODE_TRAIN_PARTITION_ONLY",
        "external_tokenizer_weights":False,
    }
    encoded=json.dumps(tokenizer_meta,sort_keys=True,
                       separators=(",",":")).encode("utf-8")
    with (dest/"tokenizer.json").open("xb") as out:
        out.write(encoded)
    sha_train=_write_ids(dest/"train.u32",tokens["TRAIN"])
    sha_dev=_write_ids(dest/"heldout.u32",tokens["DEVELOPMENT"])
    sha_sealed=_write_ids(dest/"sealed-test.u32",tokens["SEALED_TEST"])
    manifest={
        "schema":SCHEMA,"id":ident,
        "created":int(time.time()),
        "state":"FIRST_PARTY_CODE_TOKENS_PREPARED_NOT_TRAINED",
        "source_cohort_sha256":cohort_id,
        "source_manifest_sha256":data["manifest_sha256"],
        "source_training_rights":"OWNER_APPROVED_FIRST_PARTY_CODE",
        "source_partition_policy":"WHOLE_MODULE_DISJOINT",
        "source_publishers_disjoint":False,
        "source_modules_disjoint":True,
        "bilingual_script_coverage":None,
        "vocab_size":tokenizer_meta["vocab_size"],
        "tokenizer_sha256":_sha(encoded),
        "train_sha256":sha_train,
        "heldout_sha256":sha_dev,
        "sealed_test_sha256":sha_sealed,
        "train_tokens":len(tokens["TRAIN"]),
        "heldout_tokens":len(tokens["DEVELOPMENT"]),
        "sealed_test_tokens":len(tokens["SEALED_TEST"]),
        "source_code_example_count":data["total_examples"],
        "first_party_module_groups":data["source_file_count"],
        "trained_from_scratch":False,
        "training_performed":False,
        "independent_code_review_passed":False,
        "model_activated":False,
        "production_changed":False,
    }
    with (dest/"manifest.json").open("x",encoding="utf-8") as out:
        json.dump(manifest,out,sort_keys=True,ensure_ascii=False,indent=2)
    return {
        "schema":SCHEMA,"state":manifest["state"],
        "candidate_id":ident,
        "train_tokens":len(tokens["TRAIN"]),
        "heldout_tokens":len(tokens["DEVELOPMENT"]),
        "sealed_test_tokens":len(tokens["SEALED_TEST"]),
        "training_started":False,"code_model_activated":False,
    }


def load_verified_candidate(db_path: Path, private: Path, ident: str) -> dict:
    """Verify source revocation, tokenizer/files and sealed partition links.

    Intended for the shared native scratch trainer's CODE mode only.
    It does not authorize opening the bilingual chatbot acceptance gate.
    """
    if not isinstance(ident,str) or not IDENT.fullmatch(ident):
        raise ValueError("JREI_CODE_CANDIDATE_ID_INVALID")
    if private.name!="command-center" or private.is_symlink():
        raise ValueError("JREI_CODE_CANDIDATE_PRIVATE_INVALID")
    folder=private/"native-code-neural-candidates"/ident
    if (folder.is_symlink() or not folder.is_dir() or
            not folder.resolve(strict=True).is_relative_to(
                private.resolve(strict=True))):
        raise ValueError("JREI_CODE_CANDIDATE_NOT_FOUND")
    manifest_bytes=_checked_file(folder/"manifest.json",18_000)
    manifest=json.loads(manifest_bytes.decode("utf-8"))
    if (not isinstance(manifest,dict) or manifest.get("schema")!=SCHEMA or
            manifest.get("id")!=ident or
            manifest.get("state")!=
                "FIRST_PARTY_CODE_TOKENS_PREPARED_NOT_TRAINED" or
            manifest.get("training_performed") is not False or
            manifest.get("model_activated") is not False):
        raise ValueError("JREI_CODE_CANDIDATE_MANIFEST_INVALID")
    cohort=_cohort(db_path,private,manifest.get("source_cohort_sha256",""))
    if _sha(_checked_file(cohort["folder"]/"manifest.json",18_000))!=manifest.get(
            "source_manifest_sha256"):
        raise ValueError("JREI_CODE_CANDIDATE_SOURCE_MANIFEST_STALE")
    for filename,digest in (
        ("tokenizer.json",manifest.get("tokenizer_sha256")),
        ("train.u32",manifest.get("train_sha256")),
        ("heldout.u32",manifest.get("heldout_sha256")),
        ("sealed-test.u32",manifest.get("sealed_test_sha256")),
    ):
        if not isinstance(digest,str) or not DIGEST.fullmatch(digest):
            raise ValueError("JREI_CODE_CANDIDATE_DIGEST_INVALID")
        path=folder/filename
        if path.is_symlink() or not path.is_file():
            raise ValueError("JREI_CODE_CANDIDATE_DATA_MISSING")
        check=hashlib.sha256()
        with path.open("rb") as stream:
            for block in iter(lambda:stream.read(1024*1024),b""):
                check.update(block)
        if check.hexdigest()!=digest:
            raise ValueError("JREI_CODE_CANDIDATE_BYTES_CHANGED")
    return {"path":folder,"manifest":manifest,
            "source_cohort_verified_again":True,
            "code_specialist_only":True}


def snapshot(private: Path) -> dict:
    root=private/"native-code-neural-candidates"
    seen=0
    if root.is_dir() and not root.is_symlink():
        for folder in root.iterdir():
            if folder.is_dir() and not folder.is_symlink() and
                    IDENT.fullmatch(folder.name):
                seen+=1
    return {"schema":SCHEMA,"code_dataset_candidates_observed":seen,
            "model_training_started_here":False,
            "weights_trained_here":False,
            "general_bilingual_acceptance_claimed":False}
