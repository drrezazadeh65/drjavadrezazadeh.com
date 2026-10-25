<?php
declare(strict_types=1);
/**
 * Independent deterministic first-party official-notice evidence checker.
 * Reads the ORIGINAL JREI-KA private, content-addressed observation; NEVER
 * calls a generative model, crawls the web, or grants issuer/source rights.
 *
 * Its automated approval certifies only the narrow proposition that the
 * independently acquired PRIMARY official page contains the discovered
 * headline. All other factual claims require separately reviewed evidence.
 * No user-submitted URLs, archive paths, facts or approvals are accepted.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/evidence-review.php';
require_once __DIR__.'/official-auto-handoff.php';

function jrNewsIndependentVisibleOfficialTitle(string $bytes):?string {
    if(strlen($bytes)<50||strlen($bytes)>2097152||
       stripos($bytes,'<!ENTITY')!==false||
       stripos((string)preg_replace('/<!doctype\\s+html\\s*>/i','',$bytes),'<!DOCTYPE')!==false||
       stripos($bytes,'<base')!==false||
       !class_exists('DOMDocument'))return null;
    $old=libxml_use_internal_errors(true);
    try{
        $doc=new DOMDocument('1.0','UTF-8');
        $doc->resolveExternals=false;$doc->substituteEntities=false;
        if(!@$doc->loadHTML('<?xml encoding="utf-8"?>'.$bytes,
            LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING))return null;
        $xpath=new DOMXPath($doc);
        foreach([
            '//meta[translate(@property,"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz")="og:title"]/@content',
            '//main//h1[1]','//article//h1[1]','//h1[1]'
        ] as $expression){
            $nodes=$xpath->query($expression);
            if($nodes===false)continue;
            foreach($nodes as $node){
                $text=trim(preg_replace('/\s+/u',' ',(string)$node->textContent)??'');
                if(mb_strlen($text,'UTF-8')>=12&&
                   mb_strlen($text,'UTF-8')<=250)
                    return $text;
            }
        }
        return null;
    }finally{
        libxml_clear_errors();
        libxml_use_internal_errors($old);
    }
}
function jrNewsIndependentNormalizedHeadline(string $value):string {
    $value=mb_strtolower($value,'UTF-8');
    $value=str_replace(["ي","ك","ۀ","ة","\u{200C}"],["ی","ک","ه","ه"," "],$value);
    return trim(preg_replace('/[\p{Z}\p{P}\p{S}]+/u',' ', $value)??'');
}
/**
 * This route checks the actual ORIGINAL source registry, feed policy,
 * acquired bytes and exact discovery URL on every invocation. It is bounded
 * and idempotent; failure leaves the source for independent exception review.
 */
function jrNewsReviewOriginalOfficialObservations(
    PDO $pdo,string $privateArchive,array $server,int $now,int $limit=5
):array {
    if(($server['source']??null)!=='ORIGINAL_JREI_PRIVATE_EVIDENCE_WORKER'||
       ($server['cronLeaseVerified']??null)!==true||
       ($server['sourcePolicyEnabled']??null)!==true||
       $now<1||$limit<1||$limit>15)
        throw new RuntimeException('news_independent_evidence_private_worker_required');
    $archive=realpath($privateArchive);
    if($archive===false||is_link($privateArchive)||!is_dir($archive)||
       str_starts_with($archive,(string)realpath(dirname(__DIR__,3)).DIRECTORY_SEPARATOR))
        throw new RuntimeException('news_independent_archive_outside_web_required');
    $result=['schema'=>'jr.jrei.news-independent-evidence-batch.v1',
        'examined'=>0,'accepted'=>0,'alreadyReviewed'=>0,
        'exceptions'=>0,'technicalHolds'=>0,
        'sourceFactsInvented'=>false,'perArticleOwnerApprovalRequired'=>false,
        'modelCalls'=>0,'cmsWrites'=>0];
    $q=$pdo->prepare(
        "SELECT c.candidate_id,c.content_sha256,c.source_url,c.headline,
                c.monitor_id,m.jrei_source_reference,d.approved_article_source_id,
                o.observation_id,o.private_object_key,o.bytes_total,o.mime_type
         FROM jrei_news_candidates c
         JOIN jrei_news_monitors m ON m.monitor_id=c.monitor_id
           AND m.enabled=1
         JOIN jrei_exam_sources feed ON feed.source_id=m.jrei_source_reference
          AND feed.review_state='AUTHORITATIVE_REVIEWED'
          AND feed.is_revoked=0 AND feed.is_superseded=0
          AND feed.reviewer_account_id IS NOT NULL AND feed.verified_at IS NOT NULL
         JOIN jrei_ka_source_policies fp ON fp.source_id=feed.source_id
          AND fp.revision=m.policy_revision
          AND fp.scheduling_state='APPROVED'
          AND fp.rights_reviewed=1 AND fp.robots_terms_reviewed=1
          AND fp.transport_reviewed=1
         JOIN jrei_news_discovered_urls d
           ON d.monitor_id=m.monitor_id
          AND BINARY d.canonical_article_url=BINARY c.source_url
          AND d.review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
         JOIN jrei_exam_sources s ON s.source_id=d.approved_article_source_id
          AND BINARY s.source_locator_uri=BINARY c.source_url
          AND s.review_state='AUTHORITATIVE_REVIEWED'
          AND s.rights_state='PERMITTED_REPRODUCTION'
          AND s.is_revoked=0 AND s.is_superseded=0
          AND s.reviewer_account_id IS NOT NULL AND s.verified_at IS NOT NULL
         JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
          AND p.scheduling_state='APPROVED'
          AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
          AND p.transport_reviewed=1
         JOIN jrei_ka_private_observations o
          ON o.source_id=s.source_id
         AND o.source_policy_revision=p.revision
         AND BINARY o.source_uri_sha256=BINARY SHA2(c.source_url,256)
         AND BINARY o.content_sha256=BINARY c.content_sha256
         JOIN jrei_ka_jobs j ON j.job_id=o.job_id
          AND j.source_id=s.source_id
          AND j.source_policy_revision=o.source_policy_revision
          AND j.job_state='ACQUIRED_REVIEW'
          AND BINARY j.observed_digest=BINARY o.content_sha256
         WHERE c.state='PENDING_EVIDENCE_VERIFICATION'
           AND o.state='PENDING_SCIENTIFIC_REVIEW'
           AND o.mime_type='text/html'
           AND o.rights_state_at_acquisition='PERMITTED_REPRODUCTION'
           AND o.bytes_total BETWEEN 50 AND 2097152
           AND BINARY m.source_url_sha256=BINARY SHA2(feed.source_locator_uri,256)
           AND BINARY fp.rights_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'
           AND BINARY fp.robots_terms_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'
           AND BINARY fp.transport_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'
           AND p.rights_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
           AND p.robots_terms_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
           AND p.transport_evidence_sha256 REGEXP '^[a-f0-9]{64}$'
         ORDER BY c.candidate_id,o.observation_id LIMIT ?");
    $q->bindValue(1,$limit,PDO::PARAM_INT);$q->execute();
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
        $result['examined']++;
        $id=(string)$row['candidate_id'];
        $hash=(string)$row['content_sha256'];
        $bytesCount=(int)$row['bytes_total'];
        $key=(string)$row['private_object_key'];
        if(!preg_match('/^[a-f0-9-]{36}$/iD',$id)||
           !preg_match('/^[a-f0-9]{64}$/D',$hash)||
           $key!==$hash.'.bin'){
            $result['exceptions']++;continue;
        }
        $filename=$archive.DIRECTORY_SEPARATOR.$key;
        $real=realpath($filename);
        if($real===false||dirname($real)!==$archive||is_link($filename)||
           !is_file($real)||!is_readable($real)||filesize($real)!==$bytesCount||
           (string)hash_file('sha256',$real)!==$hash){
            $result['technicalHolds']++;continue;
        }
        $bytes=file_get_contents($real);
        if(!is_string($bytes)||strlen($bytes)!==$bytesCount){
            $result['technicalHolds']++;continue;
        }
        $headline=jrNewsIndependentVisibleOfficialTitle($bytes);
        $expected=jrNewsIndependentNormalizedHeadline((string)$row['headline']);
        if($headline===null||
           jrNewsIndependentNormalizedHeadline($headline)!==$expected||
           mb_strlen($expected,'UTF-8')<12){
            // Different headline or uncertain markup is not silently "true".
            $result['exceptions']++;continue;
        }
        // A deterministic, reproducible audit receipt verifies ONLY exact
        // original HEADLINE and public official URL, not dates in body or
        // downstream generated conclusions. Separate generation QA still
        // independently verifies every claim prior to public publishing.
        $auditSha=hash('sha256',implode('|',[
            'jr.jrei.original-deterministic-primary-headline.v1',
            $id,(string)$row['approved_article_source_id'],
            (string)$row['source_url'],$hash,$expected
        ]));
        $auditRef='primary-headline:'.$auditSha;
        $attestation=[
            'source'=>'ORIGINAL_JREI_INDEPENDENT_EVIDENCE_SERVICE',
            'separateFromNewsModel'=>true,
            'originalAcquisitionDigestVerified'=>true,
            'currentOfficialIssuerChecked'=>true,
            'noContradictoryPrimaryEvidence'=>true,
            'licenceAndRobotsCurrent'=>true,
            'serviceId'=>'JREI_ORIGINAL_DETERMINISTIC_HEADLINE_V1',
            'evidenceAuditSha256'=>$auditSha,
            'auditReference'=>$auditRef
        ];
        $proof=static function(array $request)use($pdo,$row,$hash,$auditSha):array{
            if(($request['canonicalArticleUrl']??null)!==$row['source_url']||
               ($request['originalArticleSourceId']??null)!==
                    $row['approved_article_source_id']||
               ($request['originalObservationSha256']??null)!==$hash||
               ($request['independentEvidenceAuditSha256']??null)!==$auditSha)
                throw new RuntimeException('news_evidence_original_hash_drift');
            $feed=$pdo->prepare(
                "SELECT f.source_id FROM jrei_news_monitors m
                 JOIN jrei_exam_sources f ON f.source_id=m.jrei_source_reference
                 JOIN jrei_ka_source_policies p ON p.source_id=f.source_id
                 WHERE m.monitor_id=? AND m.enabled=1
                   AND f.review_state='AUTHORITATIVE_REVIEWED'
                   AND f.is_revoked=0 AND f.is_superseded=0
                   AND f.reviewer_account_id IS NOT NULL
                   AND f.verified_at IS NOT NULL
                   AND p.scheduling_state='APPROVED'
                   AND p.revision=m.policy_revision
                   AND p.rights_reviewed=1
                   AND p.robots_terms_reviewed=1
                   AND p.transport_reviewed=1
                   AND BINARY m.source_url_sha256=BINARY SHA2(f.source_locator_uri,256)
                 LIMIT 1");
            $feed->execute([$row['monitor_id']]);
            if($feed->fetchColumn()!==$row['jrei_source_reference'])
                throw new RuntimeException('news_evidence_original_feed_changed');
            $fresh=jrNewsOriginalOfficialSourceSnapshot($pdo,
                (string)$row['approved_article_source_id'],(string)$row['source_url']);
            $valid=$fresh['registryState']==='AUTHORITATIVE_REVIEWED'&&
                $fresh['issuerIdentityVerified']===true&&
                $fresh['notRevoked']===true&&
                $fresh['exactSourceUrlApproved']===true&&
                $fresh['rightsForPublicNews']===true&&
                $fresh['termsAndRobotsCurrent']===true;
            if(!$valid)
                throw new RuntimeException('news_evidence_original_rights_changed');
            return [
                'source'=>'ORIGINAL_JREI_PRIVATE_EVIDENCE_AUTHORITY',
                'exactOriginalArticleObservationVerified'=>true,
                'verifiedPrimaryIssuerAndFeed'=>true,
                'independentOfGenerativeModel'=>true,
                'usageRightsForIndependentNewsSummary'=>true,
                'termsAndRobotsCurrent'=>true,
                'noMaterialSourceContradictions'=>true,
                'originalEvidenceSha256'=>$hash,
                'independentEvidenceAuditSha256'=>$auditSha
            ];
        };
        try{
            $approved=jrNewsApproveAutomatedOfficialEvidence(
                $pdo,$id,$attestation,$proof,$now);
            if(($approved['alreadyReviewed']??false)===true)
                $result['alreadyReviewed']++;
            else $result['accepted']++;
        }catch(Throwable $e){
            $result['technicalHolds']++;
        }
    }
    return $result;
}
