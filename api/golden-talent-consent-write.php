<?php
declare(strict_types=1);

/**
 * Preproduction, INTERNAL-ONLY consent withdrawal service.
 *
 * NO HTTP ROUTE calls this file. New GRANT/REGRANT writes are expressly NOT
 * implemented while independently verified age/guardian authority and child
 * assent rules remain unresolved.
 *
 * This service consumes an account id resolved by the actual server session,
 * never a browser-supplied identity. It can revoke ONLY that account's
 * already persisted ASSESSMENT or PARENT_VISIBILITY grant.
 *
 * Shared lock order for ALL future consent writers:
 *  1) one eco_subjects primary-key row FOR UPDATE;
 *  2) the actor/purpose scoped consent history FOR UPDATE;
 *  3) append withdrawal and audit in the same transaction.
 * Existing Golden Talent guardian reads lock the subject first.
 */
if (PHP_SAPI !== 'cli' && !defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}
require_once __DIR__.'/golden-talent-consent.php';

/**
 * @return array{state:string,purpose:string,changed:bool}
 * @throws DomainException for invalid data, authority or consent state.
 * @throws Throwable for underlying DB / audit errors (transaction rolled back).
 */
function goldenTalentInternalWithdrawConsent(
    PDO $pdo, string $authenticatedAccountId, string $subjectId,
    string $purpose, string $commandId
): array {
    // Defence in depth: an accidental future include must NEVER activate a
    // private consent writer before explicitly approved rollout.
    if (!defined('GT_INTERNAL_CONSENT_WRITE_ENABLED') ||
        constant('GT_INTERNAL_CONSENT_WRITE_ENABLED') !== true)
        throw new DomainException('WITHDRAWAL_FEATURE_NOT_RELEASED');
    $uuid = static fn(string $id): bool =>
        preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/Di', $id) === 1;
    if (!$uuid($authenticatedAccountId) || !$uuid($subjectId) || !$uuid($commandId) ||
        !in_array($purpose,['ASSESSMENT','PARENT_VISIBILITY'],true))
        throw new DomainException('INVALID_WITHDRAWAL_SCOPE');

    if ($pdo->inTransaction()) throw new DomainException('TRANSACTION_ALREADY_ACTIVE');
    if (!$pdo->beginTransaction()) throw new RuntimeException('TRANSACTION_NOT_AVAILABLE');
    try {
        // The subject mutex MUST be the first row lock, matching private
        // guardian readers and all future writer implementations.
        $q=$pdo->prepare('SELECT id FROM eco_subjects WHERE id=? FOR UPDATE');
        $q->execute([$subjectId]);
        if (!$q->fetch(PDO::FETCH_ASSOC))
            throw new DomainException('SUBJECT_NOT_FOUND');

        // Caller identity is derived from sessionAccount, never from input;
        // recheck the verified account state inside the same transaction.
        $q=$pdo->prepare("SELECT id,status,email_verified_at FROM customer_accounts
                         WHERE id=? FOR UPDATE");
        $q->execute([$authenticatedAccountId]);
        $account=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($account)||($account['status']??null)!=='active'||
           empty($account['email_verified_at']))
            throw new DomainException('VERIFIED_ACCOUNT_REQUIRED');

        // Require persisted previous consent issued by this account. A person
        // may withdraw their own recorded consent even after guardian expiry;
        // that expiry must not prevent withdrawal.
        $historyQuery=$pdo->prepare(
            "SELECT c.id,c.account_id,c.subject_id,c.notice_id,
                    c.decision,c.granted_at,c.withdrawn_at,
                    n.purpose_code,n.version_label,n.locale,n.notice_sha256,
                    n.effective_at,n.retired_at
             FROM eco_consent_records c
             INNER JOIN eco_consent_notices n ON n.id=c.notice_id
             WHERE c.subject_id=? AND c.account_id=?
               AND n.purpose_code=?
             ORDER BY c.granted_at DESC,c.id DESC LIMIT 1025 FOR UPDATE");
        $historyQuery->execute([$subjectId,$authenticatedAccountId,$purpose]);
        $history=$historyQuery->fetchAll(PDO::FETCH_ASSOC);
        if(count($history)>1024)throw new DomainException('CONSENT_HISTORY_LIMIT');

        // Check a retry by its server-generated operation ID BEFORE deciding
        // current state; a repeated request must not append a second event.
        $duplicate=$pdo->prepare(
            'SELECT id,account_id,subject_id,notice_id,decision,source_code
             FROM eco_consent_records WHERE id=? FOR UPDATE');
        $duplicate->execute([$commandId]);
        $previous=$duplicate->fetch(PDO::FETCH_ASSOC);
        if(is_array($previous)){
            if(($previous['account_id']??null)!==$authenticatedAccountId ||
               ($previous['subject_id']??null)!==$subjectId ||
               ($previous['decision']??null)!=='WITHDRAWN' ||
               ($previous['source_code']??null)!=='GT_INTERNAL_WITHDRAWAL')
                throw new DomainException('COMMAND_ID_REUSED');
            $scopeNotice=false;
            foreach($history as $row) {
                if(($row['id']??null)===$commandId &&
                   ($row['notice_id']??null)===$previous['notice_id']){
                    $scopeNotice=true;break;
                }
            }
            if(!$scopeNotice)throw new DomainException('COMMAND_SCOPE_MISMATCH');
            if(!$pdo->commit())throw new RuntimeException('WITHDRAWAL_COMMIT_FAILED');
            return ['state'=>'ALREADY_APPLIED','purpose'=>$purpose,'changed'=>false];
        }

        // Take a fresh DB UTC timestamp with millisecond precision. Refuse a
        // same-tick event rather than manufacture an ambiguous event order.
        $instant=$pdo->query('SELECT UTC_TIMESTAMP(3) AS utc_now')->fetch(PDO::FETCH_ASSOC);
        $nowString=$instant['utc_now']??null;
        $now=bertinaSqlUtcSeconds($nowString);
        if($now===null)throw new RuntimeException('DATABASE_UTC_UNAVAILABLE');
        if(!$history){
            throw new DomainException('NO_PERSISTED_CONSENT');
        }

        // Withdrawal must remain possible even when the original notice is
        // currently retired or not yet effective: otherwise later notice
        // changes might resurrect a grant that the actor tried to withdraw.
        // An already withdrawn/denied latest decision is a no-op.
        $current=bertinaCurrentConsent($history,$purpose,$now);
        if($current['allowed']!==true){
            if(in_array($current['reason'],['CONSENT_NOT_GRANTED','NO_DECISION'],true)){
                if(!$pdo->commit())throw new RuntimeException('WITHDRAWAL_COMMIT_FAILED');
                return ['state'=>'ALREADY_UNAVAILABLE','purpose'=>$purpose,'changed'=>false];
            }
            if(!in_array($current['reason'],['NOTICE_RETIRED','NOTICE_NOT_EFFECTIVE'],true))
                throw new DomainException('CONSENT_HISTORY_UNSAFE');
            // Persist a durable opt-out despite the notice's current state.
        }
        $latestGrant=null;
        $maxTime=null;
        foreach($history as $row){
            $at=bertinaSqlUtcSeconds($row['granted_at']??null);
            if($at===null)throw new DomainException('CONSENT_HISTORY_UNSAFE');
            $maxTime=$maxTime===null? $at : max($maxTime,$at);
            if(($row['withdrawn_at']??null)!==null){
                $withdrawn=bertinaSqlUtcSeconds($row['withdrawn_at']);
                if($withdrawn===null)throw new DomainException('CONSENT_HISTORY_UNSAFE');
                $maxTime=max($maxTime,$withdrawn);
            }
            if(($row['decision']??null)==='GRANTED' &&
               ($row['withdrawn_at']??null)===null &&
               ($latestGrant===null ||
                $at>bertinaSqlUtcSeconds($latestGrant['granted_at']))){
                $latestGrant=$row;
            }
        }
        if(!$latestGrant || $maxTime===null || $now<=$maxTime)
            throw new DomainException('CONSENT_TIMESTAMP_CONFLICT');

        $insert=$pdo->prepare(
            "INSERT INTO eco_consent_records
               (id,account_id,subject_id,notice_id,decision,lawful_basis,
                evidence_sha256,granted_at,withdrawn_at,source_code)
             VALUES(?,?,?,?,'WITHDRAWN','CONSENT',NULL,?,?,
                    'GT_INTERNAL_WITHDRAWAL')");
        if(!$insert->execute([$commandId,$authenticatedAccountId,$subjectId,
                             $latestGrant['notice_id'],$nowString,$nowString]))
            throw new RuntimeException('WITHDRAWAL_INSERT_FAILED');

        // If the audit write fails, roll back the withdrawal too. The audit
        // is actor-scoped; no child id, answer, pseudonym or report is logged.
        $eventKey=hash('sha256','GT_CONSENT_WITHDRAWN|'.$commandId);
        $audit=$pdo->prepare(
            "INSERT INTO eco_audit_events
              (event_key,actor_account_id,action_code,entity_kind,entity_id,
               correlation_id,payload_sha256,event_sha256)
             VALUES(?,?,'GT_CONSENT_WITHDRAWN','ACCOUNT',?,?,?,?)");
        if(!$audit->execute([
            $eventKey,$authenticatedAccountId,$authenticatedAccountId,
            $commandId,hash('sha256','purpose:'.$purpose),
            hash('sha256','GT_CONSENT_WITHDRAWN|'.$eventKey)
        ]))throw new RuntimeException('WITHDRAWAL_AUDIT_FAILED');
        if(!$pdo->commit())throw new RuntimeException('WITHDRAWAL_COMMIT_FAILED');
        return ['state'=>'WITHDRAWN','purpose'=>$purpose,'changed'=>true];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
