<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Consent-first BAHAR adult account workbook, PRIVATE SOURCE CONTRACT v1.
 *
 * Default OFF at BOTH environment and owner MariaDB settings layers.
 * All read/write content is AES-256-GCM encrypted before InnoDB storage.
 * This is not the public BAHAR page (which remains purely in-memory).
 * Never grant age eligibility from a self-reported checkbox or guardian email.
 *
 * External blockers: age proof and SUPER_ADMIN verification, independently
 * approved bilingual active privacy notices, actual scoped consent,
 * 32-byte private encryption key and separately authorized owner activation.
 * Source commit here grants none of those authorities.
 */
const JR_BAHAR_ACCOUNT_PURPOSE='BAHAR_PRIVATE_WORKBOOK';
const JR_BAHAR_ACCOUNT_SCHEMA='jr.bahar.private-workbook.v1';
const JR_BAHAR_ACCOUNT_VERSION='1.0.0';
const JR_BAHAR_ACCOUNT_NOTICE_VERSION='2026-10-v1';

function baharAccountNotice(string $locale): array {
    $locale=$locale==='en'?'en':'fa';
    $text=$locale==='fa'
      ?'کاربرگ خصوصی BAHAR، فقط برای بزرگسالانی که سن آنان به‌طور مستقل تأیید شده است. با رضایت صریح شما، هدف، برنامهٔ هفتگی و یادداشت‌های بازاندیشی را به‌صورت رمزگذاری‌شده در حساب خودتان ذخیره می‌کنیم تا بعداً بتوانید آن را بازیابی یا حذف کنید. این داده‌ها برای تبلیغات، پژوهش، پیش‌بینی قبولی، امتیاز استعداد یا ارائه به سرپرست و سایر کاربران استفاده نمی‌شوند. رضایت قابل پس‌گرفتن است و درخواست حذف تابع بررسی نگهداری قانونی و نسخه‌های پشتیبان است. از وارد کردن اطلاعات هویتی یا محرمانهٔ دیگران و داده‌های کودکان خودداری کنید.'
      :'The private BAHAR workbook is for independently verified adults only. With your explicit consent, we encrypt your self-authored goal, weekly plan and reflection notes in your own account so you may retrieve or request deletion later. We do not use these notes for marketing, research, admission predictions, aptitude scoring or disclosure to guardians or other users. You can withdraw consent. Erasure remains subject to applicable lawful retention and backup controls. Do not include children’s information or anyone else’s identifying or confidential data.';
    return ['locale'=>$locale,'version'=>JR_BAHAR_ACCOUNT_NOTICE_VERSION,
        'text'=>$text,'sha256'=>hash('sha256',$text)];
}
function baharAccountFeatureAllowed(): bool {
    return (cfg()['bahar_private_workbooks_enabled']??false)===true;
}
function baharAccountPolicy(PDO $pdo): array {
    // A toggle by itself is NOT sufficient authority to store sensitive
    // educational notes. Enforce the owner's separate evidence record on
    // every account request, not merely when the toggle was enabled.
    $q=$pdo->query("SELECT p.enabled,p.updated_at,
      p.scientific_review_sha256,p.privacy_review_sha256,
      p.release_gate_approved_by_account_id,p.release_gate_approved_at,
      a.role AS approver_role,a.enabled AS approver_enabled
      FROM eco_bahar_account_workbook_policy p
      LEFT JOIN operations_admin_memberships a
        ON a.account_id=p.release_gate_approved_by_account_id
      WHERE p.singleton_id=1 LIMIT 1");
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row))throw new RuntimeException('workbook_policy_missing');
    $science=(string)($row['scientific_review_sha256']??'');
    $privacy=(string)($row['privacy_review_sha256']??'');
    $independentReviews=
       preg_match('/^[a-f0-9]{64}$/D',$science)===1 &&
       preg_match('/^[a-f0-9]{64}$/D',$privacy)===1 &&
       !hash_equals($science,$privacy) &&
       !empty($row['release_gate_approved_by_account_id']) &&
       !empty($row['release_gate_approved_at']) &&
       ($row['approver_role']??'')==='SUPER_ADMIN' &&
       (int)($row['approver_enabled']??0)===1;
    return [
      'enabled'=>(int)$row['enabled']===1&&$independentReviews,
      'ownerSwitchEnabled'=>(int)$row['enabled']===1,
      'independentReleaseEvidenceRecorded'=>$independentReviews,
      'changedAt'=>(string)$row['updated_at']
    ];
}
function baharAccountKey(): ?array {
    $settings=cfg();
    $keyId=$settings['bahar_workbook_key_id']??'';
    $encoded=$settings['bahar_workbook_key_b64']??'';
    if(!is_string($keyId)||!preg_match('/^[a-zA-Z0-9_.-]{3,64}$/D',$keyId)
        ||!is_string($encoded)||!function_exists('openssl_encrypt')
        ||!function_exists('openssl_decrypt'))return null;
    $key=base64_decode($encoded,true);
    return is_string($key)&&strlen($key)===32
      ?['key'=>$key,'id'=>$keyId]:null;
}
function baharAccountVerifiedAdult(PDO $pdo,string $accountId): bool {
    $q=$pdo->prepare("SELECT 1 FROM eco_bahar_verified_adult_accounts v
      INNER JOIN operations_admin_memberships a
       ON a.account_id=v.verified_by_account_id
         AND a.enabled=1 AND a.role='SUPER_ADMIN'
      WHERE v.account_id=? AND v.review_state='VERIFIED_ADULT'
        AND v.verified_at IS NOT NULL
        AND v.verified_at<=UTC_TIMESTAMP(3)
        AND v.verified_by_account_id<>v.account_id
        AND v.verifier_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
        AND v.revoked_at IS NULL
        AND (v.expires_at IS NULL OR v.expires_at>UTC_TIMESTAMP(3))
      LIMIT 1");
    $q->execute([$accountId]);
    return $q->fetchColumn()!==false;
}
function baharAccountCurrentNotice(PDO $pdo,string $locale): ?array {
    $notice=baharAccountNotice($locale);
    $q=$pdo->prepare("SELECT id,notice_sha256 FROM eco_consent_notices
      WHERE purpose_code=? AND version_label=? AND locale=?
      AND effective_at<=UTC_TIMESTAMP(3)
      AND (retired_at IS NULL OR retired_at>UTC_TIMESTAMP(3))
      LIMIT 1");
    $q->execute([JR_BAHAR_ACCOUNT_PURPOSE,$notice['version'],$notice['locale']]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row)||!validUuid((string)$row['id'])||
      !hash_equals($notice['sha256'],(string)$row['notice_sha256']))return null;
    return ['id'=>(string)$row['id'],'sha256'=>$notice['sha256'],
      'locale'=>$notice['locale'],'text'=>$notice['text']];
}
function baharAccountHasConsent(PDO $pdo,string $accountId): bool {
    $q=$pdo->prepare("SELECT c.decision,c.withdrawn_at,c.granted_at,
      n.id AS notice_id,n.version_label,n.locale,n.notice_sha256,
      n.effective_at,n.retired_at
      FROM eco_consent_records c
      INNER JOIN eco_consent_notices n ON n.id=c.notice_id
      WHERE c.account_id=? AND c.subject_id IS NULL
        AND n.purpose_code=? AND c.source_code='BAHAR_ACCOUNT_WORKBOOK'
      ORDER BY c.granted_at DESC,c.id DESC LIMIT 20");
    $q->execute([$accountId,JR_BAHAR_ACCOUNT_PURPOSE]);
    $rows=$q->fetchAll(PDO::FETCH_ASSOC);
    if(!is_array($rows)||count($rows)===0)return false;
    // A subsequent withdrawal dominates every prior grant, irrespective
    // of tie-breaking between same-millisecond timestamps.
    foreach($rows as $row){
        if(($row['decision']??'')==='WITHDRAWN')return false;
        if(($row['decision']??'')==='GRANTED'){
            if($row['withdrawn_at']!==null)return false;
            $locale=(string)$row['locale'];
            $notice=baharAccountNotice($locale);
            if((string)$row['version_label']!==$notice['version']||
               !hash_equals($notice['sha256'],(string)$row['notice_sha256']))
               return false;
            $current=baharAccountCurrentNotice($pdo,$locale);
            return $current!==null &&
              hash_equals($current['id'],(string)$row['notice_id']);
        }
        return false;
    }
    return false;
}
function baharAccountEligibilityState(PDO $pdo,string $accountId): string {
    $q=$pdo->prepare('SELECT review_state FROM eco_bahar_verified_adult_accounts
      WHERE account_id=? LIMIT 1');
    $q->execute([$accountId]);
    $state=$q->fetchColumn();
    return is_string($state)&&in_array($state,[
      'PENDING','VERIFIED_ADULT','DECLINED','REVOKED'
    ],true)?$state:'NOT_REQUESTED';
}
/** One account's most recent official erasure-request lifecycle. */
function baharAccountLatestErasureState(PDO $pdo,string $accountId): array {
    try{
        $q=$pdo->prepare("SELECT id,status,created_at,closed_at
          FROM eco_privacy_requests
          WHERE requester_account_id=? AND subject_id IS NULL
            AND request_type='BAHAR_PRIVATE_WORKBOOK_DELETE'
          ORDER BY created_at DESC,id DESC LIMIT 1");
        $q->execute([$accountId]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row))return [
          'available'=>true,'request'=>null
        ];
        if(!validUuid((string)$row['id'])||
          !in_array((string)$row['status'],
            ['RECEIVED','PENDING','IN_REVIEW','BLOCKED','COMPLETED'],true))
            return ['available'=>false,'request'=>null];
        return [
          'available'=>true,'request'=>[
            'id'=>(string)$row['id'],
            'state'=>(string)$row['status'],
            'createdAt'=>(string)$row['created_at'],
            'completedAt'=>$row['closed_at']===null
                ?null:(string)$row['closed_at']
          ]
        ];
    }catch(Throwable $error){
        return ['available'=>false,'request'=>null];
    }
}
function baharAccountPendingErasure(PDO $pdo,string $accountId): bool {
    $q=$pdo->prepare("SELECT 1 FROM eco_privacy_requests
      WHERE requester_account_id=? AND subject_id IS NULL
        AND request_type='BAHAR_PRIVATE_WORKBOOK_DELETE'
        AND status IN ('RECEIVED','PENDING','IN_REVIEW','BLOCKED')
      LIMIT 1");
    $q->execute([$accountId]);
    return $q->fetchColumn()!==false;
}
/**
 * A review is not a lifetime dead end. A verified adult whose approval
 * expired may ask for renewed human review. Declined/revoked applicants may
 * request a fresh independent review only after a seven-day cooling period.
 * Neither pathway automatically grants adulthood or private data access.
 */
function baharAccountCanRequestReview(PDO $pdo,string $accountId): bool {
    $q=$pdo->prepare("SELECT review_state,
      (updated_at<=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 7 DAY)) AS appeal_ready,
      (expires_at IS NOT NULL AND expires_at<=UTC_TIMESTAMP(3)) AS expired
      FROM eco_bahar_verified_adult_accounts WHERE account_id=? LIMIT 1");
    $q->execute([$accountId]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row))return true;
    $state=(string)$row['review_state'];
    if($state==='DECLINED'||$state==='REVOKED')
        return (int)$row['appeal_ready']===1;
    if($state==='VERIFIED_ADULT')
        return (int)$row['expired']===1;
    return false;
}
function baharAccountCsrf(string $accountId): string {
    $pepper=cfg()['auth_pepper']??'';
    if(!is_string($pepper)||strlen($pepper)<32)
        throw new RuntimeException('csrf_unavailable');
    $cookie=(string)($_COOKIE[SESSION_COOKIE]??'');
    if($cookie==='')throw new RuntimeException('session_unavailable');
    return hash_hmac('sha256','bahar-account-workbook-v1|'.tokenHash($cookie).
       '|'.$accountId,$pepper);
}
function baharAccountVerifyMutationCsrf(string $accountId): void {
    if(($_SERVER['HTTP_ORIGIN']??'')!==SITE_ORIGIN ||
      !in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',
        ['same-origin','none'],true))fail('origin_forbidden',403);
    $provided=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');
    if(strlen($provided)!==64||!hash_equals(baharAccountCsrf($accountId),$provided))
        fail('csrf_forbidden',403);
}
function baharAccountAudit(PDO $pdo,string $actor,string $action): void {
    if(!preg_match('/^BAHAR_ACCOUNT_[A-Z_]{3,40}$/D',$action))
        throw new RuntimeException('invalid_private_audit_action');
    $nonce=bin2hex(random_bytes(24));
    $eventKey=hash('sha256',$action.'|'.$actor.'|'.$nonce);
    $q=$pdo->prepare('INSERT INTO eco_audit_events
      (event_key,actor_account_id,action_code,entity_kind,entity_id,
       correlation_id,payload_sha256,event_sha256)
       VALUES (?,?,?,?,?,?,?,?)');
    $ok=$q->execute([$eventKey,$actor,$action,'ADULT_WORKBOOK_ACCOUNT',
      $actor,uuidv4(),hash('sha256',$action.'|no_plaintext_logged'),
      hash('sha256',$eventKey.'|'.$action)]);
    if(!$ok)throw new RuntimeException('private_audit_required');
}
function baharAccountDate(string $raw): bool {
    if(!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$raw))return false;
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',$raw,
      new DateTimeZone('UTC'));
    return $date!==false&&$date->format('Y-m-d')===$raw;
}
function baharAccountString(mixed $text,int $max=1200): bool {
    return is_string($text)&&trim($text)!==''&&strlen($text)<=$max
      &&!preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/',$text);
}
function baharAccountSanitizeWorkbook(mixed $raw): ?array {
    if(!is_array($raw)||array_is_list($raw)||
      ($raw['schema']??null)!=='jr.bahar.private-workbook.v1'||
      ($raw['version']??null)!=='1.0.0'||!is_array($raw['reflections']??null)||
      count($raw['reflections'])>8)return null;
    $compass=$raw['compass']??null;
    $plan=$raw['weeklyPlan']??null;
    if($compass!==null){
        if(!is_array($compass)||array_is_list($compass)||
          !baharAccountString($compass['goal']??null)||
          !baharAccountString($compass['successEvidence']??null)||
          !is_string($compass['context']??'' )||
          strlen((string)($compass['context']??''))>1200)return null;
        $compass=['goal'=>$compass['goal'],
            'successEvidence'=>$compass['successEvidence'],
            'context'=>$compass['context']??''];
    }
    if($plan!==null){
        if(!is_array($plan)||array_is_list($plan)||
          !is_string($plan['weekStart']??null)||
          !baharAccountDate($plan['weekStart'])||
          !baharAccountString($plan['goal']??null)||
          !baharAccountString($plan['action']??null)||
          !baharAccountString($plan['evidence']??null))return null;
        $plan=['weekStart'=>$plan['weekStart'],'goal'=>$plan['goal'],
            'action'=>$plan['action'],'evidence'=>$plan['evidence']];
    }
    $reflections=[];
    foreach($raw['reflections'] as $entry){
        if(!is_array($entry)||array_is_list($entry)||
          !is_string($entry['date']??null)||
          !baharAccountDate($entry['date'])||
          !baharAccountString($entry['note']??null)||
          !in_array($entry['decision']??null,
            ['CONTINUE','CHANGE','PAUSE','STOP','INVESTIGATE'],true))
          return null;
        $reflections[]=['date'=>$entry['date'],'note'=>$entry['note'],
          'decision'=>$entry['decision']];
    }
    if($compass===null&&$plan===null&&count($reflections)===0)return null;
    return ['schema'=>'jr.bahar.private-workbook.v1',
      'version'=>'1.0.0','compass'=>$compass,'weeklyPlan'=>$plan,
      'reflections'=>$reflections,'status'=>'SELF_REPORTED_RESEARCH_STAGE'];
}
function baharAccountEncrypt(array $workbook,string $accountId,array $secret): array {
    $json=json_encode($workbook,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    if(!is_string($json)||strlen($json)>30000)
        throw new InvalidArgumentException('private_workbook_too_large');
    $nonce=random_bytes(12);
    $aad=JR_BAHAR_ACCOUNT_SCHEMA.'|'.$accountId.'|'.$secret['id'];
    $tag='';
    $cipher=openssl_encrypt($json,'aes-256-gcm',$secret['key'],
        OPENSSL_RAW_DATA,$nonce,$tag,$aad,16);
    if(!is_string($cipher)||strlen($tag)!==16)
        throw new RuntimeException('workbook_encryption_unavailable');
    return ['nonce'=>$nonce,'tag'=>$tag,'ciphertext'=>$cipher];
}
function baharAccountDecrypt(array $row,string $accountId,array $secret): array {
    if(($row['schema_version']??'')!==JR_BAHAR_ACCOUNT_VERSION||
      ($row['key_reference']??'')!==$secret['id']||
      ($row['cipher_name']??'')!=='AES-256-GCM')
      throw new RuntimeException('workbook_key_rotation_required');
    $aad=JR_BAHAR_ACCOUNT_SCHEMA.'|'.$accountId.'|'.$secret['id'];
    $json=openssl_decrypt($row['ciphertext'],'aes-256-gcm',
        $secret['key'],OPENSSL_RAW_DATA,$row['encryption_nonce'],
        $row['encryption_tag'],$aad);
    if(!is_string($json)||strlen($json)>30000)
      throw new RuntimeException('workbook_integrity_failed');
    $raw=json_decode($json,true,24,JSON_THROW_ON_ERROR);
    $clean=baharAccountSanitizeWorkbook($raw);
    if($clean===null)throw new RuntimeException('stored_workbook_invalid');
    return $clean;
}
/**
 * Serialize all sensitive BAHAR reads, writes and consent transitions with
 * the existing erasure-request transaction using one mother-DB owner row.
 * This stops a stale concurrent PUT resurrecting private data after erasure.
 */
function baharAccountLockOwner(PDO $pdo,string $accountId): void {
    if(!$pdo->inTransaction())throw new RuntimeException('account_lock_requires_transaction');
    $lock=$pdo->prepare('SELECT id FROM customer_accounts WHERE id=? FOR UPDATE');
    $lock->execute([$accountId]);
    if($lock->fetchColumn()===false)throw new RuntimeException('owner_account_missing');
}
function baharAccountLegalHoldClear(PDO $pdo,string $accountId): bool {
    $q=$pdo->prepare("SELECT 1 FROM eco_legal_holds
       WHERE (account_id=? OR subject_id IN
          (SELECT id FROM eco_subjects WHERE owner_account_id=?))
         AND released_at IS NULL AND
           (expires_at IS NULL OR expires_at>UTC_TIMESTAMP(3))
       LIMIT 1");
    $q->execute([$accountId,$accountId]);
    return $q->fetchColumn()===false;
}
/**
 * One-step, account-scoped erasure request in the existing eco_privacy_*
 * mother tables. Never stores a workbook or the person's private notes.
 *
 * If an active legal hold exists, retain data as required and create a
 * reviewable BLOCKED request. Otherwise delete only this account's BAHAR
 * encrypted workbook, register the privacy action, and audit atomically.
 * Backups and independent contractual retention remain outside this scope.
 */
function baharAccountErasureRequest(PDO $pdo,string $actor): array {
    $pdo->beginTransaction();
    try{
        // Account-row lock serializes rapid repeated clicks by this owner,
        // unlike a nonunique ad hoc privacy request count.
        $guard=$pdo->prepare('SELECT id FROM customer_accounts WHERE id=? FOR UPDATE');
        $guard->execute([$actor]);
        if($guard->fetchColumn()===false)
            throw new RuntimeException('account_not_found');
        $latest=$pdo->prepare("SELECT id,status FROM eco_privacy_requests
          WHERE requester_account_id=? AND subject_id IS NULL
            AND request_type='BAHAR_PRIVATE_WORKBOOK_DELETE'
            AND status IN ('RECEIVED','IN_REVIEW','PENDING','BLOCKED')
          ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE");
        $latest->execute([$actor]);
        $prior=$latest->fetch(PDO::FETCH_ASSOC);
        if(is_array($prior)){
            $pdo->commit();
            return [
              'ok'=>true,'schema'=>'jr.bahar-private-erasure-request.v1',
              'requestId'=>(string)$prior['id'],
              'requestStatus'=>(string)$prior['status'],
              'databaseRowDeleted'=>false,'existingRequestReused'=>true,
              'backupErasureCertified'=>false,'noUnrelatedAccountDataDeleted'=>true
            ];
        }
        $requestId=uuidv4();
        // A missing legal-hold table or query failure must roll back rather
        // than assume no legal restriction.
        $holdClear=baharAccountLegalHoldClear($pdo,$actor);
        $status=$holdClear?'COMPLETED':'BLOCKED';
        $request=$pdo->prepare("INSERT INTO eco_privacy_requests
          (id,requester_account_id,subject_id,request_type,status,
           due_at,closed_at)
          VALUES (?, ?,NULL,'BAHAR_PRIVATE_WORKBOOK_DELETE',?,
              DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 DAY),
              CASE WHEN ?='COMPLETED' THEN UTC_TIMESTAMP(3) ELSE NULL END)");
        $request->execute([$requestId,$actor,$status,$status]);
        $erased=false;
        if($holdClear){
            $deletion=$pdo->prepare('DELETE FROM eco_bahar_account_workbooks
              WHERE owner_account_id=?');
            $deletion->execute([$actor]);
            $erased=$deletion->rowCount()===1;
        }
        $action=$pdo->prepare('INSERT INTO eco_privacy_actions
          (id,request_id,action_code,operator_account_id,result_code,
           evidence_sha256)
           VALUES (?,? ,?, ?, ?, ?)');
        $action->execute([
            uuidv4(),$requestId,
            $holdClear?'BAHAR_WORKBOOK_ERASURE':'BAHAR_ERASURE_HOLD_CHECK',
            $actor,$holdClear?'CURRENT_ROW_REMOVED':'ACTIVE_LEGAL_HOLD',
            hash('sha256','bahar_erase|'.$requestId.'|'.
                ($erased?'record_removed':'no_stored_record_or_held'))
        ]);
        baharAccountAudit($pdo,$actor,'BAHAR_ACCOUNT_WORKBOOK_DELETE_REQUESTED');
        $pdo->commit();
        // The privacy decision commits BEFORE the existing incident recorder
        // opens its own transaction. Only a fixed, non-identifying scope is
        // emitted: never send account IDs, request IDs or workbook content.
        // The consent/erasure response must not depend on alert availability,
        // recipient setup or an administrator opting into email.
        try {
            require_once __DIR__.'/operations-alerts.php';
            if (function_exists('operationsAlertRecord')) {
                operationsAlertRecord(
                    $pdo,'bahar_private_erasure_requested',
                    'bahar-workbook-erasure',nowTs()
                );
            }
        } catch (Throwable $ignored) {
            // Email is optional; a completed privacy transaction is final.
        }
        return [
            'ok'=>true,'schema'=>'jr.bahar-private-erasure-request.v1',
            'requestId'=>$requestId,'requestStatus'=>$status,
            'databaseRowDeleted'=>$erased,
            'currentRecordAbsent'=>$holdClear&&!$erased,
            'existingRequestReused'=>false,
            'legalHoldRequiresHumanReview'=>!$holdClear,
            'backupErasureCertified'=>false,
            'noUnrelatedAccountDataDeleted'=>true
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function baharAccountRoute(string $path,string $verb): never {
    header('Vary: Cookie');
    header('Cache-Control: private, no-store, no-cache, max-age=0');
    header('X-Robots-Tag: noindex, noarchive, nosnippet');
    try{
        $pdo=db();
        if(!$pdo)fail('database_unconfigured',503);
        $account=sessionAccount($pdo);
        if(!$account||($account['status']??'')!=='active'||
          empty($account['email_verified_at']))fail('unauthorized',401);
        $accountId=(string)($account['id']??'');
        if(!validUuid($accountId))fail('unauthorized',401);
        if(!in_array($path,[
          '/bahar/account/status','/bahar/account/consent',
          '/bahar/account/workbook','/bahar/account/withdraw-consent',
          '/bahar/account/eligibility-request','/bahar/account/erasure-request',
          '/bahar/account/eligibility-cancel'
        ],true))fail('not_found',404);
        if(!rateAllowed($pdo,'bahar_private_account',$accountId,25,300))
            fail('rate_limited',429);
        $locale=($_GET['locale']??'fa')==='en'?'en':'fa';
        $key=baharAccountKey();
        $policy=['enabled'=>false];
        $adult=false;
        $notice=null;
        $schemaReady=true;
        try{
            // Fixed, zero-row schema contract. Do not inspect learner content.
            foreach([
              'SELECT account_id,review_state,updated_at FROM eco_bahar_verified_adult_accounts LIMIT 0',
              'SELECT owner_account_id,row_revision,ciphertext FROM eco_bahar_account_workbooks LIMIT 0',
              'SELECT id,account_id,subject_id FROM eco_consent_records LIMIT 0',
              'SELECT id,purpose_code,notice_sha256 FROM eco_consent_notices LIMIT 0',
              'SELECT event_key,action_code FROM eco_audit_events LIMIT 0',
              'SELECT id,owner_account_id FROM eco_subjects LIMIT 0',
              'SELECT id,account_id,subject_id,released_at FROM eco_legal_holds LIMIT 0',
              'SELECT id,requester_account_id,request_type,status FROM eco_privacy_requests LIMIT 0',
              'SELECT id,request_id,action_code FROM eco_privacy_actions LIMIT 0'
            ] as $schemaQuery){
                if($pdo->query($schemaQuery)===false)
                    throw new RuntimeException('required_private_storage_schema_incomplete');
            }
            $policy=baharAccountPolicy($pdo);
            $adult=baharAccountVerifiedAdult($pdo,$accountId);
            $notice=baharAccountCurrentNotice($pdo,$locale);
        }catch(Throwable $e){$schemaReady=false;}
        $enabled=$schemaReady&&baharAccountFeatureAllowed()&&
            $policy['enabled']&&$key!==null;
        if($path==='/bahar/account/status'&&$verb==='GET'){
            $erasure=baharAccountLatestErasureState($pdo,$accountId);
            $eligibilityState=$schemaReady
                ?baharAccountEligibilityState($pdo,$accountId):'UNAVAILABLE';
            $currentConsent=$schemaReady&&$adult&&
                baharAccountHasConsent($pdo,$accountId);
            $revision=null;
            if($enabled&&$adult&&$currentConsent&&$notice!==null){
                $q=$pdo->prepare('SELECT row_revision
                  FROM eco_bahar_account_workbooks WHERE owner_account_id=?');
                $q->execute([$accountId]);
                $saved=$q->fetchColumn();
                $revision=$saved===false?0:(int)$saved;
            }
            respond(['ok'=>true,'schema'=>'jr.bahar-adult-account-status.v1',
              'storageEnabled'=>$enabled,'schemaProvisioned'=>$schemaReady,
              'state'=>$schemaReady?'GATED_PRIVATE_SERVICE':'ADDITIVE_SCHEMA_PENDING',
              'independentlyVerifiedAdult'=>$adult,
              'eligibilityRequestState'=>$eligibilityState,
              'canRequestIndependentAdultReview'=>$schemaReady &&
                  baharAccountCanRequestReview($pdo,$accountId),
              'canCancelPendingAdultReview'=>$schemaReady &&
                  $eligibilityState==='PENDING',
              'currentNoticeConfigured'=>$notice!==null,
              'currentConsent'=>$currentConsent,
              'privacyNotice'=>$notice===null?null:baharAccountNotice($locale),
              'privacyRequestLedgerAvailable'=>$erasure['available'],
              'latestErasureRequest'=>$erasure['request'],
              'canStore'=>$enabled&&$adult&&$notice!==null&&
                  $currentConsent&&!baharAccountPendingErasure($pdo,$accountId),
              'workbookRevision'=>$revision,
              'csrfToken'=>baharAccountCsrf($accountId),
              'contentReturned'=>false,
              'scientificallyValidated'=>false,
              'admissionPredictionAvailable'=>false,
              'limitations'=>'Secure storage requires explicit owner activation, verified adult eligibility and current versioned consent. No minor or guardian records are accepted.']);
        }
        if(!in_array($verb,['GET','POST','PUT','DELETE'],true))fail('method_not_allowed',405);
        // Zero-document, explicit account owner's eligibility review request.
        // A self-affirmation may create a PENDING queue entry only and never
        // constitute independent adult identity verification.
        if($path==='/bahar/account/eligibility-request'&&$verb==='POST'){
            baharAccountVerifyMutationCsrf($accountId);
            if(!$schemaReady)fail('adult_review_queue_unavailable',503);
            $input=jsonBody();
            if(($input['adultAffirmation']??null)!==true||
              ($input['confirmation']??null)!=='I REQUEST INDEPENDENT ADULT REVIEW')
              fail('explicit_adult_review_request_required',422);
            $pdo->beginTransaction();
            try{
                baharAccountLockOwner($pdo,$accountId);
                $lookup=$pdo->prepare("SELECT review_state,
                  updated_at<=DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 7 DAY)
                    AS appeal_ready,
                  expires_at IS NOT NULL AND expires_at<=UTC_TIMESTAMP(3)
                    AS expired
                  FROM eco_bahar_verified_adult_accounts
                  WHERE account_id=? FOR UPDATE");
                $lookup->execute([$accountId]);
                $prior=$lookup->fetch(PDO::FETCH_ASSOC);
                $created=false;
                if(!is_array($prior)){
                    $q=$pdo->prepare("INSERT INTO eco_bahar_verified_adult_accounts
                      (account_id,review_state) VALUES (?,'PENDING')");
                    $q->execute([$accountId]);
                    $created=$q->rowCount()===1;
                }else{
                    $state=(string)$prior['review_state'];
                    $appeal=(($state==='DECLINED'||$state==='REVOKED')&&
                        (int)$prior['appeal_ready']===1)||
                        ($state==='VERIFIED_ADULT'&&
                         (int)$prior['expired']===1);
                    if($appeal){
                        // A renewed application must not inherit the
                        // preceding reviewer's approval/evidence digest.
                        // Historical audit evidence is retained separately.
                        $q=$pdo->prepare("UPDATE eco_bahar_verified_adult_accounts
                          SET review_state='PENDING',
                            verified_by_account_id=NULL,
                            verifier_evidence_sha256=NULL,
                            verified_at=NULL,expires_at=NULL,
                            revoked_at=NULL,updated_at=UTC_TIMESTAMP(3)
                          WHERE account_id=?");
                        $q->execute([$accountId]);
                        $created=$q->rowCount()===1;
                    }
                }
                if($created)baharAccountAudit(
                  $pdo,$accountId,'BAHAR_ACCOUNT_ELIGIBILITY_REQUESTED'
                );
                $state=baharAccountEligibilityState($pdo,$accountId);
                $pdo->commit();
                respond([
                  'ok'=>true,'schema'=>'jr.bahar-adult-eligibility-request.v1',
                  'eligibilityRequestState'=>$state,
                  'newRequestRecorded'=>$created,
                  'independentlyVerifiedAdult'=>false,
                  'automaticEligibilityApproval'=>false,
                  'documentsUploaded'=>false,'workbookUploaded'=>false,
                  'privacyConsentGranted'=>false,
                  'next'=>'An authorized human must verify age outside the app before private account saving can be offered.'
                ]);
            }catch(Throwable $e){
                if($pdo->inTransaction())$pdo->rollBack();
                throw $e;
            }
        }
        // Reversible, self-service withdrawal of a PENDING age-review
        // application. Never touch approved adult state or private workbooks.
        if($path==='/bahar/account/eligibility-cancel'&&$verb==='POST'){
            baharAccountVerifyMutationCsrf($accountId);
            if(!$schemaReady)fail('adult_review_queue_unavailable',503);
            $body=jsonBody();
            if(($body['confirmation']??null)!=='CANCEL MY PENDING REVIEW')
                fail('explicit_request_required',422);
            $pdo->beginTransaction();
            try{
                // Serialize cancellation with independent owner age review,
                // encrypted workbook access and privacy erasure.
                baharAccountLockOwner($pdo,$accountId);
                $q=$pdo->prepare("DELETE FROM eco_bahar_verified_adult_accounts
                  WHERE account_id=? AND review_state='PENDING'");
                $q->execute([$accountId]);
                $deleted=$q->rowCount()===1;
                if($deleted)baharAccountAudit($pdo,$accountId,
                  'BAHAR_ACCOUNT_ELIGIBILITY_WITHDRAWN');
                $pdo->commit();
                respond([
                    'ok'=>true,'schema'=>'jr.bahar-adult-review-cancellation.v1',
                    'pendingRequestCancelled'=>$deleted,
                    'verifiedAdultStateUntouched'=>true,
                    'workbookDeleted'=>false,'marketingConsentAffected'=>false
                ]);
            }catch(Throwable $e){
                if($pdo->inTransaction())$pdo->rollBack();
                throw $e;
            }
        }
        if($path==='/bahar/account/consent'&&$verb==='POST'){
            baharAccountVerifyMutationCsrf($accountId);
            if(!$enabled||!$adult||$notice===null||
               baharAccountPendingErasure($pdo,$accountId))
                fail('bahar_consent_not_available',403);
            $body=jsonBody();
            if(($body['confirmation']??null)!=='I CONSENT TO PRIVATE BAHAR STORAGE'||
              ($body['noticeSha256']??null)!==$notice['sha256'])
              fail('consent_not_explicit',422);
            $pdo->beginTransaction();
            try{
                // Lock owner account to serialize new writes against a
                // simultaneous requested-erasure transaction.
                baharAccountLockOwner($pdo,$accountId);
                if(baharAccountPendingErasure($pdo,$accountId))
                    throw new DomainException('pending_erasure_blocks_write');
                if(!baharAccountVerifiedAdult($pdo,$accountId)||
                   !baharAccountPolicy($pdo)['enabled'])
                   throw new RuntimeException('permission_changed');
                // A notice seen before the account lock may have been
                // retired/replaced; never record consent to an old version.
                $currentNotice=baharAccountCurrentNotice($pdo,$locale);
                if($currentNotice===null||
                   !hash_equals($notice['id'],$currentNotice['id'])||
                   !hash_equals($notice['sha256'],$currentNotice['sha256']))
                    throw new DomainException('consent_notice_changed');
                if(!baharAccountHasConsent($pdo,$accountId)){
                    $q=$pdo->prepare("INSERT INTO eco_consent_records
                      (id,account_id,subject_id,notice_id,decision,lawful_basis,
                       evidence_sha256,granted_at,source_code)
                      VALUES (?,?,NULL,?,'GRANTED','CONSENT',?,
                        UTC_TIMESTAMP(3),'BAHAR_ACCOUNT_WORKBOOK')");
                    $q->execute([uuidv4(),$accountId,$notice['id'],
                      hash('sha256',$notice['sha256'].'|'.$accountId.'|'.bin2hex(random_bytes(16)))]);
                    baharAccountAudit($pdo,$accountId,'BAHAR_ACCOUNT_CONSENT_GRANTED');
                }
                $pdo->commit();
                respond(['ok'=>true,'consentRecorded'=>true,
                  'privateWorkbookDataSaved'=>false,
                  'canActivateEducationalProducts'=>false]);
            }catch(Throwable $e){
                if($pdo->inTransaction())$pdo->rollBack();
                throw $e;
            }
        }
        if($path==='/bahar/account/withdraw-consent'&&$verb==='POST'){
            baharAccountVerifyMutationCsrf($accountId);
            $body=jsonBody();
            if(($body['confirmation']??null)!=='WITHDRAW BAHAR PRIVATE CONSENT')
                fail('confirmation_required',422);
            $pdo->beginTransaction();
            try{
                baharAccountLockOwner($pdo,$accountId);
                $q=$pdo->prepare("UPDATE eco_consent_records c
                  INNER JOIN eco_consent_notices n ON n.id=c.notice_id
                  SET c.withdrawn_at=UTC_TIMESTAMP(3)
                  WHERE c.account_id=? AND c.subject_id IS NULL
                    AND c.source_code='BAHAR_ACCOUNT_WORKBOOK'
                    AND n.purpose_code=? AND c.decision='GRANTED'
                    AND c.withdrawn_at IS NULL");
                $q->execute([$accountId,JR_BAHAR_ACCOUNT_PURPOSE]);
                baharAccountAudit($pdo,$accountId,'BAHAR_ACCOUNT_CONSENT_WITHDRAWN');
                $pdo->commit();
                respond(['ok'=>true,'consentWithdrawn'=>true,
                  'furtherReadsAndWritesBlocked'=>true,
                  'erasureSeparateActionRequired'=>true]);
            }catch(Throwable $e){
                if($pdo->inTransaction())$pdo->rollBack();
                throw $e;
            }
        }
        if($path==='/bahar/account/workbook'&&$verb==='GET'){
            if(!$enabled||!$adult||$notice===null||
              !baharAccountHasConsent($pdo,$accountId))
                fail('private_access_not_authorized',403);
            $pdo->beginTransaction();
            try{
                baharAccountLockOwner($pdo,$accountId);
                if(!baharAccountFeatureAllowed()||
                    !baharAccountPolicy($pdo)['enabled']||
                    !baharAccountVerifiedAdult($pdo,$accountId)||
                    !baharAccountHasConsent($pdo,$accountId)||
                    baharAccountPendingErasure($pdo,$accountId))
                    throw new RuntimeException('private_read_permission_changed');
                $q=$pdo->prepare('SELECT schema_version,key_reference,cipher_name,
                  encryption_nonce,ciphertext,encryption_tag,row_revision
                  FROM eco_bahar_account_workbooks WHERE owner_account_id=? LIMIT 1');
                $q->execute([$accountId]);
                $row=$q->fetch(PDO::FETCH_ASSOC);
                $clean=is_array($row)?baharAccountDecrypt($row,$accountId,$key):null;
                baharAccountAudit($pdo,$accountId,'BAHAR_ACCOUNT_WORKBOOK_READ');
                $pdo->commit();
                respond(['ok'=>true,'schema'=>'jr.bahar-encrypted-account-workbook.v1',
                  'workbook'=>$clean,'revision'=>is_array($row)?(int)$row['row_revision']:0,
                  'private'=>true,'cacheable'=>false,'externalRecipient'=>false]);
            }catch(Throwable $e){
                if($pdo->inTransaction())$pdo->rollBack();
                throw $e;
            }
        }
        if($path==='/bahar/account/workbook'&&$verb==='PUT'){
            baharAccountVerifyMutationCsrf($accountId);
            if(!$enabled||!$adult||$notice===null||
              !baharAccountHasConsent($pdo,$accountId)||
              baharAccountPendingErasure($pdo,$accountId))
                fail('private_access_not_authorized',403);
            $input=jsonBody();
            $rev=$input['expectedRevision']??null;
            if(!is_int($rev)||$rev<0||$rev>2147483646)
                fail('invalid_workbook_revision',422);
            $workbook=baharAccountSanitizeWorkbook($input['workbook']??null);
            if($workbook===null)fail('invalid_private_workbook',422);
            $cipher=baharAccountEncrypt($workbook,$accountId,$key);
            $pdo->beginTransaction();
            try{
                baharAccountLockOwner($pdo,$accountId);
                if(!baharAccountFeatureAllowed()||
                  baharAccountPendingErasure($pdo,$accountId)||
                  !baharAccountVerifiedAdult($pdo,$accountId)||
                  !baharAccountPolicy($pdo)['enabled']||
                  !baharAccountHasConsent($pdo,$accountId))
                  throw new RuntimeException('permission_changed');
                $query=$pdo->prepare('SELECT row_revision FROM eco_bahar_account_workbooks
                   WHERE owner_account_id=? FOR UPDATE');
                $query->execute([$accountId]);
                $previous=$query->fetchColumn();
                if($previous===false){
                    if($rev!==0)throw new DomainException('workbook_revision_conflict');
                    $newRevision=1;
                    $sql=$pdo->prepare("INSERT INTO eco_bahar_account_workbooks
                      (owner_account_id,schema_version,key_reference,cipher_name,
                       encryption_nonce,ciphertext,encryption_tag,consent_notice_id,row_revision)
                      VALUES (?,? ,?,'AES-256-GCM',?,?,?,?,?)");
                    $sql->execute([$accountId,JR_BAHAR_ACCOUNT_VERSION,$key['id'],
                       $cipher['nonce'],$cipher['ciphertext'],$cipher['tag'],
                       $notice['id'],$newRevision]);
                }else{
                    if($rev!==(int)$previous)
                        throw new DomainException('workbook_revision_conflict');
                    $newRevision=$rev+1;
                    $sql=$pdo->prepare("UPDATE eco_bahar_account_workbooks
                      SET schema_version=?,key_reference=?,cipher_name='AES-256-GCM',
                          encryption_nonce=?,ciphertext=?,encryption_tag=?,
                          consent_notice_id=?,row_revision=?,updated_at=UTC_TIMESTAMP(3)
                      WHERE owner_account_id=? AND row_revision=?");
                    $sql->execute([JR_BAHAR_ACCOUNT_VERSION,$key['id'],
                        $cipher['nonce'],$cipher['ciphertext'],$cipher['tag'],
                        $notice['id'],$newRevision,$accountId,$rev]);
                    if($sql->rowCount()!==1)
                        throw new DomainException('workbook_revision_conflict');
                }
                baharAccountAudit($pdo,$accountId,'BAHAR_ACCOUNT_WORKBOOK_UPDATED');
                $pdo->commit();
                respond(['ok'=>true,'schema'=>'jr.bahar-workbook-save.v1',
                  'revision'=>$newRevision,'encryptedAtRest'=>true,
                  'scientificValidationGranted'=>false,
                  'accountEntitlementGranted'=>false]);
            }catch(DomainException $e){
                if($pdo->inTransaction())$pdo->rollBack();
                fail('workbook_revision_conflict',409);
            }catch(Throwable $e){
                if($pdo->inTransaction())$pdo->rollBack();
                throw $e;
            }
        }
        if($path==='/bahar/account/erasure-request'&&$verb==='POST'){
            baharAccountVerifyMutationCsrf($accountId);
            $body=jsonBody();
            if(($body['confirmation']??null)!=='REQUEST MY BAHAR WORKBOOK ERASURE')
                fail('explicit_erasure_request_required',422);
            if(!rateAllowed($pdo,'bahar_private_erasure_request',$accountId,4,86400))
                fail('rate_limited',429);
            respond(baharAccountErasureRequest($pdo,$accountId));
        }
        if($path==='/bahar/account/workbook'&&$verb==='DELETE'){
            baharAccountVerifyMutationCsrf($accountId);
            $body=jsonBody();
            if(($body['confirmation']??null)!=='DELETE MY BAHAR WORKBOOK')
                fail('deletion_confirmation_required',422);
            $pdo->beginTransaction();
            try{
                baharAccountLockOwner($pdo,$accountId);
                if(!baharAccountLegalHoldClear($pdo,$accountId))
                    throw new DomainException('active_legal_hold');
                $delete=$pdo->prepare('DELETE FROM eco_bahar_account_workbooks
                  WHERE owner_account_id=?');
                $delete->execute([$accountId]);
                $deleted=$delete->rowCount()===1;
                baharAccountAudit($pdo,$accountId,'BAHAR_ACCOUNT_WORKBOOK_DELETED');
                $pdo->commit();
                respond(['ok'=>true,'databaseRowDeleted'=>$deleted,
                  'currentRecordAbsent'=>!$deleted,
                  'auditRetained'=>true,'backupErasureNotCertified'=>true,
                  'legalRetentionRightsUnaffected'=>true]);
            }catch(DomainException $e){
                if($pdo->inTransaction())$pdo->rollBack();
                fail('legal_hold_erasure_blocked',409);
            }catch(Throwable $e){
                if($pdo->inTransaction())$pdo->rollBack();
                throw $e;
            }
        }
        fail('method_not_allowed',405);
    }catch(Throwable $e){
        // Never include personal JSON, learner IDs, evidence, email,
        // encryption keys or stack traces in notification payloads.
        error_log('BAHAR private account unavailable: '.get_class($e));
        if(isset($pdo)&&$pdo instanceof PDO&&
          function_exists('baharAccountFeatureAllowed')&&
          baharAccountFeatureAllowed()){
            try{
              require_once __DIR__.'/operations-alerts.php';
              if(function_exists('operationsAlertRecord'))
                operationsAlertRecord(
                    $pdo,'bahar_private_storage_failure',
                    'bahar_private_account',nowTs()
                );
            }catch(Throwable $ignored){}
        }
        fail('bahar_private_unavailable',503);
    }
}
