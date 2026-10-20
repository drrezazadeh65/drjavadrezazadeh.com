<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/operations-ai-visibility.php';
$data=json_decode((string)file_get_contents(__DIR__.'/../api/internal/ai-search-visibility-baseline-20261020.json'),true,512,JSON_THROW_ON_ERROR);
function insist(bool $yes,string $msg):void {if(!$yes)throw new RuntimeException($msg);}
$x=operationsAiVisibilitySnapshot();
insist($x['status']==='provider_report_snapshot','missing source');
insist(count($x['prompts'])===10&&$x['sampledAnswers']===5,'sample denominator mismatch');
insist($x['brandMentions']===0&&$x['brandPresencePercent']===0.0,'observed zero lost');
insist($x['verifiedCitationCount']===null,'invented citation count');
foreach($x['prompts'] as $i=>$p){
 insist($p['prompt']===$data['prompts'][$i]['prompt'],'fixed prompt text drift');
 insist($p['primaryPublicRoute']===$data['prompts'][$i]['primaryPublicRoute'],'route drift');
 insist($p['verifiedCitationUrls']===null,'false citation URL');
 insist($i<5 ? ($p['sampledAnswers']===1&&$p['brandPresencePercent']===0.0)
  : ($p['sampledAnswers']===0&&$p['brandMentions']===null&&$p['brandPresencePercent']===null),'zero vs N/A drift');
}
foreach(array_slice($x['providers'],1) as $p)insist($p['status']==='not_measured'&&$p['sampledAnswers']===null&&$p['brandPresencePercent']===null,'unmeasured provider');
$y=$data;$y['prompts'][5]['brandMentions']=0;
insist(operationsAiVisibilityFromDocument($y)['status']==='unavailable','false zero accepted');
$y=$data;$y['prompts'][0]['brandMentions']=2;
insist(operationsAiVisibilityFromDocument($y)['status']==='unavailable','oversampled mention accepted');
$y=$data;$y['prompts'][0]['primaryPublicRoute']='/fa/app/admin/';
insist(operationsAiVisibilityFromDocument($y)['status']==='unavailable','private route accepted');
$y=$data;$y['providers'][1]['sampledAnswers']=0;
insist(operationsAiVisibilityFromDocument($y)['status']==='unavailable','fake provider sample accepted');
insist(operationsAiVisibilityFromDocument(null)['brandPresencePercent']===null,'no source must be null');
$api=file_get_contents(__DIR__.'/../api/operations.php');
insist(str_contains($api,"if (\$path === '/admin/operations/ai-visibility' && \$verb === 'GET')"),'private route missing');
echo "AI search visibility provider baseline checks passed\n";
