#!/usr/bin/env python3
"""Read-only GSC proof for existing GitHub OIDC/WIF; never persist OAuth tokens."""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

EXPECTED_PROPERTY = "https://drjavadrezazadeh.com/"
DOMAIN_PROPERTY = "sc-domain:drjavadrezazadeh.com"
SITES_ENDPOINT = "https://www.googleapis.com/webmasters/v3/sites"
HOST = "https://www.googleapis.com"
MAX_RESPONSE = 262144


class VerificationError(Exception):
    def __init__(self, category: str, http_status: int | None = None):
        super().__init__(category)
        self.category = category
        self.http_status = http_status


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise VerificationError("unexpected_google_redirect", code)


def request_google(token: str, url: str, payload: dict | None = None) -> tuple[int, dict]:
    """Bounded, nonredirecting HTTPS request with a token only in a header."""
    if not url.startswith(HOST + "/"):
        raise VerificationError("unapproved_google_endpoint")
    body = None if payload is None else json.dumps(payload, separators=(",", ":")).encode("utf-8")
    req = urllib.request.Request(url, data=body, method="GET" if body is None else "POST",
                                 headers={"Authorization": "Bearer " + token,
                                          "Accept": "application/json",
                                          **({"Content-Type": "application/json"} if body else {})})
    opener = urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(req, timeout=25) as response:
            status = response.status
            length = response.headers.get("Content-Length", "")
            if length.isdigit() and int(length) > MAX_RESPONSE:
                raise VerificationError("google_response_oversize", status)
            raw = response.read(MAX_RESPONSE + 1)
    except urllib.error.HTTPError as error:
        category = {400: "bad_query", 401: "authentication_rejected",
                    403: "permission_or_api_denied", 404: "google_resource_not_found",
                    429: "google_quota_limited"}.get(error.code, "google_http_error")
        raise VerificationError(category, error.code) from None
    except urllib.error.URLError:
        raise VerificationError("google_network_unavailable") from None
    except TimeoutError:
        raise VerificationError("google_request_timeout") from None
    if len(raw) > MAX_RESPONSE:
        raise VerificationError("google_response_oversize", status)
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise VerificationError("invalid_google_json", status) from None
    if not isinstance(data, dict):
        raise VerificationError("invalid_google_shape", status)
    return status, data


def historical_range(today: dt.date) -> tuple[str, str]:
    # Avoid real-time GSC data (which can be incomplete); relative final-history interval.
    return ((today - dt.timedelta(days=18)).isoformat(),
            (today - dt.timedelta(days=4)).isoformat())


def inspect(token: str, today: dt.date | None = None) -> dict:
    today = today or dt.datetime.now(dt.timezone.utc).date()
    sites_status, data = request_google(token, SITES_ENDPOINT)
    sites = data.get("siteEntry", [])
    if not isinstance(sites, list):
        raise VerificationError("invalid_property_list", sites_status)
    seen = [v for v in sites if isinstance(v, dict) and v.get("siteUrl") in
            {EXPECTED_PROPERTY, DOMAIN_PROPERTY}]
    exact = next((v for v in seen if v.get("siteUrl") == EXPECTED_PROPERTY), None)
    if exact is None:
        if any(v.get("siteUrl") == DOMAIN_PROPERTY for v in seen):
            raise VerificationError("only_domain_property_accessible", sites_status)
        raise VerificationError("url_prefix_property_not_accessible", sites_status)
    permission = exact.get("permissionLevel")
    if permission not in {"siteOwner", "siteFullUser"}:
        raise VerificationError("insufficient_property_permission", sites_status)

    start, end = historical_range(today)
    endpoint = HOST + "/webmasters/v3/sites/" + urllib.parse.quote(EXPECTED_PROPERTY, safe="") + "/searchAnalytics/query"
    # Empty dimensions => bounded aggregate, not row-truncated query/page data.
    analytics_status, report = request_google(token, endpoint, {
        "startDate": start, "endDate": end,
        "dimensions": [], "rowLimit": 1, "type": "web", "dataState": "final",
    })
    rows = report.get("rows", [])
    if not isinstance(rows, list) or len(rows) > 1:
        raise VerificationError("invalid_analytics_aggregate", analytics_status)
    metrics = None
    if rows:
        if not isinstance(rows[0], dict):
            raise VerificationError("invalid_analytics_row", analytics_status)
        row = rows[0]
        try:
            metrics = {name: float(row[name]) for name in
                       ("clicks", "impressions", "ctr", "position")}
        except (KeyError, ValueError, TypeError, OverflowError):
            raise VerificationError("invalid_analytics_metrics", analytics_status) from None
        if any(not (value >= 0 and value < float("inf")) for value in metrics.values()):
            raise VerificationError("invalid_analytics_metrics", analytics_status)

    return {
        "schema": "gsc-oidc-readonly-verification-v1",
        "checkedAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": "Google Search Console API via GitHub Actions Workload Identity Federation",
        "authentication": {"status": "access_token_accepted_by_google_api", "httpStatus": sites_status},
        "property": {"status": "verified", "siteUrl": EXPECTED_PROPERTY,
                     "type": "URL_PREFIX", "permission": permission,
                     "listedPropertyCount": len(sites)},
        "searchAnalytics": {"httpStatus": analytics_status,
                            "status": "observed_aggregate" if rows else "no_rows",
                            "startDate": start, "endDate": end, "searchType": "web",
                            "dataState": "final", "returnedRows": len(rows),
                            "aggregate": metrics},
        "limitations": "Search Analytics is delayed/aggregated, omits some anonymized queries, "
                       "and is not ChatGPT/Gemini visibility, URL inspection or direct indexing proof.",
    }


def main() -> int:
    # A job-level allowlist is not proof of Google's CEL/IAM restrictions,
    # but it prevents accidental execution from other GitHub refs/forks.
    if os.environ.get("GITHUB_REPOSITORY") != "drrezazadeh65/drjavadrezazadeh.com" \
            or os.environ.get("GITHUB_REF") != "refs/heads/migration/bertina-linux6":
        print("GSC_VERIFICATION=BLOCKED category=untrusted_repository_or_ref")
        return 1
    token = os.environ.get("GSC_ACCESS_TOKEN", "")
    if not token:
        print("GSC_VERIFICATION=BLOCKED category=oidc_access_token_missing")
        return 1
    try:
        report = inspect(token)
    except VerificationError as exc:
        status = "N/A" if exc.http_status is None else str(exc.http_status)
        # No raw response, exception detail, token, queries, or URL inspection links.
        print(f"GSC_VERIFICATION=BLOCKED category={exc.category} httpStatus={status}")
        return 1
    print("GSC_VERIFICATION=VERIFIED provider=google-search-console method=oidc-wif")
    print("GSC_PROPERTY=" + report["property"]["siteUrl"]
          + " permission=" + report["property"]["permission"]
          + " httpStatus=" + str(report["authentication"]["httpStatus"]))
    analytics = report["searchAnalytics"]
    print("GSC_ANALYTICS=" + analytics["status"] + " httpStatus=" + str(analytics["httpStatus"])
          + " interval=" + analytics["startDate"] + ".." + analytics["endDate"]
          + " aggregateRows=" + str(analytics["returnedRows"]))
    # Aggregate metrics only; no personal/query/page data or OAuth credential.
    output = os.environ.get("GITHUB_STEP_SUMMARY")
    if output:
        with open(output, "a", encoding="utf-8") as summary:
            summary.write("### Google Search Console API — read-only verification\n"
                          + "- OIDC Google API: **ACCEPTED**\n"
                          + "- Exact URL-prefix property: **ACCESSIBLE** ("
                          + report["property"]["permission"] + ")\n"
                          + "- Historical Search Analytics: **" + analytics["status"] + "**"
                          + " (HTTP " + str(analytics["httpStatus"]) + "; "
                          + analytics["startDate"] + " to " + analytics["endDate"] + ")\n"
                          + "- No tokens, queries, page data, credentials or production mutations recorded.\n"
                          + "- Provider CEL/IAM configuration must be independently reviewed by a Google Cloud owner.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
