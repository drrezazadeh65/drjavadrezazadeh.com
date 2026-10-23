<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * JREI source/answer-key coverage diagnostic for the EXISTING exam/research
 * owner console. It reads only the already declared jrei_exam_sources metadata.
 *
 * It cannot establish scientific item correctness, answer-key reliability,
 * commercial reuse rights, official amendments or live crawler availability.
 * No raw question, student submission or private source content is returned.
 */
function jrExamOwnerCoverageReadiness(PDO $pdo): array {
    $out=[
      'schema'=>'jr.jrei.exam-coverage-readiness.v1',
      'ready'=>false,
      'observedAt'=>time(),
      'totalRows'=>null,'examCoverage'=>[],
      'truncated'=>false,
      'answerKeyCorrectnessVerified'=>false,
      'officialBlueprintsVerified'=>false,
      'questionBankPublishable'=>false,
      'sourceCrawlVerified'=>false,
      'allYearsAndCurriculaCovered'=>false
    ];
    try{
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_exam_sources");
        $out['totalRows']=(int)$q->fetchColumn();
        $q=$pdo->query("SELECT educational_level,exam_category,examination_year,
            source_kind,review_state,rights_state,extraction_state,
            answer_key_state,is_revoked,is_superseded,COUNT(*) AS total_count
            FROM jrei_exam_sources
            GROUP BY educational_level,exam_category,examination_year,
              source_kind,review_state,rights_state,extraction_state,
              answer_key_state,is_revoked,is_superseded
            ORDER BY examination_year DESC,educational_level ASC,
              exam_category ASC,source_kind ASC LIMIT 121");
        $groups=[];
        foreach($q as $r){
            $authority=(string)$r['review_state'];
            $rights=(string)$r['rights_state'];
            $validForInternal= $authority==='AUTHORITATIVE_REVIEWED'&&
              in_array($rights,['PERMITTED_PRIVATE_ANALYSIS',
                'PERMITTED_REPRODUCTION'],true)&&
              (int)$r['is_revoked']===0&&(int)$r['is_superseded']===0;
            $n=(int)$r['total_count'];
            $groups[]=[
              'educationalLevel'=>(string)$r['educational_level'],
              'examCategory'=>(string)$r['exam_category'],
              'examinationYear'=>(int)$r['examination_year'],
              'sourceKind'=>(string)$r['source_kind'],
              'reviewState'=>$authority,
              'rightsState'=>$rights,
              'extractionState'=>(string)$r['extraction_state'],
              'answerKeyState'=>(string)$r['answer_key_state'],
              'sourceCount'=>$n,
              'approvedForPrivateAnalysisCount'=>$validForInternal?$n:0,
              'officialAnswerIndependentlyVerified'=>false,
              'sourceAmendmentsComplete'=>false,
              'publicQuestionPublicationAuthorized'=>false
            ];
        }
        $out['truncated']=count($groups)>120;
        $out['examCoverage']=array_slice($groups,0,120);
        $out['ready']=true;
    }catch(Throwable $e){
        // Missing/partially migrated mother-DB schema is UNKNOWN, never zero.
        $out['totalRows']=null;$out['examCoverage']=[];
        $out['truncated']=false;
    }
    return $out;
}
