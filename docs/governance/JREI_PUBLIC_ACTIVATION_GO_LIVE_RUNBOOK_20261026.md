# JREI Qwen — Public Website Activation Go-Live Contract

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
- The existing model record must remain RIGHTS_REVIEWED, unsuspended, GGUF hash-matched, with actual `weights_installed_verified=1` and `runtime_verified=1`. Public responses may use either *independent science acceptance*, or a SEPARATE explicit owner-approved public GENERAL chat policy, `JR_JREI_LOCAL_PUBLIC_UNVALIDATED_OWNER_APPROVED=true`. The latter deliberately leaves `independent_quality_accepted=0` and may not be marketed as scientifically validated. Rights, runtime, encryption, consent, retention, signed model/node grants and answer vetoes are still required.
- The original signed Windows node remains enabled; `jrei_local_chat_node_authorizations` must have explicit approved chat permission. `start-pilot` does not satisfy this; `start-chat` must send authentic Ed25519-signed generative polls within the preceding 45 seconds.
- Original public endpoint `/api/assistant/v1/capabilities` must independently return `live:true`, `providerMode:JREI_LM_LOCAL_WINDOWS`. `live:true` is a backend eligibility signal, not proof of a completed model answer. Perform fresh consenting public Persian and English chat trials separately.

## Explicit, real-world activation on Bertina — no fake live claim

The source code exposes the separate default-OFF owner setting `JR_JREI_LOCAL_PUBLIC_UNVALIDATED_OWNER_APPROVED=true`. Set the following PRIVATE host controls through the existing Bertina administration channel, only after actual retention and queue checks:

```text
JR_JREI_HYBRID_ENABLED=true
JR_JREI_LOCAL_CHAT_ENABLED=true
JR_JREI_LOCAL_PUBLIC_RELEASE_ACCEPTED=true
JR_JREI_LOCAL_PUBLIC_UNVALIDATED_OWNER_APPROVED=true
JR_OPERATIONS_CRON_MASTER_ENABLED=true
JR_JREI_LOCAL_CHAT_RETENTION_ENABLED=true
```

`JR_JREI_LOCAL_CHAT_KEY_B64` must be a SECRET, randomly generated 32-byte key, NOT a literal example or public repo value. Never print/send it. The original verified mother database must contain all three required queue/registry tables, the original retention job must be ENABLED and must ACTUALLY complete recently, and the original approved public evidence index must be readable. Deploy cannot set these private environment variables by itself.

After a genuine owner runtime-only attestation, the existing MFA model/node panel may approve the original signing node for general public chat. This creates a fresh and revocable generative node authorization, NOT a new key. Running the approved `start-chat` process then supplies real signed generative polls. The private site health endpoint must become `live:true`, `providerMode:JREI_LM_LOCAL_WINDOWS` ONLY if these independent conditions are simultaneously true; merely deploying HTML or writing the switch value cannot achieve that.

The owner has explicitly requested a PUBLIC website service rather than the private staging pilot. `local` in `JREI_LM_LOCAL_WINDOWS` describes WHERE Qwen COMPUTES; the SITE ENTRY POINT is publicly accessible to consenting users. The user-facing disclosure labels the product as a general educational assistant, NOT as independently scientifically certified or a self-training system. This policy does not remove the 12 evidence observations; the science result remains BLOCKED and the separately documented owner exception remains visible.

## Concrete Windows sequence on the actual Qwen-hosting computer

**Do not assume NODE-A/NODE-B based on RAM or historical labels.** Determine the signing node using existing local JSON and match it to the owner registry. Use the existing verified 32 GB machine and keep `llama-server` bound only to 127.0.0.1.

From an owner PowerShell in the existing checked-out workspace:

```powershell
$w = Join-Path $env:USERPROFILE 'Desktop\JREI-Development\platform\jrei-v5\windows-worker'
if (-not (Test-Path (Join-Path $w 'JREI-QUALITY-EVIDENCE.cmd'))) { throw 'Checked-out quality runner missing or path differs' }
& (Join-Path $w 'JREI-QUALITY-EVIDENCE.cmd')
```

The owner ALREADY provided three 16-sample reports; do NOT repeat them merely to clear a gate. One 2025-10-25 19:31Z report includes an OS-observed 4981 MB peak, 24553 ms p95 and 9.01 observed tokens/total-second, but failed numeric and Persian-script negative screening. The newest 2026-10-26 report shows 18315 ms p95 and 6.41 observed tokens/total-second with RAM not measured; its scientific quality remains unaccepted. The authenticated model form now offers a distinct `attest_local_model_runtime_only` action: it records AUTHENTIC model installation/running metrics without writing `independent_quality_accepted=1`. Only use measurements from the EXACT SAME submitted report and matched model artifact SHA; never fabricate or mix different reports' metrics. The original science-certified action is unchanged.

Then the checked-out read-only operator preflight can run:

```powershell
& (Join-Path $w 'jrei-public-launch-preflight.ps1')
```

After the source is installed on the real Windows owner PC and the runtime-only attestation is completed: the PRIVATE JSON may have `localChat.enabled=true`, `modelRuntimeVerified=true`, `publicUnvalidatedOwnerApproved=true`, with `independentQualityAccepted=false` retained honestly. This differs from independently certified public release, where `independentQualityAccepted=true` would require actual reviewer acceptance. Never commit, upload, print or share this JSON. `start-chat` (not `start-pilot`) sends the required signed public chat-mode polling. If the original model's Windows Scheduled Task was created with `-StagingOnly`, review/re-register that exact original model task using its audited installer for enabled public mode before relying on automatic restart after the next logon; DO NOT merely keep an incompatible stale staging task and claim always-on status.

The existing official task installer supports **`-WorkerMode chat`**:

```powershell
$config = Join-Path $env:LOCALAPPDATA 'JREI\jrei-worker-config.json'
& (Join-Path $w 'jrei-managed-startup.ps1') -Mode install -WorkerMode chat -ConfigPath $config -OwnerApproved
Start-ScheduledTask -TaskName 'JREI-Owner-Local-Chat-Worker'
```

These commands are not to be run unless the model's actual runtime and rights are verified and the owner has approved EITHER the independent scientific policy OR the explicitly unvalidated public general-chat policy. Task installation is not permission by itself. Never overwrite the existing Node signing key or restart the evaluation worker without a reason. Windows logon-task status alone does not prove Bertina connectivity.

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
