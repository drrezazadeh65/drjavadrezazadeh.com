<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Native JHELA preliminary editorial screening, on the existing mother DB.
 * This is NOT peer review, acceptance, a financial decision or publication.
 * Invoked only inside operationsRoute after verified admin membership and fresh MFA.
 * No confidential PDF or storage path is returned to the browser.
 */
function jhelaOwnerManuscripts(PDO $pdo): never {
    if (!jhelaSchemaReady($pdo)) fail('journal_schema_unavailable',503);
    $q=$pdo->query("SELECT m.id,m.tracking_code,m.title,m.article_type,m.abstract_text,
          m.keywords_text,m.declarations,m.status,m.manuscript_sha256,m.file_bytes,
          m.uploaded_at,m.created_at,m.account_id,
          a.email_normalized AS author_email,p.public_name,p.affiliation
        FROM jhela_intake_manuscripts m
        JOIN customer_accounts a ON a.id=m.account_id
        LEFT JOIN jhela_author_profiles p ON p.account_id=m.account_id
        ORDER BY m.created_at DESC LIMIT 100");
    $items=$q->fetchAll();
    // Never expose private_file_rel or a manuscript download link in this view.
    respond(['ok'=>true,'schema'=>'jhela-native-owner-screening-v1',
        'manuscripts'=>$items,'preliminaryOnly'=>true,
        'peerReviewOperational'=>false,'publicationOperational'=>false]);
}

/** Only an accountable editorial screening transition; no silent acceptance. */
function jhelaOwnerScreen(PDO $pdo,string $ownerId,array $body): never {
    if (!jhelaSchemaReady($pdo)) fail('journal_schema_unavailable',503);
    $id=(string)($body['id']??'');
    $next=(string)($body['status']??'');
    if (!validUuid($id)||!in_array($next,['UNDER_SCREENING','NEEDS_INFORMATION'],true))
        fail('invalid_screening_transition',422);
    $publicMessage=$next==='NEEDS_INFORMATION'
        ?jhelaStr($body['message']??null,20,500,'screening_message_required')
        :'The manuscript has entered preliminary editorial screening. This is not peer review or acceptance.';
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare('SELECT account_id,status,uploaded_at,manuscript_sha256,file_bytes
            FROM jhela_intake_manuscripts WHERE id=? FOR UPDATE');
        $q->execute([$id]);$m=$q->fetch();
        if (!$m||$m['account_id']===$ownerId) {
            $pdo->rollBack();fail('editorial_conflict_or_missing_manuscript',403);
        }
        if (empty($m['uploaded_at'])||!preg_match('/^[a-f0-9]{64}$/D',(string)$m['manuscript_sha256'])||
            (int)$m['file_bytes']<1024) {
            $pdo->rollBack();fail('verified_pdf_receipt_required',409);
        }
        $allowed=[
            'PRELIMINARY_RECEIVED'=>['UNDER_SCREENING','NEEDS_INFORMATION'],
            'UNDER_SCREENING'=>['NEEDS_INFORMATION'],
            'AUTHOR_INFORMATION_RECEIVED'=>['UNDER_SCREENING','NEEDS_INFORMATION']
        ];
        $previous=(string)$m['status'];
        if (!in_array($next,$allowed[$previous]??[],true)) {
            $pdo->rollBack();fail('invalid_screening_transition',409);
        }
        $u=$pdo->prepare('UPDATE jhela_intake_manuscripts SET status=? WHERE id=? AND status=?');
        $u->execute([$next,$id,$previous]);
        if ($u->rowCount()!==1) throw new RuntimeException('screening_concurrent_update');
        jhelaEvent($pdo,$id,$next,$publicMessage);
        operationsAudit($pdo,$ownerId,'jhela_screen_'.strtolower($next),$id);
        $pdo->commit();
    }catch(Throwable $e){
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    respond(['ok'=>true,'id'=>$id,'status'=>$next,'preliminaryOnly'=>true]);
}
