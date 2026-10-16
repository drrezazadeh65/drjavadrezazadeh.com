<?php
declare(strict_types=1);
// Isolated source contract fixture. No database, HTTP requests, user cookies or host secrets.
putenv('JHELA_SOURCE_TEST=1');
define('BERTINA_API_BOOTSTRAPPED', true);
require_once dirname(__DIR__).'/api/operations-jhela.php';
function ensureJhela(bool $condition,string $message): void {
    if (!$condition) { fwrite(STDERR,"JHELA maturity source contract FAIL: ".$message."\n"); exit(1); }
}
$result=operationsJhelaSnapshot();
ensureJhela(($result['ok']??null)===true,'no response');
ensureJhela(($result['schema']??'')==='jhela-owner-maturity-snapshot-v1','wrong schema');
ensureJhela(($result['ojs']['submissions']??'')==='closed','submission should remain closed');
ensureJhela(($result['ojs']['realManuscriptCounts']??'notnull')===null,'unknown real article counts must be null');
ensureJhela(($result['capacity']['installedVerified']??true)===false,'extra 5GB cannot be presumed installed');
ensureJhela(($result['evidenceReview']['progressPercent']??'notnull')===null,'no invented progress percent');
ensureJhela(count($result['scientificMilestones']??[])===10,'ten scholarly phases required');
ensureJhela(count($result['infrastructureTiers']??[])===4,'four architecture tiers required');
ensureJhela(($result['evidenceReview']['verifiedStageCount']??-1)===0,'no invented verified gates');
ensureJhela(count($result['verifiedIndexClaims']??[])===0,'no invented indexing');
ensureJhela(!isset($result['manuscripts'])&&!isset($result['reviewerNames']),'no confidential manuscript data in output');
echo "JHELA MFA snapshot source contract: 10 unverified scholarly gates; four tiers; no sensitive records; no fake OJS launch. PASS\n";
