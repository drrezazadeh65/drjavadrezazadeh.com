<?php
declare(strict_types=1);
require_once __DIR__.'/../platform/bertina-free-stage-authorisation.php';
$now=strtotime('2026-10-16 12:00:00 UTC');
$checks=0;
$expect=static function(bool $actual,string $label) use (&$checks): void {
    $checks++;
    if(!$actual){fwrite(STDERR,'FAIL: '.$label."\n");exit(1);}
};
$grant=[
    'id'=>'consent-1','subject_id'=>'subject-1','account_id'=>'student-1',
    'notice_id'=>'notice-1','purpose_code'=>'ASSESSMENT','locale'=>'fa',
    'decision'=>'GRANTED','granted_at'=>'2026-10-15 10:00:00.100',
    'withdrawn_at'=>null,'version_label'=>'v1',
    'notice_sha256'=>str_repeat('a',64),
    'effective_at'=>'2026-10-01 00:00:00','retired_at'=>null
];
$base=[
    'module'=>'GOLDEN_TALENT','stage'=>'ORIENTATION',
    'server_context'=>'TRUSTED_BACKEND','history_complete'=>true,'now'=>$now,
    'actor'=>['id'=>'student-1','source'=>'SERVER_SESSION',
              'session_verified'=>true,'email_verified'=>true,'status'=>'active'],
    'subject'=>['id'=>'subject-1','subject_type'=>'LEARNER','status'=>'ACTIVE',
                'owner_account_id'=>'student-1','guardian_account_id'=>null,'age_band'=>'18_PLUS'],
    'age_verification'=>['state'=>'VERIFIED','classification'=>'ADULT',
                          'source'=>'INDEPENDENT_VERIFIED_RECORD','reference'=>'trusted-age-1'],
    'relationships'=>[],
    'consent_history'=>[$grant]
];
$allowed=static fn(array $ctx): bool => bertinaAuthoriseFreeStage($ctx)['allowed']===true;
foreach (['GOLDEN_TALENT'=>'ORIENTATION','RCAS'=>'CONTEXT_REFLECTION','BAHAR'=>'STARTER_PLAN'] as $mod=>$stage) {
    $result=bertinaAuthoriseFreeStage(array_replace($base,['module'=>$mod,'stage'=>$stage]));
    $expect($result['allowed']===true && $result['payment_required']===false,'free stage '.$mod);
}
$expect(!$allowed(array_replace($base,['stage'=>'PROFESSIONAL_REPORT'])),'paid never unlocked');
$expect(!$allowed(array_replace($base,['server_context'=>'CLIENT'])),'client context');
$expect(!$allowed(array_replace($base,['history_complete'=>false])),'incomplete history');
$expect(!$allowed(array_replace($base,['age_verification'=>null])),'unknown age');
$expect(!$allowed(array_replace($base,['age_verification'=>['state'=>'VERIFIED','classification'=>'ADULT','source'=>'AGE_BAND_ONLY','reference'=>'age_band']])),'age band not proof');
$expect(!$allowed(array_replace($base,['subject'=>array_replace($base['subject'],['owner_account_id'=>'other'])])),'other account');
$expect(!$allowed(array_replace($base,['actor'=>array_replace($base['actor'],['email_verified'=>false])])),'unverified account');
$expect(!$allowed(array_replace($base,['subject'=>array_replace($base['subject'],['status'=>'BLOCKED'])])),'inactive subject');
$expect(!$allowed(array_replace($base,['consent_history'=>[array_replace($grant,['account_id'=>'other'])]])),'cross-account consent');
$expect(!$allowed(array_replace($base,['consent_history'=>[array_replace($grant,['subject_id'=>'other'])]])),'cross-subject consent');
$expect(!$allowed(array_replace($base,['consent_history'=>[array_replace($grant,['purpose_code'=>'PARENT_VISIBILITY'])]])),'purpose isolation');
$expect(!$allowed(array_replace($base,['consent_history'=>[array_replace($grant,['locale'=>'invalid'])]])),'notice locale');
$expect(!$allowed(array_replace($base,['consent_history'=>[array_replace($grant,['withdrawn_at'=>'2026-10-15 11:00:00'])]])),'revocation respected');
$child=array_replace($base['subject'],['owner_account_id'=>'child-1','guardian_account_id'=>'parent-1','age_band'=>'UNDER_18']);
$parent=array_replace($base['actor'],['id'=>'parent-1']);
$childGrant=array_replace($grant,['account_id'=>'parent-1']);
$link=['subject_id'=>'subject-1','related_account_id'=>'parent-1',
       'relationship_code'=>'GUARDIAN','verification_status'=>'VERIFIED',
       'verified_by_account_id'=>'verified-admin','expires_at'=>'2026-12-01 00:00:00'];
$assent=[
    'record_source'=>'TRUSTED_ASSENT_RECORD','state'=>'VERIFIED',
    'decision'=>'ASSENTED','subject_id'=>'subject-1',
    'guardian_account_id'=>'parent-1','reference'=>'assent-1',
    'notice_version'=>'assent-v1','notice_sha256'=>str_repeat('c',64),
    'assented_at'=>'2026-10-15 08:00:00',
    'expires_at'=>'2026-12-01 08:00:00','withdrawn_at'=>null
];
$minor=array_replace($base,[
    'actor'=>$parent,'subject'=>$child,'consent_history'=>[$childGrant],
    'age_verification'=>['state'=>'VERIFIED','classification'=>'MINOR',
                          'source'=>'INDEPENDENT_VERIFIED_RECORD','reference'=>'trusted-age-2'],
    'relationships'=>[$link],'minor_assent'=>$assent
]);
$expect($allowed($minor),'verified current guardian');

$expect(!$allowed(array_replace($minor,['minor_assent'=>null])),'guardian permission without learner assent is insufficient');
$expect(!$allowed(array_replace($minor,['minor_assent'=>array_replace($assent,['withdrawn_at'=>'2026-10-16 07:00:00'])])),'withdrawn child assent denies');
$expect(!$allowed(array_replace($minor,['minor_assent'=>array_replace($assent,['expires_at'=>'2026-10-01 00:00:00'])])),'expired child assent denies');
$expect(!$allowed(array_replace($minor,['minor_assent'=>array_replace($assent,['guardian_account_id'=>'other'])])),'assent must match the real guardian');
$expect(!$allowed(array_replace($minor,['minor_assent'=>array_replace($assent,['subject_id'=>'other'])])),'assent cannot be transferred between children');
$expect(!$allowed(array_replace($minor,['minor_assent'=>array_replace($assent,['record_source'=>'CLIENT'])])),'client assertion is not child assent');
$expect(!$allowed(array_replace($minor,['minor_assent'=>array_replace($assent,['notice_sha256'=>'bad'])])),'assent needs pinned notice content');

$expect(!$allowed(array_replace($minor,['relationships'=>[]])),'guardian link missing');
$expect(!$allowed(array_replace($minor,['relationships'=>[array_replace($link,['verification_status'=>'PENDING'])]])),'guardian unverified');
$expect(!$allowed(array_replace($minor,['relationships'=>[array_replace($link,['expires_at'=>'2026-10-01 00:00:00'])]])),'guardian expired');
$expect(!$allowed(array_replace($minor,['relationships'=>[array_replace($link,['related_account_id'=>'other'])]])),'guardian wrong actor');
$expect(!$allowed(array_replace($minor,['actor'=>array_replace($parent,['id'=>'child-1'])])),'child cannot pretend guardian');
$expect(!$allowed(array_replace($minor,['age_verification'=>null])),'minor status must be independently verified');
$expect(!$allowed(array_replace($minor,['consent_history'=>[array_replace($childGrant,['account_id'=>'child-1'])]])),'guardian-specific consent');
$expect(!$allowed(array_replace($minor,['relationships'=>[array_replace($link,['verified_by_account_id'=>null])]])),'relationship reviewer required');
echo "Bertina free first-stage DTO policy: ".$checks." checks passed\n";
