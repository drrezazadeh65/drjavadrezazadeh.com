<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * JREI-KA scheduling: durable, bounded, repeatable source-authorization gate.
 * NO HTTP fetch, document parsing, student records, external task execution,
 * automatic source approval, mail or model invocation occurs in this module.
 */
require_once __DIR__.'/jrei-nightly-window.php';

function jrKaSchemaReady(PDO $pdo): bool {
    try{
        foreach([
          'SELECT singleton_id,scheduling_enabled,policy_revision FROM jrei_ka_controls LIMIT 0',
          'SELECT source_id,scheduling_state,next_due_at,rights_evidence_sha256,robots_terms_evidence_sha256,transport_evidence_sha256 FROM jrei_ka_source_policies LIMIT 0',
          'SELECT job_id,job_state,next_attempt_at FROM jrei_ka_jobs LIMIT 0'
        ] as $sql)$pdo->query($sql);
        return true;
    }catch(Throwable $e){return false;}
}
function jrKaUuid(): string {
    $bytes=random_bytes(16);
    $bytes[6]=chr((ord($bytes[6])&0x0f)|0x40);
    $bytes[8]=chr((ord($bytes[8])&0x3f)|0x80);
    $hex=bin2hex($bytes);
    return substr($hex,0,8).'-'.substr($hex,8,4).'-'.
      substr($hex,12,4).'-'.substr($hex,16,4).'-'.substr($hex,20,12);
}
function jrKaScheduleApprovedSources(PDO $pdo,array $cfg,int $at): array {
    $summary=['schema'=>'jr.jrei.ka-scheduler.v1',
      'scheduled'=>0,'status'=>'OFF','sourceDataDownloaded'=>false,
      'workAutomaticallyDispatched'=>false,'ownerRightsBypassed'=>false];
    if(($cfg['jrei_ka_schedule_enabled']??false)!==true)
        return $summary;
    // The owner-authorized JREI acquisition mode is strictly night-only.
    // A missing/false opt-in never silently enables daytime collection.
    if(($cfg['jrei_ka_night_mode_enabled']??false)!==true)
        return [...$summary,'status'=>'IRAN_NIGHT_MODE_DISABLED'];
    if(!jrJreiIranNightOpen($at))
        return [...$summary,'status'=>'OUTSIDE_IRAN_NIGHT_WINDOW'];
    if(!jrKaSchemaReady($pdo))
        throw new DomainException('jrei_ka_migration_not_installed');
    $pdo->beginTransaction();
    try{
        $q=$pdo->query('SELECT scheduling_enabled,acquisition_enabled,
          max_new_tasks_per_cycle,max_queue_depth,max_daily_download_bytes,
          max_storage_bytes,policy_revision
          FROM jrei_ka_controls WHERE singleton_id=1 FOR UPDATE');
        $controls=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($controls)||
          (int)$controls['scheduling_enabled']!==1||
          (int)$controls['acquisition_enabled']!==1){
            $pdo->commit();return $summary;
        }
        $maxNew=min(10,max(0,(int)$controls['max_new_tasks_per_cycle']));
        $maxQueue=min(200,max(0,(int)$controls['max_queue_depth']));
        if($maxNew===0||$maxQueue===0)
            throw new DomainException('jrei_ka_queue_policy_invalid');
        $q=$pdo->query("SELECT COUNT(*) FROM jrei_ka_jobs
            WHERE job_state IN ('QUEUED','LEASED','RETRY_WAIT')");
        $active=(int)$q->fetchColumn();
        $available=min($maxNew,max(0,$maxQueue-$active));
        if($available===0){
            $pdo->commit();
            return $summary+['queueFull'=>true];
        }
        $q=$pdo->prepare("SELECT
             p.source_id,p.priority_tier,p.revision,p.next_due_at,
             p.refresh_interval_seconds,p.max_document_bytes
          FROM jrei_ka_source_policies p
          INNER JOIN jrei_exam_sources s ON s.source_id=p.source_id
          WHERE p.scheduling_state='APPROVED'
            AND p.rights_reviewed=1
            AND p.robots_terms_reviewed=1
            AND p.transport_reviewed=1
            AND p.approved_by_account_id IS NOT NULL
            AND p.next_due_at<=?
            AND p.refresh_interval_seconds BETWEEN 3600 AND 2592000
            AND p.max_document_bytes BETWEEN 1024 AND 8388608
            AND p.priority_tier IN ('P0','P1','P2','P3','P4')
            AND s.review_state='AUTHORITATIVE_REVIEWED'
            AND s.is_revoked=0 AND s.is_superseded=0
            AND s.reviewer_account_id IS NOT NULL
            AND s.verified_at IS NOT NULL
            AND s.source_locator_uri LIKE 'https://%'
            AND s.rights_state IN ('PERMITTED_PRIVATE_ANALYSIS',
              'PERMITTED_REPRODUCTION')
          ORDER BY p.priority_tier ASC,p.next_due_at ASC,p.source_id ASC
          LIMIT 10 FOR UPDATE");
        $q->execute([$at]);
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $new=$pdo->prepare("INSERT IGNORE INTO jrei_ka_jobs
          (job_id,source_id,due_slot,job_kind,priority_tier,
            source_policy_revision,job_state,next_attempt_at,
            created_at,updated_at)
          VALUES (?,?,?,'VERIFY_PUBLIC_SOURCE',?,?,'QUEUED',?,?,?)");
        $advance=$pdo->prepare('UPDATE jrei_ka_source_policies
          SET last_scheduled_at=?,next_due_at=?,updated_at=?
          WHERE source_id=? AND revision=?');
        foreach($rows as $row){
            if($summary['scheduled']>=$available)break;
            $source=(string)$row['source_id'];
            $due=(int)$row['next_due_at'];
            $revision=(int)$row['revision'];
            $interval=(int)$row['refresh_interval_seconds'];
            if($due<=0||$revision<1)continue;
            $new->execute([jrKaUuid(),$source,$due,
              (string)$row['priority_tier'],$revision,$at,$at,$at]);
            // Unique due-slot prevents duplicate dispatch even when a
            // scheduler retries after its previous transaction committed.
            if($new->rowCount()===1)$summary['scheduled']++;
            $advance->execute([$at,$at+$interval,$at,$source,$revision]);
        }
        $pdo->commit();
        $summary['status']='QUEUED_METADATA_ONLY';
        return $summary;
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function jrKaOwnerSnapshot(PDO $pdo,array $cfg): array {
    $ready=jrKaSchemaReady($pdo);
    $out=[
      'schema'=>'jr.jrei.ka-owner.v1',
      'schemaReady'=>$ready,
      'privateScheduleOptIn'=>($cfg['jrei_ka_schedule_enabled']??false)===true,
      // Policy visibility only; a scheduled source is NOT a proven live crawler.
      'iranNightAcquisitionPolicy'=>[
        'zone'=>'Asia/Tehran','start'=>'02:00','end'=>'05:00',
        'enabled'=>($cfg['jrei_ka_night_mode_enabled']??false)===true,
        'windowOpenNow'=>jrJreiIranNightOpen(time()),
        'requestStartAllowedNow'=>jrJreiIranNightAllowsRequest(time()),
        'transferCapBytes'=>300000000000,
        'iranDate'=>jrJreiIranNightDate(time())
      ],
      'privateAutoFetchOptIn'=>($cfg['jrei_ka_autofetch_enabled']??false)===true,
      'privateTextExtractionOptIn'=>($cfg['jrei_ka_text_extraction_enabled']??false)===true,
      'privatePassageProposalsOptIn'=>($cfg['jrei_ka_passage_proposals_enabled']??false)===true,
      'paperKeyProposals'=>function_exists('jrKaPaperKeySnapshot')?
          jrKaPaperKeySnapshot($pdo,$cfg):null,
      'publicQuoteOwnerReview'=>function_exists('jrKaOwnerPublicQuoteQueue')?
          jrKaOwnerPublicQuoteQueue($pdo,$cfg):null,
      'passageReviewObservability'=>[
        'schemaReady'=>false,'runs'=>null,
        'incompleteRuns'=>null,'proposedSpans'=>null,
        'unreviewedSpans'=>null,'independentlyApprovedPublicCitations'=>0,
        'publicCitationPublicationEnabled'=>false,
        'reviewedRagIndexEstablished'=>false
      ],
      'extractionObservability'=>[
        'schemaReady'=>false,'totalQueued'=>null,'activeClaimed'=>null,
        'textPendingReview'=>null,'ocrRequired'=>null,
        'structuredReviewRequired'=>null,'mathLayoutReviewRequired'=>null,
        'failedReviewRequired'=>null,
        'extractedPrivateBytes'=>null,'languages'=>null,
        'actualOcrQualityVerified'=>false,'scientificPublicationVerified'=>false
      ],
      'acquisitionObservability'=>[
        'schemaReady'=>false,'observationCount'=>null,
        'pendingScientificReview'=>null,'recordedBytes'=>null,
        'candidateCount'=>null,'candidatesPendingRightsReview'=>null,
        'bytesReservedToday'=>null,'sourceCandidatePreview'=>[],
        'actualContinuousAcquisitionValidated'=>false,
        'actualOcrValidated'=>false
      ],
      'controls'=>null,'jobStates'=>null,'approvedSources'=>null,
      'sourcePolicies'=>null,
      'nextDueAt'=>null,'realCrawlerVerified'=>false,
      'retrievedOfficialAnswerKeysVerified'=>false,
      'workerDispatchVerified'=>false,'storageConsumptionVerified'=>false
    ];
    if(!$ready)return $out;
    $q=$pdo->query('SELECT scheduling_enabled,acquisition_enabled,
      max_new_tasks_per_cycle,max_queue_depth,max_daily_download_bytes,
      max_storage_bytes,policy_revision FROM jrei_ka_controls WHERE singleton_id=1');
    $c=$q->fetch(PDO::FETCH_ASSOC);
    if(is_array($c))$out['controls']=[
      'schedulingEnabled'=>(int)$c['scheduling_enabled']===1,
      'acquisitionEnabled'=>(int)$c['acquisition_enabled']===1,
      'maxNewTasksPerCycle'=>(int)$c['max_new_tasks_per_cycle'],
      'maxQueueDepth'=>(int)$c['max_queue_depth'],
      'maxDailyBytes'=>(int)$c['max_daily_download_bytes'],
      'maxStorageBytes'=>(int)$c['max_storage_bytes'],
      'policyRevision'=>(int)$c['policy_revision']
    ];
    $q=$pdo->query("SELECT p.source_id,s.source_title,p.priority_tier,
        p.scheduling_state,p.refresh_interval_seconds,
        p.max_document_bytes,p.min_request_spacing_seconds,
        p.rights_reviewed,p.robots_terms_reviewed,p.transport_reviewed,
        p.rights_evidence_sha256,p.robots_terms_evidence_sha256,
        p.transport_evidence_sha256,p.revision,p.next_due_at
        FROM jrei_ka_source_policies p
        JOIN jrei_exam_sources s ON s.source_id=p.source_id
        ORDER BY p.next_due_at,p.source_id LIMIT 40");
    $out['sourcePolicies']=[];
    foreach($q as $policy)$out['sourcePolicies'][]=[
      'sourceId'=>$policy['source_id'],
      'sourceTitle'=>$policy['source_title'],
      'priorityTier'=>$policy['priority_tier'],
      'state'=>$policy['scheduling_state'],
      'refreshIntervalSeconds'=>(int)$policy['refresh_interval_seconds'],
      'maxDocumentBytes'=>(int)$policy['max_document_bytes'],
      'minRequestSpacingSeconds'=>(int)$policy['min_request_spacing_seconds'],
      'rightsReviewed'=>(int)$policy['rights_reviewed']===1,
      'robotsTermsReviewed'=>(int)$policy['robots_terms_reviewed']===1,
      'transportReviewed'=>(int)$policy['transport_reviewed']===1,
      'rightsEvidenceSha256'=>$policy['rights_evidence_sha256'],
      'robotsEvidenceSha256'=>$policy['robots_terms_evidence_sha256'],
      'transportEvidenceSha256'=>$policy['transport_evidence_sha256'],
      'revision'=>(int)$policy['revision'],
      'nextDueAt'=>(int)$policy['next_due_at']
    ];
    $q=$pdo->query("SELECT job_state,COUNT(*) AS n
      FROM jrei_ka_jobs GROUP BY job_state LIMIT 20");
    $out['jobStates']=[];
    foreach($q as $r)$out['jobStates'][]=[
      'state'=>(string)$r['job_state'],'count'=>(int)$r['n']
    ];
    $q=$pdo->query("SELECT COUNT(*) AS n,MIN(next_due_at) AS due
      FROM jrei_ka_source_policies WHERE scheduling_state='APPROVED'");
    $r=$q->fetch(PDO::FETCH_ASSOC);
    $out['approvedSources']=(int)($r['n']??0);
    $out['nextDueAt']=$r['due']===null?null:(int)$r['due'];
    try{
        foreach([
          'SELECT observation_id,state,bytes_total FROM jrei_ka_private_observations LIMIT 0',
          'SELECT candidate_id,state,candidate_url FROM jrei_ka_discovery_candidates LIMIT 0',
          'SELECT reservation_day,reserved_bytes FROM jrei_ka_daily_transfer_reservations LIMIT 0'
        ] as $sql)$pdo->query($sql);
        $summary=&$out['acquisitionObservability'];
        $summary['schemaReady']=true;
        $q=$pdo->query("SELECT COUNT(*) AS total,
            COALESCE(SUM(bytes_total),0) AS bytes,
            COALESCE(SUM(CASE WHEN state='PENDING_SCIENTIFIC_REVIEW' THEN 1 ELSE 0 END),0) AS pending
            FROM jrei_ka_private_observations");
        $r=$q->fetch(PDO::FETCH_ASSOC);
        $summary['observationCount']=(int)$r['total'];
        $summary['recordedBytes']=(int)$r['bytes'];
        $summary['pendingScientificReview']=(int)$r['pending'];
        $q=$pdo->query("SELECT COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN state='DISCOVERED_REQUIRES_RIGHTS_REVIEW'
            THEN 1 ELSE 0 END),0) AS pending
          FROM jrei_ka_discovery_candidates");
        $r=$q->fetch(PDO::FETCH_ASSOC);
        $summary['candidateCount']=(int)$r['total'];
        $summary['candidatesPendingRightsReview']=(int)$r['pending'];
        $q=$pdo->prepare("SELECT COALESCE(SUM(reserved_bytes),0)
           FROM jrei_ka_daily_transfer_reservations WHERE reservation_day=?");
        $q->execute([jrJreiIranNightDate(time())]);
        $summary['bytesReservedToday']=(int)$q->fetchColumn();
        $q=$pdo->query("SELECT candidate_id,candidate_url,candidate_label,
            seed_source_id,state,last_discovered_at
            FROM jrei_ka_discovery_candidates
            ORDER BY last_discovered_at DESC,candidate_id DESC LIMIT 20");
        foreach($q as $row)$summary['sourceCandidatePreview'][]=[
          'candidateId'=>$row['candidate_id'],
          'sourceId'=>$row['seed_source_id'],
          'url'=>$row['candidate_url'],
          'label'=>$row['candidate_label'],
          'state'=>$row['state'],
          'lastDiscoveredAt'=>(int)$row['last_discovered_at']
        ];
    }catch(Throwable $e){
        // Missing migration is UNKNOWN, never a zero-count success.
        $out['acquisitionObservability']['schemaReady']=false;
        $out['acquisitionObservability']['sourceCandidatePreview']=[];
    }
    try{
        $pdo->query('SELECT observation_id,processing_state,
          extracted_bytes,detected_language FROM jrei_ka_text_extraction_jobs LIMIT 0');
        $q=$pdo->query("SELECT processing_state,COUNT(*) AS n,
           COALESCE(SUM(extracted_bytes),0) AS total_bytes
           FROM jrei_ka_text_extraction_jobs
           GROUP BY processing_state LIMIT 25");
        $counts=[];
        $bytes=0;
        foreach($q as $row){
           $counts[(string)$row['processing_state']]=(int)$row['n'];
           $bytes+=(int)$row['total_bytes'];
        }
        $extract=&$out['extractionObservability'];
        $extract['schemaReady']=true;
        $extract['totalQueued']=$counts['QUEUED']??0;
        $extract['activeClaimed']=$counts['EXTRACTING']??0;
        $extract['textPendingReview']=$counts['TEXT_PENDING_SCIENTIFIC_REVIEW']??0;
        $extract['ocrRequired']=($counts['OCR_REQUIRED']??0)+
           ($counts['OCR_OR_MANUAL_REVIEW_REQUIRED']??0);
        $extract['structuredReviewRequired']=$counts['STRUCTURED_REVIEW_REQUIRED']??0;
        $extract['mathLayoutReviewRequired']=$counts['MATH_LAYOUT_REVIEW_REQUIRED']??0;
        $extract['failedReviewRequired']=($counts['EXTRACTION_FAILED_REVIEW']??0)+
           ($counts['UNKNOWN_EXTRACTION_REVIEW']??0);
        $extract['extractedPrivateBytes']=$bytes;
        $q=$pdo->query("SELECT detected_language,COUNT(*) AS n
          FROM jrei_ka_text_extraction_jobs
          WHERE processing_state='TEXT_PENDING_SCIENTIFIC_REVIEW'
          GROUP BY detected_language LIMIT 10");
        $extract['languages']=[];
        foreach($q as $r)$extract['languages'][]=[
           'languageHint'=>$r['detected_language'],
           'count'=>(int)$r['n']
        ];
    }catch(Throwable $e){
        $out['extractionObservability']['schemaReady']=false;
    }
    try{
        foreach([
           'SELECT observation_id,run_state,stored_passage_count FROM jrei_ka_private_passage_runs LIMIT 0',
           'SELECT passage_id,passage_state,review_rights_state FROM jrei_ka_private_passages LIMIT 0'
        ] as $sql)$pdo->query($sql);
        $p=&$out['passageReviewObservability'];
        $q=$pdo->query("SELECT COUNT(*) AS runs,
            COALESCE(SUM(CASE WHEN run_state='PARTIAL_UNREVIEWED'
              THEN 1 ELSE 0 END),0) AS incomplete
            FROM jrei_ka_private_passage_runs");
        $r=$q->fetch(PDO::FETCH_ASSOC);
        $p['runs']=(int)($r['runs']??0);
        $p['incompleteRuns']=(int)($r['incomplete']??0);
        $q=$pdo->query("SELECT COUNT(*) AS total,
             COALESCE(SUM(CASE WHEN passage_state='NEEDS_SCIENTIFIC_REVIEW'
             THEN 1 ELSE 0 END),0) AS unreviewed
             FROM jrei_ka_private_passages");
        $r=$q->fetch(PDO::FETCH_ASSOC);
        $p['proposedSpans']=(int)($r['total']??0);
        $p['unreviewedSpans']=(int)($r['unreviewed']??0);
        $p['schemaReady']=true;
    }catch(Throwable $e){
        $out['passageReviewObservability']['schemaReady']=false;
    }
    return $out;
}
