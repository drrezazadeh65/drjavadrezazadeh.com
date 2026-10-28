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


## Continuation: evidence, grouped code review and metacognition — SOURCE ONLY

This section is appended after the original source freeze checklist, without changing final-acceptance requirements. Every row records a GitHub source commit on `migration/bertina-linux6`; it does **not** claim that the code has run on either Windows PC.

| Scope | Actual committed source change | Commit |
|---|---|---|
| P2 / original-document integrity | `windows_document_retrieval.py`: re-hashes the original owner-vault file for all supported formats before retrieval; interleaves selected excerpts across up to two documents; adds SHA-256 passage evidence and actual post-budget counts. | `097dbd3460225a0bf4a61356291228b1ed3f731f` |
| P2 / grounded answer | `windows_owner_agent.py`: fixes literal newline escape delimiters in memory RAG prompt; appends independent source-anchor manifests after successful selected-document synthesis and notes unreadable documents without asserting full-document review. | `a7e6d07b6ec5d23c333e5aa4e3e3f0a1f9da2e79` |
| P3 / grouped proposal | `windows_workspace.py`: composes 2–5 **already individually owner-approved** isolated draft receipts into one bounded, deterministic, per-file hash-revalidated, read-only review bundle; performs **no** atomic multi-file apply. | `d98682080ff16d8d399cd2c2c2daad13e4c55bdc` |
| P3 / private API | Existing authenticated 8092 API adds `GET /api/workspace/bundle?ids=...`, never grants GitHub rights or opens a network port. | `8399455af300c2367ce94eafbd78c310dfdae151` |
| P1/P3 / UI | Native Tk GUI displays source-verified grouped Diff and receipt references in an explicit read-only review window. | `ae03e85d9264bcf809075d0a154775b1598ea86b` |
| P4 / priority policy | Existing `windows_resource_policy.py` defines the 02:00–05:00 Asia/Tehran higher-frequency study cadence, with labelled UTC+03:30 fallback; rights/robots/resource admission unchanged. | `71cc1047ccfcbf1b01a2d3e58673dd1044a5e181` |
| P4 / scheduler | Existing 8092 scheduler now uses time-dependent local FTS/agenda/memory/auto-topic intervals, not a hard stop outside the night window and not a daily global quota. | `8a83616ad6a84e1901f7b11716566239d69ef778` |
| P4 / private metacognition | Existing learning-agenda snapshot now reads counts of HMAC-keyed learning gaps and due approved sources, rather than returning private user queries or treating source coverage as independently validated learning. | `e4fb086d9510d5cad76f59742203e83ec5f5a111` |
| P1/P4 / native status | Existing engine status window displays gap totals, observed source-coverage changes, due source counts and Tehran priority indicator without claiming model training. | `6c27a50a7d8f0391eab5eabff3b89e5962f79c54` |
| P1 / security | Desktop urllib opener refuses **all** HTTP redirects, preventing private owner bearer token forwarding from 127.0.0.1:8092. | `c2d3a1b541b45f8395e6b8c5e1bfa3dbad0a2190` |

### Still open (do not mark completed)
- Native scratch model training to a trustworthy Persian/English response level remains empirical work needing legal datasets and real independent sealed evaluations.
- Two-PC GPU/driver/network capability, signed live presence, installation and OS-level native GUI functionality remain unobserved in this workstream.
- Multi-file **atomic application** is **not** implemented: bundled receipt preview is a separate, safe partial milestone, not an automated merge/push.
- Automated code promotion, source-rights attestation, site deployment, live examination outcomes, full-document semantic understanding and unrestricted self-improvement have **not** been performed or established.
- Per owner instruction no tests, CI runs, Windows EXE packaging, installation, training or Bertina deployment were executed during this continuation. Owner-app integrated acceptance JSON remains default-deny.

## Continuation: source-only scratch-model reliability and recorded status

All changes below remain **unexecuted source code**. No local owner PC or external host was accessed by this continuation. The canonical Windows 8092 process, private SQLite, repository branch and owner-release rules remain unchanged.

| Priority | Concrete source change | GitHub commit |
|---|---|---|
| P5 | `windows_native_corpus.py`: distribute candidate read rows across sources, group training/development/sealed partitions by owner-reviewed issuer label, detect normalized duplicate passages, require script-coverage floors for all three partitions. An issuer label does not prove independent institutional identity. | `a12e89f6d8079329b5cc3ebf426cc78388843d9a` |
| P5 | On reload of a staged corpus, re-check each source ID, SHA, issuer, trainable licence, publisher partition fence, exact token-file size and file SHA. Older manifests lacking stronger provenance are conservatively ineligible. | `0bbc47dfbe2d684db5055450e70f942522b3b20c` |
| P5 | Scratch nanoGPT trainer now uses fixed development-validation window offsets before and after training, independent of the training sample RNG. This does **not** evaluate Persian/English fluency; sealed evaluation remains separate. | `8e435838744ed3e6a543aced3f810abee10e72c9` |
| P5 | Added read-only source/publisher preflight; installed on original owner `status()` without preparing data, running torch or creating checkpoints. | `b849aea11d72ed9ff087fb5999b878c91f837d09`, `275d0dfbc43277c8bdeef16c3c5fd9cb61397f79` |
| P1/P5 | Native Windows UI displays the recorded real eligibility sample, expressly without claiming bilingual corpus completion. | `6c3971a058f2ee63f8565a0b068fccad172e16b8` |
| P5 | Existing native statistical baseline and legacy small-neural trainer now exclude source licences not in the explicit trainable allowlist and reject publisher-identity / duplicate Q&A leakage between train and heldout. | `8cada4d93c482965fa2e4f335d3995d20c8cc0c7` |
| P5 | Private curriculum supervised export now rejects disallowed training licences, overlapping issuer labels and repeated Q&A content across learning/heldout roles. | `ba8f78302ab11a2fd8fab471c9d771647e351a09` |
| P5 | Scratch-run manifest includes partition/script evidence and refuses nonfinite training losses/gradients before new optimizer updates. | `1248024a6bef37cfaa5e0bdecaec096539e2d6ba` |
| P5/P6 | Both existing owner-approved neural training paths re-check *local measured* CUDA memory availability on long jobs instead of relying on startup VRAM capacity alone. No cross-PC pooling. | `a36d73f69ae8180e1694d660b58a635a903aad3a`, `c0fd44a21f85ce9f3bc9f8257240f5e0072e9402` |
| P5 | Added read-only previous-run receipt inventory that never loads or hashes a checkpoint, plus status and Tk GUI wiring; saved SHA is explicitly **unverified now**, not model activation. | `7f86e0b3a8a59f82514d7e6e26ea67299033e3b6`, `1aeb2e9da9444ef44a53cc365e022afbaa39e1e9`, `da9741566f1299c0fddd893055cae2fc913b742a` |

**Unresolved approval gates:** actual owner-permitted bilingual corpus quality; source identity and licensing evidence; source-rights audit beyond labels; genuine model-training runs, independently sealed measurements, human Persian/English review, independent acceptance, Windows GPU driver confirmation, signed physical-node telemetry, installation and release. A change in cross-entropy or source-index coverage cannot alone establish language competence. No tests, training, app packaging, deployment, CI dispatch, production writes or real local-PC observation took place in this coding continuation.
