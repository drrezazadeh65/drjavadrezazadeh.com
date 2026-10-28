"""JREI owner-private structural Office extraction, with no new applications.

Inspired by the *document-to-structured-text* goal of Microsoft's MIT
MarkItDown (https://github.com/microsoft/markitdown); the implementation is
original JREI code using Python's stdlib OOXML/ZIP interfaces, NOT a copy of
MarkItDown or a claim that its full feature set is installed.

Only bytes explicitly uploaded in the authenticated owner browser are read.
No Office/LibreOffice process, macros, formulas, remote relationships, OLE,
network calls, images, OCR, or external entity substitution are executed.
File size, archive fanout, decompression, XML and output limits are enforced
before indexing. Slide and sheet labels are derived from package manifests,
never invented from a search hit.
"""
from __future__ import annotations

from dataclasses import dataclass
import io
from pathlib import PurePosixPath
import posixpath
import re
import zipfile
from xml.etree import ElementTree as ET

MAX_ENTRIES = 260
MAX_UNCOMPRESSED_BYTES = 24_000_000
MAX_XML_BYTES = 5_000_000
MAX_OUTPUT_CHARS = 80_000
MAX_SEGMENTS = 40
MAX_CELLS_PER_SHEET = 1500
_NS_REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
_NS_PPT = "{http://schemas.openxmlformats.org/presentationml/2006/main}"
_NS_DRAW = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
_NS_SHEET = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


@dataclass(frozen=True)
class Section:
    anchor: str
    text: str


def _archive(blob: bytes) -> zipfile.ZipFile:
    if len(blob) > 4_000_000 or not blob.startswith(b"PK"):
        raise ValueError("JREI_OFFICE_ARCHIVE_HEADER_OR_SIZE_INVALID")
    archive = zipfile.ZipFile(io.BytesIO(blob))
    entries = archive.infolist()
    if len(entries) > MAX_ENTRIES:
        raise ValueError("JREI_OFFICE_PACKAGE_TOO_MANY_ENTRIES")
    names = set()
    total = 0
    for item in entries:
        name = item.filename
        parts = PurePosixPath(name).parts
        if (name in names or name.startswith("/") or "\\" in name
                or ".." in parts or not name or item.flag_bits & 1):
            raise ValueError("JREI_OFFICE_UNSAFE_ARCHIVE_ENTRY")
        names.add(name)
        total += item.file_size
        if total > MAX_UNCOMPRESSED_BYTES:
            raise ValueError("JREI_OFFICE_ARCHIVE_EXPANSION_LIMIT")
        if (item.file_size > MAX_XML_BYTES and name.endswith((".xml", ".rels"))):
            raise ValueError("JREI_OFFICE_XML_PART_TOO_LARGE")
    return archive


def _xml(package: zipfile.ZipFile, name: str) -> ET.Element:
    try:
        meta = package.getinfo(name)
    except KeyError as exc:
        raise ValueError("JREI_OFFICE_REQUIRED_XML_MISSING") from exc
    if meta.file_size > MAX_XML_BYTES or meta.is_dir():
        raise ValueError("JREI_OFFICE_XML_TOO_LARGE")
    raw = package.read(meta)
    if len(raw) > MAX_XML_BYTES or b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise ValueError("JREI_OFFICE_XML_ENTITIES_DISALLOWED")
    try:
        return ET.fromstring(raw)
    except ET.ParseError as exc:
        raise ValueError("JREI_OFFICE_MALFORMED_XML") from exc


def _relationships(package: zipfile.ZipFile, path: str) -> dict[str, str]:
    root = _xml(package, path)
    mapped = {}
    for link in root:
        if not link.tag.endswith("}Relationship"):
            continue
        ident, target = link.get("Id", ""), link.get("Target", "")
        if (not ident or ident in mapped or not target
                or link.get("TargetMode", "Internal") != "Internal"
                or ":" in target or target.startswith("//")
                or "\\" in target):
            continue
        # XML rels are untrusted: keep only relative OOXML references.
        if target.startswith("/"):
            destination = target.lstrip("/")
        else:
            base = path.split("/_rels/", 1)[0]
            destination = posixpath.normpath(posixpath.join(base, target))
        if (destination.startswith("../") or destination.startswith("/")
                or ".." in PurePosixPath(destination).parts):
            continue
        mapped[ident] = destination
    return mapped


def _pptx(package: zipfile.ZipFile) -> list[Section]:
    presentation = _xml(package, "ppt/presentation.xml")
    links = _relationships(package, "ppt/_rels/presentation.xml.rels")
    ids = presentation.find(_NS_PPT + "sldIdLst")
    if ids is None:
        return []
    result = []
    budget = 0
    for order, slide in enumerate(ids, 1):
        if order > MAX_SEGMENTS:
            break
        identifier = slide.get(_NS_REL + "id", "")
        target = links.get(identifier)
        if not target or not re.fullmatch(r"ppt/slides/slide[1-9][0-9]*\.xml", target):
            raise ValueError("JREI_POWERPOINT_SLIDE_RELATIONSHIP_INVALID")
        root = _xml(package, target)
        lines = []
        for paragraph in root.iter(_NS_DRAW + "p"):
            text = "".join((child.text or "") for child in paragraph.iter(_NS_DRAW + "t")).strip()
            if text:
                lines.append(text)
            if sum(map(len, lines)) > 12_000:
                break
        value = "\n".join(lines)
        remaining = MAX_OUTPUT_CHARS - budget
        if remaining <= 0:
            break
        if value:
            clipped = value[:remaining]
            result.append(Section(f"slide {order}", clipped))
            budget += len(clipped)
    return result


def _shared_strings(package: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in package.namelist():
        return []
    root = _xml(package, "xl/sharedStrings.xml")
    values = []
    for element in root.iter(_NS_SHEET + "si"):
        text = "".join(n.text or "" for n in element.iter(_NS_SHEET + "t"))
        values.append(text[:3000])
        if len(values) > 12000:
            raise ValueError("JREI_EXCEL_SHARED_STRINGS_OVER_BUDGET")
    return values


def _xlsx(package: zipfile.ZipFile) -> list[Section]:
    book = _xml(package, "xl/workbook.xml")
    links = _relationships(package, "xl/_rels/workbook.xml.rels")
    names = _shared_strings(package)
    collection = book.find(_NS_SHEET + "sheets")
    if collection is None:
        return []
    result = []
    budget = 0
    for index, tab in enumerate(collection, 1):
        if index > MAX_SEGMENTS:
            break
        sheet = (tab.get("name") or f"Sheet {index}")[:80]
        identifier = tab.get(_NS_REL + "id", "")
        target = links.get(identifier)
        if not target or not re.fullmatch(r"xl/worksheets/[^/]+\.xml", target):
            raise ValueError("JREI_EXCEL_WORKSHEET_RELATIONSHIP_INVALID")
        root = _xml(package, target)
        lines = []
        examined = 0
        for row in root.iter(_NS_SHEET + "row"):
            pieces = []
            for cell in row.iter(_NS_SHEET + "c"):
                examined += 1
                if examined > MAX_CELLS_PER_SHEET:
                    break
                address = cell.get("r", "")[:12]
                if not re.fullmatch(r"[A-Z]{1,3}[1-9][0-9]{0,6}", address):
                    continue
                kind = cell.get("t", "")
                value_node = cell.find(_NS_SHEET + "v")
                if kind == "inlineStr":
                    inline = cell.find(_NS_SHEET + "is")
                    value = "" if inline is None else "".join(
                        n.text or "" for n in inline.iter(_NS_SHEET + "t"))
                elif kind == "s":
                    raw = "" if value_node is None else value_node.text or ""
                    if not raw.isdigit() or int(raw) >= len(names):
                        raise ValueError("JREI_EXCEL_SHARED_STRING_REFERENCE_INVALID")
                    value = names[int(raw)]
                else:
                    value = "" if value_node is None else (value_node.text or "")
                # XLSX formulas are NEVER evaluated. Cached formula values
                # are labelled as potentially stale so they are not cited as
                # recalculated spreadsheet facts.
                if cell.find(_NS_SHEET + "f") is not None:
                    value = "[cached formula result, unverified] " + value if value else "[formula; no evaluated result]"
                if value:
                    pieces.append(f"{address}: {value[:400]}")
            if pieces:
                lines.append(" | ".join(pieces)[:2400])
            if examined >= MAX_CELLS_PER_SHEET or sum(map(len, lines)) > 16000:
                break
        value = "\n".join(lines)
        remaining = MAX_OUTPUT_CHARS - budget
        if remaining <= 0:
            break
        if value:
            clipped = value[:remaining]
            result.append(Section(f"sheet {sheet}", clipped))
            budget += len(clipped)
    return result


def parse_office(filename: str, raw: bytes) -> list[Section]:
    """Parse only PPTX/XLSX structural text; result is never authoritative.

    The source file is owner-selected and SHA256-verified by the existing
    private document vault before use by the retrieval layer.
    """
    suffix = PurePosixPath(filename).suffix.lower()
    if suffix not in (".pptx", ".xlsx"):
        raise ValueError("JREI_OFFICE_TYPE_NOT_SUPPORTED")
    with _archive(raw) as package:
        sections = _pptx(package) if suffix == ".pptx" else _xlsx(package)
    return [s for s in sections if s.text.strip()]


def extract_office(filename: str, raw: bytes) -> tuple[str, str]:
    sections = parse_office(filename, raw)
    full = "\n\n".join(f"[{s.anchor}]\n{s.text}" for s in sections)[:MAX_OUTPUT_CHARS]
    status = ("OFFICE_STRUCTURAL_TEXT_EXTRACTED_UNVERIFIED"
              if full else "OFFICE_NO_EXTRACTABLE_TEXT")
    return full, status
