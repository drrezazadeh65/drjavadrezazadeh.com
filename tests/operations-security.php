<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
const SITE_ORIGIN='https://drjavadrezazadeh.com';
const SESSION_COOKIE='drjr_session';
final class OperationsResponse extends RuntimeException {
    public function __construct(public array $payload, public int $status) { parent::__construct('response'); }
}
function respond(array $data,int $status=200): never { throw new OperationsResponse($data,$status); }
function fail(string $code,int $status=400): never { respond(['ok'=>false,'error'=>$code],$status); }
function nowTs(): int { return $GLOBALS['at']; }
function tokenHash(string $raw): string { return hash('sha256',$raw); }
function cfg(): array { return $GLOBALS['configuration']; }
function db(): ?PDO { return $GLOBALS['pdo']; }
function sessionAccount(PDO $pdo): ?array {
    $q=$pdo->prepare('SELECT account_id FROM customer_auth_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?');
    $q->execute([tokenHash((string)($_COOKIE[SESSION_COOKIE]??'')),nowTs()]);$row=$q->fetch();
    if(!$row)return null;$q=$pdo->prepare('SELECT * FROM customer_accounts WHERE id=?');$q->execute([$row['account_id']]);return $q->fetch()?:null;
}
function rateAllowed(PDO $pdo,string $action,string $id,int $max,int $window): bool { return true; }
function jsonBody(): array { return $GLOBALS['body']??[]; }
// The response adapter throws for assertions; production respond() exits.
// Preserve the route body and let only the test response escape its error boundary.
$routeSource=file_get_contents(__DIR__.'/../api/operations.php');
$boundary="} catch (Throwable \$e) { fail('operations_unavailable',503); }";
if(substr_count($routeSource,$boundary)!==1)throw new RuntimeException('response adapter boundary changed');
$routeSource=str_replace($boundary,"} catch (Throwable \$e) { if (\$e instanceof OperationsResponse) throw \$e; fail('operations_unavailable',503); }",$routeSource);
$routeSource=str_replace('__DIR__',var_export(realpath(__DIR__.'/../api'),true),$routeSource);
eval(substr($routeSource,5));
require __DIR__.'/../api/operations-schema.php';
$GLOBALS['at']=2000000000;$count=0;
function check(bool $condition,string $message): void { if(!$condition)throw new RuntimeException($message);$GLOBALS['count']++; }
function request(string $path,string $method,int $expected,?string $error=null): array {
    try{ operationsRoute($path,$method); }catch(OperationsResponse $response){
        check($response->status===$expected,$path.' unexpected HTTP '.$response->status);
        if($error!==null)check(($response->payload['error']??null)===$error,'wrong error: '.$path);
        return $response->payload;
    }
    throw new RuntimeException('route did not respond');
}
$pdo=new PDO('sqlite::memory:',null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
$GLOBALS['pdo']=$pdo;
foreach([
'CREATE TABLE customer_accounts(id TEXT PRIMARY KEY,status TEXT,email_verified_at INTEGER)',
'CREATE TABLE customer_auth_sessions(token_hash TEXT PRIMARY KEY,account_id TEXT,expires_at INTEGER,revoked_at INTEGER)',
'CREATE TABLE customer_auth_rate_limits(bucket TEXT PRIMARY KEY,count INTEGER,reset_at INTEGER)',
'CREATE TABLE operations_admin_memberships(account_id TEXT PRIMARY KEY,role TEXT,enabled INTEGER,created_at INTEGER)',
'CREATE TABLE operations_session_mfa(session_hash TEXT PRIMARY KEY,account_id TEXT,verified_at INTEGER,expires_at INTEGER,last_counter INTEGER,credential_hash TEXT)',
'CREATE TABLE operations_mfa_counters(account_id TEXT PRIMARY KEY,last_counter INTEGER)',
'CREATE TABLE operations_evidence(sequence_id INTEGER PRIMARY KEY,evidence_id TEXT,section_id TEXT,gate_id TEXT,result TEXT,release_sha TEXT,source TEXT,source_url TEXT,test_name TEXT,environment TEXT,checked_at INTEGER,expires_at INTEGER,details_json TEXT)',
'CREATE TABLE operations_audit(sequence_id INTEGER PRIMARY KEY,actor_id TEXT,action TEXT,reference_id TEXT,occurred_at INTEGER)',
'CREATE TABLE operations_release(singleton_id INTEGER PRIMARY KEY,release_sha TEXT,published_at INTEGER)'
] as $sql)$pdo->exec($sql);
$account='11111111-1111-4111-8111-111111111111';$hash=tokenHash('fixture-session');$at=nowTs();$release=str_repeat('a',40);
$GLOBALS['configuration']=['auth_pepper'=>str_repeat('x',32),'operations_admins'=>[]];$_COOKIE=[];$_SERVER=[];
request('/admin/operations','GET',401,'unauthorized');
$pdo->prepare('INSERT INTO customer_accounts VALUES(?,?,?)')->execute([$account,'active',$at]);
$pdo->prepare('INSERT INTO customer_auth_sessions VALUES(?,?,?,NULL)')->execute([$hash,$account,$at+3600]);$_COOKIE[SESSION_COOKIE]='fixture-session';
request('/admin/operations','GET',403,'admin_forbidden');
$_GET=['role'=>'SUPER_ADMIN','verified'=>true,'progress'=>100];$_SERVER['HTTP_X_ADMIN_ROLE']='SUPER_ADMIN';
request('/admin/operations','GET',403,'admin_forbidden');
$GLOBALS['configuration']['operations_admins'][$account]=['role'=>'ADMIN','totp_secret'=>'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'];
request('/admin/operations','GET',403,'admin_forbidden');
$pdo->prepare('INSERT INTO operations_admin_memberships VALUES(?,?,1,?)')->execute([$account,'ADMIN',$at]);
request('/admin/operations','GET',403,'admin_mfa_required');
$session=request('/admin/operations/session','GET',200);check($session['mfaRequired']===true,'missing MFA challenge');
request('/admin/operations/mfa','POST',403,'csrf_forbidden');
$_SERVER=['HTTP_ORIGIN'=>SITE_ORIGIN,'HTTP_X_CSRF_TOKEN'=>$session['csrfToken'],'HTTP_SEC_FETCH_SITE'=>'cross-site'];
request('/admin/operations/mfa','POST',403,'csrf_forbidden');
$_SERVER['HTTP_SEC_FETCH_SITE']='same-origin';$GLOBALS['body']=['code'=>'000000'];
request('/admin/operations/mfa','POST',403,'invalid_mfa');
$fingerprint=hash_hmac('sha256',$GLOBALS['configuration']['operations_admins'][$account]['totp_secret'],str_repeat('x',32));
$pdo->prepare('INSERT INTO operations_session_mfa VALUES(?,?,?,?,?,?)')->execute([$hash,'other-account',$at,$at+600,0,$fingerprint]);
request('/admin/operations','GET',403,'admin_mfa_required');
$pdo->prepare('UPDATE operations_session_mfa SET account_id=?,verified_at=?,expires_at=?')->execute([$account,$at-601,$at+600]);
request('/admin/operations','GET',403,'admin_mfa_required');
$pdo->prepare('UPDATE operations_session_mfa SET verified_at=?,expires_at=?')->execute([$at,$at+600]);
$pdo->prepare('INSERT INTO operations_release VALUES(1,?,?)')->execute([$release,$at]);
$data=request('/admin/operations','GET',200);check(count($data['reports'])===36,'36 reports missing');check(count($data['sourceSections'])===36,'36 source sections missing');
check($data['summary']['measuredCoverage']===0&&$data['summary']['verified']===0,'unknown evidence asserted complete');
check(!str_contains(json_encode($data),'totp_secret')&&!str_contains(json_encode($data),'auth_pepper'),'private configuration leaked');
request('/admin/operations','POST',404,'not_found');
$pdo->exec("UPDATE customer_accounts SET status='disabled'");request('/admin/operations','GET',403,'admin_forbidden');
$pdo->exec("UPDATE customer_accounts SET status='active',email_verified_at=NULL");request('/admin/operations','GET',403,'admin_forbidden');
$pdo->exec("UPDATE customer_accounts SET email_verified_at=$at");$pdo->exec('UPDATE operations_admin_memberships SET enabled=0');request('/admin/operations','GET',403,'admin_forbidden');
$pdo->exec('UPDATE operations_admin_memberships SET enabled=1');$pdo->exec('UPDATE customer_auth_sessions SET revoked_at=1');request('/admin/operations','GET',401,'unauthorized');
$pdo->exec('UPDATE customer_auth_sessions SET revoked_at=NULL,expires_at=1');request('/admin/operations','GET',401,'unauthorized');
$pepper=str_repeat('x',32);$csrf=operationsCsrf($hash,$pepper);
check(!operationsMutationAllowed([], $csrf,$csrf),'absent Origin accepted');
check(!operationsMutationAllowed(['HTTP_ORIGIN'=>'https://evil.example'],$csrf,$csrf),'foreign Origin accepted');
check(!operationsMutationAllowed(['HTTP_ORIGIN'=>SITE_ORIGIN],str_repeat('0',64),$csrf),'forged CSRF accepted');
check(operationsMutationAllowed(['HTTP_ORIGIN'=>SITE_ORIGIN],$csrf,$csrf),'valid CSRF rejected');
foreach([59=>'287082',1111111109=>'081804',1111111111=>'050471',1234567890=>'005924',2000000000=>'279037',20000000000=>'353130'] as $when=>$code)check(operationsTotpCounter('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',$code,$when)===intdiv($when,30),'RFC6238 vector failed');
check(operationsTotpCounter('invalid','123456',$at)===null,'invalid secret accepted');
check(operationsTotpCounter('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ','12345x',$at)===null,'invalid code accepted');
$record=operationsRegistry()['dashboard'];$events=[];
check(operationsEvaluate($record,[],$release,$at)['measuredProgress']===null,'unknown interpreted as zero');
foreach(array_keys($record['gates']) as $i=>$gate)$events[]=['sequence_id'=>$i+1,'section_id'=>'ADM-01','gate_id'=>$gate,'release_sha'=>$release,'result'=>'pass','checked_at'=>$at-1,'expires_at'=>$at+600];
check(operationsEvaluate($record,$events,$release,$at)['closed']===true,'valid gates did not close');
check(operationsEvaluate($record,$events,str_repeat('b',40),$at)['closed']===false,'old release closed current section');
$events[2]['expires_at']=$at-1;check(operationsEvaluate($record,$events,$release,$at)['closed']===false,'expired production certified');
$events[2]['expires_at']=$at+600;$events[]=['sequence_id'=>10,'section_id'=>'ADM-01','gate_id'=>'production','release_sha'=>$release,'result'=>'fail','checked_at'=>$at,'expires_at'=>$at+600];
check(operationsEvaluate($record,$events,$release,$at)['status']==='regressed','failed recheck did not reopen');
$events[]=['sequence_id'=>11,'section_id'=>'ADM-01','gate_id'=>'production','release_sha'=>$release,'result'=>'pass','checked_at'=>$at-1,'expires_at'=>$at+600];
check(operationsEvaluate($record,$events,$release,$at)['status']==='regressed','late old pass overwrote newer failure');
$events[]=['sequence_id'=>12,'section_id'=>'ADM-01','gate_id'=>'production','release_sha'=>$release,'result'=>'pass','checked_at'=>$at,'expires_at'=>$at+600];
check(operationsEvaluate($record,$events,$release,$at)['status']==='regressed','equal-time pass overwrote failure');
$forgedEvent=['sectionId'=>'ADM-01','gateId'=>'production','result'=>'pass','source'=>'browser','sourceUrl'=>'https://evil.example','testName'=>'Forged','environment'=>'production','checkedAt'=>time(),'expiresAt'=>time()+300,'details'=>[]];
$forged=['schema'=>'operations-release-v1','releaseSha'=>$release,'runId'=>'123','branch'=>'migration/bertina-linux6','workflow'=>'Deploy to Bertina','events'=>[$forgedEvent,$forgedEvent]];
try{operationsImportRelease($pdo,$forged,$release,[],'123');throw new RuntimeException('forged batch accepted');}catch(RuntimeException $e){check($e->getMessage()==='invalid_evidence_event','unexpected import error');}
for($i=0;$i<5;$i++)check(operationsMfaAccountRateAllowed($pdo,'rate-fixture',$at),'valid attempt blocked');
$_SERVER['REMOTE_ADDR']='203.0.113.20';check(!operationsMfaAccountRateAllowed($pdo,'rate-fixture',$at),'new IP bypassed global MFA limit');
check(operationsMfaAccountRateAllowed($pdo,'rate-fixture',$at+301),'expired rate window did not reset');
$proof=['schema'=>'operations-tls-v1','ok'=>true,'commit'=>$release,'runId'=>'123','observer'=>'independent-runner-direct-tcp-and-public-dns','checkedAt'=>$at-1,'checks'=>[],'certificates'=>[]];
foreach(['drjavadrezazadeh.com','www.drjavadrezazadeh.com'] as $host){
 $proof['certificates'][]=['host'=>$host,'expiresAt'=>$at+1000000];
 $proof['checks'][]=['name'=>$host.' origin CA-chain hostname and expiry','passed'=>true];
 foreach(['origin','public'] as $target)$proof['checks'][]=['name'=>$host.' '.$target.' HTTPS status and canonical destination','passed'=>true];
}
$server=['HTTPS'=>'on','HTTP_HOST'=>'drjavadrezazadeh.com'];
check(operationsProductionContext($server,$proof,$release,$at),'valid independent TLS context rejected');
check(!operationsProductionContext(['HTTP_HOST'=>'drjavadrezazadeh.com','HTTP_X_FORWARDED_PROTO'=>'https'],$proof,$release,$at),'forwarded HTTPS fabricated production');
check(!operationsProductionContext($server,$proof,str_repeat('b',40),$at),'old TLS release accepted');
$bad=$proof;$bad['checkedAt']=$at+1;check(!operationsProductionContext($server,$bad,$release,$at),'future TLS evidence accepted');
$bad=$proof;$bad['checkedAt']=$at-604800;check(!operationsProductionContext($server,$bad,$release,$at),'expired TLS observation accepted');
$bad=$proof;$bad['checks'][1]=$bad['checks'][0];check(!operationsProductionContext($server,$bad,$release,$at),'duplicate TLS checks accepted');
$bad=$proof;$bad['certificates'][1]['host']='drjavadrezazadeh.com';check(!operationsProductionContext($server,$bad,$release,$at),'duplicate TLS hostname accepted');
$bad=$proof;$bad['certificates'][1]['expiresAt']=$at;check(!operationsProductionContext($server,$bad,$release,$at),'expired certificate accepted');
$prerequisites=['releaseSha'=>$release,'dashboard'=>['verifiedGates'=>[]]];
foreach(['code','tests','evidence'] as $gate)$prerequisites['dashboard']['verifiedGates'][]=['id'=>$gate,'state'=>'pass','evidence'=>['source_url'=>'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/123','release_sha'=>$release,'expires_at'=>$at+300]];
check(operationsProductionExpiry($prerequisites,$proof,$at)===$at+300,'production proof outlives prerequisite evidence');
$bad=$proof;$bad['runId']='124';check(operationsProductionExpiry($prerequisites,$bad,$at)===null,'unrelated TLS run accepted');
$prerequisites['dashboard']['verifiedGates'][0]['state']='fail';check(operationsProductionExpiry($prerequisites,$proof,$at)===null,'failed prerequisite certified production');
echo 'PASS: '.$count.' operations authorization, MFA, CSRF, scope, freshness and regression assertions. No production credentials or transactions used.'.PHP_EOL;
