<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED') && PHP_SAPI!=='cli') { http_response_code(404); exit; }

/** One digital commerce pathway, integrated with existing BitPay Stage09; no second payment gateway. */
const JR_PUB_SKU = 'digital:tefl-ma-exams-1370-1405';

function jrPubPrivateDir(): ?string {
    $c=cfg();
    $configured=(string)($c['publishing_private_storage']??getenv('JR_PUBLISHING_PRIVATE_STORAGE')?:'');
    if($configured==='' || !str_starts_with($configured,'/'))return null;
    $folder=realpath($configured);$web=realpath(dirname(__DIR__,2));
    if(!$folder||!is_dir($folder)||!is_readable($folder)||!$web||
       ($folder===$web||str_starts_with($folder,$web.DIRECTORY_SEPARATOR)))return null;
    return $folder;
}
function jrPubAssetPath(string $filename): ?string {
    if(!preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._-]{9,89}$/D',$filename))return null;
    $dir=jrPubPrivateDir();if(!$dir)return null;
    $path=realpath($dir.DIRECTORY_SEPARATOR.$filename);
    if(!$path||!str_starts_with($path,$dir.DIRECTORY_SEPARATOR)||!is_file($path)||!is_readable($path))return null;
    return $path;
}
/**
 * Check both assets, rights, private files, and validated author mailbox
 * BEFORE advertising the SKU to the bank-facing commerce catalogue.
 * Pricing and SKU are server-controlled. The draft contract is not an
 * acceptance or a signature. A separate author digital_distribution right
 * from a verified account is required before collecting money.
 */
function jrPubDigitalOffer(PDO $pdo): ?array {
    try{
      if((string)(getenv('JR_PUBLISHING_DIGITAL_ENABLED')?:'')!=='true'
          ||!mailReady()||!jrPubPrivateDir()||!jrPublishingSchemaReady($pdo))return null;
      $s=$pdo->prepare("SELECT f.id offer_id,f.sku,f.unit_price_toman,
          f.unit_author_toman,f.unit_fund_toman,w.id work_id,w.author_id,
          w.title_fa,w.rights_verified_at,
          v.id version_id
        FROM publishing_offers f
        JOIN publishing_works w ON w.id=f.work_id
        JOIN publishing_authors a ON a.id=w.author_id
        JOIN publishing_work_versions v ON v.work_id=w.id
        WHERE f.sku=? AND f.checkout_enabled=1 AND f.retired_at IS NULL
          AND f.effective_from<=NOW() AND w.publication_status='approved'
          AND w.rights_verified_at IS NOT NULL AND a.status='approved'
          AND v.review_state='accepted'
        ORDER BY v.version_number DESC LIMIT 1");
      $s->execute([JR_PUB_SKU]);$o=$s->fetch(PDO::FETCH_ASSOC);if(!$o)return null;
      $price=(int)$o['unit_price_toman'];$author=(int)$o['unit_author_toman'];$fund=(int)$o['unit_fund_toman'];
      if($price!==1000000||$author!==600000||$fund!==400000||$price!==$author+$fund)return null;
      $rights=$pdo->prepare("SELECT 1 FROM publishing_rights_licences l
         JOIN customer_accounts acc ON acc.id=l.author_account_id
         JOIN publishing_author_accounts a ON a.account_id=acc.id AND a.author_id=?
         WHERE l.work_id=? AND l.rights_scope='digital_distribution'
           AND l.valid_from<=NOW() AND l.revoked_at IS NULL
           AND a.approved_at IS NOT NULL AND a.revoked_at IS NULL
           AND acc.email_verified_at IS NOT NULL AND acc.status='active'
         LIMIT 1");
      $rights->execute([$o['author_id'],$o['work_id']]);if(!$rights->fetchColumn())return null;
      $assets=$pdo->prepare("SELECT logical_kind,private_storage_name,sha256,byte_size,encrypted_at_rest,
           malware_scanned_at,approved_at
        FROM publishing_private_assets
        WHERE work_version_id=? AND logical_kind IN('question_pdf','answer_pdf')");
      $assets->execute([$o['version_id']]);$rows=$assets->fetchAll(PDO::FETCH_ASSOC);
      if(count($rows)!==2)return null;
      $seen=[];foreach($rows as $a){
        $kind=(string)$a['logical_kind'];if(isset($seen[$kind]))return null;$seen[$kind]=true;
        if(empty($a['approved_at'])||empty($a['malware_scanned_at'])||
           (int)$a['encrypted_at_rest']!==0)return null; // decryption is not implemented: fail closed
        $file=jrPubAssetPath((string)$a['private_storage_name']);if(!$file||
          filesize($file)!==(int)$a['byte_size']||
          !hash_equals(strtolower((string)$a['sha256']),hash_file('sha256',$file)))return null;
        $fp=fopen($file,'rb');if(!$fp)return null;
        $magic=fread($fp,5);fclose($fp);if($magic!=='%PDF-')return null;
      }
      if(!isset($seen['question_pdf'],$seen['answer_pdf']))return null;
      return ['sku'=>JR_PUB_SKU,'title'=>(string)$o['title_fa'],
        'price'=>$price,'kind'=>'digital','offerId'=>(string)$o['offer_id'],
        'authorId'=>(string)$o['author_id'],'workVersionId'=>(string)$o['version_id'],
        'authorShare'=>$author,'fundShare'=>$fund];
    }catch(Throwable $e){error_log('JR publishing offer preflight: '.get_class($e));return null;}
}
/** Create allocations, grant hashes and mail outbox atomically inside the bank verified Stage09 txn. */
function jrPubCommitVerifiedDigitalOrder(PDO $pdo,string $orderId,array $items): void {
    $digital=array_values(array_filter($items,static fn($x)=>($x['kind']??null)==='digital'));
    if(!$digital)return;
    if(count($digital)!==1 ||count($items)!==1)throw new RuntimeException('mixed_digital_cart_forbidden');
    $x=$digital[0];
    if(($x['sku']??'')!==JR_PUB_SKU||($x['quantity']??null)!==1||
       ($x['price']??null)!==1000000||($x['subtotal']??null)!==1000000||
       ($x['authorShare']??null)!==600000||($x['fundShare']??null)!==400000)
        throw new RuntimeException('digital_order_snapshot_invalid');
    // Payment has already been charged at this stage. DO NOT re-check online
    // SMTP, filesystem or author visibility gates: a temporary outage after
    // checkout MUST NOT hide a real paid bank transaction. Persist owed
    // fulfilment as durable grants/outbox even if delivery is temporarily down.
    $check=$pdo->prepare("SELECT f.id offer_id,w.author_id
      FROM publishing_offers f JOIN publishing_works w ON w.id=f.work_id
      JOIN publishing_work_versions v ON v.work_id=w.id
      WHERE f.id=? AND f.sku=? AND w.author_id=? AND v.id=?
       AND f.unit_price_toman=1000000 AND f.unit_author_toman=600000
       AND f.unit_fund_toman=400000 LIMIT 1");
    $check->execute([(string)$x['offerId'],JR_PUB_SKU,(string)$x['authorId'],(string)$x['workVersionId']]);
    if(!$check->fetch(PDO::FETCH_ASSOC))throw new RuntimeException('digital_order_snapshot_no_longer_matches_db');
    $ready=['offerId'=>(string)$x['offerId'],'authorId'=>(string)$x['authorId'],
      'workVersionId'=>(string)$x['workVersionId']];
    $entries=$pdo->prepare("INSERT INTO publishing_sale_allocation_entries
      (id,order_id,offer_id,author_id,line_key,entry_kind,amount_toman,currency,source_event_key)
      VALUES(?,?,?,?,?, ?,?,'IRT',?)");
    foreach([['author_share',600000],['talent_fund',400000]] as [$kind,$amount]){
      $entries->execute([uuidv4(),$orderId,$ready['offerId'],$ready['authorId'],'bundle-1',
        $kind,$amount,'jr-publishing:'. $orderId.':'.$kind]);
    }
    $c=$pdo->prepare("INSERT INTO publishing_platform_cost_entries
       (id,order_id,offer_id,event_key,reserve_rate_bps,reserve_amount_toman,entry_kind)
       VALUES(?,?,?,?,700,70000,'reserve_on_sale')");
    $c->execute([uuidv4(),$orderId,$ready['offerId'],'jr-publishing:'.$orderId.':overhead']);
    $asset=$pdo->prepare("SELECT id FROM publishing_private_assets
       WHERE work_version_id=? AND logical_kind IN('question_pdf','answer_pdf')
         AND approved_at IS NOT NULL AND malware_scanned_at IS NOT NULL");
    $asset->execute([$ready['workVersionId']]);$assetIds=$asset->fetchAll(PDO::FETCH_COLUMN);
    if(count($assetIds)!==2)throw new RuntimeException('digital_assets_not_exactly_two');
    $pepper=(string)(cfg()['auth_pepper']??'');if(strlen($pepper)<32)throw new RuntimeException('digital_secret_missing');
    $grant=$pdo->prepare("INSERT INTO publishing_digital_access_grants
      (id,order_id,offer_id,asset_id,token_hash,expires_at,max_downloads)
      VALUES(?,?,?,?,?,DATE_ADD(NOW(),INTERVAL 7 DAY),5)");
    foreach($assetIds as $assetId){
      $id=uuidv4();$raw=hash_hmac('sha256','jr-publishing-download-v1|'.$id,$pepper);
      $grant->execute([$id,$orderId,$ready['offerId'],$assetId,hash('sha256',$raw)]);
    }
    $out=$pdo->prepare("INSERT INTO publishing_notification_outbox
       (id,event_key,order_id,event_type,recipient_account_id,status)
       VALUES(?,?,?, ?,NULL,'queued')");
    foreach(['buyer_paid','author_sale'] as $event){
      $out->execute([uuidv4(),'jr-publishing:'.$orderId.':'.$event,$orderId,$event]);
    }
}
/** Never permit download from arbitrary filesystem paths supplied by buyers. */
function jrPubDownloadRoute(): never {
    header('Cache-Control: no-store, private, max-age=0');
    header('Referrer-Policy: no-referrer');header('X-Robots-Tag: noindex, noarchive');
    if(method()!=='GET')fail('method_not_allowed',405);
    $id=(string)($_GET['grant']??'');$raw=(string)($_GET['token']??'');
    if(!validUuid($id)||!preg_match('/^[a-f0-9]{64}$/D',$raw))fail('invalid_download_reference',400);
    $pdo=db();if(!$pdo||!jrPublishingSchemaReady($pdo))fail('digital_unavailable',503);
    if(!rateAllowed($pdo,'publishing_download',$id,25,3600))fail('rate_limited',429);
    $pepper=(string)(cfg()['auth_pepper']??'');
    if(strlen($pepper)<32||!hash_equals(hash_hmac('sha256','jr-publishing-download-v1|'.$id,$pepper),$raw))
        fail('download_forbidden',403);
    $hash=hash('sha256',$raw);
    try{
      $pdo->beginTransaction();
      $q=$pdo->prepare("SELECT a.private_storage_name,a.sha256,a.byte_size,a.logical_kind,
        g.download_count,g.max_downloads,g.revoked_at,g.expires_at
        FROM publishing_digital_access_grants g
        JOIN publishing_private_assets a ON a.id=g.asset_id
        JOIN commerce_orders o ON o.id=g.order_id AND o.state='paid' AND o.paid_at IS NOT NULL
        JOIN commerce_payment_claims p ON p.order_id=o.id AND p.provider='bitpay'
          AND p.transaction_id=o.provider_trans_id AND p.verified_amount=o.provider_amount
        WHERE g.id=? AND g.token_hash=? AND g.revoked_at IS NULL
          AND g.expires_at>NOW() FOR UPDATE");
      $q->execute([$id,$hash]);$row=$q->fetch(PDO::FETCH_ASSOC);
      if(!$row||(int)$row['download_count']>=(int)$row['max_downloads']){
        $pdo->rollBack();fail('download_expired_or_limit',403);
      }
      $file=jrPubAssetPath((string)$row['private_storage_name']);
      if(!$file || filesize($file)!==(int)$row['byte_size']||
         !hash_equals(strtolower((string)$row['sha256']),hash_file('sha256',$file))){
        $pdo->rollBack();fail('digital_file_unavailable',503);
      }
      $pdo->prepare('UPDATE publishing_digital_access_grants
         SET download_count=download_count+1 WHERE id=?')->execute([$id]);
      $pdo->commit();
      header('Content-Type: application/pdf');
      header('Content-Length: '.filesize($file));
      header('X-Content-Type-Options: nosniff');
      header('Content-Disposition: attachment; filename="'.($row['logical_kind']==='question_pdf'?'TEFL-Questions.pdf':'TEFL-Answers.pdf').'"');
      readfile($file);exit;
    }catch(Throwable $e){
      if($pdo->inTransaction())$pdo->rollBack();
      error_log('Publishing download error '.get_class($e));
      fail('digital_download_unavailable',503);
    }
}
