<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ai-cloud-provider.php';
require_once __DIR__.'/jrei-ai-provider-telemetry.php';
require_once __DIR__.'/jrei-ai-reviewed-passages.php';
require_once __DIR__.'/jrei-ai-governed-benchmarks.php';
require_once __DIR__.'/jrei-ai-benchmark-expert-review.php';
require_once __DIR__.'/jrei-ai-improvement-owner.php';

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
      'approvedPassageRetrievalOptIn'=>($cfg['jrei_ai_approved_passage_retrieval_enabled']??false)===true,
      'approvedPassageSchemaReadable'=>function_exists('jrAiApprovedPassageSchemaReady')?
         jrAiApprovedPassageSchemaReady($pdo):false,
      'independentlyAttestedQuoteCounts'=>[
        'available'=>false,'eligibleCurrentSourceQuotes'=>null,
        'unverifiedPassagesNeverReleased'=>true
      ],
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
      'governedIndependentBenchmark'=>jrAiBenchmarkOwnerSnapshot($pdo,$cfg),
      'expertBenchmarkQueue'=>jrAiBenchmarkExpertQueue($pdo,$cfg),
      'evidenceImprovementOpportunities'=>jrAiImprovementOwnerSnapshot($pdo,$cfg),
      'readyForOwnerAcceptance'=>$configured&&$schema&&jrAiTelemetrySchemaReady($pdo),
      'publicApiRouteGateOpen'=>$configured&&$schema&&
          ($cfg['jrei_public_ai_release_accepted']??false)===true,
      'productionModelAccepted'=>false
    ];
    if(($out['approvedPassageSchemaReadable']??false)===true){
        try{
            $q=$pdo->query("SELECT COUNT(DISTINCT p.passage_id)
              FROM jrei_ka_private_passages p
              JOIN jrei_ka_public_quote_attestations att
                ON att.passage_id=p.passage_id
              JOIN jrei_exam_sources s ON s.source_id=p.source_id
              JOIN jrei_ka_source_policies pol ON pol.source_id=s.source_id
              WHERE p.passage_state='APPROVED_PUBLIC_AI_EVIDENCE'
                AND p.review_rights_state='PERMITTED_PUBLIC_QUOTE'
                AND att.decision='APPROVE_PUBLIC_QUOTE'
                AND att.reviewer_account_id=p.reviewer_account_id
                AND att.reviewer_account_id<>s.reviewer_account_id
                AND att.quoted_passage_sha256=p.passage_sha256
                AND att.reviewed_source_rights_sha256=pol.rights_evidence_sha256
                AND s.review_state='AUTHORITATIVE_REVIEWED'
                AND s.rights_state='PERMITTED_REPRODUCTION'
                AND s.is_revoked=0 AND s.is_superseded=0
                AND pol.scheduling_state='APPROVED'
                AND pol.rights_reviewed=1");
            $out['independentlyAttestedQuoteCounts']=[
              'available'=>true,'eligibleCurrentSourceQuotes'=>(int)$q->fetchColumn(),
              'unverifiedPassagesNeverReleased'=>true
            ];
        }catch(Throwable $e){}
    }
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
