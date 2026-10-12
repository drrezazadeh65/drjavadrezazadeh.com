<?php
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
/**
 * Optional, bounded scholarly evidence from a reviewable zero-fee Crossref GitHub run.
 * Does not measure SEO ranking, citations, authorship, visits or performance.
 */
function operationsFreeScholarlyObservation(): array {
    $path=__DIR__.'/internal/free-scholar-observation.json';
    $raw=@file_get_contents($path);
    $value=is_string($raw)?json_decode($raw,true):null;
    if(!is_array($value)||($value['schema']??'')!=='free-scholar-observation-v1'
        ||($value['provider']??'')!=='Crossref'||!is_array($value['records']??null)
        ||count($value['records'])<1||count($value['records'])>10)
        return ['status'=>'not_collected','provider'=>'Crossref','observedAt'=>null,
            'records'=>[],'metrics'=>['metadataFound'=>null,'attempted'=>null],
            'limitation'=>'A source-only reference catalogue or GitHub artifact is not a deployed verified provider observation.'];
    $at=strtotime((string)($value['observedAt']??''));
    if($at===false||$at>time()+300)return ['status'=>'invalid','provider'=>'Crossref','observedAt'=>null,'records'=>[],
        'metrics'=>['metadataFound'=>null,'attempted'=>null],'limitation'=>'Invalid or future observation timestamp.'];
    $records=[];
    foreach($value['records'] as $record){
        if(!is_array($record)||!preg_match('~^10\\.\\d{4,9}/[a-zA-Z0-9._()/;:+-]{1,180}$~D',(string)($record['doi']??'')))continue;
        if(!in_array(($record['status']??''),['metadata_found','not_found','unavailable','mismatch'],true))continue;
        $records[]=['doi'=>$record['doi'],'status'=>$record['status'],'providerTitle'=>isset($record['providerTitle'])?substr((string)$record['providerTitle'],0,400):null,
            'sourceTitle'=>isset($record['sourceTitle'])?substr((string)$record['sourceTitle'],0,300):null,
            'publisher'=>isset($record['publisher'])?substr((string)$record['publisher'],0,240):null,
            'providerUrl'=>'https://api.crossref.org/works/'.rawurlencode($record['doi'])];
    }
    if(count($records)!==count($value['records']))return ['status'=>'invalid','provider'=>'Crossref','observedAt'=>null,'records'=>[],
        'metrics'=>['metadataFound'=>null,'attempted'=>null],'limitation'=>'Observation records failed server validation.'];
    $fresh=$at>=time()-14*86400;
    $found=count(array_filter($records,static fn($row)=>$row['status']==='metadata_found'));
    return ['status'=>$fresh?'observed':'stale','provider'=>'Crossref',
        'observedAt'=>gmdate('c',$at),'records'=>$records,
        'metrics'=>['metadataFound'=>$found,'attempted'=>count($records)],
        'limitation'=>'Crossref record existence is not verification of authorship, article claims, citation impact, indexing, rankings or revenue.'];
}

/** Zero-cost PSI lab observations; never convert provider errors into numeric scores. */
function operationsFreePerformanceObservation(): array {
    $raw=@file_get_contents(__DIR__.'/internal/free-performance-observation.json');
    $data=is_string($raw)?json_decode($raw,true):null;
    $expected=['https://drjavadrezazadeh.com/fa/','https://drjavadrezazadeh.com/en/'];
    if(!is_array($data)||($data['schema']??'')!=='free-performance-observation-v1'
        ||($data['provider']??'')!=='Google PageSpeed Insights'
        ||count($data['records']??[])!==2)
        return ['status'=>'not_collected','observedAt'=>null,'provider'=>'Google PageSpeed Insights',
            'results'=>[],'measuredPages'=>null,'attemptedPages'=>null,
            'limitation'=>'No reviewed mobile lab observation is deployed.'];
    $date=strtotime((string)($data['observedAt']??''));
    if($date===false||$date>time()+300)return ['status'=>'invalid','observedAt'=>null,'results'=>[],
        'provider'=>'Google PageSpeed Insights','measuredPages'=>null,'attemptedPages'=>null,
        'limitation'=>'Invalid observation timestamp.'];
    $results=[];$measured=0;
    foreach($data['records'] as $i=>$rec){
        if(!is_array($rec)||($rec['target']??null)!==$expected[$i]
            ||!in_array($rec['status']??'', ['observed','unavailable'],true))
            return ['status'=>'invalid','observedAt'=>null,'results'=>[],'provider'=>'Google PageSpeed Insights',
                'measuredPages'=>null,'attemptedPages'=>null,'limitation'=>'Untrusted target or status.'];
        $score=null;
        if($rec['status']==='observed'){
            $score=$rec['categories']['performance']??null;
            if(!is_numeric($score)||$score<0||$score>100)$score=null;
            if($score!==null)$measured++;
        }
        $results[]=['url'=>$expected[$i],'status'=>$rec['status'],
            'labPerformanceScore'=>$score===null?null:(int)$score,
            'reason'=>($rec['status']==='unavailable')?substr((string)($rec['reason']??'unavailable'),0,64):null];
    }
    $fresh=$date>=time()-14*86400;
    return ['status'=>!$fresh?'stale':($measured>0?'observed':'provider_unavailable'),
        'observedAt'=>gmdate('c',$date),'provider'=>'Google PageSpeed Insights',
        'results'=>$results,'measuredPages'=>$measured,'attemptedPages'=>2,
        'limitation'=>'Mobile Lighthouse lab score only; HTTP 429 is a provider rate limit, not a slow-site diagnosis or a real-user field metric.'];
}

/** Optional non-production Lighthouse CI metrics from reviewed local build artifacts. */
function operationsLocalLighthouseObservation(): array {
    $raw=@file_get_contents(__DIR__.'/internal/free-local-lighthouse-observation.json');
    $data=is_string($raw)?json_decode($raw,true):null;
    $blank=['status'=>'not_collected','source'=>'local_sanitized_public_build','observedAt'=>null,
        'measuredPages'=>null,'results'=>[],'limitation'=>'Local source measurements have not been reviewed and deployed.'];
    if(!is_array($data)||($data['schema']??'')!=='free-local-lighthouse-observation-v1'
        ||($data['origin']??'')!=='local_sanitized_public_build'||($data['sourceEngine']??'')!=='ENG-10'
        ||count($data['records']??[])!==2)return $blank;
    $at=strtotime((string)($data['observedAt']??''));
    if($at===false||$at>time()+300)return array_merge($blank,['status'=>'invalid']);
    $routes=['/fa/','/en/'];$results=[];$measured=0;
    foreach($data['records'] as $i=>$rec){
        if(!is_array($rec)||($rec['route']??'')!==$routes[$i]
            ||!in_array($rec['status']??'', ['observed','unavailable'],true))
            return array_merge($blank,['status'=>'invalid']);
        $score=null;
        if($rec['status']==='observed'){
            if(($rec['isDeployedSite']??true)!==false||($rec['realUserFieldDataClaimed']??true)!==false
                ||($rec['mobile']??false)!==true)return array_merge($blank,['status'=>'invalid']);
            $s=$rec['score']['performance']??null;
            if(is_int($s)&&$s>=0&&$s<=100){$score=$s;$measured++;}
        }
        $results[]=['route'=>$routes[$i],'status'=>$rec['status'],'localLabScore'=>$score,
            'reason'=>$rec['status']==='unavailable'?substr((string)($rec['reason']??'unavailable'),0,72):null];
    }
    return ['status'=>$at<time()-14*86400?'stale':($measured>0?'observed':'unavailable'),
        'source'=>'local_sanitized_public_build','observedAt'=>gmdate('c',$at),
        'measuredPages'=>$measured,'results'=>$results,
        'limitation'=>'Local Lighthouse scores measure the sanitized source on CI, not Bertina production or real-user Core Web Vitals.'];
}

/** Canonical management reporting. Pure projection; never creates evidence or closes actions. */
function operationsReportingMetrics(array $records): array {
    $total=count($records);$totalGates=0;$observed=0;$passed=0;$weightedProgress=0.0;$estimated=[];$closed=0;$production=0;
    foreach($records as $record){
        if(is_numeric($record['estimatedProgress']??null))$estimated[]=(float)$record['estimatedProgress'];
        if(($record['closed']??false)===true)$closed++;
        $recordGates=count($record['verifiedGates']??[]);
        if(is_numeric($record['measuredProgress']??null))$weightedProgress+=(float)$record['measuredProgress']*$recordGates;
        foreach($record['verifiedGates']??[] as $gate){
            $totalGates++;
            if(in_array($gate['state']??'', ['pass','fail','blocked'],true))$observed++;
            if(($gate['state']??'')==='pass')$passed++;
            if(($gate['id']??'')==='production'&&($gate['state']??'')==='pass')$production++;
        }
    }
    return [
        'estimatedCompletion'=>count($estimated)?round(array_sum($estimated)/count($estimated),1):null,
        'estimatedSource'=>'Historical expert estimates; not measured acceptance or operational readiness.',
        'measuredCompletion'=>$observed&&$totalGates?round($weightedProgress/$totalGates,1):null,
        'acceptanceGatePassRate'=>$observed&&$totalGates?round(100*$passed/$totalGates,1):null,
        'verificationCoverage'=>$totalGates?round(100*$observed/$totalGates,1):null,
        'passedGates'=>$passed,'observedGates'=>$observed,'requiredGates'=>$totalGates,
        'verifiedReports'=>$closed,'totalReports'=>$total,
        'productionReadiness'=>['status'=>$total&&$closed===$total?'verified':($total?'unverified':'unscoped'),
            'verifiedReports'=>$closed,'requiredReports'=>$total,'productionGatePasses'=>$production,
            'limitation'=>'A production gate alone does not certify dependencies or overall completion.'],
        'methodology'=>'Equal acceptance-gate weighting across uniquely owned reports. Measured completion is a gate-weighted lower bound over all uniquely owned records using the server-evaluated score including dependency caps; unknown records earn no credit when partial evidence exists. The acceptance-gate pass rate is separate from closure. No observed current evidence means unknown, not zero. Verification coverage counts current pass/fail/blocked observations. Dependencies can keep a report open even when all its own gates pass.'
    ];
}
function operationsReportingCommercial(array $byId): array {
    $ids=['OP-05','OP-06','OP-07','OP-08','OP-09','OP-10','OP-11','OP-22','OP-23'];$open=[];$passed=0;
    foreach($ids as $id){if(($byId[$id]['closed']??false)===true)$passed++;else $open[]=$id;}
    return ['status'=>$open?'unverified':'verified','verifiedRequirements'=>$passed,'totalRequirements'=>count($ids),
        'requiredReportIds'=>$ids,'openReportIds'=>$open,
        'limitation'=>'Commercial certification requires verified identity, gateway, real payment, receipt, inventory, delivery and service journeys. Configuration flags or paid-state rows alone do not certify revenue.'];
}
/** The AWOSE 36 views reference the same 12 domain engines; they never renumber OP reports. */
function operationsReportingDomainViews(array $engines,array $actions): array {
    $views=[];
    foreach($engines as $engine){
        if($engine['id']==='ENG-13')continue;
        $owned=array_values(array_filter($actions,fn($action)=>$action['responsibleEngine']===$engine['id']));
        $base=['engineId'=>$engine['id'],'reportIds'=>$engine['reportIds'],'actionIds'=>array_column($owned,'id'),
            'lastVerificationTimestamp'=>$engine['lastVerificationTimestamp'],
            'source'=>'The same authenticated release-scoped operations snapshot; not a new source of acceptance evidence.'];
        $views[]=array_merge($base,['id'=>'AWOSE.'.$engine['id'].'.A','type'=>'A','name'=>'Health and readiness',
            'metrics'=>$engine['metrics'],'openDependencies'=>$engine['openDependencies'],
            'blockedReportIds'=>$engine['blockedReportIds'],
            'limitation'=>'Current acceptance evidence and scope only. No observation certifies unmeasured field performance, delivery, money settlement or external indexing.']);
        $views[]=array_merge($base,['id'=>'AWOSE.'.$engine['id'].'.B','type'=>'B','name'=>'Execution and recovery',
            'actionStatuses'=>array_map(fn($a)=>['id'=>$a['id'],'status'=>$a['currentStatus'],'measuredProgress'=>$a['measuredProgress'],'closed'=>$a['closed'],
                'executionType'=>$a['executionType'],'supportedExecutor'=>$a['supportedExecutor']??null,
                'blocker'=>$a['errorRecovery']['blocker']??null,'recovery'=>$a['errorRecovery']['recovery']??null],$owned),
            'durableJobExecution'=>['status'=>'not_implemented','attempts'=>null,'successfulJobs'=>null,'failedJobs'=>null],
            'limitation'=>'Registered read-only snapshot collectors are available. No durable mutation queue, retry worker or recovered-job success is inferred from this report.']);
        $views[]=array_merge($base,['id'=>'AWOSE.'.$engine['id'].'.C','type'=>'C','name'=>'Learning and improvement',
            'experienceMemory'=>['status'=>'not_implemented','verifiedExperiences'=>null,'negativeExperiences'=>null,'reuseAttempts'=>null,'automationPromotions'=>null],
            'recommendedVerificationActionIds'=>array_column(array_filter($owned,fn($a)=>!$a['closed']),'id'),
            'permissionPolicy'=>'Recommendations and learning cannot grant authority, lower risk or turn unavailable executors into operational capabilities.',
            'limitation'=>'No persisted cross-restart learning, verified experience reuse or autonomous improvement is claimed. Recommendations identify open registered scopes only.']);
    }
    return $views;
}
function operationsReporting(array $snapshot,array $registry): array {
    $reports=$snapshot['reports'];$byId=array_column($reports,null,'id');
    $byId[$snapshot['dashboard']['id']]=$snapshot['dashboard'];$engines=[];
    foreach($registry['engines']??[] as $engine){
        $records=[];foreach($engine['reportIds']??[] as $id)if(isset($byId[$id]))$records[]=$byId[$id];
        // ADM-01 is separately scoped and never added to the 36-report master denominator.
        if($engine['id']==='ENG-12'&&isset($byId['ADM-01'])&&!in_array('ADM-01',array_column($records,'id'),true))$records[]=$byId['ADM-01'];
        $metrics=operationsReportingMetrics($records);
        $metrics['commercialReadiness']=$engine['id']==='ENG-05'?operationsReportingCommercial($byId):[
            'status'=>'not_applicable','requiredReportIds'=>[],'openReportIds'=>[],
            'limitation'=>'This engine has no registered independent monetary checkout certification.'];
        $pending=[];$blocked=[];$completed=[];$dependencies=[];$latest=0;
        foreach($records as $record){
            if(($record['closed']??false)===true)$completed[]=$record['id'];else $pending[]=$record['id'];
            if(in_array($record['status']??'', ['blocked','regressed'],true))$blocked[]=$record['id'];
            foreach($record['openDependencies']??[] as $id)$dependencies[$id]=true;
            foreach($record['verifiedGates']??[] as $gate)if(in_array($gate['state']??'', ['pass','fail','blocked'],true))$latest=max($latest,(int)($gate['evidence']['checked_at']??0));
        }
        $engines[]=array_merge($engine,['metrics'=>$metrics,'completedReportIds'=>$completed,'pendingReportIds'=>$pending,
            'blockedReportIds'=>$blocked,'openDependencies'=>array_keys($dependencies),'lastVerificationTimestamp'=>$latest?:null]);
    }
    $actionReports=[];
    foreach($registry['actions']??[] as $action){
        $scoped=[];foreach($action['legacyReportIds']??[] as $id)if(isset($byId[$id]))$scoped[]=$byId[$id];
        $legacy=($action['scoringScope']??'')==='legacy_acceptance'&&count($scoped)===1;
        $actionReports[]=array_merge($action,[
            'currentStatus'=>$legacy?$scoped[0]['status']:($action['currentStatus']??'pending'),
            'measuredProgress'=>$legacy?$scoped[0]['measuredProgress']:null,
            'closed'=>$legacy&&$scoped[0]['closed'],
            'verifiedGates'=>$legacy?$scoped[0]['verifiedGates']:[],
            'legacyScopeMetrics'=>operationsReportingMetrics($scoped),
            'completionClaim'=>$legacy?'This permanent action aliases the complete legacy report acceptance scope; current trusted report evidence and dependencies apply.':'Legacy report evidence is context only. This action requires evidence for its own acceptance criteria; scope progress cannot close it.'
        ]);
    }
    $metrics=operationsReportingMetrics($reports);$metrics['commercialReadiness']=operationsReportingCommercial($byId);
    // Reference inventory is not proof of 30 active external connections.
    $referenceFile=__DIR__.'/internal/free-resources-registry.json';
    $referenceRaw=@file_get_contents($referenceFile);
    $reference=is_string($referenceRaw)?json_decode($referenceRaw,true):null;
    $referenceOk=is_array($reference)&&($reference['schema']??'')==='operations-free-resources-v1'
        && count($reference['resources']??[])===30;
    $freeSourceRegistry=['status'=>$referenceOk?'reference_only':'unavailable',
        'registeredCandidates'=>$referenceOk?30:null,'verifiedExternalConnections'=>0,
        'automatedProviderMetrics'=>false,
        'limitation'=>'External provider results require permissioned, timestamped and independently validated observations.'];
    $queue=array_values(array_filter($reports,fn($r)=>!($r['closed']??false)));
    $priorityOrder=['OP-02','OP-36','OP-03','OP-01','OP-04','OP-05','OP-06','OP-07','OP-08','OP-09','OP-10','OP-11'];
    usort($queue,function($a,$b)use($priorityOrder){$rank=fn($id)=>(($position=array_search($id,$priorityOrder,true))===false?99:$position);return strcmp($a['priority'],$b['priority'])?:($rank($a['id'])<=>$rank($b['id']));});
    return [
        'schema'=>'operations-reporting-v1','reportingEngine'=>'ENG-13','freeSourceRegistry'=>$freeSourceRegistry,'freeScholarlyObservation'=>operationsFreeScholarlyObservation(),'freePerformanceObservation'=>operationsFreePerformanceObservation(),'localLighthouseObservation'=>operationsLocalLighthouseObservation(),'reportingPeriod'=>[
            'releaseSha'=>$snapshot['releaseSha'],'publishedAt'=>$snapshot['publishedAt']??null,'generatedAt'=>$snapshot['checkedAt'],
            'historyScope'=>'Current release; bounded latest 5000 evidence events. Not all-time history.'],
        'engines'=>$engines,'actionReports'=>$actionReports,
        'awoseDomainViews'=>operationsReportingDomainViews($engines,$actionReports),
        'executiveReport'=>['id'=>'ENG-13.EXECUTIVE','metrics'=>$metrics,'dashboardMetrics'=>operationsReportingMetrics([$snapshot['dashboard']]),
            'priorityReportIds'=>array_slice(array_column($queue,'id'),0,10),'verifiedReportIds'=>array_column(array_filter($reports,fn($r)=>$r['closed']), 'id'),
            'blockedReportIds'=>array_column(array_filter($reports,fn($r)=>in_array($r['status'],['blocked','regressed'],true)), 'id'),
            'interpretation'=>'Interface availability, configuration readiness and historical estimates do not certify business activation. Use scoped current evidence, open dependencies and controlled end-to-end journeys. Revenue and forecast are unknown unless independently reconciled.'],
        'masterReport'=>['id'=>'ENG-13.MASTER','reportIds'=>array_column($reports,'id'),'reportCount'=>count($reports),
            'metrics'=>$metrics,'sourceSectionCount'=>count($snapshot['sourceSections']),
            'ownerByReportId'=>array_intersect_key($registry['reportOwners']??[],array_flip(array_column($reports,'id')))]
    ];
}
