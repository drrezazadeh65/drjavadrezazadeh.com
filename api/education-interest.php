<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * User-first education interest, source-only guest invitation.
 *
 * ONE optional popup may submit an email + declared education interest. This
 * creates a PENDING encrypted record; it is NOT a newsletter subscriber until
 * the mailbox owner verifies the first-party email. Marketing, advertising,
 * scientific datasets, sales, school rankings and account access are unrelated.
 * No account/password/phone/name is required to continue free education.
 *
 * Gated off by environment, verified SMTP, key and owner policy until the
 * new mother-database migration and independent release authorization.
 */
const JR_EDU_INTEREST_NOTICE_VERSION='2026-10-edu-interest-v1';
const JR_EDU_INTEREST_SCOPE='EDUCATIONAL_INFORMATION_EMAIL';
function jrInterestNeeds(): array {
    return ['TALENT','STUDY','SCORES','UNIVERSITY','GROWTH','CHOICES'];
}
function jrInterestNotice(string $locale): string {
    return $locale==='en'
      ? 'You can give us your email and one learning interest to receive occasional first-party educational guidance on that topic. We will only email after you verify your address. Your email is not sold, shared for advertising, or used for aptitude scores or admission predictions. You can withdraw through the private link in your confirmation email. You can continue all free learning without joining.'
      : 'اگر مایل باشید، ایمیل و یک موضوع آموزشی را ثبت می‌کنیم تا پس از تأیید ایمیل، راهنماهای آموزشی مرتبط را گاهی برایتان ارسال کنیم. ایمیل شما فروخته نمی‌شود، برای تبلیغات دیگران به اشتراک گذاشته نمی‌شود و برای نمره‌دهی استعداد یا پیش‌بینی قبولی به کار نمی‌رود. لینک انصراف در ایمیل تأیید قرار می‌گیرد. استفاده از تمام مراحل رایگان بدون ثبت‌نام امکان‌پذیر است.';
}
function jrInterestPrivateKey(): ?array {
    $id=cfg()['edu_interest_key_id']??'';
    $b64=cfg()['edu_interest_key_b64']??'';
    if(!is_string($id)||!preg_match('/^[A-Za-z0-9._-]{3,64}$/D',$id)||
        !is_string($b64)||!function_exists('openssl_encrypt')||
        !function_exists('openssl_decrypt'))return null;
    $raw=base64_decode($b64,true);
    return is_string($raw)&&strlen($raw)===32
      ?['id'=>$id,'key'=>$raw,
         'hmacKey'=>hash_hmac('sha256','jr.edu-interest-email-index-v1',$raw,true)]
      :null;
}
function jrInterestSchemaReady(PDO $pdo): bool {
    try{
        foreach(['eco_education_interest_policy','eco_education_interest_leads',
            'eco_education_interest_consent_events'] as $table)
            $pdo->query('SELECT 1 FROM '.$table.' LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}
function jrInterestOwnerEnabled(PDO $pdo): bool {
    $q=$pdo->query('SELECT enabled FROM eco_education_interest_policy WHERE singleton_id=1 LIMIT 1');
    return (int)$q->fetchColumn()===1;
}
function jrInterestFeatureReady(PDO $pdo): bool {
    return (cfg()['edu_interest_enabled']??false)===true &&
       jrInterestPrivateKey()!==null && mailReady() &&
       jrInterestSchemaReady($pdo) && jrInterestOwnerEnabled($pdo);
}
function jrInterestEmailDigest(string $email,array $secret): string {
    return hash_hmac('sha256',$email,$secret['hmacKey']);
}
function jrInterestSeal(string $email,string $id,array $secret): array {
    $nonce=random_bytes(12);$tag='';
    $cipher=openssl_encrypt($email,'aes-256-gcm',$secret['key'],
      OPENSSL_RAW_DATA,$nonce,$tag,'jr.edu-interest.v1|'.$id.'|'.$secret['id'],16);
    if(!is_string($cipher)||strlen($tag)!==16)
      throw new RuntimeException('email_encryption_failed');
    return ['cipher'=>$cipher,'nonce'=>$nonce,'tag'=>$tag];
}
function jrInterestUnseal(array $row,array $secret): ?string {
    if(($row['encryption_key_id']??null)!==$secret['id']||
       !is_string($row['email_cipher']??null)||
       !is_string($row['email_nonce']??null)||
       strlen($row['email_nonce'])!==12||
       !is_string($row['email_tag']??null)||
       strlen($row['email_tag'])!==16)return null;
    $email=openssl_decrypt($row['email_cipher'],'aes-256-gcm',
      $secret['key'],OPENSSL_RAW_DATA,$row['email_nonce'],$row['email_tag'],
      'jr.edu-interest.v1|'.$row['id'].'|'.$secret['id']);
    return is_string($email)&&validEmail($email)?$email:null;
}
function jrInterestConsentEvent(PDO $pdo,string $leadId,string $event,
    string $noticeHash,int $at): void {
    if(!in_array($event,['SUBMITTED','EMAIL_VERIFIED','WITHDRAWN','EXPIRED'],true))
       throw new InvalidArgumentException('invalid_interest_consent_event');
    $q=$pdo->prepare('INSERT INTO eco_education_interest_consent_events
      (lead_id,event_code,consent_version,notice_sha256,occurred_at)
      VALUES (?,?,?,?,?)');
    $q->execute([$leadId,$event,JR_EDU_INTEREST_NOTICE_VERSION,$noticeHash,$at]);
}
function jrInterestSafeEmailLink(string $locale,string $action,string $token): string {
    // Token belongs ONLY in URL fragment (not a server request path/query).
    // Client reads it and POSTs securely, then immediately removes fragment.
    $path=$locale==='en'?'/en/my-path/':'/fa/masir-man/';
    return SITE_ORIGIN.$path.'#edu-interest-'.$action.'='.$token;
}
function jrInterestSubmit(PDO $pdo,array $body): never {
    if(!jrInterestFeatureReady($pdo))fail('education_updates_not_enabled',503);
    $locale=$body['locale']??null;
    $need=$body['interest']??null;
    $email=$body['email']??null;
    if(!in_array($locale,['fa','en'],true)||
       !is_string($need)||!in_array($need,jrInterestNeeds(),true)||
       !is_string($email)||strlen($email)>254||!validEmail(trim($email))||
       ($body['consent']??null)!==true||
       ($body['purpose']??null)!==JR_EDU_INTEREST_SCOPE||
       ($body['noticeVersion']??null)!==JR_EDU_INTEREST_NOTICE_VERSION||
       ($body['noticeSha256']??null)!==hash('sha256',jrInterestNotice($locale))||
       ($body['marketingForOtherPurposes']??false)!==false)
        fail('invalid_or_unconsented_interest',422);
    $email=emailNorm($email);$secret=jrInterestPrivateKey();
    if($secret===null)fail('education_updates_not_enabled',503);
    // Both independent limits matter: varying addresses cannot evade the
    // per-IP global budget, and one mailbox is bounded across IP addresses.
    if(!rateAllowed($pdo,'edu_interest_ip','single_popup',5,3600))
        fail('rate_limited',429);
    $digest=jrInterestEmailDigest($email,$secret);
    if(!rateAllowed($pdo,'edu_interest_email',$digest,3,86400))
        fail('rate_limited',429);
    $now=nowTs();$noticeHash=hash('sha256',jrInterestNotice($locale));
    $token=bin2hex(random_bytes(32));
    $withdraw=bin2hex(random_bytes(32));
    $verificationHash=hash('sha256',$token);
    $withdrawHash=hash('sha256',$withdraw);
    $id=uuidv4();$send=true;
    try{
        $pdo->beginTransaction();
        $q=$pdo->prepare('SELECT id,status,educational_need,preferred_locale,
          consent_version,consent_notice_sha256,encryption_key_id,
          expires_at,last_invitation_at,verification_expires_at
          FROM eco_education_interest_leads WHERE email_hmac=? FOR UPDATE');
        $q->execute([$digest]);$existing=$q->fetch(PDO::FETCH_ASSOC);
        if(is_array($existing)){
            $id=(string)$existing['id'];
            // Do not leak whether an email already exists, and never send
            // another verification for an unchanged active subscription.
            $sameScope=($existing['educational_need']??'')===$need &&
               ($existing['preferred_locale']??'')===$locale &&
               ($existing['consent_version']??'')===JR_EDU_INTEREST_NOTICE_VERSION &&
               hash_equals($noticeHash,(string)$existing['consent_notice_sha256']);
            if(
              (($existing['status']??'')==='VERIFIED' &&
               (int)($existing['expires_at']??0)>$now) ||
              ($sameScope && ($existing['status']??'')==='PENDING' &&
               (int)($existing['last_invitation_at']??0)>$now-600 &&
               (int)($existing['verification_expires_at']??0)>$now)
            ){
                // IMPORTANT: An unverified stranger who knows someone else's
                // email must never be able to revoke, retarget or reset
                // an existing verified topic subscription. Only a holder of
                // the signed withdrawal link can cancel it before reopt-in.
                $send=false;
            }else{
                $sealed=jrInterestSeal($email,$id,$secret);
                $update=$pdo->prepare("UPDATE eco_education_interest_leads SET
                  encryption_key_id=?,email_cipher=?,email_nonce=?,email_tag=?,
                  educational_need=?,preferred_locale=?,
                  consent_version=?,consent_notice_sha256=?,consent_given_at=?,
                  status='PENDING',verification_token_hash=?,
                  verification_expires_at=?,withdrawal_token_hash=?,
                  verified_at=NULL,withdrawn_at=NULL,last_invitation_at=?,
                  expires_at=?,updated_at=?
                  WHERE id=?");
                $update->execute([$secret['id'],$sealed['cipher'],$sealed['nonce'],$sealed['tag'],
                  $need,$locale,JR_EDU_INTEREST_NOTICE_VERSION,$noticeHash,$now,
                  $verificationHash,$now+48*3600,$withdrawHash,$now,
                  $now+48*3600,$now,$id]);
                jrInterestConsentEvent($pdo,$id,'SUBMITTED',$noticeHash,$now);
            }
        }else{
            $sealed=jrInterestSeal($email,$id,$secret);
            $insert=$pdo->prepare("INSERT INTO eco_education_interest_leads
              (id,email_hmac,encryption_key_id,email_cipher,email_nonce,email_tag,
               educational_need,preferred_locale,consent_version,consent_notice_sha256,
               consent_given_at,status,verification_token_hash,verification_expires_at,
               withdrawal_token_hash,last_invitation_at,expires_at,created_at,updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,'PENDING',?,?,?,?,?,?,?)");
            $insert->execute([$id,$digest,$secret['id'],$sealed['cipher'],
              $sealed['nonce'],$sealed['tag'],$need,$locale,
              JR_EDU_INTEREST_NOTICE_VERSION,$noticeHash,$now,
              $verificationHash,$now+48*3600,$withdrawHash,
              $now,$now+48*3600,$now,$now]);
            jrInterestConsentEvent($pdo,$id,'SUBMITTED',$noticeHash,$now);
        }
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        fail('education_updates_unavailable',503);
    }
    if($send){
        $verifyLink=jrInterestSafeEmailLink($locale,'confirm',$token);
        $withdrawLink=jrInterestSafeEmailLink($locale,'withdraw',$withdraw);
        $subject=$locale==='en'?'Confirm educational updates from Dr. Rezazadeh':
            'تأیید دریافت راهنمای آموزشی دکتر رضازاده';
        $mail=$locale==='en'
            ?"You requested first-party guidance related to your selected learning interest.\n".
             "Confirm this email address to subscribe:\n".$verifyLink."\n\n".
             "Decline or withdraw any time:\n".$withdrawLink."\n\n".
             "If you did not request this, ignore the email. Nothing is sent before verification."
            :"شما دریافت اختیاری راهنماهای آموزشی مرتبط با موضوع انتخابی را درخواست کردید.\n".
             "برای تأیید ایمیل و شروع عضویت، این پیوند را باز کنید:\n".$verifyLink."\n\n".
             "برای انصراف می‌توانید از این پیوند استفاده کنید:\n".$withdrawLink."\n\n".
             "اگر این درخواست متعلق به شما نیست، نامه را نادیده بگیرید. پیش از تأیید، خبرنامه‌ای ارسال نمی‌شود.";
        // The existing site SMTP transport is used. Never log the recipient
        // or verification secrets, and never claim an email was delivered
        // merely because a record was written.
        if(!smtpSend($email,$subject,$mail))
            fail('confirmation_email_not_sent',503);
    }
    respond(['ok'=>true,'schema'=>'jr.education-interest-submission.v1',
      'state'=>'EMAIL_VERIFICATION_IF_REQUIRED',
      'verifiedByThisRequest'=>false,'marketingActivated'=>false,
      'emailDeliveryConfirmed'=>false,
      'message'=>$locale==='en'?
         'Check your inbox for a verification link if this is a new request.':
         'اگر درخواست شما جدید باشد، پیوند تأیید به ایمیل ارسال شده است.'],202);
}
function jrInterestProcessEmailToken(PDO $pdo,array $body,string $action): never {
    $token=$body['token']??null;
    if(!is_string($token)||!preg_match('/^[a-f0-9]{64}$/D',$token))
        fail('invalid_confirmation_token',422);
    if(!jrInterestSchemaReady($pdo))fail('education_updates_unavailable',503);
    if(!rateAllowed($pdo,'edu_interest_confirmation','token',20,3600))
        fail('rate_limited',429);
    $now=nowTs();$hash=hash('sha256',$token);
    try{
        $pdo->beginTransaction();
        if($action==='confirm'){
            $q=$pdo->prepare("SELECT id,status,consent_version,
              consent_notice_sha256,preferred_locale,verification_expires_at,
              expires_at FROM eco_education_interest_leads
              WHERE verification_token_hash=? FOR UPDATE");
        }else{
            $q=$pdo->prepare("SELECT id,status,consent_version,
              consent_notice_sha256,preferred_locale,verification_expires_at,
              expires_at FROM eco_education_interest_leads
              WHERE withdrawal_token_hash=? FOR UPDATE");
        }
        $q->execute([$hash]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||($row['status']??'')==='WITHDRAWN'||
           (int)($row['expires_at']??0)<=$now)
            throw new DomainException('invalid_or_expired');
        $locale=(string)$row['preferred_locale'];
        if(!in_array($locale,['fa','en'],true)||
           $row['consent_version']!==JR_EDU_INTEREST_NOTICE_VERSION||
           !hash_equals(hash('sha256',jrInterestNotice($locale)),
              (string)$row['consent_notice_sha256']))
            throw new DomainException('notice_not_current');
        if($action==='confirm'){
            if(($row['status']??'')!=='PENDING'||
               (int)($row['verification_expires_at']??0)<=$now)
                throw new DomainException('expired_confirmation');
            $q=$pdo->prepare("UPDATE eco_education_interest_leads SET
              status='VERIFIED',verified_at=?,verification_token_hash=NULL,
              verification_expires_at=NULL,expires_at=?,updated_at=?
              WHERE id=? AND status='PENDING'");
            $q->execute([$now,$now+365*86400,$now,$row['id']]);
            if($q->rowCount()!==1)throw new RuntimeException('confirmation_conflict');
            jrInterestConsentEvent($pdo,(string)$row['id'],
                'EMAIL_VERIFIED',(string)$row['consent_notice_sha256'],$now);
        }else{
            $q=$pdo->prepare("UPDATE eco_education_interest_leads SET
              status='WITHDRAWN',withdrawn_at=?,
              email_cipher='',email_nonce='',email_tag='',
              verification_token_hash=NULL,verification_expires_at=NULL,
              withdrawal_token_hash=?,
              expires_at=?,updated_at=?
              WHERE id=?");
            // Rotate the withdrawal token immediately after consumption;
            // encrypted contact details are irreversibly discarded.
            $q->execute([$now,hash('sha256',bin2hex(random_bytes(32))),
              $now+30*86400,$now,$row['id']]);
            jrInterestConsentEvent($pdo,(string)$row['id'],
                'WITHDRAWN',(string)$row['consent_notice_sha256'],$now);
        }
        $pdo->commit();
        respond(['ok'=>true,'schema'=>'jr.education-interest-email-action.v1',
          'action'=>$action==='confirm'?'VERIFIED':'WITHDRAWN',
          'noPaymentOrLearningScore'=>true,
          'emailAddressReturned'=>false,
          'automaticMarketingForOtherPurposes'=>false]);
    }catch(DomainException $e){
        if($pdo->inTransaction())$pdo->rollBack();
        fail('expired_or_invalid_interest_link',410);
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        fail('interest_confirmation_unavailable',503);
    }
}
function jrEducationInterestRoute(string $path,string $verb): never {
    header('Cache-Control: no-store, private, max-age=0');
    header('X-Robots-Tag: noindex, noarchive, nosnippet');
    header('Referrer-Policy: no-referrer');
    if($path==='/education-interest/capabilities'&&$verb==='GET'){
        $db=db();$available=$db instanceof PDO&&jrInterestFeatureReady($db);
        respond(['ok'=>true,'schema'=>'jr.education-interest-capabilities.v1',
          'available'=>$available,'guestCanContinueFree'=>true,
          'subscriptionRequiresMailVerification'=>true,
          'marketingWithoutConsentEnabled'=>false,
          'purposes'=>[JR_EDU_INTEREST_SCOPE],
          'consentNoticeVersion'=>JR_EDU_INTEREST_NOTICE_VERSION,
          'needCodes'=>jrInterestNeeds(),
          'notices'=>['fa'=>jrInterestNotice('fa'),
                     'en'=>jrInterestNotice('en')]]);
    }
    if(!in_array($path,[
        '/education-interest/subscribe',
        '/education-interest/verify',
        '/education-interest/withdraw'
      ],true)||$verb!=='POST')fail('not_found',404);
    if(($_SERVER['HTTP_ORIGIN']??'')!==SITE_ORIGIN||
       !in_array($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin',
          ['same-origin','none'],true))fail('origin_forbidden',403);
    $db=db();if(!$db)fail('education_updates_unavailable',503);
    $body=jsonBody();
    if($path==='/education-interest/subscribe')
       jrInterestSubmit($db,$body);
    jrInterestProcessEmailToken($db,$body,
      $path==='/education-interest/verify'?'confirm':'withdraw');
}
