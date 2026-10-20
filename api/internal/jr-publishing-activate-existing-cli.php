<?php
declare(strict_types=1);
/**
 * Owner-controlled, existing-row-only publishing activation.
 * --check: READ ONLY. --activate: idempotent transaction after all independent
 * verified notification recipient, owner-approved asset custody, bank and
 * mail readiness is present. Owner policy (2026-10-19): do not gate checkout
 * on a separate author licence. Never fabricate author consent or stamp
 * rights_verified_at without evidence; existing rights records are retained.
 * Run only from the authenticated Bertina CLI, never via HTTP.
 */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('BERTINA_MAIL_SMOKE_CONTEXT', true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED', true);
// Bank-readiness needs stage9SchemaReady(); CLI exits API bootstrap early.
require_once dirname(__DIR__).'/commerce-stage9.php';
require_once dirname(__DIR__).'/publishing.php';
require_once __DIR__.'/jr-publishing-digital.php';

const JR_PUB_ACTIVATE_SLUG = 'tefl-ma-exams-1370-1405';
// Asset identities and fingerprints are shared with the bank-facing offer.
function jrPubActivateReport(array $checks, bool $changed=false): never {
 $missing=array_keys(array_filter($checks,static fn(bool $ok):bool=>!$ok));
 echo json_encode([
  'schema'=>'jr-publishing-existing-offer-activation-v2',
  'operation'=>in_array('--activate',$_SERVER['argv']??[],true)?'activate':'check',
  'all_checks_passed'=>count($missing)===0,
  'missing_checks'=>$missing,
  'checks'=>$checks,
  'changed'=>$changed,
  'note'=>'Owner approval replaces the optional scanner gate, not actual PDF existence, identity or readable-file verification. Live checkout still requires the private enable switch, approved author account, exact 70/30 price, gateway and mail.'
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
  'author_account_verified'=>false,
  'author_role_approved'=>false,
  'exact_existing_product_and_price'=>false,
  'two_private_pdfs_owner_approved'=>false,
  'original_pdf_hashes'=>false,
  'two_private_pdfs_readable'=>false
 ];
 if(!($pdo instanceof PDO))jrPubActivateReport($checks);
 $checks['publishing_schema']=jrPublishingSchemaReady($pdo);
 if(!$checks['publishing_schema'])jrPubActivateReport($checks);
 $checks['commerce_gateway']=commerceReady();
 $checks['smtp']=mailReady();
 $checks['persistent_digital_switch']=jrPubDigitalSalesSwitchEnabled();
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
   &&(int)$rows[0]['unit_author_toman']===JR_PUB_AUTHOR_TOMAN
   &&(int)$rows[0]['unit_fund_toman']===JR_PUB_TALENT_TOMAN
   &&$rows[0]['currency']==='IRT'
   &&empty($rows[0]['retired_at'])
   &&strtotime((string)$rows[0]['effective_from'])<=time();
 // An existing v1 offer must first be updated by the dedicated protected
 // policy transition CLI; never silently mutate finance during activation.
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
  $seen=[];$ownerApproved=count($assets)===2;$hashes=$ownerApproved;$readable=$ownerApproved;
  foreach($assets as $a){
   $kind=(string)$a['logical_kind'];
   if(isset($seen[$kind])||!isset(JR_PUB_ORIGINAL_ASSETS[$kind])){$ownerApproved=false;$hashes=false;$readable=false;break;}
   $seen[$kind]=true;
   [$name,$sha]=JR_PUB_ORIGINAL_ASSETS[$kind];
   if(empty($a['approved_at']) || (int)$a['encrypted_at_rest']!==0)$ownerApproved=false;
   $file=jrPubAssetPath($name);
   if($name!==(string)$a['private_storage_name']||!$file
     ||!hash_equals($sha,strtolower((string)$a['sha256']))
     ||!hash_equals($sha,(string)hash_file('sha256',$file))
     ||filesize($file)!==(int)$a['byte_size'])$hashes=false;
   if(!$file){$readable=false;}else{
    $fp=fopen($file,'rb');
    if(!$fp)$readable=false;
    else{$readable=fread($fp,5)==='%PDF-' && $readable;fclose($fp);}
   }
  }
  // The owner explicitly approved these two existing PDFs. When activating,
  // persist that decision only for the two DB rows whose bytes and identities
  // exactly match the pinned originals. Never forge a scanner timestamp.
  if($activate && $hashes && $readable && isset($seen['question_pdf'],$seen['answer_pdf']) && count($assets)===2){
   $approve=$pdo->prepare("UPDATE publishing_private_assets SET approved_at=COALESCE(approved_at,NOW())
      WHERE work_version_id=? AND logical_kind IN('question_pdf','answer_pdf')
        AND encrypted_at_rest=0");
   $approve->execute([$v['id']]);
   if($approve->rowCount()>2)throw new RuntimeException('unexpected_asset_approval_count');
   $ownerApproved=true;
  }
  $checks['two_private_pdfs_owner_approved']=$ownerApproved
   &&isset($seen['question_pdf'],$seen['answer_pdf']);
  $checks['two_private_pdfs_readable']=$readable
   &&isset($seen['question_pdf'],$seen['answer_pdf']);
  $checks['original_pdf_hashes']=$hashes&&isset($seen['question_pdf'],$seen['answer_pdf']);
 }
 if(in_array(false,$checks,true)){
  $pdo->rollBack();jrPubActivateReport($checks);
 }
 if(!$activate){$pdo->rollBack();jrPubActivateReport($checks);}
 // Owner authorizes the website's sales policy; this is not an author's
 // consent or a warranty of rights. The verified author account is retained
 // for private sale notices. Genuine file checks remain required.
 $pdo->prepare("UPDATE publishing_authors SET status='approved'
   WHERE id=? AND status IN('draft','verification_pending','approved')")
   ->execute([$o['author_id']]);
 $pdo->prepare("UPDATE publishing_works SET publication_status='approved'
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
 // Correlate a sanitized operator message with the server-side log without exposing
 // SQL, filesystem paths, credentials, author identity, or exception details.
 $incident=bin2hex(random_bytes(8));
 error_log('JR publishing activation refused incident='.$incident.' exception='.get_class($e).' code='.(string)$e->getCode().' source='.basename($e->getFile()).' line='.$e->getLine());
 fwrite(STDERR,"JR publishing activation refused [incident: {$incident}]. Check the private server error log; no partial activation committed.\n");
 exit(3);
}
