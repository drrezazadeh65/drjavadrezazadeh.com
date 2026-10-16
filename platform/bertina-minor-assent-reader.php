<?php
declare(strict_types=1);

/**
 * Nondeploying internal reference reader for the proposed eco_minor_assent_records.
 * This is NOT a child-assent collection or authorization endpoint and never
 * stores response content, DOB, documents or PII. No live table is assumed.
 *
 * Caller must have established legitimate actor/subject role and an active
 * transaction. A common subject FOR UPDATE lock serializes any future writer.
 * All future assent writers must follow exactly the same lock order.
 */
require_once dirname(__DIR__).'/api/golden-talent-consent.php';

function bertinaVerifiedMinorAssent(
    PDO $pdo,string $subjectId,string $guardianAccountId,int|float $now
): ?array {
    if(!$pdo->inTransaction() ||
       !is_string($subjectId) || trim($subjectId)==='' ||
       !is_string($guardianAccountId) || trim($guardianAccountId)==='' ||
       !is_finite((float)$now) || $now<=0)return null;
    try {
        $lock=$pdo->prepare('SELECT id FROM eco_subjects WHERE id=? FOR UPDATE');
        $lock->execute([$subjectId]);
        if(!$lock->fetch(PDO::FETCH_ASSOC))return null;
        $q=$pdo->prepare(
          'SELECT id,subject_id,guardian_account_id,notice_version,notice_sha256,
                  decision,verification_status,source_code,reviewer_account_id,
                  assented_at,expires_at,withdrawn_at
           FROM eco_minor_assent_records
           WHERE subject_id=? AND guardian_account_id=?
           ORDER BY assented_at DESC,id DESC LIMIT 1025 FOR UPDATE');
        $q->execute([$subjectId,$guardianAccountId]);
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        if(!is_array($rows)||count($rows)<1||count($rows)>1024)return null;
        $events=[];$ids=[];
        foreach($rows as $row){
            if(!is_array($row) || !is_string($row['id']??null) ||
               trim($row['id'])==='' || isset($ids[$row['id']]) ||
               ($row['subject_id']??null)!==$subjectId ||
               ($row['guardian_account_id']??null)!==$guardianAccountId ||
               ($row['source_code']??null)!=='REVIEWED_ASSENT' ||
               !in_array($row['verification_status']??null,
                         ['VERIFIED','PENDING','REJECTED'],true) ||
               !in_array($row['decision']??null,
                         ['ASSENTED','DECLINED','WITHDRAWN'],true))
                return null;
            $ids[$row['id']]=true;
            $eventTime=bertinaSqlUtcSeconds($row['assented_at']??null);
            $expires=bertinaSqlUtcSeconds($row['expires_at']??null);
            if($eventTime===null || $expires===null ||
               $eventTime>$now || $expires<=$eventTime)return null;
            $events[]=['time'=>$eventTime,'action'=>$row['decision'],'record'=>$row];
            if(($row['withdrawn_at']??null)!==null){
                $withdrawal=bertinaSqlUtcSeconds($row['withdrawn_at']);
                if($withdrawal===null||$withdrawal<$eventTime||$withdrawal>$now)
                    return null;
                if($row['decision']==='ASSENTED'){
                    $events[]=['time'=>$withdrawal,'action'=>'WITHDRAWN','record'=>null];
                }elseif($row['decision']!=='WITHDRAWN' || $withdrawal!==$eventTime){
                    return null;
                }
            }
        }
        usort($events,static fn(array $a,array $b):int=>$b['time']<=>$a['time']);
        if(count($events)>1 && $events[0]['time']===$events[1]['time'])
            return null;
        $latest=$events[0];
        if($latest['action']!=='ASSENTED')return null;
        $r=$latest['record'];
        if(($r['verification_status']??null)!=='VERIFIED' ||
           !is_string($r['reviewer_account_id']??null) ||
           trim($r['reviewer_account_id'])==='' ||
           !is_string($r['notice_version']??null) ||
           trim($r['notice_version'])==='' ||
           !is_string($r['notice_sha256']??null) ||
           !preg_match('/^[a-f0-9]{64}$/D',$r['notice_sha256']) ||
           bertinaSqlUtcSeconds($r['expires_at'])<=$now)
            return null;
        return [
            'record_source'=>'TRUSTED_ASSENT_RECORD',
            'state'=>'VERIFIED','decision'=>'ASSENTED',
            'subject_id'=>$subjectId,
            'guardian_account_id'=>$guardianAccountId,
            'reference'=>$r['id'],
            'notice_version'=>$r['notice_version'],
            'notice_sha256'=>$r['notice_sha256'],
            'assented_at'=>$r['assented_at'],
            'expires_at'=>$r['expires_at'],
            'withdrawn_at'=>null
        ];
    }catch(Throwable $e){
        // Missing/unapproved candidate schema, invalid records and loss of
        // authority must never become an implicit affirmative assent.
        return null;
    }
}
