#!/usr/bin/env python3
"""Validate a bounded, private direct-GSC snapshot before any future ingestion.

Offline validation only. Never prints or writes submitted observations.
"""
from __future__ import annotations
from datetime import datetime, timezone, timedelta
from urllib.parse import urlsplit
import json

PROPERTY = "https://drjavadrezazadeh.com/"
SCHEMA = "jr-gsc-direct-observation-v1"
MAX_AGE = timedelta(hours=72)
MAX_BYTES = 65536
MAX_ROWS = 250
METRICS = ("clicks", "impressions", "ctr", "position")


class SnapshotError(ValueError):
    pass


def _utc(value):
    if not isinstance(value, str) or not value.endswith("Z"):
        raise SnapshotError("invalid_utc_timestamp")
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise SnapshotError("invalid_utc_timestamp") from exc
    return result


def validate_snapshot(payload, now=None):
    """Return sanitized metadata only; fail closed on any unrecognized field."""
    now = now or datetime.now(timezone.utc)
    if not isinstance(payload, dict):
        raise SnapshotError("invalid_payload")
    allowed = {"schema", "source", "property", "collectedAtUtc", "startDate", "endDate", "rows"}
    if set(payload) != allowed:
        raise SnapshotError("invalid_fields")
    if payload["schema"] != SCHEMA or payload["source"] != "google-search-console-api-direct":
        raise SnapshotError("invalid_provenance")
    if payload["property"] != PROPERTY:
        raise SnapshotError("wrong_property")
    stamp = _utc(payload["collectedAtUtc"])
    if stamp > now + timedelta(minutes=5) or now - stamp > MAX_AGE:
        raise SnapshotError("stale_or_future")
    try:
        start = datetime.strptime(payload["startDate"], "%Y-%m-%d").date()
        end = datetime.strptime(payload["endDate"], "%Y-%m-%d").date()
    except (TypeError, ValueError) as exc:
        raise SnapshotError("invalid_date_range") from exc
    if start > end or (end - start).days > 92 or end > now.date():
        raise SnapshotError("invalid_date_range")
    rows = payload["rows"]
    if not isinstance(rows, list) or len(rows) > MAX_ROWS:
        raise SnapshotError("invalid_rows")
    for row in rows:
        if not isinstance(row, dict) or set(row) != set(METRICS):
            raise SnapshotError("invalid_row_shape")
        for name in METRICS:
            value = row[name]
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise SnapshotError("invalid_metric")
            if not (0 <= value <= (1 if name == "ctr" else 1000000000)):
                raise SnapshotError("invalid_metric")
        if row["position"] < 1:
            raise SnapshotError("invalid_position")
    return {"schema": SCHEMA, "property": PROPERTY, "rows": len(rows), "collectedAtUtc": payload["collectedAtUtc"]}


def parse_snapshot(raw, now=None):
    if not isinstance(raw, bytes) or len(raw) > MAX_BYTES:
        raise SnapshotError("invalid_size")
    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeError, ValueError) as exc:
        raise SnapshotError("invalid_json") from exc
    return validate_snapshot(data, now)
