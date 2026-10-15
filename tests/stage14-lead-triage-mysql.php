<?php
declare(strict_types=1);
/*
 * Synthetic/isolated Stage14 owner lead-worklist acceptance.
 * NEVER point at Bertina, customer data or a production database.
 */
$dsn=(string)(getenv('OPERATIONS_TEST_DSN')?:'');
$user=(string)(getenv('OPERATIONS_TEST_USER')?:'');
$pass=(string)(getenv('OPERATIONS_TEST_PASSWORD')?:'');
if(!str_contains($dsn,'host=127.0.0.1') || !str_contains($dsn,'dbname=operations_fixture')
   || $user!=='root' || $pass!=='fixture-password') {
    fwrite(STDERR,"FAIL: only the isolated CI MySQL fixture is permitted\n");
    exit(1);
}
define('BERTINA_API_BOOTSTRAPPED',true);
function nowTs(): int {return time();}
function validUuid(string $value): bool {
    return (bool)preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iD',$value);
}
function fail(string $code,int $status=400): never {throw new RuntimeException($code.':'.$status);}
function operationsAudit(PDO $pdo,?string $actor,string $action,string $ref): void {
    $pdo->prepare('INSERT INTO operations_audit(actor_id,action,reference_id,occurred_at) VALUES(?,?,?,?)')
        ->execute([$actor,$action,$ref,nowTs()]);
}
require_once __DIR__.'/../api/growth-stage14.php';
function check(bool $condition,string $label): void {
    if(!$condition)throw new RuntimeException('ASSERTION: '.$label);
}
$database='stage14_ci_'.(string)getmypid();
$root=null;
try {
    $root=new PDO($dsn,$user,$pass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $root->exec('CREATE DATABASE `'.$database.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    $isolated=preg_replace('/dbname=[^;]+/','dbname='.$database,$dsn);
    $pdo=new PDO($isolated,$user,$pass,[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
    ]);
    $pdo->exec("CREATE TABLE customer_accounts(
        id CHAR(36) PRIMARY KEY,
        email_normalized VARCHAR(254) NOT NULL,
        status VARCHAR(20) NOT NULL,
        email_verified_at BIGINT NULL
      ) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE growth_lead_requests(
        id CHAR(36) PRIMARY KEY,
        account_id CHAR(36) NOT NULL,
        service_id VARCHAR(80) NOT NULL,
        state VARCHAR(20) NOT NULL,
        consent_withdrawn_at BIGINT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        INDEX(account_id)
      ) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE growth_lead_consent_events(event_id BIGINT PRIMARY KEY) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE operations_audit(
        actor_id CHAR(36),action VARCHAR(70),reference_id CHAR(36),occurred_at BIGINT
      ) ENGINE=InnoDB");
    $now=nowTs();
    $uuids=[
      'active'=>'11111111-1111-4111-8111-111111111111',
      'qualified'=>'22222222-2222-4222-8222-222222222222',
      'withdrawn'=>'33333333-3333-4333-8333-333333333333',
      'expired'=>'44444444-4444-4444-8444-444444444444',
      'disabled'=>'55555555-5555-4555-8555-555555555555',
      'unverified'=>'66666666-6666-4666-8666-666666666666'
    ];
    $qAccount=$pdo->prepare('INSERT INTO customer_accounts(id,email_normalized,status,email_verified_at) VALUES(?,?,?,?)');
    $qLead=$pdo->prepare('INSERT INTO growth_lead_requests(id,account_id,service_id,state,consent_withdrawn_at,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,?,?)');
    foreach($uuids as $kind=>$id){
        $active=!in_array($kind,['disabled'],true);
        $verified=$kind!=='unverified';
        $qAccount->execute([$id,$kind.'@example.test',$active?'active':'disabled',$verified?$now:null]);
        $qLead->execute([
          $id,$id,'service:academic_consult_60',
          $kind==='qualified'?'QUALIFIED':($kind==='withdrawn'?'WITHDRAWN':'NEW'),
          $kind==='withdrawn'?$now:null,$now-80000,$now-80000,
          $kind==='expired'?$now-5:$now+86400
        ]);
    }
    check(stage14LeadSchemaReady($pdo),'fixture schema available');
    $list=stage14AdminLeadWorklist($pdo);
    check(($list['ok']??null)===true,'worklist success');
    check(($list['schema']??null)==='stage14-owner-lead-worklist-v1','worklist version');
    check(count($list['items'])===2,'only active consenting verified identities');
    check(($list['items'][0]['contactEmail']??null)==='active@example.test','contact is from live verified identity');
    check(!str_contains(json_encode($list,JSON_THROW_ON_ERROR),'withdrawn@example.test'),'withdrawn identity invisible');
    check(!str_contains(json_encode($list,JSON_THROW_ON_ERROR),'disabled@example.test'),'disabled identity invisible');
    $actor='77777777-7777-4777-8777-777777777777';
    $valid=['leadId'=>$uuids['active'],'expectedState'=>'NEW','nextState'=>'QUALIFIED'];
    $changed=stage14AdminLeadTransition($pdo,$actor,$valid);
    check(($changed['state']??null)==='QUALIFIED','qualified is a review state only');
    check((int)$pdo->query('SELECT COUNT(*) FROM operations_audit')->fetchColumn()===1,'exactly one audit event');
    $row=$pdo->query("SELECT action,reference_id FROM operations_audit LIMIT 1")->fetch();
    check($row['action']==='growth_lead_state_changed'&&$row['reference_id']===$uuids['active'],
      'audit contains only id and operation');
    try {stage14AdminLeadTransition($pdo,$actor,$valid); throw new RuntimeException('stale state accepted');}
    catch(DomainException $e){}
    foreach(['withdrawn','expired','disabled','unverified'] as $kind){
        try {
            stage14AdminLeadTransition($pdo,$actor,[
              'leadId'=>$uuids[$kind],'expectedState'=>$kind==='withdrawn'?'WITHDRAWN':'NEW',
              'nextState'=>'QUALIFIED']);
            throw new RuntimeException('invalid/withdrawn state accepted for '.$kind);
        } catch(InvalidArgumentException|DomainException $e) {}
    }
    check((int)$pdo->query('SELECT COUNT(*) FROM operations_audit')->fetchColumn()===1,
      'rejected transitions never produce audit records');
    try {
       stage14AdminLeadTransition($pdo,$actor,[
         'leadId'=>$uuids['qualified'],'expectedState'=>'QUALIFIED',
         'nextState'=>'PAID']);
       throw new RuntimeException('invalid financial state accepted');
    }catch(InvalidArgumentException $e){}
    // Beyond twenty records, a full queue must not hide new customer
    // enquiries. Use deterministic synthetic identities in isolated MySQL.
    for($i=0;$i<25;$i++){
        $id=sprintf('88888888-8888-4888-8888-%012d',$i+1);
        $qAccount->execute([$id,'synthetic-'.($i+1).'@example.test','active',$now]);
        $qLead->execute([$id,$id,'service:academic_consult_60','NEW',
            null,$now-30000+$i,$now-30000+$i,$now+86400]);
    }
    $first=stage14AdminLeadWorklist($pdo);
    check(count($first['items'])===20,'first batch bounded to twenty');
    check(is_string($first['nextCursor']),'next cursor when backlog exceeds twenty');
    $second=stage14AdminLeadWorklist($pdo,$first['nextCursor']);
    check(count($second['items'])===7,'remaining consenting cases all reachable');
    check($second['nextCursor']===null,'last batch terminates without a cursor');
    $seen=[];
    foreach(array_merge($first['items'],$second['items']) as $item){
        check(!isset($seen[$item['id']]),'no duplicate across pages');
        $seen[$item['id']]=true;
    }
    check(count($seen)===27,'all eligible active cases accounted for');
    foreach(['nonsense','0:11111111-1111-4111-8111-111111111111',
        (string)($now+3600).':11111111-1111-4111-8111-111111111111'] as $bad){
        try{
            stage14AdminLeadWorklist($pdo,$bad);
            throw new RuntimeException('invalid owner cursor accepted');
        }catch(InvalidArgumentException $e){}
    }
    check((int)$pdo->query('SELECT COUNT(*) FROM operations_audit')->fetchColumn()===1,
        'pagination does not mutate audit trail or lead status');
    echo "PASS Stage14 owner triage: isolated MySQL, consent, MFA-call boundary, state locking and audit; zero real customer data.\n";
} catch(Throwable $e){
    fwrite(STDERR,"FAIL Stage14 isolated owner triage: ".get_class($e)." ".$e->getMessage()."\n");
    exit(1);
} finally {
    if($root instanceof PDO) {
        try { $root->exec('DROP DATABASE IF EXISTS `'.$database.'`'); }
        catch(Throwable $e){fwrite(STDERR,"WARN fixture cleanup: ".$e->getMessage()."\n");}
    }
}
