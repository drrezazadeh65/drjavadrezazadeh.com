<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Read-only, owner-MFA-only projection of a separately provisioned GSC aggregate.
 * Source claims inside JSON are NOT authentication or Google provenance proof.
 * This module never contacts Google, writes a file, or adds an endpoint itself.
 */
function operationsGscDirectEmpty(string $reason='not_configured'): array {
    return [
        'ok'=>true,'schema'=>'jr-owner-gsc-direct-v1','status'=>'unavailable',
        'reason'=>$reason,'property'=>'https://drjavadrezazadeh.com/',
        'source'=>null,'collectedAtUtc'=>null,'startDate'=>null,'endDate'=>null,
        'rowsObserved'=>null,
        'metrics'=>['clicks'=>null,'impressions'=>null,'ctr'=>null,'position'=>null],
        'sitemaps'=>null,'indexedUrls'=>null,'apiLiveNow'=>false,
        'provenanceAttested'=>false,'dataFresh'=>false,
        'limitation'=>'No trusted server-side direct-GSC observation has been ingested. Missing is not zero. Connectivity CI is not a live SEO report.'
    ];
}

function operationsGscDirectDate(string $value): ?DateTimeImmutable {
    if (!preg_match('/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/D',$value))return null;
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',$value,new DateTimeZone('UTC'));
    return $date!==false&&$date->format('Y-m-d')===$value?$date:null;
}

function operationsGscDirectFromDocument(?array $data,int $at): array {
    $empty=operationsGscDirectEmpty('invalid_or_unattested');
    if (!is_array($data))return $empty;
    $keys=['schema','source','property','collectedAtUtc','startDate','endDate','rows'];
    $actual=array_keys($data);sort($actual);sort($keys);
    if ($actual!==$keys
        || ($data['schema']??null)!=='jr-gsc-direct-observation-v1'
        || ($data['source']??null)!=='google-search-console-api-direct'
        || ($data['property']??null)!=='https://drjavadrezazadeh.com/')
        return $empty;
    $stamp=$data['collectedAtUtc']??null;
    if (!is_string($stamp)
        || !preg_match('/^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,6})?Z$/D',$stamp))
        return $empty;
    $checked=strtotime($stamp);
    if ($checked===false||gmdate('Y-m-d\TH:i:s',$checked)!==substr($stamp,0,19)
        || $checked>$at+300||$checked<$at-259200)return $empty;
    if (!is_string($data['startDate']??null)||!is_string($data['endDate']??null))return $empty;
    $start=operationsGscDirectDate($data['startDate']);
    $end=operationsGscDirectDate($data['endDate']);
    if (!$start||!$end||$end<$start
        || $end->getTimestamp()-$start->getTimestamp()>92*86400
        || $end->getTimestamp()>$at)return $empty;
    $rows=$data['rows']??null;
    // Schema v1 has no dimensions. More than one row is ambiguous, NOT summable.
    if (!is_array($rows)||!array_is_list($rows)||count($rows)>1)return $empty;
    $metrics=['clicks'=>null,'impressions'=>null,'ctr'=>null,'position'=>null];
    if (count($rows)===1) {
        $row=$rows[0];if (!is_array($row))return $empty;
        $fields=array_keys($row);sort($fields);
        if ($fields!==['clicks','ctr','impressions','position'])return $empty;
        foreach ($metrics as $key=>$_) {
            $value=$row[$key];
            if ((!is_int($value)&&!is_float($value))||!is_finite((float)$value)
                || $value<0||$value>($key==='ctr'?1:1000000000))
                return $empty;
            if ($key==='position'&&$value<1)return $empty;
            $metrics[$key]=$value;
        }
    }
    return [
        'ok'=>true,'schema'=>'jr-owner-gsc-direct-v1',
        'status'=>count($rows)===1?'locally_validated_unattested':'no_rows_unattested',
        'reason'=>null,'property'=>'https://drjavadrezazadeh.com/',
        'source'=>'Private locally supplied Google Search Console API aggregate (not independently attested)',
        'collectedAtUtc'=>$stamp,'startDate'=>$data['startDate'],
        'endDate'=>$data['endDate'],'rowsObserved'=>count($rows),
        'metrics'=>$metrics,'sitemaps'=>null,'indexedUrls'=>null,
        'apiLiveNow'=>false,'provenanceAttested'=>false,'dataFresh'=>true,
        'limitation'=>'A valid local shape is not proof of Google origin. This is a dated aggregate only: no URL/keyword metrics, indexing certification, or live Google polling.'
    ];
}

/**
 * Path is provisioned privately in config.local.php as gsc_private_snapshot_path.
 * No path below this application's document root may be used, even for tests.
 */
function operationsGscDirectSnapshot(string $configuredPath,int $at): array {
    if ($configuredPath==='')return operationsGscDirectEmpty();
    if ($configuredPath[0]!=='/'||str_contains($configuredPath,"\0"))
        return operationsGscDirectEmpty('unsafe_private_path');
    $real=realpath($configuredPath);
    $public=realpath(dirname(__DIR__));
    if ($real===false||$public===false||is_link($configuredPath)
        || $real===$public||str_starts_with($real,$public.DIRECTORY_SEPARATOR)
        || !is_file($real)||!is_readable($real))
        return operationsGscDirectEmpty('unsafe_or_missing_private_file');
    // Private GSC observation must not be readable by group/other accounts.
    $mode=@fileperms($real);
    if ($mode===false||($mode & 0077)!==0)
        return operationsGscDirectEmpty('unsafe_private_permissions');
    $size=filesize($real);
    if ($size===false||$size>65536||$size<2)
        return operationsGscDirectEmpty('invalid_private_size');
    $raw=@file_get_contents($real,false,null,0,65537);
    if (!is_string($raw)||strlen($raw)>65536)
        return operationsGscDirectEmpty('invalid_private_size');
    try {$document=json_decode($raw,true,12,JSON_THROW_ON_ERROR);}
    catch (JsonException $e) {return operationsGscDirectEmpty('invalid_private_json');}
    return operationsGscDirectFromDocument(is_array($document)?$document:null,$at);
}

/**
 * One Operations Control Center, two distinct measured systems.
 * The GA4 API CI smoke test never deposits raw observations on Bertina.
 * Preserve unknown until a privately authenticated ingest is installed.
 */
function operationsSearchIntelligenceSnapshot(string $gscPrivatePath,int $at): array {
    return [
        'ok'=>true,
        'schema'=>'jr-owner-search-intelligence-v1',
        'checkedAtUtc'=>gmdate('Y-m-d\\TH:i:s\\Z',$at),
        'gsc'=>operationsGscDirectSnapshot($gscPrivatePath,$at),
        'ga4'=>[
            'schema'=>'jr-owner-ga4-observation-v1',
            'status'=>'not_ingested',
            'property'=>'properties/559754204',
            'measurementId'=>'G-C3C7NQQNWX',
            'activeUsers'=>null,'eventCount'=>null,
            'startDate'=>null,'endDate'=>null,
            'apiVerifiedOnServer'=>null,'sourceObservedAtUtc'=>null,
            'limitation'=>'GA4 Data API workflow verifies access separately. No GA4 report has been authenticated, ingested or attached to this administrative snapshot; missing is not zero.'
        ],
        'tagManager'=>[
            'status'=>'pending_owner_container','containerId'=>null,
            'productionCollectionVerified'=>false,
            'limitation'=>'GTM container creation, Preview, GA4 DebugView and explicit owner approval are outstanding.'
        ],
        'limitation'=>'Search Console search metrics and GA4 consented on-site events have distinct definitions and are never combined into a synthetic conversion rate.'
    ];
}
