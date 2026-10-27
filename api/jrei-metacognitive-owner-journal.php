<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Append-only mother-DB record of bounded metacognitive PROPOSALS.
 * Requires the ORIGINAL operations SUPER_ADMIN + current MFA/CSRF, rate gates.
 * No model training, acquisition, executable command or knowledge promotion.
 * A Python-side prediction is never treated as independent scientific proof.
 */
function jrMetaJournalReady(PDO $pdo): bool {
    try {
        $pdo->query('SELECT cycle_id,owner_account_id,request_key,policy_version,'.
            'input_sha256,outcome_sha256,outcome_json,lifecycle,recorded_at '.
            'FROM jrei_metacognitive_owner_cycles LIMIT 0');
        return true;
    } catch (Throwable $e) { return false; }
}

function jrMetaJournalId(): string {
    $bytes=random_bytes(16);
    $bytes[6]=chr((ord($bytes[6])&15)|64);
    $bytes[8]=chr((ord($bytes[8])&63)|128);
    $h=bin2hex($bytes);
    return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.
        substr($h,16,4).'-'.substr($h,20,12);
}

function jrMetaJournalReceipt(array $row): array {
    return [
        'cycleId'=>(string)$row['cycle_id'],
        'policyVersion'=>(string)$row['policy_version'],
        'inputSha256'=>(string)$row['input_sha256'],
        'outcomeSha256'=>(string)$row['outcome_sha256'],
        'state'=>(string)$row['lifecycle'],
        'recordedAt'=>(int)$row['recorded_at'],
        'scientificReviewVerified'=>false,
        'knowledgePromoted'=>false,
        'modelWeightsChanged'=>false,
        'workerJobExecuted'=>false
    ];
}

function jrMetaJournalFind(PDO $pdo,string $owner,string $key): ?array {
    $q=$pdo->prepare('SELECT cycle_id,owner_account_id,request_key,policy_version,'.
        'input_sha256,outcome_sha256,lifecycle,recorded_at FROM '.
        'jrei_metacognitive_owner_cycles WHERE owner_account_id=? AND request_key=? LIMIT 1');
    $q->execute([$owner,$key]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    return is_array($row)?$row:null;
}

/** Existing owner-MFA router is authoritative; never accept browser owner IDs. */
function jrMetaJournalPropose(PDO $pdo,array $cfg,string $owner,array $body): array {
    if (($cfg['jrei_metacognitive_owner_journal_enabled']??false)!==true ||
        ($cfg['jrei_python_internal_enabled']??false)!==true) {
        throw new RuntimeException('JREI_METACOGNITIVE_JOURNAL_DISABLED');
    }
    if (!jrMetaJournalReady($pdo)) {
        throw new RuntimeException('JREI_METACOGNITIVE_MOTHER_SCHEMA_MISSING');
    }
    if (!preg_match('/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/Di',$owner)) {
        throw new InvalidArgumentException('owner_identity_contract');
    }
    if (array_keys($body)!==['action','requestKey','payload'] ||
        $body['action']!=='propose-learning-cycle' ||
        !is_string($body['requestKey']) ||
        preg_match('/^[a-f0-9]{32}$/D',$body['requestKey'])!==1 ||
        !is_array($body['payload']) || array_is_list($body['payload']) ||
        ($body['payload']['schema_version']??null)!=='jr.jrei.metacognitive-cycle.v1') {
        throw new InvalidArgumentException('metacognitive_submission_invalid');
    }
    $payload=$body['payload'];
    $policy=$payload['gaps']['policy_version']??null;
    if (!is_string($policy) ||
        preg_match('/^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/D',$policy)!==1) {
        throw new InvalidArgumentException('metacognitive_policy_invalid');
    }
    $input=json_encode($payload,
        JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    if (!is_string($input) || strlen($input)>52000) {
        throw new InvalidArgumentException('metacognitive_input_too_large');
    }
    $digest=hash('sha256',$input);
    $key=$body['requestKey'];
    $existing=jrMetaJournalFind($pdo,$owner,$key);
    if ($existing!==null) {
        if (!hash_equals((string)$existing['input_sha256'],$digest)) {
            throw new DomainException('metacognitive_idempotency_conflict');
        }
        return [
            'ok'=>true,'schema'=>'jr.jrei.metacognitive-owner-journal.v1',
            'receipt'=>jrMetaJournalReceipt($existing),'replayed'=>true,
            'learningImprovementVerified'=>false
        ];
    }
    // The existing private HMAC client binds a fixed route and does not
    // accept arbitrary model-selected URLs or executable commands.
    $adapter=dirname(__DIR__).'/platform/jrei-python/php/jrei-python-internal-client.php';
    if (!is_file($adapter) || !is_readable($adapter)) {
        throw new RuntimeException('JREI_METACOGNITIVE_PRIVATE_ADAPTER_MISSING');
    }
    require_once $adapter;
    $result=jrJreiPythonInternalPropose(
        $cfg,'/internal/v1/learning/metacognitive/plan',$payload
    );
    if (($result['schema_version']??null)!=='jr.jrei.metacognitive-cycle-result.v1' ||
        ($result['policy_version']??null)!==$policy ||
        ($result['learning_improvement_proven']??null)!==false ||
        ($result['automatic_skill_promotion']??null)!==false ||
        ($result['source_acquisition_started']??null)!==false ||
        ($result['autonomous_model_training_started']??null)!==false ||
        ($result['knowledge_written']??null)!==false ||
        ($result['public_site_changed']??null)!==false ||
        ($result['inputs_independently_verified_by_service']??null)!==false ||
        !is_array($result['decisions']??null)) {
        throw new DomainException('metacognitive_python_untrusted_result');
    }
    $outcome=json_encode($result,
        JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    if (!is_string($outcome) || strlen($outcome)>64000 ||
        !preg_match('/^[a-f0-9]{64}$/D',(string)($result['request_sha256']??''))) {
        throw new DomainException('metacognitive_result_size_or_digest_invalid');
    }
    $now=time();
    $recordId=jrMetaJournalId();
    $outcomeDigest=hash('sha256',$outcome);
    $pdo->beginTransaction();
    try {
        // A repeated request key never overwrites the original proposal.
        $stmt=$pdo->prepare("INSERT INTO jrei_metacognitive_owner_cycles
            (cycle_id,owner_account_id,request_key,policy_version,input_sha256,
             outcome_sha256,outcome_json,lifecycle,recorded_at)
            VALUES(?,?,?,?,?,?,?,'PROPOSAL_ONLY',?)
            ON DUPLICATE KEY UPDATE cycle_id=cycle_id");
        $stmt->execute([$recordId,$owner,$key,$policy,$digest,$outcomeDigest,$outcome,$now]);
        $saved=jrMetaJournalFind($pdo,$owner,$key);
        if ($saved===null || !hash_equals((string)$saved['input_sha256'],$digest)) {
            throw new DomainException('metacognitive_idempotency_conflict');
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    return [
        'ok'=>true,'schema'=>'jr.jrei.metacognitive-owner-journal.v1',
        'receipt'=>jrMetaJournalReceipt($saved),
        'replayed'=>$saved['cycle_id']!==$recordId,
        'learningImprovementVerified'=>false
    ];
}

function jrMetaJournalOwnerList(PDO $pdo,string $owner): array {
    if (!jrMetaJournalReady($pdo)) {
        throw new RuntimeException('JREI_METACOGNITIVE_MOTHER_SCHEMA_MISSING');
    }
    $q=$pdo->prepare('SELECT cycle_id,owner_account_id,request_key,policy_version,'.
        'input_sha256,outcome_sha256,lifecycle,recorded_at FROM '.
        'jrei_metacognitive_owner_cycles WHERE owner_account_id=? '.
        'ORDER BY recorded_at DESC,cycle_id DESC LIMIT 25');
    $q->execute([$owner]);
    $items=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $items[]=jrMetaJournalReceipt($row);
    }
    return [
        'ok'=>true,'schema'=>'jr.jrei.metacognitive-owner-journal-list.v1',
        'items'=>$items,'publicLearningOrTrainingActive'=>false,
        'independentScientificAttestation'=>false
    ];
}
