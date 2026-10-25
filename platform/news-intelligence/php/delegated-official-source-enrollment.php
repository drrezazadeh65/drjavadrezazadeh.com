<?php
declare(strict_types=1);
/**
 * One-time MFA owner authorization of a precise official /news/ path.
 * The existing JREI source registry and acquisition scheduler remain the
 * ONLY registrars/workers. It does not fetch or publish news. Delegation
 * provides exact-url enrollment only within independently reviewed rights,
 * robots, transport, rate limits and a time-limited path scope.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/owner-editorial.php';

function jrNewsDelegatedPathPrefix(string $prefix):string {
    if(strlen($prefix)<2||strlen($prefix)>220||
       !str_starts_with($prefix,'/')||!str_ends_with($prefix,'/')||
       str_contains($prefix,'//')||str_contains($prefix,'..')||
       preg_match('#^/[a-zA-Z0-9/_-]+/$#D',$prefix)!==1)
        throw new InvalidArgumentException('news_delegated_path_scope_invalid');
    return $prefix;
}
function jrNewsDelegatedExactHost(string $rawUrl):string {
    if(strlen($rawUrl)<12||strlen($rawUrl)>1200||
       preg_match('/[\\x00-\\x20\\x7f\\\\]/',$rawUrl)||
       filter_var($rawUrl,FILTER_VALIDATE_URL)===false)
        throw new InvalidArgumentException('news_delegated_source_url_invalid');
    $parts=parse_url($rawUrl);
    if(!is_array($parts)||strtolower((string)($parts['scheme']??''))!=='https'||
       !isset($parts['host'])||isset($parts['user'])||isset($parts['pass'])||
       isset($parts['fragment'])||(isset($parts['port'])&&(int)$parts['port']!==443))
        throw new InvalidArgumentException('news_delegated_source_https_required');
    $host=strtolower((string)$parts['host']);
    if(strlen($host)>253||filter_var($host,FILTER_VALIDATE_IP)!==false||
       !preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,24}$/D',$host))
        throw new InvalidArgumentException('news_delegated_source_public_hostname_required');
    return $host;
}

function jrNewsGrantOfficialSourceScope(
    PDO $pdo,array $ownerSession,string $feedSourceId,
    string $pathPrefix,string $confirmation,int $now,
    int $validDays=30,int $maxArticlesPerCycle=20
):array{
    $owner=jrNewsOwnerAuthority($ownerSession);
    $prefix=jrNewsDelegatedPathPrefix($pathPrefix);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$feedSourceId)||
       $confirmation!=='APPROVE_EXACT_ORIGINAL_OFFICIAL_NEWS_PATH'||
       $now<=0||$validDays<1||$validDays>90||
       $maxArticlesPerCycle<1||$maxArticlesPerCycle>40||
       !function_exists('operationsAudit'))
        throw new InvalidArgumentException('news_delegated_owner_scope_invalid');
    $pdo->beginTransaction();
    try{
        // Serialize scope changes with the original issuer policy row;
        // never accept a client-supplied rights digest or self-review.
        $q=$pdo->prepare(
            'SELECT s.source_id,s.source_locator_uri,s.review_state,
                    s.rights_state,s.is_revoked,s.is_superseded,s.verified_at,
                    s.reviewer_account_id,p.revision,p.scheduling_state,
                    p.rights_reviewed,p.robots_terms_reviewed,
                    p.transport_reviewed,p.rights_evidence_sha256,
                    p.robots_terms_evidence_sha256,
                    p.transport_evidence_sha256
             FROM jrei_exam_sources s
             JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
             WHERE s.source_id=? FOR UPDATE'
        );
        $q->execute([$feedSourceId]);
        $feed=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($feed)||$feed['review_state']!=='AUTHORITATIVE_REVIEWED'||
           $feed['rights_state']!=='PERMITTED_REPRODUCTION'||
           (int)$feed['is_revoked']!==0||(int)$feed['is_superseded']!==0||
           empty($feed['verified_at'])||empty($feed['reviewer_account_id'])||
           $feed['scheduling_state']!=='APPROVED'||(int)$feed['revision']<1||
           (int)$feed['rights_reviewed']!==1||
           (int)$feed['robots_terms_reviewed']!==1||
           (int)$feed['transport_reviewed']!==1)
            throw new RuntimeException('news_delegated_original_feed_not_approved');
        foreach(['rights_evidence_sha256','robots_terms_evidence_sha256',
                 'transport_evidence_sha256'] as $f)
            if(preg_match('/^[a-f0-9]{64}$/D',(string)$feed[$f])!==1)
                throw new RuntimeException('news_delegated_original_source_proof_missing');
        $host=jrNewsDelegatedExactHost((string)$feed['source_locator_uri']);
        $q=$pdo->prepare(
            'SELECT scope_id,revoked_at FROM jrei_news_delegated_scopes
             WHERE feed_source_id=? AND BINARY approved_host=BINARY ?
               AND BINARY approved_path_prefix=BINARY ?
               AND scope_policy_revision=? FOR UPDATE'
        );
        $q->execute([$feedSourceId,$host,$prefix,$feed['revision']]);
        $prior=$q->fetch(PDO::FETCH_ASSOC);
        if(is_array($prior))
            throw new RuntimeException('news_delegated_scope_already_exists_revoke_or_renew');
        $scopeId=jrNewsPrivateUuid();
        $end=$now+$validDays*86400;
        $pdo->prepare(
            'INSERT INTO jrei_news_delegated_scopes
             (scope_id,feed_source_id,owner_account_id,approved_host,
              approved_path_prefix,scope_policy_revision,rights_evidence_sha256,
              robots_evidence_sha256,transport_evidence_sha256,
              maximum_articles_per_cycle,effective_at,expires_at,revoked_at,
              owner_mfa_audit_reference,created_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,?)'
        )->execute([$scopeId,$feedSourceId,$owner['actor'],$host,$prefix,
            $feed['revision'],$feed['rights_evidence_sha256'],
            $feed['robots_terms_evidence_sha256'],
            $feed['transport_evidence_sha256'],$maxArticlesPerCycle,
            $now,$end,$owner['audit'],$now]);
        operationsAudit($pdo,$owner['actor'],'jrei_news_official_path_scope_granted',
            hash('sha256',$scopeId));
        $pdo->commit();
        return ['scopeId'=>$scopeId,'approvedHost'=>$host,
            'approvedPathPrefix'=>$prefix,'expiresAt'=>$end,
            'perArticleOwnerApprovalRequired'=>false,
            'anySourceDownloaded'=>false,'anyNewsPublished'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();throw $e;
    }
}

function jrNewsRevokeOfficialSourceScope(PDO $pdo,array $ownerSession,
    string $scopeId,int $now):array{
    $owner=jrNewsOwnerAuthority($ownerSession);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$scopeId)||$now<=0)
        throw new InvalidArgumentException('news_delegated_revoke_invalid');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT scope_id FROM jrei_news_delegated_scopes
             WHERE scope_id=? AND owner_account_id=? AND revoked_at IS NULL
             FOR UPDATE');
        $q->execute([$scopeId,$owner['actor']]);
        $exists=$q->fetchColumn()!==false;
        if($exists){
            // Existing delegated ARTICLE sources are affected. Never revoke
            // unrelated approved JREI sources or retract public articles.
            $pdo->prepare('UPDATE jrei_exam_sources s
               JOIN jrei_news_delegated_enrollments e
                 ON e.article_source_id=s.source_id
               SET s.is_revoked=1,s.updated_at=?
               WHERE e.scope_id=? AND s.source_version=?
                 AND s.is_revoked=0')
              ->execute([$now,$scopeId,'NEWS_DELEGATED_V1']);
            $pdo->prepare('UPDATE jrei_news_delegated_scopes
                SET revoked_at=? WHERE scope_id=? AND revoked_at IS NULL')
              ->execute([$now,$scopeId]);
            if(function_exists('operationsAudit'))
                operationsAudit($pdo,$owner['actor'],
                    'jrei_news_official_path_scope_revoked',
                    hash('sha256',$scopeId));
        }
        $pdo->commit();
        return ['scopeId'=>$scopeId,'revoked'=>$exists,
            'newArticleEnrollmentStopped'=>true,
            'delegatedArticleAcquisitionStopped'=>true,
            'alreadyPublishedNewsRemoved'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

function jrNewsOwnerOfficialSourceScopes(PDO $pdo,array $ownerSession,int $limit=40):array{
    $owner=jrNewsOwnerAuthority($ownerSession);
    if($limit<1||$limit>100)
        throw new InvalidArgumentException('news_delegated_scopes_limit_invalid');
    $q=$pdo->prepare(
        'SELECT scope_id,feed_source_id,approved_host,approved_path_prefix,
                scope_policy_revision,effective_at,expires_at,revoked_at,
                maximum_articles_per_cycle
         FROM jrei_news_delegated_scopes WHERE owner_account_id=?
         ORDER BY created_at DESC,scope_id DESC LIMIT ?');
    $q->bindValue(1,$owner['actor'],PDO::PARAM_STR);
    $q->bindValue(2,$limit,PDO::PARAM_INT);
    $q->execute();
    return ['schema'=>'jr.jrei.news-delegated-source-scopes.v1',
        'scopes'=>$q->fetchAll(PDO::FETCH_ASSOC),
        'publishedByThisRead'=>false,'sourceRightsGrantedByRead'=>false];
}

/**
 * Called ONLY from original JREI private news worker after an authorized
 * RSS/HTML observation has created URL metadata. Scope and source policies
 * are rechecked inside each write transaction. No DNS/network/LLM here:
 * registering makes this article eligible for the ORIGINAL safe scheduler.
 */
function jrNewsOriginalEnrollDelegatedOfficialArticles(PDO $pdo,array $ctx,
    int $now,int $limit=20):array{
    if(($ctx['source']??null)!=='ORIGINAL_JREI_PRIVATE_NEWS_WORKER'||
       ($ctx['originalServerSessionVerified']??null)!==true||
       ($ctx['delegatedOfficialScopesEnabled']??null)!==true||
       $now<=0||$limit<1||$limit>40)
        throw new RuntimeException('news_delegated_private_job_not_authorized');
    $query=$pdo->prepare(
        "SELECT d.discovery_id,d.canonical_article_url,d.canonical_url_sha256,
                d.discovered_headline,d.monitor_id,n.jrei_source_reference,
                g.scope_id,g.owner_account_id,g.maximum_articles_per_cycle,
                g.approved_host,
                g.approved_path_prefix,g.scope_policy_revision,
                g.rights_evidence_sha256,g.robots_evidence_sha256,
                g.transport_evidence_sha256
         FROM jrei_news_discovered_urls d
         JOIN jrei_news_monitors n ON n.monitor_id=d.monitor_id AND n.enabled=1
         JOIN jrei_news_delegated_scopes g
           ON g.feed_source_id=n.jrei_source_reference
         JOIN jrei_exam_sources f ON f.source_id=n.jrei_source_reference
         JOIN jrei_ka_source_policies p ON p.source_id=f.source_id
         WHERE d.review_state='REQUIRES_ARTICLE_SOURCE_APPROVAL'
           AND d.source_registry_id=n.jrei_source_reference
           AND g.revoked_at IS NULL
           AND g.effective_at<=? AND g.expires_at>?
           AND g.scope_policy_revision=p.revision
           AND n.policy_revision=p.revision
           AND BINARY n.source_url_sha256=BINARY SHA2(f.source_locator_uri,256)
           AND f.review_state='AUTHORITATIVE_REVIEWED'
           AND f.rights_state='PERMITTED_REPRODUCTION'
           AND f.is_revoked=0 AND f.is_superseded=0
           AND f.verified_at IS NOT NULL AND f.reviewer_account_id IS NOT NULL
           AND p.scheduling_state='APPROVED'
           AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
           AND p.transport_reviewed=1
           AND BINARY g.rights_evidence_sha256=BINARY p.rights_evidence_sha256
           AND BINARY g.robots_evidence_sha256=BINARY p.robots_terms_evidence_sha256
           AND BINARY g.transport_evidence_sha256=BINARY p.transport_evidence_sha256
         ORDER BY d.first_seen_at,d.discovery_id LIMIT ?"
    );
    $query->bindValue(1,$now,PDO::PARAM_INT);
    $query->bindValue(2,$now,PDO::PARAM_INT);
    $query->bindValue(3,$limit,PDO::PARAM_INT);
    $query->execute();
    $summary=['examined'=>0,'enrolled'=>0,'alreadyRegistered'=>0,
        'outsideScope'=>0,'pending'=>0,
        'perArticleOwnerReviewPerformed'=>false,'networkRequests'=>0,
        'articlesPublished'=>0];
    $perScope=[];
    foreach($query->fetchAll(PDO::FETCH_ASSOC) as $found){
        $scopeKey=(string)$found['scope_id'];
        $used=$perScope[$scopeKey]??0;
        if($used>=(int)$found['maximum_articles_per_cycle']){
            $summary['pending']++;continue;
        }
        $summary['examined']++;
        $url=(string)$found['canonical_article_url'];
        try{
            $host=jrNewsDelegatedExactHost($url);
            $parsed=parse_url($url);
            $path=(string)($parsed['path']??'/');
            $prefix=(string)$found['approved_path_prefix'];
            $queryString=(string)($parsed['query']??'');
            if($host!==$found['approved_host']||
               !str_starts_with($path,$prefix)||
               strlen($queryString)>200||
               preg_match('/%(?:00|0a|0d|2e|2f|5c)/i',$url)||
               str_contains($path,'..')||
               !hash_equals((string)$found['canonical_url_sha256'],hash('sha256',$url)))
                throw new InvalidArgumentException('news_delegated_outside_scope');
        }catch(InvalidArgumentException $e){
            $summary['outsideScope']++;continue;
        }
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare(
                "SELECT d.discovery_id,d.review_state FROM jrei_news_discovered_urls d
                 JOIN jrei_news_delegated_scopes g ON g.scope_id=?
                 JOIN jrei_exam_sources f ON f.source_id=g.feed_source_id
                 JOIN jrei_ka_source_policies p ON p.source_id=f.source_id
                 JOIN jrei_news_monitors n ON n.monitor_id=d.monitor_id
                 WHERE d.discovery_id=? AND d.review_state='REQUIRES_ARTICLE_SOURCE_APPROVAL'
                   AND d.approved_article_source_id IS NULL
                   AND n.enabled=1 AND n.policy_revision=p.revision
                   AND g.revoked_at IS NULL
                   AND g.effective_at<=? AND g.expires_at>?
                   AND g.scope_policy_revision=p.revision
                   AND f.review_state='AUTHORITATIVE_REVIEWED'
                   AND f.rights_state='PERMITTED_REPRODUCTION'
                   AND f.is_revoked=0 AND f.is_superseded=0
                   AND p.scheduling_state='APPROVED'
                   AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
                   AND p.transport_reviewed=1
                   AND BINARY g.rights_evidence_sha256=BINARY p.rights_evidence_sha256
                   AND BINARY g.robots_evidence_sha256=BINARY p.robots_terms_evidence_sha256
                   AND BINARY g.transport_evidence_sha256=BINARY p.transport_evidence_sha256
                 FOR UPDATE"
            );
            $q->execute([$found['scope_id'],$found['discovery_id'],$now,$now]);
            if(!$q->fetchColumn()){
                $pdo->rollBack();$summary['pending']++;continue;
            }
            // Original source may have been registered by another legitimate
            // path. Do not override it or manufacture duplicate rights.
            $lookup=$pdo->prepare(
                'SELECT source_id FROM jrei_exam_sources WHERE
                 BINARY source_locator_uri=BINARY ? LIMIT 1 FOR UPDATE'
            );
            $lookup->execute([$url]);
            if($lookup->fetchColumn()){
                $pdo->commit();$summary['alreadyRegistered']++;continue;
            }
            $parent=$pdo->prepare(
                "SELECT f.source_authority_id,f.country_code,
                        f.educational_level,f.exam_category,
                        f.curriculum_version,f.subject_id,
                        p.priority_tier,p.refresh_interval_seconds,
                        p.max_document_bytes,p.min_request_spacing_seconds,
                        p.rights_evidence_sha256,p.robots_terms_evidence_sha256,
                        p.transport_evidence_sha256,p.revision
                 FROM jrei_exam_sources f
                 JOIN jrei_ka_source_policies p ON p.source_id=f.source_id
                 WHERE f.source_id=? FOR UPDATE"
            );
            $parent->execute([$found['jrei_source_reference']]);
            $p=$parent->fetch(PDO::FETCH_ASSOC);
            if(!$p)throw new RuntimeException('news_delegated_parent_disappeared');
            $id=jrNewsPrivateUuid();
            $hash=hash('sha256',$url);
            $pdo->prepare(
                "INSERT INTO jrei_exam_sources
                 (source_id,source_authority_id,source_title,publication_date,
                  source_version,original_sha256,source_locator_digest,
                  source_locator_uri,country_code,educational_level,
                  exam_category,curriculum_version,subject_id,examination_year,
                  source_kind,rights_state,review_state,extraction_state,
                  answer_key_state,is_superseded,is_revoked,private_object_ref_id,
                  reviewer_account_id,verified_at,created_at,updated_at)
                 VALUES(?,?,?,NULL,'NEWS_DELEGATED_V1',NULL,?,?,?,?,
                    ?,?,?,?,'NEWS_ARTICLE','PERMITTED_REPRODUCTION',
                    'AUTHORITATIVE_REVIEWED','NOT_STARTED','UNKNOWN',
                    0,0,NULL,?,?,?,?)"
            )->execute([
                $id,$p['source_authority_id'],
                mb_substr((string)$found['discovered_headline'],0,240),
                $hash,$url,$p['country_code'],$p['educational_level'],
                $p['exam_category'],$p['curriculum_version'],$p['subject_id'],
                (int)gmdate('Y',$now),$found['owner_account_id'],$now,$now,$now
            ]);
            // Every inherited source policy stays within its parent:
            // no faster polling, broader transport, larger downloads or
            // new rights beyond an explicitly time-bounded approved scope.
            $pdo->prepare(
                "INSERT INTO jrei_ka_source_policies
                 (source_id,priority_tier,refresh_interval_seconds,
                  max_document_bytes,min_request_spacing_seconds,
                  rights_reviewed,robots_terms_reviewed,transport_reviewed,
                  rights_evidence_sha256,robots_terms_evidence_sha256,
                  transport_evidence_sha256,scheduling_state,revision,
                  next_due_at,updated_at,approved_by_account_id)
                 VALUES(?,?,?,?,?,1,1,1,?,?,?,'APPROVED',1,?,?,?)"
            )->execute([
                $id,$p['priority_tier'],$p['refresh_interval_seconds'],
                min((int)$p['max_document_bytes'],8388608),
                $p['min_request_spacing_seconds'],
                $p['rights_evidence_sha256'],$p['robots_terms_evidence_sha256'],
                $p['transport_evidence_sha256'],$now,$now,$found['owner_account_id']
            ]);
            $pdo->prepare(
                'INSERT INTO jrei_news_delegated_enrollments
                 (discovery_id,scope_id,article_source_id,source_url_sha256,
                  scope_policy_revision,enrolled_at)
                 VALUES(?,?,?,?,?,?)'
            )->execute([$found['discovery_id'],$found['scope_id'],$id,$hash,
                $found['scope_policy_revision'],$now]);
            $updated=$pdo->prepare(
                "UPDATE jrei_news_discovered_urls SET
                 approved_article_source_id=?,
                 review_state='ORIGINAL_JREI_ARTICLE_APPROVED'
                 WHERE discovery_id=? AND review_state='REQUIRES_ARTICLE_SOURCE_APPROVAL'
                   AND approved_article_source_id IS NULL"
            );
            $updated->execute([$id,$found['discovery_id']]);
            if($updated->rowCount()!==1)
                throw new RuntimeException('news_delegated_article_scope_race');
            $pdo->commit();$summary['enrolled']++;
            $perScope[$scopeKey]=$used+1;
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            $summary['pending']++;
            // Failure codes are visible only to private monitoring; never
            // expose source URLs or DB internals in an HTTP response.
            error_log('JREI delegated source enrollment held: '.get_class($e));
        }
    }
    return $summary;
}

/**
 * Private Cron expiry reconciliation: not an arbitrary periodic rights
 * extension. The owner can only re-authorize through original MFA with a
 * NEW evidence-bound scope. A revoked/expired delegated scope cannot keep
 * silently acquiring article content through old inherited source records.
 */
function jrNewsRevokeExpiredOfficialSourceEnrollments(
    PDO $pdo,array $ctx,int $now,int $limit=50
):array{
    if(($ctx['source']??null)!=='ORIGINAL_JREI_PRIVATE_NEWS_WORKER'||
       ($ctx['originalServerSessionVerified']??null)!==true||
       ($ctx['delegatedOfficialScopesEnabled']??null)!==true||
       $now<=0||$limit<1||$limit>100)
       throw new RuntimeException('news_delegated_expiry_private_worker_required');
    $q=$pdo->prepare(
        'SELECT g.scope_id
           FROM jrei_news_delegated_scopes g
           WHERE (g.expires_at<=? OR g.revoked_at IS NOT NULL)
             AND EXISTS (
               SELECT 1 FROM jrei_news_delegated_enrollments e
               JOIN jrei_exam_sources s ON s.source_id=e.article_source_id
               WHERE e.scope_id=g.scope_id AND s.is_revoked=0
             )
           ORDER BY g.expires_at,g.scope_id LIMIT ?'
    );
    $q->bindValue(1,$now,PDO::PARAM_INT);
    $q->bindValue(2,$limit,PDO::PARAM_INT);
    $q->execute();
    $stopped=0;
    $scopes=$q->fetchAll(PDO::FETCH_COLUMN);
    foreach($scopes as $scope){
        $pdo->beginTransaction();
        try{
            $up=$pdo->prepare(
                'UPDATE jrei_exam_sources s
                  JOIN jrei_news_delegated_enrollments e
                    ON e.article_source_id=s.source_id
                  JOIN jrei_news_delegated_scopes g ON g.scope_id=e.scope_id
                   SET s.is_revoked=1,s.updated_at=?
                 WHERE e.scope_id=?
                   AND s.source_version=?
                   AND s.is_revoked=0
                   AND (g.expires_at<=? OR g.revoked_at IS NOT NULL)'
            );
            $up->execute([$now,$scope,'NEWS_DELEGATED_V1',$now]);
            $stopped+=$up->rowCount();
            $pdo->commit();
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }
    return ['checkedScopes'=>count($scopes),
        'revokedDelegatedArticleSources'=>$stopped,
        'historicallyPublishedPagesRetracted'=>false];
}
