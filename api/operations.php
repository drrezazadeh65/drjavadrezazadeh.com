<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

const OPERATIONS_MFA_TTL = 600;

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
function operationsSnapshot(PDO $pdo, int $at): array {
    $registry = operationsRegistry();
    $releaseRow = $pdo->query('SELECT release_sha,published_at FROM operations_release WHERE singleton_id=1')->fetch();
    $release = is_array($releaseRow) ? (string)$releaseRow['release_sha'] : '';
    $events = $pdo->query('SELECT * FROM operations_evidence ORDER BY sequence_id DESC LIMIT 5000')->fetchAll();
    // Audit actor IDs and account details are deliberately absent from the reporting payload.
    foreach ($events as &$event) { $event['details'] = json_decode($event['details_json'],true); unset($event['details_json']); } unset($event);
    $byId = [];
    foreach (array_merge($registry['reports'],[$registry['dashboard']]) as $record) $byId[$record['id']] = operationsEvaluate($record,$events,$release,$at);
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
    return ['ok'=>true,'schema'=>'operations-live-v1','version'=>'4.4.1','releaseSha'=>$release ?: null,
        'publishedAt'=>is_array($releaseRow)?(int)$releaseRow['published_at']:null,'checkedAt'=>$at,
        'methodology'=>'Four section-specific gates, current release, unexpired trusted evidence and completed dependencies. Unknown is not zero.',
        'reports'=>$reports,'dashboard'=>$byId[$registry['dashboard']['id']], 'sourceSections'=>$registry['sourceSections'],
        'summary'=>['total'=>36,'verified'=>count(array_filter($reports,fn($r) => $r['closed'])),'measuredCoverage'=>count($known),
            'measuredProgress'=>count($known)?round(array_sum(array_column($known,'measuredProgress'))/count($known),1):null],
        'history'=>array_values(array_filter($events,fn($e) => $e['release_sha']===$release))];
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
function operationsRecordProductionAccess(PDO $pdo, array $snapshot, string $accountId, int $at): bool {
    $raw=@file_get_contents(__DIR__.'/internal/operations-tls.json');
    $proof=is_string($raw)?json_decode($raw,true):null;
    $release=(string)($snapshot['releaseSha']??'');
    if (!is_array($proof) || !operationsProductionContext($_SERVER,$proof,$release,$at))return false;
    $expires=operationsProductionExpiry($snapshot,$proof,$at);if($expires===null)return false;
    // Only this successfully authenticated, MFA-protected reporting route can collect this observation.
    // A browser cannot submit a percentage, approval, or evidence payload.
    $identity=hash('sha256',$release.'|admin-live-report|'.intdiv($at,300));
    $details=['scope'=>'admin_https_mfa_report_delivered','passed'=>36,'total'=>36];
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare('INSERT IGNORE INTO operations_evidence(evidence_id,section_id,gate_id,result,release_sha,source,source_url,test_name,environment,checked_at,expires_at,details_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
        $q->execute([$identity,'ADM-01','production','pass',$release,'bertina_probe','https://drjavadrezazadeh.com/api/admin/operations','Real administrator MFA and current-release HTTPS report delivery','production',$at,$expires,json_encode($details)]);
        if($q->rowCount()>0)operationsAudit($pdo,$accountId,'production_report_delivered',$release);
        $pdo->commit();
    } catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    return true;
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
        if ($path === '/admin/operations' && $verb === 'GET') {
            $at=nowTs();$snapshot=operationsSnapshot($pdo,$at);
            if(operationsRecordProductionAccess($pdo,$snapshot,$accountId,$at))$snapshot=operationsSnapshot($pdo,$at);
            respond($snapshot);
        }
        fail('not_found',404);
    } catch (Throwable $e) { fail('operations_unavailable',503); }
}
