<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Owner-controlled proposed education price drafts in the single mother DB.
 * This is admin planning only. No checkout, entitlement, account mutation,
 * consent transition, course activation, bank settlement or public pricing.
 */
function operationsEducationalDraftPricesRead(PDO $pdo): array {
    $canonical=operationsEducationalOffersRead();
    $allowed=[];
    foreach($canonical['offers'] as $item) $allowed[$item['id']]=$item;
    $rows=[];
    try{
        $query=$pdo->query('SELECT offer_id,proposed_price_toman,review_state,rationale,
             row_revision,updated_at FROM operations_educational_offer_drafts
             WHERE publicly_purchasable=0 AND admin_desired=0 ORDER BY offer_id LIMIT 40');
        $stored=$query->fetchAll(PDO::FETCH_ASSOC);
        if(!is_array($stored))throw new RuntimeException('invalid_query');
    }catch(Throwable $e){
        return [
            'ok'=>true,'schema'=>'jr.education-price-drafts.owner-v1',
            'state'=>'DRAFT_STORAGE_NOT_INSTALLED','readOnly'=>true,
            'requiresAdditiveMigration'=>true,'canEdit'=>false,
            'canActivate'=>false,'publiclyPurchasable'=>false,
            'currency'=>'TOMAN_DISPLAY_ONLY',
            'drafts'=>[],
            'limitation'=>'Run the separately reviewed MariaDB migration and verify the mother database before saving any owner proposal.'
        ];
    }
    foreach($stored as $row){
        $id=(string)$row['offer_id'];
        if(!isset($allowed[$id]))continue;
        $rows[]=[
            'id'=>$id,'proposedPriceToman'=>(int)$row['proposed_price_toman'],
            'reviewState'=>in_array($row['review_state'],['DRAFT','SUBMITTED_FOR_REVIEW'],true)
                ?$row['review_state']:'DRAFT',
            'rationale'=>(string)$row['rationale'],
            'rowRevision'=>(int)$row['row_revision'],
            'updatedAt'=>(int)$row['updated_at'],
            'publiclyPurchasable'=>false
        ];
    }
    return [
        'ok'=>true,'schema'=>'jr.education-price-drafts.owner-v1',
        'state'=>'OWNER_PROPOSALS_NOT_APPROVED_FOR_SALE',
        'readOnly'=>false,'requiresAdditiveMigration'=>false,
        'canEdit'=>true,'canActivate'=>false,'publiclyPurchasable'=>false,
        'currency'=>'TOMAN_DISPLAY_ONLY','drafts'=>$rows,
        'limitation'=>'An administrative draft is not approval to sell, grant an entitlement, charge money or activate a course.'
    ];
}
/** A single explicitly requested per-offer update; no bulk mutation. */
function operationsEducationalDraftPriceSave(PDO $pdo,array $input,string $owner,int $at): array {
    $id=$input['id']??null;
    $price=$input['proposedPriceToman']??null;
    $revision=$input['expectedRevision']??null;
    $state=$input['reviewState']??null;
    $rationale=$input['rationale']??'';
    if(!is_string($id)||!preg_match('/^[a-z0-9][a-z0-9-]{1,59}$/D',$id)||
       !is_int($price)||$price<0||$price>100000000||
       !is_int($revision)||$revision<0||$revision>100000||
       !in_array($state,['DRAFT','SUBMITTED_FOR_REVIEW'],true)||
       !is_string($rationale)||strlen($rationale)>300||
       preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/',$rationale)||
       ($input['activate']??false)!==false||
       ($input['publiclyPurchasable']??false)!==false)
       throw new InvalidArgumentException('invalid_draft_price_input');
    $catalogue=operationsEducationalOffersRead();
    $known=[];
    foreach($catalogue['offers'] as $row)$known[$row['id']]=$row;
    if(!isset($known[$id]))throw new InvalidArgumentException('unknown_proposal');
    // The owner's introductory entitlement contract is permanently free.
    // Proposed prices for other offerings cannot silently monetize it.
    if(in_array($id,operationsEducationFreeIntroIds(),true)
        && $price!==0)throw new InvalidArgumentException('intro_must_remain_free');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT row_revision FROM operations_educational_offer_drafts
            WHERE offer_id=? FOR UPDATE');
        $q->execute([$id]);
        $found=$q->fetch(PDO::FETCH_ASSOC);
        if(is_array($found)){
            if($revision!==(int)$found['row_revision'])
                throw new DomainException('draft_revision_conflict');
            $next=$revision+1;
            $update=$pdo->prepare('UPDATE operations_educational_offer_drafts
                SET proposed_price_toman=?,review_state=?,rationale=?,
                    admin_desired=0,publicly_purchasable=0,
                    row_revision=?,updated_by_account_id=?,updated_at=?
                WHERE offer_id=? AND row_revision=?');
            $update->execute([$price,$state,$rationale,$next,$owner,$at,$id,$revision]);
            if($update->rowCount()!==1)throw new DomainException('draft_revision_conflict');
        } else {
            if($revision!==0)throw new DomainException('draft_revision_conflict');
            $next=1;
            $insert=$pdo->prepare('INSERT INTO operations_educational_offer_drafts
                (offer_id,proposed_price_toman,review_state,rationale,
                 admin_desired,publicly_purchasable,row_revision,
                 updated_by_account_id,updated_at)
                VALUES (?,?,?,?,0,0,?,?,?)');
            $insert->execute([$id,$price,$state,$rationale,$next,$owner,$at]);
        }
        $audit=$pdo->prepare('INSERT INTO operations_audit
            (actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)');
        $audit->execute([$owner,'education_offer_draft_updated',substr($id,0,64),$at]);
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    return [
        'ok'=>true,'schema'=>'jr.education-price-draft-change.v1',
        'id'=>$id,'rowRevision'=>$next,
        'reviewState'=>$state,'proposedPriceToman'=>$price,
        'publiclyPurchasable'=>false,'canActivate'=>false,
        'requiresFinalScientificAndPaymentApproval'=>true,
        'note'=>'Owner planning draft saved. No customer price, service or entitlement was activated.'
    ];
}
