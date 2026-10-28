"""Owner-approved JREI scratch-checkpoint inference in the EXISTING panel.

The default path is always OFF. Nothing is downloaded or installed. No third-
party pretrained weights, external chat APIs, model-manager app, extra server,
second SQLite database or independent model port. This module becomes eligible
only if a from-scratch candidate, sealed-source evaluation, separate offline
bilingual review and explicit owner activation exist in the private store.

The output is a DRAFT. Reusing MIT source code does NOT imply ChatGPT-level
general understanding; a small scratch checkpoint may produce poor text.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import re
import sqlite3
import threading

from jrei_service.windows_native_corpus import load_verified_candidate

_LOCK = threading.RLock()
_CACHE: dict = {}
IDENT = re.compile(r"^[a-f0-9]{32}$")
SHA = re.compile(r"^[a-f0-9]{64}$")


def _sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()




def _sealed_measurement_valid(record: dict, run: dict) -> bool:
    """Validate a measurement receipt's internal arithmetic, not its quality.

    An internally consistent next-token score DOES NOT prove independent
    bilingual comprehension or establish an honest human reviewer.
    """
    if not isinstance(record, dict) or not isinstance(run, dict):
        return False
    dims = run.get("model_architecture")
    if not isinstance(dims, dict):
        return False
    context = dims.get("block_size")
    vocab = dims.get("vocab_size")
    windows = record.get("windows_sampled")
    available = record.get("available_nonoverlapping_windows")
    scored = record.get("tokens_scored")
    if (type(context) is not int or not 32 <= context <= 256
            or type(vocab) is not int or not 256 <= vocab <= 768
            or type(windows) is not int or not 1 <= windows <= 64
            or type(available) is not int or available < windows
            or type(scored) is not int or scored != context * windows
            or record.get("fixed_sampler") !=
               "CONTENT_BLIND_UNIFORM_STRIDED_WINDOWS_V1"
            or not SHA.fullmatch(
                str(record.get("sample_positions_sha256", "")))
            or record.get("dataset_was_used_for_training") is not False
            or record.get("human_education_quality_verified") is not False):
        return False
    fields = ("cross_entropy_nats", "cross_entropy_bits_per_token",
              "uniform_bits_per_token", "window_coverage_fraction")
    if any(type(record.get(key)) not in (int, float)
           or not math.isfinite(record[key]) for key in fields):
        return False
    nats = record["cross_entropy_nats"]
    bits = record["cross_entropy_bits_per_token"]
    uniform = record["uniform_bits_per_token"]
    fraction = record["window_coverage_fraction"]
    return (nats >= 0 and bits >= 0
            and abs(nats - bits * math.log(2)) <= 0.00001
            and abs(uniform - math.log2(vocab)) <= 0.00001
            and 0 < fraction <= 1
            and abs(fraction - windows / available) <= 0.00001)


def _approved(private: Path, db_path: Path) -> dict:
    selection = private / "native-checkpoint-activation.json"
    if (not selection.is_file() or selection.is_symlink()
            or selection.stat().st_size > 8000):
        raise RuntimeError("JREI_NO_OWNER_APPROVED_NATIVE_CHECKPOINT")
    cfg = json.loads(selection.read_text(encoding="utf-8"))
    if (not isinstance(cfg, dict)
            or cfg.get("schema") != "jr.jrei.native-owner-activation.v1"
            or cfg.get("owner_approved") is not True
            or cfg.get("independent_review_recorded") is not True
            or cfg.get("external_pretrained_weights_used") is not False
            or cfg.get("mode") != "JREI_NATIVE_SOURCE_ONLY"):
        raise ValueError("JREI_NATIVE_ACTIVATION_POLICY_INVALID")
    rid = cfg.get("run_id")
    if not isinstance(rid, str) or not IDENT.fullmatch(rid):
        raise ValueError("JREI_NATIVE_ACTIVATION_RUN_INVALID")
    root = private / "native-foundation-runs"
    folder = root / rid
    if (root.is_symlink() or folder.is_symlink()
            or not folder.is_dir() or folder.resolve().parent != root.resolve()):
        raise ValueError("JREI_NATIVE_ACTIVATION_FOLDER_INVALID")
    manifest = folder / "training-manifest.json"
    checkpoint = folder / "jrei-native-unapproved.pt"
    evaluation = folder / "sealed-evaluation.json"
    review = folder / "independent-bilingual-review.json"
    for path, limit in ((manifest, 16_000), (checkpoint, 500_000_000),
                        (evaluation, 16_000), (review, 32_000)):
        if (not path.is_file() or path.is_symlink()
                or path.stat().st_size > limit):
            raise ValueError("JREI_NATIVE_ACTIVATION_ARTIFACT_MISSING")
    rec = json.loads(manifest.read_text(encoding="utf-8"))
    eva = json.loads(evaluation.read_text(encoding="utf-8"))
    review_data = json.loads(review.read_text(encoding="utf-8"))
    for label, actual in (("checkpoint_sha256", checkpoint),
                          ("sealed_evaluation_sha256", evaluation),
                          ("review_record_sha256", review)):
        if (not SHA.fullmatch(str(cfg.get(label, "")))
                or _sha(actual) != cfg[label]):
            raise ValueError("JREI_NATIVE_ACTIVATION_DIGEST_CHANGED")
    if (not isinstance(rec, dict)
            or rec.get("schema") != "jr.jrei.native-from-scratch-run.v1"
            or rec.get("run_id") != rid
            or rec.get("trained_from_random_initialization") is not True
            or rec.get("external_pretrained_weights_used") is not False
            or rec.get("weights_sha256") != cfg["checkpoint_sha256"]
            or not isinstance(eva, dict)
            or eva.get("schema") != "jr.jrei.native-sealed-evaluation.v1"
            or eva.get("run_id") != rid
            or eva.get("model_sha256") != cfg["checkpoint_sha256"]
            or eva.get("state") != "SEALED_NEXT_TOKEN_SCORE_UNVERIFIED"
            or not _sealed_measurement_valid(eva, rec)):
        raise ValueError("JREI_NATIVE_ACTIVATION_PROVENANCE_INVALID")
    if (not isinstance(review_data, dict)
            or review_data.get("schema") != "jr.jrei.native-bilingual-review.v1"
            or review_data.get("run_id") != rid
            or review_data.get("model_sha256") != cfg["checkpoint_sha256"]
            or review_data.get("evaluation_sha256") != cfg["sealed_evaluation_sha256"]
            or review_data.get("persian_reviewed") is not True
            or review_data.get("english_reviewed") is not True
            or review_data.get("owner_authorized_private_inference") is not True
            or review_data.get("reviewer_is_model_itself") is not False):
        raise ValueError("JREI_NATIVE_ACTIVATION_BILINGUAL_REVIEW_MISSING")
    candidate = load_verified_candidate(db_path, private, rec["source_candidate_id"])
    if _sha(candidate["path"] / "manifest.json") != rec["source_manifest_sha256"]:
        raise ValueError("JREI_NATIVE_ACTIVATION_CORPUS_REVOKED")
    if (eva.get("corpus_sha256") != candidate["manifest"]["sealed_test_sha256"]
            or candidate["manifest"]["train_sha256"] != rec["train_sha256"]):
        raise ValueError("JREI_NATIVE_ACTIVATION_TEST_CORPUS_CHANGED")
    return {"config": cfg, "run": rec, "path": checkpoint,
            "tokenizer_path": candidate["path"] / "tokenizer.json"}




def acceptance_preflight(*, db_path: Path, private: Path,
                         run_id: str) -> dict:
    """Owner-requested, read-only stage inventory for a scratch candidate.

    This NEVER opens the trained model with torch, hashes the large weight
    file, generates text, records independent acceptance, or turns a model on.
    Recorded human attestation fields are assertions, NOT authentication
    of reviewers or evidence of real-world Persian/English proficiency.
    """
    if not isinstance(run_id, str) or not IDENT.fullmatch(run_id):
        raise ValueError("JREI_NATIVE_PREFLIGHT_RUN_ID_INVALID")
    root = private / "native-foundation-runs"
    folder = root / run_id
    if (root.is_symlink() or folder.is_symlink()
            or not folder.is_dir()
            or folder.resolve().parent != root.resolve()):
        raise ValueError("JREI_NATIVE_PREFLIGHT_RUN_NOT_FOUND")

    def read_small(name: str, limit: int):
        item = folder / name
        if item.is_symlink() or not item.is_file():
            return None, None
        if item.stat().st_size > limit:
            raise ValueError("JREI_NATIVE_PREFLIGHT_RECEIPT_OVERSIZE")
        data = json.loads(item.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("JREI_NATIVE_PREFLIGHT_RECEIPT_INVALID")
        return data, _sha(item)

    status = {
        "schema": "jr.jrei.native-acceptance-preflight.v1",
        "run_id": run_id,
        "state": "UNACCEPTED_AWAITING_EXTERNAL_REVIEW_AND_FINAL_INTEGRITY",
        "stages": {},
        "source_reuse_verified_against_current_registry": False,
        "checkpoint_integrity_verified_now": False,
        "human_review_authenticity_verified_by_program": False,
        "persian_english_model_ability_proven": False,
        "owner_activation_performed": False,
        "weights_loaded": False,
        "tests_run_by_preflight": False,
        "network_accessed": False,
        "production_changed": False,
    }
    rec, manifest_sha = read_small("training-manifest.json", 16_000)
    if (rec is None or rec.get("schema") !=
            "jr.jrei.native-from-scratch-run.v1"
            or rec.get("run_id") != run_id
            or rec.get("state") != "LOCAL_NATIVE_WEIGHTS_TRAINED_UNVERIFIED"
            or rec.get("trained_from_random_initialization") is not True
            or rec.get("external_pretrained_weights_used") is not False
            or not SHA.fullmatch(str(rec.get("weights_sha256", "")))):
        raise ValueError("JREI_NATIVE_PREFLIGHT_MANIFEST_UNVERIFIED")
    status["stages"]["training_manifest"] = "RECORDED_UNVERIFIED"

    checkpoint = folder / "jrei-native-unapproved.pt"
    status["stages"]["checkpoint"] = (
        "FILE_PRESENT_SHA256_NOT_RECHECKED" if
        checkpoint.is_file() and not checkpoint.is_symlink()
        and 0 < checkpoint.stat().st_size <= 500_000_000 else
        "MISSING_OR_INVALID")
    candidate = None
    try:
        candidate = load_verified_candidate(
            db_path, private, rec.get("source_candidate_id", ""))
        if (_sha(candidate["path"] / "manifest.json") !=
                rec.get("source_manifest_sha256")
                or rec.get("train_sha256") !=
                candidate["manifest"]["train_sha256"]
                or rec.get("heldout_sha256") !=
                candidate["manifest"]["heldout_sha256"]
                or rec.get("tokenizer_sha256") !=
                candidate["manifest"]["tokenizer_sha256"]):
            raise ValueError("JREI_PREFLIGHT_CORPUS_DERIVATION_CHANGED")
        status["stages"]["approved_source_corpus"] = (
            "RECHECKED_HASHED_CURRENT_REGISTRY")
        status["source_reuse_verified_against_current_registry"] = True
    except (ValueError, OSError, sqlite3.Error, KeyError, TypeError):
        status["stages"]["approved_source_corpus"] = (
            "MISSING_REVOKED_OR_CHANGED")

    eva, eval_sha = read_small("sealed-evaluation.json", 16_000)
    evaluation_recorded = (
        candidate is not None
        and status["source_reuse_verified_against_current_registry"]
        and eva is not None
        and eva.get("schema") == "jr.jrei.native-sealed-evaluation.v1"
        and eva.get("state") == "SEALED_NEXT_TOKEN_SCORE_UNVERIFIED"
        and eva.get("run_id") == run_id
        and eva.get("model_sha256") == rec["weights_sha256"]
        and eva.get("corpus_sha256") ==
            candidate["manifest"]["sealed_test_sha256"]
        and _sealed_measurement_valid(eva, rec))
    status["stages"]["sealed_next_token_measurement"] = (
        "RECORD_LINKED_NOT_HUMAN_QUALITY_PROOF" if evaluation_recorded
        else "MISSING_OR_INCONSISTENT")

    review, review_sha = read_small("independent-bilingual-review.json", 32_000)
    attested = (
        evaluation_recorded and review is not None
        and review.get("schema") == "jr.jrei.native-bilingual-review.v1"
        and review.get("run_id") == run_id
        and review.get("model_sha256") == rec["weights_sha256"]
        and review.get("evaluation_sha256") == eval_sha
        and review.get("persian_reviewed") is True
        and review.get("english_reviewed") is True
        and review.get("reviewer_is_model_itself") is False)
    status["stages"]["external_bilingual_review"] = (
        "REVIEW_ATTESTATION_RECORDED_AUTHENTICITY_UNVERIFIED"
        if attested else "MISSING_OR_INCOMPLETE")

    activation = private / "native-checkpoint-activation.json"
    if activation.is_symlink() or not activation.is_file():
        status["stages"]["owner_activation_record"] = "NOT_PRESENT"
    elif activation.stat().st_size > 8_000:
        status["stages"]["owner_activation_record"] = "INVALID"
    else:
        selected = json.loads(activation.read_text(encoding="utf-8"))
        requested = (
            isinstance(selected, dict)
            and selected.get("schema") == "jr.jrei.native-owner-activation.v1"
            and selected.get("run_id") == run_id
            and selected.get("owner_approved") is True
            and selected.get("external_pretrained_weights_used") is False
            and selected.get("checkpoint_sha256") == rec["weights_sha256"]
            and selected.get("sealed_evaluation_sha256") == eval_sha
            and selected.get("review_record_sha256") == review_sha)
        status["stages"]["owner_activation_record"] = (
            "RECORD_PRESENT_RUNTIME_NOT_VERIFIED" if requested
            else "NOT_SELECTED_OR_MISMATCH")
    return status


def _load_tokenizer(path: Path):
    if path.is_symlink() or path.stat().st_size > 100_000:
        raise ValueError("JREI_NATIVE_TOKENIZER_INVALID")
    content = json.loads(path.read_text(encoding="utf-8"))
    if (content.get("schema") != "jr.jrei.native-byte-bpe.v1"
            or content.get("external_tokenizer_weights") is not False
            or not isinstance(content.get("merges"), list)):
        raise ValueError("JREI_NATIVE_TOKENIZER_PROVENANCE_INVALID")
    from jrei_service._vendor.minbpe import BasicTokenizer
    bpe = BasicTokenizer()
    bpe.merges = {}
    bpe.vocab = {i: bytes([i]) for i in range(256)}
    for rule in content["merges"]:
        if (not isinstance(rule, list) or len(rule) != 3
                or not all(type(v) is int for v in rule)):
            raise ValueError("JREI_NATIVE_TOKENIZER_RULE_INVALID")
        left, right, token_id = rule
        if (left not in bpe.vocab or right not in bpe.vocab
                or token_id != len(bpe.vocab) or token_id > 767):
            raise ValueError("JREI_NATIVE_TOKENIZER_MERGE_ORDER_INVALID")
        bpe.merges[(left, right)] = token_id
        bpe.vocab[token_id] = bpe.vocab[left] + bpe.vocab[right]
    if len(bpe.vocab) != content["vocab_size"]:
        raise ValueError("JREI_NATIVE_TOKENIZER_VOCAB_CHANGED")
    return bpe


def complete(*, db_path: Path, private: Path,
             messages: list[dict], max_tokens: int = 160) -> dict:
    if (not isinstance(messages, list) or not 1 <= len(messages) <= 15
            or type(max_tokens) is not int or not 1 <= max_tokens <= 256):
        raise ValueError("JREI_NATIVE_CHAT_REQUEST_INVALID")
    approved = _approved(private, db_path)
    cfg = approved["config"]
    signature = (approved["run"]["weights_sha256"],
                 cfg["sealed_evaluation_sha256"], cfg["review_record_sha256"])
    import torch
    from jrei_service._vendor.nanogpt.model import GPT, GPTConfig
    with _LOCK:
        global _CACHE
        if _CACHE.get("signature") != signature:
            dims = approved["run"]["model_architecture"]
            if (not isinstance(dims, dict)
                    or dims.get("family") != "JREI_FROM_SCRATCH_NANOGPT_MIT_CODE"):
                raise ValueError("JREI_NATIVE_MODEL_FAMILY_INVALID")
            for key, lo, hi in (("layers",1,6),("heads",1,8),
                                 ("embedding",32,384),("block_size",32,256),
                                 ("vocab_size",256,768)):
                if type(dims.get(key)) is not int or not lo <= dims[key] <= hi:
                    raise ValueError("JREI_NATIVE_MODEL_DIMENSIONS_INVALID")
            if dims["embedding"] % dims["heads"]:
                raise ValueError("JREI_NATIVE_MODEL_ATTENTION_MISMATCH")
            model = GPT(GPTConfig(
                block_size=dims["block_size"], vocab_size=dims["vocab_size"],
                n_layer=dims["layers"], n_head=dims["heads"],
                n_embd=dims["embedding"], dropout=0.0, bias=True))
            # weights_only prevents unpickling arbitrary Python objects.
            weights = torch.load(approved["path"], map_location="cpu",
                                 weights_only=True)
            model.load_state_dict(weights, strict=True)
            model.eval()
            tokenizer = _load_tokenizer(approved["tokenizer_path"])
            _CACHE = {"signature": signature, "model": model,
                      "tokenizer": tokenizer, "context": dims["block_size"]}
        model, bpe, ctx = (_CACHE["model"], _CACHE["tokenizer"],
                           _CACHE["context"])
        history = "\n".join(str(m.get("content",""))[:1200]
                            for m in messages[-7:]
                            if m.get("role") in ("user","assistant"))
        prompt = ("JREI\n" + history)[-2400:]
        ids = bpe.encode(prompt)
        if not ids:
            raise ValueError("JREI_NATIVE_TOKENIZATION_EMPTY")
        tokens = torch.tensor([ids[-ctx:]], dtype=torch.long)
        with torch.no_grad():
            generated = model.generate(tokens, max_new_tokens=min(128,max_tokens),
                                       temperature=0.8, top_k=min(32,len(bpe.vocab)))
        answer = bpe.decode(generated[0, len(tokens[0]):].tolist()).strip()
        if not answer:
            raise RuntimeError("JREI_NATIVE_DRAFT_EMPTY")
        return {
            "answer": answer[:3500], "model": approved["run"]["model_id"],
            "backend": "JREI_OWN_TRAINED_SOURCE_CODE",
            "quality": "NATIVE_SMALL_MODEL_DRAFT_NOT_FACT_VERIFIED",
            "output_tokens": generated.shape[1] - len(tokens[0]),
            "trained_from_scratch": True,
            "no_external_model_weights": True,
            "website_changed": False,
        }
