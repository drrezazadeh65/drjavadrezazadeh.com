<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Source-only import of a human-supplied offline Windows OCR METADATA claim.
 * This is not a worker-signed attestation or a verified text import.
 * Original PDF/ocr text, source URLs, local paths and student data never enter
 * the payload, the owner dashboard or this provenance table.
 *
 * The original SUPER_ADMIN + fresh MFA + exact-origin CSRF and audit gates
 * are enforced by operations.php before this handler can be called.
 */
function jrKaOwnerLocalOcrIntake(PDO $pdo,string $actor,array $body): array {
    $raw=$body['ocrMetadata']??null;
    $sha='/^[a-f0-9]{64}$/D';
    if(!is_array($raw)||array_is_list($raw)||
       ($body['action']??null)!=='ka_record_offline_ocr_metadata'||
       ($body['confirmation']??null)!=='RECORD_UNVERIFIED_LOCAL_OCR_METADATA_ONLY'||
       ($raw['schema']??null)!=='jr.jrei.local-ocr-observation.v1'||
       !is_string($raw['observationId']??null)||
       !validUuid($raw['observationId'])||
       !is_string($raw['sourceId']??null)||
       !validUuid($raw['sourceId'])||
       !is_string($raw['originalPdfSha256']??null)||
       !preg_match($sha,$raw['originalPdfSha256'])||
       !is_string($raw['textSha256']??null)||
       !preg_match($sha,$raw['textSha256'])||
       !is_int($raw['renderedPageCount']??null)||
       $raw['renderedPageCount']<1||$raw['renderedPageCount']>8||
       ($raw['textScientificApproval']??null)!=='REVIEW_REQUIRED'||
       ($raw['textPubliclyReproducible']??null)!==false||
       ($raw['wholeDocumentPageCountVerified']??null)!==false||
       ($raw['mayHaveOmittedPages']??null)!==true||
       ($raw['handwrittenOrMathematicalAccuracyValidated']??null)!==false||
       !is_array($raw['pageObservations']??null)||
       !array_is_list($raw['pageObservations'])||
       count($raw['pageObservations'])!==$raw['renderedPageCount'])
        throw new InvalidArgumentException('unverified_ocr_manifest_invalid');
    $acceptedPages=[];
    $empty=0;$math=0;$totalBytes=0;
    foreach($raw['pageObservations'] as $index=>$p){
        if(!is_array($p)||array_is_list($p)||
           ($p['pageNumber']??null)!==$index+1||
           !is_string($p['rasterSha256']??null)||
           !preg_match($sha,$p['rasterSha256'])||
           !is_string($p['extractedTextSha256']??null)||
           !preg_match($sha,$p['extractedTextSha256'])||
           !is_int($p['extractedBytes']??null)||
           $p['extractedBytes']<0||$p['extractedBytes']>1048576||
           !is_bool($p['emptyOcrPage']??null)||
           !is_bool($p['potentialMathSymbols']??null)||
           ($p['allEquationsAndFiguresScientificallyVerified']??null)!==false)
            throw new InvalidArgumentException('unverified_ocr_page_claim_invalid');
        if($p['emptyOcrPage']!==($p['extractedBytes']===0))
            throw new InvalidArgumentException('ocr_page_size_state_conflict');
        $empty+=(int)$p['emptyOcrPage'];
        $math+=(int)$p['potentialMathSymbols'];
        $totalBytes+=$p['extractedBytes'];
        $acceptedPages[]=[
            'pageNumber'=>$p['pageNumber'],
            'rasterSha256'=>$p['rasterSha256'],
            'extractedTextSha256'=>$p['extractedTextSha256'],
            'extractedBytes'=>$p['extractedBytes'],
            'emptyOcrPage'=>$p['emptyOcrPage'],
            'potentialMathSymbols'=>$p['potentialMathSymbols']
        ];
    }
    if($totalBytes>8388608||!is_int($raw['bytes']??null)||
       $raw['bytes']<1||$raw['bytes']>3145728)
        throw new InvalidArgumentException('unverified_ocr_bytes_out_of_bounds');
    // Hash of a canonical *projection*, not full unscreened user JSON.
    $pageJson=json_encode($acceptedPages,
       JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    $pageDigest=hash('sha256',$pageJson);
    $manifestDigest=hash('sha256',json_encode([
      'schema'=>'jr.jrei.local-ocr-observation.v1',
      'sourceId'=>$raw['sourceId'],
      'observationId'=>$raw['observationId'],
      'originalPdfSha256'=>$raw['originalPdfSha256'],
      'textSha256'=>$raw['textSha256'],
      'renderedPageCount'=>$raw['renderedPageCount'],
      'pageDigest'=>$pageDigest,
      'textBytes'=>$raw['bytes']
    ],JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
    try{
        $pdo->query('SELECT observation_id,source_id,
          original_pdf_sha256,recorded_manifest_sha256
          FROM jrei_ka_local_ocr_observation_intake LIMIT 0');
    }catch(Throwable $e){
        throw new DomainException('local_ocr_intake_migration_required',0,$e);
    }
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT source_id FROM jrei_ka_private_observations
          WHERE observation_id=? LIMIT 1');
        $q->execute([$raw['observationId']]);
        if($q->fetchColumn()!==$raw['sourceId'])
            throw new DomainException('local_ocr_original_observation_not_found');
        // Original source-first lock order for all KA attribution paths.
        $q=$pdo->prepare('SELECT source_id,review_state,rights_state,
          is_revoked,is_superseded,verified_at
          FROM jrei_exam_sources WHERE source_id=? FOR UPDATE');
        $q->execute([$raw['sourceId']]);$source=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($source)||
           $source['review_state']!=='AUTHORITATIVE_REVIEWED'||
           !in_array($source['rights_state'],
             ['PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'],true)||
           (int)$source['is_revoked']!==0||
           (int)$source['is_superseded']!==0||
           $source['verified_at']===null)
            throw new DomainException('local_ocr_source_review_or_rights_missing');
        $q=$pdo->prepare('SELECT scheduling_state,rights_reviewed
          FROM jrei_ka_source_policies WHERE source_id=? FOR UPDATE');
        $q->execute([$raw['sourceId']]);$policy=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($policy)||$policy['scheduling_state']!=='APPROVED'||
           (int)$policy['rights_reviewed']!==1)
            throw new DomainException('local_ocr_source_policy_not_approved');
        $q=$pdo->prepare('SELECT source_id,content_sha256,mime_type,
          state,rights_state_at_acquisition
          FROM jrei_ka_private_observations
          WHERE observation_id=? FOR UPDATE');
        $q->execute([$raw['observationId']]);$ob=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($ob)||$ob['source_id']!==$raw['sourceId']||
           $ob['content_sha256']!==$raw['originalPdfSha256']||
           $ob['mime_type']!=='application/pdf'||
           $ob['state']!=='PENDING_SCIENTIFIC_REVIEW'||
           $ob['rights_state_at_acquisition']!==$source['rights_state'])
            throw new DomainException('local_ocr_source_original_digest_changed');
        $q=$pdo->prepare('SELECT source_id,processing_state
          FROM jrei_ka_text_extraction_jobs
          WHERE observation_id=? FOR UPDATE');
        $q->execute([$raw['observationId']]);$job=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($job)||$job['source_id']!==$raw['sourceId']||
           $job['processing_state']!=='OCR_REQUIRED')
            throw new DomainException('local_ocr_requires_original_pdf_ocr_state');
        $q=$pdo->prepare('SELECT observation_id
          FROM jrei_ka_local_ocr_observation_intake
          WHERE observation_id=? FOR UPDATE');
        $q->execute([$raw['observationId']]);
        if($q->fetchColumn()!==false)
            throw new DomainException('local_ocr_claim_already_recorded');
        $q=$pdo->prepare('INSERT INTO jrei_ka_local_ocr_observation_intake
          (observation_id,source_id,original_pdf_sha256,ocr_text_sha256,
           ocr_page_manifest_sha256,recorded_manifest_sha256,
           rendered_page_count,empty_page_count,detected_math_page_count,
           intake_state,recorded_by_account_id,recorded_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
        $q->execute([$raw['observationId'],$raw['sourceId'],
            $raw['originalPdfSha256'],$raw['textSha256'],
            $pageDigest,$manifestDigest,$raw['renderedPageCount'],
            $empty,$math,'UNVERIFIED_LOCAL_OCR_OBSERVATION',$actor,time()]);
        if($q->rowCount()!==1)
            throw new DomainException('local_ocr_intake_write_conflict');
        operationsAudit($pdo,$actor,'jrei_local_ocr_unverified_metadata_recorded',
            $raw['observationId']);
        $pdo->commit();
        return [
          'ok'=>true,'recordedUnverifiedMetadata'=>true,
          'signedWorkerIdentityVerified'=>false,
          'rawDocumentOrTextTransferred'=>false,
          'ocrAccuracyVerified'=>false,'mathematicalAccuracyVerified'=>false,
          'textPromotedToScientificEvidence'=>false,
          'examContentPublished'=>false
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function jrKaOwnerLocalOcrEvidenceSnapshot(PDO $pdo): array {
    $result=['schema'=>'jr.jrei.local-ocr-owner-intake.v1',
      'available'=>false,'recordedObservations'=>null,
      'withEmptyPages'=>null,'withPotentialMathSymbols'=>null,
      'scienceApproved'=>false,'workerSignatureVerified'=>false,
      'publicTextsReleased'=>false];
    try{
        $q=$pdo->query('SELECT COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN empty_page_count>0 THEN 1 ELSE 0 END),0)
             AS empty_cases,
          COALESCE(SUM(CASE WHEN detected_math_page_count>0 THEN 1 ELSE 0 END),0)
             AS math_cases FROM jrei_ka_local_ocr_observation_intake');
        $x=$q->fetch(PDO::FETCH_ASSOC);
        $result['recordedObservations']=(int)$x['total'];
        $result['withEmptyPages']=(int)$x['empty_cases'];
        $result['withPotentialMathSymbols']=(int)$x['math_cases'];
        $result['available']=true;
    }catch(Throwable $e){}
    return $result;
}
