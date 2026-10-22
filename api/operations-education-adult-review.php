<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * OWNER-ONLY adult BAHAR eligibility review. Requests contain NO proof of
 * adulthood: an applicant's one-click affirmation is never verification.
 * Only an independently conducted, out-of-band review can result in a
 * SUPER_ADMIN decision. No identity documents are accepted by this endpoint.
 */
function operationsBaharAdultReviewQueue(PDO $pdo,array $options=[]): array {
    $filter=$options['state']??'ALL';
    $page=filter_var($options['page']??1,FILTER_VALIDATE_INT);
    if(!is_string($filter)||
       !in_array($filter,['ALL','PENDING','VERIFIED_ADULT','DECLINED','REVOKED'],true)||
       $page===false||$page<1||$page>200)
        throw new InvalidArgumentException('invalid_adult_review_filters');
    $perPage=50;
    $offset=($page-1)*$perPage;
    try {
        $where="v.review_state IN ('PENDING','VERIFIED_ADULT','DECLINED','REVOKED')";
        if($filter!=='ALL')$where.=" AND v.review_state=?";
        $sql="SELECT v.account_id,v.review_state,v.created_at,

          v.verified_at,v.expires_at,v.revoked_at,v.verifier_evidence_sha256,
          a.email_normalized,a.status AS account_status,
          a.email_verified_at
          FROM eco_bahar_verified_adult_accounts v
          JOIN customer_accounts a ON a.id=v.account_id
          WHERE ".$where."
          ORDER BY CASE v.review_state WHEN 'PENDING' THEN 0
              WHEN 'VERIFIED_ADULT' THEN 1 ELSE 2 END,
              v.updated_at DESC,v.account_id ASC
          LIMIT ".$perPage." OFFSET ".$offset;
        $q=$pdo->prepare($sql);
        $q->execute($filter==='ALL'?[]:[$filter]);
        $items=$q->fetchAll(PDO::FETCH_ASSOC);
        $rollup=$pdo->query("SELECT review_state,COUNT(*) AS amount
           FROM eco_bahar_verified_adult_accounts GROUP BY review_state
           ORDER BY review_state LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);
    } catch(Throwable $e) {
        return [
          'ok'=>true,'schema'=>'jr.bahar-adult-review-queue.v1',
          'state'=>'SCHEMA_NOT_PROVISIONED','readOnly'=>true,
          'canRecordDecision'=>false,'noDocumentsCollected'=>true,
          'records'=>[],'counts'=>[],'page'=>$page,
          'pageSize'=>$perPage,'totalMatching'=>null,'pages'=>null,
          'limitation'=>'Source-only module: the additive mother database tables are not ready.'
        ];
    }
    $rows=[];
    foreach($items as $row){
        if(!validUuid((string)$row['account_id']))continue;
        $rows[]=[
          'accountId'=>(string)$row['account_id'],
          'email'=>(string)$row['email_normalized'],
          'reviewState'=>(string)$row['review_state'],
          'verifiedEmail'=>(($row['email_verified_at']??null)!==null),
          'accountActive'=>(($row['account_status']??'')==='active'),
          'requestedAt'=>$row['created_at']===null?null:(string)$row['created_at'],
          'reviewedAt'=>$row['verified_at']===null?null:(string)$row['verified_at'],
          'expiresAt'=>$row['expires_at']===null?null:(string)$row['expires_at'],
          'revokedAt'=>$row['revoked_at']===null?null:(string)$row['revoked_at'],
          'reviewEvidenceDigestRecorded'=>(
            preg_match('/^[a-f0-9]{64}$/D',
              (string)($row['verifier_evidence_sha256']??''))===1
          )
        ];
    }
    $counts=[];
    foreach($rollup as $item){
        $state=(string)$item['review_state'];
        if(preg_match('/^[A-Z_]{3,24}$/D',$state))
            $counts[$state]=max(0,(int)$item['amount']);
    }
    return [
      'ok'=>true,'schema'=>'jr.bahar-adult-review-queue.v1',
      'state'=>'MANUAL_OUT_OF_BAND_REVIEW_ONLY',
      'readOnly'=>false,'canRecordDecision'=>true,
      'noDocumentsCollected'=>true,'records'=>$rows,'counts'=>$counts,
      'page'=>$page,'pageSize'=>$perPage,'filterState'=>$filter,
      'totalMatching'=>$filter==='ALL'?array_sum($counts):($counts[$filter]??0),
      'pages'=>$filter==='ALL'
          ?(int)ceil(array_sum($counts)/$perPage)
          :(int)ceil(($counts[$filter]??0)/$perPage),
      'resultLimit'=>$perPage,'limitedResults'=>
          ($filter==='ALL'?array_sum($counts):($counts[$filter]??0))>$offset+count($rows),
      'automaticApproval'=>false,'ageInferredFromEmail'=>false,
      'privateStorageAutoEnabled'=>false,
      'limitation'=>'PENDING is an unverified claim. Approvals require independently inspected lawful evidence; SHA-256 records provenance but does not prove the evidence is true.'
    ];
}
function operationsBaharAdultReviewDecide(
    PDO $pdo,array $input,string $reviewer
): array {
    $target=$input['accountId']??null;
    $decision=$input['decision']??null;
    $method=$input['method']??null;
    $evidence=$input['evidenceSha256']??null;
    $confirm=$input['confirmation']??null;
    if(!is_string($target)||!validUuid($target)||$target===$reviewer||
       !in_array($decision,['VERIFIED_ADULT','DECLINED','REVOKED'],true)||
       !is_string($method)||!in_array($method,[
          'IN_PERSON_IDENTITY_REVIEW',
          'CONTRACTED_AGE_ASSURANCE',
          'AUTHORIZED_INDEPENDENT_RECORD_REVIEW'
       ],true)||
       !is_string($evidence)||
       preg_match('/^[a-f0-9]{64}$/D',$evidence)!==1||
       $confirm!=='I INDEPENDENTLY REVIEWED THIS ACCOUNT')
        throw new InvalidArgumentException('invalid_eligibility_review');
    $pdo->beginTransaction();
    try {
        $lock=$pdo->prepare("SELECT v.review_state, a.status,
            a.email_verified_at
           FROM eco_bahar_verified_adult_accounts v
           JOIN customer_accounts a ON a.id=v.account_id
           WHERE v.account_id=? FOR UPDATE");
        $lock->execute([$target]);
        $row=$lock->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row))throw new DomainException('review_request_absent');
        $current=(string)$row['review_state'];
        if($decision==='VERIFIED_ADULT'&&(
            $current!=='PENDING'||$row['status']!=='active'||
            $row['email_verified_at']===null
        ))throw new DomainException('unverified_account_or_nonpending_request');
        if($decision==='DECLINED'&&$current!=='PENDING')
            throw new DomainException('only_pending_may_be_declined');
        if($decision==='REVOKED'&&$current!=='VERIFIED_ADULT')
            throw new DomainException('only_verified_may_be_revoked');
        if($decision==='VERIFIED_ADULT'){
            $q=$pdo->prepare("UPDATE eco_bahar_verified_adult_accounts
                SET review_state='VERIFIED_ADULT',verified_by_account_id=?,
                  verifier_evidence_sha256=?,
                  verified_at=UTC_TIMESTAMP(3),
                  expires_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 1 YEAR),
                  revoked_at=NULL WHERE account_id=? AND review_state='PENDING'");
            $q->execute([$reviewer,$evidence,$target]);
        }elseif($decision==='DECLINED'){
            $q=$pdo->prepare("UPDATE eco_bahar_verified_adult_accounts
                SET review_state='DECLINED',verified_by_account_id=?,
                  verifier_evidence_sha256=?,verified_at=NULL,
                  expires_at=NULL,revoked_at=UTC_TIMESTAMP(3)
                WHERE account_id=? AND review_state='PENDING'");
            $q->execute([$reviewer,$evidence,$target]);
        }else{
            $q=$pdo->prepare("UPDATE eco_bahar_verified_adult_accounts
                SET review_state='REVOKED',verified_by_account_id=?,
                  verifier_evidence_sha256=?,expires_at=UTC_TIMESTAMP(3),
                  revoked_at=UTC_TIMESTAMP(3)
                WHERE account_id=? AND review_state='VERIFIED_ADULT'");
            $q->execute([$reviewer,$evidence,$target]);
        }
        if($q->rowCount()!==1)throw new DomainException('review_state_conflict');
        // Append a privacy-preserving audit record; record only a digest of
        // the externally reviewed source, NEVER document contents.
        $key=hash('sha256',implode('|',[
          'BAHAR_ADULT_ELIGIBILITY_REVIEW',$reviewer,$target,$decision,
          bin2hex(random_bytes(16))
        ]));
        $payload=hash('sha256',implode('|',[$decision,$method,$evidence]));
        $audit=$pdo->prepare("INSERT INTO eco_audit_events
            (event_key,actor_account_id,action_code,entity_kind,entity_id,
             correlation_id,payload_sha256,event_sha256)
             VALUES (?,?, 'BAHAR_ADULT_ELIGIBILITY_REVIEW',
               'ADULT_ACCOUNT_ELIGIBILITY',?,?,?,?)");
        $audit->execute([
          $key,$reviewer,$target,uuidv4(),$payload,
          hash('sha256',$key.'|'.$payload)
        ]);
        $q=$pdo->prepare("INSERT INTO operations_audit
          (actor_id,action,reference_id,occurred_at) VALUES (?,?,?,?)");
        $q->execute([
          $reviewer,'bahar_adult_eligibility_review',
          hash('sha256',$target.'|'.$decision),nowTs()
        ]);
        $pdo->commit();
        return [
          'ok'=>true,'schema'=>'jr.bahar-adult-review-decision.v1',
          'accountId'=>$target,'reviewState'=>$decision,
          'reviewEvidenceDigestRecorded'=>true,
          'privateWorkbookContentAccessed'=>false,
          'paymentActivated'=>false,
          'automaticStorageActivated'=>false,
          'ownerDecisionLogged'=>true
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
