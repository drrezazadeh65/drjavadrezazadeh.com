# JREI V5 — 10x better Drive source intake and contract comparison (23 October 2026)

**Status: SOURCE INSPECTED; NOT INTEGRATED, NOT EXECUTED, NOT OPERATIONALLY VERIFIED.**

## Source provenance

Google Drive folder: https://drive.google.com/drive/folders/1xgY2tXVuTbw_D1i7qckHhkutqHpONNa9

The Drive objects have `.crdownload` names and `application/octet-stream` MIME type, but their downloaded bytes are valid UTF-8/ASCII **JavaScript source text**, not LLM weights. The filenames below are **inferred from imports and exports**, not verified original upload names. Original bytes were examined without executing the scripts. Do not mistake an apparently complete last line for independently proven download completeness.

| Drive object / downloaded name | Inferred logical module | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `Unconfirmed 158143.crdownload` | `jrei-verify.mjs`, citation verification | 3,491 | `c4e972e172a8c520ae2f7831e39b8656f22ff5c998260a3f4dde312bc42f031b` |
| `Unconfirmed 205708.crdownload` | `jrei-orchestrator.test.mjs`, Node test source | 3,463 | `f671a2b270916c93f9efc7f6920eaa5faa111fee7693c97c159e31f24c244804` |
| `Unconfirmed 486649.crdownload` | `jrei-orchestrator.mjs`, V5 entrypoint | 1,145 | `7345eae45d492a206eab8f9b658735c4cab00ac1da5774843090b463c0692249` |
| `Unconfirmed 49313.crdownload` | `jrei-retrieval.mjs`, Persian-aware BM25 | 2,844 | `dd516f277f01f972da8607e5cf9b0742975e6040687699f6324b13953ef3251d` |
| `Unconfirmed 659200.crdownload` | `jrei-engine.mjs`, bounded agentic loop | 12,995 | `a3699470c06266ca5dc4c2977292b3349c4b0409cd07d11b152f420b4f89c024` |
| `Unconfirmed 676217.crdownload` | `jrei-model-adapter.mjs`, provider-neutral inference adapter | 15,539 | `cb8fc018aaa29d4d29b9892fabd8f0e9c898a0c5d81c2843ff7fae3e2b2f66f0` |

The user's personal Library separately contains earlier `jrei-contracts.mjs`, `jrei-prompt-guard.mjs`, `jrei-evidence.mjs`, `jrei-tool-registry.mjs` and a prior `jrei-model-adapter.mjs`. These dependencies are **not** included in this six-file Drive folder. Cross-version API compatibility must be checked before enabling or replacing any module.

## Comparison with canonical repository

Canonical repo's existing `platform/educational-intelligence-v3.mjs` and its catalogue/evidence adapters are pure, deterministic, public-read-only contracts. They do **not** expose a live model or approve clinical/scientific outcomes; production-facing `assets/js/assistant.js` continues static fallback and `platform/assistant-runtime-policy.json` retains model-disabled state. None is to be overwritten.

The V5 Drive sources add valuable **candidate** components:
- model-neutral invocation, structured output, streaming and usage accounting;
- orchestration with a fixed maximum number of educational tool calls and reviewable evidence;
- Persian-aware lexical retrieval with optional embedding hook, not yet a vector database;
- citation and unsupported-number checking, plus one or fewer repair rounds;
- isolated integration-style test source.

**Important source gaps identified by inspection (not measured test failures):**

1. `jrei-verify.mjs` treats uncited claims and unsupported numbers as **warnings**, while `ok` depends only on fatal issues. It measures `groundedness` as *fraction of evidence items cited*, not actual semantic support for each claim. A sentence can therefore appear `verified` without substantive sentence-level evidence.
2. The programme-code verification searches the **question and all evidence**, not specifically the cited record. This can incorrectly associate a programme code with an unrelated citation.
3. `jrei-engine.mjs` can return an **unverified draft** in `answer.text` if verification fails, leaving publication/disclosure gating to its caller. The hybrid gateway must NEVER display such drafts as authorized educational answers.
4. The `jrei-retrieval.mjs` evidence store accepts caller-supplied objects and does not itself validate consent, expiry, issuance, amendment priority or source review; memory limits, deletion and sensitive-data exclusion must be enforced by a trusted server layer.
5. `jrei-model-adapter.mjs` includes generic external provider adapters; the user's present cost policy forbids activating a paid API and the current source does **not** demonstrate a functioning local Windows inference runtime. Model/provider secrets and model selection must remain private and allowlisted.
6. The V5 folder provides **no Bertina mother-DB AI queue, Windows 11 worker, short-lived worker credentials, job leases, node registration, heartbeat or operational admin telemetry**. Those must be built as new optional, disabled-by-default modules integrated with existing accounts/security.
7. Any document uploaded under a `.crdownload` name might be incomplete; source hash and contents are preserved in this intake, but genuine original filenames, fully completed downloads and integration tests remain unverified.

## Safe next implementation order

1. Keep current public static fallback, payments, services, dashboards, database, URLs and owner operations unchanged. New hybrid AI stays behind a hard OFF switch.
2. Implement minimal, auditable, source-compatible V5 contracts in a separate versioned `platform/jrei-v5/` location **after** the dependency review, not by replacing v3 APIs.
3. Strengthen citation verification to fail closed for high-consequence claims, use citation-specific provenance, and gate the release of all uncertain drafts. Do not equate citation count with scientific validity.
4. Add the mother's additive AI-node/lease/job/status migrations **as drafts** only; use per-job purpose consent, metadata-only audit and no raw learner PII by default.
5. Create outbound-polling Windows CPU-first inference worker with allowlisted jobs and short-lived authentication. Avoid inbound hotspot/CGNAT dependency, arbitrary remote commands, hardware purchases and unsupported AMD CUDA promises.
6. Connect source-owned hybrid availability (ONLINE/BUSY/DEGRADED/OFFLINE/MAINTENANCE) into existing bilingual MFA administration with honest UNKNOWN status until host and Windows evidence exists.
7. Reserve Windows hardware benchmarks, actual licensed-model downloads, live host integration, staged security testing, database migration and any production deployment for the single final owner-approved acceptance programme.

**Policy:** Do not run code, database migrations, experiments or inference during this source intake. The exact user directive is separately frozen at `docs/governance/JREI_HYBRID_AI_SUPER_MASTER_IMPLEMENTATION_PROMPT_20261023.md` and in the Google Doc in the same Drive folder. This document is a scientific/technical review note, not validation evidence.
