<?php
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/operations-reporting.php';
$assertions=0;function check($value,$message){if(!$value)throw new RuntimeException($message);$GLOBALS['assertions']++;}
function section($id){return ['id'=>$id,'estimatedProgress'=>95,'measuredProgress'=>null,'status'=>'not_started','closed'=>false,'priority'=>'P0','dependencies'=>[],'openDependencies'=>[],'verifiedGates'=>array_map(fn($id)=>['id'=>$id,'state'=>'unknown','evidence'=>null],['code','tests','production','evidence'])];}
$first=section('OP-01');$second=section('OP-02');$m=operationsReportingMetrics([$first,$second]);
check($m['measuredCompletion']===null,'No observation must remain unknown.');
check($m['verificationCoverage']===0.0,'Missing evidence is zero coverage, not zero measured completion.');
check($m['estimatedCompletion']===95.0,'Historical estimate lost.');
check($m['productionReadiness']['status']==='unverified','No gates cannot certify production.');
$first['verifiedGates'][0]['state']='pass';$first['verifiedGates'][1]['state']='pass';$first['verifiedGates'][2]['state']='fail';$second['verifiedGates'][0]['state']='stale';
$first['measuredProgress']=50;
$m=operationsReportingMetrics([$first,$second]);check($m['measuredCompletion']===25.0,'Partial evidence inflated by known-only mean.');check($m['verificationCoverage']===37.5,'Expired evidence counted as current coverage.');
$first['verifiedGates']=array_map(fn($g)=>array_merge($g,['state'=>'pass']),$first['verifiedGates']);$first['measuredProgress']=99;$first['status']='blocked';$first['closed']=false;$first['openDependencies']=['OP-02'];
$m=operationsReportingMetrics([$first]);check($m['measuredCompletion']===99.0,'Dependencies must cap measured completion.');check($m['acceptanceGatePassRate']===100.0,'Acceptance-gate credit must be separate from closure.');check($m['productionReadiness']['status']==='unverified','Dependencies must prevent production-ready certification.');
$reports=[];$owners=[];for($i=1;$i<=36;$i++){$id=sprintf('OP-%02d',$i);$reports[]=section($id);$owners[$id]='ENG-01';}
$reports[0]=$first;$reports[1]=$second;$admin=section('ADM-01');
$registry=['engines'=>[['id'=>'ENG-01','canonicalName'=>'Master SEO Engine','lastVerificationTimestamp'=>null,'openDependencies'=>[],'blockedReportIds'=>[],'reportIds'=>array_column($reports,'id')],['id'=>'ENG-12','canonicalName'=>'Unified Administration Engine','reportIds'=>['ADM-01']],['id'=>'ENG-13','canonicalName'=>'Reporting, Audit & Intelligence Engine','reportIds'=>[]]],'reportOwners'=>$owners,
 'actions'=>[['id'=>'ENG-01.ACT-001','responsibleEngine'=>'ENG-01','executionType'=>'manual','scoringScope'=>'legacy_acceptance','legacyReportIds'=>['OP-01']],['id'=>'ENG-01.ACT-002','responsibleEngine'=>'ENG-01','executionType'=>'manual','scoringScope'=>'unverified_acceptance','legacyReportIds'=>['OP-01'],'currentStatus'=>'pending']]];
$snapshot=['reports'=>$reports,'dashboard'=>$admin,'releaseSha'=>str_repeat('a',40),'checkedAt'=>123456,'sourceSections'=>array_fill(0,36,[])];
$r=operationsReporting($snapshot,$registry);
check($r['masterReport']['reportCount']===36,'Master report duplicated administrative record.');
check(count($r['masterReport']['reportIds'])===36,'Master must retain each original report exactly once.');
check($r['engines'][1]['metrics']['totalReports']===1,'ADM record lost from administrator engine.');
check($r['engines'][2]['metrics']['productionReadiness']['status']==='unscoped','Reporting engine borrowed operational work.');
check($r['actionReports'][0]['measuredProgress']===99,'Full-acceptance alias lost dependency cap.');
check($r['actionReports'][0]['closed']===false,'Full-acceptance alias closed despite open dependency.');
check($r['actionReports'][1]['measuredProgress']===null,'Granular action borrowed unrelated completed gates.');
check($r['actionReports'][1]['closed']===false,'Granular action prematurely certified.');
check($r['executiveReport']['metrics']['commercialReadiness']['status']==='unverified','No payment evidence must remain unverified.');
check($r['executiveReport']['metrics']['commercialReadiness']['verifiedRequirements']===0,'Invented commercial completion.');
$actual=json_decode(file_get_contents(__DIR__.'/../api/internal/operations-registry.json'),true);
$actualSnapshot=['reports'=>array_map(fn($r)=>array_merge($r,section($r['id'])),$actual['reports']),'dashboard'=>array_merge($actual['dashboard'],section('ADM-01')),'releaseSha'=>str_repeat('a',40),'checkedAt'=>123456,'sourceSections'=>$actual['sourceSections']];
$actualReporting=operationsReporting($actualSnapshot,$actual);
check(count($actualReporting['awoseDomainViews'])===36,'AWOSE must have 12 domain engines times 3 views.');
check(count(array_unique(array_column($actualReporting['awoseDomainViews'],'id')))===36,'Duplicated AWOSE view IDs.');
check(!in_array('ENG-13',array_column($actualReporting['awoseDomainViews'],'engineId'),true),'Reporting engine must not add domain view scope.');
$views=array_column($actualReporting['awoseDomainViews'],null,'id');
check($views['AWOSE.ENG-05.B']['durableJobExecution']['status']==='not_implemented','Invented durable job execution.');
check($views['AWOSE.ENG-05.C']['experienceMemory']['verifiedExperiences']===null,'Invented learning statistics.');
check($views['AWOSE.ENG-05.A']['reportIds']===$actualReporting['engines'][4]['reportIds'],'AWOSE views lost original report scope.');
// Verify that the two genuinely fetched scholarly records are not counted as search ranks.
$scholarly=operationsFreeScholarlyObservation();
check(in_array($scholarly['status'],['observed','stale'],true),'Actual Crossref record not recognised as time-labelled evidence.');
check($scholarly['metrics']['attempted']===2&&$scholarly['metrics']['metadataFound']===2,'Scholarly DOI status inflated or lost.');

// A throttled free API must never manufacture performance measurements.
$mobileApi=operationsFreePerformanceObservation();
check($mobileApi['status']==='provider_unavailable'||$mobileApi['status']==='stale','Google free PSI 429 was incorrectly treated as a measured result.');
check($mobileApi['measuredPages']===0,'PSI throttling created a fake laboratory score.');
check(count($mobileApi['results'])===2,'Both PSI target routes must be represented.');
check($mobileApi['results'][0]['labPerformanceScore']===null&&$mobileApi['results'][1]['labPerformanceScore']===null,'Missing PSI results were converted to numbers.');

// The two local-Lighthouse artifacts have an explicit non-production provenance.
$local=operationsLocalLighthouseObservation();
check(in_array($local['status'],['observed','stale'],true),'Local Lighthouse evidence not loaded.');
check($local['source']==='local_sanitized_public_build','local Lighthouse cannot be labelled production.');
check($local['measuredPages']===2,'Local Lighthouse did not retain both language routes.');
check($local['results'][0]['route']==='/fa/'&&$local['results'][1]['route']==='/en/','Local language targets changed.');
foreach($local['results'] as $result){
    check(is_int($result['localLabScore'])&&$result['localLabScore']>=0&&$result['localLabScore']<=100,'Non-numeric/invalid local lab score entered manager reporting.');
}
echo "Reporting assertions: $assertions passed\n";
