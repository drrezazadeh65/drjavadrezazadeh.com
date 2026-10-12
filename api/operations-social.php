<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Stage 13: privacy-preserving, read-only operational snapshot.
 * Only call this from operationsRoute AFTER account, role, session MFA checks.
 * A database row is not independent proof of a live provider connection.
 */
function operationsSocialSnapshot(PDO $pdo): array {
    $providers = [
        'instagram'=>['fa'=>'اینستاگرام','en'=>'Instagram','mode'=>'meta_oauth','capability'=>'pending_provider_authorization'],
        'facebook'=>['fa'=>'فیس‌بوک','en'=>'Facebook','mode'=>'meta_page_oauth','capability'=>'pending_provider_authorization'],
        'x'=>['fa'=>'ایکس','en'=>'X','mode'=>'user_oauth','capability'=>'pending_provider_authorization'],
        'telegram'=>['fa'=>'تلگرام','en'=>'Telegram','mode'=>'bot_api','capability'=>'source_adapter_only'],
        'eitaa'=>['fa'=>'ایتا','en'=>'Eitaa','mode'=>'eitaayar','capability'=>'source_adapter_only'],
        'aparat'=>['fa'=>'آپارات','en'=>'Aparat','mode'=>'manual','capability'=>'manual_fallback_only'],
        'whatsapp'=>['fa'=>'واتس‌اپ بیزینس','en'=>'WhatsApp Business','mode'=>'consent_and_template','capability'=>'restricted_opt_in_only'],
        'youtube'=>['fa'=>'یوتیوب','en'=>'YouTube','mode'=>'google_oauth','capability'=>'pending_provider_authorization']
    ];
    $counts=null;
    $summary=null;
    try {
        $counts=array_fill_keys(array_keys($providers),0);
        $stmt=$pdo->query("SELECT provider, COUNT(*) AS n FROM social_accounts WHERE status='verified' GROUP BY provider");
        foreach ($stmt->fetchAll() as $row) {
            $p=(string)$row['provider'];
            if (array_key_exists($p,$counts)) $counts[$p]=(int)$row['n'];
        }
    } catch (Throwable $e) { $counts=null; }

    try {
        $row=$pdo->query("SELECT COUNT(*) AS total,
            SUM(CASE WHEN status='confirmed' THEN 1 ELSE 0 END) AS confirmed,
            SUM(CASE WHEN status='uncertain' THEN 1 ELSE 0 END) AS uncertain,
            SUM(CASE WHEN status='manual_required' THEN 1 ELSE 0 END) AS manual_pending
            FROM social_deliveries")->fetch();
        if (is_array($row)) {
            $summary=[
                'total'=>(int)$row['total'],
                'confirmedRecords'=>(int)$row['confirmed'],
                'uncertain'=>(int)$row['uncertain'],
                'manualPending'=>(int)$row['manual_pending']
            ];
        }
    } catch (Throwable $e) { $summary=null; }
    $recentDeliveries=null;
    try {
        $rows=$pdo->query("SELECT id,provider,status,updated_at,schedule_utc,
            confirmed_at,provider_id,confirmation_method FROM social_deliveries
            ORDER BY updated_at DESC,id LIMIT 25")->fetchAll();
        $recentDeliveries=array_map(static function(array $row):array {
            return [
                'deliveryId'=>(string)$row['id'],
                'provider'=>(string)$row['provider'],
                'status'=>(string)$row['status'],
                'updatedAt'=>(int)$row['updated_at'],
                'scheduledAt'=>$row['schedule_utc']===null?null:(int)$row['schedule_utc'],
                'confirmedAt'=>$row['confirmed_at']===null?null:(int)$row['confirmed_at'],
                'providerId'=>$row['provider_id']===null?null:(string)$row['provider_id'],
                'confirmationMethod'=>$row['confirmation_method']===null?null:(string)$row['confirmation_method']
            ];
        },$rows);
    } catch(Throwable $e) { $recentDeliveries=null; }
    $recentMetrics=null;
    try {
        $rows=$pdo->query("SELECT delivery_id,source,observed_at,impressions,
            reach,engagements,clicks,conversions
            FROM social_metrics ORDER BY observed_at DESC,id DESC LIMIT 20")->fetchAll();
        $recentMetrics=array_map(static function(array $row):array {
            $mapped=[
                'deliveryId'=>(string)$row['delivery_id'],
                'source'=>(string)$row['source'],
                'observedAt'=>(int)$row['observed_at']
            ];
            foreach(['impressions','reach','engagements','clicks','conversions'] as $key) {
                $mapped[$key]=$row[$key]===null?null:(int)$row[$key];
            }
            return $mapped;
        },$rows);
    } catch(Throwable $e) { $recentMetrics=null; }
    return [
        'ok'=>true,
        'schema'=>'operations-social-readiness-v1',
        'checkedAt'=>time(),
        'accountsDataStatus'=>$counts===null?'schema_unavailable':'stored_records_only',
        'verifiedStatusAccountRows'=>$counts,
        'deliveryDataStatus'=>$summary===null?'schema_unavailable':'stored_records_only',
        'deliveryRows'=>$summary,
        'recentDeliveries'=>$recentDeliveries,
        'recentMetrics'=>$recentMetrics,
        'metricsSource'=>'social_metrics_stored_observations_only',
        'enabledForAutomaticPublication'=>null,
        'automationStatus'=>'runtime_not_verified',
        'channels'=>$providers,
        'limitations'=>[
            'Social-account records do not independently verify live provider credentials or publication scopes.',
            'Delivery status rows do not replace independent provider receipt verification.',
            'Missing database or analytics evidence is unknown, not zero.'
        ]
    ];
}
