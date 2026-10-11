<?php
declare(strict_types=1);
// Test the actual production resolver in isolation without private credentials.
$source = (string) file_get_contents(__DIR__.'/../api/index.php');
$start = strpos($source, 'function smtpResolvedConfig(');
$end = strpos($source, 'function mailReady(', $start === false ? 0 : $start);
if ($start === false || $end === false || $end <= $start) throw new RuntimeException('resolver_missing');
eval(substr($source, $start, $end - $start));
$private = [
 'smtp_enabled' => true,
 'smtp_host' => 'incorrect.local',
 'smtp_port' => 587,
 'smtp_security' => 'tls',
 'smtp_user' => 'wrong@example.test',
 'smtp_password' => 'private-test-password',
 'mail_from' => 'wrong@example.test',
 'smtp_verify_peer' => false,
 'commerce_enabled' => false
];
$effective = smtpResolvedConfig($private);
$expected = [
 'smtp_host' => 'drjavadrezazadeh.com',
 'smtp_port' => 465,
 'smtp_security' => 'ssl',
 'smtp_user' => 'admin@drjavadrezazadeh.com',
 'mail_from' => 'admin@drjavadrezazadeh.com',
 'smtp_verify_peer' => true
];
foreach ($expected as $key => $value) {
 if ($effective[$key] !== $value) throw new RuntimeException('provider_setting_mismatch: '.$key);
}
if ($effective['smtp_password'] !== $private['smtp_password']) throw new RuntimeException('password_not_preserved');
if ($effective['commerce_enabled'] !== $private['commerce_enabled']) throw new RuntimeException('unrelated_setting_changed');
$disabled = smtpResolvedConfig(array_replace($private, ['smtp_enabled'=>false]));
if ($disabled['smtp_enabled'] !== false || $disabled['smtp_host'] !== 'incorrect.local') {
 throw new RuntimeException('disabled_transport_must_remain_disabled');
}
if (($private['smtp_host'] ?? null) !== 'incorrect.local') throw new RuntimeException('original_config_was_mutated');
echo "PASS: safe non-secret provider override, private password preservation and disabled fail-closed\n";
