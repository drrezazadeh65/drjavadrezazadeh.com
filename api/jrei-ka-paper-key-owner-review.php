<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ka-paper-key-proposals.php';

/**
 * Owner-supervised candidate link exception triage.
 * The ORIGINAL MFA/CSRF route authorises this action. It neither marks
 * answer correctness verified nor publishes/grades examination material.
 */
function jrKaOwnerTriagePaperKey(PDO $pdo,string $actor,array $body): array {
    $id=$body['candidateId']??null;
    $choice=$body['decision']??null;
    $confirmation=$body['confirmation']??null;
    if(!is_string($id)||!validUuid($id)||
       !in_array($choice,['REJECTED_METADATA_MISMATCH',
           'META_CONFIRMED_NEEDS_CONTENT_REVIEW'],true)||
       $confirmation!=='TRIAGE_KEY_CANDIDATE_WITHOUT_SCIENTIFIC_APPROVAL')
        throw new InvalidArgumentException('invalid_paper_key_review_request');
    $pdo->beginTransaction();
    try{
        // Inspect only immutable source refs before row locking, then
        // revalidate the pair + original source rights under transaction.
        $q=$pdo->prepare("SELECT paper_source_id,key_source_id
          FROM jrei_ka_paper_key_candidates WHERE candidate_id=?");
        $q->execute([$id]);$pair=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($pair))throw new DomainException('paper_key_candidate_missing');
        $ids=[$pair['paper_source_id'],$pair['key_source_id']];
        sort($ids,SORT_STRING);
        $q=$pdo->prepare("SELECT source_id,rights_state,review_state,
          is_revoked,is_superseded,source_kind FROM jrei_exam_sources
          WHERE source_id=? FOR UPDATE");
        $sources=[];
        foreach($ids as $sourceId){
            $q->execute([$sourceId]);
            $source=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($source))
                throw new DomainException('paper_key_source_missing');
            $sources[$sourceId]=$source;
        }
        $q=$pdo->prepare("SELECT paper_source_id,key_source_id,review_state
          FROM jrei_ka_paper_key_candidates
          WHERE candidate_id=? FOR UPDATE");
        $q->execute([$id]);$live=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($live)||
           $live['review_state']!=='NEEDS_INDEPENDENT_KEY_MATCH'||
           $live['paper_source_id']!==$pair['paper_source_id']||
           $live['key_source_id']!==$pair['key_source_id'])
            throw new DomainException('paper_key_triage_changed_or_recalled');
        if($choice==='META_CONFIRMED_NEEDS_CONTENT_REVIEW'){
            $paper=$sources[$pair['paper_source_id']];
            $key=$sources[$pair['key_source_id']];
            if($paper['source_kind']!=='EXAM_PAPER'||
               $key['source_kind']!=='ANSWER_KEY')
                throw new DomainException('paper_key_kind_changed');
            foreach([$paper,$key] as $s){
                if($s['review_state']!=='AUTHORITATIVE_REVIEWED'||
                   !in_array($s['rights_state'],[
                       'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'],true)||
                   (int)$s['is_revoked']!==0||(int)$s['is_superseded']!==0)
                    throw new DomainException('paper_key_source_rights_changed');
            }
        }
        $q=$pdo->prepare("UPDATE jrei_ka_paper_key_candidates SET
           review_state=?,reviewer_account_id=?,reviewer_decision_at=?,
           source_content_verified=0,key_correctness_verified=0,
           official_correction_checked=0,updated_at=?
           WHERE candidate_id=? AND review_state='NEEDS_INDEPENDENT_KEY_MATCH'");
        $now=time();
        $q->execute([$choice,$actor,$now,$now,$id]);
        if($q->rowCount()!==1)
            throw new DomainException('paper_key_triage_revision_conflict');
        operationsAudit($pdo,$actor,'jrei_ka_key_candidate_'.$choice,$id);
        $pdo->commit();
        return ['ok'=>true,'candidateId'=>$id,'reviewState'=>$choice,
          'answerCorrectnessVerified'=>false,'publiclyPublished'=>false,
          'actualSourceKeyTextCompared'=>false,
          'automaticallyCommerciallyPublishable'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
