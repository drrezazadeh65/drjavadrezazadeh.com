#!/usr/bin/env python3
"""Bounded owner-requested GSC URL Inspection sample, using the existing OIDC token.

No sitemap writes, URL submissions, browser identifiers, provider secrets, or
URL-level inspection responses are logged or committed. This cannot retrieve
the property-wide Google Page Indexing report (there is no bulk coverage API).
"""
from __future__ import annotations

from collections import Counter
import json
import os
from pathlib import Path
import sys
import urllib.parse
import xml.etree.ElementTree as ET

from gsc_oidc_verify import EXPECTED_PROPERTY, VerificationError, request_google

REPO = "drrezazadeh65/drjavadrezazadeh.com"
REF = "refs/heads/migration/bertina-linux6"
API = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
SIZES = (24, 54, 90)
MAX_SITEMAPS = 12
MAX_XML_BYTES = 400_000
ROOT = Path(__file__).resolve().parents[1]
PUBLIC_PREFIXES = ("/fa/", "/en/", "/journal/")
PRIORITY = (
    "/", "/fa/", "/en/", "/fa/khadamat/", "/fa/services/", "/en/services/",
    "/fa/vip/", "/en/vip/", "/fa/golden-talent/", "/en/golden-talent/",
    "/fa/entekhab-reshteh/", "/en/student-guidance/", "/fa/shop/", "/en/shop/",
    "/fa/shop/authors/mehrab-mirkarimi/",
    "/en/shop/authors/mehrab-mirkarimi/", "/journal/",
    "/fa/akhbar/international-research-collaboration-2026/",
    "/fa/akhbar/ai-search-and-scientific-content-2026/",
)


def _verified_route(url: str) -> str | None:
    if not isinstance(url, str) or not url.startswith(EXPECTED_PROPERTY):
        return None
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme != "https" or parsed.netloc != "drjavadrezazadeh.com"
            or parsed.query or parsed.fragment or parsed.username or parsed.password):
        return None
    route = parsed.path
    if not route.startswith("/") or (route != "/" and not route.endswith("/")):
        return None
    if route != "/" and not route.startswith(PUBLIC_PREFIXES):
        return None
    if ".." in route or "%" in route or "//" in route:
        return None
    return route


def _read_xml(root: Path, relative: str) -> ET.Element:
    if relative.startswith("/") or ".." in Path(relative).parts:
        raise ValueError("unapproved_sitemap_location")
    file = root / relative
    if not file.is_file() or file.stat().st_size > MAX_XML_BYTES:
        raise ValueError("missing_or_oversize_sitemap")
    try:
        return ET.fromstring(file.read_bytes())
    except ET.ParseError as exc:
        raise ValueError("invalid_sitemap_xml") from exc


def sitemap_inventory(root: Path = ROOT) -> list[str]:
    index = _read_xml(root, "sitemap.xml")
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sources = [e.text for e in index.findall("./sm:sitemap/sm:loc", ns)]
    if not sources or len(sources) > MAX_SITEMAPS:
        raise ValueError("invalid_sitemap_index")
    try:
        manifest = json.loads((root / "platform/public-url-stability-manifest.json").read_text("utf-8"))
    except (OSError, ValueError) as exc:
        raise ValueError("missing_frozen_url_manifest") from exc
    if manifest.get("production_origin") != EXPECTED_PROPERTY.rstrip("/"):
        raise ValueError("wrong_frozen_url_origin")
    allowed = set(manifest.get("frozen_indexable_routes", ()))
    # The frozen October 8 baseline deliberately does NOT list all later-added
    # approved public offers. Extend only from the authoritative 21+6 catalogs;
    # never add arbitrary account, checkout or assessment routes.
    for source_file, family in (("service-catalog.json", "services"),
                                ("vip-catalog.json", "vip")):
        try:
            catalogue = json.loads((root / "assets/data" / source_file).read_text("utf-8"))
            for entry in catalogue["services"]:
                item_id = entry["id"]
                if not isinstance(item_id, str) or not item_id or not all(
                        c.isascii() and (c.isalnum() or c in "_-") for c in item_id):
                    raise ValueError("invalid_approved_service_id")
                for lang in ("fa", "en"):
                    allowed.add("/" + lang + "/" + family + "/" + item_id + "/")
        except (OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
            raise ValueError("approved_catalogue_unavailable") from exc
    candidates = set()
    for source in sources:
        if not isinstance(source, str) or not source.startswith(EXPECTED_PROPERTY):
            raise ValueError("foreign_sitemap")
        relative = urllib.parse.urlsplit(source).path.lstrip("/")
        xml = _read_xml(root, relative)
        for loc in xml.findall("./sm:url/sm:loc", ns):
            route = _verified_route(loc.text or "")
            if route not in allowed:
                continue
            file = root / (route.lstrip("/") + "index.html")
            if file.is_file():
                candidates.add(EXPECTED_PROPERTY.rstrip("/") + route)
    if not candidates:
        raise ValueError("empty_public_sitemap_inventory")
    def rank(url: str):
        route = urllib.parse.urlsplit(url).path
        if route in PRIORITY:
            return (0, PRIORITY.index(route), route)
        if "/services/" in route or "/vip/" in route:
            return (1, route.replace("/en/", "/0/").replace("/fa/", "/1/"), route)
        if "/akhbar/" in route or "/news/" in route:
            return (2, route, route)
        return (3, route, route)
    return sorted(candidates, key=rank)


def section_for_url(url: str) -> str:
    route = _verified_route(url)
    if route is None:
        raise ValueError("invalid_sampling_url")
    if (route.startswith(("/fa/services/", "/en/services/",
                          "/fa/vip/", "/en/vip/"))):
        return "services"
    if route.startswith("/fa/rahnamaha/"):
        return "guides"
    if route.startswith(("/fa/akhbar/", "/en/news/")):
        return "news"
    if route.startswith("/journal/"):
        return "journal"
    return "other"


def _balanced_language_order(urls: list[str]) -> list[str]:
    """Stable, paired FA/EN pages: do not sample only EN when a stratum is cut."""
    groups = {}
    for url in sorted(urls):
        route = _verified_route(url)
        if route.startswith(("/en/", "/fa/")):
            key = route[4:]
            lang = route[1:3]
        elif route.startswith("/journal/fa/"):
            key = "/journal/" + route[len("/journal/fa/"):]
            lang = "fa"
        else:
            key = route
            lang = "en"
        groups.setdefault(key, {})[lang] = url
    ordered = []
    for key in sorted(groups):
        ordered.extend(groups[key][lang] for lang in ("fa", "en") if lang in groups[key])
    return ordered


def select_sample(inventory: list[str], limit: int) -> list[str]:
    """Deterministic section-balanced sample; anchored owner-priority pages first.

    Inclusion is not a random or statistical estimate of Google's property-wide
    coverage. A chosen URL must exist in the approved sitemap inventory.
    """
    if limit not in SIZES:
        raise ValueError("unapproved_sample_size")
    unique = set(inventory)
    if len(unique) != len(inventory):
        raise ValueError("duplicate_sitemap_candidate")
    if any(_verified_route(url) is None for url in inventory):
        raise ValueError("invalid_sitemap_candidate")
    pri = {url: PRIORITY.index(_verified_route(url)) for url in inventory
           if _verified_route(url) in PRIORITY}
    anchor = [url for url, _ in sorted(pri.items(), key=lambda p: p[1])]
    if len(anchor) >= limit:
        return anchor[:limit]
    result = anchor[:]
    pool = {section: _balanced_language_order(
        [u for u in inventory if u not in pri and section_for_url(u) == section]
    ) for section in ("services", "guides", "news", "journal", "other")}
    weights = {"services": 0.30, "guides": 0.25, "news": 0.15,
               "journal": 0.15, "other": 0.15}
    selected = {s: 0 for s in pool}
    while len(result) < limit and any(pool.values()):
        # Weighted fair queue keeps the guide/news/journal cohorts represented,
        # instead of exhausting all 54 public service details before any guides.
        available = [s for s in pool if pool[s]]
        section = min(available, key=lambda s: (selected[s] / weights[s],
                                                 list(weights).index(s)))
        result.append(pool[section].pop(0))
        selected[section] += 1
    return result


def coverage_group(index: dict) -> str:
    if not isinstance(index, dict):
        return "unknown"
    coverage = str(index.get("coverageState") or "").lower()
    verdict = str(index.get("verdict") or "").upper()
    if "crawled" in coverage and "not indexed" in coverage:
        return "crawled_not_indexed"
    if "discovered" in coverage and "not indexed" in coverage:
        return "discovered_not_indexed"
    if "unknown to google" in coverage:
        return "not_known"
    if "noindex" in coverage or index.get("indexingState") == "BLOCKED_BY_META_TAG":
        return "noindex"
    if "robots.txt" in coverage or index.get("robotsTxtState") == "DISALLOWED":
        return "robots_blocked"
    if "alternate page" in coverage or "duplicate" in coverage or "canonical" in coverage:
        return "canonicalized_or_duplicate"
    if "404" in coverage or "not found" in coverage or "server error" in coverage:
        return "fetch_or_http_error"
    if "redirect" in coverage:
        return "redirected"
    if verdict == "PASS" and ("indexed" in coverage or not coverage):
        return "indexed"
    return "other_or_unknown"


def inspect_sample(token: str, urls: list[str]) -> dict:
    counts = Counter()
    sections = {}
    canonical = Counter()
    crawl_recency = Counter()
    for url in urls:
        if _verified_route(url) is None:
            raise ValueError("nonpublic_or_unapproved_inspection_url")
        _, result = request_google(token, API, {
            "inspectionUrl": url, "siteUrl": EXPECTED_PROPERTY, "languageCode": "en-US"
        })
        index = result.get("inspectionResult", {}).get("indexStatusResult")
        if not isinstance(index, dict):
            raise VerificationError("missing_index_status")
        group = coverage_group(index)
        counts[group] += 1
        section = section_for_url(url)
        details = sections.setdefault(section, Counter())
        details[group] += 1
        selected_canonical = index.get("googleCanonical")
        if not selected_canonical:
            canonical["unreported"] += 1
        elif selected_canonical == url:
            canonical["self"] += 1
        else:
            canonical["different"] += 1
        crawl_recency["timestamp_present" if index.get("lastCrawlTime")
                      else "not_reported"] += 1
    return {
        "sampled": len(urls),
        "buckets": dict(sorted(counts.items())),
        "sections": {key: dict(sorted(sections[key].items()))
                     for key in sorted(sections)},
        "canonicalSelection": dict(sorted(canonical.items())),
        "lastCrawlTimestamp": dict(sorted(crawl_recency.items())),
    }


def main() -> int:
    if (os.environ.get("GITHUB_REPOSITORY") != REPO
            or os.environ.get("GITHUB_REF") != REF
            or os.environ.get("GITHUB_EVENT_NAME") != "workflow_dispatch"):
        print("GSC_INDEXATION_TRIAGE=BLOCKED reason=not_owner_initiated_context")
        return 1
    token = os.environ.get("GSC_ACCESS_TOKEN", "")
    if not token:
        print("GSC_INDEXATION_TRIAGE=BLOCKED reason=missing_oidc_token")
        return 1
    try:
        limit = int(os.environ.get("GSC_TRIAGE_LIMIT", "54"))
        if limit not in SIZES:
            raise ValueError("unapproved_sample_size")
        inventory = sitemap_inventory()
        sample = select_sample(inventory, limit)
        result = inspect_sample(token, sample)
        if result["sampled"] != len(sample):
            raise ValueError("incomplete_inspection_sample")
    except (ValueError, VerificationError, OSError) as exc:
        reason = exc.category if isinstance(exc, VerificationError) else str(exc)
        print("GSC_INDEXATION_TRIAGE=BLOCKED reason=" + reason[:65])
        return 1
    # Aggregated counts only. NEVER log raw per-URL inspection, query or owner metrics.
    print("GSC_INDEXATION_TRIAGE=OBSERVED sample=" + str(result["sampled"])
          + " sitemap_candidates=" + str(len(inventory))
          + " coverage=" + json.dumps(result["buckets"], sort_keys=True)
          + " sections=" + json.dumps(result["sections"], sort_keys=True)
          + " canonicalSelection=" + json.dumps(result["canonicalSelection"], sort_keys=True))
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as file:
            file.write("### Direct Google URL Inspection: bounded sample\n")
            file.write("- Candidate source URLs: " + str(len(inventory)) + "\n")
            file.write("- Sample inspected: " + str(result["sampled"]) + "\n")
            for bucket, count in result["buckets"].items():
                file.write("- " + bucket + ": " + str(count) + "\n")
            file.write("- By section (cohort counts, not a statistically random sample):\n")
            for section, entries in result["sections"].items():
                file.write("  - " + section + ": " + json.dumps(entries, sort_keys=True) + "\n")
            file.write("- Selected canonical: " + json.dumps(result["canonicalSelection"], sort_keys=True) + "\n")
            file.write("- Last crawl timestamp: " + json.dumps(result["lastCrawlTimestamp"], sort_keys=True) + "\n")
            file.write("- This is NOT the property-wide Page Indexing report, an indexing guarantee, or a live sitemap submission.\n")
            file.write("- No URL-specific inspection data or Google credentials retained.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
