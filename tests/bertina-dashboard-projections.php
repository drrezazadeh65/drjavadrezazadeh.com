<?php
declare(strict_types=1);
require_once __DIR__.'/../platform/bertina-dashboard-projections.php';
$now=strtotime('2026-10-16 12:00:00 UTC');
$checks=0;
$check=static function(bool $condition,string $message) use (&$checks): void {
    $checks++;
    if (!$condition) {fwrite(STDERR,"FAIL: $message\n");exit(1);}
};
$consent=[
 'id'=>'consent-1','subject_id'=>'learner','account_id'=>'learner',
 'notice_id'=>'notice-1','purpose_code'=>'ASSESSMENT','locale'=>'fa',
 'decision'=>'GRANTED','granted_at'=>'2026-10-15 10:00:00.100',
 'withdrawn_at'=>null,'version_label'=>'v1','notice_sha256'=>str_repeat('a',64),
 'effective_at'=>'2026-10-01 00:00:00','retired_at'=>null];
$base=[
 'server_context'=>'TRUSTED_BACKEND','history_complete'=>true,'now'=>$now,
 'actor'=>['id'=>'learner','source'=>'SERVER_SESSION','session_verified'=>true,
           'email_verified'=>true,'status'=>'active'],
 'subject'=>['id'=>'learner','subject_type'=>'LEARNER','status'=>'ACTIVE',
             'owner_account_id'=>'learner','guardian_account_id'=>null],
 'age_verification'=>['state'=>'VERIFIED','classification'=>'ADULT',
                      'source'=>'INDEPENDENT_VERIFIED_RECORD','reference'=>'proof-1'],
 'relationships'=>[],'consent_history'=>[$consent],
 'module_snapshots'=>[
    'RCAS'=>['record_source'=>'SERVER_QUERY','stage_state'=>'COMPLETED',
             'checked_at'=>'2026-10-16T11:00:00Z','event_reference'=>'evt1',
             'instrument_version'=>'start-1.2','raw_answers'=>'sensitive',
             'report_status'=>'RELEASED','score'=>99],
    'BAHAR'=>['record_source'=>'SERVER_QUERY','stage_state'=>'NOT_STARTED',
              'checked_at'=>'2026-10-16T11:00:00Z']]
];
$view=bertinaCustomerTalentOverview($base);
$check($view['ok']===true,'self overview');
$check(count($view['modules'])===3,'all modules included');
$check($view['modules'][0]['module']==='GOLDEN_TALENT','canonical module ordering');
$check($view['modules'][0]['freeStage']['state']==='UNKNOWN','missing data is unknown');
$check($view['modules'][1]['freeStage']['state']==='COMPLETED','verified RCAS completion');
$check($view['modules'][2]['freeStage']['state']==='NOT_STARTED','verified no stages');
$check($view['modules'][1]['report']['state']==='NOT_CONNECTED','unverified report never exposed');
$check($view['modules'][1]['paidStage']['state']==='NOT_VERIFIED','no paid claim');
$check($view['viewerScope']==='VERIFIED_SELF','self scope');
$check($view['hasPrivateEvidence']===false,'no raw data flag');
$json=json_encode($view);
foreach(['sensitive','raw_answers','score','99','learner','notice-1','evt1'] as $secret)
 $check(!str_contains($json,$secret),'no sensitive leak '.$secret);
$check(!bertinaCustomerTalentOverview(array_replace($base,['age_verification'=>null]))['ok'],'age proof required');
$check(!bertinaCustomerTalentOverview(array_replace($base,['history_complete'=>false]))['ok'],'complete history required');
$withdrawn=array_replace($consent,['decision'=>'WITHDRAWN']);
$check(!bertinaCustomerTalentOverview(array_replace($base,['consent_history'=>[$withdrawn]]))['ok'],'revoked consent denies');
$badSnapshot=array_replace($base['module_snapshots']['RCAS'],['record_source'=>'CLIENT']);
$untrusted=bertinaCustomerTalentOverview(array_replace($base,['module_snapshots'=>['RCAS'=>$badSnapshot]]));
$check($untrusted['modules'][1]['freeStage']['state']==='UNKNOWN','untrusted snapshot ignored');
$incomplete=array_replace($base['module_snapshots']['RCAS'],['event_reference'=>null]);
$unknown=bertinaCustomerTalentOverview(array_replace($base,['module_snapshots'=>['RCAS'=>$incomplete]]));
$check($unknown['modules'][1]['freeStage']['state']==='UNKNOWN','missing provenance ignored');
$child=array_replace($base['subject'],['owner_account_id'=>null,'guardian_account_id'=>'parent']);
$parent=array_replace($base['actor'],['id'=>'parent']);
$parentGrant=array_replace($consent,['id'=>'consent-parent','account_id'=>'parent']);
$parentVisibility=array_replace($parentGrant,['id'=>'parent-vis','notice_id'=>'notice-parent','purpose_code'=>'PARENT_VISIBILITY']);
$link=['subject_id'=>'learner','related_account_id'=>'parent','relationship_code'=>'GUARDIAN',
       'verification_status'=>'VERIFIED','verified_by_account_id'=>'reviewer',
       'expires_at'=>'2026-12-01 00:00:00'];
$guardian=array_replace($base,[
 'actor'=>$parent,'subject'=>$child,'relationships'=>[$link],
 'consent_history'=>[$parentGrant],
 'age_verification'=>['state'=>'VERIFIED','classification'=>'MINOR',
                      'source'=>'INDEPENDENT_VERIFIED_RECORD','reference'=>'child-proof'],
 'parent_visibility_history_complete'=>true,
 'parent_visibility_history'=>[$parentVisibility]
]);
$check(bertinaCustomerTalentOverview($guardian)['ok'],'guardian with independent visibility consent');
$check(bertinaCustomerTalentOverview($guardian)['viewerScope']==='VERIFIED_GUARDIAN','guardian scope');
$check(!bertinaCustomerTalentOverview(array_replace($guardian,['parent_visibility_history'=>[]]))['ok'],'no parent visibility consent');
$check(!bertinaCustomerTalentOverview(array_replace($guardian,['parent_visibility_history_complete'=>false]))['ok'],'incomplete visibility history');
$check(!bertinaCustomerTalentOverview(array_replace($guardian,['parent_visibility_history'=>[array_replace($parentVisibility,['account_id'=>'other'])]]))['ok'],'other guardian cannot read');
$check(!bertinaCustomerTalentOverview(array_replace($guardian,['relationships'=>[]]))['ok'],'guardian link required');
$admin=['server_context'=>'TRUSTED_BACKEND',
 'admin'=>['source'=>'SERVER_SESSION','authenticated'=>true,'mfa_fresh'=>true,
           'verified_capabilities'=>['ASSESSMENT_OPERATIONS_SUMMARY']],
 'aggregates'=>[
   'RCAS'=>['record_source'=>'SERVER_AGGREGATE','in_progress'=>5,'review_pending'=>0,'released'=>10],
   'BAHAR'=>['record_source'=>'SERVER_AGGREGATE','in_progress'=>2,'review_pending'=>0,'released'=>10],
   'GOLDEN_TALENT'=>['record_source'=>'SERVER_AGGREGATE','in_progress'=>0,'review_pending'=>0,'released'=>0]]
];
$summary=bertinaAdminTalentSummary($admin);
$check($summary['ok']===true,'admin MFA scoped summary');
$check($summary['modules'][0]['state']==='EMPTY','zero group explicitly known');
$check($summary['modules'][1]['state']==='AGGREGATED','safe aggregate');
$check($summary['modules'][2]['state']==='SUPPRESSED','small cohort suppressed');
$check($summary['modules'][2]['counts']===null,'no complement inference');
$check($summary['caseDetailAccessGranted']===false,'summary never grants case detail');
$check(!bertinaAdminTalentSummary(array_replace($admin,['server_context'=>'CLIENT']))['ok'],'no client admin authority');
$check(!bertinaAdminTalentSummary(array_replace($admin,['admin'=>array_replace($admin['admin'],['mfa_fresh'=>false])]))['ok'],'fresh MFA required');
$check(!bertinaAdminTalentSummary(array_replace($admin,['admin'=>array_replace($admin['admin'],['verified_capabilities'=>[]])]))['ok'],'explicit capability required');
$check(!bertinaAdminTalentSummary(array_replace($admin,['admin'=>array_replace($admin['admin'],['verified_capabilities'=>'ASSESSMENT_OPERATIONS_SUMMARY'])]))['ok'],'malformed role denied');
echo "Bertina synthetic dashboard DTO privacy: ".$checks." checks passed\n";
