<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Read-only, bounded coverage gap worklist for the ORIGINAL MFA owner route.
 * "Linked" means the registered source metadata satisfies private-analysis
 * gates, NOT that an actual PDF, paper, key, topic or grade was verified.
 * All counts derive from the full mother-DB relation, never a preview sum.
 */
function jrKaOwnerCoverageGapQueue(PDO $pdo): array {
    $out=[
        'schema'=>'jr.jrei.coverage-gap-worklist.v1',
        'available'=>false,'approvedScopeCount'=>null,
        'eligibleMetadataLinkCount'=>null,'unresolvedScopeCount'=>null,
        'items'=>[],'truncated'=>false,'fullScopeReasonCounts'=>null,
        'independentGradeCurriculumReviewRequired'=>true,
        'gradeAndCurriculumIdentityVerified'=>false,
        'officialSourceContentVerified'=>false,
        'answerKeyCorrectnessVerified'=>false,
        'realAutonomousAcquisitionProven'=>false
    ];
    // A requirement is owner-approved only as an investigation scope.
    // Source authority, rights, verification and reviewer independence are
    // evaluated live, so revocation immediately removes linked eligibility.
    $match="s.source_id IS NOT NULL
       AND s.country_code=r.country_code
       AND s.educational_level=r.educational_level
       AND s.curriculum_version=r.curriculum_version
       AND s.exam_category=r.exam_category
       AND s.examination_year=r.examination_year
       AND s.subject_id=r.subject_id
       AND s.source_kind=r.expected_kind
       AND s.review_state='AUTHORITATIVE_REVIEWED'
       AND s.rights_state IN
         ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
       AND s.is_revoked=0 AND s.is_superseded=0
       AND s.verified_at IS NOT NULL
       AND s.reviewer_account_id IS NOT NULL
       AND s.reviewer_account_id<>r.approved_by_account_id
       AND a.source_id=s.source_id
       AND a.review_state='ATTESTED_SCOPE_ALIGNMENT'
       AND a.source_version=s.source_version
       AND a.source_updated_at=s.updated_at
       AND a.source_locator_digest<=>s.source_locator_digest
       AND a.curriculum_id=r.curriculum_id
       AND a.grade=r.grade
       AND a.evidence_sha256 IS NOT NULL
       AND a.reviewed_by_account_id IS NOT NULL
       AND a.reviewed_by_account_id<>r.approved_by_account_id
       AND a.reviewed_by_account_id<>s.reviewer_account_id";
    $from="FROM jrei_exam_coverage_requirements r
      LEFT JOIN jrei_exam_sources s ON s.source_id=r.source_id
      LEFT JOIN jrei_ka_scope_alignment_current a
        ON a.requirement_id=r.requirement_id
      WHERE r.approved_by_account_id IS NOT NULL
        AND r.requirement_state<>'WITHDRAWN_SCOPE_ERROR'";
    try {
        $q=$pdo->query("SELECT COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN ($match) THEN 1 ELSE 0 END),0) AS linked
          $from");
        $counts=$q->fetch(PDO::FETCH_ASSOC);
        if (!is_array($counts)) return $out;
        $out['approvedScopeCount']=(int)$counts['total'];
        $out['eligibleMetadataLinkCount']=(int)$counts['linked'];
        $out['unresolvedScopeCount']=max(0,
            $out['approvedScopeCount']-$out['eligibleMetadataLinkCount']);
        $q=$pdo->query("SELECT r.requirement_id,r.country_code,
            r.curriculum_id,r.curriculum_version,r.educational_level,r.grade,
            r.exam_category,r.examination_year,r.subject_id,r.expected_kind,
            r.requirement_state,r.source_id AS registered_source_id,
            s.source_id AS live_source_id,s.source_kind AS live_source_kind,
            s.country_code AS live_country_code,
            s.educational_level AS live_educational_level,
            s.curriculum_version AS live_curriculum_version,
            s.exam_category AS live_exam_category,
            s.examination_year AS live_examination_year,
            s.subject_id AS live_subject_id,
            s.review_state AS live_review_state,
            s.rights_state AS live_rights_state,
            s.is_revoked,s.is_superseded,s.verified_at,
            s.updated_at AS live_source_updated_at,
            s.source_version AS live_source_version,
            s.source_locator_digest AS live_locator_digest,
            a.source_id AS aligned_source_id,
            a.review_state AS alignment_state,
            a.source_version AS alignment_version,
            a.source_updated_at AS alignment_source_updated_at,
            a.source_locator_digest AS alignment_locator_digest,
            a.curriculum_id AS alignment_curriculum_id,
            a.grade AS alignment_grade,
            a.evidence_sha256 AS alignment_evidence,
            CASE WHEN a.reviewed_by_account_id IS NULL THEN 1
              WHEN a.reviewed_by_account_id=r.approved_by_account_id
                OR a.reviewed_by_account_id=s.reviewer_account_id THEN 1
              ELSE 0 END AS alignment_reviewer_conflict,
            CASE WHEN s.reviewer_account_id IS NULL THEN 0
              WHEN s.reviewer_account_id=r.approved_by_account_id THEN 1
              ELSE 0 END AS same_reviewer
            $from AND CASE WHEN ($match) THEN 1 ELSE 0 END=0
            ORDER BY r.examination_year DESC,r.created_at DESC,
               r.requirement_id ASC LIMIT 61");
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['truncated']=count($rows)>60;
        foreach (array_slice($rows,0,60) as $r) {
            $reason='INDEPENDENT_SOURCE_REVIEW_REQUIRED';
            if ($r['registered_source_id']===null) {
                $reason='NO_SOURCE_CANDIDATE_LINKED';
            } elseif ($r['live_source_id']===null) {
                $reason='SOURCE_LINK_NOT_RESOLVABLE';
            } elseif ((int)$r['is_revoked']!==0) {
                $reason='SOURCE_REVOKED';
            } elseif ((int)$r['is_superseded']!==0) {
                $reason='SOURCE_SUPERSEDED';
            } elseif ($r['live_country_code']!==$r['country_code'] ||
                $r['live_educational_level']!==$r['educational_level'] ||
                $r['live_curriculum_version']!==$r['curriculum_version'] ||
                $r['live_exam_category']!==$r['exam_category'] ||
                (int)$r['live_examination_year']!==(int)$r['examination_year'] ||
                $r['live_subject_id']!==$r['subject_id'] ||
                $r['live_source_kind']!==$r['expected_kind']) {
                $reason='SOURCE_SCOPE_METADATA_MISMATCH';
            } elseif (!in_array($r['live_rights_state'],
                    ['PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'],true)) {
                $reason='PRIVATE_ANALYSIS_RIGHTS_NOT_REVIEWED';
            } elseif ((int)$r['same_reviewer']===1) {
                $reason='SEPARATE_SOURCE_REVIEWER_REQUIRED';
            } elseif ($r['live_review_state']!=='AUTHORITATIVE_REVIEWED' ||
                $r['verified_at']===null) {
                $reason='SOURCE_AUTHORITY_REVIEW_INCOMPLETE';
            } elseif ($r['aligned_source_id']!==$r['registered_source_id'] ||
                $r['alignment_state']!=='ATTESTED_SCOPE_ALIGNMENT' ||
                $r['alignment_version']!==$r['live_source_version'] ||
                (int)$r['alignment_source_updated_at']!==
                    (int)$r['live_source_updated_at'] ||
                $r['alignment_locator_digest']!==$r['live_locator_digest'] ||
                $r['alignment_curriculum_id']!==$r['curriculum_id'] ||
                (int)$r['alignment_grade']!==(int)$r['grade'] ||
                $r['alignment_evidence']===null ||
                (int)$r['alignment_reviewer_conflict']===1) {
                $reason='CURRICULUM_GRADE_ALIGNMENT_EVIDENCE_REQUIRED';
            }
            $out['items'][]=[
                'requirementId'=>(string)$r['requirement_id'],
                'country'=>(string)$r['country_code'],
                'curriculum'=>(string)$r['curriculum_id'],
                'curriculumVersion'=>(string)$r['curriculum_version'],
                'level'=>(string)$r['educational_level'],
                'grade'=>(int)$r['grade'],
                'examCategory'=>(string)$r['exam_category'],
                'year'=>(int)$r['examination_year'],
                'subject'=>(string)$r['subject_id'],
                'expectedKind'=>(string)$r['expected_kind'],
                'registeredSourceId'=>$r['registered_source_id'],
                'reason'=>$reason,
                'eligibleForPrivateAnalysis'=>false,
                'safeForPublicPublication'=>false
            ];
        }
        // Independent complete-relation counts, NOT a sum of the first 60.
        // Reuse the same live source/rights/alignment predicates as the
        // eligible-link aggregate. No model inference or external requests.
        $reasonSql="CASE
          WHEN r.source_id IS NULL THEN 'NO_SOURCE_CANDIDATE_LINKED'
          WHEN s.source_id IS NULL THEN 'SOURCE_LINK_NOT_RESOLVABLE'
          WHEN s.is_revoked<>0 THEN 'SOURCE_REVOKED'
          WHEN s.is_superseded<>0 THEN 'SOURCE_SUPERSEDED'
          WHEN s.country_code<>r.country_code
            OR s.educational_level<>r.educational_level
            OR s.curriculum_version<>r.curriculum_version
            OR s.exam_category<>r.exam_category
            OR s.examination_year<>r.examination_year
            OR s.subject_id<>r.subject_id
            OR s.source_kind<>r.expected_kind
            THEN 'SOURCE_SCOPE_METADATA_MISMATCH'
          WHEN s.rights_state NOT IN
            ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
            THEN 'PRIVATE_ANALYSIS_RIGHTS_NOT_REVIEWED'
          WHEN s.reviewer_account_id IS NULL
            OR s.reviewer_account_id=r.approved_by_account_id
            THEN 'SEPARATE_SOURCE_REVIEWER_REQUIRED'
          WHEN s.review_state<>'AUTHORITATIVE_REVIEWED'
            OR s.verified_at IS NULL
            THEN 'SOURCE_AUTHORITY_REVIEW_INCOMPLETE'
          WHEN NOT COALESCE(($match),0)
            THEN 'CURRICULUM_GRADE_ALIGNMENT_EVIDENCE_REQUIRED'
          ELSE 'METADATA_LINK_ELIGIBLE' END";
        $q=$pdo->query("SELECT ($reasonSql) AS review_reason,
          COUNT(*) AS total $from GROUP BY review_reason");
        $reasonCounts=[];
        foreach($q as $entry){
            $code=(string)$entry['review_reason'];
            if(preg_match('/^[A-Z0-9_]{5,70}$/D',$code))
                $reasonCounts[$code]=(int)$entry['total'];
        }
        ksort($reasonCounts,SORT_STRING);
        $out['fullScopeReasonCounts']=$reasonCounts;
        $out['available']=true;
    } catch (Throwable $e) {
        // Missing or partially installed migration is UNKNOWN, never zero.
        $out['approvedScopeCount']=null;
        $out['eligibleMetadataLinkCount']=null;
        $out['unresolvedScopeCount']=null;
        $out['items']=[];$out['truncated']=false;
        $out['fullScopeReasonCounts']=null;
    }
    return $out;
}
