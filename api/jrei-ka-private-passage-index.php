<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ka-private-text-extraction.php';

/**
 * Private provenance-only passage segmentation from previously extracted
 * UTF-8 text. Segments are *NOT* scientifically approved, public RAG
 * evidence, answer keys, or permissions to reproduce source material.
 *
 * No LLM inference, OCR, internet access, shell commands or learner data.
 */
function jrKaPassageSourceReady(PDO $pdo,array $cfg): bool {
    if(($cfg['jrei_ka_passage_proposals_enabled']??false)!==true||
       !jrKaTextSchemaReady($pdo,$cfg))return false;
    try{
        $pdo->query("SELECT passage_id,observation_id,passage_sha256
            FROM jrei_ka_private_passages LIMIT 0");
        $pdo->query("SELECT observation_id,segmentation_version,run_state
            FROM jrei_ka_private_passage_runs LIMIT 0");
        return true;
    }catch(Throwable $e){return false;}
}
function jrKaProposeParagraphSpans(string $text): array {
    if(strlen($text)<20||strlen($text)>524288||!preg_match('//u',$text))
        throw new DomainException('ka_passage_text_invalid');
    $pieces=preg_split('/\n[ \t]*\n+/u',$text,501,
        PREG_SPLIT_OFFSET_CAPTURE|PREG_SPLIT_NO_EMPTY);
    if(!is_array($pieces)||count($pieces)>500)
        throw new DomainException('ka_passage_count_unbounded');
    $spans=[];$rejected=0;$index=0;
    foreach($pieces as $piece){
        if(!is_array($piece)||count($piece)!==2)continue;
        [$paragraph,$offset]=$piece;
        $n=strlen($paragraph);
        // Never truncate a paragraph silently. Long blocks require a
        // dedicated math/image-layout review and a later pipeline version.
        if($n<30||$n>2048||$offset<0||$offset+$n>strlen($text)){
            $rejected++;continue;
        }
        if(count($spans)>=100){$rejected++;continue;}
        if(substr($text,$offset,$n)!==$paragraph)
            throw new DomainException('ka_passage_span_integrity_failed');
        $index++;
        $spans[]=[
          'index'=>$index,'offset'=>$offset,'length'=>$n,
          'sha256'=>hash('sha256',$paragraph)
        ];
    }
    return [
      'segmentationVersion'=>'PARAGRAPH_V1',
      'sourceParagraphCount'=>count($pieces),
      'rejectedParagraphCount'=>$rejected,
      'spans'=>$spans,
      'complete'=>count($pieces)>0&&$rejected===0
    ];
}
function jrKaProposeOnePrivatePassageSet(PDO $pdo,array $cfg): array {
    $status=[
      'schema'=>'jr.jrei.ka-passage-proposals.v1',
      'status'=>'OFF','documentsProcessed'=>0,'proposedPassages'=>0,
      'textPublished'=>false,'modelEvidencePublished'=>false,
      'scientificReviewPassed'=>false
    ];
    if(!jrKaPassageSourceReady($pdo,$cfg))return $status;
    $q=$pdo->query("SELECT x.observation_id,x.source_id,
      x.text_content_sha256,x.text_private_object_key,x.extracted_bytes,
      o.state AS observation_state,o.rights_state_at_acquisition
      FROM jrei_ka_text_extraction_jobs x
      JOIN jrei_ka_private_observations o
         ON o.observation_id=x.observation_id
      LEFT JOIN jrei_ka_private_passage_runs r
         ON r.observation_id=x.observation_id
      WHERE r.observation_id IS NULL
        AND x.processing_state='TEXT_PENDING_SCIENTIFIC_REVIEW'
      ORDER BY x.updated_at ASC,x.observation_id ASC LIMIT 1");
    $work=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($work))return [...$status,'status'=>'NO_TEXT_FOR_PASSAGE_PROPOSALS'];
    $root=jrKaPrivateArchiveRoot($cfg);
    if($root===null)throw new DomainException('ka_passage_private_archive_unavailable');
    $digest=(string)$work['text_content_sha256'];
    $key=(string)$work['text_private_object_key'];
    $expectedSize=(int)$work['extracted_bytes'];
    if(!preg_match('/^[a-f0-9]{64}$/D',$digest)||
       $key!==$digest.'.txt'||$expectedSize<20||$expectedSize>524288)
        throw new DomainException('ka_passage_original_text_metadata_invalid');
    $file=$root.DIRECTORY_SEPARATOR.$key;
    if(is_link($file))throw new DomainException('ka_passage_symlink_rejected');
    $canonical=realpath($file);
    if($canonical===false||dirname($canonical)!==$root||
       !is_file($canonical)||!is_readable($canonical)||
       filesize($canonical)!==$expectedSize)
        throw new DomainException('ka_passage_text_archive_unavailable');
    $content=file_get_contents($canonical);
    if(!is_string($content)||strlen($content)!==$expectedSize||
       !hash_equals($digest,hash('sha256',$content)))
        throw new DomainException('ka_passage_text_digest_changed');
    $segments=jrKaProposeParagraphSpans($content);
    $content='';$now=time();
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("SELECT source_id,review_state,rights_state,
            is_revoked,is_superseded
          FROM jrei_exam_sources WHERE source_id=? FOR UPDATE");
        $q->execute([$work['source_id']]);$src=$q->fetch(PDO::FETCH_ASSOC);
        $q=$pdo->prepare("SELECT scheduling_state,rights_reviewed
          FROM jrei_ka_source_policies WHERE source_id=? FOR UPDATE");
        $q->execute([$work['source_id']]);$policy=$q->fetch(PDO::FETCH_ASSOC);
        $q=$pdo->prepare("SELECT observation_id,source_id,state,
            rights_state_at_acquisition FROM jrei_ka_private_observations
          WHERE observation_id=? FOR UPDATE");
        $q->execute([$work['observation_id']]);$original=$q->fetch(PDO::FETCH_ASSOC);
        $q=$pdo->prepare("SELECT processing_state,text_content_sha256,
            text_private_object_key FROM jrei_ka_text_extraction_jobs
          WHERE observation_id=? FOR UPDATE");
        $q->execute([$work['observation_id']]);$extracted=$q->fetch(PDO::FETCH_ASSOC);
        $q=$pdo->prepare("SELECT observation_id FROM jrei_ka_private_passage_runs
           WHERE observation_id=? FOR UPDATE");
        $q->execute([$work['observation_id']]);
        $existing=$q->fetchColumn();
        if($existing!==false){
            $pdo->commit();
            return [...$status,'status'=>'ALREADY_SEGMENTED_BY_ANOTHER_RUN'];
        }
        if(!is_array($src)||!is_array($policy)||!is_array($original)||
           !is_array($extracted)||$src['review_state']!=='AUTHORITATIVE_REVIEWED'||
           (int)$src['is_revoked']!==0||(int)$src['is_superseded']!==0||
           $policy['scheduling_state']!=='APPROVED'||
           (int)$policy['rights_reviewed']!==1||
           $original['source_id']!==$work['source_id']||
           $original['state']!=='PENDING_SCIENTIFIC_REVIEW'||
           $src['rights_state']!==$original['rights_state_at_acquisition']||
           $extracted['processing_state']!=='TEXT_PENDING_SCIENTIFIC_REVIEW'||
           !hash_equals($digest,(string)$extracted['text_content_sha256'])||
           $extracted['text_private_object_key']!==$key)
            throw new DomainException('ka_passage_rights_or_original_revision_changed');
        $insert=$pdo->prepare("INSERT INTO jrei_ka_private_passages
          (passage_id,observation_id,source_id,text_content_sha256,
           passage_sha256,byte_offset,byte_length,passage_index,created_at)
          VALUES (?,?,?,?,?,?,?,?,?)");
        foreach($segments['spans'] as $span){
            $insert->execute([
              jrKaUuid(),$work['observation_id'],$work['source_id'],
              $digest,$span['sha256'],$span['offset'],
              $span['length'],$span['index'],$now
            ]);
        }
        $q=$pdo->prepare("INSERT INTO jrei_ka_private_passage_runs
          (observation_id,text_content_sha256,segmentation_version,
           run_state,stored_passage_count,source_paragraph_count,
           rejected_paragraph_count,created_at)
          VALUES (?,?,?,?,?,?,?,?)");
        $q->execute([
          $work['observation_id'],$digest,$segments['segmentationVersion'],
          $segments['complete']?'FULL_UNREVIEWED':'PARTIAL_UNREVIEWED',
          count($segments['spans']),$segments['sourceParagraphCount'],
          $segments['rejectedParagraphCount'],$now
        ]);
        $pdo->commit();
        return [
          ...$status,'status'=>'PASSAGES_PENDING_INDEPENDENT_REVIEW',
          'documentsProcessed'=>1,
          'proposedPassages'=>count($segments['spans']),
          'sourceParagraphCount'=>$segments['sourceParagraphCount'],
          'uncoveredParagraphs'=>$segments['rejectedParagraphCount'],
          'completeSegmentation'=>$segments['complete']
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
