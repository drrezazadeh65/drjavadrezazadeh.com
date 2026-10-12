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
    return [
        'ok'=>true,
        'schema'=>'operations-social-readiness-v1',
        'checkedAt'=>time(),
        'accountsDataStatus'=>$counts===null?'schema_unavailable':'stored_records_only',
        'verifiedStatusAccountRows'=>$counts,
        'deliveryDataStatus'=>$summary===null?'schema_unavailable':'stored_records_only',
        'deliveryRows'=>$summary,
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
