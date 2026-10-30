<?php
declare(strict_types=1);

const SITE_ORIGIN = 'https://drjavadrezazadeh.com';
const SESSION_COOKIE = 'drjr_session';
const SESSION_TTL = 604800;
const TOKEN_TTL = 900;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Robots-Tag: noindex, noarchive, nosnippet');

function respond(array $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fail(string $code, int $status = 400): never {
    respond(['ok' => false, 'error' => $code], $status);
}
// The callback is a browser navigation, not a JSON API client. Never infer a successful payment from URL parameters.
function commerceReturnToResult(string $orderId): never {
    header('Location: '.SITE_ORIGIN.'/fa/shop/payment-result/?from=gateway&order='.rawurlencode($orderId), true, 303);
    exit;
}
function cfg(): array {
    static $cfg = null;
    if (is_array($cfg)) return $cfg;
    $cfg = [
        'db_dsn' => (string)(getenv('JR_DB_DSN') ?: ''),
        'db_user' => (string)(getenv('JR_DB_USER') ?: ''),
        'db_password' => (string)(getenv('JR_DB_PASSWORD') ?: ''),
        'auth_pepper' => (string)(getenv('JR_AUTH_PEPPER') ?: ''),
        'mail_enabled' => getenv('JR_MAIL_ENABLED') === 'true',
        'mail_from' => (string)(getenv('JR_MAIL_FROM') ?: 'admin@drjavadrezazadeh.com'),
        'mail_reply_to' => (string)(getenv('JR_MAIL_REPLY_TO') ?: 'admin@drjavadrezazadeh.com'),
        'smtp_enabled' => getenv('JR_SMTP_ENABLED') === 'true',
        'smtp_host' => (string)(getenv('JR_SMTP_HOST') ?: ''),
        'smtp_port' => (int)(getenv('JR_SMTP_PORT') ?: 0),
        'smtp_security' => strtolower((string)(getenv('JR_SMTP_SECURITY') ?: '')),
        'smtp_user' => (string)(getenv('JR_SMTP_USER') ?: ''),
        'smtp_password' => (string)(getenv('JR_SMTP_PASSWORD') ?: ''),
        'smtp_verify_peer' => getenv('JR_SMTP_VERIFY_PEER') !== 'false',
        'commerce_enabled' => getenv('JR_COMMERCE_ENABLED') === 'true',
        'public_tls_confirmed' => getenv('JR_PUBLIC_TLS_CONFIRMED') === 'true',
        'bitpay_api_key' => (string)(getenv('JR_BITPAY_API_KEY') ?: ''),
        'bitpay_amount_multiplier' => (string)(getenv('JR_BITPAY_AMOUNT_MULTIPLIER') ?: ''),
        'order_email_fulfilment_confirmed' => getenv('JR_ORDER_EMAIL_FULFILMENT_CONFIRMED') === 'true',
        'service_booking_confirmed' => getenv('JR_SERVICE_BOOKING_CONFIRMED') === 'true',
        'vip_booking_confirmed' => getenv('JR_VIP_BOOKING_CONFIRMED') === 'true',
        'book_shipping_confirmed' => getenv('JR_BOOK_SHIPPING_CONFIRMED') === 'true',
        // Encrypted academic service attachments: private Bertina storage only.
        // Private config.local.php may override environment defaults.
        'service_files_enabled' => getenv('JR_SERVICE_FILES_ENABLED') === 'true',
        'service_private_storage' => (string)(getenv('JR_SERVICE_PRIVATE_STORAGE') ?: ''),
        'service_antivirus_binary' => (string)(getenv('JR_SERVICE_AV_BINARY') ?: ''),
        // Account UUID => ['role'=>'ADMIN', 'totp_secret'=>'...']; private provisioning only.
        'operations_admins' => [],
        // Private mailbox for operational incidents (never returned to browsers).
        'operations_alert_recipient' => (string)(getenv('JR_OPERATIONS_ALERT_RECIPIENT') ?: ''),
        // Optional, private Bertina access-log reader (never on web requests).
        'operations_access_log_path' => (string)(getenv('JR_OPERATIONS_ACCESS_LOG_PATH') ?: ''),
        'operations_http_retention_days' => (int)(getenv('JR_OPERATIONS_HTTP_RETENTION_DAYS') ?: 90),
        // One private CLI scheduler is independently owner-gated. Setting
        // this flag alone never enables an individual disabled DB job.
        'operations_cron_master_enabled' => getenv('JR_OPERATIONS_CRON_MASTER_ENABLED') === 'true',
        // Optional measured host-load ceiling for deferrable AI/collection
        // subprocesses only. Default NULL is inert until the owner sets a
        // host-specific threshold. Payments, email and privacy jobs unaffected.
        'operations_cron_ai_max_load1' =>
            is_numeric(getenv('JR_OPERATIONS_CRON_AI_MAX_LOAD1')) ?
            (float)getenv('JR_OPERATIONS_CRON_AI_MAX_LOAD1') : null,
        // Daily JREI metadata evaluation is a separate private OFF switch.
        // No model training, marketing, payment or source authority follows.
        'jrei_learning_daily_enabled' => getenv('JR_JREI_LEARNING_DAILY_ENABLED') === 'true',
        // New exam coverage / TESTLY research work is OFF until authoritative
        // source licences, ethics, guardian gates and host schema are accepted.
        'jrei_exam_research_enabled' => getenv('JR_JREI_EXAM_RESEARCH_ENABLED') === 'true',
        // Separate, default-OFF switch for reviewed exam catalogue metadata.
        // It NEVER opens checkout or public response/answer delivery by itself.
        'jrei_exam_commercial_enabled' => getenv('JR_JREI_EXAM_COMMERCIAL_ENABLED') === 'true',
        // Independent default-OFF owner-issued verified order entitlement gate.
        'jrei_exam_verified_entitlement_grants_enabled' => getenv('JR_JREI_EXAM_VERIFIED_ENTITLEMENT_GRANTS_ENABLED') === 'true',
        // Separate explicit OFF gate until the REAL verified-exam checkout
        // SKU/settlement bridge is integrated with original Stage09 commerce.
        'jrei_exam_checkout_bridge_accepted' => getenv('JR_JREI_EXAM_CHECKOUT_BRIDGE_ACCEPTED') === 'true',
        // Independent OFF switches. An owner must approve real immutable
        // question delivery and final security/payment acceptance as well.
        'jrei_exam_runtime_enabled' => getenv('JR_JREI_EXAM_RUNTIME_ENABLED') === 'true',
        // Owner-controlled safety-only abandoned-session reconciliation.
        // Never starts, grades, refunds or publishes an examination.
        'jrei_exam_deadline_reconciliation_enabled' => getenv('JR_JREI_EXAM_DEADLINE_RECONCILIATION_ENABLED') === 'true',
        'jrei_exam_item_delivery_accepted' => getenv('JR_JREI_EXAM_ITEM_DELIVERY_ACCEPTED') === 'true',
        // Local immutable JSON question assets, PRIVATE and outside public_html.
        'jrei_exam_private_item_dir' => (string)(getenv('JR_JREI_EXAM_PRIVATE_ITEM_DIR') ?: ''),
        // Separate OFF-by-default licence-gated JREI-KA scheduler consent.
        // Cron registers tasks only; no network fetching or model execution.
        'jrei_ka_schedule_enabled' => getenv('JR_JREI_KA_SCHEDULE_ENABLED') === 'true',
        // Optional Iran-local 02:00–05:00 scheduling/acquisition window.
        'jrei_ka_night_mode_enabled' => getenv('JR_JREI_KA_NIGHT_MODE_ENABLED') === 'true',
        // Separate PRIVATE owner opt-in to run approved scheduling throughout
        // the civil day. No switch is activated by a source commit.
        'jrei_ka_continuous_enabled' => getenv('JR_JREI_KA_CONTINUOUS_ENABLED') === 'true',
        // Separate default-off owner policy. Does NOT waive robots, legal
        // rights, physical disk, per-source spacing or emergency stop.
        'jrei_ka_uncapped_daily_enabled' => getenv('JR_JREI_KA_UNCAPPED_DAILY_ENABLED') === 'true',
        // Separate legal autonomous-fetch opt-in, OFF even when scheduling
        // is enabled; private archived bytes must reside outside public_html.
        'jrei_ka_autofetch_enabled' => getenv('JR_JREI_KA_AUTOFETCH_ENABLED') === 'true',
        // Independent first-pass extraction permission; never implies OCR,
        // autonomous scientific acceptance or public document publishing.
        'jrei_ka_text_extraction_enabled' => getenv('JR_JREI_KA_TEXT_EXTRACTION_ENABLED') === 'true',
        // Draft paragraph metadata cannot become public research evidence.
        'jrei_ka_passage_proposals_enabled' => getenv('JR_JREI_KA_PASSAGE_PROPOSALS_ENABLED') === 'true',
        // Propose source-metadata paper/key matches only. Never approve keys.
        'jrei_ka_key_match_proposals_enabled' => getenv('JR_JREI_KA_KEY_MATCH_PROPOSALS_ENABLED') === 'true',
        'jrei_ka_private_archive_dir' => (string)(getenv('JR_JREI_KA_PRIVATE_ARCHIVE_DIR') ?: ''),
        // Independent News projection: consumes ALREADY archived, lawfully
        // approved JREI-KA feed receipts. Both permissions default OFF;
        // neither switch starts a new crawler or authorizes publication.
        'jrei_news_feed_discovery_enabled' => getenv('JR_JREI_NEWS_FEED_DISCOVERY_ENABLED') === 'true',
        'jrei_news_article_intake_enabled' => getenv('JR_JREI_NEWS_ARTICLE_INTAKE_ENABLED') === 'true',
        // The public index is always restricted to owner-approved PUBLISHED
        // documents. Neither key activates publication or ingestion.
        // Both remain OFF until the live schema and publication receipts
        // have been independently accepted by the owner.
        'jrei_news_search_enabled' => getenv('JR_JREI_NEWS_SEARCH_ENABLED') === 'true',
        // Original source-review-bound public News calendar; NO fabricated dates.
        'jrei_news_calendar_enabled' => getenv('JR_JREI_NEWS_CALENDAR_ENABLED') === 'true',
        // PRIVATE additive original-news table caretaker; default OFF.
        // No DDL without one real mother DB, original Cron, current hashed
        // out-of-webroot backup and prior restore rehearsal acceptance.
        'jrei_news_schema_caretaker_enabled' =>
            getenv('JR_JREI_NEWS_SCHEMA_CARETAKER_ENABLED') === 'true',
        'jrei_news_schema_restore_rehearsed' =>
            getenv('JR_JREI_NEWS_SCHEMA_RESTORE_REHEARSED') === 'true',
        'jrei_news_schema_backup_file' =>
            getenv('JR_JREI_NEWS_SCHEMA_BACKUP_FILE') ?: null,
        'jrei_news_schema_backup_sha256' =>
            getenv('JR_JREI_NEWS_SCHEMA_BACKUP_SHA256') ?: null,

        // Separate default-OFF machine-to-machine news gateway. The key
        // belongs only in original server-private settings (never Git/JS).
        // A signed intake is a held candidate, NOT QA or CMS authority.
        'jrei_news_site_gateway_enabled' =>
            getenv('JR_JREI_NEWS_SITE_GATEWAY_ENABLED') === 'true',
        'jrei_news_site_gateway_hmac_key' =>
            (string)(getenv('JR_JREI_NEWS_SITE_GATEWAY_HMAC_KEY') ?: ''),
        'jrei_news_publisher_receipts_accepted' => getenv('JR_JREI_NEWS_PUBLISHER_RECEIPTS_ACCEPTED') === 'true',
        'jrei_news_integrated_release_accepted' => getenv('JR_JREI_NEWS_INTEGRATED_RELEASE_ACCEPTED') === 'true',
        // A separate SUPER_ADMIN decision. Creating news monitors or
        // approving original sources does not enable scheduled crawling.
        'jrei_news_source_activation_accepted' => getenv('JR_JREI_NEWS_SOURCE_ACTIVATION_ACCEPTED') === 'true',
        // These three FIRST-PARTY News workers previously consumed missing
        // config keys and silently remained OFF even when the owner set
        // server-private activation flags. Never default these permissions ON.
        'jrei_news_independent_evidence_enabled' =>
            getenv('JR_JREI_NEWS_INDEPENDENT_EVIDENCE_ENABLED') === 'true',
        'jrei_news_official_catalogue_auto_seed_enabled' =>
            getenv('JR_JREI_NEWS_OFFICIAL_CATALOGUE_AUTO_SEED_ENABLED') === 'true',
        'jrei_news_automatic_official_monitor_enabled' =>
            getenv('JR_JREI_NEWS_AUTOMATIC_OFFICIAL_MONITOR_ENABLED') === 'true',
        // A prior dashboard MFA source approval may be reconciled by the
        // original private News Cron once independently verified JREI-KA
        // provenance and rights become valid. Never forge source approval.
        'jrei_news_admin_source_autolink_enabled' => getenv('JR_JREI_NEWS_ADMIN_SOURCE_AUTOLINK_ENABLED') === 'true',
        // Separate production permission for FIRST-TIME monitors only:
        // existing stopped monitors are never silently reactivated.
        'jrei_news_admin_source_auto_monitor_enabled' => getenv('JR_JREI_NEWS_ADMIN_SOURCE_AUTO_MONITOR_ENABLED') === 'true',
        // Explicit owner-approved, exact-path delegation for official articles.
        // Disabled until original JREI migration, policy and backup acceptance.
        'jrei_news_delegated_scopes_enabled' => getenv('JR_JREI_NEWS_DELEGATED_SCOPES_ENABLED') === 'true',
        // Superseding JREI News official-source policy. These are independent,
        // opt-in private release flags: declaring them does not flip them on.
        // Publishing must still have owner MFA policy, completed mother DB
        // migrations, current source rights, independent QA and CMS receipt.
        'jrei_news_model_drafting_enabled' => getenv('JR_JREI_NEWS_MODEL_DRAFTING_ENABLED') === 'true',
        'jrei_news_original_cms_writer_enabled' => getenv('JR_JREI_NEWS_ORIGINAL_CMS_WRITER_ENABLED') === 'true',
        // Bounded resources per Cron tick, never a DAILY editorial quota.
        'jrei_news_publish_batch_per_tick' => (int)(getenv('JR_JREI_NEWS_PUBLISH_BATCH_PER_TICK') ?: 3),
        'jrei_news_standing_official_publishing_enabled' => getenv('JR_JREI_NEWS_STANDING_OFFICIAL_PUBLISHING_ENABLED') === 'true',
        'jrei_news_verified_restore_accepted' => getenv('JR_JREI_NEWS_VERIFIED_RESTORE_ACCEPTED') === 'true',
        // Owned JREI-specific RSS and News Sitemap, gated independently.
        // It never overwrites the site's existing feed.xml or sitemap-news.xml.
        'jrei_news_verified_syndication_enabled' => getenv('JR_JREI_NEWS_VERIFIED_SYNDICATION_ENABLED') === 'true',
        'jrei_news_original_digest_enabled' => getenv('JR_JREI_NEWS_ORIGINAL_DIGEST_ENABLED') === 'true',

        // Original private author corpus and independent reviewer records.
        // Paths must be private, outside the document root; secrets remain
        // in Bertina server env and never in GitHub, JS or public API.
        'jrei_news_approved_fa_author_corpus_sha256' => (string)(getenv('JR_JREI_NEWS_APPROVED_FA_AUTHOR_CORPUS_SHA256') ?: ''),
        'jrei_news_approved_en_author_corpus_sha256' => (string)(getenv('JR_JREI_NEWS_APPROVED_EN_AUTHOR_CORPUS_SHA256') ?: ''),
        'jrei_news_approved_brand_media_ref' => (string)(getenv('JR_JREI_NEWS_APPROVED_BRAND_MEDIA_REF') ?: ''),
        'jrei_news_original_fact_packet_dir' => (string)(getenv('JR_JREI_NEWS_ORIGINAL_FACT_PACKET_DIR') ?: ''),
        'jrei_news_original_fact_signing_secret' => (string)(getenv('JR_JREI_NEWS_ORIGINAL_FACT_SIGNING_SECRET') ?: ''),
        'jrei_news_independent_qa_dir' => (string)(getenv('JR_JREI_NEWS_INDEPENDENT_QA_DIR') ?: ''),
        'jrei_news_independent_qa_secret' => (string)(getenv('JR_JREI_NEWS_INDEPENDENT_QA_SECRET') ?: ''),
        // Independent QA is a separate, deliberately selected reviewing model.
        // No change to the source-owned budget, credential or public permissions.
        'jrei_news_independent_second_pass_enabled' => getenv('JR_JREI_NEWS_INDEPENDENT_SECOND_PASS_ENABLED') === 'true',
        'jrei_news_independent_qa_model' => (string)(getenv('JR_JREI_NEWS_INDEPENDENT_QA_MODEL') ?: ''),


        // APEX may observe an EXISTING, explicitly owner-linked, signed
        // public retrieval worker job. This separate switch never dispatches,
        // leases, renews or cancels worker processing. Default OFF.
        'jrei_apex_worker_link_enabled' =>
            getenv('JR_JREI_APEX_WORKER_LINK_ENABLED') === 'true',
        // JREI APEX owner mission ledger: OFF for new plans until private
        // owner authorization and mother-DB migration acceptance. Revocation
        // and emergency stop remain available to authenticated MFA owner.
        // No planner switch can enable a worker or live tool execution.
        'jrei_apex_missions_owner_write_enabled' =>
            getenv('JR_JREI_APEX_MISSIONS_OWNER_WRITE_ENABLED') === 'true',
        // Separate source-stage, explicitly opt-in HMAC Python mission proposal.
        // Default OFF; requires reviewed additive mother-DB migration and
        // independently accepted single-process replay / TLS controls.
        'jrei_apex_mission_python_plan_enabled' =>
            getenv('JR_JREI_APEX_MISSION_PYTHON_PLAN_ENABLED') === 'true',
        // Signed Windows-node report of localhost Python process only.
        // Default OFF; NEVER exposes Python 8091 or authorizes skill execution.
        'jrei_python_node_heartbeat_enabled' =>
            getenv('JR_JREI_PYTHON_NODE_HEARTBEAT_ENABLED') === 'true',
        'jrei_python_canary_enabled' => getenv('JR_JREI_PYTHON_CANARY_ENABLED') === 'true',
        // Private SUPER_ADMIN-only educational draft through owner-reviewed
        // local Qwen. Additional HMAC+Python OFF switches remain required.
        // This does not enable public inference, crawling or publication.
        'jrei_python_owner_model_draft_enabled' =>
            getenv('JR_JREI_PYTHON_OWNER_MODEL_DRAFT_ENABLED') === 'true',
        // Proposal-only autonomous self-improvement; independently gated
        // behind SUPER_ADMIN MFA and the existing signed Python connection.
        // This is NOT a code-write, model-training or production grant.
        'jrei_python_self_improvement_enabled' =>
            getenv('JR_JREI_PYTHON_SELF_IMPROVEMENT_ENABLED') === 'true',
        // Immutable metadata-only learning-cycle journal. Separate OFF gate.
        'jrei_metacognitive_owner_journal_enabled' =>
            getenv('JR_JREI_METACOGNITIVE_OWNER_JOURNAL_ENABLED') === 'true',
        // Read-only current source/claim provenance reconciliation.
        // OFF unless reviewed ledger migration, MFA owner and live DB agree.
        'jrei_knowledge_evidence_enabled' =>
            getenv('JR_JREI_KNOWLEDGE_EVIDENCE_ENABLED') === 'true',
        // Source-only Python intelligence seam (private worker/VPS only).
        // OFF until independent owner, host, replay-ledger and TLS acceptance;
        // never assume a Python process is available on Bertina hosting.
        'jrei_python_internal_enabled' => getenv('JR_JREI_PYTHON_INTERNAL_ENABLED') === 'true',
        'jrei_python_internal_base_url' => (string)(getenv('JR_JREI_PYTHON_INTERNAL_BASE_URL') ?: ''),
        'jrei_python_hmac_key' => (string)(getenv('JR_JREI_PYTHON_HMAC_KEY') ?: ''),
        // Owner-only encrypted memory: separate write/read and revoke gates,
        // always OFF unless independently approved and provisioned.
        'jrei_python_owner_memory_enabled' =>
            getenv('JR_JREI_PYTHON_OWNER_MEMORY_ENABLED') === 'true',
        'jrei_python_owner_memory_revoke_enabled' =>
            getenv('JR_JREI_PYTHON_OWNER_MEMORY_REVOKE_ENABLED') === 'true',
        // Real AI inference: independent paid-provider credentials and
        // source-owned budget approval; entirely OFF until final acceptance.
        'jrei_live_ai_enabled' => getenv('JR_JREI_LIVE_AI_ENABLED') === 'true',
        // Independent JREI-LM Windows inference; OpenAI not required.
        'jrei_local_chat_enabled' => getenv('JR_JREI_LOCAL_CHAT_ENABLED') === 'true',
        'jrei_local_public_release_accepted' => getenv('JR_JREI_LOCAL_PUBLIC_RELEASE_ACCEPTED') === 'true',
        // Distinct owner-authorised public GENERAL chat, with explicitly
        // UNVALIDATED scientific status; never replaces rights, encryption,
        // genuine runtime, signed node, live retention or consent.
        'jrei_local_public_unvalidated_owner_approved' => getenv('JR_JREI_LOCAL_PUBLIC_UNVALIDATED_OWNER_APPROVED') === 'true',
        'jrei_local_chat_key_b64' => (string)(getenv('JR_JREI_LOCAL_CHAT_KEY_B64') ?: ''),
        'jrei_local_chat_retention_enabled' => getenv('JR_JREI_LOCAL_CHAT_RETENTION_ENABLED') === 'true',
        // Reusable owner permission, never visitor/model-generated DDL.
        // This source-owned schema caretaker requires a real recent private
        // backup SHA-256 and the original drjavad1_store mother DB.
        'jrei_local_schema_caretaker_enabled' => getenv('JR_JREI_LOCAL_SCHEMA_CARETAKER_ENABLED') === 'true',
        'jrei_local_schema_backup_file' => (string)(getenv('JR_JREI_LOCAL_SCHEMA_BACKUP_FILE') ?: ''),
        'jrei_local_schema_backup_sha256' => (string)(getenv('JR_JREI_LOCAL_SCHEMA_BACKUP_SHA256') ?: ''),
        'jrei_allow_optional_cloud_public_fallback' => getenv('JR_JREI_ALLOW_OPTIONAL_CLOUD_PUBLIC_FALLBACK') === 'true',
        // Credentials/policy alone cannot expose source-only AI to the public.
        // Release approval is independently OFF until the final acceptance.
        'jrei_public_ai_release_accepted' => getenv('JR_JREI_PUBLIC_AI_RELEASE_ACCEPTED') === 'true',
        // Actual paid model BENCHMARK remains independent of live public AI.
        'jrei_ai_benchmark_enabled' => getenv('JR_JREI_AI_BENCHMARK_ENABLED') === 'true',
        'jrei_ai_benchmark_discovery_enabled' => getenv('JR_JREI_AI_BENCHMARK_DISCOVERY_ENABLED') === 'true',
        'jrei_ai_improvement_discovery_enabled' => getenv('JR_JREI_AI_IMPROVEMENT_DISCOVERY_ENABLED') === 'true',
        'jrei_ai_benchmark_batch_id' => (string)(getenv('JR_JREI_AI_BENCHMARK_BATCH_ID') ?: ''),
        // Independently rights/peer-reviewed original passage RAG is
        // separately OFF until archival source reviews and QA are accepted.
        'jrei_ai_approved_passage_retrieval_enabled' => getenv('JR_JREI_AI_APPROVED_PASSAGE_RETRIEVAL_ENABLED') === 'true',
        'jrei_ai_openai_key' => (string)(getenv('JR_JREI_OPENAI_API_KEY') ?: ''),
        'jrei_ai_openai_model' => (string)(getenv('JR_JREI_OPENAI_MODEL') ?: ''),
        'jrei_ai_daily_call_limit' => (int)(getenv('JR_JREI_AI_DAILY_CALL_LIMIT') ?: 12),
        'jrei_ai_daily_input_limit' => (int)(getenv('JR_JREI_AI_DAILY_INPUT_TOKEN_LIMIT') ?: 50000),
        'jrei_ai_daily_output_limit' => (int)(getenv('JR_JREI_AI_DAILY_OUTPUT_TOKEN_LIMIT') ?: 5000),
        // Outbound Windows worker API: independently OFF, even if owner
        // registers a public key or compiles a local model adapter.
        'jrei_hybrid_enabled' => getenv('JR_JREI_HYBRID_ENABLED') === 'true',
        // Independent OFF-by-default JREI incident observer switch. Neither
        // turning this ON nor registering a sensor sends mail: existing
        // master Cron, event rules, per-feature and global email opt-ins
        // remain separate SUPER_ADMIN controls.
        'jrei_hybrid_alerts_enabled' => getenv('JR_JREI_HYBRID_ALERTS_ENABLED') === 'true',
        // Separate OFF-by-default bounded cleanup of expired crypto nonce
        // and stale dataset-advertisement rows. Never purge job/audit records.
        'jrei_hybrid_retention_enabled' => getenv('JR_JREI_HYBRID_RETENTION_ENABLED') === 'true',
        // Independent OFF-by-default safety-only lease reconciliation.
        // No repeat of interrupted or possibly completed worker jobs.
        'jrei_hybrid_reconciliation_enabled' => getenv('JR_JREI_HYBRID_RECONCILIATION_ENABLED') === 'true',
        // Operator-owned mapping of independently source-reviewed PUBLIC
        // evaluation corpora only. No student content or arbitrary paths.
        'jrei_hybrid_approved_datasets' => [],
        // Strictly optional BAHAR adult private storage; disabled until owner,
        // scientific/legal review and secret provisioning independently agree.
        'bahar_private_workbooks_enabled' => getenv('JR_BAHAR_PRIVATE_WORKBOOKS_ENABLED') === 'true',
        'bahar_workbook_key_b64' => (string)(getenv('JR_BAHAR_WORKBOOK_KEY_B64') ?: ''),
        'bahar_workbook_key_id' => (string)(getenv('JR_BAHAR_WORKBOOK_KEY_ID') ?: ''),
        // Optional double-opt-in interest gateway: no collection until
        // independently enabled by env + MFA owner switch + mail + crypto.
        'edu_interest_enabled' => getenv('JR_EDU_INTEREST_ENABLED') === 'true',
        'edu_interest_key_b64' => (string)(getenv('JR_EDU_INTEREST_KEY_B64') ?: ''),
        'edu_interest_key_id' => (string)(getenv('JR_EDU_INTEREST_KEY_ID') ?: ''),
    ];
    $local = __DIR__ . '/config.local.php';
    if (is_file($local)) {
        $loaded = require $local;
        if (is_array($loaded)) $cfg = array_replace($cfg, $loaded);
    }
    // Owner-approved ONE-CLICK release may safely enable the existing master
    // scheduler without editing secrets or overwriting config.local.php.
    // The receipt lives OUTSIDE public_html, is HMAC-authenticated using the
    // private existing auth pepper, and has a single fixed flag allowlist.
    // All sensitive worker rows, source rights, AI and CMS publisher switches
    // retain their independent default OFF state.
    $masterReceipt=dirname(__DIR__,2).'/.jr-owner-news-master.v1.json';
    $pepper=(string)($cfg['auth_pepper']??'');
    if(strlen($pepper)>=32 && is_file($masterReceipt) &&
       !is_link($masterReceipt) &&
       ((@fileperms($masterReceipt)&0777)===0600) &&
       ($bytes=@filesize($masterReceipt))!==false && $bytes<=4096){
        $raw=@file_get_contents($masterReceipt);
        $signed=is_string($raw)?json_decode($raw,true):null;
        $payload=is_array($signed)?($signed['payload']??null):null;
        if(is_array($payload) &&
           ($payload['schema']??null)==='jr.owner.news-master-release.v1' &&
           ($payload['discoveryOnly']??null)===true &&
           ($payload['ownerRelease']??null)===true &&
           preg_match('/^[a-f0-9]{40}$/D',(string)($payload['sha']??'')) &&
           is_string($signed['hmac']??null) &&
           preg_match('/^[a-f0-9]{64}$/D',$signed['hmac'])){
            $encoded=json_encode($payload,JSON_UNESCAPED_SLASHES);
            $expected=hash_hmac('sha256',(string)$encoded,
                hash_hmac('sha256','jr.owner.news-master-release.v1',$pepper));
            // A previous owner release must never silently authorize a
            // different live SHA after a rollback or partial deployment.
            $sw=@file_get_contents(dirname(__DIR__).'/sw.js',false,null,0,2048);
            $verifiedLive=is_string($sw) &&
                preg_match("/^const CACHE_VERSION='jr-site-bertina-([a-f0-9]{40})';$/m",
                    $sw,$version)===1 &&
                hash_equals($version[1],(string)$payload['sha']);
            if($verifiedLive &&
               hash_equals($expected,$signed['hmac']) &&
               ($cfg['jrei_news_emergency_stop']??false)!==true){
                $cfg['operations_cron_master_enabled']=true;
                // Only a fully verified ORIGINAL News schema authorizes
                // discovery projection. Keep all acquisition, publication,
                // source rights, backup and model flags independently OFF.
                if(($payload['discoveryReady']??null)===true){
                    $cfg['jrei_news_integrated_release_accepted']=true;
                    $cfg['jrei_news_feed_discovery_enabled']=true;
                    $cfg['jrei_news_official_catalogue_auto_seed_enabled']=true;
                }
            }
        }
    }
    return $cfg;
}
/** Per-order guest receipt capability: UUID alone never proves ownership. */
function commerceReceiptCookieName(string $id): string {
    return 'drjr_receipt_'.substr(hash('sha256',$id),0,16);
}
function commerceReceiptProof(string $id): string {
    $pepper=(string)(cfg()['auth_pepper']??'');
    if(strlen($pepper)<32)throw new RuntimeException('receipt_auth_unavailable');
    return hash_hmac('sha256','commerce-receipt-v1|'.$id,$pepper);
}
function commerceReceiptAuthorized(string $id): bool {
    $provided=$_COOKIE[commerceReceiptCookieName($id)]??null;
    if(!is_string($provided)||!preg_match('/^[a-f0-9]{64}$/D',$provided))return false;
    try {return hash_equals(commerceReceiptProof($id),$provided);}
    catch(Throwable $e){return false;}
}
function commerceReceiptGrant(string $id): bool {
    return setcookie(commerceReceiptCookieName($id),commerceReceiptProof($id),[
        'expires'=>time()+604800,'path'=>'/api/commerce/status',
        'secure'=>true,'httponly'=>true,'samesite'=>'Lax'
    ]);
}

function db(): ?PDO {
    static $pdo = false;
    if ($pdo instanceof PDO) return $pdo;
    if ($pdo === null) return null;
    $c = cfg();
    if ($c['db_dsn'] === '' || $c['db_user'] === '') { $pdo = null; return null; }
    try {
        $pdo = new PDO($c['db_dsn'], $c['db_user'], $c['db_password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        return $pdo;
    } catch (Throwable $e) {
        $pdo = null;
        return null;
    }
}
function dbReady(): bool {
    $pdo = db();
    if (!$pdo) return false;
    try { $pdo->query('SELECT 1'); return true; } catch (Throwable $e) { return false; }
}
function smtpConfigured(array $c): bool {
    return ($c['smtp_enabled'] ?? false) === true
        && is_string($c['smtp_host'] ?? null) && trim((string)$c['smtp_host']) !== ''
        && is_int($c['smtp_port'] ?? null) && (int)$c['smtp_port'] > 0 && (int)$c['smtp_port'] <= 65535
        && in_array((string)($c['smtp_security'] ?? ''), ['ssl','tls'], true)
        && filter_var((string)($c['mail_from'] ?? ''), FILTER_VALIDATE_EMAIL) !== false
        && filter_var((string)($c['smtp_user'] ?? ''), FILTER_VALIDATE_EMAIL) !== false
        && is_string($c['smtp_password'] ?? null) && (string)$c['smtp_password'] !== ''
        && function_exists('stream_socket_client');
}
// Diagnostic parity with Bertina ticket t833905 (2026-10-11).
// Only an aggregate boolean is exposed through health endpoints; do not
// disclose SMTP credentials or mailbox settings in public JSON responses.
function smtpProviderSettingsMatch(array $c): bool {
    $host = strtolower(trim((string)($c['smtp_host'] ?? '')));
    $port = (int)($c['smtp_port'] ?? 0);
    $security = strtolower((string)($c['smtp_security'] ?? ''));
    $user = strtolower((string)($c['smtp_user'] ?? ''));
    return $host === 'drjavadrezazadeh.com'
        && (($port === 465 && $security === 'ssl') || ($port === 587 && $security === 'tls'))
        && $user === 'admin@drjavadrezazadeh.com'
        && ($c['smtp_verify_peer'] ?? true) === true;
}
/**
 * Resolve the non-secret transport coordinates documented by Bertina in
 * ticket t833905. The private mailbox password and explicit enable switches
 * remain authoritative and are never copied into logs or source control.
 * Avoid attempting several accounts/passwords to prevent mailbox lockouts.
 */
function smtpResolvedConfig(array $c): array {
    if (($c['smtp_enabled'] ?? false) !== true) return $c;
    $c['smtp_host'] = 'drjavadrezazadeh.com';
    $c['smtp_port'] = 465;
    $c['smtp_security'] = 'ssl';
    $c['smtp_user'] = 'admin@drjavadrezazadeh.com';
    $c['mail_from'] = 'admin@drjavadrezazadeh.com';
    $c['smtp_verify_peer'] = true;
    return $c;
}
function mailReady(): bool {
    $c = cfg();
    if (($c['mail_enabled'] ?? false) !== true) return false;
    // Bertina shared hosting restricts mail(). Registration mail must always
    // use authenticated SMTP, with TLS and server-side credentials.
    return smtpConfigured(smtpResolvedConfig($c));
}
function smtpRead($fp): array {
    $lines=[];$code=0;
    while (($line=fgets($fp, 2048)) !== false) {
        $lines[]=$line;
        if (preg_match('/^(\\d{3})([ -])/', $line, $m)) {
            $code=(int)$m[1];
            if ($m[2]===' ') break;
        }
    }
    return [$code, implode('', $lines)];
}
function smtpFail(string $stage): bool {
    // Only the protocol stage is logged; never log credentials, recipient,
    // subject, verification tokens, or provider responses containing PII.
    $GLOBALS['bertina_smtp_last_failure_stage']=$stage;
    error_log('BERTINA_SMTP_FAIL stage='.$stage);
    return false;
}
function smtpCmd($fp, string $command, array $expected): bool {
    if ($command !== '') {
        if (@fwrite($fp, $command."\r\n") === false) return false;
    }
    [$code,] = smtpRead($fp);
    return in_array($code, $expected, true);
}
function smtpSend(string $to, string $subject, string $body): bool {
    require_once __DIR__.'/smtp-body.php';
    $c=smtpResolvedConfig(cfg());
    if (!smtpConfigured($c) || !filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $host=trim((string)$c['smtp_host']);$port=(int)$c['smtp_port'];$security=(string)$c['smtp_security'];
    $verify=($c['smtp_verify_peer'] ?? true) === true;
    $context=stream_context_create(['ssl'=>[
        'verify_peer'=>$verify,
        'verify_peer_name'=>$verify,
        'allow_self_signed'=>!$verify,
        'peer_name'=>$host,
        'SNI_enabled'=>true,
    ]]);
    $remote=($security==='ssl'?'ssl://':'tcp://').$host.':'.$port;
    $errno=0;$errstr='';
    $fp=@stream_socket_client($remote,$errno,$errstr,15,STREAM_CLIENT_CONNECT,$context);
    if(!is_resource($fp))return smtpFail('connect');
    stream_set_timeout($fp,15);
    try{
        if(!smtpCmd($fp,'',[220]))return smtpFail('greeting');
        $hello=preg_replace('/[^A-Za-z0-9.-]/','',parse_url(SITE_ORIGIN,PHP_URL_HOST) ?: 'localhost');
        if(!smtpCmd($fp,'EHLO '.$hello,[250]))return smtpFail('ehlo');
        if($security==='tls'){
            if(!smtpCmd($fp,'STARTTLS',[220]))return smtpFail('starttls');
            if(!@stream_socket_enable_crypto($fp,true,STREAM_CRYPTO_METHOD_TLS_CLIENT))return smtpFail('tls_handshake');
            if(!smtpCmd($fp,'EHLO '.$hello,[250]))return smtpFail('ehlo_after_tls');
        }
        $user=(string)$c['smtp_user'];$pass=(string)$c['smtp_password'];
        if(!smtpCmd($fp,'AUTH LOGIN',[334]))return smtpFail('auth_login');
        if(!smtpCmd($fp,base64_encode($user),[334]))return smtpFail('auth_user');
        if(!smtpCmd($fp,base64_encode($pass),[235]))return smtpFail('auth_password');
        $from=(string)$c['mail_from'];
        if(!smtpCmd($fp,'MAIL FROM:<'.$from.'>',[250]))return smtpFail('mail_from');
        if(!smtpCmd($fp,'RCPT TO:<'.$to.'>',[250,251]))return smtpFail('recipient');
        if(!smtpCmd($fp,'DATA',[354]))return smtpFail('data_begin');
        $encodedSubject='=?UTF-8?B?'.base64_encode($subject).'?=';
        $reply=(string)($c['mail_reply_to']??$from);
        // Only normalize the body. Header lines are already CRLF-terminated;
        // applying LF->CRLF to the whole message produces invalid CRCRLF.
        $normalizedBody=bertinaNormalizeSmtpBody($body);
        $message="From: Dr. Javad Rezazadeh <".$from.">\r\n".
            "Reply-To: ".$reply."\r\n".
            "To: <".$to.">\r\n".
            "Subject: ".$encodedSubject."\r\n".
            "MIME-Version: 1.0\r\n".
            "Content-Type: text/plain; charset=UTF-8\r\n".
            "Content-Transfer-Encoding: 8bit\r\n".
            "Date: ".gmdate('D, d M Y H:i:s').' +0000'."\r\n".
            "Message-ID: <".bin2hex(random_bytes(12))."@drjavadrezazadeh.com>\r\n\r\n".
            $normalizedBody;
        if(@fwrite($fp,$message."\r\n.\r\n")===false)return smtpFail('data_write');
        [$code,]=smtpRead($fp);
        if($code!==250)return smtpFail('data_accept');
        @fwrite($fp,"QUIT\r\n");
        return true;
    } finally {
        @fclose($fp);
    }
}
function sendLocalMail(string $to, string $subject, string $body): bool {
    if (!mailReady() || !filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    return smtpSend($to, $subject, $body);
}
function route(): string {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/api/', PHP_URL_PATH) ?: '/api/';
    $path = preg_replace('#^/api/?#', '/', $path);
    return '/'.ltrim((string)$path, '/');
}
function method(): string { return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'); }
function jsonBody(): array {
    $type = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (!str_starts_with($type, 'application/json')) fail('content_type', 415);
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 65536) fail('invalid_body', 413);
    $data = json_decode($raw, true);
    if (!is_array($data)) fail('invalid_json');
    return $data;
}
function originOK(): bool {
    $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
    return $origin === '' || $origin === SITE_ORIGIN;
}
function requirePostOrigin(): void {
    if (!originOK()) fail('origin_forbidden', 403);
}
function emailNorm(mixed $v): string { return strtolower(trim((string)$v)); }
function validEmail(string $v): bool { return strlen($v) <= 254 && filter_var($v, FILTER_VALIDATE_EMAIL) !== false; }
function validPassword(mixed $v): bool { return is_string($v) && strlen($v) >= 12 && strlen($v) <= 128; }
function textLen(string $v): int { return function_exists('mb_strlen') ? mb_strlen($v, 'UTF-8') : strlen($v); }
function commerceSchemaReady(): bool {
    $pdo=db(); if(!$pdo)return false;
    try{
        $need=['customer_email'=>false,'customer_json'=>false,'receipt_email_sent_at'=>false];
        $q=$pdo->query("SHOW COLUMNS FROM commerce_orders");
        foreach($q->fetchAll() as $row){$field=(string)($row['Field']??'');if(array_key_exists($field,$need))$need[$field]=true;}
        return !in_array(false,$need,true);
    }catch(Throwable $e){return false;}
}
function normalizedCustomer(mixed $input): array {
    if(!is_array($input))fail('customer_required');
    $name=trim((string)($input['name']??''));
    $email=emailNorm($input['email']??'');
    $address=trim((string)($input['address']??''));
    $postal=trim((string)($input['postal']??''));
    $phone=trim((string)($input['phone']??''));
    if(textLen($name)<2||textLen($name)>100)fail('invalid_customer_name');
    if(!validEmail($email))fail('invalid_customer_email');
    if(textLen($address)<10||textLen($address)>500)fail('invalid_delivery_address');
    if(!preg_match('/^[A-Za-z0-9۰-۹٠-٩\\- ]{4,20}$/u',$postal))fail('invalid_postal_code');
    if($phone!==''&&!preg_match('/^[0-9۰-۹٠-٩+() .\\-]{5,30}$/u',$phone))fail('invalid_delivery_phone');
    return ['name'=>$name,'email'=>$email,'address'=>$address,'postal'=>$postal,'phone'=>$phone];
}
// Service and VIP fulfilment requires a verified-format buyer contact record.
// A guest checkout never pretends that the email address is account-verified.
/**
 * Normalise optional contact mobiles to E.164. Persian registration accepts
 * Iranian 09xxxxxxxxx national format as well as international +country format.
 * Do not infer country codes for other local-number formats.
 */
function normalizedRegistrationMobile(mixed $input): ?string {
    if ($input === null || $input === '') return null;
    if (!is_string($input)) fail('invalid_registration');
    $mobile=strtr(trim($input),[
        '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
        '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9'
    ]);
    $mobile=preg_replace('/[\s().-]+/','',$mobile);
    if (!is_string($mobile)) fail('invalid_registration');
    if ($mobile==='') return null;
    if (preg_match('/^09[0-9]{9}$/D',$mobile)) $mobile='+98'.substr($mobile,1);
    elseif (preg_match('/^0098[0-9]{10}$/D',$mobile)) $mobile='+'.substr($mobile,2);
    if (!preg_match('/^\\+[1-9][0-9]{7,14}$/D',$mobile)) fail('invalid_registration');
    return $mobile;
}
function normalizedServiceBuyer(mixed $input): array {
    if(!is_array($input))fail('customer_required');
    $name=trim((string)($input['name']??''));
    $email=emailNorm($input['email']??'');
    $phone=trim((string)($input['phone']??''));
    if(textLen($name)<2||textLen($name)>100)fail('invalid_customer_name');
    if(!validEmail($email))fail('invalid_customer_email');
    if($phone!==''&&!preg_match('/^[0-9۰-۹٠-٩+() .\\-]{5,30}$/u',$phone))fail('invalid_delivery_phone');
    return ['name'=>$name,'email'=>$email,'phone'=>$phone];
}
function token(int $bytes = 32): string { return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '='); }
function tokenHash(string $raw): string { return hash('sha256', $raw); }
function nowTs(): int { return time(); }
function passwordDigest(string $password): string {
    $pepper = (string)(cfg()['auth_pepper'] ?? '');
    if (strlen($pepper) < 32) throw new RuntimeException('pepper_missing');
    $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
    $hash = password_hash($password."\0".$pepper, $algo);
    if (!is_string($hash)) throw new RuntimeException('hash_failed');
    return $hash;
}
function passwordMatches(string $password, string $stored): bool {
    $pepper = (string)(cfg()['auth_pepper'] ?? '');
    return strlen($pepper) >= 32 && password_verify($password."\0".$pepper, $stored);
}
function authSchemaReady(): bool {
    static $ready = null;
    if ($ready !== null) return $ready;
    $pdo = db();
    if (!$pdo) return $ready = false;
    // The presence of a MySQL connection alone does not prove registration works.
    // Table names are a fixed internal allowlist, never request parameters.
    foreach (['customer_accounts','customer_auth_tokens','customer_auth_sessions','customer_auth_rate_limits'] as $table) {
        try { $pdo->query('SELECT 1 FROM '.$table.' LIMIT 1'); }
        catch (Throwable $e) { return $ready = false; }
    }
    return $ready = true;
}
function authReady(): bool {
    $c = cfg();
    // Existing users must remain able to sign in when SMTP is unavailable.
    return authSchemaReady() && strlen((string)$c['auth_pepper']) >= 32;
}
function registrationReady(): bool {
    return authReady() && mailReady();
}
function cookieSet(string $raw, int $age): void {
    setcookie(SESSION_COOKIE, $raw, [
        'expires' => time() + $age,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}
function cookieClear(): void {
    setcookie(SESSION_COOKIE, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}
function accountByEmail(PDO $pdo, string $email): ?array {
    $s=$pdo->prepare('SELECT * FROM customer_accounts WHERE email_normalized=? LIMIT 1');$s->execute([$email]);
    $r=$s->fetch(); return is_array($r)?$r:null;
}
function accountById(PDO $pdo, string $id): ?array {
    $s=$pdo->prepare('SELECT * FROM customer_accounts WHERE id=? LIMIT 1');$s->execute([$id]);
    $r=$s->fetch(); return is_array($r)?$r:null;
}
function issueToken(PDO $pdo, string $accountId, string $purpose): string {
    $raw=token();$digest=tokenHash($raw);$now=nowTs();
    $pdo->prepare('UPDATE customer_auth_tokens SET consumed_at=? WHERE account_id=? AND purpose=? AND consumed_at IS NULL')
        ->execute([$now,$accountId,$purpose]);
    $pdo->prepare('INSERT INTO customer_auth_tokens(token_hash,account_id,purpose,expires_at,created_at) VALUES(?,?,?,?,?)')
        ->execute([$digest,$accountId,$purpose,$now+TOKEN_TTL,$now]);
    return $raw;
}
function consumeToken(PDO $pdo, string $raw, string $purpose): ?string {
    if (strlen($raw)<30 || strlen($raw)>120) return null;
    $digest=tokenHash($raw);$now=nowTs();
    $pdo->beginTransaction();
    try {
        $s=$pdo->prepare('SELECT account_id FROM customer_auth_tokens WHERE token_hash=? AND purpose=? AND consumed_at IS NULL AND expires_at>? FOR UPDATE');
        $s->execute([$digest,$purpose,$now]);$row=$s->fetch();
        if (!$row) { $pdo->rollBack(); return null; }
        $pdo->prepare('UPDATE customer_auth_tokens SET consumed_at=? WHERE token_hash=? AND consumed_at IS NULL')->execute([$now,$digest]);
        $pdo->commit(); return (string)$row['account_id'];
    } catch(Throwable $e) { if($pdo->inTransaction())$pdo->rollBack(); return null; }
}
function sessionAccount(PDO $pdo): ?array {
    $raw=(string)($_COOKIE[SESSION_COOKIE]??''); if($raw==='')return null;
    $s=$pdo->prepare('SELECT account_id FROM customer_auth_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>? LIMIT 1');
    $s->execute([tokenHash($raw),nowTs()]);$row=$s->fetch();
    return $row?accountById($pdo,(string)$row['account_id']):null;
}
function uuidv4(): string {
    $d=random_bytes(16);$d[6]=chr((ord($d[6])&0x0f)|0x40);$d[8]=chr((ord($d[8])&0x3f)|0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s',str_split(bin2hex($d),4));
}
function validUuid(string $v): bool { return preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i',$v)===1; }
function clientIp(): string { return substr((string)($_SERVER['REMOTE_ADDR']??'unknown'),0,64); }
function rateAllowed(PDO $pdo,string $action,string $identity,int $max,int $window): bool {
    $bucket=hash('sha256',$action.'|'.$identity.'|'.clientIp());$now=nowTs();$reset=$now+$window;
    $pdo->beginTransaction();
    try{
        $s=$pdo->prepare('SELECT count,reset_at FROM customer_auth_rate_limits WHERE bucket=? FOR UPDATE');$s->execute([$bucket]);$row=$s->fetch();
        if(!$row){$pdo->prepare('INSERT INTO customer_auth_rate_limits(bucket,count,reset_at) VALUES(?,?,?)')->execute([$bucket,1,$reset]);$count=1;}
        elseif((int)$row['reset_at'] <= $now){$pdo->prepare('UPDATE customer_auth_rate_limits SET count=1,reset_at=? WHERE bucket=?')->execute([$reset,$bucket]);$count=1;}
        else{$count=(int)$row['count']+1;$pdo->prepare('UPDATE customer_auth_rate_limits SET count=? WHERE bucket=?')->execute([$count,$bucket]);}
        $pdo->commit();return $count<=$max;
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();return false;}
}
function localCatalog(): array {
    $base=dirname(__DIR__).'/assets/data/';
    $read=function(string $file)use($base){$raw=@file_get_contents($base.$file);$d=$raw?json_decode($raw,true):null;return is_array($d)?$d:[];};
    $books=$read('book-catalog.json');$collectibles=$read('collectible-catalog.json');$services=$read('service-catalog.json');$vip=$read('vip-catalog.json');
    $items=[];
    foreach(array_merge(($books['books']??[]),($collectibles['books']??[])) as $b){$c=$b['commerce']??[];if(($c['sellable']??false)===true&&($c['inventory_state']??'')==='IN_STOCK'&&($c['currency']??'')==='IRT'&&is_int($c['price']??null)&&$c['price']>0){$items['book:'.$b['id']]=['sku'=>'book:'.$b['id'],'title'=>(string)($b['title_fa']??$b['id']),'price'=>$c['price'],'kind'=>'book','single_copy'=>($c['single_copy']??false)===true,'max_quantity'=>(($c['single_copy']??false)===true?1:20),'charitable_proceeds_intended'=>(($c['charitable_proceeds_intended']??false)===true)];}}
    foreach(($services['services']??[]) as $s){if(($s['sellable']??false)===true&&is_int($s['price']??null)&&$s['price']>0){$items['service:'.$s['id']]=['sku'=>'service:'.$s['id'],'title'=>(string)($s['title_fa']??$s['id']),'price'=>$s['price'],'kind'=>'service'];}}
    foreach(($vip['services']??[]) as $v){if(($v['sellable']??false)===true&&($v['checkout_enabled']??false)===true&&is_int($v['price']??null)&&$v['price']>0){$items['vip:'.$v['id']]=['sku'=>'vip:'.$v['id'],'title'=>(string)($v['title_fa']??$v['id']),'price'=>$v['price'],'kind'=>'vip'];}}
    // Digital authors' titles are not physical books and must never use stock/shipping logic.
    $pdo=db();$digital=$pdo?jrPubDigitalOffer($pdo):null;
    if($digital!==null)$items[JR_PUB_SKU]=$digital;
    return $items;
}
function commerceReady(): bool {
    $c=cfg();
    return dbReady() && commerceSchemaReady() && strlen((string)($c['auth_pepper']??''))>=32 && $c['public_tls_confirmed']===true && $c['commerce_enabled']===true && $c['bitpay_api_key']!=='' &&
        in_array((string)$c['bitpay_amount_multiplier'],['1','10'],true) &&
        $c['order_email_fulfilment_confirmed']===true && stage9SchemaReady(db());
}
function gatewayPost(string $endpoint,array $fields): string {
    $c=cfg(); if($c['bitpay_api_key']==='')throw new RuntimeException('gateway_unconfigured');
    if(!function_exists('curl_init'))throw new RuntimeException('curl_unavailable');
    $fields['api']=$c['bitpay_api_key'];
    $ch=curl_init('https://bitpay.ir/payment/'.$endpoint);
    curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>http_build_query($fields),CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2]);
    $out=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
    if(!is_string($out)||$code<200||$code>=300)throw new RuntimeException('gateway_http');
    return trim($out);
}

// CLI / internal PHP inclusion only. HTTP clients cannot set PHP constants.
 // Enables an authenticated, one-time SMTP test without adding a public mail endpoint.
if (defined('BERTINA_MAIL_SMOKE_CONTEXT') && BERTINA_MAIL_SMOKE_CONTEXT === true) return;

define('BERTINA_API_BOOTSTRAPPED', true);
require_once __DIR__.'/operations.php';
require_once __DIR__.'/commerce-stage9.php';
require_once __DIR__.'/publishing.php';
require_once __DIR__.'/internal/jr-publishing-digital.php';
require_once __DIR__.'/service-intake.php';
require_once __DIR__.'/service-files.php';
require_once __DIR__.'/service-buyer-receipt.php';
require_once __DIR__.'/consultation-delivery.php';
require_once __DIR__.'/jrei-exam-commercial-catalogue.php';
require_once __DIR__.'/jrei-exam-candidate-snapshot.php';
require_once __DIR__.'/jrei-exam-published-item-delivery.php';
require_once __DIR__.'/jrei-exam-attempt-runtime.php';
$path=route();$verb=method();
if((($path==='/exams/attempt' && in_array($verb,['GET','POST'],true))||
    (in_array($path,['/exams/items','/exams/result'],true) && $verb==='GET'))){
    header('Cache-Control: private, no-store, max-age=0');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    $conf=cfg();
    if(($conf['jrei_exam_commercial_enabled']??false)!==true||
       ($conf['jrei_exam_runtime_enabled']??false)!==true||
       ($conf['jrei_exam_item_delivery_accepted']??false)!==true)
        fail('exam_runtime_not_released',503);
    $pdo=db();
    if(!$pdo||!jrExamAttemptRuntimeReady($pdo))
        fail('exam_runtime_schema_unavailable',503);
    // Defence in depth: even two accidentally enabled environment switches
    // cannot start a real examination until a separately reviewed, source
    // integrated prompt/diagram delivery bridge exists and accepts the host.
    // The bridge is intentionally not implemented by metadata-only pages.
    if(!function_exists('jrExamPublishedItemDeliveryReady')||
       !jrExamPublishedItemDeliveryReady($pdo))
        fail('exam_immutable_content_delivery_not_accepted',503);
    $account=sessionAccount($pdo);
    if(!is_array($account)||
       ($account['status']??null)!=='active'||
       empty($account['email_verified_at'])||
       !validUuid((string)($account['id']??'')))
        fail('unauthorized',401);
    $accountId=(string)$account['id'];
    if($verb==='GET'){
        if(!rateAllowed($pdo,$path==='/exams/items'?
              'exam_item_delivery':'exam_progress_read',$accountId,45,300))
            fail('rate_limited',429);
        try{
            $id=(string)($_GET['attemptId']??'');
            if($path==='/exams/items')
                respond(jrExamCandidatePublishedItems($pdo,$accountId,$id));
            if($path==='/exams/result')
                respond(jrExamCandidateResult($pdo,$accountId,$id));
            respond(jrExamAttemptProgress($pdo,$accountId,$id));
        }
        catch(InvalidArgumentException $e){fail('invalid_exam_reference',422);}
        catch(DomainException $e){fail('exam_progress_not_accessible',403);}
        catch(Throwable $e){fail('exam_progress_unavailable',503);}
    }
    // Mutating methods require an explicit same-origin browser XHR; do
    // not reuse older APIs that permit Origin to be absent. Browser-sent
    // payment callbacks cannot enter this route.
    if(($_SERVER['HTTP_ORIGIN']??null)!==SITE_ORIGIN||
       !in_array(($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin'),
            ['same-origin','none'],true)||
       ($_SERVER['HTTP_X_JR_EXAM_ACTION']??null)!=='v1')
        fail('exam_mutation_origin_forbidden',403);
    $body=jsonBody();
    $action=$body['action']??null;
    if(!in_array($action,['start','save','submit'],true))
        fail('invalid_exam_action',422);
    if(!rateAllowed($pdo,'exam_attempt_'.$action,$accountId,
            $action==='save'?120:15,300))
        fail('rate_limited',429);
    try{
        if($action==='start')respond(jrExamAttemptStart($pdo,$accountId,$body,time()));
        if($action==='save')respond(jrExamAttemptSave($pdo,$accountId,$body,time()));
        respond(jrExamAttemptSubmit($pdo,$accountId,$body,time()));
    }catch(InvalidArgumentException $e){fail('invalid_exam_mutation',422);}
    catch(DomainException $e){fail($e->getMessage(),409);}
    catch(Throwable $e){fail('exam_attempt_transaction_unavailable',503);}
}
if($path==='/exams/my' && $verb==='GET'){
    header('Cache-Control: private, no-store, max-age=0');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    $pdo=db();if(!$pdo)fail('candidate_exam_unavailable',503);
    $account=sessionAccount($pdo);
    if(!is_array($account)||!validUuid((string)($account['id']??'')))
        fail('unauthorized',401);
    if((cfg()['jrei_exam_commercial_enabled']??false)!==true)
        fail('candidate_exam_feature_disabled',503);
    try{respond(jrExamCandidateSnapshot($pdo,(string)$account['id']));}
    catch(Throwable $e){fail('candidate_exam_unavailable',503);}
}
if ($path==='/exams/catalog' && $verb==='GET') {
    header('Cache-Control: no-store, max-age=0');
    $pdo=db();
    if(!$pdo)fail('exam_catalogue_unavailable',503);
    try{
        $view=jrExamCommercialCatalogue($pdo,cfg());
        if(!$view['schemaReady'])fail('exam_catalogue_migration_required',503);
        if((cfg()['jrei_exam_commercial_enabled']??false)!==true)
            respond(['ok'=>true,'schema'=>'jr.jrei.exam-commercial-catalogue.v1',
              'enabled'=>false,'items'=>[],'checkoutEnabled'=>false,
              'availableForPurchase'=>false]);
        respond(['ok'=>true,'enabled'=>true]+$view);
    }catch(Throwable $e){fail('exam_catalogue_read_unavailable',503);}
}
if (str_starts_with($path, '/admin/operations')) operationsRoute($path, $verb);
// Minimal real signed job: one fixed arithmetic computation, no model tools.
if (in_array($path,['/jrei/v1/python-canary/poll',
                    '/jrei/v1/python-canary/complete'],true)) {
    require_once __DIR__.'/jrei-hybrid-worker.php';
    require_once __DIR__.'/jrei-python-canary-bridge.php';
    header('Cache-Control: no-store, private, max-age=0');
    if ($verb!=='POST'||!jrHybridHttps($_SERVER))
        fail('python_canary_signed_https_required',403);
    $pc=cfg();
    if (($pc['jrei_python_canary_enabled']??false)!==true)
        fail('python_canary_disabled',403);
    $pdo=db();
    if (!($pdo instanceof PDO) || !jrHybridSchemaReady($pdo) ||
        !jrPythonCanaryReady($pdo))
        fail('python_canary_schema_unavailable',503);
    $raw=jrHybridReadBody($_SERVER);
    if ($raw===null) fail('python_canary_invalid_request',422);
    try {
        $signed=jrHybridAuthenticate($pdo,'POST',$path,$raw,$_SERVER,time());
        if(!is_array($signed) ||
           !in_array($signed['provider_type']??null,
             ['LOCAL_WINDOWS_WORKER','LOCAL_SECONDARY_WORKER'],true))
            fail('python_canary_signed_node_denied',403);
        if(!rateAllowed($pdo,'jrei_python_canary_signed',
             (string)$signed['node_id'],100,300))
            fail('python_canary_rate_limit',429);
        $body=jrHybridDecode($raw);
        if($body===null)fail('python_canary_invalid_json',422);
        respond($path==='/jrei/v1/python-canary/poll'
            ?jrPythonCanaryPoll($pdo,(string)$signed['node_id'],$body,time())
            :jrPythonCanaryComplete($pdo,(string)$signed['node_id'],$body,time()));
    } catch(InvalidArgumentException $e){fail('python_canary_bad_contract',422);}
      catch(DomainException $e){fail('python_canary_lease_denied',409);}
      catch(Throwable $e){fail('python_canary_temporarily_unavailable',503);}
}
// Signed Python process observation: authenticated EXISTING Ed25519 node,
 // original durable replay guard, HTTPS only, no public 8091 connectivity.
if ($path==='/jrei/v1/python-node/heartbeat') {
    require_once __DIR__.'/jrei-hybrid-worker.php';
    require_once __DIR__.'/jrei-python-node-health.php';
    header('Cache-Control: no-store, private, max-age=0');
    if ($verb!=='POST') fail('python_node_method_invalid',405);
    if (!jrHybridHttps($_SERVER)) fail('python_node_tls_required',403);
    $pc=cfg();
    if (($pc['jrei_python_node_heartbeat_enabled']??false)!==true)
        fail('python_node_not_enabled',503);
    $pdo=db();
    if (!($pdo instanceof PDO) || !jrHybridSchemaReady($pdo) ||
        !jrPythonNodeSchemaReady($pdo))
        fail('python_node_schema_unavailable',503);
    $raw=jrHybridReadBody($_SERVER);
    if ($raw===null) fail('python_node_invalid_request',422);
    try {
        $signed=jrHybridAuthenticate($pdo,'POST',$path,$raw,$_SERVER,time());
        if (!is_array($signed) ||
            !in_array($signed['provider_type']??null,
                ['LOCAL_WINDOWS_WORKER','LOCAL_SECONDARY_WORKER'],true))
            fail('python_node_auth_denied',403);
        if (!rateAllowed($pdo,'jrei_python_node_signed',
                (string)$signed['node_id'],90,300))
            fail('python_node_rate_limit',429);
        $body=jrPythonNodeValidate(jrHybridDecode($raw),time());
        if ($body===null) fail('python_node_bad_contract',422);
        jrPythonNodeStore($pdo,(string)$signed['node_id'],$body,time());
        respond(['ok'=>true,'schema'=>'jr.jrei.python-node-receipt.v1',
            'accepted'=>true,'productionReady'=>false,
            'pythonSkillExecutionEnabled'=>false,
            'newsPublicationEnabled'=>false]);
    } catch (Throwable $e) {
        fail('python_node_report_unavailable',503);
    }
}
// Private SUPER_ADMIN test worker is deliberately distinct from public
// chat. No model-quality claim, public release or inbound Windows port.
if(in_array($path,['/jrei/v1/owner-pilot/poll',
  '/jrei/v1/owner-pilot/complete','/jrei/v1/owner-pilot/reject'],true)){
    require_once __DIR__.'/jrei-owner-private-pilot.php';
    header('Cache-Control: no-store, private, max-age=0');
    if($verb!=='POST'||!jrHybridHttps($_SERVER))
        fail('pilot_signed_https_required',403);
    $pc=cfg();$pp=db();
    if(!($pp instanceof PDO)||!jrOwnerPilotReady($pp,$pc))
        fail('pilot_private_queue_not_ready',503);
    $raw=jrHybridReadBody($_SERVER);
    if($raw===null)fail('pilot_request_invalid',422);
    try{
        $signed=jrHybridAuthenticate($pp,'POST',$path,$raw,$_SERVER,time());
        if(!is_array($signed))fail('pilot_node_auth_denied',403);
        if(!rateAllowed($pp,'jrei_owner_pilot_signed',
           (string)$signed['node_id'],90,300))
            fail('pilot_rate_limit',429);
        $body=jrHybridDecode($raw);
        if(!is_array($body))fail('pilot_request_invalid',422);
        $node=(string)$signed['node_id'];
        if(!jrOwnerPilotModel($pp,$node,$body))
            fail('pilot_unapproved_node_or_model',403);
        if($path==='/jrei/v1/owner-pilot/poll'){
            $answer=jrOwnerPilotWorkerPoll($pp,$pc,$node,$body);
            // The ALREADY signed/private Windows Qwen worker has just
            // completed local health before this poll. Advertise only
            // short-lived, independently authenticated bridge freshness.
            try {
                require_once __DIR__.'/jrei-owner-pilot-public-bridge.php';
                jrPilotBridgeRecordSignedPoll($pp,$pc,$node,$body);
            }catch(Throwable $e){
                // A public readiness projection must never break the
                // successful owner-private conversation pipeline.
                error_log('JREI owner pilot bridge marker unavailable');
            }
            respond($answer);
        }
        respond(jrOwnerPilotWorkerFinish($pp,$pc,$node,$body,
          $path==='/jrei/v1/owner-pilot/reject'));
    }catch(InvalidArgumentException $e){fail('pilot_request_invalid',422);}
     catch(DomainException $e){fail('pilot_not_ready_or_revoked',409);}
     catch(Throwable $e){fail('pilot_temporary_error',503);}
}
// Independent first-party Windows generative worker: no public machine port.
if(in_array($path,['/jrei/v1/local-chat/poll','/jrei/v1/local-chat/complete',
   '/jrei/v1/local-chat/reject'],true)){
    require_once __DIR__.'/jrei-local-chat.php';
    header('Cache-Control: private, no-store, max-age=0');
    if($verb!=='POST')fail('local_worker_method_invalid',405);
    if(!jrHybridHttps($_SERVER))fail('local_worker_tls_required',403);
    $lc=cfg();$lp=db();
    // Signed model identity alone never overrides the independent public
    // release switch. A withdrawn owner acceptance is an explicit terminal
    // authorization failure, not a temporary inference outage.
    if(($lc['jrei_local_chat_enabled']??false)!==true||
       ($lc['jrei_hybrid_enabled']??false)!==true||
       ($lc['jrei_local_public_release_accepted']??false)!==true)
        fail('local_worker_auth_denied',403);
    if(!($lp instanceof PDO)||!jrLocalChatSchemaReady($lp)||
       jrLocalChatKey($lc)===null||
       !jrLocalChatRetentionReady($lp,$lc))
        fail('local_worker_not_accepted',503);
    $raw=jrHybridReadBody($_SERVER);
    if($raw===null)fail('local_worker_bad_request',422);
    try{
        $node=jrHybridAuthenticate($lp,'POST',$path,$raw,$_SERVER,time());
        if(!is_array($node))fail('local_worker_auth_denied',403);
        if(!rateAllowed($lp,'jrei_local_worker',$node['node_id'],180,300))
            fail('local_worker_rate_limited',429);
        $body=jrHybridDecode($raw);
        if($body===null)fail('local_worker_bad_request',422);
        $nodeId=(string)$node['node_id'];
        if($path==='/jrei/v1/local-chat/poll')
            respond(jrLocalChatWorkerPoll($lp,$lc,$nodeId,$body));
        if(!jrLocalChatNodeApproved($lp,$lc,$nodeId,
           (string)($body['modelId']??''),(string)($body['modelVersion']??''),
           (string)($body['modelSha256']??'')))
            fail('local_chat_model_approval_revoked',403);
        if($path==='/jrei/v1/local-chat/reject')
            respond(jrLocalChatWorkerReject($lp,$lc,$nodeId,$body));
        respond(jrLocalChatWorkerComplete($lp,$lc,$nodeId,$body));
    }catch(InvalidArgumentException $e){fail('local_worker_bad_request',422);}
     catch(DomainException $e){
       // A revoked owner/model grant is terminal for the Windows client.
       // Distinguish it from an expired lease or transient queue conflict:
       // jrei-worker.mjs intentionally halts on HTTP 403, but retries 409.
       // Do not send private authorization details in the public response.
       if(in_array($e->getMessage(),[
         'local_chat_model_not_approved',
         'local_chat_model_revoked_during_poll',
         'local_chat_model_authorization_revoked',
         'local_chat_node_disabled_during_poll'
       ],true))fail('local_worker_auth_denied',403);
       fail('local_worker_not_ready_or_expired',409);
     }
     catch(Throwable $e){fail('local_worker_temporary_error',503);}
}
if (str_starts_with($path,'/jrei/v1/worker/')) {
    require_once __DIR__.'/jrei-hybrid-worker.php';
    jrHybridWorkerRoute($path,$verb);
}
// JR Future Publishing: approved author-only read view. No checkout or payout writes.
if ($path==='/publishing/download') jrPubDownloadRoute();
if ($path==='/publishing/offer' && $verb==='GET') {
    header('Cache-Control: no-store, private, max-age=0');
    $pdo=db();$offer=$pdo&&commerceReady()?jrPubDigitalOffer($pdo):null;
    respond(['ok'=>true,'available'=>$offer!==null,
      'sku'=>JR_PUB_SKU,'priceToman'=>1000000,'delivery'=>'private_email_two_pdfs',
      'checkoutEnabled'=>$offer!==null]);
}
if (str_starts_with($path, '/publishing/')) jrPublishingAuthorRoute($path,$verb);
// Credential-free public indicative rate only; never authorize an order or payment from this tick.
if ($path==='/rates/usdt-irt') { require_once __DIR__.'/ramzinex-public-usdt-rate.php'; jrPublicUsdtRateRoute($verb); }
// Exact source-stage HMAC API bridge: no per-article browser publishing,
 // no original CMS writes, and no receiver activation without private policy.
if($path==='/jrei/v1/news-intake'||$path==='/jrei/v1/news-receipt'){
    require_once __DIR__.'/jrei-news-signed-gateway.php';
    jrNewsSignedGatewayRoute($path,$verb);
}
// Public JREI News search: existing published-only index; disabled until both private release gates.
if ($path==='/news/v1/search') {
    require_once __DIR__.'/news-public-search.php';
    jrNewsPublicSearchRoute($verb);
}
if ($path==='/news/v1/calendar') {
    require_once __DIR__.'/news-public-calendar.php';
    jrNewsOriginalPublicCalendarRoute($verb);
}
if ($path==='/news/v1/rss' || $path==='/news/v1/google-news') {
    require_once __DIR__.'/news-public-feeds.php';
    jrNewsPublicFeedRoute(
        $path==='/news/v1/rss'?'rss':'google-news',$verb);
}
// First-party newsletter preferences, verified account only, independent of transactional mail.
if(str_starts_with($path, '/newsletter/')) { require_once __DIR__.'/newsletter-preferences.php'; jrNewsletterRoute($path,$verb); }
// Owner-gated community pilot: schema and privacy approval required.
if (str_starts_with($path, '/community/')) { require_once __DIR__.'/community.php'; communityRoute($path,$verb); }
if (str_starts_with($path, '/journal/')) {
    require_once __DIR__.'/jhela-intake.php';
    jhelaIntakeRoute($path, $verb);
}


// No account, order identity, payment reference or owner window ID is exposed.
// Fail closed if the additive capacity ledger is not yet installed/verified.
if ($path==='/commerce/consultation-week' && $verb==='GET') {
    $pdo=db();
    if(!$pdo)fail('consultation_week_unavailable',503);
    try {
        respond(operationsConsultationWeeklySnapshot($pdo,time()));
    } catch(Throwable $e) {
        error_log('Consultation weekly read unavailable: '.get_class($e));
        fail('consultation_week_unavailable',503);
    }
}

if ($path==='/health' && $verb==='GET') {
    $hc=cfg(); respond(['ok'=>true,'service'=>'bertina-api','hosting'=>'bertina','database'=>dbReady(),'mailTransport'=>mailReady()?(smtpConfigured($hc)?'bertina-smtp':'bertina-local'):'not-configured','mailConfigEnabled'=>$hc['mail_enabled']===true,'smtpConfigured'=>smtpConfigured($hc),'smtpProviderSettingsMatch'=>smtpProviderSettingsMatch($hc),'smtpEffectiveProviderSettingsMatch'=>smtpProviderSettingsMatch(smtpResolvedConfig($hc)),'mailFunctionAvailable'=>function_exists('mail'),'mailFromValid'=>filter_var((string)$hc['mail_from'], FILTER_VALIDATE_EMAIL)!==false,'auth'=>authReady(),'registration'=>registrationReady(),'commerce'=>commerceReady()]);
}

if ($path==='/auth/health' && $verb==='GET') {
    respond(['ok'=>true,'service'=>'auth','ready'=>authReady(),'registrationReady'=>registrationReady(),'database'=>dbReady(),'schemaReady'=>authSchemaReady(),'email'=>mailReady(),'smtpProviderSettingsMatch'=>smtpProviderSettingsMatch(cfg()),'smtpEffectiveProviderSettingsMatch'=>smtpProviderSettingsMatch(smtpResolvedConfig(cfg())),'passwordKdf'=>strlen((string)(cfg()['auth_pepper']??''))>=32]);
}
if (str_starts_with($path,'/auth/')) {
    if(!authReady())fail('auth_unavailable',503);
    $pdo=db(); if(!$pdo)fail('auth_unavailable',503);

    if($path==='/auth/register'&&$verb==='POST'){
        if(!registrationReady())fail('verification_email_unavailable',503);
        requirePostOrigin();$b=jsonBody();$email=emailNorm($b['email']??'');$password=$b['password']??null;$mobile=normalizedRegistrationMobile($b['mobile']??null);$locale=($b['locale']??'')==='en'?'en':'fa';
        if(!validEmail($email)||!validPassword($password))fail('invalid_registration');
        if(!rateAllowed($pdo,'register',$email,5,3600))fail('rate_limited',429);
        $a=accountByEmail($pdo,$email);
        if(!$a){
            $id=uuidv4();$now=nowTs();$hash=passwordDigest($password);
            $pdo->prepare('INSERT INTO customer_accounts(id,email_normalized,password_hash,mobile_e164,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
                ->execute([$id,$email,$hash,$mobile,'pending',$now,$now]);
            $a=accountById($pdo,$id);
        }
        if($a&&empty($a['email_verified_at'])&&($a['status']??'')!=='disabled'){
            $raw=issueToken($pdo,(string)$a['id'],'verify_email');
            $url=SITE_ORIGIN.($locale==='en'?'/en/login/':'/fa/login/').'?verify='.rawurlencode($raw);
            if(!sendLocalMail($email,$locale==='en'?'Verify your account':'تأیید حساب کاربری',"Verification link / لینک تأیید:\n".$url."\n\nThis link expires in 15 minutes."))fail('verification_email_failed',502);
        }
        respond(['ok'=>true,'message'=>'verification_if_applicable_sent'],202);
    }
    // A pending customer can request another verification email without
    // re-registering or submitting their password. Uniform response prevents
    // account enumeration; the existing rate-limit table controls abuse.
    if($path==='/auth/retry-verification'&&$verb==='POST'){
        if(!registrationReady())fail('verification_email_unavailable',503);
        requirePostOrigin();$b=jsonBody();$email=emailNorm($b['email']??'');
        if(validEmail($email) && rateAllowed($pdo,'retry-verification',$email,3,3600)){
            $a=accountByEmail($pdo,$email);
            if($a && empty($a['email_verified_at']) && ($a['status']??'')==='pending'){
                $locale=($b['locale']??'')==='en'?'en':'fa';
                $raw=issueToken($pdo,(string)$a['id'],'verify_email');
                $url=SITE_ORIGIN.($locale==='en'?'/en/login/':'/fa/login/').'?verify='.rawurlencode($raw);
                sendLocalMail($email,$locale==='en'?'Verify your account':'تأیید حساب کاربری',"Verification link / لینک تأیید:\n".$url."\n\nThis link expires in 15 minutes.");
            }
        }
        respond(['ok'=>true,'message'=>'verification_if_pending_sent'],202);
    }
    if($path==='/auth/verify-email'&&$verb==='POST'){
        requirePostOrigin();$b=jsonBody();$id=consumeToken($pdo,(string)($b['token']??''),'verify_email');if(!$id)fail('invalid_or_expired_token');
        $now=nowTs();$pdo->prepare("UPDATE customer_accounts SET email_verified_at=COALESCE(email_verified_at,?),status='active',updated_at=? WHERE id=? AND status!='disabled'")->execute([$now,$now,$id]);
        respond(['ok'=>true,'verified'=>true]);
    }
    if($path==='/auth/login'&&$verb==='POST'){
        requirePostOrigin();$b=jsonBody();$email=emailNorm($b['email']??'');$password=(string)($b['password']??'');
        if(!validEmail($email)||!rateAllowed($pdo,'login',$email,10,900))fail('invalid_credentials',401);
        $a=accountByEmail($pdo,$email);$valid=$a&&($a['status']??'')==='active'&&!empty($a['email_verified_at'])&&passwordMatches($password,(string)$a['password_hash']);
        if(!$valid)fail('invalid_credentials',401);
        $raw=token();$now=nowTs();$pdo->prepare('INSERT INTO customer_auth_sessions(token_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)')->execute([tokenHash($raw),$a['id'],$now+SESSION_TTL,$now]);
        cookieSet($raw,SESSION_TTL);respond(['ok'=>true,'authenticated'=>true]);
    }
    if($path==='/auth/forgot-password'&&$verb==='POST'){
        requirePostOrigin();$b=jsonBody();$email=emailNorm($b['email']??'');$locale=($b['locale']??'')==='en'?'en':'fa';
        if(validEmail($email)&&rateAllowed($pdo,'recovery',$email,5,3600)){
            $a=accountByEmail($pdo,$email);
            if($a&&($a['status']??'')==='active'&&!empty($a['email_verified_at'])){
                $raw=issueToken($pdo,(string)$a['id'],'reset_password');$url=SITE_ORIGIN.($locale==='en'?'/en/recover/':'/fa/bazyabi-hesab/').'?token='.rawurlencode($raw);
                sendLocalMail($email,$locale==='en'?'Reset your password':'بازیابی رمز عبور',"Reset link / لینک بازیابی:\n".$url."\n\nThis link expires in 15 minutes.");
            }
        }
        respond(['ok'=>true,'message'=>'recovery_if_account_exists_sent'],202);
    }
    if($path==='/auth/reset-password'&&$verb==='POST'){
        requirePostOrigin();$b=jsonBody();if(!validPassword($b['password']??null))fail('invalid_password');
        $id=consumeToken($pdo,(string)($b['token']??''),'reset_password');if(!$id)fail('invalid_or_expired_token');
        $now=nowTs();$pdo->prepare('UPDATE customer_accounts SET password_hash=?,updated_at=? WHERE id=?')->execute([passwordDigest((string)$b['password']),$now,$id]);
        $pdo->prepare('UPDATE customer_auth_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL')->execute([$now,$id]);cookieClear();respond(['ok'=>true,'passwordReset'=>true]);
    }
    if($path==='/auth/me'&&$verb==='GET'){
        $a=sessionAccount($pdo);if(!$a)fail('unauthorized',401);respond(['ok'=>true,'user'=>['id'=>$a['id'],'email'=>$a['email_normalized'],'mobile'=>$a['mobile_e164']??null,'emailVerified'=>true]]);
    }
    if($path==='/auth/logout'&&$verb==='POST'){
        requirePostOrigin();$raw=(string)($_COOKIE[SESSION_COOKIE]??'');if($raw!=='')$pdo->prepare('UPDATE customer_auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL')->execute([nowTs(),tokenHash($raw)]);
        cookieClear();respond(['ok'=>true]);
    }
    fail('not_found',404);
}

// Private post-payment academic service intake. Unlike a lead form, only an
// active verified account that owns the paid order may record this brief.
// The module encrypts content with AEAD and enforces optimistic concurrency.
if($path==='/commerce/service-intake'&&in_array($verb,['GET','POST'],true)){
    header('Cache-Control: no-store, private, max-age=0');header('Vary: Cookie');
    $pdo=db();if(!$pdo||!commerceSchemaReady()||!stage9SchemaReady($pdo)
        ||!jrServiceIntakeSchemaReady($pdo))fail('service_intake_unavailable',503);
    $account=sessionAccount($pdo);
    if(!$account||($account['status']??'')!=='active'||empty($account['email_verified_at']))
        fail('unauthorized',401);
    $email=emailNorm($account['email_normalized']??'');
    if(!validEmail($email))fail('unauthorized',401);
    if($verb==='GET'){
        $order=$_GET['order']??null;$sku=$_GET['sku']??null;
        if(!is_string($order)||!is_string($sku))fail('invalid_service_reference',400);
        try{
            jrServiceIntakeReference($order,$sku);
            if(!jrServiceIntakeOwned($pdo,$order,$sku,$email))fail('order_not_found',404);
            if(!rateAllowed($pdo,'service_intake_private_read',(string)$account['id'],30,300))
                fail('rate_limited',429);
            $data=jrServiceIntakeRead($pdo,$order,$sku);
            respond(['ok'=>true,'schema'=>'private-service-intake-v1']+$data);
        }catch(InvalidArgumentException $e){fail('invalid_service_reference',400);}
        catch(Throwable $e){fail('service_intake_read_unavailable',503);}
    }
    // Browser-authorised same-origin application/json only; absent origin
    // is rejected for private mutations, independently of cookie SameSite.
    if(($_SERVER['HTTP_ORIGIN']??'')!==SITE_ORIGIN
       ||!in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',['same-origin','none'],true))
        fail('origin_forbidden',403);
    if(!rateAllowed($pdo,'service_intake_private_write',(string)$account['id'],5,3600))
        fail('rate_limited',429);
    $input=jsonBody();
    try{
        $saved=jrServiceIntakeSave($pdo,$email,(string)$account['id'],$input);
        respond(['ok'=>true,'schema'=>'private-service-intake-v1']+$saved);
    }catch(InvalidArgumentException $e){fail('invalid_service_intake',400);}
    catch(DomainException $e){fail('intake_payment_owner_or_revision_conflict',409);}
    catch(Throwable $e){
        error_log('Service intake unavailable: '.get_class($e));
        fail('service_intake_write_unavailable',503);
    }
}

// Encrypted academic-service files: same verified email and matched payment claim.
// A public URL, a guest email and a gateway return cannot authorize access.
if(in_array($path,['/commerce/service-files','/commerce/service-file'],true)){
    header('Cache-Control: no-store, private, max-age=0');
    header('Vary: Cookie');header('X-Content-Type-Options: nosniff');
    $pdo=db();
    if(!$pdo||!jrServiceFilesReady($pdo))fail('private_service_files_unavailable',503);
    $account=sessionAccount($pdo);
    if(!$account||($account['status']??'')!=='active'||empty($account['email_verified_at']))
        fail('unauthorized',401);
    $email=emailNorm($account['email_normalized']??'');
    if(!validEmail($email))fail('unauthorized',401);
    if($path==='/commerce/service-file'&&$verb==='GET'){
        $id=$_GET['id']??null;
        if(!is_string($id)||!validUuid($id))fail('invalid_file_reference',400);
        if(!rateAllowed($pdo,'service_file_private_download',(string)$account['id'],25,300))
            fail('rate_limited',429);
        try{jrServiceFileDownload($pdo,$id,$email);}
        catch(DomainException $e){fail('private_file_not_found',404);}
        catch(Throwable $e){error_log('Private service file download: '.get_class($e));fail('private_file_unavailable',503);}
    }
    if($path==='/commerce/service-files'&&$verb==='GET'){
        $order=$_GET['order']??null;$sku=$_GET['sku']??null;
        if(!is_string($order)||!is_string($sku))fail('invalid_file_reference',400);
        if(!rateAllowed($pdo,'service_file_private_list',(string)$account['id'],30,300))
            fail('rate_limited',429);
        try{respond(['ok'=>true,'schema'=>'private-service-files-v1']+
            jrServiceFilesList($pdo,$order,$sku,$email));}
        catch(InvalidArgumentException $e){fail('invalid_file_reference',400);}
        catch(DomainException $e){fail('private_case_not_found',404);}
        catch(Throwable $e){fail('private_files_unavailable',503);}
    }
    if($path==='/commerce/service-files'&&$verb==='POST'){
        if(($_SERVER['HTTP_ORIGIN']??'')!==SITE_ORIGIN||
           !in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',['same-origin','none'],true))
            fail('origin_forbidden',403);
        if(!str_starts_with(strtolower((string)($_SERVER['CONTENT_TYPE']??'')),'multipart/form-data;'))
            fail('multipart_form_required',415);
        if(!rateAllowed($pdo,'service_file_private_upload',(string)$account['id'],5,3600))
            fail('rate_limited',429);
        if(array_keys($_POST)!==['orderId','sku','privacyAcknowledged','isMinor','guardianAcknowledged']
           ||array_keys($_FILES)!==['document'])
            fail('invalid_service_file_form',400);
        try{
            $consent=['privacyAcknowledged'=>$_POST['privacyAcknowledged'],
                'isMinor'=>$_POST['isMinor'],'guardianAcknowledged'=>$_POST['guardianAcknowledged']];
            $saved=jrServiceFileUpload($pdo,(string)$_POST['orderId'],(string)$_POST['sku'],
                (string)$account['id'],$email,'client_source',(array)$_FILES['document'],$consent);
            respond(['ok'=>true,'schema'=>'private-service-files-v1','file'=>$saved],201);
        }catch(InvalidArgumentException $e){fail('invalid_service_file',422);}
        catch(DomainException $e){fail('private_case_or_file_limit_conflict',409);}
        catch(Throwable $e){
            error_log('Private service upload: '.get_class($e));
            fail('private_file_storage_unavailable',503);
        }
    }
    fail('method_not_allowed',405);
}

// Explicit client acknowledgement of an already owner-attested exact output.
// This never changes commerce_orders, service delivery or bank settlement.
if($path==='/commerce/service-receipt'&&$verb==='POST'){
    header('Cache-Control: no-store, private, max-age=0');
    header('Vary: Cookie');
    if(($_SERVER['HTTP_ORIGIN']??'')!==SITE_ORIGIN
       ||!in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',['same-origin','none'],true))
        fail('origin_forbidden',403);
    $pdo=db();if(!$pdo||!stage9SchemaReady($pdo)
       ||!jrServiceBuyerReceiptSchemaReady($pdo))fail('buyer_receipt_unavailable',503);
    $account=sessionAccount($pdo);
    if(!$account||($account['status']??'')!=='active'||empty($account['email_verified_at']))
        fail('unauthorized',401);
    $email=emailNorm($account['email_normalized']??'');
    if(!validEmail($email))fail('unauthorized',401);
    if(!rateAllowed($pdo,'service_buyer_acknowledge',(string)$account['id'],10,3600))
        fail('rate_limited',429);
    try{
        $ack=jrServiceBuyerReceiptConfirm($pdo,(string)$account['id'],$email,jsonBody());
        respond(['ok'=>true,'schema'=>'customer-service-receipt-ack-v1','acknowledgement'=>$ack]);
    }catch(InvalidArgumentException $e){fail('invalid_receipt_acknowledgement',422);}
    catch(DomainException $e){fail('confirmed_receipt_requires_delivered_exact_file',409);}
    catch(Throwable $e){
        error_log('Buyer self-receipt acknowledgement: '.get_class($e));
        fail('buyer_receipt_write_unavailable',503);
    }
}

// Verified-account order history. A guest email or a public order UUID never grants access.
// The result deliberately excludes addresses, contact numbers and gateway identifiers.
if($path==='/commerce/history'&&$verb==='GET'){
    $pdo=db();
    if(!$pdo||!commerceSchemaReady())fail('history_unavailable',503);
    $account=sessionAccount($pdo);
    if(!$account||($account['status']??'')!=='active'||empty($account['email_verified_at']))fail('unauthorized',401);
    $email=emailNorm($account['email_normalized']??'');
    if(!validEmail($email))fail('unauthorized',401);
    $query=$pdo->prepare('SELECT id,state,amount_toman,currency,items_json,created_at,paid_at,provider_id_get,provider_trans_id,provider_amount FROM commerce_orders WHERE customer_email=? ORDER BY created_at DESC,id DESC LIMIT 50');
    $query->execute([$email]);
    $historyRows=$query->fetchAll(PDO::FETCH_ASSOC);
    // A paid state and a provider transaction identifier are NOT independently
    // verified payment evidence. Match the provider claim ledger, bounded to
    // this already authenticated account's last 50 order IDs. An unavailable
    // Stage09 schema leaves paymentVerified=false; history remains readable.
    $claims=[];
    if($historyRows && stage9SchemaReady($pdo)){
        try{
            $ids=array_values(array_filter(array_column($historyRows,'id'),
                static fn($id)=>is_string($id)&&validUuid($id)));
            if($ids){
                $marks=implode(',',array_fill(0,count($ids),'?'));
                $claimQuery=$pdo->prepare("SELECT order_id,transaction_id,verified_amount
                    FROM commerce_payment_claims
                    WHERE provider='bitpay' AND order_id IN (".$marks.")");
                $claimQuery->execute($ids);
                foreach($claimQuery->fetchAll(PDO::FETCH_ASSOC) as $claim){
                    $claims[(string)$claim['order_id']]=$claim;
                }
            }
        }catch(Throwable $e){
            // Fail closed rather than treating a stale paid flag as provider proof.
            $claims=[];
        }
    }
    $orders=[];
    foreach($historyRows as $row){
        $items=json_decode((string)($row['items_json']??''),true);
        if(!is_array($items))$items=[];
        $safeItems=[];
        foreach(array_slice($items,0,20) as $item){
            if(!is_array($item))continue;
            $quantity=$item['quantity']??null;
            $subtotal=$item['subtotal']??null;
            if(!is_int($quantity)||$quantity<1||$quantity>20||!is_int($subtotal)||$subtotal<0)continue;
            $safeItems[]=[
                'sku'=>substr((string)($item['sku']??''),0,80),
                'title'=>(string)($item['title']??''),
                'quantity'=>$quantity,
                'subtotalToman'=>$subtotal
            ];
        }
        $verified=($row['state']??'')==='paid'
            &&($row['currency']??'')==='IRT'
            &&!empty($row['paid_at'])
            &&!empty($row['provider_id_get'])
            &&!empty($row['provider_trans_id'])
            &&isset($claims[(string)$row['id']])
            &&hash_equals((string)$row['provider_trans_id'],
                (string)$claims[(string)$row['id']]['transaction_id'])
            &&(string)$row['provider_amount']===
                (string)$claims[(string)$row['id']]['verified_amount']
            &&count($safeItems)===count($items) &&count($safeItems)>0
            &&array_sum(array_column($safeItems,'subtotalToman'))===(int)$row['amount_toman'];
        $orders[]=[
            'id'=>(string)$row['id'],
            'state'=>(string)$row['state'],
            'paymentVerified'=>$verified,
            'amountToman'=>(int)$row['amount_toman'],
            'currency'=>(string)$row['currency'],
            'createdAt'=>(string)$row['created_at'],
            'paidAt'=>$verified?(string)$row['paid_at']:null,
            'items'=>$safeItems,
            'fulfilmentStatus'=>'not_verified'
        ];
    }
    respond(['ok'=>true,'orders'=>$orders,'limit'=>50]);
}

// Order-owned private fulfilment lookup. Never trust a public order UUID by itself.
if($path==='/commerce/fulfilment'&&$verb==='GET'){
    $pdo=db();if(!$pdo||!commerceSchemaReady()||!stage9SchemaReady($pdo))fail('fulfilment_unavailable',503);
    $account=sessionAccount($pdo);
    if(!$account||($account['status']??'')!=='active'||empty($account['email_verified_at']))fail('unauthorized',401);
    $orderId=(string)($_GET['order']??'');if(!validUuid($orderId))fail('invalid_order');
    $email=emailNorm($account['email_normalized']??'');if(!validEmail($email))fail('unauthorized',401);
    $q=$pdo->prepare('SELECT state,paid_at,provider_id_get,provider_trans_id,provider_amount FROM commerce_orders WHERE id=? AND customer_email=? LIMIT 1');
    $q->execute([$orderId,$email]);$row=$q->fetch();if(!$row)fail('order_not_found',404);
    $hasPaidRecord=($row['state']??'')==='paid' && !empty($row['paid_at'])
        &&!empty($row['provider_id_get'])&&!empty($row['provider_trans_id']);
    if(!$hasPaidRecord)respond(['ok'=>true,'paymentRecord'=>'not_confirmed','serviceCases'=>[],'parcel'=>null]);
    // An unbackfilled historical payment or a mismatch is not a fulfilment entitlement.
    $claim=$pdo->prepare("SELECT transaction_id,verified_amount FROM commerce_payment_claims WHERE provider='bitpay' AND order_id=? LIMIT 1");
    $claim->execute([$orderId]);$evidence=$claim->fetch();
    if(!$evidence || (string)$evidence['transaction_id']!==(string)$row['provider_trans_id']
        || (string)$evidence['verified_amount']!==(string)$row['provider_amount'])
        respond(['ok'=>true,'paymentRecord'=>'requires_reconciliation','serviceCases'=>[],'parcel'=>null]);
    $prefsReady=commerceConsultationPreferenceSchemaReady($pdo);
    $voiceReady=$prefsReady&&commerceConsultationVoiceSchemaReady($pdo);
    $cases=$pdo->prepare($prefsReady
        ? 'SELECT sc.sku,sc.status,sc.booking_start,sc.booking_end,sc.delivered_at,
            pr.delivery_mode,pr.meeting_city
            FROM commerce_service_cases sc
            LEFT JOIN commerce_consultation_preferences pr
              ON pr.order_id=sc.order_id AND pr.sku=sc.sku
            WHERE sc.order_id=? ORDER BY sc.sku'
        : 'SELECT sku,status,booking_start,booking_end,delivered_at
            FROM commerce_service_cases WHERE order_id=? ORDER BY sku');
    $cases->execute([$orderId]);$safeCases=[];
    $allowedCase=['awaiting_contact','scheduling','booked','in_progress','delivered','cancelled'];
    foreach($cases->fetchAll() as $case){
        if(!in_array((string)$case['status'],$allowedCase,true))continue;
        $safeCases[]=['sku'=>(string)$case['sku'],'status'=>(string)$case['status'],
            'bookingStart'=>$case['booking_start']??null,'bookingEnd'=>$case['booking_end']??null,
            'deliveredAt'=>$case['delivered_at']??null,
            'deliveryMode'=>$case['delivery_mode']??null,
            'meetingCity'=>$case['meeting_city']??null,
            'customerChoiceEnabled'=>$prefsReady&&in_array((string)$case['status'],['awaiting_contact','scheduling'],true),
            'allowedDeliveryModes'=>array_values(array_filter(
                commerceConsultationModes((string)$case['sku']),
                static fn(string $m):bool=>$m!=='VOICE'||$voiceReady))];
    }
    $shipment=$pdo->prepare('SELECT carrier,tracking_code,state,dispatched_at,delivered_at FROM commerce_parcels WHERE order_id=? LIMIT 1');
    $shipment->execute([$orderId]);$parcel=$shipment->fetch();
    $safeParcel=null;
    if($parcel && in_array((string)($parcel['state']??''),['preparing','dispatched','in_transit','delivered','returned'],true)){
        $safeParcel=['state'=>(string)$parcel['state'],
            'carrier'=>$parcel['carrier']??null,'trackingCode'=>$parcel['tracking_code']??null,
            'dispatchedAt'=>$parcel['dispatched_at']??null,'deliveredAt'=>$parcel['delivered_at']??null];
    }
    // A private document upload button must not be advertised merely because
    // the client has a paid case. Report actual server-side custody readiness,
    // never private paths, settings, scanner names or DB connection details.
    $privateFilesReady=jrServiceFilesReady($pdo);
    respond(['ok'=>true,'paymentRecord'=>'provider_verified_not_bank_settlement',
        'serviceCases'=>$safeCases,'parcel'=>$safeParcel,
        'privateServiceFilesReady'=>$privateFilesReady]);
}

// A refund REQUEST is not a refund, a bank reversal or an entitlement cancellation.
if($path==='/commerce/refund-request'&&$verb==='POST'){
    requirePostOrigin();$pdo=db();
    if(!$pdo||!commerceSchemaReady()||!stage9SchemaReady($pdo))fail('refund_request_unavailable',503);
    $account=sessionAccount($pdo);
    if(!$account||($account['status']??'')!=='active'||empty($account['email_verified_at']))fail('unauthorized',401);
    $body=jsonBody();$orderId=(string)($body['orderId']??'');$reason=(string)($body['reasonCode']??'');
    if(!validUuid($orderId)||!in_array($reason,['service_not_provided','cancel_request',
        'book_not_received','incorrect_item','duplicate_payment','other'],true))fail('invalid_refund_request');
    $email=emailNorm($account['email_normalized']??'');$accountId=(string)($account['id']??'');
    if(!validEmail($email)||!validUuid($accountId))fail('unauthorized',401);
    if(!rateAllowed($pdo,'refund_request',$accountId,5,3600))fail('rate_limited',429);
    $pdo->beginTransaction();
    try{
        $query=$pdo->prepare('SELECT id,state FROM commerce_orders WHERE id=? AND customer_email=? LIMIT 1 FOR UPDATE');
        $query->execute([$orderId,$email]);$order=$query->fetch();
        if(!$order){$pdo->rollBack();fail('order_not_found',404);}
        if(($order['state']??'')!=='paid'){$pdo->rollBack();fail('order_not_paid',409);}
        $existing=$pdo->prepare('SELECT id,status FROM commerce_refund_requests WHERE order_id=? AND requester_account_id=? LIMIT 1');
        $existing->execute([$orderId,$accountId]);$row=$existing->fetch();
        if($row){$pdo->commit();respond(['ok'=>true,'requestId'=>$row['id'],
            'status'=>$row['status'],'bankRefundExecuted'=>null],200);}
        $requestId=uuidv4();
        $pdo->prepare("INSERT INTO commerce_refund_requests(id,order_id,requester_account_id,status,reason_code) VALUES(?,?,?,'requested',?)")
            ->execute([$requestId,$orderId,$accountId,$reason]);
        $pdo->commit();
        respond(['ok'=>true,'requestId'=>$requestId,'status'=>'requested','bankRefundExecuted'=>false],202);
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

// Authenticated post-payment service-mode choice. A customer may choose
// telephone/video, or in-person for eligible VIP/annual coaching in Tehran or
// Kashan only. No calendar slot is created by this endpoint.
if($path==='/commerce/consultation-preference'&&$verb==='POST'){
    requirePostOrigin();
    $pdo=db();
    if(!$pdo||!commerceSchemaReady()||!stage9SchemaReady($pdo)
        ||!commerceConsultationPreferenceSchemaReady($pdo))
        fail('consultation_preference_unavailable',503);
    $account=sessionAccount($pdo);
    if(!$account||($account['status']??'')!=='active'
        ||empty($account['email_verified_at']))fail('unauthorized',401);
    $accountId=(string)($account['id']??'');
    $email=emailNorm((string)($account['email_normalized']??''));
    if(!validUuid($accountId)||!validEmail($email))fail('unauthorized',401);
    if(!rateAllowed($pdo,'consultation_preference',$accountId,8,300))
        fail('rate_limited',429);
    $body=jsonBody();
    try{
        $choice=commerceConsultationSavePreference($pdo,$accountId,$email,$body);
        respond(['ok'=>true,'schema'=>'commerce-consultation-choice-v1',
            'preference'=>$choice]);
    }catch(InvalidArgumentException $e){fail('invalid_consultation_delivery_choice',400);}
    catch(DomainException $e){fail('payment_or_booking_state_conflict',409);}
    catch(Throwable $e){
        error_log('Consultation delivery choice unavailable: '.get_class($e));
        fail('consultation_preference_unavailable',503);
    }
}
// Public boolean inventory visibility for the one-owner-set collector item.
// Payment remains governed by the existing /commerce/create route.
if($path==='/commerce/collectible-availability'&&$verb==='GET'){
    $sku='book:websters-third-1981';
    $item=localCatalog()[$sku]??null;
    $pdo=db();
    $available=is_array($item)&&($item['single_copy']??false)===true&&$pdo!==null
        &&stage9SingleCopyAvailable($pdo,$sku);
    respond(['ok'=>true,'sku'=>$sku,'available'=>$available,
        'checkoutReady'=>$available&&commerceReady()]);
}
if($path==='/commerce/health'&&$verb==='GET'){
    $c=cfg();$ready=commerceReady();
    respond(['ok'=>true,'service'=>'commerce','hardeningRevision'=>'tls-gate-v1','checkout'=>$ready,'orderCapture'=>commerceSchemaReady(),'requirements'=>[
        'receiptAccessReady'=>strlen((string)($c['auth_pepper']??''))>=32,
        'database'=>dbReady(),
        'schema'=>commerceSchemaReady(),
        'publicTlsConfirmed'=>$c['public_tls_confirmed']===true,
        'commerceEnabled'=>$c['commerce_enabled']===true,
        'gatewayKeyConfigured'=>(string)$c['bitpay_api_key']!=='',
        'amountMultiplierValid'=>in_array((string)$c['bitpay_amount_multiplier'],['1','10'],true),
        'orderEmailFulfilmentConfirmed'=>$c['order_email_fulfilment_confirmed']===true,
        'bookShippingConfirmed'=>$c['book_shipping_confirmed']===true,
        'inventoryReconciled'=>dbReady() && stage9BookStockReady(db()),
        'paymentClaimSchemaReady'=>dbReady() && stage9SchemaReady(db()),
        'serviceBookingConfirmed'=>$c['service_booking_confirmed']===true,
        'vipBookingConfirmed'=>$c['vip_booking_confirmed']===true,
        // Legacy booking/shipping flags are informational; they no longer gate paid
        // service/VIP orders or stock-backed book purchases.
        'manualServiceFulfilmentSupported'=>$ready,
        'manualVipFulfilmentSupported'=>$ready,
        'manualBookShippingSupported'=>$ready&&stage9BookStockReady(db()),
        'consultationPreferenceSchemaReady'=>dbReady() && commerceConsultationPreferenceSchemaReady(db()),
    ],'capabilities'=>[
        'services'=>$ready,
        'vip'=>$ready,
        'books'=>$ready&&stage9BookStockReady(db()),
        'singleCopyCollectible'=>$ready&&dbReady()&&stage9SingleCopyAvailable(db(),'book:websters-third-1981'),
        'consultationChoice'=>$ready&&commerceConsultationPreferenceSchemaReady(db()),
        'selfServiceBooking'=>false,
        // Paid services and VIP are fulfilled by subsequent human coordination.
        // Paid books require reconciled stock, not a pre-confirmed shipping workflow.
        'serviceFulfilmentMode'=>'manual_post_payment',
        'vipFulfilmentMode'=>'manual_post_payment',
        'bookFulfilmentMode'=>'stock_reserved_manual_shipping',
        'bookPaymentRequiresReconciledStock'=>true,
    ]]);
}
if($path==='/commerce/prepare'&&$verb==='POST'){
    requirePostOrigin();$pdo=db();if(!$pdo||!commerceSchemaReady())fail('order_capture_unavailable',503);
    $b=jsonBody();$items=$b['items']??null;if(!is_array($items)||count($items)<1||count($items)>20)fail('invalid_items');
    $inventory=localCatalog();$counts=[];
    foreach($items as $item){$sku=(string)($item['sku']??'');$q=$item['quantity']??null;if(!isset($inventory[$sku])||!is_int($q)||$q<1||$q>20)fail('invalid_item');if(($inventory[$sku]['single_copy']??false)===true)fail('collectible_requires_paid_checkout',503);$counts[$sku]=($counts[$sku]??0)+$q;}
    $lines=[];$total=0;
    foreach($counts as $sku=>$q){$x=$inventory[$sku];if(($x['kind']??'')!=='book')fail('book_order_only');$sub=$x['price']*$q;$total+=$sub;$lines[]=array_merge($x,['quantity'=>$q,'subtotal'=>$sub]);}
    if($total<1000||$total>1000000000)fail('amount_out_of_range');
    $customer=normalizedCustomer($b['customer']??null);$customerEmail=$customer['email'];$dryRun=($b['dryRun']??false)===true;
    if(!$dryRun&&!rateAllowed($pdo,'commerce_prepare',$customerEmail,5,3600))fail('rate_limited',429);
    $customerJson=json_encode($customer,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);if(!is_string($customerJson))fail('customer_encoding_failed',500);
    $itemsJson=json_encode($lines,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);if(!is_string($itemsJson))fail('items_encoding_failed',500);
    $cfg=cfg();$mul=in_array((string)$cfg['bitpay_amount_multiplier'],['1','10'],true)?(int)$cfg['bitpay_amount_multiplier']:10;
    $providerAmount=$total*$mul;$order=uuidv4();$factor=preg_replace('/[^0-9]/','',(string)hrtime(true));$factor=substr($factor,0,28);
    if($dryRun)$pdo->beginTransaction();
    try{
        $pdo->prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,customer_email,customer_json,items_json,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,NOW(),NOW())")
            ->execute([$order,$factor,$total,$providerAmount,'IRT',$customerEmail,$customerJson,$itemsJson,'created']);
        if($dryRun){$pdo->rollBack();respond(['ok'=>true,'dryRun'=>true,'orderCapture'=>true,'totalToman'=>$total,'currency'=>'IRT','paymentStarted'=>false]);}
    }catch(Throwable $e){if($dryRun&&$pdo->inTransaction())$pdo->rollBack();throw $e;}
    $summary=[];foreach($lines as $x){$summary[]='- '.(string)$x['title'].' × '.(int)$x['quantity'].' | '.number_format((int)$x['subtotal']).' تومان';}
    $bodyCustomer="درخواست سفارش کتاب شما در سرور ثبت شد. هنوز هیچ پرداختی انجام نشده است.\n\nشناسه سفارش: ".$order."\n\n".implode("\n",$summary)."\n\nجمع سفارش: ".number_format($total)." تومان\n\nپرداخت فقط پس از فعال‌شدن مسیر امن پرداخت و با اقدام صریح شما انجام خواهد شد.";
    $customerMail=mailReady()?sendLocalMail($customerEmail,'ثبت درخواست سفارش کتاب '.$order,$bodyCustomer):false;
    $admin=(string)($cfg['mail_from']??'');
    if(validEmail($admin)&&$admin!==$customerEmail&&mailReady()){
        $bodyAdmin="درخواست سفارش کتاب جدید ثبت شد.\n\nشناسه سفارش: ".$order."\nایمیل مشتری: ".$customerEmail."\nنام گیرنده: ".$customer['name']."\nکد پستی: ".$customer['postal']."\nنشانی: ".$customer['address']."\n\n".implode("\n",$summary)."\n\nجمع: ".number_format($total)." تومان\n\nوضعیت: ثبت اولیه؛ بدون پرداخت.";
        sendLocalMail($admin,'درخواست سفارش کتاب '.$order,$bodyAdmin);
    }
    respond(['ok'=>true,'orderId'=>$order,'state'=>'created','totalToman'=>$total,'currency'=>'IRT','paymentStarted'=>false,'emailSent'=>$customerMail],201);
}
if($path==='/commerce/create'&&$verb==='POST'){
    requirePostOrigin();if(!commerceReady())fail('checkout_disabled',503);$pdo=db();if(!$pdo)fail('database_unconfigured',503);
    $b=jsonBody();$items=$b['items']??null;if(!is_array($items)||count($items)<1||count($items)>20)fail('invalid_items');
    $inventory=localCatalog();$counts=[];
    foreach($items as $item){$sku=(string)($item['sku']??'');$q=$item['quantity']??null;if(!isset($inventory[$sku])||!is_int($q)||$q<1||$q>20)fail('invalid_item');$counts[$sku]=($counts[$sku]??0)+$q;}
    $lines=[];$total=0;$c=cfg();$hasBook=false;$hasDigital=false;
    foreach($counts as $sku=>$q){$x=$inventory[$sku];if(($x['single_copy']??false)===true&&$q!==1)fail('single_copy_quantity_invalid',409);if($x['kind']==='digital'){$hasDigital=true;}if($x['kind']!=='book'&&$q!==1)fail('service_quantity_invalid');if($x['kind']==='book'){$hasBook=true;}$sub=$x['price']*$q;$total+=$sub;$lines[]=array_merge($x,['quantity'=>$q,'subtotal'=>$sub]);}
    if($total<1000||$total>1000000000)fail('amount_out_of_range');
    if($hasDigital&&($hasBook||count($counts)!==1))fail('digital_bundle_only',400);
    if($hasBook&&!stage9BookStockReady($pdo)){
        // Do not disable this physically confirmed, separately reconciled
        // one-of-one set merely because some unrelated poetry-book stock is
        // awaiting reconciliation. Every paid order still uses the same atomic
        // InnoDB stock reservation and verified BitPay callback.
        $onlyOne= count($counts)===1 &&
            isset($counts['book:websters-third-1981']) &&
            ($inventory['book:websters-third-1981']['single_copy']??false)===true;
        if(!$onlyOne)fail('inventory_not_reconciled',503);
    }
    // A collectible must be the sole remaining physical set, unreserved and
    // independently reconciled before initiating a real payment.
    foreach($counts as $sku=>$q){
        if(($inventory[$sku]['single_copy']??false)===true &&
           !stage9SingleCopyAvailable($pdo,$sku))
            fail('collectible_sold_or_unavailable',409);
    }
    $customer=null;$customerEmail=null;$customerJson=null;
    if($hasBook){$customer=normalizedCustomer($b['customer']??null);}
    else {$customer=normalizedServiceBuyer($b['customer']??null);}
    $customerEmail=$customer['email'];
    $customerJson=json_encode($customer,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    if(!is_string($customerJson))fail('customer_encoding_failed',500);
    $rateIdentity=$customerEmail?:implode(',',array_keys($counts));if(!rateAllowed($pdo,'commerce_create',$rateIdentity,5,900))fail('rate_limited',429);
    $mul=(int)$c['bitpay_amount_multiplier'];$providerAmount=$total*$mul;$order=uuidv4();if(!commerceReceiptGrant($order))fail('receipt_access_unavailable',503);$factor=preg_replace('/[^0-9]/','',(string)hrtime(true));$factor=substr($factor,0,28);
    // Reserve every physical book atomically; unavailable stock never reaches BitPay.
    $pdo->beginTransaction();
    try {
        stage9ReserveBooks($pdo,$order,$lines);
        $pdo->prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,customer_email,customer_json,items_json,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,? ,NOW(),NOW())")
            ->execute([$order,$factor,$total,$providerAmount,'IRT',$customerEmail,$customerJson,json_encode($lines,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),'created']);
        $pdo->commit();
    } catch(Throwable $e) {
        if($pdo->inTransaction())$pdo->rollBack();
        fail($hasBook?'stock_unavailable':'order_unavailable',$hasBook?409:503);
    }
    try{
        $callback=SITE_ORIGIN.'/api/commerce/callback?order='.rawurlencode($order);
        $raw=gatewayPost('gateway-send',['amount'=>(string)$providerAmount,'redirect'=>$callback,'factorId'=>$factor,'description'=>'Order '.$order]);
        if(!preg_match('/^[1-9][0-9]*$/',$raw))throw new RuntimeException('gateway_rejected');
        $pdo->prepare("UPDATE commerce_orders SET state='pending',provider_id_get=?,updated_at=NOW() WHERE id=? AND state='created'")->execute([$raw,$order]);
        respond(['ok'=>true,'orderId'=>$order,'totalToman'=>$total,'currency'=>'IRT','paymentUrl'=>SITE_ORIGIN.'/fa/shop/payment-start/?gateway='.rawurlencode('https://bitpay.ir/payment/gateway-'.$raw.'-get')]);
    }catch(Throwable $e){$pdo->prepare("UPDATE commerce_orders SET state='failed',updated_at=NOW() WHERE id=? AND state='created'")->execute([$order]);fail('gateway_rejected',502);}
}
if($path==='/commerce/status'&&$verb==='GET'){
    $id=(string)($_GET['order']??'');if(!validUuid($id))fail('invalid_order');$pdo=db();if(!$pdo)fail('database_unconfigured',503);
    $s=$pdo->prepare('SELECT state,amount_toman,currency,items_json,paid_at,provider_id_get,provider_trans_id FROM commerce_orders WHERE id=?');$s->execute([$id]);$row=$s->fetch();if(!$row)fail('order_not_found',404);
    // Never expose order state or a paid receipt based only on a leaked order UUID.
    if(!commerceReceiptAuthorized($id))fail('receipt_access_required',403);
    if($row['state']!=='paid')respond(['ok'=>true,'state'=>$row['state']]);
    // A paid label alone is not verified receipt evidence.
    if(($row['currency']??null)!=='IRT'||!is_string($row['paid_at']??null)||strtotime($row['paid_at'])===false||
        !preg_match('/^[1-9][0-9]*$/D',(string)($row['provider_id_get']??''))||
        !preg_match('/^[1-9][0-9]*$/D',(string)($row['provider_trans_id']??'')))fail('receipt_unverified',409);
    $items=json_decode((string)$row['items_json'],true);if(!is_array($items))fail('receipt_unavailable',503);
    $lines=[];$total=0;foreach($items as $x){if(!is_array($x)||!is_int($x['quantity']??null)||!is_int($x['price']??null)||!is_int($x['subtotal']??null))fail('receipt_unverified',409);$q=(int)$x['quantity'];$price=(int)$x['price'];$sub=(int)$x['subtotal'];if($q<1||$price<1||$sub!==$q*$price)fail('receipt_unavailable',503);$total+=$sub;$lines[]=['sku'=>$x['sku'],'title'=>$x['title'],'quantity'=>$q,'unitToman'=>$price,'subtotalToman'=>$sub];}
    if($total!==(int)$row['amount_toman'])fail('receipt_amount_mismatch',409);
    respond(['ok'=>true,'state'=>'paid','receipt'=>['orderId'=>$id,'currency'=>'IRT','amountToman'=>$total,'paidAt'=>$row['paid_at'],'items'=>$lines,'kind'=>'payment_confirmation_not_tax_invoice']]);
}
if($path==='/commerce/callback'&&in_array($verb,['GET','POST'],true)){
    $id=(string)($_GET['order']??'');if(!validUuid($id))fail('invalid_order');$pdo=db();if(!$pdo)fail('database_unconfigured',503);
    $s=$pdo->prepare('SELECT * FROM commerce_orders WHERE id=?');$s->execute([$id]);$row=$s->fetch();if(!$row)fail('order_not_found',404);
    if($row['state']==='paid')commerceReturnToResult($id);
    if($row['state']!=='pending')commerceReturnToResult($id);
    $params=$_GET;if($verb==='POST')$params=array_merge($params,$_POST);$idGet=(string)($params['id_get']??'');$trans=(string)($params['trans_id']??'');
    if($idGet!==(string)$row['provider_id_get']||!preg_match('/^[1-9][0-9]*$/',$trans))commerceReturnToResult($id);
    try{$raw=gatewayPost('gateway-result-second',['trans_id'=>$trans,'id_get'=>$idGet,'json'=>'1']);$d=json_decode($raw,true);if(!is_array($d)||!in_array((string)($d['status']??''),['1','11'],true)||!preg_match('/^[1-9][0-9]*$/D',(string)($d['amount']??''))||(string)$d['amount']!==(string)$row['provider_amount']||(string)($d['factorId']??'')!==(string)$row['factor_id'])commerceReturnToResult($id);
        if(!stage9FinalizePayment($pdo,$id,$idGet,$trans,(string)$d['amount'],(string)$d['factorId']))commerceReturnToResult($id);
        // Only paid digital bundles invoke the publishing mail outbox.
        // A missing mail helper must NEVER break a bank-verified callback or
        // alter legacy book, service and Donation receipt processing.
        $paidItems=json_decode((string)($row['items_json']??''),true);
        $digitalReceipt=is_array($paidItems) && count($paidItems)===1
          && ($paidItems[0]['sku']??null)===JR_PUB_SKU;
        if($digitalReceipt){
            try{
                $mailer=__DIR__.'/internal/jr-publishing-mailer.php';
                if(!is_file($mailer))throw new RuntimeException('publishing_mailer_missing');
                require_once $mailer;
                jrPubProcessOutbox($pdo,$id);
            }catch(Throwable $mailError){
                error_log('Publishing postpay mail deferred '.get_class($mailError));
            }
        }
        $customerEmail=(string)($row['customer_email']??'');
        // Digital buyers receive their two secured links exclusively from
        // the persistent publishing outbox, never a second generic receipt.
        if(!$digitalReceipt && validEmail($customerEmail)&&mailReady()){
            $items=json_decode((string)$row['items_json'],true);$summary=[];$sum=0;
            if(is_array($items)){foreach($items as $x){$qty=(int)($x['quantity']??0);$sub=(int)($x['subtotal']??0);$sum+=$sub;$summary[]='- '.(string)($x['title']??$x['sku']??'item').' × '.$qty.' | '.number_format($sub).' تومان';}}
            $studentSupport=is_array($items)&&count($items)===1&&($items[0]['sku']??'')==='support:students';
            $legacySupport=is_array($items)&&count($items)===1&&($items[0]['sku']??'')==='support:voluntary';
            $support=$studentSupport||$legacySupport;
            $subject=($studentSupport?'تأیید حمایت از دانش‌آموزان مستعد کم‌بضاعت ':($legacySupport?'تأیید حمایت مالی داوطلبانه ':'تأیید پرداخت سفارش ')).$id;
            $body=($studentSupport?"حمایت مالی شما برای برنامه دانش‌آموزان مستعد کم‌بضاعت ثبت شد. تخصیص به نیاز مشخص پس از راستی‌آزمایی و مستندسازی انجام می‌شود.":($legacySupport?"حمایت مالی داوطلبانه شما پس از استعلام بانکی در سرور تأیید شد.":"سفارش شما با موفقیت پرداخت و در سرور ثبت شد."))."\n\nشناسه پرداخت: ".$id."\n\n".implode("\n",$summary)."\n\nجمع پرداخت: ".number_format($sum)." تومان\n\nاین رسید تأیید پرداخت است؛ فاکتور رسمی مالیاتی یا گواهی کمک خیریه نیست.";
            if(sendLocalMail($customerEmail,$subject,$body)){$pdo->prepare("UPDATE commerce_orders SET receipt_email_sent_at=NOW() WHERE id=?")->execute([$id]);}
        }
        commerceReturnToResult($id);
    }catch(Throwable $e){
        // Preserve the pending/verified DB state; never manufacture a paid receipt on a callback failure.
        error_log('Commerce payment callback could not complete: '.get_class($e));
        commerceReturnToResult($id);
    }
}

// A voluntary support payment is a separate, non-purchase commerce order.
// Existing verified bank callback and receipt processing remain authoritative.
if($path==='/donations/health'&&$verb==='GET'){
    respond(['ok'=>true,'service'=>'donations','checkout'=>commerceReady(),
        'minToman'=>1000,'maxToman'=>10000000,'defaultToman'=>500000,'currency'=>'IRT']);
}
if($path==='/donations/create'&&$verb==='POST'){
    requirePostOrigin();
    if(!commerceReady())fail('donations_disabled',503);
    $pdo=db();if(!$pdo)fail('database_unconfigured',503);
    $input=jsonBody();$amount=$input['amountToman']??null;
    // Only JSON integers may initiate money movement: no floats, numeric strings or negatives.
    if(!is_int($amount)||$amount<1000||$amount>10000000)fail('invalid_donation_amount');
    $email=trim((string)($input['email']??''));
    if($email!==''&&!validEmail($email))fail('invalid_donation_email');
    $focus=(string)($input['focus']??'general');
    $allowedFocus=['general'=>'صندوق عمومی حمایت تحصیلی','scholarship'=>'بورسیه و شهریه','books'=>'کتاب و لوازم آموزشی',
        'services'=>'خدمات آموزشی','essentials'=>'پوشاک و نیازهای ضروری'];
    if(!array_key_exists($focus,$allowedFocus))fail('invalid_support_focus');
    if(!rateAllowed($pdo,'donations_create',$email!==''?$email:'anonymous',5,900))fail('rate_limited',429);
    $c=cfg();$providerAmount=$amount*(int)$c['bitpay_amount_multiplier'];
    $order=uuidv4();if(!commerceReceiptGrant($order))fail('receipt_access_unavailable',503);$factor=substr(preg_replace('/[^0-9]/','',(string)hrtime(true)),0,28);
    // Historical support:voluntary orders stay untouched. Only NEW payments belong to this student fund.
    $items=[['sku'=>'support:students','title'=>'حمایت از دانش‌آموزان مستعد کم‌بضاعت — '.$allowedFocus[$focus],
        'kind'=>'donation','program'=>'talented-students-v1','focus'=>$focus,
        'allocation'=>'pending_verified_need','quantity'=>1,'price'=>$amount,'subtotal'=>$amount]];
    $itemsJson=json_encode($items,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    if(!is_string($itemsJson))fail('donation_encoding_failed',500);
    $pdo->prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,customer_email,customer_json,items_json,state,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,NOW(),NOW())")
        ->execute([$order,$factor,$amount,$providerAmount,'IRT',$email!==''?$email:null,null,$itemsJson,'created']);
    try{
        $callback=SITE_ORIGIN.'/api/commerce/callback?order='.rawurlencode($order);
        $gatewayId=gatewayPost('gateway-send',['amount'=>(string)$providerAmount,
            'redirect'=>$callback,'factorId'=>$factor,'description'=>'Talented student educational support '.$order]);
        if(!preg_match('/^[1-9][0-9]*$/D',$gatewayId))throw new RuntimeException('gateway_rejected');
        $pdo->prepare("UPDATE commerce_orders SET state='pending',provider_id_get=?,updated_at=NOW() WHERE id=? AND state='created'")
            ->execute([$gatewayId,$order]);
    }catch(Throwable $e){
        $pdo->prepare("UPDATE commerce_orders SET state='failed',updated_at=NOW() WHERE id=? AND state='created'")->execute([$order]);
        fail('gateway_rejected',502);
    }
    // The completed pending order is not invalidated if the HTTP response exits normally.
    respond(['ok'=>true,'orderId'=>$order,'amountToman'=>$amount,'currency'=>'IRT',
        'paymentUrl'=>SITE_ORIGIN.'/fa/shop/payment-start/?gateway='.rawurlencode('https://bitpay.ir/payment/gateway-'.$gatewayId.'-get')]);
}
if(str_starts_with($path,'/donations/'))fail('not_found',404);
if(str_starts_with($path,'/growth/')){
    require_once __DIR__.'/growth-stage14.php';
    stage14LeadRoute($path,$verb);
}
// Private account workbooks share the existing login and mother database.
// No published public route is altered; default-off legal/scientific gates apply.
// One optional educational-interest popup, separate from learner scores.
if(str_starts_with($path,'/education-interest/')){
    require_once __DIR__.'/education-interest.php';
    jrEducationInterestRoute($path,$verb);
}
if(str_starts_with($path,'/bahar/account/')){
    require_once __DIR__.'/bahar-private-workbook.php';
    baharAccountRoute($path,$verb);
}
if(str_starts_with($path,'/golden-talent/')){
    require_once __DIR__.'/golden-talent.php';
    goldenTalentRoute($path,$verb);
}
// Public, source-reviewed official programme catalogue; never returns learner data.
if(str_starts_with($path,'/konkur/')){
    require_once __DIR__.'/konkur-admission.php';
    konkurCatalogueRoute($path,$verb);
}
if(str_starts_with($path,'/student-support/')){
    require_once __DIR__.'/student-support.php';
    studentSupportRoute($path,$verb);
}
if(in_array($path,['/assistant/v1/chat','/assistant/v1/local/result',
  '/assistant/v1/local/cancel','/assistant/v1/capabilities'],true)){
    require_once __DIR__.'/jrei-local-chat.php';
    require_once __DIR__.'/jrei-owner-pilot-public-bridge.php';
    header('Cache-Control: private, no-store, max-age=0');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    $aiCfg=cfg();$aiDb=db();
    $local=($aiDb instanceof PDO)&&jrLocalChatReady($aiDb,$aiCfg);
    $pilotBridge=($aiDb instanceof PDO)&&
        jrPilotBridgeLive($aiDb,$aiCfg);
    // Paid providers cannot become the site's primary AI by accident.
    $optionalCloud=($aiCfg['jrei_allow_optional_cloud_public_fallback']??false)===true
       &&($aiDb instanceof PDO)&&jrAiPublicCanAnswer($aiDb,$aiCfg);
    if($path==='/assistant/v1/capabilities'){
        if($verb!=='GET')fail('assistant_method_invalid',405);
        respond(['ok'=>true,'schema'=>'jr.jrei.assistant-capability.v1',
          'live'=>$local||$pilotBridge||$optionalCloud,
          'providerMode'=>($local||$pilotBridge)?
              'JREI_LM_LOCAL_WINDOWS':
             ($optionalCloud?'OPTIONAL_OPENAI':'OFFLINE_GUIDE'),
          'providerConsentRequired'=>$optionalCloud&&!($local||$pilotBridge),
          'processingNoticeDisplayedInChat'=>true,
          'publicSignedPilotBridge'=>$pilotBridge&&!$local,
          'sourceScope'=>'PUBLIC_REVIEWED_OR_SITE_SUMMARY',
          'privateLearnerRecordsAccessible'=>false,
          'scientificValidationEstablished'=>false]);
    }
    if($verb!=='POST')fail('assistant_method_invalid',405);
    if(($_SERVER['HTTP_ORIGIN']??null)!==SITE_ORIGIN ||
       !in_array(($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin'),
         ['same-origin','none'],true))
        fail('assistant_origin_forbidden',403);
    if(!($aiDb instanceof PDO))fail('assistant_unavailable',503);
    // A local inference job involves bounded short polling; never count all
    // those polls as new expensive conversation requests.
    $bucketAction=$path==='/assistant/v1/chat'?'jrei_ai_public':
      ($path==='/assistant/v1/local/result'?'jrei_local_result':'jrei_local_cancel');
    $limit=$path==='/assistant/v1/chat'?6:
      ($path==='/assistant/v1/local/result'?70:12);
    $window=$path==='/assistant/v1/chat'?600:180;
    // rateAllowed() already scopes its SHA-256 bucket by verified clientIp(),
    // not globally across site visitors; reuse it unchanged.
    if(!rateAllowed($aiDb,$bucketAction,'public',$limit,$window))
        fail('assistant_rate_limited',429);
    try{
        $body=jsonBody();
        if($path==='/assistant/v1/local/result'){
            if(jrPilotBridgeIsJob($aiDb,$body))
                respond(jrPilotBridgeCollect($aiDb,$aiCfg,$body));
            respond(jrLocalChatCollect($aiDb,$aiCfg,$body));
        }
        if($path==='/assistant/v1/local/cancel'){
            respond(jrLocalChatCancel($aiDb,$body));
        }
        if($path!=='/assistant/v1/chat')fail('assistant_not_found',404);
        if($local)respond(jrLocalChatEnqueue($aiDb,$aiCfg,$body));
        if($pilotBridge)respond(jrPilotBridgeAsk($aiDb,$aiCfg,$body));
        if($optionalCloud)respond(jrAiPublicChat($aiDb,$aiCfg,$body));
        fail('assistant_local_fallback',503);
    }catch(InvalidArgumentException $e){fail('assistant_message_invalid',422);}
     catch(DomainException $e){fail('assistant_unavailable_or_review_required',503);}
     catch(Throwable $e){fail('assistant_temporarily_unavailable',503);}
}
if($path==='/assistant/v1/leads'&&$verb==='POST')fail('lead_capture_not_configured',503);
if($path==='/register-request'&&$verb==='POST')fail('registration_intake_not_configured',503);
if($path==='/callback')fail('legacy_payment_route_disabled',503);

fail('not_found',404);
