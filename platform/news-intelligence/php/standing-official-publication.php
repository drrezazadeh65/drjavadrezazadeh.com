<?php
declare(strict_types=1);
/**
 * The ORIGINAL JREI News publisher's alternative durable authorization.
 * This is a source-only module, not a public endpoint or background worker.
 * A signed owner-MFA policy is granted ONCE for a bounded interval; it does
 * NOT masquerade as individual editorial owner approval or relax source QA.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/owner-editorial.php';
require_once __DIR__.'/official-auto-handoff.php';

function jrNewsGrantStandingOfficialPolicy(
    PDO $pdo,array $ownerSession,string $confirmation,
    int $nowEpoch,int $durationDays=90
): array {
    $auth=jrNewsOwnerAuthority($ownerSession);
    if($confirmation!=='AUTHORIZE_VERIFIED_PRIMARY_OFFICIAL_NEWS'||
       $nowEpoch<=0||$durationDays<1||$durationDays>90||
       !function_exists('operationsAudit'))
        throw new RuntimeException('news_standing_policy_owner_authorization_missing');
    $expires=$nowEpoch+86400*$durationDays;
    $pdo->beginTransaction();
    try {
        // Serialize policy revisions against one ORIGINAL owner identity.
        $lock=$pdo->prepare('SELECT id FROM customer_accounts WHERE id=? FOR UPDATE');
        $lock->execute([$auth['actor']]);
        if(!$lock->fetchColumn())
            throw new RuntimeException('news_standing_policy_owner_not_found');
        $q=$pdo->prepare(
            'SELECT COALESCE(MAX(revision_number),0)+1
               FROM jrei_news_standing_policies WHERE owner_account_id=?');
        $q->execute([$auth['actor']]);
        $revision=(int)$q->fetchColumn();
        if($revision<1)throw new RuntimeException('news_standing_revision_invalid');
        $id=jrNewsPrivateUuid();
        $digest=hash('sha256',implode('|',[
            'jr.jrei.news-standing-owner-policy.v1',$id,$auth['actor'],
            'OFFICIAL_PRIMARY_AUTO_NEWS',(string)$revision,
            (string)$nowEpoch,(string)$expires
        ]));
        $pdo->prepare(
            "INSERT INTO jrei_news_standing_policies
             (policy_id,owner_account_id,owner_mfa_audit_ref,policy_code,
              policy_digest,revision_number,effective_at,expires_at,
              revoked_at,created_at)
             VALUES(?,?,?,'OFFICIAL_PRIMARY_AUTO_NEWS',?,?,?,?,NULL,?)"
        )->execute([$id,$auth['actor'],$auth['audit'],$digest,
            $revision,$nowEpoch,$expires,$nowEpoch]);
        operationsAudit($pdo,$auth['actor'],
            'jrei_news_standing_policy_granted',hash('sha256',$id));
        $pdo->commit();
        return ['schema'=>'jr.jrei.news-standing-policy-receipt.v1',
            'policyId'=>$id,'policyRevision'=>$revision,
            'effectiveAt'=>$nowEpoch,'expiresAt'=>$expires,
            'ownerMfaAuditRecorded'=>true,'individualNewsApproved'=>false,
            'crawlerStarted'=>false,'published'=>false];
    } catch(Throwable $e) {
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

function jrNewsRevokeStandingOfficialPolicy(
    PDO $pdo,array $ownerSession,string $policyId,int $nowEpoch
): array {
    $auth=jrNewsOwnerAuthority($ownerSession);
    if(preg_match('/^[a-f0-9-]{36}$/iD',$policyId)!==1||
       $nowEpoch<=0||!function_exists('operationsAudit'))
        throw new RuntimeException('news_standing_policy_revoke_invalid');
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare(
            'SELECT policy_id,revoked_at FROM jrei_news_standing_policies
              WHERE policy_id=? AND owner_account_id=? FOR UPDATE');
        $q->execute([$policyId,$auth['actor']]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row))throw new RuntimeException('news_policy_not_owned');
        if($row['revoked_at']===null){
            $pdo->prepare(
                'UPDATE jrei_news_standing_policies SET revoked_at=?
                  WHERE policy_id=? AND revoked_at IS NULL'
            )->execute([$nowEpoch,$policyId]);
            operationsAudit($pdo,$auth['actor'],
                'jrei_news_standing_policy_revoked',hash('sha256',$policyId));
        }
        $pdo->commit();
        return ['policyId'=>$policyId,'revoked'=>true,
            'existingPublishedPagesRetractedByCall'=>false,
            'futureAutomaticStagingBlocked'=>true];
    } catch(Throwable $e) {
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/**
 * Stages a candidate for the ORIGINAL authenticated CMS, not a real web
 * publication. A verified source, licensed article, review, bilingual SHA,
 * QA, route availability and active standing policy must all exist.
 * Slow source/CMS rechecks run OUTSIDE the database transaction.
 */
function jrNewsStageStandingOfficialPublication(
    PDO $pdo,string $revisionId,string $policyId,
    callable $originalIndependentQualityCmsResolver,int $nowEpoch
): array {
    if(preg_match('/^[a-f0-9-]{36}$/iD',$revisionId)!==1||
       preg_match('/^[a-f0-9-]{36}$/iD',$policyId)!==1||$nowEpoch<=0)
        throw new InvalidArgumentException('news_standing_stage_invalid');
    $ready=jrNewsOriginalAutoHandoffReadiness(
        $pdo,$revisionId,$originalIndependentQualityCmsResolver);
    if(($ready['decision']??null)!=='ELIGIBLE_FOR_AUTOMATED_CMS_HANDOFF')
        return ['state'=>'NOT_ELIGIBLE','decision'=>$ready['decision']??'SYSTEM_HOLD',
            'published'=>false,'reasons'=>$ready['concerns']??$ready['blockers']??[]];
    $pdo->beginTransaction();
    try {
        $p=$pdo->prepare(
            "SELECT policy_id,owner_account_id,owner_mfa_audit_ref,
                    policy_code,policy_digest,revision_number,effective_at,
                    expires_at,revoked_at
             FROM jrei_news_standing_policies WHERE policy_id=? FOR UPDATE");
        $p->execute([$policyId]);
        $policy=$p->fetch(PDO::FETCH_ASSOC);
        if(!is_array($policy)||$policy['policy_code']!=='OFFICIAL_PRIMARY_AUTO_NEWS'||
           $policy['revoked_at']!==null||
           (int)$policy['effective_at']>$nowEpoch||
           (int)$policy['expires_at']<=$nowEpoch||
           !preg_match('/^[a-zA-Z0-9._:-]{5,100}$/D',
              (string)$policy['owner_mfa_audit_ref']))
            throw new RuntimeException('news_standing_policy_missing_expired_or_revoked');
        $expectedDigest=hash('sha256',implode('|',[
            'jr.jrei.news-standing-owner-policy.v1',
            $policy['policy_id'],$policy['owner_account_id'],
            $policy['policy_code'],(string)$policy['revision_number'],
            (string)$policy['effective_at'],(string)$policy['expires_at']
        ]));
        if(!hash_equals($expectedDigest,(string)$policy['policy_digest']))
            throw new RuntimeException('news_standing_policy_digest_changed');
        // Keep a DB-level lock while checking immutable current draft and
        // already-staged route idempotency. Never accept browser-proposed routes.
        $s=$pdo->prepare(
            "SELECT v.approval_digest,v.bilingual_editorial_json,v.editorial_state
               FROM jrei_news_editorial_versions v WHERE revision_id=? FOR UPDATE");
        $s->execute([$revisionId]);
        $draft=$s->fetch(PDO::FETCH_ASSOC);
        if(!is_array($draft)||$draft['editorial_state']!=='PENDING_OWNER_APPROVAL'||
           !hash_equals((string)$draft['approval_digest'],
             hash('sha256',(string)$draft['bilingual_editorial_json'])))
            throw new RuntimeException('news_standing_draft_changed');
        $payload=json_decode((string)$draft['bilingual_editorial_json'],true,24,
            JSON_THROW_ON_ERROR);
        $routes=$payload['routeProposal']??null;
        if(!is_array($routes)||
           !preg_match('#^/fa/akhbar/[a-z0-9-]+/$#D',(string)($routes['faPath']??''))||
           !preg_match('#^/en/news-insights/[a-z0-9-]+/$#D',
             (string)($routes['enPath']??'')))
            throw new RuntimeException('news_standing_route_invalid');
        $f=$routes['faPath'];$e=$routes['enPath'];
        $already=$pdo->prepare(
            'SELECT publication_id,approved_decision_id,standing_policy_id,
                    fa_route,en_route,publisher_state
               FROM jrei_news_publications WHERE revision_id=? FOR UPDATE');
        $already->execute([$revisionId]);
        $existing=$already->fetch(PDO::FETCH_ASSOC);
        if(is_array($existing)){
            if($existing['standing_policy_id']!==$policyId||
               $existing['approved_decision_id']!==null||
               $existing['fa_route']!==$f||$existing['en_route']!==$e)
                throw new RuntimeException('news_standing_existing_publication_conflict');
            $pdo->commit();
            return ['state'=>$existing['publisher_state'],
                'publicationId'=>$existing['publication_id'],
                'alreadyStaged'=>true,'publishedByThisCall'=>false];
        }
        $id=jrNewsPrivateUuid();
        $pdo->prepare(
            "INSERT INTO jrei_news_publications
             (publication_id,revision_id,approved_decision_id,standing_policy_id,
              fa_route,en_route,publisher_state,published_at)
             VALUES(?,?,NULL,?,?,?,'WAITING_FOR_PUBLISHER',NULL)"
        )->execute([$id,$revisionId,$policyId,$f,$e]);
        $pdo->commit();
        return ['schema'=>'jr.jrei.news-standing-publishing-stage.v1',
            'state'=>'WAITING_FOR_PUBLISHER','publicationId'=>$id,
            'standingPolicyId'=>$policyId,'sourcePolicyRecheckRequiredOnDispatch'=>true,
            'publishedByThisCall'=>false,'cmsReceiptRequired'=>true];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/**
 * Accept an authentic ORIGINAL-CMS bilingual receipt for an owner-standing
 * authorization. A queued row and owner policy alone cannot mark PUBLISHED.
 * The original server must recheck CURRENT source/QA/policy before invoking
 * its authenticated CMS; callbacks must never be client supplied.
 */
function jrNewsConfirmStandingOriginalCmsPublication(
    PDO $pdo,string $publicationId,array $privateActivation,
    callable $originalIndependentQualityCmsResolver,
    callable $verifyOriginalCmsReceipt,int $nowEpoch
): array {
    if(preg_match('/^[a-f0-9-]{36}$/iD',$publicationId)!==1||
       $nowEpoch<=0||
       ($privateActivation['source']??null)!=='ORIGINAL_PRIVATE_CMS'||
       ($privateActivation['finalIntegratedAcceptanceVerified']??null)!==true||
       ($privateActivation['standingOfficialNewsPublishingEnabled']??null)!==true)
        throw new RuntimeException('news_standing_original_cms_not_activated');
    $sql="SELECT p.publication_id,p.revision_id,p.fa_route,p.en_route,
                p.publisher_state,p.publisher_receipt_reference,
                p.fa_content_sha256,p.en_content_sha256,
                p.approved_decision_id,p.standing_policy_id,
                v.approval_digest,v.bilingual_editorial_json,
                v.editorial_state,
                pol.policy_digest,pol.policy_code,pol.effective_at,
                pol.expires_at,pol.revoked_at
         FROM jrei_news_publications p
         JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
         JOIN jrei_news_standing_policies pol ON pol.policy_id=p.standing_policy_id
         WHERE p.publication_id=?";
    $q=$pdo->prepare($sql);
    $q->execute([$publicationId]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row)||$row['approved_decision_id']!==null||
       $row['policy_code']!=='OFFICIAL_PRIMARY_AUTO_NEWS'||
       $row['revoked_at']!==null||
       (int)$row['effective_at']>$nowEpoch||
       (int)$row['expires_at']<=$nowEpoch||
       $row['editorial_state']!=='PENDING_OWNER_APPROVAL'||
       !in_array($row['publisher_state'],
            ['WAITING_FOR_PUBLISHER','PUBLISHED'],true)||
       !hash_equals((string)$row['approval_digest'],
           hash('sha256',(string)$row['bilingual_editorial_json'])))
        throw new RuntimeException('news_standing_publication_authority_not_current');
    // The publisher checks independent original receipts again on every
    // handoff; a staged article cannot survive an upstream source revocation.
    $fresh=jrNewsOriginalAutoHandoffReadiness(
        $pdo,$row['revision_id'],$originalIndependentQualityCmsResolver);
    if(($fresh['decision']??null)!=='ELIGIBLE_FOR_AUTOMATED_CMS_HANDOFF')
        throw new RuntimeException('news_standing_source_or_quality_recheck_failed');
    $json=json_decode((string)$row['bilingual_editorial_json'],true,24,
        JSON_THROW_ON_ERROR);
    $routes=$json['routeProposal']??null;
    if(!is_array($routes)||
       ($routes['faPath']??null)!==$row['fa_route']||
       ($routes['enPath']??null)!==$row['en_route'])
        throw new RuntimeException('news_standing_publisher_route_changed');
    $receipt=$verifyOriginalCmsReceipt([
        'publicationId'=>$publicationId,'revisionId'=>$row['revision_id'],
        'faRoute'=>$row['fa_route'],'enRoute'=>$row['en_route'],
        'approvalDigest'=>$row['approval_digest'],
        'policyId'=>$row['standing_policy_id']
    ]);
    if(!is_array($receipt)||
       ($receipt['source']??null)!=='ORIGINAL_AUTHENTICATED_CMS'||
       ($receipt['verified']??null)!==true||
       ($receipt['bothCanonicalDocumentsVerified']??null)!==true||
       ($receipt['sourceRecheckedAfterPublication']??null)!==true||
       ($receipt['approvalDigest']??null)!==$row['approval_digest']||
       ($receipt['faRoute']??null)!==$row['fa_route']||
       ($receipt['enRoute']??null)!==$row['en_route']||
       ($receipt['standingPolicyId']??null)!==$row['standing_policy_id']||
       preg_match('/^[a-f0-9]{64}$/D',(string)($receipt['faContentSha256']??''))!==1||
       preg_match('/^[a-f0-9]{64}$/D',(string)($receipt['enContentSha256']??''))!==1||
       !is_string($receipt['receiptReference']??null)||
       strlen($receipt['receiptReference'])<8||
       strlen($receipt['receiptReference'])>200)
        throw new RuntimeException('news_standing_cms_receipt_invalid');
    $pdo->beginTransaction();
    try{
        $lock=$pdo->prepare($sql.' FOR UPDATE');
        $lock->execute([$publicationId]);
        $current=$lock->fetch(PDO::FETCH_ASSOC);
        if(!is_array($current)||$row!==$current||
           $current['revoked_at']!==null||
           (int)$current['expires_at']<=$nowEpoch)
            throw new RuntimeException('news_standing_publication_changed_during_cms_verification');
        if($current['publisher_state']==='PUBLISHED'){
            if($current['publisher_receipt_reference']!==$receipt['receiptReference']||
               $current['fa_content_sha256']!==$receipt['faContentSha256']||
               $current['en_content_sha256']!==$receipt['enContentSha256'])
                throw new RuntimeException('news_standing_duplicate_receipt_conflict');
            $pdo->commit();
            return ['status'=>'ALREADY_PUBLISHED','publicationId'=>$publicationId,
                'newPublicWrite'=>false,'originalCmsReceiptVerified'=>true];
        }
        $up=$pdo->prepare(
            "UPDATE jrei_news_publications SET
               publisher_state='PUBLISHED',published_at=?,
               publisher_receipt_reference=?,
               fa_content_sha256=?,en_content_sha256=?
             WHERE publication_id=? AND publisher_state='WAITING_FOR_PUBLISHER'
               AND approved_decision_id IS NULL AND standing_policy_id=?"
        );
        $up->execute([$nowEpoch,$receipt['receiptReference'],
            $receipt['faContentSha256'],$receipt['enContentSha256'],
            $publicationId,$row['standing_policy_id']]);
        if($up->rowCount()!==1)
            throw new RuntimeException('news_standing_publication_cas_lost');
        $pdo->commit();
        return ['schema'=>'jr.jrei.news-standing-original-receipt.v1',
            'status'=>'PUBLISHED','publicationId'=>$publicationId,
            'cmsDocumentHashesVerified'=>true,
            'publicWritePerformedByOriginalCmsNotThisModule'=>true,
            'sourceRightsRecheckRequiredForFurtherDistribution'=>true];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/** Read-only compatibility probe: old manual-only releases remain supported. */
function jrNewsStandingPublicSchemaInstalled(PDO $pdo): bool {
    // Fresh only-read metadata: tests also verify upgrades within one CLI
    // process, so a cached pre-migration FALSE must never remain stale.
    $result=false;
    try{
        $c=$pdo->query(
            "SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA=DATABASE()
               AND TABLE_NAME='jrei_news_publications'
               AND COLUMN_NAME='standing_policy_id'"
        )->fetchColumn();
        $p=$pdo->query(
            "SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
             WHERE TABLE_SCHEMA=DATABASE() AND
               ((TABLE_NAME='jrei_news_publications' AND
                 CONSTRAINT_NAME='ck_jrei_news_publication_authority_xor' AND
                 CONSTRAINT_TYPE='CHECK')
               OR (TABLE_NAME='jrei_news_standing_policies' AND
                 CONSTRAINT_NAME='PRIMARY' AND CONSTRAINT_TYPE='PRIMARY KEY'))"
        )->fetchColumn();
        $result=(int)$c===1 && (int)$p===2;
    }catch(Throwable $e){$result=false;}
    return $result;
}
/**
 * The public read path checks original evidence plus ONE durable owner
 * authorization. Standing-policy expiry/revocation after a historical
 * publication does not silently erase published articles; correction and
 * retraction still use the original governance workflow.
 */
function jrNewsPublicationAuthorityPredicate(bool $standing): string {
    $manual="(p.approved_decision_id IS NOT NULL
        AND d.action_code='APPROVE'
        AND v.editorial_state='OWNER_APPROVED'
        AND d.revision_id=p.revision_id
        AND d.approval_digest=v.approval_digest)";
    if(!$standing)return $manual;
    $policyHash="SHA2(CONCAT('jr.jrei.news-standing-owner-policy.v1','|',
        pol.policy_id,'|',pol.owner_account_id,'|',pol.policy_code,'|',
        pol.revision_number,'|',pol.effective_at,'|',pol.expires_at),256)";
    $automatic="(p.approved_decision_id IS NULL
        AND p.standing_policy_id IS NOT NULL
        AND v.editorial_state='PENDING_OWNER_APPROVAL'
        AND pol.policy_code='OFFICIAL_PRIMARY_AUTO_NEWS'
        AND BINARY pol.policy_digest=BINARY ".$policyHash."
        AND pol.effective_at<=p.published_at
        AND pol.expires_at>p.published_at
        AND (pol.revoked_at IS NULL OR pol.revoked_at>p.published_at))";
    return '('.$manual.' OR '.$automatic.')';
}
