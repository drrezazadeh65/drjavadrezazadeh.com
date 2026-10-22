<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/bahar-private-workbook.php';

/**
 * Super-admin, fresh-MFA education privacy switch inside existing mother DB.
 * Neither observing the schema nor switching the owner flag authorizes a
 * study, a paid product, public admission prediction or an actual child record.
 */
function operationsBaharPrivatePolicy(PDO $pdo): array {
    $required=[
      'eco_bahar_account_workbook_policy',
      'eco_bahar_verified_adult_accounts',
      'eco_bahar_account_workbooks',
      'eco_consent_notices','eco_consent_records','eco_audit_events',
      // Erasure and lawful-retention flows are mandatory for private
      // storage readiness, not optional endpoints enabled later.
      'eco_legal_holds','eco_subjects',
      'eco_privacy_requests','eco_privacy_actions'
    ];
    $present=[];
    try{
        $args=implode(',',array_fill(0,count($required),'?'));
        $q=$pdo->prepare('SELECT table_name FROM information_schema.tables
          WHERE table_schema=DATABASE() AND table_name IN ('.$args.')');
        $q->execute($required);
        $present=$q->fetchAll(PDO::FETCH_COLUMN)?:[];
    }catch(Throwable $e){$present=[];}
    $missing=array_values(array_diff($required,$present));
    $keyReady=baharAccountKey()!==null;
    $environmentEnabled=baharAccountFeatureAllowed();
    $notices=['fa'=>false,'en'=>false];
    $ownerEnabled=false;$reviewEvidence=false;$policyAvailable=false;
    if(!$missing){
        try {
            foreach(['fa','en'] as $locale){
                $notices[$locale]=baharAccountCurrentNotice($pdo,$locale)!==null;
            }
            $q=$pdo->query("SELECT p.enabled,p.scientific_review_sha256,
              p.privacy_review_sha256,p.release_gate_approved_at,
              p.release_gate_approved_by_account_id,
              p.updated_at,
              a.role,a.enabled AS approver_enabled
              FROM eco_bahar_account_workbook_policy p
              LEFT JOIN operations_admin_memberships a
                ON a.account_id=p.release_gate_approved_by_account_id
              WHERE p.singleton_id=1 LIMIT 1");
            $row=$q->fetch(PDO::FETCH_ASSOC);
            if(is_array($row)){
                $policyAvailable=true;
                $ownerEnabled=(int)$row['enabled']===1;
                $reviewEvidence=(
                    preg_match('/^[a-f0-9]{64}$/D',(string)($row['scientific_review_sha256']??''))===1
                    && preg_match('/^[a-f0-9]{64}$/D',(string)($row['privacy_review_sha256']??''))===1
                    && (string)($row['scientific_review_sha256']??'')!==
                       (string)($row['privacy_review_sha256']??'')
                    && ($row['release_gate_approved_at']??null)!==null
                    && ($row['role']??'')==='SUPER_ADMIN'
                    && (int)($row['approver_enabled']??0)===1
                );
            }
        }catch(Throwable $e){$policyAvailable=false;$reviewEvidence=false;}
    }
    $canEnable=$policyAvailable&&$keyReady&&$environmentEnabled&&
      $notices['fa']&&$notices['en']&&$reviewEvidence;
    $effectiveEnabled=$canEnable&&$ownerEnabled;
    return [
      'ok'=>true,'schema'=>'jr.bahar-private-storage-owner-policy.v1',
      'state'=>!$policyAvailable?'SCHEMA_OR_POLICY_NOT_PROVISIONED':
        ($effectiveEnabled?'OWNER_SWITCH_ENABLED':
        ($reviewEvidence?'OWNER_SWITCH_OFF_OR_ENV_DISABLED':
          'INDEPENDENT_REVIEW_EVIDENCE_MISSING')),
      'readOnly'=>false,'administrativeSwitchAvailable'=>$policyAvailable,
      'ownerSwitchEnabled'=>$ownerEnabled,'effectiveEnabled'=>$effectiveEnabled,
      'environmentMasterSwitchEnabled'=>$environmentEnabled,
      'privateEncryptionKeyConfigured'=>$keyReady,
      'independentScientificAndPrivacyApprovalsRecorded'=>$reviewEvidence,
      'approvedConsentNoticeFa'=>$notices['fa'],
      'approvedConsentNoticeEn'=>$notices['en'],
      'additiveDatabaseTablesMissing'=>$missing,
      'canEnable'=>$canEnable,'canReadSensitiveDataFromThisEndpoint'=>false,
      'automaticAdultVerification'=>false,'automaticStudentAccountProvisioning'=>false,
      'automaticConsentCollection'=>false,'paidContentActivation'=>false,
      'privacyOrScientificValidationCertified'=>false,
      'limitations'=>'Database and source readiness do not prove privacy compliance or successful encryption on the production host. The owner switch is default-off and final integrated acceptance is still required.'
    ];
}
function operationsBaharPrivatePolicySave(
  PDO $pdo,bool $enabled,string $actor,int $now
): array {
    $status=operationsBaharPrivatePolicy($pdo);
    if(!$status['administrativeSwitchAvailable'])
        throw new RuntimeException('bahar_policy_schema_unavailable');
    if($enabled&&!$status['canEnable'])
        throw new DomainException('independent_release_evidence_missing');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT p.enabled,p.scientific_review_sha256,
           p.privacy_review_sha256,p.release_gate_approved_by_account_id,
           p.release_gate_approved_at,
           a.role AS approver_role,a.enabled AS approver_enabled
           FROM eco_bahar_account_workbook_policy p
           LEFT JOIN operations_admin_memberships a
             ON a.account_id=p.release_gate_approved_by_account_id
           WHERE p.singleton_id=1 FOR UPDATE');
        $q->execute();
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row))throw new RuntimeException('policy_row_missing');
        // A successful prior GET is not durable authorization; re-evaluate
        // the evidence inside the locked transaction on enable.
        if($enabled){
            $valid=(
              preg_match('/^[a-f0-9]{64}$/D',(string)($row['scientific_review_sha256']??''))===1
              && preg_match('/^[a-f0-9]{64}$/D',(string)($row['privacy_review_sha256']??''))===1
              && $row['scientific_review_sha256']!==$row['privacy_review_sha256']
              && !empty($row['release_gate_approved_by_account_id'])
              && !empty($row['release_gate_approved_at'])
              && ($row['approver_role']??'')==='SUPER_ADMIN'
              && (int)($row['approver_enabled']??0)===1
              && baharAccountKey()!==null
              && baharAccountFeatureAllowed()
              && baharAccountCurrentNotice($pdo,'fa')!==null
              && baharAccountCurrentNotice($pdo,'en')!==null
            );
            if(!$valid)throw new DomainException('readiness_changed');
        }
        $update=$pdo->prepare('UPDATE eco_bahar_account_workbook_policy
            SET enabled=?,changed_by_account_id=?,
                updated_at=UTC_TIMESTAMP(3) WHERE singleton_id=1');
        $update->execute([$enabled?1:0,$actor]);
        $audit=$pdo->prepare('INSERT INTO operations_audit
          (actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)');
        $audit->execute([$actor,$enabled?'bahar_private_adult_storage_enabled':
          'bahar_private_adult_storage_disabled','eco_bahar_account_workbook_policy',$now]);
        $pdo->commit();
        return operationsBaharPrivatePolicy($pdo);
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/**
 * SUPER_ADMIN source-evidence registration, never live activation.
 * Hashes are generated from independently reviewed documents held offsite
 * and stored without those documents. No fake research approval is inferred.
 */
function operationsBaharRecordReviewEvidence(
  PDO $pdo,array $input,string $owner
): array {
    $science=$input['scientificReviewSha256']??null;
    $privacy=$input['privacyReviewSha256']??null;
    if(!is_string($science)||preg_match('/^[a-f0-9]{64}$/D',$science)!==1||
      !is_string($privacy)||preg_match('/^[a-f0-9]{64}$/D',$privacy)!==1||
      hash_equals($science,$privacy)||
      ($input['confirmation']??null)!=='I REVIEWED TWO INDEPENDENT BAHAR RELEASE DOCUMENTS')
      throw new InvalidArgumentException('invalid_scientific_privacy_review_evidence');
    $pdo->beginTransaction();
    try{
      $q=$pdo->query('SELECT singleton_id FROM eco_bahar_account_workbook_policy
        WHERE singleton_id=1 FOR UPDATE');
      if(!$q->fetchColumn())throw new RuntimeException('owner_policy_schema_unavailable');
      $update=$pdo->prepare('UPDATE eco_bahar_account_workbook_policy
        SET scientific_review_sha256=?,privacy_review_sha256=?,
        release_gate_approved_by_account_id=?,
        release_gate_approved_at=UTC_TIMESTAMP(3),
        enabled=0,changed_by_account_id=?,updated_at=UTC_TIMESTAMP(3)
        WHERE singleton_id=1');
      $update->execute([$science,$privacy,$owner,$owner]);
      $audit=$pdo->prepare('INSERT INTO operations_audit
        (actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)');
      $audit->execute([$owner,'bahar_review_evidence_recorded',
        hash('sha256',$science.'|'.$privacy),nowTs()]);
      $pdo->commit();
    }catch(Throwable $error){
      if($pdo->inTransaction())$pdo->rollBack();
      throw $error;
    }
    $current=operationsBaharPrivatePolicy($pdo);
    return [
      'ok'=>true,'schema'=>'jr.bahar-owner-review-evidence.v1',
      'ownerEvidenceRecorded'=>true,
      'privatelyStoredRawDocuments'=>false,
      'privateStorageStillOff'=>$current['ownerSwitchEnabled']===false,
      'scientificValidationCertified'=>false,
      'ownerPolicy'=>$current
    ];
}
/**
 * Explicit super-admin approval of the two CURRENT source-controlled
 * purpose-specific texts, after reviewing externally available legal advice.
 * Idempotent matching notices are preserved and NEVER rewritten in place.
 */
function operationsBaharRegisterConsentNotices(
  PDO $pdo,array $input,string $owner
): array {
    $privacy=$input['privacyReviewSha256']??null;
    if(!is_string($privacy)||preg_match('/^[a-f0-9]{64}$/D',$privacy)!==1||
       ($input['confirmation']??null)!==
         'I APPROVE THE CURRENT BILINGUAL BAHAR PRIVACY NOTICES')
      throw new InvalidArgumentException('unreviewed_privacy_notice');
    $pdo->beginTransaction();
    try{
      $lock=$pdo->query("SELECT privacy_review_sha256,
         release_gate_approved_by_account_id
         FROM eco_bahar_account_workbook_policy
         WHERE singleton_id=1 FOR UPDATE");
      $record=$lock->fetch(PDO::FETCH_ASSOC);
      if(!is_array($record)||!hash_equals(
        (string)$record['privacy_review_sha256'],$privacy)||
        (string)$record['release_gate_approved_by_account_id']!==$owner)
        throw new DomainException('independent_owner_privacy_review_required');
      foreach(['fa','en'] as $locale){
        $notice=baharAccountNotice($locale);
        $q=$pdo->prepare('SELECT notice_sha256,effective_at,retired_at
          FROM eco_consent_notices
          WHERE purpose_code=? AND version_label=? AND locale=?
          FOR UPDATE');
        $q->execute([
          JR_BAHAR_ACCOUNT_PURPOSE,$notice['version'],$locale
        ]);
        $prior=$q->fetch(PDO::FETCH_ASSOC);
        if(is_array($prior)){
          // Never resurrect a retired or altered consent notice.
          if(!hash_equals($notice['sha256'],(string)$prior['notice_sha256'])||
             $prior['retired_at']!==null)
             throw new DomainException('versioned_notice_conflict');
        }else{
          $insert=$pdo->prepare('INSERT INTO eco_consent_notices
            (id,purpose_code,version_label,locale,notice_sha256,effective_at)
            VALUES(?,?,?,?,?,UTC_TIMESTAMP(3))');
          $insert->execute([
            uuidv4(),JR_BAHAR_ACCOUNT_PURPOSE,
            $notice['version'],$locale,$notice['sha256']
          ]);
        }
      }
      $audit=$pdo->prepare('INSERT INTO operations_audit
        (actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)');
      $audit->execute([
        $owner,'bahar_versioned_notices_recorded',
        substr($privacy,0,64),nowTs()
      ]);
      $pdo->commit();
    }catch(Throwable $e){
      if($pdo->inTransaction())$pdo->rollBack();
      throw $e;
    }
    $state=operationsBaharPrivatePolicy($pdo);
    return [
      'ok'=>true,'schema'=>'jr.bahar-reviewed-notices.v1',
      'fa'=>$state['approvedConsentNoticeFa'],
      'en'=>$state['approvedConsentNoticeEn'],
      'newConsentGranted'=>false,'paidProductActivated'=>false,
      'adultEligibilityGranted'=>false,'workbookStorageAutoEnabled'=>false,
      'ownerPolicy'=>$state
    ];
}

/** Canonical legal text preview, owner MFA only; never changes consent. */
function operationsBaharConsentNoticePreview(PDO $pdo): array {
    $records=[];
    foreach(['fa','en'] as $locale){
        $notice=baharAccountNotice($locale);
        $current=null;
        try{$current=baharAccountCurrentNotice($pdo,$locale);}catch(Throwable $e){}
        $records[$locale]=[
            'text'=>$notice['text'],
            'version'=>$notice['version'],
            'sha256'=>$notice['sha256'],
            'publishedAsCurrent'=>$current!==null
        ];
    }
    return [
        'ok'=>true,'schema'=>'jr.bahar-consent-notice-preview.v1',
        'readOnly'=>true,'canApprove'=>false,
        'consentNotGranted'=>true,'notices'=>$records,
        'scope'=>'BAHAR_PRIVATE_WORKBOOK_ONLY',
        'humanLegalReviewRequired'=>true,
        'limitation'=>'This preview shows exact source-controlled consent text; its presence is not legal sign-off or user consent.'
    ];
}
