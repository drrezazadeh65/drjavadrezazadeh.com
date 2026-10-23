<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Independent, auditable human review of curriculum-ID and GRADE alignment.
 * Not an official curriculum catalogue or scientific truth verifier.
 * Called only by the original ADMIN/SUPER_ADMIN fresh-MFA/CSRF route.
 */
function jrKaScopeAlignmentReviewQueue(PDO $pdo,string $actor): array {
    $out=['schema'=>'jr.jrei.curriculum-grade-human-review.v1',
      'available'=>false,'queue'=>[],'truncated'=>false,
      'independentCurriculumEvidenceSystemVerified'=>false,
      'examinationContentValidated'=>false];
    try{
        $q=$pdo->prepare("SELECT r.requirement_id,r.country_code,
            r.curriculum_id,r.curriculum_version,r.grade,
            r.educational_level,r.exam_category,r.examination_year,
            r.subject_id,r.expected_kind,s.source_id,s.source_title,
            s.source_version,s.updated_at,
            a.review_state AS alignment_state,a.revision AS alignment_revision
          FROM jrei_exam_coverage_requirements r
          JOIN jrei_exam_sources s ON s.source_id=r.source_id
          LEFT JOIN jrei_ka_scope_alignment_current a
            ON a.requirement_id=r.requirement_id
          WHERE r.requirement_state<>'WITHDRAWN_SCOPE_ERROR'
            AND r.approved_by_account_id IS NOT NULL
            AND r.approved_by_account_id<>?
            AND s.reviewer_account_id IS NOT NULL
            AND s.reviewer_account_id<>?
            AND s.review_state='AUTHORITATIVE_REVIEWED'
            AND s.rights_state IN
              ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
            AND s.is_revoked=0 AND s.is_superseded=0
            AND s.verified_at IS NOT NULL
            AND NOT (a.review_state='ATTESTED_SCOPE_ALIGNMENT'
              AND a.source_id=s.source_id
              AND a.source_version=s.source_version
              AND a.source_updated_at=s.updated_at
              AND a.source_locator_digest<=>s.source_locator_digest
              AND a.curriculum_id=r.curriculum_id
              AND a.grade=r.grade
              AND a.evidence_sha256 IS NOT NULL
              AND a.reviewed_by_account_id IS NOT NULL
              AND a.reviewed_by_account_id<>r.approved_by_account_id
              AND a.reviewed_by_account_id<>s.reviewer_account_id)
          ORDER BY r.examination_year DESC,r.created_at DESC,
             r.requirement_id LIMIT 31");
        $q->execute([$actor,$actor]);
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['truncated']=count($rows)>30;
        foreach(array_slice($rows,0,30) as $row){
            $out['queue'][]=[
              'requirementId'=>$row['requirement_id'],
              'sourceId'=>$row['source_id'],
              'sourceTitle'=>$row['source_title'],
              'country'=>$row['country_code'],
              'curriculum'=>$row['curriculum_id'],
              'curriculumVersion'=>$row['curriculum_version'],
              'grade'=>(int)$row['grade'],
              'level'=>$row['educational_level'],
              'examCategory'=>$row['exam_category'],
              'year'=>(int)$row['examination_year'],
              'subject'=>$row['subject_id'],
              'expectedKind'=>$row['expected_kind'],
              'previousDecision'=>$row['alignment_state'],
              'revision'=>$row['alignment_revision']===null?
                null:(int)$row['alignment_revision'],
              'originalSourceVersion'=>$row['source_version'],
              'sourceUpdatedAt'=>(int)$row['updated_at']
            ];
        }
        $out['available']=true;
    }catch(Throwable $e){
        // Incomplete additive migration: unknown, not 0 successful reviews.
        $out['queue']=[];$out['truncated']=false;
    }
    return $out;
}
function jrKaIndependentScopeAlignmentDecision(PDO $pdo,string $actor,
    array $body): array {
    $uuid='/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D';
    $id=$body['requirementId']??null;
    $sourceId=$body['sourceId']??null;
    $decision=$body['decision']??null;
    $revision=$body['revision']??null;
    $approve=$decision==='ATTESTED_SCOPE_ALIGNMENT';
    if(!is_string($id)||!preg_match($uuid,$id)||
       !is_string($sourceId)||!preg_match($uuid,$sourceId)||
       !in_array($decision,['ATTESTED_SCOPE_ALIGNMENT',
           'REJECTED_SCOPE_ALIGNMENT','REVOKED_SCOPE_ALIGNMENT'],true)||
       !($revision===null||(is_int($revision)&&$revision>=1))||
       ($body['confirmation']??null)!=='REVIEW_CURRICULUM_GRADE_HUMAN_EVIDENCE')
        throw new InvalidArgumentException('invalid_curriculum_scope_review');
    $evidence=$body['evidenceSha256']??null;
    $reason=$body['reasonCode']??null;
    if($approve){
        if(!is_string($evidence)||
           !preg_match('/^[a-f0-9]{64}$/D',$evidence))
            throw new InvalidArgumentException('curriculum_evidence_digest_required');
        if($reason!==null)throw new InvalidArgumentException('no_reason_on_approval');
    }else{
        if($evidence!==null||!in_array($reason,[
          'UNVERIFIED_CURRICULUM_ID','GRADE_SCOPE_MISMATCH',
          'ISSUER_EVIDENCE_INCOMPLETE','SOURCE_SUPERSEDED',
          'OFFICIAL_CORRECTION_REQUIRED'],true))
            throw new InvalidArgumentException('curriculum_review_reason_required');
    }
    $pdo->beginTransaction();
    try{
        // First resolve expected source without a lock, then acquire it
        // BEFORE the requirement: same lock order as source review/KA.
        $q=$pdo->prepare('SELECT source_id FROM
          jrei_exam_coverage_requirements WHERE requirement_id=?');
        $q->execute([$id]);$observed=$q->fetchColumn();
        if($observed!==$sourceId)
            throw new DomainException('curriculum_review_source_changed');
        $q=$pdo->prepare('SELECT source_id,source_version,
          source_locator_digest,updated_at,review_state,rights_state,
          reviewer_account_id,verified_at,is_revoked,is_superseded,
          country_code,educational_level,exam_category,
          curriculum_version,examination_year,subject_id,source_kind
          FROM jrei_exam_sources WHERE source_id=? FOR UPDATE');
        $q->execute([$sourceId]);$source=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($source)||
           $source['review_state']!=='AUTHORITATIVE_REVIEWED'||
           !in_array($source['rights_state'],[
             'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'],true)||
           $source['verified_at']===null||
           (int)$source['is_revoked']!==0||
           (int)$source['is_superseded']!==0)
            throw new DomainException('curriculum_review_source_ineligible');
        $q=$pdo->prepare("SELECT requirement_id,source_id,
          approved_by_account_id,requirement_state,
          country_code,educational_level,exam_category,curriculum_id,
          curriculum_version,grade,examination_year,subject_id,expected_kind
          FROM jrei_exam_coverage_requirements WHERE requirement_id=? FOR UPDATE");
        $q->execute([$id]);$scope=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($scope)||$scope['source_id']!==$sourceId||
           $scope['approved_by_account_id']===null||
           $scope['requirement_state']==='WITHDRAWN_SCOPE_ERROR')
            throw new DomainException('curriculum_review_scope_changed');
        if($approve&&
           ($actor===$scope['approved_by_account_id']||
            $actor===$source['reviewer_account_id']||
            $source['reviewer_account_id']===null))
            throw new DomainException('independent_curriculum_reviewer_required');
        foreach(['country_code','educational_level','exam_category',
          'curriculum_version','examination_year','subject_id'] as $col){
            if((string)$scope[$col] !== (string)$source[$col])
                throw new DomainException('curriculum_original_metadata_mismatch');
        }
        if($scope['expected_kind']!==$source['source_kind'])
            throw new DomainException('curriculum_source_type_mismatch');
        $q=$pdo->prepare('SELECT source_id,review_state,revision
          FROM jrei_ka_scope_alignment_current
          WHERE requirement_id=? FOR UPDATE');
        $q->execute([$id]);$prior=$q->fetch(PDO::FETCH_ASSOC);
        if(($prior===false&&$revision!==null)||
           ($prior!==false&&($revision===null||
            (int)$prior['revision']!==$revision)))
            throw new DomainException('curriculum_scope_review_revision_conflict');
        if($decision==='REVOKED_SCOPE_ALIGNMENT'&&
           (!$prior||$prior['source_id']!==$sourceId||
            $prior['review_state']!=='ATTESTED_SCOPE_ALIGNMENT'))
            throw new DomainException('no_active_alignment_to_revoke');
        $now=time();
        $q=$pdo->prepare('INSERT INTO jrei_ka_scope_alignment_history
          (decision_id,requirement_id,source_id,decision,evidence_sha256,
           review_reason_code,source_updated_at,decided_by_account_id,created_at)
          VALUES(?,?,?,?,?,?,?,?,?)');
        $q->execute([jrKaUuid(),$id,$sourceId,$decision,
          $approve?$evidence:null,$approve?null:$reason,
          (int)$source['updated_at'],$actor,$now]);
        if(!$prior){
            $q=$pdo->prepare('INSERT INTO jrei_ka_scope_alignment_current
              (requirement_id,source_id,review_state,evidence_sha256,
               source_locator_digest,source_version,source_updated_at,
               curriculum_id,grade,reviewed_by_account_id,reviewed_at,revision)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,1)');
            $q->execute([$id,$sourceId,$decision,$approve?$evidence:null,
              $source['source_locator_digest'],$source['source_version'],
              (int)$source['updated_at'],$scope['curriculum_id'],
              (int)$scope['grade'],$actor,$now]);
        }else{
            $q=$pdo->prepare('UPDATE jrei_ka_scope_alignment_current
              SET source_id=?,review_state=?,evidence_sha256=?,
                  source_locator_digest=?,source_version=?,source_updated_at=?,
                  curriculum_id=?,grade=?,reviewed_by_account_id=?,
                  reviewed_at=?,revision=revision+1
              WHERE requirement_id=? AND revision=?');
            $q->execute([$sourceId,$decision,$approve?$evidence:null,
              $source['source_locator_digest'],$source['source_version'],
              (int)$source['updated_at'],$scope['curriculum_id'],
              (int)$scope['grade'],$actor,$now,$id,$revision]);
            if($q->rowCount()!==1)
                throw new DomainException('curriculum_scope_revision_conflict');
        }
        operationsAudit($pdo,$actor,'jrei_curriculum_grade_'.$decision,$id);
        $pdo->commit();
        return ['ok'=>true,'reviewDecision'=>$decision,
            'sourceRightsChanged'=>false,'questionCorrectnessVerified'=>false,
            'officialCurriculumCatalogueVerified'=>false,
            'examPublished'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
