<?php
declare(strict_types=1);
/**
 * Autonomous FIRST-PARTY official-site CANDIDATE discovery from the already
 * authenticated JREI-KA source archive. No live network, model prompt trust,
 * new database, arbitrary URL fetching, self-certification or publication.
 *
 * JREI's owner does not have to name every university/authority. A link from
 * an existing issuer- and rights-reviewed PRIMARY education source can
 * nominate another exact institutional host. The candidate is always
 * DISCOVERED_REQUIRES_RIGHTS_REVIEW, NEVER an approved monitor/source.
 * Cross-institutional links are evidence, not authorization.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

function jrNewsNetworkExactInstitutionOrigin(string $url):?string {
    if(strlen($url)<12||strlen($url)>650||
       preg_match('/[\\x00-\\x20\\x7f\\\\]/',$url)||
       preg_match('/%(?:00|2e|2f|5c|0a|0d)/i',$url)||
       filter_var($url,FILTER_VALIDATE_URL)===false)return null;
    $p=parse_url($url);
    if(!is_array($p)||($p['scheme']??null)!=='https'||
       empty($p['host'])||isset($p['user'])||isset($p['pass'])||
       isset($p['fragment'])||isset($p['port']))return null;
    $host=strtolower((string)$p['host']);
    if(strlen($host)>253||filter_var($host,FILTER_VALIDATE_IP)!==false||
       !preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,24}$/D',$host)||
       preg_match('/\\.(?:localhost|internal|invalid|example|test)$/D',$host))
        return null;
    // The apex may have legitimate internal institutional subdomains.
    // Retain the exact linked host; NEVER grant authority to sibling hosts.
    if(str_starts_with($host,'www.'))$host=substr($host,4);
    return 'https://'.$host.'/';
}

function jrNewsNetworkInstitutionalLabel(string $raw):?string {
    $label=trim((string)(preg_replace('/\\s+/u',' ',strip_tags($raw))??''));
    if($label===''||preg_match('//u',$label)!==1||strlen($label)>600)
        return null;
    // An educational institute, exam authority, ministry or research body.
    // Recognition helps ORDER untrusted discoveries, not prove ownership.
    if(!preg_match('/(?:دانشگاه|وزارت|سازمان|مرکز|پژوهشگاه|پژوهشکده|آموزش|فرهنگیان|سنجش|علوم|\\buniversit(?:y|ies)\\b|\\bministry\\b|\\beducation\\b|\\bresearch\\b|\\binstitute\\b|\\bcollege\\b)/iu',$label))
        return null;
    return mb_substr($label,0,100,'UTF-8');
}

/**
 * Discover cross-institutional links from independently archived primary
 * pages. Never follow or download any link. No external entities or base tag.
 */
function jrNewsFindInstitutionLinksInApprovedHtml(
    string $html,string $sourceUrl,int $limit=40
):array {
    if($limit<1||$limit>80||strlen($html)<50||
       strlen($html)>2097152||!class_exists('DOMDocument'))return [];
    $original=jrNewsNetworkExactInstitutionOrigin($sourceUrl);
    if($original===null)return [];
    $withoutSafe=preg_replace('/<!doctype\\s+html\\s*>/i','',$html);
    if(!is_string($withoutSafe)||
       stripos($withoutSafe,'<!DOCTYPE')!==false||
       stripos($html,'<!ENTITY')!==false||
       preg_match('/<base\\b/i',$html))return [];
    $old=libxml_use_internal_errors(true);
    try{
        $dom=new DOMDocument('1.0','UTF-8');
        $dom->resolveExternals=false;
        $dom->substituteEntities=false;
        $dom->validateOnParse=false;
        if(!@$dom->loadHTML('<?xml encoding="UTF-8"?>'.$html,
            LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING))return [];
        $anchors=$dom->getElementsByTagName('a');
        if($anchors->length>6000)return [];
        $seen=[];$out=[];
        foreach($anchors as $a){
            if(count($out)>=$limit)break;
            if(!$a instanceof DOMElement)continue;
            $href=trim((string)$a->getAttribute('href'));
            if(!str_starts_with($href,'https://'))continue;
            $origin=jrNewsNetworkExactInstitutionOrigin($href);
            if($origin===null||$origin===$original||isset($seen[$origin]))
                continue;
            $host=(string)parse_url($origin,PHP_URL_HOST);
            if(preg_match('/(?:^|\\.)(?:facebook|instagram|tiktok|youtube|telegram|linkedin|twitter|x|google|aparat)\\./i',$host))
                continue;
            $label=jrNewsNetworkInstitutionalLabel($a->textContent);
            if($label===null)continue;
            // A .gov.ir / .ac.ir institutional host is a promising
            // candidate; a different .ir host remains equally UNVERIFIED.
            if(!str_ends_with($host,'.ir'))continue;
            $seen[$origin]=true;
            $out[]=[
                'url'=>$origin,
                'label'=>$label,
                'urlSha256'=>hash('sha256',$origin),
                'recognition'=>'OFFICIAL_INSTITUTION_CANDIDATE_UNVERIFIED',
                'sourceRightsApproved'=>false,
                'issuerIndependentlyVerified'=>false,
                'monitored'=>false
            ];
        }
        return $out;
    }finally{
        libxml_clear_errors();
        libxml_use_internal_errors($old);
    }
}

/**
 * Original JREI-KA -> original JREI-KA discovery candidates, no other
 * tables or authorities. Source observations MUST be independently acquired
 * with current approved policy; source-level issuer verification is not
 * inferred merely from the domain spelling.
 */
function jrNewsStageAutonomousInstitutionCandidates(
    PDO $pdo,string $privateArchive,array $cfg,
    array $context,int $now,int $limit=8
):array {
    if(($context['source']??null)!=='ORIGINAL_JREI_PRIVATE_NEWS_WORKER'||
       ($context['originalCronLeaseVerified']??null)!==true||
       ($cfg['operations_cron_master_enabled']??null)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??null)!==true||
       ($cfg['jrei_news_source_activation_accepted']??null)!==true||
       ($cfg['jrei_news_autonomous_institution_discovery_enabled']??null)!==true||
       $now<1||$limit<1||$limit>25)
        throw new RuntimeException('news_original_autonomous_institution_discovery_disabled');
    $archive=realpath($privateArchive);
    $web=realpath(dirname(__DIR__,3));
    if($archive===false||is_link($privateArchive)||!is_dir($archive)||
       ($web!==false&&($archive===$web||
        str_starts_with($archive,$web.DIRECTORY_SEPARATOR))))
        throw new RuntimeException('news_original_private_archive_unavailable');

    $summary=[
        'schema'=>'jr.jrei.news-autonomous-institution-discovery.v1',
        'reviewedObservationPages'=>0,'discoveredInstitutionCandidates'=>0,
        'alreadyDiscovered'=>0,'invalidOrStaleObservations'=>0,
        'realNetworkRequests'=>0,'sourcePermissionsGranted'=>0,
        'newsMonitorsEnabled'=>0,'articlesPublished'=>0
    ];
    $lease=$pdo->prepare('SELECT GET_LOCK(?,0)');
    $lease->execute(['jrei-news-autonomous-origins']);
    if((int)$lease->fetchColumn()!==1)
        return $summary+['busy'=>true];

    try{
        $q=$pdo->prepare(
            "SELECT s.source_id,s.source_locator_uri,o.observation_id,
                    o.private_object_key,o.bytes_total,o.content_sha256
             FROM jrei_ka_private_observations o
             JOIN jrei_exam_sources s ON s.source_id=o.source_id
             JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
                  AND p.revision=o.source_policy_revision
             JOIN jrei_ka_jobs j ON j.job_id=o.job_id
               AND j.source_id=s.source_id AND
                   j.source_policy_revision=o.source_policy_revision
               AND BINARY j.observed_digest=BINARY o.content_sha256
             WHERE s.review_state='AUTHORITATIVE_REVIEWED'
               AND s.rights_state IN
                   ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
               AND s.source_kind IN
                   ('OFFICIAL_UNIVERSITY_NEWS','OFFICIAL_EXAM_NOTICE',
                    'OFFICIAL_EDUCATION_NEWS')
               AND s.is_revoked=0 AND s.is_superseded=0
               AND s.reviewer_account_id IS NOT NULL
               AND s.verified_at IS NOT NULL
               AND p.scheduling_state='APPROVED'
               AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
               AND p.transport_reviewed=1
               AND p.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
               AND p.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
               AND p.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
               AND o.mime_type='text/html'
               AND o.state='PENDING_SCIENTIFIC_REVIEW'
               AND o.rights_state_at_acquisition IN
                   ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
               AND j.job_state='ACQUIRED_REVIEW'
               AND o.bytes_total BETWEEN 50 AND 2097152
               AND BINARY o.source_uri_sha256=BINARY SHA2(s.source_locator_uri,256)
               AND NOT EXISTS (
                   SELECT 1 FROM jrei_ka_discovery_candidates d
                    WHERE d.seed_source_id=s.source_id
                      AND d.originating_observation_id=o.observation_id
                      AND d.discovery_kind='OFFICIAL_SITE_CANDIDATE'
               )
             ORDER BY o.observed_at DESC,o.observation_id DESC LIMIT ?"
        );
        $q->bindValue(1,$limit,PDO::PARAM_INT);
        $q->execute();
        $insert=$pdo->prepare(
            "INSERT INTO jrei_ka_discovery_candidates
             (candidate_id,seed_source_id,originating_observation_id,
              candidate_url,candidate_url_sha256,candidate_label,
              discovery_kind,state,first_discovered_at,last_discovered_at)
             VALUES(?,?,?,?,?,?,'OFFICIAL_SITE_CANDIDATE',
              'DISCOVERED_REQUIRES_RIGHTS_REVIEW',?,?)
             ON DUPLICATE KEY UPDATE last_discovered_at=VALUES(last_discovered_at)"
        );
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
            $digest=(string)$row['content_sha256'];
            $key=(string)$row['private_object_key'];
            $length=(int)$row['bytes_total'];
            if(!preg_match('/^[a-f0-9]{64}$/D',$digest)||
               $key!==$digest.'.bin'){
                $summary['invalidOrStaleObservations']++;continue;
            }
            $file=$archive.DIRECTORY_SEPARATOR.$key;
            $resolved=realpath($file);
            if($resolved===false||dirname($resolved)!==$archive||
               is_link($file)||!is_file($file)||!is_readable($file)||
               filesize($file)!==$length||!hash_equals($digest,
                 (string)hash_file('sha256',$file))){
                $summary['invalidOrStaleObservations']++;continue;
            }
            $html=file_get_contents($file);
            if(!is_string($html)||strlen($html)!==$length){
                $summary['invalidOrStaleObservations']++;continue;
            }
            $summary['reviewedObservationPages']++;
            $links=jrNewsFindInstitutionLinksInApprovedHtml(
                $html,(string)$row['source_locator_uri'],40);
            foreach($links as $link){
                $pdo->beginTransaction();
                try{
                    // A duplicate must NEVER reset an existing reviewed or
                    // explicitly rejected candidate to DISCOVERED.
                    $insert->execute([
                        jrNewsPrivateUuid(),$row['source_id'],$row['observation_id'],
                        $link['url'],$link['urlSha256'],$link['label'],$now,$now
                    ]);
                    if($insert->rowCount()===1)
                        $summary['discoveredInstitutionCandidates']++;
                    else $summary['alreadyDiscovered']++;
                    $pdo->commit();
                }catch(Throwable $e){
                    if($pdo->inTransaction())$pdo->rollBack();
                    $summary['invalidOrStaleObservations']++;
                }
            }
        }
    }finally{
        $pdo->prepare('SELECT RELEASE_LOCK(?)')
            ->execute(['jrei-news-autonomous-origins']);
    }
    return $summary;
}
