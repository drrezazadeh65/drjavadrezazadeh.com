<?php
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
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
        'schema'=>'operations-reporting-v1','reportingEngine'=>'ENG-13','freeSourceRegistry'=>$freeSourceRegistry,'reportingPeriod'=>[
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
