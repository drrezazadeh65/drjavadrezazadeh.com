<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/operations-gsc-direct.php';
$now=strtotime('2026-10-20T12:00:00Z');
$count=0;
function expectGsc(bool $ok,string $why):void{
    global $count;
    if(!$ok)throw new RuntimeException($why);
    $count++;
}
$data=[
 'schema'=>'jr-gsc-direct-observation-v1',
 'source'=>'google-search-console-api-direct',
 'property'=>'https://drjavadrezazadeh.com/',
 'collectedAtUtc'=>'2026-10-20T11:00:00Z',
 'startDate'=>'2026-10-02','endDate'=>'2026-10-16',
 'rows'=>[['clicks'=>3,'impressions'=>30,'ctr'=>0.1,'position'=>11.5]],
];
$valid=operationsGscDirectFromDocument($data,$now);
expectGsc($valid['status']==='locally_validated_unattested','attestation falsely accepted');
expectGsc($valid['provenanceAttested']===false&&$valid['apiLiveNow']===false,'fake live origin');
expectGsc($valid['metrics']['clicks']===3&&$valid['rowsObserved']===1,'aggregate wrong');
$none=operationsGscDirectFromDocument(null,$now);
expectGsc($none['status']==='unavailable'&&$none['metrics']['clicks']===null,'missing treated as zero');
$zero=$data;$zero['rows']=[];
$r=operationsGscDirectFromDocument($zero,$now);
expectGsc($r['status']==='no_rows_unattested'&&$r['metrics']['clicks']===null,'empty treated as zero');
foreach ([
 ['property','sc-domain:drjavadrezazadeh.com'],
 ['source','GSC Wizard'],
 ['collectedAtUtc','2026-10-10T11:00:00Z'],
 ['collectedAtUtc','2026-10-21T11:00:00Z'],
 ['collectedAtUtc','2026-02-30T11:00:00Z'],
 ['startDate',20261002],
 ['startDate','2026-02-30'],
 ['endDate','2026-03-01'],
] as [$field,$value]){
 $invalid=$data;$invalid[$field]=$value;
 expectGsc(operationsGscDirectFromDocument($invalid,$now)['status']==='unavailable',
     'invalid field accepted '.$field.'='.json_encode($value));
}
foreach ([true,-1,'3',INF,NAN] as $value){
 $invalid=$data;$invalid['rows'][0]['clicks']=$value;
 expectGsc(operationsGscDirectFromDocument($invalid,$now)['status']==='unavailable',
    'invalid metric accepted');
}
$invalid=$data;$invalid['rows'][]=$data['rows'][0];
expectGsc(operationsGscDirectFromDocument($invalid,$now)['status']==='unavailable','ambiguous rows accepted');
$invalid=$data;$invalid['extra']='private';
expectGsc(operationsGscDirectFromDocument($invalid,$now)['status']==='unavailable','unknown keys accepted');
$invalid=$data;$invalid['rows'][0]['ctr']=1.1;
expectGsc(operationsGscDirectFromDocument($invalid,$now)['status']==='unavailable','bad CTR');
expectGsc(operationsGscDirectSnapshot('',$now)['status']==='unavailable','unconfigured default wrong');
expectGsc(operationsGscDirectSnapshot(__DIR__.'/../api/internal/operations-gsc-observation.json',$now)['status']==='unavailable','public-root file accepted');
$file=tempnam(sys_get_temp_dir(),'jr-gsc-contract-');
if(!is_string($file))throw new RuntimeException('fixture_temp_failed');
try {
 chmod($file,0600);
 file_put_contents($file,json_encode($data,JSON_THROW_ON_ERROR));
 $loaded=operationsGscDirectSnapshot($file,$now);
 expectGsc($loaded['status']==='locally_validated_unattested','private fixture not loaded');
 chmod($file,0644);
 clearstatcache(true,$file);
 expectGsc(operationsGscDirectSnapshot($file,$now)['status']==='unavailable','group/world-readable GSC file accepted');
 chmod($file,0600);
 clearstatcache(true,$file);
 file_put_contents($file,str_repeat('a',65537));
 expectGsc(operationsGscDirectSnapshot($file,$now)['status']==='unavailable','oversize accepted');
 file_put_contents($file,'{invalid-json');
 expectGsc(operationsGscDirectSnapshot($file,$now)['status']==='unavailable','malformed JSON accepted');
}finally{unlink($file);}
$joined=operationsSearchIntelligenceSnapshot('',$now);
expectGsc($joined['schema']==='jr-owner-search-intelligence-v1','combined schema incorrect');
expectGsc($joined['gsc']['status']==='unavailable','GSC unavailable must remain unknown');
expectGsc($joined['ga4']['status']==='not_ingested'
    &&$joined['ga4']['activeUsers']===null&&$joined['ga4']['eventCount']===null,
    'GA4 missing report must remain null, not fabricated');
expectGsc($joined['ga4']['property']==='properties/559754204'
    &&$joined['ga4']['measurementId']==='G-C3C7NQQNWX','GA4 property identity drift');
expectGsc($joined['tagManager']['status']==='container_registered_unpublished'
    &&$joined['tagManager']['containerId']==='GTM-P6LWCLKM'
    &&$joined['tagManager']['productionCollectionVerified']===false,'GTM installation state not safely represented');
expectGsc(($joined['clarity']['projectId']??null)==='z0mzp0dp74'
    &&($joined['clarity']['recordingVerified']??true)===false
    &&($joined['clarity']['separateConsentRequired']??false)===true,
    'Clarity project must remain inactive and separately consented');
echo "Direct GSC owner-only projection: ".$count." assertions passed\n";
