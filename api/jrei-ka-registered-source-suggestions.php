<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Deterministic REUSE suggestions from registered source metadata only.
 * There is no network retrieval, fuzzy inference, authority/rights approval,
 * official examination certification or automatic scope link.
 *
 * All rows must originate in the existing mother DB; no raw PDF/URLs,
 * learner information, payment records or private reviewer IDs are returned.
 */
function jrKaOwnerUnlinkedSourceSuggestions(PDO $pdo): array {
    $out=[
      'schema'=>'jr.jrei.registered-source-reuse.v1',
      'available'=>false,'eligibleOwnerScopes'=>null,
      'shownScopes'=>[],'truncated'=>false,
      'contentAuthenticityVerified'=>false,
      'curriculumIdAndGradeVerified'=>false,
      'rightsIndependentlyGranted'=>false,
      'linksCreatedAutomatically'=>false
    ];
    try{
        // Identical approved scope can only be entered once (unique coverage
        // index); all counts come from mother records, never an invented
        // country-to-PhD catalogue.
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_exam_coverage_requirements
          WHERE source_id IS NULL AND approved_by_account_id IS NOT NULL
            AND requirement_state='REQUIRES_SOURCE_REVIEW'");
        $out['eligibleOwnerScopes']=(int)$q->fetchColumn();
        $q=$pdo->query("SELECT requirement_id,approved_by_account_id,country_code,curriculum_id,
          curriculum_version,educational_level,grade,exam_category,
          examination_year,subject_id,expected_kind
          FROM jrei_exam_coverage_requirements
          WHERE source_id IS NULL AND approved_by_account_id IS NOT NULL
            AND requirement_state='REQUIRES_SOURCE_REVIEW'
          ORDER BY examination_year DESC,created_at DESC,requirement_id
          LIMIT 36");
        $scopes=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['truncated']=count($scopes)>35;
        $candidate=$pdo->prepare("SELECT s.source_id,s.source_title,
          s.source_authority_id,s.source_version,s.review_state,s.rights_state,
          s.original_sha256,s.verified_at
          FROM jrei_exam_sources s
          WHERE s.country_code=? AND s.curriculum_version=?
            AND s.educational_level=? AND s.exam_category=?
            AND s.examination_year=? AND s.subject_id=?
            AND s.source_kind=?
            AND s.is_revoked=0 AND s.is_superseded=0
            AND s.review_state IN ('CANDIDATE_UNREVIEWED','AUTHORITATIVE_REVIEWED')
            AND (s.review_state='CANDIDATE_UNREVIEWED'
              OR (s.reviewer_account_id IS NOT NULL
                AND s.reviewer_account_id<>?))
            AND s.rights_state IN ('PERMISSION_UNVERIFIED',
                 'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
          ORDER BY CASE WHEN s.review_state='AUTHORITATIVE_REVIEWED'
                      THEN 0 ELSE 1 END,
                   CASE WHEN s.original_sha256 IS NULL THEN 1 ELSE 0 END,
                   s.created_at DESC,s.source_id ASC LIMIT 4");
        foreach(array_slice($scopes,0,35) as $row){
            $candidate->execute([
              $row['country_code'],$row['curriculum_version'],
              $row['educational_level'],$row['exam_category'],
              $row['examination_year'],$row['subject_id'],
              $row['expected_kind'],$row['approved_by_account_id']
            ]);
            $registered=$candidate->fetchAll(PDO::FETCH_ASSOC);
            if(!$registered)continue;
            $suggestions=[];
            foreach($registered as $src){
                $suggestions[]=[
                  'sourceId'=>(string)$src['source_id'],
                  'title'=>(string)$src['source_title'],
                  'authorityClaim'=>(string)$src['source_authority_id'],
                  'sourceVersion'=>(string)$src['source_version'],
                  'originalDigestPresent'=>$src['original_sha256']!==null,
                  'humanSourceReviewRecorded'=>$src['review_state']==='AUTHORITATIVE_REVIEWED'
                    &&$src['verified_at']!==null,
                  'privateRightsClaimRecorded'=>in_array(
                    $src['rights_state'],
                    ['PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'],true),
                  'gradeAndCurriculumIdUnverified'=>true,
                  'publicationAuthorized'=>false
                ];
            }
            $out['shownScopes'][]=[
              'requirementId'=>(string)$row['requirement_id'],
              'country'=>(string)$row['country_code'],
              'curriculum'=>(string)$row['curriculum_id'],
              'curriculumVersion'=>(string)$row['curriculum_version'],
              'level'=>(string)$row['educational_level'],
              'grade'=>(int)$row['grade'],
              'examCategory'=>(string)$row['exam_category'],
              'year'=>(int)$row['examination_year'],
              'subject'=>(string)$row['subject_id'],
              'expectedKind'=>(string)$row['expected_kind'],
              'registeredCandidates'=>$suggestions,
              'candidatePreviewTruncated'=>count($registered)>3
            ];
            $last=count($out['shownScopes'])-1;
            $out['shownScopes'][$last]['registeredCandidates']=array_slice($suggestions,0,3);
        }
        $out['available']=true;
    }catch(Throwable $e){
        $out['eligibleOwnerScopes']=null;
        $out['shownScopes']=[];$out['truncated']=false;
    }
    return $out;
}
