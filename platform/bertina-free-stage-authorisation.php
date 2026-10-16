<?php
declare(strict_types=1);
require_once __DIR__.'/bertina-consent-projection.php';

/**
 * Pure RESEARCH-STAGE Bertina MySQL DTO policy, not connected to the API.
 *
 * All parameters MUST come from authenticated backend joins / trusted
 * verification records. A browser cannot assert server_context, age proof,
 * history_complete, guardian relationship or consent. PHP API integration
 * is forbidden until those trust sources and transactional checks exist.
 */
function bertinaAuthoriseFreeStage(array $context): array {
    $deny = static fn(string $reason): array =>
        ['allowed'=>false,'reason'=>$reason,'tier'=>'NONE'];
    $stages=['GOLDEN_TALENT'=>'ORIENTATION',
             'RCAS'=>'CONTEXT_REFLECTION',
             'BAHAR'=>'STARTER_PLAN'];
    $module=$context['module']??null;
    if (!is_string($module) || !isset($stages[$module]) ||
        ($context['stage']??null)!==$stages[$module])
        return $deny('UNKNOWN_OR_PAID_STAGE');
    if (($context['server_context']??null)!=='TRUSTED_BACKEND' ||
        ($context['history_complete']??null)!==true)
        return $deny('TRUSTED_HISTORY_REQUIRED');
    $actor=$context['actor']??null;
    $subject=$context['subject']??null;
    if (!is_array($actor) || !is_string($actor['id']??null) ||
        trim($actor['id'])==='' || ($actor['source']??null)!=='SERVER_SESSION' ||
        ($actor['session_verified']??null)!==true ||
        ($actor['email_verified']??null)!==true ||
        ($actor['status']??null)!=='active')
        return $deny('AUTHENTICATION_REQUIRED');
    if (!is_array($subject) || !is_string($subject['id']??null) ||
        trim($subject['id'])==='' ||
        ($subject['status']??null)!=='ACTIVE' ||
        ($subject['subject_type']??null)!=='LEARNER')
        return $deny('ACTIVE_SUBJECT_REQUIRED');

    // eco_subjects.age_band is NOT reliable proof of legal minority/adulthood.
    // The current DDL has no age-verification record; until one is implemented,
    // this gate intentionally cannot authorise a real assessment.
    $age=$context['age_verification']??null;
    if (!is_array($age) || ($age['state']??null)!=='VERIFIED' ||
        !in_array($age['classification']??null,['ADULT','MINOR'],true) ||
        ($age['source']??null)!=='INDEPENDENT_VERIFIED_RECORD' ||
        !is_string($age['reference']??null) || trim($age['reference'])==='')
        return $deny('AGE_CLASSIFICATION_UNVERIFIED');

    $now=$context['now']??null;
    if (!is_int($now) || $now<=0) return $deny('INVALID_CLOCK');
    $account=$actor['id'];
    if ($age['classification']==='ADULT') {
        if (($subject['owner_account_id']??null)!==$account)
            return $deny('SUBJECT_OWNERSHIP_REQUIRED');
    } else {
        if (($subject['guardian_account_id']??null)!==$account)
            return $deny('GUARDIAN_ID_MISMATCH');
        $relationships=$context['relationships']??null;
        if (!is_array($relationships)) return $deny('RELATIONSHIP_HISTORY_REQUIRED');
        $valid=false;
        foreach ($relationships as $row) {
            if (!is_array($row) || ($row['subject_id']??null)!==$subject['id'] ||
                ($row['related_account_id']??null)!==$account ||
                ($row['relationship_code']??null)!=='GUARDIAN' ||
                ($row['verification_status']??null)!=='VERIFIED' ||
                !is_string($row['verified_by_account_id']??null) ||
                trim($row['verified_by_account_id'])==='') continue;
            $expires=$row['expires_at']??null;
            $until=$expires===null?null:bertinaSqlUtcSeconds($expires);
            if ($expires!==null && ($until===null || $until<=$now)) continue;
            $valid=true;
        }
        if (!$valid) return $deny('VERIFIED_GUARDIAN_RELATION_REQUIRED');

        // Site-level conservative safeguarding rule: until an independent,
        // purpose-scoped and withdrawable child assent source has been
        // deployed, private MINOR assessment stays closed. Parent permission
        // never substitutes for child assent. Capacity exceptions require
        // a distinct reviewed policy and must not be inferred from age_band.
        $assent=$context['minor_assent']??null;
        if(!is_array($assent) ||
           ($assent['record_source']??null)!=='TRUSTED_ASSENT_RECORD' ||
           ($assent['state']??null)!=='VERIFIED' ||
           ($assent['decision']??null)!=='ASSENTED' ||
           ($assent['subject_id']??null)!==$subject['id'] ||
           ($assent['guardian_account_id']??null)!==$account ||
           !is_string($assent['reference']??null) ||
           trim($assent['reference'])==='' ||
           !is_string($assent['notice_version']??null) ||
           trim($assent['notice_version'])==='' ||
           !is_string($assent['notice_sha256']??null) ||
           !preg_match('/^[a-f0-9]{64}$/D',$assent['notice_sha256']) ||
           ($assent['withdrawn_at']??null)!==null)
            return $deny('MINOR_ASSENT_NOT_VERIFIED');
        $assented=bertinaSqlUtcSeconds($assent['assented_at']??null);
        $expires=bertinaSqlUtcSeconds($assent['expires_at']??null);
        if($assented===null || $expires===null ||
           $assented>$now || $expires<=$now || $expires<=$assented)
            return $deny('MINOR_ASSENT_NOT_CURRENT');
    }
    $history=$context['consent_history']??null;
    if (!is_array($history))
        return $deny('CONSENT_HISTORY_OR_CLOCK_REQUIRED');
    foreach ($history as $row) {
        if (!is_array($row) || ($row['subject_id']??null)!==$subject['id'] ||
            ($row['account_id']??null)!==$account ||
            !is_string($row['notice_id']??null) ||
            trim($row['notice_id'])==='' ||
            !in_array($row['locale']??null,['fa','en'],true))
            return $deny('CONSENT_SCOPE_MISMATCH');
    }
    $consent=bertinaCurrentConsent($history,'ASSESSMENT',$now);
    if ($consent['allowed']!==true)
        return $deny('ASSESSMENT_CONSENT_'.$consent['reason']);
    return ['allowed'=>true,'reason'=>'FREE_STAGE_AUTHORISED',
        'tier'=>'FREE','payment_required'=>false,'module'=>$module,
        'stage'=>$context['stage'],'projection'=>'FORMATIVE_ONLY',
        'consentNoticeVersion'=>$consent['noticeVersion']];
}
