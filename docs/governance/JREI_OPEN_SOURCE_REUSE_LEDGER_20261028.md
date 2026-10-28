# JREI · Open-source code-reuse ledger · 28 October 2026

## Owner's governing directive

For **every** new JREI AI subsystem, search GitHub and authoritative upstream
repositories and docs BEFORE writing another bespoke replacement. Compare
maintenance, licensing, Windows/Qwen compatibility, actual integration cost,
trust boundaries, performance and ability to adapt **within the existing JREI
application**. Select the smallest valuable implementation pattern or source
component, natively integrate it, and document origin and what was/was not
copied. Never install a parallel assistant, change production site, duplicate
databases or launch a second admin dashboard. Work only in
`drrezazadeh65/drjavadrezazadeh.com` /
`migration/bertina-linux6`. No tests or site deployment during coding.

The word "open-source" is not enough to permit indiscriminate reproduction.
Before copying verbatim code: inspect the **exact version** and licence/NOTICE
requirements; preserve authorship, copyright and licence notices, and confirm
transitive dependencies or model/data usage rights. A documented,
independently written implementation of a general algorithm is not the
same thing as copying upstream code. Clearly mark the actual status.

## Research and adoption matrix

| JREI subsystem | Relevant upstream | Source/licence | Concrete design feature | Native JREI integration | Status |
| --- | --- | --- | --- | --- | --- |
| Long-term memory | [Mem0](https://github.com/mem0ai/mem0) | Apache-2.0, see upstream LICENSE | Append-oriented entity memory, provenance, multi-signal and temporal retrieval | `windows_evidence_memory.py` stores source-anchored, version-filtered model-draft triples in **existing missions.sqlite3**, detects possible contradictions and retrieves original passages; `windows_owner_agent.py` consumes those passages | **ORIGINAL NATIVE CODE ADAPTED FROM DOCUMENTED PATTERNS**; not mem0 package or upstream code port; untested |
| Graph-based knowledge access | [Microsoft GraphRAG](https://github.com/microsoft/graphrag), [documentation](https://microsoft.github.io/graphrag/) | Inspect exact upstream LICENSE before verbatim reuse | Entity and relation extraction followed by local evidence search; full community summaries are expensive and not presently included | The same native graph store and lookup; no separate knowledge graph DB | **PARTIALLY ADAPTED DESIGN**; no GraphRAG dependency and no global graph summarisation; untested |
| Durable study workflows | [LangGraph](https://github.com/langchain-ai/langgraph), [SQLite checkpoints](https://github.com/langchain-ai/langgraph/tree/main/libs/checkpoint-sqlite) | Inspect per-package license before verbatim reuse | Durable phase checkpoints and interrupted-work leases | Existing `windows_owner_tasks.py` / `windows_learning_agenda.py` and `windows_autonomous_topics.py` use the current private SQLite task/cycle tables | **EXISTING NATIVE IMPLEMENTATION**; no LangGraph package installed |
| Approved-source crawling | [Crawl4AI](https://github.com/unclecode/crawl4ai) | Apache-2.0 with upstream attribution guidance | Content extraction, adaptive backpressure, source control | `windows_continuous_learning.py`: narrowly scoped owner-approved HTTPS, robots, pinned DNS/IP, text/HTML parsing, provenance, rights and headroom | **NATIVE BOUNDED IMPLEMENTATION**, not copied crawler or browser stack; no open-web expansion |
| Search ranking | [SQLite FTS5](https://www.sqlite.org/fts5.html), [Mem0](https://github.com/mem0ai/mem0) | SQLite public-domain core; Mem0 Apache-2.0 | BM25 lexical ranking, source diversity, entity hints | `windows_learning_fts.py` + JREI's original multi-signal `_rerank_evidence` with SHA256 receipts | **NATIVE CODE**, optional built-in FTS5, no external memory service |
| Rich document ingestion | [Microsoft MarkItDown](https://github.com/microsoft/markitdown) | MIT; see upstream LICENSE | Structural Markdown extraction from selected local PDF/DOCX/PPTX/XLSX | Candidate for **later source-bounded integration** into existing `windows_document_vault.py`, never unrestricted file paths or cloud OCR | **RESEARCHED, NOT INTEGRATED** |
| Actual LoRA/SFT of base model | [Hugging Face PEFT](https://github.com/huggingface/peft), [Transformers PEFT guide](https://huggingface.co/docs/transformers/main/peft) | Check package/model/dataset versions and licences separately | Small trainable adapter weights, compatible checkpoints and independent heldouts | Existing `windows_model_curriculum.py` prepares rights-cleared candidate JSONL; no trainer imported, no weights modified, and GGUF inference artifacts are **not sufficient** as training checkpoints | **RESEARCHED, DATA STAGING ONLY** |
| Windows local inference | [llama.cpp](https://github.com/ggml-org/llama.cpp) | MIT; exact backend and hardware compatibility must be checked | CPU/GPU hybrid and Vulkan possibilities | Current JREI Qwen CPU/GPU endpoints remain untouched; first assess deployed backend and GPUs, especially AMD RX580 | **CURRENT RUNTIME PRESERVED**; no download, build or acceleration claim |

## Per-feature acceptance checklist (source development now; final checks later)

1. Identify the **problem**, existing JREI file/table/worker and the true gap.
2. Find at least one maintained upstream with a relevant reusable algorithm.
   Inspect licence, dependency graph, backend support and legal restrictions.
3. Prefer **reuse of native JREI modules** before adopting a new dependency;
   never create duplicate identities, memory systems or dashboards.
4. Implement behind current Windows owner consent and source-rights gates;
   the model must not grant itself tool or crawling permissions.
5. Preserve original SHA256 evidence and anchors; avoid passing generated
   claims as verified facts. Revoke derived retrieval on source withdrawal.
6. Add a precise record of code provenance, licence obligations and whether
   this was a verbatim **COPY** or original **ADAPT**.
7. Do not claim operational start, improved model accuracy or successful
   training before real independent final acceptance on the owner Windows
   machines. No build-time tests or deployments under this development mode.

## Record of present work

- Native evidence memory introduced in
  `platform/jrei-python/jrei_service/windows_evidence_memory.py`,
  connected to the existing `windows_command_center.py` background study
  scheduler and `windows_owner_agent.py` retrieval. The original Qwen
  backend, API port, owner tokens and SQLite database remain authoritative.
- All source-derived triples are marked `MODEL_DRAFT_UNVERIFIED`. Source
  claims cannot be used as self-certified training labels or promote a model.
  Contradictions are warnings, not an automatic truth-voting mechanism.
- Source changes are committed with `[skip ci]` to honour the owner's
  no-tests-until-finished requirement. No Windows installation, live crawl,
  weight training, Bertina release or website deployment has been performed.
