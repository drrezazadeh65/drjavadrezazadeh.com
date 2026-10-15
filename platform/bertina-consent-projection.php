<?php
declare(strict_types=1);

/**
 * RESEARCH ONLY, NO ROUTE OR DATABASE ACCESS.
 *
 * Canonical Bertina eco_consent_records/eco_consent_notices read-model policy.
 * Input MUST be server-loaded COMPLETE history for exactly one account,
 * subject and purpose, with notice metadata joined by notice_id.
 * This pure function cannot establish completeness or authentication itself.
 */

/** Strict UTC MySQL DATETIME(3) parser; reject PHP's calendar-date rollover. */
function bertinaSqlUtcSeconds(mixed $value): ?float {
    if (!is_string($value) ||
        !preg_match('/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?$/D', $value, $matches))
        return null;
    $fraction = str_pad($matches[2] ?? '', 6, '0');
    $date = DateTimeImmutable::createFromFormat('!Y-m-d H:i:s.u',
        $matches[1].'.'.$fraction, new DateTimeZone('UTC'));
    if ($date === false || DateTimeImmutable::getLastErrors() !== false)
        return null;
    return (float)$date->format('U.u');
}

/**
 * Accept only an unambiguous current GRANT. Represent both standalone
 * WITHDRAWN decisions and a grant's withdrawn_at as revocation events.
 * Later valid re-grants can restore access; same-instant ties always deny.
 */
function bertinaCurrentConsent(array $rows, string $purpose, int|float $now): array {
    $deny = static fn(string $reason): array => ['allowed'=>false,'reason'=>$reason];
    if (!in_array($purpose, ['ASSESSMENT','PARENT_VISIBILITY'], true) || $now <= 0)
        return $deny('INVALID_PURPOSE_OR_CLOCK');
    if ($rows === []) return $deny('NO_DECISION');
    if (count($rows) > 1024) return $deny('HISTORY_TOO_LONG');
    $events = [];
    $ids = [];
    foreach ($rows as $row) {
        if (!is_array($row) || !is_string($row['id'] ?? null) ||
            $row['id'] === '' || isset($ids[$row['id']]) ||
            ($row['purpose_code'] ?? null) !== $purpose)
            return $deny('MALFORMED_OR_DUPLICATE_EVENT');
        $ids[$row['id']] = true;
        $at = bertinaSqlUtcSeconds($row['granted_at'] ?? null);
        if ($at === null) return $deny('INVALID_EVENT_TIME');
        if ($at > $now) return $deny('FUTURE_DECISION');
        $decision = $row['decision'] ?? null;
        if (!in_array($decision, ['GRANTED','WITHDRAWN','DENIED'], true))
            return $deny('UNKNOWN_DECISION');
        $events[] = ['time'=>$at,'decision'=>$decision,'row'=>$row];
        if (($row['withdrawn_at'] ?? null) !== null) {
            // A revoked grant can be recorded as a mutation of the original
            // record even without a distinct WITHDRAWN row.
            $revokedAt = bertinaSqlUtcSeconds($row['withdrawn_at']);
            if ($revokedAt === null || $revokedAt < $at)
                return $deny('INVALID_WITHDRAWAL_TIME');
            if ($revokedAt > $now) return $deny('FUTURE_WITHDRAWAL');
            if ($decision === 'GRANTED') {
                $events[] = ['time'=>$revokedAt,'decision'=>'WITHDRAWN','row'=>null];
            } elseif ($decision !== 'WITHDRAWN' || $revokedAt !== $at) {
                // Explicit withdrawal recorded with the SAME timestamp is a
                // single revocation event, not a duplicate event or an error.
                return $deny('CONFLICTING_WITHDRAWAL');
            }
        }
    }
    usort($events, static fn(array $a,array $b): int => $b['time'] <=> $a['time']);
    if (count($events) > 1 && $events[0]['time'] === $events[1]['time'])
        return $deny('AMBIGUOUS_LATEST_DECISION');
    $latest = $events[0];
    if ($latest['decision'] !== 'GRANTED')
        return $deny('CONSENT_NOT_GRANTED');
    $grant = $latest['row'];
    if (!is_string($grant['version_label'] ?? null) || trim($grant['version_label']) === '' ||
        !is_string($grant['notice_sha256'] ?? null) ||
        !preg_match('/^[a-f0-9]{64}$/D', $grant['notice_sha256']))
        return $deny('NOTICE_IDENTITY_MISSING');
    $effective = bertinaSqlUtcSeconds($grant['effective_at'] ?? null);
    if ($effective === null) return $deny('INVALID_NOTICE_TIME');
    if ($effective > $now || $effective > $latest['time'])
        return $deny('NOTICE_NOT_EFFECTIVE');
    if (($grant['retired_at'] ?? null) !== null) {
        $retired = bertinaSqlUtcSeconds($grant['retired_at']);
        if ($retired === null) return $deny('INVALID_NOTICE_TIME');
        if ($retired <= $now) return $deny('NOTICE_RETIRED');
    }
    return ['allowed'=>true,'reason'=>'CURRENT_CONSENT',
        'noticeVersion'=>$grant['version_label'],
        'noticeSha256'=>$grant['notice_sha256']];
}
