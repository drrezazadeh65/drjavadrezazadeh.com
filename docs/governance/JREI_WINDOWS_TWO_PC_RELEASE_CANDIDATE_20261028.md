# JREI original Windows personal AI — two-PC release candidate

Date: 2026-10-28
Canonical repository: `drrezazadeh65/drjavadrezazadeh.com`
Canonical development branch: `migration/bertina-linux6`
Disposition: **SOURCE PACKAGE PREPARED; RELEASE HELD FOR FINAL INTEGRATED WINDOWS ACCEPTANCE.**

## The owner's exact goals

Provide one JREI Windows application that feels conversational, has local private chat history, source-backed learning, code drafting, reviewable GitHub integration, document handling and a real path toward training JREI's own native neural model from scratch. No separate model application, no third-party pretrained LLM, no paid API or chatbot subscription. Work on two owner's Windows machines now: owner reports one with 16GB RAM and the other 32GB RAM, each with nominal 8GB graphics. GPU compute compatibility and live RAM are not remotely verified. Future signed fleet scales beyond 50 nodes, without assuming that any additional device exists.

## All existing services are preserved

- Website hosting: Bertina, URLs and original one-click owner GitHub Actions deployment remain untouched.
- Owner private Windows app: 127.0.0.1:8092 authenticated loopback, existing Task Scheduler, existing SQLite mission and chat database.
- Existing signed two-PC website workers and the separate Python 8091 service are not restarted by source preparation.
- GitHub source sync is non-destructive fast-forward, typically scheduled every 30 minutes on an owner PC where the sync task has been enabled.
- No owner credentials, tokens, private documents or chat contents are uploaded from this candidate.
- No automatic promotion of AI-generated code; source edits remain isolated and approval-gated.

## Staged application modules

| Area | Actual checked-in code | Meaning |
|---|---|---|
| Conversation experience | `windows_owner_ui.html`, `windows_owner_agent.py`, `windows_command_center.py` | Existing owner chat, history, copy, source citations, actual job progress. No ChatGPT-grade native LLM proven |
| Source-only learning | `windows_continuous_learning.py`, `windows_learning_agenda.py`, `windows_evidence_memory.py` | Consent-aware educational knowledge, evidence and gap tracking |
| Native language training | `windows_native_brain.py`, `windows_native_neural.py`, `windows_native_corpus.py`, `windows_native_scratch_training.py`, `windows_native_sealed_evaluation.py` | Bounded, owner-approved statistical and random-initialized neural experiments; no verified or active general model |
| Training source libraries | MIT `_vendor/nanogpt`, MIT `_vendor/minbpe` | Code and algorithms; not pretrained weights |
| Private uploaded documents | `windows_document_vault.py`, `windows_document_retrieval.py`, `windows_office_structures.py` | Existing SHA256-verified owner vault; TXT, DOCX, PDF (if optional pypdf), PPTX and XLSX structural extraction |
| Programming | `windows_codebase_map.py`, `windows_workspace.py`, `windows_project_generator.py` | Repo map, guarded local code draft, explicit owner-gated source edits; no automatic live website writes |
| GitHub research and code publishing | `windows_github_operator.py`, `windows_open_source_discovery.py` | Read-only source research; restricted GitHub patch write requires scoped token, owner-reviewed receipt and exact remote HEAD; no GitHub workflow dispatch |
| Resource limits | `windows_resource_envelope.py`, `windows_resource_policy.py` and original signed-worker capacity | Measured CPU/RAM/idle GPU compatibility where available, protects owner's active workstation |
| One-click launch | `platform/jrei-v5/windows-worker/JREI-START-INDEPENDENT-AI.cmd` | Sync exact canonical source first, then only attempt reviewed application activation |
| No-install readiness | `platform/jrei-v5/windows-worker/JREI-WINDOWS-READINESS.cmd` | Per-machine report: checks tracked repository, the original scheduled task, private authenticated loopback, source commit, and final acceptance record |

## Fixed activation integrity

Earlier installer could report success when only the source had been updated and the old private panel was still running. This release candidate now distinguishes three outcomes:

1. **SOURCE ONLY:** GitHub fast-forward received new code, no private app change.
2. **RELEASE HELD:** Final integrated acceptance record does not match the exact Python source tree; owner-private app remains untouched. If owner activity or missions are in progress, the existing updater also refuses an unsafe restart.
3. **REVIEWED SOURCE RUNNING:** After approved installation the app is authenticated and reports the *actual* source commit equal to the checked-out canonical commit. Only then is activation reported successful.

The approval document `docs/governance/JREI_WINDOWS_OWNER_APP_APPROVED_SOURCE_V1.json` is deliberately **default-deny**. No one is to set `integratedAcceptancePassed=true` or issue a source-tree approval until there are real acceptance results. Changing the JSON flag without independent evidence is not testing.

## One final integrated acceptance, not during development

The *only* final release window must establish on **each** of the two Windows PCs: canonical clean source/branch; owner-SID scheduled task; available compatible Python; accessible authenticated private status and chat history; real CPU/RAM/GPU observations; optional import resolution; no unrequested downloads; safe owner consent, rollback and task state; static source/interface behaviour; working source-backed conversation; and real GitHub read-only access (a GitHub write requires a separate owner-approved operation). Test the functional chain without touching live Bertina, published URLs, payments or customer data. A real native checkpoint also needs separate training-data rights, training execution and sealed bilingual evaluations; it is **not** a prerequisite for the limited evidence-only Windows chat, but without it there can be no claim of ChatGPT-equivalent language performance.

No local Windows acceptance has yet been performed by this chat, and no result should be invented or assumed from a source commit. Before acceptance, **do not run the one-click installer expecting a certified release**; it is designed to hold the unapproved source safely.

## Files to use when the owner authorizes the final acceptance

1. `JREI-WINDOWS-READINESS.cmd` — one-click read-only status on the first PC, and separately on the second.
2. After both devices pass the final integrated acceptance and source-tree approval is recorded, `JREI-START-INDEPENDENT-AI.cmd` — one-click owner-confirmed install on each PC.
3. The ordinary JREI command-center desktop shortcut opens the original authenticated loopback JREI app; this does not install or grant model training privileges.

**Remaining truth condition:** Source readiness != model-trained != Windows-installed != website-deployed. An activated evidence-only JREI app remains useful for retrieval and controlled project work, while the native LLM must be trained and independently measured before being called capable.
