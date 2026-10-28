# JREI — Final integrated P0–P7 coding checklist (2026-10-28)

**Canonical:** `drrezazadeh65/drjavadrezazadeh.com` / `migration/bertina-linux6`. **Mode:** CODING ONLY — no tests, no packaging run, no Windows installs, no Bertina deploy. Preserve production URLs, one-click publishing, all signed worker identities, data and original auth/SQLite/8092 interfaces.

**Status semantics:** `SOURCE_EXISTS` = file checked in; `WIRED` = source routes call it (not validated); `BUILT` = GitHub packaging output; `VERIFIED_ON_PC_A|PC_B` = separately witnessed; `TRAINED` = produced measured checkpoint; `EVALUATED` = source-disjoint sealed bilingual evidence; `APPROVED` = explicit owner activation. Never promote status by inference or documentation alone.

## Fixed implementation order; no parallel subsystems

### P0 — Repository and upstream provenance
- [x] Obtain exact canonical live HEAD and enumerate existing Windows GUI, 8092 backend, 8091 legacy health, native scratch model and governance.
- [x] Inspect previous adoption ledgers, default-deny promotion record and conflicting historical Qwen directive. **Latest owner handoff supersedes legacy Qwen inference routing; do not delete the legacy worker.**
- [x] Audit 71 OSS longlist entries/metadata and priority exact upstream branch heads; see `JREI_FINAL_OPEN_SOURCE_ADOPTION_MATRIX.md`. Failed URLs, unverified rights and source-file notices are flagged, not licensed by assertion.
- [x] Fix architecture contract: one original Tk UI, one existing private 8092 command center, one original SQLite store, existing signed workers/queue; no extra model manager.
- [ ] Before any *future* verbatim upstream incorporation, confirm exact file-level copyright, NOTICE, version/hash, transitive licences and security; no such new incorporation authorized by the research ledger.

### P1 — Windows native client and installer source
- [x] Existing Tk UI and per-user Inno setup, desktop/Start-menu shortcut and no auto-run; original GUI build reported in handoff.
- [ ] Native UI backend-version vs source-version mismatch must be visibly disclosed; never equate local HTTP availability with accepted scratch model.
- [ ] Harden UI task/thread error and stale-response handling, Persian/English direction, keyboard, high-DPI and accessibility without modifying private backend.
- [ ] GUI shows attached file import limits, local owner approvals, real task progress, local code diff/receipt preview and true training state.
- [ ] Installer rollback source, no reboot, no registry/data deletion, owner-gated backend start; final installer packaging deliberately held.
- **Acceptance:** clean per-user install on each real Windows PC; no surprise restart, no extra browser/app, icon created, private history preserved, backend offline state truthful. **NOT TESTED.**

### P2 — Source-grounded answering
- [x] Existing private vault, source hashes, anchor-aware PPTX/XLSX/PDF/DOCX retrieval and no-model extractive fallback.
- [ ] Preserve verifiable source passage hashes and documented sampling limits, including when the PDF parser is absent; never invent PDF page anchors.
- [ ] Reliable per-document coverage indication, contradictory source flags, source withdrawal/re-index version, and source trust label.
- [ ] Avoid fake token streaming and fabricated citations; source results are untrusted content, not instructions.
- **Acceptance:** full source lineage for selected documents, no silent training on private data, independent factual review. **NOT TESTED.**

### P3 — Scoped coding agent with separate owner authorities
- [x] Read/search/map source; isolated local edits, one-time approvals, local immutable receipts, remote HEAD/blobs gated for GitHub.
- [ ] Before owner confirms *local edit*, show explicit target/operation; before owner confirms *GitHub write*, show exact unified diff, old/new SHA, original remote HEAD and separate permission. A local edit confirmation MUST NOT grant remote write.
- [ ] Atomic bounded multi-file patch proposal only after file-by-file path allowlist and source hashes; no shell or arbitrary execution.
- [ ] Local receipt preview and safe rollback; distinguish draft-generated from patch-approved and GitHub-pushed.
- **Acceptance:** source→draft→review→scoped write/rollback with real receipts and no production action. **NOT TESTED.**

### P4 — Metacognition and continuous evidence learning
- [x] Original learning agenda, study source register, SQLite tasks, evidence graph, source version and gap tables exist.
- [ ] Define measured learning opportunity from real user task gaps, licence-cleared acquisition, contradictory evidence and calibration.
- [ ] Sealed assessor independent of proposer, skill registry and before/after comparisons, owner review; no self-approval.
- [ ] Adaptive 24/7 scheduling, prioritizing 02–05 Asia/Tehran for heavy work (not exclusive), with idle/RAM/IO safeguards.
- **Acceptance:** explainable provenance→gap→source→rehearsal→evaluation→owner promotion; no claim based on crawl counts. **NOT TESTED.**

### P5 — Own trained Persian/English model
- [x] Native scratch training/corpus/inference/sealed evaluation source and MIT vendored nanoGPT/minbpe source code exist.
- [ ] Dataset consent and rights manifest, Unicode Persian/English tokenizer robustness and source-disjoint sealed holdout.
- [ ] Measured 8GB GPU capabilities, small microbatch, gradient accumulation, OOM recovery, checkpoint provenance/secure serialization.
- [ ] GUI training operations remain explicit; no auto-download pretrained weights, no silent training or promotion.
- [ ] Independent bilingual/coding/education/hallucination/privacy evaluation, explicit owner acceptance. Small model != ChatGPT.
- **Acceptance:** `NO_TRAINED_MODEL / CANDIDATE_TRAINED_UNREVIEWED / EVALUATED_NOT_APPROVED / OWNER_APPROVED_ACTIVE` with authentic hashes; no claim of performance without data. **NOT TRAINED OR EVALUATED IN THIS WORKSTREAM.**

### P6 — Actual two-PC resource capacity; future logical fleet
- [x] Existing resource envelope, scheduler policy, signed Ed25519 site-to-node queue and preview-only fleet planner found.
- [ ] Read-only per-node GPU vendor/model/driver, VRAM total/free, RAM/CPU, bus/network + freshness; never expose private serial identifiers.
- [ ] Pairing, identity rotation/revocation and existing signed node report validation; NO extra listener/controller.
- [ ] Admission by job budget and owner activity; no shared VRAM assumption or 50 phantom connected nodes.
- **Acceptance:** both real signed PCs observed independently, fairness and suspension under owner use. **NOT VERIFIED.**

### P7 — One final acceptance and owner-gated installer (HELD)
- [ ] Freeze exact code tree AFTER P0–P6 coding closure.
- [ ] Owner explicitly authorizes **one final integrated** suite including security, GPU/RAM, GUI, vault, agent approval, rollback and bilingual model scoring; no earlier tests.
- [ ] Reconcile actual source SHA, installer SHA256/unsigned-or-signed flag and default-deny acceptance JSON; never flip flags without evidence.
- [ ] Owner-gated standalone Windows installer on both PCs. Bertina publication only under an independent explicit instruction through the already frozen one-click GitHub Actions route.
- **Current evidence:** `integratedAcceptancePassed=false`, both Windows verification fields false, no claim of trained capable LLM, no new deployment.

## Work boundaries and operational invariants
1. Source code and docs only on canonical branch, using fresh blob SHA on each update; forward-only, no force push, no speculative resets.
2. No destructive migration, unnecessary parallel databases, new ports, new public URLs, site changes, or owner secrets in Git.
3. Owner privileges: local edit ≠ GitHub push ≠ production publish ≠ train/activate checkpoint. Every high-impact action separately consented.
4. No automatic tests or CI/build dispatch during development; Git commit messages use `[skip ci]` to avoid unrequested pipeline execution.
5. This checklist is a source-development and final-acceptance contract, **not a claim of implementation, benchmark success or live Windows install**.

## Source development progress after checklist freeze — NOT functional acceptance

The following specific source changes were committed on the sole canonical branch. They remain `SOURCE_EXISTS` / `WIRED_IN_SOURCE_ONLY`, not `VERIFIED_ON_PC`.

| Package | Source changes and acceptance boundary | Observed commit |
|---|---|---|
| P3 / scoped coding | `windows_workspace.py` records exact `diff_sha256` and exposes a hash-revalidated, read-only `preview_diff` using existing private receipts and snapshot files. | `f64e0c8149c190bb9464ad5928dd60e6af21b702` |
| P3 / local rollback | The same existing workspace now restores exact owner-private snapshots via atomic same-folder replacement, with hash/conflict checking and no source-tree or production write. | `0cf0e460b33ca11882abaf182454325a0b33bd3d` |
| P3 / API | Existing owner-authenticated 8092 API now serves `GET /api/workspace/diff?id=...`. No new port, database or execution interface. | `5062cb0bd795136d5c8ed10c17c543e3b35e9215` |
| P1 + P3 / Tk UI | Native GUI can display the actual local draft unified diff and before/after hashes after an approved local edit, or from a named receipt; it cannot authorize GitHub publishing. | `e9e7d255833325702fcecea5a6d9e17cc15315ea` |
| P5 / model truth | `windows_native_neural.snapshot` returns registry checkpoint SHA and `CANDIDATE_TRAINED_UNREVIEWED` if a run is recorded; never treats SQLite flags as independent quality evidence. | `82f4b79b841b46ac8b9d4e701704caf185d7db3e` |
| P1 + P5 / model UI | Native Tk status displays recorded neural checkpoint and flags integrity as not checked; no activation claim. | `af235a96bfea8b32b2a319f31fe1d1110b9ab0f0` |
| P6 / local sensor | Existing Win32 resource sensor and optional PyTorch CUDA probe now label observation time, first local GPU name, CUDA runtime and unknown driver. | `54520fec07cd7e274b0b4580ea92dfb8e87df59c` |
| P6 / API | Existing authenticated 8092 API adds read-only local-only `/api/resources/inventory` on explicit request; remote PC remains UNKNOWN. | `c228f346b4a613189267b52ed69d1d55b3df117a` |
| P1 + P6 / Tk UI | New native user-initiated per-PC hardware inventory screen with honest remote-machine unknown and no assumed 16GB VRAM pool. | `3598f6acf9b14a19d153ae65fae0579d3d3bc43e` |

**Unchanged prohibitions:** No integrated tests, no build or installer dispatch, no model training, no owner-private PC telemetry actually read by this workstream, no Windows installation, no Bertina deployment, no acceptance-bit changes. Remaining [ ] items above are not silently completed. Commit messages contain `[skip ci]` and no CI workflow was dispatched by this workstream.
