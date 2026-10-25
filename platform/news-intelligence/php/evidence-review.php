<?php
declare(strict_types=1);
/**
 * News evidence approval — independent human reviewer, not AI self-attestation.
 * Reviewer authority must be read from original private JREI RBAC/MFA.
 * Does not endorse admissions outcomes, copyrighted republication, exams,
 * model reasoning or public publication.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/candidate-intake.php';

function jrNewsApproveIndependentSourceEvidence(
    PDO $pdo, string $candidateId, array $review,
    callable $originalJreiSourceVerifier, int $nowEpoch
): array {
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$candidateId) ||
        $nowEpoch<=0 ||
        ($review['role']??null)!=='INDEPENDENT_NEWS_EVIDENCE_REVIEWER' ||
        ($review['verifiedOriginalJreiSession']??null)!==true ||
        ($review['mfaVerified']??null)!==true ||
        !preg_match('/^[a-f0-9-]{36}$/iD',(string)($review['accountId']??'')) ||
        ($review['issuerVerified']??null)!==true ||
        ($review['licenceReviewed']??null)!==true) {
        throw new RuntimeException('news_independent_reviewer_authority_missing');
    }
    $pdo->beginTransaction();
    try {
        $stmt=$pdo->prepare(
            'SELECT c.candidate_id,c.content_sha256,c.source_url,
                    c.state,d.approved_article_source_id,m.enabled
             FROM jrei_news_candidates c JOIN jrei_news_monitors m
               ON m.monitor_id=c.monitor_id
             JOIN jrei_news_discovered_urls d
               ON d.monitor_id=c.monitor_id
              AND BINARY d.canonical_url_sha256=BINARY SHA2(c.source_url,256)
              AND d.review_state=\'ORIGINAL_JREI_ARTICLE_APPROVED\'
             WHERE c.candidate_id=? FOR UPDATE'
        );
        $stmt->execute([$candidateId]);
        $candidate=$stmt->fetch(PDO::FETCH_ASSOC);
        if (!$candidate ||
            $candidate['state']!=='PENDING_EVIDENCE_VERIFICATION' ||
            (int)$candidate['enabled']!==1) {
            throw new RuntimeException('news_candidate_no_longer_reviewable');
        }
        // Authority, current source rights, actual content revision and
        // independently logged reviewer identity must be re-read by the
        // ORIGINAL JREI private source system, not request-supplied flags.
        $source=$originalJreiSourceVerifier(
            $candidate['approved_article_source_id'],
            $candidate['source_url'],
            $candidate['content_sha256'],
            $review['accountId']
        );
        if (!is_array($source) ||
            ($source['source']??null)!=='ORIGINAL_JREI_REVIEWED_SOURCE' ||
            ($source['policyCurrent']??null)!==true ||
            ($source['issuerEvidenceAccepted']??null)!==true ||
            ($source['publicNewsReuseAllowed']??null)!==true ||
            ($source['reviewedSourceSha256']??null)!==$candidate['content_sha256'] ||
            ($source['reviewerIndependentOfModel']??null)!==true) {
            throw new RuntimeException('news_independent_source_evidence_missing');
        }
        $id=jrNewsPrivateUuid();
        $stmt=$pdo->prepare(
            'INSERT INTO jrei_news_evidence_reviews
             (review_id,candidate_id,reviewer_account_id,content_sha256,
              verification_state,issuer_verified,usage_rights_verified,
              reviewed_at,evidence_private_reference)
             VALUES(?,?,?,?,"APPROVED",1,1,?,?)'
        );
        $privateRef=$source['reviewEvidencePrivateRef']??null;
        if (!is_string($privateRef)||strlen($privateRef)>180) $privateRef=null;
        $stmt->execute([$id,$candidateId,$review['accountId'],
            $candidate['content_sha256'],$nowEpoch,$privateRef]);
        $pdo->prepare(
            "UPDATE jrei_news_candidates SET state='EVIDENCE_REVIEWED'
             WHERE candidate_id=? AND state='PENDING_EVIDENCE_VERIFICATION'"
        )->execute([$candidateId]);
        $pdo->commit();
        return ['schema'=>'jr.jrei.news-reviewed-official-evidence.v1',
            'reviewId'=>$id,'candidateId'=>$candidateId,
            'state'=>'EVIDENCE_REVIEWED',
            'scientificSemanticClaimsUncertified'=>true,
            'ownerPublicationApprovalStillRequired'=>true,
            'published'=>false];
    } catch(Throwable $e) {
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/**
 * Original-source independent AUTOMATED EVIDENCE reviewer for official
 * announcements. This is distinct from the generative AI model, and
 * NEVER declares an unverified URL official. Real original JREI-KA
 * observation and current rights must be verified by the independent
 * service before any approved evidence row exists.
 */
function jrNewsApproveAutomatedOfficialEvidence(
    PDO $pdo,string $candidateId,array $serviceAttestation,
    callable $originalIndependentSourceVerifier,int $now
):array {
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$candidateId)||$now<=0||
       ($serviceAttestation['source']??null)!=='ORIGINAL_JREI_INDEPENDENT_EVIDENCE_SERVICE'||
       ($serviceAttestation['separateFromNewsModel']??null)!==true||
       ($serviceAttestation['originalAcquisitionDigestVerified']??null)!==true||
       ($serviceAttestation['currentOfficialIssuerChecked']??null)!==true||
       ($serviceAttestation['noContradictoryPrimaryEvidence']??null)!==true||
       ($serviceAttestation['licenceAndRobotsCurrent']??null)!==true||
       !preg_match('/^[A-Za-z0-9:._-]{6,100}$/D',
            (string)($serviceAttestation['serviceId']??''))||
       !preg_match('/^[a-f0-9]{64}$/D',
            (string)($serviceAttestation['evidenceAuditSha256']??''))||
       !is_string($serviceAttestation['auditReference']??null)||
       strlen($serviceAttestation['auditReference'])<12||
       strlen($serviceAttestation['auditReference'])>180)
        throw new RuntimeException('news_auto_independent_reviewer_missing');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare(
            "SELECT c.candidate_id,c.monitor_id,c.source_url,
                    c.content_sha256,c.state,d.approved_article_source_id,
                    m.enabled,m.jrei_source_reference,m.source_url_sha256,
                    m.policy_revision
             FROM jrei_news_candidates c
             JOIN jrei_news_monitors m ON m.monitor_id=c.monitor_id
             JOIN jrei_news_discovered_urls d
               ON d.monitor_id=c.monitor_id
              AND BINARY d.canonical_url_sha256=BINARY SHA2(c.source_url,256)
              AND d.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
             WHERE c.candidate_id=? FOR UPDATE");
        $q->execute([$candidateId]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||
           (int)$row['enabled']!==1||
           !in_array($row['state'],[
              'PENDING_EVIDENCE_VERIFICATION','EVIDENCE_REVIEWED'
           ],true)||
           !preg_match('/^[a-f0-9]{64}$/D',(string)$row['content_sha256'])||
           !preg_match('/^[a-f0-9-]{36}$/iD',
              (string)$row['approved_article_source_id']))
            throw new RuntimeException('news_auto_candidate_not_ready');
        $proof=$originalIndependentSourceVerifier([
            'candidateId'=>$candidateId,
            'feedSourceId'=>$row['jrei_source_reference'],
            'originalArticleSourceId'=>$row['approved_article_source_id'],
            'monitorId'=>$row['monitor_id'],
            'canonicalArticleUrl'=>$row['source_url'],
            'originalObservationSha256'=>$row['content_sha256'],
            'monitorFeedSha256'=>$row['source_url_sha256'],
            'monitorPolicyRevision'=>(int)$row['policy_revision'],
            'independentServiceId'=>$serviceAttestation['serviceId'],
            'independentEvidenceAuditSha256'=>
                $serviceAttestation['evidenceAuditSha256'],
            'independentAuditReference'=>$serviceAttestation['auditReference']
        ]);
        if(!is_array($proof)||
           ($proof['source']??null)!=='ORIGINAL_JREI_PRIVATE_EVIDENCE_AUTHORITY'||
           ($proof['exactOriginalArticleObservationVerified']??null)!==true||
           ($proof['verifiedPrimaryIssuerAndFeed']??null)!==true||
           ($proof['independentOfGenerativeModel']??null)!==true||
           ($proof['usageRightsForIndependentNewsSummary']??null)!==true||
           ($proof['termsAndRobotsCurrent']??null)!==true||
           ($proof['noMaterialSourceContradictions']??null)!==true||
           ($proof['originalEvidenceSha256']??null)!==$row['content_sha256']||
           ($proof['independentEvidenceAuditSha256']??null)!==
               $serviceAttestation['evidenceAuditSha256'])
            throw new RuntimeException('news_auto_independent_original_evidence_not_accepted');
        $already=$pdo->prepare(
            "SELECT review_id FROM jrei_news_evidence_reviews
             WHERE candidate_id=? AND verification_state='APPROVED'
               AND content_sha256=? LIMIT 1 FOR UPDATE");
        $already->execute([$candidateId,$row['content_sha256']]);
        $prior=$already->fetchColumn();
        if(is_string($prior)&&preg_match('/^[a-f0-9-]{36}$/iD',$prior)){
            $pdo->commit();
            return ['schema'=>'jr.jrei.news-independent-evidence.v1',
                'reviewId'=>$prior,'alreadyReviewed'=>true,
                'requiresIndividualOwnerApproval'=>false,'published'=>false];
        }
        if($row['state']!=='PENDING_EVIDENCE_VERIFICATION')
            throw new RuntimeException('news_auto_evidence_already_closed');
        $id=jrNewsPrivateUuid();
        $pdo->prepare(
            "INSERT INTO jrei_news_evidence_reviews
              (review_id,candidate_id,reviewer_account_id,
               independent_service_id,independent_evidence_sha256,
               independent_audit_reference,content_sha256,
               verification_state,issuer_verified,usage_rights_verified,
               reviewed_at,evidence_private_reference)
             VALUES(?,?,NULL,?,?,?,?,'APPROVED',1,1,?,?)"
        )->execute([$id,$candidateId,
            $serviceAttestation['serviceId'],
            $serviceAttestation['evidenceAuditSha256'],
            $serviceAttestation['auditReference'],
            $row['content_sha256'],$now,
            substr($serviceAttestation['auditReference'],0,180)]);
        $changed=$pdo->prepare(
            "UPDATE jrei_news_candidates
             SET state='EVIDENCE_REVIEWED'
             WHERE candidate_id=? AND state='PENDING_EVIDENCE_VERIFICATION'");
        $changed->execute([$candidateId]);
        if($changed->rowCount()!==1)
            throw new RuntimeException('news_auto_review_state_conflict');
        $pdo->commit();
        return ['schema'=>'jr.jrei.news-independent-evidence.v1',
            'reviewId'=>$id,'alreadyReviewed'=>false,
            'reviewAuthority'=>'ORIGINAL_INDEPENDENT_SERVICE',
            'modelSelfApprovalAllowed'=>false,
            'requiresIndividualOwnerApproval'=>false,'published'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
