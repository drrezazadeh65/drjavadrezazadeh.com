<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/operations-alerts.php';
require_once __DIR__.'/../api/operations-source-controls.php';
require_once __DIR__.'/../api/operations-response-monitor.php';
require_once __DIR__.'/../api/operations-http-log.php';

function expectOps(bool $condition,string $explanation): void {
    if(!$condition)throw new RuntimeException($explanation);
}
expectOps(count(operationsResponseProbes())===7,'probe count drift');
foreach(operationsResponseProbes() as $probe) {
    expectOps(str_starts_with($probe['path'],'/'),'probes must be local');
}
$pass=operationsResponseEvaluate(['kind'=>'headers','expected'=>200],[
    'code'=>200,'headers'=>[
        'x-frame-options'=>'DENY','x-content-type-options'=>'nosniff',
        'referrer-policy'=>'strict-origin-when-cross-origin',
        'permissions-policy'=>'camera=(), microphone=(), geolocation=()'
    ]]);
expectOps($pass['result']==='pass','mandatory header baseline should pass');
expectOps($pass['details']['advisory']['content_security_policy']===false,
    'absent CSP must remain an explicitly missing advisory');
$cspPass=operationsResponseEvaluate(['kind'=>'headers','expected'=>200],[
    'code'=>200,'headers'=>[
        'content-security-policy'=>"default-src 'self'; frame-ancestors 'none'",
        'x-content-type-options'=>'nosniff',
        'referrer-policy'=>'strict-origin-when-cross-origin',
        'permissions-policy'=>'geolocation=()'
    ]]);
expectOps($cspPass['result']==='pass',
    'restrictive CSP frame-ancestors must count as X-Frame-Options alternative');
$cspFail=operationsResponseEvaluate(['kind'=>'headers','expected'=>200],[
    'code'=>200,'headers'=>[
        'content-security-policy'=>"default-src 'self'; frame-ancestors https://example.invalid",
        'x-content-type-options'=>'nosniff',
        'referrer-policy'=>'strict-origin-when-cross-origin',
        'permissions-policy'=>'geolocation=()'
    ]]);
expectOps($cspFail['result']==='fail',
    'untrusted frame-ancestors must not pass mandatory protection');
$failed=operationsResponseEvaluate(['kind'=>'redirect','expected'=>301,
    'location'=>'https://drjavadrezazadeh.com/'],[
        'code'=>301,'headers'=>['location'=>'https://attacker.example/']]);
expectOps($failed['result']==='fail','unexpected redirect destinations must fail');
$unavailable=operationsResponseEvaluate(['kind'=>'headers','expected'=>200],[
    'code'=>null,'headers'=>[],'error'=>'timeout']);
expectOps($unavailable['result']==='unavailable','unobserved is not healthy');
$route=operationsHttpRoute('/%D8%A8%D9%87%D8%A7%D8%B1/?utm_source=secret');
expectOps(is_array($route)&&$route['path']==='/بهار/','Persian slug should be normalized without query');
expectOps(operationsHttpRoute('/api/payment/return?code=secret')===null,
    'private operational routes must not be logged as public SEO candidates');
$log=operationsHttpParse('127.0.0.1 - - [22/Oct/2026:16:25:32 +0330] "GET /missing-page/ HTTP/1.1" 404 175');
expectOps($log!==null&&$log['status']===404&&$log['route']['path']==='/missing-page/',
    'a regular access-log 404 must be parsed without storing visitor identity');
expectOps(operationsHttpParse('127.0.0.1 - - [22/Oct/2026:16:25:32 +0330] "GET / HTTP/1.1" 200 175')!==null,
    'successful responses are needed to confirm recovery');
$scopes=operationsAlertIncidentScopes('redirects_regressed','historical_redirects');
expectOps($scopes===['engine:ENG-01','feature:redirect-301-410'],
    'redirect incident should inherit from ENG-01 and the redirect feature');
$next=operationsSourceNextDue('daily',1,210,strtotime('2026-10-22T00:00:00Z'));
expectOps($next>strtotime('2026-10-22T00:00:00Z'),'daily scheduling must be in future');
echo "Administrative health, response evaluation, incident inheritance and retention policy contracts passed.\n";
