<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED', true);
require_once __DIR__ . '/../api/internal/jr-publishing-allocations.php';
function jrAssert(bool $value, string $message): void { if (!$value) throw new RuntimeException($message); }

$s = jrPublishingGrossAllocation(1000000, 6000, 4000);
jrAssert($s === ['gross_toman'=>1000000, 'author_toman'=>600000, 'talent_fund_toman'=>400000], 'mirkarimi split');
jrAssert(jrPublishingAllocationBalances(1000000,600000,400000), 'paid split ledger balance');
jrAssert(jrPublishingAllocationBalances(-1000000,-600000,-400000), 'refund reversal ledger balance');
jrAssert(!jrPublishingAllocationBalances(1000000,700000,400000), 'reject overallocation');
jrAssert(!jrPublishingAllocationBalances(1000000,-600000,1600000), 'reject opposite sign');
jrAssert(jrPublishingGrossAllocation(1,6000,4000) === ['gross_toman'=>1,'author_toman'=>0,'talent_fund_toman'=>1], 'deterministic remainder');
jrAssert(jrPublishingAuthorAllocation(600000,['author-b'=>3000,'author-a'=>7000]) === ['author-a'=>420000,'author-b'=>180000], 'multi-author split');
jrAssert(array_sum(jrPublishingAuthorAllocation(1,['author-a'=>5000,'author-b'=>5000]))===1, 'minimum author sum');
try {
    jrPublishingGrossAllocation(1000000,6000,5000);
    throw new RuntimeException('must reject unbalanced bps');
} catch (InvalidArgumentException $e) { /* expected */ }
try {
    jrPublishingAuthorAllocation(600000,['a'=>6000,'b'=>3000]);
    throw new RuntimeException('must reject missing author share');
} catch (InvalidArgumentException $e) { /* expected */ }

$operating = jrPublishingGrossWithOperatingReserve(1000000, 6000, 4000, 700);
jrAssert($operating['author_toman']===600000, 'operating reserve must not reduce author');
jrAssert($operating['talent_fund_toman']===400000, 'operating reserve must not reduce fund');
jrAssert($operating['operating_reserve_toman']===70000, '7 percent operating reserve');
jrAssert($operating['platform_funding_required_toman']===70000, 'fund reserve externally');
jrAssert($operating['total_cost_and_entitlements_toman']===1070000, 'total obligations 107 percent');
jrAssert(jrPublishingGrossWithOperatingReserve(1000000, 6000, 4000, 0)['total_cost_and_entitlements_toman']===1000000,'zero overhead supported');
jrAssert(jrPublishingGrossWithOperatingReserve(1000000, 6000, 4000, 700)['gross_toman']===1000000,'customer price unchanged');
try {
  jrPublishingGrossWithOperatingReserve(1000000, 6000, 4000, 11000);
  throw new RuntimeException('must reject invalid overhead rate');
} catch (InvalidArgumentException $e) { /* expected */ }

echo "JR future publishing math: all source-only assertions passed\n";
