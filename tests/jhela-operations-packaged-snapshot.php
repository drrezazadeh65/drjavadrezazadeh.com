<?php
declare(strict_types=1);
// Verify exactly the packaged and protected production projection — no private host or OJS connection.
putenv('JHELA_SOURCE_TEST');
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/.public-site/api/operations-jhela.php';
$report=operationsJhelaSnapshot();
if (($report['schema']??null)!=='jhela-owner-maturity-snapshot-v1'
    || count($report['scientificMilestones']??[])!==10
    || count($report['infrastructureTiers']??[])!==4
    || ($report['ojs']['submissions']??null)!=='closed'
    || ($report['evidenceReview']['verifiedStageCount']??-1)!==0) {
   fwrite(STDERR,"JHELA packaged private snapshot mismatch\n");exit(1);
}
echo "JHELA protected production-package projection PASS: without manuscripts or OJS credentials\n";
