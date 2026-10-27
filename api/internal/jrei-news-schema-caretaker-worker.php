<?php
declare(strict_types=1);
/**
 * Original operations-Cron-only reviewed JREI News additive schema repair.
 * Does not bootstrap from a GET or write without owner policy, hash-confirmed
 * private backup and declared independent restore rehearsal.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-news-schema-caretaker.php';
try{
    $cfg=cfg();
    if(($cfg['jrei_news_schema_caretaker_enabled']??false)!==true||
       ($cfg['operations_cron_master_enabled']??false)!==true){
        fwrite(STDOUT,"JREI original News reviewed additive schema caretaker OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!$pdo instanceof PDO)
        throw new RuntimeException('jrei_news_mother_database_missing');
    $result=jrNewsAdditiveSchemaCaretaker($pdo,$cfg);
    fwrite(STDOUT,'JREI News approved mother-table inventory='.
        $result['state'].'; newly created='.
        (int)$result['newTables'].
        '; news publication remains independently gated.'.PHP_EOL);
}catch(Throwable $e){
    fwrite(STDERR,"JREI News reviewed additive schema requires private reconciliation.\n");
    exit(1);
}
