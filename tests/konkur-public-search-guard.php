<?php
declare(strict_types=1);
require_once __DIR__ . '/../api/konkur-public-search-guard.php';

$cases = [
    ['', false, 'empty'],
    ['حقوق', false, 'programme name'],
    ['زبان‌ و ادبیات فارسی', false, 'legitimate ZWNJ'],
    ['01234', false, 'programme code with leading zero'],
    ['دانشگاه 1405', false, 'admission year'],
    ['0912 000 0000', true, 'spaced phone-like number'],
    ['۰۹۱۲-۰۰۰-۰۰۰۰', true, 'Persian numerals and hyphens'],
    ["٠٩١٢\u{200C}٠٠٠٠٠٠٠", true, 'Arabic numerals and ZWNJ'],
    ['００００００００００', true, 'fullwidth numerals'],
    ['test@example.invalid', true, 'email'],
    ['https://example.invalid', true, 'URL'],
    ['www.example.invalid', true, 'web domain'],
    ["حق\u{202E}وق", true, 'RTL override'],
    ["حق\u{2066}وق", true, 'bidi isolation'],
    ["\xff", true, 'invalid UTF-8'],
    ['رشته 1234 و کد 5678', false, 'separate numeric tokens with letters'],
];
foreach ($cases as [$input, $expected, $description]) {
    $actual = konkurPublicSearchUnsafe($input);
    if ($actual !== $expected) {
        fwrite(STDERR, "FAIL: {$description} expected " . (int)$expected . " got " . (int)$actual . "\n");
        exit(1);
    }
}
$apiPath = __DIR__ . '/../api/konkur-admission.php';
if (is_file($apiPath)) {
    $api = file_get_contents($apiPath);
    if (!is_string($api) ||
        !str_contains($api, "require_once __DIR__.'/konkur-public-search-guard.php';") ||
        !str_contains($api, 'konkurPublicSearchUnsafe($search)')) {
        fwrite(STDERR, "FAIL: PHP route does not enforce public search guard\n");
        exit(1);
    }
}
echo 'Public search privacy: ' . count($cases) . " synthetic PHP cases passed.\n";
