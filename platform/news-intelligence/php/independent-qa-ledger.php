<?php
declare(strict_types=1);
/**
 * Separate independent scientific/editorial QA ledger.
 * The AI writer is NOT allowed to sign its own work. A verified first-party
 * independent checker or different human reviewer signs exact immutable
 * revision, source digest, approved image and an expiring evidence hash.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/candidate-intake.php';

function jrNewsRecordIndependentOriginalQa(
    PDO $pdo,string $revisionId,array $audit,
    callable $originalIndependentAuditorVerifier,int $now
):array {
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$revisionId)||$now<=0||
       ($audit['source']??null)!=='ORIGINAL_INDEPENDENT_JREI_QA'||
       !in_array($audit['auditorKind']??null,
           ['INDEPENDENT_AUTOMATED_QA','INDEPENDENT_HUMAN_QA'],true)||
       !preg_match('/^[a-f0-9]{64}$/D',(string)($audit['auditEvidenceSha256']??''))||
       ($audit['currentSourceVerified']??null)!==true||
       ($audit['allFactualClaimsSupported']??null)!==true||
       ($audit['noContradictions']??null)!==true||
       ($audit['bothLanguagesComplete']??null)!==true||
       ($audit['realAuthorCorpusStylePassed']??null)!==true||
       ($audit['nextStepsGrounded']??null)!==true||
       !is_int($audit['expiresAt']??null)||
       $audit['expiresAt']<=$now||
       $audit['expiresAt']>$now+86400)
        throw new RuntimeException('news_qa_receipt_invalid');
    $human=$audit['humanReviewerId']??null;
    $service=$audit['independentServiceId']??null;
    if(($audit['auditorKind']==='INDEPENDENT_HUMAN_QA'&&
          (!is_string($human)||
           !preg_match('/^[a-f0-9-]{36}$/iD',$human)||
           $service!==null))||
       ($audit['auditorKind']==='INDEPENDENT_AUTOMATED_QA'&&
          ($human!==null||
           !is_string($service)||!preg_match('/^[a-zA-Z0-9:._-]{6,100}$/D',$service))))
        throw new RuntimeException('news_qa_identity_invalid');
    $v=$pdo->prepare(
        "SELECT v.revision_id,v.candidate_id,v.evidence_review_id,
                v.bilingual_editorial_json,v.approval_digest,v.approved_image_ref,
                v.editorial_state,c.content_sha256,
                e.content_sha256 AS review_sha,e.verification_state,
                e.issuer_verified,e.usage_rights_verified,
                e.reviewer_account_id AS original_source_reviewer
         FROM jrei_news_editorial_versions v
         JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
         JOIN jrei_news_evidence_reviews e ON e.review_id=v.evidence_review_id
         WHERE v.revision_id=?");
    $v->execute([$revisionId]);
    $record=$v->fetch(PDO::FETCH_ASSOC);
    if(!is_array($record)||
       !in_array($record['editorial_state'],
           ['PENDING_OWNER_APPROVAL','OWNER_APPROVED'],true)||
       $record['verification_state']!=='APPROVED'||
       (int)$record['issuer_verified']!==1||
       (int)$record['usage_rights_verified']!==1||
       !hash_equals((string)$record['approval_digest'],
          hash('sha256',(string)$record['bilingual_editorial_json']))||
       !hash_equals((string)$record['review_sha'],(string)$record['content_sha256'])||
       ($audit['editorialSha256']??null)!==$record['approval_digest']||
       ($audit['sourceEvidenceSha256']??null)!==$record['content_sha256']||
       ($audit['approvedMediaRef']??null)!==$record['approved_image_ref']||
       ($human!==null && $human===$record['original_source_reviewer']))
        throw new RuntimeException('news_qa_independent_revision_mismatch');
    $original=$originalIndependentAuditorVerifier([
       'revisionId'=>$revisionId,
       'candidateId'=>$record['candidate_id'],
       'reviewId'=>$record['evidence_review_id'],
       'reviewedSourceSha256'=>$record['content_sha256'],
       'storedEditorialSha256'=>$record['approval_digest'],
       'approvedMediaRef'=>$record['approved_image_ref'],
       'auditEvidenceSha256'=>$audit['auditEvidenceSha256'],
       'auditorKind'=>$audit['auditorKind'],
       'humanReviewerId'=>$human,'independentServiceId'=>$service
    ]);
    if(!is_array($original)||
       ($original['source']??null)!=='ORIGINAL_JREI_QA_IDENTITY_SERVICE'||
       ($original['separateFromGenerator']??null)!==true||
       ($original['sourceCorpusEvidenceChecked']??null)!==true||
       ($original['auditorIdentityVerified']??null)!==true||
       ($original['signedAuditDigestCurrent']??null)!==true||
       ($original['auditEvidenceSha256']??null)!==$audit['auditEvidenceSha256'])
        throw new RuntimeException('news_qa_independent_auditor_not_verified');
    $id=jrNewsPrivateUuid();
    $pdo->beginTransaction();
    try{
        $lock=$pdo->prepare('SELECT qa_id,editorial_sha256,evidence_sha256,
            audit_evidence_sha256 FROM jrei_news_independent_qa_receipts
            WHERE revision_id=? FOR UPDATE');
        $lock->execute([$revisionId]);
        $existing=$lock->fetch(PDO::FETCH_ASSOC);
        if(is_array($existing)){
            if(!hash_equals((string)$existing['editorial_sha256'],
                   (string)$record['approval_digest'])||
               !hash_equals((string)$existing['evidence_sha256'],
                   (string)$record['content_sha256'])||
               !hash_equals((string)$existing['audit_evidence_sha256'],
                   (string)$audit['auditEvidenceSha256']))
                throw new RuntimeException('news_qa_revision_conflicting_audit');
            $pdo->commit();
            return ['qaId'=>$existing['qa_id'],'alreadyRecorded'=>true,
                'publicationPerformed'=>false];
        }
        $stmt=$pdo->prepare(
            "INSERT INTO jrei_news_independent_qa_receipts
             (qa_id,revision_id,candidate_id,evidence_review_id,
              evidence_sha256,editorial_sha256,audit_evidence_sha256,
              reviewer_account_id,independent_service_id,auditor_kind,
              current_source_verified,all_claims_supported,
              no_material_contradictions,fa_en_complete,author_style_measured,
              next_steps_grounded,verified_media_ref,verified_at,expires_at)
             VALUES(?,?,?,?,?,?,?,?,?,?,1,1,1,1,1,1,?,?,?)"
        );
        $stmt->execute([$id,$revisionId,$record['candidate_id'],
            $record['evidence_review_id'],$record['content_sha256'],
            $record['approval_digest'],$audit['auditEvidenceSha256'],
            $human,$service,$audit['auditorKind'],
            $record['approved_image_ref'],$now,$audit['expiresAt']]);
        $pdo->commit();
        return ['qaId'=>$id,'alreadyRecorded'=>false,
            'independentlyAudited'=>true,
            'sourceOwnerStandingPolicyStillNeeded'=>true,
            'publicationPerformed'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/** Fresh independent QA receipt, no shortcuts from a model-generated flag. */
function jrNewsIndependentQaCurrent(
    PDO $pdo,string $revisionId,string $expectedEditorialSha,
    string $sourceEvidenceSha,int $now
):?array {
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$revisionId)||$now<=0)
        return null;
    $q=$pdo->prepare(
        "SELECT qa_id,audit_evidence_sha256,verified_media_ref,
                auditor_kind,reviewer_account_id,independent_service_id,
                editorial_sha256,evidence_sha256,expires_at,revoked_at
         FROM jrei_news_independent_qa_receipts
         WHERE revision_id=? AND current_source_verified=1
           AND all_claims_supported=1 AND no_material_contradictions=1
           AND fa_en_complete=1 AND author_style_measured=1
           AND next_steps_grounded=1 AND verified_at<=?
           AND expires_at>? AND revoked_at IS NULL LIMIT 1");
    $q->execute([$revisionId,$now,$now]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row)||
       !hash_equals((string)$row['editorial_sha256'],$expectedEditorialSha)||
       !hash_equals((string)$row['evidence_sha256'],$sourceEvidenceSha)||
       !preg_match('/^[a-f0-9]{64}$/D',(string)$row['audit_evidence_sha256']))
        return null;
    return $row;
}
