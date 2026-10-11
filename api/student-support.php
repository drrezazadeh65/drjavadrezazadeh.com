<?php
declare(strict_types=1);

// Student support is a separate, strictly authenticated and child-safeguarded domain.
// This router does not accept direct messages, disclose contact details, allocate funds,
// approve sponsorships, or provision student identities.
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

function studentSupportSchemaReady(PDO $pdo): bool {
    static $ready=null;
    if($ready!==null)return $ready;
    try {
        foreach(['student_support_cases','student_support_needs','student_support_sponsorships',
                 'student_support_progress','student_support_allocations','student_support_audit'] as $table){
            $pdo->query('SELECT 1 FROM '.$table.' LIMIT 0');
        }
        return $ready=true;
    }catch(Throwable $e){return $ready=false;}
}
function studentSupportActor(PDO $pdo): array {
    $a=sessionAccount($pdo);
    if(!$a||($a['status']??'')!=='active'||empty($a['email_verified_at']))fail('unauthorized',401);
    return $a;
}
function studentSupportSafeSummary(string $value): bool {
    $value=trim($value);
    if(textLen($value)<12||textLen($value)>320)return false;
    // Do not accept URLs, email, phone numbers or HTML in a need statement.
    if(preg_match('/(?:https?:\/\/|www\.|@|[<>]|(?:\+?98|0)9[0-9\p{Nd}]{9}|[0-9\p{Nd}]{8,})/iu',$value))return false;
    return true;
}
function studentSupportRoute(string $path,string $verb): never {
    header('Cache-Control: private, no-store, max-age=0');
    header('X-Robots-Tag: noindex, noarchive, nosnippet');
    if($path==='/student-support/health'&&$verb==='GET'){
        $pdo=db();$schema=$pdo?studentSupportSchemaReady($pdo):false;
        respond(['ok'=>true,'service'=>'student-support','guestGiving'=>commerceReady(),
            'privatePortal'=>$schema&&authReady(),'caseSchemaReady'=>$schema,
            'studentIdentityPublic'=>false,'directSponsorStudentContact'=>false]);
    }
    $pdo=db();if(!$pdo)fail('database_unconfigured',503);
    $actor=studentSupportActor($pdo);
    if(!studentSupportSchemaReady($pdo))fail('student_support_not_provisioned',503);
    $accountId=(string)$actor['id'];

    if($path==='/student-support/portal'&&$verb==='GET'){
        $own=$pdo->prepare("SELECT id,public_code,pseudonym,school_stage,state
            FROM student_support_cases WHERE guardian_account_id=? OR student_account_id=?
            ORDER BY created_at DESC LIMIT 50");
        $own->execute([$accountId,$accountId]);
        $cases=[];$seen=[];
        foreach($own->fetchAll() as $row){
            $id=(string)$row['id'];$seen[$id]=true;
            $cases[]=['caseId'=>$id,'code'=>$row['public_code'],'alias'=>$row['pseudonym'],
                'schoolStage'=>$row['school_stage'],'state'=>$row['state'],'role'=>'student_or_guardian',
                'studentName'=>null,'sponsorName'=>null,
                'needs'=>studentSupportVisibleNeeds($pdo,$id,false),
                'progress'=>studentSupportVisibleProgress($pdo,$id,false),
                'sponsors'=>studentSupportVisibleSponsorNames($pdo,$id)];
        }
        // Every field here is approved, anonymised, and consent-gated; no private student PII.
        $links=$pdo->prepare("SELECT c.id,c.public_code,c.pseudonym,c.school_stage,c.state,
             s.student_identity_visible,s.approved_student_display_name
             FROM student_support_sponsorships s
             JOIN student_support_cases c ON c.id=s.case_id
             WHERE s.sponsor_account_id=? AND s.state='approved' AND c.state='verified'
             AND s.guardian_consent_at IS NOT NULL AND s.student_assent_at IS NOT NULL
             AND s.sponsor_consent_at IS NOT NULL AND s.staff_approved_at IS NOT NULL
             AND s.expires_at>NOW() ORDER BY s.updated_at DESC LIMIT 50");
        $links->execute([$accountId]);
        foreach($links->fetchAll() as $row){
            $id=(string)$row['id'];if(isset($seen[$id]))continue;
            $name=((int)$row['student_identity_visible']===1)?
                (string)($row['approved_student_display_name']??''):'';
            $cases[]=['caseId'=>$id,'code'=>$row['public_code'],'alias'=>$row['pseudonym'],
                'schoolStage'=>$row['school_stage'],'state'=>$row['state'],'role'=>'approved_sponsor',
                'studentName'=>$name!==''?$name:null,'sponsorName'=>null,
                'needs'=>studentSupportVisibleNeeds($pdo,$id,true),
                'progress'=>studentSupportVisibleProgress($pdo,$id,true),
                'sponsors'=>[]];
        }
        respond(['ok'=>true,'private'=>true,'programme'=>'talented-students-v1',
            'directMessaging'=>false,'identityByConsentOnly'=>true,'cases'=>$cases]);
    }
    if($path==='/student-support/needs'&&$verb==='POST'){
        requirePostOrigin();
        $input=jsonBody();$case=(string)($input['caseId']??'');
        $category=(string)($input['category']??'');
        $summary=trim((string)($input['summary']??''));
        $amount=$input['amountToman']??null;
        if(!validUuid($case)||!in_array($category,['scholarship','books','services','essentials'],true)||
           !studentSupportSafeSummary($summary)||!is_int($amount)||$amount<1000||$amount>100000000)fail('invalid_need');
        // A sponsor cannot add or modify needs. Only assigned legal guardian / authorised student may propose.
        $q=$pdo->prepare("SELECT id FROM student_support_cases
            WHERE id=? AND state IN ('draft','review','verified')
            AND (guardian_account_id=? OR student_account_id=?) LIMIT 1");
        $q->execute([$case,$accountId,$accountId]);
        if(!$q->fetch())fail('case_not_available',403);
        if(!rateAllowed($pdo,'student_support_need',$accountId,5,3600))fail('rate_limited',429);
        $id=uuidv4();
        $pdo->prepare("INSERT INTO student_support_needs
            (id,case_id,category,safe_summary,amount_toman,status,visible_to_sponsor,created_by_account_id)
            VALUES(?,?,?,?,?,'proposed',0,?)")->execute([$id,$case,$category,$summary,$amount,$accountId]);
        respond(['ok'=>true,'needId'=>$id,'state'=>'proposed','visibility'=>'staff_only'],202);
    }
    if($path==='/student-support/revoke-sponsor'&&$verb==='POST'){
        requirePostOrigin();$input=jsonBody();$link=(string)($input['sponsorshipId']??'');
        if(!validUuid($link))fail('invalid_sponsorship_id');
        $q=$pdo->prepare("SELECT s.id,s.sponsor_account_id,c.guardian_account_id,c.student_account_id
            FROM student_support_sponsorships s JOIN student_support_cases c ON c.id=s.case_id
            WHERE s.id=? AND s.state IN ('requested','approved') LIMIT 1");
        $q->execute([$link]);$row=$q->fetch();
        if(!$row||!in_array($accountId,[(string)$row['sponsor_account_id'],
            (string)$row['guardian_account_id'],(string)($row['student_account_id']??'')],true))fail('access_denied',403);
        $pdo->beginTransaction();
        try{
            $pdo->prepare("UPDATE student_support_sponsorships
                SET state='revoked',sponsor_identity_visible=0,student_identity_visible=0,
                    approved_sponsor_display_name=NULL,approved_student_display_name=NULL
                WHERE id=? AND state IN ('requested','approved')")->execute([$link]);
            $pdo->prepare("INSERT INTO student_support_audit(actor_account_id,event_code,object_id)
                VALUES(?,'sponsor_access_revoked',?)")->execute([$accountId,$link]);
            $pdo->commit();
        }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();fail('revoke_unavailable',503);}
        respond(['ok'=>true,'state'=>'revoked']);
    }
    fail('not_found',404);
}
function studentSupportVisibleNeeds(PDO $pdo,string $case,bool $sponsor): array {
    $sql="SELECT id,category,safe_summary,amount_toman,status
          FROM student_support_needs WHERE case_id=?";
    if($sponsor)$sql.=" AND status IN ('approved','allocated','fulfilled') AND visible_to_sponsor=1";
    $sql.=" ORDER BY created_at DESC LIMIT 40";
    $q=$pdo->prepare($sql);$q->execute([$case]);return $q->fetchAll();
}
function studentSupportVisibleProgress(PDO $pdo,string $case,bool $sponsor): array {
    $sql="SELECT milestone_kind,safe_summary,created_at FROM student_support_progress
          WHERE case_id=? AND approved_by IS NOT NULL";
    if($sponsor)$sql.=" AND visible_to_sponsor=1";
    $sql.=" ORDER BY created_at DESC LIMIT 30";
    $q=$pdo->prepare($sql);$q->execute([$case]);return $q->fetchAll();
}
function studentSupportVisibleSponsorNames(PDO $pdo,string $case): array {
    $q=$pdo->prepare("SELECT approved_sponsor_display_name FROM student_support_sponsorships
        WHERE case_id=? AND state='approved'
        AND sponsor_identity_visible=1 AND approved_sponsor_display_name IS NOT NULL
        AND guardian_consent_at IS NOT NULL AND student_assent_at IS NOT NULL
        AND sponsor_consent_at IS NOT NULL AND staff_approved_at IS NOT NULL
        AND expires_at>NOW() LIMIT 20");
    $q->execute([$case]);
    return array_values(array_filter(array_map(
        fn($row)=>(string)$row['approved_sponsor_display_name'],$q->fetchAll()
    )));
}
