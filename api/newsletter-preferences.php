<?php
declare(strict_types=1);
/**
 * First-party newsletter preferences for VERIFIED account email only.
 * Uses existing eco_ consent/preference tables; never creates another
 * identity or email list. This is NOT a mail sender or an inferred consent.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
const JR_NEWSLETTER_VERSION='newsletter-v1';
const JR_NEWSLETTER_PURPOSE='NEWSLETTER';
function jrNewsletterTopics(): array {
    return ['ARTICLES','BOOKS','EVENTS','SERVICES','GOLDEN_TALENT','JHELA'];
}
function jrNewsletterNotice(string $locale): string {
    return $locale==='fa'
      ? 'با انتخاب هر موضوع، به‌صورت داوطلبانه دریافت ایمیل درباره مطالب جدید منتشرشده آن موضوع را می‌پذیرم. در هر زمان می‌توانم عضویتم را لغو کنم. اطلاعات حساب برای تبلیغات دیگر به‌کار نمی‌رود.'
      : 'By selecting a topic, I voluntarily request email updates about newly published content in that topic. I may withdraw at any time. My account email will not be used for other marketing without separate consent.';
}
function jrNewsletterSchemaReady(PDO $pdo): bool {
    try {
        foreach(['eco_notification_preferences','eco_consent_notices','eco_consent_records'] as $table)
            $pdo->query('SELECT 1 FROM '.$table.' LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}
function jrNewsletterActor(PDO $pdo): array {
    $account=sessionAccount($pdo);
    if(!is_array($account)||($account['status']??'')!=='active'||empty($account['email_verified_at'])||
       !validUuid((string)($account['id']??'')))fail('verified_account_required',401);
    return $account;
}
function jrNewsletterCsrf(array $account): string {
    $pepper=(string)(cfg()['auth_pepper']??'');
    $cookie=(string)($_COOKIE[SESSION_COOKIE]??'');
    if(strlen($pepper)<32||$cookie==='')fail('csrf_unavailable',503);
    return hash_hmac('sha256','newsletter-v1|'.tokenHash($cookie).'|'.(string)$account['id'],$pepper);
}
function jrNewsletterChosen(array $body): array {
    $chosen=$body['topics']??null;
    if(!is_array($chosen)||count($chosen)>count(jrNewsletterTopics()))fail('invalid_topics',400);
    $valid=jrNewsletterTopics();$out=[];
    foreach($chosen as $topic){
        if(!is_string($topic)||!in_array($topic,$valid,true)||in_array($topic,$out,true))fail('invalid_topics',400);
        $out[]=$topic;
    }
    return $out;
}
function jrNewsletterRoute(string $path,string $verb): never {
    if($path==='/newsletter/health' && $verb==='GET'){
        $pdo=db();$ready=$pdo instanceof PDO && authReady() && jrNewsletterSchemaReady($pdo);
        respond(['ok'=>true,'service'=>'verified-account-newsletter',
            'schema'=>'newsletter-preferences-v1','ready'=>$ready,
            'verifiedAccountRequired'=>true,'explicitTopicOptInRequired'=>true,
            'deliveryVerified'=>false,'separateDeliveryActivationRequired'=>true]);
    }
    if($path!=='/newsletter/preferences')fail('not_found',404);
    if(!in_array($verb,['GET','POST'],true))fail('method_not_allowed',405);
    $pdo=db();if(!$pdo||!authReady())fail('newsletter_unavailable',503);
    $actor=jrNewsletterActor($pdo);$id=(string)$actor['id'];
    if(!jrNewsletterSchemaReady($pdo))fail('newsletter_unavailable',503);
    if($verb==='GET'){
        $q=$pdo->prepare("SELECT purpose_code,opted_in,changed_at FROM eco_notification_preferences WHERE account_id=? AND channel_code='EMAIL'");
        $q->execute([$id]);$all=[];
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row)
            if(in_array((string)$row['purpose_code'],jrNewsletterTopics(),true))
                $all[(string)$row['purpose_code']]=(int)$row['opted_in']===1;
        $selected=array_values(array_filter(jrNewsletterTopics(),static fn($topic)=>$all[$topic]??false));
        respond(['ok'=>true,'schema'=>'newsletter-preferences-v1','topics'=>jrNewsletterTopics(),
            'selected'=>$selected,'consentVersion'=>JR_NEWSLETTER_VERSION,
            'csrfToken'=>jrNewsletterCsrf($actor),'emailVerified'=>true,'deliveryActive'=>false]);
    }
    // Enforce cookie-session CSRF protection in addition to strict same-origin.
    if(($_SERVER['HTTP_ORIGIN']??'')!==SITE_ORIGIN||
       strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin'))==='cross-site'||
       !hash_equals(jrNewsletterCsrf($actor),(string)($_SERVER['HTTP_X_JR_NEWSLETTER_CSRF']??'')))
         fail('csrf_or_origin_forbidden',403);
    $b=jsonBody();$selected=jrNewsletterChosen($b);
    if(($b['consentVersion']??null)!==JR_NEWSLETTER_VERSION)fail('invalid_consent_version',400);
    $locale=$b['locale']??null;if(!in_array($locale,['fa','en'],true))fail('invalid_locale',400);
    if($selected && (($b['consentGiven']??null)!==true||($b['adultConfirmed']??null)!==true))
        fail('explicit_adult_consent_required',400);
    if(!rateAllowed($pdo,'newsletter_preferences',$id,10,3600))fail('rate_limited',429);
    $notice=jrNewsletterNotice($locale);
    $noticeHash=hash('sha256',$notice);
    $now=gmdate('Y-m-d H:i:s.u');
    try{
        $pdo->beginTransaction();
        $q=$pdo->prepare("SELECT purpose_code,opted_in FROM eco_notification_preferences WHERE account_id=? AND channel_code='EMAIL' FOR UPDATE");
        $q->execute([$id]);$old=[];
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $r)$old[(string)$r['purpose_code']]=(int)$r['opted_in']===1;
        $changed=[];
        foreach(jrNewsletterTopics() as $topic){
            $enabled=in_array($topic,$selected,true);
            if(($old[$topic]??false)===$enabled)continue;
            $changed[]=['topic'=>$topic,'subscribed'=>$enabled];
        }
        if($changed){
            $noticeId=uuidv4();
            $pdo->prepare('INSERT INTO eco_consent_notices(id,purpose_code,version_label,locale,notice_sha256,effective_at) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id')
                ->execute([$noticeId,JR_NEWSLETTER_PURPOSE,JR_NEWSLETTER_VERSION,$locale,$noticeHash,$now]);
            $lookup=$pdo->prepare('SELECT id FROM eco_consent_notices WHERE purpose_code=? AND version_label=? AND locale=? LIMIT 1');
            $lookup->execute([JR_NEWSLETTER_PURPOSE,JR_NEWSLETTER_VERSION,$locale]);
            $noticeId=(string)$lookup->fetchColumn();
            if(!validUuid($noticeId))throw new RuntimeException('consent_notice_missing');
            $insertConsent=$pdo->prepare('INSERT INTO eco_consent_records(id,account_id,notice_id,decision,lawful_basis,evidence_sha256,granted_at,withdrawn_at,source_code) VALUES(?,?,?,?,?,?,?,?,?)');
            $insertPref=$pdo->prepare("INSERT INTO eco_notification_preferences(id,account_id,purpose_code,channel_code,opted_in,consent_record_id,changed_at) VALUES(?,?,?,'EMAIL',?,?,?) ON DUPLICATE KEY UPDATE opted_in=VALUES(opted_in),consent_record_id=VALUES(consent_record_id),changed_at=VALUES(changed_at)");
            foreach($changed as $row){
                $consentId=uuidv4();$enabled=$row['subscribed'];
                $evidence=hash('sha256',$noticeHash.'|'.$id.'|'.$row['topic'].'|'.($enabled?'GRANTED':'WITHDRAWN').'|'.$now);
                $insertConsent->execute([$consentId,$id,$noticeId,$enabled?'GRANTED':'WITHDRAWN','CONSENT',$evidence,$now,$enabled?null:$now,'NEWSLETTER_SETTINGS']);
                $insertPref->execute([uuidv4(),$id,$row['topic'],$enabled?1:0,$consentId,$now]);
            }
        }
        $pdo->commit();
        respond(['ok'=>true,'schema'=>'newsletter-preferences-v1','selected'=>$selected,
            'changedTopics'=>count($changed),'subscribedEmailDeliveryVerified'=>false,
            'meaning'=>'Opt-in preferences recorded; email delivery requires the separate verified outbound worker.']);
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        error_log('newsletter consent mutation unavailable: '.get_class($e));
        fail('newsletter_preferences_unavailable',503);
    }
}
