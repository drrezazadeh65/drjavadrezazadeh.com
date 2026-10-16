<?php
declare(strict_types=1);
/**
 * Optional read-only Ramzinex deposit evidence adapter.
 * NEVER include API credentials in Git, HTML, logs, browser JS or user records.
 * Requires independently rotated credentials in server-only secret config.
 * Read access supplies advisory candidate evidence, NOT payment verification.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
function jrRamzinexReadOnlyReady(): bool {
    return getenv('JR_RAMZINEX_READONLY_ENABLED')==='true'
        && strlen((string)getenv('JR_RAMZINEX_RO_BEARER'))>=20
        && strlen((string)getenv('JR_RAMZINEX_RO_API_KEY'))>=16
        && function_exists('curl_init');
}
/** Only this fixed deposit-history GET is allowed. No general proxy, auth, trading, withdrawals or account mutation. */
function jrRamzinexReadDeposits(): array {
    if (!jrRamzinexReadOnlyReady()) return ['available'=>false,'reason'=>'not_configured'];
    $url='https://ramzinex.com/exchange/api/v1.0/exchange/users/me/funds/deposits?limit=100&offset=0';
    $headers=[
        'Authorization2: Bearer '.(string)getenv('JR_RAMZINEX_RO_BEARER'),
        'x-api-key: '.(string)getenv('JR_RAMZINEX_RO_API_KEY'),
        'Accept: application/json',
    ];
    $ch=curl_init($url);
    if($ch===false)return ['available'=>false,'reason'=>'transport_unavailable'];
    curl_setopt_array($ch,[
        CURLOPT_HTTPGET=>true,CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_HTTPHEADER=>$headers,CURLOPT_TIMEOUT=>9,CURLOPT_CONNECTTIMEOUT=>4,
        CURLOPT_FOLLOWLOCATION=>false,CURLOPT_SSL_VERIFYPEER=>true,
        CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_MAXREDIRS=>0,
        CURLOPT_USERAGENT=>'JR-Bertina-RO-Deposit-Reconciliation/1',
    ]);
    $body=curl_exec($ch);$http=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);curl_close($ch);
    if(!is_string($body)||strlen($body)>300000||$http!==200)return ['available'=>false,'reason'=>'provider_unavailable'];
    try{$data=json_decode($body,true,32,JSON_THROW_ON_ERROR);}
    catch(Throwable $e){return ['available'=>false,'reason'=>'invalid_provider_response'];}
    if(!is_array($data))return ['available'=>false,'reason'=>'invalid_provider_response'];
    // Provider shapes vary by API generation; do not infer non-matching fields.
    foreach([ $data['data']['results']??null, $data['data']['list']??null,
              $data['data']['items']??null, $data['data']??null ] as $items){
        if(is_array($items) && array_is_list($items))
            return ['available'=>true,'items'=>array_slice($items,0,100)];
    }
    return ['available'=>false,'reason'=>'unrecognized_provider_schema'];
}
function jrRamzinexFindDepositEvidence(string $hash): array {
    if(!preg_match('/^0x[a-f0-9]{64}$/D',strtolower($hash)))return ['state'=>'invalid_claim_hash'];
    $data=jrRamzinexReadDeposits();
    if(!$data['available'])return ['state'=>'unavailable','reason'=>$data['reason']];
    $needle=strtolower($hash);
    foreach($data['items'] as $row){
        if(!is_array($row))continue;
        // Match ONLY exact transaction hash fields, not arbitrary nested free text.
        foreach(['tx_hash','txHash','transactionHash','transaction_hash','hash','txid','txId'] as $key){
            $candidate=$row[$key]??null;
            if(is_string($candidate)&&hash_equals($needle,strtolower($candidate))){
                return ['state'=>'candidate_found','source'=>'ramzinex_deposits_readonly',
                    'note'=>'An exact hash occurs in the exchange history. Chain, token, recipient, settlement and amount still require manual checking.'];
            }
        }
    }
    return ['state'=>'not_found_in_recent_sample','source'=>'ramzinex_deposits_readonly',
        'note'=>'Recent exchange history has no exact hash match; pagination, indexing delay and API schema can cause omissions.'];
}
