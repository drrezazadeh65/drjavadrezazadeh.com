# JREI Local Qwen — Public Activation Go-Live Contract

**Date:** 2026-10-26. **Canonical branch:** migration/bertina-linux6. **Mother DB:** drjavad1_store. **Release policy:** no fake approval; no public AI without explicit owner consent and live safeguards.

## Observed operational baseline

The owner previously demonstrated ONE private Persian Qwen inference round-trip in the authenticated Master Operations Dashboard, with a localhost llama-server and an outbound-only signed `start-pilot` worker on the existing 32 GB Windows computer. This is genuine private beta functionality; it does NOT prove that publicly scoped worker requests or scientific/rights acceptance are ready. Previous public `/api/assistant/v1/capabilities` reported `live:false`, `providerMode:OFFLINE_GUIDE`.

## Exactly which part of the public application already exists

The existing bilingual site assistant (`assets/js/assistant.js`) asks the visitor to consent to off-site-computer processing, calls `/api/assistant/v1/chat`, polls `/api/assistant/v1/local/result`, and shows a truthful fallback when backend readiness is false. `api/jrei-local-chat.php` already implements the actual encrypted public request/response queue and bounded, owner-policy-checked signed Windows task lease. No new public chat API, Windows node, GGUF registry record or database is necessary merely to start testing it.

## Server gate requirements — no bypass

Every one of these must be true in the server's LIVE snapshot and in real practice:

- Mother-DB queue tables exist with the expected column definitions and encrypted queue key `JR_JREI_LOCAL_CHAT_KEY_B64` is valid and private.
- `JR_JREI_HYBRID_ENABLED=true`, `JR_JREI_LOCAL_CHAT_ENABLED=true`, and final specific owner public release approval `JR_JREI_LOCAL_PUBLIC_RELEASE_ACCEPTED=true` are set only by the private hosting owner (case-sensitive value `true`). This owner approval is authorization, NOT model evaluation evidence.
- The published/approved site evidence index is readable and source-rights checks remain intact.
- Retention must be actually running on Bertina: `JR_OPERATIONS_CRON_MASTER_ENABLED=true`, `JR_JREI_LOCAL_CHAT_RETENTION_ENABLED=true`, and the original `operations_cron_jobs` row `jrei_local_chat_retention` has a successful `completed` execution within the last 1800 seconds. Turning on a flag cannot forge this evidence.
- The existing `jrei_local_model_registry` record must still be `RIGHTS_REVIEWED`, artifact hash match, unsuspended, with `weights_installed_verified=1`, `runtime_verified=1`, `independent_quality_accepted=1` **only after actual verified runtime, measured RAM/performance and reviewed Persian/English quality evidence**. Do not promote on a model-generated self-description.
- The original signed Windows node remains enabled; `jrei_local_chat_node_authorizations` must have explicit approved chat permission. `start-pilot` does not satisfy this; `start-chat` must send authentic Ed25519-signed generative polls within the preceding 45 seconds.
- Original public endpoint `/api/assistant/v1/capabilities` must independently return `live:true`, `providerMode:JREI_LM_LOCAL_WINDOWS`. `live:true` is a backend eligibility signal, not proof of a completed model answer. Perform fresh consenting public Persian and English chat trials separately.

## Concrete Windows sequence on the actual Qwen-hosting computer

**Do not assume NODE-A/NODE-B based on RAM or historical labels.** Determine the signing node using existing local JSON and match it to the owner registry. Use the existing verified 32 GB machine and keep `llama-server` bound only to 127.0.0.1.

From an owner PowerShell in the existing checked-out workspace:

```powershell
$w = Join-Path $env:USERPROFILE 'Desktop\JREI-Development\platform\jrei-v5\windows-worker'
if (-not (Test-Path (Join-Path $w 'JREI-QUALITY-EVIDENCE.cmd'))) { throw 'Checked-out quality runner missing or path differs' }
& (Join-Path $w 'JREI-QUALITY-EVIDENCE.cmd')
```

The command runs 16 fixed local synthetic questions and writes a private quality report under `%LOCALAPPDATA%\JREI\quality-reviews`. Do not accept quality if `NEGATIVE_QUALITY_TRIAGE=BLOCKED_REMEDIATION_REQUIRED`, incomplete samples, missing peak RAM or human review failures. A passing negative triage is NOT independent scientific certification. Human reviewer records authentic evidence in existing MFA `attest_local_model_runtime` (model ID/version, actual SHA, source fixture SHA, run evidence SHA, measured tokens/s, p95 and RAM); never invent measurements. The owner sets the independent acceptance only with genuine review.

Then the checked-out read-only operator preflight can run:

```powershell
& (Join-Path $w 'jrei-public-launch-preflight.ps1')
```

When local rights, quality, runtime and independent owner approval truly exist, update the *private owner-controlled config* with `localChat.enabled=true`, `modelRuntimeVerified=true`, `independentQualityAccepted=true`, preserving all existing model/worker/hash fields. Never post that config or keys to chat/GitHub. The approved `start-chat` worker mode differs from `start-pilot`: only `start-chat` reports signed generative polling.

The existing official task installer supports **`-WorkerMode chat`**:

```powershell
$config = Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'
& (Join-Path $w 'jrei-managed-startup.ps1') -Mode install -WorkerMode chat -ConfigPath $config -OwnerApproved
Start-ScheduledTask -TaskName 'JREI-Owner-Local-Chat-Worker'
```

These commands are not to be run while model/rights/quality owner gates are false; task installation is not a replacement for their approval. Never overwrite the existing Node signing key or restart the evaluation worker without a reason. Windows logon-task status alone does not prove Bertina connectivity.

## New source-only launch diagnosis

- `api/jrei-local-public-launch.php`: the exact 12 original server gates are transformed into deterministic PASS/BLOCKED/UNKNOWN per-phase owner review, with no secret disclosure and no mutation or claimed independent quality.
- `api/jrei-local-chat.php`: attaches this optional read-only decision to the pre-existing authenticated owner snapshot, with fail-closed fallback if the source module is absent. Public runtime readiness remains exactly the original `jrLocalChatReady` function.
- `assets/js/operations-jrei-hybrid-nodes-v1.js`: shows public go/no-go in the existing bilingual owner command center.
- `platform/jrei-v5/windows-worker/jrei-public-launch-preflight.ps1`: read-only local readiness inventory; cannot start programs or set model approval flags.
- `tests/jrei-public-launch-readiness-contract.test.mjs`: source-staged negative public release contracts; tests NOT RUN and no production deploy triggered by these commits.

## If a condition is still blocked

Do not create a new database, paste secrets in web forms, expose port 8081, fake scientific status, or use `start-pilot` as public chat transport. Keep the functioning private pilot and offline public guidance. A failed release must leave the website's payments, SEO, journal and existing private JREI intact. Build the missing real evidence first.

## Definitive release and verification

Once code QA and exact-SHA Bertina workflow are green, the owner executes the existing `Deploy to Bertina` `phased_live_audit` process and checks post-release acceptance. Release success of the website and **public inference availability** are different milestones. The final operational acceptance requires live capabilities `live:true`, an approved signed `start-chat` worker, an actual completed consenting user chat in both languages, and observed short-term queue cleanup without leaked plaintext or non-consensual model training.

**Status while authoring:** PRIVATE_QWEN_PILOT_OBSERVED; PUBLIC_QWEN_NOT_PROVEN; CODE_ONLY_PUBLIC_READINESS_STAGED; MODEL_INDEPENDENT_QUALITY_UNKNOWN; CRON_COMPLETION_UNKNOWN; NEW_CODE_QA_NOT_RUN; NOT_DEPLOYED.
