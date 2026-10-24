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
) ENGINE=InnoDB');
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
) ENGINE=InnoDB');
$pdo->exec('CREATE TABLE jrei_ka_source_policies (
    source_id CHAR(36) PRIMARY KEY,
    revision BIGINT UNSIGNED NOT NULL,
    refresh_interval_seconds INT UNSIGNED NOT NULL,
    scheduling_state VARCHAR(30) NOT NULL,
    rights_reviewed TINYINT NOT NULL,
    robots_terms_reviewed TINYINT NOT NULL,
    transport_reviewed TINYINT NOT NULL,
    priority_tier VARCHAR(10) NOT NULL
) ENGINE=InnoDB');
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
      rights_reviewed,robots_terms_reviewed,transport_reviewed,priority_tier)
     VALUES (?,1,3600,'APPROVED',1,1,1,'P1')");
$insertPolicy->execute([$feedId]);
$insertPolicy->execute([$itemId]);
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
echo "PASS: disposable MariaDB mother tables, original monitor, scoped article source and private candidate\n";
