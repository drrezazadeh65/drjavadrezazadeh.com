# JREI Windows — worldwide open-source selection and actual native integration
Date: 2026-10-28
Canonical repository: drrezazadeh65/drjavadrezazadeh.com
Canonical development branch: migration/bertina-linux6

## Owner requirements
- One existing JREI Windows owner app (private loopback 127.0.0.1:8092); no extra installed end-user AI app, dashboards or hosted language model.
- Reuse responsibly licensed **source code and architecture**, never third-party pretrained weights.
- Two existing Windows PCs (reported 16GB RAM/8GB graphics, 32GB RAM/8GB graphics) are the realistic starting capacity; 50+ nodes are future architecture only, not connected machines.
- Preserve all site URLs, SSL, Bertina host, one-click production release, existing model worker and owner-private SQLite data.
- No installation, local or production testing, deployment or live-site changes during this coding-only phase. The final, explicit, owner-approved integrated acceptance comes later.

## Upstream research matrix — source and licences
These are GitHub repository-level licence metadata; any exact source file, notices, dependencies, weight/data rights and version must still be checked at adoption time. **Researched does not mean copied.**

| Public upstream | Repo licence metadata | Useful architecture | JREI adoption status |
|---|---|---|---|
| https://github.com/microsoft/markitdown | MIT | Read office documents into structured text; security principle of narrow file input | **ADAPTED as original stdlib OOXML code**, `windows_office_structures.py`; never imports MarkItDown or accesses network |
| https://github.com/tree-sitter/py-tree-sitter | MIT | Syntax tree source recognition | **OPTIONAL LIBRARY ADAPTER** added to existing `windows_codebase_map.py`; if bindings and a grammar are absent, built-in AST/regex remains |
| https://github.com/Aider-AI/aider | Apache-2.0 | Context-limited repo maps and source-informed patch review | Existing JREI original repo map and isolated workspace; **pattern adapted**, no Aider CLI installed |
| https://github.com/karpathy/nanoGPT | MIT | GPT architecture from random weights | Small implementation already **VENDORED in `jrei_service/_vendor/nanogpt`** by earlier source commit; checkpoint not trained/promoted |
| https://github.com/karpathy/minbpe | MIT | Train a BPE tokenizer rather than download a pretrained tokenizer | Already **VENDORED in `jrei_service/_vendor/minbpe`**; no remote pretrained vocabulary |
| https://github.com/karpathy/nanochat | MIT | More modern full scratch train/tokenizer/SFT/evaluation pipeline | **RESEARCHED, NOT PORTED**: upstream accelerator recipes do not prove compatibility with owner's two local 8GB-GPU PCs |
| https://github.com/Lightning-AI/litgpt | Apache-2.0 | Distributed/iterative training and evaluation recipes | **RESEARCHED, NOT PORTED**: additional optional training libraries and hardware validation needed |
| https://github.com/asg017/sqlite-vec | Apache-2.0 | Local embedded vector retrieval | **RESEARCHED, NOT INSTALLED**: native extension build and trust audit required; existing private SQLite FTS5 remains |
| https://github.com/langchain-ai/langgraph | MIT | Durable agent state and resumable work | **PATTERN ONLY**: original JREI mission/checkpoint SQLite is maintained rather than duplicating orchestration |
| https://github.com/microsoft/graphrag | MIT | Provenance-aware knowledge graph | **PARTIAL PATTERN ONLY**: JREI uses its existing evidence memory, not a new graph database |
| https://github.com/OpenHands/OpenHands | MIT | Sandboxed code agents and workflows | **RESEARCHED, NOT INSTALLED**: automated code execution is not owner-authorized for this build |
| https://github.com/continuedev/continue | Apache-2.0 | Coding agent/editor workflow | **RESEARCHED, NOT INSTALLED**: one JREI owner UI is preserved |
| https://github.com/anthropics/claude-code | No SPDX licence in inspected GitHub repository metadata | Source investigation only | **NO CODE COPIED OR INSTALLED**; no reliance on unauthorized/leaked sources, no assumption that the CLI is open-source for unrestricted reuse |

## Source additions actually committed
1. `platform/jrei-python/jrei_service/windows_office_structures.py`: original, bounded ZIP/OOXML extraction for owner-selected .pptx and .xlsx; slide and sheet anchors obtained from actual package relationship files; reject encrypted/oversized archives, DTD/entity XML; never evaluate Excel formulas or macros.
2. Existing `windows_document_vault.py`, `windows_document_retrieval.py` and `windows_owner_ui.html` reuse the original vault and private SHA256 evidence checks and now admit .pptx/.xlsx. No separate document engine or database.
3. Existing `windows_codebase_map.py` optionally uses the installed MIT tree-sitter Python/JS/TS grammar libraries for symbol locations. Existing Python AST and JS/TS/PHP lexical parsers remain the compatible fallback; no installer runs.
4. Existing `windows_workspace.py` now performs deterministic, **non-executing** Python AST parse and newly introduced dangerous-capability screening before recording model-authored isolated code patches. A parse result is NOT functional acceptance.
5. `windows_open_source_discovery.py` offers on-demand, owner-initiated metadata-only GitHub repository discovery: no arbitrary URLs, executable download, automatic source incorporation, pretrained weights or token submission. The existing `windows_command_center.py` serves this via authenticated `/api/open-source/catalog` and `/api/open-source/search?q=...`. Existing owner UI provides a search box and sourced links; `windows_owner_agent.py` also routes *explicit, current-turn* requests to research open-source code from GitHub through the same read-only source. Returned metadata is explicitly **untrusted candidate information**.

## What does not exist yet
- A capable independently trained native JREI language model, demonstrated Persian/English quality, independent real-world code-agent performance, live Windows screenshot verification for the latest source, or an automatically executing closed-loop self-improvement agent.
- Evidence that the existing two GPUs are compatible with CUDA or other training acceleration; nominal 8GB video memory alone is insufficient proof.
- Production-authorized code edits, unrestricted site/DB control or automated website publication from private JREI.
- Claims that any of the newly committed source code passed integration testing, was deployed or is running in the installed Windows app.

## Release gate
Only after development is frozen: (1) repo and dependency provenance audit, (2) one integrated final local Windows acceptance on both computers and GPU/CPU observation, (3) owner-approved, non-destructive activation of the reviewed pinned app version, and (4) separate existing one-click Bertina deployment if the owner explicitly requests a website change. No direct auto-merge of model-authored code and no bypass of MFA, owner token or signing controls.
