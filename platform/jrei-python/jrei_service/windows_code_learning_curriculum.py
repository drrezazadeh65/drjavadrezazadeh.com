"""First-party model-free coding curriculum for original JREI.

Generate source-pinned AST coding exercises from first-party JREI source only.
This is a candidate study ledger in the EXISTING missions.sqlite3.
No scraped public repository code is trained on, no patches are treated as
correct, and no weight updates, executables or production changes occur.
"""
from __future__ import annotations

import ast
from contextlib import closing
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import time
import unicodedata

SCHEMA = "jr.jrei.first-party-code-curriculum.v1"
SOURCE_DIRS = (
    "platform/jrei-python/jrei_learning",
    "platform/jrei-python/jrei_orchestrator",
    "platform/jrei-python/jrei_service",
)
EXCLUDE_PARTS = frozenset((
    ".git", "_vendor", "vendor", "node_modules", "test", "tests",
    "__pycache__", ".venv", "dist", "build", "private", "secrets",
))
MAX_SOURCE_BYTES = 80000
MAX_EXCERPT_CHARS = 1500
MAX_AST_NODES = 18000
MAX_LESSONS_PER_FILE = 12
SECRET = re.compile(
    r"(?i)(-----BEGIN|authorization\s*:\s*bearer|"
    r"(?:api[_-]?key|password|secret|access[_-]?token|private[_-]?key)"
    r"\s*[:=]\s*\S{6,})"
)


def _db(db_path: Path):
    conn = sqlite3.connect(db_path, timeout=12)
    conn.execute("PRAGMA busy_timeout=12000")
    return conn


def _sha(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def initialize(db_path: Path) -> None:
    with closing(_db(db_path)) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_code_curriculum_inventory(
            source_path TEXT PRIMARY KEY,
            source_sha256 TEXT NOT NULL,
            observed INTEGER NOT NULL,
            state TEXT NOT NULL,
            lesson_count INTEGER NOT NULL DEFAULT 0)""")
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_code_curriculum_lessons(
            id TEXT PRIMARY KEY,
            source_path TEXT NOT NULL,
            source_sha256 TEXT NOT NULL,
            function_name TEXT NOT NULL,
            function_line INTEGER NOT NULL,
            lesson_kind TEXT NOT NULL,
            prompt TEXT NOT NULL,
            reference_answer TEXT NOT NULL,
            answer_sha256 TEXT NOT NULL,
            created INTEGER NOT NULL,
            ownership_reviewed INTEGER NOT NULL DEFAULT 0,
            human_quality_reviewed INTEGER NOT NULL DEFAULT 0,
            model_training_permitted INTEGER NOT NULL DEFAULT 0,
            model_training_performed INTEGER NOT NULL DEFAULT 0)""")
        db.execute("""CREATE INDEX IF NOT EXISTS jrei_code_curriculum_path
            ON jrei_code_curriculum_lessons(source_path,source_sha256)""")
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_code_curriculum_cohorts(
            cohort_sha256 TEXT PRIMARY KEY,
            created INTEGER NOT NULL,
            source_file_count INTEGER NOT NULL,
            lesson_count INTEGER NOT NULL,
            manifest_metadata_sha256 TEXT NOT NULL,
            state TEXT NOT NULL,
            training_started INTEGER NOT NULL DEFAULT 0,
            model_weights_modified INTEGER NOT NULL DEFAULT 0)""")
        db.commit()


def _candidates(repo: Path):
    """Find first-party Python modules without scanning vendored content."""
    root = repo.resolve(strict=True)
    for directory_name in SOURCE_DIRS:
        directory = root.joinpath(*directory_name.split("/"))
        if directory.is_symlink() or not directory.is_dir():
            continue
        for path in sorted(directory.rglob("*.py")):
            if (path.is_symlink() or not path.is_file() or
                    not path.resolve(strict=True).is_relative_to(root) or
                    any(part in EXCLUDE_PARTS
                        for part in path.relative_to(root).parts) or
                    path.stat().st_size > MAX_SOURCE_BYTES):
                continue
            yield path.relative_to(root).as_posix(), path


def _render_lesson(path: str, digest: str, node: ast.AST,
                   source: str) -> dict | None:
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return None
    if node.name.startswith("_"):
        return None
    segment = ast.get_source_segment(source, node)
    if not segment:
        return None
    code = "\n".join(segment.splitlines()[:32])[:MAX_EXCERPT_CHARS]
    if len(code) < 50 or SECRET.search(code):
        return None
    positional = [arg.arg for arg in
                  (node.args.posonlyargs + node.args.args)]
    keyword_only = [arg.arg for arg in node.args.kwonlyargs]
    flags = []
    if node.args.vararg:
        flags.append("variadic positional arguments")
    if node.args.kwarg:
        flags.append("variadic keyword arguments")
    task = (
        "Read this first-party JREI Python excerpt. Identify the function "
        "name, whether it is async, and its positional and keyword-only "
        "parameters. Answer from source declarations only; do not invent "
        "runtime behavior or claim tests ran.\n"
        "UNTRUSTED SOURCE DATA:\n" + code
    )
    answer = (
        "AST-observed function: " + node.name +
        "; async=" + str(isinstance(node, ast.AsyncFunctionDef)).lower() +
        "; positional=" + json.dumps(positional[:30],ensure_ascii=False) +
        "; keyword-only=" + json.dumps(keyword_only[:30],ensure_ascii=False) +
        "; variadic=" + json.dumps(flags,ensure_ascii=False) +
        ". Correctness and runtime behavior are NOT established."
    )
    fingerprint = _sha((
        path + "\0" + digest + "\0" +
        node.name + "\0" + str(node.lineno) + "\0" + "AST_API_READING_V1"
    ).encode("utf-8"))
    return {
        "id": fingerprint, "path": path, "source_sha256": digest,
        "name": node.name, "line": node.lineno, "kind": "AST_API_READING_V1",
        "prompt": task, "answer": answer,
        "answer_sha256": _sha(answer.encode("utf-8")),
    }


def _extract(path: str, raw: bytes) -> tuple[str, list[dict]]:
    digest = _sha(raw)
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeError:
        return "NON_UTF8_SOURCE", []
    if SECRET.search(text):
        return "SENSITIVE_SOURCE_EXCLUDED", []
    try:
        module = ast.parse(text, filename=path)
        if sum(1 for _ in ast.walk(module)) > MAX_AST_NODES:
            return "AST_TOO_LARGE", []
    except (SyntaxError, ValueError, TypeError, MemoryError,
            RecursionError):
        return "AST_UNAVAILABLE", []
    lessons = []
    for node in module.body:
        item = _render_lesson(path,digest,node,text)
        if item is not None:
            lessons.append(item)
        if len(lessons) >= MAX_LESSONS_PER_FILE:
            break
    return ("FIRST_PARTY_AST_LESSONS_STAGED" if lessons
            else "NO_ELIGIBLE_SOURCE_FUNCTION"), lessons


def tick(*, db_path: Path, repo: Path,
         resources_available: bool) -> dict:
    """Study one changed first-party source per resource-admitted wake."""
    if type(resources_available) is not bool:
        raise ValueError("JREI_CODE_CURRICULUM_RESOURCE_FLAG_INVALID")
    if not resources_available:
        return {"schema":SCHEMA,"state":"HELD_RESOURCES"}
    with closing(_db(db_path)) as db:
        known = dict(db.execute("""SELECT source_path,source_sha256
            FROM jrei_code_curriculum_inventory""").fetchall())
    for name, file in _candidates(repo):
        try:
            raw = file.read_bytes()
        except (OSError,ValueError):
            continue
        digest = _sha(raw)
        if known.get(name) == digest:
            continue
        state, lessons = _extract(name,raw)
        now = int(time.time())
        with closing(_db(db_path)) as db:
            db.execute("BEGIN IMMEDIATE")
            db.executemany("""INSERT OR IGNORE INTO jrei_code_curriculum_lessons(
              id,source_path,source_sha256,function_name,function_line,
              lesson_kind,prompt,reference_answer,answer_sha256,created)
              VALUES(?,?,?,?,?,?,?,?,?,?)""", [
                (item["id"],item["path"],item["source_sha256"],
                 item["name"],item["line"],item["kind"],item["prompt"],
                 item["answer"],item["answer_sha256"],now)
                for item in lessons
            ])
            db.execute("""INSERT INTO jrei_code_curriculum_inventory(
              source_path,source_sha256,observed,state,lesson_count)
              VALUES(?,?,?,?,?)
              ON CONFLICT(source_path) DO UPDATE SET
                source_sha256=excluded.source_sha256,
                observed=excluded.observed,state=excluded.state,
                lesson_count=excluded.lesson_count""",
                (name,digest,now,state,len(lessons)))
            db.commit()
        return {
            "schema":SCHEMA,"state":state,"source_path":name,
            "lesson_candidates_recorded":len(lessons),
            "owner_source_ownership_reviewed":False,
            "training_examples_approved":False,
            "training_started":False,
        }
    return {"schema":SCHEMA,"state":"FIRST_PARTY_SOURCES_UP_TO_DATE",
            "training_started":False}


def _current_lesson_rows(db_path: Path) -> list[tuple]:
    """Only source versions still matching the local code inventory."""
    with closing(_db(db_path)) as db:
        return db.execute("""SELECT l.id,l.source_path,l.source_sha256,
                l.lesson_kind,l.prompt,l.reference_answer,l.answer_sha256,
                l.ownership_reviewed,l.human_quality_reviewed,
                l.model_training_permitted
            FROM jrei_code_curriculum_lessons AS l
            JOIN jrei_code_curriculum_inventory AS i
              ON i.source_path=l.source_path
             AND i.source_sha256=l.source_sha256
            WHERE i.state='FIRST_PARTY_AST_LESSONS_STAGED'
            ORDER BY l.source_path,l.id
            LIMIT 25000""").fetchall()


def _canonical_text(value: str) -> str:
    return " ".join(unicodedata.normalize(
        "NFKC", value).casefold().split())


def _split_plan(rows: list[tuple]) -> dict:
    """Plan file-disjoint TRAIN / DEVELOPMENT / SEALED_TEST partitions.

    These are candidate data partitions, not proof that the code examples
    generalize or that the owner has licensed every source for model training.
    """
    by_file: dict[str,list[dict]] = {}
    seen: set[str] = set()
    unsafe = 0
    for (identifier,path,sha,kind,prompt,answer,answer_sha,
         ownership,reviewed,allowed) in rows:
        if (not isinstance(identifier,str) or len(identifier)!=64 or
                not isinstance(path,str) or not path.startswith(
                    "platform/jrei-python/") or
                not isinstance(sha,str) or len(sha)!=64 or
                not isinstance(prompt,str) or not isinstance(answer,str) or
                not isinstance(answer_sha,str) or
                _sha(answer.encode("utf-8"))!=answer_sha or
                SECRET.search(prompt) or SECRET.search(answer)):
            unsafe += 1
            continue
        normalized = _canonical_text(prompt)
        fingerprint = _sha(normalized.encode("utf-8"))
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        by_file.setdefault(path,[]).append({
            "id":identifier,"source_path":path,"source_sha256":sha,
            "kind":kind,"prompt":prompt,"reference_answer":answer,
            "rights_reviewed":bool(ownership),
            "quality_reviewed":bool(reviewed),
            "training_permitted":bool(allowed),
        })
    files = sorted(by_file,key=lambda path: _sha(path.encode("utf-8")))
    if len(files) < 6:
        return {"state":"NEEDS_SIX_DISTINCT_FIRST_PARTY_FILES",
                "source_files":len(files),"total_lessons":sum(
                    map(len,by_file.values())),"unsafe_rows":unsafe}
    heldout_count = max(1,len(files)//6)
    dev_count = max(1,len(files)//5)
    sealed_files = files[:heldout_count]
    development_files = files[heldout_count:heldout_count+dev_count]
    train_files = files[heldout_count+dev_count:]
    if not train_files or not development_files or not sealed_files:
        return {"state":"CODE_CURRICULUM_FILE_PARTITIONS_INSUFFICIENT"}
    partitions = {
        "TRAIN":[item for path in train_files for item in by_file[path]],
        "DEVELOPMENT":[item for path in development_files
                       for item in by_file[path]],
        "SEALED_TEST":[item for path in sealed_files
                       for item in by_file[path]],
    }
    if any(not items for items in partitions.values()):
        return {"state":"CODE_CURRICULUM_EMPTY_PARTITION"}
    # Source files are disjoint. Also fence repeated canonical question text
    # across partitions; an exact duplicate must be rejected, not hidden.
    hashes = [
        {_sha(_canonical_text(i["prompt"]).encode("utf-8")) for i in items}
        for items in partitions.values()
    ]
    if any(hashes[i] & hashes[j]
           for i in range(len(hashes))
           for j in range(i+1,len(hashes))):
        return {"state":"CODE_CURRICULUM_CROSS_PARTITION_DUPLICATE"}
    # A public repository and a model-generated patch never acquire a
    # training-rights flag because they appeared in a source audit.
    approved = all(
        item["rights_reviewed"] and item["quality_reviewed"] and
        item["training_permitted"]
        for items in partitions.values() for item in items
    )
    return {
        "state":"FIRST_PARTY_CODING_PARTITIONS_STAGED_UNAPPROVED",
        "partitions":partitions,
        "source_files":len(files),
        "total_lessons":sum(map(len,partitions.values())),
        "unsafe_rows":unsafe,"every_example_training_approved":approved,
        "source_file_partitions_disjoint":True,
        "semantic_generalization_measured":False,
    }


def preflight(db_path: Path) -> dict:
    """Read-only readiness; not a model training trigger."""
    plan = _split_plan(_current_lesson_rows(db_path))
    if "partitions" not in plan:
        return {"schema":SCHEMA,**plan,
                "training_started":False}
    parts = plan["partitions"]
    return {
        "schema":SCHEMA,"state":plan["state"],
        "first_party_files":plan["source_files"],
        "candidate_lessons":plan["total_lessons"],
        "unsafe_rows_excluded":plan["unsafe_rows"],
        "partition_example_counts":{k:len(v) for k,v in parts.items()},
        "all_training_rights_and_quality_reviewed":
            plan["every_example_training_approved"],
        "source_file_partitions_disjoint":True,
        "public_oss_copied_into_candidate":False,
        "training_started":False,"weights_changed":False,
    }


def _source_sha_current(repo: Path, relative: str, expected: str) -> bool:
    """Prove a code lesson still corresponds to real, local first-party code."""
    root = repo.resolve(strict=True)
    location = root.joinpath(*relative.split("/"))
    if (location.is_symlink() or not location.is_file() or
            not location.resolve(strict=True).is_relative_to(root) or
            location.stat().st_size > MAX_SOURCE_BYTES):
        return False
    return _sha(location.read_bytes()) == expected


def _verify_existing_cohort(dest: Path, identity: str,
                            refs: dict) -> bool:
    """Read a candidate's receipt and rehash streams; no training occurs."""
    manifest = dest/"manifest.json"
    if (dest.is_symlink() or not dest.is_dir() or
            manifest.is_symlink() or not manifest.is_file() or
            manifest.stat().st_size > 18000):
        return False
    try:
        info=json.loads(manifest.read_text(encoding="utf-8"))
    except (ValueError,OSError,UnicodeError,TypeError):
        return False
    if (not isinstance(info,dict) or
            info.get("cohort_sha256")!=identity or
            info.get("schema")!=
                "jr.jrei.first-party-coding-dataset-candidate.v1" or
            info.get("partitions")!=refs or
            info.get("model_weights_trained") is not False):
        return False
    for name,metadata in refs.items():
        source=dest/(name.lower()+".jsonl")
        if (source.is_symlink() or not source.is_file() or
                source.stat().st_size > 64_000_000):
            return False
        checksum=hashlib.sha256()
        with source.open("rb") as stream:
            for block in iter(lambda:stream.read(1_048_576),b""):
                checksum.update(block)
        if checksum.hexdigest()!=metadata["sha256"]:
            return False
    return True


def stage_candidate(*, db_path: Path, repo: Path, private: Path,
                    resources_available: bool) -> dict:
    """Write an immutable, owner-private JSONL study CANDIDATE.

    This creates neither a training job nor activation metadata. It uses
    the existing JREI-private location, never site media directories or
    the current production checkout. Each new data cohort gets a new hash
    address; unchanged cohorts are not rewritten.
    """
    if type(resources_available) is not bool:
        raise ValueError("JREI_CODE_CURRICULUM_RESOURCE_FLAG_INVALID")
    if not resources_available:
        return {"schema":SCHEMA,"state":"HELD_RESOURCES"}
    root=repo.resolve(strict=True)
    storage=private.resolve(strict=True)
    if (storage==root or storage.is_relative_to(root) or
            root.is_relative_to(storage) or
            storage.name!="command-center"):
        raise ValueError("JREI_CODE_CURRICULUM_STORAGE_NOT_ISOLATED")
    plan=_split_plan(_current_lesson_rows(db_path))
    if "partitions" not in plan:
        return {"schema":SCHEMA,**plan,
                "training_started":False}
    # The local code may have changed AFTER the AST lessons were recorded.
    # Never stage text from stale source revisions as a current training
    # candidate. This is source verification, not an executable test.
    for items in plan["partitions"].values():
        for item in items:
            if not _source_sha_current(repo,item["source_path"],
                                       item["source_sha256"]):
                return {"schema":SCHEMA,
                        "state":"CURRICULUM_SOURCE_REVISION_STALE",
                        "training_started":False}
    partition_data:dict[str,bytes]={}
    manifest_refs={}
    for name,examples in plan["partitions"].items():
        data=b"".join(
            (json.dumps({
                "schema":"jr.jrei.source-code-reading-example.v1",
                "id":item["id"],
                "prompt":item["prompt"],
                "reference_answer":item["reference_answer"],
                "source_path":item["source_path"],
                "source_sha256":item["source_sha256"],
                "lesson_kind":item["kind"],
                "human_quality_reviewed":item["quality_reviewed"],
                "model_training_permitted":item["training_permitted"],
            },ensure_ascii=False,sort_keys=True,separators=(",",":"))+"\n"
            ).encode("utf-8") for item in examples
        )
        partition_data[name]=data
        manifest_refs[name]={
            "count":len(examples),
            "sha256":_sha(data),
            "source_files":sorted(set(
                item["source_path"] for item in examples)),
        }
    identity=_sha(json.dumps(
        manifest_refs,sort_keys=True,separators=(",",":")
    ).encode("utf-8"))
    target_dir=storage/"native-code-curriculum-candidates"
    if target_dir.is_symlink():
        raise ValueError("JREI_CODE_CURRICULUM_FOLDER_LINK")
    target_dir.mkdir(parents=True,exist_ok=True)
    dest=target_dir/identity
    if dest.exists():
        if dest.is_symlink():
            raise ValueError("JREI_CODE_CURRICULUM_COHORT_LINK")
        if not _verify_existing_cohort(dest, identity, manifest_refs):
            return {"schema":SCHEMA,
                    "state":"EXISTING_COHORT_INCOMPLETE_OR_TAMPERED",
                    "cohort_sha256":identity,"training_started":False}
        return {"schema":SCHEMA,
                "state":"EXISTING_CODE_CURRICULUM_CANDIDATE_PRESERVED",
                "cohort_sha256":identity,"training_started":False}
    # A failed write leaves visible evidence; no deletion or overwriting
    # of an existing cohort, including after power loss.
    dest.mkdir(mode=0o700)
    for name,bytes_ in partition_data.items():
        with (dest/(name.lower()+".jsonl")).open("xb") as out:
            out.write(bytes_)
    receipt={
        "schema":"jr.jrei.first-party-coding-dataset-candidate.v1",
        "cohort_sha256":identity,"created":int(time.time()),
        "source_grouping":"WHOLE_FIRST_PARTY_MODULE_DISJOINT_V1",
        "partitions":manifest_refs,
        "unsafe_rows_excluded":plan["unsafe_rows"],
        "training_rights_and_quality_approved":
            plan["every_example_training_approved"],
        "state":"UNREVIEWED_CODE_TRAINING_CANDIDATE_ONLY",
        "public_oss_code_used_for_training":False,
        "published_model_training_started":False,
        "model_weights_trained":False,
        "independent_evaluation_completed":False,
        "owner_activation_granted":False,
    }
    with (dest/"manifest.json").open("x",encoding="utf-8") as out:
        json.dump(receipt,out,ensure_ascii=False,sort_keys=True,indent=2)
    manifest_bytes=json.dumps(receipt,ensure_ascii=False,sort_keys=True,
                              separators=(",",":")).encode("utf-8")
    with closing(_db(db_path)) as db:
        db.execute("""INSERT OR IGNORE INTO jrei_code_curriculum_cohorts(
            cohort_sha256,created,source_file_count,lesson_count,
            manifest_metadata_sha256,state)
            VALUES(?,?,?,?,?,?)""",
            (identity,receipt["created"],plan["source_files"],
             plan["total_lessons"],_sha(manifest_bytes),receipt["state"]))
        db.commit()
    return {"schema":SCHEMA,"state":receipt["state"],
            "cohort_sha256":identity,
            "candidate_examples":plan["total_lessons"],
            "source_files":plan["source_files"],
            "train_dev_sealed_source_disjoint":True,
            "training_started":False}


def snapshot(db_path: Path) -> dict:
    with closing(_db(db_path)) as db:
        files = db.execute("""SELECT COUNT(*) FROM
            jrei_code_curriculum_inventory""").fetchone()[0]
        lessons, current = db.execute("""SELECT COUNT(*),
            COALESCE(SUM(CASE WHEN inventory.source_sha256=
                lessons.source_sha256 THEN 1 ELSE 0 END),0)
            FROM jrei_code_curriculum_lessons AS lessons
            LEFT JOIN jrei_code_curriculum_inventory AS inventory
              ON inventory.source_path=lessons.source_path""").fetchone()
        approved = db.execute("""SELECT COUNT(*)
            FROM jrei_code_curriculum_lessons WHERE
            ownership_reviewed=1 AND human_quality_reviewed=1
            AND model_training_permitted=1""").fetchone()[0]
        cohorts,last_cohort = db.execute("""SELECT COUNT(*),
            MAX(created) FROM jrei_code_curriculum_cohorts""").fetchone()
    return {
        "schema":SCHEMA,"first_party_source_files_observed":files,
        "total_structural_lesson_versions":lessons,
        "current_source_lesson_candidates":current,
        "approved_training_examples":approved,
        "immutable_private_dataset_candidate_cohorts":cohorts,
        "last_candidate_cohort_created_at":last_cohort,
        "source_ownership_assumed":False,
        "public_forge_code_used_as_training_text":False,
        "model_training_started_by_curriculum":False,
        "independent_code_skill_gain_verified":False,
    }
