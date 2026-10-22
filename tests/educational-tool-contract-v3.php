<?php
declare(strict_types=1);

// Isolated synthetic contract validation: NO HTTP, DB, production routes or PII.
define('BERTINA_API_BOOTSTRAPPED', true);
require_once __DIR__.'/../api/internal/educational-tool-contract-v3.php';
require_once __DIR__.'/../api/konkur-admission.php';

function jrEiFixtureAssert(bool $condition, string $why): void {
    if (!$condition) { fwrite(STDERR, "FAIL: ".$why."\n"); exit(1); }
}
function jrEiFixtureObject(mixed $value): stdClass {
    $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    $result = json_decode($json, false, 64, JSON_THROW_ON_ERROR);
    jrEiFixtureAssert($result instanceof stdClass, 'synthetic fixture must be an object');
    return $result;
}

$path = __DIR__.'/fixtures/educational-tool-contract-v3.synthetic.json';
$fixture = json_decode((string)file_get_contents($path), false, 64, JSON_THROW_ON_ERROR);
jrEiFixtureAssert($fixture instanceof stdClass && $fixture->fixtureOnly === true,
    'fixture provenance missing');
jrEiFixtureAssert(str_contains($fixture->warning, 'SYNTHETIC'),
    'must not treat CI fiction as authoritative sources');

$tools = jrEiV3ToolSchema();
jrEiFixtureAssert(count($tools) === 7, 'all planned tool names must be defined');
jrEiFixtureAssert($tools['SOURCE_REVIEWED_CATALOGUE_QUERY']['enabled'] === true,
    'only public catalogue tool may be structurally ready');
foreach ($tools as $name => $policy) {
    jrEiFixtureAssert(!in_array($policy['effect'], ['WRITE', 'MUTATE'], true),
        'no mutable tool is permitted: '.$name);
    if ($name !== 'SOURCE_REVIEWED_CATALOGUE_QUERY')
        jrEiFixtureAssert($policy['enabled'] === false, 'private or unvalidated tool enabled: '.$name);
}

$count = 0;
$publicCall = null;
foreach ($fixture->proposals as $case) {
    $actual = jrEiV3CompileToolProposal($case->proposal);
    if (isset($case->expectReason)) {
        jrEiFixtureAssert($actual['status'] === 'BLOCKED' &&
            $actual['reason'] === $case->expectReason, 'denial case: '.$case->name);
    } else {
        jrEiFixtureAssert($actual['status'] === $case->expectStatus, 'positive case: '.$case->name);
        jrEiFixtureAssert($actual['method'] === 'GET' &&
            $actual['path'] === '/api/konkur/programmes' &&
            $actual['privateLearnerDataPermitted'] === false &&
            $actual['modelMayOverride'] === false &&
            $actual['sourceAuthenticityVerified'] === false,
            'public tool safety flags: '.$case->name);
        if ($case->name === 'public_lookup') $publicCall = $actual;
    }
    $count++;
}
jrEiFixtureAssert(is_array($publicCall), 'missing public baseline');

$parsed = parse_url($publicCall['relativeUrl']);
jrEiFixtureAssert(($parsed['path'] ?? null) === '/api/konkur/programmes',
    'API route path drift');
parse_str((string)($parsed['query'] ?? ''), $params);
jrEiFixtureAssert(($params['year'] ?? null) === '1405' &&
    ($params['group'] ?? null) === 'HUMANITIES' &&
    ($params['q'] ?? null) === 'حقوق',
    'encoded query loses reviewed request constraints');

// Existing PHP admission API is included as DEFINITIONS ONLY: no route call.
$sql = konkurApprovedCatalogueSql();
foreach ([
    'eco_admission_programme_offerings', 'eco_admission_document_pages',
    'eco_admission_documents', 'QA_APPROVED', 'REVIEWED',
    'conditions_review_state', 'supersedes_document_id',
    'record_revision>p.record_revision', 'original_pdf_sha256',
] as $invariant) jrEiFixtureAssert(str_contains($sql, $invariant),
    'existing PHP authoritative SQL gate drift: '.$invariant);
$api = (string)file_get_contents(__DIR__.'/../api/konkur-admission.php');
foreach (['konkurPublicSearchUnsafe($search)', "bindValue(':year'", "bindValue(':group'",
    'PDO::PARAM_INT', 'PDO::PARAM_STR'] as $invariant)
    jrEiFixtureAssert(str_contains($api, $invariant), 'bound PHP route invariant: '.$invariant);

$trustedResponse = $fixture->syntheticCatalogueResponse;
$reviewed = jrEiV3ReviewCatalogueEnvelope($publicCall, $trustedResponse);
jrEiFixtureAssert($reviewed['status'] === 'STRUCTURALLY_VALID_PUBLIC_FACTS',
    'synthetic reviewed envelope should structurally pass');
jrEiFixtureAssert($reviewed['sourceAuthenticityVerified'] === false &&
    $reviewed['admissionProbabilityEnabled'] === false &&
    $reviewed['individualEligibilityAssessed'] === false &&
    $reviewed['facts'][0]['probability'] === null,
    'synthetic approval must not become real evidence or a prediction');
jrEiFixtureAssert($reviewed['facts'][0]['programmeCode'] === '01234',
    'leading zero programme code must not be converted to a number');

$mutations = [
    'forged_individual_eligibility' => static function (stdClass $r): void {
        $r->eligibilityAssessment = 'PERFORMED';
    },
    'forged_approval' => static function (stdClass $r): void {
        $r->sourceVerification = 'PENDING';
    },
    'forged_application' => static function (stdClass $r): void {
        $r->records[0]->officialRegistration = true;
    },
    'private_row_injection' => static function (stdClass $r): void {
        $r->records[0]->studentEmail = 'synthetic@example.invalid';
    },
    'private_response_injection' => static function (stdClass $r): void {
        $r->learnerId = 'CI_ONLY';
    },
    'source_page_missing' => static function (stdClass $r): void {
        $r->records[0]->sourcePdfPage = null;
    },
    'wrong_year' => static function (stdClass $r): void {
        $r->records[0]->year = 1404;
    },
    'wrong_group' => static function (stdClass $r): void {
        $r->records[0]->examinationGroup = 'EXPERIMENTAL';
    },
    'oversized_response' => static function (stdClass $r): void {
        $r->records = array_fill(0, 11, $r->records[0]);
    },
    'model_prediction' => static function (stdClass $r): void {
        $r->admissionProbabilityEnabled = true;
    },
];
foreach ($mutations as $name=>$mutate) {
    $response = jrEiFixtureObject($trustedResponse);
    $mutate($response);
    $actual = jrEiV3ReviewCatalogueEnvelope($publicCall, $response);
    jrEiFixtureAssert($actual['status'] === 'UNAVAILABLE' &&
        $actual['facts'] === [] && $actual['sourceAuthenticityVerified'] === false,
        'mutation must fail closed: '.$name);
    $count++;
}

foreach (['OFFICIAL_CATALOGUE_NOT_READY','NO_SOURCE_APPROVED_RECORDS'] as $state) {
    $response = jrEiFixtureObject($trustedResponse);
    $response->status = $state;
    $response->records = [];
    $result = jrEiV3ReviewCatalogueEnvelope($publicCall, $response);
    jrEiFixtureAssert($result['status'] === 'UNAVAILABLE', 'empty catalogue must not fabricate records');
    $count++;
}
jrEiFixtureAssert(jrEiV3ReviewCatalogueEnvelope(jrEiV3Deny('TEST'), $trustedResponse)['status'] === 'UNAVAILABLE',
    'blocked plan cannot be laundered into public facts');
echo 'JR EI V3 internal PHP boundary: '.$count.' synthetic cases passed. No DB/network/model/DDL.'."\n";
