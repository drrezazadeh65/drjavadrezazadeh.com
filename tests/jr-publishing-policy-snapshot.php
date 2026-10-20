<?php
declare(strict_types=1);
// Synthetic, offline values only. No gateway, SMTP, production SQL or users.
require_once __DIR__.'/../api/internal/jr-publishing-allocation-policy.php';
function pAssert(bool $ok,string $msg):void {if(!$ok)throw new RuntimeException($msg);}
$v2=['sku'=>'digital:tefl-ma-exams-1370-1405','kind'=>'digital',
 'quantity'=>1,'price'=>1000000,'subtotal'=>1000000,
 'authorShare'=>700000,'fundShare'=>300000,
 'allocationPolicy'=>JR_PUB_CURRENT_POLICY];
$policy=jrPubVerifiedAllocationSnapshot($v2);
pAssert($policy!==null&&$policy['id']==='mehrab-gross-70-30-v2'
 &&$policy['author']===700000&&$policy['fund']===300000,'new_sale_policy_invalid');
$old=$v2;unset($old['allocationPolicy']);
$old['authorShare']=600000;$old['fundShare']=400000;
$legacy=jrPubVerifiedAllocationSnapshot($old);
pAssert($legacy!==null&&$legacy['id']==='mehrab-gross-60-40-v1'
 &&$legacy['author']===600000&&$legacy['fund']===400000,'existing_pending_snapshot_not_preserved');
foreach([
 array_merge($v2,['allocationPolicy'=>'mehrab-gross-60-40-v1']),
 array_merge($v2,['allocationPolicy'=>null]),
 array_merge($v2,['fundShare'=>400000]),
 array_merge($v2,['authorShare'=>600000]),
 array_merge($v2,['quantity'=>2]),
 array_merge($v2,['kind'=>'book']),
 array_merge($v2,['subtotal'=>999999]),
 array_merge($old,['allocationPolicy'=>JR_PUB_CURRENT_POLICY]),
 array_merge($old,['allocationPolicy'=>'unknown']),
] as $invalid) {
 pAssert(jrPubVerifiedAllocationSnapshot($invalid)===null,'forged_or_mixed_finance_snapshot_accepted');
}
echo "JR Publishing allocation policies: owner v2, legacy v1, invalid snapshots PASS (synthetic).\n";
