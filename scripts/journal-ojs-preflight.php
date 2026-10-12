<?php
declare(strict_types=1);
/** CLI-only, read-only OJS preflight. No secrets or private paths in output. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$checks = [];
$add = static function(string $id, bool $pass, string $note) use (&$checks): void {
    $checks[] = ['id' => $id, 'pass' => $pass, 'note' => $note];
};
$add('php_version', version_compare(PHP_VERSION, '8.2.0', '>='), 'Candidate OJS 3.5 baseline; verify PKP release-specific requirements');
foreach (['pdo_mysql','mbstring','xml','intl','fileinfo','openssl','gd','zip'] as $ext) {
    $add('extension_'.$ext, extension_loaded($ext), 'Required candidate extension available');
}
$add('upload_enabled', filter_var(ini_get('file_uploads'), FILTER_VALIDATE_BOOL), 'File uploads enabled');
$limit = static function($x): int {
    $x = trim((string)$x);
    if (!preg_match('/^(\d+)([KMG]?)$/i', $x, $m)) return 0;
    return (int)$m[1] * (1024 ** [''=>0,'K'=>1,'M'=>2,'G'=>3][strtoupper($m[2])]);
};
$add('upload_limits', $limit(ini_get('upload_max_filesize')) >= 10485760 && $limit(ini_get('post_max_size')) >= 10485760, 'Upload and POST limits >= 10 MiB');
$add('https_environment', getenv('JR_PUBLIC_TLS_CONFIRMED') === 'true', 'Private TLS switch enabled; separately verify public CA chain');
$privateDir = (string)getenv('JHELA_OJS_PRIVATE_FILES_DIR');
$webroot = realpath((string)getenv('JHELA_PUBLIC_WEBROOT'));
$storage = $privateDir !== '' ? realpath($privateDir) : false;
$outside = $storage !== false && $webroot !== false && $storage !== $webroot && !str_starts_with($storage.'/', rtrim($webroot, '/').'/');
$add('private_storage', $outside && is_writable($storage), 'Writable private manuscript storage outside public webroot');
$add('verified_mail', getenv('JHELA_SMTP_DELIVERY_VERIFIED') === 'true', 'Recipient-confirmed real SMTP delivery');
$add('backup_restore', getenv('JHELA_BACKUP_RESTORE_VERIFIED') === 'true', 'Encrypted recovery tested');
$add('authorization_tests', getenv('JHELA_ROLE_SECURITY_TESTS_PASSED') === 'true', 'Private-file access and RBAC tests passed');
$add('ojs_installed', getenv('JHELA_OJS_INSTALL_VERIFIED') === 'true', 'Installed OJS independently verified');
$add('editorial_e2e', getenv('JHELA_EDITORIAL_E2E_PASSED') === 'true', 'Complete private sandbox editorial round trip verified');
$pass = !in_array(false, array_column($checks, 'pass'), true);
echo json_encode(['application'=>'JHELA','probe'=>'ojs_preflight_v1','ready_for_public_submission'=>$pass,'checks'=>$checks], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n";
exit($pass ? 0 : 2);
