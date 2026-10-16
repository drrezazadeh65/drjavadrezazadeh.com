<?php
declare(strict_types=1);
/**
 * RESEARCH / NONDEPLOYING: a single server-owned MySQL DTO composition
 * contract for GOLDEN_TALENT / RCAS / BAHAR free-first stages.
 *
 * Never publish this reference under an HTTP route until the candidate
 * age/assent tables are approved and deployed and session/CSRF/audit,
 * privacy/ethics and idempotent submission are independently validated.
 * The trusted authenticated account identifier MUST be derived by the
 * eventual PHP controller, not accepted from JSON/query string.
 *
 * The caller owns the transaction (and its audit/commit), while this reader
 * obtains subject, account and consent locks in a documented order.
 */
require_once __DIR__.'/bertina-free-stage-authorisation.php';
require_once __DIR__.'/bertina-age-attestation-reader.php';
require_once __DIR__.'/bertina-minor-assent-reader.php';

function bertinaTrustedFreeFirstStageDecision(
    PDO $pdo,string $authenticatedAccountId,string $subjectId,
    string $module,string $stage,string $jurisdiction,int $now
):array {
    $deny=static fn(string $why):array=>[
        'allowed'=>false,'reason'=>$why,'tier'=>'NONE'];
    if(!$pdo->inTransaction() || $now<=0)
        return $deny('TRUSTED_TRANSACTION_REQUIRED');
    if(!preg_match('/^[a-f0-9-]{36}$/Di',$authenticatedAccountId) ||
       !preg_match('/^[a-f0-9-]{36}$/Di',$subjectId) ||
       !preg_match('/^[A-Z]{2}$/D',$jurisdiction))
        return $deny('INVALID_AUTHORISED_SCOPE');
    try{
        $q=$pdo->prepare("SELECT id,owner_account_id,guardian_account_id,
                    subject_type,status,age_band
                    FROM eco_subjects WHERE id=? FOR UPDATE");
        $q->execute([$subjectId]);
        $subject=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($subject))return $deny('SUBJECT_NOT_FOUND');

        $q=$pdo->prepare("SELECT id,status,email_verified_at
                    FROM customer_accounts WHERE id=? FOR UPDATE");
        $q->execute([$authenticatedAccountId]);
        $account=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($account) ||
           ($account['status']??null)!=='active' ||
           empty($account['email_verified_at']))
            return $deny('VERIFIED_ACCOUNT_REQUIRED');

        $age=bertinaVerifiedAgeAttestation($pdo,$subjectId,$jurisdiction,$now);
        if($age===null)return $deny('VERIFIED_AGE_REQUIRED');

        $relationship=$pdo->prepare(
            'SELECT subject_id,related_account_id,relationship_code,
                    verification_status,verified_by_account_id,expires_at
             FROM eco_subject_relationships
             WHERE subject_id=? AND related_account_id=?
             LIMIT 101 FOR UPDATE');
        $relationship->execute([$subjectId,$authenticatedAccountId]);
        $relationships=$relationship->fetchAll(PDO::FETCH_ASSOC);
        if(!is_array($relationships)||count($relationships)>100)
            return $deny('RELATIONSHIP_HISTORY_UNSAFE');

        $assent=$age['classification']==='MINOR'
            ?bertinaVerifiedMinorAssent($pdo,$subjectId,$authenticatedAccountId,$now)
            :null;

        $consent=$pdo->prepare(
            "SELECT c.id,c.account_id,c.subject_id,c.notice_id,
                    c.decision,c.granted_at,c.withdrawn_at,
                    n.purpose_code,n.version_label,n.locale,n.notice_sha256,
                    n.effective_at,n.retired_at
             FROM eco_consent_records c
             INNER JOIN eco_consent_notices n ON n.id=c.notice_id
             WHERE c.subject_id=? AND c.account_id=?
               AND n.purpose_code='ASSESSMENT'
             ORDER BY c.granted_at DESC,c.id DESC
             LIMIT 1025 FOR UPDATE");
        $consent->execute([$subjectId,$authenticatedAccountId]);
        $history=$consent->fetchAll(PDO::FETCH_ASSOC);
        if(!is_array($history)||count($history)>1024)
            return $deny('CONSENT_HISTORY_UNSAFE');

        // Nothing is sourced from a browser or a self-asserted age band.
        // A preverified PHP session is a required *caller* contract; this
        // function additionally re-reads the account from SQL.
        return bertinaAuthoriseFreeStage([
            'module'=>$module,'stage'=>$stage,
            'server_context'=>'TRUSTED_BACKEND','history_complete'=>true,
            'now'=>$now,
            'actor'=>[
                'id'=>$authenticatedAccountId,'source'=>'SERVER_SESSION',
                'session_verified'=>true,'email_verified'=>true,
                'status'=>$account['status']
            ],
            'subject'=>$subject,
            'age_verification'=>$age,'relationships'=>$relationships,
            'minor_assent'=>$assent,'consent_history'=>$history
        ]);
    }catch(Throwable $e){
        // Missing proposed schema or failed SQL must not imply "NOT_STARTED"
        // or grant permission. Keep PDO errors and SQL/PII off any response.
        return $deny('TRUSTED_READER_UNAVAILABLE');
    }
}
