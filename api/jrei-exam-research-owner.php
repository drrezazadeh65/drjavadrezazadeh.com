<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/jrei-exam-coverage-readiness.php';
require_once __DIR__.'/jrei-ka-exam-coverage-matrix.php';
require_once __DIR__.'/jrei-ka-coverage-owner-review.php';
require_once __DIR__.'/jrei-ka-scheduler.php';
require_once __DIR__.'/jrei-ka-owner-controls.php';
require_once __DIR__.'/jrei-ka-paper-key-proposals.php';
require_once __DIR__.'/jrei-ka-paper-key-owner-review.php';
require_once __DIR__.'/jrei-ka-public-quote-owner.php';
require_once __DIR__.'/jrei-exam-commercial-owner-actions.php';
require_once __DIR__.'/jrei-exam-deadline-owner.php';
require_once __DIR__.'/jrei-exam-entitlement-owner.php';
require_once __DIR__.'/jrei-ai-owner-readiness.php';
require_once __DIR__.'/jrei-ai-benchmark-owner-actions.php';
require_once __DIR__.'/jrei-ai-benchmark-expert-review.php';

/**
 * Owner-only read/write metadata for the existing JREI ecosystem.
 * The existing Bertina PHP mother DB remains system of record. These routes
 * never fetch exam PDFs, execute Python/Node/model output, read participant
 * responses, grant research consent, approve sources or release new items.
 */
function jrExamResearchSchemaReady(PDO $pdo): bool {
    try{
        foreach([
            'SELECT id,discovery_enabled,extraction_enabled,generation_enabled,participant_enrolment_enabled,research_processing_enabled,policy_revision FROM jrei_exam_controls LIMIT 0',
            'SELECT source_id,source_authority_id,source_title,source_locator_digest,source_locator_uri,educational_level,exam_category,examination_year,subject_id,source_kind,rights_state,review_state,extraction_state,answer_key_state,created_at FROM jrei_exam_sources LIMIT 0',
            'SELECT requirement_id,educational_level,examination_year,subject_id,expected_kind,requirement_state FROM jrei_exam_coverage_requirements LIMIT 0',
            'SELECT discovery_id,result_state,rights_review_state,robots_review_state FROM jrei_exam_discovery_attempts LIMIT 0',
            'SELECT id,item_state,ambiguity_review_state,copyright_review_state,reviewed_by_account_id FROM jrei_exam_item_metadata LIMIT 0',
            'SELECT blueprint_id,status,format_review_state,timing_review_state,scoring_review_state FROM jrei_exam_blueprints LIMIT 0',
            'SELECT programme_id,status,exam_date_verified FROM jrei_exam_preparation_programmes LIMIT 0',
            'SELECT stage_id,stage_code,status FROM jrei_exam_preparation_stages LIMIT 0',
            'SELECT framework_version_id,framework_code,evidence_maturity,research_status,validated_composite_score FROM jrei_testly_framework_versions LIMIT 0',
            'SELECT indicator_id,evidence_maturity,operational_definition_state FROM jrei_testly_indicator_proposals LIMIT 0',
            'SELECT protocol_id,research_state,ethics_review_state,guardian_review_status FROM jrei_testly_research_protocols LIMIT 0',
            'SELECT dataset_id,dataset_state,external_export_approved FROM jrei_testly_research_datasets LIMIT 0',
            'SELECT analysis_id,interpretation,results_review_state FROM jrei_testly_research_analyses LIMIT 0'
        ] as $query)$pdo->query($query);
        return true;
    }catch(Throwable $e){return false;}
}
function jrExamResearchSummaryRows(PDO $pdo,string $sql): array {
    $q=$pdo->query($sql);
    $out=[];
    foreach($q as $r)$out[]=array_map(
      static fn($v)=>is_numeric($v)?(int)$v:$v,$r);
    return $out;
}
function jrExamResearchOwnerSnapshot(PDO $pdo,array $cfg): array {
    $ready=jrExamResearchSchemaReady($pdo);
    $base=[
      'ok'=>true,'schema'=>'jr.jrei.exam-research-owner.v1',
      'checkedAt'=>time(),'motherDbSchemaReady'=>$ready,
      'sourceOnly'=>true,
      'privateFeatureEnabled'=>($cfg['jrei_exam_research_enabled']??false)===true,
      'sourceCrawlVerified'=>false,'examQuestionGenerationVerified'=>false,
      'humanabilityEmpiricalValidationVerified'=>false,
      'testlyEmpiricalValidationVerified'=>false,
      'minorEnrolmentAuthorized'=>false,
      'realPsychometricAnalysesVerified'=>false,
      'realExamBlueprintsVerified'=>false,
      'workerInferenceVerified'=>false,
      'frameworkDefinitionSource'=>'AUTHOR_PROPOSAL_DIGESTS_REVIEWED_20261023',
      'controls'=>null,'sourceCoverage'=>[],
      'sourceReview'=>[],'sourceQueue'=>[],'coverageTargets'=>[],
      'coverageScopeReviewQueue'=>[],'intakeStates'=>[],
      'coverageObligations'=>[],'itemReviews'=>[],
      'blueprints'=>[],'preparationProgrammes'=>[],
      'preparationStages'=>[],'frameworks'=>[],
      'indicatorMaturity'=>[],'researchProtocols'=>[],
      'researchDatasets'=>[],'researchAnalyses'=>[],
      'coverageReadiness'=>[
         'schema'=>'jr.jrei.exam-coverage-readiness.v1',
         'ready'=>false,'totalRows'=>null,'examCoverage'=>[],
         'truncated'=>false,'answerKeyCorrectnessVerified'=>false,
         'questionBankPublishable'=>false],
       'knowledgeAcquisition'=>null,
       'notes'=>[
       'Missing migration means UNKNOWN, not zero.',
       'A crawler-discovered source is not necessarily licensed or official.',
       'TESTLY and Humanability remain preliminary original theoretical proposals.',
       'No score validity, psychometric outcome, official exam date or participant authorization is implied.'
      ]
    ];
    if(!$ready)return $base;
    $q=$pdo->query('SELECT discovery_enabled,extraction_enabled,generation_enabled,
         participant_enrolment_enabled,research_processing_enabled,
         policy_revision,updated_at FROM jrei_exam_controls WHERE id=1 LIMIT 1');
    $c=$q->fetch(PDO::FETCH_ASSOC);
    if($c)$base['controls']=[
       'discoveryEnabled'=>(int)$c['discovery_enabled']===1,
       'extractionEnabled'=>(int)$c['extraction_enabled']===1,
       'generationEnabled'=>(int)$c['generation_enabled']===1,
       'participantEnrolmentEnabled'=>(int)$c['participant_enrolment_enabled']===1,
       'researchProcessingEnabled'=>(int)$c['research_processing_enabled']===1,
       'policyRevision'=>(int)$c['policy_revision'],
       'updatedAt'=>(int)$c['updated_at']
    ];
    $base['sourceCoverage']=jrExamResearchSummaryRows($pdo,
      'SELECT country_code,curriculum_version,educational_level,
          exam_category,examination_year,subject_id,COUNT(*) AS source_count,
          SUM(CASE WHEN review_state=\'AUTHORITATIVE_REVIEWED\'
             AND rights_state IN (\'PERMITTED_PRIVATE_ANALYSIS\',
             \'PERMITTED_PUBLIC_DISPLAY\',\'PERMITTED_REPRODUCTION\')
             AND is_revoked=0 AND is_superseded=0
             THEN 1 ELSE 0 END) AS rights_reviewed_count
        FROM jrei_exam_sources GROUP BY country_code,curriculum_version,
          educational_level,exam_category,examination_year,subject_id
          ORDER BY examination_year DESC,
          educational_level ASC LIMIT 70');
    $base['sourceReview']=jrExamResearchSummaryRows($pdo,
      'SELECT review_state,rights_state,COUNT(*) AS count
        FROM jrei_exam_sources GROUP BY review_state,rights_state
        ORDER BY count DESC LIMIT 40');
    $base['sourceQueue']=jrExamResearchSummaryRows($pdo,
      "SELECT source_id,source_title,review_state,rights_state,
        extraction_state,examination_year FROM jrei_exam_sources
        WHERE review_state<>'QUARANTINED'
        ORDER BY updated_at DESC LIMIT 20");
    // Only metadata of still-unlinked research needs is sent to
    // SUPER_ADMIN after the original MFA gate; not a real missing-paper count.
    $base['coverageTargets']=jrExamResearchSummaryRows($pdo,
      "SELECT requirement_id,country_code,curriculum_id,curriculum_version,
        educational_level,grade,exam_category,examination_year,subject_id,
        expected_kind,requirement_state FROM jrei_exam_coverage_requirements
        WHERE source_id IS NULL AND requirement_state='REQUIRES_SOURCE_REVIEW'
        ORDER BY created_at DESC LIMIT 40");
    // A limited owner review queue. An approved SCOPE does not approve a
    // source, answer key, document right or candidate examination date.
    $base['coverageScopeReviewQueue']=jrExamResearchSummaryRows($pdo,
      "SELECT requirement_id,country_code,curriculum_id,curriculum_version,
        educational_level,grade,exam_category,examination_year,subject_id,
        expected_kind,requirement_state,
        CASE WHEN approved_by_account_id IS NULL THEN 0 ELSE 1 END
        AS owner_scope_approved,source_id
        FROM jrei_exam_coverage_requirements
        WHERE requirement_state IN
           ('REQUIRES_SOURCE_REVIEW','SOURCE_CANDIDATE_LINKED_UNREVIEWED')
        ORDER BY created_at DESC LIMIT 40");
    $base['intakeStates']=jrExamResearchSummaryRows($pdo,
      'SELECT result_state,rights_review_state,robots_review_state,
        COUNT(*) AS count FROM jrei_exam_discovery_attempts
        GROUP BY result_state,rights_review_state,robots_review_state
        ORDER BY count DESC LIMIT 40');
    $base['coverageObligations']=jrExamResearchSummaryRows($pdo,
      'SELECT country_code,curriculum_id,curriculum_version,
        educational_level,grade,examination_year,exam_category,subject_id,
        expected_kind,requirement_state,COUNT(*) AS count
        FROM jrei_exam_coverage_requirements
        GROUP BY country_code,curriculum_id,curriculum_version,
          educational_level,grade,examination_year,exam_category,
          subject_id,expected_kind,requirement_state
        ORDER BY examination_year DESC LIMIT 70');
    $base['itemReviews']=jrExamResearchSummaryRows($pdo,
      'SELECT item_state,ambiguity_review_state,copyright_review_state,
        COUNT(*) AS count FROM jrei_exam_item_metadata
        GROUP BY item_state,ambiguity_review_state,copyright_review_state
        ORDER BY count DESC LIMIT 50');
    $base['blueprints']=jrExamResearchSummaryRows($pdo,
      'SELECT status,format_review_state,timing_review_state,
        scoring_review_state,COUNT(*) AS count
        FROM jrei_exam_blueprints
        GROUP BY status,format_review_state,timing_review_state,
          scoring_review_state ORDER BY count DESC LIMIT 30');
    $base['preparationProgrammes']=jrExamResearchSummaryRows($pdo,
      'SELECT status,exam_date_verified,COUNT(*) AS count
        FROM jrei_exam_preparation_programmes
        GROUP BY status,exam_date_verified ORDER BY count DESC LIMIT 20');
    $base['preparationStages']=jrExamResearchSummaryRows($pdo,
      'SELECT stage_code,status,COUNT(*) AS count FROM jrei_exam_preparation_stages
        GROUP BY stage_code,status ORDER BY stage_code LIMIT 25');
    $base['frameworks']=jrExamResearchSummaryRows($pdo,
      'SELECT framework_code,evidence_maturity,research_status,
          validated_composite_score,COUNT(*) AS count
        FROM jrei_testly_framework_versions
        GROUP BY framework_code,evidence_maturity,research_status,
          validated_composite_score ORDER BY framework_code LIMIT 25');
    $base['indicatorMaturity']=jrExamResearchSummaryRows($pdo,
      'SELECT evidence_maturity,operational_definition_state,
        COUNT(*) AS count FROM jrei_testly_indicator_proposals
        GROUP BY evidence_maturity,operational_definition_state
        ORDER BY count DESC LIMIT 30');
    $base['researchProtocols']=jrExamResearchSummaryRows($pdo,
      'SELECT research_state,ethics_review_state,guardian_review_status,
        COUNT(*) AS count FROM jrei_testly_research_protocols
        GROUP BY research_state,ethics_review_state,guardian_review_status
        ORDER BY count DESC LIMIT 30');
    $base['researchDatasets']=jrExamResearchSummaryRows($pdo,
      'SELECT dataset_state,external_export_approved,COUNT(*) AS count
        FROM jrei_testly_research_datasets
        GROUP BY dataset_state,external_export_approved
        ORDER BY count DESC LIMIT 30');
    $base['researchAnalyses']=jrExamResearchSummaryRows($pdo,
      'SELECT interpretation,results_review_state,COUNT(*) AS count
        FROM jrei_testly_research_analyses
        GROUP BY interpretation,results_review_state
        ORDER BY count DESC LIMIT 30');
    $base['coverageReadiness']=jrExamOwnerCoverageReadiness($pdo);
    $base['knowledgeAcquisition']=jrKaOwnerSnapshot($pdo,$cfg);
    return $base;
}
/** Emergency stop across all proposed exam/research background features;
 * never resets legal/guardian consent or discards source history.
 * No resume API until legal, scientific and worker gating is complete.
 */
function jrExamResearchOwnerChange(PDO $pdo,array $cfg,string $actor,array $body): array {
    if(!jrExamResearchSchemaReady($pdo))
        throw new DomainException('jrei_exam_research_migration_required');
    $action=$body['action']??null;
    if(in_array($action,['ka_approve_coverage_scope',
       'ka_withdraw_coverage_scope'],true))
        return jrKaOwnerCoverageScopeDecision($pdo,$actor,$body);
    if($action==='ka_review_public_quote')
        return jrKaOwnerPublicQuoteDecision($pdo,$cfg,$actor,$body);
    if($action==='ai_disposition_improvement')
        return jrAiOwnerDispositionImprovement($pdo,$actor,$body);
    if($action==='ai_expert_grade_benchmark')
        return jrAiOwnerGradeBenchmark($pdo,$actor,$body);
    if($action==='ai_review_benchmark_case')
        return jrAiOwnerReviewBenchmarkCase($pdo,$actor,$body);
    if($action==='ka_revoke_public_quote')
        return jrKaOwnerRevokePublicQuote($pdo,$actor,$body);
    if($action==='ka_triage_paper_key')
        return jrKaOwnerTriagePaperKey($pdo,$actor,$body);
    if($action==='exam_revoke_entitlement')
        return jrExamOwnerRevokeEntitlement($pdo,$actor,$body);
    if($action==='exam_grant_verified_order')
        return jrExamOwnerGrantVerifiedOrder($pdo,$cfg,$actor,$body);
    if($action==='exam_close_expired_review')
        return jrExamDeadlineOwnerClose($pdo,$actor,$body);
    if(in_array($action,['exam_product_draft','exam_offering_draft',
        'exam_suspend_product','exam_suspend_offering'],true))
        return jrExamCommercialOwnerAction($pdo,$actor,$body);
    if(in_array($action,['ka_set_controls','ka_propose_source',
       'ka_approve_source','ka_suspend_source'],true))
        return jrKaOwnerControlChange($pdo,$cfg,$actor,$body);
    if($action==='pause_all'){
        $revision=$body['policyRevision']??null;
        if(!is_int($revision)||$revision<1||
           ($body['confirmation']??'')!=='PAUSE_JREI_EXAM_RESEARCH')
            throw new InvalidArgumentException('invalid_owner_pause_request');
        $now=time();
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('UPDATE jrei_exam_controls
                SET discovery_enabled=0,extraction_enabled=0,generation_enabled=0,
                  participant_enrolment_enabled=0,research_processing_enabled=0,
                  policy_revision=policy_revision+1,
                  updated_at=?,updated_by_account_id=?
                WHERE id=1 AND policy_revision=?');
            $q->execute([$now,$actor,$revision]);
            if($q->rowCount()!==1)
                throw new DomainException('jrei_exam_owner_revision_conflict');
            operationsAudit($pdo,$actor,'jrei_exam_research_paused','all');
            $pdo->commit();
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }elseif($action==='register_coverage_target'){
        // A coverage target records only a missing/unchecked *question* about
        // an examination. It does NOT certify that a paper exists or that its
        // exam date/capacity, answer key or copyright is verified.
        if(($body['confirmation']??'')!=='REGISTER_UNVERIFIED_EXAM_COVERAGE')
            throw new InvalidArgumentException('coverage_confirmation_required');
        $levels=[
          'PRIMARY'=>[1,2,3,4,5,6],
          'LOWER_SECONDARY'=>[7,8,9],
          'UPPER_SECONDARY'=>[10,11,12],
          'UNDERGRADUATE_ENTRANCE'=>[],
          'MASTERS_ENTRANCE'=>[],
          'DOCTORAL_ENTRANCE'=>[],
          'UNIVERSITY_ADVANCED'=>[]
        ];
        $types=['SCHOOL_INTERNAL','NATIONAL_FINAL','NATIONAL_ENTRANCE',
          'MASTERS_ENTRANCE','DOCTORAL_ENTRANCE','UNIVERSITY_COURSE',
          'ADVANCED_ACADEMIC'];
        $kinds=['EXAM_PAPER','ANSWER_KEY','MARKING_SCHEME',
          'CURRICULUM_BLUEPRINT','EXAMINATION_GUIDANCE'];
        $level=$body['level']??null;
        $kind=$body['expectedKind']??null;
        $category=$body['examCategory']??null;
        $country=$body['countryCode']??null;
        $year=$body['examYear']??null;
        $subject=$body['subjectId']??null;
        $curriculum=$body['curriculumId']??null;
        $version=$body['curriculumVersion']??null;
        $grade=$body['grade']??null;
        if(!is_string($level)||!array_key_exists($level,$levels)||
          !in_array($kind,$kinds,true)||!in_array($category,$types,true)||
          !is_string($country)||!preg_match('/^[A-Z]{2}$/D',$country)||
          !is_int($year)||$year<1300||$year>2400||
          !is_string($subject)||!preg_match('/^[A-Za-z0-9._:-]{1,100}$/D',$subject)||
          !is_string($curriculum)||!preg_match('/^[A-Za-z0-9._:-]{1,100}$/D',$curriculum)||
          !is_string($version)||!preg_match('/^[A-Za-z0-9._:-]{1,100}$/D',$version)||
          ($levels[$level] && (!is_int($grade)||
            !in_array($grade,$levels[$level],true)))||
          (!$levels[$level]&&$grade!==null))
            throw new InvalidArgumentException('invalid_coverage_scope');
        if($category==='SCHOOL_INTERNAL'&&!$levels[$level])
            throw new InvalidArgumentException('invalid_school_scope');
        if($category==='MASTERS_ENTRANCE'&&$level!=='MASTERS_ENTRANCE'||
           $category==='DOCTORAL_ENTRANCE'&&$level!=='DOCTORAL_ENTRANCE'||
           $category==='NATIONAL_ENTRANCE'&&$level!=='UNDERGRADUATE_ENTRANCE')
            throw new InvalidArgumentException('invalid_entrance_scope');
        // Registered intent remains REQUIRES_SOURCE_REVIEW; never MISSING or
        // VERIFIED from owner text alone. The original source still needs
        // independent authorization before any crawler/OCR job.
        $bytes=random_bytes(16);
        $bytes[6]=chr((ord($bytes[6])&15)|64);
        $bytes[8]=chr((ord($bytes[8])&63)|128);
        $h=bin2hex($bytes);
        $id=substr($h,0,8).'-'.substr($h,8,4).'-'.
          substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20);
        $pdo->beginTransaction();
        try {
            $q=$pdo->prepare('INSERT IGNORE INTO jrei_exam_coverage_requirements
              (requirement_id,educational_level,grade,country_code,
               curriculum_id,curriculum_version,exam_category,
               examination_year,subject_id,expected_kind,requirement_state,
               created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
            $q->execute([$id,$level,$grade??0,$country,$curriculum,
                $version,$category,$year,$subject,$kind,
                'REQUIRES_SOURCE_REVIEW',time()]);
            if($q->rowCount()!==1)
                throw new DomainException('coverage_target_exists');
            operationsAudit($pdo,$actor,'jrei_exam_coverage_registered',$id);
            $pdo->commit();
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }elseif($action==='register_source_candidate'){
        // Human-submitted candidate metadata only: NO HTTP request, crawler,
        // PDF download, OCR, model tool execution, scientific approval or
        // copyright permission follows from an owner-supplied link.
        if(($body['confirmation']??'')!=='REGISTER_UNREVIEWED_SOURCE_CANDIDATE')
            throw new InvalidArgumentException('source_candidate_confirmation_required');
        $target=$body['coverageRequirementId']??null;
        $url=$body['candidateUrl']??null;
        $issuer=$body['issuerId']??null;
        $title=$body['sourceTitle']??null;
        $version=$body['sourceVersion']??null;
        $publicationDate=$body['publicationDate']??null;
        $uuidPattern='/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D';
        $identPattern='/^[A-Za-z0-9._:-]{1,100}$/D';
        if(!is_string($target)||!preg_match($uuidPattern,$target)||
           !is_string($issuer)||!preg_match($identPattern,$issuer)||
           !is_string($version)||!preg_match($identPattern,$version)||
           !is_string($title)||(!preg_match('//u',$title)||
             (function_exists('mb_strlen')
               ?mb_strlen($title,'UTF-8')
               :preg_match_all('/./us',$title))<4)||
           (function_exists('mb_strlen')
             ?mb_strlen($title,'UTF-8')
             :preg_match_all('/./us',$title))>240||
           preg_match('/[<>\\x00-\\x1F\\x7F]/u',$title)||
           !is_string($url)||strlen($url)<12||strlen($url)>1200)
            throw new InvalidArgumentException('invalid_source_candidate');
        if($publicationDate!==null) {
            if(!is_string($publicationDate)||
               !preg_match('/^(20\\d{2})-(0[1-9]|1[0-2])-([0-2]\\d|3[01])$/D',$publicationDate))
                throw new InvalidArgumentException('invalid_source_date');
            $parts=explode('-',$publicationDate);
            if(!checkdate((int)$parts[1],(int)$parts[2],(int)$parts[0]))
                throw new InvalidArgumentException('invalid_source_date');
        }
        // Prevent stored credential-bearing links, private IP literals,
        // URL query tokens and disguised/non-HTTPS hosts. This validation
        // does not replace real DNS+IP/redirect checks before future fetch.
        $components=parse_url($url);
        if(!is_array($components)||
           ($components['scheme']??'')!=='https'||
           !isset($components['host'])||
           isset($components['user'])||isset($components['pass'])||
           isset($components['port'])||isset($components['query'])||
           isset($components['fragment']))
            throw new InvalidArgumentException('source_url_not_safe_for_metadata');
        $host=strtolower($components['host']);
        if(strlen($host)>253||!preg_match(
            '/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/D',
            $host)||filter_var($host,FILTER_VALIDATE_IP)!==false||
            str_ends_with($host,'.local')||
            str_ends_with($host,'.internal')||
            str_ends_with($host,'.test')||
            str_ends_with($host,'.example')||
            str_ends_with($host,'.invalid'))
            throw new InvalidArgumentException('source_host_not_approved');
        $path=$components['path']??'/';
        if(strlen($path)>950||str_contains($path,'\\')||
           preg_match('~(?:^|/)(?:\\.\\.|%2e%2e)(?:/|$)~i',$path))
            throw new InvalidArgumentException('source_path_invalid');
        $normalizedUrl='https://'.$host.($path===''?'/':$path);
        $locatorDigest=hash('sha256',$normalizedUrl);
        $now=time();
        $pdo->beginTransaction();
        try {
            $q=$pdo->prepare("SELECT country_code,curriculum_version,
                educational_level,exam_category,examination_year,subject_id,
                expected_kind,requirement_state,source_id
                FROM jrei_exam_coverage_requirements WHERE requirement_id=?
                FOR UPDATE");
            $q->execute([$target]);
            $coverage=$q->fetch(PDO::FETCH_ASSOC);
            if(!$coverage||$coverage['source_id']!==null||
               $coverage['requirement_state']!=='REQUIRES_SOURCE_REVIEW')
                throw new DomainException('coverage_target_not_open');
            $bytes=random_bytes(16);
            $bytes[6]=chr((ord($bytes[6])&15)|64);
            $bytes[8]=chr((ord($bytes[8])&63)|128);
            $h=bin2hex($bytes);
            $id=substr($h,0,8).'-'.substr($h,8,4).'-'.
              substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20);
            try{
                $q=$pdo->prepare("INSERT INTO jrei_exam_sources
                 (source_id,source_authority_id,source_title,publication_date,
                  source_version,source_locator_digest,source_locator_uri,
                  country_code,educational_level,exam_category,
                  curriculum_version,subject_id,examination_year,source_kind,
                  rights_state,review_state,extraction_state,answer_key_state,
                  created_at,updated_at)
                 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,
                   'PERMISSION_UNVERIFIED','CANDIDATE_UNREVIEWED',
                   'NOT_STARTED','UNKNOWN',?,?)");
                $q->execute([$id,$issuer,trim($title),$publicationDate,$version,
                    $locatorDigest,$normalizedUrl,$coverage['country_code'],
                    $coverage['educational_level'],$coverage['exam_category'],
                    $coverage['curriculum_version'],$coverage['subject_id'],
                    (int)$coverage['examination_year'],
                    $coverage['expected_kind'],$now,$now]);
            }catch(PDOException $e){
                if((string)$e->getCode()==='23000')
                    throw new DomainException('source_candidate_already_registered',0,$e);
                throw $e;
            }
            $q=$pdo->prepare("UPDATE jrei_exam_coverage_requirements
                SET source_id=?,
                    requirement_state='SOURCE_CANDIDATE_LINKED_UNREVIEWED'
                WHERE requirement_id=? AND source_id IS NULL AND
                      requirement_state='REQUIRES_SOURCE_REVIEW'");
            $q->execute([$id,$target]);
            if($q->rowCount()!==1)
                throw new DomainException('coverage_target_conflict');
            operationsAudit($pdo,$actor,'jrei_exam_source_candidate',$id);
            $pdo->commit();
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }elseif($action==='quarantine_source'){
        $sourceId=$body['sourceId']??null;
        if(!is_string($sourceId)||!preg_match(
            '/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D',
            $sourceId)||
            ($body['confirmation']??'')!=='QUARANTINE_UNVERIFIED_EXAM_SOURCE')
            throw new InvalidArgumentException('invalid_source_quarantine_request');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare("UPDATE jrei_exam_sources SET
                review_state='QUARANTINED',
                extraction_state='HALTED',rights_state='PERMISSION_UNVERIFIED',
                updated_at=? WHERE source_id=?
                AND review_state<>'QUARANTINED'");
            $q->execute([time(),$sourceId]);
            if($q->rowCount()!==1)
                throw new DomainException('jrei_exam_source_not_found');
            operationsAudit($pdo,$actor,'jrei_exam_source_quarantined',
                substr(hash('sha256',$sourceId),0,64));
            $pdo->commit();
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }else{
        throw new InvalidArgumentException('unimplemented_exam_research_mutation');
    }
    return jrExamResearchOwnerSnapshot($pdo,$cfg);
}
