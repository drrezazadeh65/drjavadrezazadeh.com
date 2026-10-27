"""Future-release deterministic fixtures; intentionally not executed now.

No user PC tasks, GPUs, network, production DB, licensed data or crawl.
"""
from datetime import datetime, timezone
import unittest

from pydantic import ValidationError

from jrei_orchestrator.adaptive_capacity import (
    CapacityPlanRequest, ProposedWork, ResourceNode, propose_capacity_placements,
)


SHA = "a" * 64
MORNING = datetime(2026, 10, 27, 0, 0, tzinfo=timezone.utc)


def node(*, observed_at=MORNING, gpu=False, interactive=False):
    return ResourceNode(
        node_id="node.32gb", observed_at=observed_at, capacity_threads=8,
        running_jobs=0, memory_total_mb=32768,
        memory_available_mb=8192, model_reserved_memory_mb=2048,
        cpu_utilization=0.15, owner_interactive_busy=interactive,
        outbound_https_healthy=True, disk_free_mb=4096,
        gpu_total_memory_mb=8192 if gpu else 0,
        gpu_available_memory_mb=6144 if gpu else 0,
        gpu_reserved_model_mb=2048 if gpu else 0,
        gpu_compute_enabled_by_owner=gpu,
        eligible_work_classes=[
            "LOCAL_EVALUATION", "MODEL_BENCHMARK", "LICENSED_ACQUISITION",
        ],
    )


def job(*, approved=True, rights=True, gpu=False,
        work_id="work.001", execution_class="HEAVY", kind="LOCAL_EVALUATION"):
    return ProposedWork(
        work_id=work_id, task_kind=kind, priority=0.8,
        scientific_utility=0.9, estimated_memory_mb=512,
        estimated_disk_mb=512, estimated_network_bytes=1000,
        owner_scope_digest=SHA, approved_to_schedule=approved,
        execution_class=execution_class, requires_gpu=gpu,
        requested_gpu_memory_mb=2048 if gpu else 0,
        source_id="source.001" if kind == "LICENSED_ACQUISITION" else None,
        source_rights_reviewed=rights, robots_terms_reviewed=rights,
        provider_transport_reviewed=rights,
    )


def plan(*, when=MORNING, approved=True, pending=None, nodes=None, remaining=5000):
    return CapacityPlanRequest(
        policy_version="policy.001", evaluated_at=when,
        max_measurement_age_seconds=300, owner_resource_policy_approved=approved,
        owner_scope_digest=SHA, minimum_idle_memory_mb=512,
        max_concurrent_jobs_per_node=3,
        remaining_authorized_network_bytes=remaining,
        nodes=[node(observed_at=when)] if nodes is None else nodes,
        pending=[job()] if pending is None else pending,
    )


class CapacitySourceContracts(unittest.TestCase):
    def test_24_7_eligibility_and_extra_heavy_priority_not_time_gate(self):
        overnight=propose_capacity_placements(plan(when=MORNING))
        daytime=datetime(2026, 10, 27, 9, 0, tzinfo=timezone.utc)
        during_day=propose_capacity_placements(plan(when=daytime))
        self.assertTrue(overnight.tehran_heavy_priority_window)
        self.assertFalse(during_day.tehran_heavy_priority_window)
        self.assertEqual(overnight.placements[0].status, "PROPOSED")
        self.assertEqual(during_day.placements[0].status, "PROPOSED")
        self.assertGreater(
            overnight.placements[0].ranking_score,
            during_day.placements[0].ranking_score,
        )
        self.assertFalse(during_day.scheduler_enabled_by_this_plan)

    def test_rights_gate_cannot_be_outweighed_by_scoring(self):
        held=propose_capacity_placements(plan(
            pending=[job(kind="LICENSED_ACQUISITION", rights=False)]
        ))
        self.assertEqual(held.placements[0].status, "HELD")
        self.assertIn(
            "SOURCE_RIGHTS_ROBOTS_OR_TRANSPORT_UNREVIEWED",
            held.placements[0].reason_codes,
        )
        self.assertFalse(held.network_requests_issued)

    def test_scope_and_owner_consent_are_strict(self):
        denied=propose_capacity_placements(plan(approved=False))
        self.assertEqual(denied.placements[0].status, "HELD")
        self.assertIn("OWNER_RESOURCE_POLICY_NOT_APPROVED", denied.placements[0].reason_codes)

    def test_gpu_requires_independent_node_attestation(self):
        denied=propose_capacity_placements(plan(pending=[job(gpu=True)]))
        self.assertEqual(denied.placements[0].status, "HELD")
        permitted=propose_capacity_placements(plan(
            nodes=[node(gpu=True)], pending=[job(gpu=True)]
        ))
        self.assertEqual(permitted.placements[0].status, "PROPOSED")
        self.assertFalse(permitted.placements[0].work_executed)

    def test_stale_measurements_and_network_allowance_hold(self):
        stale=propose_capacity_placements(plan(
            nodes=[node(observed_at=datetime(2026, 10, 26, 23, 0, tzinfo=timezone.utc))]
        ))
        self.assertEqual(stale.placements[0].status, "HELD")
        network=propose_capacity_placements(plan(remaining=0))
        self.assertIn(
            "NETWORK_ALLOWANCE_NOT_SUFFICIENT",
            network.placements[0].reason_codes,
        )

    def test_same_node_memory_not_shared_with_other_machines(self):
        other=ResourceNode(
            node_id="node.other", observed_at=MORNING,
            capacity_threads=2, running_jobs=0, memory_total_mb=16384,
            memory_available_mb=256, model_reserved_memory_mb=0,
            cpu_utilization=0.01, owner_interactive_busy=False,
            outbound_https_healthy=True, disk_free_mb=2048,
            eligible_work_classes=["LOCAL_EVALUATION"],
        )
        capacity=propose_capacity_placements(plan(
            nodes=[node(), other],
            pending=[
                job(work_id="work.001"), job(work_id="work.002"),
                job(work_id="work.003"),
            ],
        ))
        self.assertEqual(
            [p.node_id for p in capacity.placements if p.status=="PROPOSED"],
            ["node.32gb", "node.32gb", "node.32gb"],
        )
        self.assertFalse(capacity.autonomous_executions_confirmed)

    def test_invalid_gpu_requirements_are_rejected(self):
        with self.assertRaises(ValidationError):
            ProposedWork(
                work_id="work.001", task_kind="LOCAL_EVALUATION",
                priority=0.6, scientific_utility=0.7,
                estimated_memory_mb=512, estimated_disk_mb=0,
                estimated_network_bytes=0, owner_scope_digest=SHA,
                execution_class="HEAVY", requires_gpu=True,
                requested_gpu_memory_mb=0,
            )


if __name__ == "__main__":
    unittest.main()
