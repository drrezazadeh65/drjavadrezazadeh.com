<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Genuine coverage expectations vs. original reviewed/licensed sources.
 * No crawler result, unapproved source, answer key or generated text can
 * masquerade as fulfilment of an explicitly expected examination resource.
 */
function jrKaOwnerCoverageMatrix(PDO $pdo): array {
    $result=[
       'schema'=>'jr.jrei.coverage-expectation-matrix.v1',
       'available'=>false,'registeredExpectations'=>null,
       'approvedExpectations'=>null,'pendingScopeReview'=>null,
       'withdrawnExpectations'=>null,'approvedLinkedSources'=>null,
       'approvedUnresolvedGaps'=>null,'groups'=>[],'truncated'=>false,
       'curriculumGradeAlignmentEvidenceRequired'=>true,
       'topicTaxonomyReady'=>false,
       'questionCorrectnessVerified'=>false,
       'completeCountryToDoctorateCoverage'=>false
    ];
    try{
        $q=$pdo->query("SELECT COUNT(*),
             COALESCE(SUM(CASE WHEN approved_by_account_id IS NOT NULL
               AND requirement_state<>'WITHDRAWN_SCOPE_ERROR'
               THEN 1 ELSE 0 END),0),
             COALESCE(SUM(CASE WHEN approved_by_account_id IS NULL
               AND requirement_state<>'WITHDRAWN_SCOPE_ERROR'
               THEN 1 ELSE 0 END),0),
             COALESCE(SUM(CASE WHEN requirement_state='WITHDRAWN_SCOPE_ERROR'
               THEN 1 ELSE 0 END),0)
           FROM jrei_exam_coverage_requirements");
        $counts=$q->fetch(PDO::FETCH_NUM);
        $result['registeredExpectations']=(int)$counts[0];
        $result['approvedExpectations']=(int)$counts[1];
        $result['pendingScopeReview']=(int)$counts[2];
        $result['withdrawnExpectations']=(int)$counts[3];
        $q=$pdo->query("SELECT
           r.country_code,r.educational_level,r.grade,r.curriculum_id,
           r.curriculum_version,r.exam_category,r.examination_year,
           r.subject_id,r.expected_kind,
           COUNT(*) AS expected,
           SUM(CASE WHEN
                r.approved_by_account_id IS NOT NULL AND
                r.source_id IS NOT NULL AND
                s.source_id IS NOT NULL AND
                s.country_code=r.country_code AND
                s.educational_level=r.educational_level AND
                s.curriculum_version=r.curriculum_version AND
                s.exam_category=r.exam_category AND
                s.examination_year=r.examination_year AND
                s.subject_id=r.subject_id AND
                s.source_kind=r.expected_kind AND
                s.review_state='AUTHORITATIVE_REVIEWED' AND
                s.rights_state IN
                   ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION') AND
                s.is_revoked=0 AND s.is_superseded=0 AND
                s.verified_at IS NOT NULL AND
                 s.reviewer_account_id IS NOT NULL AND
                s.reviewer_account_id<>r.approved_by_account_id AND
                a.source_id=s.source_id AND
                a.review_state='ATTESTED_SCOPE_ALIGNMENT' AND
                a.source_version=s.source_version AND
                a.source_updated_at=s.updated_at AND
                a.source_locator_digest<=>s.source_locator_digest AND
                a.curriculum_id=r.curriculum_id AND
                a.grade=r.grade AND
                a.evidence_sha256 IS NOT NULL AND
                a.reviewed_by_account_id IS NOT NULL AND
                a.reviewed_by_account_id<>r.approved_by_account_id AND
                a.reviewed_by_account_id<>s.reviewer_account_id
                THEN 1 ELSE 0 END) AS linked_approved,
           SUM(CASE WHEN r.approved_by_account_id IS NOT NULL
                AND r.requirement_state<>'WITHDRAWN_SCOPE_ERROR'
                THEN 1 ELSE 0 END) AS approved_expected,
           SUM(CASE WHEN r.approved_by_account_id IS NULL
                AND r.requirement_state<>'WITHDRAWN_SCOPE_ERROR'
                THEN 1 ELSE 0 END) AS owner_unapproved,
           SUM(CASE WHEN r.requirement_state='WITHDRAWN_SCOPE_ERROR'
                THEN 1 ELSE 0 END) AS withdrawn_count
           FROM jrei_exam_coverage_requirements r
           LEFT JOIN jrei_exam_sources s ON s.source_id=r.source_id
           LEFT JOIN jrei_ka_scope_alignment_current a
             ON a.requirement_id=r.requirement_id
           GROUP BY r.country_code,r.educational_level,r.grade,
              r.curriculum_id,r.curriculum_version,r.exam_category,
              r.examination_year,r.subject_id,r.expected_kind
           ORDER BY r.examination_year DESC,r.country_code,
              r.educational_level,r.subject_id,r.expected_kind LIMIT 81");
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $result['truncated']=count($rows)>80;
        $result['available']=true;
        $totalLinked=0;$approvedUnresolved=0;
        foreach(array_slice($rows,0,80) as $row){
            $approved=(int)$row['approved_expected'];
            $linked=(int)$row['linked_approved'];
            $missing=max(0,$approved-$linked);
            $totalLinked+=$linked;$approvedUnresolved+=$missing;
            $result['groups'][]=[
              'country'=>(string)$row['country_code'],
              'level'=>(string)$row['educational_level'],
              'grade'=>(int)$row['grade'],
              'curriculum'=>(string)$row['curriculum_id'],
              'curriculumVersion'=>(string)$row['curriculum_version'],
              'examCategory'=>(string)$row['exam_category'],
              'year'=>(int)$row['examination_year'],
              'subject'=>(string)$row['subject_id'],
              'expectedKind'=>(string)$row['expected_kind'],
              'expectationCount'=>(int)$row['expected'],
              'ownerApprovedCount'=>$approved,
              'ownerUnapprovedCount'=>(int)$row['owner_unapproved'],
              'withdrawnCount'=>(int)$row['withdrawn_count'],
              'authoritativeLinkedCount'=>$linked,
              'unresolvedApprovedCount'=>$missing,
              'allAnswerKeysScientificallyCorrect'=>false,
              'linkedSourceHasVerifiedReproductionRights'=>false,
              'curriculumGradeEvidenceRecordedForLinkedMetadata'=>$linked>0
            ];
        }
        if(!$result['truncated']){
            $result['approvedLinkedSources']=$totalLinked;
            $result['approvedUnresolvedGaps']=$approvedUnresolved;
        }
        // A bounded preview is not exhaustive when more than 80 groups
        // exist: do NOT present preview sums as comprehensive totals.
    }catch(Throwable $e){
        $result['registeredExpectations']=null;
        $result['approvedExpectations']=null;
        $result['pendingScopeReview']=null;
        $result['withdrawnExpectations']=null;
        $result['approvedLinkedSources']=null;
        $result['approvedUnresolvedGaps']=null;
        $result['groups']=[];$result['available']=false;
    }
    return $result;
}
