<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED', true);
require_once dirname(__DIR__).'/api/jrei-self-improvement-proposals.php';
function ensure(bool $condition, string $message): void {
    if (!$condition) { fwrite(STDERR, $message."\n"); exit(1); }
}
ensure(jrJreiProposeImprovements([]) === [], 'empty metrics must not create proposals');
ensure(jrJreiProposeImprovements(['schema_errors'=>'999']) === [], 'untrusted string counts rejected');
$items=jrJreiProposeImprovements(['schema_errors'=>1,'download_failures'=>5,'unverified_claims'=>49]);
ensure(count($items)===2, 'only threshold-matching evidence produces proposals');
foreach ($items as $item) {
    ensure($item['state']==='PROPOSED_NOT_EXECUTED', 'no self-execution');
    ensure($item['requires_review']===true && $item['requires_tests']===true, 'gates retained');
}
echo "JREI improvement proposal checks passed\n";
