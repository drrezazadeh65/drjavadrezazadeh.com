<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Only through the original SUPER_ADMIN + fresh MFA owner operations route.
 * Localisation uses ORIGINAL immutable item/option identifiers and original
 * eco_object_refs; no alternative score, user identity or file upload.
 */
function jrExamOwnerLocalizedPromptAction(PDO $pdo,string $actor,array $body): array {
    $action=$body['action']??null;
    $id=$body['itemId']??null;
    $lang=$body['locale']??null;
    if(!is_string($id)||!validUuid($id)||
       !in_array($lang,['fa','en'],true))
        throw new InvalidArgumentException('invalid_exam_locale_reference');
    $sha='/^[a-f0-9]{64}$/D';
    try{
        $pdo->query('SELECT item_id,locale,object_ref_id,revision,
          review_state,translation_rights_evidence_sha256,
          linguistic_equivalence_evidence_sha256
          FROM jrei_exam_item_prompt_localizations LIMIT 0');
        $pdo->query('SELECT review_id,item_id,locale,reviewed_revision,
          translation_rights_evidence_sha256,decision
          FROM jrei_exam_prompt_locale_review_history LIMIT 0');
    }catch(Throwable $e){
        throw new DomainException('exam_localization_migration_required',0,$e);
    }
    if($action==='exam_localized_prompt_draft'){
        $object=$body['objectRefId']??null;
        $original=$body['originalItemSha256']??null;
        $localized=$body['localizedManifestSha256']??null;
        if(!is_string($object)||!validUuid($object)||
           !is_string($original)||!preg_match($sha,$original)||
           !is_string($localized)||!preg_match($sha,$localized)||
           ($body['confirmation']??null)!==
              'REGISTER_UNREVIEWED_LOCALIZED_EXAM_MANIFEST')
            throw new InvalidArgumentException('invalid_localized_exam_draft');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT i.id,o.content_sha256
              FROM eco_assessment_items i
              JOIN eco_object_refs o ON o.id=i.prompt_object_id
              WHERE i.id=? FOR UPDATE');
            $q->execute([$id]);$canonical=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($canonical)||
               !hash_equals((string)$canonical['content_sha256'],$original))
                throw new DomainException('original_item_digest_unverified');
            $q=$pdo->prepare('SELECT id,storage_provider,object_reference,
              content_sha256,mime_type,byte_size,data_class,
              malware_scan_status,encryption_key_reference
              FROM eco_object_refs WHERE id=? FOR UPDATE');
            $q->execute([$object]);$ref=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($ref)||
               $ref['storage_provider']!=='JR_EXAM_PUBLISHED_ITEM'||
               $ref['mime_type']!=='application/json'||
               $ref['data_class']!=='PRIVATE'||
               $ref['malware_scan_status']!=='CLEAN'||
               $ref['encryption_key_reference']!==null||
               !hash_equals($localized,(string)$ref['content_sha256'])||
               !hash_equals($localized.'.json',(string)$ref['object_reference'])||
               (int)$ref['byte_size']<80||(int)$ref['byte_size']>32768)
                throw new DomainException('localized_original_object_contract_unavailable');
            $now=time();
            $q=$pdo->prepare("INSERT INTO jrei_exam_item_prompt_localizations
              (item_id,locale,object_ref_id,original_item_sha256,
               localized_manifest_sha256,review_state,prepared_by_account_id,
               created_at,updated_at)
              VALUES(?,?,?,?,?,'DRAFT',?,?,?)");
            $q->execute([$id,$lang,$object,$original,$localized,$actor,$now,$now]);
            if($q->rowCount()!==1)
                throw new DomainException('localized_item_draft_not_recorded');
            operationsAudit($pdo,$actor,'jrei_exam_locale_draft_registered',$id);
            $pdo->commit();
            return ['ok'=>true,'state'=>'DRAFT',
              'newAnswerKeyCreated'=>false,'fileContentsRead'=>false,
              'newExamPublished'=>false,'localizationVerified'=>false];
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    }
    if($action!=='exam_localized_prompt_review')
        throw new InvalidArgumentException('unknown_exam_localization_action');
    $decision=$body['decision']??null;
    $expected=$body['expectedRevision']??null;
    // These are human-provided DOCUMENT digests, not proof that the system
    // inspected a licence. A reproduction licence alone may prohibit creating
    // or distributing translations: separate documentary evidence is needed.
    $rightsEvidence=$body['translationRightsEvidenceSha256']??null;
    $languageEvidence=$body['linguisticEvidenceSha256']??null;
    if($decision==='APPROVE'){
        if(!is_string($rightsEvidence)||!preg_match($sha,$rightsEvidence)||
           !is_string($languageEvidence)||!preg_match($sha,$languageEvidence)||
           hash_equals($rightsEvidence,$languageEvidence))
            throw new InvalidArgumentException('separate_translation_rights_and_language_evidence_required');
    }elseif($rightsEvidence!==null||$languageEvidence!==null){
        throw new InvalidArgumentException('withdrawal_must_not_introduce_new_evidence');
    }
    if(!in_array($decision,['APPROVE','WITHDRAW'],true)||
       !is_int($expected)||$expected<1||$expected>1000000000000||
       ($body['confirmation']??null)!==
         'INDEPENDENT_HUMAN_LOCALE_REVIEW_WITHOUT_PUBLIC_RELEASE')
        throw new InvalidArgumentException('invalid_exam_translation_review');
    $pdo->beginTransaction();
    try{
        // Lock original item + canonical content before localised record.
        $q=$pdo->prepare('SELECT i.id,o.content_sha256
          FROM eco_assessment_items i
          JOIN eco_object_refs o ON o.id=i.prompt_object_id
          WHERE i.id=? FOR UPDATE');
        $q->execute([$id]);$original=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($original))
            throw new DomainException('original_exam_item_missing');
        $q=$pdo->prepare('SELECT item_id,locale,object_ref_id,
          original_item_sha256,localized_manifest_sha256,
          review_state,prepared_by_account_id,revision,
          translation_rights_evidence_sha256,
          linguistic_equivalence_evidence_sha256
          FROM jrei_exam_item_prompt_localizations
          WHERE item_id=? AND locale=? FOR UPDATE');
        $q->execute([$id,$lang]);$row=$q->fetch(PDO::FETCH_ASSOC);
        if(!is_array($row)||(int)$row['revision']!==$expected)
            throw new DomainException('exam_translation_review_revision_conflict');
        if($decision==='APPROVE'){
            if($row['review_state']!=='DRAFT'||
               $row['prepared_by_account_id']===null||
               $row['prepared_by_account_id']===$actor||
               !hash_equals((string)$original['content_sha256'],
                    (string)$row['original_item_sha256']))
                throw new DomainException('independent_localization_review_required');
            // The underlying original source and key must have a distinct
            // reviewed provenance. This checks metadata only, never replaces
            // the final licensed, human scientific acceptance campaign.
            $q=$pdo->prepare("SELECT m.reviewed_by_account_id,
              m.authored_by_account_id,m.item_state,
              m.diagram_formula_integrity,m.ambiguity_review_state,
              m.copyright_review_state,
              s.review_state AS source_review,s.rights_state,
              s.reviewer_account_id AS source_reviewer,
              s.verified_at AS source_reviewed_at,
              s.is_revoked,s.is_superseded,
              k.key_state,k.rights_review_state,
              k.reviewer_account_id AS key_reviewer
              FROM jrei_exam_item_metadata m
              JOIN jrei_exam_sources s ON s.source_id=m.source_id
              JOIN jrei_exam_reviewed_answer_keys k
                ON k.item_id=m.canonical_assessment_item_id
                AND k.source_id=s.source_id
              WHERE m.canonical_assessment_item_id=?
              LIMIT 2");
            $q->execute([$id]);$rows=$q->fetchAll(PDO::FETCH_ASSOC);
            if(count($rows)!==1)throw new DomainException('original_item_approval_unavailable');
            $meta=$rows[0];
            if($meta['item_state']!=='APPROVED'||
               $meta['diagram_formula_integrity']!=='APPROVED'||
               $meta['ambiguity_review_state']!=='APPROVED'||
               $meta['copyright_review_state']!=='APPROVED'||
               $meta['reviewed_by_account_id']===null||
               $meta['authored_by_account_id']===null||
               $meta['reviewed_by_account_id']===$meta['authored_by_account_id']||
               $meta['source_review']!=='AUTHORITATIVE_REVIEWED'||
               $meta['source_reviewer']===null||
               $meta['source_reviewed_at']===null||
               $meta['rights_state']!=='PERMITTED_REPRODUCTION'||
               (int)$meta['is_revoked']!==0||
               (int)$meta['is_superseded']!==0||
               $meta['key_state']!=='APPROVED'||
               $meta['rights_review_state']!=='APPROVED'||
               $meta['key_reviewer']===null||
               $actor===$meta['authored_by_account_id']||
               $actor===$meta['source_reviewer']||
               $actor===$meta['reviewed_by_account_id']||
               $actor===$meta['key_reviewer'])
                throw new DomainException('original_item_or_source_rights_unreviewed');
            $q=$pdo->prepare('SELECT content_sha256
              FROM eco_object_refs WHERE id=? FOR UPDATE');
            $q->execute([$row['object_ref_id']]);
            $sha=$q->fetchColumn();
            if(!is_string($sha)||
               !hash_equals((string)$row['localized_manifest_sha256'],$sha))
                throw new DomainException('localized_manifest_digest_changed');
        }elseif(!in_array($row['review_state'],['DRAFT','APPROVED'],true)){
            throw new DomainException('localized_prompt_already_withdrawn');
        }
        $now=time();$next=$decision==='APPROVE'?'APPROVED':'WITHDRAWN';
        $q=$pdo->prepare('UPDATE jrei_exam_item_prompt_localizations
          SET review_state=?,independently_reviewed_by_account_id=?,
            reviewed_at=?,updated_at=?,revision=revision+1,
            translation_rights_evidence_sha256=?,
            linguistic_equivalence_evidence_sha256=?
          WHERE item_id=? AND locale=? AND revision=?');
        $q->execute([$next,$actor,$now,$now,
          $decision==='APPROVE'?$rightsEvidence:null,
          $decision==='APPROVE'?$languageEvidence:null,
          $id,$lang,$expected]);
        if($q->rowCount()!==1)
            throw new DomainException('localized_review_concurrency_conflict');
        $newRevision=$expected+1;
        $q=$pdo->prepare('INSERT INTO jrei_exam_prompt_locale_review_history
          (review_id,item_id,locale,reviewed_revision,object_ref_id,
           original_item_sha256,localized_manifest_sha256,
           translation_rights_evidence_sha256,
           linguistic_equivalence_evidence_sha256,
           decision,reviewer_account_id,created_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
        $q->execute([
          uuidv4(),$id,$lang,$newRevision,$row['object_ref_id'],
          $row['original_item_sha256'],$row['localized_manifest_sha256'],
          $decision==='APPROVE'?$rightsEvidence:
             $row['translation_rights_evidence_sha256'],
          $decision==='APPROVE'?$languageEvidence:
             $row['linguistic_equivalence_evidence_sha256'],
          $next,$actor,$now
        ]);
        if($q->rowCount()!==1)
            throw new DomainException('localized_review_history_unavailable');
        operationsAudit($pdo,$actor,$decision==='APPROVE'?
          'jrei_exam_localization_independently_attested':
          'jrei_exam_localization_withdrawn',$id);
        $pdo->commit();
        return ['ok'=>true,'state'=>$next,
          'scientificQualityIndependentlyAccepted'=>false,
          'realOriginalAndTranslatedFilesCompared'=>false,
          'paymentOrExamReleaseChanged'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
function jrExamOwnerLocalizedPromptSnapshot(PDO $pdo): array {
    $out=['schema'=>'jr.jrei.exam-prompt-locales-owner.v1',
       'available'=>false,'counts'=>null,'items'=>[],'truncated'=>false,
       'reviewDecisionCount'=>null,'approvedWithEvidenceCount'=>null,
       'sourceContentComparedToTranslation'=>false,
       'translationPublishedAutomatically'=>false];
    try{
        $q=$pdo->query('SELECT COUNT(*) FROM
          jrei_exam_prompt_locale_review_history');
        $out['reviewDecisionCount']=(int)$q->fetchColumn();
        $q=$pdo->query("SELECT COUNT(*) FROM
          jrei_exam_item_prompt_localizations
          WHERE review_state='APPROVED'
            AND translation_rights_evidence_sha256 IS NOT NULL
            AND linguistic_equivalence_evidence_sha256 IS NOT NULL
            AND translation_rights_evidence_sha256<>
                linguistic_equivalence_evidence_sha256
            AND prepared_by_account_id IS NOT NULL
            AND independently_reviewed_by_account_id IS NOT NULL
            AND prepared_by_account_id<>independently_reviewed_by_account_id
            AND reviewed_at IS NOT NULL");
        $out['approvedWithEvidenceCount']=(int)$q->fetchColumn();
        $q=$pdo->query('SELECT locale,review_state,COUNT(*) AS n
          FROM jrei_exam_item_prompt_localizations
          GROUP BY locale,review_state ORDER BY locale,review_state');
        $out['counts']=[];
        foreach($q as $row)$out['counts'][]=[
           'locale'=>$row['locale'],'reviewState'=>$row['review_state'],
           'count'=>(int)$row['n']];
        $q=$pdo->query('SELECT item_id,locale,review_state,revision,
          CASE WHEN prepared_by_account_id IS NULL THEN 0 ELSE 1 END AS has_author,
          CASE WHEN independently_reviewed_by_account_id IS NULL THEN 0 ELSE 1 END AS has_reviewer
          FROM jrei_exam_item_prompt_localizations
          ORDER BY updated_at DESC,item_id DESC LIMIT 31');
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $out['truncated']=count($rows)>30;
        foreach(array_slice($rows,0,30) as $r)
            $out['items'][]=[
              'itemId'=>$r['item_id'],'locale'=>$r['locale'],
              'state'=>$r['review_state'],'revision'=>(int)$r['revision'],
              'humanPrepared'=>(int)$r['has_author']===1,
              'humanReviewed'=>(int)$r['has_reviewer']===1];
        $out['available']=true;
    }catch(Throwable $e){
        $out['counts']=null;$out['items']=[];$out['truncated']=false;
        $out['reviewDecisionCount']=null;
        $out['approvedWithEvidenceCount']=null;
    }
    return $out;
}
