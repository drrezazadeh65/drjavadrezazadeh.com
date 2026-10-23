<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ka-private-passage-index.php';

/**
 * Authenticated original MFA owner expert-review workflow. Approves only
 * SOURCE/QUOTE fidelity and licensed reproduction, not factual truth,
 * generated questions, psychometric validity or model accuracy.
 */
function jrKaPublicQuoteReviewSchemaReady(PDO $pdo): bool {
    try{
        $pdo->query("SELECT review_id,passage_id,decision
          FROM jrei_ka_public_quote_attestations LIMIT 0");
        return true;
    }catch(Throwable $e){return false;}
}
function jrKaReadPassageEvidence(PDO $pdo,array $cfg,string $passageId): array {
    $q=$pdo->prepare("SELECT p.passage_id,p.source_id,p.passage_sha256,
       p.text_content_sha256,p.byte_offset,p.byte_length,
       p.passage_state,p.review_rights_state,
       s.source_title,s.source_locator_uri,s.rights_state,
       s.review_state,s.reviewer_account_id AS source_reviewer_id,
       s.is_revoked,s.is_superseded,
       t.text_private_object_key,t.extracted_bytes,t.processing_state,
       o.rights_state_at_acquisition,
       pol.scheduling_state,pol.rights_reviewed,
       pol.rights_evidence_sha256
       FROM jrei_ka_private_passages p
       JOIN jrei_exam_sources s ON s.source_id=p.source_id
       JOIN jrei_ka_private_observations o ON o.observation_id=p.observation_id
       JOIN jrei_ka_text_extraction_jobs t ON t.observation_id=p.observation_id
       JOIN jrei_ka_source_policies pol ON pol.source_id=p.source_id
       WHERE p.passage_id=? LIMIT 1");
    $q->execute([$passageId]);$row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row)||$row['review_state']!=='AUTHORITATIVE_REVIEWED'||
       !in_array($row['rights_state'],
           ['PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'],true)||
       (int)$row['is_revoked']!==0||(int)$row['is_superseded']!==0||
       $row['source_reviewer_id']===null||
       $row['scheduling_state']!=='APPROVED'||
       (int)$row['rights_reviewed']!==1||
       !preg_match('/^[a-f0-9]{64}$/D',(string)$row['rights_evidence_sha256'])||
       !in_array($row['passage_state'],
          ['NEEDS_SCIENTIFIC_REVIEW','APPROVED_PUBLIC_AI_EVIDENCE',
           'REJECTED_FOR_PUBLIC_AI'],true)||
       $row['processing_state']!=='TEXT_PENDING_SCIENTIFIC_REVIEW'||
       $row['rights_state_at_acquisition']!==$row['rights_state'])
        throw new DomainException('ka_quote_original_source_not_authorized');
    $root=jrKaPrivateArchiveRoot($cfg);
    if($root===null)
        throw new DomainException('ka_quote_private_text_unavailable');
    $digest=(string)$row['text_content_sha256'];
    $passage=(string)$row['passage_sha256'];
    $offset=(int)$row['byte_offset'];$length=(int)$row['byte_length'];
    $textSize=(int)$row['extracted_bytes'];
    if(!preg_match('/^[a-f0-9]{64}$/D',$digest)||
       !preg_match('/^[a-f0-9]{64}$/D',$passage)||
       $row['text_private_object_key']!==$digest.'.txt'||
       $length<40||$length>650||$textSize<40||$textSize>524288||
       $offset<0||$offset>$textSize-$length)
        throw new DomainException('ka_quote_span_not_reconstructable');
    $file=$root.DIRECTORY_SEPARATOR.$digest.'.txt';
    if(is_link($file))throw new DomainException('ka_quote_symlink_rejected');
    $canonical=realpath($file);
    if($canonical===false||dirname($canonical)!==$root||
       !is_file($canonical)||!is_readable($canonical)||
       filesize($canonical)!==$textSize)
        throw new DomainException('ka_quote_missing_original_text');
    $contents=file_get_contents($canonical);
    if(!is_string($contents)||strlen($contents)!==$textSize||
       !hash_equals($digest,hash('sha256',$contents)))
        throw new DomainException('ka_quote_original_text_changed');
    $excerpt=substr($contents,$offset,$length);
    $contents='';
    if(!preg_match('//u',$excerpt)||
       !hash_equals($passage,hash('sha256',$excerpt))||
       preg_match('/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u',$excerpt)||
       preg_match('/(?:\d[\s-]*){13,19}/u',$excerpt)||
       preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/',$excerpt))
        throw new DomainException('ka_quote_sensitive_or_invalid_passage');
    return ['record'=>$row,'excerpt'=>$excerpt];
}
function jrKaOwnerPublicQuoteQueue(PDO $pdo,array $cfg): array {
    $result=['schema'=>'jr.jrei.public-quote-review.v1',
       'available'=>false,'pendingCount'=>null,'examples'=>[],
       'truncated'=>false,'publicCitationEvidenceValidated'=>false,
       'scientificClaimsIndependentlyEntailed'=>false];
    if(!jrKaPublicQuoteReviewSchemaReady($pdo))return $result;
    try{
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_ka_private_passages
          WHERE passage_state='NEEDS_SCIENTIFIC_REVIEW'");
        $result['pendingCount']=(int)$q->fetchColumn();
        $q=$pdo->query("SELECT passage_id FROM jrei_ka_private_passages
          WHERE passage_state='NEEDS_SCIENTIFIC_REVIEW'
          ORDER BY created_at,passage_id LIMIT 9");
        $rows=$q->fetchAll(PDO::FETCH_COLUMN);
        $result['available']=true;
        $result['truncated']=count($rows)>8;
        foreach(array_slice($rows,0,8) as $id) {
            try{
                $info=jrKaReadPassageEvidence($pdo,$cfg,$id);
                $row=$info['record'];
                $result['examples'][]=[
                  'passageId'=>$id,
                  'sourceId'=>$row['source_id'],
                  'sourceTitle'=>$row['source_title'],
                  'passageSha256'=>$row['passage_sha256'],
                  'licensedForPublicQuote'=>$row['rights_state']==='PERMITTED_REPRODUCTION',
                  'rightsEvidenceSha256'=>$row['rights_evidence_sha256'],
                  'excerpt'=>$info['excerpt'],
                  'status'=>'NEEDS_INDEPENDENT_QUOTE_REVIEW',
                  'sourceReviewerId'=>$row['source_reviewer_id'],
                  'scientificallyValidated'=>false
                ];
            }catch(Throwable $ignored){
                // Omit potentially sensitive or inaccessible private text.
            }
        }
    }catch(Throwable $e){
        $result['available']=false;$result['pendingCount']=null;
        $result['examples']=[];
    }
    return $result;
}
/** Original superadmin MFA + CSRF + same-origin route only. */
function jrKaOwnerPublicQuoteDecision(PDO $pdo,array $cfg,
    string $actor,array $body): array {
    if(!jrKaPublicQuoteReviewSchemaReady($pdo))
        throw new DomainException('ka_quote_review_migration_missing');
    $id=$body['passageId']??null;
    $expected=$body['excerptSha256']??null;
    $rights=$body['rightsEvidenceSha256']??null;
    $review=$body['independentReviewEvidenceSha256']??null;
    $decision=$body['decision']??null;
    if(!is_string($id)||!validUuid($id)||
       !is_string($expected)||!preg_match('/^[a-f0-9]{64}$/D',$expected)||
       !is_string($rights)||!preg_match('/^[a-f0-9]{64}$/D',$rights)||
       !is_string($review)||!preg_match('/^[a-f0-9]{64}$/D',$review)||
       !in_array($decision,['APPROVE_PUBLIC_QUOTE',
           'REJECT_PUBLIC_QUOTE'],true)||
       ($body['confirmation']??null)!=='REVIEW_LICENSED_QUOTE_NOT_SCIENTIFIC_TRUTH')
        throw new InvalidArgumentException('ka_quote_decision_invalid');
    $record=jrKaReadPassageEvidence($pdo,$cfg,$id);
    $row=$record['record'];
    if(!hash_equals($expected,(string)$row['passage_sha256'])||
       !hash_equals($rights,(string)$row['rights_evidence_sha256']))
        throw new DomainException('ka_quote_review_original_digests_mismatch');
    if($row['source_reviewer_id']===$actor)
        throw new DomainException('ka_quote_independent_reviewer_required');
    if($decision==='APPROVE_PUBLIC_QUOTE'&&
       $row['rights_state']!=='PERMITTED_REPRODUCTION')
        throw new DomainException('ka_quote_public_rights_absent');
    if($decision==='APPROVE_PUBLIC_QUOTE'&&
       !hash_equals($expected,hash('sha256',$record['excerpt'])))
        throw new DomainException('ka_quote_digest_not_reconstructed');
    $pdo->beginTransaction();
    try{
        // Lock source + policy before original quote metadata.
        $q=$pdo->prepare("SELECT rights_state,review_state,is_revoked,
            is_superseded,reviewer_account_id FROM jrei_exam_sources
            WHERE source_id=? FOR UPDATE");
        $q->execute([$row['source_id']]);$source=$q->fetch(PDO::FETCH_ASSOC);
        $q=$pdo->prepare("SELECT scheduling_state,rights_reviewed,
            rights_evidence_sha256 FROM jrei_ka_source_policies
            WHERE source_id=? FOR UPDATE");
        $q->execute([$row['source_id']]);$policy=$q->fetch(PDO::FETCH_ASSOC);
        $q=$pdo->prepare("SELECT passage_state,passage_sha256,
            text_content_sha256 FROM jrei_ka_private_passages
            WHERE passage_id=? FOR UPDATE");
        $q->execute([$id]);$passage=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($source)||!is_array($policy)||!is_array($passage)||
           $source['review_state']!=='AUTHORITATIVE_REVIEWED'||
           (int)$source['is_revoked']!==0||
           (int)$source['is_superseded']!==0||
           $source['reviewer_account_id']===$actor||
           $policy['scheduling_state']!=='APPROVED'||
           (int)$policy['rights_reviewed']!==1||
           !hash_equals($rights,(string)$policy['rights_evidence_sha256'])||
           $passage['passage_state']!=='NEEDS_SCIENTIFIC_REVIEW'||
           !hash_equals($expected,(string)$passage['passage_sha256'])||
           !hash_equals((string)$row['text_content_sha256'],
                         (string)$passage['text_content_sha256'])||
           ($decision==='APPROVE_PUBLIC_QUOTE'&&
              $source['rights_state']!=='PERMITTED_REPRODUCTION'))
            throw new DomainException('ka_quote_recalled_or_review_changed');
        $now=time();$accepted=$decision==='APPROVE_PUBLIC_QUOTE';
        $q=$pdo->prepare("INSERT INTO jrei_ka_public_quote_attestations
           (review_id,passage_id,source_id,reviewer_account_id,
            decision,quoted_passage_sha256,reviewed_source_rights_sha256,
            independent_review_evidence_sha256,
            reviewer_acknowledges_claim_not_validated,reviewed_at)
            VALUES (?,?,?,?,?,?,?,?,1,?)");
        $q->execute([jrKaUuid(),$id,$row['source_id'],$actor,
           $decision,$expected,$rights,$review,$now]);
        $q=$pdo->prepare("UPDATE jrei_ka_private_passages
           SET passage_state=?,review_rights_state=?,
               reviewer_account_id=?,reviewed_at=?
           WHERE passage_id=? AND passage_state='NEEDS_SCIENTIFIC_REVIEW'");
        $q->execute([$accepted?'APPROVED_PUBLIC_AI_EVIDENCE':
             'REJECTED_FOR_PUBLIC_AI',
             $accepted?'PERMITTED_PUBLIC_QUOTE':'UNVERIFIED_FOR_PUBLIC_DISPLAY',
             $actor,$now,$id]);
        if($q->rowCount()!==1)
            throw new DomainException('ka_quote_status_changed');
        operationsAudit($pdo,$actor,$accepted?
           'jrei_ka_public_quote_rights_approved':
           'jrei_ka_public_quote_rejected',$id);
        $pdo->commit();
        return ['ok'=>true,'reviewRecorded'=>true,
           'shortQuotationPublicUseAllowed'=>$accepted,
           'scientificClaimTruthValidated'=>false,
           'unreviewedGeneratedClaimsPublished'=>false,
           'paymentOrStudentDataChanged'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
