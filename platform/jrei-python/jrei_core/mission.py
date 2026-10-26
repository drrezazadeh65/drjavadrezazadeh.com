"""Non-executing Python mission planner compatible with JS scoped-mission.v1 kinds.

No task state, authenticated permission, or verified completion is inferred
from a valid dependency graph. Actual owner command execution must use the
pre-existing PHP mother-DB audit and authorization pipeline.
"""
from __future__ import annotations
from jrei_core.contracts import MissionProposal, MissionRequest, MissionStep


class MissionDependencyError(ValueError):
    pass


def propose_mission(request: MissionRequest) -> MissionProposal:
    nodes = {node.id: node for node in request.nodes}
    ordered: list[str] = []
    active: set[str] = set()
    visited: set[str] = set()

    def walk(node_id: str) -> None:
        if node_id not in nodes:
            raise MissionDependencyError("DEPENDENCY_MISSING")
        if node_id in active:
            raise MissionDependencyError("MISSION_DEPENDENCY_CYCLE")
        if node_id in visited:
            return
        active.add(node_id)
        node = nodes[node_id]
        for prior in node.after:
            if prior == node_id:
                raise MissionDependencyError("SELF_DEPENDENCY")
            walk(prior)
        active.remove(node_id)
        visited.add(node_id)
        ordered.append(node_id)

    for item in request.nodes:
        walk(item.id)
    return MissionProposal(
        mission_id=request.mission_id,
        policy_digest=request.policy_digest,
        graph=[
            MissionStep(id=node_id, kind=nodes[node_id].kind, after=nodes[node_id].after)
            for node_id in ordered
        ],
    )
