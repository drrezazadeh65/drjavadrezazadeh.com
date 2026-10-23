<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * SUPER_ADMIN corpus/version approval and terminal job review; called ONLY
 * by the original MFA + CSRF-protected operations route. Never downloads or
 * trusts source documents, runs model code, or automatically publishes data.
 */
function jrHybridOwnerCorpusSnapshot(PDO $pdo): array {
    $ready=jrHybridCatalogueReady($pdo);
    $out=['catalogueReady'=>$ready,'datasets'=>[],
        'nodeOffersAvailable'=>jrHybridOffersReady($pdo),
        'nodeOffers'=>[]];
    if($ready){
        $q=$pdo->query('SELECT dataset_id,evaluation_version,dataset_sha256,
            evidence_sha256,active_policy_sha256,active_policy_json,source_label,source_url,
            licence_code,reviewed_case_count,status,revision,
            proposed_at,approved_at,suspended_at
            FROM jrei_hybrid_public_datasets
            ORDER BY updated_at DESC,dataset_id ASC LIMIT 50');
        foreach($q as $row)$out['datasets'][]=[
            'datasetId'=>$row['dataset_id'],
            'evaluationVersion'=>$row['evaluation_version'],
            'datasetSha256'=>$row['dataset_sha256'],
            'evidenceSha256'=>$row['evidence_sha256'],
            'activePolicySha256'=>$row['active_policy_sha256'],
            'currentPolicy'=>json_decode((string)$row['active_policy_json'],true),
            'sourceLabel'=>$row['source_label'],
            'sourceUrl'=>$row['source_url'],
            'licenceCode'=>$row['licence_code'],
            'reviewedCaseCount'=>(int)$row['reviewed_case_count'],
            'status'=>$row['status'],'revision'=>(int)$row['revision'],
            'proposedAt'=>(int)$row['proposed_at'],
            'approvedAt'=>$row['approved_at']===null?null:(int)$row['approved_at'],
            'suspendedAt'=>$row['suspended_at']===null?null:(int)$row['suspended_at']
        ];
    }
    if($out['nodeOffersAvailable']){
        // An offer is a fresh SIGNED DECLARATION, not a verified local file.
        $q=$pdo->prepare('SELECT node_id,dataset_id,dataset_sha256,
            evidence_sha256,evaluation_version,last_advertised_at
            FROM jrei_hybrid_node_offers WHERE last_advertised_at>=?
            ORDER BY node_id,dataset_id LIMIT 150');
        $q->execute([time()-120]);
        foreach($q as $r){
            $approved=jrHybridApprovedCorpus($pdo,[],(string)$r['dataset_id'],
                (string)$r['evaluation_version']);
            $matches=is_array($approved)&&
                hash_equals((string)$approved['datasetSha256'],(string)$r['dataset_sha256'])&&
                hash_equals((string)$approved['evidenceSha256'],(string)$r['evidence_sha256']);
            $out['nodeOffers'][]=[
                'nodeId'=>$r['node_id'],'datasetId'=>$r['dataset_id'],
                'evaluationVersion'=>$r['evaluation_version'],
                'matchesApprovedVersion'=>$matches,
                'lastAdvertisedAt'=>(int)$r['last_advertised_at']
            ];
        }
    }
    return $out;
}
function jrHybridOwnerCorpusChange(PDO $pdo,string $actor,array $body): array {
    if(!jrHybridCatalogueReady($pdo))
        throw new DomainException('governed_corpus_migration_required');
    $action=$body['action']??null;
    $now=time();
    if($action==='propose_public_dataset'){
        $id=$body['datasetId']??null;
        $version=$body['evaluationVersion']??null;
        $source=$body['sourceLabel']??null;
        $url=$body['sourceUrl']??null;
        $licence=$body['licenceCode']??null;
        $cases=$body['reviewedCaseCount']??null;
        $active=jrHybridPolicy($body['currentPolicy']??null);
        $parts=is_string($url)?parse_url($url):false;
        if(!jrHybridIdentifier($id)||!jrHybridIdentifier($version)||
           !jrHybridSha($body['datasetSha256']??null)||
           !jrHybridSha($body['evidenceSha256']??null)||
           $active===null||
           !is_string($source)||strlen(trim($source))<3||
           strlen($source)>160||preg_match('/[\x00-\x1f<>]/',$source)||
           !is_string($url)||strlen($url)>500||
           filter_var($url,FILTER_VALIDATE_URL)===false||
           !is_array($parts)||($parts['scheme']??null)!=='https'||
           !isset($parts['host'])||isset($parts['user'])||
           isset($parts['pass'])||isset($parts['fragment'])||
           !is_string($licence)||!preg_match(
             '/^[A-Za-z0-9._:+\/-]{3,80}$/D',$licence)||
           !is_int($cases)||$cases<200||$cases>10000||
           ($body['confirmation']??null)!=='PROPOSE_PUBLIC_HOLDOUT_FOR_REVIEW')
            throw new InvalidArgumentException('invalid_dataset_proposal');
        // Node normalizeRetrievalPolicy() emits b,k1,maxEvidence in THAT order.
        // SHA256(JSON.stringify(policy)) is order-sensitive across PHP and JS.
        $canonical=['b'=>$active['b'],'k1'=>$active['k1'],
            'maxEvidence'=>$active['maxEvidence']];
        $policyJson=json_encode($canonical,
            JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
        $policyHash=hash('sha256',$policyJson);
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('INSERT INTO jrei_hybrid_public_datasets
              (dataset_id,evaluation_version,dataset_sha256,evidence_sha256,
               active_policy_sha256,active_policy_json,source_label,source_url,licence_code,
               reviewed_case_count,status,proposed_at,proposed_by_account_id,
               updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            $q->execute([$id,$version,$body['datasetSha256'],
                $body['evidenceSha256'],$policyHash,$policyJson,
                trim($source),$url,$licence,$cases,'PENDING',$now,$actor,$now]);
            operationsAudit($pdo,$actor,'jrei_public_corpus_proposed',$id.':'.$version);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return ['ok'=>true,'status'=>'PENDING','datasetId'=>$id,
            'evaluationVersion'=>$version,'scientificallyValidated'=>false];
    }
    if($action==='approve_public_dataset'||
       $action==='suspend_public_dataset'){
        $id=$body['datasetId']??null;
        $version=$body['evaluationVersion']??null;
        $revision=$body['revision']??null;
        if(!jrHybridIdentifier($id)||!jrHybridIdentifier($version)||
           !is_int($revision)||$revision<1||
           ($body['confirmation']??null)!==($action==='approve_public_dataset'
             ?'APPROVE_REVIEWED_PUBLIC_CORPUS':'SUSPEND_PUBLIC_CORPUS_VERSION'))
            throw new InvalidArgumentException('invalid_dataset_review');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT status,revision,dataset_sha256,
                evidence_sha256 FROM jrei_hybrid_public_datasets
                WHERE dataset_id=? AND evaluation_version=? FOR UPDATE');
            $q->execute([$id,$version]);$r=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($r)||(int)$r['revision']!==$revision)
                throw new DomainException('dataset_version_conflict');
            $approve=$action==='approve_public_dataset';
            if(($approve&&$r['status']!=='PENDING')||
               (!$approve&&!in_array($r['status'],['PENDING','APPROVED'],true)))
                throw new DomainException('dataset_state_conflict');
            $status=$approve?'APPROVED':'SUSPENDED';
            $q=$pdo->prepare('UPDATE jrei_hybrid_public_datasets SET
                status=?,revision=revision+1,updated_at=?,
                approved_at=?,approved_by_account_id=?,suspended_at=?
                WHERE dataset_id=? AND evaluation_version=? AND revision=?');
            $q->execute([$status,$now,$approve?$now:null,$approve?$actor:null,
                $approve?null:$now,$id,$version,$revision]);
            if($q->rowCount()!==1)
                throw new DomainException('dataset_version_conflict');
            if(!$approve){
                // Cancellation prevents future work; an already running
                // evaluation may have completed before receiving the stop.
                $q=$pdo->prepare("UPDATE jrei_hybrid_jobs
                    SET status='CANCELLED',cancelled_at=?,
                    failure_code='DATASET_APPROVAL_REVOKED',
                    revision=revision+1 WHERE status='QUEUED'
                    AND requested_dataset_id=? AND evaluation_version=?
                    AND dataset_sha256=? AND evidence_sha256=?");
                $q->execute([$now,$id,$version,
                    $r['dataset_sha256'],$r['evidence_sha256']]);
                $q=$pdo->prepare("UPDATE jrei_hybrid_jobs
                    SET status='NEEDS_REVIEW',
                    failure_code='DATASET_SUSPENDED_OUTCOME_UNKNOWN',
                    revision=revision+1 WHERE status='LEASED'
                    AND requested_dataset_id=? AND evaluation_version=?
                    AND dataset_sha256=? AND evidence_sha256=?");
                $q->execute([$id,$version,
                    $r['dataset_sha256'],$r['evidence_sha256']]);
            }
            operationsAudit($pdo,$actor,
                $approve?'jrei_public_corpus_owner_approved':
                'jrei_public_corpus_owner_suspended',$id.':'.$version);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return ['ok'=>true,'datasetId'=>$id,
            'evaluationVersion'=>$version,'status'=>$status,
            'automaticPublication'=>false];
    }
    throw new InvalidArgumentException('invalid_corpus_action');
}
function jrHybridOwnerReviewJob(PDO $pdo,string $actor,array $body): array {
    $job=$body['jobId']??null;
    $revision=$body['revision']??null;
    $decision=$body['decision']??null;
    if(!jrHybridUuid($job)||!is_int($revision)||$revision<1||
       !in_array($decision,['ACKNOWLEDGE','REJECT','CLOSE_UNKNOWN'],true)||
       ($body['confirmation']??null)!=='REVIEW_AGGREGATE_WITHOUT_PUBLICATION')
        throw new InvalidArgumentException('invalid_job_review');
    $now=time();
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT status,revision FROM jrei_hybrid_jobs
            WHERE job_id=? FOR UPDATE');
        $q->execute([$job]);$r=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($r)||(int)$r['revision']!==$revision)
            throw new DomainException('job_version_conflict');
        if(($r['status']==='REVIEW_REQUIRED'&&$decision==='CLOSE_UNKNOWN')||
           ($r['status']==='NEEDS_REVIEW'&&$decision!=='CLOSE_UNKNOWN')||
           !in_array($r['status'],['REVIEW_REQUIRED','NEEDS_REVIEW'],true))
            throw new DomainException('job_review_state_conflict');
        $status=match($decision){
            'ACKNOWLEDGE'=>'REVIEWED',
            'REJECT'=>'REJECTED',
            default=>'CLOSED_UNKNOWN'
        };
        $q=$pdo->prepare('UPDATE jrei_hybrid_jobs
            SET status=?,revision=revision+1
            WHERE job_id=? AND revision=?');
        $q->execute([$status,$job,$revision]);
        if($q->rowCount()!==1)throw new DomainException('job_version_conflict');
        operationsAudit($pdo,$actor,'jrei_job_owner_'.$status,$job);
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    return ['ok'=>true,'jobId'=>$job,'status'=>$status,
        'published'=>false,'independentlyValidated'=>false];
}
