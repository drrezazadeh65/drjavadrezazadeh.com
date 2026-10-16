<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/ramzinex-readonly.php';
function ensure(bool $ok,string $label): void {
    if(!$ok){fwrite(STDERR,"FAIL ".$label."\n");exit(1);}
    echo "PASS ".$label."\n";
}
$hash='0x'.str_repeat('a',64);
$upper='0x'.str_repeat('A',64);
ensure(jrRamzinexMatchEvidenceRows($hash,[['tx_hash'=>$upper]])['state']==='candidate_found','exact hash match is case-insensitive');
ensure(jrRamzinexMatchEvidenceRows($hash,[['tx_hash'=>'0x'.str_repeat('b',64)]])['state']==='not_found_in_recent_sample','different hash never matches');
ensure(jrRamzinexMatchEvidenceRows($hash,[['note'=>"prefix $hash suffix"]])['state']==='not_found_in_recent_sample','free-text containing hash never counts as evidence');
ensure(jrRamzinexMatchEvidenceRows('123',[['tx_hash'=>'123']])['state']==='invalid_claim_hash','invalid hash never matches');
ensure(jrRamzinexMatchEvidenceRows($hash,[])['state']==='not_found_in_recent_sample','empty history is not a successful transaction');
putenv('JR_RAMZINEX_READONLY_ENABLED=false');
ensure(jrRamzinexReadDeposits()['available']===false,'disabled provider makes no private API request');
putenv('JR_RAMZINEX_READONLY_ENABLED');
echo "Ramzinex strictly advisory read-only fixtures passed.\n";
