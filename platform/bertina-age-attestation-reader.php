<?php
declare(strict_types=1);

/**
 * INTERNAL RESEARCH READER. No HTTP route, no live schema migration, no writes.
 * Output is only the existing free-stage policy's verified classification DTO.
 * This function can NEVER create or approve an attestation.
 *
 * Caller must have authenticated account, selected authorised subject and
 * established a consistent transaction BEFORE invoking this function.
 * A primary-key subject mutex is acquired to order with future trusted
 * attestation writers and existing private guardian reads.
 *
 * Required candidate schema:
 * database/unified/006a_age_attestation_PROPOSAL_NOT_APPLIED.sql
 */
require_once dirname(__DIR__).'/api/golden-talent-consent.php';

function bertinaVerifiedAgeAttestation(
    PDO $pdo, string $subjectId, string $jurisdiction, int|float $now
): ?array {
    if (!$pdo->inTransaction() ||
        !preg_match('/^[a-f0-9-]{36}$/Di',$subjectId) ||
        !preg_match('/^[A-Z]{2}$/D',$jurisdiction) ||
        !is_finite((float)$now) || $now<=0) return null;
    try {
        $lock=$pdo->prepare('SELECT id FROM eco_subjects WHERE id=? FOR UPDATE');
        if(!$lock->execute([$subjectId]) || !$lock->fetch(PDO::FETCH_ASSOC))return null;
        $q=$pdo->prepare(
            'SELECT id,subject_id,classification,jurisdiction_code,policy_version,
                    source_code,review_status,verified_by_account_id,
                    reviewed_by_account_id,evidence_sha256,
                    verified_at,expires_at,revoked_at
             FROM eco_subject_age_attestations WHERE subject_id=?
             ORDER BY verified_at DESC,id DESC LIMIT 1025 FOR UPDATE');
        if(!$q->execute([$subjectId]))return null;
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        if(!is_array($rows)||count($rows)===0||count($rows)>1024)return null;
        $events=[];$ids=[];
        foreach($rows as $r){
            if(!is_array($r) ||
               !preg_match('/^[a-f0-9-]{36}$/Di',(string)($r['id']??'')) ||
               isset($ids[$r['id']]) ||
               ($r['subject_id']??null)!==$subjectId ||
               !in_array($r['classification']??null,['ADULT','MINOR'],true) ||
               ($r['jurisdiction_code']??null)!==$jurisdiction ||
               ($r['policy_version']??null)!=='AGE_ATTESTATION_V1' ||
               ($r['source_code']??null)!=='INDEPENDENT_REVIEW' ||
               !in_array($r['review_status']??null,['APPROVED','REJECTED','PENDING'],true))
                return null;
            $ids[$r['id']]=true;
            $verified=bertinaSqlUtcSeconds($r['verified_at']??null);
            $expires=bertinaSqlUtcSeconds($r['expires_at']??null);
            if($verified===null||$expires===null||$expires<=$verified||
               $verified>$now)return null;
            // Bad or pending newer reviews cannot silently revert to an older
            // approval: newest event must itself be an approved, valid review.
            $events[]=['time'=>$verified,'type'=>'REVIEW','row'=>$r];
            if(($r['revoked_at']??null)!==null){
                $revoked=bertinaSqlUtcSeconds($r['revoked_at']);
                if($revoked===null||$revoked<$verified||$revoked>$now)return null;
                $events[]=['time'=>$revoked,'type'=>'REVOKED','row'=>null];
            }
        }
        usort($events,static fn(array $a,array $b):int=>$b['time']<=>$a['time']);
        if(count($events)>1 && $events[0]['time']===$events[1]['time'])
            return null;
        if($events[0]['type']!=='REVIEW')return null;
        $latest=$events[0]['row'];
        if(($latest['review_status']??null)!=='APPROVED')return null;
        $verifiedBy=$latest['verified_by_account_id']??null;
        $reviewedBy=$latest['reviewed_by_account_id']??null;
        if(!is_string($verifiedBy)||$verifiedBy==='' ||
           !is_string($reviewedBy)||$reviewedBy==='' ||
           $verifiedBy===$reviewedBy ||
           !is_string($latest['evidence_sha256']??null) ||
           !preg_match('/^[a-f0-9]{64}$/D',$latest['evidence_sha256']) ||
           bertinaSqlUtcSeconds($latest['expires_at'])<=$now)
            return null;
        return [
            'state'=>'VERIFIED',
            'classification'=>$latest['classification'],
            'source'=>'INDEPENDENT_VERIFIED_RECORD',
            'reference'=>$latest['id']
        ];
    }catch(Throwable $e){
        // Missing uninstalled candidate schema, permission errors, isolation
        // problems and malformed records all deny access without details.
        return null;
    }
}
