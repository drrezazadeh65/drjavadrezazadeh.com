<?php
declare(strict_types=1);
/**
 * Curated FIRST-PARTY discovery targets for Iranian higher-education news.
 *
 * This directory answers "where should the existing JREI acquisition engine
 * look?" It is NOT proof that any RSS feed exists or that a particular
 * announcement is true. No privileged register/approve/download/publish write
 * is authorized by the domain allowlist alone.
 *
 * Owners do NOT review each official story: independent acquisition, current
 * issuer validation, editorial checks and original standing-policy CMS do so.
 * Third-party terms, robots and media rights remain separately checked.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

function jrNewsOfficialInstitutionDirectory(): array {
    return [
        ['id'=>'sanjesh','nameFa'=>'سازمان سنجش آموزش کشور',
         'nameEn'=>'National Organization of Educational Testing',
         'origin'=>'https://www.sanjesh.org/','category'=>'examinations','priority'=>'P0'],
        ['id'=>'pnu','nameFa'=>'دانشگاه پیام نور','nameEn'=>'Payame Noor University',
         'origin'=>'https://pnu.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'uast','nameFa'=>'دانشگاه جامع علمی کاربردی',
         'nameEn'=>'University of Applied Science and Technology',
         'origin'=>'https://uast.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'iau','nameFa'=>'دانشگاه آزاد اسلامی',
         'nameEn'=>'Islamic Azad University',
         'origin'=>'https://iau.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'ut','nameFa'=>'دانشگاه تهران','nameEn'=>'University of Tehran',
         'origin'=>'https://ut.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'sharif','nameFa'=>'دانشگاه صنعتی شریف',
         'nameEn'=>'Sharif University of Technology',
         'origin'=>'https://www.sharif.edu/','category'=>'universities','priority'=>'P1'],
        ['id'=>'aut','nameFa'=>'دانشگاه صنعتی امیرکبیر',
         'nameEn'=>'Amirkabir University of Technology',
         'origin'=>'https://aut.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'iust','nameFa'=>'دانشگاه علم و صنعت ایران',
         'nameEn'=>'Iran University of Science and Technology',
         'origin'=>'https://www.iust.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'modares','nameFa'=>'دانشگاه تربیت مدرس',
         'nameEn'=>'Tarbiat Modares University',
         'origin'=>'https://modares.ac.ir/','category'=>'universities','priority'=>'P2']
    ];
}

/** Exact registrable host or www-host only; no arbitrary subdomain trust. */
function jrNewsOfficialDirectoryMatch(string $rawUrl): ?array {
    if(strlen($rawUrl)>1000 ||
       preg_match('/[\\x00-\\x20\\x7F\\\\]/',$rawUrl)===1 ||
       filter_var($rawUrl,FILTER_VALIDATE_URL)===false)return null;
    $parsed=parse_url($rawUrl);
    if(!is_array($parsed)||strtolower((string)($parsed['scheme']??''))!=='https'||
       !isset($parsed['host'])||isset($parsed['user'])||
       isset($parsed['pass'])||isset($parsed['fragment'])||
       (isset($parsed['port'])&&(int)$parsed['port']!==443)||
       filter_var((string)$parsed['host'],FILTER_VALIDATE_IP)!==false)
        return null;
    $host=strtolower(rtrim((string)$parsed['host'],'.'));
    if($host===''||strlen($host)>253)return null;
    foreach(jrNewsOfficialInstitutionDirectory() as $institution){
        $canonicalHost=strtolower((string)parse_url($institution['origin'],PHP_URL_HOST));
        $apex=preg_replace('/^www\\./','',$canonicalHost);
        if($host===$apex || $host==='www.'.$apex){
            return [
                'institutionId'=>$institution['id'],
                'canonicalOrigin'=>$institution['origin'],
                'exactInstitutionalHostMatch'=>true,
                'officialIssuerDirectoryMatch'=>true,
                'actualUrlDownloadedOrVerified'=>false,
                'robotsOrRightsGranted'=>false,
                'independentArticleEvidenceRequired'=>true
            ];
        }
    }
    return null;
}

/** A read-only owner inventory; never fakes an active news feed. */
function jrNewsOriginalInstitutionSourceInventory(PDO $pdo,int $limit=50): array {
    if($limit<1||$limit>50)
        throw new InvalidArgumentException('news_official_inventory_limit_invalid');
    $q=$pdo->prepare(
        "SELECT s.source_id,s.source_locator_uri,s.review_state,s.rights_state,
                s.is_revoked,s.is_superseded,p.scheduling_state
           FROM jrei_exam_sources s
           LEFT JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
          WHERE s.source_locator_uri LIKE 'https://%'
          ORDER BY s.source_id LIMIT ?"
    );
    $q->bindValue(1,500,PDO::PARAM_INT);
    $q->execute();
    $registered=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
        $match=jrNewsOfficialDirectoryMatch((string)$row['source_locator_uri']);
        if(!$match)continue;
        $id=$match['institutionId'];
        if(!isset($registered[$id]))$registered[$id]=[
            'registeredSources'=>0,'activeReviewedSources'=>0
        ];
        $registered[$id]['registeredSources']++;
        if($row['review_state']==='AUTHORITATIVE_REVIEWED'&&
           $row['scheduling_state']==='APPROVED'&&
           (int)$row['is_revoked']===0&&(int)$row['is_superseded']===0)
            $registered[$id]['activeReviewedSources']++;
    }
    $items=[];
    foreach(jrNewsOfficialInstitutionDirectory() as $institution){
        $id=$institution['id'];
        $items[]=[
            ...$institution,
            'registeredSources'=>$registered[$id]['registeredSources']??0,
            'activeReviewedSources'=>$registered[$id]['activeReviewedSources']??0,
            'status'=>($registered[$id]['activeReviewedSources']??0)>0?
                'SOURCE_POLICY_PRESENT':'REQUIRES_ORIGINAL_SOURCE_DISCOVERY',
            'actualFeedEndpointIndependentlyConfirmed'=>false,
            'publicationRightsAutomaticallyGranted'=>false
        ];
        if(count($items)>=$limit)break;
    }
    return [
        'schema'=>'jr.jrei.news-official-institutions.v1',
        'institutions'=>$items,'returnedCount'=>count($items),
        'sourceRegistry'=>'ORIGINAL_JREI_MOTHER_DATABASE',
        'privateWritesPerformed'=>false,'networkFetchesPerformed'=>0,
        'publishingPerformed'=>false,'perArticleOwnerApprovalRequired'=>false
    ];
}
