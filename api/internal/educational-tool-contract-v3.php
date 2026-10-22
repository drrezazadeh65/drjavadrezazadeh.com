<?php
declare(strict_types=1);

/**
 * JR Educational Intelligence V3.1: INTERNAL, NON-EXECUTING PHP tool contract.
 * This is not a route, model gateway, session verifier or evidence authenticator.
 * Never use client-supplied claims of consent, identity, guardianship or review.
 * This file lives under api/internal/ (Require all denied).
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once dirname(__DIR__).'/konkur-public-search-guard.php';

function jrEiV3ToolSchema(): array {
    return [
        'SOURCE_REVIEWED_CATALOGUE_QUERY' => [
            'enabled' => true, 'method' => 'GET', 'path' => '/api/konkur/programmes',
            'access' => 'PUBLIC_SOURCE_FACTS_ONLY', 'effect' => 'READ_ONLY',
        ],
        'DETERMINISTIC_ELIGIBILITY_ENGINE' => [
            'enabled' => false, 'access' => 'AUTHENTICATED_REVIEWED_RULES', 'effect' => 'READ_ONLY',
        ],
        'PROVIDER_NATIVE_TREND_ANALYSIS' => [
            'enabled' => false, 'access' => 'ACCOUNT_SCOPED_CONSENTED', 'effect' => 'READ_ONLY',
        ],
        'PERSONAL_PREFERENCE_COMPARISON' => [
            'enabled' => false, 'access' => 'ACCOUNT_SCOPED_CONSENTED', 'effect' => 'READ_ONLY',
        ],
        'DESCRIPTIVE_STUDY_PLAN' => [
            'enabled' => false, 'access' => 'ACCOUNT_SCOPED_CONSENTED', 'effect' => 'READ_ONLY',
        ],
        'PROFESSIONAL_REVIEW_HANDOFF' => [
            'enabled' => false, 'access' => 'EXPLICIT_HUMAN_APPROVAL', 'effect' => 'PROPOSE_ONLY',
        ],
        'ADMISSION_PROBABILITY' => [
            'enabled' => false, 'access' => 'VALIDATED_MODEL_UNAVAILABLE', 'effect' => 'NONE',
        ],
    ];
}

function jrEiV3Deny(string $reason): array {
    return [
        'version' => '3.1.0-internal-source-only', 'status' => 'BLOCKED',
        'reason' => $reason, 'method' => null, 'path' => null,
        'relativeUrl' => null, 'modelMayOverride' => false,
        'privateLearnerDataPermitted' => false,
        'admissionProbabilityEnabled' => false,
        'officialApplicationSubmitted' => false,
    ];
}

function jrEiV3OnlyKeys(object $value, array $allowed): bool {
    foreach (array_keys(get_object_vars($value)) as $key) {
        if (!in_array($key, $allowed, true)) return false;
    }
    return true;
}

function jrEiV3NonEmptyText(mixed $value, int $max): bool {
    return is_string($value) && trim($value) !== '' &&
        strlen($value) <= $max && preg_match('//u', $value) === 1 &&
        preg_match('/[\x00-\x1F\x7F\x{061C}\x{200E}\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}]/u', $value) !== 1;
}

/** Compile untrusted typed tool arguments, never execute network or SQL. */
function jrEiV3CompileToolProposal(mixed $proposal): array {
    if (!$proposal instanceof stdClass ||
        !jrEiV3OnlyKeys($proposal, ['tool', 'arguments']) ||
        !isset($proposal->tool, $proposal->arguments) ||
        !is_string($proposal->tool) || !$proposal->arguments instanceof stdClass) {
        return jrEiV3Deny('INVALID_TOOL_ENVELOPE');
    }
    $schema = jrEiV3ToolSchema();
    if (!isset($schema[$proposal->tool])) return jrEiV3Deny('UNKNOWN_TOOL');
    if ($schema[$proposal->tool]['enabled'] !== true)
        return jrEiV3Deny('TOOL_NOT_ACTIVATED');
    if (!jrEiV3OnlyKeys($proposal->arguments, ['year','group','q','limit','page']))
        return jrEiV3Deny('INVALID_TOOL_ARGUMENT_SCHEMA');

    $a = $proposal->arguments;
    if (!isset($a->year) || !is_int($a->year) || $a->year < 1300 || $a->year > 1499)
        return jrEiV3Deny('INVALID_ADMISSION_YEAR');
    if (property_exists($a, 'group') &&
        (!is_string($a->group) || preg_match('/^[A-Z0-9_]{2,60}$/D', $a->group) !== 1))
        return jrEiV3Deny('INVALID_EXAMINATION_GROUP');
    $limit = property_exists($a, 'limit') ? $a->limit : 20;
    $page = property_exists($a, 'page') ? $a->page : 1;
    if (!is_int($limit) || $limit < 1 || $limit > 50)
        return jrEiV3Deny('INVALID_LIMIT');
    if (!is_int($page) || $page < 1 || $page > 999)
        return jrEiV3Deny('INVALID_PAGE');
    if (($page - 1) * $limit > 5000) return jrEiV3Deny('PAGE_OUT_OF_RANGE');

    $q = property_exists($a, 'q') ? $a->q : '';
    if (!is_string($q) || strlen($q) > 512 || preg_match('//u', $q) !== 1)
        return jrEiV3Deny('INVALID_SEARCH');
    $q = trim($q);
    // Use a Unicode-codepoint bound even if the host lacks mbstring.
    $characters = preg_match_all('/./us', $q);
    if ($characters === false || $characters > 80 ||
        preg_match('/[\x00-\x1F\x7F\x{061C}\x{200E}\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}]/u', $q) === 1 ||
        konkurPublicSearchUnsafe($q)) {
        return jrEiV3Deny('SEARCH_NOT_SUITABLE_FOR_PUBLIC_URL');
    }
    $query = ['year'=>$a->year, 'limit'=>$limit, 'page'=>$page];
    if (property_exists($a, 'group')) $query['group'] = $a->group;
    if ($q !== '') $query['q'] = $q;
    return [
        'version' => '3.1.0-internal-source-only',
        'status' => 'READY_FOR_PUBLIC_READ', 'method' => 'GET',
        'path' => '/api/konkur/programmes',
        'relativeUrl' => '/api/konkur/programmes?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986),
        'validatedArguments' => $query,
        'requiresTrustedBackendResponse' => true, 'requiresAccountData' => false,
        'requiresCatalogueAdapter' => true,
        'sourceAuthenticityVerified' => false, 'modelMayOverride' => false,
        'privateLearnerDataPermitted' => false,
        'admissionProbabilityEnabled' => false, 'officialApplicationSubmitted' => false,
    ];
}

/**
 * Structural adapter for the existing PHP catalogue response contract.
 * Never interpret its metadata as independent authentication of documents.
 * Return a narrowed PUBLIC fact projection; reject unknown private row fields.
 */
function jrEiV3ReviewCatalogueEnvelope(array $compiled, mixed $payload): array {
    $unavailable = static fn(string $reason): array => [
        'status' => 'UNAVAILABLE', 'reason' => $reason, 'facts' => [],
        'sourceAuthenticityVerified' => false, 'modelMayOverride' => false,
        'individualEligibilityAssessed' => false, 'admissionProbabilityEnabled' => false,
    ];
    if (($compiled['status'] ?? null) !== 'READY_FOR_PUBLIC_READ' ||
        ($compiled['path'] ?? null) !== '/api/konkur/programmes' ||
        !isset($compiled['validatedArguments']) || !is_array($compiled['validatedArguments']))
        return $unavailable('UNTRUSTED_TOOL_PLAN');
    if (!$payload instanceof stdClass) return $unavailable('INVALID_RESPONSE');
    $allowed = ['ok','year','status','records','limit','page','sourceVerification',
        'eligibilityAssessment','admissionProbabilityEnabled','officialApplicationSubmitted'];
    if (!jrEiV3OnlyKeys($payload, $allowed) ||
        ($payload->ok ?? null) !== true ||
        ($payload->year ?? null) !== $compiled['validatedArguments']['year'] ||
        ($payload->eligibilityAssessment ?? null) !== 'NOT_PERFORMED' ||
        ($payload->admissionProbabilityEnabled ?? null) !== false ||
        ($payload->officialApplicationSubmitted ?? null) !== false)
        return $unavailable('INVALID_SERVER_CONTRACT');

    if (in_array($payload->status ?? null, ['OFFICIAL_CATALOGUE_NOT_READY','NO_SOURCE_APPROVED_RECORDS'], true) &&
        isset($payload->records) && is_array($payload->records) && count($payload->records) === 0)
        return $unavailable('NO_APPROVED_CATALOGUE_RECORDS');

    if (($payload->status ?? null) !== 'SOURCE_REVIEWED_CATALOGUE' ||
        ($payload->sourceVerification ?? null) !== 'HUMAN_REVIEWED' ||
        ($payload->limit ?? null) !== $compiled['validatedArguments']['limit'] ||
        ($payload->page ?? null) !== $compiled['validatedArguments']['page'] ||
        !isset($payload->records) || !is_array($payload->records) ||
        count($payload->records) < 1 ||
        count($payload->records) > $compiled['validatedArguments']['limit'])
        return $unavailable('SOURCE_REVIEW_OR_PAGINATION_INVALID');

    $rowKeys = ['programmeCode','examinationGroup','admissionTrack','university',
        'campus','province','city','programme','degree','admissionMethod',
        'capacity','tuitionStatus','year','sourceDocument','sourceRevision',
        'sourcePdfPage','sourcePrintedPage','eligibilityStatus','officialRegistration'];
    $facts = [];
    foreach ($payload->records as $row) {
        if (!$row instanceof stdClass || !jrEiV3OnlyKeys($row, $rowKeys) ||
            !isset($row->programmeCode, $row->programme, $row->university,
                $row->sourceDocument, $row->sourceRevision, $row->sourcePdfPage,
                $row->year, $row->examinationGroup) ||
            !is_string($row->programmeCode) ||
            preg_match('/^[0-9]{5}$/D', $row->programmeCode) !== 1 ||
            !jrEiV3NonEmptyText($row->programme, 220) ||
            !jrEiV3NonEmptyText($row->university, 220) ||
            !jrEiV3NonEmptyText($row->sourceDocument, 160) ||
            !jrEiV3NonEmptyText($row->examinationGroup, 60) ||
            $row->year !== $compiled['validatedArguments']['year'] ||
            !is_int($row->sourceRevision) || $row->sourceRevision < 1 ||
            !is_int($row->sourcePdfPage) || $row->sourcePdfPage < 1 ||
            (isset($row->capacity) && (!is_int($row->capacity) || $row->capacity < 0)) ||
            ($row->eligibilityStatus ?? null) !== 'NOT_ASSESSED' ||
            ($row->officialRegistration ?? null) !== false ||
            (isset($compiled['validatedArguments']['group']) &&
                $row->examinationGroup !== $compiled['validatedArguments']['group']))
            return $unavailable('ROW_PROVENANCE_OR_SCHEMA_INVALID');
        $facts[] = [
            'programmeCode' => $row->programmeCode,
            'programme' => $row->programme,
            'university' => $row->university,
            'city' => isset($row->city) && jrEiV3NonEmptyText($row->city, 140) ? $row->city : null,
            'admissionYear' => $row->year,
            'sourceDocument' => $row->sourceDocument,
            'sourceRevision' => $row->sourceRevision,
            'sourcePdfPage' => $row->sourcePdfPage,
            'eligibility' => 'NOT_ASSESSED',
            'probability' => null,
        ];
    }
    return [
        'status' => 'STRUCTURALLY_VALID_PUBLIC_FACTS', 'facts' => $facts,
        'evidenceLevel' => 'API_ASSERTED_HUMAN_REVIEW_NOT_INDEPENDENTLY_VERIFIED',
        'sourceAuthenticityVerified' => false, 'modelMayOverride' => false,
        'individualEligibilityAssessed' => false, 'admissionProbabilityEnabled' => false,
        'officialApplicationSubmitted' => false,
    ];
}
