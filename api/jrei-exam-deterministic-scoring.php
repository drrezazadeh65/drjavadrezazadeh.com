<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Exact non-AI MCQ scoring for approved source keys. No HTTP route invokes
 * this module yet; candidate submission, payment entitlement, server-clock
 * checks and eco_score_runs persistence require their own final integration.
 *
 * All calculation uses integer thousandths, deterministic item order and
 * complete answer-key coverage. A reported raw score is NOT a percentile,
 * admission chance, verified examination outcome or validated psychometric
 * measurement.
 */
function jrExamVerifiedMcqContext(PDO $pdo,string $instrumentId,
    string $scoringModelId): array {
    if(!validUuid($instrumentId)||!validUuid($scoringModelId))
        throw new InvalidArgumentException('invalid_scoring_reference');
    $q=$pdo->prepare("SELECT p.correct_millipoints,p.incorrect_penalty_millipoints,
        p.unanswered_millipoints,p.policy_sha256,
        p.policy_state,p.reviewer_account_id,m.instrument_version_id,
        m.approved_by_account_id AS original_model_reviewer,
        m.algorithm_sha256
      FROM jrei_exam_scoring_policies p
      JOIN eco_scoring_models m ON m.id=p.scoring_model_id
      WHERE p.scoring_model_id=? LIMIT 1");
    $q->execute([$scoringModelId]);$rule=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($rule)||$rule['instrument_version_id']!==$instrumentId||
       $rule['policy_state']!=='APPROVED'||
       $rule['reviewer_account_id']===null||
       $rule['original_model_reviewer']===null||
       !preg_match('/^[a-f0-9]{64}$/D',(string)$rule['algorithm_sha256'])||
       !preg_match('/^[a-f0-9]{64}$/D',(string)$rule['policy_sha256']))
        throw new DomainException('scoring_policy_review_required');
    $correct=(int)$rule['correct_millipoints'];
    $penalty=(int)$rule['incorrect_penalty_millipoints'];
    $blank=(int)$rule['unanswered_millipoints'];
    if($correct<1||$correct>1000000||$penalty<0||$penalty>1000000||
       $blank<0||$blank>1000000)
        throw new DomainException('scoring_policy_bounds_invalid');

    $q=$pdo->prepare("SELECT
        i.id,i.item_type,i.is_sensitive,k.correct_option_id,k.key_digest,
        k.key_state,k.rights_review_state,k.reviewer_account_id,
        k.reviewed_at,meta.authored_by_account_id,
        meta.reviewed_by_account_id AS item_reviewer_id,
        meta.reviewed_at AS item_reviewed_at,
        meta.item_state,meta.provenance_digest,
        meta.answer_key_digest,meta.item_content_digest,
        meta.ambiguity_review_state,meta.copyright_review_state,
        meta.source_id AS item_source_id,k.source_id AS key_source_id,
        obj.content_sha256 AS original_prompt_sha256,
        source.review_state AS source_review_state,
        source.rights_state AS source_rights_state,
        source.is_revoked,source.is_superseded
      FROM eco_assessment_items i
      LEFT JOIN jrei_exam_reviewed_answer_keys k ON k.item_id=i.id
      LEFT JOIN jrei_exam_item_metadata meta ON meta.canonical_assessment_item_id=i.id
      LEFT JOIN eco_object_refs obj ON obj.id=i.prompt_object_id
      LEFT JOIN jrei_exam_sources source ON source.source_id=k.source_id
      WHERE i.instrument_version_id=?
      ORDER BY i.display_order ASC,i.id ASC LIMIT 301");
    $q->execute([$instrumentId]);
    $rows=$q->fetchAll(PDO::FETCH_ASSOC);
    if(count($rows)<1||count($rows)>300)
        throw new DomainException('reviewed_question_count_out_of_bounds');
    $items=[];$seen=[];
    foreach($rows as $row){
        $id=(string)$row['id'];
        if(isset($seen[$id]))throw new DomainException('ambiguous_item_metadata');
        $seen[$id]=true;
        if($row['item_type']!=='SINGLE_CHOICE'||
           (int)$row['is_sensitive']!==0||
           $row['item_state']!=='APPROVED'||
           $row['item_reviewed_at']===null||
           $row['item_reviewer_id']===null||
           $row['authored_by_account_id']===null||
           $row['item_reviewer_id']===$row['authored_by_account_id']||
           $row['ambiguity_review_state']!=='APPROVED'||
           $row['copyright_review_state']!=='APPROVED'||
           $row['item_source_id']===null||
           $row['item_source_id']!==$row['key_source_id']||
           !preg_match('/^[a-f0-9]{64}$/D',(string)$row['provenance_digest'])||
           !hash_equals((string)$row['answer_key_digest'],(string)$row['key_digest'])||
           !preg_match('/^[a-f0-9]{64}$/D',(string)$row['original_prompt_sha256'])||
           !hash_equals((string)$row['original_prompt_sha256'],
               (string)$row['item_content_digest'])||
           $row['key_state']!=='APPROVED'||
           $row['rights_review_state']!=='APPROVED'||
           $row['reviewer_account_id']===null||
           $row['reviewed_at']===null||
           !validUuid((string)$row['correct_option_id'])||
           !preg_match('/^[a-f0-9]{64}$/D',(string)$row['key_digest'])||
           ($row['authored_by_account_id']!==null&&
             $row['authored_by_account_id']===$row['reviewer_account_id'])||
           $row['source_review_state']!=='AUTHORITATIVE_REVIEWED'||
           !in_array($row['source_rights_state'],[
              'PERMITTED_REPRODUCTION'],true)||
           (int)$row['is_revoked']!==0||(int)$row['is_superseded']!==0)
            throw new DomainException('item_key_or_source_requires_independent_review');
        $items[$id]=[
          'itemId'=>$id,'correctOptionId'=>(string)$row['correct_option_id'],
          'allowedOptionIds'=>[]
        ];
    }
    $q=$pdo->prepare("SELECT o.id AS option_id,o.item_id
       FROM eco_assessment_options o
       JOIN eco_assessment_items i ON i.id=o.item_id
       WHERE i.instrument_version_id=? ORDER BY i.id,o.display_order,o.id");
    $q->execute([$instrumentId]);
    foreach($q as $row){
        $id=(string)$row['item_id'];$option=(string)$row['option_id'];
        if(!isset($items[$id]))throw new DomainException('option_item_mismatch');
        $items[$id]['allowedOptionIds'][]=$option;
    }
    foreach($items as $item){
        $choices=$item['allowedOptionIds'];
        if(count($choices)<2||count($choices)>8||
           count($choices)!==count(array_unique($choices))||
           !in_array($item['correctOptionId'],$choices,true))
            throw new DomainException('correct_key_not_in_original_item_options');
    }
    return [
      'schema'=>'jr.jrei.reviewed-mcq-context.v1',
      'instrumentVersionId'=>$instrumentId,
      'scoringModelId'=>$scoringModelId,
      'policySha256'=>(string)$rule['policy_sha256'],
      'correctMillipoints'=>$correct,'incorrectPenaltyMillipoints'=>$penalty,
      'unansweredMillipoints'=>$blank,
      'items'=>array_values($items),
      'questionSetScienceValidated'=>false
    ];
}
function jrExamDeterministicRawGrade(array $context,array $answers): array {
    if(($context['schema']??null)!=='jr.jrei.reviewed-mcq-context.v1'||
       !is_array($context['items']??null)||!is_int($context['correctMillipoints']??null)||
       !is_int($context['incorrectPenaltyMillipoints']??null)||
       !is_int($context['unansweredMillipoints']??null))
        throw new InvalidArgumentException('unreviewed_scoring_context');
    $items=$context['items'];
    if(count($items)<1||count($items)>300||count($answers)>300)
        throw new InvalidArgumentException('invalid_exam_answer_size');
    $ids=[];
    foreach($items as $item){
        if(!is_array($item)||!validUuid((string)($item['itemId']??''))||
           !validUuid((string)($item['correctOptionId']??''))||
           !is_array($item['allowedOptionIds']??null)||
           isset($ids[$item['itemId']]))
            throw new InvalidArgumentException('invalid_scoring_item');
        $ids[$item['itemId']]=$item;
    }
    foreach($answers as $id=>$selected){
        if(!is_string($id)||!isset($ids[$id])||
           ($selected!==null&&!is_string($selected))||
           ($selected!==null&&
            !in_array($selected,$ids[$id]['allowedOptionIds'],true)))
            throw new InvalidArgumentException('answer_option_not_in_published_assessment');
    }
    $correct=0;$incorrect=0;$unanswered=0;
    foreach($items as $item){
        $selected=$answers[$item['itemId']]??null;
        if($selected===null)$unanswered++;
        elseif(hash_equals($item['correctOptionId'],$selected))$correct++;
        else $incorrect++;
    }
    $raw=$correct*$context['correctMillipoints']-
         $incorrect*$context['incorrectPenaltyMillipoints']+
         $unanswered*$context['unansweredMillipoints'];
    $max=count($items)*$context['correctMillipoints'];
    return [
      'schema'=>'jr.jrei.deterministic-raw-grade.v1',
      'state'=>'PRELIMINARY_NOT_PSYCHOMETRICALLY_VALIDATED',
      'questionCount'=>count($items),'correctCount'=>$correct,
      'incorrectCount'=>$incorrect,'unansweredCount'=>$unanswered,
      'rawScoreMillipoints'=>$raw,'maximumMillipoints'=>$max,
      'scoringModelId'=>$context['scoringModelId'],
      'scoringPolicySha256'=>$context['policySha256'],
      'percentile'=>null,'admissionProbability'=>null,
      'psychometricValidationEstablished'=>false,
      'computedWithoutWindowsWorker'=>true,
      'automaticPublicationAuthorized'=>false
    ];
}
