"""JREI-native heterogeneous multi-node capacity planning (50+ target).

Reuses the EXISTING Ed25519-signed node registry and leased task queue hosted
on Bertina. This is a pure, read-only planning library; it DOES NOT create
another controller, open remote ports, change node permissions, dispatch work,
send command payloads, download a model or take an SSH/PowerShell action.

Algorithmic references: locality-aware scheduling, best-fit decreasing,
capacity reservations, bounded fair queues and lease fencing (ideas, not copied
implementations). Python stdlib and original JREI implementation only.

Crucially, the existing production queue already locks per registered node
and allows one outstanding evaluation lease per node. The target of 50+
independently registered machines is therefore an expansion of the same
signed control plane, not 50 workers pretending to be one GPU.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict
from decimal import Decimal, InvalidOperation
import hashlib
import json
import re
from typing import Iterable

SCHEMA = "jr.jrei.native-scalable-fleet.v1"
TARGET = 50  # Planning milestone only; NEVER a registration ceiling.
MAX_PLANNING_ITEMS = 10_000
NODE_UUID = re.compile(r"^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$")
TASK_NAME = re.compile(r"^[A-Z][A-Z0-9_]{2,59}$")
DATA_SHA = re.compile(r"^[a-f0-9]{64}$")
ACCEPTED_PROCESS = frozenset(("RESPONDING","UNAVAILABLE"))
MAX_TASK_SECONDS = 900  # Existing hybrid worker maximum lease age.


@dataclass(frozen=True)
class Capability:
    """Voluntary signed-node resource hints, never verified hardware truth."""
    node_id: str
    state: str
    fresh_signed_observation: bool
    cpu_threads: int
    free_ram_mb: int
    total_ram_mb: int
    gpu_vram_mb: int
    gpu_free_mb: int
    gpu_kind: str
    max_parallel: int
    busy: int
    source_digests: tuple[str, ...]
    capabilities: tuple[str, ...]
    observed_at: int
    tainted: bool = False
    gpu_compute_backend: str = "UNMEASURED"  # Signed NODE CLAIM, not host attestation


@dataclass(frozen=True)
class Demand:
    job_id: str
    task_type: str
    cpu_threads: int
    min_ram_mb: int
    min_vram_mb: int
    evidence_sha256: str
    deadline_seconds: int
    priority: int
    owner_authorized: bool
    network_writes: bool = False
    requires_model_weights: bool = False
    gpu_compute_backend: str = "CPU"


def _nonneg(value, maximum: int, name: str) -> int:
    if type(value) is not int or not 0 <= value <= maximum:
        raise ValueError("JREI_FLEET_INVALID_" + name)
    return value


def _uuid(s: str) -> str:
    if not isinstance(s, str) or not NODE_UUID.fullmatch(s):
        raise ValueError("JREI_FLEET_INVALID_NODE_ID")
    return s


def parse_signed_report(raw: dict, *, validated_by_gateway: bool) -> Capability:
    """Normalize ONLY an already Ed25519-accepted server report.

    This parameter must be a literal result of the EXISTING server's
    authentication and nonce verification. Local self-attestation cannot
    set validated_by_gateway. This library never authenticates raw messages.
    """
    if validated_by_gateway is not True:
        raise ValueError("JREI_FLEET_SIGNED_GATEWAY_REQUIRED")
    if not isinstance(raw,dict) or raw.get("schema")!=SCHEMA:
        raise ValueError("JREI_FLEET_CAPABILITY_SCHEMA_INVALID")
    node=_uuid(raw.get("node_id"))
    status=raw.get("state")
    if status not in ("ENABLED","DISABLED","REVOKED"):
        raise ValueError("JREI_FLEET_NODE_STATE_INVALID")
    if raw.get("python_process") not in ACCEPTED_PROCESS:
        raise ValueError("JREI_FLEET_PYTHON_OBSERVATION_INVALID")
    cap=raw.get("capabilities")
    if (not isinstance(cap,list) or len(cap)>20 or
            any(not isinstance(x,str) or not TASK_NAME.fullmatch(x) for x in cap)
            or len(set(cap))!=len(cap)):
        raise ValueError("JREI_FLEET_CAPABILITIES_INVALID")
    hashes=raw.get("approved_source_hashes")
    if (not isinstance(hashes,list) or len(hashes)>15 or
            any(not isinstance(s,str) or not DATA_SHA.fullmatch(s) for s in hashes)
            or len(set(hashes))!=len(hashes)):
        raise ValueError("JREI_FLEET_DATASET_MANIFEST_INVALID")
    gpu=raw.get("gpu_kind")
    if gpu not in ("NONE","NVIDIA","AMD","INTEL","OTHER"):
        raise ValueError("JREI_FLEET_GPU_KIND_INVALID")
    backend=raw.get("gpu_compute_backend", "UNMEASURED")
    if backend not in ("UNMEASURED", "CUDA", "DIRECTML"):
        raise ValueError("JREI_FLEET_GPU_RUNTIME_UNRECOGNISED")
    if (gpu=="NONE" and backend!="UNMEASURED"
            or backend=="CUDA" and gpu!="NVIDIA"):
        raise ValueError("JREI_FLEET_GPU_RUNTIME_INCONSISTENT")
    observed=_nonneg(raw.get("observed_at"),2**42,"TIMESTAMP")
    slots=_nonneg(raw.get("max_parallel"),128,"PARALLEL_SLOTS")
    used=_nonneg(raw.get("busy"),128,"BUSY_SLOTS")
    if used>slots:
        raise ValueError("JREI_FLEET_BUSY_OVER_CAPACITY")
    ram=_nonneg(raw.get("total_ram_mb"),1048576,"RAM_TOTAL")
    free=_nonneg(raw.get("free_ram_mb"),1048576,"RAM_FREE")
    vram=_nonneg(raw.get("gpu_vram_mb"),1048576,"VRAM_TOTAL")
    gpu_free=_nonneg(raw.get("gpu_free_mb"),1048576,"VRAM_FREE")
    if free>ram or gpu_free>vram or (gpu=="NONE" and vram):
        raise ValueError("JREI_FLEET_CAPACITY_INCONSISTENT")
    return Capability(
        node_id=node,state=status,
        fresh_signed_observation=raw.get("fresh_signed_observation") is True,
        cpu_threads=_nonneg(raw.get("cpu_threads"),2048,"CPU_THREADS"),
        free_ram_mb=free,total_ram_mb=ram,
        gpu_vram_mb=vram,gpu_free_mb=gpu_free,
        gpu_kind=gpu,max_parallel=slots,busy=used,
        source_digests=tuple(hashes),capabilities=tuple(cap),
        observed_at=observed,tainted=raw.get("tainted") is True,
        gpu_compute_backend=backend)


def demand(raw: dict) -> Demand:
    if not isinstance(raw,dict):
        raise ValueError("JREI_FLEET_JOB_INVALID")
    task=raw.get("task_type")
    if not isinstance(task,str) or not TASK_NAME.fullmatch(task):
        raise ValueError("JREI_FLEET_JOB_TYPE_INVALID")
    doc=raw.get("evidence_sha256")
    if not isinstance(doc,str) or not DATA_SHA.fullmatch(doc):
        raise ValueError("JREI_FLEET_JOB_DATASET_ID_REQUIRED")
    job=raw.get("job_id")
    if not isinstance(job,str) or not NODE_UUID.fullmatch(job):
        raise ValueError("JREI_FLEET_JOB_UUID_REQUIRED")
    if raw.get("owner_authorized") is not True:
        raise ValueError("JREI_FLEET_JOB_OWNER_AUTH_REQUIRED")
    if raw.get("network_writes") is not False:
        raise ValueError("JREI_FLEET_NO_NETWORK_WRITE_DELEGATION")
    gpu_backend=raw.get("gpu_compute_backend", "CPU")
    requested_vram=_nonneg(raw.get("min_vram_mb"),1048576,"TASK_VRAM")
    if gpu_backend not in ("CPU","CUDA","DIRECTML"):
        raise ValueError("JREI_FLEET_JOB_GPU_BACKEND_INVALID")
    # Raw VRAM claims do not prove the presence of a usable GPU compute
    # library or driver. Any GPU job must name the required runtime.
    if (requested_vram>0 and gpu_backend=="CPU"
            or requested_vram==0 and gpu_backend!="CPU"):
        raise ValueError("JREI_FLEET_JOB_GPU_BACKEND_NOT_SPECIFIED")
    return Demand(
        job_id=job, task_type=task,
        cpu_threads=_nonneg(raw.get("cpu_threads"),2048,"TASK_CPU"),
        min_ram_mb=_nonneg(raw.get("min_ram_mb"),1048576,"TASK_RAM"),
        min_vram_mb=requested_vram,
        evidence_sha256=doc,
        deadline_seconds=_nonneg(raw.get("deadline_seconds"),MAX_TASK_SECONDS,"TASK_TIME"),
        priority=_nonneg(raw.get("priority"),100,"TASK_PRIORITY"),
        owner_authorized=True,network_writes=False,
        requires_model_weights=raw.get("requires_model_weights") is True,
        gpu_compute_backend=gpu_backend)


def _eligible(node: Capability, job: Demand, *, now: int):
    if (node.state!="ENABLED" or not node.fresh_signed_observation or
            node.tainted or node.observed_at>now+5 or now-node.observed_at>90):
        return False,"NOT_TRUSTED_AND_FRESH"
    if job.task_type not in node.capabilities:
        return False,"TASK_UNAVAILABLE"
    if job.evidence_sha256 not in node.source_digests:
        return False,"SOURCE_NOT_LOCALLY_APPROVED"
    if job.deadline_seconds<1 or job.deadline_seconds>MAX_TASK_SECONDS:
        return False,"LEASE_AGE_INVALID"
    if node.max_parallel-node.busy<1:
        return False,"NO_FREE_SLOT"
    if (node.cpu_threads<job.cpu_threads or
            node.free_ram_mb<job.min_ram_mb*1.25):
        return False,"COMPUTE_HEADROOM_LOW"
    if job.min_vram_mb:
        # The signed report provides an unverified hardware hint, not a
        # server-side GPU benchmark. Missing/mismatched backend must HOLD.
        if (job.gpu_compute_backend not in ("CUDA","DIRECTML")
                or node.gpu_compute_backend!=job.gpu_compute_backend):
            return False,"GPU_RUNTIME_NOT_ATTESTED_COMPATIBLE"
        if (node.gpu_kind=="NONE" or
                node.gpu_free_mb<job.min_vram_mb*1.20):
            return False,"GPU_HEADROOM_LOW"
    # A model-dependent task requires a second authorization tied to a
    # JREI-trained, independently evaluated checkpoint, not generic GPU.
    if job.requires_model_weights:
        return False,"JREI_NATIVE_MODEL_APPROVAL_NOT_PROVEN"
    return True,"ELIGIBLE"


def suggest(nodes: Iterable[Capability], jobs: Iterable[Demand], *,
            now: int, max_suggestions: int=1000) -> dict:
    """Deterministic owner-preview only; does NOT create a live assignment.

    The existing server's transaction and lease fencing, not this local
    planner, remain the only authority to assign signed work. A suggestion
    merely helps size 50, 100 or more nodes without silently opening a new
    task execution pathway.
    """
    _nonneg(now,2**42,"NOW")
    limit=_nonneg(max_suggestions,MAX_PLANNING_ITEMS,"MAX_PREVIEWS")
    computers=list(nodes)
    tasks=list(jobs)
    if len(computers)>MAX_PLANNING_ITEMS or len(tasks)>MAX_PLANNING_ITEMS:
        raise ValueError("JREI_FLEET_PLANNING_SET_TOO_LARGE")
    if any(not isinstance(x,Capability) for x in computers) or len(
            {x.node_id for x in computers})!=len(computers):
        raise ValueError("JREI_FLEET_DUPLICATE_OR_INVALID_NODES")
    if any(not isinstance(x,Demand) for x in tasks) or len(
            {x.job_id for x in tasks})!=len(tasks):
        raise ValueError("JREI_FLEET_DUPLICATE_OR_INVALID_JOBS")
    live={node.node_id:node for node in computers}
    # The CURRENT Bertina leasing contract permits at most ONE active job
    # per signed node, even if future hardware has many CPU cores or GPUs.
    # Do not promise 50 concurrent GPU jobs on only two attached PCs.
    slots={x.node_id:min(1,max(0,x.max_parallel-x.busy)) for x in computers}
    ram={x.node_id:x.free_ram_mb for x in computers}
    vram={x.node_id:x.gpu_free_mb for x in computers}
    assignments=[]
    held=[]
    for job in sorted(tasks,key=lambda x:(-x.priority,-x.min_vram_mb,
                                           -x.min_ram_mb,x.job_id)):
        if len(assignments)>=limit:
            held.append({"job_id":job.job_id,"reason":"PLAN_PREVIEW_LIMIT"})
            continue
        candidates=[]
        for node in computers:
            eligible,why=_eligible(node,job,now=now)
            if not eligible or not slots[node.node_id]:
                continue
            if ram[node.node_id]<job.min_ram_mb*1.25 or (
                    job.min_vram_mb and vram[node.node_id]<job.min_vram_mb*1.20):
                continue
            # Smallest sufficient free memory reduces resource fragmentation;
            # source affinity and existing signed job eligibility come first.
            waste=(ram[node.node_id]-job.min_ram_mb,
                   vram[node.node_id]-job.min_vram_mb)
            candidates.append((waste,node.node_id))
        if not candidates:
            held.append({"job_id":job.job_id,
                         "reason":"NO_SIGNED_APPROVED_MATCHING_NODE"})
            continue
        _,selected=min(candidates)
        slots[selected]-=1
        ram[selected]-=job.min_ram_mb
        vram[selected]-=job.min_vram_mb
        assignments.append({
            "job_id":job.job_id,"candidate_node_id":selected,
            "task_type":job.task_type,
            "execution":"NOT_DISPATCHED_PREVIEW_ONLY"})
    fresh=sum(1 for x in computers if
              x.state=="ENABLED" and x.fresh_signed_observation and
              not x.tainted and 0<=now-x.observed_at<=90)
    return {
        "schema":SCHEMA,"registered_node_records":len(computers),
        "enabled_fresh_node_reports":fresh,
        "target_50_shortfall":max(0,TARGET-fresh),
        "target_50_is_not_hard_limit":True,
        "existing_lease_concurrency_per_signed_node":1,
        "suggested_job_placements":assignments,
        "jobs_unplaced":held,
        "live_dispatch_authority":"EXISTING_SIGNED_ED25519_SERVER_QUEUE_ONLY",
        "execution_performed":False,
        "neural_training_distributed":False,
        "gpu_runtime_compatibility_is_signed_node_report_only":True,
        "gpu_runtime_requires_explicit_job_backend":True,
        "gpu_memory_pooled":False,
        "source_code_reviewed_or_tested_by_this_plan":False,
    }


def architecture_status() -> dict:
    """Design target only, with NO invented live hardware counts."""
    return {
        "schema":SCHEMA,
        "registered_target":TARGET,
        "fixed_registered_node_ceiling":None,
        "node_identity":"EXISTING_SIGNED_ED25519_UUID_REGISTRY",
        "queue":"EXISTING_BERTINA_LEASES_PER_SIGNED_NODE",
        "resource_planning":"CPU_RAM_GPU_HEADROOM_DATA_AFFINITY",
        "node_autonomous_execution":"DISABLED_FOR_UNREVIEWED_TASKS",
        "node_registration_or_provisioning_performed":False,
        "50_nodes_actually_connected":False,
        "distributed_training_enabled":False,
        "hardware_gpu_acceleration_verified":False,
        "future_gpu_jobs_require_signed_local_runtime_hint":True,
        "no_cross_node_gpu_memory_pooling":True,
        "site_deployment_performed":False,
    }
