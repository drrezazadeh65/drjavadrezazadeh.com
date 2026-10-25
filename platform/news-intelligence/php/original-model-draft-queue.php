<?php
declare(strict_types=1);
/**
 * Original private JREI News model work queue, NOT a second model provider.
 *
 * No SQL schema additions. Works only for already independently approved
 * article evidence with current canonical content hash. The original JREI
 * provider and independently audited author corpus are mandatory; missing
 * credentials or original QA callbacks produce a SYSTEM_HOLD, not an owner
 * article-approval request.
 *
 * This module does not publish or render public news, create fake model
 * responses, or decide independent scientific quality itself.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/original-ai-news-drafting.php';

function jrNewsOriginalPrivateDraftBatch(
    PDO $pdo,array $cfg,array $privateJob,array $originalServices,
    int $now,int $maxPerTick=2
): array {
    if(($privateJob['source']??null)!=='ORIGINAL_JREI_NEWS_PRIVATE_CRON'||
       ($privateJob['serverSideJobAuthenticated']??null)!==true||
       ($privateJob['originalCronLeaseCurrent']??null)!==true||
       $now<=0||$maxPerTick<1||$maxPerTick>3)
        throw new RuntimeException('news_draft_private_cron_authority_required');
    $result=['schema'=>'jr.jrei.news-original-draft-batch.v1',
        'state'=>'OFF','examined'=>0,'completed'=>0,'alreadyDrafted'=>0,
        'systemHolds'=>0,'sourceExceptions'=>0,'realModelInvocationsAuthorized'=>false,
        'individualOwnerApprovalsRequested'=>0,'publicationsCreated'=>0];
    if(($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['jrei_news_model_drafting_enabled']??false)!==true||
       ($cfg['jrei_live_ai_enabled']??false)!==true||
       ($cfg['operations_cron_master_enabled']??false)!==true)
        return $result;
    $names=['originalEvidence','authorStyleProfile',
        'independentFactAndStyleAudit','approvedMedia',
        'originalAuditorSignatureVerifier'];
    foreach($names as $name)
        if(!isset($originalServices[$name])||
           !is_callable($originalServices[$name]))
            return [...$result,'state'=>'SYSTEM_HOLD_ORIGINAL_JREI_SERVICE_MISSING',
                'systemHolds'=>1];
    // Original JREI model privacy, cost and credentials are checked again
    // inside the existing guarded AI provider; this queue never owns a key.
    $q=$pdo->prepare(
        "SELECT c.candidate_id,e.review_id
         FROM jrei_news_candidates c
         JOIN jrei_news_evidence_reviews e ON e.candidate_id=c.candidate_id
              AND BINARY e.content_sha256=BINARY c.content_sha256
         WHERE e.verification_state='APPROVED'
           AND e.issuer_verified=1 AND e.usage_rights_verified=1
           AND NOT EXISTS (
             SELECT 1 FROM jrei_news_editorial_versions v
              WHERE v.candidate_id=c.candidate_id
           )
         ORDER BY c.candidate_id ASC,e.review_id ASC LIMIT ?"
    );
    $q->bindValue(1,$maxPerTick*4,PDO::PARAM_INT);
    $q->execute();
    $handled=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $candidate){
        if($result['examined']>=$maxPerTick)break;
        $id=(string)$candidate['candidate_id'];
        $review=(string)$candidate['review_id'];
        if(isset($handled[$id]))continue;
        $handled[$id]=true;
        $result['examined']++;
        if(!preg_match('/^[a-f0-9-]{36}$/iD',$id)||
           !preg_match('/^[a-f0-9-]{36}$/iD',$review)){
            $result['sourceExceptions']++;continue;
        }
        // MySQL named lock prevents two original Cron workers from paying
        // for duplicate model calls. Never lock a row during network access.
        $lockName='jrei:news:draft:'.hash('sha1',$id); // 56 chars; MySQL lock names max 64
        $get=$pdo->prepare('SELECT GET_LOCK(?,0)');
        $get->execute([$lockName]);
        if((int)$get->fetchColumn()!==1){
            $result['systemHolds']++;continue;
        }
        try{
            $present=$pdo->prepare(
                'SELECT 1 FROM jrei_news_editorial_versions
                  WHERE candidate_id=? LIMIT 1');
            $present->execute([$id]);
            if($present->fetchColumn()!==false){
                $result['alreadyDrafted']++;continue;
            }
            $saved=jrNewsOriginalGenerateReviewedBilingualDraft(
                $pdo,$cfg,$id,$review,
                $originalServices['originalEvidence'],
                $originalServices['authorStyleProfile'],
                $originalServices['independentFactAndStyleAudit'],
                $originalServices['approvedMedia'],
                $originalServices['originalAuditorSignatureVerifier'],$now);
            if(($saved['requiresIndividualOwnerApproval']??null)===false&&
               ($saved['requiresActiveStandingNewsPolicy']??null)===true&&
               is_string($saved['revisionId']??null))
                $result['completed']++;
            else
                $result['systemHolds']++;
        }catch(Throwable $e){
            // Missing model funds/credentials, timeouts, rights drift and
            // QA rejection are NOT silently considered owner approval.
            $result['systemHolds']++;
        }finally{
            $release=$pdo->prepare('SELECT RELEASE_LOCK(?)');
            $release->execute([$lockName]);
        }
    }
    $result['state']=$result['systemHolds']>0?
        'PARTIAL_SYSTEM_HOLD':'DRAFT_BATCH_COMPLETE';
    $result['realModelInvocationsAuthorized']=$result['completed']>0;
    return $result;
}
