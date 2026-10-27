"""24/7 capacity-aware JREI task *placement proposals*, never task execution.

02:00–05:00 Asia/Tehran increases the priority of heavier permissible jobs
but is NOT the only time JREI may work. No arbitrary daily crawl quota.
Explicit owner-granted resource/bandwidth/rights policies and measured host
headroom are hard constraints. Missing measurements fail closed.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract, Unit


class ResourceNode(StrictContract):
    node_id: Identifier
    observed_at: datetime
    capacity_threads: int = Field(ge=1, le=256)
    running_jobs: int = Field(ge=0, le=256)
    memory_total_mb: int = Field(ge=512, le=4_194_304)
    memory_available_mb: int = Field(ge=0, le=4_194_304)
    cpu_utilization: Unit
    owner_interactive_busy: bool
    outbound_https_healthy: bool
    model_reserved_memory_mb: int = Field(ge=0, le=4_194_304)
    disk_free_mb: int = Field(ge=0, le=2_147_483_647)
    # Zero means no available accelerator; never infer GPU presence from
    # a Windows driver name or from a separate machine's VRAM.
    gpu_total_memory_mb: int = Field(default=0, ge=0, le=1_048_576)
    gpu_available_memory_mb: int = Field(default=0, ge=0, le=1_048_576)
    gpu_reserved_model_mb: int = Field(default=0, ge=0, le=1_048_576)
    gpu_compute_enabled_by_owner: bool = False
    eligible_work_classes: list[Literal[
        "PUBLIC_DISCOVERY", "LICENSED_ACQUISITION", "EVIDENCE_EXTRACTION",
        "LOCAL_EVALUATION", "RETRIEVAL_INDEXING", "MODEL_BENCHMARK",
    ]] = Field(min_length=1, max_length=6)

    @model_validator(mode="after")
    def physical_bounds(self) -> "ResourceNode":
        if self.observed_at.utcoffset() is None:
            raise ValueError("NODE_OBSERVATION_TIMEZONE_REQUIRED")
        if self.memory_available_mb + self.model_reserved_memory_mb > self.memory_total_mb:
            raise ValueError("RESOURCE_MEMORY_TOTAL_INCONSISTENT")
        if (self.gpu_available_memory_mb + self.gpu_reserved_model_mb >
                self.gpu_total_memory_mb):
            raise ValueError("RESOURCE_GPU_MEMORY_TOTAL_INCONSISTENT")
        if len(set(self.eligible_work_classes)) != len(self.eligible_work_classes):
            raise ValueError("DUPLICATE_NODE_WORK_CLASS")
        return self


class ProposedWork(StrictContract):
    work_id: Identifier
    task_kind: Literal[
        "PUBLIC_DISCOVERY", "LICENSED_ACQUISITION", "EVIDENCE_EXTRACTION",
        "LOCAL_EVALUATION", "RETRIEVAL_INDEXING", "MODEL_BENCHMARK",
    ]
    priority: Unit
    scientific_utility: Unit
    estimated_memory_mb: int = Field(ge=64, le=524_288)
    estimated_disk_mb: int = Field(ge=0, le=1_048_576)
    estimated_network_bytes: int = Field(ge=0, le=1_099_511_627_776)
    source_id: Identifier | None = None
    source_rights_reviewed: bool = False
    robots_terms_reviewed: bool = False
    provider_transport_reviewed: bool = False
    approved_to_schedule: bool = False
    owner_scope_digest: Digest
    execution_class: Literal["BACKGROUND", "INTERACTIVE_SENSITIVE", "HEAVY"]
    requires_gpu: bool = False
    requested_gpu_memory_mb: int = Field(default=0, ge=0, le=1_048_576)

    @model_validator(mode="after")
    def license_source_link(self) -> "ProposedWork":
        if self.requires_gpu and self.requested_gpu_memory_mb == 0:
            raise ValueError("GPU_TASK_NEEDS_MEASURED_GPU_REQUIREMENT")
        if not self.requires_gpu and self.requested_gpu_memory_mb != 0:
            raise ValueError("GPU_MEMORY_REQUEST_WITHOUT_ACCELERATOR")
        if self.task_kind in ("PUBLIC_DISCOVERY", "LICENSED_ACQUISITION", "EVIDENCE_EXTRACTION") and not self.source_id:
            raise ValueError("SOURCE_WORK_REQUIRES_REVIEWABLE_SOURCE_ID")
        if self.task_kind in ("PUBLIC_DISCOVERY", "LICENSED_ACQUISITION") and self.estimated_network_bytes == 0:
            # Outbound collection cannot bypass an owner-approved transfer
            # allowance by advertising that a network request costs zero.
            raise ValueError("NETWORK_COLLECTION_REQUIRES_NONZERO_TRANSFER_ESTIMATE")
        return self


class CapacityPlanRequest(StrictContract):
    schema_version: Literal["jr.jrei.adaptive-placement.v1"] = "jr.jrei.adaptive-placement.v1"
    policy_version: Identifier
    evaluated_at: datetime
    max_measurement_age_seconds: int = Field(ge=5, le=300)
    owner_resource_policy_approved: bool = False
    owner_scope_digest: Digest
    minimum_idle_memory_mb: int = Field(ge=256, le=524_288)
    maximum_cpu_utilization: Unit = 0.80
    max_concurrent_jobs_per_node: int = Field(ge=1, le=256)
    # Exactly the current, externally measured remaining allowance. No
    # hardcoded daily transfer limit; 0 only blocks jobs with network costs.
    remaining_authorized_network_bytes: int = Field(ge=0, le=1_099_511_627_776)
    nodes: list[ResourceNode] = Field(max_length=25)
    pending: list[ProposedWork] = Field(max_length=400)

    @model_validator(mode="after")
    def unique_and_aware(self) -> "CapacityPlanRequest":
        if self.evaluated_at.utcoffset() is None:
            raise ValueError("PLAN_EVALUATION_TIMEZONE_REQUIRED")
        if len({n.node_id for n in self.nodes}) != len(self.nodes):
            raise ValueError("DUPLICATE_NODE")
        if len({w.work_id for w in self.pending}) != len(self.pending):
            raise ValueError("DUPLICATE_PENDING_WORK")
        return self


class WorkPlacement(StrictContract):
    work_id: Identifier
    status: Literal["PROPOSED", "HELD"]
    node_id: Identifier | None = None
    reason_codes: list[str] = Field(min_length=1, max_length=24)
    ranking_score: float
    # An assigned node is only a candidate; it is never proof of a job lease.
    lease_granted: Literal[False] = False
    work_executed: Literal[False] = False


class CapacityPlan(StrictContract):
    schema_version: Literal["jr.jrei.adaptive-placement-result.v1"] = (
        "jr.jrei.adaptive-placement-result.v1"
    )
    policy_version: Identifier
    request_sha256: Digest
    tehran_heavy_priority_window: bool
    continuous_background_eligible: Literal[True] = True
    placements: list[WorkPlacement]
    authorized_network_bytes_uncommitted: int = Field(ge=0)
    resource_measurements_independently_verified: Literal[False] = False
    scheduler_enabled_by_this_plan: Literal[False] = False
    network_requests_issued: Literal[False] = False
    autonomous_executions_confirmed: Literal[False] = False


def propose_capacity_placements(request: CapacityPlanRequest) -> CapacityPlan:
    try:
        clock = ZoneInfo("Asia/Tehran")
    except ZoneInfoNotFoundError:
        # Windows often lacks system IANA tzdb. Iran has used permanent UTC
        # +03:30 since the 2022 DST abolition; refuse historical dates where
        # a fixed offset would misrepresent the requested local work window.
        if request.evaluated_at.year < 2023:
            raise ValueError("ASIA_TEHRAN_TIMEZONE_DATA_REQUIRED")
        clock = timezone(timedelta(hours=3, minutes=30))
    tehran_hour = request.evaluated_at.astimezone(clock).hour
    heavy_window = 2 <= tehran_hour < 5
    remaining = request.remaining_authorized_network_bytes
    allocations: dict[str, dict[str, int]] = {
        n.node_id: {"jobs": n.running_jobs, "memory": 0, "disk": 0, "gpu": 0}
        for n in request.nodes
    }
    nodes = {n.node_id: n for n in request.nodes}

    def score(job: ProposedWork) -> float:
        weighting = 1.20 if heavy_window and job.execution_class == "HEAVY" else 1.0
        # Priority is relative to the current batch, NEVER a time-of-day gate.
        return round((0.65 * job.priority + 0.35 * job.scientific_utility)
                     * weighting, 6)

    placements: list[WorkPlacement] = []
    for work in sorted(request.pending, key=lambda x: (-score(x), x.work_id)):
        reasons: list[str] = []
        if not request.owner_resource_policy_approved:
            reasons.append("OWNER_RESOURCE_POLICY_NOT_APPROVED")
        if work.owner_scope_digest != request.owner_scope_digest:
            reasons.append("OWNER_WORK_SCOPE_MISMATCH")
        if not work.approved_to_schedule:
            reasons.append("WORK_SCHEDULING_NOT_AUTHORIZED")
        if work.task_kind in ("PUBLIC_DISCOVERY", "LICENSED_ACQUISITION", "EVIDENCE_EXTRACTION"):
            if not (work.source_rights_reviewed and work.robots_terms_reviewed
                    and work.provider_transport_reviewed):
                reasons.append("SOURCE_RIGHTS_ROBOTS_OR_TRANSPORT_UNREVIEWED")
        if work.estimated_network_bytes > remaining:
            reasons.append("NETWORK_ALLOWANCE_NOT_SUFFICIENT")

        ranked_nodes: list[tuple[float, str]] = []
        for node_id, node in nodes.items():
            allotted = allocations[node_id]
            if not node.outbound_https_healthy:
                continue
            age = (request.evaluated_at - node.observed_at).total_seconds()
            if age < -5 or age > request.max_measurement_age_seconds:
                continue
            if work.task_kind not in node.eligible_work_classes:
                continue
            if node.owner_interactive_busy and work.execution_class != "BACKGROUND":
                continue
            if node.cpu_utilization > request.maximum_cpu_utilization:
                continue
            if allotted["jobs"] >= min(node.capacity_threads, request.max_concurrent_jobs_per_node):
                continue
            available = node.memory_available_mb - allotted["memory"]
            if available - work.estimated_memory_mb < request.minimum_idle_memory_mb:
                continue
            if node.disk_free_mb - allotted["disk"] < work.estimated_disk_mb:
                continue
            if work.requires_gpu:
                if not node.gpu_compute_enabled_by_owner:
                    continue
                remaining_gpu = (
                    node.gpu_available_memory_mb - allotted["gpu"]
                )
                if remaining_gpu < work.requested_gpu_memory_mb:
                    continue
            # Lowest active load, most unused memory. Never mix RAM of nodes.
            load = allotted["jobs"] / node.capacity_threads
            ranked_nodes.append((load - available / max(node.memory_total_mb, 1), node_id))
        if not ranked_nodes:
            reasons.append("NO_FRESH_ELIGIBLE_NODE_WITH_SAFE_RESOURCE_HEADROOM")

        if reasons:
            placements.append(WorkPlacement(
                work_id=work.work_id, status="HELD",
                reason_codes=sorted(set(reasons)), ranking_score=score(work),
            ))
            continue
        _, chosen = min(ranked_nodes)
        allocations[chosen]["jobs"] += 1
        allocations[chosen]["memory"] += work.estimated_memory_mb
        allocations[chosen]["disk"] += work.estimated_disk_mb
        allocations[chosen]["gpu"] += work.requested_gpu_memory_mb
        remaining -= work.estimated_network_bytes
        placements.append(WorkPlacement(
            work_id=work.work_id, status="PROPOSED", node_id=chosen,
            reason_codes=["BOUNDED_PLACEMENT_PROPOSAL_NOT_WORKER_LEASE"],
            ranking_score=score(work),
        ))

    canonical = json.dumps(request.model_dump(mode="json"), sort_keys=True,
                           ensure_ascii=False, separators=(",", ":"))
    return CapacityPlan(
        policy_version=request.policy_version,
        request_sha256=hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
        tehran_heavy_priority_window=heavy_window,
        placements=placements,
        authorized_network_bytes_uncommitted=remaining,
    )
