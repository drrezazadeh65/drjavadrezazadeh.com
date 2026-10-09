#!/usr/bin/env python3
"""Offline AI discoverability preflight. Stdlib only; never modifies the site."""
import argparse
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonicals = []
        self.alternates = []
        self.robots = []
        self.titles = []
        self.jsonld = []
        self._title = False
        self._ld = False
        self._ld_text = ""
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "link" and "canonical" in a.get("rel", "").lower().split():
            self.canonicals.append(a.get("href", ""))
        if tag == "link" and "alternate" in a.get("rel", "").lower().split() and a.get("hreflang"):
            self.alternates.append((a["hreflang"], a.get("href", "")))
        if tag == "meta" and a.get("name", "").lower() in ("robots", "googlebot", "bingbot"):
            self.robots.append(a.get("content", "").lower())
        if tag == "title": self._title = True
        if tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self._ld = True
            self._ld_text = ""
    def handle_data(self, data):
        if self._title: self.titles.append(data)
        if self._ld: self._ld_text += data
    def handle_endtag(self, tag):
        if tag == "title": self._title = False
        if tag == "script" and self._ld:
            try: self.jsonld.append(json.loads(self._ld_text))
            except (ValueError, TypeError): self.jsonld.append(None)
            self._ld = False

def audit(root, origin):
    results = []
    for path in sorted(root.rglob("*.html")):
        p = PageParser()
        try: p.feed(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError) as e:
            results.append({"path": str(path.relative_to(root)), "issues": ["unreadable: " + str(e)]})
            continue
        issues = []
        if len(p.canonicals) != 1: issues.append("expected exactly one canonical")
        else:
            u = urlparse(p.canonicals[0])
            if u.scheme != "https" or u.netloc != urlparse(origin).netloc: issues.append("canonical origin mismatch")
        if not "".join(p.titles).strip(): issues.append("missing title")
        if any("noindex" in x for x in p.robots):
            status = "NOINDEX"
        else:
            status = "INDEXABILITY_UNVERIFIED"
        if any(x is None for x in p.jsonld): issues.append("invalid JSON-LD syntax")
        locales = {lang for lang, _ in p.alternates}
        if locales and not {"fa", "en"}.issubset(locales): issues.append("incomplete bilingual hreflang")
        for lang, href in p.alternates:
            u = urlparse(href)
            if u.scheme != "https" or u.netloc != urlparse(origin).netloc:
                issues.append("invalid hreflang target origin: " + lang)
        results.append({"path": str(path.relative_to(root)), "status": status, "issues": sorted(set(issues))})
    return {"scope": "offline HTML only; no live crawl, indexing, reciprocal hreflang, or schema semantics verified", "pages": results, "page_count": len(results), "pages_with_issues": sum(bool(x["issues"]) for x in results)}

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("root", type=Path)
    ap.add_argument("--origin", default="https://drjavadrezazadeh.com")
    args = ap.parse_args()
    if not args.root.is_dir(): ap.error("root must be a directory")
    print(json.dumps(audit(args.root, args.origin), ensure_ascii=False, indent=2))
