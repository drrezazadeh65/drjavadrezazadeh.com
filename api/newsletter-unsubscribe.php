<?php
declare(strict_types=1);
/**
 * Newsletter e-mail opt-out capability, no login or second mailing database.
 * GET displays a confirmation; only a token-authenticated POST can withdraw.
 * A mailbox link scanner or search crawler must NEVER change consent by GET.
 *
 * Reuse the domain-separated site authentication pepper, not any SMTP/API key.
 * Token authorises only withdrawal; it never authorises account access.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

function jrNewsletterUnsubscribeToken(string $accountId,string $email): string {
    $pepper=(string)(cfg()['auth_pepper']??'');
    if(strlen($pepper)<32)throw new RuntimeException('unsubscribe_config_unavailable');
    return hash_hmac('sha256','newsletter-unsubscribe-v1|'.$accountId.'|'.strtolower($email),$pepper);
}
function jrNewsletterUnsubscribeUrl(string $accountId,string $email,string $locale='en'): string {
    if(!in_array($locale,['fa','en'],true))throw new InvalidArgumentException('invalid_locale');
    if(!validUuid($accountId))throw new InvalidArgumentException('invalid_account_id');
    return SITE_ORIGIN.'/api/newsletter/unsubscribe?'.http_build_query([
        'a'=>$accountId,'t'=>jrNewsletterUnsubscribeToken($accountId,$email),'l'=>$locale
    ],'','&',PHP_QUERY_RFC3986);
}

/**
 * Suppress the six consented marketing topics, NOT transactional or security
 * messages. Acquires the preference rows before modifying the existing queue.
 * A future sender must also check and lock these rows before delivery.
 */
function jrNewsletterOptoutApply(PDO $pdo,string $accountId,string $locale): int {
    if(!in_array($locale,['fa','en'],true))throw new InvalidArgumentException('invalid_locale');
    if(!jrNewsletterSchemaReady($pdo))throw new RuntimeException('newsletter_schema_unavailable');
    $topics=jrNewsletterTopics();
    $placeholders=implode(',',array_fill(0,count($topics),'?'));
    $now=gmdate('Y-m-d H:i:s').'.000';
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare("SELECT id,purpose_code,opted_in FROM eco_notification_preferences
          WHERE account_id=? AND channel_code='EMAIL' AND purpose_code IN ($placeholders) FOR UPDATE");
        $q->execute(array_merge([$accountId],$topics));
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $active=array_values(array_filter($rows,static fn($r)=>(int)$r['opted_in']===1));
        if($active){
            $notice=jrNewsletterNotice($locale);
            $pdo->prepare('INSERT INTO eco_consent_notices
                (id,purpose_code,version_label,locale,notice_sha256,effective_at)
                VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id')
                ->execute([uuidv4(),JR_NEWSLETTER_PURPOSE,JR_NEWSLETTER_VERSION,
                    $locale,hash('sha256',$notice),$now]);
            $n=$pdo->prepare('SELECT id FROM eco_consent_notices
                WHERE purpose_code=? AND version_label=? AND locale=? LIMIT 1');
            $n->execute([JR_NEWSLETTER_PURPOSE,JR_NEWSLETTER_VERSION,$locale]);
            $noticeId=(string)$n->fetchColumn();
            if(!validUuid($noticeId))throw new RuntimeException('newsletter_notice_unavailable');
            $ins=$pdo->prepare('INSERT INTO eco_consent_records
              (id,account_id,notice_id,decision,lawful_basis,evidence_sha256,
               granted_at,withdrawn_at,source_code) VALUES(?,?,?,?,?,?,?,?,?)');
            $upd=$pdo->prepare("UPDATE eco_notification_preferences
              SET opted_in=0,consent_record_id=?,changed_at=?
              WHERE id=? AND opted_in=1");
            foreach($active as $row){
                $consentId=uuidv4();
                $ins->execute([$consentId,$accountId,$noticeId,'WITHDRAWN','CONSENT',
                    hash('sha256',$accountId.'|'.$row['purpose_code'].'|WITHDRAWN|'.$consentId),
                    $now,$now,'NEWSLETTER_EMAIL_LINK']);
                $upd->execute([$consentId,$now,$row['id']]);
            }
        }
        // Existing mother queue, never a parallel subscriber list.
        // Do not suppress password reset, account, order or other service mail.
        jrNewsletterSuppressPending($pdo,$accountId,$topics);
        $pdo->commit();
        return count($active);
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

function jrNewsletterUnsubscribePage(string $locale,bool $done=false,bool $invalid=false,
    string $account='',string $token=''): never {
    $fa=$locale==='fa';
    $heading=$fa?'لغو عضویت خبرنامه':'Unsubscribe from updates';
    $msg=$invalid?($fa?'این پیوند معتبر نیست. از بخش تنظیمات حساب استفاده کنید.':
        'This link is invalid. Please use your account settings.')
        :($done?($fa?'عضویت خبرنامه لغو شد. پیام‌های خدماتی حساب تحت تأثیر قرار نمی‌گیرند.':
          'Your newsletter preferences have been withdrawn. Essential account messages remain available.')
        :($fa?'برای توقف ایمیل‌های اختیاری خبرنامه، دکمهٔ زیر را انتخاب کنید.':
          'Confirm below to stop optional newsletter emails.'));
    $lang=$fa?'fa':'en';$dir=$fa?'rtl':'ltr';
    $esc=static fn(string $s):string=>htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Security-Policy: default-src \'none\'; style-src \'unsafe-inline\'; form-action \'self\'; base-uri \'none\'; frame-ancestors \'none\'');
    header('Referrer-Policy: no-referrer');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    header('Cache-Control: no-store, private, max-age=0');
    $form=(!$done&&!$invalid)
        ?'<form action="/api/newsletter/unsubscribe" method="post">
          <input type="hidden" name="a" value="'.$esc($account).'">
          <input type="hidden" name="t" value="'.$esc($token).'">
          <input type="hidden" name="l" value="'.$lang.'">
          <button type="submit">'.($fa?'تأیید لغو عضویت':'Confirm unsubscribe').'</button></form>':'';
    echo '<!doctype html><html lang="'.$lang.'" dir="'.$dir.'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'.$heading.'</title>
    <style>*,*:before,*:after{box-sizing:border-box}body{margin:0;background:#0B0B0B;color:#F8F5E9;font-family:Tahoma,Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:1.25rem}
    main{width:min(100%,38rem);padding:clamp(1.5rem,6vw,3rem);border:1px solid #A88955;border-radius:1.25rem;background:#1F1F1F}
    h1{font-size:clamp(1.6rem,5vw,2.3rem);line-height:1.4;margin:0 0 1.25rem;color:#D4AF37}p{line-height:1.9}
    button{min-height:48px;border:1px solid #D4AF37;background:#D4AF37;color:#0B0B0B;padding:.9rem 1.5rem;border-radius:.65rem;font-size:1rem;cursor:pointer}
    a{color:#E9CF87;display:inline-block;margin-top:1.5rem}a:focus-visible,button:focus-visible{outline:3px solid #F8F5E9;outline-offset:4px}
    @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style></head><body><main><h1>'.$heading.'</h1><p>'.$esc($msg).'</p>'.$form.
    '<a href="'.SITE_ORIGIN.'/'.($fa?'fa/customer-dashboard/':'en/account/').'">'.($fa?'تنظیمات حساب':'Account settings').'</a></main></body></html>';
    exit;
}
function jrNewsletterUnsubscribeRoute(string $verb): never {
    if(!in_array($verb,['GET','POST'],true))fail('method_not_allowed',405);
    $data=$verb==='POST'?$_POST:$_GET;
    $locale=($data['l']??'en')==='fa'?'fa':'en';
    $account=$data['a']??null;$token=$data['t']??null;
    if(!is_string($account)||!validUuid($account)||
       !is_string($token)||preg_match('/^[a-f0-9]{64}$/D',$token)!==1)
        jrNewsletterUnsubscribePage($locale,false,true);
    if($verb==='GET')jrNewsletterUnsubscribePage($locale,false,false,$account,$token);
    $type=strtolower((string)($_SERVER['CONTENT_TYPE']??''));
    if(!str_starts_with($type,'application/x-www-form-urlencoded')||
       (int)($_SERVER['CONTENT_LENGTH']??0)>2048||
       !in_array(strtolower((string)($_SERVER['HTTP_SEC_FETCH_SITE']??'none')),
         ['same-origin','none'],true)||
       (!empty($_SERVER['HTTP_ORIGIN'])&&$_SERVER['HTTP_ORIGIN']!==SITE_ORIGIN))
        fail('invalid_unsubscribe_request',403);
    $pdo=db();
    if(!$pdo||!jrNewsletterSchemaReady($pdo))fail('newsletter_unavailable',503);
    try{
        $q=$pdo->prepare('SELECT email_normalized FROM customer_accounts WHERE id=? LIMIT 1');
        $q->execute([$account]);$email=$q->fetchColumn();
        if(!is_string($email)||!hash_equals(jrNewsletterUnsubscribeToken($account,$email),$token))
            jrNewsletterUnsubscribePage($locale,false,true);
        // Never call rateAllowed inside a transaction: it owns one itself.
        if(!rateAllowed($pdo,'newsletter_unsubscribe',$account,12,3600))
            fail('rate_limited',429);
        jrNewsletterOptoutApply($pdo,$account,$locale);
        jrNewsletterUnsubscribePage($locale,true);
    }catch(Throwable $e){
        error_log('newsletter optout unavailable: '.get_class($e));
        fail('newsletter_unavailable',503);
    }
}
