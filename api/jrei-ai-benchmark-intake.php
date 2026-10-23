<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-ai-governed-benchmarks.php';

/**
 * Deterministic, bounded independent benchmark CASE DISCOVERY from the
 * original vetted PUBLIC site index. Generates DRAFTS, not quality scores.
 *
 * No model calls, network access, source downloads, user data or payment.
 * A real HUMAN must inspect each public evidence snapshot before approval.
 */
function jrAiDiscoverPublicBenchmarkDrafts(PDO $pdo,array $cfg): array {
    $out=[
      'schema'=>'jr.jrei.benchmark-intake.v1',
      'state'=>'OFF','draftsAdded'=>0,
      'approvedByAutomation'=>false,'paidModelCalls'=>0,
      'scientificValidityProven'=>false
    ];
    if(($cfg['jrei_ai_benchmark_discovery_enabled']??false)!==true||
       !jrAiBenchmarkSchemaReady($pdo))return $out;
    $file=jrAiPublicIndexPath();
    if(!is_file($file)||!is_readable($file)||filesize($file)>1000000)
        return [...$out,'state'=>'INDEX_NOT_ACCEPTED'];
    $raw=file_get_contents($file);
    if(!is_string($raw)||strlen($raw)>1000000)
        return [...$out,'state'=>'INDEX_UNAVAILABLE'];
    try{$rows=json_decode($raw,true,24,JSON_THROW_ON_ERROR);}
    catch(Throwable $e){return [...$out,'state'=>'INDEX_INVALID'];}
    if(!is_array($rows)||!array_is_list($rows)||count($rows)>2200)
        return [...$out,'state'=>'INDEX_NOT_BOUNDED'];
    $seen=[];$proposals=[];
    foreach($rows as $row){
        if(count($proposals)>=12)break;
        if(!is_array($row)||!in_array($row['lang']??null,['fa','en'],true))
            continue;
        $lang=$row['lang'];$path=$row['path']??null;
        $title=$row['title']??null;$summary=$row['summary']??null;
        if(!is_string($path)||!is_string($title)||!is_string($summary)||
           strlen($title)<7||strlen($title)>160||
           strlen($summary)<25||strlen($summary)>700||
           jrAiPublicTextSensitive($title.' '.$summary)||
           !preg_match('~^(?:fa|en)/[a-zA-Z0-9/_-]{1,170}$~D',$path)||
           !str_starts_with($path,$lang.'/')||
           str_contains($path,'..')||
           preg_match('~(?:^|/)(?:account|app|dashboard|checkout|payment|login|register|admin|assessments|my)(?:/|$)~i',$path))
            continue;
        $question=$lang==='fa'?
           'طبق صفحهٔ عمومی «'.$title.'»، این بخش چه راهنمایی‌هایی ارائه می‌کند و چه محدودیت‌هایی دارد؟':
           'What publicly documented guidance and limitations does the page "'.
              $title.'" offer? Cite the corresponding website source.';
        if(strlen($question)>1000||jrAiPublicTextSensitive($question))
            continue;
        $sources=jrAiPublicEvidence($question,$lang);
        if(!$sources)continue;
        // Only draft a benchmark whose PRIMARY public source is indeed
        // the page from which this question was generated.
        if(($sources[0]['url']??null)!=='/'.$path)continue;
        $expected=['S1'];
        $sourceDigest=hash('sha256',json_encode($sources,
           JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
        $origin=hash('sha256','jr.jrei.benchmark-origin.v1|'.$lang.'|'.$path);
        if(isset($seen[$origin]))continue;
        $seen[$origin]=true;
        $id=uuidv4();
        $case=[
          'case_id'=>$id,'locale'=>$lang,
          'domain_code'=>'PUBLIC_SITE',
          'task_type'=>'PUBLIC_SOURCE_NAVIGATION',
          'question_text'=>$question,
          'source_evidence_sha256'=>$sourceDigest,
          'expected_source_ids_json'=>json_encode($expected,
             JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),
          'forbidden_claims_json'=>'[]',
          'reference_notes'=>null
        ];
        $case['benchmark_spec_sha256']=jrAiBenchmarkSpecDigest($case);
        $proposals[]=['case'=>$case,'origin'=>$origin];
    }
    if(!$proposals)return [...$out,'state'=>'NO_ELIGIBLE_PUBLIC_SOURCE'];
    $q=$pdo->prepare("INSERT IGNORE INTO jrei_ai_governed_benchmark_cases
       (case_id,locale,domain_code,task_type,question_text,
        source_evidence_sha256,benchmark_spec_sha256,
        expected_source_ids_json,forbidden_claims_json,reference_notes,
        case_state,author_account_id,generation_kind,
        origin_fingerprint_sha256,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,'DRAFT',NULL,
         'AUTOMATED_PUBLIC_INDEX',?,?,?)");
    $new=0;$now=time();
    foreach($proposals as $proposal){
        $c=$proposal['case'];
        $q->execute([
           $c['case_id'],$c['locale'],$c['domain_code'],
           $c['task_type'],$c['question_text'],
           $c['source_evidence_sha256'],$c['benchmark_spec_sha256'],
           $c['expected_source_ids_json'],$c['forbidden_claims_json'],
           $c['reference_notes'],$proposal['origin'],$now,$now
        ]);
        $new+=$q->rowCount();
    }
    return [...$out,'state'=>'DRAFTS_AWAIT_INDEPENDENT_OWNER_REVIEW',
      'draftsAdded'=>$new,'eligibleCandidateCount'=>count($proposals)];
}
