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
function jrJreiIranNightAllowsRequest(int $timestamp): bool {
    if(!jrJreiIranNightOpen($timestamp))return false;
    $d=(new DateTimeImmutable('@'.$timestamp))->setTimezone(new DateTimeZone('Asia/Tehran'));
    return $timestamp<=$d->setTime(5,0,0)->getTimestamp()-120;
}
