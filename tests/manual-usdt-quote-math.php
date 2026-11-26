<?php
declare(strict_types=1);
require __DIR__.'/../api/manual-usdt-quote-math.php';
function eq(mixed $actual,mixed $expected): void {
    if($actual!==$expected)throw new RuntimeException('Mismatch: '.json_encode([$actual,$expected]));
}
function rejects(callable $f): void {
    try{$f();}catch(InvalidArgumentException $e){return;}
    throw new RuntimeException('Invalid input was accepted');
}
$x=jrUsdtQuoteMath(100000,'1000000',1000,1001);
eq($x['amount_usdt'],'1.000000');
eq($x['token_base_units'],'1000000000000000000');
eq($x['issued'],false);
$x=jrUsdtQuoteMath(1,'3000000',1000,1120);
eq($x['amount_usdt'],'0.000004');
eq($x['token_base_units'],'4000000000000');
rejects(fn()=>jrUsdtQuoteMath(1,'3000000',1000,1121));
rejects(fn()=>jrUsdtQuoteMath(1,'3000000',1001,1000));
rejects(fn()=>jrUsdtQuoteMath(0,'1000000',1000,1000));
rejects(fn()=>jrUsdtQuoteMath(1,'1e6',1000,1000));
rejects(fn()=>jrUsdtQuoteMath(1,'1000000.1',1000,1000));
rejects(fn()=>jrUsdtQuoteMath(900000000001,'1000000',1000,1000));
$x=jrUsdtQuoteMath(900000000000,'1000',1000,1000);
eq($x['amount_usdt'],'9000000000.000000');
echo "Exact quote arithmetic, 18-decimal token units, freshness and bounds: PASS\n";

rejects(fn()=>jrUsdtRequireMinimumDeposit('0.099999'));
rejects(fn()=>jrUsdtRequireMinimumDeposit('0.000000'));
rejects(fn()=>jrUsdtRequireMinimumDeposit('0.1'));
jrUsdtRequireMinimumDeposit('0.100000');
jrUsdtRequireMinimumDeposit('1.000000');
echo "Documented minimum deposit checks: PASS\n";
