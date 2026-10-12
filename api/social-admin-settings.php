<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Social management catalogue for the existing MFA-only operations console.
 * Preferences and account intentions do not authorize sending or create OAuth
 * tokens. Provider credentials must only be provisioned by a private exchange.
 */
function socialChannels(): array {
    return [
       'instagram'=>['fa'=>'اینستاگرام','en'=>'Instagram','method'=>'meta_oauth','official'=>'https://developers.facebook.com/docs/instagram-platform/','note'=>'Professional account; official app scopes, media and review required'],
       'facebook'=>['fa'=>'فیسبوک','en'=>'Facebook','method'=>'meta_pages_oauth','official'=>'https://developers.facebook.com/docs/pages-api/','note'=>'Managed Pages only; no personal-profile auto publishing'],
       'x'=>['fa'=>'ایکس / توییتر','en'=>'X','method'=>'oauth_pkce','official'=>'https://docs.x.com/x-api/posts/create-post','note'=>'User OAuth, write scope and API budget required'],
       'telegram'=>['fa'=>'تلگرام','en'=>'Telegram','method'=>'bot_api','official'=>'https://core.telegram.org/bots/api','note'=>'Channel admin Bot and verified chat_id; private server token'],
       'eitaa'=>['fa'=>'ایتا','en'=>'Eitaa','method'=>'eitaayar','official'=>'https://eitaayar.ir/','note'=>'Official destination permissions must be tested; channel posting not assumed'],
       'aparat'=>['fa'=>'آپارات','en'=>'Aparat','method'=>'manual_upload','official'=>'https://www.aparat.com/','note'=>'Manual video upload until approved API support confirmed'],
       'whatsapp'=>['fa'=>'واتساپ بیزینس','en'=>'WhatsApp Business','method'=>'business_api','official'=>'https://developers.facebook.com/docs/whatsapp/cloud-api/','note'=>'Only recipient opt-in/approved templates, not public Status automation'],
       'youtube'=>['fa'=>'یوتیوب','en'=>'YouTube','method'=>'google_oauth','official'=>'https://developers.google.com/youtube/v3/docs/videos/insert','note'=>'youtube.upload OAuth and eligible video, processing and quota checks'],
       'linkedin'=>['fa'=>'لینکدین','en'=>'LinkedIn','method'=>'oauth','official'=>'https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api','note'=>'Member/organization permissions and policy review'],
       'threads'=>['fa'=>'تردز','en'=>'Threads','method'=>'meta_threads_oauth','official'=>'https://developers.facebook.com/docs/threads/','note'=>'Official Threads permissions and publishing limits'],
       'bluesky'=>['fa'=>'بلواسکای','en'=>'Bluesky','method'=>'oauth_or_app_password','official'=>'https://docs.bsky.app/','note'=>'No primary social password collection; adapter not wired'],
       'pinterest'=>['fa'=>'پینترست','en'=>'Pinterest','method'=>'oauth','official'=>'https://developers.pinterest.com/','note'=>'Board and Pin creation eligibility; adapter not wired'],
       'tiktok'=>['fa'=>'تیک‌تاک','en'=>'TikTok','method'=>'oauth','official'=>'https://developers.tiktok.com/','note'=>'Reviewed Video Posting API and media required'],
       'mastodon'=>['fa'=>'ماستودون','en'=>'Mastodon','method'=>'instance_oauth','official'=>'https://docs.joinmastodon.org/client/intro/','note'=>'Instance-specific approved OAuth required'],
       'discord'=>['fa'=>'دیسکورد','en'=>'Discord','method'=>'webhook','official'=>'https://discord.com/developers/docs/resources/webhook','note'=>'Private webhook URL, permissioned destination; adapter not wired'],
       'googlebusiness'=>['fa'=>'پروفایل کسب‌وکار گوگل','en'=>'Google Business Profile','method'=>'review_only','official'=>'https://business.google.com/','note'=>'Posting API availability and account eligibility not yet confirmed']
    ];
}
function socialSettingsReady(PDO $pdo):bool {
    try{
        foreach(['social_channel_settings','social_connection_intents','social_accounts'] as $table){
            $pdo->query('SELECT 1 FROM '.$table.' LIMIT 0');
        }
        return true;
    }catch(Throwable $e){return false;}
}
function socialSettingsSnapshot(PDO $pdo):array {
    $catalogue=socialChannels();
    $settings=null;$intents=null;$accounts=null;
    try {
       $q=$pdo->query('SELECT provider,draft_enabled,draft_locale,approval_mode,
            daily_draft_limit,preferred_local_time,utm_campaign,updated_at FROM social_channel_settings');
       $settings=[];
       foreach($q->fetchAll() as $r)$settings[(string)$r['provider']]=[
          'draftEnabled'=>(int)$r['draft_enabled']===1,
          'draftLocale'=>(string)$r['draft_locale'],
          'approvalMode'=>(string)$r['approval_mode'],
          'dailyDraftLimit'=>(int)$r['daily_draft_limit'],
          'preferredLocalTime'=>(string)$r['preferred_local_time'],
          'utmCampaign'=>(string)$r['utm_campaign'],
          'updatedAt'=>(int)$r['updated_at']
       ];
    }catch(Throwable $e){$settings=null;}
    try {
       $q=$pdo->query("SELECT id,provider,public_handle,status,created_at,updated_at
          FROM social_connection_intents ORDER BY updated_at DESC,id LIMIT 100");
       $intents=array_map(static fn($r)=>[
           'id'=>(string)$r['id'],'provider'=>(string)$r['provider'],
           'publicHandle'=>(string)$r['public_handle'],
           'status'=>(string)$r['status'],'createdAt'=>(int)$r['created_at'],
           'updatedAt'=>(int)$r['updated_at']
       ],$q->fetchAll());
    }catch(Throwable $e){$intents=null;}
    try {
       $q=$pdo->query('SELECT provider,display_handle,status,verified_at,expires_at
           FROM social_accounts ORDER BY provider,display_handle LIMIT 100');
       $accounts=array_map(static fn($r)=>[
           'provider'=>(string)$r['provider'],
           'handle'=>(string)$r['display_handle'],
           'storedStatus'=>(string)$r['status'],
           'storedVerifiedAt'=>$r['verified_at']===null?null:(int)$r['verified_at'],
           'expiresAt'=>$r['expires_at']===null?null:(int)$r['expires_at'],
           'liveConnectionVerified'=>false
       ],$q->fetchAll());
    }catch(Throwable $e){$accounts=null;}
    return [
       'ok'=>true,'schema'=>'social-channel-settings-v1','checkedAt'=>time(),
       'serverTimezone'=>'Asia/Tehran','catalogue'=>$catalogue,
       'settings'=>$settings,'connectionIntents'=>$intents,'storedAccounts'=>$accounts,
       'automatedPublishingAvailable'=>false,
       'oauthExchangeAvailable'=>false,
       'limitations'=>[
          'Saving a public handle does not connect or authorize an account.',
          'A stored verified-status record is not proof of a live OAuth session.',
          'Channel preferences never activate scheduled provider publication.'
       ]
    ];
}
function socialSettingsSave(PDO $pdo,array $input,string $actor,int $now):array {
    if(count($input)!==7 || array_keys($input)!==[
      'provider','draftEnabled','draftLocale','approvalMode',
      'dailyDraftLimit','preferredLocalTime','utmCampaign'
    ]) throw new InvalidArgumentException('invalid_setting_keys');
    $provider=$input['provider'];
    if(!is_string($provider)||!isset(socialChannels()[$provider])||
      !is_bool($input['draftEnabled'])||
      !in_array($input['draftLocale'],['fa','en','both'],true)||
      !in_array($input['approvalMode'],['manual','review_required'],true)||
      !is_int($input['dailyDraftLimit'])||$input['dailyDraftLimit']<1||
      $input['dailyDraftLimit']>6||
      !is_string($input['preferredLocalTime'])||
      !preg_match('/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/D',$input['preferredLocalTime'])||
      !is_string($input['utmCampaign'])||
      !preg_match('/^[a-z0-9][a-z0-9_-]{0,63}$/D',$input['utmCampaign']))
      throw new InvalidArgumentException('invalid_channel_setting');
    $pdo->beginTransaction();
    try{
      $q=$pdo->prepare('INSERT INTO social_channel_settings
        (provider,draft_enabled,draft_locale,approval_mode,daily_draft_limit,
        preferred_local_time,utm_campaign,updated_by,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE draft_enabled=VALUES(draft_enabled),
          draft_locale=VALUES(draft_locale),approval_mode=VALUES(approval_mode),
          daily_draft_limit=VALUES(daily_draft_limit),
          preferred_local_time=VALUES(preferred_local_time),
          utm_campaign=VALUES(utm_campaign),
          updated_by=VALUES(updated_by),updated_at=VALUES(updated_at)');
      $q->execute([$provider,$input['draftEnabled']?1:0,$input['draftLocale'],
         $input['approvalMode'],$input['dailyDraftLimit'],
         $input['preferredLocalTime'],$input['utmCampaign'],$actor,$now]);
      $fingerprint=hash('sha256',json_encode($input,JSON_THROW_ON_ERROR));
      $pdo->prepare('INSERT INTO social_audit(actor_id,delivery_id,action,event_at,evidence_digest)
        VALUES(?,NULL,?,?,?)')->execute([$actor,'channel_settings_saved:'.$provider,$now,$fingerprint]);
      $pdo->commit();
      return ['ok'=>true,'provider'=>$provider,'settingsSaved'=>true,
         'automatedPublishingActivated'=>false];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function socialIntentCreate(PDO $pdo,array $input,string $actor,int $now):array {
   if(count($input)!==2 || array_keys($input)!==['provider','publicHandle'] ||
      !is_string($input['provider']) || !isset(socialChannels()[$input['provider']]) ||
      !is_string($input['publicHandle']) ||
      !preg_match('/^[\p{L}\p{N}_.@-]{2,100}$/uD',$input['publicHandle']))
      throw new InvalidArgumentException('invalid_account_intent');
   $bytes=random_bytes(16);$bytes[6]=chr((ord($bytes[6])&15)|64);
   $bytes[8]=chr((ord($bytes[8])&63)|128);
   $id=vsprintf('%s%s-%s-%s-%s-%s%s%s',str_split(bin2hex($bytes),4));
   $pdo->beginTransaction();
   try {
      $q=$pdo->prepare('INSERT INTO social_connection_intents
       (id,provider,public_handle,status,created_by,created_at,updated_at)
       VALUES(?,?,?,\'awaiting_authorization\',?,?,?)');
      $q->execute([$id,$input['provider'],$input['publicHandle'],$actor,$now,$now]);
      $pdo->prepare('INSERT INTO social_audit(actor_id,delivery_id,action,event_at,evidence_digest)
       VALUES(?,NULL,?,?,?)')->execute([$actor,
         'account_authorization_requested:'.$input['provider'],$now,
         hash('sha256',$input['provider'].'|'.$input['publicHandle'])]);
      $pdo->commit();
      return ['ok'=>true,'id'=>$id,'status'=>'awaiting_authorization',
          'connected'=>false,'published'=>false];
   }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
function socialIntentCancel(PDO $pdo,array $input,string $actor,int $now):array {
   if(count($input)!==1||!is_string($input['id']??null)||
     !preg_match('/^[a-f0-9-]{36}$/D',$input['id']))throw new InvalidArgumentException('invalid_intent_id');
   $pdo->beginTransaction();
   try{
      $q=$pdo->prepare("UPDATE social_connection_intents
          SET status='cancelled',updated_at=? WHERE id=? AND status='awaiting_authorization'");
      $q->execute([$now,$input['id']]);
      if($q->rowCount()!==1)throw new DomainException('intent_not_pending');
      $pdo->prepare('INSERT INTO social_audit(actor_id,delivery_id,action,event_at,evidence_digest)
          VALUES(?,NULL,?,?,?)')->execute([$actor,'account_intent_cancelled',$now,
             hash('sha256',$input['id'])]);
      $pdo->commit();
      return ['ok'=>true,'status'=>'cancelled','connected'=>false];
   }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}
