"""Independent, explicitly requested evaluation of a JREI code-specialist model.

Reuses the SAME bundled MIT nanoGPT and minBPE models, existing owner-private
code cohorts and immutable scratch checkpoint. The SEALED_TEST split may be
read at most once per run and is NEVER fed to an optimizer or new prompt
generation task. The DEVELOPMENT split may guide improvements, but neither
metric is proof of working program repair. No candidate code is executed.

This module is not scheduled: deliberate offline evaluation is a distinct
stage from automatic discovery / code-draft creation. No external API,
secondary model, production update, or deployment occurs.
"""
from __future__ import annotations

from contextlib import closing
import hashlib
import json
import math
from pathlib import Path
import re
import sqlite3
import time
import unicodedata

from jrei_service.windows_native_code_preparation import (
    _cohort, load_verified_candidate,
)
from jrei_service.windows_native_inference import _load_tokenizer
from jrei_service.windows_native_scratch_training import _sha_file

SCHEMA = "jr.jrei.native-code-ability-evaluation.v1"
IDENT = re.compile(r"^[a-f0-9]{32}$")
SHA = re.compile(r"^[a-f0-9]{64}$")
MAX_RUN_MANIFEST = 18000
MAX_EVAL_EXAMPLES = 16
MAX_OUTPUT_TOKENS = 144
MAX_EVALUATION_SECONDS = 600
EVAL_MODES = ("DEVELOPMENT", "SEALED_TEST")
MODEL_FAMILY = "JREI_FROM_SCRATCH_NANOGPT_CODE_SPECIALIST"


def _db(db_path: Path):
    db = sqlite3.connect(db_path, timeout=12)
    db.execute("PRAGMA busy_timeout=12000")
    return db


def initialize(db_path: Path) -> None:
    with closing(_db(db_path)) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_code_ability_evaluations(
          run_id TEXT NOT NULL,
          split_name TEXT NOT NULL,
          created INTEGER NOT NULL,
          state TEXT NOT NULL,
          dataset_sha256 TEXT NOT NULL,
          checkpoint_sha256 TEXT NOT NULL,
          selected_examples INTEGER NOT NULL,
          scored_examples INTEGER NOT NULL DEFAULT 0,
          normalized_exact_matches INTEGER NOT NULL DEFAULT 0,
          average_word_f1 REAL,
          evidence_sha256 TEXT,
          error_code TEXT,
          sealed_test_not_used_for_training INTEGER NOT NULL DEFAULT 1,
          code_execution_performed INTEGER NOT NULL DEFAULT 0,
          model_activated INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(run_id,split_name))""")
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_code_ability_example_scores(
          run_id TEXT NOT NULL,
          split_name TEXT NOT NULL,
          lesson_id TEXT NOT NULL,
          ordinal INTEGER NOT NULL,
          normalized_exact INTEGER NOT NULL,
          word_f1 REAL NOT NULL,
          generated_sha256 TEXT NOT NULL,
          reference_sha256 TEXT NOT NULL,
          PRIMARY KEY(run_id,split_name,lesson_id))""")
        db.commit()


def _validated_run(private: Path, run_id: str) -> tuple[dict,Path]:
    if not isinstance(run_id,str) or not IDENT.fullmatch(run_id):
        raise ValueError("JREI_CODE_EVAL_RUN_ID_INVALID")
    base=private.resolve(strict=True)
    if base.name!="command-center":
        raise ValueError("JREI_CODE_EVAL_PRIVATE_DIR_INVALID")
    root=base/"native-code-runs"
    folder=root/run_id
    if (root.is_symlink() or folder.is_symlink() or
            not folder.is_dir() or
            not folder.resolve(strict=True).is_relative_to(base)):
        raise ValueError("JREI_CODE_EVAL_PRIVATE_RUN_MISSING")
    manifest=folder/"training-manifest.json"
    if (manifest.is_symlink() or not manifest.is_file() or
            manifest.stat().st_size>MAX_RUN_MANIFEST):
        raise ValueError("JREI_CODE_EVAL_RUN_RECEIPT_INVALID")
    receipt=json.loads(manifest.read_text(encoding="utf-8"))
    if (not isinstance(receipt,dict) or
            receipt.get("schema")!="jr.jrei.native-from-scratch-run.v1" or
            receipt.get("run_id")!=run_id or
            receipt.get("state")!="LOCAL_NATIVE_WEIGHTS_TRAINED_UNVERIFIED" or
            receipt.get("data_mode")!="first_party_code" or
            receipt.get("trained_from_random_initialization") is not True or
            receipt.get("external_pretrained_weights_used") is not False or
            receipt.get("code_specialist_not_general_chat") is not True or
            receipt.get("production_promoted") is not False):
        raise ValueError("JREI_CODE_EVAL_RUN_NOT_ELIGIBLE")
    dims=receipt.get("model_architecture")
    if (not isinstance(dims,dict) or dims.get("family")!=MODEL_FAMILY):
        raise ValueError("JREI_CODE_EVAL_ARCHITECTURE_INVALID")
    for field,low,high in (
        ("layers",1,6),("heads",1,8),("embedding",32,384),
        ("block_size",32,256),("vocab_size",256,768)
    ):
        if type(dims.get(field)) is not int or not low<=dims[field]<=high:
            raise ValueError("JREI_CODE_EVAL_DIMENSIONS_INVALID")
    if dims["embedding"]%dims["heads"]!=0:
        raise ValueError("JREI_CODE_EVAL_HEAD_DIM_MISMATCH")
    expected=receipt.get("weights_sha256")
    if not isinstance(expected,str) or not SHA.fullmatch(expected):
        raise ValueError("JREI_CODE_EVAL_WEIGHTS_HASH_MISSING")
    file=folder/"jrei-native-unapproved.pt"
    if (file.is_symlink() or not file.is_file() or
            file.stat().st_size>300_000_000 or
            _sha_file(file)!=expected):
        raise ValueError("JREI_CODE_EVAL_WEIGHTS_HASH_MISMATCH")
    return receipt,file


def _normalize(value: str) -> str:
    return " ".join(unicodedata.normalize(
        "NFKC",value).casefold().split())


def _word_f1(predicted: str, reference: str) -> float:
    """Token-overlap diagnostic; not executable-code correctness."""
    from collections import Counter
    got=Counter(_normalize(predicted).split())
    wanted=Counter(_normalize(reference).split())
    denominator=sum(got.values())+sum(wanted.values())
    return 2*sum((got & wanted).values())/denominator if denominator else 1.0


def _select_examples(rows: list[dict], count: int) -> list[dict]:
    # Content-addressed deterministic order avoids selecting convenient
    # examples. A sealed result cannot be tuned against and re-run.
    return sorted(rows,key=lambda item: hashlib.sha256(
        item["id"].encode("ascii")).hexdigest())[:count]


def _generate(model, tokenizer, torch, question: str,
              max_tokens: int, context_length: int) -> str:
    # Match the native-code training format. The question alone is not the
    # reference answer and the answer is never included in the prompt.
    prefix=("JREI CODING TASK\n"+question+
            "\nJREI VERIFIED AST REFERENCE ANSWER\n")
    ids=tokenizer.encode(prefix)
    if not ids:
        raise ValueError("JREI_CODE_EVAL_PROMPT_TOKENS_EMPTY")
    sequence=torch.tensor([ids[-context_length:]],dtype=torch.long)
    produced=[]
    with torch.no_grad():
        for _ in range(max_tokens):
            window=sequence[:,-context_length:]
            logits,_loss=model(window)
            next_id=int(torch.argmax(logits[0,-1,:]).item())
            produced.append(next_id)
            sequence=torch.cat((sequence,torch.tensor(
                [[next_id]],dtype=torch.long)),dim=1)
            # Do not condition future tokens on the sealed reference.
    value=tokenizer.decode(produced)
    return value.split("\nEND JREI CODING TASK",1)[0][:1600]


def _run_evaluation(run: dict, checkpoint: Path, tokenizer_path: Path,
                    selected: list[dict], max_new_tokens: int) -> dict:
    # Deferred optional dependency import. No torch import during service
    # startup, research discovery, status reads or static code review.
    import torch
    from jrei_service._vendor.nanogpt.model import GPT,GPTConfig
    dims=run["model_architecture"]
    cpu_threads=max(1,min(2,torch.get_num_threads()))
    torch.set_num_threads(cpu_threads)
    model=GPT(GPTConfig(
        block_size=dims["block_size"],vocab_size=dims["vocab_size"],
        n_layer=dims["layers"],n_head=dims["heads"],
        n_embd=dims["embedding"],dropout=0.0,bias=True))
    # State dict only, never arbitrary serialized Python objects.
    weights=torch.load(checkpoint,map_location="cpu",weights_only=True)
    model.load_state_dict(weights,strict=True)
    model.eval()
    tokenizer=_load_tokenizer(tokenizer_path)
    if len(tokenizer.vocab)!=dims["vocab_size"]:
        raise ValueError("JREI_CODE_EVAL_TOKENIZER_VOCAB_MISMATCH")
    scores=[]
    started=time.monotonic()
    for example in selected:
        # A per-run safety budget is not a daily learning quota. The
        # standalone local request should never monopolize a Windows PC.
        if time.monotonic()-started>MAX_EVALUATION_SECONDS:
            raise RuntimeError("JREI_CODE_EVAL_RESOURCE_TIME_BUDGET")
        answer=_generate(model,tokenizer,torch,example["prompt"],
                         max_new_tokens,dims["block_size"])
        expected=example["reference_answer"]
        scores.append({
            "lesson_id":example["id"],
            "normalized_exact":_normalize(answer)==_normalize(expected),
            "word_f1":round(_word_f1(answer,expected),6),
            "answer_sha256":hashlib.sha256(
                answer.encode("utf-8")).hexdigest(),
            "reference_sha256":hashlib.sha256(
                expected.encode("utf-8")).hexdigest(),
        })
    matches=sum(1 for item in scores if item["normalized_exact"])
    f1=sum(item["word_f1"] for item in scores)/len(scores)
    receipt_sha=hashlib.sha256(json.dumps(
        scores,sort_keys=True,separators=(",",":")).encode("utf-8")
    ).hexdigest()
    return {
        "scored":len(scores),"exact":matches,
        "mean_word_f1":round(f1,6),
        "detail_digest":receipt_sha,
        "examples":scores,
    }


def evaluate_once(*, db_path: Path,private: Path,run_id: str,
                  split: str,owner_confirmed: bool,
                  resources_available: bool,max_examples: int = 8,
                  max_new_tokens: int = 96) -> dict:
    """Owner-requested one-off DEV or sealed evaluation; no tests of code.

    Reserve evaluation identity before reading the sealed source. Even a
    failed sealed evaluation is never silently retried against that split.
    This makes leakage harder and preserves failure evidence for later audit.
    """
    if owner_confirmed is not True or resources_available is not True:
        raise ValueError("JREI_CODE_EVAL_OWNER_OR_RESOURCES_REQUIRED")
    if (split not in EVAL_MODES or type(max_examples) is not int or
            not 1<=max_examples<=MAX_EVAL_EXAMPLES or
            type(max_new_tokens) is not int or
            not 16<=max_new_tokens<=MAX_OUTPUT_TOKENS):
        raise ValueError("JREI_CODE_EVAL_SETTINGS_INVALID")
    run,checkpoint=_validated_run(private,run_id)
    candidate=load_verified_candidate(db_path,private,
                                      run.get("source_candidate_id",""))
    path=candidate["path"]
    manifest=candidate["manifest"]
    if (run.get("source_manifest_sha256")!=_sha_file(path/"manifest.json")
            or run.get("tokenizer_sha256")!=manifest.get("tokenizer_sha256")
            or run.get("train_sha256")!=manifest.get("train_sha256")
            or run.get("heldout_sha256")!=manifest.get("heldout_sha256")):
        raise ValueError("JREI_CODE_EVAL_TRAINING_DATA_MISMATCH")
    cohort=_cohort(db_path,private,manifest["source_cohort_sha256"])
    group=cohort["partitions"][split]
    chosen=_select_examples(group,max_examples)
    if not chosen:
        return {"schema":SCHEMA,"state":"NO_INDEPENDENT_CODE_EXAMPLES",
                "model_activated":False}
    dataset_sha=hashlib.sha256(json.dumps(
        [{"id":r["id"],"source_sha256":r["source_sha256"]}
         for r in chosen],sort_keys=True,
        separators=(",",":")).encode("utf-8")).hexdigest()
    now=int(time.time())
    with closing(_db(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        present=db.execute("""SELECT state FROM
            jrei_code_ability_evaluations WHERE run_id=?
            AND split_name=?""",(run_id,split)).fetchone()
        if present is not None:
            db.rollback()
            return {
                "schema":SCHEMA,"state":"EXISTING_EVALUATION_PRESERVED",
                "prior_state":present[0],"run_id":run_id,"split":split,
                "new_evaluation_performed":False,
            }
        db.execute("""INSERT INTO jrei_code_ability_evaluations(
            run_id,split_name,created,state,dataset_sha256,
            checkpoint_sha256,selected_examples)
            VALUES(?,?,?,'RESERVED_NOT_YET_SCORED',?,?,?)""",
            (run_id,split,now,dataset_sha,run["weights_sha256"],
             len(chosen)))
        db.commit()
    try:
        details=_run_evaluation(run,checkpoint,path/"tokenizer.json",
                                chosen,max_new_tokens)
        state="INDEPENDENT_AST_ANSWER_SCORING_RECORDED"
        error_code=None
    except (OSError,ValueError,TypeError,RuntimeError,
            MemoryError,OverflowError,IndexError,KeyError) as exc:
        # The reservation is retained even after failure; no fake progress
        # or automatically repeated sealed benchmark requests.
        details=None
        state="INDEPENDENT_EVALUATION_UNAVAILABLE"
        error_code=exc.__class__.__name__
    with closing(_db(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        if details is not None:
            db.executemany("""INSERT OR IGNORE INTO
                jrei_code_ability_example_scores(
                run_id,split_name,lesson_id,ordinal,
                normalized_exact,word_f1,
                generated_sha256,reference_sha256)
                VALUES(?,?,?,?,?,?,?,?)""",[
                (run_id,split,item["lesson_id"],index,
                 int(item["normalized_exact"]),item["word_f1"],
                 item["answer_sha256"],item["reference_sha256"])
                for index,item in enumerate(details["examples"])
            ])
        db.execute("""UPDATE jrei_code_ability_evaluations SET
            state=?,scored_examples=?,normalized_exact_matches=?,
            average_word_f1=?,evidence_sha256=?,error_code=?
            WHERE run_id=? AND split_name=?""",(
            state,details["scored"] if details else 0,
            details["exact"] if details else 0,
            details["mean_word_f1"] if details else None,
            details["detail_digest"] if details else None,
            error_code,run_id,split))
        db.commit()
    return {
        "schema":SCHEMA,"state":state,"run_id":run_id,"split":split,
        "selected_examples":len(chosen),
        "scored_examples":details["scored"] if details else 0,
        "normalized_exact_matches":details["exact"] if details else 0,
        "average_word_f1":details["mean_word_f1"] if details else None,
        "evidence_sha256":details["detail_digest"] if details else None,
        "failure_category":error_code,
        "sealed_test_single_use":split=="SEALED_TEST",
        "checks_are_ast_answer_agreement_not_code_execution":True,
        "functional_code_ability_proven":False,
        "weight_updates_performed":False,
        "model_promoted":False,
    }


def audit_score_receipt(db_path: Path, *, run_id: str,
                        split: str) -> dict:
    """Recalculate the final score digest from stored per-question hashes.

    This cannot establish that a model generated those hashes and is not a
    substitute for independent functional code evaluation. It detects
    inconsistent or modified local evaluation receipts without importing
    PyTorch, retraining, executing candidates, or reopening sealed prompts.
    """
    if (not isinstance(run_id,str) or not IDENT.fullmatch(run_id)
            or split not in EVAL_MODES):
        raise ValueError("JREI_CODE_EVAL_AUDIT_SELECTION_INVALID")
    with closing(_db(db_path)) as db:
        record=db.execute("""SELECT state,scored_examples,
            normalized_exact_matches,average_word_f1,evidence_sha256
            FROM jrei_code_ability_evaluations WHERE run_id=?
            AND split_name=?""",(run_id,split)).fetchone()
        if record is None:
            return {"schema":SCHEMA,
                    "state":"EVALUATION_RECEIPT_NOT_FOUND",
                    "model_executed":False}
        state,n,exact,f1,claimed=record
        if state!="INDEPENDENT_AST_ANSWER_SCORING_RECORDED":
            return {"schema":SCHEMA,
                    "state":"EVALUATION_NOT_COMPLETED",
                    "recorded_state":state,"model_executed":False}
        rows=db.execute("""SELECT lesson_id,ordinal,normalized_exact,
            word_f1,generated_sha256,reference_sha256
            FROM jrei_code_ability_example_scores
            WHERE run_id=? AND split_name=? ORDER BY ordinal""",
            (run_id,split)).fetchall()
    if (not isinstance(n,int) or not n or len(rows)!=n or
            not isinstance(claimed,str) or not SHA.fullmatch(claimed)):
        return {"schema":SCHEMA,"state":"EVALUATION_EVIDENCE_INCOMPLETE",
                "model_executed":False}
    receipt=[]
    for index,(ident,ordinal,success,score,generated,reference) in enumerate(rows):
        if (not isinstance(ident,str) or not SHA.fullmatch(ident) or
                ordinal!=index or type(success) is not int or
                success not in (0,1) or not isinstance(score,(int,float))
                or not math.isfinite(score) or not 0<=score<=1 or
                not isinstance(generated,str) or
                not SHA.fullmatch(generated) or
                not isinstance(reference,str) or
                not SHA.fullmatch(reference)):
            return {"schema":SCHEMA,
                    "state":"EVALUATION_SCORE_RECORD_INVALID",
                    "model_executed":False}
        receipt.append({
            "lesson_id":ident,"normalized_exact":bool(success),
            "word_f1":float(score),"answer_sha256":generated,
            "reference_sha256":reference,
        })
    actual=hashlib.sha256(json.dumps(
        receipt,sort_keys=True,separators=(",",":")
    ).encode("utf-8")).hexdigest()
    total=sum(int(item["normalized_exact"]) for item in receipt)
    mean=round(sum(item["word_f1"] for item in receipt)/n,6)
    consistent=(actual==claimed and total==exact and
                isinstance(f1,(int,float)) and
                math.isfinite(f1) and abs(f1-mean)<=0.000001)
    return {
        "schema":SCHEMA,
        "state":("HASHED_SCORE_RECEIPT_INTERNALLY_CONSISTENT"
                 if consistent else "HASHED_SCORE_RECEIPT_MISMATCH"),
        "run_id":run_id,"split":split,
        "recorded_scored_examples":n,
        "recomputed_evidence_sha256":actual,
        "recorded_evidence_sha256":claimed,
        "score_receipt_consistent":consistent,
        "sealed_test_prompts_read":False,
        "model_executed":False,
        "source_code_executed":False,
        "functional_code_skill_proven":False,
    }


def preflight(*, db_path: Path, private: Path, run_id: str) -> dict:
    """Read-only eligibility report; never scores or consumes sealed items."""
    run,_checkpoint=_validated_run(private,run_id)
    code=load_verified_candidate(
        db_path,private,run.get("source_candidate_id",""))
    cohort=_cohort(db_path,private,
                   code["manifest"]["source_cohort_sha256"])
    with closing(_db(db_path)) as db:
        prior=dict(db.execute("""SELECT split_name,state FROM
            jrei_code_ability_evaluations WHERE run_id=?""",
            (run_id,)).fetchall())
    return {
        "schema":SCHEMA,
        "state":"CHECKPOINT_AND_CODE_COHORT_HASHES_VERIFIED",
        "run_id":run_id,
        "model_family":MODEL_FAMILY,
        "code_source_cohort_sha256":
            code["manifest"]["source_cohort_sha256"],
        "available_examples":{split:len(cohort["partitions"][split])
                              for split in EVAL_MODES},
        "prior_recorded_split_states":prior,
        "sealed_split_not_previously_reserved":
            "SEALED_TEST" not in prior,
        "read_only":True,
        "weight_updates_performed":False,
        "code_generation_correctness_not_proven":True,
    }


def compare_development_runs(db_path: Path, *, baseline_id: str,
                             candidate_id: str) -> dict:
    """Pairwise exact-reference comparison on IDENTICAL development items.

    The paired sample is an observation about a specific fixed AST exercise
    set. Even a positive delta is not proof of coding ability or permission
    to activate the candidate checkpoint. SEALED_TEST is never consulted.
    """
    if (not isinstance(baseline_id,str) or not IDENT.fullmatch(baseline_id)
            or not isinstance(candidate_id,str) or
            not IDENT.fullmatch(candidate_id) or
            baseline_id==candidate_id):
        raise ValueError("JREI_CODE_COMPARE_RUN_IDS_INVALID")
    with closing(_db(db_path)) as db:
        rows=db.execute("""SELECT run_id,dataset_sha256,
            checkpoint_sha256,selected_examples,scored_examples,
            normalized_exact_matches,average_word_f1
            FROM jrei_code_ability_evaluations
            WHERE split_name='DEVELOPMENT'
              AND state='INDEPENDENT_AST_ANSWER_SCORING_RECORDED'
              AND run_id IN (?,?)""",
              (baseline_id,candidate_id)).fetchall()
        per_run={}
        for entry in rows:
            identifier=entry[0]
            per_run[identifier]={
                "dataset":entry[1],"checkpoint":entry[2],
                "selected":entry[3],"scored":entry[4],
                "exact":entry[5],"f1":entry[6],
            }
        if len(per_run)!=2:
            return {"schema":SCHEMA,
                    "state":"TWO_COMPLETED_DEVELOPMENT_EVALUATIONS_REQUIRED",
                    "code_activated":False}
        a,b=per_run[baseline_id],per_run[candidate_id]
        if (a["dataset"]!=b["dataset"] or
                a["scored"]!=b["scored"] or
                a["selected"]!=b["selected"] or
                a["checkpoint"]==b["checkpoint"]):
            return {"schema":SCHEMA,
                    "state":"PAIRED_BENCHMARK_NOT_COMPARABLE",
                    "same_dataset":a["dataset"]==b["dataset"],
                    "distinct_weights":a["checkpoint"]!=b["checkpoint"],
                    "code_activated":False}
        pairs=db.execute("""SELECT old.lesson_id,
            old.normalized_exact,new.normalized_exact,
            old.word_f1,new.word_f1,
            old.reference_sha256,new.reference_sha256
            FROM jrei_code_ability_example_scores AS old
            JOIN jrei_code_ability_example_scores AS new
              ON new.lesson_id=old.lesson_id
             AND new.split_name=old.split_name
            WHERE old.run_id=? AND new.run_id=?
              AND old.split_name='DEVELOPMENT'
            ORDER BY old.lesson_id""",
            (baseline_id,candidate_id)).fetchall()
    if (len(pairs)!=a["scored"] or
            any(previous!=current
                for _id,_ok_old,_ok_new,_f1old,_f1new,
                    previous,current in pairs)):
        return {"schema":SCHEMA,
                "state":"PAIRED_QUESTION_EVIDENCE_INCOMPLETE",
                "code_activated":False}
    improved=sum(int(not old and new)
                 for _id,old,new,*_unused in pairs)
    regressed=sum(int(old and not new)
                  for _id,old,new,*_unused in pairs)
    unchanged=sum(int(old==new) for _id,old,new,*_unused in pairs)
    before=sum(old for _id,old,*_rest in pairs)
    after=sum(new for _id,_old,new,*_rest in pairs)
    old_f1=sum(f1old for _id,_old,_new,f1old,*_rest in pairs)/len(pairs)
    new_f1=sum(f1new for _id,_old,_new,_f1old,f1new,*_rest
               in pairs)/len(pairs)
    return {
        "schema":SCHEMA,
        "state":"PAIRWISE_DEVELOPMENT_AST_SCORES_OBSERVED",
        "baseline_run":baseline_id,
        "candidate_run":candidate_id,
        "shared_development_dataset_sha256":a["dataset"],
        "paired_questions":len(pairs),
        "baseline_exact_matches":before,
        "candidate_exact_matches":after,
        "new_correct_answers":improved,
        "formerly_correct_now_wrong":regressed,
        "unchanged_exact_status":unchanged,
        "normalized_exact_match_change":after-before,
        "mean_word_f1_change":round(new_f1-old_f1,6),
        "evidence_scope":"AST_REFERENCE_AGREEMENT_ONLY",
        "sealed_test_data_queried":False,
        "hypothesis_selection_from_sealed_test":False,
        "statistical_significance_asserted":False,
        "functional_code_skill_proven":False,
        "candidate_checkpoint_activated":False,
    }


def snapshot(db_path: Path) -> dict:
    with closing(_db(db_path)) as db:
        rows=db.execute("""SELECT split_name,state,COUNT(*),
            COALESCE(SUM(scored_examples),0),
            COALESCE(SUM(normalized_exact_matches),0)
            FROM jrei_code_ability_evaluations
            GROUP BY split_name,state
            ORDER BY split_name,state""").fetchall()
        evidence_count=db.execute("""SELECT COUNT(*) FROM
            jrei_code_ability_example_scores""").fetchone()[0]
        categories=db.execute("""SELECT COALESCE(l.lesson_kind,'UNKNOWN'),
            COUNT(*),COALESCE(SUM(s.normalized_exact),0),
            ROUND(AVG(s.word_f1),6)
            FROM jrei_code_ability_example_scores AS s
            JOIN jrei_code_ability_evaluations AS e
              ON e.run_id=s.run_id AND e.split_name=s.split_name
            LEFT JOIN jrei_code_curriculum_lessons AS l
              ON l.id=s.lesson_id
            WHERE s.split_name='DEVELOPMENT'
              AND e.state='INDEPENDENT_AST_ANSWER_SCORING_RECORDED'
            GROUP BY COALESCE(l.lesson_kind,'UNKNOWN')
            ORDER BY COALESCE(l.lesson_kind,'UNKNOWN')""").fetchall()
    return {
        "schema":SCHEMA,
        "recorded_evaluation_states":[{
            "split":part,"state":state,"runs":count,
            "scored_examples":scored,"exact_matches":exact,
        } for part,state,count,scored,exact in rows],
        "individual_hash_only_score_receipts":evidence_count,
        "development_per_task_type":[{
            "lesson_kind":kind,"scored":count,
            "normalized_exact":matches,
            "mean_word_f1":mean_f1,
        } for kind,count,matches,mean_f1 in categories],
        "sealed_per_task_type_metrics_excluded_from_strategy":True,
        "independent_ast_reference_scoring_available_in_source":True,
        "sealed_data_not_trainable_by_this_module":True,
        "generated_code_never_executed":True,
        "code_repair_skill_verified":False,
        "model_serving_activated":False,
    }
