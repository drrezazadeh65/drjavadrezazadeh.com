"""Source-staged deterministic checks. DO NOT treat as executed CI evidence."""
from __future__ import annotations
import hashlib
import json
import unittest
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError
from jrei_core.envelope import MissionActionState as State
from jrei_orchestrator.mission_policy import (
    MissionControl, MissionStateSnapshot, evaluate_owner_action,
    reconcile_interrupted_work,
)
from jrei_orchestrator.ledger_integrity import (
    MissionLedgerInput, MissionEvent, verify_ledger,
)

NOW = datetime(2026, 10, 26, tzinfo=timezone.utc)
OWNER = "12345678-1234-4234-8234-123456789abc"
MISSION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
ZERO = "0" * 64


def controls(allowed=False, planning=False, stopped=True):
    return MissionControl(
        owner_write_private_enabled=allowed, planning_enabled=planning,
        emergency_stop=stopped, control_revision=1,
    )


def mission(state):
    return MissionStateSnapshot(
        mission_id=MISSION, intent_code="SEO_ROBOTS_DIAGNOSTIC",
        state=state, last_event_sequence=1, expiry=NOW + timedelta(days=3),
    )


def event(prev, seq, code, from_state, to, at=1761436800):
    record = [ "jr.jrei.apex-mission-event.v1", MISSION,
               seq, code, from_state, to, OWNER, prev, at ]
    digest = hashlib.sha256(
        json.dumps(record, ensure_ascii=False, separators=(",", ":")).encode()
    ).hexdigest()
    return dict(
        mission_id=MISSION, seq=seq, event_code=code,
        from_status=from_state, to_status=to,
        actor_account_id=OWNER, previous_sha256=prev,
        event_sha256=digest, occurred_at=at,
    )


class MissionPolicyCases(unittest.TestCase):
    def test_source_defaults_block_new_mission(self):
        value = evaluate_owner_action("PLAN", controls(),
                                      requested_intent="SEO_ROBOTS_DIAGNOSTIC")
        self.assertEqual(value.decision, "DENY")
        self.assertFalse(value.tool_executed)

    def test_approved_plan_is_only_metadata(self):
        value = evaluate_owner_action("PLAN",
                                      controls(True, True, False),
                                      requested_intent="NEWS_INGESTION_DIAGNOSTIC")
        self.assertEqual(value.decision, "ALLOW_PLAN_METADATA_ONLY")
        self.assertFalse(value.owner_permission_created)
        self.assertEqual(value.proposed_state, State.PLANNED)

    def test_unknown_or_free_text_action_denied(self):
        value = evaluate_owner_action("PLAN",
                                      controls(True, True, False),
                                      requested_intent="DROP DATABASE")
        self.assertEqual(value.decision, "DENY")

    def test_cancel_planned_is_not_execution_success(self):
        value = evaluate_owner_action("CANCEL", controls(), mission(State.PLANNED))
        self.assertEqual(value.proposed_state, State.CANCELLED)
        self.assertFalse(value.result_known_by_this_function)

    def test_cancel_running_is_unknown_result(self):
        value = evaluate_owner_action("CANCEL", controls(), mission(State.RUNNING))
        self.assertEqual(value.proposed_state, State.UNKNOWN_RESULT)

    def test_cancel_executed_requires_review(self):
        value = evaluate_owner_action("CANCEL", controls(), mission(State.EXECUTED))
        self.assertEqual(value.proposed_state, State.REQUIRES_REVIEW)

    def test_stop_preserves_actual_state(self):
        value = evaluate_owner_action("EMERGENCY_STOP", controls(),
                                      mission(State.RUNNING))
        self.assertEqual(value.decision, "STOP_NEW_WORK")
        self.assertEqual(value.proposed_state, State.RUNNING)

    def test_expired_worker_lease_cannot_be_assumed_complete(self):
        value = reconcile_interrupted_work(
            mission(State.RUNNING), observation_time=NOW,
            lease_expiry=NOW-timedelta(minutes=5),
        )
        self.assertEqual(value.proposed_state, State.UNKNOWN_RESULT)
        self.assertFalse(value.result_known_by_this_function)

    def test_healthy_lease_not_reconciled(self):
        value = reconcile_interrupted_work(
            mission(State.RUNNING), observation_time=NOW,
            lease_expiry=NOW+timedelta(minutes=5),
        )
        self.assertEqual(value.decision, "DENY")

    def test_chain_matches_php_canonical_initial_record(self):
        first = event(ZERO,1,"MISSION_PLANNED",None,"PLANNED")
        payload = MissionLedgerInput(
            mission_id=MISSION,last_event_seq=1,
            last_event_hash=first["event_sha256"],events=[first],
        )
        got = verify_ledger(payload)
        self.assertEqual(got.verdict, "CONSISTENT_WITH_SUPPLIED_EVENTS")
        self.assertFalse(got.persisted_db_observed)
        self.assertFalse(got.externally_anchored)

    def test_cancelled_chain_consistent(self):
        first=event(ZERO,1,"MISSION_PLANNED",None,"PLANNED")
        second=event(first["event_sha256"],2,"OWNER_CANCELLED",
                     "PLANNED","CANCELLED",1761436801)
        payload=MissionLedgerInput(
            mission_id=MISSION,last_event_seq=2,
            last_event_hash=second["event_sha256"],events=[first,second],
        )
        self.assertEqual(verify_ledger(payload).checked_events,2)

    def test_forged_hash_denied(self):
        first=event(ZERO,1,"MISSION_PLANNED",None,"PLANNED")
        first["event_sha256"]="f"*64
        payload=MissionLedgerInput(
            mission_id=MISSION,last_event_seq=1,
            last_event_hash="f"*64,events=[first],
        )
        self.assertEqual(verify_ledger(payload).reason_code,
                         "EVENT_DIGEST_MISMATCH")

    def test_partial_history_cannot_appear_complete(self):
        first=event(ZERO,1,"MISSION_PLANNED",None,"PLANNED")
        payload=MissionLedgerInput(
            mission_id=MISSION,last_event_seq=2,
            last_event_hash=first["event_sha256"],events=[first],
        )
        self.assertEqual(verify_ledger(payload).reason_code,
                         "INCOMPLETE_OR_PAGINATED_CHAIN")


if __name__ == "__main__":
    unittest.main()
