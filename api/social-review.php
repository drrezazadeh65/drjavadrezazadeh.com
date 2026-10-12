<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/social-queue.php';

/** Stage 13 pre-publication review. No connection to any outbound API. */
function socialReviewCanonical(string $url): bool {
    $u=parse_url($url);
    if (!is_array($u) || ($u['scheme']??'')!=='https'
        || strtolower((string)($u['host']??''))!=='drjavadrezazadeh.com'
        || isset($u['port'],$u['user']) || isset($u['pass']) || isset($u['query']) || isset($u['fragment']))return false;
    return (bool)preg_match('#^/(?:fa|en)/(?:akhbar|news|rahnamaha|guides|research|articles)/[a-zA-Z0-9/_-]+/?$#D',
        (string)($u['path']??''));
}
function socialReviewPayload(PDO $pdo,array $row,int $now):array {
    $reasons=[];
    if ($row['editorial_state']!=='approved')$reasons[]='campaign_not_approved';
    if ($row['account_status']!=='verified')$reasons[]='account_not_verified';
    if ($row['provider']!==$row['account_provider'])$reasons[]='provider_mismatch';
    if (!in_array($row['provider'],['telegram','eitaa'],true))$reasons[]='provider_adapter_not_activated';
    if ($row['account_expires']!==null && (int)$row['account_expires']<=$now)$reasons[]='account_expired';
    if ((int)$row['schedule_utc']<=$now)$reasons[]='schedule_expired';
    if (!socialReviewCanonical((string)$row['source_canonical']))$reasons[]='non_public_source';
    if (strlen((string)$row['body'])>12000)$reasons[]='copy_exceeds_review_limit';
    if (!hash_equals((string)$row['body_hash'],hash('sha256',(string)$row['body'])))$reasons[]='body_changed';
    try {
        $assets=socialQueueAssetFingerprint($pdo,(string)$row['campaign_id']);
        $row['asset_fingerprint']=$assets['fingerprint'];
    } catch (DomainException $e) {
        $reasons[]='media_rights_unverified';
        $row['asset_fingerprint']='rights_unknown';
    }
    return [
        'deliveryId'=>(string)$row['id'],
        'provider'=>(string)$row['provider'],
        'accountId'=>(int)$row['account_id'],
        'accountLabel'=>(string)$row['display_handle'],
        'campaignTitle'=>(string)$row['title'],
        'sourceCanonical'=>(string)$row['source_canonical'],
        'body'=>(string)$row['body'],
        'trackingUrl'=>(string)$row['tracking_url'],
        'scheduledAt'=>$row['schedule_utc']===null?null:(int)$row['schedule_utc'],
        'reviewable'=>$reasons===[],
        'blockers'=>$reasons,
        'digest'=>$reasons===[]?socialQueueDigest($row):null,
        'sourceIndependentlyVerified'=>false
    ];
}
function socialReviewList(PDO $pdo,int $now):array {
    if (!socialQueueSchemaReady($pdo))throw new RuntimeException('social_schema_unavailable');
    $rows=$pdo->query("SELECT d.*,c.title,c.source_canonical,c.source_hash,c.editorial_state,
        a.display_handle,a.status AS account_status,a.provider AS account_provider,
        a.expires_at AS account_expires
        FROM social_deliveries d
        JOIN social_campaigns c ON c.id=d.campaign_id
        JOIN social_accounts a ON a.id=d.account_id
        WHERE d.status='draft'
        ORDER BY d.created_at DESC,d.id DESC LIMIT 25")->fetchAll();
    return [
        'ok'=>true,'schema'=>'social-review-v1','checkedAt'=>$now,
        'drafts'=>array_map(static fn($r)=>socialReviewPayload($pdo,$r,$now),$rows),
        'limitations'=>[
            'Draft approval is an administrative decision, not a verified provider connection or a post.',
            'Source page canonical and indexability require independent validation before worker activation.',
            'No content is sent by the administrator review endpoint.'
        ]
    ];
}
function socialReviewApprove(PDO $pdo,string $deliveryId,string $digest,string $admin,int $now):string {
    if (!preg_match('/^[a-f0-9]{64}$/D',$digest))throw new InvalidArgumentException('invalid_review_digest');
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare("SELECT d.*,c.title,c.source_canonical,c.source_hash,c.editorial_state,
            a.display_handle,a.status AS account_status,a.provider AS account_provider,
            a.expires_at AS account_expires
            FROM social_deliveries d JOIN social_campaigns c ON c.id=d.campaign_id
            JOIN social_accounts a ON a.id=d.account_id
            WHERE d.id=? FOR UPDATE");
        $q->execute([$deliveryId]);$row=$q->fetch();
        if (!$row || $row['status']!=='draft')throw new DomainException('review_no_longer_available');
        $preview=socialReviewPayload($pdo,$row,$now);
        if (!$preview['reviewable'] || !hash_equals($digest,(string)$preview['digest']))
            throw new DomainException('review_changed_or_blocked');
        // Apply under the SAME transaction, to avoid a gap between review and approval.
        // The queue writer does not own these admin credentials and cannot bypass this entrypoint.
        $update=$pdo->prepare("UPDATE social_deliveries SET status='scheduled',
            approved_by=?,approved_at=?,approval_digest=?,updated_at=?
            WHERE id=? AND status='draft'");
        $update->execute([$admin,$now,$digest,$now,$deliveryId]);
        if ($update->rowCount()!==1)throw new DomainException('review_conflict');
        $pdo->prepare("INSERT INTO social_audit(actor_id,delivery_id,action,event_at,evidence_digest)
            VALUES(?,?,?,?,?)")->execute([$admin,$deliveryId,'admin_review_approved',$now,$digest]);
        $pdo->commit();return $digest;
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function socialReviewReject(PDO $pdo,string $deliveryId,string $digest,string $admin,int $now):void {
    if (!preg_match('/^[a-f0-9]{64}$/D',$digest))throw new InvalidArgumentException('invalid_review_digest');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("SELECT d.*,c.title,c.source_canonical,c.source_hash,c.editorial_state,
            a.display_handle,a.status AS account_status,a.provider AS account_provider,
            a.expires_at AS account_expires
            FROM social_deliveries d JOIN social_campaigns c ON c.id=d.campaign_id
            JOIN social_accounts a ON a.id=d.account_id WHERE d.id=? FOR UPDATE");
        $q->execute([$deliveryId]);$row=$q->fetch();
        if(!$row||$row['status']!=='draft')throw new DomainException('review_no_longer_available');
        $preview=socialReviewPayload($pdo,$row,$now);
        if($preview['digest']===null || !hash_equals($digest,$preview['digest']))
            throw new DomainException('review_changed_or_blocked');
        $pdo->prepare("UPDATE social_deliveries SET status='revoked',
           updated_at=? WHERE id=? AND status='draft'")->execute([$now,$deliveryId]);
        $pdo->prepare("INSERT INTO social_audit(actor_id,delivery_id,action,event_at,evidence_digest)
           VALUES(?,?,?,?,?)")->execute([$admin,$deliveryId,'admin_review_rejected',$now,$digest]);
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
