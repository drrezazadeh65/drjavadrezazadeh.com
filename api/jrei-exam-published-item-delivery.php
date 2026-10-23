<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Source-only immutable exam question transport, without any answer key.
 *
 * Original eco_assessment_items.prompt_object_id -> original eco_object_refs
 * -> content-addressed verified JSON inside a Bertina private directory.
 * No public file paths, HTTP proxies, arbitrary URLs or AI worker retrieval.
 * The first rollout permits PLAIN-TEXT single-choice items only; equations,
 * images, charts and complex written responses require a separately reviewed
 * media transport. Missing media is a hard BLOCK, never silently discarded.
 */
function jrExamPrivateItemRoot(): ?string {
    $configured=(string)(cfg()['jrei_exam_private_item_dir']??'');
    if($configured===''||$configured[0]!=='/')return null;
    $root=realpath($configured);
    if($root===false||!is_dir($root)||!is_readable($root))return null;
    $public=realpath((string)($_SERVER['DOCUMENT_ROOT']??''));
    $api=realpath(__DIR__);
    foreach([$public,$api] as $forbidden){
        if($forbidden!==false&&($root===$forbidden||
            str_starts_with($root,$forbidden.DIRECTORY_SEPARATOR)))
            return null;
    }
    return $root;
}
function jrExamPublishedItemDeliveryReady(PDO $pdo): bool {
    if(jrExamPrivateItemRoot()===null)return false;
    try{
        foreach([
          'SELECT id,prompt_object_id,instrument_version_id FROM eco_assessment_items LIMIT 0',
          'SELECT id,storage_provider,object_reference,content_sha256,mime_type,byte_size,data_class,malware_scan_status FROM eco_object_refs LIMIT 0',
          'SELECT id,item_id,option_code FROM eco_assessment_options LIMIT 0'
        ] as $sql)$pdo->query($sql);
        return true;
    }catch(Throwable $e){return false;}
}
/**
 * Bounded content verified fresh on every read. All metadata are queried
 * ONLY from the existing mother DB; no candidate-supplied pathname is used.
 */
function jrExamDeliveredItemSet(PDO $pdo,string $version,string $locale): array {
    if(!validUuid($version)||!in_array($locale,['fa','en'],true))
        throw new InvalidArgumentException('invalid_reviewed_item_version');
    $root=jrExamPrivateItemRoot();
    if($root===null)throw new DomainException('private_exam_items_unavailable');
    $q=$pdo->prepare("SELECT i.id AS item_id,i.item_type,
      o.storage_provider,o.object_reference,o.content_sha256,o.mime_type,
      o.byte_size,o.data_class,o.malware_scan_status,o.encryption_key_reference
      FROM eco_assessment_items i
      LEFT JOIN eco_object_refs o ON o.id=i.prompt_object_id
      WHERE i.instrument_version_id=?
      ORDER BY i.display_order ASC,i.id ASC LIMIT 121");
    $q->execute([$version]);$items=$q->fetchAll(PDO::FETCH_ASSOC);
    if(!$items||count($items)>120)
        throw new DomainException('exam_item_count_out_of_bounds');
    $answers=[];$index=[];
    foreach($items as $r){
        $item=(string)$r['item_id'];
        if(!validUuid($item)||isset($index[$item])||
           $r['item_type']!=='SINGLE_CHOICE'||
           $r['storage_provider']!=='JR_EXAM_PUBLISHED_ITEM'||
           $r['mime_type']!=='application/json'||
           $r['data_class']!=='PRIVATE'||
           $r['malware_scan_status']!=='CLEAN'||
           $r['encryption_key_reference']!==null||
           !is_string($r['content_sha256'])||
           !preg_match('/^[a-f0-9]{64}$/D',$r['content_sha256'])||
           !is_string($r['object_reference'])||
           !hash_equals($r['content_sha256'].'.json',$r['object_reference'])||
           (int)$r['byte_size']<80||(int)$r['byte_size']>32768)
            throw new DomainException('unreleased_or_unscanned_question_content');
        $filename=$root.DIRECTORY_SEPARATOR.$r['object_reference'];
        $real=realpath($filename);
        if($real===false||
           dirname($real)!==$root||
           !is_file($real)||!is_readable($real)||
           filesize($real)!==(int)$r['byte_size'])
            throw new DomainException('private_question_file_missing');
        $bytes=file_get_contents($real);
        if(!is_string($bytes)||strlen($bytes)>32768||
           strlen($bytes)!==(int)$r['byte_size']||
           !hash_equals($r['content_sha256'],hash('sha256',$bytes)))
            throw new DomainException('immutable_question_digest_mismatch');
        try{$document=json_decode($bytes,true,16,JSON_THROW_ON_ERROR);}
        catch(Throwable $e){throw new DomainException('invalid_published_item_manifest');}
        if(!is_array($document)||
           array_keys($document)!==['itemId','locale','stem','options','media']||
           $document['itemId']!==$item||
           $document['locale']!==$locale||
           !is_string($document['stem'])||
           trim($document['stem'])===''||
           strlen($document['stem'])>12000||
           $document['media']!==null||
           !is_array($document['options'])||
           count($document['options'])<2||count($document['options'])>8)
            throw new DomainException('published_item_metadata_mismatch');
        $options=[];$seen=[];
        foreach($document['options'] as $choice){
            if(!is_array($choice)||array_keys($choice)!==['id','text']||
               !is_string($choice['id'])||!validUuid($choice['id'])||
               isset($seen[$choice['id']])||
               !is_string($choice['text'])||trim($choice['text'])===''||
               strlen($choice['text'])>3000)
                throw new DomainException('invalid_published_option_content');
            $seen[$choice['id']]=true;
            $options[]=['id'=>$choice['id'],'text'=>$choice['text']];
        }
        $index[$item]=['itemId'=>$item,'stem'=>$document['stem'],
           'options'=>$options,'media'=>null];
    }
    // Exact option-set consistency; contents can never smuggle a new
    // answer ID that is not an original authorised assessment option.
    $q=$pdo->prepare('SELECT x.item_id,x.id FROM eco_assessment_options x
      JOIN eco_assessment_items i ON i.id=x.item_id
      WHERE i.instrument_version_id=? ORDER BY x.item_id,x.display_order,x.id');
    $q->execute([$version]);$expected=[];
    foreach($q as $option)$expected[$option['item_id']][]=$option['id'];
    foreach($index as $id=>$item){
        $provided=array_column($item['options'],'id');
        if(count($provided)!==count($expected[$id]??[])||
           array_diff($provided,$expected[$id])||
           array_diff($expected[$id],$provided))
            throw new DomainException('published_option_set_conflict');
        $answers[]=$item;
    }
    return $answers;
}


/**
 * Authenticated, no-cache, active attempt question delivery. The caller's
 * original customer session is the only identity authority. Answer-key table
 * and research materials are never selected here.
 */
function jrExamCandidatePublishedItems(PDO $pdo,string $account,string $attempt): array {
    $id=jrExamAttemptUuid($attempt);
    $progress=jrExamAttemptProgress($pdo,$account,$id);
    if(($progress['canResume']??false)!==true)
        throw new DomainException('exam_not_available_for_question_delivery');
    $q=$pdo->prepare("SELECT s.instrument_version_id,s.locale,
        p.scoring_model_id,a.offering_id,a.deadline_at,a.attempt_state,
        o.offering_state,p.product_state
      FROM jrei_exam_commercial_attempts a
      JOIN eco_assessment_sessions s ON s.id=a.assessment_session_id
      JOIN jrei_exam_commercial_offerings o ON o.offering_id=a.offering_id
      JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
      WHERE a.attempt_id=? AND a.account_id=? LIMIT 1");
    $q->execute([$id,$account]);$row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row)||$row['attempt_state']!=='IN_PROGRESS'||
       $row['offering_state']!=='PUBLISHED'||
       $row['product_state']!=='PUBLISHED'||
       (int)$row['deadline_at']<time())
        throw new DomainException('exam_offering_suspended_or_expired');
    jrExamTrustedEntitlement($pdo,$account,$row['offering_id'],time());
    // Revalidate the original item/key metadata on each delivery. Consent,
    // customer entitlement and an earlier reviewed start are not a permanent
    // reproduction licence if the source is later suspended or revoked.
    $reviewed=jrExamVerifiedMcqContext($pdo,
      (string)$row['instrument_version_id'],(string)$row['scoring_model_id']);
    $items=jrExamDeliveredItemSet($pdo,
      (string)$row['instrument_version_id'],(string)$row['locale']);
    if(count($items)!==count($reviewed['items']))
        throw new DomainException('exam_source_approval_changed');
    $expected=[];
    foreach($reviewed['items'] as $original)
        $expected[$original['itemId']]=$original['allowedOptionIds'];
    foreach($items as $item){
        if(!array_key_exists($item['itemId'],$expected))
            throw new DomainException('exam_immutable_item_version_mismatch');
        $actual=array_column($item['options'],'id');
        if(count($actual)!==count($expected[$item['itemId']])||
           array_diff($actual,$expected[$item['itemId']]))
            throw new DomainException('exam_immutable_option_version_mismatch');
    }
    // The original source, key or scoring policy may change while the
    // immutable private JSON files are being read. Repeat the complete
    // current approval check immediately before preparing HTTP output.
    // This minimizes the TOCTOU window without creating an answer-key
    // transport, a new DB authority or a costly Windows worker dependency.
    $now=jrExamVerifiedMcqContext($pdo,
      (string)$row['instrument_version_id'],(string)$row['scoring_model_id']);
    $canonical=static fn(array $value): string=>hash('sha256',
      json_encode($value,
        JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
    if(!hash_equals($canonical($reviewed),$canonical($now)))
        throw new DomainException('exam_reviewed_source_or_policy_changed_during_delivery');
    // Do not treat a consumer's original prefetch as permission to continue
    // accessing suspended content, even if the immutable item bytes match.
    $q=$pdo->prepare("SELECT o.offering_state,p.product_state
      FROM jrei_exam_commercial_offerings o
      JOIN jrei_exam_commercial_products p ON p.product_id=o.product_id
      WHERE o.offering_id=? LIMIT 1");
    $q->execute([$row['offering_id']]);
    $release=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($release)||$release['offering_state']!=='PUBLISHED'||
       $release['product_state']!=='PUBLISHED'||time()>=(int)$row['deadline_at'])
        throw new DomainException('exam_offering_status_changed_during_delivery');
    return [
      'ok'=>true,'schema'=>'jr.jrei.private-published-items.v1',
      'attemptId'=>$id,'deadlineAt'=>(int)$row['deadline_at'],
      'responseRevision'=>(int)$progress['responseRevision'],
      'items'=>$items,
      'answerKeysIncluded'=>false,'solutionsIncluded'=>false,
      'publicationPermissionInferred'=>false,
      'serverClockAuthority'=>true
    ];
}
