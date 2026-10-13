<?php
declare(strict_types=1);
// No database, payment provider, authenticated account or production mutation.
define('BERTINA_API_BOOTSTRAPPED', true);
require_once __DIR__.'/../api/golden-talent.php';
$checks=0;
function gtExpect(bool $condition,string $label): void {
    global $checks;
    $checks++;
    if(!$condition){fwrite(STDERR,"FAIL: ".$label."\n");exit(1);}
}
$now=time();
$ago=static fn(int $n): string=>gmdate('Y-m-d H:i:s',$now-$n);
$ahead=static fn(int $n): string=>gmdate('Y-m-d H:i:s',$now+$n);
$grant=[
    'decision'=>'GRANTED','withdrawn_at'=>null,'purpose_code'=>'ASSESSMENT',
    'granted_at'=>$ago(600),'effective_at'=>$ago(3600),'retired_at'=>null
];
gtExpect(goldenTalentAssessmentConsentCurrent([$grant],$now),'current grant is accepted');
gtExpect(!goldenTalentAssessmentConsentCurrent([],$now),'missing grant denies');
gtExpect(!goldenTalentAssessmentConsentCurrent([array_merge($grant,['decision'=>'WITHDRAWN'])],$now),'withdrawal denies');
gtExpect(!goldenTalentAssessmentConsentCurrent([array_merge($grant,['decision'=>'DENIED'])],$now),'refusal denies');
gtExpect(!goldenTalentAssessmentConsentCurrent([array_merge($grant,['withdrawn_at'=>$ago(15)])],$now),'withdrawn-at flag denies');
gtExpect(!goldenTalentAssessmentConsentCurrent([array_merge($grant,['purpose_code'=>'PARENT_VISIBILITY'])],$now),'other purpose denies');
gtExpect(!goldenTalentAssessmentConsentCurrent([array_merge($grant,['granted_at'=>$ahead(300)])],$now),'future grant denies');
gtExpect(!goldenTalentAssessmentConsentCurrent([array_merge($grant,['effective_at'=>$ahead(300)])],$now),'future notice denies');
gtExpect(!goldenTalentAssessmentConsentCurrent([array_merge($grant,['retired_at'=>$ago(1)])],$now),'retired notice denies');
gtExpect(!goldenTalentAssessmentConsentCurrent([array_merge($grant,['retired_at'=>'invalid-date'])],$now),'invalid retirement timestamp denies');
gtExpect(!goldenTalentAssessmentConsentCurrent([array_merge($grant,['granted_at'=>'invalid-date'])],$now),'invalid grant timestamp denies');
gtExpect(!goldenTalentAssessmentConsentCurrent([array_merge($grant,['effective_at'=>'invalid-date'])],$now),'invalid effective timestamp denies');
$parentGrant=array_merge($grant,['purpose_code'=>'PARENT_VISIBILITY']);
gtExpect(goldenTalentPurposeConsentCurrent([$parentGrant],$now,'PARENT_VISIBILITY'),'independent parent visibility grant accepted');
gtExpect(!goldenTalentPurposeConsentCurrent([$grant],$now,'PARENT_VISIBILITY'),'assessment alone never grants parent visibility');
gtExpect(!goldenTalentPurposeConsentCurrent([$parentGrant],$now,'ASSESSMENT'),'parent visibility cannot authorise assessment');
gtExpect(!goldenTalentPurposeConsentCurrent([$parentGrant],$now,'UNRECOGNISED_PURPOSE'),'unknown consent purposes deny');
$withdrawal=array_merge($grant,['decision'=>'WITHDRAWN','granted_at'=>$ago(120)]);
gtExpect(!goldenTalentAssessmentConsentCurrent([$withdrawal,$grant],$now),'newer withdrawal overrides older grant');
$laterGrant=array_merge($grant,['granted_at'=>$ago(60)]);
gtExpect(goldenTalentAssessmentConsentCurrent([$laterGrant,$withdrawal],$now),'valid regrant after withdrawal is allowed');
gtExpect(!goldenTalentAssessmentConsentCurrent([$grant,$grant],$now),'ambiguous duplicate timestamp denies');
gtExpect(!goldenTalentAssessmentConsentCurrent([$grant,$withdrawal,$grant],$now),'unexpected number of decisions denies');
// Route/source contract checks guard against accidental client-authoritative or open access.
$source=file_get_contents(__DIR__.'/../api/golden-talent.php');
gtExpect(is_string($source)&&str_contains($source,"'/golden-talent/my-subjects' && \$verb==='GET'"),'only GET private listing');
gtExpect(str_contains($source,"r.verification_status='VERIFIED'"),'guardian must be verified');
gtExpect(str_contains($source,"s.guardian_account_id=?"),'guardian must match subject');
gtExpect(str_contains($source,"c.account_id=?"),'consent account is scoped');
gtExpect(str_contains($source,"n.purpose_code='ASSESSMENT'"),'consent purpose specific');
gtExpect(str_contains($source,"empty(\$account['email_verified_at'])"),'verified login required');
gtExpect(str_contains($source,"INSERT INTO eco_audit_events"),'append-only read audit');
gtExpect(str_contains($source,"if(!\$pdo->commit())"),'audit committed before disclosure');
gtExpect(str_contains($source,"'availableActions'=>[]"),'no unintended report or module grants');
gtExpect(!str_contains($source,'INSERT INTO eco_talent_'),'no writes to learner evidence');
gtExpect(str_contains($source,"'/golden-talent/my-bahar-overview' && \$verb==='GET'"),'BAHAR overview GET required');
gtExpect(str_contains($source,"n.purpose_code='PARENT_VISIBILITY'"),'Separate guardian visibility consent required');
gtExpect(str_contains($source,"goldenTalentGuardianBaharOverview(\$pdo,\$accountId)"),'BAHAR read remains account-bound');
gtExpect(str_contains($source,"goldenTalentAuditGuardianBaharOverview(\$pdo,\$accountId,count(\$items))"),'Audit required before BAHAR reply');
gtExpect(str_contains($source,"'rawEvidenceExposed'=>false"),'No private evidence disclosure');
gtExpect(str_contains($source,"'interpretationsExposed'=>false"),'No private interpretation disclosure');
gtExpect(str_contains($source,"'longitudinalTrendValidated'=>false"),'No unvalidated trajectory claim');
echo "Golden Talent guardian access: ".$checks." checks passed\n";
