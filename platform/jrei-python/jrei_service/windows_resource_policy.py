"""JREI adaptive admission policy for the EXISTING two Windows PCs.

This is a job-priority DECISION LAYER on top of the original JREI Win32
sensor and windows_resource_envelope. No duplicate sensor, database, task
service or shell execution. Each PC is independently measured at runtime;
owner-reported 16/32GB RAM and 8GB GPU are planning context, not asserted
live measurements. Expansion uses the original signed node/leased queue.

A program cannot safely "use 100%" of its memory/GPU while the user runs a
heavy game. Prioritize foreground performance and increase background load
only while measured Windows load, memory and user-idle permit it.
"""
from __future__ import annotations

import os
import threading
import time
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from jrei_service import windows_resource_envelope as sensor

SCHEMA="jr.jrei.windows-adaptive-resources.v1"
_MIN_DISK_GB=8
_CACHE_SECONDS=12
_MUTEX=threading.RLock()
_CACHED={"time":0.0,"value":None}


def _plan():
    measured=sensor.observe(gpu_probe=False)
    values=measured["resources"]
    total=values.get("physical_ram_mb")
    available=values.get("free_ram_mb")
    cores=values.get("cpu_logical_cores")
    cpu=values.get("cpu_fraction")
    disk=values.get("free_disk_gb")
    idle=measured.get("owner_idle_seconds")
    generic={
        "schema":SCHEMA,"current_node_only":True,
        "current_nodes_assumed_connected":0,
        "gpu_vram_pooled":False,
        "gpu_compute_compatible_proven":False,
        "owner_reports_8gb_graphics_not_measured":True,
        "profile":"UNMEASURED","permitted_work":["STATUS","EVIDENCE_LOOKUP"],
        "safe_cpu_process_threads":1,"cpu_only_background_slots":0,
        "memory_reserved_for_windows_mb":None,
        "cpu_load_fraction":cpu,"total_ram_mb":total,
        "available_ram_mb":available,"disk_free_gb":disk,
        "owner_idle_seconds":idle,"reason":"RESOURCE_SENSOR_NOT_READY",
    }
    if (not isinstance(total,int) or not isinstance(available,int)
            or not isinstance(cores,int) or not isinstance(cpu,(int,float))
            or not isinstance(disk,(int,float))
            or not isinstance(idle,(int,float))):
        return generic
    profile=("NODE_32GB_HEAVY" if total>=24576 else
             "NODE_16GB_LIGHT" if total>=12288 else "NODE_LOW_RAM")
    reserve=max(int(total*0.40),
                8192 if profile=="NODE_32GB_HEAVY" else
                5632 if profile=="NODE_16GB_LIGHT" else
                int(total*0.60))
    generic.update(profile=profile,
                   safe_cpu_process_threads=max(1,min(4,cores//2)),
                   memory_reserved_for_windows_mb=reserve)
    if available<reserve or disk<_MIN_DISK_GB or cpu>=.72:
        generic["reason"]="CAPACITY_GUARD_BLOCKED"
        return generic
    # Cheap first-party AST inspection can proceed during foreground use,
    # provided measured RAM/disk/CPU guards are satisfied. Heavy model
    # training, patch synthesis and indexing still require owner idle.
    generic["permitted_work"].append("SELF_STATIC_REVIEW")
    generic["cpu_only_background_slots"]=1
    if idle<180:
        generic["reason"]="OWNER_FOREGROUND_STATIC_ONLY"
        return generic
    generic["permitted_work"]+=["APPROVED_NETWORK_STUDY",
                                "FTS_REBUILD","MEMORY_CURATION"]
    generic["reason"]="LIGHT_BACKGROUND_ELIGIBLE"
    if (idle>=420 and profile=="NODE_32GB_HEAVY"
            and available>=max(reserve,12288) and cpu<.45):
        generic["permitted_work"]+=["NATIVE_STATISTICAL_TRAIN",
                                    "NATIVE_NEURAL_TRAIN_CPU"]
        generic["reason"]="HEAVY_BACKGROUND_ELIGIBLE"
    elif (idle>=420 and profile=="NODE_16GB_LIGHT"
            and available>=max(reserve,6144) and cpu<.35):
        generic["permitted_work"].append("NATIVE_STATISTICAL_TRAIN")
        generic["reason"]="LIGHT_TRAIN_ELIGIBLE"
    return generic


def snapshot(*,fresh=False) -> dict:
    with _MUTEX:
        now=time.monotonic()
        if (not fresh and _CACHED["value"] is not None
                and now-_CACHED["time"]<_CACHE_SECONDS):
            return dict(_CACHED["value"])
        data=_plan()
        _CACHED["value"]=data
        _CACHED["time"]=time.monotonic()
        return dict(data)


def permits(kind: str, *,fresh=False) -> bool:
    return isinstance(kind,str) and kind in snapshot(fresh=fresh)["permitted_work"]


def slots_for(kind: str) -> int:
    plan=snapshot()
    return plan["cpu_only_background_slots"] if permits(kind) else 0


def tehran_study_window() -> dict:
    """Return the 02:00–05:00 Tehran PRIORITY window, never authority.

    Windows Python may lack an installed IANA timezone database; use a clearly
    labelled UTC+03:30 fallback for the owner's current 2026 Iran time rule.
    If Iran's civil timezone legislation changes, a later source update is
    required. This clock alone never permits crawling or heavy model training.
    """
    now = datetime.now(timezone.utc)
    try:
        local = now.astimezone(ZoneInfo("Asia/Tehran"))
        clock_source = "IANA_ASIA_TEHRAN"
    except ZoneInfoNotFoundError:
        local = now.astimezone(timezone(timedelta(hours=3, minutes=30)))
        clock_source = "IRAN_FIXED_UTC_PLUS_0330_FALLBACK"
    active = 2 <= local.hour < 5
    return {
        "schema": "jr.jrei.tehran-study-window.v1",
        "priority_active": active,
        "local_hour": local.hour,
        "clock_source": clock_source,
        "priority_only": True,
        "robots_and_rights_still_required": True,
        "resource_admission_still_required": True,
        "no_network_or_training_permission_granted": True,
    }


def continuous_probe_delay(kind: str, state: str,
                           *, resource_available: bool = True) -> float:
    """Adaptive *backpressure*, never a time window or daily work quota.

    The original Windows service keeps learning continuously after startup.
    A short sleep avoids CPU/database/network busy-spinning when no eligible
    owner-approved work exists. Every lane is reconsidered indefinitely.
    Resource pressure and rate/robots/refresh deadlines may defer one action;
    they do not stop the service or disable the other learning lanes.
    """
    if kind not in ("APPROVED_SOURCE", "FTS_INDEX", "SOURCE_MEMORY",
                    "AUTO_TOPICS", "LEARNING_AGENDA", "CURRICULUM",
                    "CODE_STUDY"):
        raise ValueError("JREI_CONTINUOUS_LEARNING_LANE_INVALID")
    state = str(state or "")[:90]
    if not resource_available or (
            state.startswith(("DEFER_", "HELD_RESOURCES",
                              "CAPACITY_", "OWNER_FOREGROUND"))):
        return 30.0
    if any(code in state for code in (
            "INDEXED", "REBUILT", "CANDIDATE_UNVERIFIED",
            "DRAFT_UNVERIFIED", "PROPOSED_NOT_VERIFIED",
            "STUDY_DRAFT_UNVERIFIED")):
        return 2.5
    if state.startswith(("OFF_NETWORK", "OWNER_DISABLED",
                         "NO_APPROVED", "NO_GROUNDED",
                         "NO_ACTIVE", "MODEL_UNAVAILABLE",
                         "NO_STUDY", "NO_DUE", "NO_PENDING")):
        return 30.0
    if state.startswith(("HELD", "LOOP_ERROR", "FAILED")):
        return 60.0
    return 12.0


def study_interval_seconds(kind: str) -> int:
    """Adaptive scheduling cadence, not a daily cap or execution entitlement."""
    normal = {
        "LEARNING_AGENDA": 500,
        "SOURCE_MEMORY": 720,
        "AUTO_TOPICS": 900,
        "FTS_INDEX": 2700,
    }
    high_priority = {
        "LEARNING_AGENDA": 300,
        "SOURCE_MEMORY": 450,
        "AUTO_TOPICS": 540,
        "FTS_INDEX": 1800,
    }
    if kind not in normal:
        raise ValueError("JREI_STUDY_PRIORITY_KIND_INVALID")
    return (high_priority if tehran_study_window()["priority_active"]
            else normal)[kind]
