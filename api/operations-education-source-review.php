<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Internal, read-only 1405 guide inventory — source-manifest snapshot.
 * The build strips Drive IDs, private file paths and source PDF text.
 * Administrator authentication and fresh MFA are enforced by operationsRoute.
 * No PDF approval, SQL writes, scores, probabilities or source collection.
 */
function operationsEducational1405ReviewSnapshot(): array {
    $path=__DIR__.'/internal/jr-1405-source-review-admin.json';
    if (!is_file($path)) throw new RuntimeException('review_inventory_missing');
    $size=filesize($path);
    if (!is_int($size) || $size<2 || $size>24000)
        throw new RuntimeException('review_inventory_invalid');
    $raw=file_get_contents($path);
    if(!is_string($raw)) throw new RuntimeException('review_inventory_missing');
    try { $source=json_decode($raw,true,20,JSON_THROW_ON_ERROR); }
    catch (JsonException $e) { throw new RuntimeException('review_inventory_invalid'); }
    if (!is_array($source)
        || ($source['schema']??null)!=='jr-1405-source-review-admin-v1'
        || ($source['sourceState']??null)!=='HISTORICAL_MANIFEST_UNREVIEWED'
        || ($source['cycle']??null)!==1405
        || ($source['reviewComplete']??null)!==false
        || ($source['predictionAuthorized']??null)!==false
        || ($source['officialProgrammeRecordsApproved']??null)!==0
        || !is_array($source['guides']??null)
        || !is_array($source['missingCoverage']??null)
        || count($source['guides'])<1 || count($source['guides'])>60
        || count($source['missingCoverage'])>30)
        throw new RuntimeException('review_inventory_invalid');

    $guides=[];$totalPages=0;$ids=[];
    foreach($source['guides'] as $row) {
        if(!is_array($row)
          || !preg_match('/^[a-z_]{2,80}$/D',(string)($row['key']??''))
          || !preg_match('/^[A-Z_]{2,80}$/D',(string)($row['category']??''))
          || !is_int($row['pdfPageCount']??null)
          || $row['pdfPageCount']<1 || $row['pdfPageCount']>5000
          || !preg_match('/^[a-f0-9]{64}$/D',(string)($row['pdfSha256']??''))
          || ($row['approvedForEligibility']??null)!==false) 
          throw new RuntimeException('review_inventory_invalid');
        if(isset($ids[$row['key']])) throw new RuntimeException('review_inventory_duplicates');
        $ids[$row['key']]=true;
        $totalPages+=$row['pdfPageCount'];
        $guides[]=[
            'key'=>$row['key'],'category'=>$row['category'],
            'pdfPageCount'=>$row['pdfPageCount'],
            'originalPdfSha256'=>$row['pdfSha256'],
            'pdfFingerprintAndPageCountStatus'=>(string)($row['pageAudit']??'UNKNOWN'),
            'criticalTablesReview'=>(string)($row['tableReview']??'NOT_COMPLETED'),
            'eligibilityApproved'=>false,
        ];
    }
    if($totalPages!==($source['totalPdfPages']??null)
      || count($guides)!==($source['sourceCount']??null))
      throw new RuntimeException('review_inventory_mismatch');
    $gaps=[];
    foreach($source['missingCoverage'] as $row){
        if(!is_array($row)
          || !preg_match('/^[A-Z_]{2,90}$/D',(string)($row['kind']??''))
          || !preg_match('/^[A-Z_]{2,90}$/D',(string)($row['status']??'')))
          throw new RuntimeException('review_inventory_invalid');
        $gaps[]=['kind'=>$row['kind'],'status'=>$row['status']];
    }
    return [
        'ok'=>true,'schema'=>'jr-1405-official-guides-admin-readonly-v1',
        'state'=>'SOURCE_METADATA_UNREVIEWED',
        'year'=>1405,'manifestRecordedAt'=>(string)($source['auditedOn']??''),
        'guides'=>$guides,'gaps'=>$gaps,
        'summary'=>[
            'guideCount'=>count($guides),
            'sourcePdfPages'=>$totalPages,
            'reviewedProgrammeRows'=>0,
            'approvedProgrammeRows'=>0,
            'officialAdmissionsActive'=>false,
            'admissionProbabilitiesAvailable'=>false,
        ],
        'readonly'=>true,'canApprove'=>false,'canActivate'=>false,
        'limitation'=>'Only source-manifest metadata, not signed independent row checks, approved 1405 course locations, public admission results, or current server database status.'
    ];
}
