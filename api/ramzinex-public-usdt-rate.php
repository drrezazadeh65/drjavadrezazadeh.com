<?php
declare(strict_types=1);
/**
 * Public, credential-free Ramzinex USDT/IRR pair 11 reader.
 * Indicative DISPLAY only; never use the returned tick as an issued invoice,
 * an executable payment quote or proof of fiat/crypto settlement.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

function jrPublicUsdtRateNormalize(array $payload): array {
    if (($payload['status'] ?? null) !== 0) throw new RuntimeException('invalid_market_status');
    $pair=$payload['data']??null;
    if(!is_array($pair) || array_is_list($pair))throw new RuntimeException('missing_market_pair');
    // Reject malformed provider fields instead of PHP's permissive casts:
    // (int) "9oops" === 9 and (int) "unknown" === 0.
    $providerInt=static function(mixed $raw,int $expected): bool {
        return (is_int($raw) && $raw===$expected) ||
            (is_string($raw) && $raw===(string)$expected);
    };
    if(!$providerInt($pair['pair_id']??null,11) ||
       !$providerInt($pair['base_currency_id']??null,9) ||
       !$providerInt($pair['quote_currency_id']??null,2) ||
       strtolower((string)($pair['base_currency_symbol']['en']??''))!=='usdt' ||
       strtolower((string)($pair['quote_currency_symbol']['en']??''))!=='irr' ||
       !$providerInt($pair['is_delist']??null,0) ||
       !$providerInt($pair['is_temporarily_suspended']??null,0))
        throw new RuntimeException('untrusted_pair_or_unit');

    $numbers=[];
    foreach(['buy','sell'] as $side){
        $raw=$pair[$side]??null;
        if(!is_int($raw)&&!is_float($raw)&&!is_string($raw))throw new RuntimeException('invalid_rate_type');
        $value=(string)$raw;
        if(!preg_match('/^[0-9]{1,12}(?:\.[0-9]{1,6})?$/D',$value))throw new RuntimeException('invalid_rate_format');
        $irr=(float)$value;
        if(!is_finite($irr)||$irr<1000||$irr>10000000000)throw new RuntimeException('invalid_rate_bounds');
        // This is DISPLAY precision only. Monetary quotes use a separate
        // server-issued versioned decimal/rational calculation and ledger.
        $numbers[$side.'IRR']=$irr;
        $numbers[$side.'Toman']=$irr/10;
    }
    return [
      'source'=>'Ramzinex public USDT/IRR market','pairId'=>11,
      'base'=>'USDT','quote'=>'IRR','localUnit'=>'toman',
      'buyIRR'=>$numbers['buyIRR'],'sellIRR'=>$numbers['sellIRR'],
      'buyToman'=>$numbers['buyToman'],'sellToman'=>$numbers['sellToman'],
      'indicativeOnly'=>true,'isUsdFiatRate'=>false,'paymentQuote'=>false,
      'receivedAt'=>gmdate('c')
    ];
}

/**
 * Exact integer arithmetic for a FUTURE server-issued payment quote.
 * Not a quote issuer: rate side, freshness, owner approval, database binding,
 * wallet and payment verification must be checked independently.
 *
 * A toman is ten IRR; USDT uses six decimal places. A ceiling prevents
 * under-quoting caused by fractional micro-USDT. Never use JS floats for money.
 * The strict 64-bit bound avoids overflow without assuming BCMath/GMP hosting.
 */
function jrUsdtExactMicrosFromIrr(int $amountToman, string $irrPerUsdt): array {
    if(PHP_INT_SIZE<8 || $amountToman<1 || $amountToman>900000000000)
        throw new InvalidArgumentException('toman_amount_out_of_bounds');
    if(!preg_match('/^[1-9][0-9]{3,9}$/D',$irrPerUsdt))
        throw new InvalidArgumentException('rate_irr_not_precise_integer');
    $rate=(int)$irrPerUsdt;
    if($rate<1000 || $rate>9999999999)
        throw new InvalidArgumentException('rate_irr_out_of_bounds');
    // Max numerator = 9e18, strictly below PHP_INT_MAX on 64-bit PHP.
    $numerator=$amountToman*10000000;
    $micros=intdiv($numerator,$rate)+(($numerator%$rate)!==0?1:0);
    if($micros<1)throw new InvalidArgumentException('amount_below_micro_usdt');
    $formatted=intdiv($micros,1000000).'.'.str_pad((string)($micros%1000000),6,'0',STR_PAD_LEFT);
    return [
        'amountUsdt'=>$formatted,
        'amountMicros'=>$micros,
        'rateIrrPerUsdt'=>$irrPerUsdt,
        'rounding'=>'CEIL_TO_6_DECIMALS',
        'isIssuedPaymentQuote'=>false
    ];
}

function jrReadPublicUsdtRate(): array {
    $cacheKey='jr-public-ramzinex-usdt-irr-pair11-v1';
    if(function_exists('apcu_fetch')){
        $hit=false;$stored=apcu_fetch($cacheKey,$hit);
        if($hit&&is_array($stored)&&($stored['pairId']??null)===11)return $stored;
    }
    if(!function_exists('curl_init'))throw new RuntimeException('rate_transport_unavailable');
    $url='https://publicapi.ramzinex.com/exchange/api/v1.0/exchange/pairs/11';
    $ch=curl_init($url);
    if($ch===false)throw new RuntimeException('rate_transport_unavailable');
    curl_setopt_array($ch,[
        CURLOPT_HTTPGET=>true,CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>7,
        CURLOPT_FOLLOWLOCATION=>false,CURLOPT_SSL_VERIFYPEER=>true,
        CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_MAXREDIRS=>0,
        CURLOPT_USERAGENT=>'JR-Ramzinex-PublicMarket-Rate/1.0',
        CURLOPT_HTTPHEADER=>['Accept: application/json']
    ]);
    $body=curl_exec($ch);
    $status=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);
    $type=(string)curl_getinfo($ch,CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    if(!is_string($body)||strlen($body)>15000||$status!==200||
       stripos($type,'json')===false)throw new RuntimeException('market_source_unavailable');
    try{$payload=json_decode($body,true,20,JSON_THROW_ON_ERROR);}
    catch(Throwable $e){throw new RuntimeException('invalid_market_json');}
    if(!is_array($payload))throw new RuntimeException('invalid_market_json');
    $normalized=jrPublicUsdtRateNormalize($payload);
    if(function_exists('apcu_store'))apcu_store($cacheKey,$normalized,20);
    return $normalized;
}

function jrPublicUsdtRateRoute(string $verb): never {
    header('Cache-Control: public, max-age=10, must-revalidate');
    if($verb!=='GET')fail('method_not_allowed',405);
    try{
        $tick=jrReadPublicUsdtRate();
        respond(['ok'=>true,'schema'=>'ramzinex-usdt-irr-indicative-v1','rate'=>$tick]);
    }catch(Throwable $e){
        error_log('Public market rate unavailable: '.get_class($e));
        fail('public_market_rate_unavailable',503);
    }
}
