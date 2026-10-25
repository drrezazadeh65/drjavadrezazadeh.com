<?php
declare(strict_types=1);
/** Source- and claims-only exception desk. Technical CMS outage does not
 * produce owner work. The model never creates a manual approval or clears
 * the standing policy and no browser can insert an exception directly.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/owner-editorial.php';
function jrNewsExceptionAllowedCode(string $code):bool {
    return in_array($code,[
        'SOURCE_AUTHORITY_UNCONFIRMED',
        'PUBLICATION_RIGHTS_UNCONFIRMED',
        'CLAIMS_UNVERIFIED_OR_CONTRADICTED'
    ],true);
}
function jrNewsRecordOriginalEvidenceException(
    PDO $pdo,string $revisionId,array $originalDecision,int $nowEpoch
):array{
    if($nowEpoch<=0||
       !preg_match('/^[a-f0-9-]{36}$/iD',$revisionId)||
       ($originalDecision['decision']??null)!=='OWNER_EXCEPTION_QUEUE'||
       !is_array($originalDecision['reasons']??null))
        throw new InvalidArgumentException('news_original_evidence_exception_invalid');
    $issues=array_values(array_unique(array_filter(
        $originalDecision['reasons'],
        static fn($code):bool=>is_string($code)&&jrNewsExceptionAllowedCode($code)
    )));
    if(!$issues)throw new RuntimeException('news_original_owner_exception_not_about_evidence');
    $pdo->beginTransaction();
    try{
        // A revision must exist. No fabricated owner action is recorded.
        $q=$pdo->prepare(
            'SELECT revision_id FROM jrei_news_editorial_versions
             WHERE revision_id=? FOR UPDATE');
        $q->execute([$revisionId]);
        if(!$q->fetchColumn())
            throw new RuntimeException('news_owner_exception_revision_unknown');
        $ins=$pdo->prepare(
            "INSERT INTO jrei_news_owner_exceptions
             (exception_id,revision_id,issue_code,state_code,
              first_seen_at,last_seen_at,occurrence_count)
             VALUES(?,?,?,'PENDING',?,?,1)
             ON DUPLICATE KEY UPDATE
               last_seen_at=VALUES(last_seen_at),
               occurrence_count=LEAST(1000000000,occurrence_count+1),
               reviewed_by=IF(state_code='RESOLVED',NULL,reviewed_by),
               reviewed_at=IF(state_code='RESOLVED',NULL,reviewed_at),
               state_code=IF(state_code='RESOLVED','PENDING',state_code)"
        );
        foreach($issues as $code)
            $ins->execute([jrNewsPrivateUuid(),$revisionId,$code,
                $nowEpoch,$nowEpoch]);
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    return ['schema'=>'jr.jrei.news-owner-evidence-exception-stage.v1',
        'revisionId'=>$revisionId,'issueCount'=>count($issues),
        'perStoryOwnerApprovalNotSynthesized'=>true,
        'publicationPerformed'=>false];
}
function jrNewsOwnerEvidenceExceptionQueue(
    PDO $pdo,array $ownerSession,int $limit=50
):array{
    jrNewsOwnerAuthority($ownerSession);
    if($limit<1||$limit>100)
        throw new InvalidArgumentException('news_exception_owner_limit_invalid');
    $q=$pdo->prepare(
        "SELECT x.exception_id,x.revision_id,x.issue_code,x.state_code,
                x.first_seen_at,x.last_seen_at,x.occurrence_count,
                c.headline,c.source_url,c.priority_code
         FROM jrei_news_owner_exceptions x
         JOIN jrei_news_editorial_versions v ON v.revision_id=x.revision_id
         JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
         WHERE x.state_code IN ('PENDING','ACKNOWLEDGED')
         ORDER BY CASE c.priority_code
           WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END,
           x.last_seen_at DESC,x.exception_id DESC LIMIT ?"
    );
    $q->bindValue(1,$limit,PDO::PARAM_INT);
    $q->execute();
    return ['schema'=>'jr.jrei.news-owner-evidence-queue.v1',
        'items'=>$q->fetchAll(PDO::FETCH_ASSOC),
        'ownerActionOnUncertainSourcesOnly'=>true,
        'normalOfficialNewsNeverRequiresPerStoryOwnerDecision'=>true,
        'publicNewsChanged'=>false];
}
function jrNewsOwnerResolveEvidenceException(
    PDO $pdo,array $ownerSession,string $exceptionId,
    string $state,int $nowEpoch
):array{
    $auth=jrNewsOwnerAuthority($ownerSession);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$exceptionId)||
       !in_array($state,['ACKNOWLEDGED','RESOLVED'],true)||
       $nowEpoch<=0)
        throw new InvalidArgumentException('news_owner_exception_state_invalid');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare(
            'SELECT exception_id,state_code FROM jrei_news_owner_exceptions
             WHERE exception_id=? FOR UPDATE');
        $q->execute([$exceptionId]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row))throw new RuntimeException('news_owner_exception_missing');
        $pdo->prepare(
            "UPDATE jrei_news_owner_exceptions SET state_code=?,
              reviewed_by=?,reviewed_at=?
             WHERE exception_id=?"
        )->execute([$state,$auth['actor'],$nowEpoch,$exceptionId]);
        if(function_exists('operationsAudit'))
            operationsAudit($pdo,$auth['actor'],
                'jrei_news_evidence_exception_reviewed',
                hash('sha256',$exceptionId.'|'.$state));
        $pdo->commit();
        return ['exceptionId'=>$exceptionId,'state'=>$state,
            'articleApproved'=>false,'sourceAuthorizationChanged'=>false,
            'published'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
