<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Existing ADMIN/SUPER_ADMIN + fresh MFA route only.
 * This workflow accepts independent HUMAN evidence for the authority and
 * PRIVATE-ANALYSIS rights of a previously owner-approved source candidate.
 * It does not crawl, OCR, validate answers, publish or grant resale rights.
 */
function jrKaHumanSourceReviewSnapshot(PDO $pdo,string $actor): array {
    $out=[
      'ok'=>true,'schema'=>'jr.jrei.independent-source-review.v1',
      'available'=>false,'pendingForThisReviewer'=>null,
      'queue'=>[],'truncated'=>false,'privateApprovalIsPublication'=>false,
      'actualDocumentInspectedBySystem'=>false,
      'scientificAnswerCorrectnessVerified'=>false
    ];
    try{
        $pdo->query('SELECT review_id,source_id,reviewer_account_id,
          source_fingerprint_sha256,decision FROM
          jrei_ka_source_review_attestations LIMIT 0');
        // Only a different, authenticated human reviewer can see candidates.
        // No learner data, historical comments, tokenised URLs or evidence
        // documents are returned. The URL is metadata for manual inspection.
        $q=$pdo->prepare("SELECT DISTINCT s.source_id,s.source_title,
          s.source_locator_uri,s.source_authority_id,s.source_version,
          s.country_code,s.educational_level,s.exam_category,
          s.curriculum_version,s.examination_year,s.subject_id,s.source_kind
          FROM jrei_exam_sources s
          JOIN jrei_exam_coverage_requirements r ON r.source_id=s.source_id
          WHERE s.review_state='CANDIDATE_UNREVIEWED'
            AND s.is_revoked=0 AND s.is_superseded=0
            AND r.approved_by_account_id IS NOT NULL
            AND r.approved_by_account_id<>?
            AND r.requirement_state<>'WITHDRAWN_SCOPE_ERROR'
            AND NOT EXISTS (
              SELECT 1 FROM jrei_exam_coverage_requirements other_scope
              WHERE other_scope.source_id=s.source_id
                AND other_scope.approved_by_account_id=?
                AND other_scope.requirement_state<>'WITHDRAWN_SCOPE_ERROR')
          ORDER BY s.source_id ASC LIMIT 41");
        $q->execute([$actor,$actor]);
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['available']=true;
        $out['truncated']=count($rows)>40;
        foreach(array_slice($rows,0,40) as $row){
            $out['queue'][]=[
              'sourceId'=>$row['source_id'],
              'title'=>$row['source_title'],
              'url'=>$row['source_locator_uri'],
              'claimedAuthority'=>$row['source_authority_id'],
              'version'=>$row['source_version'],
              'country'=>$row['country_code'],
              'level'=>$row['educational_level'],
              'examCategory'=>$row['exam_category'],
              'curriculumVersion'=>$row['curriculum_version'],
              'year'=>(int)$row['examination_year'],
              'subject'=>$row['subject_id'],
              'kind'=>$row['source_kind'],
              'rightsVerified'=>false,'answerKeyVerified'=>false
            ];
        }
        // A 40-item preview is not an exhaustive count; no fake total.
        $out['pendingForThisReviewer']=$out['truncated']
          ?null:count($out['queue']);
    }catch(Throwable $e){
        $out['available']=false;
        $out['queue']=[];$out['pendingForThisReviewer']=null;
    }
    return $out;
}

function jrKaIndependentHumanSourceReview(PDO $pdo,string $actor,array $body): array {
    $uuid='/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D';
    $sha='/^[a-f0-9]{64}$/D';
    $sourceId=$body['sourceId']??null;
    $action=$body['decision']??null;
    $allowed=['AUTHORIZE_PRIVATE_ANALYSIS','QUARANTINE_UNRELIABLE',
      'REQUEST_ADDITIONAL_EVIDENCE'];
    if(!is_string($sourceId)||!preg_match($uuid,$sourceId)||
       !in_array($action,$allowed,true)||
       ($body['confirmation']??null)!=='INDEPENDENT_HUMAN_METADATA_REVIEW_ONLY')
        throw new InvalidArgumentException('invalid_source_review_request');
    $proofs=[];
    if($action==='AUTHORIZE_PRIVATE_ANALYSIS'){
        foreach(['authorityEvidenceSha256','privateRightsEvidenceSha256',
                 'termsEvidenceSha256'] as $k){
            $v=$body[$k]??null;
            if(!is_string($v)||!preg_match($sha,$v))
                throw new InvalidArgumentException('documented_source_evidence_required');
            $proofs[]=$v;
        }
        if(count(array_unique($proofs))!==3)
            throw new InvalidArgumentException('separate_source_evidence_required');
    } else {
        $reason=$body['reasonCode']??null;
        if(!in_array($reason,['ISSUER_UNVERIFIED','RIGHTS_UNVERIFIED',
           'SOURCE_SCOPE_MISMATCH','DOCUMENT_WITHDRAWN',
           'FURTHER_EXPERT_REVIEW_REQUIRED'],true))
            throw new InvalidArgumentException('source_review_reason_required');
    }
    $pdo->beginTransaction();
    try{
        // Match the existing source-first lock order used by KA policies.
        $q=$pdo->prepare("SELECT source_id,source_authority_id,source_title,
          source_locator_digest,source_version,original_sha256,
          publication_date,country_code,educational_level,exam_category,
          curriculum_version,examination_year,subject_id,source_kind,
          review_state,rights_state,is_revoked,is_superseded
          FROM jrei_exam_sources WHERE source_id=? FOR UPDATE");
        $q->execute([$sourceId]);
        $source=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($source)||$source['review_state']!=='CANDIDATE_UNREVIEWED'||
           (int)$source['is_revoked']!==0||(int)$source['is_superseded']!==0)
            throw new DomainException('source_candidate_review_conflict');
        // At least one owner-approved scope must still match this exact
        // original source's recorded examination dimensions.
        $q=$pdo->prepare("SELECT requirement_id,approved_by_account_id,
          country_code,educational_level,exam_category,curriculum_version,
          examination_year,subject_id,expected_kind
          FROM jrei_exam_coverage_requirements
          WHERE source_id=? AND approved_by_account_id IS NOT NULL
            AND requirement_state<>'WITHDRAWN_SCOPE_ERROR'
          ORDER BY requirement_id ASC LIMIT 101 FOR UPDATE");
        $q->execute([$sourceId]);
        $requirements=$q->fetchAll(PDO::FETCH_ASSOC);
        if(!$requirements||count($requirements)>100)
            throw new DomainException('approved_source_scope_unavailable');
        foreach($requirements as $scope){
            if($scope['approved_by_account_id']===$actor)
                throw new DomainException('independent_source_reviewer_required');
            $fields=['country_code','educational_level','exam_category',
              'curriculum_version','examination_year','subject_id'];
            foreach($fields as $field){
                if((string)$scope[$field] !== (string)$source[$field])
                    throw new DomainException('source_scope_metadata_changed');
            }
            if($scope['expected_kind']!==$source['source_kind'])
                throw new DomainException('source_kind_changed');
        }
        // Immutable attestation binds evidence to exactly the metadata that
        // was presented for review, rather than a mutable URL alone.
        $keys=['source_id','source_authority_id','source_title',
          'source_locator_digest','source_version','original_sha256',
          'publication_date','country_code','educational_level',
          'exam_category','curriculum_version','examination_year',
          'subject_id','source_kind'];
        $fingerprint=[];
        foreach($keys as $key)$fingerprint[$key]=$source[$key];
        $json=json_encode($fingerprint,JSON_UNESCAPED_UNICODE|
          JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        $digest=hash('sha256',$json);
        $now=time();
        $id=jrKaUuid();
        $q=$pdo->prepare("INSERT INTO jrei_ka_source_review_attestations
          (review_id,source_id,reviewer_account_id,
          source_fingerprint_sha256,authority_evidence_sha256,
          private_rights_evidence_sha256,terms_evidence_sha256,
          decision,reason_code,created_at)
          VALUES(?,?,?,?,?,?,?,?,?,?)");
        $q->execute([$id,$sourceId,$actor,$digest,
          $proofs[0]??null,$proofs[1]??null,$proofs[2]??null,$action,
          $action==='AUTHORIZE_PRIVATE_ANALYSIS'?null:$body['reasonCode'],$now]);
        if($action==='AUTHORIZE_PRIVATE_ANALYSIS'){
            // NEVER mark permitted reproduction or commercially publishable.
            $q=$pdo->prepare("UPDATE jrei_exam_sources SET
              review_state='AUTHORITATIVE_REVIEWED',
              rights_state='PERMITTED_PRIVATE_ANALYSIS',
              reviewer_account_id=?,verified_at=?,updated_at=?
              WHERE source_id=? AND review_state='CANDIDATE_UNREVIEWED'
                AND is_revoked=0 AND is_superseded=0");
            $q->execute([$actor,$now,$now,$sourceId]);
        }elseif($action==='QUARANTINE_UNRELIABLE'){
            $q=$pdo->prepare("UPDATE jrei_exam_sources SET
              review_state='QUARANTINED',rights_state='PERMISSION_UNVERIFIED',
              is_revoked=1,extraction_state='HALTED',
              answer_key_state='UNKNOWN',updated_at=?
              WHERE source_id=? AND review_state='CANDIDATE_UNREVIEWED'");
            $q->execute([$now,$sourceId]);
        } else {
            // A request for more information creates a provenance event,
            // not a review stamp, download, or permission grant.
            $q=null;
        }
        if($q instanceof PDOStatement && $q->rowCount()!==1)
            throw new DomainException('source_review_concurrency_conflict');
        operationsAudit($pdo,$actor,'jrei_ka_human_source_'.$action,$sourceId);
        $pdo->commit();
        return ['ok'=>true,'recordedDecision'=>$action,
          'publicReleaseApproved'=>false,'answerAccuracyVerified'=>false,
          'realSourceDownloadPerformed'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
