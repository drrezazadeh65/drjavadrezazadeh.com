<?php
declare(strict_types=1);
/** Exact quote arithmetic; no wallet, provider access, or order mutation.
 * Inputs must come from an independently verified market side and canonical
 * persisted IRT amount. A calculated amount is NOT an issued payment quote.
 * Binance-Peg BSC-USD has 18 token decimals; merchant quote uses 6 decimals.
 */
function jrUsdtQuoteMath(int $toman, string $irrPerToken, int $observedAt, int $now): array {
    if(PHP_INT_SIZE!==8 || $toman<1 || $toman>900000000000)
        throw new InvalidArgumentException('invalid_order_amount');
    if(!preg_match('/^[1-9][0-9]{3,9}$/D',$irrPerToken))
        throw new InvalidArgumentException('invalid_exact_irr_rate');
    if($observedAt<=0 || $now<$observedAt || $now-$observedAt>120)
        throw new InvalidArgumentException('rate_not_fresh');
    $rate=(int)$irrPerToken;
    $n=$toman*10000000;
    $micro=intdiv($n,$rate)+(($n%$rate)!==0?1:0);
    $amount=intdiv($micro,1000000).'.'.str_pad((string)($micro%1000000),6,'0',STR_PAD_LEFT);
    return ['amount_toman'=>$toman,'rate_irr'=>$irrPerToken,'amount_usdt'=>$amount,
      'token_base_units'=>(string)$micro.'000000000000','chain_id'=>56,
      'token_decimals'=>18,'quote_decimals'=>6,'observed_at'=>$observedAt,
      'rounding'=>'CEILING','issued'=>false];
}

/** Validate the current documented deposit floor before issuing a quote.
 * Do not silently round a smaller invoice up to the exchange minimum.
 * Reconfirm provider limits before production; this is a source policy floor.
 */
function jrUsdtRequireMinimumDeposit(string $amountUsdt): void {
    if(!preg_match('/^(0|[1-9][0-9]{0,12})\.([0-9]{6})$/D',$amountUsdt,$m))
        throw new InvalidArgumentException('invalid_usdt_quote_format');
    if($m[1]==='0' && (int)$m[2]<100000)
        throw new InvalidArgumentException('below_exchange_deposit_minimum');
}
