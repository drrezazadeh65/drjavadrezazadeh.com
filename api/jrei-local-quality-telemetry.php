<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * JREI privacy-minimised operational feedback.
 *
 * A blocked model answer adds at most one daily coarse reason counter.
 * No user, account, request, prompt, generated text, node, IP or correlation
 * identifier is ever retained in this structure. These aggregate signals
 * MUST NOT be described as training or independent scientific evaluation.
 * Optional additive mother-DB schema; absence cannot re-enable unsafe output.
 */
function jrJreiLocalQualityTelemetryReady(PDO $pdo): bool {
    try{
        $pdo->query('SELECT day_utc,model_artifact_sha256,failure_category,
          rejected_count,first_seen_at,last_seen_at
          FROM jrei_local_chat_quality_daily LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}
function jrJreiLocalQualityRecord(PDO $pdo,string $modelDigest,
    string $reason,int $now): bool {
    if(!preg_match('/^[a-f0-9]{64}$/D',$modelDigest)||
       !in_array($reason,[
           'NEGATIVE_QUALITY_GATE','INCOMPLETE_OR_UNTRUSTED_DRAFT',
           'CJK_SCRIPT_INTRUSION','NUMERIC_MISMATCH',
           'FLAWED_PERSIAN_VALIDITY_DEFINITION',
           'UNVERIFIED_REFERENCE_ASSURANCE','EXPOSED_INTERNAL_THINKING',
           'TRUNCATED_COMPLETION','EMPTY_OR_OVERSIZED',
           'UNSOURCED_ADMISSION_GUARANTEE'
       ],true)||
       $now<=0||!jrJreiLocalQualityTelemetryReady($pdo))
        return false;
    try{
        $day=gmdate('Y-m-d',$now);
        $q=$pdo->prepare("INSERT INTO jrei_local_chat_quality_daily
          (day_utc,model_artifact_sha256,failure_category,
           rejected_count,first_seen_at,last_seen_at)
          VALUES (?,?,?,1,?,?)
          ON DUPLICATE KEY UPDATE
           rejected_count=IF(rejected_count<4294967295,
             rejected_count+1,rejected_count),
           last_seen_at=GREATEST(last_seen_at,VALUES(last_seen_at))");
        $q->execute([$day,$modelDigest,$reason,$now,$now]);
        return true;
    }catch(Throwable $e){return false;}
}
function jrJreiLocalQualityOwnerSnapshot(PDO $pdo): array {
    $out=['schema'=>'jr.jrei.aggregate-private-quality.v1',
      'availability'=>'MOTHER_DB_MIGRATION_REQUIRED',
      'lastSevenDays'=>[],'scientificValidationEstablished'=>false,
      'selfTrainingPerformed'=>false,'rawConversationsStored'=>false];
    if(!jrJreiLocalQualityTelemetryReady($pdo))return $out;
    try{
        $q=$pdo->query("SELECT model_artifact_sha256,failure_category,
          SUM(rejected_count) AS observed_rejections,
          MAX(last_seen_at) AS last_seen_at
          FROM jrei_local_chat_quality_daily
          WHERE day_utc>=DATE_SUB(UTC_DATE(),INTERVAL 6 DAY)
          GROUP BY model_artifact_sha256,failure_category
          ORDER BY observed_rejections DESC,model_artifact_sha256 ASC
          LIMIT 30");
        foreach($q as $row){
            $out['lastSevenDays'][]=[
              'modelArtifactSha256'=>(string)$row['model_artifact_sha256'],
              'category'=>(string)$row['failure_category'],
              'rejectedCount'=>(int)$row['observed_rejections'],
              'lastSeenAt'=>(int)$row['last_seen_at']
            ];
        }
        $out['availability']='MEASURED_AGGREGATE_ONLY';
    }catch(Throwable $e){$out['availability']='UNKNOWN_READ_FAILURE';}
    return $out;
}
