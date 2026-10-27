<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Owner-MFA-only structural observation against ONE canonical mother DB.
 *
 * phpMyAdmin can leave the effective SQL context at information_schema while
 * the navigation breadcrumb displays drjavad1_store. Never infer the live
 * mother-DB table catalogue from DATABASE() alone. Every metadata read here
 * uses the explicit schema literal with bounded pre-registered table names.
 * This function reads no user rows, SQL definitions, secrets, or transaction
 * records; it cannot create, migrate, install, or approve anything.
 */
function jrJreiMotherStructureInventory(PDO $pdo): array
{
    $schema='drjavad1_store';
    $wanted=[
        'identity'=>['customer_accounts'],
        'hybrid'=>[
            'jrei_hybrid_nodes','jrei_hybrid_jobs',
            'jrei_hybrid_node_nonces'
        ],
        'python_runtime'=>[
            'jrei_python_node_health','jrei_python_canary_jobs',
            'jrei_python_hmac_replay_nonces','jrei_python_owner_memory'
        ],
        'knowledge'=>[
            'jrei_ka_source_policies','jrei_ka_sources',
            'jrei_ka_discovered_urls','jrei_knowledge_sources',
            'jrei_knowledge_documents'
        ],
        'news'=>[
            'jrei_news_monitors','jrei_news_discovered_urls',
            'jrei_news_candidates','jrei_news_publications'
        ],
        'examinations'=>[
            'jrei_exam_offers','jrei_exam_attempts',
            'jrei_exam_questions'
        ],
        'operations'=>['operations_cron_jobs']
    ];
    $current=$pdo->query('SELECT DATABASE()')->fetchColumn();
    $current=is_string($current)?$current:null;

    $targets=[];
    foreach ($wanted as $group=>$names) {
        foreach ($names as $name) {
            if(!preg_match('/^[a-z][a-z0-9_]{2,63}$/D',$name)) {
                throw new RuntimeException('JREI_UNRECOGNIZED_EXPECTED_TABLE');
            }
            if(isset($targets[$name])) {
                throw new RuntimeException('JREI_DUPLICATE_EXPECTED_TABLE');
            }
            $targets[$name]=$group;
        }
    }
    $list=array_keys($targets);
    $slots=implode(',',array_fill(0,count($list),'?'));
    $q=$pdo->prepare(
        'SELECT TABLE_NAME,TABLE_TYPE,ENGINE '.
        'FROM information_schema.TABLES '.
        'WHERE TABLE_SCHEMA=? AND TABLE_NAME IN ('.$slots.')'
    );
    $q->execute(array_merge([$schema],$list));
    $observed=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $name=(string)($row['TABLE_NAME']??'');
        if(!isset($targets[$name])) continue;
        $observed[$name]=[
            'tableType'=>(string)($row['TABLE_TYPE']??''),
            'engine'=>$row['ENGINE']===null?null:(string)$row['ENGINE']
        ];
    }
    $cq=$pdo->prepare(
        'SELECT TABLE_NAME, COUNT(*) AS count_columns '.
        'FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? '.
        'AND TABLE_NAME IN ('.$slots.') GROUP BY TABLE_NAME'
    );
    $cq->execute(array_merge([$schema],$list));
    $counts=[];
    foreach($cq->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $name=(string)($row['TABLE_NAME']??'');
        if(isset($targets[$name]))$counts[$name]=(int)$row['count_columns'];
    }

    $groups=[];$missing=[];
    foreach($wanted as $group=>$names) {
        $items=[];
        foreach($names as $name) {
            $record=$observed[$name]??null;
            $present=is_array($record);
            $baseTable=$present && $record['tableType']==='BASE TABLE';
            $innodb=$baseTable && strcasecmp((string)$record['engine'],'InnoDB')===0;
            $status=!$present?'NOT_OBSERVED_IN_TARGET_SCHEMA':
                (!$baseTable?'NOT_A_BASE_TABLE':
                    (!$innodb?'ENGINE_NOT_INNODB':'STRUCTURE_OBSERVED'));
            if(!$innodb)$missing[]=$name;
            $items[]=[
                'name'=>$name,
                'status'=>$status,
                'columnCount'=>$counts[$name]??0,
            ];
        }
        $groups[$group]=$items;
    }

    return [
        'ok'=>true,
        'schema'=>'jr.jrei.mother-structure-inventory.v1',
        'targetSchema'=>$schema,
        'pdoCurrentContextMatchesTarget'=>$current===$schema,
        // The value is a fixed classification, not an inferred backup/DDL.
        'readOnly'=>true,
        'provisioningOrMigrationExecuted'=>false,
        'backupVerified'=>false,
        'rightsOrLearningActivationProven'=>false,
        'groups'=>$groups,
        'missingOrUnexpectedStructure'=>$missing,
        'schemaContextNote'=>$current===$schema
            ?'EXPLICIT_CANONICAL_SCHEMA_METADATA_ONLY'
            :'SQL_CONTEXT_DIFFERS_EXPLICIT_CANONICAL_SCHEMA_USED',
    ];
}
