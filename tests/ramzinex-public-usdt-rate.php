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
echo "Public display rate normalization: synthetic checks passed. No payment authorised.\n";
