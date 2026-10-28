"""JREI-owned GitHub operator for the canonical site repository.

This is a native stdlib HTTP adapter, NOT a second AI agent/application.
It reuses the existing local isolated workspace and owner-confirmation flow.

Read-only GitHub facts are available independently of ChatGPT. Updating a
single owner-approved low-risk source file is possible only with a fine-grained
GitHub token, explicit approval, an exact remote HEAD lease and exact blob SHA.
No remote deployment, workflow dispatch, arbitrary git commands, PR merge,
repository deletion or public website mutation is supported.

Never send private chat, database records or credentials to GitHub.
"""
from __future__ import annotations

import base64
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request

REPOSITORY = "drrezazadeh65/drjavadrezazadeh.com"
BRANCH = "migration/bertina-linux6"
BASE = f"https://api.github.com/repos/{REPOSITORY}"
SCHEMA = "jr.jrei.owner-github-operator.v1"
HEAD_RE = re.compile(r"^[0-9a-f]{40}$")
BLOB_RE = re.compile(r"^[0-9a-f]{40}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
RECEIPT_RE = re.compile(r"^\d{8}T\d{6}Z-[0-9a-f]{12}$")
PATH_RE = re.compile(r"^(?:platform/jrei-python/|platform/news-intelligence/|assets/css/|docs/)[A-Za-z0-9_.\-/]{4,180}\.(?:py|js|mjs|css|md|json)$")
TOKEN_RE = re.compile(r"^[A-Za-z0-9_]{30,300}$")
MAX_SOURCE = 50000


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise ValueError("JREI_GITHUB_REDIRECT_DISALLOWED")


def _token() -> str | None:
    # Owner supplies a scoped token to the Windows scheduled service account,
    # not to a chat prompt, browser, public endpoint, GitHub repo or log.
    token = os.environ.get("JREI_GITHUB_TOKEN", "").strip()
    if token and not TOKEN_RE.fullmatch(token):
        raise ValueError("JREI_GITHUB_TOKEN_INVALID")
    return token or None


def _request(route: str, *, method: str = "GET",
             payload: dict | None = None) -> dict:
    if not route.startswith("/") or ".." in route or "//" in route:
        raise ValueError("JREI_GITHUB_ROUTE_INVALID")
    if method not in ("GET", "PUT"):
        raise ValueError("JREI_GITHUB_METHOD_NOT_ALLOWED")
    if method == "PUT" and _token() is None:
        raise ValueError("JREI_GITHUB_WRITE_TOKEN_REQUIRED")
    url = BASE + route
    # Literal API host and known prefix; never follow external redirects.
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({}), _NoRedirect())
    headers = {"Accept": "application/vnd.github+json",
               "User-Agent": "JREI-Windows-Owner-Operator/1",
               "X-GitHub-Api-Version": "2022-11-28"}
    if _token():
        headers["Authorization"] = "Bearer " + _token()
    body = None if payload is None else json.dumps(
        payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if body is not None:
        if len(body) > 90000:
            raise ValueError("JREI_GITHUB_UPLOAD_EXCEEDS_BUDGET")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(
        url, data=body, headers=headers, method=method)
    try:
        with opener.open(request, timeout=24) as response:
            if response.status not in (200, 201):
                raise ValueError("JREI_GITHUB_HTTP_UNEXPECTED")
            if int(response.headers.get("content-length") or 0) > 160000:
                raise ValueError("JREI_GITHUB_RESPONSE_TOO_LARGE")
            content = response.read(160001)
    except urllib.error.HTTPError as exc:
        # GitHub error bodies might include private data; report only status.
        raise RuntimeError("JREI_GITHUB_HTTP_" + str(exc.code)) from None
    if len(content) > 160000:
        raise ValueError("JREI_GITHUB_RESPONSE_TOO_LARGE")
    result = json.loads(content)
    if not isinstance(result, dict):
        raise ValueError("JREI_GITHUB_RESPONSE_SCHEMA")
    return result


def _safe_path(raw: str) -> str:
    if not isinstance(raw, str) or not PATH_RE.fullmatch(raw):
        raise ValueError("JREI_GITHUB_PATH_NOT_PERMITTED")
    if any(part in (".", "..") or part.startswith(".")
           for part in Path(raw).parts):
        raise ValueError("JREI_GITHUB_PATH_NOT_PERMITTED")
    return raw


def remote_head() -> dict:
    """Observe the *real* current canonical branch, not local git state."""
    result = _request("/branches/" + urllib.parse.quote(BRANCH, safe="/"))
    sha = (result.get("commit") or {}).get("sha")
    if result.get("name") != BRANCH or not isinstance(sha, str) or not HEAD_RE.fullmatch(sha):
        raise ValueError("JREI_GITHUB_HEAD_INVALID")
    return {"repository": REPOSITORY, "branch": BRANCH,
            "head_sha": sha, "state": "REMOTE_HEAD_OBSERVED"}


def read_remote_source(path: str) -> dict:
    name = _safe_path(path)
    route = ("/contents/" + urllib.parse.quote(name, safe="/")
             + "?ref=" + urllib.parse.quote(BRANCH, safe="/"))
    result = _request(route)
    if (result.get("type") != "file" or result.get("path") != name
            or result.get("encoding") != "base64"):
        raise ValueError("JREI_GITHUB_SOURCE_NOT_REGULAR")
    content = result.get("content")
    blob_sha = result.get("sha")
    if not isinstance(blob_sha, str) or not BLOB_RE.fullmatch(blob_sha):
        raise ValueError("JREI_GITHUB_SOURCE_BLOB_SHA_INVALID")
    if not isinstance(content, str) or len(content) > 70000:
        raise ValueError("JREI_GITHUB_SOURCE_TOO_LARGE")
    source = base64.b64decode(content, validate=False)
    if len(source) > MAX_SOURCE or b"\x00" in source:
        raise ValueError("JREI_GITHUB_SOURCE_NOT_TEXT")
    source.decode("utf-8")
    return {"state": "REMOTE_SOURCE_OBSERVED", "path": name,
            "blob_sha": blob_sha,
            "sha256": hashlib.sha256(source).hexdigest(),
            "size": len(source),
            "excerpt": source.decode("utf-8")[:2500],
            "complete_content_read": False}


def workflow_observation() -> dict:
    """Reuse the EXISTING 30-minute site governor rather than crawling twice."""
    path = "/actions/workflows/jrei-autonomous-site-governor.yml/runs"
    route = path + "?branch=" + urllib.parse.quote(BRANCH, safe="") + "&per_page=1"
    result = _request(route)
    runs = result.get("workflow_runs", [])
    if not isinstance(runs, list) or not runs:
        return {"state": "NO_REMOTE_GOVERNOR_RUN", "verified_site_health": False}
    run = runs[0]
    if not isinstance(run, dict):
        raise ValueError("JREI_GITHUB_WORKFLOW_SCHEMA_INVALID")
    return {
        "state": "RECENT_GOVERNOR_RUN_OBSERVED",
        "run_id": run.get("id"), "event": run.get("event"),
        "status": run.get("status"), "conclusion": run.get("conclusion"),
        "head_sha": run.get("head_sha"),
        "created_at": run.get("created_at"),
        # Workflow success alone cannot certify private DB/Windows nodes.
        "private_server_health_verified": False,
        "published_site_mutated": False,
    }


def snapshot() -> dict:
    status = {"schema": SCHEMA, "repository": REPOSITORY,
              "branch": BRANCH, "token_configured": bool(_token()),
              "chatgpt_subscription_required": False,
              "remote_writes_require_owner_approval": True,
              "production_deployment_supported": False}
    try:
        status.update(remote_head())
    except (OSError, ValueError, RuntimeError, urllib.error.URLError):
        status["state"] = "REMOTE_GITHUB_UNAVAILABLE"
    return status


def initialize(db_path: Path):
    with closing(sqlite3.connect(db_path, timeout=12)) as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS jrei_github_operator_receipts(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created INTEGER NOT NULL,
          source_receipt_id TEXT NOT NULL UNIQUE,
          target_path TEXT NOT NULL,
          before_sha256 TEXT NOT NULL,
          after_sha256 TEXT NOT NULL,
          approved_head_sha TEXT NOT NULL,
          remote_commit_sha TEXT NOT NULL DEFAULT '',
          state TEXT NOT NULL,
          details TEXT NOT NULL DEFAULT ''
        );
        """)


def _workspace_receipt(private: Path, receipt_id: str) -> tuple[dict, Path]:
    if (not isinstance(receipt_id, str) or not RECEIPT_RE.fullmatch(receipt_id)):
        raise ValueError("JREI_GITHUB_LOCAL_RECEIPT_ID_INVALID")
    root = private / "development-workspace"
    if root.is_symlink():
        raise ValueError("JREI_GITHUB_WORKSPACE_SYMLINK")
    receipt_path = root / ".receipts" / (receipt_id + ".json")
    if receipt_path.is_symlink() or not receipt_path.is_file() or receipt_path.stat().st_size > 12000:
        raise ValueError("JREI_GITHUB_LOCAL_RECEIPT_NOT_FOUND")
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    if (not isinstance(receipt, dict) or
            receipt.get("schema") != "jr.jrei.windows-workspace-edit.v1" or
            receipt.get("state") != "LOCAL_CODE_WRITTEN_UNTESTED" or
            receipt.get("tests_run") is not False or
            receipt.get("canonical_checkout_modified") is not False or
            receipt.get("git_pushed") is not False):
        raise ValueError("JREI_GITHUB_ONLY_ISOLATED_UNTESTED_DRAFTS")
    target = _safe_path(receipt.get("target"))
    patch = root.joinpath(*Path(target).parts)
    if patch.is_symlink() or not patch.is_file() or not patch.resolve().is_relative_to(root.resolve()):
        raise ValueError("JREI_GITHUB_LOCAL_PATCH_NOT_FOUND")
    if patch.stat().st_size > MAX_SOURCE:
        raise ValueError("JREI_GITHUB_LOCAL_PATCH_TOO_LARGE")
    data = patch.read_bytes()
    if hashlib.sha256(data).hexdigest() != receipt.get("after_sha256"):
        raise ValueError("JREI_GITHUB_LOCAL_PATCH_CHANGED")
    if not isinstance(receipt.get("before_sha256"), str) or not SHA256_RE.fullmatch(receipt["before_sha256"]):
        raise ValueError("JREI_GITHUB_LOCAL_SOURCE_HASH_INVALID")
    return receipt, patch




def owner_patch_preflight(*, private: Path, receipt_id: str) -> dict:
    """Owner-triggered READ-ONLY remote comparison before separate GitHub consent.

    This function cannot grant write authority. It never transmits the owner
    draft or its diff to GitHub; remote calls only fetch HEAD and source hashes.
    The existing per-file Contents API PUT will still independently revalidate
    remote HEAD and the file's blob SHA after explicit owner confirmation.
    """
    from jrei_service.windows_workspace import preview_diff
    receipt, _patch = _workspace_receipt(private, receipt_id)
    preview = preview_diff(private=private, receipt_id=receipt_id)
    if (receipt.get("target") != preview["target"]
            or receipt.get("before_sha256") != preview["before_sha256"]
            or receipt.get("after_sha256") != preview["after_sha256"]):
        raise ValueError("JREI_GITHUB_PREFLIGHT_RECEIPT_NOT_CONSISTENT")
    observed_head = remote_head()
    remote_file = read_remote_source(receipt["target"])
    # Because the HEAD can move while downloading the file, bracket the
    # single remote content observation. A subsequent owner action checks
    # the exact same HEAD again before any separately authorized PUT.
    if remote_head()["head_sha"] != observed_head["head_sha"]:
        raise ValueError("JREI_GITHUB_PREFLIGHT_HEAD_CHANGED_WHILE_READING")
    if remote_file["sha256"] != preview["before_sha256"]:
        raise ValueError("JREI_GITHUB_PREFLIGHT_REMOTE_SOURCE_CHANGED")
    return {
        "schema": "jr.jrei.github-owner-write-preflight.v1",
        "state": "REMOTE_BASE_MATCHED_REVIEW_ONLY",
        "repository": REPOSITORY, "branch": BRANCH,
        "expected_head_sha": observed_head["head_sha"],
        "remote_blob_sha": remote_file["blob_sha"],
        "target": preview["target"],
        "receipt_id": receipt_id,
        "before_sha256": preview["before_sha256"],
        "after_sha256": preview["after_sha256"],
        "diff_sha256": preview["diff_sha256"],
        "diff": preview["diff"],
        "remote_write_approved": False,
        "remote_write_performed": False,
        "tests_performed": False,
        "production_deployment_performed": False,
        "separate_explicit_owner_confirm_required": True,
        "remote_head_may_change_after_preflight": True,
    }


def submit_owner_reviewed_patch(
        *, db_path: Path, private: Path, receipt_id: str,
        expected_head_sha: str, confirmation: bool) -> dict:
    """Single source PUT, never deploy. No implicit LLM-triggered GitHub write.

    Narrower automation can be added later only after the existing review
    and release policy explicitly delegates its scope.
    """
    if confirmation is not True:
        raise ValueError("JREI_GITHUB_OWNER_APPROVAL_REQUIRED")
    if not isinstance(expected_head_sha, str) or not HEAD_RE.fullmatch(expected_head_sha):
        raise ValueError("JREI_GITHUB_EXPECTED_HEAD_REQUIRED")
    receipt, patch = _workspace_receipt(private, receipt_id)
    head = remote_head()
    if head["head_sha"] != expected_head_sha:
        raise ValueError("JREI_GITHUB_REMOTE_HEAD_CHANGED")
    remote = read_remote_source(receipt["target"])
    if remote["sha256"] != receipt["before_sha256"]:
        raise ValueError("JREI_GITHUB_REMOTE_FILE_NOT_EQUAL_WORKSPACE_BASE")
    with closing(sqlite3.connect(db_path, timeout=12)) as db:
        existing = db.execute(
            "SELECT state,remote_commit_sha FROM jrei_github_operator_receipts "
            "WHERE source_receipt_id=?", (receipt_id,)).fetchone()
    if existing:
        return {"state": existing[0], "remote_commit_sha": existing[1],
                "reused_receipt": True, "production_deployed": False}
    # Check immediately before the remote change. GitHub's Contents API
    # enforces the expected per-file blob SHA as its final concurrency gate.
    if remote_head()["head_sha"] != expected_head_sha:
        raise ValueError("JREI_GITHUB_REMOTE_HEAD_CHANGED")
    encoded = base64.b64encode(patch.read_bytes()).decode("ascii")
    changed = _request(
        "/contents/" + urllib.parse.quote(receipt["target"], safe="/"),
        method="PUT",
        payload={"message": "fix(jrei): owner-reviewed isolated patch [skip ci]",
                 "content": encoded,
                 "sha": remote["blob_sha"],
                 "branch": BRANCH})
    commit = (changed.get("commit") or {}).get("sha")
    if not isinstance(commit, str) or not HEAD_RE.fullmatch(commit):
        raise ValueError("JREI_GITHUB_WRITE_RESULT_UNVERIFIED")
    with closing(sqlite3.connect(db_path, timeout=12)) as db:
        db.execute("""INSERT OR IGNORE INTO jrei_github_operator_receipts(
          created,source_receipt_id,target_path,before_sha256,
          after_sha256,approved_head_sha,remote_commit_sha,state)
          VALUES(?,?,?,?,?,?,?,'GITHUB_COMMIT_OBSERVED_UNDEPLOYED')""",
          (int(time.time()), receipt_id, receipt["target"],
           receipt["before_sha256"], receipt["after_sha256"],
           expected_head_sha, commit))
        db.commit()
    return {"schema": SCHEMA, "state": "GITHUB_COMMIT_OBSERVED_UNDEPLOYED",
            "repository": REPOSITORY, "branch": BRANCH, "commit_sha": commit,
            "target": receipt["target"], "production_deployed": False,
            "tests_run_by_operator": False,
            "owner_one_click_release_unchanged": True}
