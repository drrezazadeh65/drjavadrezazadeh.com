<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/education-interest.php';

/**
 * MFA SUPER_ADMIN, mother-database only. Owner sees real confirmed interest
 * counts and may explicitly reveal the verified first-party contact list.
 * Not a mass-mailer, not a scientific model, and not an inference from SEO.
 */
function operationsEducationInterestSnapshot(PDO $pdo,bool $withContacts=false): array {
    $base=[
      'ok'=>true,'schema'=>'jr.education-interest-owner-snapshot.v1',
      'state'=>'MOTHER_DATABASE_NOT_PROVISIONED',
      'ownerSwitchEnabled'=>false,'environmentSwitchEnabled'=>
        (cfg()['edu_interest_enabled']??false)===true,
      'smtpReady'=>mailReady(),'encryptionKeyConfigured'=>
        jrInterestPrivateKey()!==null,
      'effectiveCaptureEnabled'=>false,'canEnable'=>false,
      'countsState'=>'UNKNOWN','countByNeed'=>[],
      'pendingCount'=>null,'verifiedCount'=>null,'withdrawnCount'=>null,
      'legacyVerifiedCount'=>null,'stalePendingCount'=>null,
      'contacts'=>null,'contactsTruncated'=>false,
      'containsUnverifiedAddresses'=>false,
      'automaticEmailCampaignEnabled'=>false,
      'scienceOrCustomerEntitlementValidated'=>false,
      'noticeVersion'=>JR_EDU_INTEREST_NOTICE_VERSION,
      'limitations'=>'A source-only opt-in list is not proof of email delivery or permission for unrelated advertising.'
    ];
    if(!jrInterestSchemaReady($pdo))return $base;
    try{
        $switch=jrInterestOwnerEnabled($pdo);
        $base['ownerSwitchEnabled']=$switch;
        $base['canEnable']=$base['environmentSwitchEnabled']&&
           $base['smtpReady']&&$base['encryptionKeyConfigured'];
        $base['effectiveCaptureEnabled']=$switch&&$base['canEnable'];
        $base['state']=$base['effectiveCaptureEnabled']
          ?'CONFIRMATION_SUBJECT_TO_USER_PERMISSION'
          :'OWNER_CONTROLLED_OFF';
        // Count only contacts whose *current* notice and locale actually
        // match the scope the owner is permitted to use. Historical verified
        // subscriptions remain revocable, but never enter a new contact list.
        $currentFa=hash('sha256',jrInterestNotice('fa'));
        $currentEn=hash('sha256',jrInterestNotice('en'));
        $q=$pdo->prepare("SELECT status,educational_need,COUNT(*) AS total,
           SUM(CASE WHEN consent_version=?
             AND ((preferred_locale='fa' AND consent_notice_sha256=?)
               OR (preferred_locale='en' AND consent_notice_sha256=?))
             THEN 1 ELSE 0 END) AS current_notice_total
           FROM eco_education_interest_leads
           WHERE expires_at>? AND status IN ('PENDING','VERIFIED','WITHDRAWN')
           GROUP BY status,educational_need LIMIT 30");
        $q->execute([JR_EDU_INTEREST_NOTICE_VERSION,$currentFa,$currentEn,nowTs()]);
        $totals=['PENDING'=>0,'VERIFIED'=>0,'WITHDRAWN'=>0];
        $legacyVerified=0;$stalePending=0;$needs=[];
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
            $state=(string)($row['status']??'');
            $need=(string)($row['educational_need']??'');
            if(!isset($totals[$state])||
               !in_array($need,jrInterestNeeds(),true))continue;
            $count=max(0,(int)$row['total']);
            $current=max(0,min($count,(int)($row['current_notice_total']??0)));
            if($state==='VERIFIED'){
                $totals[$state]+=$current;
                $legacyVerified+=$count-$current;
                $needs[$need]=($needs[$need]??0)+$current;
            }elseif($state==='PENDING'){
                $totals[$state]+=$current;
                $stalePending+=$count-$current;
            }else{
                $totals[$state]+=$count;
            }
        }
        $base['countsState']='OBSERVED_MOTHER_DATABASE';
        $base['countByNeed']=array_map(
          static fn(string $need):array=>[
            'need'=>$need,'verifiedCount'=>$needs[$need]??0
          ],jrInterestNeeds());
        $base['pendingCount']=$totals['PENDING'];
        $base['verifiedCount']=$totals['VERIFIED'];
        $base['withdrawnCount']=$totals['WITHDRAWN'];
        $base['legacyVerifiedCount']=$legacyVerified;
        $base['stalePendingCount']=$stalePending;
        if(!$withContacts)return $base;
        if(!$base['encryptionKeyConfigured']){
            $base['contacts']=null;$base['state']='CONTACT_DECRYPTION_KEY_UNAVAILABLE';
            return $base;
        }
        $key=jrInterestPrivateKey();
        if($key===null)throw new RuntimeException('missing_interest_key');
        $query=$pdo->prepare("SELECT id,educational_need,preferred_locale,
          email_cipher,email_nonce,email_tag,encryption_key_id,
          verified_at,expires_at
          FROM eco_education_interest_leads
          WHERE status='VERIFIED' AND verified_at IS NOT NULL
            AND consent_version=?
            AND ((preferred_locale='fa' AND consent_notice_sha256=?)
              OR (preferred_locale='en' AND consent_notice_sha256=?))
            AND expires_at>?
          ORDER BY verified_at DESC,id DESC LIMIT 51");
        $query->execute([JR_EDU_INTEREST_NOTICE_VERSION,$currentFa,$currentEn,nowTs()]);
        $items=$query->fetchAll(PDO::FETCH_ASSOC);
        if(!is_array($items))throw new RuntimeException('interest_rows_unavailable');
        $base['contactsTruncated']=count($items)>50;
        $contacts=[];
        foreach(array_slice($items,0,50) as $row){
            $email=jrInterestUnseal($row,$key);
            if($email===null)continue;
            $contacts[]=[
              'id'=>(string)$row['id'],'email'=>$email,
              'interest'=>$row['educational_need'],
              'locale'=>$row['preferred_locale'],
              'verifiedAt'=>(int)$row['verified_at'],
              'expiresAt'=>(int)$row['expires_at'],
              'consentFor'=>JR_EDU_INTEREST_SCOPE,
              'isEmailVerified'=>true
            ];
        }
        $base['contacts']=$contacts;
        return $base;
    }catch(Throwable $e){
        $base['state']='MOTHER_DATABASE_REPORT_UNAVAILABLE';
        $base['countsState']='UNKNOWN';$base['countByNeed']=[];
        $base['pendingCount']=null;$base['verifiedCount']=null;
        $base['withdrawnCount']=null;$base['contacts']=null;
        $base['legacyVerifiedCount']=null;$base['stalePendingCount']=null;
        $base['effectiveCaptureEnabled']=false;$base['canEnable']=false;
        return $base;
    }
}
/** Owner manual master switch, never starts newsletter mailing by itself. */
function operationsEducationInterestOwnerSwitch(PDO $pdo,bool $enable,
    string $accountId): array {
    if(!jrInterestSchemaReady($pdo))throw new RuntimeException('interest_schema_missing');
    if($enable&&(!mailReady()||jrInterestPrivateKey()===null||
      (cfg()['edu_interest_enabled']??false)!==true))
      throw new DomainException('interest_release_prerequisites_missing');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT enabled FROM eco_education_interest_policy
           WHERE singleton_id=1 FOR UPDATE');
        $q->execute();
        if($q->fetchColumn()===false)throw new RuntimeException('interest_policy_missing');
        $update=$pdo->prepare('UPDATE eco_education_interest_policy
           SET enabled=?,updated_by_account_id=?,updated_at=?
           WHERE singleton_id=1');
        $update->execute([$enable?1:0,$accountId,nowTs()]);
        $audit=$pdo->prepare('INSERT INTO operations_audit
          (actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)');
        $audit->execute([$accountId,$enable
          ?'educational_interest_invitation_enabled'
          :'educational_interest_invitation_disabled',
          'eco_education_interest_policy',nowTs()]);
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    return operationsEducationInterestSnapshot($pdo,false);
}
/**
 * Admin may suppress a verified first-party address immediately.
 * This permanently clears decrypted contact bytes from the active table;
 * hashed suppression metadata persists for the limited retention period.
 */
function operationsEducationInterestOwnerSuppress(PDO $pdo,string $leadId,
    string $owner): array {
    if(!validUuid($leadId))throw new InvalidArgumentException('invalid_interest_id');
    $now=nowTs();
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT id,status,consent_notice_sha256
          FROM eco_education_interest_leads WHERE id=? FOR UPDATE');
        $q->execute([$leadId]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||($row['status']??'')!=='VERIFIED')
            throw new DomainException('interest_not_active');
        $update=$pdo->prepare("UPDATE eco_education_interest_leads SET
            status='WITHDRAWN',withdrawn_at=?,
            email_cipher='',email_nonce='',email_tag='',
            verification_token_hash=NULL,verification_expires_at=NULL,
            withdrawal_token_hash=?,expires_at=?,updated_at=? WHERE id=?");
        $update->execute([$now,hash('sha256',bin2hex(random_bytes(32))),
          $now+30*86400,$now,$leadId]);
        jrInterestConsentEvent($pdo,$leadId,'WITHDRAWN',
          (string)$row['consent_notice_sha256'],$now);
        $audit=$pdo->prepare('INSERT INTO operations_audit
            (actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)');
        $audit->execute([$owner,'education_interest_owner_suppressed',
            $leadId,$now]);
        $pdo->commit();
        return ['ok'=>true,'schema'=>'jr.education-interest-owner-suppression.v1',
          'suppressed'=>true,'id'=>$leadId,
          'plaintextContactErased'=>true,'outboundMessagesQueued'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
