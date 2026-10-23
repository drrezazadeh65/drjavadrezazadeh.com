<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/** Controls for the existing MFA SUPER_ADMIN route; no independent login. */
function jrKaOwnerControlChange(PDO $pdo,array $cfg,string $actor,array $body): array {
    if(!jrKaSchemaReady($pdo))
        throw new DomainException('jrei_ka_migration_not_installed');
    $action=$body['action']??null;
    $now=time();
    if($action==='ka_set_controls'){
        $rev=$body['policyRevision']??null;
        $scheduling=$body['schedulingEnabled']??null;
        $acquisition=$body['acquisitionEnabled']??null;
        if(!is_int($rev)||$rev<1||!is_bool($scheduling)||
           !is_bool($acquisition)||
           ($body['confirmation']??null)!=='SET_KA_OWNER_POLICY')
            throw new InvalidArgumentException('invalid_ka_control_update');
        // Disallow an inconsistent state even for the site owner. The actual
        // collector/worker remains separately unpublished and unverified.
        if($acquisition&&!$scheduling)
            throw new DomainException('ka_acquisition_requires_schedule');
        if(($scheduling||$acquisition)&&
           ($cfg['jrei_ka_schedule_enabled']??false)!==true)
            throw new DomainException('private_ka_schedule_switch_off');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('UPDATE jrei_ka_controls
              SET scheduling_enabled=?,acquisition_enabled=?,
                updated_at=?,updated_by_account_id=?,
                policy_revision=policy_revision+1
              WHERE singleton_id=1 AND policy_revision=?');
            $q->execute([$scheduling?1:0,$acquisition?1:0,
                $now,$actor,$rev]);
            if($q->rowCount()!==1)
                throw new DomainException('ka_policy_revision_conflict');
            if(!$scheduling||!$acquisition){
                // Stop dispatch of pending source acquisitions but retain
                // their historical metadata and potentially running work.
                $q=$pdo->prepare("UPDATE jrei_ka_jobs SET
                  job_state='CANCELLED',updated_at=?,revision=revision+1
                  WHERE job_state IN ('QUEUED','RETRY_WAIT')");
                $q->execute([$now]);
            }
            operationsAudit($pdo,$actor,'jrei_ka_control_changed',
                $scheduling&&$acquisition?'opt_in':'suspended');
            $pdo->commit();
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();throw $e;
        }
        return ['ok'=>true,'status'=>'OWNER_POLICY_UPDATED',
            'downloadStarted'=>false,'workerActivated'=>false];
    }
    if($action==='ka_propose_source'){
        $source=$body['sourceId']??null;
        $priority=$body['priorityTier']??null;
        $refresh=$body['refreshIntervalSeconds']??null;
        $limit=$body['maxDocumentBytes']??null;
        $spacing=$body['minRequestSpacingSeconds']??null;
        if(!is_string($source)||!validUuid($source)||
          !in_array($priority,['P0','P1','P2','P3','P4'],true)||
          !is_int($refresh)||$refresh<3600||$refresh>2592000||
          !is_int($limit)||$limit<1024||$limit>8388608||
          !is_int($spacing)||$spacing<30||$spacing>86400||
          ($body['confirmation']??null)!=='PROPOSE_KA_SOURCE_POLICY')
            throw new InvalidArgumentException('invalid_ka_source_proposal');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT source_id FROM jrei_exam_sources
              WHERE source_id=? FOR UPDATE');
            $q->execute([$source]);
            if($q->fetchColumn()===false)
                throw new DomainException('unknown_original_exam_source');
            $q=$pdo->prepare("INSERT INTO jrei_ka_source_policies
              (source_id,priority_tier,refresh_interval_seconds,
                max_document_bytes,min_request_spacing_seconds,
                rights_reviewed,robots_terms_reviewed,transport_reviewed,
                scheduling_state,next_due_at,updated_at)
              VALUES (?,?,?,?,?,0,0,0,'PENDING_REVIEW',?,?)");
            $q->execute([$source,$priority,$refresh,$limit,$spacing,$now,$now]);
            operationsAudit($pdo,$actor,'jrei_ka_source_proposed',$source);
            $pdo->commit();
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();throw $e;
        }
        return ['ok'=>true,'status'=>'PENDING_REVIEW',
            'sourceId'=>$source,'retrievalAllowed'=>false];
    }
    if(in_array($action,['ka_approve_source','ka_suspend_source'],true)){
        $source=$body['sourceId']??null;$rev=$body['revision']??null;
        $approve=$action==='ka_approve_source';
        if(!is_string($source)||!validUuid($source)||
          !is_int($rev)||$rev<1||
          ($body['confirmation']??null)!==($approve?
            'APPROVE_VERIFIED_PUBLIC_KA_SOURCE':'SUSPEND_KA_SOURCE'))
            throw new InvalidArgumentException('invalid_ka_source_change');
        $pdo->beginTransaction();
        try{
            // Source FIRST, policy SECOND, job THIRD for safe cross-operation
            // lock ordering. A signed worker must also revalidate this state
            // at actual lease time; this file does not lease worker jobs.
            $q=$pdo->prepare('SELECT review_state,rights_state,
              is_revoked,is_superseded,verified_at,reviewer_account_id,
              source_locator_uri FROM jrei_exam_sources WHERE source_id=? FOR UPDATE');
            $q->execute([$source]);$origin=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($origin))throw new DomainException('source_unavailable');
            $q=$pdo->prepare('SELECT scheduling_state,revision
              FROM jrei_ka_source_policies WHERE source_id=? FOR UPDATE');
            $q->execute([$source]);$policy=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($policy)||(int)$policy['revision']!==$rev)
                throw new DomainException('ka_source_revision_conflict');
            if($approve){
                if($policy['scheduling_state']!=='PENDING_REVIEW'||
                   $origin['review_state']!=='AUTHORITATIVE_REVIEWED'||
                   !in_array($origin['rights_state'],[
                     'PERMITTED_PRIVATE_ANALYSIS','PERMITTED_PUBLIC_DISPLAY',
                     'PERMITTED_REPRODUCTION'],true)||
                   (int)$origin['is_revoked']!==0||
                   (int)$origin['is_superseded']!==0||
                   $origin['verified_at']===null||
                   $origin['reviewer_account_id']===null)
                    throw new DomainException('ka_source_not_independently_authorized');
                $url=$origin['source_locator_uri'];
                $parsed=is_string($url)?parse_url($url):false;
                $host=is_array($parsed)?strtolower((string)($parsed['host']??'')):'';
                if(!is_array($parsed)||($parsed['scheme']??null)!=='https'||
                   isset($parsed['user'])||isset($parsed['pass'])||
                   isset($parsed['fragment'])||
                   (isset($parsed['port'])&&(int)$parsed['port']!==443)||
                   $host===''||!str_contains($host,'.')||
                   filter_var($host,FILTER_VALIDATE_IP)!==false||
                   preg_match('/(?:^|\.)(?:local|localhost|internal|test|invalid|example)$/',$host))
                    throw new DomainException('ka_source_public_https_required');
            }elseif(!in_array($policy['scheduling_state'],
                 ['PENDING_REVIEW','APPROVED'],true)){
                throw new DomainException('ka_source_state_conflict');
            }
            $status=$approve?'APPROVED':'SUSPENDED';
            $q=$pdo->prepare('UPDATE jrei_ka_source_policies SET
              scheduling_state=?,rights_reviewed=?,robots_terms_reviewed=?,
              transport_reviewed=?,approved_by_account_id=?,
              updated_at=?,revision=revision+1
              WHERE source_id=? AND revision=?');
            $q->execute([$status,$approve?1:0,$approve?1:0,$approve?1:0,
                $approve?$actor:null,$now,$source,$rev]);
            if($q->rowCount()!==1)throw new DomainException('ka_source_revision_conflict');
            if(!$approve){
                $q=$pdo->prepare("UPDATE jrei_ka_jobs SET
                  job_state='CANCELLED',updated_at=?,revision=revision+1
                  WHERE source_id=? AND job_state IN ('QUEUED','RETRY_WAIT')");
                $q->execute([$now,$source]);
            }
            operationsAudit($pdo,$actor,$approve?
              'jrei_ka_source_owner_approved':'jrei_ka_source_suspended',$source);
            $pdo->commit();
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();throw $e;
        }
        return ['ok'=>true,'sourceId'=>$source,'status'=>$status,
          'realFetchStarted'=>false,'publisherValidityCertified'=>false];
    }
    throw new InvalidArgumentException('unsupported_ka_action');
}
