<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Educational privacy-request and retention safety snapshot.
 *
 * Owner-MFA only, aggregation only. This file is NOT a deletion or data
 * access authority. There is no raw student data, SQL from input, child-ID
 * disclosure, scheduler, erasure trigger or automatic data export.
 *
 * Retention durations, legal-hold decisions, jurisdiction-specific rights
 * and storage dependencies need separate reviewed policies and evidence.
 */
function operationsEducationPrivacyPreview(PDO $pdo): array {
    $tables=[
        'eco_privacy_requests','eco_privacy_actions','eco_legal_holds',
        'eco_subjects','eco_consent_records','eco_object_refs'
    ];
    try {
        $q=$pdo->prepare('SELECT table_name FROM information_schema.tables
             WHERE table_schema=DATABASE()
               AND table_name IN (?,?,?,?,?,?)');
        $q->execute($tables);
        $present=array_fill_keys($q->fetchAll(PDO::FETCH_COLUMN),true);
    }catch(Throwable $e){
        return [
            'ok'=>true,'schema'=>'jr.educational-privacy-admin-snapshot.v1',
            'state'=>'DATABASE_METADATA_UNAVAILABLE',
            'readOnly'=>true,'canDelete'=>false,'retentionValidated'=>false,
            'dependencyTables'=>[], 'openRequestCounts'=>null, 'openRequestsState'=>'UNAVAILABLE',
            'activeLegalHolds'=>null,'pendingPrivacyActions'=>null,
            'safeDeletionAuthorized'=>false,
            'limitation'=>'Privacy lifecycle source and existing database metadata have not been reconciled.'
        ];
    }
    $missing=array_values(array_filter($tables,
        static fn(string $table):bool=>!isset($present[$table])
    ));
    $summary=null;
    $openRequestsState='UNAVAILABLE';
    if(isset($present['eco_privacy_requests'])){
        try{
            $q=$pdo->query("SELECT request_type,status,COUNT(*) AS requests_count
                 FROM eco_privacy_requests
                 WHERE status IN ('RECEIVED','IN_REVIEW','PENDING','BLOCKED')
                 GROUP BY request_type,status
                 ORDER BY request_type,status LIMIT 40");
            $summary=[];
            foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
                $code=(string)$row['request_type'];
                $state=(string)$row['status'];
                if(!preg_match('/^[A-Z_]{3,40}$/D',$code)||
                    !preg_match('/^[A-Z_]{3,40}$/D',$state))continue;
                $summary[]=['type'=>$code,'state'=>$state,
                    'count'=>max(0,(int)$row['requests_count'])];
            }
            $openRequestsState='OBSERVED';
        }catch(Throwable $e){$summary=null;}
    }
    $holds=null;
    if(isset($present['eco_legal_holds'])){
        try{
            $q=$pdo->query("SELECT COUNT(*) FROM eco_legal_holds
                WHERE released_at IS NULL
                  AND (expires_at IS NULL OR expires_at>UTC_TIMESTAMP(3))");
            $holds=(int)$q->fetchColumn();
        }catch(Throwable $e){$holds=null;}
    }
    $completeness=count($missing)===0;
    return [
        'ok'=>true,'schema'=>'jr.educational-privacy-admin-snapshot.v1',
        'state'=>$completeness
            ?'STRUCTURAL_VISIBILITY_ONLY':'EDUCATIONAL_PRIVACY_SCHEMA_INCOMPLETE',
        'readOnly'=>true,'canDelete'=>false,
        'safeDeletionAuthorized'=>false,
        'retentionValidated'=>false,
        'dependencyTables'=>array_map(
            static fn(string $name):array=>[
                'table'=>$name,'sourceTableExists'=>isset($present[$name])
            ],$tables),
        'missingTables'=>$missing,
        'openRequestCounts'=>$summary,
        'openRequestsState'=>$openRequestsState,
        'activeLegalHolds'=>$holds,
        'pendingPrivacyActions'=>null,
        'privacyRequestExecutionVerified'=>false,
        'objectStoreWipeVerified'=>false,
        'researchExportRetentionVerified'=>false,
        'financialRecordRetentionPreserved'=>null,
        'limitation'=>'Aggregated metadata is NOT a privacy impact assessment, child-data authorization, deletion preview of actual records, legal-hold release or erasure-completion certificate.'
    ];
}


/**
 * Scoped unresolved BAHAR erasure queue. No educational notes, child records
 * or identity documents are projected into administrator tables.
 */
function operationsEducationBaharErasureQueue(PDO $pdo,array $options=[]): array {
    $page=filter_var($options['page']??1,FILTER_VALIDATE_INT);
    if($page===false||$page<1||$page>5000)
        throw new InvalidArgumentException('invalid_privacy_queue_page');
    $pageSize=100;
    $offset=($page-1)*$pageSize;
    try{
        $countsQ=$pdo->query("SELECT status,COUNT(*) AS n
          FROM eco_privacy_requests
          WHERE request_type='BAHAR_PRIVATE_WORKBOOK_DELETE'
          GROUP BY status LIMIT 12");
        $counts=[];
        foreach($countsQ->fetchAll(PDO::FETCH_ASSOC) as $row){
            $state=(string)$row['status'];
            if(preg_match('/^[A-Z_]{3,24}$/D',$state))
                $counts[$state]=max(0,(int)$row['n']);
        }
        $q=$pdo->query("SELECT id,requester_account_id,status,
              created_at,due_at
           FROM eco_privacy_requests
           WHERE request_type='BAHAR_PRIVATE_WORKBOOK_DELETE'
             AND status IN ('RECEIVED','PENDING','IN_REVIEW','BLOCKED')
           ORDER BY created_at ASC,id ASC LIMIT ".$pageSize." OFFSET ".$offset);
        $items=$q->fetchAll(PDO::FETCH_ASSOC);
        if(!is_array($items))throw new RuntimeException('erasure_queue_unavailable');
    }catch(Throwable $e){
        return [
          'ok'=>true,'schema'=>'jr.bahar-owner-erasure-queue.v1',
          'state'=>'MOTHER_DATABASE_UNAVAILABLE','readOnly'=>true,
          'legalHoldOverrideAvailable'=>false,'requests'=>[],
          'totalCounts'=>null,'truncated'=>false,
          'page'=>$page,'pageSize'=>$pageSize,'pages'=>null,
          'totalOpen'=>null,'hasNextPage'=>false
        ];
    }
    $openCount=0;
    foreach(['RECEIVED','PENDING','IN_REVIEW','BLOCKED'] as $state)
        $openCount+=($counts[$state]??0);
    $pages=(int)ceil($openCount/$pageSize);
    $truncated=$page<$pages;
    $pending=[];
    foreach($items as $row){
        if(!preg_match('/^[0-9a-f-]{36}$/i',(string)$row['id'])||
          !preg_match('/^[0-9a-f-]{36}$/i',(string)$row['requester_account_id']))
          continue;
        $pending[]=[
          'id'=>(string)$row['id'],
          'requesterAccountId'=>(string)$row['requester_account_id'],
          'status'=>(string)$row['status'],
          'requestedAt'=>(string)$row['created_at'],
          'dueAt'=>$row['due_at']===null?null:(string)$row['due_at'],
          'containsPersonalWorkbookContent'=>false
        ];
    }
    return [
      'ok'=>true,'schema'=>'jr.bahar-owner-erasure-queue.v1',
      'state'=>'LIVE_MOTHER_DATABASE_REQUEST_QUEUE',
      'readOnly'=>false,'legalHoldOverrideAvailable'=>false,
      'requests'=>$pending,'totalCounts'=>$counts,
      'truncated'=>$truncated,
      'page'=>$page,'pageSize'=>$pageSize,'pages'=>$pages,
      'totalOpen'=>$openCount,
      'hasNextPage'=>$page<$pages&&$page<5000,
      'resultsBeyondPageLimit'=>$pages>5000,
      'privacyLedgerSource'=>'eco_privacy_requests',
      'canCompleteOnlyAfterLegalHoldClear'=>true,
      'noAutomaticBackupsDeletion'=>true
    ];
}
/**
 * Owner completes a REQUESTED BAHAR erasure only when actual legal holds
 * are clear at the moment of the transaction. This is not a legal-hold
 * release switch and cannot delete any other product/account information.
 */
function operationsEducationCompleteBaharErasure(
  PDO $pdo,array $input,string $owner,int $at
): array {
    $requestId=$input['requestId']??null;
    if(!is_string($requestId)||!validUuid($requestId)||
      ($input['confirmation']??null)!==
        'COMPLETE REQUESTED BAHAR WORKBOOK ERASURE AFTER HOLD REVIEW')
      throw new InvalidArgumentException('invalid_education_privacy_decision');
    $pdo->beginTransaction();
    try{
        // Read requester ID first; its FK is immutable for this request.
        $lookup=$pdo->prepare("SELECT requester_account_id
          FROM eco_privacy_requests
          WHERE id=? AND subject_id IS NULL
            AND request_type='BAHAR_PRIVATE_WORKBOOK_DELETE' LIMIT 1");
        $lookup->execute([$requestId]);
        $account=$lookup->fetchColumn();
        if(!is_string($account)||!validUuid($account))
            throw new DomainException('requested_bahar_erasure_not_found');
        $guard=$pdo->prepare('SELECT id FROM customer_accounts WHERE id=? FOR UPDATE');
        $guard->execute([$account]);
        if($guard->fetchColumn()===false)
            throw new DomainException('requester_account_missing');
        $q=$pdo->prepare("SELECT status FROM eco_privacy_requests
          WHERE id=? AND requester_account_id=? AND subject_id IS NULL
            AND request_type='BAHAR_PRIVATE_WORKBOOK_DELETE'
          FOR UPDATE");
        $q->execute([$requestId,$account]);
        $status=$q->fetchColumn();
        if(!is_string($status)||!in_array($status,
           ['RECEIVED','PENDING','IN_REVIEW','BLOCKED'],true))
           throw new DomainException('privacy_request_already_completed');
        if(!baharAccountLegalHoldClear($pdo,$account))
            throw new DomainException('legal_hold_remains_active');
        $remove=$pdo->prepare('DELETE FROM eco_bahar_account_workbooks
          WHERE owner_account_id=?');
        $remove->execute([$account]);
        $removed=$remove->rowCount()===1;
        // Legacy requests created before consent withdrawal was bound to
        // erasure must not close while leaving an old storage grant active.
        // This never modifies consent for any other account or purpose.
        $revoke=$pdo->prepare("UPDATE eco_consent_records c
          INNER JOIN eco_consent_notices n ON n.id=c.notice_id
          SET c.withdrawn_at=UTC_TIMESTAMP(3)
          WHERE c.account_id=? AND c.subject_id IS NULL
            AND c.source_code='BAHAR_ACCOUNT_WORKBOOK'
            AND n.purpose_code=? AND c.decision='GRANTED'
            AND c.withdrawn_at IS NULL");
        $revoke->execute([$account,JR_BAHAR_ACCOUNT_PURPOSE]);
        $close=$pdo->prepare("UPDATE eco_privacy_requests
           SET status='COMPLETED',closed_at=UTC_TIMESTAMP(3),
               updated_at=UTC_TIMESTAMP(3)
           WHERE id=? AND requester_account_id=?");
        $close->execute([$requestId,$account]);
        if($close->rowCount()!==1)
            throw new RuntimeException('request_closure_not_recorded');
        $step=$pdo->prepare('INSERT INTO eco_privacy_actions
            (id,request_id,action_code,operator_account_id,result_code,evidence_sha256)
            VALUES (?,? ,?,?,?,?)');
        $step->execute([
            uuidv4(),$requestId,'BAHAR_WORKBOOK_ERASURE',$owner,
            $removed?'CURRENT_ROW_REMOVED':'CURRENT_ROW_ALREADY_ABSENT',
            hash('sha256','bahar_erasure_owner|'.$requestId.'|'.
              ($removed?'row_removed':'no_row_found'))
        ]);
        $audit=$pdo->prepare('INSERT INTO operations_audit
          (actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)');
        $audit->execute([
            $owner,'bahar_requested_erasure_completed',
            hash('sha256',$requestId),$at
        ]);
        $pdo->commit();
        return [
          'ok'=>true,'schema'=>'jr.bahar-owner-erasure-decision.v1',
          'requestId'=>$requestId,'state'=>'COMPLETED',
          'currentDatabaseRowDeleted'=>$removed,
          'previousPrivateConsentRevoked'=>true,
          'backupErasureCertified'=>false,
          'legalHoldOverridePerformed'=>false,
          'otherAccountsAffected'=>false
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
