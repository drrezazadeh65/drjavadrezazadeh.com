<?php
declare(strict_types=1);
/**
 * Existing-offer allocation policy update ONLY, never a sale activation.
 * Run from protected Bertina CLI after reviewing the private database.
 * No second database, schema change, checkout toggle, transaction rewrite,
 * signature claim, provider request, outbound email or file publication.
 *
 * php jr-publishing-policy-70-30-cli.php --check
 * JR_PUBLISHING_70_30_OWNER_APPROVED=YES_20261020 php ... --apply
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/publishing.php';
require_once __DIR__.'/jr-publishing-allocation-policy.php';

$args=$_SERVER['argv']??[];
if(count($args)!==2||!in_array($args[1],['--check','--apply'],true)){
 fwrite(STDERR,"Usage: php jr-publishing-policy-70-30-cli.php --check|--apply\n");exit(64);
}
$apply=$args[1]==='--apply';
if($apply&&getenv('JR_PUBLISHING_70_30_OWNER_APPROVED')!=='YES_20261020'){
 fwrite(STDERR,"POLICY=BLOCKED category=operator_context_unconfirmed\n");exit(2);
}
try{
 $pdo=db();
 if(!$pdo instanceof PDO || !jrPublishingSchemaReady($pdo))
  throw new RuntimeException('existing_publishing_schema_required');
 $pdo->beginTransaction();
 $q=$pdo->prepare("SELECT f.id,f.work_id,w.author_id,f.currency,
     f.unit_price_toman,f.unit_author_toman,f.unit_fund_toman,f.checkout_enabled,
     f.retired_at
   FROM publishing_offers f JOIN publishing_works w ON w.id=f.work_id
   JOIN publishing_authors a ON a.id=w.author_id
   WHERE f.sku=? AND w.public_slug='tefl-ma-exams-1370-1405'
     AND a.slug='mehrab-mirkarimi' FOR UPDATE");
 $q->execute(['digital:tefl-ma-exams-1370-1405']);
 $rows=$q->fetchAll(PDO::FETCH_ASSOC);
 if(count($rows)!==1)throw new RuntimeException('expected_one_existing_offer_only');
 $row=$rows[0];
 if($row['currency']!=='IRT'||(int)$row['unit_price_toman']!==JR_PUB_PRICE_TOMAN
   ||!empty($row['retired_at']))
  throw new RuntimeException('offer_identity_or_currency_mismatch');
 $author=(int)$row['unit_author_toman'];$fund=(int)$row['unit_fund_toman'];
 $already=$author===JR_PUB_AUTHOR_TOMAN&&$fund===JR_PUB_TALENT_TOMAN;
 $legacy=$author===600000&&$fund===400000;
 if(!$already&&!$legacy)throw new RuntimeException('unknown_existing_financial_policy');
 $changed=false;
 if($apply&&$legacy){
  $u=$pdo->prepare("UPDATE publishing_offers
    SET unit_author_toman=?,unit_fund_toman=?
    WHERE id=? AND unit_price_toman=? AND unit_author_toman=? AND unit_fund_toman=?");
  $u->execute([JR_PUB_AUTHOR_TOMAN,JR_PUB_TALENT_TOMAN,$row['id'],JR_PUB_PRICE_TOMAN,600000,400000]);
  if($u->rowCount()!==1)throw new RuntimeException('concurrent_offer_modification');
  // Record the policy transition in the EXISTING append-only audit table.
  // Old order snapshots, sale allocations, payouts and refunds remain intact.
  $e=$pdo->prepare("INSERT INTO publishing_audit_events
     (id,author_id,work_id,action_key,evidence_hash)
     VALUES(?,?,?,'publishing_policy_70_30_v2',
       ?)");
  $e->execute([uuidv4(),$row['author_id'],$row['work_id'],
    hash('sha256',JR_PUB_CURRENT_POLICY.'|'.$row['id'].'|600000:400000|700000:300000')]);
  $changed=true;
 }
 if($apply)$pdo->commit();else $pdo->rollBack();
 echo json_encode([
  'schema'=>'jr-publishing-policy-transition-v2',
  'mode'=>$apply?'apply':'check',
  'offerFound'=>true,'alreadyCurrent'=>$already,
  'previousPolicy'=>$legacy?JR_PUB_LEGACY_POLICY:JR_PUB_CURRENT_POLICY,
  'targetPolicy'=>JR_PUB_CURRENT_POLICY,
  'changed'=>$changed,
  'publicSalesEnabledByThisTool'=>false,
  'historicalOrderRowsModified'=>false,
  'notice'=>'New checkout requires independent payment/file delivery preflight. Legacy paid/pending orders retain their server snapshots.'
 ],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n";
}catch(Throwable $e){
 if(isset($pdo)&&$pdo instanceof PDO&&$pdo->inTransaction())$pdo->rollBack();
 $ref=bin2hex(random_bytes(6));
 error_log('JR 70/30 policy transition refused ['.$ref.'] '.get_class($e));
 fwrite(STDERR,"POLICY=BLOCKED incident=".$ref." reason=private_preflight_or_concurrency\n");
 exit(3);
}
