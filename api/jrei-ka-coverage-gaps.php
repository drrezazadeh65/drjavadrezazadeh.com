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
        'items'=>[],'truncated'=>false,
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
       AND s.reviewer_account_id<>r.approved_by_account_id";
    $from="FROM jrei_exam_coverage_requirements r
      LEFT JOIN jrei_exam_sources s ON s.source_id=r.source_id
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
        $out['available']=true;
    } catch (Throwable $e) {
        // Missing or partially installed migration is UNKNOWN, never zero.
        $out['approvedScopeCount']=null;
        $out['eligibleMetadataLinkCount']=null;
        $out['unresolvedScopeCount']=null;
        $out['items']=[];$out['truncated']=false;
    }
    return $out;
}
