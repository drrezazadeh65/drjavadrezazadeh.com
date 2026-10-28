"""Adaptive resource and owner-foreground policy for existing JREI Windows PCs.

Targets owner's CURRENT two PCs: one ~16 GiB RAM, one ~32 GiB RAM, each
owner-described 8 GiB VRAM. Those descriptions are NOT measured capacity.
Every decision uses actual Win32 RAM, CPU and foreground input observations.
No shell commands, no extra applications, no network requests, no install,
no independent scheduler and no assumption that graphics cards form a pool.

CPU/GPU coordination is *per node*. More PCs attach using the ORIGINAL
outbound Ed25519-signed JREI worker and server-leased queue. Never dispatch
an unsandboxed shell command, training data or raw documents to new PCs.

Based on open resource-management concepts (admission control, backpressure,
headroom hysteresis, latency sensitive foreground fairness). This is an
original stdlib-only implementation, not third-party vendor code.
"""
from __future__ import annotations

import ctypes
from dataclasses import asdict, dataclass
import os
from pathlib import Path
import shutil
import threading
import time

SCHEMA = "jr.jrei.windows-adaptive-resources.v1"
MIB = 1024 ** 2
GIB = 1024 ** 3
_MIN_DISK_FREE_GIB = 8
_CACHE_SECONDS = 12
_CACHE_LOCK = threading.RLock()
_SNAPSHOT = {"time": 0.0, "value": None}

@dataclass(frozen=True)
class Budget:
    state: str
    profile: str
    cpu_load_fraction: float | None
    total_ram_mb: int | None
    available_ram_mb: int | None
    disk_free_gb: float | None
    owner_idle_seconds: int | None
    memory_reserved_for_windows_mb: int | None
    cpu_only_background_slots: int
    safe_cpu_process_threads: int
    permitted_work: tuple[str, ...]
    gpu_compute_available: bool
    gpu_free_vram_measured: bool
    gpu_vram_mb: int | None
    max_gpu_job_vram_mb: int | None
    reason: str


def _memory():
    class STATUS(ctypes.Structure):
        _fields_ = [
            ("length", ctypes.c_ulong), ("load", ctypes.c_ulong),
            ("total_phys", ctypes.c_ulonglong),
            ("available_phys", ctypes.c_ulonglong),
            ("total_page", ctypes.c_ulonglong),
            ("available_page", ctypes.c_ulonglong),
            ("total_virtual", ctypes.c_ulonglong),
            ("available_virtual", ctypes.c_ulonglong),
            ("extended", ctypes.c_ulonglong)]
    state = STATUS()
    state.length = ctypes.sizeof(STATUS)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(state)):
        raise OSError("JREI_WIN32_MEMORY_TELEMETRY_UNAVAILABLE")
    return int(state.total_phys), int(state.available_phys)


def _cpu_load():
    class FILETIME(ctypes.Structure):
        _fields_ = [("lo",ctypes.c_ulong),("hi",ctypes.c_ulong)]
        def ticks(self): return (self.hi<<32)|self.lo
    def sample():
        idle, kernel, user = FILETIME(), FILETIME(), FILETIME()
        if not ctypes.windll.kernel32.GetSystemTimes(
                ctypes.byref(idle),ctypes.byref(kernel),ctypes.byref(user)):
            raise OSError("JREI_WIN32_CPU_TELEMETRY_UNAVAILABLE")
        return idle.ticks(), kernel.ticks()+user.ticks()
    old_idle, old_total = sample()
    time.sleep(.11)
    idle,total = sample()
    if total<=old_total:
        raise OSError("JREI_WIN32_CPU_TELEMETRY_UNSTABLE")
    return max(0.,min(1.,1-(idle-old_idle)/(total-old_total)))


def _foreground_idle():
    """Win32 last-input information; fail closed for heavy work if absent."""
    class LASTINPUTINFO(ctypes.Structure):
        _fields_ = [("cbSize",ctypes.c_uint),("dwTime",ctypes.c_uint)]
    info = LASTINPUTINFO()
    info.cbSize = ctypes.sizeof(info)
    if not ctypes.windll.user32.GetLastInputInfo(ctypes.byref(info)):
        raise OSError("JREI_WIN32_USER_ACTIVITY_UNAVAILABLE")
    # LASTINPUTINFO.dwTime is DWORD even on 64-bit Windows. Compare in its
    # wrapping 32-bit tick domain; do not subtract a 64-bit boot uptime.
    uptime = ctypes.windll.kernel32.GetTickCount() & 0xffffffff
    idle_ms = (uptime - int(info.dwTime)) & 0xffffffff
    if idle_ms > 0x7fffffff:
        raise OSError("JREI_WIN32_INPUT_TIME_AMBIGUOUS")
    return idle_ms // 1000


def _sample() -> Budget:
    if os.name != "nt":
        return Budget("UNAVAILABLE","NOT_WINDOWS",None,None,None,None,None,
                      None,0,1,(),False,False,None,None,"WINDOWS_ONLY")
    try:
        total,free = _memory()
        busy = _cpu_load()
        idle = _foreground_idle()
        disk = shutil.disk_usage(Path.home()).free
        total_mb=int(total/MIB)
        free_mb=int(free/MIB)
        disk_gb=round(disk/GIB,2)
        cores=max(1,os.cpu_count() or 1)
        profile="NODE_32GB_HEAVY" if total_mb>=24576 else (
            "NODE_16GB_LIGHT" if total_mb>=12288 else "NODE_LOW_MEMORY")
        # Preserve at least 40% RAM or a class-specific Windows/desktop
        # reserve. Never allocate nearly all RAM merely to maximize CPU.
        reserve=max(int(total_mb*.40),
                    8192 if profile=="NODE_32GB_HEAVY" else
                    5632 if profile=="NODE_16GB_LIGHT" else
                    int(total_mb*.60))
        # CPU work must not compete with games, foreground browsers, video,
        # streaming, or the owner's coding when recent input is detected.
        owner_active=idle < 180
        permitted=["STATUS","EVIDENCE_LOOKUP"]
        slots=0
        reason="OWNER_FOREGROUND_ACTIVE" if owner_active else "HEADROOM_LOW"
        if (disk_gb<_MIN_DISK_FREE_GIB or free_mb<reserve or busy>=.72):
            reason="CAPACITY_GUARD_BLOCKED"
        elif owner_active:
            # Foreground-only quick local reads. No background training.
            pass
        else:
            permitted.extend(["APPROVED_NETWORK_STUDY","FTS_REBUILD",
                              "MEMORY_CURATION"])
            slots=1
            reason="LIGHT_BACKGROUND_ELIGIBLE"
            # CPU heavy tasks only after longer idle and enough memory.
            if (profile=="NODE_32GB_HEAVY" and idle>=420 and
                    free_mb>=max(12288,reserve) and busy<.45):
                permitted.extend(["NATIVE_STATISTICAL_TRAIN",
                                  "NATIVE_NEURAL_TRAIN_CPU"])
                reason="HEAVY_BACKGROUND_ELIGIBLE"
            elif (profile=="NODE_16GB_LIGHT" and idle>=420 and
                  free_mb>=max(6144,reserve) and busy<.35):
                permitted.append("NATIVE_STATISTICAL_TRAIN")
                reason="LIGHT_TRAIN_ELIGIBLE"
        # No GPU telemetry is sampled here: the existence of a card,
        # nominal VRAM, or a game benchmark does NOT establish free VRAM or
        # compatible accelerator drivers. GPU eligibility must be measured
        # independently by the actual compatible training backend.
        return Budget(
            state="OBSERVED_WIN32", profile=profile,
            cpu_load_fraction=round(busy,3),total_ram_mb=total_mb,
            available_ram_mb=free_mb,disk_free_gb=disk_gb,
            owner_idle_seconds=idle,memory_reserved_for_windows_mb=reserve,
            cpu_only_background_slots=slots,
            safe_cpu_process_threads=max(1,min(4,cores//2)),
            permitted_work=tuple(permitted),
            gpu_compute_available=False,gpu_free_vram_measured=False,
            gpu_vram_mb=None,max_gpu_job_vram_mb=None,reason=reason)
    except (OSError,ValueError,AttributeError,OverflowError):
        return Budget("UNAVAILABLE","UNKNOWN",None,None,None,None,None,
                      None,0,1,(),False,False,None,None,"SENSOR_UNAVAILABLE")


def snapshot(*, fresh=False) -> dict:
    now=time.monotonic()
    with _CACHE_LOCK:
        if (not fresh and _SNAPSHOT["value"] is not None and
                now-_SNAPSHOT["time"]<_CACHE_SECONDS):
            return dict(_SNAPSHOT["value"])
        value=asdict(_sample())
        value["schema"]=SCHEMA
        value["permitted_work"]=list(value["permitted_work"])
        value["current_node_only"]=True
        value["other_node_observations"]=False
        value["gpus_pooled"]=False
        value["owner_hardware_reported_8gb_vram_unverified"]=True
        _SNAPSHOT.update(time=time.monotonic(),value=value)
        return dict(value)


def permits(kind: str, *, fresh=False) -> bool:
    return kind in snapshot(fresh=fresh)["permitted_work"]


def slots_for(command: str) -> int:
    """Read-only scheduling hint. Production worker still owns its leases."""
    budget=snapshot()
    return budget["cpu_only_background_slots"] if command in (
        "APPROVED_NETWORK_STUDY","FTS_REBUILD","MEMORY_CURATION",
        "NATIVE_STATISTICAL_TRAIN","NATIVE_NEURAL_TRAIN_CPU") else 0
