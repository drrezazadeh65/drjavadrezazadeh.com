<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED') && PHP_SAPI!=='cli') {http_response_code(404);exit;}

/**
 * Commercial policy snapshots, integer Iranian TOMAN. Only the server-generated
 * commerce_orders.items_json is authoritative after BitPay bank verification.
 *
 * v1 is READ-ONLY compatibility for already created pending orders. Never offer
 * that rate to new buyers, backdate a purchase, or rewrite completed history.
 */
const JR_PUB_CURRENT_POLICY = 'mehrab-gross-70-30-v2';
const JR_PUB_LEGACY_POLICY = 'mehrab-gross-60-40-v1';
const JR_PUB_PRICE_TOMAN = 1000000;
const JR_PUB_AUTHOR_TOMAN = 700000;
const JR_PUB_TALENT_TOMAN = 300000;

function jrPubVerifiedAllocationSnapshot(array $line): ?array {
    if (($line['sku']??null)!=='digital:tefl-ma-exams-1370-1405'
        ||($line['kind']??null)!=='digital'
        ||($line['quantity']??null)!==1
        ||($line['price']??null)!==JR_PUB_PRICE_TOMAN
        ||($line['subtotal']??null)!==JR_PUB_PRICE_TOMAN
        ||!is_int($line['authorShare']??null)
        ||!is_int($line['fundShare']??null)
        ||$line['authorShare']+$line['fundShare']!==JR_PUB_PRICE_TOMAN)
        return null;
    $policy=$line['allocationPolicy']??null;
    if ($policy===JR_PUB_CURRENT_POLICY
        &&$line['authorShare']===JR_PUB_AUTHOR_TOMAN
        &&$line['fundShare']===JR_PUB_TALENT_TOMAN)
        return ['id'=>JR_PUB_CURRENT_POLICY,'author'=>JR_PUB_AUTHOR_TOMAN,'fund'=>JR_PUB_TALENT_TOMAN];
    // The original server-origin checkout did not include a policy ID.
    if ($policy===null
        &&$line['authorShare']===600000
        &&$line['fundShare']===400000)
        return ['id'=>JR_PUB_LEGACY_POLICY,'author'=>600000,'fund'=>400000];
    return null;
}
