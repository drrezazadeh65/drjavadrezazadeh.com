<?php
declare(strict_types=1);
/** Disposable CI DB only. No production DB access or account data. */
define('BERTINA_API_BOOTSTRAPPED',true);
function jrHybridUuid($v): bool {
    return is_string($v)&&preg_match('/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/D',$v)===1;
}
require_once __DIR__.'/../api/jrei-python-canary-bridge.php';
function verdict(bool $ok,string $what):void{
    if(!$ok){fwrite(STDERR,'FAILED '.$what."\n");exit(1);}
}
$db=new PDO(getenv('CI_DB_DSN'),getenv('CI_DB_USER'),getenv('CI_DB_PASSWORD'),[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES=>false,
]);
verdict(jrPythonCanaryReady($db),'canary schema');
$now=time();$owner=jrPythonCanaryUuid();$node=jrPythonCanaryUuid();
$db->prepare('INSERT INTO jrei_python_node_health (node_id,python_process,health_schema,node_observed_at,server_received_at) VALUES(?,?,?,?,?)')
   ->execute([$node,'RESPONDING','jr.jrei.python-health.v1',$now,$now]);
$req=['action'=>'run-fixed-arithmetic','requestKey'=>bin2hex(random_bytes(16))];
$a=jrPythonCanaryOwner($db,$owner,$req,$now);
$b=jrPythonCanaryOwner($db,$owner,$req,$now);
verdict($a['jobId']===$b['jobId'],'idempotent owner submission');
verdict($a['state']==='QUEUED','initial queued');
verdict($db->query('SELECT COUNT(*) FROM jrei_python_canary_jobs')->fetchColumn()==1,'no duplicate rows');
try{
    jrPythonCanaryOwner($db,$owner,['action'=>'run-fixed-arithmetic','requestKey'=>'bad'],$now);
    verdict(false,'invalid key not rejected');
}catch(InvalidArgumentException $e){}
try{
    jrPythonCanaryPoll($db,jrPythonCanaryUuid(),['schema'=>JR_PY_CANARY_SCHEMA],$now);
    verdict(false,'unknown worker not rejected');
}catch(DomainException $e){}
$p=jrPythonCanaryPoll($db,$node,['schema'=>JR_PY_CANARY_SCHEMA],$now);
$job=$p['job'];verdict(is_array($job),'signed node leased job');
verdict($job['expression']==='12*7','fixed expression');
$none=jrPythonCanaryPoll($db,$node,['schema'=>JR_PY_CANARY_SCHEMA],$now);
verdict($none['job']===null,'one-time leasing');
$answer=['schema'=>JR_PY_CANARY_SCHEMA,'jobId'=>$job['jobId'],'leaseId'=>$job['leaseId'],
    'numerator'=>84,'denominator'=>1,'exactFraction'=>'84',
    'skillId'=>'jrei.math.exact_arithmetic.v1','performedWithoutModel'=>true];
try{jrPythonCanaryComplete($db,$node,[...$answer,'numerator'=>48],$now+1);
    verdict(false,'wrong model arithmetic not rejected');
}catch(InvalidArgumentException $e){}
try{jrPythonCanaryComplete($db,$node,[...$answer,'leaseId'=>jrPythonCanaryUuid()],$now+1);
    verdict(false,'wrong lease not rejected');
}catch(DomainException $e){}
try{jrPythonCanaryComplete($db,jrPythonCanaryUuid(),$answer,$now+1);
    verdict(false,'wrong node not rejected');
}catch(DomainException $e){}
$r=jrPythonCanaryComplete($db,$node,$answer,$now+1);
verdict($r['accepted']===true,'signed completion accepted');
$view=jrPythonCanaryOwnerSnapshot($db,$owner);
verdict($view['jobs'][0]['state']==='COMPLETED','durable state');
verdict($view['jobs'][0]['numerator']===84,'durable Python result');
verdict($view['jobs'][0]['denominator']===1,'durable exact integer');
verdict($view['jobs'][0]['autonomousLearningVerified']===false,'no false learning claim');
try{jrPythonCanaryComplete($db,$node,$answer,$now+2);
    verdict(false,'replayed completion not rejected');
}catch(DomainException $e){}
echo "JREI_EXACT_PYTHON_MOTHER_DB_CANARY_FIXTURE_PASS\n";
