"""Source-only Python change impact analysis for existing owner-private JREI.

This is ORIGINAL JREI code using Python's standard ast module. It can extract
top-level APIs, classify imported dependencies and signal changed interfaces
before owner review. It does NOT typecheck, execute, compile to bytecode, test,
run a linter, infer correctness or grant autonomous editing permissions.
"""

from __future__ import annotations

import ast
import hashlib
import re

MAX_CHARS = 32_000
MAX_NODES = 18_000
MAX_RECORDED = 24


def _sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _parse(source: str, name: str) -> ast.Module:
    if not isinstance(source, str) or len(source) > MAX_CHARS:
        raise ValueError("JREI_PYTHON_SOURCE_OUTSIDE_REVIEW_BUDGET")
    try:
        root = ast.parse(source, filename=name)
    except (SyntaxError, TypeError, MemoryError, ValueError) as exc:
        raise ValueError("JREI_PYTHON_CHANGE_INVALID_SYNTAX") from exc
    if sum(1 for _ in ast.walk(root)) > MAX_NODES:
        raise ValueError("JREI_PYTHON_AST_REVIEW_BUDGET")
    return root


def _signature(node: ast.AST) -> str:
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        description = {
            "kind": type(node).__name__,
            "args": ast.dump(node.args, include_attributes=False),
            "returns": ast.dump(node.returns, include_attributes=False)
                       if node.returns is not None else None,
            "decorators": [
                ast.dump(d, include_attributes=False) for d in node.decorator_list
            ],
        }
        return repr(description)
    if isinstance(node, ast.ClassDef):
        return repr({
            "kind": "class",
            "bases": [ast.dump(x, include_attributes=False) for x in node.bases],
            "decorators": [ast.dump(x, include_attributes=False)
                           for x in node.decorator_list],
            "methods": sorted(
                f"{n.name}:{_signature(n)}" for n in node.body
                if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
            )[:60],
        })
    return type(node).__name__


def _surface(root: ast.Module) -> dict[str, str]:
    return {
        n.name: _sha(_signature(n)) for n in root.body
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))
        and not n.name.startswith("_")
    }


def _imports(root: ast.Module) -> set[str]:
    modules: set[str] = set()
    for node in ast.walk(root):
        if isinstance(node, ast.Import):
            modules.update(a.name for a in node.names)
        elif isinstance(node, ast.ImportFrom):
            modules.add("." * node.level + (node.module or ""))
    return modules


def _module_effects(root: ast.Module) -> set[str]:
    """Track module-level calls, including inside class bodies and assignments.

    This is a source-only warning: an actual effect may be benign, and an
    effect hidden behind an ordinary function remains outside this scope.
    """
    effects: set[str] = set()

    def inspect(node: ast.AST) -> None:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            return
        if isinstance(node, ast.Call):
            try:
                name = ast.unparse(node.func)[:110]
            except (ValueError, TypeError, RecursionError):
                name = "UNKNOWN_CALL"
            effects.add(name)
        # Class definitions execute their class bodies at import time.
        for child in ast.iter_child_nodes(node):
            inspect(child)

    for entry in root.body:
        if isinstance(entry, (ast.FunctionDef, ast.AsyncFunctionDef)):
            # Function decorators/defaults can execute during import.
            for decorator in entry.decorator_list:
                inspect(decorator)
            for default in (entry.args.defaults + [
                    x for x in entry.args.kw_defaults if x is not None]):
                inspect(default)
        else:
            inspect(entry)
    return effects


def inspect_change(*, target: str, before: str, after: str) -> dict:
    """Deterministic, non-executing before/after comparison; no hidden tests."""
    if not isinstance(target, str) or not target.endswith(".py"):
        raise ValueError("JREI_PYTHON_REVIEW_TARGET_INVALID")
    previous = _parse(before, target)
    current = _parse(after, target)
    old_surface, new_surface = _surface(previous), _surface(current)
    old_imports, new_imports = _imports(previous), _imports(current)
    old_effects, new_effects = _module_effects(previous), _module_effects(current)

    removed = sorted(old_surface.keys() - new_surface.keys())
    added = sorted(new_surface.keys() - old_surface.keys())
    signatures_changed = sorted(
        x for x in old_surface.keys() & new_surface.keys()
        if old_surface[x] != new_surface[x])
    newly_imported = sorted(new_imports - old_imports)
    newly_eager = sorted(new_effects - old_effects)
    # These are static warning signals, not evidence that a change is safe.
    flags = []
    if removed:
        flags.append("PUBLIC_ENTRY_POINT_REMOVED_REVIEW_REQUIRED")
    if signatures_changed:
        flags.append("PUBLIC_CALL_SIGNATURE_CHANGED_REVIEW_REQUIRED")
    if newly_imported:
        flags.append("NEW_DEPENDENCY_REVIEW_REQUIRED")
    if newly_eager:
        flags.append("MODULE_IMPORT_TIME_CALL_REVIEW_REQUIRED")
    return {
        "schema": "jr.jrei.python-source-impact.v1",
        "target": target,
        "state": ("OWNER_API_AND_DEPENDENCY_REVIEW_REQUIRED"
                  if flags else "STATIC_STRUCTURE_OBSERVED_NOT_VERIFIED"),
        "removed_public_symbols": removed[:MAX_RECORDED],
        "added_public_symbols": added[:MAX_RECORDED],
        "changed_public_signatures": signatures_changed[:MAX_RECORDED],
        "added_imports": newly_imported[:MAX_RECORDED],
        "new_module_level_calls": newly_eager[:MAX_RECORDED],
        "risk_flags": flags,
        "reported_lists_truncated": any(len(items) > MAX_RECORDED for items in
                                       (removed, added, signatures_changed,
                                        newly_imported, newly_eager)),
        "source_sha256_before": _sha(before),
        "source_sha256_after": _sha(after),
        "python_ast_parsed": True,
        "python_runtime_executed": False,
        "tests_run": False,
        "model_ability_proven": False,
        "automatically_approved": False,
    }
