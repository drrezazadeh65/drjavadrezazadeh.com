<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * ORIGINAL MFA SUPER_ADMIN route controls, NOT a standalone API.
 * Draft product/offering creation and owner emergency suspension only.
 * No payment, verified source approval, examination publication, consent,
 * entitlement grant, answer access, score or public release is possible here.
 */
function jrExamCommercialOwnerAction(PDO $pdo,string $actor,array $body): array {
    if(!jrExamCommercialSchemaReady($pdo))
        throw new DomainException('exam_commercial_migration_required');
    $action=$body['action']??null;
    $now=time();
    if($action==='exam_product_draft'){
        $code=$body['code']??null;$division=$body['division']??null;
        $fa=$body['titleFa']??null;$en=$body['titleEn']??null;
        $blueprint=$body['blueprintId']??null;
        $instrument=$body['instrumentVersionId']??null;
        $model=$body['scoringModelId']??null;
        if(!is_string($code)||!preg_match('/^[a-z0-9][a-z0-9._-]{2,69}$/D',$code)||
           !in_array($division,['KONKUR','MASTERS','DOCTORAL','SCHOOL'],true)||
           !is_string($fa)||trim($fa)===''||textLen($fa)>180||
           !is_string($en)||trim($en)===''||textLen($en)>180||
           !is_string($blueprint)||!validUuid($blueprint)||
           !is_string($instrument)||!validUuid($instrument)||
           !is_string($model)||!validUuid($model)||
           ($body['confirmation']??null)!=='CREATE_UNPUBLISHED_EXAM_DRAFT')
            throw new InvalidArgumentException('invalid_exam_draft');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT approved_instrument_version_id FROM
                jrei_exam_blueprints WHERE blueprint_id=? FOR UPDATE');
            $q->execute([$blueprint]);
            $b=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($b)||
               ($b['approved_instrument_version_id']!==null&&
                $b['approved_instrument_version_id']!==$instrument))
                throw new DomainException('exam_blueprint_version_conflict');
            $q=$pdo->prepare('SELECT id FROM eco_instrument_versions
                WHERE id=? FOR UPDATE');
            $q->execute([$instrument]);
            if($q->fetchColumn()===false)
                throw new DomainException('instrument_version_missing');
            $q=$pdo->prepare('SELECT id FROM eco_scoring_models
                WHERE id=? AND instrument_version_id=? FOR UPDATE');
            $q->execute([$model,$instrument]);
            if($q->fetchColumn()===false)
                throw new DomainException('scoring_model_instrument_mismatch');
            $id=uuidv4();
            $q=$pdo->prepare("INSERT INTO jrei_exam_commercial_products
                (product_id,product_code,division,title_fa,title_en,
                 blueprint_id,instrument_version_id,scoring_model_id,
                 product_state,content_rights_state,question_key_review_state,
                 delivery_review_state,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?,'DRAFT','NOT_REVIEWED',
                  'NOT_REVIEWED','NOT_REVIEWED',?,?)");
            $q->execute([$id,$code,$division,trim($fa),trim($en),
                $blueprint,$instrument,$model,$now,$now]);
            operationsAudit($pdo,$actor,'jrei_commercial_exam_draft_created',$id);
            $pdo->commit();
            return ['ok'=>true,'productId'=>$id,'state'=>'DRAFT',
                'published'=>false,'purchaseEnabled'=>false];
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }
    if($action==='exam_offering_draft'){
        $product=$body['productId']??null;
        $stage=$body['stageCode']??null;
        $opens=$body['opensAt']??null;$closes=$body['closesAt']??null;
        $reg=$body['registrationClosesAt']??null;
        $duration=$body['durationSeconds']??null;
        $max=$body['maxAttempts']??null;
        if(!is_string($product)||!validUuid($product)||
           !in_array($stage,['DIAGNOSTIC','PROGRESS','FINAL_MOCK'],true)||
           !is_int($opens)||$opens<$now+600||
           !is_int($closes)||$closes<=$opens+60||
           !is_int($reg)||$reg<$now||$reg>$opens||
           !is_int($duration)||$duration<60||$duration>28800||
           $duration>$closes-$opens||
           !is_int($max)||$max<1||$max>10||
           ($body['confirmation']??null)!=='CREATE_UNPUBLISHED_EXAM_OFFERING')
            throw new InvalidArgumentException('invalid_exam_offering_draft');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT product_state FROM
              jrei_exam_commercial_products WHERE product_id=? FOR UPDATE');
            $q->execute([$product]);$state=$q->fetchColumn();
            if($state!=='DRAFT')
                throw new DomainException('only_draft_exam_products_can_be_scheduled');
            $id=uuidv4();
            $q=$pdo->prepare("INSERT INTO jrei_exam_commercial_offerings
              (offering_id,product_id,stage_code,opens_at,closes_at,
               registration_closes_at,duration_seconds,max_attempts,
               offering_state,created_at,updated_at)
              VALUES (?,?,?,?,?,?,?,?,'DRAFT',?,?)");
            $q->execute([$id,$product,$stage,$opens,$closes,$reg,
                 $duration,$max,$now,$now]);
            operationsAudit($pdo,$actor,'jrei_exam_offering_draft_created',$id);
            $pdo->commit();
            return ['ok'=>true,'offeringId'=>$id,'state'=>'DRAFT',
                'registrationEnabled'=>false,'checkoutEnabled'=>false];
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }
    if(in_array($action,['exam_suspend_product','exam_suspend_offering'],true)){
        $id=$body['id']??null;
        $rev=$body['revision']??null;
        if(!is_string($id)||!validUuid($id)||!is_int($rev)||$rev<1||
           ($body['confirmation']??null)!=='SUSPEND_EXAM_WITHOUT_REFUND')
            throw new InvalidArgumentException('invalid_exam_suspension');
        $product=$action==='exam_suspend_product';
        $pdo->beginTransaction();
        try{
            $table=$product?'jrei_exam_commercial_products':
                'jrei_exam_commercial_offerings';
            $column=$product?'product_id':'offering_id';
            $q=$pdo->prepare("SELECT revision FROM ".$table.
                " WHERE ".$column."=? FOR UPDATE");
            $q->execute([$id]);$saved=$q->fetchColumn();
            if($saved===false||(int)$saved!==$rev)
                throw new DomainException('exam_suspension_revision_conflict');
            $q=$pdo->prepare("UPDATE ".$table." SET ".
                ($product?"product_state":"offering_state").
                "='SUSPENDED',updated_at=?,revision=revision+1
                WHERE ".$column."=? AND revision=?");
            $q->execute([$now,$id,$rev]);
            if($q->rowCount()!==1)
                throw new DomainException('exam_suspension_revision_conflict');
            if($product){
                $q=$pdo->prepare("UPDATE jrei_exam_commercial_offerings
                    SET offering_state='SUSPENDED',updated_at=?,
                        revision=revision+1
                    WHERE product_id=? AND offering_state<>'SUSPENDED'");
                $q->execute([$now,$id]);
            }
            // Customer money is NEVER auto-refunded, charged or silently
            // canceled by this scientific emergency stop. Refund, service
            // and rescheduling duties remain with the original commerce UI.
            operationsAudit($pdo,$actor,$product?
                'jrei_exam_product_suspended':'jrei_exam_offering_suspended',$id);
            $pdo->commit();
            return ['ok'=>true,'state'=>'SUSPENDED',
                'moneyMoved'=>false,'refundAutomaticallyIssued'=>false,
                'ownerRefundAndServiceReviewRequired'=>true];
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }
    throw new InvalidArgumentException('unsupported_exam_commercial_owner_action');
}
