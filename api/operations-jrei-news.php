<?php
declare(strict_types=1);
/**
 * Bind the JREI News source contracts to the EXISTING operations session,
 * never a parallel owner identity or public API. The caller has already
 * authenticated SUPER_ADMIN and recent TOTP, and verified the exact CSRF.
 * Source only: BOTH independent release flags default OFF.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
// Never load a source-only module at operations.php bootstrap. A release
// may ship with News disabled, and platform/ is deliberately absent from
// public_html. All established customer/admin API routes must still work.

/**
 * Exact, private, READ-ONLY original KA evidence review for an owner approval.
 * Does not publish, fetch URLs, mutate source records or bypass SCIENCE gates.
 * Every missing table/policy/digest fails closed; original JREI-KA is the sole
 * source of authority and the original owner MFA route remains mandatory.
 */
function jrNewsRecheckOriginalArticleReceipt(
    PDO $pdo,string $articleSourceId,string $articleUrl,string $contentSha256
): array {
    $denied=['source'=>'ORIGINAL_JREI_SOURCE_RECHECK',
        'current'=>false,'rightsApproved'=>false,'currentEvidenceSha256'=>null];
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$articleSourceId) ||
       !preg_match('/^[a-f0-9]{64}$/D',$contentSha256) ||
       strlen($articleUrl)<12 || strlen($articleUrl)>1000 ||
       preg_match('/[[:cntrl:][:space:]]/',$articleUrl))
        return $denied;
    $parts=parse_url($articleUrl);
    if(!is_array($parts)||($parts['scheme']??null)!=='https'||
       empty($parts['host'])||isset($parts['user'])||isset($parts['pass'])||
       isset($parts['fragment'])||
       (isset($parts['port'])&&(int)$parts['port']!==443)||
       filter_var((string)$parts['host'],FILTER_VALIDATE_IP)!==false)
        return $denied;
    $sql=<<<'SQL'
SELECT o.content_sha256 AS verified_digest
FROM jrei_news_discovered_urls d
JOIN jrei_news_monitors n ON BINARY n.monitor_id=BINARY d.monitor_id AND n.enabled=1
JOIN jrei_exam_sources f ON BINARY f.source_id=BINARY n.jrei_source_reference
JOIN jrei_ka_source_policies fp
  ON BINARY fp.source_id=BINARY f.source_id AND fp.revision=n.policy_revision
JOIN jrei_exam_sources a
  ON BINARY a.source_id=BINARY d.approved_article_source_id
 AND BINARY a.source_locator_uri=BINARY d.canonical_article_url
JOIN jrei_ka_source_policies ap ON BINARY ap.source_id=BINARY a.source_id
JOIN jrei_ka_private_observations o
  ON BINARY o.source_id=BINARY a.source_id AND o.source_policy_revision=ap.revision
 AND BINARY o.source_uri_sha256=BINARY d.canonical_url_sha256
JOIN jrei_ka_jobs j
  ON BINARY j.job_id=BINARY o.job_id AND BINARY j.source_id=BINARY o.source_id
 AND j.source_policy_revision=o.source_policy_revision
 AND BINARY j.observed_digest=BINARY o.content_sha256
 AND j.job_state='ACQUIRED_REVIEW'
WHERE a.source_id=? AND BINARY d.canonical_article_url=BINARY ?
  AND BINARY o.content_sha256=BINARY ?
  AND BINARY d.canonical_url_sha256=BINARY SHA2(a.source_locator_uri,256)
  AND BINARY n.source_url_sha256=BINARY SHA2(f.source_locator_uri,256)
  AND d.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
  AND f.review_state='AUTHORITATIVE_REVIEWED'
  AND f.rights_state IN ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
  AND f.is_revoked=0 AND f.is_superseded=0
  AND f.verified_at IS NOT NULL AND f.reviewer_account_id IS NOT NULL
  AND fp.scheduling_state='APPROVED'
  AND fp.rights_reviewed=1 AND fp.robots_terms_reviewed=1
  AND fp.transport_reviewed=1
  AND fp.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND fp.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND fp.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND a.review_state='AUTHORITATIVE_REVIEWED'
  AND a.rights_state IN ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
  AND a.is_revoked=0 AND a.is_superseded=0
  AND a.verified_at IS NOT NULL AND a.reviewer_account_id IS NOT NULL
  AND ap.scheduling_state='APPROVED'
  AND ap.rights_reviewed=1 AND ap.robots_terms_reviewed=1
  AND ap.transport_reviewed=1
  AND ap.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND ap.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND ap.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
  AND o.mime_type='text/html'
  AND o.state='PENDING_SCIENTIFIC_REVIEW'
  AND o.rights_state_at_acquisition IN
    ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
  AND o.bytes_total BETWEEN 50 AND 8388608
  AND o.private_object_key=BINARY CONCAT(o.content_sha256,'.bin')
LIMIT 1
SQL;
    try {
        $q=$pdo->prepare($sql);
        $q->execute([$articleSourceId,$articleUrl,$contentSha256]);
        $digest=$q->fetchColumn();
        if(!is_string($digest)||!hash_equals($contentSha256,$digest))
            return $denied;
        return ['source'=>'ORIGINAL_JREI_SOURCE_RECHECK',
            'current'=>true,'rightsApproved'=>true,
            'currentEvidenceSha256'=>$digest];
    }catch(Throwable $e){
        return $denied;
    }
}

/**
 * Read-only private availability of the original News integration.
 * Called only after operations.php validates SUPER_ADMIN, fresh TOTP,
 * session CSRF and origin. No News feature flag is required for this
 * diagnostic, and no mutation or secret value is returned.
 */
function jrOperationsNewsReadiness(PDO $pdo,array $config): array {
    // All FOUR additive news migrations and the original JREI-KA mother
    // tables are required for a complete owner newsroom. A preexisting table
    // missing new columns must not be mistaken for a completed migration.
    // Literal allowlisted names only; no account data, expensive counts,
    // migration writes or schema mutation occurs in this read-only probe.
    // Full column contract transcribed from the four reviewed News DDL files.
    // Keep the original shared KA source requirements without duplicating schema.
    $required=[
        'jrei_news_monitors'=>[
            'monitor_id','jrei_source_reference','source_url_sha256','category_code',
            'priority_code','interval_minutes','policy_revision','enabled',
            'last_success_at','backoff_until','created_at'
        ],
        'jrei_news_candidates'=>[
            'candidate_id','monitor_id','fingerprint_sha256','source_url',
            'content_sha256','headline','event_type','priority_code',
            'source_published_at','first_observed_at','state'
        ],
        'jrei_news_evidence_reviews'=>[
            'review_id','candidate_id','reviewer_account_id','content_sha256',
            'verification_state','issuer_verified','usage_rights_verified','reviewed_at',
            'evidence_private_reference'
        ],
        'jrei_news_editorial_versions'=>[
            'revision_id','candidate_id','evidence_review_id','revision_number',
            'bilingual_editorial_json','approved_image_ref','approval_digest','editorial_state',
            'created_at'
        ],
        'jrei_news_owner_decisions'=>[
            'decision_id','revision_id','owner_account_id','approval_digest',
            'action_code','owner_mfa_audit_ref','decided_at'
        ],
        'jrei_news_publications'=>[
            'publication_id','revision_id','approved_decision_id','fa_route',
            'en_route','fa_content_sha256','en_content_sha256','publisher_state',
            'publisher_receipt_reference','published_at'
        ],
        'jrei_news_exam_milestones'=>[
            'milestone_id','external_exam_key','milestone_type','title_fa',
            'title_en','event_utc','timezone_name','source_ref',
            'source_evidence_sha256','version_number','previous_milestone_id','review_state',
            'owner_approved','created_at'
        ],
        'jrei_news_exam_follows'=>[
            'follow_id','account_id','milestone_id','days_before',
            'channel_code','consent_reference','follow_state','created_at'
        ],
        'jrei_news_delivery_receipts'=>[
            'delivery_id','publication_id','provider_code','provider_account_reference',
            'idempotency_key','state','provider_receipt_reference','attempts',
            'created_at'
        ],
        'jrei_news_discovered_urls'=>[
            'discovery_id','monitor_id','source_registry_id','canonical_article_url',
            'canonical_url_sha256','latest_feed_sha256','discovered_headline','claimed_published_at',
            'first_seen_at','last_seen_at','review_state','approved_article_source_id'
        ],
        'jrei_news_search_documents'=>[
            'document_id','publication_id','language_code','public_route',
            'title','summary','searchable_body','country_code',
            'category_code','event_code','owner_approval_digest','content_sha256',
            'published_at','indexed_at','index_state'
        ],
        'jrei_news_topic_follows'=>[
            'follow_id','account_id','topic_code','locale_code',
            'digest_mode','channel_code','consent_reference','follow_state',
            'updated_at'
        ],
        'jrei_exam_sources'=>['source_id','source_locator_uri',
            'review_state','rights_state','is_revoked'],
        'jrei_ka_source_policies'=>['source_id','revision',
            'scheduling_state','rights_reviewed'],
        'jrei_ka_jobs'=>['job_id','source_id','job_state',
            'source_policy_revision'],
        'jrei_ka_private_observations'=>['observation_id','job_id',
            'source_id','content_sha256','source_policy_revision']
    ];
    // Exact column kind/length/nullability/signedness/charset/collation
    // from the FOUR versioned News migrations. Original KA tables retain
    // their established (potentially heterogeneous) schema and collation.
    $requiredColumnShape=[
        'jrei_news_monitors'=>[
            'monitor_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'jrei_source_reference'=>['varchar',100,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'source_url_sha256'=>['char',64,false,false,'ascii','ascii_bin'],
            'category_code'=>['varchar',48,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'priority_code'=>['varchar',2,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'interval_minutes'=>['smallint',null,false,true,null,null],
            'policy_revision'=>['bigint',null,false,true,null,null],
            'enabled'=>['tinyint',1,false,false,null,null],
            'last_success_at'=>['bigint',null,true,true,null,null],
            'backoff_until'=>['bigint',null,true,true,null,null],
            'created_at'=>['bigint',null,false,true,null,null],
        ],
        'jrei_news_candidates'=>[
            'candidate_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'monitor_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'fingerprint_sha256'=>['char',64,false,false,'ascii','ascii_bin'],
            'source_url'=>['varchar',1000,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'content_sha256'=>['char',64,false,false,'ascii','ascii_bin'],
            'headline'=>['varchar',240,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'event_type'=>['varchar',64,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'priority_code'=>['varchar',2,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'source_published_at'=>['bigint',null,true,true,null,null],
            'first_observed_at'=>['bigint',null,false,true,null,null],
            'state'=>['varchar',56,false,false,'utf8mb4','utf8mb4_unicode_ci'],
        ],
        'jrei_news_evidence_reviews'=>[
            'review_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'candidate_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'reviewer_account_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'content_sha256'=>['char',64,false,false,'ascii','ascii_bin'],
            'verification_state'=>['varchar',48,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'issuer_verified'=>['tinyint',1,false,false,null,null],
            'usage_rights_verified'=>['tinyint',1,false,false,null,null],
            'reviewed_at'=>['bigint',null,false,true,null,null],
            'evidence_private_reference'=>['varchar',180,true,false,'utf8mb4','utf8mb4_unicode_ci'],
        ],
        'jrei_news_editorial_versions'=>[
            'revision_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'candidate_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'evidence_review_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'revision_number'=>['int',null,false,true,null,null],
            'bilingual_editorial_json'=>['longtext',null,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'approved_image_ref'=>['varchar',500,true,false,'utf8mb4','utf8mb4_unicode_ci'],
            'approval_digest'=>['char',64,false,false,'ascii','ascii_bin'],
            'editorial_state'=>['varchar',48,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'created_at'=>['bigint',null,false,true,null,null],
        ],
        'jrei_news_owner_decisions'=>[
            'decision_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'revision_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'owner_account_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'approval_digest'=>['char',64,false,false,'ascii','ascii_bin'],
            'action_code'=>['varchar',28,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'owner_mfa_audit_ref'=>['varchar',100,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'decided_at'=>['bigint',null,false,true,null,null],
        ],
        'jrei_news_publications'=>[
            'publication_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'revision_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'approved_decision_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'fa_route'=>['varchar',260,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'en_route'=>['varchar',260,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'fa_content_sha256'=>['char',64,true,false,'ascii','ascii_bin'],
            'en_content_sha256'=>['char',64,true,false,'ascii','ascii_bin'],
            'publisher_state'=>['varchar',48,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'publisher_receipt_reference'=>['varchar',200,true,false,'utf8mb4','utf8mb4_unicode_ci'],
            'published_at'=>['bigint',null,true,true,null,null],
        ],
        'jrei_news_exam_milestones'=>[
            'milestone_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'external_exam_key'=>['varchar',100,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'milestone_type'=>['varchar',48,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'title_fa'=>['varchar',220,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'title_en'=>['varchar',220,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'event_utc'=>['bigint',null,false,true,null,null],
            'timezone_name'=>['varchar',60,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'source_ref'=>['varchar',100,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'source_evidence_sha256'=>['char',64,false,false,'ascii','ascii_bin'],
            'version_number'=>['int',null,false,true,null,null],
            'previous_milestone_id'=>['char',36,true,false,'utf8mb4','utf8mb4_unicode_ci'],
            'review_state'=>['varchar',40,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'owner_approved'=>['tinyint',1,false,false,null,null],
            'created_at'=>['bigint',null,false,true,null,null],
        ],
        'jrei_news_exam_follows'=>[
            'follow_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'account_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'milestone_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'days_before'=>['smallint',null,false,true,null,null],
            'channel_code'=>['varchar',24,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'consent_reference'=>['varchar',100,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'follow_state'=>['varchar',24,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'created_at'=>['bigint',null,false,true,null,null],
        ],
        'jrei_news_delivery_receipts'=>[
            'delivery_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'publication_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'provider_code'=>['varchar',40,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'provider_account_reference'=>['varchar',100,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'idempotency_key'=>['char',64,false,false,'ascii','ascii_bin'],
            'state'=>['varchar',30,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'provider_receipt_reference'=>['varchar',200,true,false,'utf8mb4','utf8mb4_unicode_ci'],
            'attempts'=>['smallint',null,false,true,null,null],
            'created_at'=>['bigint',null,false,true,null,null],
        ],
        'jrei_news_discovered_urls'=>[
            'discovery_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'monitor_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'source_registry_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'canonical_article_url'=>['varchar',1000,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'canonical_url_sha256'=>['char',64,false,false,'ascii','ascii_bin'],
            'latest_feed_sha256'=>['char',64,false,false,'ascii','ascii_bin'],
            'discovered_headline'=>['varchar',240,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'claimed_published_at'=>['bigint',null,true,true,null,null],
            'first_seen_at'=>['bigint',null,false,true,null,null],
            'last_seen_at'=>['bigint',null,false,true,null,null],
            'review_state'=>['varchar',48,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'approved_article_source_id'=>['char',36,true,false,'utf8mb4','utf8mb4_unicode_ci'],
        ],
        'jrei_news_search_documents'=>[
            'document_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'publication_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'language_code'=>['char',2,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'public_route'=>['varchar',260,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'title'=>['varchar',240,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'summary'=>['text',null,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'searchable_body'=>['mediumtext',null,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'country_code'=>['char',2,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'category_code'=>['varchar',48,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'event_code'=>['varchar',64,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'owner_approval_digest'=>['char',64,false,false,'ascii','ascii_bin'],
            'content_sha256'=>['char',64,false,false,'ascii','ascii_bin'],
            'published_at'=>['bigint',null,false,true,null,null],
            'indexed_at'=>['bigint',null,false,true,null,null],
            'index_state'=>['varchar',28,false,false,'utf8mb4','utf8mb4_unicode_ci'],
        ],
        'jrei_news_topic_follows'=>[
            'follow_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'account_id'=>['char',36,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'topic_code'=>['varchar',40,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'locale_code'=>['char',2,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'digest_mode'=>['varchar',24,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'channel_code'=>['varchar',24,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'consent_reference'=>['varchar',100,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'follow_state'=>['varchar',24,false,false,'utf8mb4','utf8mb4_unicode_ci'],
            'updated_at'=>['bigint',null,false,true,null,null],
        ],
    ];
    // Existing columns alone cannot enforce unique draft revisions, owner
    // approvals, delivery idempotency or immutable bilingual public routes.
    $requiredUnique=[
        'jrei_news_monitors'=>[['jrei_source_reference','source_url_sha256']],
        'jrei_news_candidates'=>[['fingerprint_sha256']],
        'jrei_news_discovered_urls'=>[['monitor_id','canonical_url_sha256']],
        'jrei_news_editorial_versions'=>[
            ['candidate_id','revision_number'],['approval_digest']],
        'jrei_news_owner_decisions'=>[
            ['revision_id','owner_account_id','action_code','approval_digest']],
        'jrei_news_publications'=>[['revision_id'],['fa_route'],['en_route']],
        'jrei_news_exam_milestones'=>[
            ['external_exam_key','milestone_type','version_number']],
        'jrei_news_exam_follows'=>[
            ['account_id','milestone_id','days_before','channel_code']],
        'jrei_news_delivery_receipts'=>[['idempotency_key']],
        'jrei_news_topic_follows'=>[['account_id','topic_code','channel_code']],
        'jrei_news_search_documents'=>[
            ['publication_id','language_code'],['public_route']]
    ];
    // Uniqueness of business keys cannot replace the immutable row identity
    // expected by the owner, source registry and publisher joins.
    $requiredPrimaryKeys=[
        'jrei_news_monitors'=>['monitor_id'],
        'jrei_news_candidates'=>['candidate_id'],
        'jrei_news_discovered_urls'=>['discovery_id'],
        'jrei_news_evidence_reviews'=>['review_id'],
        'jrei_news_editorial_versions'=>['revision_id'],
        'jrei_news_owner_decisions'=>['decision_id'],
        'jrei_news_publications'=>['publication_id'],
        'jrei_news_exam_milestones'=>['milestone_id'],
        'jrei_news_exam_follows'=>['follow_id'],
        'jrei_news_delivery_receipts'=>['delivery_id'],
        'jrei_news_topic_follows'=>['follow_id'],
        'jrei_news_search_documents'=>['document_id']
    ];
    // Unsafe defaults may activate crawling, approval or outbox delivery
    // despite a perfectly valid column type and FK inventory.
    $requiredDefaults=[
        'jrei_news_monitors'=>['enabled'=>'0'],
        'jrei_news_exam_milestones'=>['owner_approved'=>'0'],
        'jrei_news_delivery_receipts'=>['attempts'=>'0','state'=>'QUEUED'],
        'jrei_news_publications'=>['publisher_state'=>'WAITING_FOR_PUBLISHER'],
        'jrei_news_candidates'=>['state'=>'PENDING_EVIDENCE_VERIFICATION'],
        'jrei_news_editorial_versions'=>['editorial_state'=>'PENDING_OWNER_APPROVAL'],
        'jrei_news_exam_follows'=>['follow_state'=>'ACTIVE'],
        'jrei_news_topic_follows'=>['follow_state'=>'ACTIVE'],
        'jrei_news_search_documents'=>['index_state'=>'PUBLISHED']
    ];
    // Required named non-unique indexes and FULLTEXT search capability.
    // Unlike UNIQUE keys, index order and type influence read performance.
    $requiredIndexes=[
        'jrei_news_monitors'=>[
            ['idx_jrei_news_monitor_schedule',['enabled','priority_code','last_success_at'],'BTREE'],
        ],
        'jrei_news_candidates'=>[
            ['idx_jrei_news_candidate_review',['state','priority_code','first_observed_at'],'BTREE'],
        ],
        'jrei_news_evidence_reviews'=>[
            ['idx_jrei_news_evidence',['candidate_id','reviewed_at'],'BTREE'],
        ],
        'jrei_news_editorial_versions'=>[
            ['idx_jrei_news_editorial_queue',['editorial_state','created_at'],'BTREE'],
        ],
        'jrei_news_publications'=>[
            ['idx_jrei_news_pub_state',['publisher_state','published_at'],'BTREE'],
        ],
        'jrei_news_exam_milestones'=>[
            ['idx_jrei_news_exam_due',['review_state','event_utc'],'BTREE'],
        ],
        'jrei_news_discovered_urls'=>[
            ['idx_jrei_news_feed_discovery',['review_state','last_seen_at'],'BTREE'],
            ['idx_jrei_news_feed_monitor',['monitor_id','last_seen_at'],'BTREE'],
        ],
        'jrei_news_search_documents'=>[
            ['idx_jrei_news_search_latest',['language_code','index_state','published_at'],'BTREE'],
            ['idx_jrei_news_search_topic',['language_code','category_code','index_state','published_at'],'BTREE'],
            ['ft_jrei_news_public_text',['title','summary','searchable_body'],'FULLTEXT'],
        ],
        'jrei_news_topic_follows'=>[
            ['idx_jrei_news_topic_audience',['topic_code','digest_mode','follow_state'],'BTREE'],
        ],
    ];
    // All expected references must survive additive migrations. Missing FKs
    // or a weakened ON DELETE action can otherwise admit orphaned evidence,
    // owner decisions or public articles even when columns/UNIQUEs exist.
    // Each expectation describes a single-column FK in the versioned SQL.
    $requiredForeignKeys=[
        'jrei_news_candidates'=>[
            ['monitor_id','jrei_news_monitors','monitor_id','RESTRICT']],
        'jrei_news_discovered_urls'=>[
            ['monitor_id','jrei_news_monitors','monitor_id','RESTRICT'],
            ['source_registry_id','jrei_exam_sources','source_id','RESTRICT'],
            ['approved_article_source_id','jrei_exam_sources','source_id','SET NULL']],
        'jrei_news_evidence_reviews'=>[
            ['candidate_id','jrei_news_candidates','candidate_id','RESTRICT'],
            ['reviewer_account_id','customer_accounts','id','RESTRICT']],
        'jrei_news_editorial_versions'=>[
            ['candidate_id','jrei_news_candidates','candidate_id','RESTRICT'],
            ['evidence_review_id','jrei_news_evidence_reviews','review_id','RESTRICT']],
        'jrei_news_owner_decisions'=>[
            ['revision_id','jrei_news_editorial_versions','revision_id','RESTRICT'],
            ['owner_account_id','customer_accounts','id','RESTRICT']],
        'jrei_news_publications'=>[
            ['revision_id','jrei_news_editorial_versions','revision_id','RESTRICT'],
            ['approved_decision_id','jrei_news_owner_decisions','decision_id','RESTRICT']],
        'jrei_news_exam_milestones'=>[
            ['previous_milestone_id','jrei_news_exam_milestones','milestone_id','RESTRICT']],
        'jrei_news_exam_follows'=>[
            ['account_id','customer_accounts','id','CASCADE'],
            ['milestone_id','jrei_news_exam_milestones','milestone_id','RESTRICT']],
        'jrei_news_delivery_receipts'=>[
            ['publication_id','jrei_news_publications','publication_id','RESTRICT']],
        'jrei_news_topic_follows'=>[
            ['account_id','customer_accounts','id','CASCADE']],
        'jrei_news_search_documents'=>[
            ['publication_id','jrei_news_publications','publication_id','RESTRICT']]
    ];
    // Read bounded source-owned schema inventory rather than sending
    // sixteen individual SQL probes on every MFA newsroom refresh.
    $tables=array_fill_keys(array_keys($required),'UNAVAILABLE');
    $schemaBlockers=[];
    $metadataReadSucceeded=false;
    try{
        $names=array_keys($required);
        $marks=implode(',',array_fill(0,count($names),'?'));
        $q=$pdo->prepare(
            "SELECT c.TABLE_NAME,c.COLUMN_NAME,c.DATA_TYPE,c.COLUMN_TYPE,
                    c.IS_NULLABLE,c.CHARACTER_MAXIMUM_LENGTH,c.COLUMN_DEFAULT,
                    c.CHARACTER_SET_NAME,c.COLLATION_NAME,
                    t.ENGINE,t.TABLE_COLLATION
             FROM information_schema.COLUMNS c
             JOIN information_schema.TABLES t
               ON t.TABLE_SCHEMA=c.TABLE_SCHEMA
              AND t.TABLE_NAME=c.TABLE_NAME
             WHERE c.TABLE_SCHEMA=DATABASE()
               AND c.TABLE_NAME IN (".$marks.")
               AND t.TABLE_TYPE='BASE TABLE'"
        );
        $q->execute($names);
        $seen=[];$columnDetails=[];$tableDetails=[];
        while($row=$q->fetch(PDO::FETCH_ASSOC)){
            $table=$row['TABLE_NAME']??null;
            $column=$row['COLUMN_NAME']??null;
            if(is_string($table)&&isset($required[$table])&&
               is_string($column)){
                $seen[$table][$column]=true;
                $columnDetails[$table][$column]=$row;
                $tableDetails[$table]=[
                    $row['ENGINE']??null,$row['TABLE_COLLATION']??null
                ];
            }
        }
        // Bounded information_schema reads only; no customer/source rows.
        // CREATE TABLE IF NOT EXISTS must never be accepted as proof that
        // UNIQUE constraints were added to a partially existing table.
        $indexQuery=$pdo->prepare(
            "SELECT TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX,COLUMN_NAME,SUB_PART,
                    NON_UNIQUE,INDEX_TYPE
             FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (".$marks.")
             ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX"
        );
        $indexQuery->execute($names);
        $indexColumns=[];$partialIndexes=[];
        $indexIsUnique=[];$indexTypes=[];
        while($row=$indexQuery->fetch(PDO::FETCH_ASSOC)){
            $name=$row['TABLE_NAME']??null;
            $index=$row['INDEX_NAME']??null;
            $column=$row['COLUMN_NAME']??null;
            $position=(int)($row['SEQ_IN_INDEX']??0);
            if(!is_string($name)||!isset($required[$name])||
               !is_string($index)||!is_string($column)||
               $position<1||$position>16)continue;
            $indexColumns[$name][$index][$position]=$column;
            $indexIsUnique[$name][$index]=((int)($row['NON_UNIQUE']??1)===0);
            $indexTypes[$name][$index]=(string)($row['INDEX_TYPE']??'');
            if($row['SUB_PART']!==null)$partialIndexes[$name][$index]=true;
        }
        // One additional bounded metadata read verifies the actual foreign
        // key target and deletion rule; names alone are not proof of integrity.
        $fkQuery=$pdo->prepare(
            "SELECT k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,
                    k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,
                    r.DELETE_RULE
             FROM information_schema.KEY_COLUMN_USAGE k
             JOIN information_schema.REFERENTIAL_CONSTRAINTS r
               ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA
              AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME
              AND r.TABLE_NAME=k.TABLE_NAME
             WHERE k.TABLE_SCHEMA=DATABASE()
               AND k.TABLE_NAME IN (".$marks.")
               AND k.REFERENCED_TABLE_SCHEMA=DATABASE()
               AND k.REFERENCED_TABLE_NAME IS NOT NULL"
        );
        $fkQuery->execute($names);
        $foreignKeys=[];
        while($row=$fkQuery->fetch(PDO::FETCH_ASSOC)){
            $table=$row['TABLE_NAME']??null;
            $constraint=$row['CONSTRAINT_NAME']??null;
            if(!is_string($table)||!isset($required[$table])||
               !is_string($constraint))continue;
            $foreignKeys[$table][$constraint][]=[
                $row['COLUMN_NAME']??null,
                $row['REFERENCED_TABLE_NAME']??null,
                $row['REFERENCED_COLUMN_NAME']??null,
                $row['DELETE_RULE']??null
            ];
        }
        $metadataReadSucceeded=true;
        foreach($required as $name=>$columns){
            $columnsPresent=count(array_filter($columns,
                static fn(string $column):bool=>
                    isset($seen[$name][$column])))===count($columns);
            $shapePresent=true;
            if(isset($requiredColumnShape[$name])){
                $tableShape=$tableDetails[$name]??null;
                if($tableShape!==['InnoDB','utf8mb4_unicode_ci'])
                    $shapePresent=false;
                foreach($requiredColumnShape[$name] as $column=>$expectedShape){
                    [$kind,$length,$nullable,$unsigned,$charset,$collation]=$expectedShape;
                    $actual=$columnDetails[$name][$column]??null;
                    if(!is_array($actual) ||
                       strtolower((string)($actual['DATA_TYPE']??''))!==$kind ||
                       ($length!==null &&
                         in_array($kind,['char','varchar'],true) &&
                         (int)($actual['CHARACTER_MAXIMUM_LENGTH']??-1)!==$length) ||
                       (($actual['IS_NULLABLE']??null)==='YES')!==$nullable ||
                       (stripos((string)($actual['COLUMN_TYPE']??''),'unsigned')!==false)!==$unsigned ||
                       ($charset!==null&&($actual['CHARACTER_SET_NAME']??null)!==$charset) ||
                       ($collation!==null&&($actual['COLLATION_NAME']??null)!==$collation)){
                        $shapePresent=false;break;
                    }
                }
            }
            $uniquePresent=true;
            foreach($requiredUnique[$name]??[] as $expected){
                $matched=false;
                foreach($indexColumns[$name]??[] as $index=>$parts){
                    if(($indexIsUnique[$name][$index]??false)!==true ||
                       isset($partialIndexes[$name][$index]))continue;
                    ksort($parts,SORT_NUMERIC);
                    if(array_values($parts)===$expected){
                        $matched=true;break;
                    }
                }
                if(!$matched){$uniquePresent=false;break;}
            }
            $primaryKeyPresent=true;
            if(isset($requiredPrimaryKeys[$name])){
                $parts=$indexColumns[$name]['PRIMARY']??null;
                if(!is_array($parts)||
                   ($indexIsUnique[$name]['PRIMARY']??false)!==true ||
                   isset($partialIndexes[$name]['PRIMARY'])){
                    $primaryKeyPresent=false;
                }else{
                    ksort($parts,SORT_NUMERIC);
                    $primaryKeyPresent=array_values($parts)===$requiredPrimaryKeys[$name];
                }
            }
            $safeDefaultsPresent=true;
            foreach($requiredDefaults[$name]??[] as $column=>$expectedDefault){
                $actualDefault=$columnDetails[$name][$column]['COLUMN_DEFAULT']??null;
                if(!is_string($actualDefault)){
                    $safeDefaultsPresent=false;break;
                }
                // MariaDB may quote literal defaults in INFORMATION_SCHEMA,
                // while MySQL often returns the unquoted representation.
                $normalized=trim($actualDefault,"'");
                if($normalized!==$expectedDefault){
                    $safeDefaultsPresent=false;break;
                }
            }
            $secondaryIndexesPresent=true;
            foreach($requiredIndexes[$name]??[] as [$requiredName,$expected,$type]){
                $parts=$indexColumns[$name][$requiredName]??null;
                if(!is_array($parts)||
                   isset($partialIndexes[$name][$requiredName])||
                   ($indexTypes[$name][$requiredName]??null)!==$type){
                    $secondaryIndexesPresent=false;break;
                }
                ksort($parts,SORT_NUMERIC);
                if(array_values($parts)!==$expected){
                    $secondaryIndexesPresent=false;break;
                }
            }
            $foreignKeysPresent=true;
            foreach($requiredForeignKeys[$name]??[] as $expected){
                $matched=false;
                foreach($foreignKeys[$name]??[] as $parts){
                    // Reject composite constraints masquerading as the
                    // individual relationships specified by the migration.
                    if(count($parts)===1 && $parts[0]===$expected){
                        $matched=true;break;
                    }
                }
                if(!$matched){$foreignKeysPresent=false;break;}
            }
            $reasons=[];
            if(!$columnsPresent)$reasons[]='MISSING_COLUMN';
            if(!$shapePresent)$reasons[]='COLUMN_OR_TABLE_SHAPE';
            if(!$uniquePresent)$reasons[]='MISSING_UNIQUE_CONSTRAINT';
            if(!$primaryKeyPresent)$reasons[]='MISSING_PRIMARY_KEY';
            if(!$safeDefaultsPresent)$reasons[]='UNSAFE_COLUMN_DEFAULT';
            if(!$secondaryIndexesPresent)$reasons[]='MISSING_OR_WRONG_SEARCH_INDEX';
            if(!$foreignKeysPresent)$reasons[]='MISSING_OR_WRONG_FOREIGN_KEY';
            if($reasons===[])$tables[$name]='AVAILABLE';
            else $schemaBlockers[$name]=$reasons;
        }
    }catch(Throwable $e){
        // Metadata failure never becomes a successful release assertion.
    }
    $schemaReady=!in_array('UNAVAILABLE',$tables,true);
    $library=__DIR__.'/internal/jrei-news/news-library.php';
    $privateLibraryReady=is_file($library)&&is_readable($library);
    $apiFlag=getenv('JR_JREI_NEWS_API_ENABLED')==='true';
    $releaseFlag=($config['jrei_news_integrated_release_accepted']??false)===true;
    $queueAccessible=$apiFlag&&$releaseFlag&&$schemaReady&&$privateLibraryReady;
    return [
        'schema'=>'jr.jrei.news-owner-integration-readiness.v1',
        'state'=>$queueAccessible?'OWNER_QUEUE_CONFIGURED':'SOURCE_ONLY_BLOCKED',
        'ownerQueueAccessible'=>$queueAccessible,
        'originalNewsTables'=>$tables,
        'schemaBlockers'=>$schemaBlockers,
        'schemaMetadataProbeSucceeded'=>$metadataReadSucceeded,
        'requiredMotherSchemaAvailable'=>$schemaReady,
        'requiredMotherTableCount'=>count($required),
        'verifiedMotherTableCount'=>count(array_filter($tables,
            static fn(string $state):bool=>$state==='AVAILABLE')),
        'packagedPrivateNewsLibraryAvailable'=>$privateLibraryReady,
        'explicitOriginalApiFlagEnabled'=>$apiFlag,
        'integratedReleaseAccepted'=>$releaseFlag,
        'originalCmsPublisherConnected'=>false,
        'publisherReceiptVerified'=>false,
        'publicPublicationActivatedByCheck'=>false,
        'crawlerActivatedByCheck'=>false,
        'schemaModifiedByCheck'=>false
    ];
}

function jrOperationsNewsDispatch(
    PDO $pdo,array $config,string $route,string $method,
    array $body,string $ownerId,string $mfaSessionHash
): array {
    if(!in_array($method,['GET','POST'],true)||
       !preg_match('#^/owner/[a-z0-9/-]{1,90}$#D',$route)||
       !preg_match('/^[a-f0-9-]{36}$/iD',$ownerId)||
       !preg_match('/^[a-f0-9]{64}$/D',$mfaSessionHash))
        throw new InvalidArgumentException('news_owner_original_route_invalid');
    if($method==='GET'&&$route==='/owner/integration-readiness')
        return jrOperationsNewsReadiness($pdo,$config);
    if(($config['jrei_news_integrated_release_accepted']??false)!==true||
       getenv('JR_JREI_NEWS_API_ENABLED')!=='true')
        throw new DomainException('news_original_integration_not_accepted');
    // This library is deployed only into the existing HTTP-denied api/internal/
    // directory. It is loaded AFTER both trusted activation flags are checked,
    // never while bootstrapping the ordinary operations controller.
    $newsLibrary=__DIR__.'/internal/jrei-news/news-library.php';
    if(!is_file($newsLibrary)||!is_readable($newsLibrary))
        throw new DomainException('news_original_private_library_unavailable');
    require_once $newsLibrary;
    // The caller constructed this context only from the existing PHP
    // operationsRoute verified session + TOTP + same-origin CSRF, never JSON.
    $owner=[
        'source'=>'EXISTING_OPERATIONS_SESSION',
        'ownerAuthenticated'=>true,'mfaVerified'=>true,
        'csrfVerified'=>true,'scope'=>'JREI_NEWS_EDITORIAL',
        'accountId'=>$ownerId,
        'mfaAuditReference'=>'operations-mfa:'.substr($mfaSessionHash,0,64)
    ];
    $ctx=[
        'originalApiBootstrap'=>true,
        'finalIntegratedAcceptanceVerified'=>true,
        'ownerAuthorizedActivation'=>true,
        'existingOwnerMfaSession'=>$owner
    ];
    // All unsupported original integration ports deliberately throw.
    // A source-only bridge can list/read/stage/PAUSE approved metadata but
    // cannot counterfeit CMS receipts, Eco consent, independent review,
    // payment, journalism or mail delivery.
    $unavailable=static function(): never {
        throw new DomainException('news_original_external_port_not_accepted');
    };
    $ports=[];
    if(($config['jrei_news_source_activation_accepted']??false)===true){
        $ports['originalNewsMonitorActivationPolicy']=
          static function(string $monitorId,string $actor)use($ownerId):array{
            if($actor!==$ownerId||
               !preg_match('/^[a-f0-9-]{36}$/iD',$monitorId))
                throw new DomainException('news_owner_monitor_policy_invalid');
            return [
                'source'=>'ORIGINAL_OWNER_APPROVED_JREI_RELEASE',
                'finalIntegratedAcceptanceVerified'=>true,
                'newsMonitoringActivatedByOwner'=>true
            ];
          };
    }
    $sourceCurrent=static fn(string $sourceId,string $uri,string $digest):array=>
        jrNewsRecheckOriginalArticleReceipt($pdo,$sourceId,$uri,$digest);
    $ports['originalNewsPublicationPreflight']=
        static function(PDO $db,array $owner,string $revisionId)
          use($sourceCurrent):array {
            return jrNewsOwnerPublicationReadiness(
                $db,$owner,$revisionId,$sourceCurrent,dirname(__DIR__)
            );
        };
    return jrNewsDispatchApi(
        $pdo,$method,'/news/v1'.$route,$body,$ctx,
        $unavailable,
        static fn():bool=>false,
        $sourceCurrent,$unavailable,$ports
    );
}
