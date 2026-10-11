<?php
declare(strict_types=1);

/** Normalize only the email body: headers are already CRLF-delimited. */
function bertinaNormalizeSmtpBody(string $body): string {
    $unix = str_replace(["\r\n", "\r"], "\n", $body);
    $wire = str_replace("\n", "\r\n", $unix);
    return preg_replace('/(?m)^\\./', '..', $wire);
}
