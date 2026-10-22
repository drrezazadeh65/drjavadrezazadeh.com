<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Protected read-only source-derived page quality scores. Scores are from
 * committed static HTML, not production crawling, GSC, GA4, Core Web Vitals,
 * user studies, Google ranking, actual AI citations or HTTP header probes.
 * Never expose the private JSON as a static public path.
 */
function operationsQualityInventory(): ?array {
    $path=__DIR__.'/internal/operations-page-quality.json';
    $bytes=@file_get_contents($path);
    if(!is_string($bytes)||strlen($bytes)<20||strlen($bytes)>16777216)return null;
    $data=json_decode($bytes,true);
    if(!is_array($data)||($data['schema']??'')!=='operations-page-quality-inventory-v1'
       ||!is_array($data['pages']??null)||count($data['pages'])>15000)return null;
    return $data;
}
/**
 * Retain real dated provider evidence when it exists. The existing bounded
 * PageSpeed reader covers only two explicit public URLs and validates its
 * provenance; do not extrapolate to other pages or real-user CrUX data.
 */
function operationsQualityWithLab(array $row): array {
    static $observations=null;
    if($observations===null){
        $observations=[];
        if(function_exists('operationsFreePerformanceObservation')){
            $data=operationsFreePerformanceObservation();
            if(($data['status']??'')==='observed'){
                foreach($data['results']??[] as $result) {
                    $url=(string)($result['url']??'');
                    $score=$result['labPerformanceScore']??null;
                    if(($result['status']??'')==='observed'&&is_int($score)
                       &&$score>=0&&$score<=100)
                        $observations[$url]=['score'=>$score,'observedAt'=>$data['observedAt']];
                }
            }
        }
    }
    $result=$observations[$row['url']??'']??null;
    if($result!==null){
        $row['grades']['speed']=[
            'score'=>round($result['score']/10,1),
            'passed'=>0,'applicable'=>0,
            'source'=>'dated_mobile_lighthouse_lab_not_field_cwv',
            'observedAt'=>$result['observedAt'],'findings'=>[]
        ];
        $row['labSpeed']=['score100'=>$result['score'],
            'source'=>'Google PageSpeed Insights mobile Lighthouse lab',
            'observedAt'=>$result['observedAt'],'notRealUserFieldData'=>true];
    }
    return $row;
}
function operationsQualityDimensions(): array {
    return ['content','image','seo','ui','ux','ai','geo','speed','security'];
}
/** Source-only summary shown immediately to a verified administrator. */
function operationsQualitySummary(): array {
    $inventory=operationsQualityInventory();
    if($inventory===null)return ['status'=>'unavailable','pages'=>null,
        'weakSeoPages'=>null,'generatedAt'=>null,
        'limitation'=>'No source-derived page inventory is deployed.'];
    $count=0;$weak=0;$totals=[];$numbers=[];
    foreach(operationsQualityDimensions() as $dimension){$totals[$dimension]=0.0;$numbers[$dimension]=0;}
    foreach($inventory['pages'] as $row){
        if(!is_array($row))continue;$count++;
        foreach(operationsQualityDimensions() as $dimension) {
            $value=$row['grades'][$dimension]['score']??null;
            if(!is_numeric($value))continue;
            $totals[$dimension]+=(float)$value;$numbers[$dimension]++;
        }
        $seo=$row['grades']['seo']['score']??null;
        if(is_numeric($seo)&&(float)$seo<6)$weak++;
    }
    $averages=[];
    foreach(operationsQualityDimensions() as $dimension)
        $averages[$dimension]=$numbers[$dimension]>0
            ?round($totals[$dimension]/$numbers[$dimension],1):null;
    return ['status'=>'source_only','pages'=>$count,'weakSeoPages'=>$weak,
        'generatedAt'=>$inventory['generatedAt']??null,
        'averages'=>$averages,'measuredPagesByDimension'=>$numbers,
        'limitation'=>'Scores reflect static committed HTML heuristics; not deployed-page indexing, actual UX or lab/field speed.'];
}
function operationsQualityList(array $input): array {
    $source=operationsQualityInventory();
    if($source===null)return ['ok'=>true,'schema'=>'operations-page-quality-results-v1',
        'status'=>'unavailable','records'=>[],'total'=>null,
        'limitation'=>'Source score inventory not generated or private projection missing.'];
    $dimension=(string)($input['dimension']??'seo');
    $language=(string)($input['language']??'all');
    $index=(string)($input['index']??'all');
    $sort=(string)($input['sort']??'weakest');
    $query=(string)($input['query']??'');
    $page=filter_var($input['page']??1,FILTER_VALIDATE_INT);
    if(!in_array($dimension,operationsQualityDimensions(),true)
       ||!in_array($language,['all','fa','en','other'],true)
       ||!in_array($index,['all','public','private'],true)
       ||!in_array($sort,['weakest','strongest','route'],true)
       ||$page===false||$page<1||$page>500||strlen($query)>120
       ||preg_match('/[\x00-\x1F\x7F]/',$query))
       throw new InvalidArgumentException('invalid_quality_filters');
    $pages=array_map('operationsQualityWithLab',$source['pages']);
    $rows=array_values(array_filter($pages,static function($row)use($language,$index,$query) {
        if(!is_array($row)||!is_string($row['route']??null))return false;
        $lang=(string)($row['language']??'other');
        $private=($row['noindexExpected']??false)===true
            ||($row['indexability']??'')==='noindex';
        if($language!=='all'&&($language==='other'?!in_array($lang,['fa','en'],true):$lang!==$language))return false;
        if($index==='public'&&$private)return false;
        if($index==='private'&&!$private)return false;
        return $query===''||(function_exists('mb_stripos')
            ?mb_stripos($row['route'],$query,0,'UTF-8')!==false
            :stripos($row['route'],$query)!==false);
    }));
    usort($rows,static function($a,$b)use($dimension,$sort) {
        if($sort==='route')return strcmp((string)$a['route'],(string)$b['route']);
        $x=$a['grades'][$dimension]['score']??null;
        $y=$b['grades'][$dimension]['score']??null;
        if(!is_numeric($x))$x=null;
        if(!is_numeric($y))$y=null;
        if($x===null&&$y!==null)return 1;
        if($y===null&&$x!==null)return -1;
        if($x===null&&$y===null)return strcmp((string)$a['route'],(string)$b['route']);
        $cmp=(float)$x<=>(float)$y;
        return ($sort==='strongest'?-$cmp:$cmp)?:strcmp((string)$a['route'],(string)$b['route']);
    });
    $count=count($rows);$perPage=50;
    $window=array_slice($rows,($page-1)*$perPage,$perPage);
    $records=[];
    foreach($window as $row) {
        $grades=[];
        foreach(operationsQualityDimensions() as $key)
            $grades[$key]=$row['grades'][$key]['score']??null;
        $records[]=[
            'route'=>$row['route'],'url'=>$row['url']??null,
            'language'=>$row['language']??null,
            'indexability'=>$row['indexability']??null,
            'overallSourceReadiness'=>$row['overallSourceReadiness']??null,
            'grades'=>$grades,
            'speedSourceReadiness'=>$row['performanceReadiness']['score']??null,
            'findingsCount'=>array_sum(array_map(static fn($v)=>is_array($v)?count($v['findings']??[]):0,$row['grades']??[]))
        ];
    }
    $scored=array_values(array_filter($source['pages'],static fn($r)=>is_numeric($r['grades']['seo']['score']??null)));
    $weak=count(array_filter($scored,static fn($r)=>(float)$r['grades']['seo']['score']<6));
    return [
        'ok'=>true,'schema'=>'operations-page-quality-results-v1','status'=>'source_only',
        'source'=>$source['source'],'generatedAt'=>$source['generatedAt'],
        'total'=>$count,'pagesScanned'=>$source['total'],
        'weakSeoSourcePages'=>$weak,'page'=>$page,'perPage'=>$perPage,
        'pageCount'=>max(1,(int)ceil($count/$perPage)),
        'dimension'=>$dimension,'dimensions'=>operationsQualityDimensions(),
        'records'=>$records,
        'limitation'=>'Static-source grades are heuristics, NOT Google rankings or user experience testing. Only the two explicitly observed URLs can show a fresh Google PSI MOBILE LAB speed score; no field Core Web Vitals are inferred. Security response headers, real user speed, AI citations and ranking remain unmeasured. Null is not zero.'
    ];
}
function operationsQualityDetail(string $route): array {
    if(strlen($route)>500||!str_starts_with($route,'/')
       ||str_contains($route,'..')||str_contains($route,'\\')
       ||str_contains($route,'?')||str_contains($route,'#')
       ||preg_match('/[\x00-\x1F\x7F]/',$route))
       throw new InvalidArgumentException('invalid_route');
    $source=operationsQualityInventory();
    if($source===null)return ['ok'=>true,'status'=>'unavailable','record'=>null];
    foreach($source['pages'] as $row)
        if(is_array($row)&&($row['route']??null)===$route)
            return ['ok'=>true,'schema'=>'operations-page-quality-detail-v1',
                'generatedAt'=>$source['generatedAt'],'record'=>operationsQualityWithLab($row),
                'limitation'=>'Static HTML source checks only; not a live website or search-engine measurement.'];
    return ['ok'=>true,'schema'=>'operations-page-quality-detail-v1',
        'record'=>null,'status'=>'not_in_source_inventory'];
}
