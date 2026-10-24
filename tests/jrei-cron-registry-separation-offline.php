<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/api/operations-cron-dispatcher.php';
$jobs=operationsCronRegistry();
$expected=[
    'jrei_local_schema_caretaker'=>'internal/jrei-local-schema-caretaker-worker.php',
    'jrei_local_chat_retention'=>'internal/jrei-local-chat-retention-worker.php'
];
foreach($expected as $id=>$relative) {
    if(!isset($jobs[$id])||!is_array($jobs[$id])||
       ($jobs[$id]['relative']??null)!==$relative||
       !is_int($jobs[$id]['defaultCadence']??null)||
       !is_int($jobs[$id]['minimumCadence']??null)||
       ($jobs[$id]['sensitive']??null)!==true) {
        fwrite(STDERR,"FAIL: independent JREI cron registry missing ".$id."\n");
        exit(1);
    }
}
foreach($jobs as $id=>$spec) {
    if(!is_array($spec)||!isset($spec['relative'])||
       !is_string($spec['relative'])||$spec['relative']==='') {
        fwrite(STDERR,"FAIL: invalid cron worker registry ".$id."\n");
        exit(1);
    }
}
echo "PASS JREI separate additive caretaker and encrypted queue retention registration\n";
