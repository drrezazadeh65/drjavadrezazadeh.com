"""Private owner-selected document vault for the Windows JREI command center.

Data comes ONLY from explicit browser file selection on authenticated loopback.
No arbitrary filesystem paths, external upload, shell calls, model execution or
production writes. PDF extraction requires an already installed local pypdf;
the server never downloads packages or performs unsupported OCR.
"""
from __future__ import annotations

import base64
import binascii
from datetime import datetime, timezone
import hashlib
import io
import json
from pathlib import Path
import re
import secrets
import zipfile
from xml.etree import ElementTree as ET

MAX_BYTES = 4_000_000
MAX_EXTRACTED = 80_000
ALLOWED = frozenset((".txt", ".md", ".csv", ".json", ".py", ".js", ".mjs",
                     ".html", ".css", ".docx", ".pdf"))
IDENT = re.compile(r"^[a-f0-9]{32}$")


def _directory(private: Path, create: bool = False) -> Path:
    root = private.resolve(strict=True)
    vault = root / "owner-documents"
    if vault.is_symlink():
        raise ValueError("JREI_VAULT_SYMLINK_BLOCKED")
    if create:
        vault.mkdir(parents=True, exist_ok=True)
    if not vault.is_dir() or not vault.resolve(strict=True).is_relative_to(root):
        raise ValueError("JREI_VAULT_NOT_READY")
    return vault


def _document_path(private: Path, identifier: str) -> Path:
    if not isinstance(identifier, str) or not IDENT.fullmatch(identifier):
        raise ValueError("JREI_DOCUMENT_ID_INVALID")
    vault = _directory(private)
    folder = vault / identifier
    if folder.is_symlink() or not folder.is_dir():
        raise ValueError("JREI_DOCUMENT_NOT_FOUND")
    if not folder.resolve(strict=True).is_relative_to(vault.resolve(strict=True)):
        raise ValueError("JREI_DOCUMENT_OUT_OF_SCOPE")
    return folder


def _docx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as doc:
        entries = doc.infolist()
        if len(entries) > 180 or sum(e.file_size for e in entries) > 15_000_000:
            raise ValueError("JREI_DOCX_ZIP_SIZE_EXCEEDED")
        info = doc.getinfo("word/document.xml")
        if info.file_size > 7_000_000 or info.compress_size > MAX_BYTES:
            raise ValueError("JREI_DOCX_XML_TOO_LARGE")
        root = ET.fromstring(doc.read(info))
    # Preserve paragraph order without invoking external Office applications.
    ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    paragraphs = []
    for paragraph in root.iter(ns + "p"):
        line = "".join(node.text or "" for node in paragraph.iter(ns + "t"))
        if line.strip():
            paragraphs.append(line)
        if sum(len(v) for v in paragraphs) >= MAX_EXTRACTED:
            break
    return "\n".join(paragraphs)[:MAX_EXTRACTED]


def _pdf_text(data: bytes) -> tuple[str, str]:
    try:
        from pypdf import PdfReader  # optional existing library; no installation
    except ImportError:
        return "", "PDF_READER_NOT_INSTALLED"
    reader = PdfReader(io.BytesIO(data), strict=False)
    if reader.is_encrypted:
        return "", "ENCRYPTED_PDF_NOT_EXTRACTED"
    pages = []
    for index in range(min(18, len(reader.pages))):
        pages.append(reader.pages[index].extract_text() or "")
        if sum(len(p) for p in pages) > MAX_EXTRACTED:
            break
    text = "\n\n".join(pages)[:MAX_EXTRACTED]
    return text, "EXTRACTED_FIRST_18_PAGES" if text.strip() else "PDF_SCANNED_OR_NO_TEXT"


def _extract(name: str, data: bytes) -> tuple[str, str]:
    suffix = Path(name).suffix.lower()
    if suffix == ".docx":
        value = _docx_text(data)
        return value, "DOCX_TEXT_EXTRACTED" if value.strip() else "DOCX_NO_TEXT"
    if suffix == ".pdf":
        return _pdf_text(data)
    try:
        value = data.decode("utf-8-sig")
    except UnicodeDecodeError:
        return "", "TEXT_ENCODING_NOT_UTF8"
    if "\x00" in value:
        return "", "BINARY_TEXT_REJECTED"
    return value[:MAX_EXTRACTED], "TEXT_EXTRACTED"


def import_document(*, private: Path, name: str, data_base64: str) -> dict:
    if not isinstance(name, str) or not 1 <= len(name) <= 90 or \
       name in (".", "..") or name.startswith(".") or \
       re.search(r"[/\\\x00-\x1f]", name):
        raise ValueError("JREI_DOCUMENT_FILENAME_INVALID")
    if Path(name).suffix.lower() not in ALLOWED:
        raise ValueError("JREI_DOCUMENT_TYPE_NOT_SUPPORTED")
    if not isinstance(data_base64, str) or len(data_base64) > 5_500_000:
        raise ValueError("JREI_DOCUMENT_PAYLOAD_TOO_LARGE")
    try:
        raw = base64.b64decode(data_base64, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("JREI_DOCUMENT_BASE64_INVALID") from exc
    if not 1 <= len(raw) <= MAX_BYTES:
        raise ValueError("JREI_DOCUMENT_SIZE_LIMIT")
    extension = Path(name).suffix.lower()
    if extension == ".pdf" and not raw.startswith(b"%PDF-"):
        raise ValueError("JREI_DOCUMENT_PDF_HEADER_INVALID")
    if extension == ".docx" and not raw.startswith(b"PK"):
        raise ValueError("JREI_DOCUMENT_DOCX_HEADER_INVALID")
    try:
        text, extraction = _extract(name, raw)
    except Exception:
        # Fail closed for untrusted malformed document/parser inputs.
        # An extraction failure does not imply a successful document read.
        text, extraction = "", "EXTRACTION_REJECTED"
    vault = _directory(private, create=True)
    ident = secrets.token_hex(16)
    folder = vault / ident
    folder.mkdir(mode=0o700)
    try:
        source_name = "original" + extension
        with (folder / source_name).open("xb") as output:
            output.write(raw)
        if text:
            with (folder / "text.txt").open("x", encoding="utf-8") as output:
                output.write(text)
        metadata = {
            "id": ident, "name": name,
            "size": len(raw), "sha256": hashlib.sha256(raw).hexdigest(),
            "source_name": source_name, "extraction": extraction,
            "extracted_chars": len(text),
            "text_sha256": hashlib.sha256(text.encode("utf-8")).hexdigest()
                           if text else None,
            "created": datetime.now(timezone.utc).isoformat(),
            "scope": "PRIVATE_WINDOWS_ONLY",
            "production_changed": False
        }
        with (folder / "manifest.json").open("x", encoding="utf-8") as out:
            json.dump(metadata, out, ensure_ascii=False, indent=2)
        return metadata
    except (OSError, ValueError, TypeError):
        # On failed writes, remove only newly created files in this unique
        # local vault folder; never touch user originals on disk.
        if not folder.is_symlink():
            for file in ("manifest.json", "text.txt", "original" + extension):
                candidate = folder / file
                if candidate.is_file() and not candidate.is_symlink():
                    candidate.unlink(missing_ok=True)
            try:
                folder.rmdir()
            except OSError:
                pass
        raise


def excerpt(*, private: Path, identifier: str, limit: int = 3000) -> tuple[str, dict]:
    folder = _document_path(private, identifier)
    manifest = folder / "manifest.json"
    content = folder / "text.txt"
    if manifest.is_symlink() or not manifest.is_file() or manifest.stat().st_size > 5000:
        raise ValueError("JREI_DOCUMENT_MANIFEST_INVALID")
    record = json.loads(manifest.read_text(encoding="utf-8"))
    if not isinstance(record, dict) or record.get("id") != identifier:
        raise ValueError("JREI_DOCUMENT_MANIFEST_ID_INVALID")
    if content.is_symlink() or not content.is_file() or content.stat().st_size > 400000:
        raise ValueError("JREI_DOCUMENT_TEXT_UNAVAILABLE")
    text = content.read_text(encoding="utf-8")
    if hashlib.sha256(text.encode("utf-8")).hexdigest() != record.get("text_sha256"):
        raise ValueError("JREI_DOCUMENT_TEXT_CHANGED")
    return text[:min(5000, max(200, limit))], record


def delete_document(*, private: Path, identifier: str) -> dict:
    folder = _document_path(private, identifier)
    manifest_path = folder / "manifest.json"
    if not manifest_path.is_file() or manifest_path.is_symlink():
        raise ValueError("JREI_DOCUMENT_MANIFEST_INVALID")
    record = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(record, dict) or record.get("id") != identifier or \
       record.get("source_name") not in {"original" + ext for ext in ALLOWED}:
        raise ValueError("JREI_DOCUMENT_MANIFEST_INVALID")
    for name in (record["source_name"], "text.txt", "manifest.json"):
        target = folder / name
        if target.is_symlink():
            raise ValueError("JREI_DOCUMENT_SYMLINK_BLOCKED")
        if target.is_file():
            target.unlink()
    folder.rmdir()
    return {"id": identifier, "state": "PRIVATE_DOCUMENT_DELETED"}


def list_documents(*, private: Path) -> list:
    """List private metadata without returning the original document bytes."""
    try:
        vault = _directory(private)
    except (ValueError, OSError):
        return []
    entries = []
    for folder in sorted(vault.iterdir(), reverse=True):
        if len(entries) >= 40:
            break
        if not folder.is_dir() or folder.is_symlink() or not IDENT.fullmatch(folder.name):
            continue
        manifest = folder / "manifest.json"
        if not manifest.is_file() or manifest.is_symlink() or manifest.stat().st_size > 5000:
            continue
        try:
            entry = json.loads(manifest.read_text(encoding="utf-8"))
            if not isinstance(entry, dict) or entry.get("id") != folder.name:
                continue
            entries.append({key: entry.get(key) for key in
                            ("id", "name", "size", "sha256", "extraction",
                             "extracted_chars", "created")})
        except (ValueError, OSError, TypeError):
            continue
    return entries
