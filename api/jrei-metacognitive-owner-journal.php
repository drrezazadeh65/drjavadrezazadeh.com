<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Append-only mother-DB record of bounded metacognitive PROPOSALS.
 * Requires the ORIGINAL operations SUPER_ADMIN + current MFA/CSRF, rate gates.
 * No model training, acquisition, executable command or knowledge promotion.
 * A Python-side prediction is never treated as independent scientific proof.
 */
function jrMetaJournalExactFields(array $body,array $fields): bool {
    $actual=array_keys($body);
    sort($actual,SORT_STRING);
    sort($fields,SORT_STRING);
    return $actual===$fields;
}

/**
 * Stable digest of decoded proposal semantics across MariaDB's verbatim JSON
 * storage and MySQL's potential object-key reordering. Lists retain order.
 * The original raw-byte checksum remains readable for legacy receipts.
 */
function jrMetaJournalCanonicalValue(mixed $value): mixed {
    if(!is_array($value))return $value;
    if(!array_is_list($value))ksort($value,SORT_STRING);
    foreach($value as $key=>$child)$value[$key]=jrMetaJournalCanonicalValue($child);
    return $value;
}
function jrMetaJournalOutcomeDigest(array $outcome): string {
    $canonical=json_encode(jrMetaJournalCanonicalValue($outcome),
        JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|
        JSON_PRESERVE_ZERO_FRACTION|JSON_UNESCAPED_LINE_TERMINATORS);
    return hash('sha256',$canonical);
}

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

/**
 * The private Python response is a proposal, not a grant of owner authority.
 * Bind every proposed decision to the exact submitted aggregate gap and
 * citation context before committing any receipt to the mother ledger.
 */
function jrMetaJournalValidateOutcome(array $payload,array $result): void {
    $gaps=$payload['gaps']['gaps']??null;
    $contexts=$payload['contexts']??null;
    $decisions=$result['decisions']??null;
    if (!is_array($gaps) || !array_is_list($gaps) ||
        count($gaps)<1 || count($gaps)>200 ||
        !is_array($contexts) || !array_is_list($contexts) ||
        !is_array($decisions) || !array_is_list($decisions) ||
        count($contexts)!==count($gaps) ||
        count($decisions)!==count($gaps) ||
        ($result['gap_count']??null)!==count($gaps) ||
        ($result['learning_method_selection_executed']??null)!==true ||
        !preg_match('/^[a-f0-9]{64}$/D',(string)($result['evidence_graph_sha256']??''))) {
        throw new DomainException('metacognitive_decision_binding_invalid');
    }
    $expected=[];
    foreach($gaps as $gap) {
        if(!is_array($gap) || !is_string($gap['gap_id']??null) ||
           !is_string($gap['domain']??null) ||
           array_key_exists($gap['gap_id'],$expected)) {
            throw new DomainException('metacognitive_gap_identity_invalid');
        }
        $expected[$gap['gap_id']]=['domain'=>$gap['domain'],'claims'=>null];
    }
    foreach($contexts as $context) {
        $id=$context['gap_id']??null;
        $claims=$context['supporting_claim_ids']??null;
        if(!is_string($id) || !array_key_exists($id,$expected) ||
           $expected[$id]['claims']!==null ||
           !is_array($claims) || !array_is_list($claims) ||
           count($claims)>16) {
            throw new DomainException('metacognitive_claim_context_invalid');
        }
        foreach($claims as $claim) {
            if(!is_string($claim))throw new DomainException('metacognitive_claim_identity_invalid');
        }
        if(count(array_unique($claims,SORT_STRING))!==count($claims)) {
            throw new DomainException('metacognitive_duplicate_context_claim');
        }
        sort($claims,SORT_STRING);
        $expected[$id]['claims']=$claims;
    }
    $allowedStates=[
        'HOLD_RIGHTS_REVIEW','HOLD_SOURCE_OR_CITATION',
        'HOLD_INDEPENDENT_EVIDENCE','HOLD_HELDOUT_REGRESSION',
        'HOLD_INSUFFICIENT_BENCHMARK','PROPOSE_ISOLATED_EXPERIMENT',
        'REVIEW_CHALLENGER_WITH_OWNER'
    ];
    $expectedActions=[
        'HOLD_RIGHTS_REVIEW'=>'REQUEST_SOURCE_RIGHTS_REVIEW',
        'HOLD_SOURCE_OR_CITATION'=>'REPAIR_SOURCE_PROVENANCE',
        'HOLD_INDEPENDENT_EVIDENCE'=>'OBTAIN_INDEPENDENT_EVIDENCE_REVIEW',
        'HOLD_HELDOUT_REGRESSION'=>'REVISE_OR_REJECT_CHALLENGER',
        'HOLD_INSUFFICIENT_BENCHMARK'=>'CURATE_PAIRED_BILINGUAL_HELDOUT',
        'PROPOSE_ISOLATED_EXPERIMENT'=>'DESIGN_BOUNDED_EXPERIMENT',
        'REVIEW_CHALLENGER_WITH_OWNER'=>'REQUEST_OWNER_SCIENTIFIC_DECISION',
    ];
    $seen=[];
    foreach($decisions as $decision) {
        $id=$decision['gap_id']??null;
        $claims=$decision['supporting_claim_ids']??null;
        if(!is_array($decision) || !is_string($id) ||
           !isset($expected[$id]) || isset($seen[$id]) ||
           ($decision['domain']??null)!==$expected[$id]['domain'] ||
           !is_array($claims) || !array_is_list($claims) ||
           ($expected[$id]['claims']??null)===null ||
           $claims!==$expected[$id]['claims'] ||
           !in_array($decision['decision']??null,$allowedStates,true) ||
           ($decision['next_action']??null)!==
             ($expectedActions[$decision['decision']??'']??null) ||
           ($decision['owner_approval_required']??null)!==true ||
           ($decision['knowledge_promoted']??null)!==false ||
           ($decision['model_training_started']??null)!==false ||
           ($decision['mission_executed']??null)!==false) {
            throw new DomainException('metacognitive_unbound_or_privileged_decision');
        }
        $seen[$id]=true;
    }
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
    if (!jrMetaJournalExactFields($body,['action','requestKey','payload']) ||
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
    $adapter=__DIR__.'/jrei-remote-api-client.php';
    if (!is_file($adapter) || !is_readable($adapter)) {
        throw new RuntimeException('JREI_METACOGNITIVE_PRIVATE_ADAPTER_MISSING');
    }
    require_once $adapter;
    $result=jrJreiPythonInternalPropose(
        $cfg,'/internal/v1/learning/metacognitive/plan',$payload
    );
    if (($result['schema_version']??null)!=='jr.jrei.metacognitive-cycle-result.v1' ||
        ($result['policy_version']??null)!==$policy ||
        !is_string($result['submitted_payload_sha256']??null) ||
        !hash_equals($digest,$result['submitted_payload_sha256']) ||
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
    jrMetaJournalValidateOutcome($payload,$result);
    $outcome=json_encode($result,
        JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    if (!is_string($outcome) || strlen($outcome)>64000 ||
        !preg_match('/^[a-f0-9]{64}$/D',(string)($result['request_sha256']??''))) {
        throw new DomainException('metacognitive_result_size_or_digest_invalid');
    }
    $now=time();
    $recordId=jrMetaJournalId();
    $outcomeDigest=jrMetaJournalOutcomeDigest($result);
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
        'input_sha256,outcome_sha256,outcome_json,lifecycle,recorded_at FROM '.
        'jrei_metacognitive_owner_cycles WHERE owner_account_id=? '.
        'ORDER BY recorded_at DESC,cycle_id DESC LIMIT 25');
    $q->execute([$owner]);
    $items=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $raw=$row['outcome_json'];
        if(!is_string($raw) || strlen($raw)>64000 ||
           $row['lifecycle']!=='PROPOSAL_ONLY') {
            throw new RuntimeException('JREI_META_OWNER_LIST_INTEGRITY_FAILED');
        }
        $decoded=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
        if(!is_array($decoded) || array_is_list($decoded) ||
           !hash_equals((string)$row['outcome_sha256'],
              jrMetaJournalOutcomeDigest($decoded)) &&
           !hash_equals((string)$row['outcome_sha256'],hash('sha256',$raw)) ||
           ($decoded['submitted_payload_sha256']??null)!==$row['input_sha256'] ||
           ($decoded['policy_version']??null)!==$row['policy_version'] ||
           ($decoded['learning_improvement_proven']??null)!==false ||
           ($decoded['knowledge_written']??null)!==false ||
           ($decoded['automatic_skill_promotion']??null)!==false) {
            throw new RuntimeException('JREI_META_OWNER_LIST_INTEGRITY_FAILED');
        }
        $receipt=jrMetaJournalReceipt($row);
        $receipt['storedOutcomeDigestVerified']=true;
        $items[]=$receipt;
    }
    return [
        'ok'=>true,'schema'=>'jr.jrei.metacognitive-owner-journal-list.v1',
        'items'=>$items,'publicLearningOrTrainingActive'=>false,
        'independentScientificAttestation'=>false
    ];
}

/**
 * Read one previously recorded learning-to-learn proposal through the
 * ORIGINAL owner-only MFA operations route. This is a persistent historical
 * decision record, never a promoted skill, approved citation or worker job.
 *
 * Verify the exact stored payload hash before returning any outcome. If an
 * external MySQL JSON representation has altered bytes, fail closed rather
 * than presenting non-verifiable evidence as an immutable prior decision.
 */
function jrMetaJournalOwnerDetail(PDO $pdo,string $owner,string $cycleId): array {
    if(!jrMetaJournalReady($pdo)) {
        throw new RuntimeException('JREI_METACOGNITIVE_MOTHER_SCHEMA_MISSING');
    }
    if(preg_match('/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/Di',$cycleId)!==1) {
        throw new InvalidArgumentException('metacognitive_cycle_id_invalid');
    }
    $stmt=$pdo->prepare('SELECT cycle_id,owner_account_id,request_key,policy_version,'.
        'input_sha256,outcome_sha256,outcome_json,lifecycle,recorded_at '.
        'FROM jrei_metacognitive_owner_cycles '.
        'WHERE cycle_id=? AND owner_account_id=? LIMIT 1');
    $stmt->execute([$cycleId,$owner]);
    $row=$stmt->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row)) {
        throw new DomainException('metacognitive_cycle_not_found');
    }
    $raw=$row['outcome_json'];
    if(!is_string($raw) || strlen($raw)>64000 ||
       ($row['lifecycle']??null)!=='PROPOSAL_ONLY') {
        throw new RuntimeException('JREI_METACOGNITIVE_STORED_EVIDENCE_INTEGRITY_FAILED');
    }
    $result=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
    if(!is_array($result) || array_is_list($result) ||
       (!hash_equals((string)$row['outcome_sha256'],
           jrMetaJournalOutcomeDigest($result)) &&
        !hash_equals((string)$row['outcome_sha256'],hash('sha256',$raw)))) {
        throw new RuntimeException('JREI_METACOGNITIVE_STORED_EVIDENCE_INTEGRITY_FAILED');
    }
    if(!is_array($result) || array_is_list($result) ||
        ($result['schema_version']??null)!=='jr.jrei.metacognitive-cycle-result.v1' ||
        ($result['policy_version']??null)!==$row['policy_version'] ||
        ($result['submitted_payload_sha256']??null)!==$row['input_sha256'] ||
        ($result['learning_improvement_proven']??null)!==false ||
        ($result['automatic_skill_promotion']??null)!==false ||
        ($result['knowledge_written']??null)!==false ||
        ($result['autonomous_model_training_started']??null)!==false ||
        ($result['public_site_changed']??null)!==false ||
        !is_array($result['decisions']??null)) {
        throw new RuntimeException('JREI_METACOGNITIVE_STORED_PROPOSAL_INVALID');
    }
    return [
        'ok'=>true,
        'schema'=>'jr.jrei.metacognitive-owner-journal-detail.v1',
        'receipt'=>jrMetaJournalReceipt($row),
        'proposal'=>$result,
        'storedOutcomeDigestVerified'=>true,
        'ownerIndependentScienceApprovalVerified'=>false,
        'knowledgePromoted'=>false,
        'missionExecuted'=>false,
    ];
}

/**
 * Bounded descriptive longitudinal record of submitted JREI learning cycles.
 * Historical proposals are NOT experiments or independent measurements.
 * Decisions and their reasons remain suggestions; this read never approves
 * a new learning method, grants source rights or operates a worker.
 */
function jrMetaJournalOwnerTrend(PDO $pdo,string $owner): array {
    if(!jrMetaJournalReady($pdo)) {
        throw new RuntimeException('JREI_METACOGNITIVE_MOTHER_SCHEMA_MISSING');
    }
    $q=$pdo->prepare('SELECT cycle_id,policy_version,input_sha256,outcome_sha256,'.
        'outcome_json,lifecycle,recorded_at '.
        'FROM jrei_metacognitive_owner_cycles WHERE owner_account_id=? '.
        'ORDER BY recorded_at DESC,cycle_id DESC LIMIT 25');
    $q->execute([$owner]);
    $domains=[];
    $count=0;
    $reasonCounts=[];
    foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $raw=$row['outcome_json'];
        if(!is_string($raw) || strlen($raw)>64000 ||
           ($row['lifecycle']??null)!=='PROPOSAL_ONLY') {
            throw new RuntimeException('JREI_META_TREND_EVIDENCE_INTEGRITY_UNAVAILABLE');
        }
        $outcome=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
        if(!is_array($outcome) || array_is_list($outcome) ||
           (!hash_equals((string)$row['outcome_sha256'],
               jrMetaJournalOutcomeDigest($outcome)) &&
            !hash_equals((string)$row['outcome_sha256'],hash('sha256',$raw))) ||
           ($outcome['policy_version']??null)!==$row['policy_version'] ||
           ($outcome['submitted_payload_sha256']??null)!==$row['input_sha256'] ||
           ($outcome['schema_version']??null)!=='jr.jrei.metacognitive-cycle-result.v1' ||
           ($outcome['learning_improvement_proven']??null)!==false ||
           ($outcome['knowledge_written']??null)!==false ||
           ($outcome['automatic_skill_promotion']??null)!==false ||
           ($outcome['public_site_changed']??null)!==false ||
           !is_array($outcome['decisions']??null) ||
           !array_is_list($outcome['decisions']) ||
           count($outcome['decisions'])>200) {
            throw new RuntimeException('JREI_META_TREND_EVIDENCE_INTEGRITY_UNAVAILABLE');
        }
        $count++;
        foreach($outcome['decisions'] as $decision) {
            if(!is_array($decision) ||
               !is_string($decision['domain']??null) ||
               !is_string($decision['decision']??null) ||
               !is_array($decision['reason_codes']??null) ||
               !array_is_list($decision['reason_codes']) ||
               count($decision['reason_codes'])>50 ||
               ($decision['mission_executed']??null)!==false ||
               ($decision['knowledge_promoted']??null)!==false ||
               ($decision['owner_approval_required']??null)!==true) {
                throw new RuntimeException('JREI_META_TREND_DECISION_INVALID');
            }
            $domain=$decision['domain'];
            $state=$decision['decision'];
            if(preg_match('/^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$/D',$domain)!==1 ||
               !in_array($state,[
                   'HOLD_RIGHTS_REVIEW','HOLD_SOURCE_OR_CITATION',
                   'HOLD_INDEPENDENT_EVIDENCE','HOLD_HELDOUT_REGRESSION',
                   'HOLD_INSUFFICIENT_BENCHMARK','PROPOSE_ISOLATED_EXPERIMENT',
                   'REVIEW_CHALLENGER_WITH_OWNER'
               ],true)) {
                throw new RuntimeException('JREI_META_TREND_STATE_INVALID');
            }
            if(!isset($domains[$domain])) {
                $domains[$domain]=[
                    'domain'=>$domain,'proposalCount'=>0,
                    'ownerReviewCandidates'=>0,'heldCount'=>0,
                    'proposedIsolatedExperiments'=>0
                ];
            }
            $domains[$domain]['proposalCount']++;
            if($state==='REVIEW_CHALLENGER_WITH_OWNER')
                $domains[$domain]['ownerReviewCandidates']++;
            elseif($state==='PROPOSE_ISOLATED_EXPERIMENT')
                $domains[$domain]['proposedIsolatedExperiments']++;
            else $domains[$domain]['heldCount']++;
        }
    }
    ksort($domains,SORT_STRING);
    return [
        'ok'=>true,
        'schema'=>'jr.jrei.metacognitive-owner-trend.v1',
        'sampleScope'=>'LAST_25_SAVED_OWNER_PROPOSALS_NOT_EXPERIMENTS',
        'cycleCount'=>$count,
        'domainSummaries'=>array_values($domains),
        'scientificImprovementVerified'=>false,
        'unreviewedProposalsUsedAsTrainingData'=>false,
        'automaticSkillPromotion'=>false,
        'sourceRightsOrCitationValidationPerformed'=>false,
        'workerJobExecuted'=>false,
    ];
}
