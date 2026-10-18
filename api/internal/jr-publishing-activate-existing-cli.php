<?php
declare(strict_types=1);
/**
 * Owner-controlled, existing-row-only publishing activation.
 * --check: READ ONLY. --activate: idempotent transaction after all independent
 * author, rights, malware, asset, bank and mail evidence is present.
 * Never creates a fake author, rights licence, scan, payment or email verification.
 * Run only from the authenticated Bertina CLI, never via HTTP.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('BERTINA_MAIL_SMOKE_CONTEXT', true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED', true);
require_once dirname(__DIR__).'/publishing.php';
require_once __DIR__.'/jr-publishing-digital.php';

const JR_PUB_ACTIVATE_SLUG = 'tefl-ma-exams-1370-1405';
const JR_PUB_ACTIVATE_FILES = [
 'question_pdf'=>['tefl_1370_1405_questions.pdf','6245641c453e92ee005c4176575ef315b96ac72fd8535b7e3ff67c2369dda7c8'],
 'answer_pdf'=>['tefl_1370_1405_answers.pdf','db8070f8a88723c1947a094a461ad2f703192092b09f03255867bbab53fa2ab4']
];
function jrPubActivateReport(array $checks, bool $changed=false): never {
 $missing=array_keys(array_filter($checks,static fn(bool $ok):bool=>!$ok));
 echo json_encode([
  'schema'=>'jr-publishing-existing-offer-activation-v1',
  'operation'=>in_array('--activate',$_SERVER['argv']??[],true)?'activate':'check',
  'all_checks_passed'=>count($missing)===0,
  'missing_checks'=>$missing,
  'checks'=>$checks,
  'changed'=>$changed,
  'note'=>'Live checkout also requires persistent private publishing_digital_enabled=true or JR_PUBLISHING_DIGITAL_ENABLED=true and independently verified payment/email delivery.'
 ],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT)."\n";
 exit($missing?2:0);
}
try {
 $activate=in_array('--activate',$_SERVER['argv']??[],true);
 if(count(array_intersect($_SERVER['argv']??[],['--check','--activate']))!==1 ||
    count($_SERVER['argv']??[])!==2) {
  fwrite(STDERR,"Usage: php jr-publishing-activate-existing-cli.php --check|--activate\n");exit(64);
 }
 $pdo=db();
 $checks=[
  'database'=>$pdo instanceof PDO,
  'publishing_schema'=>false,
  'commerce_gateway'=>false,
  'smtp'=>false,
  'persistent_digital_switch'=>false,
  'owner_approval'=>false,
  'author_account_verified'=>false,
  'author_role_approved'=>false,
  'author_digital_distribution_rights'=>false,
  'rights_evidence_recorded'=>false,
  'exact_existing_product_and_price'=>false,
  'two_private_pdfs_scanned_and_approved'=>false,
  'original_pdf_hashes'=>false,
  'independent_platform_budget'=>false,
  'smtp_cron_tested'=>false
 ];
 if(!($pdo instanceof PDO))jrPubActivateReport($checks);
 $checks['publishing_schema']=jrPublishingSchemaReady($pdo);
 if(!$checks['publishing_schema'])jrPubActivateReport($checks);
 $checks['commerce_gateway']=commerceReady();
 $checks['smtp']=mailReady();
 $checks['persistent_digital_switch']=jrPubDigitalSalesSwitchEnabled();
 $checks['owner_approval']=getenv('JR_PUBLISHING_OWNER_APPROVED')==='YES_20261017';
 $checks['independent_platform_budget']=getenv('JR_PUBLISHING_SEPARATE_7PCT_BUDGET')==='YES';
 $checks['smtp_cron_tested']=getenv('JR_PUBLISHING_MAIL_CRON_TESTED')==='YES';
 $pdo->beginTransaction();
 $q=$pdo->prepare("SELECT w.id work_id,w.author_id,w.publication_status,w.rights_verified_at,
   a.status author_status,f.id offer_id,f.checkout_enabled,f.retired_at,f.effective_from,
   f.unit_price_toman,f.unit_author_toman,f.unit_fund_toman,f.currency
   FROM publishing_works w JOIN publishing_authors a ON a.id=w.author_id
   JOIN publishing_offers f ON f.work_id=w.id
   WHERE w.public_slug=? AND a.slug='mehrab-mirkarimi' AND f.sku=?
   FOR UPDATE");
 $q->execute([JR_PUB_ACTIVATE_SLUG,JR_PUB_SKU]);$rows=$q->fetchAll(PDO::FETCH_ASSOC);
 $checks['exact_existing_product_and_price']=count($rows)===1
   &&(int)$rows[0]['unit_price_toman']===1000000
   &&(int)$rows[0]['unit_author_toman']===600000
   &&(int)$rows[0]['unit_fund_toman']===400000
   &&$rows[0]['currency']==='IRT'
   &&empty($rows[0]['retired_at'])
   &&strtotime((string)$rows[0]['effective_from'])<=time();
 if(!$checks['exact_existing_product_and_price']){$pdo->rollBack();jrPubActivateReport($checks);}
 $o=$rows[0];
 $q=$pdo->prepare("SELECT acc.id,acc.email_verified_at,l.approved_at
   FROM publishing_author_accounts l JOIN customer_accounts acc ON acc.id=l.account_id
   WHERE l.author_id=? AND l.role='author' AND l.revoked_at IS NULL AND acc.status='active'
   FOR UPDATE");
 $q->execute([$o['author_id']]);$accounts=$q->fetchAll(PDO::FETCH_ASSOC);
 $approved=array_values(array_filter($accounts,static fn($a):bool=>
   !empty($a['email_verified_at'])&&!empty($a['approved_at'])));
 $checks['author_account_verified']=count(array_filter($accounts,static fn($a):bool=>!empty($a['email_verified_at'])))===1;
 $checks['author_role_approved']=count($approved)===1;
 if(count($approved)===1){
  $q=$pdo->prepare("SELECT l.evidence_sha256 FROM publishing_rights_licences l
   WHERE l.work_id=? AND l.author_account_id=? AND l.rights_scope='digital_distribution'
   AND l.revoked_at IS NULL AND l.valid_from<=NOW() FOR UPDATE");
  $q->execute([$o['work_id'],$approved[0]['id']]);$licences=$q->fetchAll(PDO::FETCH_COLUMN);
  $checks['author_digital_distribution_rights']=count($licences)===1;
  $checks['rights_evidence_recorded']=count($licences)===1
    &&preg_match('/^[a-f0-9]{64}$/D',(string)$licences[0])===1
    &&getenv('JR_PUBLISHING_DIGITAL_RIGHTS_EVIDENCED')==='YES';
 }
 $q=$pdo->prepare("SELECT v.id, v.version_number FROM publishing_work_versions v
   WHERE v.work_id=? AND v.review_state IN('submitted','under_review','accepted')
   ORDER BY v.version_number DESC LIMIT 1");
 $q->execute([$o['work_id']]);$v=$q->fetch(PDO::FETCH_ASSOC);
 if($v){
  $q=$pdo->prepare("SELECT logical_kind,private_storage_name,sha256,byte_size,
     encrypted_at_rest,malware_scanned_at,approved_at
    FROM publishing_private_assets WHERE work_version_id=?
    AND logical_kind IN('question_pdf','answer_pdf') FOR UPDATE");
  $q->execute([$v['id']]);$assets=$q->fetchAll(PDO::FETCH_ASSOC);
  $seen=[];$scanned=count($assets)===2;$hashes=$scanned;
  foreach($assets as $a){
   $kind=(string)$a['logical_kind'];
   if(isset($seen[$kind])||!isset(JR_PUB_ACTIVATE_FILES[$kind])){$scanned=false;$hashes=false;break;}
   $seen[$kind]=true;
   [$name,$sha]=JR_PUB_ACTIVATE_FILES[$kind];
   if(empty($a['approved_at'])||empty($a['malware_scanned_at'])
     ||(int)$a['encrypted_at_rest']!==0)$scanned=false;
   $file=jrPubAssetPath($name);
   if($name!==(string)$a['private_storage_name']||!$file
     ||!hash_equals($sha,strtolower((string)$a['sha256']))
     ||!hash_equals($sha,(string)hash_file('sha256',$file))
     ||filesize($file)!==(int)$a['byte_size'])$hashes=false;
  }
  $checks['two_private_pdfs_scanned_and_approved']=$scanned
   &&isset($seen['question_pdf'],$seen['answer_pdf'])
   &&getenv('JR_PUBLISHING_ANTIVIRUS_COMPLETE')==='YES';
  $checks['original_pdf_hashes']=$hashes&&isset($seen['question_pdf'],$seen['answer_pdf']);
 }
 if(in_array(false,$checks,true)){
  $pdo->rollBack();jrPubActivateReport($checks);
 }
 if(!$activate){$pdo->rollBack();jrPubActivateReport($checks);}
 // The owner approves commercialization, not another person's copyright.
 // Rights, verified author identity and actual malware evidence were checked above.
 $pdo->prepare("UPDATE publishing_authors SET status='approved'
   WHERE id=? AND status IN('draft','verification_pending','approved')")
   ->execute([$o['author_id']]);
 $pdo->prepare("UPDATE publishing_works SET publication_status='approved',
   rights_verified_at=COALESCE(rights_verified_at,NOW())
   WHERE id=? AND publication_status IN('draft','prelaunch','approved')")
   ->execute([$o['work_id']]);
 $pdo->prepare("UPDATE publishing_offers SET checkout_enabled=1
   WHERE id=? AND retired_at IS NULL AND checkout_enabled IN(0,1)")
   ->execute([$o['offer_id']]);
 $offer=jrPubDigitalOffer($pdo);
 if(!$offer){$pdo->rollBack();throw new RuntimeException('post_activation_catalogue_preflight_failed');}
 $pdo->commit();
 jrPubActivateReport($checks,true);
} catch(Throwable $e) {
 if(isset($pdo)&&$pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();
 error_log('JR publishing activation refused '.get_class($e));
 fwrite(STDERR,"JR publishing activation refused: check database, rights, private assets and operator evidence; no partial activation committed.\n");
 exit(3);
}
