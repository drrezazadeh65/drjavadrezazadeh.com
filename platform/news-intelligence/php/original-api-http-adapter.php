<?php
declare(strict_types=1);
/**
 * Staged bridge for the EXISTING api/index.php request/router lifecycle.
 * No new public route is mounted by including this file.
 *
 * Original app supplies identity, owner MFA, release context and trusted
 * source/eco/CMS callbacks. User headers or JSON cannot assert any of these.
 * Existing respond()/fail(), session cookie and central audit are reused.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/news-library.php';

function jrNewsOriginalRequestBody(string $method,
    array $originalServer,array $queryArguments,
    ?string $postedRawJson
): array {
    if($method==='GET'){
        if(strlen((string)($originalServer['QUERY_STRING']??''))>1800)
            throw new InvalidArgumentException('news_query_bytes_exceed_limit');
        $allowed=[
            'q','language','category','country','after','before','revisionId'
        ];
        $result=[];
        foreach($queryArguments as $key=>$value){
            if(!is_string($key)||!in_array($key,$allowed,true)||
                !is_string($value)||strlen($value)>260) {
                throw new InvalidArgumentException('news_query_parameter_invalid');
            }
            $result[$key]=$value;
        }
        return $result;
    }
    if($method!=='POST')throw new InvalidArgumentException('news_unsupported_method');
    $type=strtolower(trim(explode(';',(string)
        ($originalServer['CONTENT_TYPE']??''))[0]));
    if($type!=='application/json'||!is_string($postedRawJson)||
        strlen($postedRawJson)>32768||
        strlen($postedRawJson)<2) {
        throw new InvalidArgumentException('news_json_request_invalid');
    }
    $json=json_decode($postedRawJson,true,24,
        JSON_THROW_ON_ERROR|JSON_INVALID_UTF8_SUBSTITUTE);
    if(!is_array($json)||array_is_list($json)) {
        throw new InvalidArgumentException('news_body_object_required');
    }
    return $json;
}

/**
 * The original application's source-owned trusted resolvers perform all
 * verification server-side. No session flags come from request parameters.
 */
function jrNewsPrepareOriginalApiContext(
    string $method,string $route,array $server,
    callable $originalCustomerSessionResolver,
    callable $originalOwnerMfaResolver,
    callable $originalReleaseVerifier
): array {
    if(!preg_match('#^/news/v1/(?:[a-z-]+/){0,4}[a-z-]+$#D',$route))
        throw new InvalidArgumentException('news_api_route_invalid');
    if(!in_array($method,['GET','POST'],true))
        throw new InvalidArgumentException('news_api_verb_not_supported');
    if($method==='POST'){
        // Both checks mirror the existing original operations POST policy.
        if(($server['HTTP_ORIGIN']??null)!==
            'https://drjavadrezazadeh.com' ||
            !in_array($server['HTTP_SEC_FETCH_SITE']??'same-origin',
                ['same-origin','none'],true)) {
            throw new RuntimeException('news_original_same_origin_required');
        }
    }
    $release=$originalReleaseVerifier($method,$route);
    if(!is_array($release) ||
        ($release['source']??null)!=='ORIGINAL_BERTINA_OPERATIONS_RELEASE'||
        ($release['finalIntegratedAcceptanceVerified']??null)!==true||
        ($release['ownerAuthorizedActivation']??null)!==true) {
        throw new RuntimeException('news_original_release_authorization_missing');
    }
    $ownerRoute=str_starts_with($route,'/news/v1/owner/');
    $identityRoute=$ownerRoute ||
        str_starts_with($route,'/news/v1/preferences') ||
        str_starts_with($route,'/news/v1/exam/');
    $customer=[];
    if($identityRoute && !$ownerRoute) {
        $customer=$originalCustomerSessionResolver($server,$method);
        if(!is_array($customer) ||
            ($customer['source']??null)!==
                'ORIGINAL_BERTINA_CUSTOMER_AUTH'||
            ($customer['sessionVerified']??null)!==true||
            ($customer['emailVerified']??null)!==true||
            ($customer['csrfVerified']??null)!==true||
            !preg_match('/^[a-f0-9-]{36}$/iD',
                (string)($customer['accountId']??''))) {
            throw new RuntimeException('news_original_customer_session_missing');
        }
    }
    $ownerSession=null;
    if($ownerRoute){
        $ownerSession=$originalOwnerMfaResolver($server,$method);
        if(!is_array($ownerSession)) {
            throw new RuntimeException('news_original_owner_mfa_unavailable');
        }
        jrNewsOwnerAuthority($ownerSession);
    }
    return [
        'originalApiBootstrap'=>true,
        'finalIntegratedAcceptanceVerified'=>true,
        'ownerAuthorizedActivation'=>true,
        'existingOwnerMfaSession'=>$ownerSession,
        'customerSessionVerified'=>$identityRoute&&!$ownerRoute,
        'csrfVerified'=>$identityRoute&&!$ownerRoute,
        'emailVerified'=>$identityRoute&&!$ownerRoute,
        'sessionSource'=>$identityRoute&&!$ownerRoute?
            'EXISTING_BERTINA_CUSTOMER_SESSION':null,
        'accountId'=>$identityRoute&&!$ownerRoute?
            $customer['accountId']:null
    ];
}

/**
 * A return value, not a new HTTP response manager; original api/index.php
 * owns final response, errors, headers, compression and privacy policy.
 */
function jrNewsHandleExistingBertinaRequest(
    PDO $pdo,string $method,string $route,
    array $originalServer,array $queryArguments,?string $rawJson,
    array $originalPorts
): array {
    foreach([
        'originalCustomerSessionResolver','originalOwnerMfaResolver',
        'originalReleaseVerifier','originalEcoConsentResolver',
        'originalPublicReadRateLimiter','originalJreiSourceCurrentResolver',
        'originalEcoNewsSuppressor'
    ] as $key) {
        if(!is_callable($originalPorts[$key]??null))
            throw new RuntimeException('news_original_required_port_missing_'.$key);
    }
    $body=jrNewsOriginalRequestBody($method,$originalServer,
        $queryArguments,$rawJson);
    $context=jrNewsPrepareOriginalApiContext(
        $method,$route,$originalServer,
        $originalPorts['originalCustomerSessionResolver'],
        $originalPorts['originalOwnerMfaResolver'],
        $originalPorts['originalReleaseVerifier']
    );
    // Never merge client fields into ownerIntegrationPorts.
    $trustedOptional=[];
    foreach([
        'originalExamSourceRecheck','originalCmsAndSourcePolicy',
        'originalVerifiedOwnerMailbox','originalEcoPrivateOutbox',
        'originalEcoReminderSuppressor'
    ] as $name) {
        if(is_callable($originalPorts[$name]??null))
            $trustedOptional[$name]=$originalPorts[$name];
    }
    return jrNewsDispatchApi(
        $pdo,$method,$route,$body,$context,
        $originalPorts['originalEcoConsentResolver'],
        $originalPorts['originalPublicReadRateLimiter'],
        $originalPorts['originalJreiSourceCurrentResolver'],
        $originalPorts['originalEcoNewsSuppressor'],
        $trustedOptional
    );
}
