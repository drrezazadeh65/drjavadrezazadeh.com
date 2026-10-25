<?php
declare(strict_types=1);
/** Original eco_notifications/outbox + native SMTP only. No extra user or
 * mail system, invisible marketing opt-in or publication authentication.
 * PRIVATE digest references bind at most 20 genuinely indexed CMS articles.
 * No SMTP call from this source module until the original Cron invokes it.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/standing-official-publication.php';
require_once __DIR__.'/original-eco-compatibility.php';
require_once __DIR__.'/eco-digest-composer.php';

function jrNewsOriginalDigestArticleProof(PDO $pdo,string $publicationId,
    string $language,string $expectedSha,string $expectedRoute,
    string $expectedEditorialDigest,string $root):?array{
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$publicationId)||
       !in_array($language,['fa','en'],true)||
       !preg_match('/^[a-f0-9]{64}$/D',$expectedSha)||
       !preg_match('/^[a-f0-9]{64}$/D',$expectedEditorialDigest)||
       !preg_match('#^/'.($language==='fa'?'fa/akhbar':'en/news-insights').
         '/[a-z0-9-]{5,100}/$#D',$expectedRoute))return null;
    $standing=jrNewsStandingPublicSchemaInstalled($pdo);
    $joins=$standing?
        'LEFT JOIN jrei_news_owner_decisions d ON d.decision_id=p.approved_decision_id
         LEFT JOIN jrei_news_standing_policies pol ON pol.policy_id=p.standing_policy_id':
        'JOIN jrei_news_owner_decisions d ON d.decision_id=p.approved_decision_id';
    $sql="SELECT p.publication_id,p.fa_route,p.en_route,
                 p.publisher_state,p.publisher_receipt_reference,
                 p.fa_content_sha256,p.en_content_sha256,
                 v.approval_digest
          FROM jrei_news_publications p
          JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
          ".$joins."
          WHERE p.publication_id=?
            AND p.publisher_state='PUBLISHED'
            AND p.published_at IS NOT NULL
            AND p.publisher_receipt_reference IS NOT NULL
            AND ".jrNewsPublicationAuthorityPredicate($standing)."
          LIMIT 1";
    $q=$pdo->prepare($sql);$q->execute([$publicationId]);
    $pub=$q->fetch(PDO::FETCH_ASSOC);
    if(!$pub||$pub[$language.'_route']!==$expectedRoute||
       !hash_equals((string)$pub[$language.'_content_sha256'],$expectedSha)||
       !hash_equals((string)$pub['approval_digest'],$expectedEditorialDigest))
        return null;
    $q=$pdo->prepare(
        "SELECT title FROM jrei_news_search_documents
         WHERE publication_id=? AND language_code=?
           AND index_state='PUBLISHED' AND BINARY public_route=BINARY ?
           AND BINARY content_sha256=BINARY ? LIMIT 1"
    );
    $q->execute([$publicationId,$language,$expectedRoute,$expectedSha]);
    $title=$q->fetchColumn();
    if(!is_string($title)||$title===''||strlen($title)>720)return null;
    $resolved=realpath($root);
    if($resolved===false)return null;
    $file=$resolved.DIRECTORY_SEPARATOR.
        str_replace('/',DIRECTORY_SEPARATOR,trim($expectedRoute,'/')).
        DIRECTORY_SEPARATOR.'index.html';
    if(is_link($file)||!is_file($file)||!is_readable($file)||
       filesize($file)>450000||
       !hash_equals($expectedSha,(string)hash_file('sha256',$file)))
        return null;
    return [
        'source'=>'ORIGINAL_AUTHENTICATED_PUBLISHER_RECEIPT',
        'publisherState'=>'PUBLISHED',
        'retracted'=>false,'locale'=>$language,'route'=>$expectedRoute,
        'headline'=>$title,'contentSha256'=>$expectedSha,
        'ownerApprovalDigest'=>$expectedEditorialDigest,
        'publicationId'=>$publicationId
    ];
}

function jrNewsOriginalEcoEnqueueDigest(
    PDO $pdo,array $intent,array $privateCronAuthority,int $now):array {
    if($now<=0||
       ($privateCronAuthority['source']??null)!==
           'EXISTING_OPERATIONS_CRON_SIGNED_DISPATCH'||
       ($privateCronAuthority['signedJobVerified']??null)!==true||
       ($privateCronAuthority['existingEcoEnabled']??null)!==true||
       ($intent['schema']??null)!=='jr.jrei.news-articles-digest-intent.v1'||
       ($intent['purpose']??null)!=='ARTICLES'||
       ($intent['channel']??null)!=='EMAIL'||
       !in_array($intent['locale']??null,['fa','en'],true)||
       !in_array($intent['digestMode']??null,['URGENT','DAILY','WEEKLY','EXAM_ONLY'],true)||
       !is_array($intent['items']??null)||
       count($intent['items'])<1||count($intent['items'])>20||
       !preg_match('/^[a-f0-9-]{36}$/iD',(string)($intent['accountId']??''))||
       !preg_match('/^[a-f0-9-]{36}$/iD',(string)($intent['consentReference']??''))||
       !preg_match('/^[a-f0-9]{64}$/D',(string)($intent['idempotencyKey']??'')))
       throw new InvalidArgumentException('news_eco_digest_original_job_invalid');
    $consent=jrNewsReadOriginalArticlesConsent($pdo,$intent['accountId'],'ARTICLES','EMAIL');
    if(($consent['granted']??null)!==true||
       ($consent['reference']??null)!==$intent['consentReference'])
        return ['source'=>'ORIGINAL_ECO_NEWS_DIGEST_OUTBOX',
            'purpose'=>'ARTICLES',
            'idempotencyKey'=>$intent['idempotencyKey'],'state'=>'SKIPPED_CONSENT'];
    $root=realpath(dirname(__DIR__,3));
    if($root===false)throw new RuntimeException('news_digest_original_site_root_unavailable');
    foreach($intent['items'] as $row){
        if(!is_array($row)||!is_string($row['url']??null))
            throw new InvalidArgumentException('news_digest_untrusted_item');
        $parsed=parse_url($row['url']);
        if(!is_array($parsed)||($parsed['scheme']??null)!=='https'||
           ($parsed['host']??null)!=='drjavadrezazadeh.com'||
           !is_string($parsed['path']??null)||
           isset($parsed['query'])||isset($parsed['fragment']))
            throw new InvalidArgumentException('news_digest_public_route_invalid');
        if(!jrNewsOriginalDigestArticleProof($pdo,
            (string)($row['publicationId']??''),
            $intent['locale'],(string)($row['contentSha256']??''),
            $parsed['path'],(string)($row['ownerApprovalDigest']??''),$root))
            throw new RuntimeException('news_digest_original_cms_receipt_missing');
    }
    $body=json_encode($intent['items'],
        JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    if(strlen($body)>24000)
        throw new InvalidArgumentException('news_digest_item_manifest_too_large');
    $sha=hash('sha256',$body);
    $key=$intent['idempotencyKey'];
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare(
            "SELECT package_id FROM jrei_news_eco_digest_packages
             WHERE BINARY digest_idempotency_sha256=BINARY ? FOR UPDATE");
        $q->execute([$key]);
        if($q->fetchColumn()){
            $pdo->commit();
            return ['source'=>'ORIGINAL_ECO_NEWS_DIGEST_OUTBOX',
                'purpose'=>'ARTICLES','idempotencyKey'=>$key,
                'state'=>'ALREADY_QUEUED'];
        }
        $package=jrNewsPrivateUuid();
        $object=jrNewsPrivateUuid();
        $notification=jrNewsPrivateUuid();
        $created=gmdate('Y-m-d H:i:s',$now).'.000';
        $pdo->prepare(
            "INSERT INTO eco_object_refs
             (id,storage_provider,object_reference,content_sha256,
              mime_type,byte_size,data_class,malware_scan_status)
             VALUES(?,'JR_JREI_PRIVATE_NEWS_DIGEST',?,?,
               'application/json',?,'PRIVATE','NOT_APPLICABLE')"
        )->execute([$object,'jrei-news-digest:'.$package,$sha,strlen($body)]);
        $pdo->prepare(
            "INSERT INTO jrei_news_eco_digest_packages
             (package_id,recipient_account_id,consent_record_id,
              eco_object_ref_id,locale_code,digest_mode,
              digest_idempotency_sha256,payload_json,payload_sha256,
              item_count,created_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)"
        )->execute([$package,$intent['accountId'],$consent['reference'],$object,
            $intent['locale'],$intent['digestMode'],$key,$body,$sha,
            count($intent['items']),$now]);
        $pdo->prepare(
            "INSERT INTO eco_notifications
             (id,recipient_account_id,channel_code,purpose_code,
              message_object_id,delivery_state,idempotency_key,created_at)
             VALUES(?,?,'EMAIL','ARTICLES',?,'PENDING',?,?)"
        )->execute([$notification,$intent['accountId'],$object,$key,$created]);
        $pdo->commit();
        return ['source'=>'ORIGINAL_ECO_NEWS_DIGEST_OUTBOX',
            'purpose'=>'ARTICLES','idempotencyKey'=>$key,
            'state'=>'QUEUED','smtpSent'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/** Called AFTER native jrNewsletterReserve(), which guarantees no retries
 * on ambiguous SMTP delivery. Locks current original ARTICLES consent and
 * recomputes every listed on-disk/CMS/News-search hash before SMTP.
 */
function jrNewsSendOriginalEcoDigestReserved(PDO $pdo,string $notificationId,
    array $originalPrivateCron,callable $transport,int $now):string{
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$notificationId)||$now<=0||
       ($originalPrivateCron['source']??null)!=='EXISTING_OPERATIONS_CRON_SIGNED_DISPATCH'||
       ($originalPrivateCron['signedJobVerified']??null)!==true||
       ($originalPrivateCron['existingEcoEnabled']??null)!==true)
        throw new RuntimeException('news_digest_delivery_original_cron_required');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare(
            "SELECT n.id,n.recipient_account_id,n.delivery_state,
                    a.email_normalized,a.email_verified_at,a.status AS account_status,
                    o.storage_provider,o.object_reference,o.content_sha256,
                    o.data_class,p.package_id,p.consent_record_id,
                    p.locale_code,p.digest_mode,p.payload_json,
                    p.payload_sha256,p.item_count
             FROM eco_notifications n
             JOIN eco_object_refs o ON o.id=n.message_object_id
             JOIN jrei_news_eco_digest_packages p ON p.eco_object_ref_id=o.id
                AND p.recipient_account_id=n.recipient_account_id
             JOIN customer_accounts a ON a.id=n.recipient_account_id
             WHERE n.id=? AND n.channel_code='EMAIL' AND n.purpose_code='ARTICLES'
             FOR UPDATE"
        );
        $q->execute([$notificationId]);
        $n=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($n)||$n['delivery_state']!=='RESERVED'||
           $n['storage_provider']!=='JR_JREI_PRIVATE_NEWS_DIGEST'||
           $n['data_class']!=='PRIVATE'||
           $n['object_reference']!=='jrei-news-digest:'.$n['package_id']||
           !hash_equals((string)$n['payload_sha256'],hash('sha256',(string)$n['payload_json']))||
           !hash_equals((string)$n['content_sha256'],(string)$n['payload_sha256']))
            throw new RuntimeException('news_digest_private_package_unverified');
        $consent=jrNewsReadOriginalArticlesConsent(
            $pdo,$n['recipient_account_id'],'ARTICLES','EMAIL');
        $eligible=$n['account_status']==='active'&&
            !empty($n['email_verified_at'])&&
            filter_var($n['email_normalized'],FILTER_VALIDATE_EMAIL)!==false&&
            ($consent['granted']??null)===true&&
            ($consent['reference']??null)===$n['consent_record_id'];
        if(!$eligible){
            $pdo->prepare("UPDATE eco_notifications SET
              delivery_state='SUPPRESSED' WHERE id=? AND delivery_state='RESERVED'")
              ->execute([$notificationId]);
            $pdo->prepare("UPDATE eco_notification_attempts SET
              result_code='SUPPRESSED' WHERE notification_id=? AND attempt_no=1")
              ->execute([$notificationId]);
            $pdo->commit();return 'SUPPRESSED';
        }
        $data=json_decode((string)$n['payload_json'],true,24,JSON_THROW_ON_ERROR);
        if(!is_array($data)||count($data)!==(int)$n['item_count']||
           count($data)<1||count($data)>20)
            throw new RuntimeException('news_digest_original_manifest_invalid');
        $site=realpath(dirname(__DIR__,3));
        if($site===false)
            throw new RuntimeException('news_digest_site_unavailable');
        $items=[];
        foreach($data as $row){
            $parsed=parse_url((string)($row['url']??''));
            if(!is_array($parsed)||($parsed['scheme']??null)!=='https'||
               ($parsed['host']??null)!=='drjavadrezazadeh.com'||
               !is_string($parsed['path']??null))
                throw new RuntimeException('news_digest_url_changed');
            $proof=jrNewsOriginalDigestArticleProof(
                $pdo,(string)($row['publicationId']??''),
                $n['locale_code'],(string)($row['contentSha256']??''),
                $parsed['path'],(string)($row['ownerApprovalDigest']??''),$site);
            if($proof===null)
                throw new RuntimeException('news_digest_original_article_withdrawn');
            $items[]=$proof;
        }
        require_once dirname(__DIR__,3).'/api/newsletter-unsubscribe.php';
        $url=jrNewsletterUnsubscribeUrl($n['recipient_account_id'],
            $n['email_normalized'],$n['locale_code']);
        $mail=jrNewsComposeVerifiedDigestEmail([
            'source'=>'ORIGINAL_ECO_NEWS_DIGEST_WORKER',
            'signedJobVerified'=>true,'ownerNewsDistributionEnabled'=>true,
            'originalPublisherProofRechecked'=>true
        ],$consent,$items,$n['locale_code'],$url,$now);
        $accepted=false;
        try{
            $accepted=$transport($n['email_normalized'],
                $mail['subject'],$mail['plainTextBody'])===true;
        }catch(Throwable $ignored){$accepted=false;}
        $state=$accepted?'SMTP_ACCEPTED':'SMTP_FAILED';
        $pdo->prepare('UPDATE eco_notifications SET delivery_state=?
            WHERE id=? AND delivery_state=?')
            ->execute([$state,$notificationId,'RESERVED']);
        $pdo->prepare('UPDATE eco_notification_attempts SET result_code=?
            WHERE notification_id=? AND attempt_no=1')
            ->execute([$state,$notificationId]);
        $pdo->commit();
        return $state;
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
