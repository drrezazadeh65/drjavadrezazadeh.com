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
      'eco_legal_holds'
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
        $q=$pdo->prepare('SELECT enabled,scientific_review_sha256,
           privacy_review_sha256,release_gate_approved_by_account_id,
           release_gate_approved_at
           FROM eco_bahar_account_workbook_policy
           WHERE singleton_id=1 FOR UPDATE');
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
