# JREI Windows continuous learning — source-only engineering record (28 October 2026)

**Scope:** Only Windows JREI. Canonical repository: `drrezazadeh65/drjavadrezazadeh.com`, branch `migration/bertina-linux6`. Nothing in this change authorizes a Bertina/website deployment, a mother-DB migration, unrestricted scraping, model replacement or an open inbound port. The original private owner service, signed worker identities, Qwen inference and safe release workflow remain intact.

## Continuation implemented in source

- `platform/jrei-python/jrei_service/windows_continuous_learning.py` extends the existing **private command-center `missions.sqlite3`**. It keeps independently revocable reviewed source entries, content-addressed versions, chunk provenance, URL discoveries in a **review queue**, and privacy-preserving keyed-hash gap observations.
- Each configured source is an exact HTTPS URL, with owner-reviewed public-reuse rights, issuer, licence and trust metadata. The transport rejects redirects, proxies, embedded credentials, private/reserved resolved IPs, insecure hosts, unapproved MIME types, oversized responses and missing usable robots metadata; each request uses public-IP-pinned verified TLS and a fixed User-Agent. Link discovery **does not** authorize more URLs.
- Runtime `tick` is wired into the existing Windows background scheduler and returns without network access when the private network switch is off. When configured and not owner-busy, it samples real **Windows CPU, available RAM and free disk** before at most one reviewed source request per cycle. It does not pool memory between PCs or promise use of unknown GPU capabilities. The existing inference preference uses the locally available Qwen GPU backend and falls back to its original CPU path; no new model launch/driver changes are made.
- The same private owner vault allows an explicitly selected document to be independently opted into **retrieval indexing**, without automatically authorizing weight training. Deleting a vaulted document removes its associated learning index. Historical source versions remain tagged unverified until independently reviewed; neither content hashes nor declared issuer are themselves factual validation.
- `windows_owner_agent.py` can now use the indexed chunks for contextual, source-anchored Qwen answers and records no-source gaps as **HMAC** identifiers, without persisting the raw gap question in the new learning tables. Existing owner-message history remains governed by the original chat retention.
- `platform/jrei-python/jrei_service/windows_model_curriculum.py` can draft one source-grounded comprehension exercise during a quiet local study cycle. Drafts are not trusted truth or training samples. Independently reviewed metadata, disjoint training/heldout source sets and owner confirmation are required before a private adapter-training **candidate dataset** may be staged. Confidential owner documents are excluded from that exported training set. This **does not train any weights**.
- `windows_owner_ui.html` adds authenticated local status, source-register rights confirmation, source-constrained network enable/disable and explicit owner-document indexing. This lives inside the **original** 127.0.0.1:8092 private owner panel; no replacement dashboard or new network port exists.

## Priority architecture and growth path

1. **Evidence acquisition:** Expand the exact reviewed educational, language, academic and official-source catalogue, with rights/robots, hash/version, source provenance, corrections and publisher withdrawal. Current transport handles only bounded UTF-8 text/HTML; external PDFs, OCR, sitemaps, richer document parsing and cross-domain rights remain future work.
2. **Learning to learn:** Connect demonstrated unanswered-query and reviewed error categories to the existing deterministic `jrei_learning.value_of_information`, `prioritizer`, `metacognitive_cycle` and `jrei_orchestrator.adaptive_capacity` contracts. A query digest alone cannot specify its topic or establish a knowledge gain. Maintain independent negative and heldout evidence.
3. **Local model improvement:** Mature retrieval/attribution quality first. Candidate SFT/LoRA requires a **trainable compatible base model (GGUF inference weights alone are insufficient)**, proper licence, separately reviewed labels and GPU/CPU feasibility, isolated heldout comparisons and a reversible owner-approved promotion. The Windows RX 580 cannot be assumed CUDA/ROCm-compatible and neither PC's resources can be pooled as one GPU.
4. **Distributed execution:** Retain the pre-existing Windows signed/outbound identities and controlled task leases. No local Windows source commit establishes real dual-PC orchestration or changes the live website. Each node must independently verify actual local status after installation.
5. **Resource policy:** No fixed arbitrary whole-project daily crawl quota is introduced. Local request sizes, per-source scheduling, domain spacing, host headroom, consent, rights and backpressure are enforced. Increasing utilization means prioritizing productive idle capacity, **not** permanently pegging CPU/GPU at 100% or compromising responsiveness.

## Operational truth and release boundary

GitHub source changes **do not automatically update a running Python process**. The existing optional Windows fast-forward task downloads reviewed commits only when actually installed and able to sync; loading the new `windows_command_center.py` modules requires an approved restart of **that process only**. Neither installation, private Windows state, model inference, outbound crawling nor source licence on either actual PC was checked in this development step.

**No tests, installs, live crawls, model downloads, weight training, website modifications, Bertina migrations, production releases, cron changes or new key rotations were performed.** Final integrated source and operational acceptance remains required before any claim that the Windows learner has started, has improved, can train an adapter, or coordinates two PCs.


## Source withdrawal and candidate dataset cleanup

The initial adapter candidate exporter has a conservative invalidation rule:
before a private document is deleted or a reviewed network source is
deactivated through the authenticated Windows command centre,
`invalidate_staged_training_exports` invalidates and removes **all**
recorded staged candidate JSONL and manifests from the existing private
`adapter-candidates` directory. This v1 global invalidation is intentional
because a complete per-example derivative dependency graph is not yet
accepted. The original downloaded/supplied documents are not removed by
that dataset-cleanup operation. No trained adapters exist as a result of
this source change, and the cleanup is not evidence of unlearning already
trained weights. Source-level provenance and genuine independent-review
verification remain mandatory for a later adapter-training implementation.


## Owner clarification: native JREI only; selective open-source reuse

The owner explicitly does **not** want to install or connect a second AI
program such as Letta. The brief Letta sidecar prototype was removed from
`windows_owner_agent.py`, `windows_command_center.py` and
`windows_owner_ui.html`, and its adapter file was deleted. Qwen remains the
only ordinary model backend in the Windows command centre.

The selected external open-source *references* are architectural inputs,
not deployed or downloaded dependencies:

- Mem0 (Apache 2.0): https://github.com/mem0ai/mem0 — append-oriented,
  evidence-aware memory and multi-signal source retrieval concepts.
- LangGraph: https://github.com/langchain-ai/langgraph — durable step
  checkpoints, provenance-separated state and interruption recovery concepts.
- Crawl4AI (Apache 2.0, inspect NOTICE/attribution requirements before any
  direct redistribution): https://github.com/unclecode/crawl4ai —
  adaptive extraction, source quality and resource-aware crawling concepts.

The new `_rerank_evidence` and `_retrieval_terms` functions in
`windows_continuous_learning.py` are original project-native implementations
of general multi-signal/source-diversity retrieval techniques. They check
exact passage hashes, combine query coverage with lexical frequency/phrase
and bounded SQL rank, and penalise redundant passages from the same original
source. This **does not** install Mem0, LangGraph, Crawl4AI, Letta or any
other agent runtime. It is not a licensed verbatim copy of another
project's source; any future verbatim port must preserve the source licence,
copyright notices, repository version and upstream attribution explicitly.

No changes to pretrained Qwen weights were made. This source-only feature
is not evidence that model intelligence or educational outcomes improved.
A single final integrated acceptance check remains necessary under the
owner's no-tests-during-development instruction.
