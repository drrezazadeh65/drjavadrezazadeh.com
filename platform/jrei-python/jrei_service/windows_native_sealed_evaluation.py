"""Independent JREI sealed-test evaluation (SOURCE ONLY; never auto-run).

Source-disjoint SEALED TEST examples are excluded from tokenizer training and
all optimization/evaluation decisions inside the trainer. The only operation
here is measuring an already stored JREI-from-scratch checkpoint. This is
a language-model next-token loss measurement, not human reasoning quality,
general intelligence, scientific verification, or deployment authorization.

Uses bundled MIT nanoGPT model code and optionally installed PyTorch library.
No new application, network request, model download or database is created.
"""
from __future__ import annotations

from array import array
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import time

from jrei_service.windows_native_corpus import load_verified_candidate
from jrei_service import windows_resource_envelope as resources

IDENT = re.compile(r"^[a-f0-9]{32}$")
SHA = re.compile(r"^[a-f0-9]{64}$")


def _sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for part in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(part)
    return h.hexdigest()


def _read_ids(path: Path) -> list[int]:
    if path.is_symlink() or not path.is_file():
        raise ValueError("JREI_TEST_ARTIFACT_MISSING")
    if path.stat().st_size % 4 or path.stat().st_size > 12_000_000:
        raise ValueError("JREI_TEST_ARTIFACT_SIZE_INVALID")
    if sys.byteorder != "little" or array("I").itemsize != 4:
        raise RuntimeError("JREI_TEST_U32_LITTLE_ENDIAN_REQUIRED")
    ids = array("I")
    with path.open("rb") as stream:
        ids.fromfile(stream, path.stat().st_size // 4)
    return ids.tolist()


def evaluate(*, db_path: Path, private: Path, run_id: str,
             owner_approved: bool) -> dict:
    if owner_approved is not True:
        raise ValueError("JREI_SEALED_TEST_OWNER_APPROVAL_REQUIRED")
    if not isinstance(run_id, str) or not IDENT.fullmatch(run_id):
        raise ValueError("JREI_SEALED_TEST_RUN_ID_INVALID")
    if (private.name != "command-center" or private.is_symlink()
            or db_path.parent.resolve() != private.resolve()):
        raise ValueError("JREI_SEALED_TEST_OWNER_PRIVATE_SCOPE_REQUIRED")
    root = private / "native-foundation-runs"
    folder = root / run_id
    manifest_file = folder / "training-manifest.json"
    weights_file = folder / "jrei-native-unapproved.pt"
    if (root.is_symlink() or folder.is_symlink()
            or not folder.is_dir() or
            folder.resolve().parent != root.resolve() or
            manifest_file.is_symlink() or
            not manifest_file.is_file() or
            manifest_file.stat().st_size > 15_000 or
            weights_file.is_symlink() or not weights_file.is_file()):
        raise ValueError("JREI_SEALED_TEST_LOCAL_ARTIFACT_INVALID")
    receipt = json.loads(manifest_file.read_text(encoding="utf-8"))
    if (not isinstance(receipt, dict)
            or receipt.get("schema") != "jr.jrei.native-from-scratch-run.v1"
            or receipt.get("run_id") != run_id
            or receipt.get("state") != "LOCAL_NATIVE_WEIGHTS_TRAINED_UNVERIFIED"
            or receipt.get("trained_from_random_initialization") is not True
            or receipt.get("external_pretrained_weights_used") is not False
            or receipt.get("production_promoted") is not False
            or not SHA.fullmatch(str(receipt.get("weights_sha256", "")))
            or _sha(weights_file) != receipt["weights_sha256"]):
        raise ValueError("JREI_SEALED_TEST_WEIGHTS_UNTRUSTED")
    candidate_id = receipt.get("source_candidate_id")
    candidate = load_verified_candidate(db_path, private, candidate_id)
    corpus, proof = candidate["path"], candidate["manifest"]
    if _sha(corpus / "manifest.json") != receipt.get("source_manifest_sha256"):
        raise ValueError("JREI_SEALED_TEST_CORPUS_MANIFEST_CHANGED")
    if proof["train_sha256"] != receipt["train_sha256"]:
        raise ValueError("JREI_SEALED_TEST_TRAINING_CORPUS_CHANGED")
    if proof["heldout_sha256"] != receipt["heldout_sha256"]:
        raise ValueError("JREI_SEALED_TEST_DEV_CORPUS_CHANGED")
    if proof["tokenizer_sha256"] != receipt["tokenizer_sha256"]:
        raise ValueError("JREI_SEALED_TEST_TOKENIZER_CHANGED")
    # Every training run only consumes train.u32 and heldout.u32; the sealed
    # file below has its own independent set of source hashes.
    sealed = _read_ids(corpus / "sealed-test.u32")
    if _sha(corpus / "sealed-test.u32") != proof["sealed_test_sha256"]:
        raise ValueError("JREI_SEALED_TEST_DIGEST_CHANGED")
    gate = resources.allow_heavy_training(require_gpu=False)
    if gate["state"] != "HEAVY_WORK_ELIGIBLE_TO_ATTEMPT":
        return {"state": "SEALED_EVALUATION_DEFERRED_PC_BUSY",
                "reason": gate["reason"], "evaluation_performed": False}
    architecture = receipt["model_architecture"]
    if (not isinstance(architecture, dict) or
            architecture.get("family") != "JREI_FROM_SCRATCH_NANOGPT_MIT_CODE"):
        raise ValueError("JREI_SEALED_TEST_ARCHITECTURE_INVALID")
    dims = {
        "layers": (1, 6), "heads": (1, 8),
        "embedding": (32, 384), "block_size": (32, 256),
        "vocab_size": (256, 768),
    }
    for name, (lo, hi) in dims.items():
        if type(architecture.get(name)) is not int or not lo <= architecture[name] <= hi:
            raise ValueError("JREI_SEALED_TEST_DIMENSIONS_INVALID")
    if architecture["embedding"] % architecture["heads"]:
        raise ValueError("JREI_SEALED_TEST_ATTENTION_DIMENSIONS_INVALID")
    if len(sealed) < architecture["block_size"] + 2:
        raise ValueError("JREI_SEALED_TEST_NOT_LONG_ENOUGH")
    if max(sealed) >= architecture["vocab_size"]:
        raise ValueError("JREI_SEALED_TEST_TOKEN_ID_NOT_IN_VOCAB")
    import torch
    from torch.nn import functional as F
    from jrei_service._vendor.nanogpt.model import GPT, GPTConfig
    # No from_pretrained, no network and no GPU needed to evaluate a
    # portable local candidate; CPU reproducibility is preferred here.
    torch.set_num_threads(min(4, max(1, os.cpu_count() or 1)))
    network = GPT(GPTConfig(
        block_size=architecture["block_size"],
        vocab_size=architecture["vocab_size"],
        n_layer=architecture["layers"], n_head=architecture["heads"],
        n_embd=architecture["embedding"], dropout=0.0, bias=True,
    ))
    state = torch.load(weights_file, map_location="cpu", weights_only=True)
    if not isinstance(state, dict) or not state:
        raise ValueError("JREI_SEALED_TEST_STATE_DICT_INVALID")
    network.load_state_dict(state, strict=True)
    network.eval()
    context = architecture["block_size"]
    # Fixed, content-blind, broadly distributed windows. Selecting the
    # FIRST 64 windows silently over-represented early sources in a long
    # sealed corpus. No sealed-test score is used to tune this sampler.
    all_positions = range(0, len(sealed) - context, context)
    maximum = 64  # Bounded CPU-only private evaluation, not a daily quota.
    count = len(all_positions)
    if not count:
        raise ValueError("JREI_SEALED_TEST_NO_WINDOWS")
    if count <= maximum:
        start_positions = list(all_positions)
    else:
        picks = [(index * (count - 1)) // (maximum - 1)
                 for index in range(maximum)]
        start_positions = [all_positions[index] for index in picks]
    positions_sha256 = hashlib.sha256(json.dumps(
        start_positions, separators=(",", ":")).encode("ascii")).hexdigest()
    # This is only an excerpted next-token benchmark. Not every source is
    # necessarily covered by the 64 sampled windows, and script counts do
    # not establish per-language accuracy or reasoning competence.
    total = 0.0
    tokens = 0
    with torch.no_grad():
        for index in start_positions:
            x = torch.tensor([sealed[index:index+context]], dtype=torch.long)
            y = torch.tensor([sealed[index+1:index+context+1]], dtype=torch.long)
            _, loss = network(x, y)
            number = float(loss.item())
            if not math.isfinite(number):
                raise ValueError("JREI_SEALED_TEST_NONFINITE_LOSS")
            total += number * context
            tokens += context
    bits = (total / tokens) / math.log(2)
    # This receipt is a candidate measurement only, not a promotion.
    outcome = {
        "schema": "jr.jrei.native-sealed-evaluation.v1",
        "state": "SEALED_NEXT_TOKEN_SCORE_UNVERIFIED",
        "run_id": run_id, "evaluated_at": int(time.time()),
        "model_sha256": receipt["weights_sha256"],
        "corpus_sha256": proof["sealed_test_sha256"],
        "source_groups": [entry["id"] for entry in proof["sealed_test_sources"]],
        "sealed_partition_script_counts_at_preparation":
            proof.get("bilingual_script_coverage", {}).get("SEALED_TEST"),
        "fixed_sampler": "CONTENT_BLIND_UNIFORM_STRIDED_WINDOWS_V1",
        "available_nonoverlapping_windows": count,
        "windows_sampled": len(start_positions),
        "sample_positions_sha256": positions_sha256,
        "window_coverage_fraction": round(len(start_positions) / count, 6),
        "all_sealed_tokens_evaluated": False,
        "per_language_proficiency_evaluated": False,
        "cross_entropy_nats": round(total / tokens, 8),
        "cross_entropy_bits_per_token": round(bits, 8),
        "uniform_bits_per_token": round(math.log2(architecture["vocab_size"]), 8),
        "tokens_scored": tokens,
        "metric": "SEALED_NEXT_TOKEN_CROSS_ENTROPY_ONLY",
        "dataset_was_used_for_training": False,
        "human_education_quality_verified": False,
        "general_purpose_chat_ready": False,
        "owner_production_promotion_approved": False,
        "no_external_weights": True,
    }
    final = folder / "sealed-evaluation.json"
    if final.is_symlink():
        raise ValueError("JREI_SEALED_TEST_REPORT_SYMLINK_REFUSED")
    with final.open("x", encoding="utf-8") as stream:
        json.dump(outcome, stream, indent=2, ensure_ascii=False)
    return {"state": outcome["state"], "run_id": run_id,
            "bits_per_token": outcome["cross_entropy_bits_per_token"],
            "tokens_scored": tokens, "promoted": False}


def main():
    parser = argparse.ArgumentParser(description="JREI isolated sealed next-token evaluation")
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--private", type=Path, required=True)
    parser.add_argument("--run-id", type=str, required=True)
    parser.add_argument("--owner-approved", action="store_true")
    args = parser.parse_args()
    print(json.dumps(evaluate(db_path=args.db, private=args.private,
                              run_id=args.run_id,
                              owner_approved=args.owner_approved),
                     ensure_ascii=False))


if __name__ == "__main__":
    main()
