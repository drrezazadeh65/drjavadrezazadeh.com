<?php
declare(strict_types=1);
$root=dirname(__DIR__);
$wf=(string)file_get_contents($root.'/.github/workflows/bertina-usdt-schema-activation.yml');
$sql=(string)file_get_contents($root.'/docs/migrations/20261126_usdt_bsc_mother_commerce.sql');
foreach(["workflow_dispatch:","github.actor == 'drrezazadeh65'","group: bertina-production-deploy","cancel-in-progress: false","AUTHORIZE_USDT_AFTER_SIGNED_RESTORE","drjrRecoveryCheck(dirname(__DIR__)","verified_private_recovery_required","provider_and_credit_verified","jrUsdtSchemaReady(\$pdo)","paymentLiveVerified'=>false"] as $required)
    if(!str_contains($wf,$required))throw new RuntimeException('missing_activation_guard');
if(str_contains($wf,'  push:')||str_contains($wf,'  schedule:')||str_contains($wf,'curl -k'))throw new RuntimeException('unsafe_activation_workflow');
if(strpos($wf,'drjrRecoveryCheck(dirname(__DIR__)')>=strpos($wf,"require __DIR__.'/config.local.php'"))throw new RuntimeException('private_recovery_must_precede_config');
$ddl=array_values(array_filter(array_map('trim',explode(';',preg_replace('/^\s*--.*$/m','',$sql)))));
if(count($ddl)!==2)throw new RuntimeException('only_two_additive_tables');
foreach($ddl as $i=>$statement){
 $table=['commerce_usdt_quotes','commerce_usdt_authorized_offers'][$i];
 if(!str_starts_with($statement,'CREATE TABLE IF NOT EXISTS '.$table.' (')||
 preg_match('/\b(?:ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE)\s+(?:TABLE|INTO|FROM)\b/i',$statement))throw new RuntimeException('non_additive_migration');
}
echo "USDT activation authorization and additive DDL contract PASS; no host access.\n";
