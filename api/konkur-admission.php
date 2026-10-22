<?php
declare(strict_types=1);

// Existing Bertina API bootstrap only. This module NEVER alters source records,
// creates tables, accesses accounts or processes private scorecards.
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/konkur-public-search-guard.php';

/**
 * One explicitly verified programme-location record per current revision.
 * A scanned PDF, review checkbox alone or draft source amendment cannot make
 * a record public. Individual eligibility is intentionally NOT evaluated.
 */
function konkurApprovedCatalogueSql(): string {
    return <<<'SQL'
SELECT p.id AS _internalOfferingId,
       p.programme_location_code AS programmeCode,
       p.examination_group_code AS examinationGroup,
       p.admission_track_code AS admissionTrack,
       p.official_institution_name AS university,
       p.campus_name AS campus,
       p.province_name AS province,
       p.city_name AS city,
       p.programme_title AS programme,
       p.degree_code AS degree,
       p.admission_method_code AS admissionMethod,
       p.capacity AS capacity,
       p.tuition_status AS tuitionStatus,
       c.admission_year AS year,
       d.document_code AS sourceDocument,
       d.revision_no AS sourceRevision,
       dp.pdf_page_number AS sourcePdfPage,
       dp.printed_page_label AS sourcePrintedPage
FROM eco_admission_programme_offerings p
INNER JOIN eco_admission_cycles c
  ON c.id=p.cycle_id AND c.record_status='ACTIVE'
  AND c.approved_by_account_id IS NOT NULL AND c.approved_at IS NOT NULL
INNER JOIN eco_admission_document_pages dp
  ON dp.id=p.source_page_id AND dp.page_review_state='REVIEWED'
  AND dp.reviewed_by_account_id IS NOT NULL AND dp.reviewed_at IS NOT NULL
INNER JOIN eco_admission_documents d
  ON d.id=dp.document_id AND d.cycle_id=c.id
  AND d.document_review_state='QA_APPROVED'
  AND d.reviewed_by_account_id IS NOT NULL AND d.reviewed_at IS NOT NULL
  AND d.original_pdf_sha256 IS NOT NULL
WHERE p.review_state='APPROVED'
  AND p.approved_by_account_id IS NOT NULL AND p.approved_at IS NOT NULL
  AND p.normalized_row_sha256 IS NOT NULL
  AND p.conditions_review_state='COMPLETE'
  AND p.conditions_reviewed_by_account_id IS NOT NULL
  AND p.conditions_reviewed_at IS NOT NULL
  AND (d.examination_group_code IS NULL OR d.examination_group_code=p.examination_group_code)
  AND NOT EXISTS (
    SELECT 1 FROM eco_admission_documents successor
    WHERE successor.supersedes_document_id=d.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM eco_admission_programme_offerings revision
    WHERE revision.cycle_id=p.cycle_id
      AND revision.examination_group_code=p.examination_group_code
      AND revision.admission_track_code=p.admission_track_code
      AND revision.programme_location_code=p.programme_location_code
      AND revision.record_revision>p.record_revision
  )
  AND NOT EXISTS (
    SELECT 1 FROM eco_admission_offering_conditions condition_record
    LEFT JOIN eco_admission_document_pages cp ON cp.id=condition_record.source_page_id
    LEFT JOIN eco_admission_documents cd ON cd.id=cp.document_id
    WHERE condition_record.offering_id=p.id
      AND (
        condition_record.review_state <> 'APPROVED'
        OR condition_record.approved_by_account_id IS NULL
        OR condition_record.approved_at IS NULL
        OR cp.page_review_state <> 'REVIEWED'
        OR cp.reviewed_by_account_id IS NULL OR cp.reviewed_at IS NULL
        OR cd.document_review_state <> 'QA_APPROVED'
        OR cd.cycle_id <> c.id
        OR (cd.examination_group_code IS NOT NULL AND cd.examination_group_code<>p.examination_group_code)
        OR cd.original_pdf_sha256 IS NULL
        OR cd.reviewed_by_account_id IS NULL OR cd.reviewed_at IS NULL
        OR EXISTS (SELECT 1 FROM eco_admission_documents amendment WHERE amendment.supersedes_document_id=cd.id)
      )
  )
SQL;
}

/**
 * Only an explicitly APPROVED condition and its independently approved
 * source page/document may be displayed. This is a descriptive official
 * guide excerpt, NOT a personalized eligibility decision or live quota.
 *
 * Bounded to 4 rows per approved offering; the fourth is evidence that the
 * public three-item preview is incomplete. Never silently assert there are
 * no special requirements based on a missing/inaccessible optional table.
 */
function konkurReviewedConditionPreview(PDO $pdo,string $offeringId): array {
    $sql=<<<'SQL'
SELECT oc.condition_kind AS kind,
       oc.official_text_excerpt AS excerpt,
       cp.pdf_page_number AS pageNo,
       cd.document_code AS documentCode,
       cd.revision_no AS documentRevision
FROM eco_admission_offering_conditions oc
INNER JOIN eco_admission_programme_offerings p
  ON p.id=oc.offering_id
INNER JOIN eco_admission_document_pages cp
  ON cp.id=oc.source_page_id AND cp.page_review_state='REVIEWED'
  AND cp.reviewed_by_account_id IS NOT NULL AND cp.reviewed_at IS NOT NULL
INNER JOIN eco_admission_documents cd
  ON cd.id=cp.document_id AND cd.cycle_id=p.cycle_id
  AND cd.document_review_state='QA_APPROVED'
  AND cd.reviewed_by_account_id IS NOT NULL AND cd.reviewed_at IS NOT NULL
  AND cd.original_pdf_sha256 IS NOT NULL
WHERE oc.offering_id=?
  AND oc.review_state='APPROVED'
  AND oc.approved_by_account_id IS NOT NULL AND oc.approved_at IS NOT NULL
  AND (cd.examination_group_code IS NULL OR cd.examination_group_code=p.examination_group_code)
  AND NOT EXISTS(
    SELECT 1 FROM eco_admission_documents newer
    WHERE newer.supersedes_document_id=cd.id
  )
ORDER BY oc.condition_code ASC LIMIT 4
SQL;
    try {
        $query=$pdo->prepare($sql);
        $query->execute([$offeringId]);
        $rows=$query->fetchAll(PDO::FETCH_ASSOC);
    }catch(Throwable $e){
        return ['status'=>'UNAVAILABLE','items'=>[],'moreNotDisplayed'=>null];
    }
    $items=[];
    foreach(array_slice($rows,0,3) as $row) {
        $excerpt=trim((string)($row['excerpt']??''));
        $kind=trim((string)($row['kind']??''));
        $document=trim((string)($row['documentCode']??''));
        $revision=(int)($row['documentRevision']??0);
        $pageNo=(int)($row['pageNo']??0);
        if($excerpt===''||$document===''||strlen($excerpt)>6000
           ||$revision<1||$pageNo<1
           ||preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/',$excerpt))
            return ['status'=>'UNAVAILABLE','items'=>[],'moreNotDisplayed'=>null];
        $items[]=[
           'kind'=>substr($kind,0,60),
           'excerpt'=>function_exists('mb_substr')?mb_substr($excerpt,0,360,'UTF-8'):substr($excerpt,0,360),
           'sourceDocument'=>$document,
           'sourceRevision'=>$revision,
           'sourcePdfPage'=>$pageNo
        ];
    }
    return ['status'=>'REVIEWED_SOURCE_EXCERPTS','items'=>$items,
       'moreNotDisplayed'=>count($rows)>3];
}

/** Validates table/column presence without selecting real learner or admissions rows. */
function konkurCatalogueSchemaReady(?PDO $pdo): bool {
    if (!$pdo) return false;
    try {
        foreach ([
            'SELECT id,admission_year,record_status,approved_by_account_id,approved_at FROM eco_admission_cycles LIMIT 0',
            'SELECT id,cycle_id,document_review_state,reviewed_at,original_pdf_sha256 FROM eco_admission_documents LIMIT 0',
            'SELECT id,document_id,pdf_page_number,page_review_state,reviewed_at FROM eco_admission_document_pages LIMIT 0',
            'SELECT id,cycle_id,programme_location_code,conditions_review_state,conditions_reviewed_at FROM eco_admission_programme_offerings LIMIT 0',
            'SELECT id,offering_id,review_state,source_page_id FROM eco_admission_offering_conditions LIMIT 0',
            'SELECT id,cycle_id,rule_code,review_state FROM eco_admission_rule_versions LIMIT 0',
        ] as $statement) $pdo->query($statement);
        return true;
    } catch (Throwable $e) { return false; }
}

/** Returns public institutional facts only, without candidate, guardian or buyer PII. */
function konkurCatalogueRoute(string $path, string $verb): never {
    if ($path!=='/konkur/programmes') fail('not_found',404);
    if ($verb!=='GET') fail('method_not_allowed',405);
    $yearText=(string)($_GET['year']??'1405');
    if (!preg_match('/^1[34][0-9]{2}$/D',$yearText)) fail('invalid_admission_year',422);
    $year=(int)$yearText;

    $group=trim((string)($_GET['group']??''));
    if ($group!=='' && !preg_match('/^[A-Z0-9_]{2,60}$/D',$group)) fail('invalid_examination_group',422);
    $rawSearch=$_GET['q']??'';
    if (!is_string($rawSearch)) fail('invalid_search',422);
    $search=trim($rawSearch);
    if ((function_exists('mb_strlen') ? mb_strlen($search,'UTF-8')>80 : strlen($search)>240)
        || preg_match('/[\x00-\x1F\x7F]/u',$search))
        fail('invalid_search',422);
    if (konkurPublicSearchUnsafe($search)) fail('invalid_search',422);
    $limitRaw=(string)($_GET['limit']??'20');
    if (!preg_match('/^[1-9][0-9]?$/D',$limitRaw) || (int)$limitRaw>50) fail('invalid_limit',422);
    $limit=(int)$limitRaw;
    $pageRaw=(string)($_GET['page']??'1');
    if (!preg_match('/^[1-9][0-9]{0,2}$/D',$pageRaw)) fail('invalid_page',422);
    $offset=((int)$pageRaw-1)*$limit;
    if ($offset>5000) fail('page_out_of_range',422);

    header('Cache-Control: private, no-store, max-age=0');
    $pdo=db();
    if (!konkurCatalogueSchemaReady($pdo)) {
        respond([
            'ok'=>true,'year'=>$year,'status'=>'OFFICIAL_CATALOGUE_NOT_READY',
            'records'=>[],'sourceVerification'=>'PENDING',
            'eligibilityAssessment'=>'NOT_PERFORMED',
            'admissionProbabilityEnabled'=>false,
            'officialApplicationSubmitted'=>false
        ]);
    }

    $sql=konkurApprovedCatalogueSql()."\n  AND c.admission_year=:year";
    if ($group!=='') $sql.="\n  AND p.examination_group_code=:group";
    if ($search!=='') $sql.="\n  AND (p.programme_title LIKE :term1 OR p.official_institution_name LIKE :term2 OR p.programme_location_code LIKE :term3)";
    $sql.="\nORDER BY p.programme_location_code ASC,p.admission_track_code ASC LIMIT :limit OFFSET :offset";
    try {
        $query=$pdo->prepare($sql);
        $query->bindValue(':year',$year,PDO::PARAM_INT);
        if ($group!=='') $query->bindValue(':group',$group,PDO::PARAM_STR);
        if ($search!=='') {
            $pattern='%'.str_replace(['\\','%','_'],['\\\\','\\%','\\_'],$search).'%';
            foreach ([':term1',':term2',':term3'] as $key)
                $query->bindValue($key,$pattern,PDO::PARAM_STR);
        }
        $query->bindValue(':limit',$limit,PDO::PARAM_INT);
        $query->bindValue(':offset',$offset,PDO::PARAM_INT);
        $query->execute();
        $records=[];
        foreach ($query->fetchAll(PDO::FETCH_ASSOC) as $row) {
            // Internal primary key is used only to fetch independently
            // reviewed source conditions. Never expose the DB row ID.
            $offeringId=(string)$row['_internalOfferingId'];
            unset($row['_internalOfferingId']);
            $row['sourceConditions']=konkurReviewedConditionPreview($pdo,$offeringId);
            $row['year']=(int)$row['year'];
            $row['sourceRevision']=(int)$row['sourceRevision'];
            $row['sourcePdfPage']=(int)$row['sourcePdfPage'];
            $row['capacity']=$row['capacity']===null?null:(int)$row['capacity'];
            $row['eligibilityStatus']='NOT_ASSESSED';
            $row['officialRegistration']=false;
            $records[]=$row;
        }
        respond([
            'ok'=>true,'year'=>$year,
            'status'=>$records ? 'SOURCE_REVIEWED_CATALOGUE' : 'NO_SOURCE_APPROVED_RECORDS',
            'records'=>$records,'limit'=>$limit,'page'=>(int)$pageRaw,
            'sourceVerification'=>$records?'HUMAN_REVIEWED':'PENDING',
            'eligibilityAssessment'=>'NOT_PERFORMED',
            'admissionProbabilityEnabled'=>false,
            'officialApplicationSubmitted'=>false
        ]);
    } catch (Throwable $e) {
        // Missing columns, invalid schema or unavailable DB must never be
        // converted into supposedly verified programmes.
        respond([
            'ok'=>true,'year'=>$year,'status'=>'OFFICIAL_CATALOGUE_NOT_READY',
            'records'=>[],'sourceVerification'=>'PENDING',
            'eligibilityAssessment'=>'NOT_PERFORMED',
            'admissionProbabilityEnabled'=>false,
            'officialApplicationSubmitted'=>false
        ]);
    }
}
