<?php
declare(strict_types=1);
// Isolated MySQL 8 fixture only. No credentials for live Bertina, network
// posting, browser role bypass, or provider APIs.
$dsn=(string)getenv('SOCIAL_TEST_DSN');
if(!preg_match('/(?:^|;)dbname=social_fixture(?:;|$)/',$dsn))
    throw new RuntimeException('social_fixture_database_required');
$pdo=new PDO($dsn,(string)getenv('SOCIAL_TEST_USER'),(string)getenv('SOCIAL_TEST_PASSWORD'),
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
     PDO::ATTR_EMULATE_PREPARES=>false]);
$source=(string)file_get_contents(__DIR__.'/../platform/db/social-distribution.mysql.sql');
$source=(string)preg_replace('/^--.*$/m','',$source);
foreach (array_filter(array_map('trim',explode(';',$source))) as $statement) $pdo->exec($statement);
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/social-queue.php';
$checks=0;
function socialCheck(bool $ok,string $message):void {
 if(!$ok)throw new RuntimeException($message);
 $GLOBALS['checks']++;
}
function socialRejected(callable $callback,string $message):void {
 try{$callback();}catch(InvalidArgumentException|DomainException $e){$GLOBALS['checks']++;return;}
 throw new RuntimeException($message);
}
function socialInsert(PDO $pdo,string $id,int $account,string $campaign,int $when,
                      string $body,string $provider='telegram'):void {
 $pdo->prepare("INSERT INTO social_deliveries
 (id,campaign_id,account_id,provider,format,body,body_hash,tracking_url,
 schedule_utc,status,dedupe_key,created_at,updated_at)
 VALUES(?,?,?,?,'text',?,?,?,?,'draft',?,?,?)")
 ->execute([$id,$campaign,$account,$provider,$body,hash('sha256',$body),
 'https://drjavadrezazadeh.com/fa/akhbar/example/?utm_source='.$provider,$when,
 hash('sha256',$id),1000,1000]);
}
function socialState(PDO $pdo,string $id):array {
 $q=$pdo->prepare('SELECT * FROM social_deliveries WHERE id=?');
 $q->execute([$id]);return $q->fetch();
}
$admin='11111111-1111-4111-8111-111111111111';
$campaign='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
$now=2000000000;
socialCheck(socialQueueSchemaReady($pdo),'social schema missing');
$pdo->prepare("INSERT INTO social_accounts
 (id,provider,external_id,display_handle,status,created_at,updated_at)
 VALUES(1,'telegram','fixture-telegram','test_channel','verified',1000,1000),
       (2,'eitaa','fixture-eitaa','test_channel','verified',1000,1000)")
 ->execute();
$pdo->prepare("INSERT INTO social_campaigns
 (id,source_canonical,source_locale,title,editorial_state,source_hash,created_by,
 approved_by,approved_at,created_at,updated_at)
 VALUES(?,'https://drjavadrezazadeh.com/fa/akhbar/example/','fa','fixture',
 'approved',?,?,?,1000,1000,1000)")
 ->execute([$campaign,str_repeat('a',64),$admin,$admin]);
$id='22222222-2222-4222-8222-222222222222';
socialInsert($pdo,$id,1,$campaign,$now+60,'Verified approved public copy');
socialRejected(fn()=>socialQueueApprove($pdo,$id,$admin,$now+61),'past delivery approved');
$digest=socialQueueApprove($pdo,$id,$admin,$now);
socialCheck(strlen($digest)===64,'approval digest absent');
socialCheck(socialState($pdo,$id)['status']==='scheduled','not scheduled after approval');
socialRejected(fn()=>socialQueueApprove($pdo,$id,$admin,$now),'duplicate approval permitted');
socialCheck(socialQueueClaim($pdo,$now+59)===null,'premature queue claim');
$claim=socialQueueClaim($pdo,$now+60);
socialCheck(($claim['id']??'')===$id && strlen($claim['lease']??'')===64,'claim lacks verified lease');
socialCheck(socialQueueClaim($pdo,$now+60)===null,'duplicate dispatch claim');
socialRejected(fn()=>socialQueueFinalize($pdo,$id,str_repeat('f',64),$claim['attempt'],
 'telegram_receipt','123',$now+61),'forged lease accepted');
socialRejected(fn()=>socialQueueFinalize($pdo,$id,$claim['lease'],$claim['attempt'],
 'telegram_receipt',null,$now+61),'missing Telegram ID accepted');
socialQueueFinalize($pdo,$id,$claim['lease'],$claim['attempt'],'uncertain',null,$now+61);
socialCheck(socialState($pdo,$id)['status']==='uncertain','uncertain send silently resolved');
socialCheck(socialQueueClaim($pdo,$now+1000)===null,'ambiguous delivery retried');
socialRejected(fn()=>socialQueueFinalize($pdo,$id,$claim['lease'],$claim['attempt'],
 'telegram_receipt','123',$now+62),'late provider acknowledgment accepted');
socialCheck((int)$pdo->query('SELECT COUNT(*) FROM social_attempts')->fetchColumn()===1,
 'ambiguous retry created an attempt');
$telegram='33333333-3333-4333-8333-333333333333';
socialInsert($pdo,$telegram,1,$campaign,$now+61,'Telegram receipt test');
socialQueueApprove($pdo,$telegram,$admin,$now);
$claimed=socialQueueClaim($pdo,$now+61);
socialCheck($claimed['id']===$telegram,'wrong scheduled item');
socialQueueFinalize($pdo,$telegram,$claimed['lease'],$claimed['attempt'],
 'telegram_receipt','19002',$now+62);
socialCheck(socialState($pdo,$telegram)['provider_id']==='19002','real numeric provider ID not kept');
socialCheck(socialState($pdo,$telegram)['confirmation_method']==='telegram_receipt',
 'confirmation provenance missing');
$eitaa='44444444-4444-4444-8444-444444444444';
socialInsert($pdo,$eitaa,2,$campaign,$now+70,'Eitaa provider success test','eitaa');
socialQueueApprove($pdo,$eitaa,$admin,$now);
$claimed=socialQueueClaim($pdo,$now+70);
socialRejected(fn()=>socialQueueFinalize($pdo,$eitaa,$claimed['lease'],$claimed['attempt'],
 'eitaayar_success','fake-id',$now+71),'fictitious Eitaa post ID accepted');
socialQueueFinalize($pdo,$eitaa,$claimed['lease'],$claimed['attempt'],
 'eitaayar_success',null,$now+71);
socialCheck(socialState($pdo,$eitaa)['provider_id']===null,'Eitaa success invented ID');
$changed='55555555-5555-4555-8555-555555555555';
socialInsert($pdo,$changed,1,$campaign,$now+80,'Original source copy');
socialQueueApprove($pdo,$changed,$admin,$now);
$pdo->prepare('UPDATE social_deliveries SET body=? WHERE id=?')->execute(['Tampered after approval',$changed]);
$claim=socialQueueClaim($pdo,$now+80);
socialCheck($claim['status']==='revoked' && $claim['id']===$changed,
 'edited content remained dispatchable');
socialCheck(socialState($pdo,$changed)['status']==='revoked','stale approval not revoked');
$media='66666666-6666-4666-8666-666666666666';
socialInsert($pdo,$media,1,$campaign,$now+90,'Image restricted post');
$asset='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
$pdo->prepare("INSERT INTO social_assets
 (id,campaign_id,media_type,sha256,media_url,rights_status)
 VALUES(?,?,'photo',?,'https://drjavadrezazadeh.com/assets/sample.png','verified')")
 ->execute([$asset,$campaign,str_repeat('b',64)]);
socialQueueApprove($pdo,$media,$admin,$now);
$pdo->prepare("UPDATE social_assets SET rights_status='revoked' WHERE id=?")->execute([$asset]);
$claim=socialQueueClaim($pdo,$now+90);
socialCheck($claim['status']==='revoked' && $claim['id']===$media,'revoked media still dispatchable');
$expired='77777777-7777-4777-8777-777777777777';
$pdo->prepare('UPDATE social_assets SET rights_status=\'verified\' WHERE id=?')->execute([$asset]);
socialInsert($pdo,$expired,1,$campaign,$now+95,'Expired destination');
socialQueueApprove($pdo,$expired,$admin,$now);
$pdo->prepare('UPDATE social_accounts SET expires_at=? WHERE id=1')->execute([$now+90]);
$claim=socialQueueClaim($pdo,$now+95);
socialCheck($claim['status']==='revoked' && $claim['id']===$expired,
 'expired provider authorization was used');
socialCheck((int)$pdo->query("SELECT COUNT(*) FROM social_deliveries WHERE status='dispatching'")->fetchColumn()===0,
 'stale dispatches remain claimed');
socialCheck((int)$pdo->query('SELECT COUNT(*) FROM social_audit')->fetchColumn()>=8,
 'insufficient append-only audit entries');
socialCheck((int)$pdo->query('SELECT COUNT(*) FROM social_metrics')->fetchColumn()===0,
 'fabricated platform analytics');
require __DIR__.'/../api/operations-social.php';
$snapshot=operationsSocialSnapshot($pdo);
socialCheck($snapshot['ok']===true && $snapshot['schema']==='operations-social-readiness-v1',
 'protected reporting snapshot invalid');
socialCheck(($snapshot['deliveryRows']['confirmedRecords']??null)===2,
 'report invented or lost confirmed provider receipts');
socialCheck(($snapshot['deliveryRows']['uncertain']??null)===1,
 'uncertain delivery not visible to the administrator');
socialCheck(is_array($snapshot['recentDeliveries']) &&
 count($snapshot['recentDeliveries'])>=5,'recent receipts missing');
socialCheck($snapshot['recentMetrics']===[],'absent provider metrics became fake observations');
socialCheck($snapshot['enabledForAutomaticPublication']===null &&
 $snapshot['automationStatus']==='runtime_not_verified',
 'live runtime was incorrectly certified');
$metrics=$pdo->prepare("INSERT INTO social_metrics
 (delivery_id,observed_at,source,clicks,engagements)
 VALUES(?,?,?,NULL,?)");
$metrics->execute([$telegram,$now+200,'telegram_authorized_metric',5]);
$snapshot=operationsSocialSnapshot($pdo);
socialCheck(count($snapshot['recentMetrics'])===1 &&
 $snapshot['recentMetrics'][0]['clicks']===null &&
 $snapshot['recentMetrics'][0]['engagements']===5,
 'missing clicks were converted to fabricated zero');
socialCheck(!str_contains(json_encode($snapshot),'fixture-password') &&
 !str_contains(json_encode($snapshot),'secret_reference'),
 'status route leaked infrastructure credentials');


// Full admin review workflow: hash-bound decisions, stale copy rejection,
// no provider API call, all data scoped to isolated MySQL.
require __DIR__.'/../api/social-review.php';
$pdo->exec('UPDATE social_accounts SET expires_at=NULL WHERE id=1');
$reviewId='88888888-8888-4888-8888-888888888888';
socialInsert($pdo,$reviewId,1,$campaign,$now+400,'Content approved for review');
$listing=socialReviewList($pdo,$now);
$review=array_values(array_filter($listing['drafts'],
    static fn($x)=>$x['deliveryId']===$reviewId));
socialCheck(count($review)===1 && $review[0]['reviewable']===true &&
    strlen($review[0]['digest'])===64 &&
    $review[0]['sourceIndependentlyVerified']===false,'review preview or limitation missing');
$previewDigest=$review[0]['digest'];
$pdo->prepare("UPDATE social_deliveries SET body=? WHERE id=?")
    ->execute(['This copy changed after preview',$reviewId]);
socialRejected(fn()=>socialReviewApprove($pdo,$reviewId,$previewDigest,$admin,$now),
    'stale editorial preview approved');
socialCheck(socialState($pdo,$reviewId)['status']==='draft',
    'stale approval changed state');
$pdo->prepare('UPDATE social_deliveries SET body=? WHERE id=?')
    ->execute(['Content approved for review',$reviewId]);
socialReviewApprove($pdo,$reviewId,$previewDigest,$admin,$now);
socialCheck(socialState($pdo,$reviewId)['status']==='scheduled',
    'approved review was not scheduled');
socialRejected(fn()=>socialReviewApprove($pdo,$reviewId,$previewDigest,$admin,$now),
    'replayed approval accepted');
$rejectId='99999999-9999-4999-8999-999999999999';
socialInsert($pdo,$rejectId,1,$campaign,$now+410,'Rejected social draft');
$latest=socialReviewList($pdo,$now);
$reject=array_values(array_filter($latest['drafts'],fn($r)=>$r['deliveryId']===$rejectId));
socialCheck(count($reject)===1,'rejection candidate absent');
socialReviewReject($pdo,$rejectId,$reject[0]['digest'],$admin,$now);
socialCheck(socialState($pdo,$rejectId)['status']==='revoked',
    'rejected draft remains publishable');
socialRejected(fn()=>socialReviewReject($pdo,$rejectId,$reject[0]['digest'],$admin,$now),
    'repeat rejection did not conflict');
socialCheck((int)$pdo->query("SELECT COUNT(*) FROM social_audit
    WHERE action IN ('admin_review_approved','admin_review_rejected')")->fetchColumn()===2,
    'administrator action journal not persisted exactly once');
socialCheck((int)$pdo->query("SELECT COUNT(*) FROM social_attempts")->fetchColumn()===3,
    'review operations incorrectly dispatched to social platform');

echo 'PASS: '.$checks.' isolated MySQL Stage 13 transactional queue checks; zero provider sends.'.PHP_EOL;
