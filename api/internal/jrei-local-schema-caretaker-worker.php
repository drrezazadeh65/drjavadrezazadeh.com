<?php
declare(strict_types=1);
/**
 * Explicitly owner-enabled JREI-LM additive mother-table caretaker.
 * Never invoked on public HTTP. Backups, original DB name, foreign-key
 * prerequisites and fixed reviewed CREATE TABLE statements are verified.
 * Does not run arbitrary model-created DDL or modify shop/account tables.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-local-schema-caretaker.php';
try {
    $cfg=cfg();
    if(($cfg['jrei_local_schema_caretaker_enabled']??false)!==true){
        fwrite(STDOUT,"JREI-LM schema caretaker OFF.\n");exit(0);
    }
    $pdo=db();
    if(!($pdo instanceof PDO)){
        fwrite(STDERR,"JREI-LM database unavailable.\n");exit(2);
    }
    $result=jrJreiLocalSchemaApply($pdo,$cfg);
    fwrite(STDOUT,"JREI-LM approved additive schema verified; ".
      "new tables: ".$result['newTables'].".\n");
    exit(0);
}catch(Throwable $e){
    // No DB error, directory paths, backup names or passwords in logs.
    fwrite(STDERR,"JREI-LM additive schema not approved or not ready.\n");
    exit(1);
}
