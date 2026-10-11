<?php
declare(strict_types=1);
// Child-safeguarding contract with separate MySQL fixture. No real students, bank, or production credentials.
define('BERTINA_API_BOOTSTRAPPED',true);
$dsn=(string)getenv('OPERATIONS_TEST_DSN');
if(!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/',$dsn))throw new RuntimeException('isolated_fixture_required');
$pdo=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),(string)getenv('OPERATIONS_TEST_PASSWORD'),[
 PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
 PDO::ATTR_EMULATE_PREPARES=>false]);
$pdo->exec((string)file_get_contents(__DIR__.'/../docs/BERTINA_MYSQL_SCHEMA.sql'));
$pdo->exec((string)file_get_contents(__DIR__.'/../docs/BERTINA_STUDENT_SUPPORT_SCHEMA.sql'));

final class SupportResponse extends RuntimeException {
 public function __construct(public array $payload,public int $httpStatus){parent::__construct('response');}
}
function respond(array $value,int $code=200): never {throw new SupportResponse($value,$code);}
function fail(string $code,int $status=400): never {respond(['ok'=>false,'error'=>$code],$status);}
function commerceReady(): bool {return true;}
function commerceSchemaReady(): bool {return true;}
function validEmail(string $s): bool {return filter_var($s,FILTER_VALIDATE_EMAIL)!==false;}
function authReady(): bool {return true;}
function db(): ?PDO {return $GLOBALS['pdo'];}
function sessionAccount(PDO $pdo): ?array {return $GLOBALS['actor']??null;}
function requirePostOrigin(): void {$GLOBALS['originChecks']++;}
function jsonBody(): array {return $GLOBALS['input'];}
function textLen(string $text): int {return function_exists('mb_strlen')?mb_strlen($text,'UTF-8'):strlen($text);}
function validUuid(string $value): bool {return preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/D',$value)===1;}
function uuidv4(): string {return 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';}
function rateAllowed(PDO $pdo,string $action,string $identity,int $max,int $window): bool {
 return $action==='student_support_need'&&$max===5&&$window===3600;
}
require __DIR__.'/../api/student-support.php';
$GLOBALS['pdo']=$pdo;
$GLOBALS['originChecks']=0;
$guardian='77777777-7777-4777-8777-777777777770';
$sponsor='77777777-7777-4777-8777-777777777771';
$other='77777777-7777-4777-8777-777777777772';
$student='77777777-7777-4777-8777-777777777773';
$case='22222222-2222-4222-8222-222222222222';
$needVisible='33333333-3333-4333-8333-333333333333';
$needHidden='33333333-3333-4333-8333-333333333334';
$progress='44444444-4444-4444-8444-444444444444';
$link='55555555-5555-4555-8555-555555555555';
$actors=[$guardian,$sponsor,$other,$student];
$donationPaid='88888888-8888-4888-8888-888888888880';
$donationHistoric='88888888-8888-4888-8888-888888888881';
$donationStranger='88888888-8888-4888-8888-888888888882';
$donationPending='88888888-8888-4888-8888-888888888883';
$donationIds=[$donationPaid,$donationHistoric,$donationStranger,$donationPending];

function assertSupport(bool $ok,string $label): void {
 if(!$ok)throw new RuntimeException('support_safeguarding_failure: '.$label);
 echo "PASS ".$label."\n";
}
function callSupport(string $path,string $method='GET',array $input=[]): SupportResponse {
 $GLOBALS['input']=$input;
 try{studentSupportRoute($path,$method);throw new RuntimeException('route_no_response');}
 catch(SupportResponse $e){return $e;}
}
function actor(?string $id): void {
 $GLOBALS['actor']=$id?['id'=>$id,'status'=>'active','email_verified_at'=>time(),
  'email_normalized'=>str_replace('-','',$id).'@example.invalid']:null;
}
$pdo->prepare('DELETE FROM student_support_audit WHERE object_id=?')->execute([$link]);
$pdo->prepare('DELETE FROM student_support_allocations WHERE need_id IN (?,?)')->execute([$needVisible,$needHidden]);
$pdo->prepare('DELETE FROM student_support_needs WHERE case_id=?')->execute([$case]);
$pdo->prepare('DELETE FROM student_support_progress WHERE case_id=?')->execute([$case]);
$pdo->prepare('DELETE FROM student_support_sponsorships WHERE case_id=?')->execute([$case]);
$pdo->prepare('DELETE FROM student_support_cases WHERE id=?')->execute([$case]);
foreach($donationIds as $donationId)$pdo->prepare('DELETE FROM commerce_orders WHERE id=?')->execute([$donationId]);
foreach($actors as $id)$pdo->prepare('DELETE FROM customer_accounts WHERE id=?')->execute([$id]);
try {
 foreach($actors as $id){
  $pdo->prepare("INSERT INTO customer_accounts
    (id,email_normalized,password_hash,status,email_verified_at,created_at,updated_at)
    VALUES(?,?,'fixture-only','active',?,?,?)")
   ->execute([$id,str_replace('-','',$id).'@example.invalid',time(),time(),time()]);
 }
 $pdo->prepare("INSERT INTO student_support_cases
   (id,public_code,pseudonym,guardian_account_id,student_account_id,state,eligible_at)
   VALUES(?,'ST-TEST-0001','پروندهٔ آزمون',?,?,'verified',NOW())")
  ->execute([$case,$guardian,$student]);
 $insert=$pdo->prepare("INSERT INTO student_support_needs
  (id,case_id,category,safe_summary,amount_toman,status,visible_to_sponsor,verified_by,verified_at,created_by_account_id)
  VALUES(?,?,'books',?,200000,?, ?, ?,NOW(),?)");
 $insert->execute([$needVisible,$case,'کتاب و لوازم کمک‌آموزشی برای پیشرفت درسی','approved',1,$guardian,$guardian]);
 $insert->execute([$needHidden,$case,'نیاز پیشنهادی فقط برای سرپرست قابل مشاهده است','proposed',0,$guardian,$guardian]);
 $pdo->prepare("INSERT INTO student_support_progress(id,case_id,safe_summary,milestone_kind,approved_by,visible_to_sponsor)
  VALUES(?,?,'تأمین کتاب با سند معتبر بررسی شده است','review',?,1)")
  ->execute([$progress,$case,$guardian]);
 $pdo->prepare("INSERT INTO student_support_sponsorships
  (id,case_id,sponsor_account_id,state,approved_sponsor_display_name,approved_student_display_name,expires_at)
  VALUES(?,?,?,'requested','حامی نمونه','نام محفوظ دانش‌آموز',DATE_ADD(NOW(), INTERVAL 30 DAY))")
  ->execute([$link,$case,$sponsor]);
 // Donations are linked only to the email that the logged-in account proved it owns.
 $donorEmail=str_replace('-','',$sponsor).'@example.invalid';
 $otherEmail=str_replace('-','',$other).'@example.invalid';
 $donations=[
   [$donationPaid,$donorEmail,'paid','support:students','talented-students-v1','books'],
   [$donationHistoric,$donorEmail,'paid','support:voluntary',null,null],
   [$donationStranger,$otherEmail,'paid','support:students','talented-students-v1','services'],
   [$donationPending,$donorEmail,'pending','support:students','talented-students-v1','scholarship']
 ];
 foreach($donations as $index=>$row){
   [$orderId,$email,$state,$sku,$program,$focus]=$row;
   $item=['sku'=>$sku,'title'=>'آزمون بدون مشخصات واقعی','kind'=>'donation',
     'quantity'=>1,'price'=>1000,'subtotal'=>1000];
   if($program!==null)$item+=['program'=>$program,'focus'=>$focus,'allocation'=>'pending_verified_need'];
   $pdo->prepare("INSERT INTO commerce_orders
     (id,factor_id,amount_toman,provider_amount,currency,customer_email,items_json,state,paid_at,provider_id_get,provider_trans_id)
     VALUES(?,?,?,?, 'IRT',?,?,?,?,?,?)")
   ->execute([$orderId,'STUDENTTEST'.(string)$index,1000,10000,$email,json_encode([$item],JSON_UNESCAPED_UNICODE),
     $state,$state==='paid'?'2026-10-11 10:00:00':null,'789123','798123']);
 }
 actor(null);
 assertSupport(callSupport('/student-support/health')->httpStatus===200,'anonymous_can_read_programme_health');
 assertSupport(callSupport('/student-support/my-contributions')->httpStatus===401,'guest_cannot_view_contributor_ledger');
 actor($sponsor);
 $ledger=callSupport('/student-support/my-contributions');
 assertSupport($ledger->httpStatus===200&&$ledger->payload['authenticated']===true&&
    $ledger->payload['noStudentIdentity']===true&&$ledger->payload['count']===2,
    'verified_sponsor_sees_only_paid_contributions_for_owned_email');
 $paid=array_values(array_filter($ledger->payload['items'],fn($line)=>$line['programme']==='talented-students-v1'));
 assertSupport(count($paid)===1&&$paid[0]['orderId']===$donationPaid&&
    $paid[0]['focus']==='books'&&$paid[0]['allocationState']==='pending_verified_need',
    'new_student_support_keeps_explicit_unallocated_state');
 $legacy=array_values(array_filter($ledger->payload['items'],fn($line)=>$line['programme']==='legacy-voluntary'));
 assertSupport(count($legacy)===1&&$legacy[0]['orderId']===$donationHistoric&&
    $legacy[0]['allocationState']===null,
    'historical_voluntary_contribution_not_relabelled_as_student_support');
 actor($other);
 $otherLedger=callSupport('/student-support/my-contributions');
 assertSupport($otherLedger->payload['count']===1&&
    $otherLedger->payload['items'][0]['orderId']===$donationStranger,
    'verified_email_account_cannot_view_other_donors');
 actor(null);

 assertSupport(callSupport('/student-support/portal')->httpStatus===401,'anonymous_cannot_read_student_cases');
 actor($other);
 $result=callSupport('/student-support/portal');
 assertSupport($result->httpStatus===200&&count($result->payload['cases'])===0,'stranger_has_no_student_case');
 assertSupport(callSupport('/student-support/needs','POST',[
    'caseId'=>$case,'category'=>'books','summary'=>'private book request not authorised','amountToman'=>5000
  ])->httpStatus===403,'stranger_cannot_propose_student_need');
 actor($sponsor);
 assertSupport(count(callSupport('/student-support/portal')->payload['cases'])===0,'sponsor_without_consent_sees_no_case');
 $pdo->prepare("UPDATE student_support_sponsorships SET state='approved',
  guardian_consent_at=NOW(),student_assent_at=NOW(),sponsor_consent_at=NOW(),staff_approved_at=NOW(),
  student_identity_visible=0,sponsor_identity_visible=0 WHERE id=?")->execute([$link]);
 $data=callSupport('/student-support/portal')->payload;
 assertSupport(count($data['cases'])===1&&$data['cases'][0]['role']==='approved_sponsor','approved_sponsor_sees_only_assigned_case');
 assertSupport($data['cases'][0]['studentName']===null,'student_identity_hidden_by_default');
 assertSupport(count($data['cases'][0]['needs'])===1&&$data['cases'][0]['needs'][0]['id']===$needVisible,'sponsor_only_sees_approved_need');
 assertSupport(count($data['cases'][0]['progress'])===1,'sponsor_only_sees_approved_progress');
 $pdo->prepare('UPDATE student_support_sponsorships SET student_identity_visible=1 WHERE id=?')->execute([$link]);
 $data=callSupport('/student-support/portal')->payload;
 assertSupport($data['cases'][0]['studentName']==='نام محفوظ دانش‌آموز','identity_only_after_specific_opt_in');
 assertSupport(callSupport('/student-support/needs','POST',[
    'caseId'=>$case,'category'=>'books','summary'=>'another book need without consent','amountToman'=>5000
  ])->httpStatus===403,'sponsor_cannot_edit_student_needs');
 actor($guardian);
 $data=callSupport('/student-support/portal')->payload;
 assertSupport(count($data['cases'][0]['needs'])===2,'guardian_sees_own_pending_and_verified_needs');
 $pdo->prepare('UPDATE student_support_sponsorships SET sponsor_identity_visible=1 WHERE id=?')->execute([$link]);
 $data=callSupport('/student-support/portal')->payload;
 assertSupport($data['cases'][0]['sponsors']===['حامی نمونه'],'guardian_sees_sponsor_name_only_after_opt_in');
 $bad=callSupport('/student-support/needs','POST',[
  'caseId'=>$case,'category'=>'books','summary'=>'تماس با 09123456789 بگیرید','amountToman'=>5000]);
 assertSupport($bad->httpStatus===400,'reject_phone_number_in_child_need');
 $create=callSupport('/student-support/needs','POST',[
  'caseId'=>$case,'category'=>'essentials','summary'=>'پوشاک ضروری برای حضور در برنامه آموزشی','amountToman'=>5000]);
 assertSupport($create->httpStatus===202&&$create->payload['visibility']==='staff_only','guardian_need_is_private_pending_review');
 $q=$pdo->prepare('SELECT status,visible_to_sponsor FROM student_support_needs WHERE id=?');$q->execute([$create->payload['needId']]);
 $added=$q->fetch();assertSupport($added['status']==='proposed'&&(int)$added['visible_to_sponsor']===0,'new_need_not_visible_to_sponsor');
 actor($sponsor);
 $revoke=callSupport('/student-support/revoke-sponsor','POST',['sponsorshipId'=>$link]);
 assertSupport($revoke->httpStatus===200,'sponsor_can_revoke_privileged_link');
 assertSupport(count(callSupport('/student-support/portal')->payload['cases'])===0,'revoked_access_is_immediately_removed');
 assertSupport($GLOBALS['originChecks']>=4,'private_mutations_have_origin_gate');
 echo "Student sponsor privacy, approvals, need moderation and revocation passed in isolated MySQL.\n";
} finally {
 $pdo->prepare('DELETE FROM student_support_audit WHERE object_id=?')->execute([$link]);
 $pdo->prepare('DELETE FROM student_support_allocations WHERE need_id IN (?,?)')->execute([$needVisible,$needHidden]);
 $pdo->prepare('DELETE FROM student_support_needs WHERE case_id=?')->execute([$case]);
 $pdo->prepare('DELETE FROM student_support_progress WHERE case_id=?')->execute([$case]);
 $pdo->prepare('DELETE FROM student_support_sponsorships WHERE case_id=?')->execute([$case]);
 $pdo->prepare('DELETE FROM student_support_cases WHERE id=?')->execute([$case]);
 foreach($donationIds as $donationId)$pdo->prepare('DELETE FROM commerce_orders WHERE id=?')->execute([$donationId]);
foreach($actors as $id)$pdo->prepare('DELETE FROM customer_accounts WHERE id=?')->execute([$id]);
}
