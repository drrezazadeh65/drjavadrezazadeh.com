#!/usr/bin/env python3
"""Keyless, read-only GA4 Data API verification for the existing trusted GitHub WIF.

No raw GA4 report rows, secrets, tokens or credentials are logged or persisted.
A valid empty report is not an authentication failure and is not a zero-traffic claim.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

PROPERTY = "properties/559754204"
METADATA = "https://analyticsdata.googleapis.com/v1beta/" + PROPERTY + "/metadata"
REPORT = "https://analyticsdata.googleapis.com/v1beta/" + PROPERTY + ":runReport"
EXPECTED_REPO = "drrezazadeh65/drjavadrezazadeh.com"
EXPECTED_REF = "refs/heads/migration/bertina-linux6"
MAX_BYTES = 262144


class Ga4VerificationError(Exception):
    def __init__(self, category: str, code: int | None = None):
        super().__init__(category)
        self.category = category
        self.code = code


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise Ga4VerificationError("unexpected_redirect", code)


def google_request(token: str, url: str, body: dict | None = None) -> tuple[int, dict]:
    if url not in (METADATA, REPORT) or (body is None) != (url == METADATA):
        raise Ga4VerificationError("unapproved_ga4_request")
    payload = None if body is None else json.dumps(body, separators=(",", ":")).encode("utf-8")
    request = urllib.request.Request(
        url, data=payload, method="GET" if payload is None else "POST",
        headers={"Authorization": "Bearer " + token, "Accept": "application/json",
                 **({"Content-Type": "application/json"} if payload is not None else {})},
    )
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=25) as response:
            if (response.headers.get("Content-Length") or "").isdigit() and int(
                response.headers["Content-Length"]) > MAX_BYTES:
                raise Ga4VerificationError("oversized_response", response.status)
            raw = response.read(MAX_BYTES + 1)
            status = response.status
    except urllib.error.HTTPError as error:
        category = {400: "invalid_ga4_query", 401: "ga4_token_rejected",
                    403: "ga4_permission_or_api_denied", 404: "ga4_property_not_found",
                    429: "ga4_quota_limited"}.get(error.code, "ga4_http_error")
        raise Ga4VerificationError(category, error.code) from None
    except urllib.error.URLError:
        raise Ga4VerificationError("ga4_network_unavailable") from None
    except TimeoutError:
        raise Ga4VerificationError("ga4_request_timeout") from None
    if len(raw) > MAX_BYTES:
        raise Ga4VerificationError("oversized_response", status)
    try:
        result = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise Ga4VerificationError("invalid_json", status) from None
    if not isinstance(result, dict):
        raise Ga4VerificationError("invalid_response_shape", status)
    return status, result


def inspect(token: str) -> dict:
    metadata_status, metadata = google_request(token, METADATA)
    available = {metric.get("apiName") for metric in metadata.get("metrics", [])
                 if isinstance(metric, dict)} if isinstance(metadata.get("metrics"), list) else set()
    if not {"activeUsers", "eventCount"}.issubset(available):
        raise Ga4VerificationError("required_ga4_metrics_unavailable", metadata_status)
    report_status, report = google_request(token, REPORT, {
        "dateRanges": [{"startDate": "7daysAgo", "endDate": "yesterday"}],
        "metrics": [{"name": "activeUsers"}, {"name": "eventCount"}],
        "limit": "1",
        "keepEmptyRows": False,
    })
    if report.get("kind") not in (None, "analyticsData#runReport"):
        raise Ga4VerificationError("invalid_ga4_report_shape", report_status)
    headers = report.get("metricHeaders")
    if not isinstance(headers, list) or [h.get("name") if isinstance(h, dict) else None
                                         for h in headers] != ["activeUsers", "eventCount"]:
        raise Ga4VerificationError("invalid_ga4_metric_headers", report_status)
    rows = report.get("rows", [])
    if not isinstance(rows, list) or len(rows) > 1:
        raise Ga4VerificationError("invalid_ga4_rows", report_status)
    if rows:
        row = rows[0]
        if not isinstance(row, dict) or not isinstance(row.get("metricValues"), list) or len(
            row["metricValues"]) != 2:
            raise Ga4VerificationError("invalid_ga4_metric_values", report_status)
        for metric in row["metricValues"]:
            if not isinstance(metric, dict) or not isinstance(metric.get("value"), str):
                raise Ga4VerificationError("invalid_ga4_metric_values", report_status)
            try:
                numeric = float(metric["value"])
            except (ValueError, OverflowError):
                raise Ga4VerificationError("invalid_ga4_metric_values", report_status) from None
            if not (0 <= numeric < float("inf")):
                raise Ga4VerificationError("invalid_ga4_metric_values", report_status)
    return {
        "status": "authenticated_report_with_rows" if rows else "authenticated_empty_report",
        "metadataHttp": metadata_status, "reportHttp": report_status,
        "rows": len(rows), "property": PROPERTY,
        "limitations": "Empty reports can mean no qualifying events or reporting lag, not zero site traffic.",
    }


def main() -> int:
    if os.environ.get("GITHUB_REPOSITORY") != EXPECTED_REPO or os.environ.get("GITHUB_REF") != EXPECTED_REF:
        print("GA4_VERIFICATION=BLOCKED category=untrusted_repository_or_ref")
        return 1
    token = os.environ.get("GA4_ACCESS_TOKEN", "")
    if not token:
        print("GA4_VERIFICATION=BLOCKED category=ga4_access_token_missing")
        return 1
    try:
        outcome = inspect(token)
    except Ga4VerificationError as exc:
        print("GA4_VERIFICATION=BLOCKED category=" + exc.category
              + " httpStatus=" + ("N/A" if exc.code is None else str(exc.code)))
        return 1
    print("GA4_VERIFICATION=VERIFIED property=" + PROPERTY
          + " metadataHttp=" + str(outcome["metadataHttp"])
          + " runReportHttp=" + str(outcome["reportHttp"])
          + " result=" + outcome["status"])
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with open(path, "a", encoding="utf-8") as summary:
            summary.write("### Direct GA4 Data API — read-only OIDC verification\n"
                          "- Property: `" + PROPERTY + "`\n"
                          "- Metric metadata: **HTTP 200**; runReport: **HTTP 200**\n"
                          "- Result: **" + outcome["status"] + "**; raw metrics suppressed\n"
                          "- Empty rows do not establish zero visits or GA4 tag installation.\n"
                          "- Service-account GA4 Administrator access remains an owner-approved elevated role; consider Viewer after verifying reads.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
