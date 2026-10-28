"""Opt-in JREI-native neural training FROM RANDOM INITIALIZATION.

Uses MIT-licensed nanoGPT *source* bundled under jrei_service._vendor.
No pretrained model, checkpoint fetch, external chatbot, online API, installer
or second database. Works only with an explicitly approved JREI native corpus
and the existing optional local Python/PyTorch runtime. The scheduler NEVER
invokes this trainer automatically. Production inference is not modified.

Train/heldout split, rights and checksums are verified again immediately before
training. Checkpoints are PRIVATE, not promoted, and cannot claim readiness
until independent bilingual acceptance and owner activation are performed.
"""
from __future__ import annotations

from array import array
import argparse
from contextlib import closing
import hashlib
import json
import math
import os
from pathlib import Path
import secrets
import shutil
import sqlite3
import sys
import time

from jrei_service.windows_native_corpus import load_verified_candidate


def _sha_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as reader:
        for chunk in iter(lambda: reader.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _ids(filename: Path) -> list[int]:
    if sys.byteorder != "little" or array("I").itemsize != 4:
        raise RuntimeError("JREI_SCRATCH_U32_PLATFORM_UNSUPPORTED")
    values = array("I")
    with filename.open("rb") as reader:
        values.fromfile(reader, filename.stat().st_size // 4)
    return values.tolist()


def _load_settings(path: Path, private: Path) -> dict:
    if (path.is_symlink() or not path.is_file() or path.stat().st_size > 6000):
        raise ValueError("JREI_SCRATCH_JOB_CONFIG_INVALID")
    if private.name != "command-center" or private.is_symlink() or not private.is_dir():
        raise ValueError("JREI_SCRATCH_PRIVATE_LOCATION_INVALID")
    cfg = json.loads(path.read_text(encoding="utf-8"))
    if (not isinstance(cfg, dict)
            or cfg.get("schema") != "jr.jrei.native-scratch-training-job.v1"
            or cfg.get("owner_approved") is not True
            or cfg.get("no_network") is not True
            or cfg.get("train_from_random_initialization") is not True
            or cfg.get("external_pretrained_models") is not False
            or cfg.get("owner_understands_unverified_quality") is not True):
        raise ValueError("JREI_SCRATCH_OWNER_APPROVAL_REQUIRED")
    params = {
        "layers": (1, 6), "heads": (1, 8), "embedding": (32, 384),
        "block_size": (32, 256), "batch_size": (1, 16),
        "steps": (1, 20000), "max_seconds": (15, 86400),
    }
    for key, (lo, hi) in params.items():
        value = cfg.get(key)
        if type(value) is not int or not lo <= value <= hi:
            raise ValueError("JREI_SCRATCH_HYPERPARAMETER_INVALID_" + key.upper())
    if cfg["embedding"] % cfg["heads"]:
        raise ValueError("JREI_SCRATCH_HEAD_DIMENSION_MISMATCH")
    if cfg.get("device") not in ("cpu", "cuda"):
        raise ValueError("JREI_SCRATCH_DEVICE_INVALID")
    lr = cfg.get("learning_rate")
    if type(lr) not in (int, float) or not 0 < lr <= 0.003:
        raise ValueError("JREI_SCRATCH_LEARNING_RATE_INVALID")
    return cfg


def train(*, db_path: Path, private: Path, config_file: Path,
          owner_approved: bool) -> dict:
    if owner_approved is not True:
        raise ValueError("JREI_SCRATCH_EXPLICIT_RUNTIME_APPROVAL_REQUIRED")
    cfg = _load_settings(config_file, private)
    if (db_path.parent.resolve() != private.resolve()
            or db_path.is_symlink() or not db_path.is_file()):
        raise ValueError("JREI_SCRATCH_ORIGINAL_DATABASE_REQUIRED")
    candidate = load_verified_candidate(db_path, private, cfg.get("candidate_id", ""))
    folder, provenance = candidate["path"], candidate["manifest"]
    if shutil.disk_usage(private).free < 4 * 1024 ** 3:
        raise ValueError("JREI_SCRATCH_INSUFFICIENT_DISK_HEADROOM")
    from jrei_service import windows_resource_envelope as resources
    resource_guard = resources.allow_heavy_training(
        require_gpu=(cfg["device"] == "cuda"))
    if resource_guard["state"] != "HEAVY_WORK_ELIGIBLE_TO_ATTEMPT":
        return {"state": "JREI_SCRATCH_DEFERRED_RESOURCE_OR_OWNER_ACTIVITY",
                "reason": resource_guard["reason"],
                "trained_model": False, "site_changed": False}
    # No PyTorch import at panel startup. PyTorch is optional library code,
    # not a separate desktop application, and may already be on this machine.
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    import torch
    from jrei_service._vendor.nanogpt.model import GPT, GPTConfig
    # Workstation scheduling: one interactive 16GB or 32GB PC must not
    # become unusable when experimental JREI CPU training begins. Read RAM
    # again per job; hardware upgrades are reflected without configuration.
    total_ram = resource_guard["read_only_observation"]["resources"].get(
        "physical_ram_mb") or 0
    cores = max(1, os.cpu_count() or 1)
    cap = 4 if total_ram >= 28672 else 2
    torch.set_num_threads(max(1, min(cap, cores - 1 if cores > 2 else 1)))
    if cfg["device"] == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("JREI_SCRATCH_CUDA_NOT_AVAILABLE")
    device = torch.device(cfg["device"])
    train_ids = _ids(folder / "train.u32")
    heldout_ids = _ids(folder / "heldout.u32")
    context = cfg["block_size"]
    if len(train_ids) <= context + 1 or len(heldout_ids) <= context + 1:
        raise ValueError("JREI_SCRATCH_CONTEXT_EXCEEDS_CORPUS")
    vocab_size = provenance["vocab_size"]
    if (not isinstance(vocab_size, int) or not 256 <= vocab_size <= 768
            or max(train_ids + heldout_ids) >= vocab_size):
        raise ValueError("JREI_SCRATCH_TOKENIZER_MISMATCH")
    seed = cfg.get("seed", 701)
    if type(seed) is not int or not 0 <= seed <= 2**31 - 1:
        raise ValueError("JREI_SCRATCH_SEED_INVALID")
    torch.manual_seed(seed)
    if device.type == "cuda":
        torch.cuda.manual_seed_all(seed)
    model = GPT(GPTConfig(
        block_size=context, vocab_size=vocab_size,
        n_layer=cfg["layers"], n_head=cfg["heads"],
        n_embd=cfg["embedding"], dropout=0.0, bias=True,
    )).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=float(cfg["learning_rate"]))
    # Dataset is pinned before training, and sampling is repeatable. No
    # pretrained base weights, gradient update from heldout or pseudo-labels.
    local_rng = torch.Generator(device="cpu").manual_seed(seed)
    def batch(sequence: list[int], count: int):
        upper = len(sequence) - context - 1
        if upper <= 0:
            raise ValueError("JREI_SCRATCH_DATA_TOO_SHORT")
        starts = torch.randint(0, upper + 1, (count,), generator=local_rng).tolist()
        xx = torch.tensor([sequence[i:i+context] for i in starts],
                          dtype=torch.long, device=device)
        yy = torch.tensor([sequence[i+1:i+context+1] for i in starts],
                          dtype=torch.long, device=device)
        return xx, yy
    # Keep the development-validation offsets fixed across BEFORE/AFTER.
    # Previously both passes consumed different random heldout windows from
    # the training RNG, making apparent improvements noisy and unrepeatable.
    # The sealed final test remains completely outside this trainer.
    validation_rng = torch.Generator(device="cpu").manual_seed(seed ^ 0x5A17)
    validation_upper = len(heldout_ids) - context - 1
    validation_starts = torch.randint(
        0, validation_upper + 1, (8,), generator=validation_rng).tolist()

    @torch.no_grad()
    def validation_loss():
        model.eval()
        losses = []
        for offset in range(0, len(validation_starts), 2):
            starts = validation_starts[offset:offset + 2]
            x = torch.tensor([heldout_ids[i:i + context] for i in starts],
                             dtype=torch.long, device=device)
            y = torch.tensor([heldout_ids[i + 1:i + context + 1] for i in starts],
                             dtype=torch.long, device=device)
            _, loss = model(x, y)
            measured = float(loss.item())
            if not math.isfinite(measured):
                raise ValueError("JREI_SCRATCH_NONFINITE_HELDOUT_LOSS")
            losses.append(measured)
        model.train()
        return sum(losses) / len(losses)
    baseline = validation_loss()
    started = time.monotonic()
    steps_done = 0
    final_train_loss = None
    reason = "STEPS_COMPLETED"
    for step in range(cfg["steps"]):
        if time.monotonic() - started >= cfg["max_seconds"]:
            reason = "RESOURCE_TIME_LIMIT"
            break
        if step and step % 10 == 0:
            capacity = resources.observe(gpu_probe=False)
            if not capacity["sensitive_heavy_jobs_eligible"]:
                reason = "OWNER_ACTIVITY_OR_RESOURCE_PRESSURE"
                break
        model.train()
        x, y = batch(train_ids, cfg["batch_size"])
        _, loss = model(x, y)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        final_train_loss = float(loss.item())
        steps_done = step + 1
    if steps_done < 1:
        raise RuntimeError("JREI_SCRATCH_NO_UPDATES_PERFORMED")
    post = validation_loss()
    # Revalidate source consent before persisting new weights. Revoked
    # sources must not silently generate new training artifacts.
    load_verified_candidate(db_path, private, cfg["candidate_id"])
    output_root = private / "native-foundation-runs"
    if output_root.is_symlink():
        raise ValueError("JREI_SCRATCH_OUTPUT_DIR_LINKED")
    output_root.mkdir(parents=True, mode=0o700, exist_ok=True)
    run_id = secrets.token_hex(16)
    run_dir = output_root / run_id
    run_dir.mkdir(mode=0o700)
    # We emit ONLY freshly initialized local model weights.
    checkpoint = run_dir / "jrei-native-unapproved.pt"
    torch.save(model.cpu().state_dict(), checkpoint)
    weights_sha = _sha_file(checkpoint)
    receipt = {
        "schema": "jr.jrei.native-from-scratch-run.v1",
        "state": "LOCAL_NATIVE_WEIGHTS_TRAINED_UNVERIFIED",
        "model_id": "jrei-native-scratch-" + run_id[:12],
        "run_id": run_id, "created": int(time.time()),
        "source_candidate_id": cfg["candidate_id"],
        "source_manifest_sha256": _sha_file(folder / "manifest.json"),
        "source_license_review": provenance["source_training_rights"],
        "train_sha256": provenance["train_sha256"],
        "heldout_sha256": provenance["heldout_sha256"],
        "tokenizer_sha256": provenance["tokenizer_sha256"],
        "weights_sha256": weights_sha,
        "model_architecture": {
            "family": "JREI_FROM_SCRATCH_NANOGPT_MIT_CODE",
            "layers": cfg["layers"], "heads": cfg["heads"],
            "embedding": cfg["embedding"], "block_size": context,
            "vocab_size": vocab_size
        },
        "training_steps": steps_done, "stop_reason": reason,
        "train_loss_last_batch": final_train_loss,
        "heldout_cross_entropy_before": baseline,
        "heldout_cross_entropy_after": post,
        "heldout_improved_on_this_split": post < baseline,
        "development_validation_fixed_windows": True,
        "development_validation_window_count": len(validation_starts),
        "development_validation_only_not_sealed_test": True,
        "heldout_independently_evaluated": False,
        "persian_english_quality_validated": False,
        "trained_from_random_initialization": True,
        "external_pretrained_weights_used": False,
        "production_promoted": False,
        "serving_config_activated": False,
        "general_purpose_language_model_ready": False,
        "site_changed": False,
    }
    with (run_dir / "training-manifest.json").open("x", encoding="utf-8") as stream:
        json.dump(receipt, stream, indent=2, ensure_ascii=False)
    return {"state": receipt["state"], "run_id": run_id,
            "weight_sha256": weights_sha, "steps": steps_done,
            "heldout_loss_before": baseline, "heldout_loss_after": post,
            "serving_activated": False, "independent_quality_proven": False}


def main():
    parser = argparse.ArgumentParser(description="JREI owner-private neural scratch training")
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--private", type=Path, required=True)
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--owner-approved", action="store_true")
    args = parser.parse_args()
    result = train(db_path=args.db, private=args.private,
                   config_file=args.config, owner_approved=args.owner_approved)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
