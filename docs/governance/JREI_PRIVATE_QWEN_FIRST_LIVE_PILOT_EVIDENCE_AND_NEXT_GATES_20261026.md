# JREI APEX — First Owner-Private Qwen Response and Next Development Gates

**Date:** 2026-10-26  
**Source branch:** migration/bertina-linux6  
**Owner-supplied evidence:** screenshots of Windows llama-server, signed private pilot Worker logs, and the private Master Operations Dashboard showing a Persian model answer. Screenshot evidence is supplied in the owner conversation, **not ingested or duplicated in this repo**.  
**Live public capability before this increment:** assistant endpoint reported \`live:false\` and \`providerMode:"OFFLINE_GUIDE"\`. That public status remains a separate acceptance decision.

## Confirmed by the owner's screenshots — limited and precise

1. The **32 GB Windows owner computer** successfully started \`llama-server\` on \`http://127.0.0.1:8081\`, listening on loopback. The launcher printed \`VERIFIED_GGUF_AND_LLAMA_BINARY\`, \`STARTING_LOCAL_LOOPBACK_WITH_JREI_ALIAS\` and \`STAGING_ONLY_PUBLIC_CHAT_OFF\`.
2. Its configured private worker printed \`LOCAL_MODEL_GGUF_SHA256_MATCHED_NOT_INFERENCE\`, \`LOCAL_LLAMA_EXECUTABLE_SHA256_MATCHED_NOT_RUNTIME_ATTESTATION\`, \`OWNER_PILOT_PRIVATE_ONLY_NO_PUBLIC_QWEN_RELEASE\` and \`OWNER_PILOT_LOOPBACK_MODEL_HEALTHY\`.
3. The owner then supplied a Master Operations Dashboard screenshot with a non-empty Persian answer and the explicit notice that the response is provisional and **scientific validity is not confirmed**. This is an observed owner-private end-to-end result, **not** sufficient to establish repeatability, worker long-term availability, published scientific quality or model self-learning.
4. Although Node A/Node B have existing registrations and valid heartbeat evidence in the dashboard, machine labels should be confirmed by the *current signed node ID* and local config, not inferred from CPU/RAM names or historical task names. No new node key or model registration is needed merely for this private pilot.
5. The same screenshot evidence shows that a locally bound \`llama-server\` exposed permissive CORS/no API key within loopback. Do not expose that socket beyond \`127.0.0.1\`, and review local-origin authentication, Windows process permissions and resource budgets before any wider rollout.

## Changes in the next source-only increment

- \`api/jrei-owner-private-pilot.php\`: adds \`jrOwnerPilotOwnerSnapshot()\`, returning only counts of **currently pending** owner-private pilot states (\`PILOT_QUEUED\`, \`PILOT_LEASED\`, \`PILOT_COMPLETED\`, \`PILOT_BLOCKED\`), original encrypted-queue configuration, enabled registered owner nodes, and rights-reviewed model inventory. The **short-retention queue is the same existing table**; no second database, persistent transcript, raw job IDs or source material is exposed. An empty aggregate must NOT be interpreted as proof no earlier pilot succeeded: successful results are retrieved and erased.
- \`api/operations.php\`: under the original **SUPER_ADMIN + current MFA** owner route, permits an independently rate-limited read-only \`GET /api/admin/operations/jrei-owner-pilot\`; all original **POST ask/result/cancel with CSRF** semantics remain intact. No untrusted browser URL, shell, SQL or model tool is introduced.
- \`assets/js/operations-jrei-owner-pilot-v1.js\`: adds a collapsed on-demand bilingual diagnostic display and manually selected sample prompts for evaluating Persian/English language, uncertainty and honest self-description. Sample selection **does not call the model**; the existing owner confirmation and user-initiated POST are still required.
- Private system prompt: prohibits the model from presenting its own statements about the true backend, development phase, scientific acceptance or autonomous learning as attested facts. Site health and capability claims must come from outside the model.
- \`tests/jrei-owner-pilot-readiness-contract.test.mjs\`: five added source-regression checks for original MFA role gating, absence of persistent secrets and model self-approval, honest unknown-state handling, private GET contract, and truthfully framed prompts. Tests **staged and NOT run**.

## Accurate reading of private pilot telemetry

The aggregate server snapshot **cannot** remotely inspect the process memory or GPU of the owner's PC. It deliberately returns \`liveLocalModelHealth: NOT_OBSERVABLE_FROM_BERTINA_DB\` and \`signedOwnerPilotPollFreshness: NOT_PERSISTED_BY_PILOT\`. A registered model or node never proves Qwen is presently generating answers. The correct live proof remains a **fresh, successfully completed encrypted owner pilot**, with an independently checked worker signature, one-time retrieval token, proper expirations, and a non-sensitive user prompt.

No scientific benchmarks have yet been completed. A curated sample is not an independent held-out evaluation; reported human scores should later be versioned and audited with provenance, controls, representative samples, failure cases and separate acceptance. The first generated self-description is **not** an authoritative development-status report.

## Next acceptance milestones, in order

1. **Private stability:** secure the existing Windows logon tasks and owner-only loopback; observe model/Worker restarts, local heartbeat and real private queue completion on multiple **explicitly authorized** turns; classify signed absence and lease expiry as UNKNOWN, never success. Do not alter the two existing node keys.
2. **Privacy:** verify the existing short-term cleanup task is actually running and expired ciphertext is removed; verify settings do not publish \`127.0.0.1:8081\` over a proxy and that browser tabs do not persist tokens or sensitive text. An optional external archive of strictly metadata-only signed receipts would require a fresh reviewed mother-DB migration and retention policy.
3. **Scientific evaluation:** add independent Persian/English held-out benchmark data with rights checks, stable scoring rubrics, scorer independence and auditable fail conditions; do not treat owner feedback or a single successful response as model validation.
4. **Performance:** measure wall-clock queue wait, cold start, error rate and true model latency independently; keep owner-reported figures separate from instrumented server/Windows data. Device GPU offload is not currently verified; the existing CPU-first policy remains unchanged.
5. **Future self-improvement:** use an evidence-gated learning-to-learn loop with durable permissions, model/version snapshots, held-out regression and reversible promotion. The current private Qwen pilot does not self-train and must never claim that it does.
6. **Only after all acceptance gates:** separately authorize audited public chat, independent privacy retention, science/rights, per-node worker approval, and live public activation. The current live \`OFFLINE_GUIDE\` endpoint is not a bug if those gates remain closed.

**Delivery label for this incremental change:** SOURCE_STAGED / PRIVATE_PILOT_OBSERVED_PREVIOUSLY / NEW_READINESS_QA_NOT_RUN / NO_NEW_PRODUCTION_DEPLOYMENT. Existing PHP commercial flows, JHELA, Search Console, payments, mother DB and original Windows worker signing are deliberately unchanged.
