<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * An owner can repair a WRONG coverage-to-source association without
 * deleting source history or changing review and rights records.
 * Source first, requirement second for link actions; requirement only for
 * detach. Old/new source identifiers and reason stay in an append-only table.
 */
function jrKaOwnerCorrectCoverageLink(PDO $pdo,string $actor,array $body): array {
    $pattern='/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D';
    $id=$body['requirementId']??null;
    $mode=$body['mode']??null;
    $expected=$body['expectedSourceId']??null;
    $next=$body['newSourceId']??null;
    $reason=$body['reasonCode']??null;
    if(!is_string($id)||!preg_match($pattern,$id)||
       !in_array($mode,['DETACH','LINK_EXISTING'],true)||
       !in_array($reason,['WRONG_SOURCE','SOURCE_REVOKED',
          'SOURCE_SUPERSEDED','RIGHTS_REVIEW_FAILURE',
          'EXAM_SCOPE_MISMATCH','EXISTING_SOURCE_REUSE'],true)||
       ($body['confirmation']??null)!=='CORRECT_EXAM_SOURCE_LINK_WITH_HISTORY')
        throw new InvalidArgumentException('invalid_coverage_link_correction');
    if($mode==='DETACH'){
        if(!is_string($expected)||!preg_match($pattern,$expected)||
           $next!==null||$reason==='EXISTING_SOURCE_REUSE')
            throw new InvalidArgumentException('invalid_detachment_request');
    }else{
        if($expected!==null||!is_string($next)||
           !preg_match($pattern,$next))
            throw new InvalidArgumentException('invalid_existing_link_request');
    }
    try{
        $pdo->query('SELECT correction_id,requirement_id,previous_source_id,
            next_source_id,reason_code FROM jrei_ka_coverage_link_history LIMIT 0');
    }catch(Throwable $e){
        throw new DomainException('coverage_correction_migration_required',0,$e);
    }
    $pdo->beginTransaction();
    try{
        $source=null;
        if($mode==='LINK_EXISTING'){
            // Lock original source before scope, matching independent review.
            $q=$pdo->prepare("SELECT source_id,country_code,educational_level,
              exam_category,curriculum_version,examination_year,subject_id,
              source_kind,is_revoked,is_superseded,review_state,
              reviewer_account_id
              FROM jrei_exam_sources WHERE source_id=? FOR UPDATE");
            $q->execute([$next]);
            $source=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($source)||(int)$source['is_revoked']!==0||
                (int)$source['is_superseded']!==0||
                $source['review_state']==='QUARANTINED')
                throw new DomainException('existing_source_not_eligible_for_link');
        }
        $q=$pdo->prepare("SELECT requirement_id,source_id,
          requirement_state,approved_by_account_id,country_code,
          educational_level,exam_category,curriculum_version,
          examination_year,subject_id,expected_kind
          FROM jrei_exam_coverage_requirements WHERE requirement_id=?
          FOR UPDATE");
        $q->execute([$id]);$scope=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($scope)||$scope['approved_by_account_id']===null||
           $scope['requirement_state']==='WITHDRAWN_SCOPE_ERROR')
            throw new DomainException('approved_coverage_scope_required');
        if($mode==='DETACH'){
            if($scope['source_id']!==$expected)
                throw new DomainException('coverage_link_revision_conflict');
        }else{
            if($scope['source_id']!==null||
               $scope['requirement_state']!=='REQUIRES_SOURCE_REVIEW')
                throw new DomainException('coverage_scope_not_open_for_link');
            $fields=['country_code','educational_level','exam_category',
              'curriculum_version','examination_year','subject_id'];
            foreach($fields as $key){
                if((string)$scope[$key] !== (string)$source[$key])
                    throw new DomainException('existing_source_scope_mismatch');
            }
            if($scope['expected_kind']!==$source['source_kind'])
                throw new DomainException('existing_source_kind_mismatch');
            if($source['review_state']==='AUTHORITATIVE_REVIEWED' &&
               ($source['reviewer_account_id']===null ||
                $source['reviewer_account_id']===$scope['approved_by_account_id']))
                throw new DomainException('independent_source_reviewer_required');
            // No grade/curriculum-ID source columns exist. This is metadata
            // linkage only, not verified grade/topic curricular alignment.
        }
        $now=time();
        $q=$pdo->prepare('INSERT INTO jrei_ka_coverage_link_history
          (correction_id,requirement_id,previous_source_id,next_source_id,
          reason_code,corrected_by_account_id,corrected_at)
          VALUES(?,?,?,?,?,?,?)');
        $q->execute([jrKaUuid(),$id,$scope['source_id'],
           $mode==='LINK_EXISTING'?$next:null,$reason,$actor,$now]);
        $sql=$mode==='DETACH'
          ? "UPDATE jrei_exam_coverage_requirements SET
               source_id=NULL,requirement_state='REQUIRES_SOURCE_REVIEW'
             WHERE requirement_id=? AND source_id=?
               AND approved_by_account_id IS NOT NULL
               AND requirement_state<>'WITHDRAWN_SCOPE_ERROR'"
          : "UPDATE jrei_exam_coverage_requirements SET
               source_id=?,requirement_state='SOURCE_CANDIDATE_LINKED_UNREVIEWED'
             WHERE requirement_id=? AND source_id IS NULL
               AND approved_by_account_id IS NOT NULL
               AND requirement_state='REQUIRES_SOURCE_REVIEW'";
        $q=$pdo->prepare($sql);
        $q->execute($mode==='DETACH'?[$id,$expected]:[$next,$id]);
        if($q->rowCount()!==1)
            throw new DomainException('coverage_link_revision_conflict');
        operationsAudit($pdo,$actor,$mode==='DETACH'
          ?'jrei_coverage_link_detached':'jrei_existing_source_linked',$id);
        $pdo->commit();
        return ['ok'=>true,'newSourceLinked'=>$mode==='LINK_EXISTING',
          'sourceRightsChanged'=>false,'questionContentApproved'=>false,
          'officialExamCoverageVerified'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/** Read-only owner historical correction ledger, not approved source evidence. */
function jrKaOwnerCoverageLinkCorrectionHistory(PDO $pdo): array {
    $out=[
      'schema'=>'jr.jrei.coverage-link-history.v1',
      'available'=>false,'recordedCorrectionCount'=>null,
      'corrections'=>[],'truncated'=>false,
      'originalSourcesDeleted'=>false,
      'automaticSourceAuthorityApproval'=>false
    ];
    try{
        $q=$pdo->query('SELECT COUNT(*) FROM jrei_ka_coverage_link_history');
        $out['recordedCorrectionCount']=(int)$q->fetchColumn();
        $q=$pdo->query('SELECT correction_id,requirement_id,
          previous_source_id,next_source_id,reason_code,corrected_at
          FROM jrei_ka_coverage_link_history
          ORDER BY corrected_at DESC,correction_id DESC LIMIT 31');
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['truncated']=count($rows)>30;
        foreach(array_slice($rows,0,30) as $row){
            $out['corrections'][]=[
              'correctionId'=>$row['correction_id'],
              'requirementId'=>$row['requirement_id'],
              'previousSourceId'=>$row['previous_source_id'],
              'nextSourceId'=>$row['next_source_id'],
              'reasonCode'=>$row['reason_code'],
              'correctedAt'=>(int)$row['corrected_at'],
              'newSourceApproved'=>false,
              'originalDocumentDeleted'=>false
            ];
        }
        $out['available']=true;
    }catch(Throwable $e){
        // Missing staged migration = unknown, not a zeroed correction record.
        $out['recordedCorrectionCount']=null;
        $out['corrections']=[];$out['truncated']=false;
    }
    return $out;
}
