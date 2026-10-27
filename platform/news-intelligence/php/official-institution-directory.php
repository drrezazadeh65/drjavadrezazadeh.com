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
require_once __DIR__.'/original-autonomous-institution-discovery.php';

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
         'origin'=>'https://modares.ac.ir/','category'=>'universities','priority'=>'P2'],
        // Initial discovery roots, not a closed list: the original JREI-KA
        // archived-link analyzer discovers additional institutions without
        // requiring the owner to specify each university or ministry.
        // Every root is DISCOVERED only until real independent review.
        ['id'=>'msrt','nameFa'=>'وزارت علوم، تحقیقات و فناوری',
         'nameEn'=>'Ministry of Science, Research and Technology',
         'origin'=>'https://www.msrt.ir/','category'=>'research','priority'=>'P0'],
        ['id'=>'medu','nameFa'=>'وزارت آموزش و پرورش',
         'nameEn'=>'Ministry of Education',
         'origin'=>'https://www.medu.ir/','category'=>'school','priority'=>'P0'],
        ['id'=>'sbu','nameFa'=>'دانشگاه شهید بهشتی',
         'nameEn'=>'Shahid Beheshti University',
         'origin'=>'https://www.sbu.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'atu','nameFa'=>'دانشگاه علامه طباطبائی',
         'nameEn'=>"Allameh Tabataba'i University",
         'origin'=>'https://www.atu.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'khu','nameFa'=>'دانشگاه خوارزمی',
         'nameEn'=>'Kharazmi University',
         'origin'=>'https://khu.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'alzahra','nameFa'=>'دانشگاه الزهرا',
         'nameEn'=>'Alzahra University',
         'origin'=>'https://www.alzahra.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'kntu','nameFa'=>'دانشگاه صنعتی خواجه نصیرالدین طوسی',
         'nameEn'=>'K. N. Toosi University of Technology',
         'origin'=>'https://kntu.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'cfu','nameFa'=>'دانشگاه فرهنگیان',
         'nameEn'=>'Farhangian University',
         'origin'=>'https://cfu.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'tums','nameFa'=>'دانشگاه علوم پزشکی تهران',
         'nameEn'=>'Tehran University of Medical Sciences',
         'origin'=>'https://tums.ac.ir/','category'=>'universities','priority'=>'P1'],
        ['id'=>'shahd','nameFa'=>'دانشگاه شاهد',
         'nameEn'=>'Shahed University',
         'origin'=>'https://shahed.ac.ir/','category'=>'universities','priority'=>'P2']
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

/**
 * Discover candidates by institutional interlinking, NOT by owner-supplied
 * hardcoded domain names. This is an original mother-DB read over recorded
 * links from independently approved primary sources.
 *
 * The scored signal is solely a triage priority: self-links, leaked private
 * links and single-source endorsements can NEVER confer issuer authority,
 * source reuse rights, publication or a new monitor.
 */
function jrNewsAutonomousInstitutionCandidateInventory(PDO $pdo,int $limit=40):array{
    if($limit<1||$limit>100)
        throw new InvalidArgumentException('news_network_inventory_limit_invalid');
    $rows=[];
    try{
        $query=$pdo->prepare(
            "SELECT d.candidate_url,d.candidate_url_sha256,
                    MIN(d.candidate_label) AS candidate_label,
                    COUNT(DISTINCT d.seed_source_id) AS endorsed_by,
                    MAX(d.last_discovered_at) AS last_discovered_at
             FROM jrei_ka_discovery_candidates d
             JOIN jrei_exam_sources src ON src.source_id=d.seed_source_id
             JOIN jrei_ka_source_policies p ON p.source_id=src.source_id
             JOIN jrei_ka_private_observations o
               ON o.observation_id=d.originating_observation_id
              AND o.source_id=src.source_id
              AND o.source_policy_revision=p.revision
             WHERE d.discovery_kind='OFFICIAL_SITE_CANDIDATE'
               AND d.state IN ('DISCOVERED_REQUIRES_RIGHTS_REVIEW',
                           'SOURCE_DISCOVERED_PENDING_REVIEW')
               AND src.review_state='AUTHORITATIVE_REVIEWED'
               AND src.rights_state IN
                   ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
               AND src.is_revoked=0 AND src.is_superseded=0
               AND src.reviewer_account_id IS NOT NULL
               AND src.verified_at IS NOT NULL
               AND p.scheduling_state='APPROVED'
               AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
               AND p.transport_reviewed=1
             GROUP BY d.candidate_url,d.candidate_url_sha256
             ORDER BY endorsed_by DESC,last_discovered_at DESC,
                      d.candidate_url_sha256
             LIMIT ?"
        );
        $query->bindValue(1,$limit,PDO::PARAM_INT);
        $query->execute();
        $rows=$query->fetchAll(PDO::FETCH_ASSOC);
    }catch(Throwable $e){
        // A not-yet-applied additive candidate schema or a restricted owner
        // read grant cannot make the EXISTING known-institution view fail.
        return [];
    }
    $items=[];
    foreach($rows as $r){
        $url=(string)$r['candidate_url'];
        $origin=jrNewsNetworkExactInstitutionOrigin($url);
        if($origin===null||$origin!==$url)continue;
        $host=(string)parse_url($url,PHP_URL_HOST);
        $name=(string)$r['candidate_label'];
        $referrals=(int)$r['endorsed_by'];
        $items[]=[
            'id'=>'network-'.substr((string)$r['candidate_url_sha256'],0,16),
            'nameFa'=>$name,
            'nameEn'=>$host,
            'origin'=>$url,
            'category'=>str_ends_with($host,'.gov.ir')?
                'examinations':'universities',
            'priority'=>$referrals>=2?'P1':'P2',
            'status'=>'AUTONOMOUSLY_DISCOVERED_REQUIRES_INDEPENDENT_REVIEW',
            'registeredSources'=>0,
            'activeReviewedSources'=>0,
            'independentVerifiedSourceReferrals'=>$referrals,
            'actualFeedEndpointIndependentlyConfirmed'=>false,
            'publicationRightsAutomaticallyGranted'=>false,
            'issuerVerifiedByDomainHeuristic'=>false
        ];
    }
    return $items;
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
    // Expand beyond the original illustrative seed directory. Discoveries
    // appear without asking the owner to list all institutions by name.
    foreach(jrNewsAutonomousInstitutionCandidateInventory($pdo,$limit) as $new){
        if(count($items)>=$limit)break;
        $seen=false;
        foreach($items as $known){
            if(($known['origin']??null)===$new['origin'] ||
                jrNewsOfficialDirectoryMatch($new['origin'])!==null){
                $seen=true;break;
            }
        }
        if(!$seen)$items[]=$new;
    }
    return [
        'schema'=>'jr.jrei.news-official-institutions.v1',
        'institutions'=>$items,'returnedCount'=>count($items),
        'sourceRegistry'=>'ORIGINAL_JREI_MOTHER_DATABASE',
        'privateWritesPerformed'=>false,'networkFetchesPerformed'=>0,
        'publishingPerformed'=>false,'perArticleOwnerApprovalRequired'=>false
    ];
}
