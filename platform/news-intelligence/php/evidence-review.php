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
              AND d.canonical_url_sha256=SHA2(c.source_url,256)
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
