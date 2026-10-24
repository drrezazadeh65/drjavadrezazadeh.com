<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
function jrJreiIranNightOpen(int $timestamp): bool {
    $d=(new DateTimeImmutable('@'.$timestamp))->setTimezone(new DateTimeZone('Asia/Tehran'));
    $clock=(int)$d->format('Hi');
    return $clock>=200&&$clock<500;
}
// Partition quota reservations by the owner's Iran-local civil day, not UTC:
// UTC midnight falls in the middle of the 02:00–05:00 Iran acquisition window.
function jrJreiIranNightDate(int $timestamp): string {
    return (new DateTimeImmutable('@'.$timestamp))
        ->setTimezone(new DateTimeZone('Asia/Tehran'))->format('Y-m-d');
}
// A bounded network acquisition makes up to two sequential 20-second HTTP
// requests. Do not initiate work too close to 05:00 local time.
// 300 decimal GB is the maximum authorized allowance, never a target.
// The owner may choose a lower cap in the existing mother-DB controls.
function jrJreiIranNightTransferCap(int $configuredBytes): int {
    return max(0,min(300000000000,$configuredBytes));
}
function jrJreiIranNightAllowsRequest(int $timestamp): bool {
    if(!jrJreiIranNightOpen($timestamp))return false;
    $d=(new DateTimeImmutable('@'.$timestamp))->setTimezone(new DateTimeZone('Asia/Tehran'));
    return $timestamp<=$d->setTime(5,0,0)->getTimestamp()-120;
}

// Independently owner-enabled continuous mode, OFF by default. A worker
// still needs the existing private schedule/autofetch switches, mother-DB
// row opt-ins and independently reviewed source rights/robots/terms.
// The night mode remains the legacy default where continuous is not enabled.
function jrJreiKaAcquisitionWindowAllowed(array $cfg,int $timestamp,bool $newRequest=false): bool {
    if(($cfg['jrei_ka_continuous_enabled']??false)===true)return true;
    if(($cfg['jrei_ka_night_mode_enabled']??false)!==true)return false;
    return $newRequest?jrJreiIranNightAllowsRequest($timestamp):
        jrJreiIranNightOpen($timestamp);
}
// No artificial byte ceiling ONLY after both explicit owner opt-ins.
// Per-document, per-host, physical storage, original source review and
// independent operator kill switches remain compulsory safeguards.
function jrJreiKaUncappedDailyAuthorized(array $cfg): bool {
    return ($cfg['jrei_ka_continuous_enabled']??false)===true&&
        ($cfg['jrei_ka_uncapped_daily_enabled']??false)===true;
}
