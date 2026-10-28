"""Source-only native JREI repository map, inspired by Aider's repo-map design.

Build a bounded, deterministic, read-only map of FIRST-PARTY source signatures.
A map is context for the current JREI coding workflow, never instructions for
the language model or permission to execute generated code. No upstream
source was copied. No external parser, network call, shell, or file mutation.
"""
from __future__ import annotations

import ast
import hashlib
import os
from pathlib import Path
import re

SAFE_ROOTS = ("platform/jrei-python", "platform/jrei-v5",
              "platform/news-intelligence", "assets/css", "scripts", "api")
SOURCE_SUFFIXES = frozenset((".py", ".js", ".mjs", ".cjs", ".ts",
                            ".php", ".css", ".html"))
SKIP_DIRS = frozenset((".git", "node_modules", "vendor", "__pycache__",
                       "private", "secrets", "credentials", "cache", "dist",
                       "build", "backup", "backups", ".venv", "venv"))
MAX_SCAN_FILES = 1600
MAX_SOURCE_BYTES = 85000
MAX_SYMBOLS_PER_FILE = 14
MAX_OUTPUT_CHARS = 3600
NAME = re.compile(r"[A-Za-z_][A-Za-z_0-9]{2,}")
LINE_DEF = re.compile(
    r"^\s*(?:export\s+)?(?:default\s+)?(?:(?:async\s+)?function\s+"
    r"|class\s+|(?:const|let|var)\s+)"
    r"([A-Za-z_$][A-Za-z0-9_$]{1,75})\b"
)
PHP_DEF = re.compile(
    r"^\s*(?:final\s+|abstract\s+)?(?:class|function)\s+"
    r"([A-Za-z_][A-Za-z0-9_]{1,75})\b"
)
CSS_DEF = re.compile(r"^\s*(?:[.#:@][A-Za-z_][\w.\-:#\[\](), >+~]{0,130})\s*\{")
HTML_DEF = re.compile(
    r"^\s*<(?:main|section|article|header|footer|nav|form|dialog|"
    r"script|style|h[1-6])\b[^>]{0,200}>", re.I)



def _py_symbols(text: str) -> list[tuple[int, str]]:
    try:
        root = ast.parse(text)
    except (SyntaxError, UnicodeError, MemoryError, ValueError):
        return []
    records = []
    for node in root.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            line = text.splitlines()[node.lineno - 1].strip()[:190]
            records.append((node.lineno, line))
            if isinstance(node, ast.ClassDef):
                for method in node.body:
                    if isinstance(method, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        value = text.splitlines()[method.lineno - 1].strip()[:150]
                        records.append((method.lineno, "  " + value))
            if len(records) >= MAX_SYMBOLS_PER_FILE:
                break
    return records[:MAX_SYMBOLS_PER_FILE]


def _tree_sitter_symbols(text: str, suffix: str) -> list[tuple[int, str]]:
    """Optional structure-aware JS/TS map; safe regex fallback if unavailable.

    Uses MIT Tree-sitter Python bindings/grammar *as libraries in JREI*, not
    a second editor, process or assistant. Strictly parses source as data.
    This does not download a grammar, execute JavaScript or validate code.
    """
    if suffix not in (".js", ".mjs", ".cjs", ".ts"):
        return []
    try:
        from tree_sitter import Language, Parser
        if suffix == ".ts":
            import tree_sitter_typescript as grammar
            language = Language(grammar.language_typescript())
        else:
            import tree_sitter_javascript as grammar
            language = Language(grammar.language())
        parser = Parser(language)
        raw = text.encode("utf-8")
        tree = parser.parse(raw)
    except (ImportError, AttributeError, RuntimeError, TypeError, ValueError):
        return []
    lines = text.splitlines()
    records = []
    defined = {
        "function_declaration", "generator_function_declaration",
        "class_declaration", "lexical_declaration",
        "variable_declaration", "method_definition",
        "interface_declaration", "type_alias_declaration",
    }

    def visit(node, depth: int):
        if len(records) >= MAX_SYMBOLS_PER_FILE or depth > 3:
            return
        if node.type in defined and 0 <= node.start_point.row < len(lines):
            line = node.start_point.row + 1
            value = lines[line - 1].strip()[:190]
            if value and (line, value) not in records:
                records.append((line, value))
        if depth < 3:
            for child in node.named_children[:100]:
                if len(records) >= MAX_SYMBOLS_PER_FILE:
                    break
                visit(child, depth + 1)
    visit(tree.root_node, 0)
    return sorted(records, key=lambda item: item[0])[:MAX_SYMBOLS_PER_FILE]


def _other_symbols(text: str, suffix: str) -> list[tuple[int, str]]:
    pattern = (PHP_DEF if suffix == ".php" else
               CSS_DEF if suffix == ".css" else
               HTML_DEF if suffix == ".html" else LINE_DEF)
    matches = []
    for number, line in enumerate(text.splitlines(), start=1):
        if len(matches) >= MAX_SYMBOLS_PER_FILE:
            break
        if pattern.match(line):
            matches.append((number, line.strip()[:190]))
    return matches


def _terms(query: str) -> set[str]:
    # Unicode word boundaries retain Persian queries as well as Latin symbols.
    return {t.casefold() for t in re.findall(r"[\w\u0600-\u06ff]{3,}", query)
            if t.casefold() not in {"and", "the", "from", "with", "for",
                                    "این", "برای", "پروژه", "کدهای", "فایل"}}


def _iter_files(repo: Path):
    seen = 0
    for relative in SAFE_ROOTS:
        folder = repo / relative
        if not folder.is_dir() or folder.is_symlink():
            continue
        for current, dirs, files in os.walk(folder, topdown=True, followlinks=False):
            dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS
                             and not (Path(current) / d).is_symlink())
            for name in sorted(files):
                path = Path(current) / name
                if path.suffix.lower() not in SOURCE_SUFFIXES or path.is_symlink():
                    continue
                yield path
                seen += 1
                if seen >= MAX_SCAN_FILES:
                    return


def build(*, repo: Path, request: str, max_files: int = 7,
          max_chars: int = MAX_OUTPUT_CHARS) -> dict:
    """Return source-linked signature hints, without reading private data."""
    if (not isinstance(request, str) or len(request) > 9000
            or not 1 <= max_files <= 12 or not 300 <= max_chars <= 6000):
        raise ValueError("JREI_REPO_MAP_REQUEST_INVALID")
    repo = repo.resolve(strict=True)
    terms = _terms(request)
    ranked = []
    considered = 0
    for path in _iter_files(repo):
        try:
            absolute = path.resolve(strict=True)
            if not absolute.is_relative_to(repo):
                continue
            stat = path.stat()
            if stat.st_size <= 0 or stat.st_size > MAX_SOURCE_BYTES:
                continue
            content = path.read_bytes()
            text = content.decode("utf-8")
        except (OSError, UnicodeError, ValueError):
            continue
        considered += 1
        name = path.relative_to(repo).as_posix()
        suffix = path.suffix.lower()
        symbols = (_py_symbols(text) if suffix == ".py"
                   else (_tree_sitter_symbols(text, suffix)
                         or _other_symbols(text, suffix)))
        if not symbols:
            continue
        lowered_path = name.casefold()
        lowered_signatures = " ".join(x[1] for x in symbols).casefold()
        score = sum(7 if t in lowered_path else 3 if t in lowered_signatures else 0
                    for t in terms)
        # Symbol coverage helps rank files even for broad queries; it is not
        # a full dependency graph nor a measured quality improvement.
        score += min(len(symbols), 8) / 20
        ranked.append((score, name, symbols,
                       hashlib.sha256(content).hexdigest()))
    ranked.sort(key=lambda item: (-item[0], item[1]))
    output = []
    selected = []
    for score, name, symbols, digest in ranked:
        if len(selected) >= max_files:
            break
        evidence = [f"{name} [sha256:{digest[:16]}]"]
        for line, signature in symbols[:7]:
            evidence.append(f"  L{line}: {signature}")
        part = "\n".join(evidence) + "\n"
        if len("".join(output)) + len(part) > max_chars:
            continue
        output.append(part)
        selected.append({"path": name, "sha256": digest,
                         "symbols": len(symbols), "rank": round(score, 3)})
    return {"schema": "jr.jrei.readonly-repository-map.v1",
            "state": "SOURCE_ONLY_UNTESTED",
            "files_examined": considered,
            "files_mapped": len(ranked),
            "selected": selected,
            "map": "".join(output),
            "source_mutated": False, "code_executed": False,
            "model_weights_trained": False, "website_changed": False}
