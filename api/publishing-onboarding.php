<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
/**
 * Source-only author onboarding extension of the EXISTING Bertina mother DB.
 * No registration of arbitrary authors, self-verification or automatic payouts.
 * Author documents remain scanned, AES-GCM encrypted, OUTSIDE public_html.
 * Requires the last-step additive migration and real host preflight.
 */
function jrPubKycSchema(PDO $pdo): bool {
    if (!jrPublishingSchemaReady($pdo)) return false;
    try {
        foreach (['publishing_author_profiles','publishing_author_bank_accounts','publishing_author_documents'] as $table) {
            $stmt=$pdo->prepare('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?');
            $stmt->execute([$table]);
            if (strcasecmp((string)$stmt->fetchColumn(),'InnoDB')!==0) return false;
        }
        return true;
    } catch (Throwable $e) { return false; }
}
function jrPubKycKey(): string {
    $pepper=(string)(cfg()['auth_pepper']??'');
    if(strlen($pepper)<32||!function_exists('hash_hkdf')||!function_exists('openssl_encrypt')||!function_exists('openssl_decrypt'))
        throw new RuntimeException('kyc_crypto_not_ready');
    return hash_hkdf('sha256',$pepper,32,'jr-publishing-author-kyc-aes-gcm-v1');
}
function jrPubSeal(string $plain,string $aad): string {
    $iv=random_bytes(12);$tag='';
    $cipher=openssl_encrypt($plain,'aes-256-gcm',jrPubKycKey(),OPENSSL_RAW_DATA,$iv,$tag,$aad,16);
    if(!is_string($cipher)||strlen($tag)!==16)throw new RuntimeException('kyc_encrypt_failed');
    return base64_encode('JRAK1'.$iv.$tag.$cipher);
}
function jrPubUnseal(string $sealed,string $aad): string {
    $raw=base64_decode($sealed,true);
    if(!is_string($raw)||strlen($raw)<34||substr($raw,0,5)!=='JRAK1')throw new RuntimeException('kyc_data_invalid');
    $value=openssl_decrypt(substr($raw,33),'aes-256-gcm',jrPubKycKey(),
        OPENSSL_RAW_DATA,substr($raw,5,12),substr($raw,17,16),$aad);
    if(!is_string($value))throw new RuntimeException('kyc_authentication_failed');
    return $value;
}
function jrPubKycAudit(PDO $pdo,string $author,string $actor,string $action,?string $digest=null): void {
    $stmt=$pdo->prepare('INSERT INTO publishing_audit_events(id,author_id,actor_account_id,action_key,evidence_hash) VALUES(?,?,?,?,?)');
    $stmt->execute([uuidv4(),$author,$actor,$action,$digest]);
}
function jrPubAuthorOwned(PDO $pdo,string $account,string $author): bool {
    if(!validUuid($author)||!validUuid($account))return false;
    $q=$pdo->prepare("SELECT 1 FROM publishing_author_accounts l
       JOIN publishing_authors a ON a.id=l.author_id
       WHERE l.author_id=? AND l.account_id=? AND l.role='author'
        AND l.approved_at IS NOT NULL AND l.revoked_at IS NULL
        AND a.status IN('verification_pending','approved') LIMIT 1");
    $q->execute([$author,$account]);return (bool)$q->fetchColumn();
}
function jrPubProfileClean(array $b): array {
    $fields=['legalNameFa'=>180,'legalNameEn'=>180,'academicTitle'=>120,'affiliation'=>240,'specialization'=>500,'orcid'=>25,'professionalBio'=>1800,
       'identityNumber'=>30,'birthDate'=>10,'mobile'=>25,'postalAddress'=>450];
    $v=[];foreach($fields as $name=>$max){
        if(!isset($b[$name])||!is_string($b[$name]))$v[$name]='';
        else $v[$name]=trim($b[$name]);
        if(strlen($v[$name])>$max*4||textLen($v[$name])>$max||preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/',$v[$name]))
            throw new InvalidArgumentException('invalid_profile_field');
    }
    if(textLen($v['legalNameFa'])<3||textLen($v['legalNameEn'])<3||$v['identityNumber']===''||
       !in_array($b['identityKind']??null,['iran_national_id','passport'],true)
       ||($b['privacyConsent']??null)!=='AUTHOR_PRIVATE_ONBOARDING_V1'
       ||!in_array($b['cvPublicConsent']??null,[true,false],true))
        throw new InvalidArgumentException('identity_or_consent_required');
    if($b['identityKind']==='iran_national_id'&&!preg_match('/^[0-9]{10}$/D',$v['identityNumber']))
        throw new InvalidArgumentException('invalid_identity_reference');
    if($b['identityKind']==='passport'&&!preg_match('/^[a-zA-Z0-9]{6,20}$/D',$v['identityNumber']))
        throw new InvalidArgumentException('invalid_identity_reference');
    if($v['birthDate']!==''&&(!preg_match('/^\d{4}-\d\d-\d\d$/D',$v['birthDate'])||
       !checkdate((int)substr($v['birthDate'],5,2),(int)substr($v['birthDate'],8,2),(int)substr($v['birthDate'],0,4))))
        throw new InvalidArgumentException('invalid_birthdate');
    if($v['mobile']!==''&&!preg_match('/^\+?[0-9]{9,15}$/D',$v['mobile']))
        throw new InvalidArgumentException('invalid_phone');
    if($v['orcid']!==''&&!preg_match('/^\d{4}-\d{4}-\d{4}-[\dX]{4}$/D',$v['orcid']))
        throw new InvalidArgumentException('invalid_orcid');
    return $v+['identityKind'=>$b['identityKind'],'cvPublicConsent'=>$b['cvPublicConsent']];
}
function jrPubCardValid(string $card): bool {
    if(!preg_match('/^[0-9]{16}$/D',$card))return false;
    $sum=0;for($i=15;$i>=0;$i--){$n=(int)$card[$i];if((15-$i)%2===1){$n*=2;if($n>9)$n-=9;}$sum+=$n;}
    return $sum%10===0;
}
function jrPubIbanValid(string $iban): bool {
    if(!preg_match('/^IR[0-9]{24}$/D',$iban))return false;
    $rearranged=substr($iban,4).'1827'.substr($iban,2,2);$remainder=0;
    for($i=0,$n=strlen($rearranged);$i<$n;$i++)$remainder=($remainder*10+(int)$rearranged[$i])%97;
    return $remainder===1;
}
function jrPubKycSummary(PDO $pdo,string $author): array {
    $p=$pdo->prepare('SELECT legal_name_fa,legal_name_en,academic_title,affiliation,specialization,orcid,professional_bio,
       identity_kind,cv_public_consent,review_state,review_note,reviewed_at,updated_at FROM publishing_author_profiles WHERE author_id=?');
    $p->execute([$author]);$profile=$p->fetch(PDO::FETCH_ASSOC)?:null;
    $b=$pdo->prepare('SELECT holder_name,bank_name,card_last4,iban_last4,review_state,review_note,verified_at,updated_at
       FROM publishing_author_bank_accounts WHERE author_id=?');
    $b->execute([$author]);$bank=$b->fetch(PDO::FETCH_ASSOC)?:null;
    $d=$pdo->prepare('SELECT id,document_kind,content_type,byte_size,review_state,review_note,submitted_at FROM publishing_author_documents
       WHERE author_id=? ORDER BY submitted_at DESC LIMIT 35');
    $d->execute([$author]);$docs=$d->fetchAll(PDO::FETCH_ASSOC);
    return ['authorId'=>$author,'profile'=>$profile,'bank'=>$bank,'documents'=>$docs,
       'settlementIdentityVerified'=>$profile!==null&&$bank!==null
         &&$profile['review_state']==='approved'&&$bank['review_state']==='verified',
       'settlementStillRequiresContractAndBankEvidence'=>true];
}
function jrPubKycDocumentDir(): ?string {
    if(!function_exists('jrServiceFilesPrivateRoot'))return null;
    $root=jrServiceFilesPrivateRoot();if($root===null)return null;
    $dir=$root.'/publishing-author-kyc';
    if(is_link($dir))return null;
    if(!is_dir($dir)&&!@mkdir($dir,0700))return null;
    $real=realpath($dir);
    if(!$real||!str_starts_with($real,$root.'/')||!is_writable($real))return null;
    $mode=@fileperms($real);
    return $mode!==false&&($mode&0077)===0?$real:null;
}
function jrPubAuthorOnboardingRoute(string $path,string $verb): never {
    header('Cache-Control: no-store, private, max-age=0');header('X-Robots-Tag: noindex, noarchive, nosnippet');
    $pdo=db();if(!$pdo||!authReady()||!jrPubKycSchema($pdo))fail('author_onboarding_not_provisioned',503);
    $account=sessionAccount($pdo);
    if(!$account||($account['status']??'')!=='active'||empty($account['email_verified_at']))fail('unauthorized',401);
    $id=(string)$account['id'];
    if($path==='/publishing/author/onboarding'&&$verb==='GET'){
        if(!rateAllowed($pdo,'publishing_kyc_read',$id,20,300))fail('rate_limited',429);
        $list=$pdo->prepare("SELECT author_id FROM publishing_author_accounts WHERE account_id=? AND role='author'
          AND approved_at IS NOT NULL AND revoked_at IS NULL LIMIT 12");
        $list->execute([$id]);$authors=[];
        foreach($list->fetchAll(PDO::FETCH_COLUMN) as $author)
            if(jrPubAuthorOwned($pdo,$id,(string)$author))$authors[]=jrPubKycSummary($pdo,(string)$author);
        if(!$authors)fail('author_role_not_approved',403);
        respond(['ok'=>true,'schema'=>'author-private-onboarding-v1','authors'=>$authors]);
    }
    if($verb!=='POST')fail('route_not_found',404);
    // Mandatory same-origin POST; missing Origin must NOT be treated as safe.
    if((string)($_SERVER['HTTP_ORIGIN']??'')!==SITE_ORIGIN)fail('origin_forbidden',403);
    if(!rateAllowed($pdo,'publishing_kyc_write',$id,6,3600))fail('rate_limited',429);
    if($path==='/publishing/author/onboarding/document'){
        $author=(string)($_POST['authorId']??'');$kind=(string)($_POST['kind']??'');
        if(!jrPubAuthorOwned($pdo,$id,$author))fail('author_forbidden',403);
        if(!in_array($kind,['identity_front','identity_back','academic_cv','bank_ownership','other'],true))
            fail('document_type_invalid',422);
        if(!isset($_FILES['document'])||!is_array($_FILES['document']))fail('document_missing',422);
        $file=$_FILES['document'];$tmp=$file['tmp_name']??null;
        if(!is_string($tmp)||($file['error']??-1)!==UPLOAD_ERR_OK||!is_uploaded_file($tmp)
           ||(int)($file['size']??0)<64||(int)$file['size']>5242880)fail('document_invalid',422);
        if(!class_exists('finfo')||!function_exists('jrServiceFileScan')||
           !function_exists('jrServiceFilesAntivirus')||!jrServiceFilesAntivirus())fail('secure_file_ingestion_unavailable',503);
        $mime=(new finfo(FILEINFO_MIME_TYPE))->file($tmp);
        $ext=['application/pdf'=>'pdf','image/jpeg'=>'jpg','image/png'=>'png'][$mime]??null;
        if(!$ext)fail('document_format_invalid',422);
        $magic=file_get_contents($tmp,false,null,0,8);
        if(($ext==='pdf'&&substr((string)$magic,0,5)!=='%PDF-')||
           ($ext==='jpg'&&substr((string)$magic,0,3)!=="\xFF\xD8\xFF")||
           ($ext==='png'&&$magic!=="\x89PNG\r\n\x1a\n"))fail('document_signature_invalid',422);
        $dir=jrPubKycDocumentDir();if(!$dir)fail('private_document_storage_unavailable',503);
        jrServiceFileScan($tmp,(string)jrServiceFilesAntivirus());
        $bytes=file_get_contents($tmp);if(!is_string($bytes)||strlen($bytes)!==(int)$file['size'])
            fail('document_read_failed',503);
        $docId=uuidv4();$name=bin2hex(random_bytes(24)).'.blob';$sealed=jrPubSeal($bytes,'jr-publishing-doc|'.$author.'|'.$docId);
        $digest=hash('sha256',$bytes);unset($bytes);
        $dest=$dir.'/'.$name;$fh=@fopen($dest,'xb');if(!$fh)fail('private_document_write_failed',503);
        try {
            $offset=0;$count=strlen($sealed);
            while($offset<$count){$w=fwrite($fh,substr($sealed,$offset,min(262144,$count-$offset)));
                if(!is_int($w)||$w<=0)throw new RuntimeException('partial_file_write');$offset+=$w;}
            if(!fflush($fh)||!fclose($fh)||!chmod($dest,0600))throw new RuntimeException('private_write_incomplete');
            $fh=null;
            $pdo->beginTransaction();
            $q=$pdo->prepare('INSERT INTO publishing_author_documents(id,author_id,document_kind,encrypted_storage_name,
                  content_sha256,byte_size,content_type) VALUES(?,?,?,?,?,?,?)');
            $q->execute([$docId,$author,$kind,$name,$digest,strlen($sealed)>0?(int)$file['size']:0,$mime]);
            jrPubKycAudit($pdo,$author,$id,'author_document_submitted',$digest);
            $pdo->commit();
        }catch(Throwable $e){if(is_resource($fh))fclose($fh);if($pdo->inTransaction())$pdo->rollBack();@unlink($dest);fail('private_document_unavailable',503);}
        respond(['ok'=>true,'documentId'=>$docId,'state'=>'submitted','reviewRequired'=>true],201);
    }
    $body=jsonBody();$author=(string)($body['authorId']??'');
    if(!jrPubAuthorOwned($pdo,$id,$author))fail('author_forbidden',403);
    try {
        if($path==='/publishing/author/onboarding/profile'){
            $p=jrPubProfileClean($body);
            $sealed=jrPubSeal($p['identityNumber'],'author-identity|'.$author);
            $birth=$p['birthDate']!==''?jrPubSeal($p['birthDate'],'author-birth|'.$author):null;
            $phone=$p['mobile']!==''?jrPubSeal($p['mobile'],'author-phone|'.$author):null;
            $address=$p['postalAddress']!==''?jrPubSeal($p['postalAddress'],'author-address|'.$author):null;
            $pdo->beginTransaction();
            $q=$pdo->prepare("INSERT INTO publishing_author_profiles(author_id,legal_name_fa,legal_name_en,academic_title,
                affiliation,specialization,orcid,professional_bio,identity_kind,identity_reference_sealed,
                birth_date_sealed,mobile_sealed,address_sealed,cv_public_consent,privacy_consent_version,review_state)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'submitted')
                ON DUPLICATE KEY UPDATE legal_name_fa=VALUES(legal_name_fa),legal_name_en=VALUES(legal_name_en),
                 academic_title=VALUES(academic_title),affiliation=VALUES(affiliation),specialization=VALUES(specialization),
                 orcid=VALUES(orcid),professional_bio=VALUES(professional_bio),identity_kind=VALUES(identity_kind),
                 identity_reference_sealed=VALUES(identity_reference_sealed),birth_date_sealed=VALUES(birth_date_sealed),
                 mobile_sealed=VALUES(mobile_sealed),address_sealed=VALUES(address_sealed),
                 cv_public_consent=VALUES(cv_public_consent),privacy_consent_version=VALUES(privacy_consent_version),
                 review_state='submitted',reviewed_at=NULL,reviewed_by=NULL,review_note=NULL");
            $q->execute([$author,$p['legalNameFa'],$p['legalNameEn'],$p['academicTitle'],$p['affiliation'],
                $p['specialization'],$p['orcid'],$p['professionalBio'],$p['identityKind'],$sealed,
                $birth,$phone,$address,$p['cvPublicConsent']?1:0,'AUTHOR_PRIVATE_ONBOARDING_V1']);
            jrPubKycAudit($pdo,$author,$id,'author_profile_submitted');$pdo->commit();
            respond(['ok'=>true,'state'=>'submitted','reviewRequired'=>true]);
        }
        if($path==='/publishing/author/onboarding/bank'){
            $card=(string)($body['card']??'');$iban=strtoupper((string)($body['iban']??''));
            $card=preg_replace('/[\s-]/','',$card);$iban=preg_replace('/\s/','',$iban);
            $holder=trim((string)($body['holderName']??''));$bank=trim((string)($body['bankName']??''));
            if(!jrPubCardValid($card)||!jrPubIbanValid($iban)||textLen($holder)<3||textLen($holder)>180||
                textLen($bank)<2||textLen($bank)>140)fail('invalid_bank_account',422);
            $s=$pdo->prepare("SELECT review_state FROM publishing_author_profiles WHERE author_id=?");
            $s->execute([$author]);if(!$s->fetchColumn())fail('profile_required_first',409);
            $pdo->beginTransaction();
            $q=$pdo->prepare("INSERT INTO publishing_author_bank_accounts(author_id,holder_name,bank_name,card_last4,
               iban_last4,card_sealed,iban_sealed,review_state) VALUES(?,?,?,?,?,?,?,'submitted')
               ON DUPLICATE KEY UPDATE holder_name=VALUES(holder_name),bank_name=VALUES(bank_name),
                  card_last4=VALUES(card_last4),iban_last4=VALUES(iban_last4),card_sealed=VALUES(card_sealed),
                  iban_sealed=VALUES(iban_sealed),review_state='submitted',reviewed_by=NULL,reviewed_at=NULL,
                  verified_at=NULL,review_note=NULL");
            $q->execute([$author,$holder,$bank,substr($card,-4),substr($iban,-4),
               jrPubSeal($card,'author-card|'.$author),jrPubSeal($iban,'author-iban|'.$author)]);
            jrPubKycAudit($pdo,$author,$id,'author_bank_submitted');$pdo->commit();
            respond(['ok'=>true,'state'=>'submitted','reviewRequired'=>true,'last4'=>substr($iban,-4)]);
        }
        fail('route_not_found',404);
    } catch(InvalidArgumentException $e){if($pdo->inTransaction())$pdo->rollBack();fail('invalid_onboarding_data',422);}
      catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();error_log('Author onboarding error '.get_class($e));fail('author_onboarding_unavailable',503);}
}
function jrPubKycAdminRoute(PDO $pdo,string $path,string $verb,string $admin,string $csrf,array $configuration): never {
    // Caller has already verified the actual operations account + fresh TOTP.
    if(($configuration['operations_admins'][$admin]['role']??null)!=='SUPER_ADMIN')
        fail('publishing_owner_role_required',403);
    if(!jrPubKycSchema($pdo))fail('author_onboarding_not_provisioned',503);
    if($path==='/admin/operations/publishing/authors'&&$verb==='GET'){
        if(!rateAllowed($pdo,'publishing_owner_read',$admin,15,300))fail('rate_limited',429);
        $q=$pdo->query("SELECT a.id,a.display_name_fa,a.status,
         p.legal_name_fa,p.legal_name_en,p.academic_title,p.affiliation,p.specialization,p.orcid,
         p.identity_kind,p.professional_bio,p.review_state AS profile_state,p.review_note AS profile_note,
         b.holder_name,b.bank_name,b.card_last4,b.iban_last4,b.review_state AS bank_state,b.review_note AS bank_note
         FROM publishing_authors a
         LEFT JOIN publishing_author_profiles p ON p.author_id=a.id
         LEFT JOIN publishing_author_bank_accounts b ON b.author_id=a.id
         ORDER BY a.created_at DESC LIMIT 120");
        $rows=$q->fetchAll(PDO::FETCH_ASSOC);
        $doc=$pdo->prepare('SELECT id,document_kind,content_type,review_state,submitted_at,review_note
             FROM publishing_author_documents WHERE author_id=? ORDER BY submitted_at DESC LIMIT 35');
        foreach($rows as &$row){$doc->execute([(string)$row['id']]);$row['documents']=$doc->fetchAll(PDO::FETCH_ASSOC);}
        unset($row);
        respond(['ok'=>true,'schema'=>'author-owner-review-v1','authors'=>$rows,'readOnly'=>true,
         'bankCredentialsReturned'=>false,'legalApprovalNotAutomatic'=>true]);
    }
    if($path==='/admin/operations/publishing/authors/document'&&$verb==='GET'){
        if(!rateAllowed($pdo,'publishing_owner_document',$admin,12,300))fail('rate_limited',429);
        $id=(string)($_GET['id']??'');if(!validUuid($id))fail('invalid_document',422);
        $q=$pdo->prepare('SELECT id,author_id,encrypted_storage_name,content_sha256,byte_size,content_type
           FROM publishing_author_documents WHERE id=?');
        $q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);if(!$row)fail('document_not_found',404);
        $dir=jrPubKycDocumentDir();if(!$dir)fail('private_document_storage_unavailable',503);
        $name=(string)$row['encrypted_storage_name'];
        if(!preg_match('/^[a-f0-9]{48}\.blob$/D',$name))fail('document_unavailable',503);
        $file=realpath($dir.'/'.$name);
        if(!$file||!str_starts_with($file,$dir.'/')||!is_file($file))fail('document_unavailable',503);
        $sealed=file_get_contents($file);if(!is_string($sealed)||strlen($sealed)>7500000)fail('document_unavailable',503);
        try{$plain=jrPubUnseal($sealed,'jr-publishing-doc|'.$row['author_id'].'|'.$row['id']);}
        catch(Throwable $e){fail('document_unavailable',503);}
        if(strlen($plain)!==(int)$row['byte_size']||
           !hash_equals((string)$row['content_sha256'],hash('sha256',$plain)))fail('document_unavailable',503);
        header('Content-Type: '.$row['content_type']);header('Cache-Control: no-store, private, max-age=0');
        header('Content-Security-Policy: sandbox');header('X-Content-Type-Options: nosniff');
        header('Content-Disposition: attachment; filename="author-evidence-'.substr($id,0,8).'.'.
           (['application/pdf'=>'pdf','image/jpeg'=>'jpg','image/png'=>'png'][$row['content_type']]??'bin').'"');
        header('Content-Length: '.strlen($plain));echo $plain;exit;
    }
    if($path==='/admin/operations/publishing/authors/decision'&&$verb==='POST'){
        if(!operationsMutationAllowed($_SERVER,(string)($_SERVER['HTTP_X_CSRF_TOKEN']??''),$csrf))
            fail('csrf_forbidden',403);
        if(!rateAllowed($pdo,'publishing_owner_decision',$admin,12,900))fail('rate_limited',429);
        $b=jsonBody();$author=(string)($b['authorId']??'');$kind=(string)($b['kind']??'');
        $decision=(string)($b['decision']??'');$docId=(string)($b['documentId']??'');
        $note=trim((string)($b['note']??''));
        if(!validUuid($author)||!in_array($kind,['profile','bank','document'],true)||
           !in_array($decision,['approved','changes_requested','rejected'],true)||
           textLen($note)>600||($kind==='document'&&!validUuid($docId)))fail('invalid_decision',422);
        if($kind==='profile'&&$decision==='rejected')fail('invalid_decision',422);
        if($kind==='bank'&&$decision==='rejected')fail('invalid_decision',422);
        if($kind==='document'&&$decision==='changes_requested')fail('invalid_decision',422);
        try{
            $pdo->beginTransaction();
            if($kind==='document'){
                $s=$pdo->prepare("SELECT review_state FROM publishing_author_documents WHERE author_id=? AND id=? FOR UPDATE");
                $s->execute([$author,$docId]);$state=$s->fetchColumn();
                if($state===false||$state!=='submitted')throw new DomainException('document_state_conflict');
                $q=$pdo->prepare('UPDATE publishing_author_documents SET review_state=?,review_note=?,reviewed_by=?,reviewed_at=NOW() WHERE author_id=? AND id=?');
                $q->execute([$decision,$note,$admin,$author,$docId]);
            }elseif($kind==='profile'){
                $s=$pdo->prepare('SELECT review_state FROM publishing_author_profiles WHERE author_id=? FOR UPDATE');
                $s->execute([$author]);$state=$s->fetchColumn();
                if($state===false||!in_array($state,['submitted','changes_requested'],true))
                   throw new DomainException('profile_state_conflict');
                if($decision==='approved'){
                    $q=$pdo->prepare("SELECT COUNT(DISTINCT document_kind) FROM publishing_author_documents
                      WHERE author_id=? AND review_state='approved' AND document_kind IN('identity_front','academic_cv')");
                    $q->execute([$author]);if((int)$q->fetchColumn()!==2)throw new DomainException('identity_cv_documents_not_verified');
                }
                $q=$pdo->prepare('UPDATE publishing_author_profiles SET review_state=?,review_note=?,reviewed_by=?,reviewed_at=NOW() WHERE author_id=?');
                $q->execute([$decision,$note,$admin,$author]);
            }else{
                $s=$pdo->prepare('SELECT review_state FROM publishing_author_bank_accounts WHERE author_id=? FOR UPDATE');
                $s->execute([$author]);$state=$s->fetchColumn();
                if($state===false||!in_array($state,['submitted','changes_requested'],true))
                   throw new DomainException('bank_state_conflict');
                if($decision==='approved'){
                    $profile=$pdo->prepare("SELECT 1 FROM publishing_author_profiles WHERE author_id=? AND review_state='approved'");
                    $profile->execute([$author]);if(!$profile->fetchColumn())throw new DomainException('profile_not_approved');
                    $proof=$pdo->prepare("SELECT 1 FROM publishing_author_documents WHERE author_id=?
                       AND document_kind='bank_ownership' AND review_state='approved' LIMIT 1");
                    $proof->execute([$author]);if(!$proof->fetchColumn())throw new DomainException('bank_document_not_verified');
                }
                $q=$pdo->prepare("UPDATE publishing_author_bank_accounts SET review_state=?,review_note=?,reviewed_by=?,
                   reviewed_at=NOW(),verified_at=IF(?='verified',NOW(),NULL) WHERE author_id=?");
                $stateNext=$decision==='approved'?'verified':'changes_requested';
                $q->execute([$stateNext,$note,$admin,$stateNext,$author]);
            }
            jrPubKycAudit($pdo,$author,$admin,'author_'.$kind.'_review_'.$decision);
            $pdo->commit();
        }catch(DomainException $e){if($pdo->inTransaction())$pdo->rollBack();fail('review_dependency_or_state_conflict',409);}
         catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();error_log('Author KYC review error '.get_class($e));fail('author_review_unavailable',503);}
        respond(['ok'=>true,'kind'=>$kind,'decision'=>$decision,'manualPayoutAuthorized'=>false]);
    }
    fail('route_not_found',404);
}
