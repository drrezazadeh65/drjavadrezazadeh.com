<?php
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/operations-reporting.php';
require __DIR__.'/../api/operations-action-runs.php';
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
    foreach(['performance','accessibility','seo','best-practices'] as $category){
        $n=$result['categoryScores'][$category]??null;
        check(is_int($n)&&$n>=0&&$n<=100,'Local Lighthouse category not safely projected: '.$category);
    }
    foreach(['fcpMs','lcpMs','tbtMs','cls'] as $metric){
        $n=$result['labMetrics'][$metric]??null;
        check(is_numeric($n)&&$n>=0&&$n<=($metric==='cls'?1:250000),'Invalid local Lighthouse laboratory metric: '.$metric);
    }
}
// Owner-supplied PageSpeed UI screenshots must remain separate from API 429 and local Lighthouse results.
$manualPsi=operationsManualPagespeedObservation();
check(in_array($manualPsi['status'],['owner_supplied','stale'],true),'Screenshot evidence lost its manual provenance.');
check($manualPsi['verifiedByProviderApi']===false,'Manual screenshots incorrectly treated as trusted API results.');
check($manualPsi['targetUrl']==='https://drjavadrezazadeh.com/','Owner screenshot target changed to different route.');
check(count($manualPsi['records'])===2,'Owner screenshot mobile/desktop results missing.');
check($manualPsi['records'][0]['device']==='mobile'&&$manualPsi['records'][1]['device']==='desktop','Manual screenshot device identities reversed.');
check($manualPsi['records'][0]['labScores']['performance']===99&&$manualPsi['records'][1]['labScores']['performance']===100,'Manual lab scores incorrectly recorded.');
check($manualPsi['records'][0]['labScores']['bestPractices']===96&&$manualPsi['records'][1]['labScores']['bestPractices']===96,'Best Practices evidence lost.');
check($manualPsi['realUserFieldData']==='No Data','No CrUX field data screenshot was incorrectly promoted to field measurements.');
check($actualReporting['manualPagespeedObservation']['source']==='user_supplied_screenshot_transcription','Unified ENG-13 report lost screenshot provenance.');

$eligible=array_values(array_filter($actual['actions'],static fn($a)=>operationsActionDefinition($actual,(string)$a['id'])!==null));
check(count($eligible)===7,'Read-only Action executor count changed or a sensitive Action was activated.');
check(operationsActionDefinition($actual,'ENG-05.ACT-002')===null,'Payment receipt certification must not be runnable as a read-only observation.');
check(operationsActionDefinition($actual,'ENG-06.ACT-001')===null,'Journal governance certification accidentally acquired an executor.');
$releaseAction=operationsActionDefinition($actual,'ENG-11.ACT-009');
check(is_array($releaseAction),'Registered release observer is not executable under its approved policy.');

 // Even a perfect clone of a low-risk executor may not grant execution to
 // an existing HIGH/CRITICAL Action by forging its registry metadata.
 $forged=$releaseAction;
 $forged['id']='ENG-05.ACT-002'; // Payment callback: CRITICAL.
 check(operationsActionDefinition(['actions'=>[$forged]],$forged['id'])===null,
     'CRITICAL payment Action gained execution through a forged registry entry');
 $forged['id']='ENG-01.ACT-001'; // Granular SEO mutation: HIGH.
 check(operationsActionDefinition(['actions'=>[$forged]],$forged['id'])===null,
     'HIGH Action gained execution through a forged registry entry');
 $expanded=$releaseAction;
 $expanded['supportedExecutor']['signalIds']=['current_release','email_transport'];
 check(operationsActionDefinition(['actions'=>[$expanded]],$expanded['id'])===null,
     'Read-only observer widened its server-authorized signal scope');
 $missing=$releaseAction;
 $missing['supportedExecutor']['signalIds']=['unexpected'];
 check(operationsActionDefinition(['actions'=>[$missing]],$missing['id'])===null,
     'Read-only observer accepted unregistered signal identifiers');

$then=time();
$signals=['OP-02'=>['signals'=>[[
 'id'=>'current_release','labelFa'=>'شناسه نسخه','labelEn'=>'Release identity','source'=>'Bertina operations_release',
 'limitation'=>'Does not certify the deployed content','value'=>str_repeat('a',40),
 'checkedAt'=>$then,'expiresAt'=>$then+60
]]]];
$observed=operationsCollectorObservation($releaseAction,$signals,$then);
check($observed['status']==='observed'&&$observed['freshSignalCount']===1,'Fresh read-only runtime observation incorrectly rejected.');
check($observed['signals'][0]['value']===str_repeat('a',40),'Verified public release observation missing from Action report.');
$stale=operationsCollectorObservation($releaseAction,$signals,$then+61);
check($stale['status']==='stale'&&$stale['freshSignalCount']===0,'Expired Action observation claimed a fresh success.');
$unavailable=operationsCollectorObservation($releaseAction,[],$then);
check($unavailable['status']==='unavailable'&&$unavailable['expectedSignalCount']===1,'Missing Action signals must remain unavailable, never zero or success.');

echo "Reporting assertions: $assertions passed\n";
