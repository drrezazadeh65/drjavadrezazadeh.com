"""Independent JREI read-only GitHub CI observation for the Windows owner agent.

Observes actual HEAD-specific workflow outcomes, not the model's guesses.
Does not obtain credentials, dispatch Actions, merge code or treat a
successful isolated test as evidence of production deployment.
"""
from __future__ import annotations

import hashlib
import json
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ORIGIN = "https://api.github.com"
REPO = "drrezazadeh65/drjavadrezazadeh.com"
CANONICAL = "migration/bertina-linux6"
BRANCH_URL = f"{ORIGIN}/repos/{REPO}/branches/migration/bertina-linux6"
RUNS_URL = f"{ORIGIN}/repos/{REPO}/actions/runs?per_page=60"
REQUIRED = (
    "Bertina Master SEO Audit",
    "SEO GEO Regression",
    "JREI Windows Command Center - Functional Source QA (NO DEPLOY)",
    "JREI V2 Python-first Isolated QA (NO DEPLOY)",
)
MAX_BODY = 550000


def fetch_json(url: str) -> dict:
    if url not in (BRANCH_URL, RUNS_URL):
        raise ValueError("JREI_CI_UNAPPROVED_GITHUB_URL")
    request = Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "JREI-Owner-CI-Observer/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    with urlopen(request, timeout=9) as response:
        if response.status != 200:
            raise ValueError("JREI_CI_UNEXPECTED_HTTP_STATUS")
        data = response.read(MAX_BODY + 1)
    if len(data) > MAX_BODY:
        raise ValueError("JREI_CI_RESPONSE_EXCEEDS_BUDGET")
    parsed = json.loads(data)
    if not isinstance(parsed, dict):
        raise ValueError("JREI_CI_RESPONSE_INVALID")
    return parsed


def inspect_ci(branch: dict, runs: dict) -> dict:
    """Return an anchored, independently observable status, never false PASS."""
    head = branch.get("commit", {}).get("sha")
    if not isinstance(head, str) or len(head) != 40 or any(
        c not in "0123456789abcdef" for c in head
    ):
        raise ValueError("JREI_CI_HEAD_NOT_VERIFIED")
    raw = runs.get("workflow_runs")
    if not isinstance(raw, list) or len(raw) > 60:
        raise ValueError("JREI_CI_RUN_LIST_INVALID")
    latest = {}
    for run in raw:
        if not isinstance(run, dict):
            continue
        name = run.get("name")
        if name not in REQUIRED or name in latest:
            continue
        if run.get("head_branch") != CANONICAL:
            continue
        sha = run.get("head_sha")
        if not isinstance(sha, str) or len(sha) != 40:
            continue
        latest[name] = {
            "id": run.get("id"),
            "sha": sha,
            "conclusion": run.get("conclusion"),
            "status": run.get("status"),
        }
    findings = []
    failed = []
    missing = []
    for name in REQUIRED:
        row = latest.get(name)
        if row is None or row["sha"] != head:
            missing.append(name)
            findings.append({"workflow": name, "state": "MISSING_OR_STALE"})
        elif row["status"] != "completed" or row["conclusion"] is None:
            missing.append(name)
            findings.append({"workflow": name, "state": "NOT_FINISHED", "id": row["id"]})
        elif row["conclusion"] != "success":
            failed.append(name)
            findings.append({"workflow": name, "state": "FAILED", "id": row["id"]})
        else:
            findings.append({"workflow": name, "state": "PASS", "id": row["id"]})
    state = "FAILED_AT_HEAD" if failed else (
        "INCOMPLETE_AT_HEAD" if missing else "PASS_AT_HEAD")
    payload = {"schema": "jr.jrei.owner-ci-observation.v1",
               "branch": CANONICAL, "head_sha": head,
               "state": state, "findings": findings,
               "production_deployed": False}
    receipt_sha = hashlib.sha256(json.dumps(
        payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return {**payload, "receipt_sha256": receipt_sha}


def observe_ci() -> dict:
    return inspect_ci(fetch_json(BRANCH_URL), fetch_json(RUNS_URL))
