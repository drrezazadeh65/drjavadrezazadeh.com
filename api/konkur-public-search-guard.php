<?php
declare(strict_types=1);

/**
 * Deny obvious personal identifiers in PUBLIC catalogue search URL parameters.
 * Defense-in-depth only: not a complete PII classifier, and HTTP access logs
 * may contain rejected URLs. Pure: no network, storage, or learner access.
 */
function konkurPublicSearchUnsafe(string $search): bool {
    if ($search === '') return false;
    if (preg_match('//u', $search) !== 1) return true;
    // Bidi controls can conceal identifiers in logs and reviewed citations.
    if (preg_match('/[\x{061C}\x{200E}\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}]/u', $search) === 1)
        return true;

    // Normalize for detection only; use the unchanged search with bound SQL.
    $normalised = $search;
    if (class_exists('Normalizer')) {
        $candidate = Normalizer::normalize($search, Normalizer::FORM_KC);
        if (!is_string($candidate)) return true;
        $normalised = $candidate;
    }
    foreach (['۰۱۲۳۴۵۶۷۸۹', '٠١٢٣٤٥٦٧٨٩', '０１２３４５６７８９'] as $digits) {
        $chars = preg_split('//u', $digits, -1, PREG_SPLIT_NO_EMPTY);
        if (!is_array($chars) || count($chars) !== 10) return true;
        $normalised = strtr($normalised, array_combine($chars, range(0, 9)));
    }
    if (preg_match('~(?:https?://|www\.|\S+@\S+)~iu', $normalised) === 1)
        return true;

    // Strip ordinary/invisible separators for digit screening; retain letters
    // so separate numeric tokens in unrelated descriptive words do not merge.
    $joined = preg_replace('/[^\p{L}\p{N}]/u', '', $normalised);
    return !is_string($joined) || preg_match('/[0-9]{9,}/u', $joined) === 1;
}
