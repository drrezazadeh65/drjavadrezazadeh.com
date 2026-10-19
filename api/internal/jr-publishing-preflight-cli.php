<?php
declare(strict_types=1);
/**
 * JR publishing runbook: CLI-only, READ-ONLY, secret-free deployment checks.
 * Run before enabling customer payments, and after deploying private PDFs.
 * It NEVER charges a gateway, updates database, or accepts a draft contract.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
// Bank-readiness needs stage9SchemaReady(); CLI exits API bootstrap early.
require_once dirname(__DIR__).'/commerce-stage9.php';
require_once dirname(__DIR__).'/publishing.php';
require_once __DIR__.'/jr-publishing-digital.php';
$checks=[];
function jrPreflight(string $name,bool $ready,string $explanation): void {
  global $checks;
  $checks[$name]=['ready'=>$ready,'note'=>$explanation];
}
try{
  $cfg=cfg();
  $pdo=db();
  jrPreflight('runtime_php',PHP_VERSION_ID>=80100,'PHP 8.1+ required');
  jrPreflight('database',$pdo instanceof PDO,'PDO MySQL connection must work');
  $schema=$pdo instanceof PDO && jrPublishingSchemaReady($pdo);
  jrPreflight('publishing_sql_migrations',$schema,'Canonical and contract/cost schema present on Bertina');
  jrPreflight('site_tls',($cfg['public_tls_confirmed']??false)===true,'TLS enabled for checkout and signed links');
  jrPreflight('gateway',commerceReady(),'Existing bank provider integration: config/schema only, not a verified live payment');
  jrPreflight('smtp',mailReady(),'SMTP config: does NOT verify external recipient inbox delivery');
  jrPreflight('author_account_email',false,'Author must have active email-verified account mapped privately to the work');
  jrPreflight('author_digital_rights',false,'Digital distribution consent evidence must be independently verified');
  jrPreflight('private_pdfs',false,'Two verified file hashes outside web root, malware scan evidence required');
  jrPreflight('financial_platform_budget',getenv('JR_PUBLISHING_SEPARATE_7PCT_BUDGET')==='YES',
    '70,000-toman separate platform cost source must be authorised and bank-reconciled');
  jrPreflight('product_offer_ready',false,'Requires private canonical offer seed and both PDFs');
  jrPreflight('smtp_cron_confirmed',getenv('JR_PUBLISHING_MAIL_CRON_TESTED')==='YES',
    'Operator must test private cron and dead-letter monitoring');
  jrPreflight('end_to_end_bank_test',getenv('JR_PUBLISHING_LIVE_E2E_BANK_TEST_VERIFIED')==='YES',
    'Real payment, author notice, buyer delivery, accounting verification, no duplicate callback');
  if($schema){
    $email=strtolower(trim((string)getenv('JR_PUBLISHING_AUTHOR_EMAIL')));
    if(filter_var($email,FILTER_VALIDATE_EMAIL)){
      $q=$pdo->prepare("SELECT 1 FROM customer_accounts acc
        JOIN publishing_author_accounts link ON link.account_id=acc.id
        JOIN publishing_authors a ON a.id=link.author_id
        WHERE acc.email_normalized=? AND acc.email_verified_at IS NOT NULL
          AND acc.status='active' AND a.slug='mehrab-mirkarimi'
          AND link.role='author' AND link.approved_at IS NOT NULL
          AND link.revoked_at IS NULL LIMIT 1");
      $q->execute([$email]);
      jrPreflight('author_account_email',(bool)$q->fetchColumn(),'Email verified and author role approved (recipient address is redacted)');
    }
    $q=$pdo->prepare("SELECT 1 FROM publishing_rights_licences l
      JOIN publishing_works w ON w.id=l.work_id
      WHERE w.public_slug='tefl-ma-exams-1370-1405' AND
        l.rights_scope='digital_distribution' AND l.revoked_at IS NULL
        AND l.valid_from<=NOW() AND LENGTH(l.evidence_sha256)=64 LIMIT 1");
    $q->execute();
    jrPreflight('author_digital_rights',(bool)$q->fetchColumn(),'Rights record exists; human validation of underlying author evidence still mandatory');
  }
  $dir=jrPubPrivateDir();
  $checksums=[
   'tefl_1370_1405_questions.pdf'=>'6245641c453e92ee005c4176575ef315b96ac72fd8535b7e3ff67c2369dda7c8',
   'tefl_1370_1405_answers.pdf'=>'db8070f8a88723c1947a094a461ad2f703192092b09f03255867bbab53fa2ab4'
  ];
  if($dir!==null){
    $ok=true;
    foreach($checksums as $file=>$hash){
      $p=jrPubAssetPath($file);
      if(!$p || !hash_equals($hash,hash_file('sha256',$p))){
        $ok=false;break;
      }
    }
    jrPreflight('private_pdfs',$ok,'Verified exact original byte hashes; separate malware scan evidence still mandatory');
  }
  if($schema){
    $ready=jrPubDigitalOffer($pdo);
    jrPreflight('product_offer_ready',$ready!==null,'SKU, rights, private files and SMTP preflight; still requires real E2E payment');
  }
  $passed=count(array_filter($checks,fn($x)=>$x['ready']));
  $result=[
    'schema'=>'jr-publishing-private-release-preflight-v1',
    'scope'=>'private_operator_only_no_payment_side_effect',
    'passed'=>$passed,'total'=>count($checks),
    // Environment flags are not independently verifiable evidence of a test
    // sale or bank reconciliation. Only the real release review can approve.
    'ready_for_public_sales'=>false,
    'technical_flags_present'=>$passed===count($checks),
    'checks'=>$checks,
    'independent_live_purchase_evidence_read_here'=>false,
    'notice'=>'A positive preflight is not evidence of actual bank payment or legal review. Operator must confirm author rights and an independent test sale.'
  ];
  echo json_encode($result,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
  exit($passed===count($checks)?0:2); // technical status only; independent operational approval remains required
}catch(Throwable $e){
  fwrite(STDERR,"JR publishing private preflight encountered an unavailable service; no secrets printed.\n");
  exit(3);
}
