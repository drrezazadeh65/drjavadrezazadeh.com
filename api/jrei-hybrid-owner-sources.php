<?php
declare(strict_types=1);
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

/**
 * Source registry and version-proposal administration. This uses ONLY the
 * original SUPER_ADMIN MFA / CSRF route. No automated fetching, fulltext
 * storage, unreviewed evidence publication, or separate administration.
 */
function jrHybridSourceReady(PDO $pdo): bool {
    try{
        $pdo->query('SELECT source_id FROM jrei_public_source_registry LIMIT 0');
        $pdo->query('SELECT proposal_id FROM jrei_public_source_proposals LIMIT 0');
        return true;
    }catch(Throwable $e){return false;}
}
function jrHybridSourceSnapshot(PDO $pdo): array {
    $ready=jrHybridSourceReady($pdo);
    $out=['sourceRegistryReady'=>$ready,'sources'=>[],'sourceVersions'=>[]];
    if(!$ready)return $out;
    $q=$pdo->query('SELECT source_id,issuer,canonical_url,content_type,
       language_code,trust_class,licence_code,usage_rights,
       acquisition_method,update_interval_hours,status,revision,
       proposed_at,approved_at,suspended_at,last_successful_fetch_at,
       last_approved_document_sha256
       FROM jrei_public_source_registry
       ORDER BY updated_at DESC,source_id LIMIT 60');
    foreach($q as $r)$out['sources'][]=[
       'sourceId'=>$r['source_id'],'issuer'=>$r['issuer'],
       'url'=>$r['canonical_url'],'contentType'=>$r['content_type'],
       'language'=>$r['language_code'],'trustClass'=>$r['trust_class'],
       'licenceCode'=>$r['licence_code'],'usageRights'=>$r['usage_rights'],
       'acquisitionMethod'=>$r['acquisition_method'],
       'updateIntervalHours'=>(int)$r['update_interval_hours'],
       'status'=>$r['status'],'revision'=>(int)$r['revision'],
       'proposedAt'=>(int)$r['proposed_at'],
       'approvedAt'=>$r['approved_at']===null?null:(int)$r['approved_at'],
       'lastSuccessfulFetchAt'=>$r['last_successful_fetch_at']===null?
           null:(int)$r['last_successful_fetch_at'],
       'lastApprovedDocumentSha256'=>$r['last_approved_document_sha256']
    ];
    $q=$pdo->query('SELECT proposal_id,source_id,document_sha256,
       preceding_sha256,observed_change,retrieved_at,
       declared_publication_at,status,revision,proposed_at
       FROM jrei_public_source_proposals
       ORDER BY proposed_at DESC LIMIT 60');
    foreach($q as $r)$out['sourceVersions'][]=[
      'proposalId'=>$r['proposal_id'],'sourceId'=>$r['source_id'],
      'documentSha256'=>$r['document_sha256'],
      'precedingSha256'=>$r['preceding_sha256'],
      'observedChange'=>$r['observed_change'],
      'declaredRetrievedAt'=>(int)$r['retrieved_at'],
      'declaredPublicationAt'=>$r['declared_publication_at']===null?
        null:(int)$r['declared_publication_at'],
      'status'=>$r['status'],'revision'=>(int)$r['revision']
    ];
    return $out;
}
function jrHybridSourceChange(PDO $pdo,string $actor,array $body): array {
    if(!jrHybridSourceReady($pdo))
        throw new DomainException('source_registry_migration_required');
    $action=$body['action']??null;$now=time();
    if($action==='propose_public_source'){
        $id=$body['sourceId']??null;$issuer=$body['issuer']??null;
        $url=$body['canonicalUrl']??null;$licence=$body['licenceCode']??null;
        $type=$body['contentType']??null;$language=$body['language']??null;
        $trust=$body['trustClass']??null;$rights=$body['usageRights']??null;
        $method=$body['acquisitionMethod']??null;
        $interval=$body['updateIntervalHours']??null;
        $parsed=is_string($url)?parse_url($url):false;
        if(!jrHybridIdentifier($id)||!is_string($issuer)||
           strlen(trim($issuer))<3||strlen($issuer)>160||
           preg_match('/[<>\x00-\x1f]/',$issuer)||
           !is_string($url)||strlen($url)>600||
           filter_var($url,FILTER_VALIDATE_URL)===false||
           !is_array($parsed)||($parsed['scheme']??null)!=='https'||
           empty($parsed['host'])||isset($parsed['user'])||
           isset($parsed['pass'])||isset($parsed['fragment'])||
           !is_string($licence)||
           !preg_match('/^[A-Za-z0-9._:+\/-]{3,80}$/D',$licence)||
           !in_array($type,['HTML','TEXT','PDF','JSON'],true)||
           !in_array($language,['fa','en','mixed'],true)||
           !in_array($trust,['OFFICIAL','INSTITUTIONAL','PEER_REVIEWED'],true)||
           !in_array($rights,['PUBLIC_REUSE_APPROVED','METADATA_ONLY'],true)||
           !in_array($method,['OWNER_MANUAL_INTAKE','PUBLIC_HTTPS'],true)||
           !is_int($interval)||$interval<12||$interval>2160||
           ($body['confirmation']??null)!=='REGISTER_SOURCE_PENDING_REVIEW')
            throw new InvalidArgumentException('invalid_source_proposal');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('INSERT INTO jrei_public_source_registry
              (source_id,issuer,canonical_url,content_type,language_code,
              trust_class,licence_code,usage_rights,acquisition_method,
              update_interval_hours,status,proposed_at,
              proposed_by_account_id,updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
            $q->execute([$id,trim($issuer),$url,$type,$language,$trust,
              $licence,$rights,$method,$interval,'PENDING',$now,$actor,$now]);
            operationsAudit($pdo,$actor,'jrei_source_proposed',$id);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return ['ok'=>true,'sourceId'=>$id,'status'=>'PENDING',
          'acquisitionStarted'=>false];
    }
    if(in_array($action,['approve_public_source','suspend_public_source'],true)){
        $id=$body['sourceId']??null;$rev=$body['revision']??null;
        $approve=$action==='approve_public_source';
        if(!jrHybridIdentifier($id)||!is_int($rev)||$rev<1||
           ($body['confirmation']??null)!==($approve?
             'APPROVE_LICENSED_SOURCE':'SUSPEND_SOURCE_AND_PROPOSALS'))
             throw new InvalidArgumentException('invalid_source_review');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT status,revision FROM jrei_public_source_registry
              WHERE source_id=? FOR UPDATE');
            $q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($row)||(int)$row['revision']!==$rev)
                throw new DomainException('source_version_conflict');
            if(($approve&&$row['status']!=='PENDING')||
               (!$approve&&!in_array($row['status'],['PENDING','APPROVED'],true)))
                throw new DomainException('source_state_conflict');
            $state=$approve?'APPROVED':'SUSPENDED';
            $q=$pdo->prepare('UPDATE jrei_public_source_registry
               SET status=?,approved_at=?,approved_by_account_id=?,
                   suspended_at=?,updated_at=?,revision=revision+1
               WHERE source_id=? AND revision=?');
            $q->execute([$state,$approve?$now:null,$approve?$actor:null,
                $approve?null:$now,$now,$id,$rev]);
            if($q->rowCount()!==1)throw new DomainException('source_version_conflict');
            if(!$approve){
                $q=$pdo->prepare("UPDATE jrei_public_source_proposals
                  SET status='SUSPENDED',revision=revision+1
                  WHERE source_id=? AND status='PENDING_REVIEW'");
                $q->execute([$id]);
            }
            operationsAudit($pdo,$actor,$approve?'jrei_source_owner_approved':
                'jrei_source_owner_suspended',$id);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return ['ok'=>true,'sourceId'=>$id,'status'=>$state,
            'contentPublished'=>false,'retrievalStarted'=>false];
    }
    if($action==='propose_source_version'){
        $id=$body['sourceId']??null;$sha=$body['documentSha256']??null;
        $bytes=$body['byteCount']??null;$retrieved=$body['retrievedAt']??null;
        $publication=$body['publicationAt']??null;
        $mime=$body['declaredMime']??null;
        if(!jrHybridIdentifier($id)||!jrHybridSha($sha)||
           !is_int($retrieved)||$retrieved<946684800||
           $retrieved>$now+90||
           $publication!==null&&(!is_int($publication)||
             $publication<946684800||$publication>$now+86400)||
           !is_int($bytes)||$bytes<1||$bytes>8*1024*1024||
           !is_string($mime)||strlen($mime)>80||
           ($body['confirmation']??null)!=='STAGE_SOURCE_DIGEST_FOR_REVIEW')
            throw new InvalidArgumentException('invalid_source_version');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT status,content_type,last_approved_document_sha256
              FROM jrei_public_source_registry WHERE source_id=? FOR UPDATE');
            $q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
            $limits=['PDF'=>8*1024*1024,'HTML'=>2*1024*1024,
              'JSON'=>1024*1024,'TEXT'=>1024*1024];
            $mimes=['PDF'=>'application/pdf','HTML'=>'text/html',
              'JSON'=>'application/json','TEXT'=>'text/plain'];
            if(!is_array($row)||$row['status']!=='APPROVED'||
               !isset($limits[$row['content_type']])||
               $bytes>$limits[$row['content_type']]||
               $mime!==$mimes[$row['content_type']])
                throw new DomainException('source_version_not_authorized');
            $prior=$row['last_approved_document_sha256'];
            $change=$prior===null?'FIRST_SEEN':
              (hash_equals((string)$prior,$sha)?'UNCHANGED':'CHANGED');
            $proposal=jrHybridNewUuid();
            $q=$pdo->prepare('INSERT IGNORE INTO jrei_public_source_proposals
              (proposal_id,source_id,document_sha256,preceding_sha256,
              declared_mime,byte_count,observed_change,retrieved_at,
              declared_publication_at,status,proposed_at,proposed_by_account_id)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
            $q->execute([$proposal,$id,$sha,$prior,$mime,$bytes,$change,
              $retrieved,$publication,'PENDING_REVIEW',$now,$actor]);
            $created=$q->rowCount()===1;
            if($created)operationsAudit($pdo,$actor,'jrei_source_version_staged',$proposal);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return ['ok'=>true,'created'=>$created,'status'=>'PENDING_REVIEW',
          'documentPublished'=>false,'verifiedAcquisition'=>false];
    }
    if($action==='review_source_version'){
        $proposal=$body['proposalId']??null;$rev=$body['revision']??null;
        $decision=$body['decision']??null;
        if(!jrHybridUuid($proposal)||!is_int($rev)||$rev<1||
           !in_array($decision,['ACCEPT_METADATA','REJECT'],true)||
           ($body['confirmation']??null)!=='REVIEW_SOURCE_PROVENANCE_ONLY')
            throw new InvalidArgumentException('invalid_source_version_review');
        $pdo->beginTransaction();
        try{
            $q=$pdo->prepare('SELECT source_id,document_sha256,status,revision
              FROM jrei_public_source_proposals WHERE proposal_id=? FOR UPDATE');
            $q->execute([$proposal]);$p=$q->fetch(PDO::FETCH_ASSOC);
            if(!is_array($p)||(int)$p['revision']!==$rev||
               $p['status']!=='PENDING_REVIEW')
                throw new DomainException('source_version_conflict');
            $q=$pdo->prepare('SELECT status FROM jrei_public_source_registry
              WHERE source_id=? FOR UPDATE');
            $q->execute([$p['source_id']]);
            if($q->fetchColumn()!=='APPROVED')
                throw new DomainException('source_no_longer_approved');
            $status=$decision==='ACCEPT_METADATA'?'METADATA_REVIEWED':'REJECTED';
            $q=$pdo->prepare('UPDATE jrei_public_source_proposals
              SET status=?,reviewed_at=?,reviewed_by_account_id=?,
              revision=revision+1 WHERE proposal_id=? AND revision=?');
            $q->execute([$status,$now,$actor,$proposal,$rev]);
            if($decision==='ACCEPT_METADATA'){
                $q=$pdo->prepare('UPDATE jrei_public_source_registry SET
                  last_approved_document_sha256=?,revision=revision+1,
                  updated_at=? WHERE source_id=? AND status=?');
                $q->execute([$p['document_sha256'],$now,$p['source_id'],'APPROVED']);
            }
            operationsAudit($pdo,$actor,'jrei_source_version_'.$status,$proposal);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
        return ['ok'=>true,'proposalId'=>$proposal,'status'=>$status,
           'officialAmendmentVerified'=>false,'contentPublished'=>false];
    }
    throw new InvalidArgumentException('invalid_source_action');
}
