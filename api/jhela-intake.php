<?php
declare(strict_types=1);
/* JHELA: owner-authorised preliminary manuscript intake for the planned native
 * editorial system. Receipt is not scientific acceptance, peer review or publication.
 * Requires verified existing site account, HTTPS, applied migration, private files and antivirus.
 * This handler exclusively serves the first-party editorial platform.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

// Newer owner instruction 2026-10-18: lift the calendar/manuscript moratorium
// for the native platform. No automatic activation: the private intake is
// disabled unless an operator explicitly sets JR_JHELA_INTAKE_ENABLED=true
// AND verified TLS, mother schema, private storage and antivirus all pass.
// The intake is independent of retired vendor platforms.

function jhelaConfig(): array {
  // Private config.local.php takes precedence over host environment variables.
  // Reuse the existing central configuration; never require a second journal config or DB.
  $site=cfg();
  return [
    'intake'=>($site['jhela_intake_enabled']??(getenv('JR_JHELA_INTAKE_ENABLED')==='true'))===true,
    'reviewers'=>($site['jhela_reviewer_intake_enabled']??(getenv('JR_JHELA_REVIEWER_INTAKE_ENABLED')==='true'))===true,
    'privateDir'=>(string)($site['jhela_private_storage']??(getenv('JR_JHELA_PRIVATE_STORAGE')?:'')),
    'antivirus'=>(string)($site['jhela_av_binary']??(getenv('JR_JHELA_AV_BINARY')?:'')),
    'trustedTLS'=>($site['public_tls_confirmed']??false)===true,
  ];
}
function jhelaSchemaReady(PDO $pdo): bool {
  try {
    foreach(['jhela_author_profiles','jhela_intake_manuscripts','jhela_intake_events',
      'jhela_reviewer_candidates','jhela_finance_records'] as $name){
      $pdo->query('SELECT 1 FROM '.$name.' LIMIT 0');
    }
    return true;
  }catch(Throwable $e){return false;}
}
function jhelaPrivateRoot(string $raw): ?string {
  if($raw===''||$raw[0]!=='/')return null;
  $folder=realpath($raw);
  $web=(string)($_SERVER['DOCUMENT_ROOT']??'');
  $webReal=($web!=='')?realpath($web):false;
  if($folder===false||!is_dir($folder)||!is_writable($folder)||is_link($raw))return null;
  if($webReal!==false&&($folder===$webReal||str_starts_with($folder,$webReal.'/')))return null;
  // No PHP or application source tree may be the upload storage.
  if(str_contains($folder,'/public_html/')||str_ends_with($folder,'/public_html'))return null;
  return $folder;
}
function jhelaAvReady(string $binary): bool {
  return in_array($binary,['/usr/bin/clamscan','/usr/local/bin/clamscan'],true)&&is_executable($binary)&&function_exists('proc_open');
}

/**
 * Run a direct executable with a strict deadline, continuously draining
 * non-blocking stdout/stderr. Invocation is server-controlled; no shell,
 * request string, user-provided argument or network operation is introduced.
 * This helper also supports harmless PHP CLI timeout fixtures.
 */
function jhelaRunBoundedProcess(array $argv,float $seconds=30.0): int {
  if(!function_exists('proc_open')||!function_exists('proc_get_status')||
    !function_exists('proc_terminate')||!function_exists('stream_set_blocking')||
    !function_exists('microtime')||$seconds<0.1||$seconds>60.0||
    !$argv||!is_string($argv[0])||$argv[0]==='') {
      throw new RuntimeException('antivirus_runner_unavailable');
  }
  foreach($argv as $arg) {
    if(!is_string($arg)||$arg===''||str_contains($arg,"\0"))
      throw new RuntimeException('antivirus_invalid_argument');
  }
  $pipes=[];$process=proc_open($argv,
    [0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
  if(!is_resource($process))throw new RuntimeException('antivirus_unavailable');
  $exit=-1;$completed=false;
  try {
    if(isset($pipes[0])&&is_resource($pipes[0]))fclose($pipes[0]);
    foreach([1,2] as $fd)
      if(isset($pipes[$fd])&&is_resource($pipes[$fd]))stream_set_blocking($pipes[$fd],false);
    $deadline=microtime(true)+$seconds;
    do {
      // Drain available output to avoid child blocking on a full pipe;
      // do not log contents or expose manuscript paths or scanner output.
      foreach([1,2] as $fd)
        if(isset($pipes[$fd])&&is_resource($pipes[$fd]))stream_get_contents($pipes[$fd]);
      $state=proc_get_status($process);
      if(!is_array($state))throw new RuntimeException('antivirus_status_unavailable');
      if($state['running']===false) {
        $exit=(int)$state['exitcode'];$completed=true;break;
      }
      if(microtime(true)>=$deadline)throw new RuntimeException('antivirus_timeout');
      usleep(50000);
    }while(true);
  }finally{
    if(!$completed){
      @proc_terminate($process);
      usleep(70000);
      $state=@proc_get_status($process);
      if(is_array($state)&&$state['running']===true)@proc_terminate($process,9);
    }
    foreach($pipes as $pipe)if(is_resource($pipe))fclose($pipe);
    $closed=@proc_close($process);
    if($completed&&$exit<0&&is_int($closed))$exit=$closed;
  }
  if(!$completed||$exit<0)throw new RuntimeException('antivirus_process_unverified');
  return $exit;
}
function jhelaReadiness(?PDO $pdo): array {
  $c=jhelaConfig();$schema=$pdo&&jhelaSchemaReady($pdo);
  $secure=$c['trustedTLS']&&$schema;
  $upload=$secure&&jhelaPrivateRoot($c['privateDir'])!==null&&jhelaAvReady($c['antivirus']);
  return [
    'profile'=>$secure,
    'manuscriptIntake'=>$upload&&$c['intake'],
    'reviewerIntake'=>$secure&&$c['reviewers'],
    'accountVerificationRequired'=>true,
    'manuscriptFormat'=>'PDF', 'maxFileBytes'=>15728640,
    'nativeEditorialReviewOperational'=>false,
    'formalPeerReviewOperational'=>false,
    'paymentsEnabled'=>false
  ];
}
function jhelaAccount(PDO $pdo): array {
  $a=sessionAccount($pdo);
  if(!$a||($a['status']??'')!=='active'||empty($a['email_verified_at'])||
    !validUuid((string)($a['id']??''))) fail('verified_account_required',401);
  return $a;
}
function jhelaMutation(): void {
  // Reject forged cross-origin requests even if the legacy account API permits an absent Origin.
  if(($_SERVER['HTTP_ORIGIN']??'')!==SITE_ORIGIN||
    !in_array(($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin'),['same-origin','none'],true))
    fail('origin_forbidden',403);
}
function jhelaStr(mixed $value,int $min,int $max,string $code): string {
  if(!is_string($value))fail($code,422);
  $value=trim($value);
  if(textLen($value)<$min||textLen($value)>$max||preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/',$value))
    fail($code,422);
  return $value;
}
function jhelaOrcid(mixed $value): ?string {
  if($value===null||$value==='')return null;
  $s=jhelaStr($value,19,40,'invalid_orcid');
  if(!preg_match('#^(?:https://orcid.org/)?(\d{4})-(\d{4})-(\d{4})-(\d{3}[\dX])$#',$s,$m))fail('invalid_orcid',422);
  $digits=implode('',array_slice($m,1));$sum=0;
  for($i=0;$i<15;$i++)$sum=($sum+(int)$digits[$i])*2;
  $check=(12-$sum%11)%11;
  if($digits[15]!==($check===10?'X':(string)$check))fail('invalid_orcid_checksum',422);
  return 'https://orcid.org/'.$m[1].'-'.$m[2].'-'.$m[3].'-'.$m[4];
}
function jhelaUrl(mixed $value): ?string {
  if($value===null||$value==='')return null;
  $url=jhelaStr($value,12,360,'invalid_institutional_url');
  if(!filter_var($url,FILTER_VALIDATE_URL))fail('invalid_institutional_url',422);
  $p=parse_url($url);
  if(($p['scheme']??'')!=='https'||empty($p['host'])||isset($p['user'])||isset($p['pass']))fail('invalid_institutional_url',422);
  return $url;
}
function jhelaEvent(PDO $pdo,string $id,string $kind,string $message): void {
  $pdo->prepare('INSERT INTO jhela_intake_events(id,manuscript_id,event_kind,public_message) VALUES(?,?,?,?)')
    ->execute([uuidv4(),$id,$kind,$message]);
}
function jhelaPublicReviewers(PDO $pdo): never {
  // No unpublished email, private CV attachment, application decisions or rejected users.
  $q=$pdo->query("SELECT academic_name,academic_rank,institution,country,orcid,institutional_page,expertise,methods,cv_summary,publications
    FROM jhela_reviewer_candidates
    WHERE status='APPROVED' AND profile_public_consent=1 AND privacy_consent=1
      AND approved_at IS NOT NULL AND approved_by IS NOT NULL
    ORDER BY approved_at DESC,academic_name LIMIT 120");
  $entries=$q->fetchAll();
  respond(['ok'=>true,'schema'=>'jhela-consented-reviewer-directory-v1','reviewers'=>$entries]);
}
function jhelaPrivateHome(PDO $pdo,array $a): never {
  $id=(string)$a['id'];
  $s=$pdo->prepare('SELECT public_name,affiliation,country,orcid,research_interests FROM jhela_author_profiles WHERE account_id=?');$s->execute([$id]);
  $profile=$s->fetch()?:null;
  $r=$pdo->prepare('SELECT academic_name,academic_rank,institution,country,orcid,expertise,methods,cv_summary,publications,profile_public_consent,status FROM jhela_reviewer_candidates WHERE account_id=?');$r->execute([$id]);
  $reviewer=$r->fetch()?:null;
  $q=$pdo->prepare('SELECT id,tracking_code,title,article_type,status,original_filename,uploaded_at,created_at FROM jhela_intake_manuscripts WHERE account_id=? ORDER BY created_at DESC LIMIT 100');
  $q->execute([$id]);$rows=$q->fetchAll();$entries=[];
  $history=$pdo->prepare('SELECT event_kind,public_message,created_at FROM jhela_intake_events WHERE manuscript_id=? ORDER BY created_at,id LIMIT 60');
  $finance=$pdo->prepare('SELECT state,amount_chf,waiver_percent,invoice_ref,verified_at FROM jhela_finance_records WHERE manuscript_id=? ORDER BY created_at DESC LIMIT 1');
  foreach($rows as $item){
    $history->execute([$item['id']]);$finance->execute([$item['id']]);$billing=$finance->fetch()?:null;
    // Absence of a finance row means no invoice has been issued. No invented "paid" state.
    $item['events']=$history->fetchAll();$item['finance']=$billing?:[
      'state'=>'NOT_INVOICED','amount_chf'=>null,'waiver_percent'=>null,
      'invoice_ref'=>null,'verified_at'=>null
    ];$entries[]=$item;
  }
  respond(['ok'=>true,'schema'=>'jhela-author-workspace-v1','verifiedEmail'=>$a['email_normalized'],
    'profile'=>$profile,'reviewerApplication'=>$reviewer,'manuscripts'=>$entries,
    'financePolicy'=>['submissionFeeCHF'=>0,'firstIssueWaiverPolicy'=>'100% for eligible inaugural-issue articles',
      'apcPayableBeforeAcceptance'=>false,'onlinePaymentsEnabled'=>false],
    'connection'=>['intakeIsNative'=>true,'nativeEditorialReviewOperational'=>false,
      'editorialWorkflowOperational'=>false]
  ]);
}
function jhelaIntakeRoute(string $path,string $verb): never {
  header('Cache-Control: no-store, private, max-age=0');
  // Fail closed before any DB access unless the operator enabled native intake.
  // Host readiness and ownership checks are separately enforced below.
  if(in_array($path,['/journal/manuscripts/create','/journal/manuscripts/upload'],true)
    && !jhelaConfig()['intake'])
    fail('manuscript_intake_disabled',503);
  $pdo=db();
  if($path==='/journal/intake/health'&&$verb==='GET'){
    $state=jhelaReadiness($pdo);
    respond(['ok'=>true,'schema'=>'jhela-public-intake-readiness-v1',...$state]);
  }
  if(!$pdo||!jhelaSchemaReady($pdo))fail('journal_database_not_ready',503);
  if($path==='/journal/reviewers'&&$verb==='GET')jhelaPublicReviewers($pdo);
  $a=jhelaAccount($pdo);$accountId=(string)$a['id'];
  $ready=jhelaReadiness($pdo);
  // No private manuscript or reviewer records until trusted TLS and schema gates pass.
  if($path==='/journal/workspace'&&$verb==='GET'){
    if(!$ready['profile'])fail('journal_profile_unavailable',503);
    jhelaPrivateHome($pdo,$a);
  }
  if(!in_array($verb,['POST'],true))fail('method_not_allowed',405);
  jhelaMutation();
  if(!rateAllowed($pdo,'jhela_'.$path,$accountId,14,900))fail('rate_limited',429);
  if($path==='/journal/profile'){
    if(!$ready['profile'])fail('journal_profile_unavailable',503);
    $b=jsonBody();
    $name=jhelaStr($b['name']??null,3,160,'invalid_name');
    $affiliation=jhelaStr($b['affiliation']??null,3,220,'invalid_affiliation');
    $country=jhelaStr($b['country']??null,2,100,'invalid_country');
    $orcid=jhelaOrcid($b['orcid']??null);
    $interests=jhelaStr($b['interests']??null,4,1200,'invalid_interests');
    $stmt=$pdo->prepare('INSERT INTO jhela_author_profiles(account_id,public_name,affiliation,country,orcid,research_interests)
      VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE public_name=VALUES(public_name),affiliation=VALUES(affiliation),
      country=VALUES(country),orcid=VALUES(orcid),research_interests=VALUES(research_interests)');
    $stmt->execute([$accountId,$name,$affiliation,$country,$orcid,$interests]);respond(['ok'=>true,'saved'=>true]);
  }
  if($path==='/journal/reviewer/apply'){
    if(!$ready['reviewerIntake'])fail('reviewer_intake_not_ready',503);
    $b=jsonBody();
    if(($b['privacyConsent']??false)!==true)fail('privacy_consent_required',422);
    $published=($b['publicProfileConsent']??false)===true;
    $fields=[
      jhelaStr($b['name']??null,3,160,'invalid_name'),jhelaStr($b['rank']??null,2,100,'invalid_rank'),
      jhelaStr($b['institution']??null,3,220,'invalid_institution'),
      jhelaStr($b['country']??null,2,100,'invalid_country'),
      jhelaOrcid($b['orcid']??null),jhelaUrl($b['institutionalPage']??null),
      jhelaStr($b['expertise']??null,15,1000,'invalid_expertise'),
      jhelaStr($b['methods']??null,10,800,'invalid_methods'),
      jhelaStr($b['cvSummary']??null,80,5000,'invalid_cv'),
      jhelaStr($b['publications']??null,18,3000,'invalid_publications')
    ];
    $q=$pdo->prepare("INSERT INTO jhela_reviewer_candidates
      (id,account_id,academic_name,academic_rank,institution,country,orcid,institutional_page,expertise,methods,cv_summary,publications,profile_public_consent,privacy_consent,status)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1,'PENDING')
      ON DUPLICATE KEY UPDATE academic_name=VALUES(academic_name),academic_rank=VALUES(academic_rank),
      institution=VALUES(institution),country=VALUES(country),orcid=VALUES(orcid),institutional_page=VALUES(institutional_page),
      expertise=VALUES(expertise),methods=VALUES(methods),cv_summary=VALUES(cv_summary),publications=VALUES(publications),
      profile_public_consent=VALUES(profile_public_consent),privacy_consent=1,status='PENDING',
      approved_at=NULL,approved_by=NULL");
    $q->execute([uuidv4(),$accountId,...$fields,$published?1:0]);
    respond(['ok'=>true,'status'=>'PENDING','publiclyListed'=>false,
      'message'=>'Application recorded for verification. Public biography requires a separate approved appointment and explicit consent.'],201);
  }
  // Existing verified authors can answer a specific editorial information
  // request, even when new manuscript intake is administratively disabled.
  if($path==='/journal/manuscripts/respond'){
    if(!$ready['profile'])fail('journal_profile_unavailable',503);
    $b=jsonBody();$id=(string)($b['manuscriptId']??'');
    if(!validUuid($id))fail('invalid_manuscript_id',422);
    $message=jhelaStr($b['message']??null,20,500,'invalid_author_response');
    $pdo->beginTransaction();
    try{
      $q=$pdo->prepare('SELECT status FROM jhela_intake_manuscripts WHERE id=? AND account_id=? FOR UPDATE');
      $q->execute([$id,$accountId]);$m=$q->fetch();
      if(!$m){$pdo->rollBack();fail('manuscript_not_found',404);}
      if($m['status']!=='NEEDS_INFORMATION'){$pdo->rollBack();fail('response_not_requested',409);}
      $u=$pdo->prepare("UPDATE jhela_intake_manuscripts SET status='AUTHOR_INFORMATION_RECEIVED'
        WHERE id=? AND account_id=? AND status='NEEDS_INFORMATION'");
      $u->execute([$id,$accountId]);
      if($u->rowCount()!==1)throw new RuntimeException('response_concurrent_update');
      jhelaEvent($pdo,$id,'AUTHOR_INFORMATION_RECEIVED',$message);
      $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    respond(['ok'=>true,'id'=>$id,'status'=>'AUTHOR_INFORMATION_RECEIVED',
      'message'=>'Author response received for preliminary editorial screening.'],201);
  }
  // Author-initiated withdrawal is independent of whether new intake is enabled.
  // Preserve the confidential record and immutable event history; never delete PDFs.
  // Only pre-review states are eligible: future peer-review states are excluded.
  if($path==='/journal/manuscripts/withdraw'){
    if(!$ready['profile'])fail('journal_profile_unavailable',503);
    $b=jsonBody();$id=(string)($b['manuscriptId']??'');
    if(!validUuid($id))fail('invalid_manuscript_id',422);
    $reason=jhelaStr($b['reason']??null,20,500,'withdrawal_reason_required');
    $pdo->beginTransaction();
    try{
      $q=$pdo->prepare('SELECT status FROM jhela_intake_manuscripts WHERE id=? AND account_id=? FOR UPDATE');
      $q->execute([$id,$accountId]);$m=$q->fetch();
      if(!$m){$pdo->rollBack();fail('manuscript_not_found',404);}
      $allowed=['AWAITING_FILE','PRELIMINARY_RECEIVED','UNDER_SCREENING',
        'NEEDS_INFORMATION','AUTHOR_INFORMATION_RECEIVED'];
      $previous=(string)$m['status'];
      if(!in_array($previous,$allowed,true)){
        $pdo->rollBack();fail('withdrawal_not_available_in_current_stage',409);
      }
      $u=$pdo->prepare("UPDATE jhela_intake_manuscripts SET status='WITHDRAWN_BY_AUTHOR'
        WHERE id=? AND account_id=? AND status=?");
      $u->execute([$id,$accountId,$previous]);
      if($u->rowCount()!==1)throw new RuntimeException('withdrawal_concurrent_update');
      jhelaEvent($pdo,$id,'WITHDRAWN_BY_AUTHOR','Author withdrew the preliminary submission. Reason: '.$reason);
      $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    respond(['ok'=>true,'id'=>$id,'status'=>'WITHDRAWN_BY_AUTHOR',
      'filesRetainedForAudit'=>true,'peerReviewStarted'=>false]);
  }
  if($path==='/journal/manuscripts/create'){
    if(!$ready['manuscriptIntake'])fail('manuscript_intake_not_ready',503);
    $b=jsonBody();
    $profile=$pdo->prepare('SELECT account_id FROM jhela_author_profiles WHERE account_id=?');$profile->execute([$accountId]);
    if(!$profile->fetch())fail('author_profile_required',422);
    $type=(string)($b['type']??'');
    if(!in_array($type,['research','systematic_review','methods','theory','short_report','perspective'],true))
      fail('invalid_article_type',422);
    if(($b['originalityConfirmed']??false)!==true)fail('originality_confirmation_required',422);
    $title=jhelaStr($b['title']??null,20,320,'invalid_title');
    $abstract=jhelaStr($b['abstract']??null,250,10000,'invalid_abstract');
    $keywords=jhelaStr($b['keywords']??null,10,500,'invalid_keywords');
    $decl=jhelaStr($b['declarations']??null,50,4000,'invalid_ethical_declarations');
    $uid=uuidv4();$reference='JHELA-FI-'.gmdate('Ymd').'-'.strtoupper(substr(str_replace('-','',$uid),0,8));
    $pdo->beginTransaction();
    try{
      $pdo->prepare("INSERT INTO jhela_intake_manuscripts
        (id,account_id,tracking_code,title,article_type,abstract_text,keywords_text,declarations,originality_confirmed,status)
        VALUES(?,?,?,?,?,?,?,?,1,'AWAITING_FILE')")
        ->execute([$uid,$accountId,$reference,$title,$type,$abstract,$keywords,$decl]);
      jhelaEvent($pdo,$uid,'METADATA_RECEIVED','Manuscript metadata saved. Upload a PDF to complete the preliminary intake.');
      $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();error_log('JHELA metadata failure '.get_class($e));fail('journal_submission_unavailable',503);}
    respond(['ok'=>true,'trackingCode'=>$reference,'id'=>$uid,'status'=>'AWAITING_FILE','feeDueCHF'=>0],201);
  }
  if($path==='/journal/manuscripts/upload'){
    if(!$ready['manuscriptIntake'])fail('manuscript_intake_not_ready',503);
    // Strictly accept a privately stored PDF; never put uploaded files in public_html.
    $id=(string)($_POST['manuscriptId']??'');
    if(!validUuid($id))fail('invalid_manuscript_id',422);
    $query=$pdo->prepare('SELECT status FROM jhela_intake_manuscripts WHERE id=? AND account_id=? LIMIT 1');
    $query->execute([$id,$accountId]);$record=$query->fetch();
    if(!$record||$record['status']!=='AWAITING_FILE')fail('upload_not_authorized',403);
    $upload=$_FILES['manuscript']??null;
    if(!is_array($upload)||($upload['error']??-1)!==UPLOAD_ERR_OK||
       !is_uploaded_file((string)($upload['tmp_name']??'')))fail('invalid_uploaded_file',422);
    $bytes=(int)($upload['size']??0);if($bytes<1024||$bytes>15728640)fail('file_size_invalid',422);
    $original=basename((string)($upload['name']??''));
    if(!preg_match('/^[^\x00-\x1F\/\\\\]{1,160}\.pdf$/iD',$original))fail('pdf_required',422);
    $tmp=(string)$upload['tmp_name'];
    $finfo=new finfo(FILEINFO_MIME_TYPE);
    if($finfo->file($tmp)!=='application/pdf')fail('pdf_required',422);
    $h=fopen($tmp,'rb');$magic=$h?fread($h,5):false;if($h)fclose($h);
    if($magic!=='%PDF-')fail('pdf_header_invalid',422);
    $c=jhelaConfig();$base=jhelaPrivateRoot($c['privateDir']);
    if(!$base||!jhelaAvReady($c['antivirus']))fail('private_storage_or_antivirus_unavailable',503);
    $targetName=bin2hex(random_bytes(24)).'.pdf';
    $target=$base.'/'.$targetName;
    if(!move_uploaded_file($tmp,$target))fail('private_storage_failure',503);
    @chmod($target,0600);
    try{
      if(jhelaRunBoundedProcess([$c['antivirus'],'--no-summary',$target],30.0)!==0)
        throw new RuntimeException('antivirus_not_clean');
      $hash=hash_file('sha256',$target);
      if(!is_string($hash)||!preg_match('/^[a-f0-9]{64}$/D',$hash))throw new RuntimeException('checksum_failure');
      $pdo->beginTransaction();
      $q=$pdo->prepare("UPDATE jhela_intake_manuscripts
        SET private_file_rel=?,original_filename=?,manuscript_sha256=?,file_bytes=?,uploaded_at=NOW(),status='PRELIMINARY_RECEIVED'
        WHERE id=? AND account_id=? AND status='AWAITING_FILE'");
      $q->execute([$targetName,$original,$hash,$bytes,$id,$accountId]);
      if($q->rowCount()!==1)throw new RuntimeException('concurrent_submission');
      jhelaEvent($pdo,$id,'PRELIMINARY_RECEIVED','Secure PDF received for inaugural-issue pre-screening. Editorial peer review has not yet begun.');
      $pdo->commit();
    }catch(Throwable $e){
      if($pdo->inTransaction())$pdo->rollBack();
      @unlink($target);error_log('JHELA upload blocked '.get_class($e));
      fail('secure_upload_not_completed',503);
    }
    respond(['ok'=>true,'status'=>'PRELIMINARY_RECEIVED','trackingCodeAvailableInDashboard'=>true,
      'formalNativePeerReviewStarted'=>false],201);
  }
  fail('not_found',404);
}
