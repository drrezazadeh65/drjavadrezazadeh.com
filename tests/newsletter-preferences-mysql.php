<?php
declare(strict_types=1);
// Isolated fixture only. All tables are loaded from the *existing* mother
// schemas; no production connection, secrets or synthetic outbound emails.
if(!str_contains((string)getenv('JR_TEST_NEWSLETTER_DSN'),'dbname=newsletter_fixture'))exit(2);
$pdo=new PDO((string)getenv('JR_TEST_NEWSLETTER_DSN'),(string)getenv('JR_TEST_NEWSLETTER_USER'),
 (string)getenv('JR_TEST_NEWSLETTER_PASSWORD'),[
 PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
 PDO::ATTR_EMULATE_PREPARES=>false]);
define('BERTINA_API_BOOTSTRAPPED',true);
define('SITE_ORIGIN','https://drjavadrezazadeh.com');
function cfg():array{return ['auth_pepper'=>str_repeat('a',64)];}
function validUuid(string $s):bool{return preg_match('/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i',$s)===1;}
function uuidv4():string{$bytes=random_bytes(16);$bytes[6]=chr((ord($bytes[6])&15)|64);$bytes[8]=chr((ord($bytes[8])&63)|128);return vsprintf('%s%s-%s-%s-%s-%s%s%s',str_split(bin2hex($bytes),4));}
function fail(string $code,int $status=400):never {throw new RuntimeException($code);}
require_once __DIR__.'/../api/newsletter-preferences.php';
require_once __DIR__.'/../api/newsletter-unsubscribe.php';
require_once __DIR__.'/../api/newsletter-delivery.php';
$check=static function(bool $ok,string $message):void{if(!$ok)throw new RuntimeException($message);echo "PASS: ".$message."\n";};
$check(jrNewsletterSchemaReady($pdo),'mother consent/communication tables loaded');
$check(jrNewsletterTopics()===['ARTICLES','BOOKS','EVENTS','SERVICES','GOLDEN_TALENT','JHELA'],'six canonical topics');
$check(jrNewsletterChosen(['topics'=>[]])===[],'zero-topic unsubscribe accepted');
$check(jrNewsletterChosen(['topics'=>['JHELA','BOOKS']])===['JHELA','BOOKS'],'explicit selected topics accepted');
foreach([['topics'=>['JHELA','JHELA']],['topics'=>['UNKNOWN']],['topics'=>'JHELA']] as $invalid){
 try{jrNewsletterChosen($invalid);throw new RuntimeException('invalid topics accepted');}
 catch(RuntimeException $e){$check($e->getMessage()==='invalid_topics','unsafe topic payload rejected');}
}
$account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
$notice='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
$granted='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
$withdrawn='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
$at='2026-10-16 07:00:00.000';
$pdo->prepare("INSERT INTO customer_accounts(id,email_normalized,password_hash,status,email_verified_at,created_at,updated_at) VALUES(?,?,?,'active',?,?,?)")
 ->execute([$account,'newsletter-fixture@example.invalid','synthetic',1760600000,1760600000,1760600000]);
$pdo->prepare('INSERT INTO eco_consent_notices(id,purpose_code,version_label,locale,notice_sha256,effective_at) VALUES(?,?,?,?,?,?)')
 ->execute([$notice,'NEWSLETTER','newsletter-v1','en',str_repeat('1',64),$at]);
$pdo->prepare('INSERT INTO eco_consent_records(id,account_id,notice_id,decision,lawful_basis,evidence_sha256,granted_at,source_code) VALUES(?,?,?,?,?,?,?,?)')
 ->execute([$granted,$account,$notice,'GRANTED','CONSENT',str_repeat('a',64),$at,'NEWSLETTER_SETTINGS']);
$pdo->prepare("INSERT INTO eco_notification_preferences(id,account_id,purpose_code,channel_code,opted_in,consent_record_id,changed_at) VALUES(?,?,?,'EMAIL',1,?,?)")
 ->execute(['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',$account,'BOOKS',$granted,$at]);
$q=$pdo->prepare("SELECT opted_in FROM eco_notification_preferences WHERE account_id=? AND purpose_code='BOOKS' AND channel_code='EMAIL'");
$q->execute([$account]);$check((int)$q->fetchColumn()===1,'first-party opt-in attached to consent');
$pdo->prepare('INSERT INTO eco_consent_records(id,account_id,notice_id,decision,lawful_basis,evidence_sha256,granted_at,withdrawn_at,source_code) VALUES(?,?,?,?,?,?,?,?,?)')
 ->execute([$withdrawn,$account,$notice,'WITHDRAWN','CONSENT',str_repeat('b',64),$at,$at,'NEWSLETTER_SETTINGS']);
$pdo->prepare("UPDATE eco_notification_preferences SET opted_in=0,consent_record_id=?,changed_at=? WHERE account_id=? AND purpose_code='BOOKS' AND channel_code='EMAIL'")
 ->execute([$withdrawn,$at,$account]);
$q->execute([$account]);$check((int)$q->fetchColumn()===0,'withdrawal suppresses opted_in flag');
$check((int)$pdo->query('SELECT COUNT(*) FROM eco_consent_records')->fetchColumn()===2,'grant and withdrawal both retained as auditable records');

// Signed e-mail opt-out must never require a second user table or SMTP.
$link=jrNewsletterUnsubscribeUrl($account,'newsletter-fixture@example.invalid','fa');
$check(str_starts_with($link,SITE_ORIGIN.'/api/newsletter/unsubscribe?a='),
       'bilingual opt-out link uses only opaque account UUID and HMAC');
$token=jrNewsletterUnsubscribeToken($account,'newsletter-fixture@example.invalid');
$check(strlen($token)===64 &&
       !hash_equals($token,jrNewsletterUnsubscribeToken($account,'changed@example.invalid')),
       'mailbox-bound domain-separated bearer proof');
$pdo->prepare("UPDATE eco_notification_preferences SET opted_in=1,consent_record_id=?
 WHERE account_id=? AND purpose_code='BOOKS'")->execute([$granted,$account]);
$pdo->prepare("INSERT INTO eco_notification_preferences
 (id,account_id,purpose_code,channel_code,opted_in,consent_record_id,changed_at)
 VALUES(?,?,?,'EMAIL',1,?,?)")
 ->execute([uuidv4(),$account,'ARTICLES',$granted,$at]);
$queue=$pdo->prepare("INSERT INTO eco_notifications
 (id,recipient_account_id,channel_code,purpose_code,delivery_state,idempotency_key)
 VALUES(?,?,'EMAIL',?,?,?)");
foreach([['BOOKS','PENDING'],['ARTICLES','PENDING'],
         ['ACCOUNT_SECURITY','PENDING'],['BOOKS','SENT']] as $row){
 $queue->execute([uuidv4(),$account,$row[0],$row[1],hash('sha256',implode('|',$row))]);
}
$check(jrNewsletterOptoutApply($pdo,$account,'fa')===2,
       'one signed withdrawal revokes all actively opted-in topics');
$check((int)$pdo->query("SELECT COUNT(*) FROM eco_notification_preferences
 WHERE account_id='$account' AND opted_in=1")->fetchColumn()===0,
       'newsletter topic preferences are all disabled');
$check((int)$pdo->query("SELECT COUNT(*) FROM eco_notifications
 WHERE recipient_account_id='$account' AND delivery_state='SUPPRESSED'")->fetchColumn()===2,
       'pending newsletter messages suppressed before delivery');
$check((int)$pdo->query("SELECT COUNT(*) FROM eco_notifications
 WHERE recipient_account_id='$account' AND purpose_code='ACCOUNT_SECURITY'
 AND delivery_state='PENDING'")->fetchColumn()===1,
       'transactional account messages never suppressed');
$check((int)$pdo->query("SELECT COUNT(*) FROM eco_notifications
 WHERE recipient_account_id='$account' AND purpose_code='BOOKS'
 AND delivery_state='SENT'")->fetchColumn()===1,
       'historically sent mail remains immutable');
$check((int)$pdo->query("SELECT COUNT(*) FROM eco_consent_records
 WHERE account_id='$account' AND source_code='NEWSLETTER_EMAIL_LINK'
 AND decision='WITHDRAWN'")->fetchColumn()===2,
       'withdrawal recorded as mother consent history');
$check(jrNewsletterOptoutApply($pdo,$account,'fa')===0,
       'repeat opt-out has no duplicate consent or queue side effect');
$check((int)$pdo->query("SELECT COUNT(*) FROM eco_consent_records
 WHERE account_id='$account'")->fetchColumn()===4,
       'idempotent withdrawal preserves consent audit count');


// First-party publication and SMTP queue; the fake transport never leaves CI.
$path='/fa/akhbar/ecosystem-education-research-2026/';
$local=realpath(__DIR__.'/../'.ltrim($path,'/').'index.html');
$check(is_string($local)&&is_file($local),'published article exists in release source');
$html=file_get_contents($local);
$objectId=uuidv4();
$pdo->prepare("INSERT INTO eco_object_refs
 (id,storage_provider,object_reference,content_sha256,mime_type,byte_size,data_class,malware_scan_status)
 VALUES(?,'JR_NEWSLETTER_PUBLISHED_PAGE',?,?,'text/html',?,'PUBLIC','NOT_APPLICABLE')")
 ->execute([$objectId,$path,hash('sha256',$html),strlen($html)]);
$object=$pdo->prepare("SELECT storage_provider,object_reference,content_sha256,mime_type,data_class
  FROM eco_object_refs WHERE id=?");
$object->execute([$objectId]);$ref=$object->fetch();
$check(jrNewsletterPublishedPage($ref,'ARTICLES')!==null,
    'hash-pinned canonical sitemap publication accepted');
$check(jrNewsletterPublishedPage($ref,'JHELA')===null,
    'unapproved journal content cannot borrow article evidence');
$ref['content_sha256']=str_repeat('f',64);
$check(jrNewsletterPublishedPage($ref,'ARTICLES')===null,
    'tampered publication hash fails closed');
$grantId=uuidv4();
$pdo->prepare('INSERT INTO eco_consent_records(id,account_id,notice_id,decision,lawful_basis,evidence_sha256,granted_at,source_code) VALUES(?,?,?,?,?,?,?,?)')
 ->execute([$grantId,$account,$notice,'GRANTED','CONSENT',str_repeat('c',64),$at,'NEWSLETTER_SETTINGS']);
$pdo->prepare("UPDATE eco_notification_preferences SET opted_in=1,consent_record_id=?
 WHERE account_id=? AND purpose_code='ARTICLES'")->execute([$grantId,$account]);
$notificationId=uuidv4();
$pdo->prepare("INSERT INTO eco_notifications
 (id,recipient_account_id,channel_code,purpose_code,message_object_id,delivery_state,idempotency_key)
 VALUES(?,?,'EMAIL','ARTICLES',?,'PENDING',?)")
 ->execute([$notificationId,$account,$objectId,hash('sha256','article-v1|'.$account)]);
$check(jrNewsletterOutboundSchemaReady($pdo),'mother queue, evidence and attempt ledger are ready');
$called=0;
$send=static function(string $recipient,string $subject,string $body)use(&$called):bool{
 $called++;
 if($recipient!=='newsletter-fixture@example.invalid'||!str_contains($body,'/api/newsletter/unsubscribe?'))
    throw new RuntimeException('untrusted_test_email');
 return true;
};
$check(jrNewsletterDispatchOne($pdo,$notificationId,$send)==='SMTP_ACCEPTED',
    'consented published mail accepted by injected fixture transport');
$check($called===1,'only one simulated SMTP attempt');
$check(jrNewsletterDispatchOne($pdo,$notificationId,$send)==='ALREADY_HANDLED'&&$called===1,
    'idempotency prevents second SMTP submission');
$q=$pdo->prepare('SELECT delivery_state FROM eco_notifications WHERE id=?');
$q->execute([$notificationId]);
$check($q->fetchColumn()==='SMTP_ACCEPTED','records provider acceptance but never mailbox delivery');
$check((int)$pdo->query("SELECT COUNT(*) FROM eco_notification_attempts
 WHERE notification_id='$notificationId' AND attempt_no=1")->fetchColumn()===1,
 'exactly one durable send-attempt audit');
$failed=uuidv4();
$pdo->prepare("INSERT INTO eco_notifications
 (id,recipient_account_id,channel_code,purpose_code,message_object_id,delivery_state,idempotency_key)
 VALUES(?,?,'EMAIL','ARTICLES',?,'PENDING',?)")
 ->execute([$failed,$account,$objectId,hash('sha256','failure-v1|'.$account)]);
$check(jrNewsletterDispatchOne($pdo,$failed,static fn():bool=>false)==='SMTP_FAILED',
    'SMTP rejection recorded without automatic retry');
$check(jrNewsletterDispatchOne($pdo,$failed,$send)==='ALREADY_HANDLED'&&$called===1,
    'ambiguous or failed SMTP attempts are never repeated automatically');
$pending=uuidv4();
$pdo->prepare("INSERT INTO eco_notifications
 (id,recipient_account_id,channel_code,purpose_code,message_object_id,delivery_state,idempotency_key)
 VALUES(?,?,'EMAIL','ARTICLES',?,'PENDING',?)")
 ->execute([$pending,$account,$objectId,hash('sha256','optout-v1|'.$account)]);
$check(jrNewsletterOptoutApply($pdo,$account,'en')===1,'consent withdrawn from email link');
$q->execute([$pending]);
$check($q->fetchColumn()==='SUPPRESSED','pending sender candidate suppressed before SMTP');
$check(jrNewsletterDispatchOne($pdo,$pending,$send)==='ALREADY_HANDLED'&&$called===1,
    'withdrawn reader never triggers transport');

echo "Mother DB newsletter fixture PASS. No mail was sent.\n";
