# JREI Personal Windows AI — development continuation (2026-10-28)

**Authoritative instructions:** `JREI_ALL_AI_MASTER_PROMPTS_AND_OWNER_DIRECTIVES_UNIFIED_20261025.md`, Hybrid AI Super Master, Ultimate Vision, `AGENTS.md`. Development remains on `migration/bertina-linux6`. The 117 general website requirements remain compatibility constraints, not this Windows-AI workstream.

## Purpose and deliberately narrow scope

Turn the existing private JREI Windows loopback command centre into a genuinely useful personal assistant for the owner's research, academic writing, software development, educational intelligence and project work. Do not create a replacement public chatbot or independent production database. Preserve the working local Qwen, existing GPU/CPU tasks and worker identities; no downloads, model replacement, key rotation, exposed inbound port, Bertina release or live site change.

## Source-level capabilities implemented in this continuation

1. **Existing private conversation retained:** `windows_command_center.py` keeps the original 127.0.0.1:8092 authenticated API, existing local inference adapter and fixed mission registry, with the new `windows_owner_ui.html` and local conversations in the established private SQLite database.
2. **Bounded multi-step repository research:** `windows_project_workflows.py` accepts explicit owner source-investigation requests, plans up to two search queries (model suggestions validated, deterministic fallback), invokes existing allowlisted local repo search, reads up to three actual matched files using the existing source restrictions, prepares a source-based synthesis and returns a step-by-step evidence receipt. `owner_workflows` in the same owner-private SQLite database stores step status and SHA-256 evidence metadata.
3. **Real draft project creation:** `windows_project_generator.py` converts an explicitly confirmed code-generation request into 1–3 physical, SHA-256-receipted source files inside a newly created private directory under `%LOCALAPPDATA%\JREI\command-center\generated-projects`. No generated file is executed, tested, automatically copied into the canonical repo or deployed. Authenticated loopback download is restricted to exact IDs and registered filenames.
4. **Private user-selected documents:** `windows_document_vault.py` stores up to 4 MB per explicitly selected file under the same Windows account's local private vault. UTF-8 text and DOCX extraction are local; PDF extraction is attempted only if a PDF library is already installed, and scanned/encrypted/unreadable content is marked clearly. The local assistant receives bounded excerpts, not whole database dumps or public uploads. The authenticated UI can list and explicitly delete private documents.
5. **Model quality and response usability:** The existing `windows_response_quality.py` negative screen, bounded regeneration, safe Markdown renderer, Persian list alignment, Enter-to-send and private model status remain preserved. Source or model output is not proof of scientific validity; repeated-text rejection is not a general hallucination detector.
6. **Owner approval and truthful action states:** the existing local code-edit workspace and rollback remain confirmation-gated. New code creation requires explicit confirmation. Tools return actual result states and receipts, not fabricated deployment/test outcomes.

## 28 October Windows-only evidence retrieval extension (source only)

The existing owner-selected document chat now uses
`platform/jrei-python/jrei_service/windows_document_retrieval.py`.
This module reads only previously imported private document IDs, checks the
stored extracted text SHA-256, verifies PDF original bytes before attempting
page extraction with the already installed optional `pypdf`, and selects up
to five bounded passages from up to two selected documents. Actual PDF page
numbers are used only when page extraction succeeds; DOCX references are
identified as extracted paragraphs and text references as extracted lines.
If the PDF page parser cannot supply verified page boundaries, the assistant
explicitly labels fallback text unpaginated instead of inventing pages.

`windows_owner_agent.py` now grounds its document synthesis in these specific
excerpts, and stores document IDs, source hashes, anchors, extraction coverage,
and individual evidence hashes in the existing private SQLite operation receipts,
**not** full retrieved excerpts. The private Windows
`windows_owner_ui.html` presents the evidence anchors separately from the
model's prose. Missing matches and extraction failures remain explicitly
unavailable rather than generating citations from unsupported material.

This is **bounded retrieval, not verified full-document reading, semantic
embedding search, original-file page viewing, source validation, or scientific
review**. The existing 18-page PDF and 80,000-character import boundaries
still apply; OCR and encrypted/scanned PDF processing are not added. This
extension does not introduce a new database, open an external network port,
start a scheduled task, or change any website code. No local Windows
activation, tests or release verification were performed as part of this
source-only continuation.

## Local mission progress extension (source only)

`windows_owner_tasks.py` adds a narrowly scoped `owner_task_steps` table to
the same private `missions.sqlite3` database. Only enumerated checkpoints
from the existing worker can be written. Task list/detail projections include
the most recently recorded phase, while `windows_owner_ui.html` displays
that phase in the existing job strip. Starting, repository investigation,
private document retrieval, synthesis, tool routing and result persistence
have explicit phase labels. An interrupt or owner cancellation continues to
use the original, truthful task status and does not turn a checkpoint into
a success claim. This is **polling of actual phases, not token streaming,
cooperative interruption of a currently running Qwen request, or verified
Windows operation**. No tests or activation were performed.

## Honest operational boundaries

- **Source-only** commits do not restart or update the owner's already-running Python process. The existing Git fast-forward task can transfer code, but a separately authorized command-centre process restart is required for Python module changes to take effect.
- None of the new modules was executed on the owner's Windows computer by this GitHub source update. No tests, migrations, CI jobs, installs, file crawls, external model calls, model retraining, signed-worker mutations or production deployments were run.
- The local model currently has much smaller capabilities than GPT-6. This is a private, bounded assistant, **not an OpenAI model or a ChatGPT-equivalent model**. Do not claim universal computer use, fully autonomous coding, open-web browsing, scholarly fact verification, multimodal image/video handling or access to connected services without separately implementing and verifying those tools.
- Document excerpts are untrusted data. The app must preserve the distinction between observed file content, model interpretation, cited reviewed research, and independently verified public facts.
- Files containing sensitive owner data remain in private Windows folders, outside GitHub; neither this status document nor the repository contains user-provided documents, tokens or private keys.

## Remaining engineering requirements (not marked complete)

A typed permissioned tool registry; richer progress streaming for the existing durable queue and cancellation states; complete long-document and cross-document retrieval with reliable page-level coverage (beyond the current bounded excerpts); optional high-quality local PDF parsers and OCR; document edit/export beyond code drafts; richer multi-file code patches and diffs; isolated code execution only under explicit current owner approval; independent regression and model-evaluation datasets; source-rights and educational evidence retrieval; connector consent, audit/revocation, secure signed site routing, and final scientific/operational acceptance. Multi-machine orchestration and JREI News remain separate original programme obligations.

**Current result:** ADDITIVE SOURCE INTEGRATION, NOT TESTED OR DEPLOYED. The owner-directed consolidated verification remains deferred until the development phase is complete.
