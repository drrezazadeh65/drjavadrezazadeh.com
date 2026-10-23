<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ai-cloud-provider.php';
require_once __DIR__.'/jrei-ai-provider-telemetry.php';

/**
 * Real-source model readiness for original MFA owner command centre.
 * NEVER output API key, HTTP headers, student messages, raw model content,
 * billing tokens or a fictional 'last inference' or cost measurement.
 */
function jrAiOwnerReadiness(PDO $pdo,array $cfg): array {
    $schema=jrAiBudgetSourceReady($pdo);
    $configured=jrAiCloudConfigured($cfg);
    $out=[
      'schema'=>'jr.jrei.owner-live-model-readiness.v1',
      'privateRuntimeOptIn'=>($cfg['jrei_live_ai_enabled']??false)===true,
      'separatePublicReleaseAccepted'=>($cfg['jrei_public_ai_release_accepted']??false)===true,
      'serverProviderConfigured'=>$configured,
      'approvedModelLabel'=>preg_match('/^[a-zA-Z0-9._-]{3,90}$/D',
           (string)($cfg['jrei_ai_openai_model']??''))===1?
           (string)$cfg['jrei_ai_openai_model']:null,
      'provider'=>'OPENAI_RESPONSES',
      'providerBudgetSchemaReady'=>$schema,
      'actualProviderInferenceProven'=>false,
      'modelQualityIndependentlyAccepted'=>false,
      'providerPricePerTokenVerified'=>false,
      'actualUsdSpend'=>null,'modelResponseP95LatencyMs'=>null,
      'localWindowsModelRunningVerified'=>false,
      'publicSourceIndexPresent'=>is_file(dirname(__DIR__).'/assets/search-index.json'),
      'modelRoutingActive'=>false,
      'sourceGroundedScientificAnswersVerified'=>false,
      'quotas'=>[
        'maxCallsPerDay'=>(int)($cfg['jrei_ai_daily_call_limit']??0),
        'inputTokenReservationCap'=>(int)($cfg['jrei_ai_daily_input_limit']??0),
        'outputTokenReservationCap'=>(int)($cfg['jrei_ai_daily_output_limit']??0)
      ],
      'reservedToday'=>null,
      'observedProviderOutcomes'=>jrAiOwnerObservedTelemetry($pdo,
        (string)($cfg['jrei_ai_openai_model']??'')),
      'realInferenceEvidenceAwaitingFinalQA'=>true,
      'readyForOwnerAcceptance'=>$configured&&$schema&&jrAiTelemetrySchemaReady($pdo),
      'publicApiRouteGateOpen'=>$configured&&$schema&&
          ($cfg['jrei_public_ai_release_accepted']??false)===true,
      'productionModelAccepted'=>false
    ];
    if(!$schema)return $out;
    try{
        $q=$pdo->prepare("SELECT reserved_calls,reserved_input_tokens,
           reserved_output_tokens FROM jrei_ai_daily_budget
           WHERE quota_date=? AND provider_code='OPENAI' LIMIT 1");
        $q->execute([gmdate('Y-m-d')]);
        $r=$q->fetch(PDO::FETCH_ASSOC);
        $out['reservedToday']=[
          'calls'=>$r?(int)$r['reserved_calls']:0,
          'inputTokens'=>$r?(int)$r['reserved_input_tokens']:0,
          'outputTokens'=>$r?(int)$r['reserved_output_tokens']:0,
          'countsAreConservativeReservationsNotPaidInvoices'=>true
        ];
    }catch(Throwable $e){
        $out['reservedToday']=null;
    }
    return $out;
}
