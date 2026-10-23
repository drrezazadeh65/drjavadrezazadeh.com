<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/** Anonymous aggregate provider statistics; zero conversation retention. */
function jrAiTelemetrySchemaReady(PDO $pdo): bool {
    try{
        $pdo->query('SELECT date_utc,provider_code,model_code,
          completed_count,failed_count,latency_total_ms
          FROM jrei_ai_provider_telemetry_daily LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}
/**
 * Store one actual attempted API outcome, not a plan or a reservation.
 * Returns only recorded metadata; never prompt, response, IP or account.
 */
function jrAiRecordProviderOutcome(PDO $pdo,string $model,bool $success,
    int $durationMs,?int $inputTokens,?int $outputTokens): void {
    if(!preg_match('/^[a-zA-Z0-9._-]{3,90}$/D',$model)||
       $durationMs<0||$durationMs>300000||
       $inputTokens!==null&&($inputTokens<0||$inputTokens>1000000)||
       $outputTokens!==null&&($outputTokens<0||$outputTokens>1000000))
        throw new InvalidArgumentException('invalid_ai_provider_metric');
    $completed=$success?1:0;$failed=$success?0:1;
    $known=$success&&$inputTokens!==null&&$outputTokens!==null;
    $bucket=[
      (int)($durationMs<=500),(int)($durationMs>500&&$durationMs<=1500),
      (int)($durationMs>1500&&$durationMs<=5000),
      (int)($durationMs>5000&&$durationMs<=15000),
      (int)($durationMs>15000)
    ];
    // Only provider-reported tokens are additive usage; unknown usage
    // remains UNKNOWN, not zero. The conservative budget reservation is
    // accounted separately and must never be shown as actual dollars.
    $q=$pdo->prepare("INSERT INTO jrei_ai_provider_telemetry_daily
      (date_utc,provider_code,model_code,completed_count,failed_count,
       input_tokens_reported,output_tokens_reported,usage_unknown_count,
       latency_total_ms,latency_le_500_count,latency_le_1500_count,
       latency_le_5000_count,latency_le_15000_count,
       latency_gt_15000_count,last_completed_at,updated_at)
      VALUES (?,'OPENAI',?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
       completed_count=completed_count+VALUES(completed_count),
       failed_count=failed_count+VALUES(failed_count),
       input_tokens_reported=input_tokens_reported+VALUES(input_tokens_reported),
       output_tokens_reported=output_tokens_reported+VALUES(output_tokens_reported),
       usage_unknown_count=usage_unknown_count+VALUES(usage_unknown_count),
       latency_total_ms=latency_total_ms+VALUES(latency_total_ms),
       latency_le_500_count=latency_le_500_count+VALUES(latency_le_500_count),
       latency_le_1500_count=latency_le_1500_count+VALUES(latency_le_1500_count),
       latency_le_5000_count=latency_le_5000_count+VALUES(latency_le_5000_count),
       latency_le_15000_count=latency_le_15000_count+VALUES(latency_le_15000_count),
       latency_gt_15000_count=latency_gt_15000_count+VALUES(latency_gt_15000_count),
       last_completed_at=GREATEST(
         COALESCE(last_completed_at,0),COALESCE(VALUES(last_completed_at),0)),
       updated_at=VALUES(updated_at)");
    $now=time();
    $q->execute([
      gmdate('Y-m-d'),$model,$completed,$failed,
      $known?$inputTokens:0,$known?$outputTokens:0,
      $known?0:1,$durationMs,...$bucket,
      $success?$now:null,$now
    ]);
}

function jrAiOwnerObservedTelemetry(PDO $pdo,string $model): array {
    $out=[
      'schemaReady'=>jrAiTelemetrySchemaReady($pdo),
      'providerReportedCompleted'=>null,
      'providerReportedFailed'=>null,
      'providerReportedInputTokens'=>null,
      'providerReportedOutputTokens'=>null,
      'usageUnknownCount'=>null,
      'meanObservedLatencyMs'=>null,
      'latencyHistogram'=>null,
      'actualModelAccuracyVerified'=>false,
      'modelBillingTotalKnown'=>false
    ];
    if(!$out['schemaReady']||
       !preg_match('/^[a-zA-Z0-9._-]{3,90}$/D',$model))return $out;
    try{
        $q=$pdo->prepare("SELECT SUM(completed_count) AS good,
            SUM(failed_count) AS failed,
            SUM(input_tokens_reported) AS inp,
            SUM(output_tokens_reported) AS outp,
            SUM(usage_unknown_count) AS unknown_usage,
            SUM(latency_total_ms) AS latency,
            SUM(latency_le_500_count) AS b0,
            SUM(latency_le_1500_count) AS b1,
            SUM(latency_le_5000_count) AS b2,
            SUM(latency_le_15000_count) AS b3,
            SUM(latency_gt_15000_count) AS b4
           FROM jrei_ai_provider_telemetry_daily
           WHERE provider_code='OPENAI' AND model_code=?
           AND date_utc>=DATE_SUB(UTC_DATE(),INTERVAL 7 DAY)");
        $q->execute([$model]);$r=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($r))return $out;
        $complete=(int)($r['good']??0);$failed=(int)($r['failed']??0);
        $out['providerReportedCompleted']=$complete;
        $out['providerReportedFailed']=$failed;
        $out['providerReportedInputTokens']=(int)($r['inp']??0);
        $out['providerReportedOutputTokens']=(int)($r['outp']??0);
        $out['usageUnknownCount']=(int)($r['unknown_usage']??0);
        $out['meanObservedLatencyMs']=$complete+$failed>0?
           (int)round((int)$r['latency']/($complete+$failed)):null;
        $out['latencyHistogram']=[
          'upTo500Ms'=>(int)($r['b0']??0),
          'upTo1500Ms'=>(int)($r['b1']??0),
          'upTo5000Ms'=>(int)($r['b2']??0),
          'upTo15000Ms'=>(int)($r['b3']??0),
          'above15000Ms'=>(int)($r['b4']??0)
        ];
    }catch(Throwable $e){
        $out['schemaReady']=false;
        $out['providerReportedCompleted']=null;
        $out['providerReportedFailed']=null;
        $out['meanObservedLatencyMs']=null;
    }
    return $out;
}
