<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * MFA-protected, read-only proposal catalogue for the EXISTING operations panel.
 * No database schema, checkout, entitlement, paid activation or customer PII.
 * The source is denied over HTTP by api/internal/.htaccess.
 */
/** Free entry stages are an immutable product contract, not a consequence
 * of a draft 0-toman price or an administrator's future promotional edit. */
function operationsEducationFreeIntroIds(): array {
    return ['talent-intro','rcas-intro','bahar-intro','scorecard-intro'];
}
function operationsEducationalOffersRead(): array {
    $path=__DIR__.'/internal/educational-offer-proposals.json';
    if (!is_file($path) || filesize($path)===false || filesize($path)>32000)
        throw new RuntimeException('educational_offer_source_unavailable');
    $raw=file_get_contents($path);
    if (!is_string($raw)) throw new RuntimeException('educational_offer_source_unavailable');
    try { $catalogue=json_decode($raw,true,32,JSON_THROW_ON_ERROR); }
    catch (JsonException $error) { throw new RuntimeException('educational_offer_source_invalid'); }
    if (!is_array($catalogue)
        || ($catalogue['schema']??null)!=='jr.education-offer-proposals.v1'
        || ($catalogue['status']??null)!=='PROPOSAL_ONLY_NOT_FOR_SALE'
        || ($catalogue['activationByThisFile']??null)!==false
        || ($catalogue['existingCommerceUnaffected']??null)!==true
        || !is_array($catalogue['offers']??null)
        || count($catalogue['offers'])<1 || count($catalogue['offers'])>30)
        throw new RuntimeException('educational_offer_source_invalid');
    $rows=[];$seen=[];$free=0;$permanentFree=0;
    foreach($catalogue['offers'] as $record){
        if (!is_array($record)
            || !preg_match('/^[a-z0-9][a-z0-9-]{1,59}$/D',(string)($record['id']??''))
            || !is_string($record['titleEn']??null)
            || !is_string($record['titleFa']??null)
            || !is_string($record['engine']??null)
            || strlen($record['titleEn'])>180 || strlen($record['titleFa'])>360
            || strlen($record['engine'])>80
            || !is_int($record['proposedPriceToman']??null)
            || $record['proposedPriceToman']<0 || $record['proposedPriceToman']>100000000
            || ($record['publiclyPurchasable']??null)!==false
            || ($record['paymentIntegrationVerified']??null)!==false
            || ($record['entitlementIntegrationVerified']??null)!==false
            || ($record['approvedByAdministrator']??null)!==false)
            throw new RuntimeException('educational_offer_source_invalid');
        $id=$record['id'];
        if(isset($seen[$id]))throw new RuntimeException('educational_offer_duplicate_id');
        $seen[$id]=true;
        $freeIntro=in_array($id,operationsEducationFreeIntroIds(),true);
        // Free entry remains free even if an internal catalogue is edited.
        // A zero-priced optional professional service is NOT automatically
        // an introductory product with a waived payment-acceptance gate.
        if($freeIntro&&$record['proposedPriceToman']!==0)
            throw new RuntimeException('free_educational_intro_cannot_be_priced');
        if($record['proposedPriceToman']===0)$free++;
        if($freeIntro)$permanentFree++;
        $rows[]=[
            'id'=>$id,'titleEn'=>$record['titleEn'],'titleFa'=>$record['titleFa'],
            'engine'=>$record['engine'],
            'proposedPriceToman'=>$record['proposedPriceToman'],
            'status'=>'PROPOSAL_ONLY',
            'permanentlyFreeIntro'=>$freeIntro,
            'publiclyPurchasable'=>false,
            'scientificReviewComplete'=>false,
            'deliveryVerified'=>false,
            'entitlementIntegrationVerified'=>false,
            'paymentIntegrationVerified'=>false,
            'administratorApproved'=>false
        ];
    }
    // All four promised public introductions must remain explicitly
    // represented; no accidental removal can silently shrink the free path.
    foreach(operationsEducationFreeIntroIds() as $freeId)
        if(!isset($seen[$freeId]))
            throw new RuntimeException('missing_permanently_free_intro');
    return [
        'ok'=>true,
        'schema'=>'jr.educational-offers.admin-readonly.v1',
        'readOnly'=>true,
        'canActivate'=>false,
        'version'=>(string)($catalogue['version']??'unknown'),
        'status'=>'PROPOSALS_NOT_FOR_SALE',
        'summary'=>['proposals'=>count($rows),'zeroPriceDrafts'=>$free,
                    'permanentlyFreeIntroStages'=>$permanentFree,
                    'pricedDrafts'=>count($rows)-$free,'activatedByThisModule'=>0],
        'offers'=>$rows,
        'limitation'=>'Prices are proposals only. This endpoint does not prove an approved product, paid content, gateway reconciliation, scientific validation or service availability.'
    ];
}
