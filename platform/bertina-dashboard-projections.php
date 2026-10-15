<?php
declare(strict_types=1);
require_once __DIR__.'/bertina-free-stage-authorisation.php';

/**
 * Isolated, non-operational view models. Every input must come from trusted
 * authenticated server queries. Never expose raw answers, scores, student IDs,
 * document URLs, payment data, freeform notes or unreleased reports.
 */
function bertinaCustomerTalentOverview(array $context): array {
    $deny=static fn(string $reason): array => [
        'ok'=>false,'schema'=>'talent-customer-overview-v1',
        'reason'=>$reason,'modules'=>[]
    ];
    $actor=$context['actor']??null;
    $subject=$context['subject']??null;
    $age=$context['age_verification']??null;
    if (!is_array($actor) || !is_array($subject) || !is_array($age))
        return $deny('UNVERIFIED_SUBJECT_CONTEXT');
    $isGuardian=($age['classification']??null)==='MINOR';
    if ($isGuardian) {
        if (($context['parent_visibility_history_complete']??false)!==true)
            return $deny('PARENT_VISIBILITY_HISTORY_REQUIRED');
        $history=$context['parent_visibility_history']??null;
        if (!is_array($history))return $deny('PARENT_VISIBILITY_HISTORY_REQUIRED');
        foreach ($history as $row) {
            if (!is_array($row) || ($row['subject_id']??null)!==($subject['id']??null) ||
                ($row['account_id']??null)!==($actor['id']??null) ||
                !is_string($row['notice_id']??null) || $row['notice_id']==='' ||
                !in_array($row['locale']??null,['fa','en'],true))
                return $deny('PARENT_VISIBILITY_SCOPE_MISMATCH');
        }
        $visibility=bertinaCurrentConsent($history,'PARENT_VISIBILITY',$context['now']??0);
        if ($visibility['allowed']!==true)
            return $deny('PARENT_VISIBILITY_NOT_GRANTED');
    }
    $stages=['GOLDEN_TALENT'=>'ORIENTATION',
             'RCAS'=>'CONTEXT_REFLECTION','BAHAR'=>'STARTER_PLAN'];
    $allowedStates=['NOT_STARTED','IN_PROGRESS','COMPLETED','PAUSED'];
    $modules=[];
    $snapshots=$context['module_snapshots']??[];
    if (!is_array($snapshots))return $deny('INVALID_SNAPSHOTS');
    foreach ($stages as $module=>$stage) {
        $decision=bertinaAuthoriseFreeStage(array_replace($context,
            ['module'=>$module,'stage'=>$stage]));
        if ($decision['allowed']!==true)return $deny('FREE_STAGE_'.$decision['reason']);
        $snapshot=$snapshots[$module]??null;
        $state='UNKNOWN'; // Missing or unverified does not mean NOT_STARTED.
        if (is_array($snapshot) &&
            ($snapshot['record_source']??null)==='SERVER_QUERY' &&
            in_array($snapshot['stage_state']??null,$allowedStates,true) &&
            is_string($snapshot['checked_at']??null) &&
            preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/D',$snapshot['checked_at'])) {
            $hasEvidence=$snapshot['stage_state']==='NOT_STARTED' ||
                (is_string($snapshot['event_reference']??null) &&
                 trim($snapshot['event_reference'])!=='' &&
                 is_string($snapshot['instrument_version']??null) &&
                 trim($snapshot['instrument_version'])!=='');
            if ($hasEvidence)$state=$snapshot['stage_state'];
        }
        $modules[]=[
            'module'=>$module,
            'freeStage'=>['code'=>$stage,'state'=>$state,'paymentRequired'=>false],
            'paidStage'=>['state'=>'NOT_VERIFIED'],
            'report'=>['state'=>'NOT_CONNECTED','scientificStatus'=>'PREVALIDATION']
        ];
    }
    return [
        'ok'=>true,'schema'=>'talent-customer-overview-v1',
        'viewerScope'=>$isGuardian?'VERIFIED_GUARDIAN':'VERIFIED_SELF',
        'modules'=>$modules,'hasPrivateEvidence'=>false,
        'normativeScoresAvailable'=>false,'reportDownloadAvailable'=>false
    ];
}

/**
 * Admin operational aggregates only, NOT case-detail access. If any nonzero
 * category is below k=5, suppress the whole module to avoid complement leakage.
 * Repeated-query differencing remains a separate API/analytics design risk.
 */
function bertinaAdminTalentSummary(array $context): array {
    $deny=static fn(string $reason): array => [
        'ok'=>false,'schema'=>'talent-admin-summary-v1',
        'reason'=>$reason,'modules'=>[]
    ];
    $admin=$context['admin']??null;
    if (($context['server_context']??null)!=='TRUSTED_BACKEND' ||
        !is_array($admin) || ($admin['source']??null)!=='SERVER_SESSION' ||
        ($admin['authenticated']??null)!==true ||
        ($admin['mfa_fresh']??null)!==true ||
        !is_array($admin['verified_capabilities']??null) ||
        !in_array('ASSESSMENT_OPERATIONS_SUMMARY',$admin['verified_capabilities'],true))
        return $deny('ADMIN_MFA_OR_CAPABILITY_REQUIRED');
    $input=$context['aggregates']??null;
    if (!is_array($input))return $deny('AGGREGATES_UNAVAILABLE');
    $modules=[];
    foreach (['GOLDEN_TALENT','RCAS','BAHAR'] as $code) {
        $group=$input[$code]??null;
        $state='UNAVAILABLE';
        $safeCounts=null;
        if (is_array($group) && ($group['record_source']??null)==='SERVER_AGGREGATE') {
            $values=[];$valid=true;
            foreach (['in_progress','review_pending','released'] as $field) {
                $v=$group[$field]??null;
                if (!is_int($v) || $v<0){$valid=false;break;}
                $values[$field]=$v;
            }
            if ($valid) {
                $total=array_sum($values);
                if ($total===0) {$state='EMPTY';$safeCounts=$values;}
                elseif ($total>=5 &&
                    !array_filter($values,static fn(int $n): bool=>$n>0&&$n<5)) {
                    $state='AGGREGATED';$safeCounts=$values;
                } else $state='SUPPRESSED';
            }
        }
        $modules[]=['module'=>$code,'state'=>$state,'counts'=>$safeCounts];
    }
    return [
        'ok'=>true,'schema'=>'talent-admin-summary-v1','modules'=>$modules,
        'containsLearnerIdentifiers'=>false,'caseDetailAccessGranted'=>false
    ];
}
