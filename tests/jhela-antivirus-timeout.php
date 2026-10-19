<?php
declare(strict_types=1);
/*
 * JHELA AV process acceptance: harmless isolated CLI commands ONLY.
 * No real manuscript, ClamAV signatures, provider secrets, or Bertina storage.
 */
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/jhela-intake.php';
function avAssert(bool $condition,string $name): void {
 if(!$condition){fwrite(STDERR,"FAIL ".$name."\n");exit(1);}
 echo "PASS ".$name."\n";
}
$php=PHP_BINARY;
avAssert(jhelaRunBoundedProcess([$php,'-r','exit(0);'],5.0)===0,
 'clean_process_return_code');
avAssert(jhelaRunBoundedProcess([$php,'-r','exit(1);'],5.0)===1,
 'nonzero_process_detected');
$start=microtime(true);$timeout=false;
try {jhelaRunBoundedProcess([$php,'-r','sleep(3);'],0.2);}
catch(RuntimeException $e){$timeout=$e->getMessage()==='antivirus_timeout';}
$elapsed=microtime(true)-$start;
avAssert($timeout && $elapsed<2.0,'hung_scanner_terminated_within_deadline');
$badArg=false;
try {jhelaRunBoundedProcess([$php,'-r',str_repeat('A',3)."\0"],0.2);}
catch(RuntimeException $e){$badArg=$e->getMessage()==='antivirus_invalid_argument';}
avAssert($badArg,'null_byte_argument_rejected_without_launch');
$badBudget=false;
try {jhelaRunBoundedProcess([$php,'-r','exit(0);'],70.0);}
catch(RuntimeException $e){$badBudget=$e->getMessage()==='antivirus_runner_unavailable';}
avAssert($badBudget,'unbounded_scan_budget_rejected');
echo "JHELA fail-closed PDF scanner process fixture complete.\n";
