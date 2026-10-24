<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/jrei-ka-safe-discovery.php';

/**
 * Format-neutral candidate discovery. This module is intentionally discovery
 * only: it never downloads, approves rights, creates jobs, or modifies the DB.
 * Existing PDF acquisition and source-policy gates remain authoritative.
 */
function jrKaDiscoverEducationalLinks(string $seedUrl, string $html): array {
    if ($html === '' || strlen($html) > 2097152 || !class_exists('DOMDocument')) return [];
    try { jrKaApprovedHttpsUrl($seedUrl); } catch (Throwable $e) { return []; }
    $dom = new DOMDocument();
    $previous = libxml_use_internal_errors(true);
    try {
        if (!$dom->loadHTML('<?xml encoding="UTF-8"?>'.$html, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING)) return [];
        $anchors = $dom->getElementsByTagName('a');
        if ($anchors->length > 4000) return [];
        $found = [];
        foreach ($anchors as $anchor) {
            if (count($found) >= 80) break;
            $href = trim((string)$anchor->getAttribute('href'));
            // Reuse the existing same-host HTTPS URL canonicalization and
            // reject unsafe or cross-origin links; no network access here.
            $parsedPath = parse_url($href, PHP_URL_PATH);
            if (!is_string($parsedPath)) continue;
            $extension = strtolower((string)pathinfo($parsedPath, PATHINFO_EXTENSION));
            if (!in_array($extension, ['pdf','doc','docx','txt','csv','xls','xlsx','ppt','pptx','odt','ods','odp','rtf','html','htm'], true)) continue;
            $url = jrKaResolveEducationalCandidate($seedUrl, $href);
            if ($url === null) continue;
            $label = trim((string)preg_replace('/\s+/u', ' ', (string)$anchor->textContent));
            if (function_exists('mb_strlen') && mb_strlen($label, 'UTF-8') > 120) {
                $label = mb_substr($label, 0, 120, 'UTF-8');
            } elseif (strlen($label) > 480) {
                $label = substr($label, 0, 480);
            }
            $key = hash('sha256', $url);
            $found[$key] ??= ['sha256'=>$key, 'url'=>$url, 'label'=>$label ?: 'Educational resource', 'format'=>$extension, 'state'=>'DISCOVERED_REQUIRES_RIGHTS_REVIEW'];
        }
        return array_values($found);
    } finally { libxml_clear_errors(); libxml_use_internal_errors($previous); }
}
function jrKaResolveEducationalCandidate(string $seedUrl, string $href): ?string {
    if ($href === '' || strlen($href) > 620 || preg_match('/[\x00-\x20\x7f\\\\]/', $href) || str_contains($href, '#') || str_starts_with($href, '//')) return null;
    try {
        [$host, $seedPath] = jrKaApprovedHttpsUrl($seedUrl);
        if (preg_match('~^[a-z][a-z0-9+.-]*:~i', $href)) {
            if (!str_starts_with($href, 'https://')) return null;
            $target = $href;
        } else {
            $base = explode('?', $seedPath, 2)[0];
            $dir = substr($base, 0, strrpos($base, '/') + 1);
            $path = str_starts_with($href, '/') ? $href : $dir.$href;
            [$raw, $query] = array_pad(explode('?', $path, 2), 2, null);
            $parts = [];
            foreach (explode('/', $raw) as $part) {
                if ($part === '' || $part === '.') continue;
                if ($part === '..') { if (!$parts) return null; array_pop($parts); continue; }
                if (preg_match('/%(?:2e|2f|5c|00)/i', $part)) return null;
                $parts[] = $part;
            }
            $target = 'https://'.$host.'/'.implode('/', $parts).($query !== null ? '?'.$query : '');
        }
        [$targetHost] = jrKaApprovedHttpsUrl($target);
        return $targetHost === $host ? $target : null;
    } catch (Throwable $e) { return null; }
}
