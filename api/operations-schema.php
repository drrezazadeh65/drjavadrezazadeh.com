<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/operations-collection.php';

/** Called only by the authenticated deployment helper, never by a browser route. */
function operationsInstall(PDO $pdo): void {
    $statements = [
        "CREATE TABLE IF NOT EXISTS operations_admin_memberships (
            account_id CHAR(36) PRIMARY KEY,
            role ENUM('ADMIN','SUPER_ADMIN') NOT NULL,
            enabled TINYINT NOT NULL DEFAULT 1,
            created_at BIGINT NOT NULL,
            FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_session_mfa (
            session_hash CHAR(64) PRIMARY KEY,
            account_id CHAR(36) NOT NULL,
            verified_at BIGINT NOT NULL,
            expires_at BIGINT NOT NULL,
            last_counter BIGINT NOT NULL,
            credential_hash CHAR(64) NOT NULL,
            FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_mfa_counters (
            account_id CHAR(36) PRIMARY KEY,
            last_counter BIGINT NOT NULL,
            FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_evidence (
            sequence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            evidence_id CHAR(64) NOT NULL UNIQUE,
            section_id VARCHAR(12) NOT NULL,
            gate_id VARCHAR(32) NOT NULL,
            result ENUM('pass','fail','blocked') NOT NULL,
            release_sha CHAR(40) NOT NULL,
            source VARCHAR(32) NOT NULL,
            source_url VARCHAR(500) NOT NULL,
            test_name VARCHAR(160) NOT NULL,
            environment ENUM('ci','production','external') NOT NULL,
            checked_at BIGINT NOT NULL,
            expires_at BIGINT NOT NULL,
            details_json TEXT NOT NULL,
            INDEX idx_operations_release (release_sha,section_id,sequence_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_audit (
            sequence_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            actor_id CHAR(36) NULL,
            action VARCHAR(40) NOT NULL,
            reference_id VARCHAR(64) NOT NULL,
            occurred_at BIGINT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_release (
            singleton_id TINYINT PRIMARY KEY,
            release_sha CHAR(40) NOT NULL,
            published_at BIGINT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_action_runs (
            run_id CHAR(64) PRIMARY KEY,
            account_id CHAR(36) NOT NULL,
            action_id VARCHAR(20) NOT NULL,
            request_key CHAR(32) NOT NULL,
            release_sha CHAR(40) NOT NULL,
            status ENUM('running','succeeded','failed','blocked') NOT NULL,
            created_at BIGINT NOT NULL,
            finished_at BIGINT NULL,
            result_json TEXT NOT NULL,
            UNIQUE KEY uq_ops_actor_request(account_id,request_key),
            INDEX idx_ops_actor_history(account_id,created_at),
            INDEX idx_ops_action_status(action_id,status),
            FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        , "CREATE TABLE IF NOT EXISTS operations_collection_policies (
            scope_key VARCHAR(96) PRIMARY KEY,
            enabled TINYINT NOT NULL DEFAULT 1,
            cadence ENUM('manual','hourly','daily','live') NOT NULL,
            clock_minutes SMALLINT UNSIGNED NOT NULL,
            next_due BIGINT NOT NULL DEFAULT 0,
            updated_at BIGINT NOT NULL,
            INDEX idx_collector_due(enabled,next_due)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_collection_cache (
            scope_key VARCHAR(96) PRIMARY KEY,
            fetched_at BIGINT NOT NULL,
            expires_at BIGINT NOT NULL,
            body_json MEDIUMTEXT NOT NULL,
            INDEX idx_collector_expires(expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_collection_attempts (
            attempt_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            scope_key VARCHAR(96) NOT NULL,
            attempted_at BIGINT NOT NULL,
            result ENUM('succeeded','failed') NOT NULL,
            failure_code VARCHAR(64) NULL,
            INDEX idx_ops_collection_attempt(scope_key,attempt_id),
            INDEX idx_ops_collection_attempt_time(scope_key,attempted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_source_controls (
            source_id VARCHAR(96) PRIMARY KEY,
            enabled TINYINT NOT NULL DEFAULT 0,
            cadence ENUM('manual','daily','weekly') NOT NULL DEFAULT 'manual',
            weekday TINYINT UNSIGNED NOT NULL DEFAULT 1,
            clock_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 210,
            retention_days SMALLINT UNSIGNED NOT NULL DEFAULT 90,
            next_due BIGINT NOT NULL DEFAULT 0,
            updated_at BIGINT NOT NULL,
            INDEX idx_source_controls_due(enabled,next_due)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_source_metric_samples (
            sample_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            source_id VARCHAR(96) NOT NULL,
            metric_key VARCHAR(48) NOT NULL,
            metric_value DECIMAL(20,4) NOT NULL,
            unit VARCHAR(24) NOT NULL,
            observed_at BIGINT NOT NULL,
            expires_at BIGINT NOT NULL,
            evidence_type ENUM('internal_event','provider_observation') NOT NULL,
            created_at BIGINT NOT NULL,
            INDEX idx_ops_sample_source_time(source_id,observed_at),
            INDEX idx_ops_sample_expiration(expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_content_drafts (
            id CHAR(32) PRIMARY KEY,
            language ENUM('fa','en') NOT NULL,
            content_type ENUM('article','news','page','newsletter','book-description') NOT NULL,
            title VARCHAR(180) NOT NULL,
            body_markdown MEDIUMTEXT NOT NULL,
            seo_title VARCHAR(180) NOT NULL,
            seo_description VARCHAR(360) NOT NULL,
            media_path VARCHAR(240) NULL,
            status ENUM('draft','archived') NOT NULL DEFAULT 'draft',
            version INT UNSIGNED NOT NULL DEFAULT 1,
            created_at BIGINT NOT NULL,
            updated_at BIGINT NOT NULL,
            updated_by CHAR(36) NOT NULL,
            INDEX idx_editor_draft_status(status,updated_at),
            INDEX idx_editor_draft_lang(language,content_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS operations_content_revisions (
            revision_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            draft_id CHAR(32) NOT NULL,
            version INT UNSIGNED NOT NULL,
            title VARCHAR(180) NOT NULL,
            body_markdown MEDIUMTEXT NOT NULL,
            seo_title VARCHAR(180) NOT NULL,
            seo_description VARCHAR(360) NOT NULL,
            media_path VARCHAR(240) NULL,
            status ENUM('draft','archived') NOT NULL,
            created_at BIGINT NOT NULL,
            actor_id CHAR(36) NOT NULL,
            UNIQUE KEY uq_editor_version(draft_id,version),
            INDEX idx_editor_revisions(draft_id,created_at),
            FOREIGN KEY (draft_id) REFERENCES operations_content_drafts(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    ];
    foreach ($statements as $sql) $pdo->exec($sql);
    operationsCollectorSeed($pdo,time());
}

/** Exact-release evidence is accepted only by the one-time authenticated deployment helper. */
function operationsImportRelease(PDO $pdo, array $batch, string $expectedSha, array $privateConfig, string $expectedRun): int {
    if (($batch['schema'] ?? '') !== 'operations-release-v1' || ($batch['releaseSha'] ?? '') !== $expectedSha
        || !preg_match('/^[a-f0-9]{40}$/D',$expectedSha) || !is_array($batch['events'] ?? null)
        || count($batch['events']) !== 2 || !preg_match('/^[0-9]+$/D',$expectedRun)
        || ($batch['runId']??'')!==$expectedRun || ($batch['branch']??'')!=='migration/bertina-linux6'
        || ($batch['workflow']??'')!=='Deploy to Bertina') throw new RuntimeException('invalid_release_evidence');
    $registry=operationsRegistry(); $records=[];
    foreach (array_merge($registry['reports'],[$registry['dashboard']]) as $record) $records[$record['id']]=$record;
    $validated=[]; $now=time();
    foreach ($batch['events'] as $event) {
        // Only collectors actually implemented by this release may certify a gate.
        // Generic CI or health probes cannot certify identity, money, indexing or editorial work.
        $collectorScopes=['ADM-01'=>['code'=>'admin_release_checksum','tests'=>'admin_security_and_browser_suite']];
        if (!is_array($event) || !isset($records[$event['sectionId']??'']['gates'][$event['gateId']??''])
            || !isset($collectorScopes[$event['sectionId']??''][$event['gateId']??''])
            || ($event['details']['scope']??'')!==$collectorScopes[$event['sectionId']??''][$event['gateId']??'']
            || ($event['source']??'')!=='github_actions' || ($event['environment']??'')!=='ci'
            || !in_array($event['result']??'', ['pass','fail','blocked'],true)
            || !in_array($event['source']??'', ['github_actions','bertina_probe'],true)
            || !preg_match('#^https://github\.com/drrezazadeh65/drjavadrezazadeh\.com/actions/runs/[0-9]+$#D',(string)($event['sourceUrl']??''))
            || ($event['sourceUrl']??'')!=='https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/'.$expectedRun
            || !is_string($event['testName']??null) || strlen($event['testName'])<4 || strlen($event['testName'])>160
            || !in_array($event['environment']??'', ['ci','production'],true)
            || !is_int($event['checkedAt']??null) || $event['checkedAt']>$now+60 || $event['checkedAt']<$now-3600
            || !is_int($event['expiresAt']??null) || $event['expiresAt']<=$event['checkedAt'] || $event['expiresAt']>$event['checkedAt']+604800
            || !is_array($event['details']??null)) throw new RuntimeException('invalid_evidence_event');
        $details=[];
        foreach ($event['details'] as $key=>$value) {
            if (!in_array($key,['passed','total','errorCode','scope'],true) || (!is_int($value) && !is_string($value))
                || (is_string($value) && (strlen($value)>160 || preg_match('/[\r\n<>@]/',$value)))) throw new RuntimeException('private_evidence_payload');
            $details[$key]=$value;
        }
        $event['details']=$details; $validated[]=$event;
    }
    if (count(array_unique(array_column($validated,'gateId')))!==2)throw new RuntimeException('incomplete_collector_evidence');
    $pdo->beginTransaction();
    try {
        $insert=$pdo->prepare('INSERT IGNORE INTO operations_evidence(evidence_id,section_id,gate_id,result,release_sha,source,source_url,test_name,environment,checked_at,expires_at,details_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
        foreach ($validated as $event) {
            $identity=hash('sha256',json_encode([$expectedSha,$event],JSON_UNESCAPED_SLASHES));
            $insert->execute([$identity,$event['sectionId'],$event['gateId'],$event['result'],$expectedSha,$event['source'],$event['sourceUrl'],$event['testName'],$event['environment'],$event['checkedAt'],$event['expiresAt'],json_encode($event['details'],JSON_UNESCAPED_SLASHES)]);
        }
        // Confirm round-trip persistence inside the same transaction, rather than trusting a browser flag.
        $stored=$pdo->prepare('SELECT COUNT(*) FROM operations_evidence WHERE release_sha=?');$stored->execute([$expectedSha]);
        if ((int)$stored->fetchColumn()<count($validated)) throw new RuntimeException('evidence_roundtrip_failed');
        $proof=['scope'=>'admin_evidence_database_roundtrip','passed'=>count($validated),'total'=>count($validated)];
        $insert->execute([hash('sha256',$expectedSha.'|database-roundtrip|'.$expectedRun),'ADM-01','evidence','pass',$expectedSha,'bertina_probe','https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/'.$expectedRun,'Controlled append-only evidence import roundtrip','production',$now,$now+604800,json_encode($proof)]);
        $pdo->prepare('INSERT INTO operations_release(singleton_id,release_sha,published_at) VALUES(1,?,?) ON DUPLICATE KEY UPDATE release_sha=VALUES(release_sha),published_at=VALUES(published_at)')->execute([$expectedSha,$now]);
        // Explicit private provisioning is required; an email address never grants an admin role.
        foreach (($privateConfig['operations_admins']??[]) as $id=>$private) {
            if (!preg_match('/^[a-f0-9-]{36}$/Di',(string)$id) || !is_array($private)
                || !in_array($private['role']??'', ['ADMIN','SUPER_ADMIN'],true)
                || !preg_match('/^[A-Z2-7]{32,128}$/D',(string)($private['totp_secret']??''))) throw new RuntimeException('invalid_private_admin');
            $q=$pdo->prepare("SELECT id FROM customer_accounts WHERE id=? AND status='active' AND email_verified_at IS NOT NULL");$q->execute([$id]);
            if (!$q->fetch()) throw new RuntimeException('admin_account_not_verified');
            $pdo->prepare('INSERT IGNORE INTO operations_admin_memberships(account_id,role,enabled,created_at) VALUES(?,?,1,?)')->execute([$id,$private['role'],$now]);
        }
        $pdo->prepare('INSERT INTO operations_audit(actor_id,action,reference_id,occurred_at) VALUES(NULL,?,?,?)')->execute(['release_imported',$expectedSha,$now]);
        $pdo->commit(); return count($validated);
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
}
