<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

// Persist owner MFA throughout a normal workday across page and tab navigation.
// The existing signed session, account role, credential hash, revocation,
// origin/CSRF and replay checks continue to apply on every request.
const OPERATIONS_MFA_TTL = 43200;
require_once __DIR__.'/publishing-onboarding.php';
require_once __DIR__.'/publishing.php';
require_once __DIR__.'/operations-reporting.php';
require_once __DIR__.'/operations-ai-visibility.php';
require_once __DIR__.'/operations-gsc-direct.php';
require_once __DIR__.'/operations-jhela.php';
require_once __DIR__.'/jhela-native-editorial.php';
require_once __DIR__.'/jhela-intake.php';
require_once __DIR__.'/operations-commerce.php';
require_once __DIR__.'/operations-educational-offers.php';
require_once __DIR__.'/operations-education-price-drafts.php';
require_once __DIR__.'/operations-education-release-gates.php';
require_once __DIR__.'/operations-education-source-review.php';
require_once __DIR__.'/operations-education-readiness.php';
require_once __DIR__.'/operations-education-privacy.php';
require_once __DIR__.'/operations-education-workbook-policy.php';
require_once __DIR__.'/operations-education-adult-review.php';
require_once __DIR__.'/operations-education-interests.php';
require_once __DIR__.'/operations-book-expiration.php';
require_once __DIR__.'/operations-donation-recovery.php';
require_once __DIR__.'/operations-fulfilment.php';
require_once __DIR__.'/operations-service-delivery.php';
require_once __DIR__.'/consultation-availability.php';
require_once __DIR__.'/operations-action-runs.php';
require_once __DIR__.'/operations-provider-inventory.php';
require_once __DIR__.'/operations-source-directory.php';
require_once __DIR__.'/operations-source-controls.php';
require_once __DIR__.'/operations-page-quality.php';
require_once __DIR__.'/operations-activation.php';
require_once __DIR__.'/operations-database-health.php';
require_once __DIR__.'/operations-alerts.php';
require_once __DIR__.'/operations-http-log.php';
require_once __DIR__.'/operations-response-monitor.php';
require_once __DIR__.'/operations-existing-features.php';
require_once __DIR__.'/operations-editor.php';
require_once __DIR__.'/operations-social.php';
require_once __DIR__.'/social-review.php';
require_once __DIR__.'/social-admin-settings.php';
require_once __DIR__.'/operations-github-audits.php';
require_once __DIR__.'/operations-collection.php';
require_once __DIR__.'/operations-github-dispatch.php';
require_once __DIR__.'/operations-cron-dispatcher.php';
require_once __DIR__.'/jrei-learning-operations.php';
require_once __DIR__.'/jrei-hybrid-owner.php';
require_once __DIR__.'/jrei-owner-private-pilot.php';
require_once __DIR__.'/jrei-python-node-health.php';
require_once __DIR__.'/jrei-python-canary-bridge.php';
require_once __DIR__.'/jrei-mother-schema-inventory.php';
require_once __DIR__.'/jrei-python-owner-skills.php';
require_once __DIR__.'/jrei-knowledge-evidence-projection.php';
require_once __DIR__.'/jrei-metacognitive-owner-journal.php';
require_once __DIR__.'/jrei-apex-owner-missions.php';
require_once __DIR__.'/jrei-apex-python-plan.php';
require_once __DIR__.'/jrei-apex-worker-observations.php';
require_once __DIR__.'/jrei-exam-research-owner.php';
require_once __DIR__.'/jrei-ka-independent-source-review.php';
require_once __DIR__.'/jrei-exam-commercial-catalogue.php';
require_once __DIR__.'/operations-jrei-news.php';

function operationsRegistry(): array {
    $raw = file_get_contents(__DIR__.'/internal/operations-registry.json');
    $registry = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($registry) || count($registry['reports'] ?? []) !== 36) throw new RuntimeException('registry_unavailable');
    return $registry;
}
function operationsSchemaReady(PDO $pdo): bool {
    try {
        foreach (['operations_admin_memberships','operations_session_mfa','operations_mfa_counters','operations_evidence','operations_audit','operations_release'] as $table) {
            $pdo->query('SELECT 1 FROM '.$table.' LIMIT 1');
        }
        return true;
    } catch (Throwable $e) { return false; }
}
function operationsAdmin(PDO $pdo, array $account, array $configuration): bool {
    if (($account['status'] ?? '') !== 'active' || empty($account['email_verified_at'])) return false;
    $id = (string)($account['id'] ?? '');
    $private = $configuration['operations_admins'][$id] ?? null;
    if (!is_array($private) || !in_array($private['role'] ?? '', ['ADMIN','SUPER_ADMIN'], true)
        || !preg_match('/^[A-Z2-7]{32,128}$/D',(string)($private['totp_secret']??''))) return false;
    $q = $pdo->prepare('SELECT role,enabled FROM operations_admin_memberships WHERE account_id=?');
    $q->execute([$id]); $membership = $q->fetch();
    return is_array($membership) && (int)$membership['enabled'] === 1 && $membership['role'] === $private['role'];
}
function operationsCsrf(string $sessionHash, string $pepper): string {
    if (strlen($pepper) < 32) throw new RuntimeException('csrf_unavailable');
    return hash_hmac('sha256', 'operations-csrf-v1|'.$sessionHash, $pepper);
}
function operationsMutationAllowed(array $server, string $provided, string $expected): bool {
    return ($server['HTTP_ORIGIN'] ?? '') === SITE_ORIGIN
        && in_array($server['HTTP_SEC_FETCH_SITE'] ?? 'same-origin', ['same-origin','none'], true)
        && strlen($provided) === 64 && hash_equals($expected, $provided);
}
function operationsTotpCounter(string $secret, string $code, int $at): ?int {
    if (!preg_match('/^[A-Z2-7]{32,128}$/D', $secret) || !preg_match('/^[0-9]{6}$/D', $code)) return null;
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $bits = ''; $key = '';
    foreach (str_split($secret) as $char) $bits .= str_pad(decbin((int)strpos($alphabet, $char)), 5, '0', STR_PAD_LEFT);
    for ($i=0; $i+8<=strlen($bits); $i+=8) $key .= chr(bindec(substr($bits,$i,8)));
    $counter = intdiv($at,30);
    foreach ([$counter-1,$counter,$counter+1] as $candidate) {
        $message = pack('N2', intdiv($candidate,4294967296), $candidate % 4294967296);
        $hash = hash_hmac('sha1', $message, $key, true); $offset = ord($hash[19]) & 15;
        $binary = unpack('N', substr($hash,$offset,4))[1] & 0x7fffffff;
        if (hash_equals(str_pad((string)($binary % 1000000),6,'0',STR_PAD_LEFT),$code)) return $candidate;
    }
    return null;
}
function operationsMfaFresh(PDO $pdo, string $sessionHash, string $accountId, int $at, string $credentialHash): bool {
    $q = $pdo->prepare('SELECT account_id,verified_at,expires_at,credential_hash FROM operations_session_mfa WHERE session_hash=?');
    $q->execute([$sessionHash]); $row = $q->fetch();
    return is_array($row) && $row['account_id'] === $accountId && (int)$row['verified_at'] <= $at
        && (int)$row['verified_at'] > $at-OPERATIONS_MFA_TTL && (int)$row['expires_at'] > $at
        && hash_equals($credentialHash,(string)$row['credential_hash']);
}
function operationsAudit(PDO $pdo, ?string $actor, string $action, string $reference): void {
    $pdo->prepare('INSERT INTO operations_audit(actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)')
        ->execute([$actor,$action,$reference,nowTs()]);
}
function operationsMfaAccountRateAllowed(PDO $pdo, string $accountId, int $at): bool {
    $bucket=hash('sha256','operations-mfa-account|'.$accountId);
    $lock=$pdo->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?' FOR UPDATE':'';
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare('SELECT count,reset_at FROM customer_auth_rate_limits WHERE bucket=?'.$lock);$q->execute([$bucket]);$row=$q->fetch();
        if (!$row) { $count=1;$pdo->prepare('INSERT INTO customer_auth_rate_limits(bucket,count,reset_at) VALUES(?,?,?)')->execute([$bucket,$count,$at+300]); }
        elseif ((int)$row['reset_at']<=$at) { $count=1;$pdo->prepare('UPDATE customer_auth_rate_limits SET count=1,reset_at=? WHERE bucket=?')->execute([$at+300,$bucket]); }
        else { $count=(int)$row['count']+1;$pdo->prepare('UPDATE customer_auth_rate_limits SET count=? WHERE bucket=?')->execute([$count,$bucket]); }
        $pdo->commit();return $count<=5;
    } catch (Throwable $e) { if ($pdo->inTransaction())$pdo->rollBack();return false; }
}

/** Progress is derived from immutable, scoped server evidence; status/percent input is never accepted. */
function operationsEvaluate(array $record, array $events, string $release, int $at): array {
    $latest = [];
    foreach ($events as $event) {
        if (($event['section_id'] ?? '') !== $record['id'] || ($event['release_sha'] ?? '') !== $release) continue;
        if (!isset($record['gates'][$event['gate_id'] ?? ''])) continue;
        if ((int)($event['checked_at'] ?? 0) > $at) continue;
        $key = $event['gate_id'];
        $previous=$latest[$key]??null;
        $rank=['pass'=>0,'blocked'=>1,'fail'=>2];
        if ($previous===null || (int)$event['checked_at']>(int)$previous['checked_at']
            || ((int)$event['checked_at']===(int)$previous['checked_at'] && ($rank[$event['result']]??2)>($rank[$previous['result']]??2))) $latest[$key] = $event;
    }
    $passed = 0; $failed = false; $stale = false; $blocked = false; $gates = [];
    foreach ($record['gates'] as $gateId => $label) {
        $event = $latest[$gateId] ?? null;
        $expired = $event !== null && (int)$event['expires_at'] <= $at;
        $state = $event === null ? 'unknown' : ($expired ? 'stale' : $event['result']);
        if ($state === 'pass') $passed++;
        if ($state === 'fail') $failed = true;
        if ($state === 'blocked') $blocked = true;
        if ($expired) $stale = true;
        $gates[] = ['id'=>$gateId,'label'=>$label,'state'=>$state,'evidence'=>$event];
    }
    $score = count($latest) === 0 ? null : (int)floor(100*$passed/count($gates));
    $complete = $score === 100;
    $status = $failed ? 'regressed' : ($blocked ? 'blocked' : ($complete ? 'verified_complete' : ($stale ? 'ready_for_verification' : (count($latest)>0 ? 'in_progress' : 'not_started'))));
    $openGates=array_values(array_filter($gates,fn($g)=>$g['state']!=='pass'));
    return array_merge($record, ['measuredProgress'=>$score,'status'=>$status,'closed'=>$complete,'verifiedGates'=>$gates,
        'openWork'=>array_column($openGates,'label'),'currentBlocker'=>$complete?null:($blocked?$record['blocker']:null)]);
}
/** Read-only engine observations. Readiness is deliberately separate from acceptance gates. */
function operationsSignals(PDO $pdo, array $configuration, string $release, int $at): array {
    $signals=[];
    $add=function(array $ids,string $id,string $fa,string $en,mixed $value,string $source,string $limit,bool $blocking=false,?int $checked=null,?int $expires=null)use(&$signals,$at):void{
        foreach($ids as $section)$signals[$section][]=['id'=>$id,'labelFa'=>$fa,'labelEn'=>$en,'value'=>$value,'source'=>$source,'limitation'=>$limit,'blocking'=>$blocking&&$value===false,'checkedAt'=>$checked??$at,'expiresAt'=>$expires??($at+60)];
    };
    $flag=fn(string $key)=>array_key_exists($key,$configuration)?$configuration[$key]===true:null;
    $identityLimit='Runtime configuration is not proof of delivery, verification, recovery or real customer login.';
    $auth=function_exists('authReady')?authReady():null;
    $email=function_exists('mailReady')?mailReady():null;
    $add(['OP-05','OP-06'],'auth_runtime','آمادگی فنی ورود ایمیلی','Email authentication runtime ready',$auth,'Bertina auth readiness',$identityLimit,true);
    $add(['OP-05','OP-06'],'email_transport','آمادگی فنی ارسال ایمیل','Email transport configuration ready',$email,'Bertina SMTP readiness',$identityLimit,true);
    $commerceLimit='Configuration does not certify provider approval, successful callbacks, real money or fulfilment.';
    foreach([
        ['public_tls_confirmed',['OP-07','OP-09'],'تأیید TLS در تنظیمات پرداخت','Payment TLS switch confirmed'],
        ['commerce_enabled',['OP-07','OP-09','OP-23','OP-24'],'فعال‌بودن مجوز پرداخت','Payment activation switch enabled'],
        ['order_email_fulfilment_confirmed',['OP-08','OP-11'],'تأیید تنظیمات رسید ایمیلی','Receipt email fulfilment confirmed'],
        ['book_shipping_confirmed',['OP-11'],'تأیید تنظیمات ارسال کتاب','Book shipping configuration confirmed'],
        ['service_booking_confirmed',['OP-22','OP-23'],'تأیید تنظیمات رزرو خدمت','Service booking configuration confirmed']
    ] as [$key,$ids,$fa,$en])$add($ids,$key,$fa,$en,$flag($key),'Bertina effective private configuration',$commerceLimit,true);
    $gateway=array_key_exists('bitpay_api_key',$configuration)?(string)$configuration['bitpay_api_key']!=='':null;
    $multiplier=array_key_exists('bitpay_amount_multiplier',$configuration)?in_array((string)$configuration['bitpay_amount_multiplier'],['1','10'],true):null;
    $add(['OP-07'],'gateway_configured','وجود کلید خصوصی درگاه','Private gateway key configured',$gateway,'Bertina effective private configuration',$commerceLimit,true);
    $add(['OP-07'],'amount_conversion','معتبر بودن تنظیم تبدیل مبلغ','Amount conversion configuration valid',$multiplier,'Bertina effective private configuration',$commerceLimit,true);
    $ready=function_exists('commerceReady')?commerceReady():null;
    $add(['OP-07','OP-09'],'checkout_runtime','آمادگی فنی پرداخت','Checkout runtime ready',$ready,'Bertina commerce readiness',$commerceLimit,true);
    if(function_exists('localCatalog')){
        $items=localCatalog();$books=count(array_filter($items,fn($item)=>$item['kind']==='book'));
        $add(['OP-10','OP-11'],'sellable_books','کتاب‌های دارای قیمت و موجودی معتبر در کاتالوگ','Catalogue books with valid prices and stock',$books,'Server-authoritative catalogue','Catalogue stock is not warehouse reconciliation or delivery confirmation.');
    }
    try{
        $counts=$pdo->query("SELECT COUNT(*) AS captured,COALESCE(SUM(state='pending'),0) AS pending,COALESCE(SUM(state='paid' AND currency='IRT' AND paid_at IS NOT NULL AND provider_trans_id IS NOT NULL AND provider_trans_id<>'' AND provider_id_get IS NOT NULL AND provider_id_get<>''),0) AS paid_records FROM (SELECT state,currency,paid_at,provider_trans_id,provider_id_get FROM commerce_orders FORCE INDEX (PRIMARY) ORDER BY id DESC LIMIT 1000) AS indexed_sample")->fetch();
        foreach(['captured'=>['تعداد سفارش در نمونهٔ حداکثر هزار ردیف','Order count in sample of at most 1000 rows'],'pending'=>['سفارش‌های معلق در نمونه','Pending orders in sample'],'paid_records'=>['ردیف‌های پرداخت‌شده دارای فیلدهای callback در نمونه','Paid-state rows with callback fields in sample']] as $key=>[$fa,$en])$add(['OP-08','OP-09','OP-11'],$key,$fa,$en,(int)$counts[$key],'Read-only Bertina MySQL indexed sample','Deterministic UUID-indexed sample of at most 1000 rows, not chronological or all-time totals, independent reconciliation or a new real transaction.');
    }catch(Throwable $e){
        $add(['OP-08','OP-09'],'order_metrics','دسترسی به شاخص سفارش‌ها','Order metrics available',null,'Bertina MySQL aggregate','Metrics unavailable; no records or completion inferred.');
    }
    $add(['OP-02','OP-36'],'current_release','شناسهٔ نسخهٔ ثبت‌شده در سرور','Server-recorded release SHA',$release?:null,'Bertina operations_release','A release identifier does not certify branch governance, rollback rehearsal, or completed recovery.');
    $raw=@file_get_contents(__DIR__.'/internal/operations-tls.json');$tls=is_string($raw)?json_decode($raw,true):null;
    if(is_array($tls)&&operationsProductionContext($_SERVER,$tls,$release,$at)){
        $expires=min($tls['checkedAt']+604800,min(array_column($tls['certificates'],'expiresAt'))-86400);
        $add(['OP-03'],'independent_tls','اعتبار شواهد مستقل TLS برای دامنه و www','Independent apex/www TLS proof valid',true,'Independent GitHub direct-TCP/public-DNS observer','Contacted addresses only; this observation does not activate payments or certify every DNS address.',false,$tls['checkedAt'],$expires);
        $add(['OP-02','OP-03','OP-36'],'independent_tls_run','شناسهٔ ممیزی مستقل HTTPS نسخه','Current-release independent HTTPS audit run',(int)$tls['runId'],'Independent GitHub direct-TCP/public-DNS observer','Confirms only the independently observed TLS scope; branch protection, rollback, and backup recovery remain unverified.',false,$tls['checkedAt'],$expires);
    }
    $raw=@file_get_contents(__DIR__.'/internal/operations-gsc-observation.json');$gsc=is_string($raw)?json_decode($raw,true):null;
    if(is_array($gsc)&&($gsc['schema']??'')==='operations-gsc-observation-v1'&&($gsc['property']??'')==='https://drjavadrezazadeh.com/'&&is_array($gsc['results']??null)&&count($gsc['results'])>0&&count($gsc['results'])<=25){
        $checked=strtotime((string)($gsc['inspectedAtUtc']??''));$rows=$gsc['results'];
        $valid=$checked!==false&&$checked<=$at;
        foreach($rows as $row)if(!is_array($row)||!str_starts_with((string)($row['url']??''),'https://drjavadrezazadeh.com/'))$valid=false;
        if($valid){
            $indexed=count(array_filter($rows,fn($row)=>($row['verdict']??'')==='PASS'&&($row['coverageState']??'')==='Submitted and indexed'));
            $unknown=count(array_filter($rows,fn($row)=>($row['coverageState']??'')==='URL is unknown to Google'));
            $limit='Saved Google inspection sample, not a live GSC connection, whole-property coverage or current-release indexation proof.';
            foreach(['sample_size'=>[count($rows),'تعداد صفحات نمونهٔ بررسی گوگل','Google inspection sample size'],'indexed_sample'=>[$indexed,'صفحات ایندکس‌شده در نمونه','Indexed pages in sample'],'unknown_sample'=>[$unknown,'صفحات ناشناختهٔ گوگل در نمونه','Unknown-to-Google pages in sample']] as $id=>[$value,$fa,$en])$add(['OP-14'],$id,$fa,$en,$value,'Google URL Inspection API',$limit,false,$checked,$checked+259200);
        }
    }
    return $signals;
}
function operationsSnapshot(PDO $pdo, int $at): array {
    $registry = operationsRegistry();
    $releaseRow = $pdo->query('SELECT release_sha,published_at FROM operations_release WHERE singleton_id=1')->fetch();
    $release = is_array($releaseRow) ? (string)$releaseRow['release_sha'] : '';
    $events = $pdo->query('SELECT * FROM operations_evidence ORDER BY sequence_id DESC LIMIT 5000')->fetchAll();
    // Audit actor IDs and account details are deliberately absent from the reporting payload.
    foreach ($events as &$event) { $event['details'] = json_decode($event['details_json'],true); unset($event['details_json']); } unset($event);
    $byId = [];$signals=operationsSignals($pdo,cfg(),$release,$at);
    foreach (array_merge($registry['reports'],[$registry['dashboard']]) as $record){
        $evaluated=operationsEvaluate($record,$events,$release,$at);$evaluated['signals']=$signals[$record['id']]??[];
        $blockers=array_values(array_filter($evaluated['signals'],fn($signal)=>$signal['blocking']&&$signal['expiresAt']>$at));
        $evaluated['observedBlockers']=array_column($blockers,'labelFa');
        if($blockers){
            $evaluated['closed']=false;$evaluated['status']=$evaluated['status']==='regressed'?'regressed':'blocked';
            if($evaluated['measuredProgress']===100)$evaluated['measuredProgress']=99;
            $evaluated['currentBlocker']=implode('؛ ',$evaluated['observedBlockers']);
        }
        $byId[$record['id']]=$evaluated;
    }
    // Evaluate transitive dependencies, retaining unknown as unknown rather than manufacturing zeroes.
    for ($iteration=0; $iteration<count($byId); $iteration++) {
        $changed = false;
        foreach ($byId as $id => $record) {
            $open = array_values(array_filter($record['dependencies'], fn($dep) => !($byId[$dep]['closed'] ?? false)));
            $byId[$id]['openDependencies'] = $open;
            if ($open && $record['closed']) {
                $byId[$id]['closed'] = false; $byId[$id]['status'] = 'blocked';
                $byId[$id]['measuredProgress'] = 99; $changed = true;
            }
        }
        if (!$changed) break;
    }
    $reports = array_map(fn($r) => $byId[$r['id']],$registry['reports']);
    $known = array_filter($reports,fn($r) => $r['measuredProgress'] !== null);
    // Evidence coverage is derived from current-release evaluations, never historical estimates.
    // These are gate counts (36 reports x four gates), not verified completion percentages.
    $gateCoverage=[];
    foreach (['code','tests','production','evidence'] as $gateId) {
        $gateCoverage[$gateId]=['pass'=>0,'fail'=>0,'blocked'=>0,'stale'=>0,'unknown'=>0];
    }
    foreach ($reports as $report) {
        foreach ($report['verifiedGates'] as $gate) {
            $gateId=$gate['id'];$state=$gate['state'];
            if (isset($gateCoverage[$gateId][$state])) $gateCoverage[$gateId][$state]++;
        }
    }
    $snapshot=['ok'=>true,'schema'=>'operations-live-v1','version'=>'4.4.1','releaseSha'=>$release ?: null,
        'publishedAt'=>is_array($releaseRow)?(int)$releaseRow['published_at']:null,'checkedAt'=>$at,
        'methodology'=>'Four section-specific gates, current release, unexpired trusted evidence and completed dependencies. Unknown is not zero.',
        'reports'=>$reports,'dashboard'=>$byId[$registry['dashboard']['id']], 'sourceSections'=>$registry['sourceSections'],
        'summary'=>['total'=>36,'verified'=>count(array_filter($reports,fn($r) => $r['closed'])),'measuredCoverage'=>count($known),'gateCoverage'=>$gateCoverage,
            'measuredProgress'=>count($known)?round(array_sum(array_column($known,'measuredProgress'))/count($known),1):null],
        'history'=>array_values(array_filter($events,fn($e) => $e['release_sha']===$release))];
    $snapshot['reporting']=operationsReporting($snapshot,$registry);
    $snapshot['summary']['measuredProgress']=$snapshot['reporting']['executiveReport']['metrics']['measuredCompletion'];
    return $snapshot;
}

/** This proof file is generated by the independent release runner and checksum-verified on Bertina. */
function operationsProductionContext(array $server, array $proof, string $release, int $at): bool {
    if (!in_array(strtolower((string)($server['HTTPS']??'')),['on','1'],true)
        || ($server['HTTP_HOST']??'') !== 'drjavadrezazadeh.com'
        || ($proof['schema']??'')!=='operations-tls-v1' || ($proof['ok']??false)!==true
        || ($proof['commit']??'')!==$release || !preg_match('/^[a-f0-9]{40}$/D',$release)
        || !preg_match('/^[0-9]+$/D',(string)($proof['runId']??''))
        || ($proof['observer']??'')!=='independent-runner-direct-tcp-and-public-dns'
        || !is_int($proof['checkedAt']??null) || $proof['checkedAt']>$at || $proof['checkedAt']<=$at-604800
        || !is_array($proof['checks']??null) || count($proof['checks'])!==6
        || !is_array($proof['certificates']??null) || count($proof['certificates'])!==2) return false;
    $names=[];
    foreach(['drjavadrezazadeh.com','www.drjavadrezazadeh.com'] as $host){
        $names[]=$host.' origin CA-chain hostname and expiry';
        foreach(['origin','public'] as $target)$names[]=$host.' '.$target.' HTTPS status and canonical destination';
    }
    $observed=[];
    foreach($proof['checks'] as $check){
        if(($check['passed']??false)!==true || !in_array($check['name']??'', $names,true))return false;
        $observed[]=$check['name'];
    }
    if(count(array_unique($observed))!==6)return false;
    $hosts=[];
    foreach($proof['certificates'] as $certificate){
        if(!in_array($certificate['host']??'', ['drjavadrezazadeh.com','www.drjavadrezazadeh.com'],true)
            || !is_int($certificate['expiresAt']??null) || $certificate['expiresAt']<=$at+86400) return false;
        $hosts[]=$certificate['host'];
    }
    return count(array_unique($hosts))===2;
}
function operationsProductionExpiry(array $snapshot, array $proof, int $at): ?int {
    $expectedUrl='https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/'.($proof['runId']??'');
    $expiries=[$at+86400,(int)($proof['checkedAt']??0)+604800];$found=[];
    foreach($snapshot['dashboard']['verifiedGates']??[] as $gate){
        if(!in_array($gate['id'],['code','tests','evidence'],true))continue;
        $event=$gate['evidence']??[];
        if($gate['state']!=='pass' || ($event['source_url']??'')!==$expectedUrl
            || ($event['release_sha']??'')!==($snapshot['releaseSha']??'') || (int)($event['expires_at']??0)<=$at)return null;
        $found[]=$gate['id'];$expiries[]=(int)$event['expires_at'];
    }
    if(count(array_unique($found))!==3)return null;
    foreach($proof['certificates']??[] as $certificate)$expiries[]=(int)$certificate['expiresAt']-86400;
    $expires=min($expiries);return $expires>$at?$expires:null;
}
/**
 * Scope OP-03 narrowly to the independently certified apex/www TLS matrix.
 * No browser request can supply this proof; production reads it from the
 * checksum-verified release bundle only after administrator MFA succeeds.
 */
function operationsRecordVerifiedProduction(PDO $pdo, array $snapshot, string $accountId,
    int $at, array $server, array $proof): bool {
    $release=(string)($snapshot['releaseSha']??'');
    if(!operationsProductionContext($server,$proof,$release,$at))return false;
    $expires=operationsProductionExpiry($snapshot,$proof,$at);
    if($expires===null)return false;
    $sourceUrl='https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/'.$proof['runId'];
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare('INSERT IGNORE INTO operations_evidence(evidence_id,section_id,gate_id,result,release_sha,source,source_url,test_name,environment,checked_at,expires_at,details_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
        // Separate administrator acceptance: all existing prerequisites were checked above.
        $adminIdentity=hash('sha256',$release.'|admin-live-report|'.intdiv($at,300));
        $adminDetails=['scope'=>'admin_https_mfa_report_delivered','passed'=>36,'total'=>36];
        $q->execute([$adminIdentity,'ADM-01','production','pass',$release,'bertina_probe',
            'https://drjavadrezazadeh.com/api/admin/operations',
            'Real administrator MFA and current-release HTTPS report delivery','production',
            $at,$expires,json_encode($adminDetails,JSON_THROW_ON_ERROR)]);
        if($q->rowCount()>0)operationsAudit($pdo,$accountId,'production_report_delivered',$release);
        // Only the TLS production gate; code, tests and evidence remain UNKNOWN.
        // OP-02 branch governance and OP-36 rollback are NEVER certified here.
        $tlsIdentity=hash('sha256',$release.'|tls-apex-www|'.$proof['runId'].'|'.intdiv($at,300));
        $tlsDetails=['scope'=>'independent_tls_apex_www_six_checks',
            'passed'=>6,'total'=>6,'checkedAt'=>$proof['checkedAt']];
        $q->execute([$tlsIdentity,'OP-03','production','pass',$release,'bertina_probe',
            $sourceUrl,'Independent apex/www certificate chain and HTTPS canonical matrix',
            'production',$at,$expires,json_encode($tlsDetails,JSON_THROW_ON_ERROR)]);
        if($q->rowCount()>0)operationsAudit($pdo,$accountId,'tls_production_observed',$release);
        $pdo->commit();
    } catch(Throwable $e) {
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    return true;
}
function operationsRecordProductionAccess(PDO $pdo, array $snapshot, string $accountId, int $at): bool {
    $raw=@file_get_contents(__DIR__.'/internal/operations-tls.json');
    $proof=is_string($raw)?json_decode($raw,true):null;
    return is_array($proof) &&
        operationsRecordVerifiedProduction($pdo,$snapshot,$accountId,$at,$_SERVER,$proof);
}

function operationsRoute(string $path, string $verb): never {
    header('Vary: Cookie'); header('Cache-Control: no-store, private, max-age=0');
    try {
        $pdo = db(); if (!$pdo) fail('operations_database_unavailable',503);
        $account = sessionAccount($pdo); if (!$account) fail('unauthorized',401);
        if (!operationsSchemaReady($pdo)) fail('operations_schema_unavailable',503);
        $configuration = cfg(); if (!operationsAdmin($pdo,$account,$configuration)) fail('admin_forbidden',403);
        $sessionHash = tokenHash((string)($_COOKIE[SESSION_COOKIE] ?? '')); $accountId = (string)$account['id'];
        $csrf = operationsCsrf($sessionHash,(string)$configuration['auth_pepper']);
        $credentialHash=hash_hmac('sha256',(string)$configuration['operations_admins'][$accountId]['totp_secret'],(string)$configuration['auth_pepper']);
        $fresh = operationsMfaFresh($pdo,$sessionHash,$accountId,nowTs(),$credentialHash);
        if ($path === '/admin/operations/session' && $verb === 'GET') {
            $q=$pdo->prepare('SELECT expires_at FROM operations_session_mfa WHERE session_hash=?');$q->execute([$sessionHash]);$expiry=$q->fetch();
            respond(['ok'=>true,'mfaRequired'=>!$fresh,'csrfToken'=>$csrf,'mfaExpiresIn'=>$fresh?max(0,(int)$expiry['expires_at']-nowTs()):0]);
        }
        if ($path === '/admin/operations/mfa' && $verb === 'POST') {
            if (!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf)) fail('csrf_forbidden',403);
            if (!rateAllowed($pdo,'operations_mfa',$accountId,5,300)) fail('rate_limited',429);
            if (!operationsMfaAccountRateAllowed($pdo,$accountId,nowTs())) fail('rate_limited',429);
            $body=jsonBody(); $code=$body['code']??null;
            if (!is_string($code)) fail('invalid_mfa',403);
            $secret=(string)($configuration['operations_admins'][$accountId]['totp_secret']??'');
            $counter=operationsTotpCounter($secret,$code,nowTs()); if ($counter===null) fail('invalid_mfa',403);
            $pdo->beginTransaction();
            try {
                $pdo->prepare('INSERT IGNORE INTO operations_mfa_counters(account_id,last_counter) VALUES(?,-1)')->execute([$accountId]);
                $q=$pdo->prepare('SELECT last_counter FROM operations_mfa_counters WHERE account_id=? FOR UPDATE');$q->execute([$accountId]);
                if ($counter <= (int)$q->fetch()['last_counter']) { $pdo->rollBack(); fail('mfa_replayed',403); }
                $now=nowTs();
                // Elevation never grants privileges to a previously captured customer cookie.
                $q=$pdo->prepare('SELECT expires_at FROM customer_auth_sessions WHERE token_hash=? AND account_id=? AND revoked_at IS NULL AND expires_at>? FOR UPDATE');
                $q->execute([$sessionHash,$accountId,$now]);$previousSession=$q->fetch();
                if (!$previousSession) { $pdo->rollBack(); fail('unauthorized',401); }
                $newRaw=token();$newHash=tokenHash($newRaw);$newExpiry=min((int)$previousSession['expires_at'],$now+SESSION_TTL);
                $pdo->prepare('INSERT INTO customer_auth_sessions(token_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)')->execute([$newHash,$accountId,$newExpiry,$now]);
                $pdo->prepare('UPDATE customer_auth_sessions SET revoked_at=? WHERE token_hash=?')->execute([$now,$sessionHash]);
                $pdo->prepare('UPDATE operations_mfa_counters SET last_counter=? WHERE account_id=?')->execute([$counter,$accountId]);
                $pdo->prepare('INSERT INTO operations_session_mfa(session_hash,account_id,verified_at,expires_at,last_counter,credential_hash) VALUES(?,?,?,?,?,?)')->execute([$newHash,$accountId,$now,min($newExpiry,$now+OPERATIONS_MFA_TTL),$counter,$credentialHash]);
                operationsAudit($pdo,$accountId,'mfa_verified',$newHash);$pdo->commit();
            } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
            cookieSet($newRaw,$newExpiry-$now);
            respond(['ok'=>true,'mfaVerified'=>true]);
        }
        if (!$fresh) fail('admin_mfa_required',403);

        // JREI-owned intelligence reporting: site is an authenticated API
        // consumer only. No local AI computation or invented fallback.
        if ($path==='/admin/operations/jrei-ai-reports' && $verb==='GET') {
            if (($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if (!rateAllowed($pdo,'jrei_ai_report_api_read',$accountId,12,300))
                fail('rate_limited',429);
            try {
                require_once __DIR__.'/jrei-admin-ai-report-client.php';
                respond(jrJreiAdminAiReportViaApi($configuration));
            } catch (Throwable $e) {
                fail('jrei_admin_ai_api_unavailable',503);
            }
        }


        // APEX owner durable mission ledger. Same original session and
        // current MFA with SUPER_ADMIN role, CSRF and rate limits; never a
        // model-driven command executor or implicit worker permission.
        if($path==='/admin/operations/jrei-apex-missions' &&
           in_array($verb,['GET','POST'],true)) {
            if(($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'jrei_apex_owner_missions',$accountId,30,300))
                fail('rate_limited',429);
            if($verb==='GET') {
                try {
                    respond(jrApexMissionSnapshot($pdo,$configuration,$accountId));
                } catch(Throwable $e) {fail('jrei_apex_mission_snapshot_unavailable',503);}
            }
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            try {
                $body=jsonBody();
                if(!is_array($body)||array_is_list($body))
                    fail('jrei_apex_mission_request_invalid',422);
                respond(jrApexMissionOwnerChange($pdo,$configuration,$accountId,$body));
            } catch(InvalidArgumentException $e) {
                fail('jrei_apex_mission_request_invalid',422);
            } catch(DomainException $e) {
                fail('jrei_apex_mission_not_authorized_or_conflicted',409);
            } catch(Throwable $e) {
                fail('jrei_apex_mission_write_unavailable',503);
            }
        }

        // Existing signed-worker job observations, NOT a job dispatcher.
        // Original MFA, owner role, CSRF, rate limits and drjavad1_store only.
        if($path==='/admin/operations/jrei-apex-worker-observations' &&
           in_array($verb,['GET','POST'],true)) {
            if(($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'jrei_apex_worker_observations',$accountId,24,300))
                fail('rate_limited',429);
            if($verb==='GET') {
                try{respond(jrApexWorkerSnapshot($pdo,$configuration,$accountId));}
                catch(Throwable $e){fail('jrei_apex_worker_snapshot_unavailable',503);}
            }
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            try {
                $body=jsonBody();
                if(!is_array($body)||array_is_list($body))
                    fail('jrei_apex_worker_request_invalid',422);
                respond(jrApexWorkerOwnerChange($pdo,$configuration,$accountId,$body));
            }catch(InvalidArgumentException $e) {
                fail('jrei_apex_worker_request_invalid',422);
            }catch(DomainException $e) {
                fail('jrei_apex_worker_link_conflict_or_not_authorized',409);
            }catch(Throwable $e){
                fail('jrei_apex_worker_observation_unavailable',503);
            }
        }

        // Read-only reconciliation of versioned knowledge citations against
        // CURRENT original mother-DB source rights/review/withdrawal state.
        // Neither GET nor the results can approve a licence, queue a crawl,
        // publish news, expose source text or promote knowledge.
        if ($path==='/admin/operations/jrei-knowledge-evidence' && $verb==='GET') {
            if (($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if (($configuration['jrei_knowledge_evidence_enabled']??false)!==true)
                fail('jrei_knowledge_reconciliation_disabled',403);
            if (!rateAllowed($pdo,'jrei_knowledge_evidence_review',$accountId,12,300))
                fail('rate_limited',429);
            try {
                respond(jrKnowledgeEvidenceReconciliation($pdo,time()));
            } catch(Throwable $e) { fail('jrei_knowledge_evidence_unavailable',503); }
        }

        // Read-only, explicitly scoped structure catalogue: the PHP/MySQL
        // navigation context may differ from the actual canonical mother DB.
        // No table contents, tenant rows, secrets or DDL are disclosed/run.
        if ($path==='/admin/operations/jrei-mother-schema/inventory' && $verb==='GET') {
            if (($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if (!rateAllowed($pdo,'jrei_mother_schema_inventory',$accountId,12,300))
                fail('rate_limited',429);
            try {
                respond(jrJreiMotherStructureInventory($pdo));
            } catch(Throwable $e) { fail('jrei_mother_schema_inventory_unavailable',503); }
        }

        // Informational SUPER_ADMIN preflight: derives all readiness
        // fields from real mother DB rows and current private release switches.
        if ($path==='/admin/operations/jrei-python-canary/preflight' && $verb==='GET') {
            if (($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if (!rateAllowed($pdo,'jrei_python_canary_preflight',$accountId,30,300))
                fail('rate_limited',429);
            try {
                respond(jrPythonCanaryPreflight($pdo,$configuration,time()));
            } catch(Throwable $e) { fail('python_canary_preflight_unavailable',503); }
        }

        // Explicit owner MFA/CSRF creates ONE fixed 12*7 job in the
        // existing mother DB. Neither model command nor general executor.
        if ($path==='/admin/operations/jrei-python-canary' &&
            in_array($verb,['GET','POST'],true)) {
            if (($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            // A read-only receipt view may be refreshed while a job is
            // in progress; actual POST submission is separately capped.
            $readOnly=($verb==='GET');
            if (!rateAllowed($pdo,
                $readOnly?'jrei_python_canary_owner_read':'jrei_python_canary_owner_write',
                $accountId,$readOnly?72:8,300))
                fail('rate_limited',429);
            if ($verb==='GET') {
                try {
                    respond(jrPythonCanaryOwnerSnapshot($pdo,$accountId));
                } catch(Throwable $e) { fail('python_canary_snapshot_unavailable',503); }
            }
            if (($configuration['jrei_python_canary_enabled']??false)!==true)
                fail('python_canary_disabled',403);
            if (!operationsMutationAllowed($_SERVER,
                 (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            try {
                $body=jsonBody();
                if(!is_array($body)||array_is_list($body))
                    fail('python_canary_body_invalid',422);
                respond(jrPythonCanaryOwner($pdo,$accountId,$body,time()));
            } catch(InvalidArgumentException $e) {
                fail('python_canary_body_invalid',422);
            } catch(Throwable $e) { fail('python_canary_request_unavailable',503); }
        }

        // Owner-only view of signed Python 8091 process reports.
        // Historical signed reports are not model inference or training proof.
        if ($path==='/admin/operations/jrei-python-node-health' &&
            $verb==='GET') {
            if (($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if (!rateAllowed($pdo,'jrei_python_node_owner',$accountId,12,300))
                fail('rate_limited',429);
            try { respond(jrPythonNodeOwnerSnapshot($pdo,$configuration)); }
            catch (Throwable $e) { fail('python_node_owner_snapshot_unavailable',503); }
        }

        // Existing MFA-gated owner-only Python capabilities. Deterministic
        // reviews remain model-free; separately approved local Qwen drafts
        // are explicitly labelled unverified and cannot publish or execute.
        // No second login, browser-to-worker URL, shell or DB mutation.
        if ($path==='/admin/operations/jrei-python-skills' && $verb==='POST') {
            if (($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if (!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if (!rateAllowed($pdo,'jrei_python_owner_skills',$accountId,12,300))
                fail('rate_limited',429);
            $skillBody=jsonBody();
            if (!is_array($skillBody)) fail('jrei_python_request_invalid',422);
            // Expensive local model drafting is a private owner-only subset,
            // never an unlimited general skills quota or public chatbot.
            if (($skillBody['action']??null)==='model-draft' &&
                !rateAllowed($pdo,'jrei_python_owner_model_draft',$accountId,3,300))
                fail('rate_limited',429);
            try {
                respond(jrOwnerJreiPythonSkillDispatch($configuration,$skillBody,$accountId));
            } catch (InvalidArgumentException $e) {
                fail('jrei_python_request_invalid',422);
            } catch (RuntimeException $e) {
                fail('jrei_python_private_service_unavailable',503);
            }
        }

        // Persist an immutable learning-to-learn proposal in drjavad1_store
        // only under original SUPER_ADMIN, MFA, CSRF and a separate OFF flag.
        // Proposals never confer rights, promotion, crawler or worker leases.
        if ($path==='/admin/operations/jrei-metacognitive-journal' &&
            in_array($verb,['GET','POST'],true)) {
            if (($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if (!rateAllowed($pdo,
                $verb==='GET'?'jrei_meta_journal_read':'jrei_meta_journal_write',
                $accountId,$verb==='GET'?30:5,300))
                fail('rate_limited',429);
            if ($verb==='GET') {
                // Descriptive history is read-only; approval and experiment
                // evidence remain in separate original owner-controlled flows.
                if(($_GET['view']??null)==='trend') {
                    try { respond(jrMetaJournalOwnerTrend($pdo,$accountId)); }
                    catch(Throwable $e) { fail('jrei_metacognitive_trend_unavailable',503); }
                }
                // The existing authenticated owner session may retrieve one
                // immutable learning-cycle result for inspection. No GET
                // request can approve, execute, or revise that proposal.
                $cycleId=$_GET['cycleId']??null;
                if($cycleId!==null) {
                    if(!is_string($cycleId))
                        fail('jrei_metacognitive_cycle_id_invalid',422);
                    try { respond(jrMetaJournalOwnerDetail($pdo,$accountId,$cycleId)); }
                    catch(InvalidArgumentException $e) {
                        fail('jrei_metacognitive_cycle_id_invalid',422);
                    } catch(DomainException $e) {
                        fail('jrei_metacognitive_cycle_not_found',404);
                    } catch(Throwable $e) {
                        fail('jrei_metacognitive_cycle_integrity_unavailable',503);
                    }
                }
                try { respond(jrMetaJournalOwnerList($pdo,$accountId)); }
                catch(Throwable $e){ fail('jrei_metacognitive_journal_unavailable',503); }
            }
            if (!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            try {
                $body=jsonBody();
                if (!is_array($body)||array_is_list($body))
                    fail('jrei_metacognitive_journal_invalid',422);
                respond(jrMetaJournalPropose($pdo,$configuration,$accountId,$body));
            } catch(InvalidArgumentException $e) {
                fail('jrei_metacognitive_journal_invalid',422);
            } catch(DomainException $e) {
                fail('jrei_metacognitive_journal_conflict',409);
            } catch(Throwable $e) {
                fail('jrei_metacognitive_journal_unavailable',503);
            }
        }

        // JREI News uses THIS existing owner login, original TOTP and CSRF.
        // It is unmounted in production until independent final acceptance.
        // Never expose the private source library as a separate public route.
        if(str_starts_with($path,'/admin/operations/jrei-news/owner/')){
            if(($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!in_array($verb,['GET','POST'],true))
                fail('news_owner_method_invalid',405);
            if(!rateAllowed($pdo,'jrei_news_existing_owner',$accountId,
                $verb==='GET'?35:12,300))
                fail('rate_limited',429);
            $provided=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');
            if(strlen($provided)!==64||!hash_equals($csrf,$provided)||
               !in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',
                   ['same-origin','none'],true))
                fail('news_owner_csrf_forbidden',403);
            if($verb==='POST'&&!operationsMutationAllowed($_SERVER,
                $provided,$csrf))
                fail('news_owner_origin_forbidden',403);
            $suffix=substr($path,strlen('/admin/operations/jrei-news'));
            $newsBody=$verb==='POST'?jsonBody():$_GET;
            try{
                respond(jrOperationsNewsDispatch(
                    $pdo,$configuration,$suffix,$verb,
                    $newsBody,$accountId,$sessionHash
                ));
            }catch(InvalidArgumentException $e){
                fail('news_owner_input_invalid',422);
            }catch(DomainException $e){
                fail('news_owner_independent_approval_required',409);
            }
        }
        // JREI owner-only research pilot. This is NOT a public-chat release.
        // Uses the existing SUPER_ADMIN session, current TOTP, CSRF,
        // one-time secret and a strictly separate ephemeral queue state.
        if($path==='/admin/operations/jrei-owner-pilot' &&
           in_array($verb,['GET','POST'],true)){
            if(($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if($verb==='GET'){
                if(!rateAllowed($pdo,'jrei_owner_private_pilot_snapshot',$accountId,15,300))
                    fail('rate_limited',429);
                respond(jrOwnerPilotOwnerSnapshot($pdo,$configuration));
            }
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!rateAllowed($pdo,'jrei_owner_private_pilot',$accountId,35,300))
                fail('rate_limited',429);
            $pilotBody=jsonBody();
            try {
                $pilotAction=$pilotBody['action']??null;
                if($pilotAction==='ask')
                    respond(jrOwnerPilotOwnerAsk($pdo,$configuration,$pilotBody));
                if($pilotAction==='result')
                    respond(jrOwnerPilotOwnerResult($pdo,$configuration,$pilotBody));
                if($pilotAction==='cancel')
                    respond(jrOwnerPilotOwnerCancel($pdo,$pilotBody));
                fail('pilot_action_invalid',422);
            }catch(InvalidArgumentException $e){fail('pilot_input_invalid',422);}
             catch(DomainException $e){fail('pilot_not_ready_or_unavailable',409);}
        }
        // Approved Windows CPU worker gateway: owner registry and queue
        // control only, never an inbound public model port or arbitrary code.
        // SUPER_ADMIN, current TOTP, exact-origin CSRF and audit still apply.
        if($path==='/admin/operations/jrei-hybrid' &&
           ($verb==='GET'||$verb==='POST')){
            if(($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'jrei_hybrid_owner',$accountId,18,300))
                fail('rate_limited',429);
            if($verb==='GET')respond(jrHybridOwnerSnapshot($pdo,$configuration));
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            try {
                respond(jrHybridOwnerChange($pdo,$configuration,
                    $accountId,jsonBody()));
            }catch(InvalidArgumentException $e){
                fail('invalid_jrei_hybrid_policy',422);
            }catch(DomainException $e){
                fail(in_array($e->getMessage(),[
                    'job_version_conflict','node_version_conflict',
                    'hybrid_queue_at_capacity','cannot_cancel_terminal_job'
                ],true)?'hybrid_state_conflict':
                    'hybrid_owner_approval_required',409);
            }
        }
        // An independently configured ADMIN or SUPER_ADMIN may review
        // original source authority and PRIVATE rights; the reviewer must
        // differ from every approved investigation-scope actor. This is a
        // distinct MFA route, not a shortcut to owner/source publication.
        if($path==='/admin/operations/jrei-independent-source-review' &&
           ($verb==='GET'||$verb==='POST')){
            if(!in_array(
                $configuration['operations_admins'][$accountId]['role']??'',
                ['ADMIN','SUPER_ADMIN'],true))
                fail('admin_forbidden',403);
            if(!rateAllowed($pdo,'jrei_source_independent_review',$accountId,15,300))
                fail('rate_limited',429);
            if($verb==='GET'){
                $review=jrKaHumanSourceReviewSnapshot($pdo,$accountId);
                $review['curriculumGradeAlignment']=
                    jrKaScopeAlignmentReviewQueue($pdo,$accountId);
                respond($review);
            }
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            try{
                $reviewBody=jsonBody();
                if(($reviewBody['action']??null)==='review_curriculum_grade')
                    jrKaIndependentScopeAlignmentDecision(
                        $pdo,$accountId,$reviewBody);
                else jrKaIndependentHumanSourceReview(
                    $pdo,$accountId,$reviewBody);
            }catch(InvalidArgumentException $e){
                fail('invalid_independent_source_review',422);
            }catch(DomainException $e){
                fail('source_review_conflict_or_independence_required',409);
            }
            $state=jrKaHumanSourceReviewSnapshot($pdo,$accountId);
            $state['curriculumGradeAlignment']=
                jrKaScopeAlignmentReviewQueue($pdo,$accountId);
            $state['mutationRecorded']=true;
            respond($state);
        }
        // Read-only scientific/admin real mother-DB exam and TESTLY evidence.
        // Destructive emergency STOP/quarantine only, never auto-approve an
        // official question, humanability metric, dataset or child's consent.
        if($path==='/admin/operations/jrei-exam-research' &&
            ($verb==='GET'||$verb==='POST')){
            if(($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'jrei_exam_research_owner',$accountId,20,300))
                fail('rate_limited',429);
            if($verb==='GET'){
                $snapshot=jrExamResearchOwnerSnapshot($pdo,$configuration);
                $snapshot['commercialCentre']=jrExamCommercialOwnerSnapshot($pdo,$configuration);
                $snapshot['examDeadlineReview']=jrExamDeadlineOwnerBacklog($pdo);
                $snapshot['countryExamCoverageMatrix']=jrKaOwnerCoverageMatrix($pdo);
                $snapshot['coverageGapWorklist']=jrKaOwnerCoverageGapQueue($pdo);
                $snapshot['registeredSourceReuseSuggestions']=jrKaOwnerUnlinkedSourceSuggestions($pdo);
                $snapshot['liveAiReadiness']=jrAiOwnerReadiness($pdo,$configuration);
                respond($snapshot);
            }
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            try{
                $result=jrExamResearchOwnerChange($pdo,$configuration,
                    $accountId,jsonBody());
            }catch(InvalidArgumentException $e){
                fail('invalid_jrei_exam_research_policy',422);
            }catch(DomainException $e){
                fail($e->getMessage()==='jrei_exam_owner_revision_conflict'?
                    'jrei_exam_owner_revision_conflict':
                    'jrei_exam_research_action_unavailable',409);
            }
            // A mutation receipt is not the authenticated dashboard
            // snapshot expected by the original bilingual owner client.
            // Read back authoritative committed state after every action,
            // including KA and commercial draft/suspension operations.
            $snapshot=jrExamResearchOwnerSnapshot($pdo,$configuration);
            $snapshot['commercialCentre']=jrExamCommercialOwnerSnapshot($pdo,$configuration);
                $snapshot['examDeadlineReview']=jrExamDeadlineOwnerBacklog($pdo);
                $snapshot['countryExamCoverageMatrix']=jrKaOwnerCoverageMatrix($pdo);
                $snapshot['coverageGapWorklist']=jrKaOwnerCoverageGapQueue($pdo);
                $snapshot['registeredSourceReuseSuggestions']=jrKaOwnerUnlinkedSourceSuggestions($pdo);
                $snapshot['liveAiReadiness']=jrAiOwnerReadiness($pdo,$configuration);
            $snapshot['mutationRecorded']=($result['ok']??true)===true;
            respond($snapshot);
        }
        // Adaptive JREI evaluation metadata is owner-visible only, with
        // the existing SUPER_ADMIN / fresh TOTP / same-origin CSRF guard.
        // This API cannot initiate local Windows inference or self-publish.
        if($path==='/admin/operations/jrei-learning' &&
           ($verb==='GET'||$verb==='POST')) {
            if(($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'jrei_learning_owner',$accountId,18,300))
                fail('rate_limited',429);
            if($verb==='GET')respond(jrJreiLearningSnapshot($pdo,$configuration));
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            try {
                $state=jrJreiLearningOwnerChange($pdo,$configuration,
                    $accountId,jsonBody());
            }catch(InvalidArgumentException $e){
                fail('invalid_jrei_learning_policy',422);
            }catch(DomainException $e){
                fail($e->getMessage()==='jrei_learning_policy_conflict'
                    ?'jrei_learning_policy_conflict':
                      'jrei_learning_authorization_required',409);
            }
            respond($state);
        }
        // Central CLI scheduler: the original SUPER_ADMIN/MFA session and
        // exact-origin CSRF govern source-only policy changes. This route
        // never executes a worker, installs a host Cron or sends an email.
        if ($path==='/admin/operations/cron-master' &&
            ($verb==='GET'||$verb==='POST')) {
            if(($configuration['operations_admins'][$accountId]['role']??'')!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'operations_cron_owner_policy',$accountId,20,300))
                fail('rate_limited',429);
            if($verb==='GET')respond(operationsCronOwnerSnapshot($pdo,$configuration));
            if(!operationsMutationAllowed($_SERVER,
               (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            try{
                $result=operationsCronOwnerChange($pdo,$configuration,
                    $accountId,jsonBody());
            }catch(InvalidArgumentException $e){
                fail('invalid_cron_policy',422);
            }catch(DomainException $e){
                $code=$e->getMessage();
                if($code==='operations_cron_migration_required'||
                   $code==='cron_source_unavailable')
                    fail('cron_source_unavailable',503);
                fail($code==='cron_schedule_conflict'?'cron_schedule_conflict':
                    'cron_owner_confirmation_required',409);
            }
            respond($result);
        }
        // Owner-only projection of the SAME financial/work/contract records
        // returned to each approved author. No impersonation or account switch.
        if ($path === '/admin/operations/author-view' && $verb === 'GET') {
            if (($configuration['operations_admins'][$accountId]['role']??'') !== 'SUPER_ADMIN')
                fail('super_admin_required',403);
            if (!jrPublishingSchemaReady($pdo)) fail('author_portal_unavailable',503);
            if (!rateAllowed($pdo,'operations_author_real_view',$accountId,30,300))
                fail('rate_limited',429);
            $authorId=trim((string)($_GET['authorId']??''));
            if ($authorId!=='' && !validUuid($authorId)) fail('invalid_author_id',422);
            // Revoked, unverified and disabled author-account bindings never
            // contribute to the list and cannot be used for a target preview.
            $authorSql="SELECT a.id,a.slug,a.display_name_fa,a.display_name_en
                FROM publishing_authors a
                WHERE a.status IN ('verification_pending','approved')
                  AND EXISTS (
                    SELECT 1 FROM publishing_author_accounts l
                    JOIN customer_accounts ca ON ca.id=l.account_id
                    WHERE l.author_id=a.id AND l.role='author'
                      AND l.approved_at IS NOT NULL AND l.revoked_at IS NULL
                      AND ca.status='active' AND ca.email_verified_at IS NOT NULL
                  )";
            if ($authorId==='') {
                $q=$pdo->query($authorSql." ORDER BY a.display_name_fa ASC LIMIT 100");
                $directory=array_map(static fn(array $a):array=>[
                    'id'=>(string)$a['id'],'slug'=>(string)$a['slug'],
                    'displayNameFa'=>(string)$a['display_name_fa'],
                    'displayNameEn'=>(string)$a['display_name_en']
                ],$q->fetchAll(PDO::FETCH_ASSOC));
                operationsAudit($pdo,$accountId,'author_view_directory','author_directory');
                respond(['ok'=>true,'scope'=>'owner_mfa_readonly','authors'=>$directory,
                    'impersonation'=>false,'roleMutation'=>false,'readOnly'=>true]);
            }
            $q=$pdo->prepare($authorSql." AND a.id=? LIMIT 1");
            $q->execute([$authorId]);
            $target=$q->fetch(PDO::FETCH_ASSOC);
            if (!is_array($target)) fail('author_access_not_approved',404);
            $projected=jrPublishingAuthorDashboardProjection($pdo,[$target]);
            if(count($projected)!==1)fail('author_projection_unavailable',503);
            operationsAudit($pdo,$accountId,'author_view_open',hash('sha256',$authorId));
            respond(['ok'=>true,'scope'=>'owner_mfa_readonly','readOnly'=>true,
                'impersonation'=>false,'roleMutation'=>false,
                'currency'=>'IRT','amountUnit'=>'toman',
                'author'=>$projected[0],
                'note'=>'Actual author records only. Accrued is not bank settlement. No buyer PII or banking secrets.']);
        }

        if(str_starts_with($path,'/admin/operations/publishing/authors'))
            jrPubKycAdminRoute($pdo,$path,$verb,$accountId,$csrf,$configuration);

        // Sensitive infrastructure diagnostics are visible to a fresh-MFA
        // SUPER_ADMIN only. Return booleans, never host paths or secrets.
        if ($path === '/admin/operations/jhela/host-readiness' && $verb === 'GET') {
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('editorial_owner_role_required',403);
            if(!rateAllowed($pdo,'jhela_owner_host_readiness',$accountId,12,300))
                fail('rate_limited',429);
            jhelaOwnerHostReadiness($pdo);
        }

        // First-party JHELA preliminary editorial queue. Fresh admin MFA was
        // verified above; no manuscript bytes, private path or public decision is exposed.
        if ($path === '/admin/operations/jhela/manuscripts' && $verb === 'GET') {
            if(!rateAllowed($pdo,'jhela_owner_manuscript_read',$accountId,12,300))
                fail('rate_limited',429);
            jhelaOwnerManuscripts($pdo);
        }
        if ($path === '/admin/operations/jhela/manuscripts/file' && $verb === 'GET') {
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('editorial_owner_role_required',403);
            if(!rateAllowed($pdo,'jhela_owner_pdf_download',$accountId,8,300))
                fail('rate_limited',429);
            jhelaOwnerDownload($pdo,(string)($_GET['id']??''));
        }
        if ($path === '/admin/operations/jhela/manuscripts/screen' && $verb === 'POST') {
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('editorial_owner_role_required',403);
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!rateAllowed($pdo,'jhela_owner_manuscript_screen',$accountId,10,900))
                fail('rate_limited',429);
            jhelaOwnerScreen($pdo,$accountId,jsonBody());
        }

        // Owner-approved reviewer screening is a private, real DB workflow, never public automatically.
        if ($path === '/admin/operations/jhela/reviewers' && $verb === 'GET') {
            if(!jhelaSchemaReady($pdo))fail('journal_schema_unavailable',503);
            if(!rateAllowed($pdo,'jhela_private_reviewer_read',$accountId,16,300))fail('rate_limited',429);
            $q=$pdo->query("SELECT r.id,r.account_id,r.academic_name,r.academic_rank,r.institution,r.country,
                 r.orcid,r.institutional_page,r.expertise,r.methods,r.cv_summary,r.publications,
                 r.profile_public_consent,r.privacy_consent,r.status,r.created_at,r.approved_at,
                 a.email_normalized AS private_contact_email
                 FROM jhela_reviewer_candidates r JOIN customer_accounts a ON a.id=r.account_id
                 ORDER BY r.created_at DESC LIMIT 120");
            respond(['ok'=>true,'schema'=>'jhela-owner-reviewer-queue-v1','candidates'=>$q->fetchAll()]);
        }
        if ($path === '/admin/operations/jhela/reviewers/decision' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!jhelaSchemaReady($pdo))fail('journal_schema_unavailable',503);
            if(!rateAllowed($pdo,'jhela_reviewer_decision',$accountId,14,900))fail('rate_limited',429);
            $input=jsonBody();$id=(string)($input['id']??'');$decision=(string)($input['decision']??'');
            if(!validUuid($id)||!in_array($decision,['APPROVED','REJECTED','REVOKED'],true))fail('invalid_reviewer_decision',422);
            $pdo->beginTransaction();
            try {
                $check=$pdo->prepare('SELECT account_id,privacy_consent,status FROM jhela_reviewer_candidates WHERE id=? FOR UPDATE');
                $check->execute([$id]);$candidate=$check->fetch();
                if(!$candidate||$candidate['account_id']===$accountId||(int)$candidate['privacy_consent']!==1){
                    $pdo->rollBack();fail('reviewer_conflict_or_consent_missing',403);
                }
                $q=$pdo->prepare("UPDATE jhela_reviewer_candidates SET status=?,approved_by=?,approved_at=IF(?='APPROVED',NOW(),NULL) WHERE id=?");
                $q->execute([$decision,$accountId,$decision,$id]);
                operationsAudit($pdo,$accountId,'jhela_reviewer_'.strtolower($decision),$id);
                $pdo->commit();
            }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
            respond(['ok'=>true,'decision'=>$decision,'publicListingRequiresConsent'=>true]);
        }

        // Privacy-preserving scholarly roadmap, only after owner MFA and bounded read rate.
        if ($path === '/admin/operations/jhela/maturity' && $verb === 'GET') {
            if (!rateAllowed($pdo,'operations_jhela_maturity_read',$accountId,12,300)) fail('rate_limited',429);
            respond(operationsJhelaSnapshot());
        }

        // Private catalogue: this route is after the existing admin and fresh MFA checks.
        if ($path === '/admin/operations/provider-inventory' && $verb === 'GET') {
            if (!rateAllowed($pdo,'operations_provider_inventory_read',$accountId,20,300)) fail('rate_limited',429);
            respond(operationsProviderInventory());
        }

        // Research-stage educational offer proposals. Existing MFA gate
        // applies; this read-only endpoint CANNOT publish prices or accept funds.
        if ($path === '/admin/operations/educational-offers' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_educational_offers_read',$accountId,15,300))
                fail('rate_limited',429);
            respond(operationsEducationalOffersRead());
        }

        // Price-draft planning in the owner-only mother DB. Neither GET
        // nor POST connects to checkout or customer entitlements.
        if ($path === '/admin/operations/educational-price-drafts' && $verb === 'GET') {
            if (!rateAllowed($pdo,'operations_education_draft_prices_read',$accountId,16,300))
                fail('rate_limited',429);
            $view=operationsEducationalDraftPricesRead($pdo);
            $view['canEdit']=$view['canEdit'] &&
                ($configuration['operations_admins'][$accountId]['role']??null)==='SUPER_ADMIN';
            respond($view);
        }
        if ($path === '/admin/operations/educational-price-drafts' && $verb === 'POST') {
            if (!operationsMutationAllowed($_SERVER,
              (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if (($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if (!rateAllowed($pdo,'operations_education_draft_prices_write',$accountId,8,600))
                fail('rate_limited',429);
            try{
                $data=jsonBody();
                if(!is_array($data))fail('invalid_price_draft',400);
                respond(operationsEducationalDraftPriceSave($pdo,$data,$accountId,nowTs()));
            }catch(InvalidArgumentException $e){fail('invalid_price_draft',422);}
            catch(DomainException $e){fail('price_draft_conflict',409);}
            catch(Throwable $e){fail('education_draft_store_unavailable',503);}
        }

        // One owner-edited preparation ledger for 12 educational proposals.
        // A prepared draft is NOT a scientific/financial/legal release pass.
        if($path==='/admin/operations/educational-release-gates' && $verb==='GET'){
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'ops_educational_release_gates_read',$accountId,14,300))
                fail('rate_limited',429);
            respond(operationsEducationReleaseStatus($pdo));
        }
        if($path==='/admin/operations/educational-release-gates' && $verb==='POST'){
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!rateAllowed($pdo,'ops_educational_release_gates_write',$accountId,8,600))
                fail('rate_limited',429);
            $input=jsonBody();
            if(!is_array($input))fail('invalid_education_release_note',400);
            try{respond(operationsEducationReleaseSave($pdo,$input,$accountId,nowTs()));}
            catch(InvalidArgumentException $e){fail('invalid_education_release_note',422);}
            catch(DomainException $e){fail('education_release_revision_conflict',409);}
            catch(Throwable $e){fail('education_release_storage_unavailable',503);}
        }

        // 1405 source inventory is review metadata, never published admissions.
        if ($path === '/admin/operations/educational-source-review' && $verb === 'GET') {
            if (!rateAllowed($pdo,'operations_education_source_review_read',$accountId,12,300))
                fail('rate_limited',429);
            respond(operationsEducational1405ReviewSnapshot());
        }

        // Owner-only educational research readiness; status observation, not
        // scientific approval, a deployment test or commerce activation.
        if ($path === '/admin/operations/education-readiness' && $verb === 'GET') {
            if (!rateAllowed($pdo,'operations_education_readiness_read',$accountId,10,300))
                fail('rate_limited',429);
            respond(operationsEducationReadiness($pdo));
        }

        // A super-admin may inspect and complete only the specifically
        // requested BAHAR workbook deletion, never lift a legal hold.
        if($path==='/admin/operations/education-erasure-requests'&&$verb==='GET'){
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'ops_bahar_erasure_queue_read',$accountId,12,300))
                fail('rate_limited',429);
            try{
                respond(operationsEducationBaharErasureQueue(
                    $pdo,['page'=>$_GET['page']??1]
                ));
            }catch(InvalidArgumentException $e){
                fail('invalid_erasure_request_page',422);
            }
        }
        if($path==='/admin/operations/education-erasure-requests'&&$verb==='POST'){
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!rateAllowed($pdo,'ops_bahar_erasure_owner_decision',$accountId,6,600))
                fail('rate_limited',429);
            $input=jsonBody();
            try{
                respond(operationsEducationCompleteBaharErasure(
                  $pdo,$input,$accountId,nowTs()));
            }catch(InvalidArgumentException $error){
                fail('invalid_erasure_decision',422);
            }catch(DomainException $error){
                fail('privacy_request_conflict_or_active_hold',409);
            }catch(Throwable $error){
                fail('education_erasure_unavailable',503);
            }
        }

        // Educational privacy controls are a read-only evidence preview.
        // No legal hold, learner records or database rows are deleted here.
        if ($path === '/admin/operations/education-privacy' && $verb === 'GET') {
            if (($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if (!rateAllowed($pdo,'operations_education_privacy_read',$accountId,10,300))
                fail('rate_limited',429);
            respond(operationsEducationPrivacyPreview($pdo));
        }

        // Private BAHAR adult workbook storage: default OFF. Owner policy is
        // distinct from existing educational services and all paid entitlements.
        if ($path === '/admin/operations/education-workbook-policy' && $verb === 'GET') {
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'operations_education_workbook_policy_read',$accountId,12,300))
                fail('rate_limited',429);
            respond(operationsBaharPrivatePolicy($pdo));
        }
        if ($path === '/admin/operations/education-workbook-policy' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'operations_education_workbook_policy_write',$accountId,6,600))
                fail('rate_limited',429);
            $settings=jsonBody();
            if(!is_bool($settings['enabled']??null)||
              ($settings['confirmation']??null)!==
                ($settings['enabled']
                  ?'ENABLE VERIFIED ADULT BAHAR STORAGE'
                  :'DISABLE VERIFIED ADULT BAHAR STORAGE'))
                fail('explicit_owner_confirmation_required',422);
            try{
                respond(operationsBaharPrivatePolicySave(
                    $pdo,$settings['enabled'],$accountId,nowTs()
                ));
            }catch(DomainException $e){fail('bahar_science_privacy_gate_blocked',409);}
            catch(Throwable $e){fail('bahar_workbook_policy_unavailable',503);}
        }

        // EDUCATION: verified, purpose-specific first-party interest intake.
        // Counts or contacts are real observed mother-DB records, NEVER
        // anonymous inferred audience or proof of a sent email.
        if ($path === '/admin/operations/education-interests' && $verb === 'GET') {
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'operations_education_interest_read',$accountId,12,300))
                fail('rate_limited',429);
            $show=($_GET['includeContacts']??'')==='1';
            if($show){
                if(!rateAllowed($pdo,'operations_education_interest_contact_reveal',$accountId,4,600))
                    fail('rate_limited',429);
                operationsAudit($pdo,$accountId,'education_interest_contact_list_viewed','mfa_owner_only');
            }
            respond(operationsEducationInterestSnapshot($pdo,$show));
        }
        if ($path === '/admin/operations/education-interests' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,
              (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'operations_education_interest_write',$accountId,6,600))
                fail('rate_limited',429);
            $body=jsonBody();
            if(($body['action']??null)==='setEnabled'){
                if(!is_bool($body['enabled']??null) ||
                   ($body['confirmation']??null)!==($body['enabled']
                     ?'ENABLE EDUCATIONAL EMAIL INTEREST'
                     :'DISABLE EDUCATIONAL EMAIL INTEREST'))
                    fail('explicit_owner_confirmation_required',422);
                try{
                    respond(operationsEducationInterestOwnerSwitch(
                      $pdo,$body['enabled'],$accountId
                    ));
                }catch(DomainException $e){fail('email_interest_release_blocked',409);}
                catch(Throwable $e){fail('email_interest_policy_unavailable',503);}
            }
            if(($body['action']??null)==='suppressContact'){
                if(!is_string($body['leadId']??null)||
                   ($body['confirmation']??null)!=='SUPPRESS EDUCATIONAL CONTACT')
                    fail('explicit_contact_suppression_required',422);
                try{
                    respond(operationsEducationInterestOwnerSuppress(
                      $pdo,$body['leadId'],$accountId
                    ));
                }catch(InvalidArgumentException $e){fail('invalid_interest_id',422);}
                catch(DomainException $e){fail('education_interest_not_active',409);}
                catch(Throwable $e){fail('email_interest_suppression_unavailable',503);}
            }
            fail('unknown_educational_interest_action',422);
        }

        if($path==='/admin/operations/education-workbook-notices' && $verb==='GET'){
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'ops_bahar_consent_notice_preview',$accountId,10,300))
                fail('rate_limited',429);
            respond(operationsBaharConsentNoticePreview($pdo));
        }

        // Evidence registration only: source-controlled notices and
        // reviewed external files. Neither endpoint enables private storage.
        if($path==='/admin/operations/education-workbook-evidence' && $verb==='POST'){
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!rateAllowed($pdo,'ops_bahar_external_review',$accountId,3,600))
                fail('rate_limited',429);
            $body=jsonBody();
            try{respond(operationsBaharRecordReviewEvidence($pdo,$body,$accountId));}
            catch(InvalidArgumentException $e){fail('invalid_scientific_privacy_evidence',422);}
            catch(Throwable $e){fail('bahar_external_review_unavailable',503);}
        }
        if($path==='/admin/operations/education-workbook-notices' && $verb==='POST'){
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!rateAllowed($pdo,'ops_bahar_consent_notice_review',$accountId,3,600))
                fail('rate_limited',429);
            $body=jsonBody();
            try{respond(operationsBaharRegisterConsentNotices($pdo,$body,$accountId));}
            catch(InvalidArgumentException $e){fail('invalid_versioned_notice_review',422);}
            catch(DomainException $e){fail('versioned_notice_review_conflict',409);}
            catch(Throwable $e){fail('bahar_notice_registration_unavailable',503);}
        }

        // Verified-adult BAHAR requests: MFA super-admin human review queue.
        // No scanned documents, minor records, automated eligibility or storage.
        if($path==='/admin/operations/education-adult-review' && $verb==='GET'){
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!rateAllowed($pdo,'ops_adult_eligibility_queue',$accountId,12,300))
                fail('rate_limited',429);
            try{
                respond(operationsBaharAdultReviewQueue($pdo,[
                    'state'=>$_GET['state']??'ALL','page'=>$_GET['page']??1
                ]));
            }catch(InvalidArgumentException $e){
                fail('invalid_adult_review_page_filters',422);
            }
        }
        if($path==='/admin/operations/education-adult-review' && $verb==='POST'){
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('super_admin_required',403);
            if(!operationsMutationAllowed($_SERVER,
                (string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!rateAllowed($pdo,'ops_adult_eligibility_decision',$accountId,6,600))
                fail('rate_limited',429);
            $request=jsonBody();
            try{respond(operationsBaharAdultReviewDecide($pdo,$request,$accountId));}
            catch(InvalidArgumentException $e){fail('invalid_independent_age_review',422);}
            catch(DomainException $e){fail('eligibility_state_conflict',409);}
            catch(Throwable $e){
                // Existing incident outbox may enqueue an owner email only
                // when the dedicated BAHAR scope and rule were enabled.
                if(function_exists('operationsAlertRecord'))
                    operationsAlertRecord(
                        $pdo,'bahar_eligibility_queue_failure',
                        'owner_review_queue',nowTs()
                    );
                fail('eligibility_review_write_unavailable',503);
            }
        }

        // Existing ENG-13 controller: bounded 54-reference source directory.
        // Never confirms credentials, traffic or third-party publication.
        if ($path === '/admin/operations/source-directory' && $verb === 'GET') {
            if (!rateAllowed($pdo,'operations_source_directory_read',$accountId,12,300))
                fail('rate_limited',429);
            respond(operationsSourceDirectory($pdo,nowTs()));
        }

        // Per-source controls in the same MySQL database, after admin RBAC and
        // fresh MFA. Public provider catalogue links are not API credentials.
        if ($path === '/admin/operations/source-controls' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_source_controls_read',$accountId,15,300))
                fail('rate_limited',429);
            $directory=operationsSourceDirectory($pdo,nowTs());
            $view=operationsSourceControlView($pdo,$directory,nowTs());
            $view['canManage']=($configuration['operations_admins'][$accountId]['role']??null)==='SUPER_ADMIN';
            respond($view);
        }
        if ($path === '/admin/operations/source-controls' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('source_control_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_source_controls_write',$accountId,15,600))
                fail('rate_limited',429);
            try {
                $input=jsonBody();
                if(!is_array($input))fail('invalid_source_policy',400);
                $directory=operationsSourceDirectory($pdo,nowTs());
                $saved=operationsSourceControlSave($pdo,$directory,$input,$accountId,nowTs());
                $saved['canManage']=true;
                respond($saved);
            }catch(InvalidArgumentException $e){fail('invalid_source_policy',400);}
            catch(Throwable $e){fail('source_control_unavailable',503);}
        }
        if ($path === '/admin/operations/source-metrics' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_source_metrics_read',$accountId,15,300))
                fail('rate_limited',429);
            $id=(string)($_GET['sourceId']??'');
            $days=filter_var($_GET['days']??14,FILTER_VALIDATE_INT);
            $directory=operationsSourceDirectory($pdo,nowTs());
            if(!in_array($id,array_column($directory['sources'],'id'),true))
                fail('unknown_source',404);
            if($days===false||$days<1||$days>365)fail('invalid_range',400);
            respond(operationsSourceMetrics($pdo,$id,(int)$days,nowTs()));
        }
        if ($path === '/admin/operations/source-retention' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('source_retention_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_source_retention_purge',$accountId,5,3600))
                fail('rate_limited',429);
            $body=jsonBody();
            if(!is_array($body)||array_keys($body)!==['sourceId']||!is_string($body['sourceId']))
                fail('invalid_source',400);
            $directory=operationsSourceDirectory($pdo,nowTs());
            if(!in_array($body['sourceId'],array_column($directory['sources'],'id'),true))
                fail('unknown_source',404);
            try {
                $purge=operationsSourceRetentionPurge($pdo,$body['sourceId'],nowTs());
                operationsAudit($pdo,$accountId,'source_retention_purge',
                    substr(hash('sha256',$body['sourceId']),0,64));
                respond($purge);
            }catch(DomainException $e){fail('source_policy_not_configured',409);}
            catch(Throwable $e){fail('source_retention_unavailable',503);}
        }

        // Bilingual private editorial workbench; draft storage only.
        if ($path === '/admin/operations/editor' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_editor_list',$accountId,24,300))fail('rate_limited',429);
            if(!operationsEditorReady($pdo))fail('editor_schema_not_provisioned',503);
            respond(operationsEditorList($pdo));
        }
        if ($path === '/admin/operations/editor/draft' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_editor_draft_read',$accountId,36,300))fail('rate_limited',429);
            if(!operationsEditorReady($pdo))fail('editor_schema_not_provisioned',503);
            try{respond(operationsEditorOpen($pdo,(string)($_GET['id']??'')));}
            catch(InvalidArgumentException $e){fail('invalid_draft_id',400);}
            catch(DomainException $e){fail('draft_not_found',404);}
        }
        if ($path === '/admin/operations/editor/media' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_editor_media_read',$accountId,20,300))fail('rate_limited',429);
            respond(operationsEditorMedia());
        }
        if ($path === '/admin/operations/editor/save' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('editor_super_admin_required',403);
            if(!operationsEditorReady($pdo))fail('editor_schema_not_provisioned',503);
            if(!rateAllowed($pdo,'operations_editor_save',$accountId,20,300))fail('rate_limited',429);
            try{
                $request=jsonBody();
                if(!is_array($request))fail('invalid_editor_payload',400);
                respond(operationsEditorSave($pdo,$request,$accountId,nowTs()));
            }catch(InvalidArgumentException $e){fail('invalid_editor_payload',400);}
            catch(DomainException $e){fail('draft_version_conflict',409);}
            catch(Throwable $e){fail('editor_save_unavailable',503);}
        }

        // Individual source-derived page quality, never fabricated live metrics.
        if ($path === '/admin/operations/page-quality' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_page_quality_list',$accountId,15,300))
                fail('rate_limited',429);
            try { respond(operationsQualityList($_GET)); }
            catch(InvalidArgumentException $e){fail('invalid_quality_filters',400);}
        }
        if ($path === '/admin/operations/page-quality/detail' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_page_quality_detail',$accountId,15,300))
                fail('rate_limited',429);
            try { respond(operationsQualityDetail((string)($_GET['route']??''))); }
            catch(InvalidArgumentException $e){fail('invalid_route',400);}
        }
        // Mail alert controls and incident history share the existing
        // operations membership/MFA boundary and transaction audit log.
        if ($path === '/admin/operations/http-health' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_http_health_read',$accountId,12,300))
                fail('rate_limited',429);
            respond(operationsHttpObserverStatus($pdo,$configuration));
        }
        if ($path === '/admin/operations/alerts' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_alerts_read',$accountId,15,300))
                fail('rate_limited',429);
            $view=operationsAlertSnapshot($pdo,$configuration);
            $view['canManage']=($configuration['operations_admins'][$accountId]['role']??null)==='SUPER_ADMIN';
            respond($view);
        }
        if ($path === '/admin/operations/alert-history' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_alert_history_read',$accountId,15,300))
                fail('rate_limited',429);
            try{respond(operationsAlertHistory($pdo,$_GET,nowTs()));}
            catch(InvalidArgumentException $e){fail('invalid_incident_history_filters',400);}
        }
        if ($path === '/admin/operations/alert-scopes' && $verb === 'GET') {
            if (!rateAllowed($pdo,'operations_alert_scope_list',$accountId,12,300))
                fail('rate_limited',429);
            $view=operationsAlertScopeSnapshot($pdo,nowTs());
            $view['ok']=true;
            $view['canManage']=($configuration['operations_admins'][$accountId]['role']??null)==='SUPER_ADMIN';
            respond($view);
        }
        if ($path === '/admin/operations/alert-scopes' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('alert_scope_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_alert_scope_write',$accountId,20,600))
                fail('rate_limited',429);
            if(!operationsAlertAvailable($pdo))fail('alert_scope_schema_unavailable',503);
            try{
                $body=jsonBody();
                if(!is_array($body))fail('invalid_alert_scope',400);
                $view=operationsAlertScopeUpdate($pdo,$body,$accountId,nowTs());
                $view['ok']=true;$view['canManage']=true;
                respond($view);
            }catch(InvalidArgumentException $e){fail('invalid_alert_scope',400);}
            catch(Throwable $e){fail('alert_scope_update_unavailable',503);}
        }

        // Response monitor: fixed canonical HTTPS targets only. A manual
        // request queues a CLI probe; no external HTTP is fetched by browsers.
        if ($path === '/admin/operations/response-health' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_response_health_read',$accountId,12,300))
                fail('rate_limited',429);
            $view=operationsResponseMonitorStatus($pdo,nowTs());
            $view['canManage']=($configuration['operations_admins'][$accountId]['role']??null)==='SUPER_ADMIN';
            respond($view);
        }
        if ($path === '/admin/operations/response-health' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('response_health_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_response_health_write',$accountId,10,900))
                fail('rate_limited',429);
            try{
                $body=jsonBody();
                if(!is_array($body))fail('invalid_monitor_policy',400);
                $view=operationsResponseMonitorConfigure($pdo,$body,$accountId,nowTs());
                $view['canManage']=true;
                respond($view);
            }catch(InvalidArgumentException $e){fail('invalid_monitor_policy',400);}
            catch(DomainException $e){
                if($e->getMessage()==='response_monitor_schema_missing')
                    fail('monitor_schema_unavailable',503);
                fail('monitor_disabled',409);
            }
            catch(Throwable $e){fail('monitor_schema_unavailable',503);}
        }

        if ($path === '/admin/operations/alert-rules' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('alert_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_alerts_change',$accountId,12,600))
                fail('rate_limited',429);
            if(!operationsAlertAvailable($pdo))fail('alert_schema_unavailable',503);
            try {
                $body=jsonBody();
                if(!is_array($body))fail('invalid_alert_rule',400);
                operationsAlertUpdate($pdo,$body,$accountId);
                $view=operationsAlertSnapshot($pdo,$configuration);
                $view['canManage']=true;
                respond($view);
            }catch(InvalidArgumentException $e){fail('invalid_alert_rule',400);}
            catch(DomainException $e){fail('alert_rule_not_provisioned',409);}
            catch(Throwable $e){fail('alert_rule_update_unavailable',503);}
        }

        if ($path === '/admin/operations/existing-features' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_existing_features_read',$accountId,12,300))
                fail('rate_limited',429);
            respond(operationsExistingFeatures());
        }

        // Owner-only keyword intelligence: no public asset or unauthenticated strategy data.
        // This branch is reached only after verified account, server admin membership
        // and fresh TOTP session, and inherits private no-store API headers.
        if ($path === '/admin/operations/keyword-map' && $verb === 'GET') {
            if (!rateAllowed($pdo,'operations_keyword_map_read',$accountId,30,300))
                fail('rate_limited',429);
            $mapPath=__DIR__.'/internal/keyword-master-map-v1.json';
            $raw=@file_get_contents($mapPath);
            if (!is_string($raw) || strlen($raw)>65536) fail('keyword_map_unavailable',503);
            $map=json_decode($raw,true);
            if (!is_array($map) || ($map['schema']??'')!=='jr-keyword-master-map-v1'
                || !is_array($map['keywords']??null)
                || count($map['keywords'])<1 || count($map['keywords'])>150)
                fail('keyword_map_unavailable',503);
            $map['ok']=true;
            respond($map);
        }

        // Provider-observed AISV snapshot: private, bounded and only after fresh MFA.
        // This does not call Ubersuggest on behalf of the owner or infer new samples.
        // Private, non-polling direct GSC aggregate projection. A locally
        // validated snapshot is never represented as authenticated Google data.
        // No snapshot configured => explicit unavailable, not invented zero.
        // Same authenticated Operations Control Center, distinct GSC and GA4 states.
        // Both unavailable observations stay null; no Google API or vendor I/O.
        if ($path === '/admin/operations/search-intelligence' && $verb === 'GET') {
            if (($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('owner_search_intelligence_forbidden',403);
            if (!rateAllowed($pdo,'operations_search_intelligence_read',$accountId,12,300))
                fail('rate_limited',429);
            respond(operationsSearchIntelligenceSnapshot(
                (string)($configuration['gsc_private_snapshot_path']??''),nowTs()));
        }

        if ($path === '/admin/operations/gsc-direct' && $verb === 'GET') {
            if (($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('owner_gsc_forbidden',403);
            if (!rateAllowed($pdo,'operations_gsc_direct_read',$accountId,12,300))
                fail('rate_limited',429);
            respond(operationsGscDirectSnapshot(
                (string)($configuration['gsc_private_snapshot_path']??''),nowTs()));
        }

        if ($path === '/admin/operations/ai-visibility' && $verb === 'GET') {
            if (($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('owner_ai_visibility_forbidden',403);
            if (!rateAllowed($pdo,'operations_ai_visibility_read',$accountId,12,300))
                fail('rate_limited',429);
            respond(operationsAiVisibilitySnapshot());
        }

        if ($path === '/admin/operations/commerce' && $verb === 'GET') {
            if(!rateAllowed($pdo,'operations_commerce_read',$accountId,12,300))
                fail('rate_limited',429);
            respond(operationsCommerceSnapshot($pdo,nowTs()));
        }
        // Book holds expire after 24h ONLY when the owner has independently
        // confirmed terminal failed/cancelled BitPay status for this exact
        // gateway id_get. A pending row alone is never negative evidence.
        // Recover donations whose verified BitPay payment did not reach the
        // public callback. Existing Stage09 ledger remains the only authority.
        if ($path === '/admin/operations/commerce/donation-reconcile' && $verb === 'POST') {
            if (($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('donation_recovery_owner_role_required',403);
            if (!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if (!rateAllowed($pdo,'operations_donation_recovery',$accountId,3,600))
                fail('rate_limited',429);
            $body=jsonBody();
            if (($body['ownerConfirmedPanelTransaction']??null)!==true ||
                !is_string($body['orderId']??null) ||
                !is_string($body['gatewayId']??null) ||
                !is_string($body['transactionId']??null))
                fail('verified_donation_transaction_required',422);
            try {
                // gatewayPost is the existing server-only BitPay adapter.
                // Never accept a browser-supplied provider status or amount.
                $verified=jrRecoverPendingVerifiedDonation($pdo,$body['orderId'],
                    $body['gatewayId'],$body['transactionId'],
                    static function(string $transactionId,string $gatewayId): ?array {
                        $raw=gatewayPost('gateway-result-second',[
                            'trans_id'=>$transactionId,'id_get'=>$gatewayId,'json'=>'1']);
                        $decoded=json_decode($raw,true);
                        return is_array($decoded)?$decoded:null;
                    });
                try {
                    operationsAudit($pdo,$accountId,'donation_gateway_recovered',$body['orderId']);
                } catch (Throwable $auditError) {
                    // Payment already committed by Stage09; never report that a
                    // confirmed recovery was rolled back by an audit failure.
                    error_log('Recovered donation audit unavailable: '.get_class($auditError));
                }
                respond(['ok'=>true,'schema'=>'commerce-donation-recovery-v1',
                    'change'=>$verified]);
            } catch (InvalidArgumentException $e) {fail('invalid_donation_recovery_identity',422);}
            catch (DomainException $e) {fail('donation_verification_or_state_conflict',409);}
            catch (Throwable $e) {
                error_log('Owner donation recovery unavailable: '.get_class($e));
                fail('donation_recovery_unavailable',503);
            }
        }
        if ($path === '/admin/operations/commerce/book-expire' && $verb === 'POST') {
            if (($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('book_expiration_owner_role_required',403);
            if (!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if (!rateAllowed($pdo,'operations_book_expiration',$accountId,5,600))
                fail('rate_limited',429);
            $body=jsonBody();
            if (($body['ownerVerifiedGateway']??null)!==true
                || ($body['acknowledgeLatePaymentRisk']??null)!==true
                || !is_string($body['orderId']??null)
                || !is_string($body['gatewayId']??null)
                || !is_string($body['providerStatus']??null))
                fail('terminal_gateway_evidence_required',422);
            try {
                $change=jrExpireVerifiedUnpaidBook($pdo,$body['orderId'],
                    $body['gatewayId'],$accountId,$body['providerStatus']);
                respond(['ok'=>true,'schema'=>'commerce-book-expiry-owner-v1',
                    'change'=>$change,'automaticProviderCheck'=>false]);
            } catch (InvalidArgumentException $e) { fail('invalid_book_expiration_evidence',422); }
            catch (DomainException $e) { fail('book_expiration_payment_or_state_conflict',409); }
            catch(Throwable $e) {
                error_log('Owner book expiration unavailable: '.get_class($e));
                fail('book_expiration_unavailable',503);
            }
        }
        if ($path === '/admin/operations/commerce/service-advance' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!rateAllowed($pdo,'operations_commerce_service_advance',$accountId,10,300))
                fail('rate_limited',429);
            $body=jsonBody();
            try {
                $change=operationsCommerceServiceAdvance($pdo,$accountId,$body);
                respond(['ok'=>true,'schema'=>'commerce-service-transition-v1',
                    'change'=>$change]);
            }catch(InvalidArgumentException $e){fail('invalid_service_transition',400);}
            catch(DomainException $e){fail('service_payment_or_state_conflict',409);}
            catch(Throwable $e){
                error_log('Owner service transition unavailable: '.get_class($e));
                fail('service_transition_unavailable',503);
            }
        }
        if ($path === '/admin/operations/commerce/service-delivery' && $verb === 'POST') {
            // This is an explicit owner attestation, not automatic delivery.
            // An ADMIN may schedule, but only the SUPER_ADMIN may attest.
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('delivery_owner_role_required',403);
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!rateAllowed($pdo,'operations_service_delivery',$accountId,5,300))
                fail('rate_limited',429);
            try {
                $change=operationsCommerceRecordDelivery($pdo,$accountId,jsonBody());
                respond(['ok'=>true,'schema'=>'commerce-service-delivery-attestation-v1',
                    'change'=>$change]);
            } catch(InvalidArgumentException $e) { fail('invalid_delivery_attestation',400); }
            catch(DomainException $e) { fail('delivery_payment_or_state_conflict',409); }
            catch(Throwable $e) {
                error_log('Owner delivery recording unavailable: '.get_class($e));
                fail('delivery_evidence_not_ready',503);
            }
        }
        if ($path === '/admin/operations/commerce/service-intake' && $verb === 'GET') {
            // Operator reads actual client notes only with verified SUPER_ADMIN
            // session + recent TOTP. Standard commerce snapshots remain PII-free.
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('service_intake_owner_role_required',403);
            if(!rateAllowed($pdo,'service_intake_owner_read',$accountId,12,300))
                fail('rate_limited',429);
            $order=$_GET['order']??null;$sku=$_GET['sku']??null;
            if(!is_string($order)||!is_string($sku))fail('invalid_service_reference',400);
            try {
                jrServiceIntakeReference($order,$sku);
                $case=$pdo->prepare('SELECT 1 FROM commerce_service_cases WHERE order_id=? AND sku=?');
                $case->execute([$order,$sku]);
                if($case->fetchColumn()===false)fail('service_case_not_found',404);
                $intake=jrServiceIntakeRead($pdo,$order,$sku);
                respond(['ok'=>true,'schema'=>'private-service-intake-v1',
                    'buyerNotesVisibleToOwnerOnly'=>true]+$intake);
            } catch(InvalidArgumentException $e){fail('invalid_service_reference',400);}
            catch(Throwable $e){fail('service_intake_owner_unavailable',503);}
        }
        // Owner's private file custody: SUPER_ADMIN + fresh TOTP; authenticated
        // order and matched provider claim remain mandatory for each operation.
        if(in_array($path,['/admin/operations/commerce/service-files',
                           '/admin/operations/commerce/service-file'],true)){
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('service_files_owner_role_required',403);
            if(!jrServiceFilesReady($pdo))fail('private_service_files_unavailable',503);
            if($path==='/admin/operations/commerce/service-file' && $verb==='GET'){
                $id=$_GET['id']??null;
                if(!is_string($id)||!validUuid($id))fail('invalid_file_reference',400);
                if(!rateAllowed($pdo,'owner_service_file_download',$accountId,25,300))
                    fail('rate_limited',429);
                try{jrServiceFileDownload($pdo,$id,null);}
                catch(DomainException $e){fail('private_file_not_found',404);}
                catch(Throwable $e){error_log('Owner service file download: '.get_class($e));fail('private_file_unavailable',503);}
            }
            if($path==='/admin/operations/commerce/service-files' && $verb==='GET'){
                $order=$_GET['order']??null;$sku=$_GET['sku']??null;
                if(!is_string($order)||!is_string($sku))fail('invalid_service_reference',400);
                if(!rateAllowed($pdo,'owner_service_file_list',$accountId,20,300))
                    fail('rate_limited',429);
                try{respond(['ok'=>true,'schema'=>'private-service-files-v1','ownerView'=>true]+
                    jrServiceFilesList($pdo,$order,$sku,null));}
                catch(InvalidArgumentException $e){fail('invalid_service_reference',400);}
                catch(DomainException $e){fail('service_case_not_found',404);}
                catch(Throwable $e){fail('owner_private_files_unavailable',503);}
            }
            if($path==='/admin/operations/commerce/service-files' && $verb==='POST'){
                if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                    fail('csrf_forbidden',403);
                if(!str_starts_with(strtolower((string)($_SERVER['CONTENT_TYPE']??'')),'multipart/form-data;'))
                    fail('multipart_form_required',415);
                if(!rateAllowed($pdo,'owner_service_file_upload',$accountId,5,3600))
                    fail('rate_limited',429);
                if(array_keys($_POST)!==['orderId','sku']||array_keys($_FILES)!==['document'])
                    fail('invalid_service_file_form',400);
                try{
                    $file=jrServiceFileUpload($pdo,(string)$_POST['orderId'],(string)$_POST['sku'],
                        $accountId,null,'professional_output',(array)$_FILES['document']);
                    respond(['ok'=>true,'schema'=>'private-service-files-v1','file'=>$file],201);
                }catch(InvalidArgumentException $e){fail('invalid_service_file',422);}
                catch(DomainException $e){fail('private_case_or_file_limit_conflict',409);}
                catch(Throwable $e){
                    error_log('Owner service file upload: '.get_class($e));
                    fail('owner_file_upload_unavailable',503);
                }
            }
            fail('method_not_allowed',405);
        }
        if ($path === '/admin/operations/commerce/availability' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!rateAllowed($pdo,'operations_consultation_capacity',$accountId,8,300))
                fail('rate_limited',429);
            try {
                $change=operationsConsultationAvailabilityChange($pdo,$accountId,jsonBody());
                respond(['ok'=>true,'schema'=>'commerce-consultation-capacity-v1',
                    'change'=>$change]);
            } catch(InvalidArgumentException $e) { fail('invalid_consultation_capacity',400); }
            catch(DomainException $e) { fail('consultation_capacity_conflict',409); }
            catch(Throwable $e) {
                error_log('Owner consultation availability unavailable: '.get_class($e));
                fail('consultation_capacity_unavailable',503);
            }
        }
        if ($path === '/admin/operations/growth' && $verb === 'GET') {
            require_once __DIR__.'/growth-stage14.php';
            respond(stage14AdminGrowthSnapshot($pdo));
        }
        // Customer email for one-to-one service follow-up is sensitive:
        // only a fresh-MFA SUPER_ADMIN can see the current, consenting worklist.
        if ($path === '/admin/operations/growth/leads' && $verb === 'GET') {
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('growth_lead_owner_required',403);
            if(!rateAllowed($pdo,'operations_growth_lead_read',$accountId,12,300))
                fail('rate_limited',429);
            require_once __DIR__.'/growth-stage14.php';
            $cursor=$_GET['cursor']??null;
            if($cursor!==null && !is_string($cursor)) fail('invalid_lead_cursor',400);
            try {respond(stage14AdminLeadWorklist($pdo,$cursor));}
            catch(InvalidArgumentException $e) {fail('invalid_lead_cursor',400);}
        }
        if ($path === '/admin/operations/growth/leads/transition' && $verb === 'POST') {
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('growth_lead_owner_required',403);
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(!rateAllowed($pdo,'operations_growth_lead_change',$accountId,10,300))
                fail('rate_limited',429);
            require_once __DIR__.'/growth-stage14.php';
            try{
                respond(stage14AdminLeadTransition($pdo,$accountId,jsonBody()));
            }catch(InvalidArgumentException $e){ fail('invalid_lead_transition',400); }
            catch(DomainException $e){ fail('lead_state_or_consent_conflict',409); }
            catch(Throwable $e){
                error_log('Owner lead triage unavailable: '.get_class($e));
                fail('lead_transition_unavailable',503);
            }
        }
        if ($path === '/admin/operations/action-runs' && $verb === 'GET') {
            if (!operationsActionRunsReady($pdo)) fail('action_journal_schema_unavailable',503);
            respond(['ok'=>true,'schema'=>'operations-readonly-action-history-v1',
                'runs'=>operationsActionHistory($pdo,$accountId,nowTs()),
                'limitation'=>'Only the seven registered read-only observations may run. Unregistered or mutating Actions cannot be executed.']);
        }
        if ($path === '/admin/operations/action-runs' && $verb === 'POST') {
            if (!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            $body=jsonBody();
            if (!is_array($body) || count($body)!==2
                || !array_key_exists('actionId',$body) || !array_key_exists('requestKey',$body)
                || !is_string($body['actionId']) || !is_string($body['requestKey']))
                fail('invalid_action_request',400);
            $action=operationsActionDefinition(operationsRegistry(),$body['actionId']);
            if ($action===null) fail('action_executor_unavailable',403);
            if (!operationsActionRunsReady($pdo))fail('action_journal_schema_unavailable',503);
            if (!rateAllowed($pdo,'operations_action_observation',$accountId,12,300))
                fail('rate_limited',429);
            $releaseRow=$pdo->query('SELECT release_sha FROM operations_release WHERE singleton_id=1')->fetch();
            $release=(string)($releaseRow['release_sha']??'');
            if(!preg_match('/^[a-f0-9]{40}$/D',$release))fail('current_release_unavailable',503);
            try {
                $run=operationsActionExecute($pdo,operationsRegistry(),$accountId,$body['actionId'],
                    $body['requestKey'],$release,$configuration,nowTs());
                respond(['ok'=>true,'schema'=>'operations-readonly-action-run-v1','run'=>$run]);
            } catch (InvalidArgumentException $e) {fail('invalid_action_request',400);}
            catch (DomainException $e) {fail('action_request_conflict',409);}
            catch (Throwable $e) {fail('action_execution_unavailable',503);}
        }

        // The owner initiates the DB health scan; neither opening the
        // dashboard nor creating a configuration starts a background scan.
        if ($path === '/admin/operations/database-health' && $verb === 'GET') {
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('database_health_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_db_health_read',$accountId,12,3600))
                fail('rate_limited',429);
            respond(operationsDbHealthReport($pdo,nowTs()));
        }
        if ($path === '/admin/operations/database-health/settings' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('database_health_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_db_health_settings',$accountId,6,3600))
                fail('rate_limited',429);
            try{
                $settings=operationsDbHealthConfigure($pdo,jsonBody(),$accountId,nowTs());
                respond(['ok'=>true,'schema'=>'operations-database-health-settings-v1',
                    'settings'=>$settings,'hostCronVerified'=>null]);
            }catch(InvalidArgumentException $e){fail('invalid_database_health_policy',400);}
            catch(Throwable $e){fail('database_health_schema_unavailable',503);}
        }
        if ($path === '/admin/operations/database-health/purge-preview' && $verb === 'GET') {
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('database_health_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_db_health_purge_preview',$accountId,10,3600))
                fail('rate_limited',429);
            try{respond(operationsDbHealthPurgePreview($pdo,nowTs()));}
            catch(Throwable $e){fail('database_health_schema_unavailable',503);}
        }
        if ($path === '/admin/operations/database-health/purge-expired' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('database_health_super_admin_required',403);
            $body=jsonBody();
            if(!is_array($body)||array_keys($body)!==['confirmation']||
                $body['confirmation']!=='DELETE EXPIRED DATABASE LOGS')
                fail('database_health_purge_confirmation_required',400);
            if(!rateAllowed($pdo,'operations_db_health_purge',$accountId,3,3600))
                fail('rate_limited',429);
            try{respond(operationsDbHealthPurgeExpired($pdo,$accountId,nowTs()));}
            catch(Throwable $e){fail('database_health_schema_unavailable',503);}
        }

        if ($path === '/admin/operations/collection-settings' && $verb === 'GET') {
            $controls=operationsCollectorStatus($pdo,nowTs());
            $controls['canManage']=($configuration['operations_admins'][$accountId]['role']??null)==='SUPER_ADMIN';
            respond($controls);
        }
        if ($path === '/admin/operations/collection-settings' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('collector_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_collector_config',$accountId,20,600))fail('rate_limited',429);
            $body=jsonBody();
            if(!is_array($body)||count($body)!==4||!is_string($body['key']??null)
                || !is_bool($body['enabled']??null)||!is_string($body['cadence']??null)
                || !is_int($body['clockMinutes']??null))fail('invalid_collector_policy',400);
            try{
                operationsCollectorConfigure($pdo,$body['key'],$body['enabled'],
                    $body['cadence'],$body['clockMinutes'],$accountId,nowTs());
                $controls=operationsCollectorStatus($pdo,nowTs());$controls['canManage']=true;
                respond($controls);
            }catch(InvalidArgumentException $e){fail('invalid_collector_policy',400);}
        }
        // Independent master switch: an installed cron entry alone never
        // activates scheduling; only fresh-MFA SUPER_ADMIN can change it.
        if ($path === '/admin/operations/collection-automatic' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('collector_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_collector_master',$accountId,6,3600))
                fail('rate_limited',429);
            $body=jsonBody();
            if(!is_array($body)||array_keys($body)!==['enabled','confirmation']||
                !is_bool($body['enabled'])||
                ($body['confirmation']??null)!==($body['enabled']
                    ?'ENABLE SCHEDULED COLLECTION':'DISABLE SCHEDULED COLLECTION'))
                fail('invalid_collector_master',400);
            try {
                operationsCollectorAutomaticConfigure($pdo,$body['enabled'],$accountId,nowTs());
                $view=operationsCollectorStatus($pdo,nowTs());
                $view['canManage']=true;
                respond($view);
            }catch(Throwable $e){fail('collector_master_unavailable',503);}
        }
        // Selective owner-controlled deletion of disposable diagnostic
        // telemetry. Immutable evidence, payments and users are never targets.
        if ($path === '/admin/operations/collection-data-preview' && $verb === 'GET') {
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('collector_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_collector_data_preview',$accountId,15,3600))
                fail('rate_limited',429);
            $scope=$_GET['scope']??null;
            if(!is_string($scope)||strlen($scope)>96)fail('invalid_collector_data_scope',400);
            try{respond(operationsCollectorDataPreview($pdo,$scope));}
            catch(InvalidArgumentException $e){fail('invalid_collector_data_scope',400);}
            catch(Throwable $e){fail('collector_data_preview_unavailable',503);}
        }
        if ($path === '/admin/operations/collection-data-delete' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('collector_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_collector_data_delete',$accountId,5,3600))
                fail('rate_limited',429);
            $body=jsonBody();
            if(!is_array($body)||array_keys($body)!==['scope','confirmation']
                ||!is_string($body['scope'])||strlen($body['scope'])>96
                ||($body['confirmation']??null)!=='DELETE SOURCE DIAGNOSTICS:'.$body['scope'])
                fail('collector_data_confirmation_required',400);
            try{respond(operationsCollectorDataPurge($pdo,$body['scope'],$accountId,nowTs()));}
            catch(InvalidArgumentException $e){fail('invalid_collector_data_scope',400);}
            catch(DomainException $e){fail('collector_busy',409);}
            catch(Throwable $e){fail('collector_data_delete_unavailable',503);}
        }
        if ($path === '/admin/operations/github-audits/refresh' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('collector_super_admin_required',403);
            if(!rateAllowed($pdo,'operations_collector_manual',$accountId,3,3600))
                fail('rate_limited',429);
            $body=jsonBody();
            if(!is_array($body)||array_keys($body)!==['scope']||!is_string($body['scope']))
                fail('invalid_collector_scope',400);
            try{
                $result=operationsCollectorRefresh($pdo,'manual',nowTs(),$body['scope']);
                $policies=operationsCollectorPolicies($pdo);
                $cached=operationsCollectorCache($pdo,$policies,nowTs());
                $release=(string)($pdo->query('SELECT release_sha FROM operations_release WHERE singleton_id=1')->fetch()['release_sha']??'');
                $source=operationsGithubAuditSnapshot(operationsRegistry(),$release,$cached['sources']);
                $source['collection']=operationsCollectorStatus($pdo,nowTs());
                respond(['ok'=>true,'refresh'=>$result,'auditSnapshot'=>$source]);
            }catch(InvalidArgumentException $e){fail('invalid_collector_scope',400);}
        }
        if ($path === '/admin/operations/github-audits' && $verb === 'GET') {
            // No provider network I/O on dashboard views. Only private, unexpired
            // MySQL snapshots are projected. An absent observation remains unknown.
            if(!rateAllowed($pdo,'operations_github_audit_read',$accountId,12,600))
                fail('rate_limited',429);
            $at=nowTs();
            $controls=operationsCollectorPolicies($pdo);
            $cached=operationsCollectorCache($pdo,$controls,$at);
            $release=(string)($pdo->query('SELECT release_sha FROM operations_release WHERE singleton_id=1')->fetch()['release_sha']??'');
            $source=operationsGithubAuditSnapshot(operationsRegistry(),$release,$cached['sources']);
            $source['collection']=operationsCollectorStatus($pdo,$at);
            $super=($configuration['operations_admins'][$accountId]['role']??null)==='SUPER_ADMIN';
            $ready=$super&&operationsActionRunsReady($pdo)
                && operationsGithubDispatchToken($configuration)!==null
                && function_exists('curl_init');
            $source['summary']['dispatchReady']=$ready;
            $source['summary']['providerPermissionVerified']=null; // A configured credential is not a tested GitHub grant.
            $source['summary']['canReconcile']=$super&&operationsActionRunsReady($pdo);
            $history=operationsActionRunsReady($pdo)?operationsActionHistory($pdo,$accountId,nowTs()):[];
            $source['ownerSubmissions']=operationsGithubCorrelatedRuns($source['audits'],$history);
            respond($source);
        }
        if ($path === '/admin/operations/github-audits/reconcile' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('audit_owner_approval_required',403);
            $body=jsonBody();
            if(!is_array($body)||count($body)!==0)fail('invalid_audit_request',400);
            if(!rateAllowed($pdo,'operations_github_reconcile',$accountId,6,300))
                fail('rate_limited',429);
            $cached=operationsCollectorCache($pdo,operationsCollectorPolicies($pdo),nowTs());
            $provider=operationsGithubAuditSnapshot(operationsRegistry(),(string)($pdo->query('SELECT release_sha FROM operations_release WHERE singleton_id=1')->fetch()['release_sha']??''),$cached['sources']);
            $result=operationsGithubReconcile($pdo,$accountId,$provider['audits']??[],nowTs());
            $history=operationsActionHistory($pdo,$accountId,nowTs());
            $provider['ownerSubmissions']=operationsGithubCorrelatedRuns($provider['audits'],$history);
            $provider['summary']['canReconcile']=true;
            $provider['summary']['dispatchReady']=operationsGithubDispatchToken($configuration)!==null
                && function_exists('curl_init');
            respond(['ok'=>true,'schema'=>'operations-gh-audit-reconcile-v1',
                'reconciliation'=>$result,'auditSnapshot'=>$provider,'runs'=>$history,
                'limitation'=>'Only independently found GitHub workflow conclusions are stored; no report gate, payment or site deployment is certified.']);
        }
        if ($path === '/admin/operations/github-audits/dispatch' && $verb === 'POST') {
            if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            // Default-deny: only the owner's effective DB+private-config SUPER_ADMIN role.
            if(($configuration['operations_admins'][$accountId]['role']??null)!=='SUPER_ADMIN')
                fail('audit_owner_approval_required',403);
            $body=jsonBody();
            if(!is_array($body)||count($body)!==3
                || !is_string($body['actionId']??null)
                || !is_string($body['requestKey']??null)
                || ($body['approval']??null)!=='APPROVE_READONLY_AUDIT')
                fail('invalid_audit_approval',400);
            if(!operationsGithubDispatchDefinition(operationsRegistry(),$body['actionId']))
                fail('audit_not_allowlisted',403);
            if(!operationsActionRunsReady($pdo))fail('action_journal_schema_unavailable',503);
            if(operationsGithubDispatchToken($configuration)===null || !function_exists('curl_init'))
                fail('audit_dispatch_not_configured',503);
            if(!rateAllowed($pdo,'operations_github_audit',$accountId,3,300))fail('rate_limited',429);
            $releaseRow=$pdo->query('SELECT release_sha FROM operations_release WHERE singleton_id=1')->fetch();
            $release=(string)($releaseRow['release_sha']??'');
            if(!preg_match('/^[a-f0-9]{40}$/D',$release))fail('current_release_unavailable',503);
            try {
                $run=operationsGithubDispatchRun($pdo,operationsRegistry(),$accountId,
                    $body['actionId'],$body['requestKey'],$body['approval'],
                    $release,$configuration,nowTs());
                respond(['ok'=>true,'schema'=>'operations-gh-audit-dispatch-v1','run'=>$run,
                    'limitation'=>'GitHub HTTP 204 acknowledges request receipt only; check official run ID and conclusion on refresh. No Action/production acceptance is asserted.']);
            }catch(InvalidArgumentException $e){fail('invalid_audit_approval',400);}
            catch(DomainException $e){fail('audit_request_conflict',409);}
            catch(Throwable $e){fail('audit_dispatch_unavailable',503);}
        }
        if ($path === '/admin/operations/social/settings' && $verb === 'GET') {
            respond(socialSettingsSnapshot($pdo));
        }
        if ($path === '/admin/operations/social/settings' && $verb === 'POST') {
            if (!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if (!socialSettingsReady($pdo))fail('social_settings_schema_unavailable',503);
            if (!rateAllowed($pdo,'social_channel_settings',$accountId,20,300))fail('rate_limited',429);
            try { respond(socialSettingsSave($pdo,jsonBody(),$accountId,nowTs())); }
            catch (InvalidArgumentException $e) {fail('invalid_social_settings',400);}
            catch (Throwable $e) {fail('social_settings_unavailable',503);}
        }
        if ($path === '/admin/operations/social/account-intents' && $verb === 'POST') {
            if (!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if (!socialSettingsReady($pdo))fail('social_settings_schema_unavailable',503);
            if (!rateAllowed($pdo,'social_account_intent',$accountId,10,3600))fail('rate_limited',429);
            try { respond(socialIntentCreate($pdo,jsonBody(),$accountId,nowTs())); }
            catch (InvalidArgumentException $e) {fail('invalid_account_intent',400);}
            catch (PDOException $e) {
                if ((string)$e->getCode()==='23000')fail('account_intent_exists',409);
                fail('social_settings_unavailable',503);
            } catch(Throwable $e) {fail('social_settings_unavailable',503);}
        }
        if ($path === '/admin/operations/social/account-intents/cancel' && $verb === 'POST') {
            if (!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if (!socialSettingsReady($pdo))fail('social_settings_schema_unavailable',503);
            if (!rateAllowed($pdo,'social_account_intent_cancel',$accountId,10,300))fail('rate_limited',429);
            try { respond(socialIntentCancel($pdo,jsonBody(),$accountId,nowTs())); }
            catch (InvalidArgumentException $e) {fail('invalid_account_intent',400);}
            catch (DomainException $e) {fail('account_intent_conflict',409);}
            catch(Throwable $e) {fail('social_settings_unavailable',503);}
        }
        if ($path === '/admin/operations/social/review' && $verb === 'GET') {
            try { respond(socialReviewList($pdo,nowTs())); }
            catch (Throwable $e) { fail('social_review_unavailable',503); }
        }
        if ($path === '/admin/operations/social/approve' && $verb === 'POST') {
            if (!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if (!rateAllowed($pdo,'social_review_approval',$accountId,10,300))
                fail('rate_limited',429);
            $body=jsonBody();
            if (!is_array($body) || count($body)!==2 ||
                !is_string($body['deliveryId']??null) || !is_string($body['digest']??null))
                fail('invalid_social_review',400);
            try {
                $digest=socialReviewApprove($pdo,$body['deliveryId'],$body['digest'],$accountId,nowTs());
                respond(['ok'=>true,'schema'=>'social-review-decision-v1',
                    'status'=>'scheduled','deliveryId'=>$body['deliveryId'],
                    'approvedDigest'=>$digest,'published'=>false]);
            } catch (InvalidArgumentException $e) {fail('invalid_social_review',400);}
            catch (DomainException $e) {fail('social_review_conflict',409);}
            catch (Throwable $e) {fail('social_review_unavailable',503);}
        }
        if ($path === '/admin/operations/social/reject' && $verb === 'POST') {
            if (!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
                fail('csrf_forbidden',403);
            if (!rateAllowed($pdo,'social_review_rejection',$accountId,10,300))
                fail('rate_limited',429);
            $body=jsonBody();
            if (!is_array($body) || count($body)!==2 ||
                !is_string($body['deliveryId']??null) || !is_string($body['digest']??null))
                fail('invalid_social_review',400);
            try {
                socialReviewReject($pdo,$body['deliveryId'],$body['digest'],$accountId,nowTs());
                respond(['ok'=>true,'schema'=>'social-review-decision-v1',
                    'status'=>'revoked','deliveryId'=>$body['deliveryId'],'published'=>false]);
            } catch (InvalidArgumentException $e) {fail('invalid_social_review',400);}
            catch (DomainException $e) {fail('social_review_conflict',409);}
            catch (Throwable $e) {fail('social_review_unavailable',503);}
        }
        if ($path === '/admin/operations/social' && $verb === 'GET') {
            respond(operationsSocialSnapshot($pdo));
        }
        if ($path === '/admin/operations/audit-timeline' && $verb === 'GET') {
            // Private, MFA-gated, bounded and read-only event timeline. This is
            // historical operations_audit evidence, NOT a live error monitor.
            if(!rateAllowed($pdo,'operations_audit_timeline_read',$accountId,20,300))
                fail('rate_limited',429);
            $rows=$pdo->query('SELECT sequence_id,action,reference_id,occurred_at FROM operations_audit ORDER BY sequence_id DESC LIMIT 50')->fetchAll(PDO::FETCH_ASSOC);
            $events=[];
            foreach($rows as $row){
                $events[]=['sequence'=>(int)$row['sequence_id'],
                    'type'=>(string)$row['action'],
                    'reference'=>(string)$row['reference_id'],
                    'occurredAt'=>(int)$row['occurred_at']];
            }
            respond(['ok'=>true,'schema'=>'operations-audit-timeline-v1',
                'events'=>$events,'limit'=>50,'readOnly'=>true,
                'liveNotifications'=>false,'source'=>'operations_audit',
                'limitation'=>'Existing audit records only; no real-time monitoring, delivery guarantee or customer-event completeness.']);
        }
        if ($path === '/admin/operations/free-resources' && $verb === 'GET') {
            // This is below the verified administrator + MFA checks. No external API is called.
            $raw=@file_get_contents(__DIR__.'/internal/free-resources-registry.json');
            $catalogue=is_string($raw)?json_decode($raw,true):null;
            if(!is_array($catalogue)||($catalogue['schema']??'')!=='operations-free-resources-v1'
                || count($catalogue['resources']??[])!==30)fail('resource_catalogue_unavailable',503);
            respond(['ok'=>true,'schema'=>'operations-free-resources-v1',
                'catalogueDate'=>$catalogue['catalogueDate']??null,
                'connectionStatus'=>'UNVERIFIED','verifiedExternalConnections'=>0,
                'automatedDataInUse'=>false,'resources'=>$catalogue['resources'],
                'providerInventory'=>operationsProviderInventory(),
                'scholarlyObservation'=>operationsFreeScholarlyObservation(),
                'performanceObservation'=>operationsFreePerformanceObservation(),
                'localLighthouseObservation'=>operationsLocalLighthouseObservation(),
                'manualPagespeedObservation'=>operationsManualPagespeedObservation()]);
        }
        if ($path === '/admin/operations' && $verb === 'GET') {
            $at=nowTs();$snapshot=operationsSnapshot($pdo,$at);
            if(operationsRecordProductionAccess($pdo,$snapshot,$accountId,$at))$snapshot=operationsSnapshot($pdo,$at);
            // ENG-13 retains the same privately authorized reporting surface.
            // Action execution history is not an acceptance gate and is owner-scoped.
            $ready=operationsActionRunsReady($pdo);
            $runs=$ready?operationsActionHistory($pdo,$accountId,$at):[];
            // Read-only provider coverage for the existing master controller.
            // This comes from the deploy-time private projection, not external APIs.
            $snapshot['reporting']['providerInventory']=operationsProviderInventory();
            $snapshot['reporting']['alertCenter']=operationsAlertSnapshot($pdo,$configuration);
            $snapshot['reporting']['alertCenter']['canManage']=(($configuration['operations_admins'][$accountId]['role']??null)==='SUPER_ADMIN');
            $snapshot['reporting']['pageQualityOverview']=operationsQualitySummary();
            $snapshot['reporting']['activationReadiness']=operationsActivationReport($pdo,$configuration,$at);
            $snapshot['reporting']['existingFeatureInventory']=operationsExistingFeatures();
            $snapshot['reporting']['httpHealth']=operationsHttpObserverStatus($pdo,$configuration);
            $snapshot['reporting']['responseHealth']=operationsResponseMonitorStatus($pdo,nowTs());
            $snapshot['reporting']['responseHealth']['canManage']=(($configuration['operations_admins'][$accountId]['role']??null)==='SUPER_ADMIN');
            $snapshot['reporting']['actionExecution']=[
                'schema'=>'operations-action-execution-report-v1',
                'status'=>$ready?'available':'schema_not_provisioned',
                'supportedReadOnlyActions'=>count(array_filter($snapshot['reporting']['actionReports'],
                    static fn($a)=>($a['supportedExecutor']['type']??'')==='readonly_snapshot'
                        && ($a['supportedExecutor']['writes']??true)===false)),
                'recentRuns'=>$runs,'boundedHistory'=>50,
                'limitation'=>'Server-stored read-only observations, not 52 operational executors or any final production acceptance.'
            ];
            respond($snapshot);
        }
        fail('not_found',404);
    } catch (Throwable $e) {
        // Best-effort structured codes only. The observer is opt-in and never
        // emits exception messages, queries, DSNs or customer identifiers.
        if(isset($pdo)&&$pdo instanceof PDO)
            operationsDbHealthRecordError($pdo,'operations_route',$e,time());
        fail('operations_unavailable',503);
    }
}
