#!/usr/bin/env python3
"""Bounded, read-only Search Console sitemap and URL Inspection smoke test.

No OAuth keys, tokens, URL-level results, or response bodies are persisted.
"""
from __future__ import annotations

import os
import sys
import urllib.parse

from gsc_oidc_verify import EXPECTED_PROPERTY, VerificationError, request_google

SITEMAPS = ("https://drjavadrezazadeh.com/sitemap.xml",)
INSPECT_URLS = ("https://drjavadrezazadeh.com/fa/",)
API_ROOT = "https://www.googleapis.com"
EXPECTED_REPO = "drrezazadeh65/drjavadrezazadeh.com"
EXPECTED_REF = "refs/heads/migration/bertina-linux6"


def probe(token: str) -> dict:
    property_encoded = urllib.parse.quote(EXPECTED_PROPERTY, safe="")
    sitemap_endpoint = API_ROOT + "/webmasters/v3/sites/" + property_encoded + "/sitemaps"
    sitemap_status, sitemap_data = request_google(token, sitemap_endpoint)
    entries = sitemap_data.get("sitemap", [])
    if not isinstance(entries, list):
        raise VerificationError("invalid_sitemap_list", sitemap_status)
    # URL Inspection is a separate API call and must not be inferred from analytics success.
    inspection_endpoint = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
    inspection_status, inspection_data = request_google(token, inspection_endpoint, {
        "inspectionUrl": INSPECT_URLS[0],
        "siteUrl": EXPECTED_PROPERTY,
        "languageCode": "en-US",
    })
    result = inspection_data.get("inspectionResult")
    if not isinstance(result, dict):
        raise VerificationError("invalid_inspection_result", inspection_status)
    index = result.get("indexStatusResult")
    if not isinstance(index, dict):
        raise VerificationError("missing_index_status", inspection_status)
    return {
        "sitemapsHttp": sitemap_status,
        "sitemapsReturned": len(entries),
        "inspectionHttp": inspection_status,
        "inspectionResultPresent": True,
        # Do not print URL-specific indexing/canonical/coverage findings to CI logs.
    }


def main() -> int:
    if os.environ.get("GITHUB_REPOSITORY") != EXPECTED_REPO or os.environ.get("GITHUB_REF") != EXPECTED_REF:
        print("GSC_READONLY_PROBES=BLOCKED category=untrusted_repository_or_ref")
        return 1
    token = os.environ.get("GSC_ACCESS_TOKEN", "")
    if not token:
        print("GSC_READONLY_PROBES=BLOCKED category=oidc_access_token_missing")
        return 1
    try:
        result = probe(token)
    except VerificationError as exc:
        print("GSC_READONLY_PROBES=BLOCKED category=" + exc.category
              + " httpStatus=" + str(exc.http_status or "N/A"))
        return 1
    print("GSC_READONLY_PROBES=VERIFIED sitemapsHttp=" + str(result["sitemapsHttp"])
          + " inspectionHttp=" + str(result["inspectionHttp"])
          + " sitemapsReturned=" + str(result["sitemapsReturned"]))
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write("### Independent GSC read-only probes\n"
                    "- Sitemap listing: **HTTP 200**; count: " + str(result["sitemapsReturned"]) + "\n"
                    "- URL Inspection: **HTTP 200**, structured index status received\n"
                    "- Inspection result is not proof of indexed status; no URL-level results retained.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
