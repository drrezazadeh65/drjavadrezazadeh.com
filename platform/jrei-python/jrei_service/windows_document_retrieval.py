"""Evidence-limited retrieval from explicitly imported private Windows documents.

No network, shell, arbitrary filesystem traversal, persistent index or model-selected
permissions. A retrieved passage is source text, never an instruction or verified fact.
Existing vault IDs and SHA-256 integrity checks remain authoritative.
"""
from __future__ import annotations

import hashlib
import io
import json
from pathlib import Path
import re
import unicodedata

from jrei_service.windows_document_vault import _document_path, MAX_BYTES, MAX_EXTRACTED

MAX_EVIDENCE = 5
MAX_PER_DOCUMENT = 3
MAX_PASSAGE = 1100
MAX_PROMPT_CHARS = 6100
_STOPWORDS = frozenset({
    "این", "آن", "است", "هست", "بود", "را", "در", "از", "به", "که", "با",
    "برای", "یک", "های", "ها", "چه", "چرا", "چگونه", "آیا", "کن", "بده",
    "لطفا", "لطفاً", "فایل", "سند", "متن", "مقاله", "خلاصه", "بررسی",
    "the", "and", "for", "that", "this", "with", "from", "what", "how",
    "please", "about", "file", "document", "summarize", "summary",
    "review", "explain", "analyse", "analyze", "is", "are", "was", "were",
})


def _normal(text: str) -> str:
    return (unicodedata.normalize("NFKC", text).casefold()
            .replace("ي", "ی").replace("ك", "ک")
            .replace("\u200c", " ").replace("\u200f", " "))


def _terms(query: str) -> list[str]:
    words = re.findall(r"[\w\u0600-\u06ff]{2,}", _normal(query)[:950])
    terms = [word for word in words if word not in _STOPWORDS and len(word) >= 3]
    return list(dict.fromkeys(terms))[:16]


def _hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _manifest_and_text(private: Path, identifier: str):
    folder = _document_path(private, identifier)
    manifest_file = folder / "manifest.json"
    text_file = folder / "text.txt"
    if (manifest_file.is_symlink() or not manifest_file.is_file() or
            manifest_file.stat().st_size > 5000):
        raise ValueError("JREI_DOCUMENT_MANIFEST_INVALID")
    record = json.loads(manifest_file.read_text(encoding="utf-8"))
    if (not isinstance(record, dict) or record.get("id") != identifier or
            not isinstance(record.get("sha256"), str) or
            not isinstance(record.get("name"), str) or
            record.get("source_name") != "original" + Path(record["name"]).suffix.lower()):
        raise ValueError("JREI_DOCUMENT_MANIFEST_INVALID")
    # Verify the vault's ORIGINAL source for every document format, not just
    # PDF/OOXML. A valid extracted text hash alone cannot attest its original.
    original = folder / record["source_name"]
    if (original.is_symlink() or not original.is_file() or
            original.stat().st_size > MAX_BYTES or
            not re.fullmatch(r"[0-9a-f]{64}", record["sha256"])):
        raise ValueError("JREI_DOCUMENT_ORIGINAL_INVALID")
    digest = hashlib.sha256()
    with original.open("rb") as source_stream:
        for block in iter(lambda: source_stream.read(65536), b""):
            digest.update(block)
    if digest.hexdigest() != record["sha256"]:
        raise ValueError("JREI_DOCUMENT_ORIGINAL_INTEGRITY_FAILED")
    if (text_file.is_symlink() or not text_file.is_file() or
            text_file.stat().st_size > 400_000):
        raise ValueError("JREI_DOCUMENT_TEXT_UNAVAILABLE")
    text = text_file.read_text(encoding="utf-8")
    if (not text.strip() or len(text) > MAX_EXTRACTED or
            _hash(text) != record.get("text_sha256")):
        raise ValueError("JREI_DOCUMENT_TEXT_INTEGRITY_FAILED")
    return folder, record, text


def _chunks(value: str, anchor: str) -> list[dict]:
    """Keep deterministic, bounded sub-passages with their original anchor."""
    return [{"anchor": anchor + (f" · part {i // MAX_PASSAGE + 1}"
                                if len(value) > MAX_PASSAGE else ""),
             "text": value[i:i + MAX_PASSAGE]}
            for i in range(0, len(value), MAX_PASSAGE)
            if value[i:i + MAX_PASSAGE].strip()]


def _line_passages(text: str, kind: str) -> list[dict]:
    # Line ranges are genuine for text files; DOCX extraction preserves
    # paragraphs, so its anchors explicitly say paragraph rather than page.
    label = "paragraph" if kind == ".docx" else "line"
    passages, acc, start, last = [], [], None, None
    size = 0

    def flush() -> None:
        nonlocal acc, start, last, size
        if acc:
            anchor = f"{label} {start}" if start == last else f"{label}s {start}–{last}"
            passages.extend(_chunks("\n".join(acc), anchor))
        acc, start, last, size = [], None, None, 0

    for n, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line:
            continue
        if len(line) > MAX_PASSAGE:
            flush()
            passages.extend(_chunks(line, f"{label} {n}"))
            continue
        if size + len(line) + 1 > MAX_PASSAGE:
            flush()
        if start is None:
            start = n
        last = n
        acc.append(line)
        size += len(line) + 1
    flush()
    return passages


def _pdf_passages(folder: Path, record: dict) -> tuple[list[dict], str]:
    source = folder / record["source_name"]
    if source.is_symlink() or not source.is_file() or source.stat().st_size > MAX_BYTES:
        raise ValueError("JREI_DOCUMENT_ORIGINAL_INVALID")
    raw = source.read_bytes()
    if hashlib.sha256(raw).hexdigest() != record["sha256"] or not raw.startswith(b"%PDF-"):
        raise ValueError("JREI_DOCUMENT_ORIGINAL_INTEGRITY_FAILED")
    try:
        from pypdf import PdfReader
    except ImportError:
        return [], "PDF_PAGE_PARSER_UNAVAILABLE"
    try:
        reader = PdfReader(io.BytesIO(raw), strict=False)
        if reader.is_encrypted:
            return [], "ENCRYPTED_PDF_NO_PAGE_EVIDENCE"
        passages, used = [], 0
        for n in range(min(len(reader.pages), 18)):
            remaining = MAX_EXTRACTED - used
            if remaining <= 0:
                break
            page = (reader.pages[n].extract_text() or "")[:remaining]
            used += len(page)
            passages.extend(_chunks(page, f"page {n + 1}"))
        coverage = ("PDF_FIRST_18_PAGES_ONLY" if len(reader.pages) > 18 else
                    "PDF_EXTRACTABLE_PAGES_WITHIN_BUDGET")
        if used >= MAX_EXTRACTED:
            coverage = "PDF_EXTRACTION_CHAR_BUDGET_REACHED"
        return passages, coverage
    except (OSError, ValueError, TypeError, KeyError, IndexError):
        return [], "PDF_PAGE_EXTRACTION_UNAVAILABLE"


def _passages(folder: Path, record: dict, text: str) -> tuple[list[dict], str]:
    kind = Path(record["name"]).suffix.lower()
    if kind in (".pptx", ".xlsx"):
        # The anchor is the actual slide/sheet of the original OOXML
        # archive, never a line pretending to be a slide.
        from jrei_service.windows_office_structures import parse_office
        source = folder / record["source_name"]
        if source.is_symlink() or not source.is_file() or source.stat().st_size > MAX_BYTES:
            raise ValueError("JREI_OFFICE_ORIGINAL_INVALID")
        original = source.read_bytes()
        if hashlib.sha256(original).hexdigest() != record["sha256"]:
            raise ValueError("JREI_OFFICE_ORIGINAL_INTEGRITY_FAILED")
        try:
            sections = parse_office(record["name"], original)
            passages = [
                segment for section in sections
                for segment in _chunks(section.text, section.anchor)
            ]
            return passages, "ORIGINAL_OFFICE_STRUCTURAL_ANCHORS_BOUNDED"
        except (ValueError, OSError, TypeError, KeyError, IndexError):
            # Never infer slide or sheet identifiers from unverified text.
            return _line_passages(text, ".txt"), "OFFICE_PARSER_UNAVAILABLE_UNPAGINATED_FALLBACK"
    if kind != ".pdf":
        return _line_passages(text, kind), (
            "ORIGINAL_EXTRACTION_LIMIT_80000_CHARS" if len(text) >= MAX_EXTRACTED
            else "LOCAL_EXTRACTED_TEXT_ONLY"
        )
    page_items, coverage = _pdf_passages(folder, record)
    if page_items:
        return page_items, coverage
    # Older PDF imports contain unpaginated extracted text. Never invent page
    # numbers when the parser is unavailable at retrieval time.
    return _line_passages(text, ".txt"), coverage + "_UNPAGINATED_FALLBACK"


def _score(query: str, terms: list[str], passage: dict) -> int:
    candidate = _normal(passage["text"])
    if not terms:
        return 0
    hits = [term for term in terms if term in candidate]
    if not hits:
        return 0
    score = sum(4 if len(term) > 5 else 2 for term in hits)
    score += (len(hits) * 10) // len(terms)
    phrase = " ".join(terms[:3])
    if len(terms) > 1 and phrase in candidate:
        score += 8
    return score


def retrieve(*, private: Path, identifiers: list[str], query: str) -> dict:
    """Return evidence for at most two owner-selected document IDs.

    Results contain only bounded source excerpts and checksum metadata.
    The caller must not persist passages in task receipts or expose them to
    the network. All local documents remain under the existing owner vault.
    """
    if (not isinstance(identifiers, list) or not 1 <= len(identifiers) <= 2 or
            len(set(identifiers)) != len(identifiers) or
            not isinstance(query, str) or not 1 <= len(query.strip()) <= 9000):
        raise ValueError("JREI_RETRIEVAL_REQUEST_INVALID")
    terms = _terms(query)
    overview = bool(re.search(
        r"خلاصه|جمع.?بندی|مرور کلی|summari[sz]e|overview|outline", query, re.I))
    candidates_by_document, files = [], []
    for identifier in identifiers:
        try:
            folder, record, source = _manifest_and_text(private, identifier)
            passages, coverage = _passages(folder, record, source)
            if not passages:
                raise ValueError("JREI_DOCUMENT_NO_RETRIEVABLE_PASSAGES")
            ranked = sorted(enumerate(passages),
                            key=lambda pair: (-_score(query, terms, pair[1]), pair[0]))
            if overview or not terms:
                # Coverage samples are distributed; not a substitute for
                # reading the full text or making source-wide scientific claims.
                selected_idx = sorted({0, len(passages) // 2, len(passages) - 1})
                picks = [passages[i] for i in selected_idx[:MAX_PER_DOCUMENT]]
                method = "DISTRIBUTED_OVERVIEW_SAMPLES"
            else:
                picks = [passage for _, passage in ranked
                         if _score(query, terms, passage) > 0][:MAX_PER_DOCUMENT]
                method = "KEYWORD_RETRIEVAL" if picks else "NO_MATCH"
            files.append({"id": identifier, "name": record["name"],
                          "source_sha256": record["sha256"],
                          "extraction": record.get("extraction"),
                          "coverage": coverage, "method": method,
                          "passages_inspected": len(passages),
                          "evidence_count": len(picks), "state": "READ_LOCAL"})
            candidates_by_document.append([
                {"document_id": identifier, "name": record["name"],
                 "source_sha256": record["sha256"], "anchor": item["anchor"],
                 "text": item["text"], "text_sha256": _hash(item["text"])}
                for item in picks
            ])
        except (ValueError, OSError, UnicodeError, TypeError, KeyError, json.JSONDecodeError) as exc:
            files.append({"id": identifier, "state": "UNREADABLE",
                          "reason": str(exc)[:80] if isinstance(exc, ValueError)
                          else exc.__class__.__name__})
            candidates_by_document.append([])
    # Interleave top-ranked passages from selected documents. Previously the
    # first document could consume all 5 result slots and silently starve
    # the second document, even when both had valid matching evidence.
    # Every sampled passage is <= MAX_PASSAGE; the bound is source text only.
    selected, chars = [], 0
    for rank in range(MAX_PER_DOCUMENT):
        for candidates in candidates_by_document:
            if len(selected) >= MAX_EVIDENCE or rank >= len(candidates):
                continue
            item = candidates[rank]
            if chars + len(item["text"]) > MAX_PROMPT_CHARS:
                continue
            selected.append(item)
            chars += len(item["text"])
    selected_counts = {}
    for item in selected:
        key = item["document_id"]
        selected_counts[key] = selected_counts.get(key, 0) + 1
    for file_info in files:
        if file_info.get("state") == "READ_LOCAL":
            file_info["evidence_count"] = selected_counts.get(file_info["id"], 0)
            file_info["candidate_passages_found"] = sum(
                len(items) for items in candidates_by_document
                if items and items[0]["document_id"] == file_info["id"])
            file_info["retrieval_limited"] = (
                file_info["candidate_passages_found"] > file_info["evidence_count"])
    evidence = "\n\n".join(
        f"[{i}] DOCUMENT={item['name']} | ANCHOR={item['anchor']} | "
        f"ORIGINAL_SHA256={item['source_sha256']} | "
        f"EXCERPT_SHA256={item['text_sha256']}\n"
        f"UNTRUSTED EXCERPT:\n{item['text']}"
        for i, item in enumerate(selected, 1)
    )
    receipts = [{"document_id": p["document_id"], "anchor": p["anchor"],
                 "text_sha256": p["text_sha256"], "source_sha256": p["source_sha256"]}
                for p in selected]
    return {"evidence": evidence, "files": files,
            "citations": receipts, "observed_count": len(selected),
            "method": "DETERMINISTIC_PRIVATE_RETRIEVAL",
            "full_document_reviewed": False, "production_changed": False}
