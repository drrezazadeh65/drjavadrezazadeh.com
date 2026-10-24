<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ka-scheduler.php';
require_once __DIR__.'/jrei-ka-private-https.php';
require_once __DIR__.'/jrei-ka-safe-discovery.php';

/**
 * Optional PRIVATE scheduled JREI-KA acquisition worker.
 *
 * One independently owner-approved source and one record-locked job per
 * invocation, never an unrestricted search, arbitrary shell command, user
 * URL, unlicensed reproduction, exam publication or AI model action.
 *
 * Production is OFF until owner-permitted final QA, additive MariaDB
 * migrations, real licensed source policy, private storage and Cron review.
 */
function jrKaAcquisitionReady(PDO $pdo,array $cfg): bool {
    if(($cfg['jrei_ka_schedule_enabled']??false)!==true||
       ($cfg['jrei_ka_autofetch_enabled']??false)!==true||
       ($cfg['jrei_ka_night_mode_enabled']??false)!==true||
       !jrJreiIranNightAllowsRequest(time())||
       !jrKaSchemaReady($pdo)||!function_exists('curl_init'))
        return false;
    try{
        foreach([
          'SELECT observation_id,job_id,private_object_key,state FROM jrei_ka_private_observations LIMIT 0',
          'SELECT reservation_day,source_id,reserved_requests,reserved_bytes FROM jrei_ka_daily_transfer_reservations LIMIT 0',
          'SELECT candidate_id,seed_source_id,state FROM jrei_ka_discovery_candidates LIMIT 0'
        ] as $sql)$pdo->query($sql);
        return jrKaPrivateArchiveRoot($cfg)!==null;
    }catch(Throwable $e){return false;}
}
function jrKaPrivateArchiveRoot(array $cfg): ?string {
    $value=$cfg['jrei_ka_private_archive_dir']??null;
    if(!is_string($value)||$value===''||!str_starts_with($value,'/')||
       strlen($value)>600)return null;
    $dir=realpath($value);
    if($dir===false||!is_dir($dir)||is_link($value)||
       !is_writable($dir))return null;
    $web=realpath(dirname(__DIR__));
    if($web!==false&&($dir===$web||
       str_starts_with($dir,$web.DIRECTORY_SEPARATOR)))return null;
    if($dir==='/'||$dir===realpath('/tmp')||
       str_starts_with($dir,'/tmp/'))return null;
    return $dir;
}
function jrKaClaimOneLicensedJob(PDO $pdo,array $cfg): ?array {
    $at=time();$day=jrJreiIranNightDate($at);
    $q=$pdo->prepare("SELECT job_id,source_id FROM jrei_ka_jobs
       WHERE job_state IN ('QUEUED','RETRY_WAIT')
         AND attempt_count<3 AND next_attempt_at<=?
       ORDER BY priority_tier ASC,next_attempt_at ASC,job_id ASC
       LIMIT 6");
    $q->execute([$at]);$candidates=$q->fetchAll(PDO::FETCH_ASSOC);
    foreach($candidates as $candidate){
        $pdo->beginTransaction();
        try{
            // Owner controls first, then original source, then KA policy,
            // then job. Same order as the scheduler/owner revocation flow.
            $c=$pdo->query("SELECT scheduling_enabled,acquisition_enabled,
              max_daily_download_bytes,max_storage_bytes
              FROM jrei_ka_controls WHERE singleton_id=1 FOR UPDATE")
              ->fetch(PDO::FETCH_ASSOC);
            if(!is_array($c)||(int)$c['scheduling_enabled']!==1||
               (int)$c['acquisition_enabled']!==1){
                $pdo->commit();return null;
            }
            $q=$pdo->prepare("SELECT source_id,source_locator_uri,
              source_title,review_state,rights_state,is_revoked,
              is_superseded,verified_at,reviewer_account_id
              FROM jrei_exam_sources WHERE source_id=? FOR UPDATE");
            $q->execute([$candidate['source_id']]);$source=$q->fetch(PDO::FETCH_ASSOC);
            $q=$pdo->prepare("SELECT source_id,scheduling_state,revision,
              max_document_bytes,min_request_spacing_seconds,
              rights_reviewed,robots_terms_reviewed,transport_reviewed,
              rights_evidence_sha256,robots_terms_evidence_sha256,
              transport_evidence_sha256,approved_by_account_id,
              last_observed_at,last_network_request_reserved_at
              FROM jrei_ka_source_policies WHERE source_id=? FOR UPDATE");
            $q->execute([$candidate['source_id']]);$policy=$q->fetch(PDO::FETCH_ASSOC);
            $q=$pdo->prepare("SELECT job_id,source_id,source_policy_revision,
              job_state,attempt_count,next_attempt_at
              FROM jrei_ka_jobs WHERE job_id=? FOR UPDATE");
            $q->execute([$candidate['job_id']]);$job=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($source)||!is_array($policy)||!is_array($job)||
               !in_array($job['job_state'],['QUEUED','RETRY_WAIT'],true)||
               (int)$job['next_attempt_at']>$at||
               (int)$job['attempt_count']>=3||
               (int)$job['source_policy_revision']!==(int)$policy['revision']||
               $job['source_id']!==$source['source_id']||
               $policy['scheduling_state']!=='APPROVED'||
               $policy['approved_by_account_id']===null||
               (int)$policy['rights_reviewed']!==1||
               (int)$policy['robots_terms_reviewed']!==1||
               (int)$policy['transport_reviewed']!==1||
               $source['review_state']!=='AUTHORITATIVE_REVIEWED'||
               $source['reviewer_account_id']===null||
               $source['verified_at']===null||
               (int)$source['is_revoked']!==0||
               (int)$source['is_superseded']!==0||
               !in_array($source['rights_state'],
                 ['PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION'],true)){
                $pdo->commit();continue;
            }
            foreach(['rights_evidence_sha256','robots_terms_evidence_sha256',
                 'transport_evidence_sha256'] as $key)
                if(!preg_match('/^[a-f0-9]{64}$/D',(string)$policy[$key]))
                    throw new DomainException('ka_source_review_evidence_missing');
            $url=(string)$source['source_locator_uri'];
            jrKaApprovedHttpsUrl($url);
            $max=min(8388608,(int)$policy['max_document_bytes']);
            $spacing=(int)$policy['min_request_spacing_seconds'];
            if($max<1024||$spacing<30||$spacing>86400)
                throw new DomainException('ka_source_limits_not_approved');
            $root=jrKaPrivateArchiveRoot($cfg);
            if($root===null||disk_free_space($root)<$max+10485760)
                throw new DomainException('ka_private_storage_insufficient');
            $reserveBytes=$max+131072; // bounded robots.txt + one document
            $lastNetwork=(int)($policy['last_network_request_reserved_at']??0);
            if($lastNetwork>0&&$lastNetwork+$spacing>$at){
                $pdo->commit();continue;
            }
            $cap=jrJreiIranNightTransferCap((int)$c['max_daily_download_bytes']);
            $storageCap=(int)$c['max_storage_bytes'];
            if($cap<$reserveBytes||$storageCap<$max)
                throw new DomainException('ka_owner_quota_too_small');
            $q=$pdo->prepare("SELECT COALESCE(SUM(reserved_bytes),0)
                FROM jrei_ka_daily_transfer_reservations
                WHERE reservation_day=?");
            $q->execute([$day]);$total=(int)$q->fetchColumn();
            if($total>$cap-$reserveBytes){$pdo->commit();return null;}
            $q=$pdo->query("SELECT COALESCE(SUM(bytes_total),0)
                FROM jrei_ka_private_observations");
            if((int)$q->fetchColumn()>$storageCap-$max){
                $pdo->commit();return null;
            }
            $q=$pdo->prepare("INSERT IGNORE INTO
               jrei_ka_daily_transfer_reservations
              (reservation_day,source_id,updated_at) VALUES (?,?,0)");
            $q->execute([$day,$source['source_id']]);
            $q=$pdo->prepare("SELECT reserved_requests,reserved_bytes,
              updated_at FROM jrei_ka_daily_transfer_reservations
              WHERE reservation_day=? AND source_id=? FOR UPDATE");
            $q->execute([$day,$source['source_id']]);
            $prior=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($prior)||(int)$prior['updated_at']+$spacing>$at){
                $pdo->commit();continue;
            }
            $lease=jrKaUuid();
            $q=$pdo->prepare("UPDATE jrei_ka_jobs SET
                job_state='LEASED',lease_id=?,lease_expires_at=?,
                attempt_count=attempt_count+1,updated_at=?,
                revision=revision+1 WHERE job_id=? AND
                job_state IN ('QUEUED','RETRY_WAIT')");
            $q->execute([$lease,$at+120,$at,$job['job_id']]);
            if($q->rowCount()!==1)
                throw new DomainException('ka_lease_race');
            $q=$pdo->prepare("UPDATE jrei_ka_daily_transfer_reservations
               SET reserved_requests=reserved_requests+1,
                 reserved_bytes=reserved_bytes+?,updated_at=?
               WHERE reservation_day=? AND source_id=?");
            $q->execute([$reserveBytes,$at,$day,$source['source_id']]);
            $q=$pdo->prepare("UPDATE jrei_ka_source_policies
                SET last_network_request_reserved_at=?,updated_at=?
                WHERE source_id=? AND revision=?
                  AND scheduling_state='APPROVED'");
            $q->execute([$at,$at,$source['source_id'],$policy['revision']]);
            if($q->rowCount()!==1)
                throw new DomainException('ka_global_network_cooldown_conflict');
            $pdo->commit();
            return ['jobId'=>$job['job_id'],'leaseId'=>$lease,
               'sourceId'=>$source['source_id'],
               'policyRevision'=>(int)$policy['revision'],
               'url'=>$url,'rightsState'=>$source['rights_state'],
               'limitBytes'=>$max,'spacingSeconds'=>$spacing,
               'archiveRoot'=>$root];
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }
    return null;
}

/**
 * Expired leases have UNKNOWN effects. Do not automatically repeat a
 * possibly completed download: preserve the reserved quota and the job
 * for a reviewer to reconcile against private content-addressed files.
 */
function jrKaQuarantineUnknownExpiredLeases(PDO $pdo,int $at): int {
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare("SELECT job_id FROM jrei_ka_jobs
          WHERE job_state='LEASED' AND lease_expires_at IS NOT NULL
            AND lease_expires_at<? ORDER BY lease_expires_at,job_id
          LIMIT 20 FOR UPDATE");
        $q->execute([$at]);
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $update=$pdo->prepare("UPDATE jrei_ka_jobs
          SET job_state='UNKNOWN_REVIEW_REQUIRED',
              last_failure_code='LEASE_EXPIRED_RESULT_UNKNOWN',
              lease_id=NULL,lease_expires_at=NULL,
              updated_at=?,revision=revision+1
          WHERE job_id=? AND job_state='LEASED'
            AND lease_expires_at<?");
        $count=0;
        foreach($rows as $r){
            $update->execute([$at,$r['job_id'],$at]);
            $count+=$update->rowCount();
        }
        $pdo->commit();return $count;
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

function jrKaPrivateAcquireOne(PDO $pdo,array $cfg): array {
    $result=['schema'=>'jr.jrei.ka-acquisition.v1',
       'status'=>'OFF','sourceReviewedAutomatically'=>false,
       'examContentPublished'=>false,'modelTrained'=>false,
       'jobsClaimed'=>0,'documentsAwaitingScienceReview'=>0,
       'expiredUnknownLeasesQuarantined'=>0];
    if(!jrKaAcquisitionReady($pdo,$cfg))return $result;
    $reconciled=jrKaQuarantineUnknownExpiredLeases($pdo,time());
    $job=jrKaClaimOneLicensedJob($pdo,$cfg);
    $result['expiredUnknownLeasesQuarantined']=$reconciled;
    if($job===null)return [...$result,'status'=>'NO_AUTHORIZED_DUE_JOB'];
    $result['jobsClaimed']=1;
    $obtained=null;$fileCreated=false;$filePath=null;
    try{
        [$host,$path]=jrKaApprovedHttpsUrl($job['url']);
        $robots=jrKaPinnedGet('https://'.$host.'/robots.txt',
            131072,['text/plain']);
        $decision=jrKaRobotsDecision($robots['bytes'],$path);
        if(!$decision['allowed'])
            throw new DomainException('ka_robots_disallows_source');
        // Do not sleep for arbitrary remote crawl delays within a
        // 120-second lease. Reschedule instead for external policy review.
        // A robots crawl-delay for the document also constrains the
        // immediately preceding robots fetch. Two-phase scheduling is
        // required to honour it; never issue two immediate requests.
        if($decision['delaySeconds']>0)
            throw new DomainException('ka_robots_delay_exceeds_approved_budget');
        // The queue or robots response must not carry a new HTTP fetch past
        // the owner-approved Iran-local 05:00 boundary.
        if(!jrJreiIranNightAllowsRequest(time()))
            throw new DomainException('ka_night_window_closing');
        $obtained=jrKaPinnedGet($job['url'],$job['limitBytes']);
        $sha=hash('sha256',$obtained['bytes']);
        $mime=$obtained['mime'];$size=$obtained['byteCount'];
        // Use a content-addressed private archive. Do not write into
        // public_html or any browser-accessible upload directory.
        $key=$sha.'.bin';
        $filePath=$job['archiveRoot'].DIRECTORY_SEPARATOR.$key;
        if(file_exists($filePath)){
            if(!is_file($filePath)||is_link($filePath)||
               filesize($filePath)!==$size||
               !hash_equals($sha,hash_file('sha256',$filePath)))
                throw new DomainException('ka_content_address_conflict');
        }else{
            $tmp=$job['archiveRoot'].DIRECTORY_SEPARATOR.'.jrei-'.
                bin2hex(random_bytes(12)).'.tmp';
            $handle=fopen($tmp,'x+b');
            if($handle===false)throw new DomainException('ka_private_write_failed');
            try{
                if(!chmod($tmp,0600))
                    throw new DomainException('ka_private_permissions_rejected');
                $offset=0;
                while($offset<$size){
                    $n=fwrite($handle,substr($obtained['bytes'],$offset,262144));
                    if(!is_int($n)||$n<=0)
                        throw new DomainException('ka_private_write_incomplete');
                    $offset+=$n;
                }
                if(!fflush($handle))
                    throw new DomainException('ka_private_flush_failed');
            }catch(Throwable $writeError){
                fclose($handle);
                @unlink($tmp);
                throw $writeError;
            }
            fclose($handle);
            // POSIX hard link creates the content address WITHOUT ever
            // replacing an existing digest object written by another job.
            if(link($tmp,$filePath)){
                $fileCreated=true;
                @unlink($tmp);
            }elseif(file_exists($filePath)){
                @unlink($tmp);
                if(!is_file($filePath)||is_link($filePath)||
                   filesize($filePath)!==$size||
                   !hash_equals($sha,(string)hash_file('sha256',$filePath)))
                    throw new DomainException('ka_concurrent_object_conflict');
            }else{
                @unlink($tmp);
                throw new DomainException('ka_atomic_private_archive_failed');
            }
        }
        // Keep retrieved HTML only in bounded process memory until the
        // reviewed observation and discovery proposals commit together.
        $publicHtml=$mime==='text/html'&&$size<=2097152?
           $obtained['bytes']:null;
        $obtained['bytes']='';
        $pdo->beginTransaction();
        try{
            $controls=$pdo->query("SELECT scheduling_enabled,acquisition_enabled
               FROM jrei_ka_controls WHERE singleton_id=1 FOR UPDATE")
               ->fetch(PDO::FETCH_ASSOC);
            $q=$pdo->prepare("SELECT review_state,rights_state,is_revoked,
               is_superseded FROM jrei_exam_sources WHERE source_id=? FOR UPDATE");
            $q->execute([$job['sourceId']]);$src=$q->fetch(PDO::FETCH_ASSOC);
            $q=$pdo->prepare("SELECT scheduling_state,revision FROM
               jrei_ka_source_policies WHERE source_id=? FOR UPDATE");
            $q->execute([$job['sourceId']]);$policy=$q->fetch(PDO::FETCH_ASSOC);
            $q=$pdo->prepare("SELECT job_state,lease_id FROM jrei_ka_jobs
               WHERE job_id=? FOR UPDATE");
            $q->execute([$job['jobId']]);$lease=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($controls)||!is_array($src)||!is_array($policy)||
               !is_array($lease)||(int)$controls['scheduling_enabled']!==1||
               (int)$controls['acquisition_enabled']!==1||
               $src['review_state']!=='AUTHORITATIVE_REVIEWED'||
               (int)$src['is_revoked']!==0||(int)$src['is_superseded']!==0||
               $src['rights_state']!==$job['rightsState']||
               $policy['scheduling_state']!=='APPROVED'||
               (int)$policy['revision']!==$job['policyRevision']||
               $lease['job_state']!=='LEASED'||
               !hash_equals($job['leaseId'],(string)$lease['lease_id']))
                throw new DomainException('ka_authority_revoked_during_fetch');
            $at=time();$observation=jrKaUuid();
            $q=$pdo->prepare("INSERT INTO jrei_ka_private_observations
              (observation_id,job_id,source_id,source_policy_revision,
               observed_at,content_sha256,private_object_key,mime_type,
               bytes_total,state,rights_state_at_acquisition,
               source_uri_sha256)
              VALUES (?,?,?,?,?,?,?,?,?,
                 'PENDING_SCIENTIFIC_REVIEW',?,?)");
            $q->execute([$observation,$job['jobId'],$job['sourceId'],
              $job['policyRevision'],$at,$sha,$key,$mime,$size,
              $job['rightsState'],hash('sha256',$job['url'])]);
            $newDiscovered=0;
            if($publicHtml!==null)
                $newDiscovered=jrKaStageHtmlDiscovery($pdo,$job['sourceId'],
                    $observation,$job['url'],$publicHtml,$at);
            $publicHtml=null;
            $q=$pdo->prepare("UPDATE jrei_ka_jobs SET job_state='ACQUIRED_REVIEW',
                observed_digest=?,bytes_observed=?,lease_id=NULL,
                lease_expires_at=NULL,updated_at=?,revision=revision+1
                WHERE job_id=? AND lease_id=? AND job_state='LEASED'");
            $q->execute([$sha,$size,$at,$job['jobId'],$job['leaseId']]);
            if($q->rowCount()!==1)
                throw new DomainException('ka_completed_lease_conflict');
            $q=$pdo->prepare("UPDATE jrei_ka_source_policies SET
                last_observed_at=?,updated_at=?
                WHERE source_id=? AND revision=?");
            $q->execute([$at,$at,$job['sourceId'],$job['policyRevision']]);
            $pdo->commit();
            return [...$result,'status'=>'SOURCE_ACQUIRED_PENDING_REVIEW',
                'documentsAwaitingScienceReview'=>1,
                'newDocumentLinksAwaitingRightsReview'=>$newDiscovered,
                'downloadedBytes'=>$size,
                'contentSha256'=>$sha,'sourceId'=>$job['sourceId']];
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }catch(Throwable $e){
        if($obtained!==null&&isset($obtained['bytes']))
            $obtained['bytes']='';
        // A concurrent owner suspension may revoke the lease. Do not
        // resurrect it, automatically accept a document or change refunds.
        $code=preg_match('/^[a-z0-9_]{3,60}$/i',$e->getMessage())?
           strtoupper($e->getMessage()):'KA_ACQUISITION_UNCLASSIFIED';
        try{
            $pdo->beginTransaction();
            $q=$pdo->prepare("SELECT job_state,lease_id,attempt_count
               FROM jrei_ka_jobs WHERE job_id=? FOR UPDATE");
            $q->execute([$job['jobId']]);$current=$q->fetch(PDO::FETCH_ASSOC);
            if(is_array($current)&&$current['job_state']==='LEASED'&&
               $current['lease_id']===$job['leaseId']){
                $attempt=(int)$current['attempt_count'];
                $q=$pdo->prepare("UPDATE jrei_ka_jobs SET job_state=?,
                   next_attempt_at=?,last_failure_code=?,
                   lease_id=NULL,lease_expires_at=NULL,
                   updated_at=?,revision=revision+1 WHERE job_id=?
                   AND lease_id=? AND job_state='LEASED'");
                $q->execute([$attempt>=3?'REQUIRES_REVIEW':'RETRY_WAIT',
                   time()+min(86400,300*(2**max(0,$attempt-1))),
                   $code,time(),$job['jobId'],$job['leaseId']]);
            }
            $pdo->commit();
        }catch(Throwable $ignored){
            if($pdo->inTransaction())$pdo->rollBack();
        }
        return [...$result,'status'=>'ACQUISITION_BLOCKED_OR_REVIEW_REQUIRED',
            'failureCode'=>$code,'noDataAutoPublished'=>true];
    }
}
