"""Optional JREI-native LoRA trainer built on Hugging Face Transformers/PEFT.

This is a *training implementation*, not a running service. It intentionally
imports training dependencies only inside an explicit owner-invoked function.
No Qwen requirement, no automatic downloads, no sidecar app, no model promotion
or website connection. Candidate datasets are not certified merely because
their upstream JREI manifest exists. No tests or training were run in this commit.

Upstream Python APIs: https://github.com/huggingface/transformers (Apache-2.0)
and https://github.com/huggingface/peft (Apache-2.0). Original JREI code:
no upstream implementation copied verbatim.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import secrets

SCHEMA = "jr.jrei.local-peft-job.v1"
HEX = re.compile(r"^[a-f0-9]{64}$")
SAFE_FILENAME = re.compile(r"^[A-Za-z0-9_.-]{1,100}$")


def _hash_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _child(root: Path, raw: str, *, file: bool) -> Path:
    if not isinstance(raw, str) or not raw:
        raise ValueError("JREI_TRAINING_PATH_REQUIRED")
    path = Path(raw)
    if (not path.is_absolute() or path.is_symlink()
            or not path.resolve(strict=True).is_relative_to(root.resolve(strict=True))
            or (file and not path.is_file())
            or (not file and not path.is_dir())):
        raise ValueError("JREI_TRAINING_PRIVATE_PATH_REQUIRED")
    return path


def _load_job(config_file: Path, private: Path) -> dict:
    if config_file.is_symlink() or not config_file.is_file():
        raise ValueError("JREI_TRAINING_CONFIG_NOT_REGULAR")
    if config_file.stat().st_size > 15000:
        raise ValueError("JREI_TRAINING_CONFIG_OVERSIZE")
    cfg = json.loads(config_file.read_text(encoding="utf-8"))
    if not isinstance(cfg, dict) or cfg.get("schema") != SCHEMA:
        raise ValueError("JREI_TRAINING_SCHEMA_INVALID")
    for required in ("owner_confirmed", "base_model_rights_reviewed",
                     "dataset_rights_reviewed", "independent_data_review_recorded"):
        if cfg.get(required) is not True:
            raise ValueError("JREI_TRAINING_EXPLICIT_REVIEW_REQUIRED")
    if cfg.get("origin") != "OWNER_PRIVATE_ISOLATED_WINDOWS":
        raise ValueError("JREI_TRAINING_ORIGIN_INVALID")
    if cfg.get("no_network") is not True:
        raise ValueError("JREI_TRAINING_NETWORK_MUST_BE_DISABLED")
    if any("qwen" in str(cfg.get(k, "")).casefold()
           for k in ("base_model_family", "model_name")):
        raise ValueError("JREI_QWEN_RETIRED")
    models = _child(private.parent / "models", cfg.get("base_model_dir"), file=False)
    samples = _child(private / "adapter-candidates", cfg.get("train_jsonl"), file=True)
    if not str(samples).endswith(".train.jsonl"):
        raise ValueError("JREI_TRAINING_SOURCE_NOT_APPROVED_FORMAT")
    if not isinstance(cfg.get("train_sha256"), str) or not HEX.fullmatch(cfg["train_sha256"]):
        raise ValueError("JREI_TRAINING_DATA_HASH_REQUIRED")
    if _hash_file(samples) != cfg["train_sha256"]:
        raise ValueError("JREI_TRAINING_DATA_CHANGED")
    review_file = _child(private, cfg.get("review_receipt_file"), file=True)
    if (not isinstance(cfg.get("review_receipt_sha256"), str)
            or not HEX.fullmatch(cfg["review_receipt_sha256"])
            or _hash_file(review_file) != cfg["review_receipt_sha256"]):
        raise ValueError("JREI_TRAINING_REVIEW_RECEIPT_INVALID")
    if not isinstance(cfg.get("heldout_sha256"), str) or not HEX.fullmatch(cfg["heldout_sha256"]):
        raise ValueError("JREI_TRAINING_HELDOUT_REQUIRED")
    if cfg["heldout_sha256"] == cfg["train_sha256"]:
        raise ValueError("JREI_TRAINING_HELDOUT_OVERLAP")
    files = cfg.get("base_artifact_sha256")
    if not isinstance(files, dict) or not files:
        raise ValueError("JREI_TRAINING_MODEL_FILE_MANIFEST_REQUIRED")
    all_files = {
        str(p.relative_to(models)).replace("\\", "/")
        for p in models.rglob("*") if p.is_file()
    }
    declared = set(files)
    if declared != all_files:
        raise ValueError("JREI_TRAINING_MODEL_MANIFEST_INCOMPLETE")
    if "config.json" not in declared or not any(
        k.endswith(".safetensors") for k in declared
    ):
        raise ValueError("JREI_TRAINING_MODEL_ARTIFACTS_MISSING")
    for name, expected in files.items():
        if (not isinstance(name, str) or not SAFE_FILENAME.fullmatch(name)
                or not isinstance(expected, str) or not HEX.fullmatch(expected)):
            raise ValueError("JREI_TRAINING_MODEL_FILE_ENTRY_INVALID")
        artifact = models / name
        if artifact.is_symlink() or _hash_file(artifact) != expected:
            raise ValueError("JREI_TRAINING_MODEL_FILE_HASH_MISMATCH")
    metadata = json.loads((models / "config.json").read_text(encoding="utf-8"))
    if "qwen" in str(metadata.get("model_type", "")).casefold():
        raise ValueError("JREI_QWEN_MODEL_NOT_ELIGIBLE")
    for k, low, high in (("max_steps", 1, 1000000),
                          ("sequence_length", 128, 16384),
                          ("batch_size", 1, 128),
                          ("gradient_accumulation", 1, 1024),
                          ("lora_rank", 2, 256),
                          ("save_steps", 1, 1000000)):
        v = cfg.get(k)
        if not isinstance(v, int) or isinstance(v, bool) or not low <= v <= high:
            raise ValueError("JREI_TRAINING_PARAMETER_INVALID")
    if (cfg["lora_rank"] % 2 or
            not isinstance(cfg.get("learning_rate"), (float, int))
            or not 0 < cfg["learning_rate"] <= 0.001):
        raise ValueError("JREI_TRAINING_OPTIMIZER_INVALID")
    modules = cfg.get("lora_target_modules")
    if (not isinstance(modules, list) or not 1 <= len(modules) <= 16
            or any(not isinstance(x, str) or not SAFE_FILENAME.fullmatch(x)
                   for x in modules) or len(set(modules)) != len(modules)):
        raise ValueError("JREI_TRAINING_LORA_MODULES_INVALID")
    return {"cfg": cfg, "model_path": models, "data_path": samples}


class _TrainingText:
    """JSONL offset index: only the training examples are ever used."""
    def __init__(self, filename: Path, tokenizer, max_length: int):
        self.filename, self.tokenizer = filename, tokenizer
        self.max_length = max_length
        self.offsets = []
        offset = 0
        with filename.open("rb") as stream:
            for row in stream:
                if len(row) > 24000:
                    raise ValueError("JREI_TRAINING_ROW_OVERSIZE")
                sample = self._decode(row)
                if not sample:
                    raise ValueError("JREI_TRAINING_SAMPLE_INVALID")
                self.offsets.append(offset)
                offset += len(row)
        if not self.offsets:
            raise ValueError("JREI_TRAINING_EMPTY_DATASET")

    @staticmethod
    def _decode(raw: bytes):
        sample = json.loads(raw)
        if not isinstance(sample, dict) or set(sample) != {"messages"}:
            return None
        conversation = sample["messages"]
        if (not isinstance(conversation, list) or len(conversation) != 2
                or not all(isinstance(x, dict) and
                           set(x) == {"role", "content"} for x in conversation)
                or [x["role"] for x in conversation] != ["user", "assistant"]
                or not all(isinstance(x["content"], str) and
                           10 <= len(x["content"]) <= 5000 for x in conversation)):
            return None
        return conversation

    def __len__(self):
        return len(self.offsets)

    def __getitem__(self, i: int):
        with self.filename.open("rb") as stream:
            stream.seek(self.offsets[i])
            conversation = self._decode(stream.readline())
        prompt = self.tokenizer.apply_chat_template(
            [conversation[0]], add_generation_prompt=True, tokenize=True)
        answer = self.tokenizer(conversation[1]["content"],
                                add_special_tokens=False)["input_ids"]
        ids = (prompt + answer + [self.tokenizer.eos_token_id])[:self.max_length]
        labels = ([-100] * len(prompt) + answer
                  + [self.tokenizer.eos_token_id])[:self.max_length]
        if len(ids) != len(labels) or all(label == -100 for label in labels):
            raise ValueError("JREI_TRAINING_SAMPLE_NO_ASSISTANT_TARGET")
        return {"input_ids": ids, "attention_mask": [1] * len(ids),
                "labels": labels}


def run_owner_training(config_file: Path, private: Path) -> dict:
    """Run only after local owner authorization/review and dependency setup.

    Saves adapter under a *new* private run directory. This is never called
    by the Windows command-center scheduler or an LLM-generated instruction.
    """
    import os
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    job = _load_job(config_file, private)
    cfg = job["cfg"]
    # Lazy third-party dependencies: ordinary JREI chat/learning stays stdlib.
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments
    from peft import LoraConfig, get_peft_model
    if not torch.cuda.is_available() and not cfg.get("explicit_cpu_training", False):
        raise RuntimeError("JREI_NO_APPROVED_TRAINING_ACCELERATOR")
    model_path = str(job["model_path"])
    tokenizer = AutoTokenizer.from_pretrained(
        model_path, trust_remote_code=False, local_files_only=True)
    if tokenizer.eos_token_id is None:
        raise ValueError("JREI_TRAINING_EOS_UNAVAILABLE")
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        model_path, trust_remote_code=False, local_files_only=True,
        use_safetensors=True)
    model.config.use_cache = False
    model = get_peft_model(model, LoraConfig(
        task_type="CAUSAL_LM", r=cfg["lora_rank"],
        lora_alpha=cfg["lora_rank"] * 2, lora_dropout=0.05,
        target_modules=cfg["lora_target_modules"]))
    dataset = _TrainingText(job["data_path"], tokenizer, cfg["sequence_length"])
    run_dir = private / "adapter-candidates" / "training-runs" / secrets.token_hex(16)
    if run_dir.is_symlink():
        raise ValueError("JREI_TRAINING_OUTPUT_LINKED")
    run_dir.mkdir(mode=0o700, parents=True)
    def collate(batch):
        longest = max(len(item["input_ids"]) for item in batch)
        return {key: torch.tensor([
            item[key] + ([tokenizer.pad_token_id] if key == "input_ids" else
                         [-100] if key == "labels" else [0]) *
                         (longest - len(item[key]))
            for item in batch], dtype=torch.long)
            for key in ("input_ids", "attention_mask", "labels")}
    args = TrainingArguments(
        output_dir=str(run_dir / "checkpoints"),
        max_steps=cfg["max_steps"],
        per_device_train_batch_size=cfg["batch_size"],
        gradient_accumulation_steps=cfg["gradient_accumulation"],
        learning_rate=float(cfg["learning_rate"]),
        save_steps=cfg["save_steps"], logging_steps=max(1, cfg["save_steps"] // 2),
        gradient_checkpointing=True,
        report_to=[], remove_unused_columns=False, save_total_limit=3,
    )
    trainer = Trainer(model=model, args=args, train_dataset=dataset,
                      data_collator=collate)
    trainer.train()
    adapter_dir = run_dir / "adapter"
    trainer.model.save_pretrained(str(adapter_dir), safe_serialization=True)
    tokenizer.save_pretrained(str(adapter_dir))
    files = {p.name: _hash_file(p) for p in sorted(adapter_dir.iterdir())
             if p.is_file()}
    record = {"schema": "jr.jrei.training-artifact.v1",
              "state": "LOCAL_ADAPTER_CANDIDATE_UNEVALUATED",
              "family": cfg["base_model_family"],
              "base_model_file_hashes": cfg["base_artifact_sha256"],
              "training_data_sha256": cfg["train_sha256"],
              "review_receipt_sha256": cfg["review_receipt_sha256"],
              "heldout_sha256": cfg["heldout_sha256"],
              "adapter_files_sha256": files,
              "independent_bilingual_evaluation_passed": False,
              "production_promoted": False,
              "model_owned_foundation_trained_from_scratch": False}
    (run_dir / "training-manifest.json").write_text(
        json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"state": record["state"], "manifest": str(run_dir / "training-manifest.json")}


def main() -> None:
    parser = argparse.ArgumentParser(description="Explicit private JREI LoRA training")
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--private", type=Path, required=True)
    parser.add_argument("--owner-approved", action="store_true")
    args = parser.parse_args()
    if not args.owner_approved:
        parser.error("JREI_TRAINING_OWNER_APPROVAL_REQUIRED")
    result = run_owner_training(args.config, args.private)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
