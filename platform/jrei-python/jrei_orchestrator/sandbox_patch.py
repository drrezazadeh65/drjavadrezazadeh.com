"""Build a source-pinned nonproduction JREI code-change preview.

This is a PREVIEW MATERIALIZER, not an executor, git client, code reviewer,
test runner or release agent. The only files written are under a disjoint
private sandbox directory. No live checkout, database or web application
is modified. Model-generated patch proposals are untrusted inputs.
"""
from __future__ import annotations

from difflib import HtmlDiff
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
from typing import Literal

from pydantic import Field, model_validator
from jrei_core.contracts import Digest, Identifier, StrictContract

_PATH_SCOPE = (
    "platform/jrei-python/",
    "platform/jrei-v5/",
    "assets/css/",
    "assets/js/",
    "api/",
)
_FILE_TYPES = {".py", ".js", ".mjs", ".css", ".php", ".html"}
_SECRET = re.compile(
    r"(?i)(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|"
    r"bearer\s+[a-z0-9._-]{16,}|api[_-]?key\s*[:=]|"
    r"password\s*[:=]|secret\s*[:=])"
)


class SandboxPatchRequest(StrictContract):
    schema_version: Literal["jr.jrei.sandbox-source-patch.v1"] = (
        "jr.jrei.sandbox-source-patch.v1"
    )
    proposal_id: Identifier
    owner_policy_digest: Digest
    target_path: str = Field(min_length=6, max_length=180)
    original_sha256: Digest
    evidence_sha256: Digest
    original_fragment: str = Field(min_length=1, max_length=4096)
    replacement_fragment: str = Field(min_length=1, max_length=8192)
    # Permission to preview never gives production release authority.
    isolated_preview_only: Literal[True] = True

    @model_validator(mode="after")
    def restrict_source_path(self) -> "SandboxPatchRequest":
        name = self.target_path
        path = PurePosixPath(name)
        if (
            path.is_absolute() or path.as_posix() != name or "\\" in name
            or any(part in ("", ".", "..") for part in name.split("/"))
            or path.suffix not in _FILE_TYPES
            or not name.startswith(_PATH_SCOPE)
            or ".env" in name.lower()
            or _SECRET.search(name)
        ):
            raise ValueError("SANDBOX_PATCH_TARGET_OUTSIDE_PERMITTED_SCOPE")
        if _SECRET.search(self.original_fragment) or _SECRET.search(
            self.replacement_fragment
        ):
            raise ValueError("SANDBOX_PATCH_MAY_CONTAIN_SECRET")
        return self


class SandboxPatchReceipt(StrictContract):
    schema_version: Literal["jr.jrei.sandbox-source-preview-result.v1"] = (
        "jr.jrei.sandbox-source-preview-result.v1"
    )
    proposal_id: Identifier
    base_sha256: Digest
    candidate_sha256: Digest
    evidence_sha256: Digest
    owner_policy_digest: Digest
    preview_relative_html: str
    sandbox_relative_source: str
    state: Literal["ISOLATED_PATCH_PREVIEW_NOT_EXECUTED"] = (
        "ISOLATED_PATCH_PREVIEW_NOT_EXECUTED"
    )
    tests_run: Literal[False] = False
    code_review_passed: Literal[False] = False
    source_checkout_changed: Literal[False] = False
    production_deployed: Literal[False] = False
    ready_to_release: Literal[False] = False


def materialize_preview(
    repository: Path, sandbox_root: Path, proposal: SandboxPatchRequest
) -> SandboxPatchReceipt:
    repo = repository.resolve(strict=True)
    sandbox_root.mkdir(parents=True, exist_ok=True, mode=0o700)
    box = sandbox_root.resolve(strict=True)
    if box == repo or box.is_relative_to(repo) or repo.is_relative_to(box):
        raise ValueError("SANDBOX_NOT_ISOLATED_FROM_REPOSITORY")

    source = repo.joinpath(*PurePosixPath(proposal.target_path).parts)
    if any(part.is_symlink() for part in source.parents if part != repo):
        raise ValueError("SANDBOX_PATCH_SYMLINK_TRAVERSAL")
    if source.is_symlink() or not source.is_file():
        raise ValueError("SANDBOX_PATCH_SOURCE_INVALID")
    resolved = source.resolve(strict=True)
    if not resolved.is_relative_to(repo) or resolved.stat().st_size > 100_000:
        raise ValueError("SANDBOX_PATCH_SOURCE_OUTSIDE_SCOPE")
    original = resolved.read_bytes()
    if hashlib.sha256(original).hexdigest() != proposal.original_sha256:
        raise ValueError("SANDBOX_PATCH_SOURCE_CHANGED")
    text = original.decode("utf-8")
    if text.count(proposal.original_fragment) != 1:
        raise ValueError("SANDBOX_PATCH_FRAGMENT_NOT_UNIQUE")
    revised = text.replace(
        proposal.original_fragment, proposal.replacement_fragment, 1
    )
    if revised == text:
        raise ValueError("SANDBOX_PATCH_NO_OP")
    if _SECRET.search(revised):
        raise ValueError("SANDBOX_PATCH_CANDIDATE_MAY_EXPOSE_SECRET")

    candidate = revised.encode("utf-8")
    candidate_sha = hashlib.sha256(candidate).hexdigest()
    package_key = hashlib.sha256(json.dumps([
        proposal.proposal_id, proposal.owner_policy_digest,
        proposal.target_path, proposal.original_sha256,
        proposal.evidence_sha256, candidate_sha,
    ], separators=(",", ":")).encode("utf-8")).hexdigest()

    stage = box / package_key
    # No overwrite: each immutable input produces one isolated preview.
    stage.mkdir(mode=0o700)
    file = stage.joinpath(*PurePosixPath(proposal.target_path).parts)
    file.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with file.open("xb") as out:
        out.write(candidate)
        out.flush()
        os.fsync(out.fileno())
    preview = stage / "preview.html"
    document = HtmlDiff(tabsize=4, wrapcolumn=120).make_file(
        text.splitlines(), revised.splitlines(),
        fromdesc="Pinned original (unchanged on disk)",
        todesc="Isolated candidate (UNTESTED, NOT DEPLOYED)",
        context=True, numlines=3, charset="utf-8",
    )
    # An offline HTML comparison cannot access networks, send forms, or
    # execute script. Browser CSP remains defensive, not proof of sanitizing.
    document = document.replace(
        "<head>",
        '<head><meta http-equiv="Content-Security-Policy" '
        'content="default-src &#39;none&#39;; '
        'style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;">',
        1,
    )
    preview.write_text(document, encoding="utf-8")
    receipt = SandboxPatchReceipt(
        proposal_id=proposal.proposal_id,
        base_sha256=proposal.original_sha256,
        candidate_sha256=candidate_sha,
        evidence_sha256=proposal.evidence_sha256,
        owner_policy_digest=proposal.owner_policy_digest,
        preview_relative_html=package_key + "/preview.html",
        sandbox_relative_source=package_key + "/" + proposal.target_path,
    )
    (stage / "receipt.json").write_text(
        receipt.model_dump_json(indent=2) + "\n", encoding="utf-8",
    )
    return receipt
