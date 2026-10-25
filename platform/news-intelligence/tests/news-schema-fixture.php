<?php
declare(strict_types=1);
/**
 * Fresh disposable MariaDB 10.11 schema, ORIGINAL parent-table fixtures only.
 * NEVER ACCEPT a production DSN, credentials, remote host or external URL.
 * This suite does not send email, crawl, publish, run models or deploy.
 */
define('BERTINA_API_BOOTSTRAPPED',true);
$dsn=getenv('JREI_NEWS_TEST_DSN')?:'';
$user=getenv('JREI_NEWS_TEST_USER')?:'';
$password=getenv('JREI_NEWS_TEST_PASSWORD')?:'';
if ($dsn!=='mysql:host=127.0.0.1;port=3306;dbname=news_fixture;charset=utf8mb4' ||
    $user!=='root' || $password!=='fixture-password') {
    throw new RuntimeException('Refusing non-fixture DB connection');
}
$pdo=new PDO($dsn,$user,$password,[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES=>false
]);
$pdo->exec('CREATE TABLE customer_accounts (
    id CHAR(36) PRIMARY KEY,status VARCHAR(20) NOT NULL,
    email_verified_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
$pdo->exec('CREATE TABLE jrei_exam_sources (
    source_id CHAR(36) PRIMARY KEY,
    source_authority_id VARCHAR(100) NOT NULL DEFAULT \'fixture\',
    source_title VARCHAR(240) NOT NULL,
    publication_date DATE NULL,
    source_version VARCHAR(100) NOT NULL DEFAULT \'fixture-v1\',
    original_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    source_locator_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    source_locator_uri VARCHAR(1200) NULL,
    country_code CHAR(2) NOT NULL DEFAULT \'IR\',
    educational_level VARCHAR(40) NOT NULL DEFAULT \'EDUCATIONAL_NEWS\',
    exam_category VARCHAR(50) NOT NULL DEFAULT \'OFFICIAL_ANNOUNCEMENTS\',
    curriculum_version VARCHAR(100) NOT NULL DEFAULT \'NEWS_CURRENT\',
    subject_id VARCHAR(100) NOT NULL DEFAULT \'NEWS_SOURCE\',
    examination_year SMALLINT UNSIGNED NOT NULL DEFAULT 2026,
    source_kind VARCHAR(40) NOT NULL DEFAULT \'EXAM_PAPER\',
    review_state VARCHAR(40) NOT NULL,
    rights_state VARCHAR(50) NOT NULL,
    extraction_state VARCHAR(40) NOT NULL DEFAULT \'NOT_STARTED\',
    answer_key_state VARCHAR(40) NOT NULL DEFAULT \'UNKNOWN\',
    reviewer_account_id CHAR(36) NULL,
    verified_at BIGINT UNSIGNED NULL,
    is_revoked TINYINT NOT NULL DEFAULT 0,
    is_superseded TINYINT NOT NULL DEFAULT 0,
    created_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
    UNIQUE KEY uq_jrei_candidate_uri_version(source_locator_digest,source_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
$pdo->exec('CREATE TABLE jrei_ka_source_policies (
    source_id CHAR(36) PRIMARY KEY,
    revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
    refresh_interval_seconds INT UNSIGNED NOT NULL,
    scheduling_state VARCHAR(30) NOT NULL,
    rights_reviewed TINYINT NOT NULL DEFAULT 0,
    robots_terms_reviewed TINYINT NOT NULL DEFAULT 0,
    transport_reviewed TINYINT NOT NULL DEFAULT 0,
    rights_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    robots_terms_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    transport_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    priority_tier VARCHAR(10) NOT NULL,
    next_due_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
    updated_at BIGINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
$dir=dirname(__DIR__,3).'/docs/migrations';
foreach([
    '20261024_jrei_news_intelligence_mother_mysql.sql',
    '20261024_jrei_news_topic_preferences_mother_mysql.sql',
    '20261024_jrei_news_public_search_mother_mysql.sql',
    '20261024_jrei_news_feed_discovery_mother_mysql.sql'
] as $file){
    $source=file_get_contents($dir.'/'.$file);
    if(!is_string($source))throw new RuntimeException('Fixture SQL missing '.$file);
    $source=preg_replace('/^\s*--[^\r\n]*/m','',$source);
    if(!is_string($source))throw new RuntimeException('SQL comment parser failed');
    foreach(explode(';',$source) as $statement){
        $statement=trim($statement);
        if($statement==='')continue;
        $pdo->exec($statement);
    }
}
require_once dirname(__DIR__).'/php/news-library.php';
$audits=[];
function operationsAudit(PDO $pdo,?string $actor,string $action,string $ref):void {
    global $audits;
    $audits[]=[$actor,$action,$ref];
}
function ensure(bool $value,string $reason):void {
    if(!$value)throw new RuntimeException('Schema integration failed: '.$reason);
}
$account='11111111-1111-4111-8111-111111111111';
$feedId='22222222-2222-4222-8222-222222222222';
$itemId='33333333-3333-4333-8333-333333333333';
$observedId='44444444-4444-4444-8444-444444444444';
$pdo->prepare('INSERT INTO customer_accounts
    (id,status,email_verified_at) VALUES (?,"active","2026-10-23 10:00:00")')
    ->execute([$account]);
$insertSource=$pdo->prepare(
    "INSERT INTO jrei_exam_sources
     (source_id,source_title,source_locator_uri,review_state,rights_state,
      reviewer_account_id,verified_at,is_revoked,is_superseded)
     VALUES(?,?,?,'AUTHORITATIVE_REVIEWED','PERMITTED_REPRODUCTION',
            ?,?,0,0)");
$feedUrl='https://university.example.edu/rss.xml';
$articleUrl='https://university.example.edu/news/admissions-2026';
$insertSource->execute([$feedId,'Official university news feed',
    $feedUrl,$account,1792818000]);
$insertSource->execute([$itemId,'Verified official admissions article',
    $articleUrl,$account,1792818000]);
$insertPolicy=$pdo->prepare(
    "INSERT INTO jrei_ka_source_policies
     (source_id,revision,refresh_interval_seconds,scheduling_state,
      rights_reviewed,robots_terms_reviewed,transport_reviewed,
      rights_evidence_sha256,robots_terms_evidence_sha256,
      transport_evidence_sha256,priority_tier)
     VALUES (?,1,3600,'APPROVED',1,1,1,
       SHA2(CONCAT('synthetic-rights-proof:',?),256),
       SHA2(CONCAT('synthetic-robots-proof:',?),256),
       SHA2(CONCAT('synthetic-transport-proof:',?),256),'P1')");
$insertPolicy->execute([$feedId,$feedId,$feedId,$feedId]);
$insertPolicy->execute([$itemId,$itemId,$itemId,$itemId]);

$sourceSnapshot=jrNewsOriginalOfficialSourceSnapshot($pdo,$itemId,$articleUrl);
ensure($sourceSnapshot['registryState']==='AUTHORITATIVE_REVIEWED'&&
       $sourceSnapshot['exactSourceUrlApproved']===true&&
       $sourceSnapshot['rightsForPublicNews']===true,
    'real mother DB primary article source permits publisher handoff');
$wrongArticle=jrNewsOriginalOfficialSourceSnapshot(
    $pdo,$itemId,'https://university.example.edu/news/wrong-article');
ensure($wrongArticle['exactSourceUrlApproved']===false,
    'source identity cannot transfer rights to a different article URL');
$pdo->prepare('UPDATE jrei_exam_sources SET rights_state=?
    WHERE source_id=?')->execute(['PERMITTED_PRIVATE_ANALYSIS',$itemId]);
$privateOnly=jrNewsOriginalOfficialSourceSnapshot($pdo,$itemId,$articleUrl);
ensure($privateOnly['rightsForPublicNews']===false,
    'private analysis rights cannot be silently converted to public reuse');
$pdo->prepare('UPDATE jrei_exam_sources SET rights_state=?
    WHERE source_id=?')->execute(['PERMITTED_REPRODUCTION',$itemId]);
echo "PASS: mother-source attestation checks article URL and real public-use rights\\n";

$owner=[
    'source'=>'EXISTING_OPERATIONS_SESSION',
    'ownerAuthenticated'=>true,'mfaVerified'=>true,'csrfVerified'=>true,
    'scope'=>'JREI_NEWS_EDITORIAL','accountId'=>$account,
    'mfaAuditReference'=>'synthetic-test-mfa'
];
$staged=jrNewsOwnerStageSourceMonitor($pdo,$owner,$feedId,
    'universities','P0',1792820000);
ensure($staged['monitorEnabled']===false,'monitor must stage OFF');
$monitor=$staged['monitorId'];
$enabled=jrNewsOwnerEnableSourceMonitor($pdo,$owner,$monitor,[
    'source'=>'ORIGINAL_OWNER_APPROVED_JREI_RELEASE',
    'finalIntegratedAcceptanceVerified'=>true,
    'newsMonitoringActivatedByOwner'=>true
],1792820100);
ensure($enabled['enabled']===true,'fixture monitor authorized');
$sources=jrNewsExistingJreiApprovedSources($pdo,20);
ensure($sources['eligibleCount']===1,'original source adapter');
$discovery=jrNewsPrivateUuid();
$articleHash=hash('sha256',$articleUrl);
$pdo->prepare(
    "INSERT INTO jrei_news_discovered_urls
     (discovery_id,monitor_id,source_registry_id,canonical_article_url,
      canonical_url_sha256,latest_feed_sha256,discovered_headline,
      first_seen_at,last_seen_at,review_state)
     VALUES(?,?,?,?,?,?,?,1792820100,1792820100,
            'REQUIRES_ARTICLE_SOURCE_APPROVAL')"
)->execute([$discovery,$monitor,$feedId,$articleUrl,$articleHash,
    hash('sha256','synthetic feed bytes'),'Official admissions notice']);
$bound=jrNewsBindOriginalApprovedArticleSource(
    $pdo,$owner,$discovery,$itemId,1792820200);
ensure($bound['articleDownloaded']===false,'binding does not download');
$candidate=[
    'schema'=>'jr.jrei.news-feed-candidate.v1',
    'sourceId'=>$feedId,'title'=>'Official admissions notice',
    'url'=>$articleUrl,
    'sourceFingerprint'=>hash('sha256',$feedId.'|'.$articleUrl),
    'sourcePublishedAt'=>'2026-10-23T12:00:00Z',
    'evidenceStatus'=>'UNREVIEWED_METADATA'
];
$contentHash=hash('sha256','official article-body synthetic fixture');
// Synthetic, disposable ORIGINAL KA receipt: the owner must NOT accept
// an article merely because a reviewer mocked an approving callback.
// These tables deliberately live in the existing fixture mother database.
$pdo->exec('CREATE TABLE jrei_ka_jobs (
    job_id CHAR(36) PRIMARY KEY,
    source_id CHAR(36) NOT NULL,
    source_policy_revision BIGINT UNSIGNED NOT NULL,
    observed_digest CHAR(64) CHARACTER SET ascii COLLATE ascii_bin,
    job_state VARCHAR(40) NOT NULL,
    priority_tier VARCHAR(10) NOT NULL DEFAULT "P1",
    created_at BIGINT UNSIGNED NOT NULL DEFAULT 1792820100,
    updated_at BIGINT UNSIGNED NOT NULL DEFAULT 1792820200,
    bytes_observed INT UNSIGNED NOT NULL DEFAULT 100,
    last_failure_code VARCHAR(100) NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
$pdo->exec('CREATE TABLE jrei_ka_private_observations (
    observation_id CHAR(36) PRIMARY KEY,
    job_id CHAR(36) NOT NULL,
    source_id CHAR(36) NOT NULL,
    source_policy_revision BIGINT UNSIGNED NOT NULL,
    source_uri_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    content_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    state VARCHAR(60) NOT NULL,
    rights_state_at_acquisition VARCHAR(60) NOT NULL,
    bytes_total INT NOT NULL,
    private_object_key VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
$job='55555555-5555-4555-8555-555555555555';
$pdo->prepare(
    "INSERT INTO jrei_ka_jobs
      (job_id,source_id,source_policy_revision,observed_digest,job_state)
      VALUES (?,?,?,?, 'ACQUIRED_REVIEW')"
)->execute([$job,$itemId,1,$contentHash]);
$pdo->prepare(
    "INSERT INTO jrei_ka_private_observations
      (observation_id,job_id,source_id,source_policy_revision,
       source_uri_sha256,content_sha256,mime_type,state,
       rights_state_at_acquisition,bytes_total,private_object_key)
      VALUES (?,?,?,?,?,?,'text/html','PENDING_SCIENTIFIC_REVIEW',
       'PERMITTED_REPRODUCTION',100,?)"
)->execute([$observedId,$job,$itemId,1,$articleHash,$contentHash,
    $contentHash.'.bin']);
require_once dirname(__DIR__,3).'/api/operations-jrei-news.php';
$integration=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>false]
);
if(($integration['requiredMotherSchemaAvailable']??false)!==true)
    fwrite(STDERR,"News schema integrity categories: ".
        json_encode($integration['schemaBlockers']??[],JSON_UNESCAPED_SLASHES)."\n");
ensure($integration['ownerQueueAccessible']===false &&
       $integration['requiredMotherSchemaAvailable']===true &&
       $integration['publicPublicationActivatedByCheck']===false &&
       $integration['crawlerActivatedByCheck']===false,
    'pre-acceptance readiness is measured without activating news');
$rechecked=jrNewsRecheckOriginalArticleReceipt(
    $pdo,$itemId,$articleUrl,$contentHash
);
ensure($rechecked['current']===true &&
       $rechecked['rightsApproved']===true &&
       $rechecked['currentEvidenceSha256']===$contentHash,
    'verified exact ORIGINAL KA observation must be eligible');
ensure(jrNewsRecheckOriginalArticleReceipt(
    $pdo,$itemId,$articleUrl,hash('sha256','altered private article')
)['current']===false,'changed article digest rejected');
ensure(jrNewsRecheckOriginalArticleReceipt(
    $pdo,$itemId,'http://university.example.edu/news/admissions-2026',$contentHash
)['current']===false,'non-HTTPS candidate rejected');
$pdo->prepare('UPDATE jrei_exam_sources SET is_revoked=1 WHERE source_id=?')
    ->execute([$itemId]);
ensure(jrNewsRecheckOriginalArticleReceipt(
    $pdo,$itemId,$articleUrl,$contentHash
)['current']===false,'revoked original article must block owner approval');
$pdo->prepare('UPDATE jrei_exam_sources SET is_revoked=0 WHERE source_id=?')
    ->execute([$itemId]);
$pdo->prepare('UPDATE jrei_ka_source_policies SET revision=2 WHERE source_id=?')
    ->execute([$itemId]);
ensure(jrNewsRecheckOriginalArticleReceipt(
    $pdo,$itemId,$articleUrl,$contentHash
)['current']===false,'stale original article policy revision must block approval');
$pdo->prepare('UPDATE jrei_ka_source_policies SET revision=1 WHERE source_id=?')
    ->execute([$itemId]);
echo "PASS: exact licensed KA receipt validated; drift, spoofing and revocation rejected\n";
$originalObservation=static function(string $url,string $parentId,
    string $fingerprint) use($articleUrl,$feedId,$itemId,$contentHash):array {
    if($url!==$articleUrl||$parentId!==$feedId)
        throw new RuntimeException('Article evidence source mismatch');
    return [
        'source'=>'ORIGINAL_JREI_PRIVATE_OBSERVATION',
        'sourceId'=>$itemId,'articleCanonicalUrl'=>$articleUrl,
        'contentKind'=>'PUBLIC_HTML_ARTICLE',
        'articleSourceRightsApproved'=>true,'sourcePolicyCurrent'=>true,
        'contentSha256'=>$contentHash,'privateBytesAcquired'=>true
    ];
};
$receipt=jrNewsPersistObservedCandidate($pdo,$candidate,[
    'source'=>'PRIVATE_JREI_SOURCE_REGISTRY','reviewStatus'=>'APPROVED',
    'usageRights'=>'PUBLIC_REUSE_APPROVED','termsApproved'=>true,
    'robotsApproved'=>true,'sourceId'=>$feedId,'canonicalUrl'=>$feedUrl
],$originalObservation,1792820300);
ensure($receipt['state']==='PENDING_EVIDENCE_VERIFICATION',
    'candidate remains private pending review');
ensure($receipt['ownerReviewRequired']===true,'not auto approved');
ensure((int)$pdo->query('SELECT COUNT(*) FROM jrei_news_candidates')
    ->fetchColumn()===1,'private candidate inserted once');
ensure((int)$pdo->query('SELECT COUNT(*) FROM jrei_news_publications')
    ->fetchColumn()===0,'no public site publication');

$review=jrNewsApproveIndependentSourceEvidence($pdo,
    $receipt['candidateId'],[
        'role'=>'INDEPENDENT_NEWS_EVIDENCE_REVIEWER',
        'verifiedOriginalJreiSession'=>true,'mfaVerified'=>true,
        'accountId'=>$account,'issuerVerified'=>true,'licenceReviewed'=>true
    ],static function(string $sourceId,string $url,string $hash,
        string $reviewerId) use($itemId,$articleUrl,$contentHash,$account):array {
        ensure($sourceId===$itemId,'review uses approved ARTICLE source, not RSS');
        ensure($url===$articleUrl && $hash===$contentHash &&
            $reviewerId===$account,'review validates signed article observation');
        return [
            'source'=>'ORIGINAL_JREI_REVIEWED_SOURCE',
            'policyCurrent'=>true,'issuerEvidenceAccepted'=>true,
            'publicNewsReuseAllowed'=>true,
            'reviewedSourceSha256'=>$contentHash,
            'reviewerIndependentOfModel'=>true,
            'reviewEvidencePrivateRef'=>'synthetic-immutable-review-1'
        ];
    },1792820400);
ensure($review['state']==='EVIDENCE_REVIEWED',
    'independent evidence review recorded');
$fa=[
    'language'=>'fa',
    'headline'=>'آغاز ثبت نام آزمون رسمی دانشگاه در سال جدید',
    'summary'=>'اطلاعیه معتبر دانشگاه درباره شرایط و زمان ثبت نام دانشجویان منتشر شده است.',
    'body'=>'این گزارش آموزشی درباره ثبت نام دانشگاه و بررسی اطلاعیه رسمی و شرایط پذیرش توضیح می‌دهد.',
    'nextSteps'=>'برای دریافت اطلاعات دقیق به وب‌سایت رسمی دانشگاه مراجعه کنید.',
    'description'=>'اطلاعیه دانشگاه به همراه توضیح شرایط و مراحل ثبت نام رسمی آزمون دانشجویان.',
    'sourceUrl'=>$articleUrl
];
$en=[
    'language'=>'en',
    'headline'=>'Official university admission registration announced',
    'summary'=>'The verified university notice explains the current admissions registration process and requirements.',
    'body'=>'This educational report summarizes the published university announcement and describes how readers can check the official admissions requirements.',
    'nextSteps'=>'Read the original university announcement and verify the application deadline.',
    'description'=>'Official educational news about university admissions registration, deadlines, requirements and the original announcement.',
    'sourceUrl'=>$articleUrl
];
$draft=jrNewsStoreEvidenceReviewedDraft($pdo,$receipt['candidateId'],
    $review['reviewId'],[
        'fa'=>$fa,'en'=>$en,
        'imageAssetReference'=>'assets/images/news/university.webp',
        'internalLinks'=>[]
    ],static fn(string $action):bool=>$action==='NEWS_PRIVATE_DRAFT',
      static fn(string $asset):bool=>
        $asset==='assets/images/news/university.webp',1792820500);
ensure($draft['readyForOwnerPreview']===true,'private bilingual draft staged');

$officialPolicy=static function(array $context):array {
    return [
        'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_POLICY',
        'evidence'=>[
            'source'=>'ORIGINAL_JREI_VERIFIED_ARTICLE_EVIDENCE',
            'currentIssuerEvidence'=>true,
            'verifiedContentSha256'=>$context['evidenceSha256'],
            'claimsMatchPrimaryNotice'=>true,
            'noMaterialContradictions'=>true
        ],
        'editorial'=>[
            'source'=>'ORIGINAL_JREI_EDITORIAL_QA',
            'bilingualComplete'=>true,'authorVoiceQualityPassed'=>true,
            'newsGuidanceComplete'=>true,'internalLinksChecked'=>true,
            'seoAndCanonicalChecked'=>true,'imageRightsCurrent'=>true,
            'assistantContextGrounded'=>true
        ],
        'publisher'=>[
            'source'=>'ORIGINAL_AUTHENTICATED_CMS_POLICY',
            'originalCmsConnected'=>true,'exactRoutesCollisionFree'=>true,
            'authenticatedPublishReceiptSupported'=>true
        ]
    ];
};
$autoReadiness=jrNewsOriginalAutoHandoffReadiness(
    $pdo,$draft['revisionId'],$officialPolicy
);
ensure(($autoReadiness['decision']??null)==='ELIGIBLE_FOR_AUTOMATED_CMS_HANDOFF'&&
       $autoReadiness['published']===false&&
       $autoReadiness['requiresTransactionalPublisherRecheck']===true&&
       (int)$pdo->query('SELECT COUNT(*) FROM jrei_news_publications')
           ->fetchColumn()===0,
    'verified MariaDB editorial revision is only proposed, never fabricated published');
$uncertainAuto=jrNewsOriginalAutoHandoffReadiness(
    $pdo,$draft['revisionId'],
    static function(array $context) use($officialPolicy):array {
        $r=$officialPolicy($context);
        $r['evidence']['noMaterialContradictions']=false;
        return $r;
    }
);
ensure(($uncertainAuto['decision']??null)==='OWNER_EXCEPTION_QUEUE',
    'contradictory official claim is sent only to owner exception review');

$pdo->prepare('UPDATE jrei_exam_sources SET is_revoked=1 WHERE source_id=?')
    ->execute([$itemId]);
$revokedAuto=jrNewsOriginalAutoHandoffReadiness(
    $pdo,$draft['revisionId'],
    static fn():never=>throw new RuntimeException(
        'Revoked source must never invoke a model or publisher')
);
ensure(($revokedAuto['decision']??null)==='OWNER_EXCEPTION_QUEUE'&&
       in_array('SOURCE_AUTHORITY_UNCONFIRMED',
           $revokedAuto['concerns']??[],true),
    'revoked source is held for review without any external QA model call');

$pdo->prepare('UPDATE jrei_exam_sources SET is_revoked=1 WHERE source_id=?')
    ->execute([$feedId]);
$revokedFeed=jrNewsOriginalAutoHandoffReadiness(
    $pdo,$draft['revisionId'],
    static fn():never=>throw new RuntimeException(
        'Revoked feed must never reach model or CMS'));
ensure(($revokedFeed['decision']??null)==='SYSTEM_HOLD',
    'revoked upstream original feed blocks downstream article publication');
$pdo->prepare('UPDATE jrei_exam_sources SET is_revoked=0 WHERE source_id=?')
    ->execute([$feedId]);
$pdo->prepare('UPDATE jrei_ka_source_policies SET revision=2 WHERE source_id=?')
    ->execute([$feedId]);
$staleFeedPolicy=jrNewsOriginalAutoHandoffReadiness(
    $pdo,$draft['revisionId'],
    static fn():never=>throw new RuntimeException(
        'Stale feed policy must never reach model or CMS'));
ensure(($staleFeedPolicy['decision']??null)==='SYSTEM_HOLD',
    'stale original JREI feed policy blocks automated news flow');
$pdo->prepare('UPDATE jrei_ka_source_policies SET revision=1 WHERE source_id=?')
    ->execute([$feedId]);

$pdo->prepare('UPDATE jrei_exam_sources SET is_revoked=0 WHERE source_id=?')
    ->execute([$itemId]);

$offlineAuto=jrNewsOriginalAutoHandoffReadiness(
    $pdo,$draft['revisionId'],
    static function(array $context) use($officialPolicy):array {
        $r=$officialPolicy($context);
        $r['publisher']['originalCmsConnected']=false;
        return $r;
    }
);
ensure(($offlineAuto['decision']??null)==='SYSTEM_HOLD'&&
       $offlineAuto['humanPerArticleApprovalRequired']===false,
    'missing CMS must be an operational hold, not owner content approval');
echo "PASS: mother-DB verified original draft auto handoff and exception isolation\\n";

$preview=jrNewsPrivateOwnerPreview($pdo,$owner,$draft['revisionId']);
ensure($preview['approvalDigest']===$draft['approvalDigest'],
    'owner sees original immutable SHA');
ensure($preview['proposedBilingualRoutes']['fa']===$draft['routeProposal']['faPath'],
    'owner sees exact drafted route');
$decision=jrNewsPrivateRecordDecision($pdo,$owner,$draft['revisionId'],
    $draft['approvalDigest'],'APPROVE',1792820600,
    static fn(string $sourceId,string $url,string $hash):array=>
        jrNewsRecheckOriginalArticleReceipt($pdo,$sourceId,$url,$hash));
ensure($decision['editorialState']==='OWNER_APPROVED',
    'owner decision committed');
$preflight=jrNewsOwnerPublicationReadiness(
    $pdo,$owner,$draft['revisionId'],
    static fn(string $sourceId,string $url,string $hash):array=>
        jrNewsRecheckOriginalArticleReceipt($pdo,$sourceId,$url,$hash),
    dirname(__DIR__,3)
);
ensure($preflight['schema']==='jr.jrei.news-owner-publication-readiness.v1'&&
       $preflight['publisherReady']===false&&
       $preflight['published']===false&&
       $preflight['checks']['ownerApprovalAndExactDigest']===true&&
       $preflight['checks']['licensedOriginalSourceCurrent']===true&&
       $preflight['checks']['bilingualRoutesFromApprovedDraft']===true&&
       in_array('ORIGINAL_CMS_PUBLISHER_NOT_CONNECTED',
           $preflight['blockers'],true),
       'MFA-approved original source does not imply a connected public CMS');
$queued=jrNewsStageFromApprovedStoredRouteProposal($pdo,$owner,
    $draft['revisionId'],
    static function(array $params)use($itemId):array{
        ensure($params['articleSourceId']===$itemId,
            'publisher policy receives ARTICLE id, never RSS');
        return [
            'source'=>'ORIGINAL_CMS_AND_JREI_POLICY',
            'ownerMfaCurrent'=>true,
            'sourceStillOfficialAndCurrent'=>true,
            'imageRightsCurrent'=>true,
            'immutableUrlRegistryChecked'=>true,
            'noExistingPathCollision'=>true,
            'bothLanguagesReviewed'=>true,
            'approvalDigest'=>$params['approvalDigest']
        ];
    },1792820700);
ensure($queued['state']==='WAITING_FOR_PUBLISHER',
    'owner approval queues, never pretends to publish');
ensure((int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_publications WHERE publisher_state='PUBLISHED'"
)->fetchColumn()===0,'approval cannot fabricate CMS receipt');
echo "PASS: disposable MariaDB full RSS -> verified article -> bilingual draft -> MFA owner -> private publisher queue\n";

$publicationId=$queued['publicationId'];
$fakeAttempt=false;
try {
    jrNewsConfirmOriginalCmsPublication($pdo,$publicationId,[
        'source'=>'ORIGINAL_PRIVATE_CMS',
        'finalIntegratedAcceptanceVerified'=>true,
        'ownerAuthorizedActivation'=>true
    ],static fn(array $ctx):array=>[
        'source'=>'FORGED_BROWSER_CMS','verified'=>true,
        'faRoute'=>$ctx['faRoute'],'enRoute'=>$ctx['enRoute']
    ],1792820800);
}catch(RuntimeException $e){$fakeAttempt=true;}
ensure($fakeAttempt,'forged publisher receipts must be rejected');
ensure((int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_publications WHERE publisher_state='PUBLISHED'"
)->fetchColumn()===0,'forged receipt did not publish');
$faPublicHash=hash('sha256','synthetic validated Persian canonical HTML');
$enPublicHash=hash('sha256','synthetic validated English canonical HTML');
$cmsOriginalReceipt='test-cms-signed-publication-receipt-1';
$confirmed=jrNewsConfirmOriginalCmsPublication(
    $pdo,$publicationId,[
        'source'=>'ORIGINAL_PRIVATE_CMS',
        'finalIntegratedAcceptanceVerified'=>true,
        'ownerAuthorizedActivation'=>true
    ],
    static function(array $ctx) use(
      $faPublicHash,$enPublicHash,$cmsOriginalReceipt):array {
        return [
            'source'=>'ORIGINAL_AUTHENTICATED_CMS',
            'verified'=>true,
            'faRoute'=>$ctx['faRoute'],
            'enRoute'=>$ctx['enRoute'],
            'approvalDigest'=>$ctx['approvalDigest'],
            'bothCanonicalDocumentsVerified'=>true,
            'sourceRecheckedAfterPublication'=>true,
            'faContentSha256'=>$faPublicHash,
            'enContentSha256'=>$enPublicHash,
            'receiptReference'=>$cmsOriginalReceipt
        ];
    },1792820900);
ensure($confirmed['status']==='PUBLISHED',
    'only signed verified CMS receipt advances fixture publication');
$publisherProof=static function(
    string $receiptRef,string $route,string $hash
)use($cmsOriginalReceipt,$faPublicHash,$enPublicHash,$draft):array{
    ensure($receiptRef===$cmsOriginalReceipt,'CMS receipt provenance');
    ensure(in_array($hash,[$faPublicHash,$enPublicHash],true),
        'CMS approved content hash matches');
    return [
        'source'=>'ORIGINAL_AUTHENTICATED_CMS',
        'verified'=>true,'route'=>$route,
        'contentSha256'=>$hash,
        'ownerApprovalDigest'=>$draft['approvalDigest']
    ];
};
$countryProof=static function(string $sourceUrl,string $hash,string $pubId)
  use($articleUrl,$contentHash,$publicationId):array {
    ensure($sourceUrl===$articleUrl&&$hash===$contentHash&&
        $pubId===$publicationId,'only original article source country accepted');
    return [
        'source'=>'ORIGINAL_JREI_REVIEWED_SOURCE_REGISTRY',
        'current'=>true,'contentSha256'=>$contentHash,
        'countryCode'=>'ZZ'
    ];
};
foreach(['fa','en'] as $locale){
    $indexed=jrNewsIndexApprovedPublication($pdo,$publicationId,$locale,
        $publisherProof,$countryProof,1792821000);
    ensure($indexed['publicSearchEligible']===true,
        'published approved news enters correct language index');
    ensure($indexed['countryCode']==='ZZ',
        'no fabricated national attribution');
}
$searchEnglish=jrNewsPublishedSearch($pdo,'university','en',20,
    ['country'=>'ZZ']);
ensure($searchEnglish['result_count']===1,
    'only signed English news is searchable');
ensure($searchEnglish['results'][0]['url']===
    'https://drjavadrezazadeh.com'.$draft['routeProposal']['enPath'],
    'English canonical points to existing news-insights archive');
$searchPersian=jrNewsPublishedSearch($pdo,'دانشگاه','fa',20);
ensure($searchPersian['result_count']===1,
    'published Persian news indexed with unicode search');
ensure((int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_search_documents WHERE index_state='PUBLISHED'"
)->fetchColumn()===2,'only two published language records indexed');
echo "PASS: forged CMS rejected, authenticated fixture receipt, bilingual searchable index, original canonicals\n";



// Source-only dashboard composition is authenticated under the exact same
// server-owned MFA context and must not write editorial or publisher rows.
putenv('JR_JREI_NEWS_API_ENABLED=true');
try{
    $snapshot=jrNewsDispatchApi($pdo,'GET','/news/v1/owner/snapshot',
        [],[
            'originalApiBootstrap'=>true,
            'finalIntegratedAcceptanceVerified'=>true,
            'ownerAuthorizedActivation'=>true,
            'existingOwnerMfaSession'=>$owner
        ],
        static fn():never=>throw new RuntimeException('not_consumed'),
        static fn():bool=>false,
        static fn():never=>throw new RuntimeException('not_consumed'),
        static fn():never=>throw new RuntimeException('not_consumed')
    );
    ensure(($snapshot['schema']??null)==='jr.jrei.news-owner-bounded-snapshot.v1',
        'owner snapshot schema');
    ensure(count($snapshot['views'])===7 &&
           count($snapshot['viewStatus'])===7 &&
           !in_array('UNAVAILABLE',$snapshot['viewStatus'],true) &&
           ($snapshot['allSectionsAvailable']??null)===true &&
           ($snapshot['views']['jobs']['schema']??null)===
             'jr.jrei.news-original-jrei-queue-observability.v1' &&
           ($snapshot['views']['queue']['schema']??null)===
             'jr.jrei.news-owner-review-queue.v1' &&
           ($snapshot['views']['overview']['schema']??null)===
             'jr.jrei.news-owner-operations-overview.v1' &&
           ($snapshot['privateWritesPerformed']??null)===false &&
           ($snapshot['publiclyPublishedBySnapshot']??null)===false,
           'bounded original owner snapshot without publication or writes');
    $rejected=false;
    try{
        jrNewsDispatchApi($pdo,'GET','/news/v1/owner/snapshot',[],[
            'originalApiBootstrap'=>true,
            'finalIntegratedAcceptanceVerified'=>true,
            'ownerAuthorizedActivation'=>true,
            'existingOwnerMfaSession'=>array_replace($owner,['mfaVerified'=>false])
        ],
            static fn():never=>throw new RuntimeException('not_consumed'),
            static fn():bool=>false,
            static fn():never=>throw new RuntimeException('not_consumed'),
            static fn():never=>throw new RuntimeException('not_consumed')
        );
    }catch(RuntimeException $e){$rejected=true;}
    ensure($rejected,'a forged MFA owner snapshot must be rejected');
    echo "PASS: MFA-bound seven-section newsroom snapshot and no write side effects\n";
} finally {
    putenv('JR_JREI_NEWS_API_ENABLED');
}


// Schema readiness must fail closed if a REQUIRED migration has not landed,
// even if six older newsroom tables and every activation flag exist.
$complete=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($complete['requiredMotherTableCount']===16 &&
       $complete['verifiedMotherTableCount']===16 &&
       $complete['requiredMotherSchemaAvailable']===true &&
       $complete['originalCmsPublisherConnected']===false &&
       $complete['publisherReceiptVerified']===false,
    'complete disposable mother schema is measured, not a CMS receipt');
// Existing migrations may have all UNIQUEs yet omit a searchable FULLTEXT
// index, a performance index or a non-key column. Every case must fail shut.
$pdo->exec('ALTER TABLE jrei_news_search_documents
    DROP INDEX ft_jrei_news_public_text');
$missingFulltext=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($missingFulltext['requiredMotherSchemaAvailable']===false &&
       $missingFulltext['verifiedMotherTableCount']===15 &&
       $missingFulltext['originalNewsTables']['jrei_news_search_documents']==='UNAVAILABLE',
    'missing public FULLTEXT index blocks readiness');
$pdo->exec('ALTER TABLE jrei_news_search_documents
    ADD FULLTEXT KEY ft_jrei_news_public_text(title,summary,searchable_body)');
$fulltextRestored=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($fulltextRestored['requiredMotherSchemaAvailable']===true,
    'restored public FULLTEXT index passes');

$pdo->exec('ALTER TABLE jrei_news_search_documents
    DROP INDEX idx_jrei_news_search_topic');
$pdo->exec('ALTER TABLE jrei_news_search_documents
    ADD KEY idx_jrei_news_search_topic(category_code,language_code,index_state,published_at)');
$wrongIndexOrder=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($wrongIndexOrder['requiredMotherSchemaAvailable']===false &&
       $wrongIndexOrder['originalNewsTables']['jrei_news_search_documents']==='UNAVAILABLE',
    'incorrect composite BTREE column order blocks readiness');
$pdo->exec('ALTER TABLE jrei_news_search_documents
    DROP INDEX idx_jrei_news_search_topic');
$pdo->exec('ALTER TABLE jrei_news_search_documents
    ADD KEY idx_jrei_news_search_topic(language_code,category_code,index_state,published_at)');
$indexRestored=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($indexRestored['requiredMotherSchemaAvailable']===true,
    'restored ordered BTREE composite index passes');

$pdo->exec('ALTER TABLE jrei_news_search_documents
    DROP COLUMN country_code');
$missingOptionalColumn=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($missingOptionalColumn['requiredMotherSchemaAvailable']===false &&
       $missingOptionalColumn['verifiedMotherTableCount']===15 &&
       $missingOptionalColumn['originalNewsTables']['jrei_news_search_documents']==='UNAVAILABLE',
    'missing non-key migration column blocks readiness');
$pdo->exec("ALTER TABLE jrei_news_search_documents
    ADD COLUMN country_code CHAR(2) NOT NULL DEFAULT 'ZZ'");
$columnRestored=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($columnRestored['requiredMotherSchemaAvailable']===true,
    'restored full 124-column news contract passes');

// Wrong types and nullability must not pass simply because every expected
// column name, index and FK exists.
$pdo->exec("ALTER TABLE jrei_news_search_documents
    MODIFY country_code VARCHAR(3) NOT NULL DEFAULT 'ZZ'");
$wrongColumnType=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($wrongColumnType['requiredMotherSchemaAvailable']===false &&
       $wrongColumnType['originalNewsTables']['jrei_news_search_documents']==='UNAVAILABLE',
    'widened varchar replaces expected CHAR(2) and blocks activation');
$pdo->exec("ALTER TABLE jrei_news_search_documents
    MODIFY country_code CHAR(2) NULL DEFAULT 'ZZ'");
$wrongNullable=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($wrongNullable['requiredMotherSchemaAvailable']===false,
    'nullable replacement of mandatory country code blocks activation');
$pdo->exec("ALTER TABLE jrei_news_search_documents
    MODIFY country_code CHAR(2) NOT NULL DEFAULT 'ZZ'");
$exactTypeRestored=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($exactTypeRestored['requiredMotherSchemaAvailable']===true,
    'restoring exact data type and NOT NULL returns readiness');

// Defaulting human evidence verification to TRUE is an unsafe schema drift,
// even when types, indexes, primary keys and foreign keys are intact.
$pdo->exec('ALTER TABLE jrei_news_evidence_reviews
    ALTER COLUMN issuer_verified SET DEFAULT 1');
$unsafeEvidenceDefault=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($unsafeEvidenceDefault['requiredMotherSchemaAvailable']===false &&
       $unsafeEvidenceDefault['originalNewsTables']['jrei_news_evidence_reviews']==='UNAVAILABLE' &&
       in_array('UNSAFE_COLUMN_DEFAULT',
           $unsafeEvidenceDefault['schemaBlockers']['jrei_news_evidence_reviews']??[],true),
    'evidence issuer-verified default cannot silently become true');
$pdo->exec('ALTER TABLE jrei_news_evidence_reviews
    ALTER COLUMN issuer_verified SET DEFAULT 0');
ensure(jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
)['requiredMotherSchemaAvailable']===true,
    'restoring human evidence default to unverified returns readiness');

// A different initial default must not silently activate monitoring.
$pdo->exec('ALTER TABLE jrei_news_monitors
    ALTER COLUMN enabled SET DEFAULT 1');
$unsafeDefault=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($unsafeDefault['requiredMotherSchemaAvailable']===false &&
       $unsafeDefault['originalNewsTables']['jrei_news_monitors']==='UNAVAILABLE',
    'monitor default enabled=1 is not an approved migration');
$pdo->exec('ALTER TABLE jrei_news_monitors
    ALTER COLUMN enabled SET DEFAULT 0');
ensure(jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
)['requiredMotherSchemaAvailable']===true,
    'restored disabled monitor default passes');

$pdo->exec('ALTER TABLE jrei_news_delivery_receipts DROP PRIMARY KEY');
$missingPrimary=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($missingPrimary['requiredMotherSchemaAvailable']===false &&
       $missingPrimary['originalNewsTables']['jrei_news_delivery_receipts']==='UNAVAILABLE',
    'delivery receipt immutable primary key cannot be omitted');
$pdo->exec('ALTER TABLE jrei_news_delivery_receipts
    ADD PRIMARY KEY (delivery_id)');
ensure(jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
)['requiredMotherSchemaAvailable']===true,
    'restored receipt primary key passes');

// All expected FKs must also exist: a permissive or dropped original
// publisher reference is NOT a completed mother-database migration.
$pdo->exec('ALTER TABLE jrei_news_search_documents
    DROP FOREIGN KEY fk_jrei_news_search_pub');
$missingForeignKey=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($missingForeignKey['requiredMotherSchemaAvailable']===false &&
       $missingForeignKey['verifiedMotherTableCount']===15 &&
       $missingForeignKey['originalNewsTables']['jrei_news_search_documents']==='UNAVAILABLE' &&
       $missingForeignKey['ownerQueueAccessible']===false,
    'missing original publisher foreign key blocks activation');
$pdo->exec('ALTER TABLE jrei_news_search_documents
    ADD CONSTRAINT fk_jrei_news_search_pub
    FOREIGN KEY(publication_id)
    REFERENCES jrei_news_publications(publication_id) ON DELETE CASCADE');
$weakenedForeignKey=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($weakenedForeignKey['requiredMotherSchemaAvailable']===false &&
       $weakenedForeignKey['originalNewsTables']['jrei_news_search_documents']==='UNAVAILABLE',
    'incorrect ON DELETE CASCADE cannot pass immutable publication linkage');
$pdo->exec('ALTER TABLE jrei_news_search_documents
    DROP FOREIGN KEY fk_jrei_news_search_pub');
$pdo->exec('ALTER TABLE jrei_news_search_documents
    ADD CONSTRAINT fk_jrei_news_search_pub
    FOREIGN KEY(publication_id)
    REFERENCES jrei_news_publications(publication_id) ON DELETE RESTRICT');
$foreignKeyRestored=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($foreignKeyRestored['requiredMotherSchemaAvailable']===true,
    'restored exact original publisher foreign key returns readiness');

// A partial migration may have ALL the expected columns but lack the
// uniqueness constraints that prevent canonical-route reuse.
$pdo->exec('ALTER TABLE jrei_news_search_documents
    DROP INDEX uq_jrei_news_search_route');
$missingUnique=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($missingUnique['requiredMotherSchemaAvailable']===false &&
       $missingUnique['verifiedMotherTableCount']===15 &&
       $missingUnique['originalNewsTables']['jrei_news_search_documents']==='UNAVAILABLE' &&
       $missingUnique['ownerQueueAccessible']===false,
    'missing UNIQUE canonical route constraint blocks activation');
$pdo->exec('ALTER TABLE jrei_news_search_documents
    ADD UNIQUE KEY uq_jrei_news_search_route(public_route)');
$uniqueRestored=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($uniqueRestored['requiredMotherSchemaAvailable']===true,
    'restored unique canonical index returns readiness');

$pdo->exec('DROP TABLE jrei_news_topic_follows');
$incomplete=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($incomplete['requiredMotherSchemaAvailable']===false &&
       $incomplete['verifiedMotherTableCount']===15 &&
       $incomplete['originalNewsTables']['jrei_news_topic_follows']==='UNAVAILABLE' &&
       $incomplete['ownerQueueAccessible']===false &&
       $incomplete['publicPublicationActivatedByCheck']===false,
    'partial migration fails closed even when release flag is asserted');
$pdo->exec('CREATE TABLE jrei_news_topic_follows (
    follow_id CHAR(36) PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
$partial=jrOperationsNewsReadiness(
    $pdo,['jrei_news_integrated_release_accepted'=>true]
);
ensure($partial['originalNewsTables']['jrei_news_topic_follows']==='UNAVAILABLE' &&
       $partial['verifiedMotherTableCount']===15 &&
       $partial['ownerQueueAccessible']===false,
    'existing table with missing columns is NOT a completed migration');
echo "PASS: mother-schema readiness rejects missing foreign keys, weakened actions and incomplete columns\\n";


/* Retraction must not trust caller-supplied claims about a publisher.
 * Both canonical languages and the original receipt must be independently
 * checked before transactional search/distribution withdrawal.
 */
$retractionAt=1792821200;
$reason='The source notice was withdrawn and requires a transparent correction.';
$distributionPort=static function(PDO $db,string $id,string $reason)
    use($publicationId):int {
    ensure($db->inTransaction()&&$id===$publicationId&&
        $reason==='NEWS_RETRACTED','existing queue suppression is transactional');
    return 0;
};
$forgeryRejected=false;
try{
    jrNewsConfirmReviewedRetraction($pdo,$owner,$publicationId,$reason,
        static fn(array $ctx):array=>[
            'source'=>'BROWSER_SUPPLIED_CMS',
            'verified'=>true,'publicationId'=>$ctx['publicationId']
        ],$distributionPort,$retractionAt);
}catch(RuntimeException $e){$forgeryRejected=true;}
ensure($forgeryRejected,'forged original CMS retraction denied');
ensure((int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_publications WHERE publisher_state='PUBLISHED'"
)->fetchColumn()===1,'forged retraction left publication unchanged');
ensure((int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_search_documents WHERE index_state='PUBLISHED'"
)->fetchColumn()===2,'forged retraction left both public search languages unchanged');
$verifiedRetraction=static function(array $ctx)use($retractionAt):array{
    return [
        'source'=>'ORIGINAL_AUTHENTICATED_CMS','verified'=>true,
        'originalOwnerApprovalCurrent'=>true,
        'bothCanonicalRoutesVerified'=>true,
        'canonicalAndSitemapUpdated'=>true,
        'publicationId'=>$ctx['publicationId'],
        'originalPublisherReceipt'=>$ctx['originalPublisherReceipt'],
        'faRoute'=>$ctx['faRoute'],'enRoute'=>$ctx['enRoute'],
        'faOutcome'=>'RETRACTION_NOTICE','enOutcome'=>'VERIFIED_404',
        'faVerifiedContentSha256'=>hash('sha256','synthetic Persian retraction notice'),
        'enVerifiedContentSha256'=>hash('sha256','synthetic English verified 404'),
        'verifiedAtEpoch'=>$retractionAt,
        'receiptReference'=>'test-original-CMS-two-language-retraction-receipt'
    ];
};
$wrongLanguageRejected=false;
try{
    jrNewsConfirmReviewedRetraction($pdo,$owner,$publicationId,$reason,
        static function(array $ctx)use($verifiedRetraction):array{
            $proof=$verifiedRetraction($ctx);
            $proof['enRoute']='/en/news-insights/other-story/';
            return $proof;
        },$distributionPort,$retractionAt);
}catch(RuntimeException $e){$wrongLanguageRejected=true;}
ensure($wrongLanguageRejected,'one-language forged canonical rejected');
$retracted=jrNewsConfirmReviewedRetraction($pdo,$owner,$publicationId,
    $reason,$verifiedRetraction,$distributionPort,$retractionAt);
ensure(($retracted['state']??null)==='RETRACTED'&&
       ($retracted['bothOriginalCmsLanguageRoutesVerified']??null)===true,
       'authentic bilingual CMS receipt required for retraction');
ensure((int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_search_documents WHERE index_state='RETRACTED'"
)->fetchColumn()===2,'both language search projections retracted');
ensure(jrNewsPublishedSearch($pdo,'university','en')['result_count']===0 &&
       jrNewsPublishedSearch($pdo,'دانشگاه','fa')['result_count']===0,
       'retracted stories vanish from public search in both languages');
$repeat=jrNewsConfirmReviewedRetraction($pdo,$owner,$publicationId,$reason,
    static fn(array $ctx):never=>
        throw new RuntimeException('duplicate must not trigger CMS call'),
    $distributionPort,$retractionAt);
ensure(($repeat['state']??null)==='ALREADY_RETRACTED',
    'duplicate original retraction is idempotent');
echo "PASS: forged CMS retraction denied; verified bilingual withdrawal hides both search results\n";


/*
 * Second, deliberately ADDITIVE policy migration is applied only to the
 * disposable news_fixture database after legacy manual publishing tests.
 * No production SQL. Existing owner decision/retraction rows must survive.
 */
// Prior fail-closed tests intentionally left a partial follow table.
// Restore the exact original topic migration in the DISPOSABLE fixture
// before verifying the additive standing-policy upgrade.
$pdo->exec('DROP TABLE jrei_news_topic_follows');
$topics=file_get_contents(dirname(__DIR__,3).
    '/docs/migrations/20261024_jrei_news_topic_preferences_mother_mysql.sql');
$topics=preg_replace('/^\\s*--[^\\r\\n]*/m','',(string)$topics);
foreach(explode(';',(string)$topics) as $statement){
    if(trim($statement)!=='')$pdo->exec(trim($statement));
}
$migration=file_get_contents(dirname(__DIR__,3).
    '/docs/migrations/20261025_jrei_news_standing_official_publication_mother_mysql.sql');
ensure(is_string($migration),'standing policy migration source exists');
$migration=preg_replace('/^\s*--[^\r\n]*/m','',$migration);
foreach(explode(';',(string)$migration) as $statement){
    $statement=trim($statement);
    if($statement!=='')$pdo->exec($statement);
}
ensure((int)$pdo->query(
    'SELECT COUNT(*) FROM jrei_news_publications WHERE approved_decision_id IS NOT NULL'
)->fetchColumn()===1,'old manually approved published story remains intact');
$upgradedReadiness=jrOperationsNewsReadiness($pdo,
    ['jrei_news_integrated_release_accepted'=>false]);
if(($upgradedReadiness['standingOfficialPolicySchemaAvailable']??false)!==true ||
   ($upgradedReadiness['requiredMotherSchemaAvailable']??false)!==true)
    fwrite(STDERR,'Standing upgrade metadata: '.
        json_encode([
            'standing'=>$upgradedReadiness['standingOfficialPolicySchemaAvailable']??null,
            'blockers'=>$upgradedReadiness['schemaBlockers']??[],
            'verified'=>$upgradedReadiness['verifiedMotherTableCount']??null
        ],JSON_UNESCAPED_SLASHES)."\\n");
ensure(($upgradedReadiness['standingOfficialPolicySchemaAvailable']??false)===true &&
       $upgradedReadiness['requiredMotherSchemaAvailable']===true &&
       $upgradedReadiness['verifiedMotherTableCount']===16,
    'additive standing policy migration preserves all sixteen original schema checks');


$incorrectGrant=false;
try{
    jrNewsGrantStandingOfficialPolicy($pdo,$owner,'ALLOW_ALL_NEWS',1792822100);
}catch(RuntimeException $e){$incorrectGrant=true;}
ensure($incorrectGrant,'unauthorized blanket policy grant is rejected');
$policy=jrNewsGrantStandingOfficialPolicy($pdo,$owner,
    'AUTHORIZE_VERIFIED_PRIMARY_OFFICIAL_NEWS',1792822200,30);
ensure($policy['individualNewsApproved']===false&&
       $policy['ownerMfaAuditRecorded']===true,
    'owner standing policy is durable, MFA-bound and not an article decision');

$updatedEnglish=$en;
$updatedEnglish['headline']='Official university scholarship deadline update for applicants';
$updatedEnglish['body']=$en['body'].' The new notice provides official scholarship details.';
$autoDraft=jrNewsStoreEvidenceReviewedDraft(
    $pdo,$receipt['candidateId'],$review['reviewId'],[
        'fa'=>$fa,'en'=>$updatedEnglish,
        'imageAssetReference'=>'assets/images/news/university.webp',
        'internalLinks'=>[]
    ],static fn(string $action):bool=>$action==='NEWS_PRIVATE_DRAFT',
      static fn(string $asset):bool=>
        $asset==='assets/images/news/university.webp',1792822300);
$autoStage=jrNewsStageStandingOfficialPublication(
    $pdo,$autoDraft['revisionId'],$policy['policyId'],
    $officialPolicy,1792822400);
ensure($autoStage['state']==='WAITING_FOR_PUBLISHER'&&
       $autoStage['publishedByThisCall']===false,
    'auto publication is staged under standing policy but never self-published');
$raw=$pdo->prepare(
    'SELECT approved_decision_id,standing_policy_id,publisher_state
     FROM jrei_news_publications WHERE publication_id=?');
$raw->execute([$autoStage['publicationId']]);
$storedAuto=$raw->fetch(PDO::FETCH_ASSOC);
ensure($storedAuto['approved_decision_id']===null&&
       $storedAuto['standing_policy_id']===$policy['policyId']&&
       $storedAuto['publisher_state']==='WAITING_FOR_PUBLISHER',
    'no per-article owner decision is fabricated');
$second=jrNewsStageStandingOfficialPublication(
    $pdo,$autoDraft['revisionId'],$policy['policyId'],
    $officialPolicy,1792822401);
ensure($second['alreadyStaged']===true&&
       $second['publicationId']===$autoStage['publicationId'],
    'automated stage is exactly once for same revision');
$fakeBothRejected=false;
try{
    $q=$pdo->prepare('UPDATE jrei_news_publications
        SET approved_decision_id=? WHERE publication_id=?');
    $q->execute([$decision['decisionId'],$autoStage['publicationId']]);
}catch(PDOException $e){$fakeBothRejected=true;}
ensure($fakeBothRejected,'manual and standing policy cannot both authorize one record');
$cmsActivation=[
    'source'=>'ORIGINAL_PRIVATE_CMS',
    'finalIntegratedAcceptanceVerified'=>true,
    'standingOfficialNewsPublishingEnabled'=>true
];
$forgedAuto=false;
try{
    jrNewsConfirmStandingOriginalCmsPublication($pdo,
        $autoStage['publicationId'],$cmsActivation,$officialPolicy,
        static function(array $ctx):array{
            return ['source'=>'BROWSER_FORGED_CMS','verified'=>true,
                'standingPolicyId'=>$ctx['policyId']];
        },1792822420);
}catch(RuntimeException $e){$forgedAuto=true;}
ensure($forgedAuto,'forged standing policy CMS receipt cannot publish');
ensure((int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_publications WHERE publisher_state='PUBLISHED'"
)->fetchColumn()===0,'forged auto CMS receipt left all pages unpublished');
$standingReceipt=jrNewsConfirmStandingOriginalCmsPublication(
    $pdo,$autoStage['publicationId'],$cmsActivation,$officialPolicy,
    static function(array $ctx):array{
        return [
            'source'=>'ORIGINAL_AUTHENTICATED_CMS','verified'=>true,
            'bothCanonicalDocumentsVerified'=>true,
            'sourceRecheckedAfterPublication'=>true,
            'publicationId'=>$ctx['publicationId'],
            'faRoute'=>$ctx['faRoute'],'enRoute'=>$ctx['enRoute'],
            'approvalDigest'=>$ctx['approvalDigest'],
            'standingPolicyId'=>$ctx['policyId'],
            'faContentSha256'=>hash('sha256','synthetic standing Persian canonical'),
            'enContentSha256'=>hash('sha256','synthetic standing English canonical'),
            'receiptReference'=>'fixture-standing-original-auth-cms'
        ];
    },1792822430);
ensure(($standingReceipt['status']??null)==='PUBLISHED'&&
       $standingReceipt['cmsDocumentHashesVerified']===true,
    'only authentic CMS receipt advances standing story');
ensure((int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_publications WHERE publisher_state='PUBLISHED'"
)->fetchColumn()===1,'verified standing story alone is published in disposable fixture');

$standingPublisherProof=static function(string $reference,string $path,string $digest)
    use($autoDraft):array {
    ensure($reference==='fixture-standing-original-auth-cms',
        'standing source receipt must match authenticated CMS');
    return [
        'source'=>'ORIGINAL_AUTHENTICATED_CMS','verified'=>true,
        'route'=>$path,'contentSha256'=>$digest,
        'ownerApprovalDigest'=>$autoDraft['approvalDigest']
    ];
};
$standingCountry=static function(string $url,string $hash,string $publication)
    use($articleUrl,$contentHash,$autoStage):array{
    ensure($url===$articleUrl && $hash===$contentHash &&
           $publication===$autoStage['publicationId'],
        'standing source country must derive from original verified article');
    return [
        'source'=>'ORIGINAL_JREI_REVIEWED_SOURCE_REGISTRY','current'=>true,
        'contentSha256'=>$contentHash,'countryCode'=>'ZZ'
    ];
};
foreach(['fa','en'] as $locale){
    $result=jrNewsIndexApprovedPublication(
        $pdo,$autoStage['publicationId'],$locale,
        $standingPublisherProof,$standingCountry,1792822440);
    ensure($result['publicSearchEligible']===true,
        'signed standing news indexed in BOTH published languages');
}
$standingEnglish=jrNewsPublishedSearch(
    $pdo,'scholarship','en',20,['country'=>'ZZ']);
ensure($standingEnglish['result_count']===1,
    'search must include verified standing-policy scholarship announcement');
$standingPersian=jrNewsPublishedSearch($pdo,'دانشگاه','fa',20);
ensure($standingPersian['result_count']===1,
    'Persian standing-policy official article is searchable');
ensure((int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_search_documents WHERE index_state='PUBLISHED'"
)->fetchColumn()===2,'standing story indexed only after authenticated bilingual receipt');
echo "PASS: signed original CMS standing article appears in FA/EN public search\\n";

$revocation=jrNewsRevokeStandingOfficialPolicy(
    $pdo,$owner,$policy['policyId'],1792822450);
ensure($revocation['revoked']===true,'owner can revoke official standing policy');
$revokedRejected=false;
try{
    jrNewsStageStandingOfficialPublication(
        $pdo,$autoDraft['revisionId'],$policy['policyId'],
        $officialPolicy,1792822500);
}catch(RuntimeException $e){$revokedRejected=true;}
ensure($revokedRejected,'revoked policy prevents subsequent automatic staging');
ensure((int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_publications WHERE publisher_state='PUBLISHED'"
)->fetchColumn()===1,'verified fixture CMS receipt stays recorded without any production write');
echo "PASS: additive MariaDB standing-policy authorization, XOR integrity, idempotency, revocation and legacy survival\n";

/* Owner-submitted News source management: only the ORIGINAL mother DB.
 * Applied exclusively to ephemeral fixture after all legacy/standing tests.
 */
$adminMigration=file_get_contents(dirname(__DIR__,3).
    '/docs/migrations/20261025_jrei_news_admin_source_submissions_mother_mysql.sql');
ensure(is_string($adminMigration),'admin source additive SQL exists');
$adminMigration=preg_replace('/^\\s*--[^\\r\\n]*/m','',$adminMigration);
foreach(explode(';',(string)$adminMigration) as $statement)
    if(trim($statement)!=='')$pdo->exec(trim($statement));
$newFeedSource='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
$externalOfficialFeed='https://news.otheruniversity.edu/rss';
$insertSource->execute([$newFeedSource,
    'External university official RSS',$externalOfficialFeed,$account,1792823000]);
$insertPolicy->execute([
    $newFeedSource,$newFeedSource,$newFeedSource,$newFeedSource
]);
$adminNoAuthority=jrNewsAdminSourceSubmit($pdo,$owner,[
    'title'=>'Not yet JREI verified','url'=>'https://uast.ac.ir/news/',
    'category'=>'universities','priority'=>'P1'
],1792823000);
ensure($adminNoAuthority['state']==='PENDING_ADMIN_APPROVAL',
    'submit only stages a proposed source; no implicit crawl authority');
$adminApproved=jrNewsAdminSourceApprove($pdo,$owner,
    $adminNoAuthority['submissionId'],
    'APPROVE_OFFICIAL_SOURCE_DISCOVERY',1792823001);
ensure($adminApproved['state']==='ORIGINAL_POLICY_PENDING'&&
       $adminApproved['newsMonitorEnabled']===false,
    'administrator source approval does not invent original robots or rights');
$registrySource=$pdo->prepare(
    'SELECT source_kind,source_locator_digest,review_state,rights_state
       FROM jrei_exam_sources WHERE source_id=?');
$registrySource->execute([$adminApproved['originalSourceId']]);
$pendingSource=$registrySource->fetch(PDO::FETCH_ASSOC);
ensure(is_array($pendingSource)&&
       $pendingSource['source_kind']==='OFFICIAL_UNIVERSITY_NEWS'&&
       $pendingSource['source_locator_digest']===hash('sha256','https://uast.ac.ir/news/')&&
       $pendingSource['review_state']==='DISCOVERED'&&
       $pendingSource['rights_state']==='PERMISSION_UNVERIFIED',
    'owner-accepted official source is actually added to original JREI registry without invented approval');
$rights=$pdo->prepare('SELECT scheduling_state,rights_reviewed
    FROM jrei_ka_source_policies WHERE source_id=?');
$rights->execute([$adminApproved['originalSourceId']]);
$sourcePolicy=$rights->fetch(PDO::FETCH_ASSOC);
ensure(is_array($sourcePolicy)&&
       $sourcePolicy['scheduling_state']==='PENDING_REVIEW'&&
       (int)$sourcePolicy['rights_reviewed']===0,
    'new official source has a pending original KA policy, not fabricated rights');

$adminEdited=jrNewsAdminSourceEdit($pdo,$owner,$adminNoAuthority['submissionId'],[
    'title'=>'Edited applied-science university newsroom',
    'category'=>'universities','priority'=>'P0'
],1792823010);
ensure($adminEdited['updated']===true&&
       $adminEdited['state']==='ORIGINAL_POLICY_PENDING',
    'admin can edit pending source metadata without changing original rights');

$adminMatched=jrNewsAdminSourceSubmit($pdo,$owner,[
    'title'=>'Verified original university feed',
    'url'=>$externalOfficialFeed,'category'=>'universities','priority'=>'P1'
],1792823020);
$linked=jrNewsAdminSourceApprove($pdo,$owner,
    $adminMatched['submissionId'],
    'APPROVE_OFFICIAL_SOURCE_DISCOVERY',1792823030);
ensure($linked['state']==='MONITOR_STAGED'&&
       $linked['newsMonitorEnabled']===false,
    'verified original source is linked without any manual SQL or fabricated crawl');
$duplicate=jrNewsAdminSourceSubmit($pdo,$owner,[
    'title'=>'Duplicate feed','url'=>$externalOfficialFeed,
    'category'=>'universities','priority'=>'P1'
],1792823031);
ensure($duplicate['alreadyRecorded']===true &&
       $duplicate['submissionId']===$adminMatched['submissionId'],
    'administrator source URL dedupe retains existing review state');
$activated=jrNewsAdminSourceReconcile(
    $pdo,$owner,$adminMatched['submissionId'],1792823040,true);
ensure($activated['state']==='MONITOR_ACTIVE'&&
       $activated['newsMonitorEnabled']===true,
    'full verified original JREI policy permits admin-initiated monitor start');
$reused=jrNewsAdminSourceReconcile(
    $pdo,$owner,$adminMatched['submissionId'],1792823041,true);
ensure($reused['monitorId']===$activated['monitorId']&&
       $reused['state']==='MONITOR_ACTIVE',
    'existing active JREI monitor is reused without a duplicate monitor');
$noEditActive=false;
try{jrNewsAdminSourceEdit($pdo,$owner,$adminMatched['submissionId'],[
    'title'=>'Forbidden active takeover','category'=>'research','priority'=>'P0'
],1792823042);}catch(RuntimeException $e){$noEditActive=true;}
ensure($noEditActive,'active monitor metadata edits cannot silently broaden acquisition policy');

$inventory=jrNewsAdminSourceList($pdo,$owner);
ensure(count($inventory['entries'])===2 &&
       $inventory['entries'][0]['submission_state']==='MONITOR_ACTIVE',
    'newly approved custom source and pending source visible to manager');
$paused=jrNewsAdminSourceDisable(
    $pdo,$owner,$adminMatched['submissionId'],1792823050);
ensure($paused['state']==='DISABLED',
    'manager can stop a source from the original dashboard');
$monitorCheck=$pdo->prepare('SELECT enabled FROM jrei_news_monitors WHERE monitor_id=?');
$monitorCheck->execute([$activated['monitorId']]);
ensure((int)$monitorCheck->fetchColumn()===0,
    'emergency admin pause also stops the existing original News monitor');
$restored=jrNewsAdminSourceRestore($pdo,$owner,
    $adminMatched['submissionId'],1792823070);
ensure($restored['state']==='APPROVED_DISCOVERY'&&
       $restored['originalMonitorEnabled']===false,
    'owner restores paused source without silently starting its Cron monitor');
$relocated=jrNewsAdminSourceReconcile(
    $pdo,$owner,$adminMatched['submissionId'],1792823071,false);
ensure($relocated['state']==='MONITOR_STAGED'&&
       $relocated['monitorId']===$activated['monitorId'],
    'restored source reuses original paused monitor without duplication');
$directory=jrNewsAdminSourceList($pdo,$owner);
ensure(count($directory['suggestedInstitutions'])>=9&&
       $directory['suggestedInstitutions'][0]['institutionId']==='sanjesh',
    'first-party owner directory offers major Iranian institutions');
$recommended=jrNewsAdminApproveSuggestedInstitution(
    $pdo,$owner,'sanjesh','APPROVE_OFFICIAL_SOURCE_DISCOVERY',1792823080);
ensure($recommended['discoveryStatus']==='ORIGINAL_POLICY_PENDING'&&
       $recommended['actualCrawlerStartedByThisCall']===false&&
       $recommended['perArticleOwnerApprovalRequired']===false,
    'one-click Sanjesh inclusion registers original JREI metadata without pretending source approval');
$noSpoofedSuggestion=false;
try{
    jrNewsAdminApproveSuggestedInstitution(
       $pdo,$owner,'sanjesh-fake','APPROVE_OFFICIAL_SOURCE_DISCOVERY',1792823081);
}catch(InvalidArgumentException $e){$noSpoofedSuggestion=true;}
ensure($noSpoofedSuggestion,
    'unknown institutions cannot claim curated trusted official-source identity');

echo "PASS: admin custom source MFA CRUD, status, approved original monitor activation and pause on disposable mother DB\\n";

/* Genuine source/claim exceptions are a dedicated owner MFA worklist.
 * Pending system outages MUST NOT appear in the owner's manual news queue.
 * This migration is executed against the DISPOSABLE news_fixture only.
 */
$exceptionSql=file_get_contents(dirname(__DIR__,3).
    '/docs/migrations/20261025_jrei_news_owner_exception_queue_mother_mysql.sql');
ensure(is_string($exceptionSql),'news owner exception additive migration exists');
$exceptionSql=preg_replace('/^\\s*--[^\\r\\n]*/m','',$exceptionSql);
foreach(explode(';',(string)$exceptionSql) as $statement){
    $statement=trim($statement);
    if($statement!=='')$pdo->exec($statement);
}
$decisionReview=[
    'decision'=>'OWNER_EXCEPTION_QUEUE',
    'reasons'=>['CLAIMS_UNVERIFIED_OR_CONTRADICTED',
       'SOURCE_AUTHORITY_UNCONFIRMED','CMS_PUBLICATION_UNAVAILABLE']
];
$exception=jrNewsRecordOriginalEvidenceException(
    $pdo,$autoDraft['revisionId'],$decisionReview,1792823200);
ensure($exception['issueCount']===2&&
       $exception['publicationPerformed']===false,
    'only source/claim issues create owner exceptions; CMS errors are excluded');
jrNewsRecordOriginalEvidenceException(
    $pdo,$autoDraft['revisionId'],$decisionReview,1792823210);
$pending=jrNewsOwnerEvidenceExceptionQueue($pdo,$owner);
ensure(count($pending['items'])===2&&
       (int)$pending['items'][0]['occurrence_count']===2,
    'owner queue deduplicates the same suspect revision and issue');
$id=$pending['items'][0]['exception_id'];
$ack=jrNewsOwnerResolveEvidenceException(
    $pdo,$owner,$id,'ACKNOWLEDGED',1792823230);
ensure($ack['articleApproved']===false&&$ack['published']===false,
    'acknowledging uncertain official news cannot publish it');
$closed=jrNewsOwnerResolveEvidenceException(
    $pdo,$owner,$id,'RESOLVED',1792823240);
ensure($closed['sourceAuthorizationChanged']===false,
    'closing a questionable news item does not authorize original source');
$after=jrNewsOwnerEvidenceExceptionQueue($pdo,$owner);
ensure(count($after['items'])===1,
    'resolved issue is hidden while other unresolved facts remain');
$technicalCannotQueue=false;
try{
    jrNewsRecordOriginalEvidenceException($pdo,$autoDraft['revisionId'],[
        'decision'=>'SYSTEM_HOLD','reasons'=>['CMS_PUBLICATION_UNAVAILABLE']
    ],1792823250);
}catch(InvalidArgumentException $e){$technicalCannotQueue=true;}
ensure($technicalCannotQueue,'technical CMS outage never enters manual owner evidence queue');
echo "PASS: real MariaDB owner evidence exceptions dedupe, MFA review, no fake approvals\\n";

$modelPaused=jrNewsOriginalPrivateDraftBatch($pdo,[],[
    'source'=>'ORIGINAL_JREI_NEWS_PRIVATE_CRON',
    'serverSideJobAuthenticated'=>true,
    'originalCronLeaseCurrent'=>true
],[],1792823090,2);
ensure($modelPaused['state']==='OFF'&&
       $modelPaused['publicationsCreated']===0,
    'original AI news drafting remains off until approved original model controls');
$noModelCredentials=jrNewsOriginalPrivateDraftBatch($pdo,[
    'jrei_news_integrated_release_accepted'=>true,
    'jrei_news_model_drafting_enabled'=>true,
    'jrei_live_ai_enabled'=>true,
    'operations_cron_master_enabled'=>true
],[
    'source'=>'ORIGINAL_JREI_NEWS_PRIVATE_CRON',
    'serverSideJobAuthenticated'=>true,
    'originalCronLeaseCurrent'=>true
],[],1792823100,2);
ensure($noModelCredentials['state']==='SYSTEM_HOLD_ORIGINAL_JREI_SERVICE_MISSING'&&
       $noModelCredentials['individualOwnerApprovalsRequested']===0,
    'missing actual author corpus/independent QA is a system hold, not owner per-story review');
echo "PASS: owner source restore/one-click known institution original registration; model pipeline fail closed\\n";

/* No more second owner click after the manager has approved a source.
 * The original JREI registry must STILL independently authorize its exact
 * URL and robots/rights before the private Cron can add an active monitor.
 */
$autoAdminContext=[
    'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_WORKER',
    'originalCronLeaseVerified'=>true
];
$autoAdminCfg=[
    'jrei_news_integrated_release_accepted'=>true,
    'operations_cron_master_enabled'=>true,
    'jrei_news_source_activation_accepted'=>true,
    'jrei_news_admin_source_auto_monitor_enabled'=>true
];
$noPrematureOriginal=jrNewsOriginalReconcileApprovedAdminSources(
    $pdo,$autoAdminCfg,$autoAdminContext,1792823290,20);
ensure($noPrematureOriginal['activated']===0,
    'prior manager approval cannot start a source without original JREI rights');
$appliedScienceSource='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
$insertSource->execute([$appliedScienceSource,
    'Applied science university approved original feed',
    'https://uast.ac.ir/news/',$account,1792823300]);
$insertPolicy->execute([
    $appliedScienceSource,$appliedScienceSource,
    $appliedScienceSource,$appliedScienceSource
]);
$autoLinked=jrNewsOriginalReconcileApprovedAdminSources(
    $pdo,$autoAdminCfg,$autoAdminContext,1792823310,20);
ensure($autoLinked['linked']>=1&&$autoLinked['activated']>=1&&
       $autoLinked['syntheticSourceApprovals']===0,
    'previously MFA-approved source is linked automatically only after actual JREI policy becomes valid');
$q=$pdo->prepare(
    'SELECT submission_state,matched_jrei_source_id,linked_monitor_id
       FROM jrei_news_admin_source_submissions WHERE submission_id=?');
$q->execute([$adminNoAuthority['submissionId']]);
$autoRow=$q->fetch(PDO::FETCH_ASSOC);
ensure(is_array($autoRow)&&
       $autoRow['submission_state']==='MONITOR_ACTIVE'&&
       $autoRow['matched_jrei_source_id']===$appliedScienceSource,
    'autolink writes a real original source and monitor association');
$autoMonitor=$pdo->prepare(
    'SELECT enabled FROM jrei_news_monitors WHERE monitor_id=?');
$autoMonitor->execute([$autoRow['linked_monitor_id']]);
ensure((int)$autoMonitor->fetchColumn()===1,
    'explicit production policy activates a newly created original news monitor');
$disabledAuto=jrNewsAdminSourceDisable(
    $pdo,$owner,$adminNoAuthority['submissionId'],1792823320);
$repeatAuto=jrNewsOriginalReconcileApprovedAdminSources(
    $pdo,$autoAdminCfg,$autoAdminContext,1792823330,20);
$autoMonitor->execute([$autoRow['linked_monitor_id']]);
ensure($disabledAuto['state']==='DISABLED'&&
       (int)$autoMonitor->fetchColumn()===0,
    'Cron never silently reenables the administrators manually disabled institution');
$forbiddenReconcile=false;
try {
    jrNewsOriginalReconcileApprovedAdminSources($pdo,[],
        $autoAdminContext,1792823340,20);
} catch(RuntimeException $e) { $forbiddenReconcile=true; }
ensure($forbiddenReconcile,
    'private autolink refuses deployment policy that is not actually enabled');
echo "PASS: automatic owner-approved source reconciliation under original authority, zero fake rights, emergency stop preserved\\n";

/* Original first-party institution catalogue bootstrap. These assertions
 * run only in the disposable MariaDB acceptance fixture at the FINAL QA
 * phase, never from an HTTP request or production seeding side effect.
 */
$seedContext=[
    'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_WORKER',
    'originalCronLeaseVerified'=>true,
    'institutionCatalogueSeedEnabled'=>true
];
$seedBefore=(int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_publications")->fetchColumn();
$officialSeed=jrNewsOriginalSeedOfficialInstitutionSources(
    $pdo,$seedContext,1792823500,12);
ensure($officialSeed['examined']>=9&&
       $officialSeed['newDiscovered']>=7&&
       $officialSeed['sourcePermissionsGranted']===0&&
       $officialSeed['activeMonitorsAdded']===0,
    'official Sanjesh and university origins may be discovered automatically but never approved');
$seedRepeated=jrNewsOriginalSeedOfficialInstitutionSources(
    $pdo,$seedContext,1792823501,12);
ensure($seedRepeated['newDiscovered']===0&&
       $seedRepeated['alreadyRegistered']>=8,
    'repeat original JREI institution bootstrap is idempotent');
$badSeed=false;
try {
    jrNewsOriginalSeedOfficialInstitutionSources($pdo,[
        'source'=>'PUBLIC_BROWSER','originalCronLeaseVerified'=>true,
        'institutionCatalogueSeedEnabled'=>true
    ],1792823502,12);
}catch(RuntimeException $e){$badSeed=true;}
ensure($badSeed,'public/browsed source cannot seed original JREI mother registry');
$registeredDirectory=$pdo->prepare(
    'SELECT s.source_id,s.review_state,s.rights_state,p.scheduling_state,
            s.reviewer_account_id,s.verified_at
       FROM jrei_exam_sources s
       JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
      WHERE BINARY s.source_locator_uri=BINARY ? LIMIT 1');
$registeredDirectory->execute(['https://ut.ac.ir/']);
$utOriginal=$registeredDirectory->fetch(PDO::FETCH_ASSOC);
ensure(is_array($utOriginal)&&
       $utOriginal['review_state']==='DISCOVERED'&&
       $utOriginal['rights_state']==='PERMISSION_UNVERIFIED'&&
       $utOriginal['scheduling_state']==='PENDING_REVIEW'&&
       $utOriginal['verified_at']===null&&
       $utOriginal['reviewer_account_id']===null,
    'curated original university has neither synthetic reviewer nor approved reuse rights');
ensure((int)$pdo->query(
    "SELECT COUNT(*) FROM jrei_news_publications")->fetchColumn()
    ===$seedBefore,
    'directory seeding never creates a public news publication');
echo "PASS: original curated university catalogue idempotent discovery, strict no-rights and no-publication contract\\n";
