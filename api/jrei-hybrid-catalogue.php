<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Public reviewed-holdout metadata ONLY. The authoritative catalogue lives
 * in the existing mother DB after an additive owner-authorized migration.
 * Before that migration, the legacy PRIVATE config catalogue remains usable;
 * no unapproved dataset, remote file path or learner content is accepted.
 */
function jrHybridCatalogueReady(PDO $pdo): bool {
    try{
        $pdo->query('SELECT dataset_id FROM jrei_hybrid_public_datasets LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}
function jrHybridOffersReady(PDO $pdo): bool {
    try{
        $pdo->query('SELECT node_id FROM jrei_hybrid_node_offers LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}
/** Returns only an explicitly APPROVED record of this EXACT version. */
function jrHybridApprovedCorpus(PDO $pdo,array $cfg,string $id,
    string $version): ?array {
    if(jrHybridCatalogueReady($pdo)){
        $q=$pdo->prepare("SELECT dataset_sha256,evidence_sha256,
            active_policy_sha256,evaluation_version,reviewed_case_count
            FROM jrei_hybrid_public_datasets WHERE dataset_id=?
            AND evaluation_version=? AND status='APPROVED'");
        $q->execute([$id,$version]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||(int)$row['reviewed_case_count']<200)
            return null;
        return [
            'sourceReviewed'=>true,
            'datasetSha256'=>$row['dataset_sha256'],
            'evidenceSha256'=>$row['evidence_sha256'],
            'activePolicySha256'=>$row['active_policy_sha256'],
            'evaluationVersion'=>$row['evaluation_version']
        ];
    }
    // Legacy private catalogue: keep the old owner-owned path available,
    // but never treat an arbitrary evaluation version as approved.
    $catalogue=$cfg['jrei_hybrid_approved_datasets']??[];
    $row=is_array($catalogue)?($catalogue[$id]??null):null;
    if(!is_array($row)||($row['sourceReviewed']??false)!==true||
       ($row['evaluationVersion']??null)!==$version)return null;
    return $row;
}

/**
 * Recheck each digest/version at the INNODB lease decision and lock that
 * approval row. An admin suspension cannot race into a newly leased job.
 * Caller must already be inside the queue transaction.
 */
function jrHybridLockApprovedCorpus(PDO $pdo,array $cfg,array $offer): bool {
    if(jrHybridCatalogueReady($pdo)){
        $q=$pdo->prepare('SELECT status,dataset_sha256,evidence_sha256
            FROM jrei_hybrid_public_datasets
            WHERE dataset_id=? AND evaluation_version=? FOR UPDATE');
        $q->execute([$offer['id'],$offer['evaluationVersion']]);
        $r=$q->fetch(PDO::FETCH_ASSOC);
        return is_array($r)&&$r['status']==='APPROVED'&&
            hash_equals((string)$r['dataset_sha256'],$offer['datasetSha256'])&&
            hash_equals((string)$r['evidence_sha256'],$offer['evidenceSha256']);
    }
    $legacy=jrHybridApprovedCorpus($pdo,$cfg,
        $offer['id'],$offer['evaluationVersion']);
    return is_array($legacy)&&
        hash_equals((string)$legacy['datasetSha256'],$offer['datasetSha256'])&&
        hash_equals((string)$legacy['evidenceSha256'],$offer['evidenceSha256']);
}

/**
 * Record ONLY short-lived digest advertisements from the authenticated node.
 * These are claims from a signed worker, not proof that its local file exists.
 * Failure to install the optional table must not break existing heartbeats.
 */
function jrHybridRecordOffers(PDO $pdo,string $node,array $offers,int $at): void {
    if(!jrHybridOffersReady($pdo))return;
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('DELETE FROM jrei_hybrid_node_offers WHERE node_id=?');
        $q->execute([$node]);
        if($offers){
            $q=$pdo->prepare('INSERT INTO jrei_hybrid_node_offers
                (node_id,dataset_id,dataset_sha256,evidence_sha256,
                evaluation_version,last_advertised_at) VALUES (?,?,?,?,?,?)');
            foreach($offers as $d)$q->execute([
                $node,$d['id'],$d['datasetSha256'],$d['evidenceSha256'],
                $d['evaluationVersion'],$at
            ]);
        }
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
