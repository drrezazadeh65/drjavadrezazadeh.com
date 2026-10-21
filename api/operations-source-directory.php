<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * One MFA-only 54-entry reference/collection directory within the existing
 * administrative mother dashboard, never a second source of truth.
 * 30 resource candidates + 16 social connector definitions + 8 GitHub feeds.
 * Connected accounts, live visits, AI citations and revenue are never inferred.
 */
function operationsSourceDirectory(PDO $pdo,int $at): array {
    $external=operationsProviderInventory();
    $result=['ok'=>true,'schema'=>'operations-source-directory-v1',
        'asOf'=>$at,'catalogueStatus'=>'partial',
        'counts'=>['externalReferences'=>0,'socialChannels'=>0,
            'githubCollectionFeeds'=>0,'total'=>0,'verifiedThirdPartyConnections'=>0,
            'freshGithubFeeds'=>0],'sources'=>[],
        'limitations'=>[
            'A listed provider, channel, or GitHub feed is not proof of a live external integration.',
            'Fresh GitHub source cache is separate from authenticated social, SEO, journal, or analytics provider metrics.',
            'The catalogue does not measure search rankings, website traffic, social engagements, money settlement, or AI citations.'
        ]];
    foreach($external['providers']??[] as $record) {
        if(!is_array($record))continue;
        $result['sources'][]=[
            'id'=>'reference:'.$record['id'],'name'=>$record['name'],
            'kind'=>'external_reference','engineId'=>$record['engineId'],
            'status'=>'unverified','observedAt'=>null,
            'url'=>$record['officialUrl'],'lastError'=>null,
            'limitation'=>'Account credentials, consent, provider API and live measurements not verified.'
        ];
        $result['counts']['externalReferences']++;
    }
    $raw=@file_get_contents(__DIR__.'/internal/admin-social-directory.json');
    $social=is_string($raw)&&strlen($raw)<65536?json_decode($raw,true):null;
    $validSocial=is_array($social)&&($social['schema']??null)==='operations-social-directory-v1'
        && count($social['channels']??[])===16;
    if($validSocial)foreach($social['channels'] as $record) {
        if(!is_array($record)||!preg_match('/^[a-z][a-z0-9]{0,39}$/D',(string)($record['id']??'')))continue;
        $url=(string)($record['official']??'');
        if(!filter_var($url,FILTER_VALIDATE_URL)||parse_url($url,PHP_URL_SCHEME)!=='https')continue;
        $result['sources'][]=[
            'id'=>'social:'.$record['id'],'name'=>(string)($record['name']??$record['id']),
            'kind'=>'social_channel','engineId'=>'ENG-03',
            'status'=>'unverified','observedAt'=>null,'url'=>$url,
            'lastError'=>null,
            'limitation'=>'Publishing credentials, consent, provider acceptance and engagement measurements unverified.'
        ];
        $result['counts']['socialChannels']++;
    }
    $cache=[];
    try {
        $status=operationsCollectorStatus($pdo,$at);
        foreach($status['rows']??[] as $row)if(($row['type']??null)==='source')$cache[$row['id']]=$row;
    }catch(Throwable $e) {
        // Preserve read-only directory even before the existing collector tables
        // have been provisioned. Never treat an absent table as zero traffic.
    }
    foreach(operationsCollectorCatalogue() as $entry) {
        if(($entry['type']??null)!=='source')continue;
        $scope=$entry['id'];$observation=$cache[$scope]??null;
        $fresh=($observation['cacheState']??null)==='fresh';
        $result['sources'][]=[
            'id'=>'collector:'.$scope,'name'=>$scope,
            'kind'=>'github_feed','engineId'=>$entry['engineId'],
            'status'=>$observation===null?'unavailable':($fresh?'cached_fresh':
                (($observation['cacheState']??null)==='disabled'?'disabled':'not_fresh')),
            'observedAt'=>$fresh?(int)($observation['lastFetchedAt']??0):null,
            'url'=>'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions',
            'lastError'=>($observation['lastAttempt']['result']??null)==='failed'
                ?'provider_result_unavailable':null,
            'limitation'=>'GitHub source-only audit cache; does not certify production, traffic, rankings or provider accounts.'
        ];
        $result['counts']['githubCollectionFeeds']++;
        if($fresh)$result['counts']['freshGithubFeeds']++;
    }
    $result['counts']['total']=count($result['sources']);
    $result['catalogueStatus']=($result['counts']['externalReferences']===30
        && $result['counts']['socialChannels']===16
        && $result['counts']['githubCollectionFeeds']===8)?'complete':'partial';
    return $result;
}
