<?php
declare(strict_types=1);
/**
 * JREI NEWS EDITORIAL DRAFT STORE — private mother DB, source only.
 *
 * A real source reviewer must have accepted original evidence in
 * jrei_news_evidence_reviews. A verified JREI worker may stage language
 * drafts for human owner review, but cannot authorize publication.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/candidate-intake.php';
require_once __DIR__.'/slug-routes.php';

function jrNewsCleanEditorialLanguage(array $input,string $language): array {
    if (($input['language']??null)!==$language)
        throw new InvalidArgumentException('news_draft_language_mismatch');
    // Character bounds match render-public.mjs, with independent byte caps.
    $fields=[
        'headline'=>[8,180,720],
        'summary'=>[20,1000,4000],
        'body'=>[40,30000,120000],
        'nextSteps'=>[10,3000,12000],
        'description'=>[40,320,1280],
        'sourceUrl'=>[12,1000,1000]
    ];
    $clean=['language'=>$language];
    foreach ($fields as $key=>$bounds) {
        $v=$input[$key]??null;
        if (!is_string($v)||trim($v)===''||
            strlen($v)>$bounds[2]||str_contains($v,"\0")) {
            throw new InvalidArgumentException('news_draft_missing_'.$key);
        }
        $characters=preg_match_all('/./us',$v);
        if($characters===false||$characters<$bounds[0]||
            $characters>$bounds[1]||
            preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/',$v)) {
            throw new InvalidArgumentException('news_draft_character_bounds_'.$key);
        }
        $clean[$key]=trim($v);
    }
    if (!preg_match('#^https://[^/]+/#i',$clean['sourceUrl']))
        throw new InvalidArgumentException('news_draft_source_invalid');
    return $clean;
}
function jrNewsStoreEvidenceReviewedDraft(
    PDO $pdo, string $candidateId, string $reviewId,
    array $draft, callable $verifyOriginalJreiWorker,
    callable $validateLicensedMedia, int $now
): array {
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$candidateId)||
        !preg_match('/^[a-f0-9-]{36}$/iD',$reviewId)||
        $now<=0||$verifyOriginalJreiWorker('NEWS_PRIVATE_DRAFT')!==true) {
        throw new RuntimeException('news_draft_worker_not_authorized');
    }
    $fa=jrNewsCleanEditorialLanguage((array)($draft['fa']??[]),'fa');
    $en=jrNewsCleanEditorialLanguage((array)($draft['en']??[]),'en');
    $image=$draft['imageAssetReference']??null;
    // Empty string is the explicit, independently selected TEXT-FIRST
    // visual policy. NULL and unverified asset references remain invalid.
    // The signed draft/QA ledger binds this exact choice immutably.
    if (!is_string($image)||strlen($image)>500||
        $validateLicensedMedia($image)!==true) {
        throw new RuntimeException('news_draft_visual_policy_not_verified');
    }
    $links=$draft['internalLinks']??[];
    if (!is_array($links)||count($links)>16) {
        throw new InvalidArgumentException('news_draft_links_invalid');
    }
    $sanitized=[];
    foreach ($links as $item) {
        if (!is_array($item)||
            !in_array($item['language']??null,['fa','en'],true)||
            !is_string($item['path']??null)||
            !preg_match('#^/(?:fa|en)/[a-z0-9/-]+/$#D',$item['path'])||
            str_contains($item['path'],'//')||
            !is_string($item['anchor']??null)||
            (function_exists('mb_strlen') ?
                mb_strlen($item['anchor'],'UTF-8')>120 :
                strlen($item['anchor'])>480)) {
            throw new InvalidArgumentException('news_draft_link_invalid');
        }
        $sanitized[]=[
            'language'=>$item['language'],'path'=>$item['path'],
            'anchor'=>$item['anchor']];
    }
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare(
            'SELECT c.source_url,c.content_sha256,c.candidate_id,
                    c.fingerprint_sha256,e.review_id,e.verification_state,e.issuer_verified,
                    e.usage_rights_verified,e.content_sha256 AS reviewed_sha
             FROM jrei_news_candidates c
             JOIN jrei_news_evidence_reviews e
               ON e.candidate_id=c.candidate_id
             WHERE c.candidate_id=? AND e.review_id=?
             FOR UPDATE'
        );
        $q->execute([$candidateId,$reviewId]);
        $record=$q->fetch(PDO::FETCH_ASSOC);
        if (!$record||
            $record['verification_state']!=='APPROVED'||
            (int)$record['issuer_verified']!==1||
            (int)$record['usage_rights_verified']!==1||
            !hash_equals((string)$record['content_sha256'],
                (string)$record['reviewed_sha'])||
            $fa['sourceUrl']!==$record['source_url']||
            $en['sourceUrl']!==$record['source_url']) {
            throw new RuntimeException('news_draft_requires_independent_evidence');
        }
        $q=$pdo->prepare(
            'SELECT MAX(revision_number) AS max_revision
             FROM jrei_news_editorial_versions
             WHERE candidate_id=?'
        );
        $q->execute([$candidateId]);
        $next=(int)($q->fetchColumn()?:0)+1;
        $routes=jrNewsProposeBilingualDraftRoutes(
            $en['headline'],$record['fingerprint_sha256']);
        $payload=[
            'schema'=>'jr.jrei.news-owner-editorial-payload.v1',
            'fa'=>$fa,'en'=>$en,
            'imageAssetReference'=>$image,
            'routeProposal'=>$routes,
            'internalLinks'=>$sanitized,
            'evidenceSha256'=>$record['content_sha256'],
            'candidateId'=>$candidateId,
            'reviewId'=>$reviewId
        ];
        $json=json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|
            JSON_THROW_ON_ERROR|JSON_INVALID_UTF8_SUBSTITUTE);
        if (strlen($json)>250000)
            throw new RuntimeException('news_draft_size_exceeds_limit');
        $digest=hash('sha256',$json);
        $uuid=jrNewsPrivateUuid();
        $pdo->prepare(
            'INSERT INTO jrei_news_editorial_versions
             (revision_id,candidate_id,evidence_review_id,revision_number,
              bilingual_editorial_json,approved_image_ref,approval_digest,
              editorial_state,created_at)
             VALUES(?,?,?,?,?,?,?,"PENDING_OWNER_APPROVAL",?)'
        )->execute([$uuid,$candidateId,$reviewId,$next,$json,
            $image,$digest,$now]);
        $pdo->commit();
        return [
            'schema'=>'jr.jrei.news-draft-staged.v1',
            'revisionId'=>$uuid,'revisionNumber'=>$next,
            'approvalDigest'=>$digest,
            'routeProposal'=>$routes,
            'readyForOwnerPreview'=>true,
            'publiclyPublished'=>false,
            'noModelApprovalOfItsOwnDraft'=>true
        ];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
