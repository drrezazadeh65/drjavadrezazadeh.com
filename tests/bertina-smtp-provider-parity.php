<?php
declare(strict_types=1);
$source = (string) file_get_contents(__DIR__.'/../api/index.php');
$start = strpos($source, 'function smtpProviderSettingsMatch(');
$end = strpos($source, 'function mailReady(', $start === false ? 0 : $start);
if ($start === false || $end === false || $end <= $start) throw new RuntimeException('Provider check unavailable');
eval(substr($source, $start, $end - $start));
$approved = [
    'smtp_host' => 'drjavadrezazadeh.com',
    'smtp_port' => 465,
    'smtp_security' => 'ssl',
    'smtp_user' => 'admin@drjavadrezazadeh.com',
    'smtp_verify_peer' => true
];
function checkCase(array $cfg, bool $expected, string $label): void {
    if (smtpProviderSettingsMatch($cfg) !== $expected) throw new RuntimeException('Mismatch: '.$label);
    echo 'PASS '.$label.PHP_EOL;
}
checkCase($approved, true, 'provider SSL 465');
checkCase(array_replace($approved, ['smtp_port'=>587,'smtp_security'=>'tls']), true, 'provider STARTTLS 587');
checkCase(array_replace($approved, ['smtp_host'=>'mail.drjavadrezazadeh.com']), false, 'stale example SMTP hostname');
checkCase(array_replace($approved, ['smtp_port'=>587,'smtp_security'=>'ssl']), false, 'port and security mismatch');
checkCase(array_replace($approved, ['smtp_verify_peer'=>false]), false, 'TLS peer verification disabled');
checkCase(array_replace($approved, ['smtp_user'=>'another@example.test']), false, 'unexpected SMTP account');
