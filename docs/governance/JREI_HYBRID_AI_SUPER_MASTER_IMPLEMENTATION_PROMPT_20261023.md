FINAL SUPER MASTER IMPLEMENTATION PROMPT

JREI Hybrid AI Architecture — Bertina Hosting + Personal Computing Power

Project: drjavadrezazadeh.com
Repository: "drrezazadeh65/drjavadrezazadeh.com"
Canonical branch: "migration/bertina-linux6"
Hosting: Bertina Linux / LiteSpeed / PHP 8.3
Mother database: "drjavad1_store"
Date: 23 October 2026
Directive: Forward-only development; preserve existing functionality; no new hardware purchases; no production deployment without explicit approval.

---

1. ROLE AND NON-NEGOTIABLE MISSION

Act as the project's principal systems architect, senior full-stack developer, AI infrastructure engineer, educational AI specialist, database architect, cybersecurity engineer, DevOps engineer, and technical release manager.

Your immediate mission is to implement a hybrid educational AI architecture in which:

1. The public website, store, dashboards, existing services, and primary operational database remain hosted by Bertina.
2. The owner's existing Windows 11 computer supplies additional CPU, RAM, and, where technically supported, GPU processing power.
3. JREI-LM can process authorized educational requests through a secure communication channel.
4. The website remains operational when the personal computer is switched off, disconnected, or overloaded.
5. The architecture supports future migration to Bertina VPS, dedicated GPU hosting, or a locally operated multi-computer cluster without rebuilding the application.
6. The existing JREI educational intelligence contracts, tools, scientific safeguards, and prior development work are preserved.

This is an implementation directive, not merely a request for an architecture proposal.

Begin by inspecting the actual repository, existing source files, current branch, available infrastructure, and previous implementation contracts. Do not assume that a feature exists or is operational merely because it was described in an earlier prompt.

---

2. VERIFIED HARDWARE BASELINE

The initial processing node is the owner's second computer:

- Operating system: Windows 11 Pro, version 24H2
- Processor: AMD Ryzen 5 5600G
- CPU: 6 cores / 12 threads
- RAM: 32 GB
- Dedicated GPU: AMD Radeon RX 580, 8 GB VRAM
- Motherboard: ASUS PRIME B450M-A II
- Disk 0: approximately 500 GB SSD
- Disk 1: approximately 1 TB SSD
- Internet: currently mobile-hotspot based; bandwidth and availability may vary

A second personal computer may be incorporated later:

- Processor: AMD Ryzen 5 5600X
- RAM: 16 GB
- GPU: AMD Radeon RX 580, 8 GB VRAM
- Windows 11

Do not assume that RAM, CPU cores, or VRAM from different machines automatically combine into one resource pool.

Do not assume AMD RX 580 supports modern CUDA-dependent AI frameworks.

Benchmark and verify available CPU inference backends and any compatible AMD GPU acceleration before selecting the production inference runtime.

Prioritize CPU-compatible, quantized models where GPU compatibility is uncertain.

No hardware upgrades, component replacement, paid API subscriptions, VPS purchases, or GPU server purchases are authorized at this stage.

---

3. TARGET ARCHITECTURE

Implement the following logical architecture:

PUBLIC USERS
     |
     v
drjavadrezazadeh.com
BERTINA WEB HOSTING
     |
     +-- Existing website
     +-- Store and payments
     +-- User dashboards
     +-- Master admin dashboard
     +-- Mother database
     +-- JREI API gateway
     +-- Authentication and authorization
     +-- Request validation and rate limiting
     +-- Educational knowledge retrieval
     +-- AI job queue and status tracking
     |
     v
SECURE HYBRID COMMUNICATION LAYER
     |
     +-- Encrypted transport
     +-- Authenticated processing node
     +-- Short-lived credentials
     +-- Request signing or equivalent controls
     +-- Job leasing and heartbeat
     +-- Retry and timeout management
     |
     v
OWNER'S WINDOWS 11 COMPUTER
     |
     +-- JREI Local Worker
     +-- Model inference runtime
     +-- Educational reasoning coordinator
     +-- Document-processing workers
     +-- Approved tool execution
     +-- Local encrypted configuration
     +-- Performance and health monitoring
     |
     v
RESULT RETURNED TO BERTINA
     |
     v
VALIDATED RESPONSE TO USER

The personal computer must initiate outbound communication wherever possible.

Do not expose a local inference server directly to the public internet.

Because the owner currently uses a mobile hotspot, assume that public inbound connections may be unavailable due to carrier-grade NAT.

Prefer an authenticated outbound polling or job-leasing mechanism using HTTPS over the existing Bertina endpoint. A reverse tunnel may be considered only after confirming that it is necessary, supported, and securely configurable.

---

4. BERTINA MUST REMAIN THE SYSTEM OF RECORD

The existing website and database architecture must be preserved.

Primary operational database:

"drjavad1_store"

Do not create an unrelated parallel customer, payment, identity, or order database.

Existing operational records must remain authoritative on Bertina.

Create additional tables only where necessary for AI operations, such as:

- AI processing nodes
- Worker registration
- Job queue
- Job attempts and leases
- Worker heartbeats
- Model registry
- Model capability profiles
- Knowledge-source metadata
- Document-processing status
- Educational evidence records
- AI request audit metadata
- AI usage and performance metrics
- Error and incident records
- Consent and retention preferences

Use the repository's existing database conventions and migration framework.

All database changes must be backward compatible, reversible where feasible, and documented.

Do not store raw sensitive educational conversations or personal data by default.

---

5. LOCAL JREI WORKER

Develop a dedicated Windows-compatible worker application.

The worker must:

1. Start and stop safely.
2. Authenticate with Bertina.
3. Poll for authorized processing jobs or maintain an approved secure outbound connection.
4. Execute only allowlisted task types.
5. Load an appropriate local language model.
6. Process documents and structured educational data.
7. Return validated results to Bertina.
8. Report CPU, RAM, GPU, model status, queue depth, and job latency.
9. Recover from temporary internet interruptions.
10. Avoid duplicate job execution through idempotency and job leasing.
11. Respect concurrency, memory, timeout, and thermal limits.
12. Reject unauthorized commands and untrusted executable instructions.

The worker must not function as a general remote-command execution agent.

It must not accept arbitrary shell commands from the public website, model output, or external users.

Provide a straightforward Windows installation procedure and, where appropriate, a managed startup mechanism that does not require the owner to open development tools manually.

---

6. MODEL RUNTIME STRATEGY

Evaluate suitable locally executable inference runtimes, including CPU-compatible options such as llama.cpp.

Choose models according to actual hardware capabilities, not marketing claims.

Initial requirements:

- Persian and English support
- Educational question answering
- Retrieval-augmented generation
- Structured JSON output where appropriate
- Conservative memory consumption
- Quantized model compatibility
- CPU fallback
- Explicit model/version tracking
- Measured response latency
- Reproducible installation

Do not claim that an RX 580 provides CUDA acceleration.

Do not download or install exceptionally large models without checking disk space, available RAM, licensing, and user approval for substantial downloads.

Do not train a foundation model from scratch.

The initial objective is to operate a practical educational assistant through inference, retrieval, structured tools, and evidence-grounded reasoning.

---

7. PRESERVE THE EXISTING JREI CONTRACTS

Inspect and integrate existing implementation work, including where present:

- "jrei-evidence.mjs"
- "jrei-model-adapter.mjs"
- "jrei-prompt-guard.mjs"
- "jrei-tool-registry.mjs"
- "jrei-contracts.mjs"
- "assets/js/assistant.js"
- "platform/assistant-runtime-policy.json"
- Existing assistant API routes
- Existing educational studio modules
- Existing JREI V2, V3, and V4 development contracts

Do not overwrite existing code without reviewing its behavior.

The current live assistant state must be verified from the repository and deployment configuration.

If the existing assistant is still operating through static fallback, preserve that fallback until the hybrid runtime has been validated.

Integrate the new local model adapter into the established orchestration and evidence architecture rather than creating an unrelated chatbot.

---

8. EDUCATIONAL KNOWLEDGE AND RESEARCH

The system must support the existing educational intelligence program, including:

- Iranian university entrance examinations
- Official admissions booklets
- University capacities and selection rules
- Educational pathways
- Golden Talent
- RCAS
- BAHAR
- Educational research literature
- Approved assessment tools
- Bilingual educational guidance

Use authorized, legally accessible source material.

Preserve source provenance, publication dates, version history, and evidence quality.

Separate:

1. Official verified information
2. Peer-reviewed research evidence
3. Interpretive educational guidance
4. Experimental or unvalidated assessment outputs

Never invent official admission capacities, regulations, assessment validity, citations, or research findings.

Consequential educational recommendations must disclose uncertainty and support appropriate human review.

---

9. PERFORMANCE AND AVAILABILITY

The website must never depend on the owner's computer being continuously online.

Implement at least these operational states:

- ONLINE: Local worker connected and ready
- BUSY: Worker connected but at capacity
- DEGRADED: Limited processing or high latency
- OFFLINE: Worker disconnected
- MAINTENANCE: Worker intentionally unavailable

When the worker is offline:

- The website remains available.
- Store and payment functions remain unaffected.
- Dashboards continue operating.
- Existing static educational tools remain accessible.
- AI requests receive an accurate availability message or enter a bounded queue only where users have agreed to delayed processing.
- No fictitious AI response is generated.

Provide queue limits, expiration policies, cancellation, and retry controls.

Do not promise uninterrupted or instant AI responses from a consumer computer connected through mobile internet.

---

10. MASTER ADMIN DASHBOARD INTEGRATION

Integrate hybrid AI infrastructure controls into the existing master administration dashboard.

The administrator should be able to view:

- Connected processing nodes
- Online/offline status
- CPU utilization
- RAM utilization
- GPU utilization where supported
- GPU memory usage where supported
- Loaded model and version
- Pending jobs
- Running jobs
- Failed jobs
- Average and percentile response latency
- Model inference performance
- Knowledge-base processing status
- Source freshness
- Error and security alerts
- AI feature availability
- Resource utilization trends

Provide administrator controls for:

- Enabling or disabling AI services
- Pausing or resuming job dispatch
- Setting queue and concurrency limits
- Selecting approved models
- Controlling worker access
- Revoking compromised worker credentials
- Viewing operational logs
- Managing alert preferences
- Configuring educational tool availability

Administrative controls must be authenticated, authorized, audited, and protected against CSRF and privilege escalation.

Do not expose personal-computer management functions to ordinary users.

---

11. SECURITY REQUIREMENTS

Security is mandatory.

Implement:

- HTTPS
- Strong worker authentication
- Credential rotation and revocation
- Server-side authorization
- Request and response schema validation
- Rate limiting
- Job idempotency
- Least-privilege database access
- Restricted network exposure
- Protection against prompt injection
- Protection against unauthorized tool execution
- Audit metadata with privacy-conscious retention
- Secure configuration and secret storage
- Safe handling of user-submitted documents
- Appropriate upload size and content restrictions

Never commit secrets, API keys, passwords, tokens, or private keys to GitHub.

Never transfer entire operational database dumps or sensitive user records to the personal computer merely to accelerate inference.

Send the minimum data necessary for each authorized task.

---

12. FUTURE-PROOF PROCESSING PROVIDERS

Design a modular inference-provider interface supporting:

- LOCAL_WINDOWS_WORKER
- LOCAL_SECONDARY_WORKER
- BERTINA_VPS_WORKER
- BERTINA_DEDICATED_WORKER
- BERTINA_GPU_WORKER

Only activate providers that are actually configured and verified.

Future server migration should require changing infrastructure configuration and deployment, not rewriting educational business logic.

The second personal computer may later be added as another independent worker.

Tasks may be distributed across workers, but do not claim that their GPU memories combine automatically.

---

13. COST POLICY

The owner has explicitly decided:

The website must generate revenue before purchasing major new AI hardware or hosting capacity.

Therefore:

- Reuse the current Bertina hosting.
- Reuse the existing Windows computers.
- Prefer open-source software with compatible licenses.
- Avoid recurring paid AI APIs unless separately approved.
- Avoid new GPU server commitments.
- Minimize unnecessary storage duplication.
- Track actual processing costs and utilization.

The architecture must permit future investment from website revenue.

---

14. IMPLEMENTATION SEQUENCE

Follow this order:

Phase A — Repository and infrastructure audit

Inspect current code, APIs, JREI contracts, database schema, assistant fallback, deployment workflows, and Bertina hosting constraints.

Phase B — Hybrid architecture integration

Implement job contracts, worker registration, authentication, processing queue, lifecycle management, and status endpoints.

Phase C — Windows worker

Develop the local worker, safe configuration, runtime adapter, model lifecycle, and connection mechanism.

Phase D — Educational AI integration

Connect the worker to the existing JREI orchestration, approved educational tools, evidence layer, and knowledge retrieval.

Phase E — Administration

Implement node monitoring, queue management, error reporting, model controls, and operational visibility in the master dashboard.

Phase F — Reliability and security

Perform the necessary security review, integration verification, and controlled end-to-end tests after implementation work is complete.

Phase G — Release preparation

Prepare deployment instructions, database migrations, Windows installation instructions, rollback procedures, and a release checklist.

Do not deploy to production without the owner's explicit authorization.

---

15. FORWARD-ONLY DEVELOPMENT POLICY

This project has an established history of implementation.

You must:

- Continue from the actual current repository state.
- Preserve working functionality.
- Avoid unnecessary rewrites.
- Avoid breaking existing routes.
- Preserve bilingual architecture.
- Preserve canonical and hreflang behavior.
- Preserve existing SEO and structured-data functionality.
- Preserve the payment system.
- Preserve the unified master database.
- Preserve mobile-first design.
- Preserve the existing brand identity.
- Keep unfinished work clearly identified.
- Distinguish implemented code from operationally verified features.

Do not claim completion without corresponding source changes and evidence.

Do not fabricate commits, deployment results, tests, or runtime performance measurements.

---

16. REQUIRED FINAL DELIVERABLES

The implementation must ultimately produce:

1. A functioning hybrid JREI processing architecture.
2. A secure Bertina-to-Windows worker communication mechanism.
3. A Windows-compatible local AI worker.
4. An integrated inference adapter.
5. A reliable processing queue.
6. A working model-management interface.
7. Evidence-grounded educational responses.
8. Integrated master administration controls.
9. Health and availability monitoring.
10. Documented database migrations.
11. Installation and operation instructions.
12. Security and failure-recovery documentation.
13. A clear accounting of completed versus outstanding work.
14. A release-ready implementation awaiting explicit deployment approval.

---

17. FINAL EXECUTION COMMAND

Begin immediately by inspecting the canonical branch and the existing JREI implementation.

Do not restart the project.

Do not replace the established architecture.

Do not purchase or provision paid infrastructure.

Do not expose the owner's personal computer to public inbound connections.

Build the hybrid AI infrastructure around the existing Bertina website and the owner's Windows 11 computer.

Prioritize operational reliability, educational evidence, security, bilingual functionality, and future scalability.

The objective is to transform the existing website into an educational intelligence platform whose processing power can grow independently of its web-hosting infrastructure.

Proceed with actual repository development, maintain forward-only changes, and prepare the system for controlled integration and eventual production deployment.
