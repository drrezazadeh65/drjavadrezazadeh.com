<?php
declare(strict_types=1);
require_once __DIR__.'/../api/smtp-body.php';

function verifyBody(string $input, string $expected, string $case): void {
    $got = bertinaNormalizeSmtpBody($input);
    if ($got !== $expected || str_contains($got, chr(13).chr(13).chr(10))) {
        throw new RuntimeException('Failed case: '.$case);
    }
    echo 'PASS: '.$case.PHP_EOL;
}
verifyBody("abc\r\ndef", "abc\r\ndef", 'existing CRLF');
verifyBody("abc\ndef", "abc\r\ndef", 'single LF');
verifyBody("abc\rdef", "abc\r\ndef", 'single CR');
verifyBody(".abc\r\n.def", "..abc\r\n..def", 'dot stuffing');
verifyBody("abc\r\n..def", "abc\r\n...def", 'multiple dots');
echo 'PASS: body framing'.PHP_EOL;
