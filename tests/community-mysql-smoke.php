<?php
declare(strict_types=1);
// Isolated MySQL 8 staging-only smoke test. No production credentials allowed.
$dsn = getenv('JR_TEST_MYSQL_DSN') ?: '';
$user = getenv('JR_TEST_MYSQL_USER') ?: '';
$pass = getenv('JR_TEST_MYSQL_PASSWORD') ?: '';
if (!str_contains($dsn, 'dbname=community_fixture') || $user !== 'root') {
    fwrite(STDERR, "Refusing non-fixture database.\n"); exit(2);
}
$pdo=new PDO($dsn,$user,$pass,[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES=>false
]);
$pdo->exec("SET SESSION sql_mode='STRICT_ALL_TABLES'");
$check=static function(bool $condition,string $name): void {
    if (!$condition) {fwrite(STDERR,"FAIL: ".$name."\n");exit(1);}
    echo "PASS: ".$name."\n";
};
$integrityFailure=static function(callable $fn,string $name)use($check): void{
    try{$fn();$check(false,$name.' should have been rejected');}
    catch(PDOException $e){
        $sqlState=(string)$e->getCode();
        $driverCode=(int)($e->errorInfo[1]??0);
        // MySQL 8 CHECK failure is HY000/3819; a required field omitted in STRICT mode
        // is HY000/1364. Unique/FK violations signal 23000. Reject other HY000.
        $valid=$sqlState==='23000'||($sqlState==='HY000'&&in_array($driverCode,[3819,1364],true));
        $check($valid,$name.' integrity enforced (SQLSTATE '.$sqlState.', code '.$driverCode.')');
    }
};
$reader='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
$readerTwo='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
$article='/fa/akhbar/teacher-schools-professional-learning-2026/';
$articleTwo='/fa/akhbar/humanability-language-assessment-framework-2026/';
foreach([$reader,$readerTwo] as $i=>$id){
    $stmt=$pdo->prepare("INSERT INTO customer_accounts(id,email_normalized,password_hash,status,email_verified_at,created_at,updated_at) VALUES(?,?,?,'active',?,?,?)");
    $stmt->execute([$id,'fixture-'.$i.'@example.invalid','test-non-login-hash',1700000000,1700000000,1700000000]);
}
$comment='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
$now=1700000000;
$insert=$pdo->prepare("INSERT INTO community_comments(id,page_path,author_account_id,body_text,rating,created_at,consented_at) VALUES(?,?,?,?,?,?,?)");
$insert->execute([$comment,$article,$reader,'Verified academic reader feedback',5,$now,$now]);
$record=$pdo->query("SELECT state,rating,consented_at FROM community_comments WHERE id='$comment'")->fetch();
$check($record['state']==='pending','Pending by default; nothing public before approval');
$check((int)$record['consented_at']===$now,'Publication consent timestamp stored');
$check((int)$record['rating']===5,'Valid star rating stored');
$approvedOnly=$pdo->prepare("SELECT COUNT(*) FROM community_comments WHERE page_path=? AND state='approved'");
$approvedOnly->execute([$article]);$check((int)$approvedOnly->fetchColumn()===0,'Pending rating and comment absent from public view');
$integrityFailure(fn()=> $insert->execute(['dddddddd-dddd-4ddd-8ddd-dddddddddddd',$article,$reader,'Duplication must be prevented',5,$now,$now]),'One review per account/article');
$integrityFailure(fn()=> $insert->execute(['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',$articleTwo,$readerTwo,'Invalid six star rating',6,$now,$now]),'Rating 1–5 only');
$integrityFailure(fn()=> $insert->execute(['ffffffff-ffff-4fff-8fff-ffffffffffff',$articleTwo,'00000000-0000-4000-8000-000000000000','Orphan reviewer account',4,$now,$now]),'Account foreign key');
$integrityFailure(fn()=> $pdo->prepare("INSERT INTO community_comments(id,page_path,author_account_id,body_text,rating,created_at) VALUES(?,?,?,?,?,?)")->execute(['11111111-1111-4111-8111-111111111111',$articleTwo,$readerTwo,'Missing explicit consent',3,$now]),'Consent timestamp required');
$pdo->beginTransaction();
$changed=$pdo->prepare("UPDATE community_comments SET state='approved',reviewed_at=?,reviewer_account_id=? WHERE id=? AND state='pending'");
$changed->execute([$now+1,$readerTwo,$comment]);$check($changed->rowCount()===1,'One moderated approval transition');
$audit=$pdo->prepare("INSERT INTO community_moderation_audit(id,comment_id,actor_account_id,action,created_at) VALUES(?,?,?,?,?)");
$audit->execute(['22222222-2222-4222-8222-222222222222',$comment,$readerTwo,'approved',$now+1]);
$pdo->commit();
$approvedOnly->execute([$article]);$check((int)$approvedOnly->fetchColumn()===1,'Approved content becomes public');
$pdo->beginTransaction();
$remove=$pdo->prepare("UPDATE community_comments SET state='removed',reviewed_at=?,reviewer_account_id=? WHERE id=? AND state='approved'");
$remove->execute([$now+2,$readerTwo,$comment]);$check($remove->rowCount()===1,'Published content can be removed');
$audit->execute(['33333333-3333-4333-8333-333333333333',$comment,$readerTwo,'removed',$now+2]);$pdo->commit();
$approvedOnly->execute([$article]);$check((int)$approvedOnly->fetchColumn()===0,'Removed content no longer public');
$check((int)$pdo->query("SELECT COUNT(*) FROM community_moderation_audit WHERE comment_id='$comment'")->fetchColumn()===2,'Approval and removal audit history preserved');
$check($remove->execute([$now+3,$readerTwo,$comment]) && $remove->rowCount()===0,'Removed content not removable twice');
// Five-table editorial governance fixtures: no live customers or production credentials.
$secondComment='44444444-4444-4444-8444-444444444444';
$insert->execute([$secondComment,$articleTwo,$readerTwo,'Publication-ready scholarly question',null,$now+4,$now+4]);
$pdo->prepare("UPDATE community_comments SET state='approved',reviewed_at=?,reviewer_account_id=? WHERE id=?")
    ->execute([$now+5,$reader,$secondComment]);
$reply='55555555-5555-4555-8555-555555555555';
$insertReply=$pdo->prepare("INSERT INTO community_admin_replies(id,comment_id,admin_account_id,body_text,created_at,updated_at) VALUES(?,?,?,?,?,?)");
$insertReply->execute([$reply,$secondComment,$reader,'Formal academic response in draft',$now+6,$now+6]);
$state=$pdo->query("SELECT state,revision_no,published_at FROM community_admin_replies WHERE id='$reply'")->fetch();
$check($state['state']==='draft' && (int)$state['revision_no']===1 && $state['published_at']===null,'Official replies default to unpublished drafts');
$revision='66666666-6666-4666-8666-666666666666';
$insertRevision=$pdo->prepare("INSERT INTO community_admin_reply_revisions(id,reply_id,revision_no,actor_account_id,event_kind,state_after,body_snapshot,created_at) VALUES(?,?,?,?,?,?,?,?)");
$insertRevision->execute([$revision,$reply,1,$reader,'created','draft','Formal academic response in draft',$now+6]);
$integrityFailure(fn()=>$insertRevision->execute(['77777777-7777-4777-8777-777777777777',$reply,1,$reader,'edited','draft','duplicate revision',$now+7]),'Reply revision monotonic uniqueness');
$integrityFailure(fn()=> $pdo->prepare("INSERT INTO community_admin_replies(id,comment_id,admin_account_id,body_text,state,created_at,updated_at) VALUES(?,?,?,?,'published',?,?)")
  ->execute(['88888888-8888-4888-8888-888888888888',$secondComment,$reader,'Unsafe auto-publication',$now+7,$now+7]),'Publication timestamp required');
$visible=$pdo->prepare("SELECT COUNT(*) FROM community_admin_replies r INNER JOIN community_comments c ON c.id=r.comment_id AND c.state='approved' WHERE r.id=? AND r.state='published'");
$visible->execute([$reply]);$check((int)$visible->fetchColumn()===0,'Unpublished official draft excluded from public join');
$pdo->prepare("UPDATE community_admin_replies SET state='published',revision_no=2,published_at=?,updated_at=? WHERE id=? AND state='draft'")
  ->execute([$now+8,$now+8,$reply]);
$visible->execute([$reply]);$check((int)$visible->fetchColumn()===1,'Explicitly published reply visible only under approved parent');
$pdo->prepare("UPDATE community_comments SET state='removed' WHERE id=?")->execute([$secondComment]);
$visible->execute([$reply]);$check((int)$visible->fetchColumn()===0,'Parent removal automatically hides official replies');
$pdo->prepare("UPDATE community_admin_replies SET state='removed',revision_no=3,removed_at=? WHERE id=?")->execute([$now+9,$reply]);
$pdo->prepare("INSERT INTO community_erasure_audit(id,target_kind,target_id,actor_account_id,reason_code,affected_reply_count,occurred_at) VALUES(?,?,?,?,?,?,?)")
  ->execute(['99999999-9999-4999-8999-999999999999','comment',$secondComment,$reader,'retention',1,$now+10]);
$pdo->prepare('DELETE FROM community_comments WHERE id=?')->execute([$secondComment]);
$check((int)$pdo->query("SELECT COUNT(*) FROM community_admin_replies WHERE id='$reply'")->fetchColumn()===0,'Parent erasure cascades reply text');
$check((int)$pdo->query("SELECT COUNT(*) FROM community_admin_reply_revisions WHERE reply_id='$reply'")->fetchColumn()===0,'Parent erasure cascades private revision snapshots');
$check((int)$pdo->query("SELECT COUNT(*) FROM community_erasure_audit WHERE target_id='$secondComment'")->fetchColumn()===1,'Content-free permanent erasure audit remains');
echo "Community MySQL schema smoke: all assertions passed.\n";

