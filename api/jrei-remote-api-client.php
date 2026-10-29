<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/** Website-owned HTTP API CLIENT for independent JREI. No AI engine here. */

/**
 * PRIVATE integration adapter; not an API route and never auto-included.
 * Original PHP/MFA/mother-DB authority is unchanged.
 *
 * Config must be server-side only:
 *   jrei_python_internal_base_url = private HTTPS origin (or loopback for dev)
 *   jrei_python_hmac_key = distinct >=32-byte internal service secret
 *
 * Calling this adapter authenticates Bertina as a service, NOT an owner,
 * and only requests source-stage non-executing proposals.
 */
function jrJreiPythonInternalPropose(array $privateConfig, string $route, array $payload): array
{
    $allowed = [
        '/internal/v1/admin/ai-reports/snapshot',
        '/internal/v1/admin/ai-visibility/report',
        '/internal/v1/learning/prioritize',
        '/internal/v1/model/owner-draft',
        '/internal/v1/learning/heldout/review',
        '/internal/v1/exams/blueprint/review',
        '/internal/v1/news/official/editorial-preflight',
        '/internal/v1/learning/evidence-graph/review',
        '/internal/v1/knowledge/corrections/review',
        '/internal/v1/learning/answers/grounding-review',
        '/internal/v1/knowledge/retrieval/propose',
        '/internal/v1/knowledge/extraction/propose',
        '/internal/v1/learning/metacognitive/plan',
        '/internal/v1/learning/value-of-information/plan',
        '/internal/v1/learning/strategy/propose',
        '/internal/v1/learning/metacognitive/mission-bind',
        '/internal/v1/learning/metacognitive/method-feedback',
        '/internal/v1/learning/self-improvement/plan',
        '/internal/v1/learning/native-language/plan',
        '/internal/v1/model/portfolio/plan',
        '/internal/v1/orchestration/capacity/plan',
        '/internal/v1/skills/arithmetic/calculate',
        '/internal/v1/memory/owner/save',
        '/internal/v1/memory/owner/read',
        '/internal/v1/memory/owner/list',
        '/internal/v1/memory/owner/revoke',
        '/internal/v1/missions/propose',
        '/internal/v1/skills/catalog',
        '/internal/v1/skills/evidence/triage'
    ];
    if (!in_array($route, $allowed, true)) {
        throw new DomainException('JREI_PYTHON_ROUTE_DENIED');
    }
    $base = $privateConfig['jrei_python_internal_base_url'] ?? null;
    $key = $privateConfig['jrei_python_hmac_key'] ?? null;
    if (!is_string($base) || !is_string($key) || strlen($key) < 32) {
        throw new RuntimeException('JREI_PYTHON_PRIVATE_SERVICE_NOT_CONFIGURED');
    }
    $parts = parse_url($base);
    if ($parts === false || !isset($parts['scheme'], $parts['host']) ||
        isset($parts['user']) || isset($parts['pass']) ||
        isset($parts['query']) || isset($parts['fragment']) ||
        !in_array($parts['path'] ?? '', ['', '/'], true)) {
        throw new DomainException('JREI_PYTHON_PRIVATE_ORIGIN_INVALID');
    }
    $loopback = ($parts['host'] === '127.0.0.1');
    if ($parts['scheme'] !== 'https' &&
        !($loopback && $parts['scheme'] === 'http')) {
        throw new DomainException('JREI_PYTHON_TLS_REQUIRED');
    }
    if (!function_exists('curl_init')) {
        throw new RuntimeException('JREI_PYTHON_CURL_UNAVAILABLE');
    }
    $body = json_encode($payload, JSON_THROW_ON_ERROR |
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (strlen($body) > 65536) {
        throw new DomainException('JREI_PYTHON_REQUEST_TOO_LARGE');
    }
    $stamp = (string) time();
    $nonce = bin2hex(random_bytes(20));
    $signed = "POST\n{$route}\n{$stamp}\n{$nonce}\n{$body}";
    $signature = hash_hmac('sha256', $signed, $key);
    $curl = curl_init(rtrim($base, '/') . $route);
    if ($curl === false) {
        throw new RuntimeException('JREI_PYTHON_TRANSPORT_UNAVAILABLE');
    }
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'X-JREI-Service: bertina-owner-gateway',
            'X-JREI-Timestamp: ' . $stamp,
            'X-JREI-Nonce: ' . $nonce,
            'X-JREI-Signature: ' . $signature,
        ],
    ]);
    try {
        $response = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if (!is_string($response) || strlen($response) > 131072 ||
            $status !== 200) {
            throw new RuntimeException('JREI_PYTHON_PRIVATE_UPSTREAM_UNAVAILABLE');
        }
        $parsed = json_decode($response, true, 20, JSON_THROW_ON_ERROR);
        if (!is_array($parsed) ||
            !isset($parsed['schema_version']) ||
            !is_string($parsed['schema_version'])) {
            throw new RuntimeException('JREI_PYTHON_INVALID_CONTRACT');
        }
        return $parsed;
    } finally {
        curl_close($curl);
    }
}
