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
ensureJhela(($result['editorial']['submissionPolicy']??'')==='CONDITIONAL_ON_LIVE_HOST','submission must be conditional on live host');
ensureJhela(array_key_exists('realManuscriptCounts',$result['editorial']) && $result['editorial']['realManuscriptCounts']===null,'unknown real article counts must be null');
ensureJhela(($result['capacity']['installedVerified']??true)===false,'extra 5GB cannot be presumed installed');
ensureJhela(array_key_exists('progressPercent',$result['evidenceReview']) && $result['evidenceReview']['progressPercent']===null,'no invented progress percent');
ensureJhela(count($result['scientificMilestones']??[])===10,'ten scholarly phases required');
ensureJhela(count($result['infrastructureTiers']??[])===4,'four architecture tiers required');
ensureJhela(($result['evidenceReview']['verifiedStageCount']??-1)===0,'no invented verified gates');
ensureJhela(count($result['verifiedIndexClaims']??[])===0,'no invented indexing');
ensureJhela(!isset($result['manuscripts'])&&!isset($result['reviewerNames']),'no confidential manuscript data in output');
echo "JHELA MFA snapshot source contract: 10 unverified scholarly gates; four tiers; no sensitive records; no unverified journal launch. PASS\n";
