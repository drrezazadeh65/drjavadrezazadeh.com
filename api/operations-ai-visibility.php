<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Owner-only projection of the dated Ubersuggest AISV evidence snapshot.
 * The caller must pass the existing admin session, role, fresh MFA and rate
 * gate in operationsRoute(). No third-party request, persistence or guessing.
 */
function operationsAiVisibilityFromDocument(?array $data): array {
    $unavailable=['ok'=>true,'schema'=>'jr-owner-aisv-snapshot-v1',
        'status'=>'unavailable','retrievedOn'=>null,'source'=>null,
        'locale'=>'en','region'=>null,'fixedPromptCount'=>10,
        'sampledAnswers'=>null,'brandMentions'=>null,'brandPresencePercent'=>null,
        'prompts'=>[],'providers'=>[],
        'verifiedCitationCount'=>null,'verifiedCitationUrls'=>null,
        'limitation'=>'No valid source observation available; missing is not zero.'];
    if (!is_array($data) || ($data['schema']??null)!=='jr-aisv-evidence-v1'
        || ($data['brand']??null)!=='Dr Javad Rezazadeh Yazdeli'
        || ($data['scope']['locale']??null)!=='en'
        || ($data['scope']['region']??null)!=='United States'
        || !preg_match('/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/D',(string)($data['scope']['retrievedOn']??''))
        || !is_array($data['prompts']??null)||count($data['prompts'])!==10
        || !is_array($data['providers']??null)||count($data['providers'])!==3)
        return $unavailable;
    // Frozen query-to-public-page crosswalk: refuse arbitrary /en/ routes,
    // including real private account/checkout/admin directories that otherwise
    // match the generic locale URL pattern. No URL changes are introduced.
    $fixedPublicRoutes=[
        '/en/academic-profile/','/en/publications/','/en/golden-talent/',
        '/en/student-guidance/','/en/golden-talent/methodology/',
        '/en/golden-talent/','/en/golden-talent/methodology/',
        '/en/academic-services/','/en/teacher-education/','/en/research/'
    ];
    $rows=[];$sum=0;$mentions=0;
    foreach($data['prompts'] as $i=>$row){
        if(!is_array($row)||($row['ordinal']??null)!==$i+1
            || ($row['provider']??null)!=='openai'
            || !is_string($row['prompt']??null)||strlen($row['prompt'])<20||strlen($row['prompt'])>320
            || ($row['primaryPublicRoute']??null)!==$fixedPublicRoutes[$i]
            || !is_int($row['sampledAnswers']??null)
            || $row['sampledAnswers']<0||$row['sampledAnswers']>10000)
            return $unavailable;
        $n=$row['sampledAnswers'];$v=$row['brandMentions']??null;
        if(($n===0&&$v!==null)||($n>0&&(!is_int($v)||$v<0||$v>$n)))return $unavailable;
        $sum+=$n;if($v!==null)$mentions+=$v;
        $rows[]=['ordinal'=>$i+1,'prompt'=>$row['prompt'],
            'primaryPublicRoute'=>$row['primaryPublicRoute'],
            'routeVerified'=>'source_path_only',
            'contentCoverage'=>'needs_manual_scholarly_review',
            'sampledAnswers'=>$n,
            'brandMentions'=>$n>0?$v:null,
            'brandPresencePercent'=>$n>0?round(100*$v/$n,2):null,
            'brandRank'=>null,'verifiedCitationCount'=>null,
            'verifiedCitationUrls'=>null];
    }
    $providers=[];
    foreach(['openai','gemini','google_aio'] as $i=>$provider){
        $item=$data['providers'][$i];
        if(!is_array($item)||($item['provider']??null)!==$provider
            ||($item['websiteCitationCount']??null)!==null
            ||($item['websiteCitationUrls']??null)!==null)return $unavailable;
        if($provider==='openai'){
            if(($item['status']??null)!=='sampled'
                ||($item['sampledAnswers']??null)!==$sum
                ||($item['brandMentions']??null)!==$mentions)return $unavailable;
            $providers[]=['provider'=>$provider,'status'=>'sampled',
                'sampledAnswers'=>$sum,'brandMentions'=>$mentions,
                'brandPresencePercent'=>$sum>0?round(100*$mentions/$sum,2):null,
                'verifiedCitationCount'=>null,'verifiedCitationUrls'=>null];
        }else{
            if(($item['status']??null)!=='not_measured'
                ||($item['sampledAnswers']??null)!==null
                ||($item['brandMentions']??null)!==null
                ||($item['brandPresencePercent']??null)!==null)return $unavailable;
            $providers[]=['provider'=>$provider,'status'=>'not_measured',
                'sampledAnswers'=>null,'brandMentions'=>null,
                'brandPresencePercent'=>null,
                'verifiedCitationCount'=>null,'verifiedCitationUrls'=>null];
        }
    }
    return ['ok'=>true,'schema'=>'jr-owner-aisv-snapshot-v1',
        'status'=>'provider_report_snapshot',
        'source'=>'Ubersuggest AI Search Visibility (connected read-only project)',
        'retrievedOn'=>$data['scope']['retrievedOn'],
        'sampleWindow'=>$data['scope']['queryWindow']??null,
        'locale'=>'en','region'=>'United States',
        'fixedPromptCount'=>10,'sampledAnswers'=>$sum,
        'brandMentions'=>$sum>0?$mentions:null,
        'brandPresencePercent'=>$sum>0?round(100*$mentions/$sum,2):null,
        'verifiedCitationCount'=>null,'verifiedCitationUrls'=>null,
        'historicalImprovementEstablished'=>false,
        'prompts'=>$rows,'providers'=>$providers,
        'limitation'=>'Five provider-reported OpenAI samples are not comprehensive AI coverage. Unmeasured providers, website citations, raw responses, rankings and index state remain unknown. Read-only dated evidence, not live Ubersuggest polling.'];
}
function operationsAiVisibilitySnapshot(): array {
    // Owner-controlled cutover: JREI computes the report, not website PHP.
    // Until the central API has been accepted, the default remains the original
    // owner-gated compatibility snapshot; the switch is OFF by default.
    $settings=function_exists('cfg')?cfg():[];
    if (is_array($settings) && ($settings['jrei_ai_geo_report_api_enabled']??false)===true) {
        try {
            $source=@file_get_contents(__DIR__.'/internal/ai-search-visibility-baseline-20261020.json');
            if (!is_string($source) || strlen($source)>60000)
                throw new RuntimeException('jrei_geo_evidence_missing');
            $observation=json_decode($source,true,32,JSON_THROW_ON_ERROR);
            if (!is_array($observation))
                throw new RuntimeException('jrei_geo_evidence_invalid');
            require_once __DIR__.'/jrei-remote-api-client.php';
            $report=jrJreiPythonInternalPropose(
                $settings, '/internal/v1/admin/ai-visibility/report',
                ['observation'=>$observation]
            );
            if (($report['schema_version']??null)!=='jr.jrei.ai-visibility-report.v1' ||
                ($report['schema']??null)!=='jr-owner-aisv-snapshot-v1' ||
                ($report['ok']??false)!==true ||
                !in_array($report['status']??null,
                    ['unavailable','provider_report_snapshot'],true)) {
                throw new RuntimeException('jrei_geo_contract_invalid');
            }
            return $report;
        } catch (Throwable $error) {
            // NEVER silently return legacy locally computed AI numbers after
            // the independent API-only switch has been deliberately enabled.
            $missing=operationsAiVisibilityFromDocument(null);
            $missing['limitation']='Independent JREI GEO API unavailable; no legacy AI data fallback.';
            return $missing;
        }
    }
    $raw=@file_get_contents(__DIR__.'/internal/ai-search-visibility-baseline-20261020.json');
    if(!is_string($raw)||strlen($raw)>60000)
        return operationsAiVisibilityFromDocument(null);
    $data=json_decode($raw,true);
    return operationsAiVisibilityFromDocument(is_array($data)?$data:null);
}
