<?php
declare(strict_types=1);
require_once __DIR__.'/../platform/bertina-consent-projection.php';
$now=strtotime('2026-10-16 12:00:00 UTC');
$grant=['id'=>'a','purpose_code'=>'ASSESSMENT','decision'=>'GRANTED',
 'granted_at'=>'2026-10-15 10:00:00.100','withdrawn_at'=>null,
 'version_label'=>'v1','effective_at'=>'2026-10-01 00:00:00','retired_at'=>null];
$check=static function(bool $condition,string $label): void{
 if(!$condition){fwrite(STDERR,"FAIL: $label\n");exit(1);}
};
$check(bertinaCurrentConsent([$grant],'ASSESSMENT',$now)['allowed'],'grant');
$withdrawal=array_replace($grant,['id'=>'b','decision'=>'WITHDRAWN','granted_at'=>'2026-10-16 11:00:00.000']);
$check(!bertinaCurrentConsent([$grant,$withdrawal],'ASSESSMENT',$now)['allowed'],'withdrawal');
$regrant=array_replace($grant,['id'=>'c','granted_at'=>'2026-10-16 11:30:00.000']);
$check(bertinaCurrentConsent([$grant,$withdrawal,$regrant],'ASSESSMENT',$now)['allowed'],'regrant');
$check(!bertinaCurrentConsent([$grant,array_replace($grant,['id'=>'d'])],'ASSESSMENT',$now)['allowed'],'timestamp tie');
$check(!bertinaCurrentConsent([array_replace($grant,['retired_at'=>'2026-10-15 00:00:00'])],'ASSESSMENT',$now)['allowed'],'retired notice');
$check(!bertinaCurrentConsent([array_replace($grant,['granted_at'=>'2026-10-17 00:00:00'])],'ASSESSMENT',$now)['allowed'],'future event');
$check(!bertinaCurrentConsent([array_replace($grant,['purpose_code'=>'PARENT_VISIBILITY'])],'ASSESSMENT',$now)['allowed'],'purpose mismatch');
$check(!bertinaCurrentConsent([array_replace($grant,['withdrawn_at'=>'2026-10-15 11:00:00'])],'ASSESSMENT',$now)['allowed'],'withdrawn flag');
echo "Bertina isolated consent projection: 8 checks passed\n";
