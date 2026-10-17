<?php
declare(strict_types=1);

/**
 * JR Future Publishing — gross-sale allocation mathematics only.
 *
 * SECURITY: No endpoint, payment initiation, email dispatch, bank transfer or database mutation.
 * Values and contract basis points must come from a server-verified immutable paid order snapshot.
 * Direct web execution is forbidden; CLI unit tests may load the functions safely.
 * All values are integer TOMAN (IRT), never rials or floating-point monetary values.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED') && PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

/**
 * @return array{gross_toman:int,author_toman:int,talent_fund_toman:int}
 */
function jrPublishingGrossAllocation(int $grossToman, int $authorBps, int $fundBps): array {
    if ($grossToman < 1 || $authorBps < 0 || $fundBps < 0 ||
        $authorBps > 10000 || $fundBps > 10000 || $authorBps + $fundBps !== 10000) {
        throw new InvalidArgumentException('invalid_gross_allocation_contract');
    }
    // Safe for a positive 64-bit integer: no gross * 10000 overflow.
    $author = intdiv($grossToman, 10000) * $authorBps
            + intdiv(($grossToman % 10000) * $authorBps, 10000);
    // Deterministic sub-toman rounding remainder goes to the designated fund.
    $fund = $grossToman - $author;
    return ['gross_toman' => $grossToman, 'author_toman' => $author, 'talent_fund_toman' => $fund];
}

/**
 * Allocate the author subtotal across N signatories, 10000 basis points in total.
 * Array keys are stable author identifiers; allocation is lexicographically deterministic.
 * @param array<string,int> $authorWeights
 * @return array<string,int>
 */
function jrPublishingAuthorAllocation(int $authorSubtotalToman, array $authorWeights): array {
    if ($authorSubtotalToman < 0 || !$authorWeights || count($authorWeights) > 100) {
        throw new InvalidArgumentException('invalid_author_allocation');
    }
    $sum = 0;
    foreach ($authorWeights as $id => $bps) {
        if (!is_string($id) || trim($id) === '' || !is_int($bps) || $bps < 1 || $bps > 10000) {
            throw new InvalidArgumentException('invalid_author_weight');
        }
        $sum += $bps;
    }
    if ($sum !== 10000) throw new InvalidArgumentException('invalid_author_weight_sum');
    ksort($authorWeights, SORT_STRING);
    $total = 0; $result = []; $lastId = array_key_last($authorWeights);
    foreach ($authorWeights as $id => $bps) {
        $share = $id === $lastId
            ? $authorSubtotalToman - $total
            : intdiv($authorSubtotalToman, 10000) * $bps
              + intdiv(($authorSubtotalToman % 10000) * $bps, 10000);
        $result[$id] = $share;
        $total += $share;
    }
    if ($total !== $authorSubtotalToman) throw new LogicException('author_allocation_mismatch');
    return $result;
}

/**
 * Applies to an immutable sale event (+values) or complete refund reversal (-values).
 * No payment-state claims are made by this check.
 */
function jrPublishingAllocationBalances(int $grossDelta, int $authorDelta, int $fundDelta): bool {
    if ($grossDelta === 0 || $authorDelta === PHP_INT_MIN || $fundDelta === PHP_INT_MIN) return false;
    if (($grossDelta > 0 && ($authorDelta < 0 || $fundDelta < 0)) ||
        ($grossDelta < 0 && ($authorDelta > 0 || $fundDelta > 0))) return false;
    // Avoid overflow in authorDelta + fundDelta, even for malformed inputs.
    return ($grossDelta - $authorDelta) === $fundDelta;
}

/**
 * Read-only, server-side contractual accounting projection:
 * a 7% operating-cost reserve is NOT charged to the author or talent fund.
 * It requires an equal external platform funding commitment, separately
 * verified in the ledger. It is neither a VAT nor income-tax calculation.
 *
 * @return array{gross_toman:int,author_toman:int,talent_fund_toman:int,
 * operating_reserve_toman:int,platform_funding_required_toman:int,
 * total_cost_and_entitlements_toman:int,operating_reserve_bps:int}
 */
function jrPublishingGrossWithOperatingReserve(
    int $grossToman, int $authorBps, int $fundBps, int $reserveBps
): array {
    if ($reserveBps < 0 || $reserveBps > 10000)
        throw new InvalidArgumentException('invalid_operating_reserve_rate');
    $split = jrPublishingGrossAllocation($grossToman, $authorBps, $fundBps);
    $reserve = intdiv($grossToman, 10000) * $reserveBps
        + intdiv(($grossToman % 10000) * $reserveBps, 10000);
    if ($reserve > PHP_INT_MAX - $grossToman)
        throw new OverflowException('operating_reserve_total_overflow');
    return $split + [
        'operating_reserve_toman'=>$reserve,
        'platform_funding_required_toman'=>$reserve,
        'total_cost_and_entitlements_toman'=>$grossToman + $reserve,
        'operating_reserve_bps'=>$reserveBps
    ];
}
