<?php
declare(strict_types=1);
/** PRIVATE OWNER/HOSTING OPERATOR ONLY; never callable from the web. */
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
// CLI API bootstrap exits before Stage09; existing commerceReady() relies on it.
require_once dirname(__DIR__).'/commerce-stage9.php';
require_once dirname(__DIR__).'/publishing.php';
require_once __DIR__.'/jr-publishing-digital.php';

/** Provision only after independently evidenced rights, private scans and external cost budget. */
function mustEnv(string $key,string $expected=''): string {
    $v=trim((string)getenv($key));
    if($v===''||($expected!==''&&$v!==$expected))throw new RuntimeException('missing_private_operator_approval_'.$key);
    return $v;
}
try{
 mustEnv('JR_PUBLISHING_OWNER_APPROVED','YES_20261017');
 mustEnv('JR_PUBLISHING_DIGITAL_RIGHTS_EVIDENCED','YES');
 mustEnv('JR_PUBLISHING_ANTIVIRUS_COMPLETE','YES');
 mustEnv('JR_PUBLISHING_SEPARATE_7PCT_BUDGET','YES');
 $email=strtolower(mustEnv('JR_PUBLISHING_AUTHOR_EMAIL'));
 $rightsHash=strtolower(mustEnv('JR_PUBLISHING_RIGHTS_EVIDENCE_SHA256'));
 if(!filter_var($email,FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-f0-9]{64}$/D',$rightsHash))
    throw new RuntimeException('invalid_author_or_rights_hash');
 $folder=jrPubPrivateDir();
 if(!$folder)throw new RuntimeException('private_files_not_outside_public_html');
 $names=['question_pdf'=>'tefl_1370_1405_questions.pdf','answer_pdf'=>'tefl_1370_1405_answers.pdf'];
 $assets=[];foreach($names as $kind=>$filename) {
   $real=jrPubAssetPath($filename);
   if(!$real)throw new RuntimeException('missing_private_file_'.$kind);
   $handle=fopen($real,'rb');if(!$handle||fread($handle,5)!=='%PDF-')throw new RuntimeException('invalid_pdf_magic');fclose($handle);
   $assets[$kind]=['name'=>$filename,'bytes'=>filesize($real),'sha256'=>hash_file('sha256',$real)];
 }
 // The uploaded original file hashes are pinned: a future correction needs a new approved version.
 if($assets['question_pdf']['sha256']!=='6245641c453e92ee005c4176575ef315b96ac72fd8535b7e3ff67c2369dda7c8'
   ||$assets['answer_pdf']['sha256']!=='db8070f8a88723c1947a094a461ad2f703192092b09f03255867bbab53fa2ab4')
    throw new RuntimeException('source_pdf_hash_mismatch');
 if(!mailReady()||!commerceReady())throw new RuntimeException('existing_bank_or_smtp_not_ready');
 $pdo=db();if(!$pdo||!jrPublishingSchemaReady($pdo))throw new RuntimeException('approved_mysql_schema_not_installed');
 $s=$pdo->prepare("SELECT id,email_verified_at FROM customer_accounts WHERE email_normalized=? AND status='active' LIMIT 1");
 $s->execute([$email]);$account=$s->fetch(PDO::FETCH_ASSOC);
 if(!$account||empty($account['email_verified_at']))throw new RuntimeException('author_must_register_and_verify_email');
 $existing=$pdo->prepare('SELECT id FROM publishing_authors WHERE slug=? LIMIT 1');
 $existing->execute(['mehrab-mirkarimi']);
 if($existing->fetchColumn())throw new RuntimeException('author_already_provisioned_do_not_duplicate');
 $pdo->beginTransaction();
 try {
  $author=uuidv4();$work=uuidv4();$version=uuidv4();$offer=uuidv4();
  $pdo->prepare("INSERT INTO publishing_authors
     (id,slug,display_name_fa,display_name_en,status)
     VALUES(?,'mehrab-mirkarimi','سید محراب میرکریمی','Seyyed Mehrab Mirkarimi','approved')")->execute([$author]);
  $pdo->prepare("INSERT INTO publishing_author_accounts(author_id,account_id,role,approved_at)
    VALUES(?,?,'author',NOW())")->execute([$author,$account['id']]);
  // Commercial approval is NOT a declaration of scientific validation.
  $pdo->prepare("INSERT INTO publishing_works
    (id,author_id,public_slug,title_fa,publication_status,scientific_review,rights_verified_at,display_approved_at)
    VALUES(?,?,'tefl-ma-exams-1370-1405','مجموعه سؤالات و پاسخ‌های تشریحی کارشناسی ارشد آموزش زبان انگلیسی ۱۳۷۰–۱۴۰۵',
      'approved','under_review',NOW(),NOW())")->execute([$work,$author]);
  $contentDigest=hash('sha256',$assets['question_pdf']['sha256'].'|'.$assets['answer_pdf']['sha256']);
  $pdo->prepare("INSERT INTO publishing_work_versions
    (id,work_id,version_number,content_sha256,changelog,review_state)
    VALUES(?,?,1,?,'Initial two-PDF private source hashes; academic review pending','under_review')")
    ->execute([$version,$work,$contentDigest]);
  $pdo->prepare("INSERT INTO publishing_rights_licences
    (id,work_id,author_account_id,rights_scope,evidence_sha256,valid_from)
    VALUES(?,?,?,'digital_distribution',?,NOW())")
    ->execute([uuidv4(),$work,$account['id'],$rightsHash]);
  $pdo->prepare("INSERT INTO publishing_offers
    (id,work_id,sku,unit_price_toman,unit_author_toman,unit_fund_toman,checkout_enabled)
    VALUES(?,?,'digital:tefl-ma-exams-1370-1405',1000000,600000,400000,1)")
    ->execute([$offer,$work]);
  foreach($assets as $kind=>$a){
    $pdo->prepare("INSERT INTO publishing_private_assets
      (id,work_version_id,logical_kind,private_storage_name,sha256,byte_size,
       malware_scanned_at,encrypted_at_rest,approved_at)
       VALUES(?,?,?,?,?,?,NOW(),0,NOW())")
      ->execute([uuidv4(),$version,$kind,$a['name'],$a['sha256'],$a['bytes']]);
  }
  $pdo->commit();
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
 $offerNow=jrPubDigitalOffer($pdo);
 if(!$offerNow)throw new RuntimeException('provisioned_but_offer_preflight_failed');
 fwrite(STDOUT,"JR digital offer provisioned. Bank/payment source remains existing BitPay; perform live small controlled test BEFORE promoting to visitors.\n");
}catch(Throwable $e){
 fwrite(STDERR,'JR provision refused: '.$e->getMessage()."\n");exit(1);
}
