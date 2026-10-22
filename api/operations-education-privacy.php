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
