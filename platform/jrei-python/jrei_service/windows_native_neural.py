"""JREI-original compact causal neural language model trained from zero.

Educational architecture implemented within existing JREI Python package.
No external pretrained weights, tokenizers, model hubs, apps, cloud APIs or
auto-download. Uses optional PyTorch *library* APIs under their BSD-3-Clause
license (https://github.com/pytorch/pytorch); imports only for owner-approved
local training. Architecture and control flow are new JREI source code, using
standard causal Transformer concepts, not copied upstream implementations.

The resulting file is a candidate ONLY. It is not installed as a conversational
model until independent Persian/English acceptance, a real provenance ledger,
and a separately owner-approved controlled promotion. Source-only by default.
"""
from __future__ import annotations

from contextlib import closing
import hashlib
import json
import math
import os
from pathlib import Path
import secrets
import sqlite3
import time

from jrei_service import windows_native_brain as native

SCHEMA = "jr.jrei.native-neural-train.v1"
VOCAB = 256
CONTEXT = 128
WIDTH = 128
LAYERS = 2
HEADS = 4
MAX_STEPS = 240
TRAINING_ROOT = "native-neural-candidates"


def _hash(path: Path) -> str:
    dig = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            dig.update(chunk)
    return dig.hexdigest()


def initialize(db_path: Path):
    with closing(native._db(db_path)) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_native_neural_runs(
            id TEXT PRIMARY KEY, created INTEGER NOT NULL,
            dataset_sha256 TEXT NOT NULL, heldout_sha256 TEXT NOT NULL,
            checkpoint_sha256 TEXT NOT NULL,
            start_heldout_bpb REAL NOT NULL,
            final_heldout_bpb REAL NOT NULL,
            steps INTEGER NOT NULL, state TEXT NOT NULL,
            independently_accepted INTEGER NOT NULL DEFAULT 0)""")


def _docs(db_path: Path):
    train, hold = native._rows(db_path)
    if len(train)<20 or len(hold)<10:
        return None
    training,trainsha = native._canonical(train)
    heldout,holdsha = native._canonical(hold)
    if trainsha==holdsha:
        raise ValueError("JREI_NATIVE_NEURAL_TRAIN_HELDOUT_DUPLICATE")
    if {x["source"] for x in training} & {x["source"] for x in heldout}:
        raise ValueError("JREI_NATIVE_NEURAL_SOURCE_DATA_LEAKAGE")
    return training,heldout,trainsha,holdsha


def _create_network(torch, nn):
    """Byte-level causal Transformer, random initialization only."""
    class Block(nn.Module):
        def __init__(self):
            super().__init__()
            self.ln_attn = nn.LayerNorm(WIDTH)
            self.attention = nn.MultiheadAttention(
                WIDTH, HEADS, dropout=0, batch_first=True)
            self.ln_ff = nn.LayerNorm(WIDTH)
            self.ff = nn.Sequential(
                nn.Linear(WIDTH, WIDTH*4), nn.GELU(),
                nn.Linear(WIDTH*4, WIDTH))

        def forward(self, x, mask):
            h = self.ln_attn(x)
            z, _ = self.attention(h, h, h, attn_mask=mask,
                                  need_weights=False)
            x = x + z
            return x + self.ff(self.ln_ff(x))

    class JREINativeNeural(nn.Module):
        def __init__(self):
            super().__init__()
            self.embedding = nn.Embedding(VOCAB, WIDTH)
            self.positions = nn.Embedding(CONTEXT, WIDTH)
            self.blocks = nn.ModuleList([Block() for _ in range(LAYERS)])
            self.norm = nn.LayerNorm(WIDTH)
            self.output = nn.Linear(WIDTH,VOCAB,bias=False)

        def forward(self, ids):
            n = ids.shape[1]
            if n<1 or n>CONTEXT:
                raise ValueError("JREI_NATIVE_NEURAL_SEQUENCE_INVALID")
            pos = torch.arange(n,device=ids.device)
            hidden = self.embedding(ids)+self.positions(pos)
            future = torch.ones((n,n),dtype=torch.bool,
                                device=ids.device).triu(1)
            for layer in self.blocks:
                hidden = layer(hidden,future)
            return self.output(self.norm(hidden))

    return JREINativeNeural()


def _make_sequences(samples, *, sequence_length=CONTEXT):
    """One example per source-contained window; never join separate sources."""
    windows=[]
    for item in samples:
        raw=item["text"].encode("utf-8")
        if len(raw)<64:
            continue
        # Each source yields bounded windows, avoiding one source dominating.
        for start in range(0,max(1,len(raw)-64),sequence_length):
            sample=raw[start:start+sequence_length+1]
            if len(sample)>=65:
                windows.append(sample)
            if len(windows)>=5000:
                return windows
    return windows


def _evaluate(torch, F, model, windows, device):
    model.eval()
    numer = 0.0
    denom = 0
    # Heldout text is only read for scoring; gradient and optimizers are off.
    with torch.no_grad():
        for sample in windows[:180]:
            inputs=torch.tensor([list(sample[:-1])],dtype=torch.long,
                                device=device)
            labels=torch.tensor(list(sample[1:]),dtype=torch.long,
                                device=device)
            logits=model(inputs)[0]
            loss=F.cross_entropy(logits,labels,reduction="sum")
            numer+=float(loss.item())
            denom+=int(labels.numel())
    if denom<600:
        raise ValueError("JREI_NATIVE_NEURAL_HELDOUT_DATA_TOO_SMALL")
    return round(numer/(denom*math.log(2)),6)


def train(*, db_path: Path, private: Path, owner_approved: bool,
          training_rights_reviewed: bool, steps: int=48,
          resources_available: bool=False, allow_gpu: bool=False) -> dict:
    if (owner_approved is not True or training_rights_reviewed is not True
            or not isinstance(steps,int) or isinstance(steps,bool)
            or not 1<=steps<=MAX_STEPS):
        raise ValueError("JREI_NATIVE_NEURAL_EXPLICIT_OWNER_TRAINING_REQUIRED")
    if not resources_available:
        return {"state":"NATIVE_NEURAL_TRAINING_DEFERRED_RESOURCES",
                "training_performed":False}
    # Existing training jobs now use the original Windows telemetry and
    # measured local CUDA capability. Two PCs never share GPU allocations.
    # Owner activity or missing driver proof defers the expensive operation.
    from jrei_service import windows_resource_envelope as resources
    guard=resources.allow_heavy_training(require_gpu=allow_gpu)
    if guard["state"]!="HEAVY_WORK_ELIGIBLE_TO_ATTEMPT":
        return {"state":"NATIVE_NEURAL_DEFERRED_REAL_PC_CAPACITY",
                "reason":guard["reason"],"training_performed":False}
    pair=_docs(db_path)
    if pair is None:
        return {"state":"NATIVE_NEURAL_WAITING_FOR_REVIEWED_DATA",
                "training_performed":False,
                "external_pretrained_models_used":False}
    train_docs,held_docs,train_sha,held_sha=pair
    try:
        # No model download or pip installation is ever attempted here.
        import torch
        from torch import nn
        from torch.nn import functional as F
    except ImportError:
        return {"state":"NATIVE_NEURAL_PYTORCH_LIBRARY_NOT_PRESENT",
                "training_performed":False,
                "other_desktop_apps_needed":False}
    if torch.__version__.startswith("0."):
        raise ValueError("JREI_NATIVE_NEURAL_PYTORCH_VERSION_UNSUPPORTED")
    # Any requested GPU must first exist locally. CPU is always the default.
    if allow_gpu and not torch.cuda.is_available():
        raise ValueError("JREI_NATIVE_NEURAL_GPU_NOT_AVAILABLE")
    device=torch.device("cuda" if allow_gpu else "cpu")
    torch.set_num_threads(min(4,max(1,os.cpu_count() or 1)))
    # Deterministic seeds improve reproducibility; this does not imply
    # bitwise identical results across different CPU/GPU environments.
    torch.manual_seed(26028)
    training=_make_sequences(train_docs)
    heldout=_make_sequences(held_docs)
    if len(training)<20 or len(heldout)<10:
        return {"state":"NATIVE_NEURAL_CONTEXT_WINDOWS_INSUFFICIENT",
                "training_performed":False}
    model=_create_network(torch,nn).to(device)
    baseline=_evaluate(torch,F,model,heldout,device)
    optimizer=torch.optim.AdamW(model.parameters(),lr=0.00035,
                                 weight_decay=0.01)
    for step in range(steps):
        # Stop at a safe gradient boundary if the owner resumes using the PC
        # or Windows RAM/CPU headroom disappears (e.g., a heavy game starts).
        if step and step % 8 == 0:
            probe=resources.observe(gpu_probe=False)
            if (not probe["sensitive_heavy_jobs_eligible"]):
                return {"state":"NATIVE_NEURAL_STOPPED_OWNER_OR_RESOURCE_PRESSURE",
                        "training_steps_completed":step,
                        "weights_published":False,
                        "training_improvement_verified":False}
        model.train()
        # Fixed indexing, no random I/O or data leakage from heldout.
        sample=training[(step*7919)%len(training)]
        inputs=torch.tensor([list(sample[:-1])],dtype=torch.long,device=device)
        targets=torch.tensor(list(sample[1:]),dtype=torch.long,device=device)
        logits=model(inputs)[0]
        loss=F.cross_entropy(logits,targets)
        if not torch.isfinite(loss).item():
            raise ValueError("JREI_NATIVE_NEURAL_NONFINITE_LOSS")
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(),1.0)
        optimizer.step()
    final=_evaluate(torch,F,model,heldout,device)
    root=private/TRAINING_ROOT
    if root.is_symlink():
        raise ValueError("JREI_NATIVE_NEURAL_OUTPUT_LINKED")
    root.mkdir(mode=0o700,parents=True,exist_ok=True)
    ident=secrets.token_hex(16)
    checkpoint=root/(ident+".weights.pt")
    # Saved state consists solely of primitive torch tensors. Any future
    # loader must use weights_only=True AND this exact SHA256 before loading.
    with checkpoint.open("xb") as output:
        torch.save(model.cpu().state_dict(),output)
    digest=_hash(checkpoint)
    receipt={
        "schema":SCHEMA,"run_id":ident,
        "state":"NEURAL_FROM_SCRATCH_CANDIDATE_UNACCEPTED",
        "architecture":"JREI_ORIGINAL_BYTE_CAUSAL_TRANSFORMER",
        "model_parameters":sum(p.numel() for p in model.parameters()),
        "vocabulary_bytes":VOCAB,"context_tokens":CONTEXT,
        "width":WIDTH,"layers":LAYERS,"heads":HEADS,
        "pretrained_weights_used":False,
        "external_base_model_used":False,
        "training_data_sha256":train_sha,
        "heldout_data_sha256":held_sha,
        "checkpoint_sha256":digest,
        "steps":steps,"initial_heldout_bits_per_byte":baseline,
        "final_heldout_bits_per_byte":final,
        "independently_evaluated":False,
        "general_persian_english_ability_proven":False,
        "production_activated":False,
        "train_device":device.type,
    }
    manifest=root/(ident+".manifest.json")
    with manifest.open("x",encoding="utf-8") as out:
        json.dump(receipt,out,ensure_ascii=False,indent=2)
    with closing(native._db(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("""INSERT INTO jrei_native_neural_runs (
            id,created,dataset_sha256,heldout_sha256,checkpoint_sha256,
            start_heldout_bpb,final_heldout_bpb,steps,state)
            VALUES(?,?,?,?,?,?,?,?,?)""",
            (ident,int(time.time()),train_sha,held_sha,digest,baseline,
             final,steps,receipt["state"]))
        db.commit()
    return {"state":receipt["state"],"run_id":ident,
            "checkpoint_sha256":digest,
            "steps":steps,
            "initial_heldout_bits_per_byte":baseline,
            "final_heldout_bits_per_byte":final,
            "trained_from_scratch":True,
            "independent_quality_verified":False,
            "production_activated":False}


def snapshot(db_path: Path) -> dict:
    try:
        with closing(native._db(db_path)) as db:
            row=db.execute("""SELECT id,created,start_heldout_bpb,
                final_heldout_bpb,steps,state,checkpoint_sha256,
                independently_accepted
                FROM jrei_native_neural_runs
                ORDER BY created DESC,id DESC LIMIT 1""").fetchone()
        if not row:
            return {"state":"NEURAL_NOT_TRAINED",
                    "lifecycle":"NO_TRAINED_MODEL",
                    "external_pretrained_weights_used":False,
                    "checkpoint_integrity_verified_now":False,
                    "model_active":False}
        ident,t,start,final,steps,state,digest,accepted=row
        # SQLite is a registry of training claims, NOT proof that the
        # checkpoint exists, has a valid digest or passed independent QA.
        # Never infer an active conversational model from training loss.
        return {"state":state,"run_id":ident,"trained_at":t,
                "lifecycle":"CANDIDATE_TRAINED_UNREVIEWED"
                    if not accepted else "EVALUATED_NOT_APPROVED",
                "registered_checkpoint_sha256":digest,
                "checkpoint_integrity_verified_now":False,
                "initial_heldout_bits_per_byte":start,
                "final_heldout_bits_per_byte":final,"steps":steps,
                "pretrained_weights_used":False,
                "independent_quality_accepted":bool(accepted),
                "model_active":False}
    except sqlite3.Error:
        return {"state":"NEURAL_STATUS_UNAVAILABLE",
                "model_active":False}
