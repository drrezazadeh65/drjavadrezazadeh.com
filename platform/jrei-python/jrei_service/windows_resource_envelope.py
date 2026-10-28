"""Measured resource envelope for the EXISTING JREI Windows owner worker.

Targets two independently signed PCs today, but requires no machine-specific
RAM/VRAM assumptions and scales to future approved workers. No second agent,
no extra app, no new DB, network request, remote command or driver installation.

CPU/RAM sensor is the original JREI Windows telemetry. GPU compute information
is separate and observed on demand through an already installed local PyTorch
runtime; physical adapter labels or nominal 8 GB graphics memory are never
treated as proof of CUDA/DirectML compatibility. Missing measurements HOLD
heavy training, never turn on an unverified GPU.
"""
from __future__ import annotations

import ctypes
import os
import time

from jrei_service import windows_continuous_learning as original


def owner_idle_seconds() -> float | None:
    """Real local input activity; Windows only. Missing data fails closed."""
    if os.name != "nt":
        return None
    try:
        from ctypes import wintypes
        class LastInputInfo(ctypes.Structure):
            _fields_ = [("cbSize", wintypes.UINT), ("dwTime", wintypes.DWORD)]
        last = LastInputInfo()
        last.cbSize = ctypes.sizeof(last)
        if not ctypes.windll.user32.GetLastInputInfo(ctypes.byref(last)):
            return None
        now = ctypes.windll.kernel32.GetTickCount()
        # Win32 dwTime/GetTickCount are DWORD; correctly handle rollover.
        return max(0.0, float((now - last.dwTime) & 0xFFFFFFFF) / 1000.0)
    except (OSError, ValueError, AttributeError):
        return None


def observe(*, gpu_probe: bool = False) -> dict:
    """Return only local measurements; never infer 8GB from an assertion."""
    resources = original._windows_resources()
    idle = owner_idle_seconds()
    base = {
        "schema": "jr.jrei.windows-resource-envelope.v1",
        "observation_epoch_seconds": int(time.time()),
        "node_identity": "LOCAL_OWNER_ONLY_NO_HARDWARE_INFERENCE",
        "resources": resources,
        "owner_idle_seconds": None if idle is None else round(idle, 1),
        "sensitive_heavy_jobs_eligible": bool(
            resources.get("eligible") is True and
            idle is not None and idle >= 180),
        "gpu_compute": {
            "status": "NOT_PROBED",
            "device_count": None,
            "free_memory_mb": None,
            "compute_supported": False,
        },
        "other_pc_gpu_memory_pooled": False,
        "training_started": False,
    }
    if not gpu_probe:
        return base
    if os.name != "nt":
        base["gpu_compute"]["status"] = "WINDOWS_RUNTIME_REQUIRED"
        return base
    try:
        import torch  # optional existing Python LIBRARY, never downloaded here
        if not torch.cuda.is_available():
            base["gpu_compute"]["status"] = "CUDA_NOT_AVAILABLE_OR_NOT_SUPPORTED"
            return base
        count = torch.cuda.device_count()
        if count < 1:
            base["gpu_compute"]["status"] = "NO_CUDA_COMPUTE_DEVICES"
            return base
        # Separate local devices only. No accidental multi-GPU/PC pooling.
        free, total = torch.cuda.mem_get_info(0)
        measured_free = max(0, int(free) // (1024 * 1024))
        measured_total = max(0, int(total) // (1024 * 1024))
        margin = max(2048, int(measured_total * 0.40))
        base["gpu_compute"] = {
            "status": "CUDA_RUNTIME_MEASURED",
            "device_count": count,
            "device_index": 0,
            "device_name": str(torch.cuda.get_device_name(0))[:120],
            "backend": "PYTORCH_CUDA",
            "torch_cuda_runtime_version": str(torch.version.cuda or "UNKNOWN")[:30],
            "driver_version": "NOT_MEASURED",
            "total_memory_mb": measured_total,
            "free_memory_mb": measured_free,
            "owner_display_reserve_mb": margin,
            "compute_supported": measured_free >= margin + 2048,
        }
        return base
    except (ImportError, OSError, RuntimeError, ValueError, AssertionError):
        base["gpu_compute"]["status"] = "CUDA_RUNTIME_UNAVAILABLE"
        return base


def allow_heavy_training(*, require_gpu: bool) -> dict:
    """Training admission uses measured RAM, activity and accelerator headroom.

    No training starts while the owner is actively using this PC. For an
    8GB GPU the display/OS retains at least 2GB or 40% (whichever larger)
    plus 2GB of independently measured free GPU compute headroom.
    This is not a claim that the GPU supports JREI's training operators.
    """
    current = observe(gpu_probe=require_gpu)
    reason = None
    if current["resources"].get("eligible") is not True:
        reason = "WINDOWS_REAL_RESOURCE_HEADROOM_NOT_READY"
    elif not current["sensitive_heavy_jobs_eligible"]:
        reason = "OWNER_INTERACTIVE_OR_IDLE_TELEMETRY_UNAVAILABLE"
    elif require_gpu and (
        current["gpu_compute"].get("status") != "CUDA_RUNTIME_MEASURED" or
        current["gpu_compute"].get("compute_supported") is not True
    ):
        reason = "GPU_RUNTIME_NOT_MEASURED_COMPATIBLE"
    return {
        "state": "HEAVY_WORK_ELIGIBLE_TO_ATTEMPT" if reason is None else "HEAVY_WORK_DEFERRED",
        "reason": reason,
        "read_only_observation": current,
        "model_weights_changed": False,
    }
