<?php
/**
 * Administrative resource inventory normalization.
 * Pure functions: no network calls, no writes, no tests or background jobs.
 */
declare(strict_types=1);

function adminResourceInventoryNormalize(array $registry): array
{
    $resources = $registry['resources'] ?? [];
    if (!is_array($resources)) {
        return ['total' => 0, 'connected' => 0, 'unverified' => 0, 'resources' => []];
    }
    $items = [];
    $connected = 0;
    foreach ($resources as $resource) {
        if (!is_array($resource)) {
            continue;
        }
        $id = (string)($resource['id'] ?? '');
        if ($id === '') {
            continue;
        }
        $verified = ($resource['external_connection'] ?? '') === 'VERIFIED'
            && ($resource['automated_data_in_use'] ?? false) === true;
        $connected += $verified ? 1 : 0;
        $items[] = [
            'id' => $id,
            'name' => (string)($resource['name'] ?? $id),
            'owner_engine' => (string)($resource['owner_engine'] ?? ''),
            'category' => (string)($resource['category'] ?? ''),
            'access_path' => (string)($resource['access_path'] ?? ''),
            'connection_status' => $verified ? 'CONNECTED' : 'UNVERIFIED',
            'live_metrics' => $verified ? 'PROVIDER_DEPENDENT' : 'UNAVAILABLE',
            'official_url' => (string)($resource['official_url'] ?? ''),
        ];
    }
    return [
        'total' => count($items),
        'connected' => $connected,
        'unverified' => count($items) - $connected,
        'resources' => $items,
    ];
}
