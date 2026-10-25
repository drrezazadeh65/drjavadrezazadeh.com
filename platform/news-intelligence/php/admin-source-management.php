<?php
declare(strict_types=1);
/** Existing SUPER_ADMIN + fresh TOTP/CSRF JREI News original mother DB only.
 * Approval adds a source to the discoverable catalogue; it never asserts
 * independent source authenticity, rights, robots permission or a CMS receipt.
 * A preapproved ORIGINAL JREI source can be linked to an original monitor.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}
require_once __DIR__.'/owner-editorial.php';
require_once __DIR__.'/source-monitor-owner.php';

function jrNewsAdminCanonicalSourceUrl(string $raw):string {
    if(strlen($raw)<12||strlen($raw)>1000||
       preg_match('/[\\x00-\\x20\\x7f\\\\]/',$raw)===1||
       filter_var($raw,FILTER_VALIDATE_URL)===false)
        throw new InvalidArgumentException('news_admin_source_url_invalid');
    $parts=parse_url($raw);
    if(!is_array($parts)||($parts['scheme']??null)!=='https'||
       !isset($parts['host'])||isset($parts['user'])||isset($parts['pass'])||
       isset($parts['fragment'])||
       (isset($parts['port'])&&(int)$parts['port']!==443))
        throw new InvalidArgumentException('news_admin_source_https_required');
    $host=strtolower(rtrim((string)$parts['host'],'.'));
    if(strlen($host)<4||strlen($host)>253||
       filter_var($host,FILTER_VALIDATE_IP)!==false||
       !preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,24}$/D',$host)||
       preg_match('/\\.(?:local|internal|test|example|invalid)$/D',$host))
        throw new InvalidArgumentException('news_admin_source_public_domain_required');
    $path=(string)($parts['path']??'/');
    if($path==='')$path='/';
    if(preg_match('/%(?:00|2f|5c|2e)/i',$path))
        throw new InvalidArgumentException('news_admin_source_encoded_path_invalid');
    $query=isset($parts['query'])?'?'.$parts['query']:'';
    return 'https://'.$host.$path.$query;
}

function jrNewsAdminSourceList(PDO $pdo,array $session,int $limit=50):array {
    jrNewsOwnerAuthority($session);
    if($limit<1||$limit>100)
        throw new InvalidArgumentException('news_admin_source_limit_invalid');
    $stmt=$pdo->prepare(
        'SELECT submission_id,source_title,source_url,source_category,
                news_priority,submission_state,matched_jrei_source_id,
                linked_monitor_id,last_issue_code,approved_at,updated_at
           FROM jrei_news_admin_source_submissions
          ORDER BY updated_at DESC,submission_id DESC LIMIT ?');
    $stmt->bindValue(1,$limit,PDO::PARAM_INT);
    $stmt->execute();
    return ['schema'=>'jr.jrei.news-admin-source-list.v1',
        'entries'=>$stmt->fetchAll(PDO::FETCH_ASSOC),
        'originalSourceRegistry'=>'jrei_exam_sources',
        'approvalDoesNotGrantContentReuseRights'=>true,
        'allChangesRequireExistingOwnerMfa'=>true];
}

function jrNewsAdminSourceSubmit(PDO $pdo,array $session,array $data,int $now):array {
    $owner=jrNewsOwnerAuthority($session);
    $rawTitle=$data['title']??null;
    if(!is_string($rawTitle))throw new InvalidArgumentException('news_admin_title_invalid');
    $title=trim($rawTitle);
    if($title===''||strlen($title)>200||preg_match('//u',$title)!==1||
       preg_match('/[\\x00-\\x1f\\x7f]/',$title))
        throw new InvalidArgumentException('news_admin_title_invalid');
    $category=$data['category']??null;
    $priority=$data['priority']??'P2';
    if(!in_array($category,['school','examinations','universities',
        'employment','language','international','research'],true)||
       !in_array($priority,['P0','P1','P2'],true)||$now<=0)
        throw new InvalidArgumentException('news_admin_source_category_invalid');
    $url=jrNewsAdminCanonicalSourceUrl((string)($data['url']??''));
    $sha=hash('sha256',$url);
    $id=jrNewsPrivateUuid();
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT submission_id,submission_state FROM
            jrei_news_admin_source_submissions
            WHERE BINARY source_url_sha256=BINARY ? FOR UPDATE');
        $q->execute([$sha]);
        $existing=$q->fetch(PDO::FETCH_ASSOC);
        if($existing){
            $pdo->commit();
            return ['submissionId'=>$existing['submission_id'],
                'state'=>$existing['submission_state'],'alreadyRecorded'=>true,
                'sourceAutoPublished'=>false];
        }
        $q=$pdo->prepare(
            "INSERT INTO jrei_news_admin_source_submissions
             (submission_id,submitted_by,source_title,source_url,
              source_url_sha256,source_category,news_priority,
              submission_state,created_at,updated_at)
             VALUES(?,?,?,?,?,?,?,'PENDING_ADMIN_APPROVAL',?,?)"
        );
        $q->execute([$id,$owner['actor'],$title,$url,$sha,
            $category,$priority,$now,$now]);
        if(function_exists('operationsAudit'))
            operationsAudit($pdo,$owner['actor'],
                'jrei_news_admin_source_submitted',hash('sha256',$id));
        $pdo->commit();
        return ['submissionId'=>$id,'state'=>'PENDING_ADMIN_APPROVAL',
            'alreadyRecorded'=>false,'sourceAutoPublished'=>false];
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}

/** Approve DISCOVERY once. Then, optionally link original approved source.
 * If no ORIGINAL source exists or its rights are not verified, preserve
 * approval in queue for automatic future reconciliation; never forge rights.
 */
function jrNewsAdminSourceApprove(PDO $pdo,array $session,string $submissionId,
    string $confirmation,int $now,bool $tryAutoReconcile=true):array {
    $owner=jrNewsOwnerAuthority($session);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$submissionId)||
       $confirmation!=='APPROVE_OFFICIAL_SOURCE_DISCOVERY'||$now<=0)
        throw new InvalidArgumentException('news_admin_source_approval_invalid');
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare(
            'SELECT submission_id,submission_state FROM
             jrei_news_admin_source_submissions WHERE submission_id=? FOR UPDATE');
        $q->execute([$submissionId]);
        $row=$q->fetch(PDO::FETCH_ASSOC);
        if(!$row||$row['submission_state']==='DISABLED')
            throw new RuntimeException('news_admin_source_disabled_or_missing');
        if($row['submission_state']==='PENDING_ADMIN_APPROVAL'){
            $pdo->prepare(
                "UPDATE jrei_news_admin_source_submissions SET
                 approved_by=?,approved_at=?,updated_at=?,
                 submission_state='APPROVED_DISCOVERY'
                 WHERE submission_id=? AND submission_state='PENDING_ADMIN_APPROVAL'"
            )->execute([$owner['actor'],$now,$now,$submissionId]);
            if(function_exists('operationsAudit'))
                operationsAudit($pdo,$owner['actor'],
                    'jrei_news_admin_source_approved',hash('sha256',$submissionId));
        }
        $pdo->commit();
    }catch(Throwable $e){
        if($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
    if(!$tryAutoReconcile)return ['submissionId'=>$submissionId,
        'state'=>'APPROVED_DISCOVERY','sourceAutoPublished'=>false];
    return jrNewsAdminSourceReconcile($pdo,$session,$submissionId,$now,false);
}

function jrNewsAdminSourceReconcile(PDO $pdo,array $session,
    string $submissionId,int $now,bool $monitorActivationAccepted):array {
    $owner=jrNewsOwnerAuthority($session);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$submissionId)||$now<=0)
        throw new InvalidArgumentException('news_admin_source_reconcile_invalid');
    $q=$pdo->prepare('SELECT submission_state,source_url,source_category,news_priority
        FROM jrei_news_admin_source_submissions WHERE submission_id=?');
    $q->execute([$submissionId]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!$row||!in_array($row['submission_state'],[
        'APPROVED_DISCOVERY','ORIGINAL_POLICY_PENDING','MONITOR_STAGED','MONITOR_ACTIVE'
    ],true))throw new RuntimeException('news_admin_source_not_approved');
    $find=$pdo->prepare(
        "SELECT s.source_id FROM jrei_exam_sources s
         JOIN jrei_ka_source_policies p ON p.source_id=s.source_id
         WHERE BINARY s.source_locator_uri=BINARY ?
           AND s.review_state='AUTHORITATIVE_REVIEWED'
           AND s.rights_state IN ('PERMITTED_PRIVATE_ANALYSIS','PERMITTED_REPRODUCTION')
           AND s.is_revoked=0 AND s.is_superseded=0
           AND s.reviewer_account_id IS NOT NULL AND s.verified_at IS NOT NULL
           AND p.scheduling_state='APPROVED'
           AND p.rights_reviewed=1 AND p.robots_terms_reviewed=1
           AND p.transport_reviewed=1
           AND BINARY p.rights_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'
           AND BINARY p.robots_terms_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'
           AND BINARY p.transport_evidence_sha256 REGEXP BINARY '^[a-f0-9]{64}$'
         ORDER BY s.source_id LIMIT 1"
    );
    $find->execute([$row['source_url']]);
    $original=$find->fetchColumn();
    if(!is_string($original)){
        $pdo->prepare(
            "UPDATE jrei_news_admin_source_submissions SET
             submission_state='ORIGINAL_POLICY_PENDING',updated_at=?,
             last_issue_code='ORIGINAL_SOURCE_POLICY_REQUIRED'
             WHERE submission_id=? AND submission_state<>'DISABLED'"
        )->execute([$now,$submissionId]);
        return ['submissionId'=>$submissionId,'state'=>'ORIGINAL_POLICY_PENDING',
            'nextStep'=>'AUTOMATIC_ORIGINAL_SOURCE_REGISTRATION_INTEGRATION',
            'ownerPerArticleReviewRequired'=>false,
            'newsMonitorEnabled'=>false,'sourcePublished'=>false];
    }
    // The ORIGINAL monitor workflow verifies all current policies again,
    // transactionally. Admin source approval never grants rights itself.
    $monitor=jrNewsOwnerStageSourceMonitor($pdo,$session,$original,
        $row['source_category'],$row['news_priority'],$now);
    $active=false;
    if($monitorActivationAccepted){
        $enabled=jrNewsOwnerEnableSourceMonitor($pdo,$session,
            $monitor['monitorId'],[
                'source'=>'ORIGINAL_OWNER_APPROVED_JREI_RELEASE',
                'finalIntegratedAcceptanceVerified'=>true,
                'newsMonitoringActivatedByOwner'=>true
            ],$now);
        $active=$enabled['enabled']===true;
    }
    $state=$active?'MONITOR_ACTIVE':'MONITOR_STAGED';
    $pdo->prepare(
        'UPDATE jrei_news_admin_source_submissions SET
         submission_state=?,matched_jrei_source_id=?,linked_monitor_id=?,
         updated_at=?,last_issue_code=NULL
         WHERE submission_id=? AND submission_state<>?'
    )->execute([$state,$original,$monitor['monitorId'],$now,$submissionId,'DISABLED']);
    return ['submissionId'=>$submissionId,'state'=>$state,
        'originalSourceId'=>$original,'monitorId'=>$monitor['monitorId'],
        'newsMonitorEnabled'=>$active,'sourcePublished'=>false];
}

function jrNewsAdminSourceDisable(PDO $pdo,array $session,string $submissionId,
    int $now):array {
    $owner=jrNewsOwnerAuthority($session);
    if(!preg_match('/^[a-f0-9-]{36}$/iD',$submissionId)||$now<=0)
        throw new InvalidArgumentException('news_admin_source_disable_invalid');
    $q=$pdo->prepare('SELECT linked_monitor_id,submission_state
        FROM jrei_news_admin_source_submissions WHERE submission_id=?');
    $q->execute([$submissionId]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!$row)throw new RuntimeException('news_admin_source_not_found');
    // Pause the original news monitor FIRST, then disable the discovery row.
    if(is_string($row['linked_monitor_id'])&&$row['linked_monitor_id']!=='')
        jrNewsOwnerDisableSourceMonitor($pdo,$session,$row['linked_monitor_id'],$now);
    $pdo->prepare(
        "UPDATE jrei_news_admin_source_submissions
         SET submission_state='DISABLED',updated_at=?
         WHERE submission_id=?"
    )->execute([$now,$submissionId]);
    if(function_exists('operationsAudit'))
        operationsAudit($pdo,$owner['actor'],
            'jrei_news_admin_source_disabled',hash('sha256',$submissionId));
    return ['submissionId'=>$submissionId,'state'=>'DISABLED',
        'originalMonitorStopRequested'=>true,'publishedPagesRemoved'=>false];
}
