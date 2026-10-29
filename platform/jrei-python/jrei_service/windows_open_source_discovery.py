"""Owner-initiated GitHub open-source DISCOVERY inside existing JREI Windows.

This is the non-destructive research stage of the native JREI source-learning
loop. Search returns descriptive repository candidates, not executable code,
installation authorisation, trustworthy training data or permission to copy.
A language model may rank candidates but never self-approve a licence.

No second assistant, no GitHub token, no owner data upload, no repository
mutation or external pretrained model. Only fixed https://api.github.com host.
No webhooks, automatic downloads, arbitrary URLs or redirects. Network I/O
occurs only on an explicit owner authenticated /api/open-source/search call.

Relevant open-source designs inspected: MIT MarkItDown, MIT Tree-sitter,
Apache-2.0 Aider, MIT nanochat, Apache-2.0 LitGPT, Apache-2.0 sqlite-vec.
Inspect upstream exact file licence/NOTICE and transitive rights BEFORE any
verbatim source adoption. Some upstream model training repos also carry
pretrained-weight download paths which are NOT authorised by this module.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
import re
import threading
import time
import urllib.parse
import urllib.request
import urllib.error

API_HOST = "https://api.github.com"
SUPPORTED = frozenset({"MIT", "Apache-2.0", "BSD-2-Clause",
                       "BSD-3-Clause", "0BSD", "Unlicense", "CC0-1.0"})
QUERY = re.compile(r"^[\w\u0600-\u06ff .+#-]{3,75}$", re.UNICODE)
LOCK = threading.RLock()
CACHE: dict[str, tuple[float, dict]] = {}
_LAST_REQUEST = 0.0
RATE_SECONDS = 12.0

KNOWN = (
    ("microsoft/markitdown", "PRIVATE_OFFICE_READER_ADAPTED_ORIGINAL"),
    ("tree-sitter/py-tree-sitter", "OPTIONAL_SOURCE_PARSER_WIRED"),
    ("Aider-AI/aider", "SOURCE_MAP_AND_EDIT_REVIEW_PATTERNS_ADAPTED"),
    ("karpathy/nanoGPT", "MIT_NEURAL_MODEL_CODE_VENDORED"),
    ("karpathy/minbpe", "MIT_TOKENIZER_CODE_VENDORED"),
    ("karpathy/nanochat", "RESEARCHED_NOT_INTEGRATED_GPU_HEAVY"),
    ("Lightning-AI/litgpt", "RESEARCHED_NOT_INTEGRATED_GPU_DEPENDENCIES"),
    ("asg017/sqlite-vec", "RESEARCHED_NOT_INTEGRATED_NATIVE_EXTENSION"),
    ("langchain-ai/langgraph", "RESEARCHED_NOT_INSTALLED"),
    ("microsoft/graphrag", "RESEARCHED_PARTIAL_DESIGN_ONLY"),
)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, url):
        raise ValueError("JREI_SOURCE_DISCOVERY_REDIRECT_FORBIDDEN")


def catalog() -> dict:
    return {
        "schema": "jr.jrei.windows-open-source-catalog.v1",
        "state": "CODE_ONLY_DISCOVERY_NOT_APPROVAL",
        "repositories": [
            {"repository": repo, "status": status}
            for repo, status in KNOWN
        ],
        "other_pretrained_weights_authorized": False,
        "automatic_code_installation": False,
        "automatic_git_push": False,
        "owner_confirmation_required_for_all_changes": True,
        "integration_test_passed": False,
    }


def _get_json(path: str) -> dict:
    if not path.startswith("/search/repositories?") or len(path) > 1200:
        raise ValueError("JREI_SOURCE_DISCOVERY_ROUTE_INVALID")
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({}), _NoRedirect())
    request = urllib.request.Request(
        API_HOST + path,
        headers={"User-Agent": "JREI-Private-Source-Discovery/1",
                 "Accept": "application/vnd.github+json",
                 "X-GitHub-Api-Version": "2022-11-28"},
        method="GET")
    try:
        with opener.open(request, timeout=12) as response:
            if (response.status != 200 or
                    response.headers.get("Content-Type", "").split(";")[0]
                    != "application/json"):
                raise ValueError("JREI_SOURCE_DISCOVERY_GITHUB_RESPONSE_INVALID")
            raw = response.read(90_001)
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403, 429):
            raise ValueError("JREI_SOURCE_DISCOVERY_PUBLIC_GITHUB_RATE_LIMIT") from exc
        raise ValueError("JREI_SOURCE_DISCOVERY_GITHUB_UNAVAILABLE") from exc
    if len(raw) > 90_000:
        raise ValueError("JREI_SOURCE_DISCOVERY_METADATA_OVERSIZE")
    obj = json.loads(raw.decode("utf-8"))
    if not isinstance(obj, dict) or not isinstance(obj.get("items"), list):
        raise ValueError("JREI_SOURCE_DISCOVERY_GITHUB_JSON_INVALID")
    return obj


def find_repositories(query: str) -> dict:
    global _LAST_REQUEST
    if (not isinstance(query, str) or not QUERY.fullmatch(query.strip())
            or len(query.strip().split()) > 7):
        raise ValueError("JREI_SOURCE_DISCOVERY_QUERY_INVALID")
    search = query.strip()
    now = time.monotonic()
    with LOCK:
        cached = CACHE.get(search.casefold())
        if cached and now - cached[0] <= 600:
            return dict(cached[1])
        if now - _LAST_REQUEST < RATE_SECONDS:
            return {
                "schema": "jr.jrei.windows-open-source-search.v1",
                "state": "GITHUB_PUBLIC_RATE_BUDGET_DEFERRED",
                "items": [], "actual_live_search_performed": False,
                "next_allowed_in_seconds":
                    round(RATE_SECONDS - (now - _LAST_REQUEST), 1),
            }
        _LAST_REQUEST = now
    # User supplies keywords, not paths, URLs, tokens, arbitrary operators,
    # or executable code. GitHub metadata is untrusted data.
    params = urllib.parse.urlencode({
        "q": search + " in:name,description archived:false fork:false",
        "per_page": "12", "sort": "stars", "order": "desc"
    })
    obj = _get_json("/search/repositories?" + params)
    accepted = []
    rejected = 0
    for entry in obj["items"][:12]:
        if not isinstance(entry, dict):
            continue
        license_info = entry.get("license")
        spdx = license_info.get("spdx_id") if isinstance(license_info, dict) else None
        name = entry.get("full_name")
        if (not isinstance(name, str)
                or not re.fullmatch(r"[\w.-]{1,80}/[\w.-]{1,100}", name)
                or entry.get("archived") is True
                or entry.get("fork") is True):
            rejected += 1
            continue
        # A missing or uncommon license does not block DISCOVERY. It does
        # still block automatic copying, execution or source promotion.
        if not isinstance(spdx, str) or not spdx.strip():
            spdx = "UNKNOWN"
        # Full licence/NOTICE and dependency review is still necessary.
        accepted.append({
            "repository": name,
            "description": str(entry.get("description") or "")[:260],
            "license_reported_by_github": spdx,
            "stars_reported_by_github": max(0, int(entry.get("stargazers_count") or 0)),
            "updated_at": str(entry.get("pushed_at") or "")[:30],
            "url": "https://github.com/" + name,
            "license_verified_at_exact_code_revision": False,
            "license_needs_review_before_reuse": True,
            "model_weights_not_downloaded": True,
            "source_integration_approved": False,
        })
        if len(accepted) >= 8:
            break
    result = {
        "schema": "jr.jrei.windows-open-source-search.v1",
        "state": "READ_ONLY_UNVERIFIED_GITHUB_REPO_CANDIDATES",
        "query": search,
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "items": accepted,
        "candidates_not_assumed_safe": rejected,
        "source_credibility_is_not_a_discovery_gate": True,
        "actual_live_search_performed": True,
        "site_changed": False,
        "external_app_installed": False,
        "pretrained_weights_used": False,
        "code_copied": False,
    }
    with LOCK:
        if len(CACHE) > 35:
            CACHE.clear()
        CACHE[search.casefold()] = (time.monotonic(), result)
    return result
