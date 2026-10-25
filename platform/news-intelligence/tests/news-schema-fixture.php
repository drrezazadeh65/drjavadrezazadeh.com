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
    source_title VARCHAR(200) NOT NULL,
    source_locator_uri VARCHAR(1000) NOT NULL,
    review_state VARCHAR(40) NOT NULL,
    rights_state VARCHAR(50) NOT NULL,
    reviewer_account_id CHAR(36) NOT NULL,
    verified_at BIGINT UNSIGNED NOT NULL,
    is_revoked TINYINT NOT NULL,
    is_superseded TINYINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
$pdo->exec('CREATE TABLE jrei_ka_source_policies (
    source_id CHAR(36) PRIMARY KEY,
    revision BIGINT UNSIGNED NOT NULL,
    refresh_interval_seconds INT UNSIGNED NOT NULL,
    scheduling_state VARCHAR(30) NOT NULL,
    rights_reviewed TINYINT NOT NULL,
    robots_terms_reviewed TINYINT NOT NULL,
    transport_reviewed TINYINT NOT NULL,
    rights_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    robots_terms_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    transport_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    priority_tier VARCHAR(10) NOT NULL
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
