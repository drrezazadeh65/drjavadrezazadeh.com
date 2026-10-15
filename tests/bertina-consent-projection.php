<?php
declare(strict_types=1);
require_once __DIR__.'/../platform/bertina-consent-projection.php';
$now=strtotime('2026-10-16 12:00:00 UTC');
$checks=0;
$check=static function(bool $condition,string $label) use (&$checks): void {
    $checks++;
    if (!$condition) { fwrite(STDERR,"FAIL: ".$label."\n"); exit(1); }
};
$grant=[
    'id'=>'a','purpose_code'=>'ASSESSMENT','decision'=>'GRANTED',
    'granted_at'=>'2026-10-15 10:00:00.100','withdrawn_at'=>null,
    'version_label'=>'v1','notice_sha256'=>str_repeat('a',64),
    'effective_at'=>'2026-10-01 00:00:00','retired_at'=>null
];
$revoke=['id'=>'b','purpose_code'=>'ASSESSMENT','decision'=>'WITHDRAWN',
    'granted_at'=>'2026-10-16 10:00:00','withdrawn_at'=>null];
$regrant=array_replace($grant,['id'=>'c','granted_at'=>'2026-10-16 11:30:00']);
$allows=static fn(array $history,string $purpose='ASSESSMENT'): bool =>
    bertinaCurrentConsent($history,$purpose,$now)['allowed'] === true;
$check($allows([$grant]),'active grant');
$check(!$allows([]),'empty history');
$check(!$allows([$grant,$revoke]),'later withdrawal');
$check($allows([$grant,$revoke,$regrant]),'later regrant');
$check(!$allows([$grant,array_replace($grant,['id'=>'d'])]),'identical timestamp tie');
$check(!$allows([array_replace($grant,['retired_at'=>'2026-10-15 00:00:00'])]),'retired notice');
$check(!$allows([array_replace($grant,['granted_at'=>'2026-10-17 00:00:00'])]),'future decision');
$check(!$allows([array_replace($grant,['purpose_code'=>'PARENT_VISIBILITY'])]),'wrong purpose');
$check(!$allows([array_replace($grant,['withdrawn_at'=>'2026-10-15 11:00:00'])]),'updated withdrawn_at');
$check(!$allows([array_replace($grant,['granted_at'=>'2026-02-30 10:00:00.100'])]),'invalid calendar date');
$check(!$allows([array_replace($grant,['effective_at'=>'2026-02-30 10:00:00'])]),'invalid notice calendar date');
foreach (['2026-10-15 10:00:00.1','2026-10-15 10:00:00.12','2026-10-15 10:00:00.123'] as $value)
    $check($allows([array_replace($grant,['granted_at'=>$value])]),'fractional second '.$value);
$check(!$allows([array_replace($grant,['granted_at'=>'2026-10-15 10:00:00.1234'])]),'unsupported fractional digits');
$check(!$allows([array_replace($grant,['withdrawn_at'=>'2026-10-17 00:00:00'])]),'future withdrawal denies');
$check($allows([array_replace($grant,['withdrawn_at'=>'2026-10-15 11:00:00']),$regrant]),'grant restored after mutation-revoke');
$check(!$allows([$regrant,array_replace($grant,['withdrawn_at'=>'2026-10-16 11:45:00'])]),'late mutation-revoke cancels new grant');
$check(!$allows([array_replace($grant,['withdrawn_at'=>'2026-10-15 09:00:00'])]),'withdraw before grant invalid');
$check(!$allows([array_replace($grant,['notice_sha256'=>'unverified'])]),'notice hash missing');
$check(!$allows([array_replace($grant,['version_label'=>''])]),'version not verified');
$check(!$allows([array_replace($grant,['effective_at'=>'2026-10-16 11:00:00'])]),'notice not effective at grant');
$check(!$allows([array_replace($grant,['decision'=>'DENIED'])]),'denied');
$check(!$allows([array_replace($revoke,['withdrawn_at'=>'2026-10-16 11:00:00'])]),'conflicting withdrawal fields');
$check(!$allows([$grant,array_replace($grant,['id'=>'a','granted_at'=>'2026-10-16 11:00:00'])]),'duplicate id');
$check(!$allows([array_replace($grant,['retired_at'=>'not-a-time'])]),'invalid retirement date');
$parent=array_replace($grant,['purpose_code'=>'PARENT_VISIBILITY']);
$check($allows([$parent],'PARENT_VISIBILITY'),'separate parent visibility grant');
$check(!$allows([$parent],'ASSESSMENT'),'parent grant not assessment grant');
$check(bertinaCurrentConsent([$grant],'UNKNOWN',$now)['allowed']===false,'unknown purpose');
echo "Bertina isolated consent projection: ".$checks." checks passed\n";
