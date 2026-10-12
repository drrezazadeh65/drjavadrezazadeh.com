<?php
declare(strict_types=1);

function zipProbeAssert(bool $value, string $label): void
{
    if (!$value) {
        throw new RuntimeException('Zip runtime probe failed: ' . $label);
    }
    echo 'PASS ' . $label . "\n";
}

$fixtureRoot = sys_get_temp_dir() . '/bertina-zip-fixture-' . bin2hex(random_bytes(8));
if (!mkdir($fixtureRoot, 0700)) {
    throw new RuntimeException('zip_fixture_directory_failed');
}
$path = $fixtureRoot . '/generic-encrypted-fixture.zip';
$password = bin2hex(random_bytes(32));
$payload = json_encode(['fixture' => 'generic local roundtrip', 'items' => [1, 2, 3]], JSON_THROW_ON_ERROR);
try {
    zipProbeAssert(class_exists(ZipArchive::class), 'ZipArchive loaded');
    zipProbeAssert(ZipArchive::isEncryptionMethodSupported(ZipArchive::EM_AES_256, true), 'AES-256 encoding supported');
    zipProbeAssert(ZipArchive::isEncryptionMethodSupported(ZipArchive::EM_AES_256, false), 'AES-256 decoding supported');
    $archive = new ZipArchive();
    zipProbeAssert($archive->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true, 'archive created');
    zipProbeAssert($archive->addFromString('generic-fixture.json', $payload), 'fixture written');
    zipProbeAssert($archive->setEncryptionName('generic-fixture.json', ZipArchive::EM_AES_256, $password), 'AES-256 encryption configured');
    zipProbeAssert($archive->close(), 'encrypted archive closed');
    zipProbeAssert(chmod($path, 0600), 'archive private mode applied');
    $archive = new ZipArchive();
    zipProbeAssert($archive->open($path) === true, 'archive reopened');
    $details = $archive->statName('generic-fixture.json');
    zipProbeAssert(is_array($details) && ($details['encryption_method'] ?? null) === ZipArchive::EM_AES_256, 'stored method AES-256');
    zipProbeAssert(@$archive->getFromName('generic-fixture.json') === false, 'read without password denied');
    zipProbeAssert($archive->setPassword('generic-wrong-password'), 'wrong password supplied');
    zipProbeAssert(@$archive->getFromName('generic-fixture.json') === false, 'wrong password denied');
    zipProbeAssert($archive->setPassword($password), 'correct password supplied');
    $restored = $archive->getFromName('generic-fixture.json');
    zipProbeAssert(is_string($restored) && hash_equals(hash('sha256', $payload), hash('sha256', $restored)), 'encrypted roundtrip exact');
    zipProbeAssert($archive->close(), 'restored archive closed');
} finally {
    if (is_file($path)) {
        unlink($path);
    }
    if (is_dir($fixtureRoot)) {
        rmdir($fixtureRoot);
    }
}
zipProbeAssert(!is_file($path), 'generic fixture cleaned');
