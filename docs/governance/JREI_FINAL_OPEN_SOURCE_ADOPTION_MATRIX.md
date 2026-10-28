# JREI — Final open-source selection, evidence boundaries and adoption matrix
**Observed:** 2026-10-28; **phase:** SOURCE-ONLY / NO TESTS / NO DEPLOY; **branch:** `migration/bertina-linux6`.
**Repository HEAD at start of research:** `336f11af230915f6a7f13d7eb510c7dfb7f8f984` (not the installed Windows source).
**Authority:** `JREI_MASTER_HANDOFF_2026-10-28.md` and existing governance ledgers. This file adds a researched decision ledger; it does not claim acceptance or actual use on the two PCs.

## Evaluation method and limits
- Official GitHub repository metadata was read for candidates on 2026-10-28: archived flag, default branch, latest pushed time and root SPDX metadata. Metadata with `NOASSERTION`, redirects or 404 is **not** legal clearance. For every vendored source file, review pinned LICENSE/NOTICE/dependency sub-licenses before copying; no new upstream file is copied by this matrix.
- Weighted *engineering judgement* score, not empirical benchmark: usefulness 30%, Windows/8GB fit 20%, security/legal 20%, integration/reuse 20%, maintenance 10%; five component scores each 0–5, total `6U + 4W + 4S + 4I + 2M` out of 100. A HIGH score does not override rights or owner's approval.
- `ADAPT_EXISTING` indicates original JREI code or already-adopted source patterns in the named **existing** files; `OPTIONAL_EXISTING` a conditional dependency interface. Other statuses cause no new import, download or binary installation.
- GitHub `pushed_at` does not imply successful security maintenance, Windows compatibility or a particular tagged release. `READ_ONLY` for Continue comes from its README, although GitHub archived flag was false. `REJECT_URL` means the URL in the handoff returned 404; it does not imply no other maintained project exists.
- `MODEL` data sources, tokenizers, pretrained weights and checkpoints carry separate licences; **no third-party weights or vocabularies are authorized**. Two separate 8GB GPUs must not be pooled by assumption. Windows distributed training has prototype backend constraints; schedule independent jobs until real GPU/network capability is observed.

## Pinned upstream branch HEAD observations (not pinned vendored commits)
- `karpathy/nanoGPT`: `3adf61e154c3fe3fca428ad6bc3818b27a3b8291` (observed branch HEAD only; before any verbatim port read precise source-file licence and dependency notices).
- `karpathy/minbpe`: `1acefe89412b20245db5a22d2a02001e547dc602` (observed branch HEAD only; before any verbatim port read precise source-file licence and dependency notices).
- `karpathy/nanochat`: `92d63d4e8bb4df75c3b71618f31ddde2378b2bcd` (observed branch HEAD only; before any verbatim port read precise source-file licence and dependency notices).
- `microsoft/markitdown`: `7482c092d9c0074a89803c9fdb63a969e7fe17fc` (observed branch HEAD only; before any verbatim port read precise source-file licence and dependency notices).
- `tree-sitter/py-tree-sitter`: `2e556e540dd4ccce0e24c92d4413ef9ac85284a5` (observed branch HEAD only; before any verbatim port read precise source-file licence and dependency notices).
- `asg017/sqlite-vec`: `04d28bd21773981e2d266bbf6aa4efbd011eb4f6` (observed branch HEAD only; before any verbatim port read precise source-file licence and dependency notices).
- `Aider-AI/aider`: `5dc9490bb35f9729ef2c95d00a19ccd30c26339c` (observed branch HEAD only; before any verbatim port read precise source-file licence and dependency notices).
- `continuedev/continue`: `5522c6f44ca0ac3528b37244818fbfa39b5af470` (observed branch HEAD only; before any verbatim port read precise source-file licence and dependency notices).

## Longlist: repository-level evidence and reuse-first decisions
| Area | Official upstream | Root SPDX / metadata | Last push UTC | Disposition | Existing JREI integration target / review-only path | Weighted score |
|---|---|---|---|---|---|---:|
| MODEL | [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT) | `MIT` | 2025-11-12 | `ADAPT_EXISTING` | `windows_native_scratch_training.py` | 90 |
| MODEL | [karpathy/minbpe](https://github.com/karpathy/minbpe) | `MIT` | 2024-07-01 | `ADAPT_EXISTING` | `_vendor/minbpe/*; windows_native_corpus.py` | 94 |
| MODEL | [karpathy/nanochat](https://github.com/karpathy/nanochat) | `MIT` | 2026-09-07 | `DESIGN_ONLY` | `checkpoint_manager.py; dataloader.py; loss_eval.py (design only)` | 80 |
| MODEL | [pytorch/pytorch](https://github.com/pytorch/pytorch) | `NOASSERTION` | 2026-10-28 | `OPTIONAL_LIBRARY` | `windows_native_neural.py (existing optional import)` | 88 |
| MODEL | [huggingface/tokenizers](https://github.com/huggingface/tokenizers) | `Apache-2.0` | 2026-10-28 | `DEFER` | `windows_native_corpus.py` | 78 |
| MODEL | [google/sentencepiece](https://github.com/google/sentencepiece) | `Apache-2.0` | 2026-10-28 | `DEFER` | `windows_native_corpus.py` | 78 |
| MODEL | [huggingface/safetensors](https://github.com/huggingface/safetensors) | `REDIRECT_UNVERIFIED` | unknown | `DEFER` | `windows_native_scratch_training.py` | 70 |
| MODEL | [Lightning-AI/litgpt](https://github.com/Lightning-AI/litgpt) | `Apache-2.0` | 2026-10-28 | `DESIGN_ONLY` | `windows_native_scratch_training.py` | 70 |
| MODEL | [EleutherAI/lm-evaluation-harness](https://github.com/EleutherAI/lm-evaluation-harness) | `MIT` | 2026-09-14 | `FINAL_QA_ONLY` | `windows_native_sealed_evaluation.py` | 86 |
| MODEL | [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp) | `MIT` | 2026-10-28 | `DEFER_RUNTIME` | `windows_native_inference.py` | 74 |
| MODEL | [microsoft/onnxruntime](https://github.com/microsoft/onnxruntime) | `MIT` | 2026-10-28 | `DEFER_RUNTIME` | `windows_native_inference.py` | 72 |
| MODEL | [microsoft/DeepSpeed](https://github.com/microsoft/DeepSpeed) | `REDIRECT_UNVERIFIED` | unknown | `HOLD` | `none` | 34 |
| MODEL | [Lightning-AI/pytorch-lightning](https://github.com/Lightning-AI/pytorch-lightning) | `Apache-2.0` | 2026-10-26 | `DESIGN_ONLY` | `windows_native_scratch_training.py` | 60 |
| MODEL | [vllm-project/vllm](https://github.com/vllm-project/vllm) | `Apache-2.0` | 2026-10-28 | `HOLD` | `none` | 46 |
| MODEL | [hiyouga/LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory) | `REDIRECT_UNVERIFIED` | unknown | `HOLD` | `none` | 32 |
| MODEL | [axolotl-ai-cloud/axolotl](https://github.com/axolotl-ai-cloud/axolotl) | `Apache-2.0` | 2026-10-28 | `HOLD` | `none` | 46 |
| MODEL | [huggingface/transformers](https://github.com/huggingface/transformers) | `Apache-2.0` | 2026-10-28 | `REFERENCE` | `windows_peft_training.py (optional existing)` | 64 |
| MODEL | [huggingface/peft](https://github.com/huggingface/peft) | `Apache-2.0` | 2026-10-28 | `REFERENCE` | `windows_peft_training.py (optional existing)` | 58 |
| MODEL | [allenai/OLMo-core](https://github.com/allenai/OLMo-core) | `Apache-2.0` | 2026-10-28 | `REFERENCE` | `windows_native_scratch_training.py` | 60 |
| MODEL | [EleutherAI/gpt-neox](https://github.com/EleutherAI/gpt-neox) | `Apache-2.0` | 2026-10-11 | `HOLD` | `none` | 44 |
| EVIDENCE | [mem0ai/mem0](https://github.com/mem0ai/mem0) | `Apache-2.0` | 2026-10-26 | `ADAPT_EXISTING` | `windows_evidence_memory.py` | 100 |
| EVIDENCE | [microsoft/graphrag](https://github.com/microsoft/graphrag) | `MIT` | 2026-10-28 | `DESIGN_ONLY` | `windows_evidence_memory.py` | 86 |
| EVIDENCE | [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | `MIT` | 2026-10-28 | `DESIGN_ONLY` | `windows_owner_tasks.py` | 86 |
| EVIDENCE | [asg017/sqlite-vec](https://github.com/asg017/sqlite-vec) | `Apache-2.0_OR_MIT` | 2026-05-18 | `DEFER_EXTENSION` | `windows_learning_fts.py` | 74 |
| EVIDENCE | [facebookresearch/faiss](https://github.com/facebookresearch/faiss) | `MIT` | 2026-10-28 | `REFERENCE` | `windows_learning_fts.py` | 60 |
| EVIDENCE | [run-llama/llama_index](https://github.com/run-llama/llama_index) | `MIT` | 2026-10-26 | `REFERENCE` | `windows_document_retrieval.py` | 68 |
| EVIDENCE | [chroma-core/chroma](https://github.com/chroma-core/chroma) | `Apache-2.0` | 2026-10-28 | `HOLD` | `none` | 50 |
| EVIDENCE | [deepset-ai/haystack](https://github.com/deepset-ai/haystack) | `Apache-2.0` | 2026-10-28 | `REFERENCE` | `windows_document_retrieval.py` | 64 |
| EVIDENCE | [unclecode/crawl4ai](https://github.com/unclecode/crawl4ai) | `Apache-2.0` | 2026-10-28 | `ADAPT_EXISTING` | `windows_continuous_learning.py` | 82 |
| EVIDENCE | [psf/requests](https://github.com/psf/requests) | `Apache-2.0` | 2026-10-26 | `REFERENCE` | `existing urllib adapters` | 82 |
| EVIDENCE | [beautifulsoup4/beautifulsoup4](https://github.com/beautifulsoup4/beautifulsoup4) | `NOT_FOUND` | unknown | `REJECT_URL` | `none` | 0 |
| EVIDENCE | [Trafilatura/trafilatura](https://github.com/Trafilatura/trafilatura) | `NOT_FOUND` | unknown | `REJECT_URL` | `none` | 0 |
| EVIDENCE | [isaacus/ttlcache](https://github.com/isaacus/ttlcache) | `NOT_FOUND` | unknown | `REJECT_URL` | `none` | 0 |
| CODE | [Aider-AI/aider](https://github.com/Aider-AI/aider) | `Apache-2.0` | 2026-05-22 | `ADAPT_EXISTING` | `windows_codebase_map.py; windows_workspace.py` | 98 |
| CODE | [tree-sitter/tree-sitter](https://github.com/tree-sitter/tree-sitter) | `MIT` | 2026-10-28 | `OPTIONAL_EXISTING` | `windows_codebase_map.py` | 96 |
| CODE | [tree-sitter/py-tree-sitter](https://github.com/tree-sitter/py-tree-sitter) | `MIT` | 2026-08-30 | `OPTIONAL_EXISTING` | `windows_codebase_map.py` | 94 |
| CODE | [astral-sh/ruff](https://github.com/astral-sh/ruff) | `MIT` | 2026-10-28 | `FINAL_QA_ONLY` | `final code-freeze lint` | 90 |
| CODE | [OpenHands/OpenHands](https://github.com/OpenHands/OpenHands) | `MIT` | 2026-10-28 | `DESIGN_ONLY` | `windows_project_workflows.py` | 70 |
| CODE | [continuedev/continue](https://github.com/continuedev/continue) | `Apache-2.0` | 2026-10-27 | `REFERENCE_READ_ONLY` | `windows-desktop/jrei_desktop.py` | 60 |
| CODE | [SWE-agent/SWE-agent](https://github.com/SWE-agent/SWE-agent) | `MIT` | 2026-10-26 | `DESIGN_ONLY` | `windows_code_experience.py` | 74 |
| CODE | [pre-commit/pre-commit](https://github.com/pre-commit/pre-commit) | `MIT` | 2026-10-20 | `FINAL_QA_ONLY` | `final code-freeze guard` | 88 |
| CODE | [PyCQA/bandit](https://github.com/PyCQA/bandit) | `Apache-2.0` | 2026-10-27 | `FINAL_QA_ONLY` | `final code-freeze security audit` | 90 |
| CODE | [semgrep/semgrep](https://github.com/semgrep/semgrep) | `LGPL-2.1_METADATA` | 2026-10-28 | `FINAL_QA_REVIEW` | `final code-freeze security audit` | 70 |
| CODE | [pytest-dev/pytest](https://github.com/pytest-dev/pytest) | `MIT` | 2026-10-28 | `FINAL_QA_ONLY` | `final integrated acceptance only` | 90 |
| CODE | [microsoft/autogen](https://github.com/microsoft/autogen) | `CC-BY-4.0_METADATA` | 2026-10-28 | `HOLD` | `none` | 38 |
| CODE | [crewAIInc/crewAI](https://github.com/crewAIInc/crewAI) | `MIT` | 2026-10-28 | `REFERENCE` | `windows_owner_tasks.py` | 54 |
| CODE | [anthropics/claude-code](https://github.com/anthropics/claude-code) | `NO_LICENSE_CONFIRMED` | 2026-10-27 | `REJECT_COPY` | `none` | 20 |
| DOCUMENTS | [microsoft/markitdown](https://github.com/microsoft/markitdown) | `MIT` | 2026-10-28 | `ADAPT_EXISTING` | `windows_office_structures.py` | 100 |
| DOCUMENTS | [py-pdf/pypdf](https://github.com/py-pdf/pypdf) | `NOASSERTION` | 2026-10-28 | `OPTIONAL_EXISTING` | `windows_document_retrieval.py` | 88 |
| DOCUMENTS | [python-openxml/python-docx](https://github.com/python-openxml/python-docx) | `MIT` | 2026-08-01 | `REFERENCE` | `windows_document_vault.py` | 92 |
| DOCUMENTS | [ericgazoni/openpyxl](https://github.com/ericgazoni/openpyxl) | `NOASSERTION_LEGACY` | 2014-03-08 | `REJECT_OLD_REPO` | `none; find current maintained upstream before copying` | 24 |
| DOCUMENTS | [scanny/python-pptx](https://github.com/scanny/python-pptx) | `MIT` | 2024-08-07 | `REFERENCE` | `windows_office_structures.py` | 74 |
| DOCUMENTS | [Unstructured-IO/unstructured](https://github.com/Unstructured-IO/unstructured) | `Apache-2.0` | 2026-10-28 | `HOLD` | `none` | 52 |
| DOCUMENTS | [rspeer/wordfreq](https://github.com/rspeer/wordfreq) | `NOASSERTION` | 2025-01-04 | `REFERENCE_DATA_RIGHTS` | `windows_native_corpus.py` | 48 |
| DOCUMENTS | [ArchiveBox/ArchiveBox](https://github.com/ArchiveBox/ArchiveBox) | `MIT` | 2026-10-28 | `REFERENCE` | `source provenance only` | 64 |
| DOCUMENTS | [apify/crawlee-python](https://github.com/apify/crawlee-python) | `Apache-2.0` | 2026-10-28 | `REFERENCE` | `windows_continuous_learning.py` | 64 |
| DOCUMENTS | [RSS-Bridge/rss-bridge](https://github.com/RSS-Bridge/rss-bridge) | `Unlicense` | 2026-10-28 | `REFERENCE` | `JREI News existing CMS only` | 62 |
| DOCUMENTS | [factchecklab/factchecklab](https://github.com/factchecklab/factchecklab) | `NOT_FOUND` | unknown | `REJECT_URL` | `none` | 0 |
| RUNTIME | [pyinstaller/pyinstaller](https://github.com/pyinstaller/pyinstaller) | `NOASSERTION` | 2026-10-25 | `EXISTING_BUILD_ONLY` | `jrei-windows-desktop-exe.yml` | 92 |
| RUNTIME | [open-telemetry/opentelemetry-python](https://github.com/open-telemetry/opentelemetry-python) | `Apache-2.0` | 2026-10-28 | `DESIGN_ONLY` | `windows_owner_tasks.py` | 86 |
| RUNTIME | [microsoft/onnxruntime](https://github.com/microsoft/onnxruntime) | `MIT` | 2026-10-28 | `DEFER_RUNTIME` | `windows_native_inference.py` | 72 |
| RUNTIME | [encode/uvicorn](https://github.com/encode/uvicorn) | `REDIRECT_UNVERIFIED` | unknown | `REFERENCE` | `none; existing 8092 server` | 62 |
| RUNTIME | [pallets/flask](https://github.com/pallets/flask) | `BSD-3-Clause` | 2026-10-07 | `REFERENCE` | `none; existing 8092 server` | 80 |
| RUNTIME | [psf/black](https://github.com/psf/black) | `MIT` | 2026-10-28 | `FINAL_QA_ONLY` | `final code-freeze formatting` | 84 |
| RUNTIME | [getsentry/sentry-python](https://github.com/getsentry/sentry-python) | `MIT` | 2026-10-28 | `REFERENCE_PRIVACY` | `windows_owner_tasks.py (no outbound telemetry)` | 76 |
| RUNTIME | [ray-project/ray](https://github.com/ray-project/ray) | `Apache-2.0` | 2026-10-28 | `HOLD` | `none; existing signed queue` | 46 |
| RUNTIME | [dask/distributed](https://github.com/dask/distributed) | `BSD-3-Clause` | 2026-10-28 | `REFERENCE` | `windows_fleet_planner.py` | 70 |
| RUNTIME | [redis/redis](https://github.com/redis/redis) | `NOASSERTION` | 2026-10-28 | `HOLD` | `none; preserve SQLite` | 36 |
| RUNTIME | [duckdb/duckdb](https://github.com/duckdb/duckdb) | `MIT` | 2026-10-28 | `DEFER` | `none; preserve SQLite` | 70 |
| RUNTIME | [grafana/grafana](https://github.com/grafana/grafana) | `AGPL-3.0` | 2026-10-28 | `HOLD` | `none; no second dashboard` | 32 |
| RUNTIME | [BerriAI/litellm](https://github.com/BerriAI/litellm) | `NOASSERTION` | 2026-10-28 | `REJECT_PROVIDER_GATEWAY` | `none` | 22 |

## Concrete acceptance and licence boundaries
1. **KEEP / NO NEW BINARY**: Existing SQLite + FTS5, original owner-task checkpointing, local vault, `windows_evidence_memory.py`, `windows_codebase_map.py`, `windows_workspace.py`, and the single authenticated 8092 service. Do not install competing agent/DB/dashboard.
2. **KEEP VENDORED ONLY PENDING FILE-LEVEL CONFIRMATION**: existing `_vendor/nanogpt/{LICENSE,model.py}` and `_vendor/minbpe/{LICENSE,base.py,basic.py}`; those original checked-in LICENSE files exist. Compare their source SHA/copyright against upstream release before redistribution. No copied weights.
3. **DESIGN-ONLY PREFERENCE**: nanochat `nanochat/{checkpoint_manager.py,loss_eval.py,dataloader.py}` are review candidates, not transplants. 8×H100 examples are not a two-PC acceptance recipe. No automatic `torchrun` or NCCL on Windows.
4. **DEFER NATIVE EXTENSION**: sqlite-vec has MIT OR Apache-2.0 upstream declarations and Windows support, but binary signing, extension-loading policy and backward compatibility must be certified before shipping. Existing FTS5 remains the fallback.
5. **REJECT / HOLD**: dead or moved URLs, unreadable licences, deprecated repositories, pretrained model pipelines, cloud/provider gateways, duplicate inference servers, new cluster frameworks and autonomous code execution. Semgrep root metadata shows LGPL-2.1; Microsoft AutoGen root metadata reported CC-BY-4.0; both require file-specific rights review and are not bundled.
6. **BUILD-TIME ONLY**: existing PyInstaller and Inno Setup on GitHub runner. Latest installer is GUI-only. Do not change workflow triggers, build or run tests under the current phase.
7. **SOURCE CONTRACT**: no extra backend port, no new SQLite database, no GitHub force-push, no privileged shell, no auto-publish or unsafe installation. Native checkpoint state cannot be declared active without real training + independent sealed bilingual evaluation + owner approval.

## Blockers carried into final integrated acceptance
- Actual Nvidia/AMD/Intel GPU model, driver, CUDA/Vulkan/DirectML support, measured free VRAM, network capacity, source-tree identity and Windows program execution on both PCs remain unverified.
- Source existence, build artifact, training candidate, evaluation, owner approval and live activation are separate states. This matrix establishes research/selection only.
- `P0` architecture freezes on existing 8092+SQLite+signed fleet; `P1` GUI/installer; `P2` evidence and citation; `P3` scoped patch approvals; `P4` metacognition; `P5` scratch model; `P6` fleet; `P7` single final acceptance.

## Official source references read in this session
- https://github.com/karpathy/nanochat/blob/master/README.md (8×H100, single-GPU hyperparameter reduction and model quality limitations).
- https://docs.pytorch.org/docs/stable/distributed.html (Windows prototype; no NCCL under Windows documented).
- https://github.com/continuedev/continue/blob/main/README.md (not actively maintained; read-only).
- https://github.com/asg017/sqlite-vec (pre-v1 extension and dual-license paths).
- https://jrsoftware.org/ishelp/topic_setup_closeapplications.htm (Inno restart/close behaviour).

**Repository metadata observations:** 71 rows, including some duplicate cross-domain references; not 71 unique integrated packages. No tests, builds, installs, downloads, training or deployments performed.
