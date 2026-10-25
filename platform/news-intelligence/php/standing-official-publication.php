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
