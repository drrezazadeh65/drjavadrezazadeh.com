<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ai-cloud-provider.php';

/**
 * Explicit, provider-neutral ROUTE CONTRACT. Only OpenAI Responses currently
 * implements synchronous public inference. The Windows node protocol permits
 * bounded public retrieval EVALUATION ONLY; it MUST NOT be represented as a
 * generative chat provider, or receive public/private user prompts.
 *
 * The read-only decision cannot start nodes, spend tokens or deploy.
 * The synchronous dispatch DOES invoke the existing paid cloud adapter and
 * must only be called after the original atomic daily quota reservation,
 * explicit visitor consent and independent public owner release gates.
 */
function jrAiPublicModelRoutingDecision(array $cfg): array {
    $configured=jrAiCloudConfigured($cfg);
    $accepted=($cfg['jrei_public_ai_release_accepted']??false)===true;
    return [
      'schema'=>'jr.jrei.public-model-route.v1',
      'route'=>$configured&&$accepted?'OPENAI_RESPONSES':'UNAVAILABLE',
      'providerCredentialConfigured'=>$configured,
      'publicOwnerReleaseAccepted'=>$accepted,
      'localWindowsGenerativeRouteSupported'=>false,
      'localWorkerTask'=>'REVIEWED_PUBLIC_RETRIEVAL_EVALUATION',
      'fallback'=>'EXISTING_STATIC_BROWSER_FALLBACK',
      'unsupervisedProviderFailoverEnabled'=>false,
      'independentSemanticAccuracyAccepted'=>false
    ];
}
/**
 * The narrow, real provider adapter remains interchangeable at this boundary.
 * No local-worker branch until signed, licensed, separately benchmarked,
 * genuinely generative inference exists and is approved for public use.
 */
function jrAiDispatchGovernedPublicInference(
    array $cfg,array $messages,string $instructions,int $maxOutputTokens
): array {
    $route=jrAiPublicModelRoutingDecision($cfg);
    if($route['route']!=='OPENAI_RESPONSES')
        throw new DomainException('public_model_route_not_authorized');
    $output=jrAiOpenAiResponses($cfg,$messages,$instructions,$maxOutputTokens);
    return [...$output,'providerRoute'=>'OPENAI_RESPONSES',
       'automaticProviderFallbackUsed'=>false,
       'localWindowsWorkerPromptsTransferred'=>false];
}
/**
 * Read-only evidence for the original MFA owner console.
 * A registered model or a signed heartbeat is NOT proof of executed inference.
 */
function jrAiProviderNeutralRoutingReadiness(PDO $pdo,array $cfg): array {
    $out=jrAiPublicModelRoutingDecision($cfg);
    $out['localRegistrySchemaReady']=false;
    $out['signedNodeSchemaReady']=false;
    $out['registeredLocalModelVersions']=null;
    $out['humanRightsReviewedLocalModels']=null;
    $out['locallyVerifiedRuntimeClaims']=null;
    $out['recentSignedWorkerHeartbeatCount']=null;
    $out['localInferenceIndependentlyProven']=false;
    $out['publicCloudInferenceIndependentlyProven']=false;
    try{
        $q=$pdo->query("SELECT COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN status='RIGHTS_REVIEWED'
              THEN 1 ELSE 0 END),0) AS rights_count,
            COALESCE(SUM(CASE WHEN weights_installed_verified=1
              AND runtime_verified=1 AND independent_quality_accepted=1
              THEN 1 ELSE 0 END),0) AS recorded_claims
            FROM jrei_local_model_registry");
        $row=$q->fetch(PDO::FETCH_ASSOC);
        $out['localRegistrySchemaReady']=true;
        $out['registeredLocalModelVersions']=(int)$row['total'];
        $out['humanRightsReviewedLocalModels']=(int)$row['rights_count'];
        $out['locallyVerifiedRuntimeClaims']=(int)$row['recorded_claims'];
    }catch(Throwable $e){}
    try{
        $q=$pdo->prepare("SELECT COUNT(*) FROM jrei_hybrid_nodes
          WHERE status='ENABLED' AND revoked_at IS NULL
            AND permitted_task='REVIEWED_PUBLIC_RETRIEVAL_EVALUATION'
            AND last_seen_at BETWEEN ? AND ?");
        $now=time();
        $q->execute([$now-90,$now]);
        $out['signedNodeSchemaReady']=true;
        $out['recentSignedWorkerHeartbeatCount']=(int)$q->fetchColumn();
    }catch(Throwable $e){}
    return $out;
}
