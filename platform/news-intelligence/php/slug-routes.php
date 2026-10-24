<?php
declare(strict_types=1);
/**
 * Deterministic proposed (NOT reserved) new-news bilingual slugs.
 * This PHP function is the authoritative draft source on Bertina. The
 * immutable public route registry and original CMS must recheck before write.
 * No existing URL is modified, redirected or reused by this proposal.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

function jrNewsProposeBilingualDraftRoutes(
    string $englishHeadline,string $candidateFingerprint
): array {
    if (strlen($englishHeadline)>720 ||
        strlen(trim($englishHeadline))<8||
        !preg_match('/^[a-f0-9]{64}$/D',$candidateFingerprint)) {
        throw new InvalidArgumentException('news_slug_proposal_invalid');
    }
    $normalized=strtolower(trim($englishHeadline));
    if (function_exists('transliterator_transliterate')) {
        $transformed=transliterator_transliterate(
            'Any-Latin; Latin-ASCII; Lower()',$normalized);
        if (is_string($transformed))$normalized=$transformed;
    }
    $normalized=preg_replace('/[^a-z0-9]+/','-',$normalized);
    if (!is_string($normalized))$normalized='';
    $tokens=array_values(array_filter(explode('-',$normalized),
        static fn(string $part): bool => $part!==''));
    $stem=implode('-',array_slice($tokens,0,9));
    $stem=rtrim(substr($stem,0,72),'-');
    if ($stem==='')$stem='education-update';
    $slug=$stem.'-'.substr($candidateFingerprint,0,12);
    return [
        'schema'=>'jr.jrei.news-bilingual-proposed-routes.v1',
        'slug'=>$slug,
        'faPath'=>'/fa/akhbar/'.$slug.'/',
        'enPath'=>'/en/news-insights/'.$slug.'/',
        'candidateFingerprint'=>$candidateFingerprint,
        'routesReserved'=>false,
        'immutableRegistryCollisionCheckRequired'=>true,
        'ownerMustSeeRoutesBeforeApproval'=>true
    ];
}
