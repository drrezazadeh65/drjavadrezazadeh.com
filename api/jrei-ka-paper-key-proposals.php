<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ka-scheduler.php';

/**
 * Private metadata matching; no question/answer text reading, external
 * acquisition, grade changes or unlicensed content publication.
 */
function jrKaPaperKeyProposalsReady(PDO $pdo,array $cfg): bool {
    if(($cfg['jrei_ka_key_match_proposals_enabled']??false)!==true||
       !jrKaSchemaReady($pdo))return false;
    try {
        $pdo->query("SELECT candidate_id,paper_source_id,key_source_id,
           review_state FROM jrei_ka_paper_key_candidates LIMIT 0");
        return true;
    }catch(Throwable $e){return false;}
}
/**
 * Source recall invalidates every provisional paper/key relationship.
 * A former review stamp never overrides present rights or supersession.
 * No student response, answer key or original source is erased.
 */
function jrKaQuarantineRecalledPaperKeyPairs(PDO $pdo): int {
    $q=$pdo->prepare("UPDATE jrei_ka_paper_key_candidates pair
      JOIN jrei_exam_sources paper ON paper.source_id=pair.paper_source_id
      JOIN jrei_exam_sources ans ON ans.source_id=pair.key_source_id
      SET pair.review_state='SOURCE_RECALLED_REVIEW',
          pair.provenance_state='ORIGINAL_SOURCE_CHANGED',
          pair.source_content_verified=0,
          pair.key_correctness_verified=0,
          pair.official_correction_checked=0,
          pair.updated_at=?
      WHERE pair.review_state<>'SOURCE_RECALLED_REVIEW'
        AND (
          paper.is_revoked<>0 OR ans.is_revoked<>0 OR
          paper.is_superseded<>0 OR ans.is_superseded<>0 OR
          paper.review_state<>'AUTHORITATIVE_REVIEWED' OR
          ans.review_state<>'AUTHORITATIVE_REVIEWED' OR
          paper.rights_state NOT IN (
            'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION') OR
          ans.rights_state NOT IN (
            'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
        ) LIMIT 50");
    $q->execute([time()]);
    return $q->rowCount();
}

function jrKaProposeExactPaperKeyMatches(PDO $pdo,array $cfg): array {
    $result=[
       'schema'=>'jr.jrei.paper-key-match.v1','status'=>'OFF',
       'proposalsAdded'=>0,'officialKeyValidated'=>false,
       'questionTextRead'=>false,'correctAnswersPublished'=>false
    ];
    if(!jrKaPaperKeyProposalsReady($pdo,$cfg))return $result;
    $recalled=jrKaQuarantineRecalledPaperKeyPairs($pdo);
    $q=$pdo->query("SELECT
       paper.source_id AS paper_id,
       ans.source_id AS key_id,
       paper.country_code, paper.examination_year
      FROM jrei_exam_sources paper
      JOIN jrei_exam_sources ans ON
        ans.country_code=paper.country_code AND
        ans.examination_year=paper.examination_year AND
        ans.source_authority_id=paper.source_authority_id AND
        ans.curriculum_version=paper.curriculum_version AND
        ans.educational_level=paper.educational_level AND
        ans.exam_category=paper.exam_category AND
        ans.subject_id=paper.subject_id AND
        ans.source_kind='ANSWER_KEY'
      LEFT JOIN jrei_ka_paper_key_candidates existing
        ON existing.paper_source_id=paper.source_id
        AND existing.key_source_id=ans.source_id
      WHERE paper.source_kind='EXAM_PAPER'
        AND paper.source_id<>ans.source_id
        AND paper.review_state='AUTHORITATIVE_REVIEWED'
        AND ans.review_state='AUTHORITATIVE_REVIEWED'
        AND paper.rights_state IN (
          'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
        AND ans.rights_state IN (
          'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
        AND paper.is_revoked=0 AND ans.is_revoked=0
        AND paper.is_superseded=0 AND ans.is_superseded=0
        AND paper.verified_at IS NOT NULL AND ans.verified_at IS NOT NULL
        AND paper.reviewer_account_id IS NOT NULL
        AND ans.reviewer_account_id IS NOT NULL
        AND existing.candidate_id IS NULL
      ORDER BY paper.examination_year DESC,paper.source_id,ans.source_id
      LIMIT 20");
    $rows=$q->fetchAll(PDO::FETCH_ASSOC);
    $added=0;
    foreach($rows as $match) {
        $pdo->beginTransaction();
        try{
            // Identical lock order, regardless of whether the paper/key
            // happen to share or differ in UUID lexical order.
            $ids=[$match['paper_id'],$match['key_id']];
            sort($ids,SORT_STRING);
            $q=$pdo->prepare("SELECT source_id,country_code,
              source_authority_id,examination_year,curriculum_version,
              educational_level,exam_category,subject_id,source_kind,
              rights_state,review_state,is_revoked,is_superseded,
              verified_at,reviewer_account_id FROM jrei_exam_sources
              WHERE source_id=? FOR UPDATE");
            $sourceMap=[];
            foreach($ids as $id){
                $q->execute([$id]);
                $r=$q->fetch(PDO::FETCH_ASSOC);
                if(!is_array($r))
                    throw new DomainException('key_matching_source_disappeared');
                $sourceMap[$id]=$r;
            }
            $paper=$sourceMap[$match['paper_id']];
            $key=$sourceMap[$match['key_id']];
            $dimensions=['country_code','source_authority_id',
              'examination_year','curriculum_version','educational_level',
              'exam_category','subject_id'];
            foreach($dimensions as $dimension){
                if($paper[$dimension]!==$key[$dimension])
                    throw new DomainException('key_matching_source_revision_changed');
            }
            if($paper['source_kind']!=='EXAM_PAPER'||
               $key['source_kind']!=='ANSWER_KEY')
                throw new DomainException('key_matching_source_kind_changed');
            foreach([$paper,$key] as $source){
                if($source['review_state']!=='AUTHORITATIVE_REVIEWED'||
                   !in_array($source['rights_state'],
                     ['PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'],true)||
                   (int)$source['is_revoked']!==0||
                   (int)$source['is_superseded']!==0||
                   $source['verified_at']===null||
                   $source['reviewer_account_id']===null)
                    throw new DomainException('key_matching_rights_changed');
            }
            $q=$pdo->prepare("INSERT IGNORE INTO jrei_ka_paper_key_candidates
              (candidate_id,paper_source_id,key_source_id,
                original_country_code,original_examination_year,
                created_at,updated_at)
              VALUES (?,?,?,?,?,?,?)");
            $at=time();
            $q->execute([jrKaUuid(),$match['paper_id'],$match['key_id'],
              $paper['country_code'],(int)$paper['examination_year'],$at,$at]);
            $added+=$q->rowCount();
            $pdo->commit();
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            // An owner suspension or revised original source must not
            // initiate an automatic fallback to a less reliable key.
        }
    }
    return [...$result,'status'=>'MATCH_PROPOSALS_UNREVIEWED',
        'proposalsAdded'=>$added,
        'recalledPairsQuarantined'=>$recalled];
}
/** Owner-only aggregate; never exposes key content or customer records. */
function jrKaPaperKeySnapshot(PDO $pdo,array $cfg): array {
    $out=[
      'schema'=>'jr.jrei.paper-key-coverage.v1',
      'schemaReady'=>false,'sourceMatchProposalCount'=>null,
      'unreviewedPairCount'=>null,'ambiguousPapers'=>null,
      'independentlyValidatedKeyPairs'=>null,
      'ownerProposalPolicy'=>($cfg['jrei_ka_key_match_proposals_enabled']??false)===true,
      'matchedAnswerContentVerified'=>false,'commerciallyPublishable'=>false
    ];
    try{
        $q=$pdo->query("SELECT review_state,COUNT(*) AS n
           FROM jrei_ka_paper_key_candidates
           GROUP BY review_state LIMIT 20");
        $total=0;$pending=0;
        foreach($q as $row){
            $n=(int)$row['n'];$total+=$n;
            if($row['review_state']==='NEEDS_INDEPENDENT_KEY_MATCH')$pending+=$n;
        }
        $q=$pdo->query("SELECT COUNT(*) FROM
          (SELECT paper_source_id FROM jrei_ka_paper_key_candidates
             WHERE review_state='NEEDS_INDEPENDENT_KEY_MATCH'
             GROUP BY paper_source_id HAVING COUNT(*)>1) grouped");
        $out['schemaReady']=true;
        $out['sourceMatchProposalCount']=$total;
        $out['unreviewedPairCount']=$pending;
        $out['ambiguousPapers']=(int)$q->fetchColumn();
        // Reviewed metadata does not constitute verified answer correctness.
        $out['independentlyValidatedKeyPairs']=null;
    }catch(Throwable $e){
        $out['schemaReady']=false;
    }
    return $out;
}
