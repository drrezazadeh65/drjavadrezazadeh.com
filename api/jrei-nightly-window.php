<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
function jrJreiIranNightOpen(int $timestamp): bool {
    $d=(new DateTimeImmutable('@'.$timestamp))->setTimezone(new DateTimeZone('Asia/Tehran'));
    $clock=(int)$d->format('Hi');
    return $clock>=200&&$clock<500;
}
