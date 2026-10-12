<?php
declare(strict_types=1);
/** Stage14 opt-in interest intake attached to the existing Bertina identity API.
 * Never serves directly. A verified active account is necessary; email from
 * the identity record is NOT duplicated into this table or analytics.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(403); exit; }

const STAGE14_CONSENT_VERSION='stage14-consultation-v1';
function stage14LeadSchemaReady(PDO $pdo): bool {
    try {
        $pdo->query('SELECT id FROM growth_lead_requests LIMIT 0');
        $pdo->query('SELECT event_id FROM growth_lead_consent_events LIMIT 0');
        return true;
    } catch (Throwable $e) { return false; }
}
function stage14LeadAccount(PDO $pdo): array {
    $a=sessionAccount($pdo);
    if (!is_array($a) || ($a['status']??'')!=='active' || empty($a['email_verified_at']))
        fail('verified_login_required',401);
    return $a;
}
function stage14LeadRoute(string $path,string $verb): never {
    if (!in_array($path,['/growth/leads','/growth/leads/mine','/growth/leads/withdraw'],true))
        fail('not_found',404);
    if (!in_array($verb,['GET','POST'],true))fail('method_not_allowed',405);
    if ($verb==='POST') {
        requirePostOrigin();
        if (strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE']??''))==='cross-site')
            fail('origin_forbidden',403);
    }
    $pdo=db();
    if (!$pdo || !authReady() || !stage14LeadSchemaReady($pdo))
        fail('secure_lead_capture_unavailable',503);
    $account=stage14LeadAccount($pdo);
    $accountId=(string)$account['id'];
    $now=nowTs();
    if ($path==='/growth/leads/mine' && $verb==='GET') {
        $q=$pdo->prepare('SELECT id,service_id,state,consent_version,consent_granted_at,consent_withdrawn_at,created_at,expires_at FROM growth_lead_requests WHERE account_id=? AND expires_at>? ORDER BY created_at DESC LIMIT 20');
        $q->execute([$accountId,$now]);respond(['ok'=>true,'requests'=>$q->fetchAll(),'evidenceScope'=>'OWNER_ONLY_NO_PAYMENT_CLAIMS']);
    }
    if ($path==='/growth/leads' && $verb==='POST') {
        $b=jsonBody();
        $id=$b['serviceId']??null;
        if (!is_string($id) || !preg_match('/^(?:service|vip):[A-Za-z0-9_-]{3,64}$/D',$id))
            fail('invalid_service',400);
        $available=localCatalog();
        if (!isset($available[$id])) fail('unknown_service',400);
        if (($b['purpose']??null)!=='CONSULTATION_CONTACT' || ($b['consentGiven']??null)!==true
            || ($b['consentVersion']??null)!==STAGE14_CONSENT_VERSION)
            fail('explicit_consultation_consent_required',400);
        if (($b['marketingOptIn']??false)!==false) fail('marketing_opt_in_is_separate',400);
        if (!rateAllowed($pdo,'growth_lead',$accountId,3,3600)) fail('rate_limited',429);
        $bucket=gmdate('Y-m',$now);
        $pdo->beginTransaction();
        try {
            $q=$pdo->prepare('SELECT id,state FROM growth_lead_requests WHERE account_id=? AND service_id=? AND period_bucket=? FOR UPDATE');
            $q->execute([$accountId,$id,$bucket]);$existing=$q->fetch();
            if ($existing) {
                $pdo->commit();
                if ($existing['state']==='WITHDRAWN') fail('withdrawn_this_month',409);
                respond(['ok'=>true,'leadId'=>(string)$existing['id'],'state'=>(string)$existing['state'],'duplicate'=>true],200);
            }
            $uuid=uuidv4();
            $ins=$pdo->prepare('INSERT INTO growth_lead_requests(id,account_id,service_id,period_bucket,state,purpose,consent_version,consent_granted_at,marketing_opt_in,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,0,?,?,?)');
            $ins->execute([$uuid,$accountId,$id,$bucket,'NEW','CONSULTATION_CONTACT',STAGE14_CONSENT_VERSION,$now,$now,$now,$now+90*86400]);
            $audit=$pdo->prepare('INSERT INTO growth_lead_consent_events(lead_id,account_id,event,consent_version,recorded_at) VALUES(?,?,?,?,?)');
            $audit->execute([$uuid,$accountId,'GRANTED',STAGE14_CONSENT_VERSION,$now]);
            $pdo->commit();
            respond(['ok'=>true,'leadId'=>$uuid,'state'=>'NEW','duplicate'=>false,
                'meaning'=>'Received with explicit consent; not a booked session, purchase or accepted service.'],201);
        } catch(Throwable $e) {
            if($pdo->inTransaction())$pdo->rollBack();
            fail('lead_capture_unavailable',503);
        }
    }
    if ($path==='/growth/leads/withdraw' && $verb==='POST') {
        $b=jsonBody();$id=$b['leadId']??null;
        if (!is_string($id)||!validUuid($id))fail('invalid_lead_id',400);
        if (!rateAllowed($pdo,'growth_withdraw',$accountId,12,3600))fail('rate_limited',429);
        $pdo->beginTransaction();
        try {
            $q=$pdo->prepare('SELECT id,state,consent_version FROM growth_lead_requests WHERE id=? AND account_id=? FOR UPDATE');
            $q->execute([$id,$accountId]);$row=$q->fetch();
            if(!$row){$pdo->rollBack();fail('not_found',404);}
            if($row['state']==='WITHDRAWN'){$pdo->commit();respond(['ok'=>true,'state'=>'WITHDRAWN','duplicate'=>true]);}
            $pdo->prepare("UPDATE growth_lead_requests SET state='WITHDRAWN',consent_withdrawn_at=?,updated_at=? WHERE id=? AND account_id=?")->execute([$now,$now,$id,$accountId]);
            $pdo->prepare('INSERT INTO growth_lead_consent_events(lead_id,account_id,event,consent_version,recorded_at) VALUES(?,?,?,?,?)')
                ->execute([$id,$accountId,'WITHDRAWN',(string)$row['consent_version'],$now]);
            $pdo->commit();respond(['ok'=>true,'state'=>'WITHDRAWN']);
        } catch(Throwable $e) {
            if($pdo->inTransaction())$pdo->rollBack();
            fail('withdrawal_unavailable',503);
        }
    }
    fail('not_found',404);
}
