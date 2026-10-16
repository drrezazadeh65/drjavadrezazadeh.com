<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/ramzinex-public-usdt-rate.php';

function checkRate(bool $condition,string $label): void {
    if(!$condition){fwrite(STDERR,"FAIL ".$label."\n");exit(1);}
    echo "PASS ".$label."\n";
}
$fixture=['status'=>0,'data'=>[
    'pair_id'=>11,'base_currency_id'=>9,'quote_currency_id'=>2,
    'base_currency_symbol'=>['en'=>'usdt','fa'=>'تتر'],
    'quote_currency_symbol'=>['en'=>'irr','fa'=>'ریال'],
    'buy'=>2630013,'sell'=>2632860,
    'is_delist'=>0,'is_temporarily_suspended'=>0
]];
$t=jrPublicUsdtRateNormalize($fixture);
checkRate($t['pairId']===11&&$t['base']==='USDT'&&$t['quote']==='IRR','strict token and market identity');
checkRate($t['buyToman']===263001.3 && $t['sellToman']===263286.0,'rial divided by ten exactly once');
checkRate($t['indicativeOnly']===true&&$t['paymentQuote']===false&&$t['isUsdFiatRate']===false,'display never becomes an executable quote');
$mutations=[
 'wrong market'=>static function(array &$p):void {$p['data']['pair_id']=12;},
 'pair id with trailing junk'=>static function(array &$p):void {$p['data']['pair_id']='11garbage';},
 'base id with trailing junk'=>static function(array &$p):void {$p['data']['base_currency_id']='9garbage';},
 'quote id with trailing junk'=>static function(array &$p):void {$p['data']['quote_currency_id']='2garbage';},
 'delist status unknown'=>static function(array &$p):void {$p['data']['is_delist']='unknown';},
 'suspension status unknown'=>static function(array &$p):void {$p['data']['is_temporarily_suspended']='unknown';},
 'wrong base currency'=>static function(array &$p):void {$p['data']['base_currency_symbol']['en']='btc';},
 'wrong quote currency'=>static function(array &$p):void {$p['data']['quote_currency_symbol']['en']='irt';},
 'market delisted'=>static function(array &$p):void {$p['data']['is_delist']=1;},
 'market suspended'=>static function(array &$p):void {$p['data']['is_temporarily_suspended']=1;},
 'no buy price'=>static function(array &$p):void {$p['data']['buy']=null;},
 'nonnumeric sell price'=>static function(array &$p):void {$p['data']['sell']='wrong';},
 'negative buy'=>static function(array &$p):void {$p['data']['buy']=-1;},
 'wrong exchange response state'=>static function(array &$p):void {$p['status']=9;},
];
foreach($mutations as $label=>$mutator){
  $copy=$fixture;$mutator($copy);$rejected=false;
  try{jrPublicUsdtRateNormalize($copy);}catch(RuntimeException $e){$rejected=true;}
  checkRate($rejected,$label.' fails closed');
}
// Payment-math foundation only: no quote is issued, persisted or payable here.
$exact=jrUsdtExactMicrosFromIrr(263000,'2630000');
checkRate($exact['amountUsdt']==='1.000000'&&$exact['amountMicros']===1000000,'exact whole-USDT conversion');
checkRate($exact['isIssuedPaymentQuote']===false,'amount calculation never grants payable quote');
checkRate(jrUsdtExactMicrosFromIrr(1,'2630000')['amountUsdt']==='0.000004','ceil partial micro-USDT without float');
checkRate(jrUsdtExactMicrosFromIrr(263001,'2630000')['amountUsdt']==='1.000004','ceil at boundary above one USDT');
checkRate(jrUsdtExactMicrosFromIrr(900000000000,'1000')['amountMicros']===9000000000000000,
          '64-bit upper bound without overflow');
foreach([
  [0,'2630000'],[-1,'2630000'],[900000000001,'2630000'],
  [1,'0'],[1,'2630000.3'],[1,'2630000junk'],[1,'99999999999']
] as [$amount,$rate]){
    $rejected=false;
    try{jrUsdtExactMicrosFromIrr($amount,$rate);}catch(InvalidArgumentException $e){$rejected=true;}
    checkRate($rejected,'invalid payable arithmetic is rejected: '.$amount.' / '.$rate);
}
echo "Public display rate normalization: synthetic checks passed. No payment authorised.\n";
