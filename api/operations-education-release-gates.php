<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * JR educational offer preparation — single mother DB and MFA owner console.
 *
 * "READY_FOR_REVIEW" is an owner's editorial worklist marker, NOT a passed
 * scientific test, legal authorization, bank settlement, verified delivery,
 * live catalogue price, public item, or paid entitlement.
 *
 * This file cannot activate any goods, grants, checkout or mailing.
 */
function operationsEducationReleaseGateDefinitions(): array {
    return [
      'SCIENTIFIC'=>[
        'fa'=>'پشتوانه علمی و سنجش‌پذیری',
        'en'=>'Scientific and psychometric evidence',
        'requiredFa'=>'نسخه‌گذاری مدل، بازبینی مستقل ادعاها و اعلام روشن مرحله پژوهشی.',
        'requiredEn'=>'Versioned models, independently reviewed claims and clear research-stage limitations.'
      ],
      'CONTENT'=>[
        'fa'=>'آمادگی محتوای قابل تحویل',
        'en'=>'Deliverable learning content',
        'requiredFa'=>'محتوای واقعیِ کامل، ویرایش علمی و حقوق نشر؛ بدون وعده محصول ساخته‌نشده.',
        'requiredEn'=>'Complete actual deliverables, editorial accuracy and content rights.'
      ],
      'DELIVERY'=>[
        'fa'=>'تحویل محصول و دسترسی حساب',
        'en'=>'Customer delivery and entitlements',
        'requiredFa'=>'مسیر واقعی پس از خرید، اعتبار مجوز دسترسی، تحویل و رسیدگی به خطا.',
        'requiredEn'=>'Real post-purchase delivery, permission boundaries and fulfilment failures.'
      ],
      'PRIVACY'=>[
        'fa'=>'رضایت، محرمانگی و شرایط حقوقی',
        'en'=>'Privacy, consent and legal terms',
        'requiredFa'=>'رضایت هدف‌مند، حقوق داده، نقش سرپرست، نگهداری و بازپرداخت.',
        'requiredEn'=>'Scoped consent, learner/guardian rights, retention, refunds and terms.'
      ],
      'PAYMENT'=>[
        'fa'=>'درگاه، تسویه و حسابداری',
        'en'=>'Payment, settlement and receipts',
        'requiredFa'=>'تأیید مستقل دریافت واقعی وجه، لغو، بازپرداخت، رسید و ارقام نهایی.',
        'requiredEn'=>'Independent actual settlement, cancellation, refund and receipt evidence.'
      ],
      'ACCESSIBILITY'=>[
        'fa'=>'تجربه کاربر، موبایل و سئو',
        'en'=>'Accessible mobile experience and SEO',
        'requiredFa'=>'کیفیت فارسی/انگلیسی، دسترس‌پذیری، سرعت و حفظ تمام URLهای قبلی.',
        'requiredEn'=>'Bilingual accessibility, mobile quality, performance and frozen public URLs.'
      ]
    ];
}
function operationsEducationOfferReleaseCatalogue(): array {
    $catalogue=operationsEducationalOffersRead();
    $rows=[];
    foreach($catalogue['offers'] as $offer){
        $rows[$offer['id']]=[
          'id'=>$offer['id'],
          'titleFa'=>$offer['titleFa'],
          'titleEn'=>$offer['titleEn'],
          'engine'=>$offer['engine'],
          'freeIntro'=>$offer['proposedPriceToman']===0,
          'proposedPriceToman'=>$offer['proposedPriceToman']
        ];
    }
    return $rows;
}
function operationsEducationReleaseStatus(PDO $pdo): array {
    $catalogue=operationsEducationOfferReleaseCatalogue();
    $definitions=operationsEducationReleaseGateDefinitions();
    $stored=[];$databaseReady=false;
    try{
        $q=$pdo->query('SELECT offer_id,gate_code,review_state,owner_note,
          evidence_reference_sha256,row_revision,updated_at
          FROM operations_educational_release_gate_drafts
          ORDER BY offer_id,gate_code LIMIT 150');
        foreach($q->fetchAll(PDO::FETCH_ASSOC) as $row){
            if(!isset($catalogue[$row['offer_id']],$definitions[$row['gate_code']]))
                continue;
            $key=$row['offer_id'].'|'.$row['gate_code'];
            if(isset($stored[$key]))continue;
            $stored[$key]=$row;
        }
        $databaseReady=true;
    }catch(Throwable $e){
        // An existing static proposal is still visible, but a source
        // operation never claims database readiness after SQL failure.
        $stored=[];
    }
    $rows=[];$prepared=0;$work=0;
    foreach($catalogue as $offerId=>$offer){
        foreach($definitions as $code=>$def){
            $applicable=!($code==='PAYMENT'&&$offer['freeIntro']);
            $row=$stored[$offerId.'|'.$code]??null;
            $state='NOT_STARTED';
            $note='';$digestPresent=false;$revision=0;$updatedAt=null;
            if($applicable&&is_array($row)){
                $candidate=(string)$row['review_state'];
                if(in_array($candidate,[
                    'NOT_STARTED','IN_PROGRESS','NEEDS_REVISION','READY_FOR_REVIEW'
                ],true))$state=$candidate;
                $note=(string)$row['owner_note'];
                $digestPresent=preg_match('/^[a-f0-9]{64}$/D',
                    (string)($row['evidence_reference_sha256']??''))===1;
                $revision=(int)$row['row_revision'];
                $updatedAt=(int)$row['updated_at'];
            }
            if($applicable){
                $work++;
                if($state==='READY_FOR_REVIEW')$prepared++;
            }
            $rows[]=[
              'offerId'=>$offerId,
              'offerNameFa'=>$offer['titleFa'],
              'offerNameEn'=>$offer['titleEn'],
              'engine'=>$offer['engine'],
              'freeIntro'=>$offer['freeIntro'],
              'gateCode'=>$code,
              'gateNameFa'=>$def['fa'],
              'gateNameEn'=>$def['en'],
              'requirementFa'=>$def['requiredFa'],
              'requirementEn'=>$def['requiredEn'],
              'applicable'=>$applicable,
              'state'=>$applicable?$state:'NOT_APPLICABLE',
              'ownerNote'=>$note,
              'evidenceReferenceRecorded'=>$digestPresent,
              // This is a source-document fingerprint, never document bytes,
              // account identifiers or evidence uploads. Owner MFA only.
              'evidenceReferenceSha256'=>$digestPresent
                  ?(string)$row['evidence_reference_sha256']:null,
              'revision'=>$revision,
              'updatedAt'=>$updatedAt,
              'independentlyValidated'=>false,
              'liveDeploymentCertified'=>false,
              'customerServiceActivated'=>false
            ];
        }
    }
    return [
      'ok'=>true,
      'schema'=>'jr.education-release-gate-owner.v1',
      'state'=>$databaseReady
        ?'OWNER_PREPARATION_DRAFTS_ONLY':'ADDITIVE_SCHEMA_NOT_PROVISIONED_OR_UNAVAILABLE',
      'storageAvailable'=>$databaseReady,
      'canEdit'=>$databaseReady,
      'canActivate'=>false,
      'canPublish'=>false,
      'allIndependentResearchApproved'=>false,
      'actualBankSettlementVerified'=>false,
      'entitlementsLive'=>false,
      'sourceOfferCount'=>count($catalogue),
      'applicablePreparationGates'=>$work,
      'ownerMarkedReadyForReview'=>$prepared,
      'actualApprovedGates'=>0,
      'sourceDataOnly'=>true,
      'drafts'=>$rows,
      'limitation'=>'Owner-managed preparation is not third-party verification, external scientific evidence, legal signoff or release authority. No sale can be activated from this endpoint.'
    ];
}
function operationsEducationReleaseSave(
    PDO $pdo,array $input,string $actor,int $timestamp
): array {
    $required=['offerId','gateCode','reviewState','expectedRevision',
      'ownerNote','evidenceReferenceSha256'];
    if(count($input)!==count($required)||
        array_diff($required,array_keys($input))||
        array_diff(array_keys($input),$required))
        throw new InvalidArgumentException('invalid_release_gate_shape');
    $offerId=$input['offerId'];
    $gateCode=$input['gateCode'];
    $state=$input['reviewState'];
    $revision=$input['expectedRevision'];
    $note=$input['ownerNote'];
    $digest=$input['evidenceReferenceSha256'];
    $catalogue=operationsEducationOfferReleaseCatalogue();
    $definitions=operationsEducationReleaseGateDefinitions();
    $characters=is_string($note)
      ?preg_match_all('/[\s\S]/u',$note):false;
    if(!is_string($offerId)||!isset($catalogue[$offerId])||
       !is_string($gateCode)||!isset($definitions[$gateCode])||
       ($gateCode==='PAYMENT'&&$catalogue[$offerId]['freeIntro'])||
       !is_string($state)||!in_array($state,[
          'NOT_STARTED','IN_PROGRESS','NEEDS_REVISION','READY_FOR_REVIEW'
       ],true)||
       !is_int($revision)||$revision<0||$revision>1000000||
       !is_string($note)||strlen($note)>1400||
       $characters===false||$characters>350||
       preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/',$note)||
       (!is_null($digest)&&(!is_string($digest)||
            preg_match('/^[a-f0-9]{64}$/D',$digest)!==1))||
       ($state==='READY_FOR_REVIEW'&&trim($note)===''))
       throw new InvalidArgumentException('invalid_release_gate_input');

    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT row_revision
           FROM operations_educational_release_gate_drafts
           WHERE offer_id=? AND gate_code=? FOR UPDATE');
        $q->execute([$offerId,$gateCode]);
        $present=$q->fetchColumn();
        if($present!==false){
            if($revision!==(int)$present)
                throw new DomainException('release_gate_revision_conflict');
            $next=$revision+1;
            $update=$pdo->prepare('UPDATE operations_educational_release_gate_drafts
              SET review_state=?,owner_note=?,evidence_reference_sha256=?,
                  updated_by_account_id=?,updated_at=?,row_revision=?
              WHERE offer_id=? AND gate_code=? AND row_revision=?');
            $update->execute([
              $state,$note,$digest,$actor,$timestamp,$next,
              $offerId,$gateCode,$revision
            ]);
            if($update->rowCount()!==1)
                throw new DomainException('release_gate_revision_conflict');
        }else{
            if($revision!==0)
                throw new DomainException('release_gate_revision_conflict');
            $next=1;
            $insert=$pdo->prepare('INSERT INTO operations_educational_release_gate_drafts
              (offer_id,gate_code,review_state,owner_note,
               evidence_reference_sha256,row_revision,updated_by_account_id,updated_at)
              VALUES (?,?,?,?,?,?,?,?)');
            $insert->execute([
              $offerId,$gateCode,$state,$note,$digest,$next,$actor,$timestamp
            ]);
        }
        $audit=$pdo->prepare('INSERT INTO operations_audit
           (actor_id,action,reference_id,occurred_at)
           VALUES (?,?,?,?)');
        $audit->execute([$actor,'education_release_gate_draft_updated',
          substr($offerId.'|'.$gateCode,0,64),$timestamp]);
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    return [
       'ok'=>true,'schema'=>'jr.education-release-gate-change.v1',
       'offerId'=>$offerId,'gateCode'=>$gateCode,
       'revision'=>$next,'state'=>$state,
       'ownerNote'=>$note,'evidenceReferenceRecorded'=>$digest!==null,
       'independentlyValidated'=>false,
       'canPublish'=>false,'canActivate'=>false,
       'checkoutEnabled'=>false,'ownerPreparationOnly'=>true,
       'message'=>'One owner preparation note was stored without approving product activation, scientific claims or payment.'
    ];
}
