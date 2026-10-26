<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/jrei-python-node-health.php';
function accept(bool $cond,string $name): void {
    if (!$cond) {fwrite(STDERR,"FAILED: ".$name."\n");exit(1);}
}
$now=1761436800;
$payload=[
  'schema'=>'jr.jrei.python-node-observation.v1',
  'pythonProcess'=>'RESPONDING',
  'pythonHealthSchema'=>'jr.jrei.python-health.v1',
  'nodeObservedAt'=>$now
];
accept(jrPythonNodeValidate($payload,$now)!==null,'correct observation');
accept(jrPythonNodeValidate([...$payload,'pythonProcess'=>'RUNNING'],$now)===null,'invalid process');
accept(jrPythonNodeValidate([...$payload,'pythonHealthSchema'=>'fake'],$now)===null,'schema mismatch');
accept(jrPythonNodeValidate([...$payload,'nodeObservedAt'=>$now-121],$now)===null,'stale rejected');
accept(jrPythonNodeValidate([...$payload,'nodeObservedAt'=>$now+121],$now)===null,'future rejected');
accept(jrPythonNodeValidate([...$payload,'remoteCommand'=>'curl'], $now)===null,'extra tool rejected');
accept(jrPythonNodeValidate([
  ...$payload,'pythonProcess'=>'UNAVAILABLE','pythonHealthSchema'=>'NOT_OBSERVED'
],$now)!==null,'unavailable is honest');
accept(jrPythonNodeValidate([
  ...$payload,'pythonProcess'=>'UNAVAILABLE','pythonHealthSchema'=>'jr.jrei.python-health.v1'
],$now)===null,'unavailable falsely healthy rejected');
accept(jrPythonNodeValidate('garbage',$now)===null,'non-json-object rejected');
echo "JREI_PHP_NODE_HEALTH_CONTRACT_OK\n";
