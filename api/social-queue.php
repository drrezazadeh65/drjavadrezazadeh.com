<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Stage 13 durable queue primitives, independent of provider credentials.
 * No HTTP route to claim or deliver is published. Only a trusted private worker
 * may invoke these functions after account-specific authorization is audited.
 *
 * Ambiguous outcomes MUST NEVER be retried automatically. Even an expired lease
 * remains dispatching until explicitly reconciled by the operator.
 */
function socialQueueSchemaReady(PDO $pdo): bool {
    try {
        foreach (['social_accounts','social_campaigns','social_assets','social_deliveries',
                  'social_attempts','social_metrics','social_audit'] as $table) {
            $pdo->query('SELECT 1 FROM '.$table.' LIMIT 0');
        }
        return true;
    } catch (Throwable $e) { return false; }
}
function socialQueueDigest(array $row): string {
    // Exact payload, source content, selected account, schedule and approved assets.
    $value = [
        (string)$row['id'],(string)$row['campaign_id'],(string)$row['account_id'],
        (string)$row['provider'],(string)$row['format'],(string)$row['body_hash'],
        (string)$row['tracking_url'],(int)$row['schedule_utc'],
        (string)$row['source_hash'],(string)$row['asset_fingerprint']
    ];
    return hash('sha256', json_encode($value,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
}
function socialQueueAssetFingerprint(PDO $pdo, string $campaignId): array {
    $q=$pdo->prepare('SELECT id,sha256,rights_status FROM social_assets WHERE campaign_id=? ORDER BY id');
    $q->execute([$campaignId]);
    $assets=$q->fetchAll();
    foreach ($assets as $a) if ($a['rights_status']!=='verified') {
        throw new DomainException('unverified_campaign_media');
    }
    return [
        'count'=>count($assets),
        'fingerprint'=>hash('sha256',json_encode(array_map(
            static fn($a)=>[$a['id'],$a['sha256']],$assets
        ),JSON_THROW_ON_ERROR))
    ];
}
function socialQueueApprove(PDO $pdo,string $deliveryId,string $adminId,int $at): string {
    if (!preg_match('/^[a-f0-9-]{36}$/D',$deliveryId)||
        !preg_match('/^[a-f0-9-]{36}$/D',$adminId)) throw new InvalidArgumentException('invalid_identity');
    $pdo->beginTransaction();
    try {
        $lock=$pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?' FOR UPDATE':'';
        $q=$pdo->prepare('SELECT d.*,c.source_hash,c.editorial_state,a.status AS account_status,
            a.provider AS account_provider FROM social_deliveries d
            JOIN social_campaigns c ON c.id=d.campaign_id
            JOIN social_accounts a ON a.id=d.account_id
            WHERE d.id=?'.$lock);
        $q->execute([$deliveryId]);$row=$q->fetch();
        if (!$row || $row['status']!=='draft'||$row['editorial_state']!=='approved'
             ||$row['account_status']!=='verified'||$row['provider']!==$row['account_provider']
             ||(int)$row['schedule_utc']<=$at
             ||!hash_equals((string)$row['body_hash'],hash('sha256',(string)$row['body']))) {
            throw new DomainException('delivery_not_approvable');
        }
        $assets=socialQueueAssetFingerprint($pdo,(string)$row['campaign_id']);
        $row['asset_fingerprint']=$assets['fingerprint'];
        if (in_array($row['provider'],['instagram','youtube','aparat'],true) && !$assets['count'])
            throw new DomainException('approved_media_required');
        $digest=socialQueueDigest($row);
        $u=$pdo->prepare("UPDATE social_deliveries
            SET status='scheduled',approved_by=?,approved_at=?,approval_digest=?,updated_at=?
            WHERE id=? AND status='draft'");
        $u->execute([$adminId,$at,$digest,$at,$deliveryId]);
        if ($u->rowCount()!==1)throw new DomainException('approval_conflict');
        $pdo->prepare('INSERT INTO social_audit(actor_id,delivery_id,action,event_at,evidence_digest)
            VALUES(?,?,?,?,?)')->execute([$adminId,$deliveryId,'delivery_approved',$at,$digest]);
        $pdo->commit();
        return $digest;
    } catch(Throwable $e) {
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function socialQueueClaim(PDO $pdo,int $now): ?array {
    if ($now<1)throw new InvalidArgumentException('invalid_clock');
    $pdo->beginTransaction();
    try {
        $lock=$pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?' FOR UPDATE':'';
        $q=$pdo->prepare("SELECT d.*,c.source_hash,c.editorial_state,a.status AS account_status,
             a.provider AS account_provider,a.expires_at AS account_expires
             FROM social_deliveries d JOIN social_campaigns c ON c.id=d.campaign_id
             JOIN social_accounts a ON a.id=d.account_id
             WHERE d.status='scheduled' AND d.schedule_utc<=?
             ORDER BY d.schedule_utc,d.id LIMIT 1".$lock);
        $q->execute([$now]);$row=$q->fetch();
        if (!$row) {$pdo->commit();return null;}
        $assets=socialQueueAssetFingerprint($pdo,(string)$row['campaign_id']);
        $row['asset_fingerprint']=$assets['fingerprint'];
        $eligible=$row['editorial_state']==='approved' &&
          $row['account_status']==='verified' &&
          $row['provider']===$row['account_provider'] &&
          ($row['account_expires']===null || (int)$row['account_expires']>$now) &&
          is_string($row['approval_digest']) &&
          hash_equals($row['approval_digest'],socialQueueDigest($row)) &&
          hash_equals((string)$row['body_hash'],hash('sha256',(string)$row['body'])) &&
          !in_array($row['provider'],['instagram','youtube','aparat','whatsapp'],true);
        if (!$eligible) {
            // Revoked/changed payloads cannot remain in a runnable state.
            $pdo->prepare("UPDATE social_deliveries SET status='revoked',updated_at=? WHERE id=? AND status='scheduled'")
                ->execute([$now,$row['id']]);
            $pdo->prepare('INSERT INTO social_audit(actor_id,delivery_id,action,event_at,evidence_digest)
                VALUES(NULL,?,?,?,NULL)')->execute([$row['id'],'approval_invalidated',$now]);
            $pdo->commit();return ['status'=>'revoked','id'=>$row['id']];
        }
        $lease=bin2hex(random_bytes(32));
        $u=$pdo->prepare("UPDATE social_deliveries
            SET status='dispatching',lease_token=?,leased_until=?,updated_at=?
            WHERE id=? AND status='scheduled'");
        $u->execute([$lease,$now+120,$now,$row['id']]);
        if ($u->rowCount()!==1)throw new RuntimeException('concurrent_claim_conflict');
        $pdo->prepare("INSERT INTO social_attempts(delivery_id,attempt_started_at,status)
            VALUES(?,?,'pending')")->execute([$row['id'],$now]);
        $attempt=(int)$pdo->lastInsertId();
        $pdo->commit();
        // The caller holds an opaque lease. The provider adapter is still disabled
        // until separately implemented; never print this value or a token in logs.
        return ['status'=>'claimed','id'=>$row['id'],'provider'=>$row['provider'],
            'accountId'=>(int)$row['account_id'],'body'=>(string)$row['body'],
            'trackingUrl'=>(string)$row['tracking_url'],'lease'=>$lease,'attempt'=>$attempt];
    } catch (Throwable $e) {
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function socialQueueFinalize(PDO $pdo,string $id,string $lease,int $attempt,
                             string $outcome,?string $providerId,int $now): void {
    if (!preg_match('/^[a-f0-9]{64}$/D',$lease)||
        !in_array($outcome,['telegram_receipt','eitaayar_success','uncertain'],true)||
        !preg_match('/^[a-f0-9-]{36}$/D',$id))throw new InvalidArgumentException('invalid_result');
    // Only a real Telegram message_id may substantiate a Telegram receipt;
    // EitaaYar success must not be represented as an invented post ID.
    if($outcome==='telegram_receipt' && (!is_string($providerId)||
        !preg_match('/^[1-9][0-9]*$/D',$providerId)))throw new InvalidArgumentException('missing_message_id');
    if($outcome!=='telegram_receipt' && $providerId!==null)throw new InvalidArgumentException('fabricated_provider_id');
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare('SELECT status,provider FROM social_deliveries WHERE id=? AND lease_token=? FOR UPDATE');
        $q->execute([$id,$lease]);$row=$q->fetch();
        if (!$row||$row['status']!=='dispatching'||
            ($outcome==='telegram_receipt' && $row['provider']!=='telegram')||
            ($outcome==='eitaayar_success' && $row['provider']!=='eitaa'))
            throw new DomainException('delivery_state_conflict');
        $new=$outcome==='uncertain'?'uncertain':'confirmed';
        $method=$outcome==='uncertain'?null:$outcome;
        $u=$pdo->prepare('UPDATE social_deliveries
            SET status=?,provider_id=?,confirmation_method=?,confirmed_at=?,leased_until=NULL,
                lease_token=NULL,updated_at=? WHERE id=? AND status=? AND lease_token=?');
        $u->execute([$new,$providerId,$method,$method?$now:null,$now,$id,'dispatching',$lease]);
        if($u->rowCount()!==1)throw new DomainException('delivery_state_conflict');
        $u=$pdo->prepare("UPDATE social_attempts SET status=?,completed_at=?
            WHERE id=? AND delivery_id=? AND status='pending'");
        $u->execute([$new==='confirmed'?'confirmed':'uncertain',$now,$attempt,$id]);
        if($u->rowCount()!==1)throw new DomainException('attempt_state_conflict');
        $pdo->prepare('INSERT INTO social_audit(actor_id,delivery_id,action,event_at,evidence_digest)
            VALUES(NULL,?,?,?,NULL)')->execute([$id,$new,$now]);
        $pdo->commit();
    } catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
