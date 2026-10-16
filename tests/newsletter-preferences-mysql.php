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
function fail(string $code,int $status=400):never {throw new RuntimeException($code);}
require_once __DIR__.'/../api/newsletter-preferences.php';
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
echo "Mother DB newsletter fixture PASS. No mail was sent.\n";
