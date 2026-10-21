<?php
declare(strict_types=1);
// Owner-controlled moderated discussion pilot. Never activate without verified
// schema migration, privacy notice, fresh server security audit and owner release.
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

function communityAvailable(PDO $pdo): bool {
    if (getenv('JR_COMMUNITY_ENABLED') !== 'true' || getenv('JR_COMMUNITY_MIGRATION_APPROVED') !== 'true') return false;
    try {
        $pdo->query('SELECT id FROM community_comments LIMIT 0');
        $pdo->query('SELECT id FROM community_moderation_audit LIMIT 0');
        $pdo->query('SELECT id FROM community_admin_replies LIMIT 0');
        $pdo->query('SELECT id FROM community_admin_reply_revisions LIMIT 0');
        $pdo->query('SELECT id FROM community_erasure_audit LIMIT 0');
        return true;
    } catch (Throwable $e) { return false; }
}
function communityCanonical(mixed $v): ?string {
    if (!is_string($v) || strlen($v)>180) return null;
    if (preg_match('#^/fa/(akhbar|rahnamaha)/([a-z0-9](?:[a-z0-9-]{1,87}[a-z0-9])?)/$#D', $v, $matches) !== 1) return null;
    $root=realpath(dirname(__DIR__).'/fa/'.$matches[1]);
    $article=$root ? realpath($root.'/'.$matches[2].'/index.html') : false;
    if (!$root || !$article || !str_starts_with($article,$root.DIRECTORY_SEPARATOR)) return null;
    return $v;
}
function communityAccount(PDO $pdo): array {
    $account=sessionAccount($pdo);
    if (!$account || ($account['status']??'')!=='active' || empty($account['email_verified_at'])) fail('unauthorized',401);
    return $account;
}
function communityCsrf(PDO $pdo): string {
    communityAccount($pdo);
    $pepper=(string)(cfg()['auth_pepper']??'');
    $cookie=(string)($_COOKIE[SESSION_COOKIE]??'');
    if (strlen($pepper)<32 || $cookie==='') fail('community_csrf_unavailable',503);
    return hash_hmac('sha256','community-csrf-v1|'.tokenHash($cookie),$pepper);
}
function communityMutationGuard(PDO $pdo): array {
    $origin=(string)($_SERVER['HTTP_ORIGIN']??'');
    $fetch=(string)($_SERVER['HTTP_SEC_FETCH_SITE']??'same-origin');
    if ($origin!==SITE_ORIGIN || !in_array($fetch,['same-origin','none'],true)) fail('origin_forbidden',403);
    $account=communityAccount($pdo);
    $provided=(string)($_SERVER['HTTP_X_JR_COMMUNITY_CSRF']??'');
    $expected=communityCsrf($pdo);
    if (strlen($provided)!==64 || !hash_equals($expected,$provided)) fail('csrf_forbidden',403);
    return $account;
}
function communityModerator(PDO $pdo): array {
    $account=communityAccount($pdo);
    $settings=cfg();
    if (!operationsSchemaReady($pdo) || !operationsAdmin($pdo,$account,$settings)) fail('admin_forbidden',403);
    $cookie=(string)($_COOKIE[SESSION_COOKIE]??'');
    $session=tokenHash($cookie);
    $accountId=(string)$account['id'];
    $pepper=(string)($settings['auth_pepper']??'');
    $secret=(string)($settings['operations_admins'][$accountId]['totp_secret']??'');
    if (strlen($pepper)<32 || !$secret) fail('admin_mfa_required',403);
    $credentialHash=hash_hmac('sha256',$secret,$pepper);
    if (!operationsMfaFresh($pdo,$session,$accountId,nowTs(),$credentialHash)) fail('admin_mfa_required',403);
    return $account;
}

/* Database-complete, owner-provisioned discussion module.
 * All private responses inherit api/index.php no-store and noindex headers.
 * Never trust browser-facing admin controls for authorization. */
function communityCanErase(array $account): bool {
    $id=(string)($account['id']??'');
    $record=cfg()['operations_admins'][$id]??null;
    return is_array($record)&&($record['role']??null)==='SUPER_ADMIN';
}
function communityReplyText(mixed $value): ?string {
    if (!is_string($value) || strlen($value)>24000) return null;
    $clean=trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u','',$value)??'');
    if (textLen($clean)<1 || textLen($clean)>6000) return null;
    return $clean;
}
function communityListApprovedReplies(PDO $pdo,array $comments): array {
    if (!$comments) return [];
    $ids=array_column($comments,'id');
    $marks=implode(',',array_fill(0,count($ids),'?'));
    $q=$pdo->prepare("SELECT r.id,r.comment_id,r.body_text,r.created_at,r.updated_at
       FROM community_admin_replies r
       INNER JOIN community_comments c ON c.id=r.comment_id AND c.state='approved'
       WHERE r.state='published' AND r.comment_id IN ($marks)
       ORDER BY r.created_at ASC,r.id ASC");
    $q->execute($ids);
    $out=[];
    foreach ($q->fetchAll() as $r) {
        $out[(string)$r['comment_id']][]=[
            'id'=>(string)$r['id'],
            'body'=>(string)$r['body_text'],
            'createdAt'=>(int)$r['created_at'],
            'updatedAt'=>(int)$r['updated_at'],
            'label'=>'Official site management reply'
        ];
    }
    return $out;
}
function communityAdminReplyRow(PDO $pdo,string $id): ?array {
    $q=$pdo->prepare('SELECT id,comment_id,body_text,state,revision_no,created_at,updated_at,published_at FROM community_admin_replies WHERE id=? FOR UPDATE');
    $q->execute([$id]);return $q->fetch() ?: null;
}
function communityAdminReplyRevision(PDO $pdo,string $replyId,int $revision,string $actor,string $event,string $state,?string $body,int $now): void {
    $q=$pdo->prepare('INSERT INTO community_admin_reply_revisions(id,reply_id,revision_no,actor_account_id,event_kind,state_after,body_snapshot,created_at) VALUES(?,?,?,?,?,?,?,?)');
    $q->execute([uuidv4(),$replyId,$revision,$actor,$event,$state,$body,$now]);
}
function communityArchivePage(PDO $pdo,string $state,?int $beforeTime,?string $beforeId): array {
    $sql='SELECT id,page_path,body_text,rating,state,created_at,reviewed_at FROM community_comments WHERE state=?';
    $values=[$state];
    if ($beforeTime!==null && $beforeId!==null) {
        $sql.=' AND (created_at < ? OR (created_at = ? AND id < ?))';
        array_push($values,$beforeTime,$beforeTime,$beforeId);
    }
    $sql.=' ORDER BY created_at DESC,id DESC LIMIT 21';
    $q=$pdo->prepare($sql);$q->execute($values);
    $all=$q->fetchAll();
    $hasMore=count($all)>20;
    $all=array_slice($all,0,20);
    $items=array_map(static fn($c)=>[
        'id'=>(string)$c['id'],'page'=>(string)$c['page_path'],
        'body'=>(string)$c['body_text'],'rating'=>$c['rating']===null?null:(int)$c['rating'],
        'state'=>(string)$c['state'],'createdAt'=>(int)$c['created_at'],
        'reviewedAt'=>$c['reviewed_at']===null?null:(int)$c['reviewed_at']
    ],$all);
    $last=$hasMore ? end($all) : null;
    return ['items'=>$items,'nextCursor'=>$last?[
        'createdAt'=>(int)$last['created_at'],'id'=>(string)$last['id']
    ]:null];
}

function communityRoute(string $route,string $verb): never {
    $pdo=db();
    if (!$pdo || !communityAvailable($pdo)) fail('community_unavailable',503);
    if ($route==='/community/comments' && $verb==='GET') {
        $page=communityCanonical($_GET['page']??null);
        if ($page===null) fail('invalid_page',400);
        $query=$pdo->prepare("SELECT id,body_text,rating,created_at FROM community_comments WHERE page_path=? AND state='approved' ORDER BY created_at DESC,id DESC LIMIT 20");
        $query->execute([$page]);
        $approved=$query->fetchAll();
        $replies=communityListApprovedReplies($pdo,$approved);
        $data=array_map(static fn($x)=>[
            'id'=>(string)$x['id'],
            'body'=>(string)$x['body_text'],
            'rating'=>$x['rating']===null?null:(int)$x['rating'],
            'createdAt'=>(int)$x['created_at'],
            'authorLabel'=>'Verified reader',
            'replies'=>$replies[(string)$x['id']]??[]
        ],$approved);
        // Submitted ratings do not appear in public data until manually approved.
        respond(['ok'=>true,'schema'=>'community-comments-v1','page'=>$page,'comments'=>$data,'count'=>count($data)]);
    }
    if ($route==='/community/csrf' && $verb==='GET') {
        $account=communityAccount($pdo);
        respond(['ok'=>true,'csrfToken'=>communityCsrf($pdo),'authenticated'=>true]);
    }
    if ($route==='/community/comments' && $verb==='POST') {
        $account=communityMutationGuard($pdo);
        $pageBody=jsonBody();
        // Honeypot is additive: authenticated accounts, same-origin CSRF, and
        // server-authoritative rate limits remain mandatory regardless of client hints.
        $trap=$pageBody['website']??'';
        if (!is_string($trap)||trim($trap)!=='') fail('invalid_comment',400);
        $page=communityCanonical($pageBody['page']??null);
        if ($page===null) fail('invalid_page',400);
        $content=$pageBody['body']??null;
        if (!is_string($content)) fail('invalid_comment',400);
        $content=trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u','',$content)??'');
        if (textLen($content)<12 || textLen($content)>2000 || strlen($content)>6000) fail('invalid_comment',400);
        if (preg_match_all('~(?:https?://|www\\.)~i',$content)>3) fail('invalid_comment',400);
        $rating=$pageBody['rating']??null;
        if ($rating!==null && (!is_int($rating) || $rating<1 || $rating>5)) fail('invalid_rating',400);
        if (($pageBody['consentToPublication']??false)!==true) fail('consent_required',400);
        $id=(string)$account['id'];
        if (!rateAllowed($pdo,'community_comment',$id,3,3600)) fail('rate_limited',429);
        $comment=uuidv4();$now=nowTs();
        try {
            $pdo->beginTransaction();
            $pdo->prepare("INSERT INTO community_comments(id,page_path,author_account_id,body_text,rating,state,created_at,consented_at) VALUES(?,?,?,?,?,'pending',?,?)")->execute([$comment,$page,$id,$content,$rating,$now,$now]);
            $pdo->prepare("INSERT INTO community_moderation_audit(id,comment_id,actor_account_id,action,created_at) VALUES(?,?,?,'submitted',?)")->execute([uuidv4(),$comment,$id,$now]);
            $pdo->commit();
        } catch (PDOException $e) {
            if ($pdo->inTransaction())$pdo->rollBack();
            if ((string)$e->getCode()==='23000') fail('already_submitted',409);
            error_log('Community submission database failure: '.get_class($e));
            fail('community_unavailable',503);
        } catch (Throwable $e) {
            if ($pdo->inTransaction())$pdo->rollBack();
            fail('community_unavailable',503);
        }
        respond(['ok'=>true,'state'=>'pending','moderatedBeforePublication'=>true],202);
    }
    if ($route==='/community/moderation' && $verb==='GET') {
        $mod=communityModerator($pdo);
        $canErase=communityCanErase($mod);
        // Explicit state + keyset cursor enables older records without exposing private text publicly.
        $requested=$_GET['state']??null;
        if ($requested!==null) {
            if (!is_string($requested)||!in_array($requested,['pending','approved','rejected','removed'],true)) fail('invalid_state',400);
            $cursorTime=null;$cursorId=null;
            if (isset($_GET['beforeCreatedAt'])||isset($_GET['beforeId'])) {
                $rawTime=$_GET['beforeCreatedAt']??null;
                $rawId=$_GET['beforeId']??null;
                if (!is_string($rawTime)||!ctype_digit($rawTime)||strlen($rawTime)>12||!is_string($rawId)||!validUuid($rawId)) fail('invalid_cursor',400);
                $cursorTime=(int)$rawTime;$cursorId=$rawId;
            }
            $result=communityArchivePage($pdo,$requested,$cursorTime,$cursorId);
            respond(['ok'=>true,'schema'=>'community-moderation-v2','state'=>$requested,'canErase'=>$canErase]+$result);
        }
        $q=$pdo->query("SELECT id,page_path,body_text,rating,created_at FROM community_comments WHERE state='pending' ORDER BY created_at ASC,id ASC LIMIT 30");
        $queue=array_map(static fn($x)=>[
            'id'=>(string)$x['id'],'page'=>(string)$x['page_path'],
            'body'=>(string)$x['body_text'],'rating'=>$x['rating']===null?null:(int)$x['rating'],
            'createdAt'=>(int)$x['created_at']
        ],$q->fetchAll());
        $published=$pdo->query("SELECT id,page_path,body_text,rating,created_at FROM community_comments WHERE state='approved' ORDER BY reviewed_at DESC,id DESC LIMIT 20")->fetchAll();
        $published=array_map(static fn($x)=>[
            'id'=>(string)$x['id'],'page'=>(string)$x['page_path'],
            'body'=>(string)$x['body_text'],'rating'=>$x['rating']===null?null:(int)$x['rating'],
            'createdAt'=>(int)$x['created_at']
        ],$published);
        respond(['ok'=>true,'schema'=>'community-moderation-v1','pending'=>$queue,'approved'=>$published,'canErase'=>$canErase]);
    }
    if ($route==='/community/moderation' && $verb==='POST') {
        $actor=communityMutationGuard($pdo);
        communityModerator($pdo);
        $input=jsonBody();
        $comment=$input['id']??null;$decision=$input['decision']??null;
        if (!is_string($comment)||!validUuid($comment)||!in_array($decision,['approved','rejected','removed'],true)) fail('invalid_moderation',400);
        if (!rateAllowed($pdo,'community_moderation',(string)$actor['id'],30,3600)) fail('rate_limited',429);
        $now=nowTs();
        try {
            $pdo->beginTransaction();
            $expectedState=$decision==='removed'?'approved':'pending';
            $q=$pdo->prepare("UPDATE community_comments SET state=?,reviewed_at=?,reviewer_account_id=? WHERE id=? AND state=?");
            $q->execute([$decision,$now,(string)$actor['id'],$comment,$expectedState]);
            if ($q->rowCount()!==1) {$pdo->rollBack();fail('moderation_state_conflict',409);}
            $pdo->prepare("INSERT INTO community_moderation_audit(id,comment_id,actor_account_id,action,created_at) VALUES(?,?,?,?,?)")->execute([uuidv4(),$comment,(string)$actor['id'],$decision,$now]);
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction())$pdo->rollBack();
            fail('community_unavailable',503);
        }
        respond(['ok'=>true,'state'=>$decision]);
    }
    if ($route==='/community/admin/replies' && $verb==='GET') {
        communityModerator($pdo);
        $comment=$_GET['comment']??null;
        if (!is_string($comment)||!validUuid($comment)) fail('invalid_comment_id',400);
        $q=$pdo->prepare("SELECT id,comment_id,body_text,state,revision_no,created_at,updated_at,published_at
          FROM community_admin_replies WHERE comment_id=? ORDER BY created_at DESC,id DESC LIMIT 30");
        $q->execute([$comment]);
        $items=array_map(static fn($r)=>[
            'id'=>(string)$r['id'],'commentId'=>(string)$r['comment_id'],
            'body'=>(string)$r['body_text'],'state'=>(string)$r['state'],
            'revision'=>(int)$r['revision_no'],'createdAt'=>(int)$r['created_at'],
            'updatedAt'=>(int)$r['updated_at'],
            'publishedAt'=>$r['published_at']===null?null:(int)$r['published_at']
        ],$q->fetchAll());
        respond(['ok'=>true,'schema'=>'community-admin-replies-v1','items'=>$items]);
    }
    if ($route==='/community/admin/revisions' && $verb==='GET') {
        communityModerator($pdo);
        $reply=$_GET['reply']??null;
        if (!is_string($reply)||!validUuid($reply)) fail('invalid_reply',400);
        $q=$pdo->prepare("SELECT revision_no,event_kind,state_after,body_snapshot,reason_code,created_at
          FROM community_admin_reply_revisions WHERE reply_id=? ORDER BY revision_no DESC LIMIT 60");
        $q->execute([$reply]);
        $items=array_map(static fn($x)=>[
            'revision'=>(int)$x['revision_no'],'event'=>(string)$x['event_kind'],
            'state'=>(string)$x['state_after'],'body'=>$x['body_snapshot'],
            'reason'=>$x['reason_code'],'createdAt'=>(int)$x['created_at']
        ],$q->fetchAll());
        respond(['ok'=>true,'schema'=>'community-reply-revisions-v1','items'=>$items]);
    }
    if ($route==='/community/admin/replies' && $verb==='POST') {
        $actor=communityMutationGuard($pdo);
        communityModerator($pdo);
        $input=jsonBody();
        $action=$input['action']??null;
        if (!is_string($action)||!in_array($action,['create','edit','publish','hide','restore','remove'],true)) fail('invalid_reply_action',400);
        $actorId=(string)$actor['id'];
        if (!rateAllowed($pdo,'community_admin_reply',$actorId,60,3600)) fail('rate_limited',429);
        $now=nowTs();
        if ($action==='create') {
            $comment=$input['commentId']??null;
            $body=communityReplyText($input['body']??null);
            if (!is_string($comment)||!validUuid($comment)||$body===null) fail('invalid_reply',400);
            try {
                $pdo->beginTransaction();
                $q=$pdo->prepare('SELECT state FROM community_comments WHERE id=? FOR UPDATE');
                $q->execute([$comment]);$parent=$q->fetch();
                if (!$parent||$parent['state']!=='approved') {
                    $pdo->rollBack();fail('comment_not_approved',409);
                }
                $id=uuidv4();
                $pdo->prepare("INSERT INTO community_admin_replies(id,comment_id,admin_account_id,body_text,state,revision_no,created_at,updated_at) VALUES(?,?,?,?,'draft',1,?,?)")
                    ->execute([$id,$comment,$actorId,$body,$now,$now]);
                communityAdminReplyRevision($pdo,$id,1,$actorId,'created','draft',$body,$now);
                $pdo->commit();
            } catch (Throwable $e) {
                if ($pdo->inTransaction())$pdo->rollBack();
                fail('community_unavailable',503);
            }
            respond(['ok'=>true,'id'=>$id,'state'=>'draft','revision'=>1],201);
        }
        $reply=$input['replyId']??null;
        $expected=$input['expectedRevision']??null;
        if (!is_string($reply)||!validUuid($reply)||!is_int($expected)||$expected<1) fail('invalid_reply',400);
        $edited=$action==='edit' ? communityReplyText($input['body']??null) : null;
        if ($action==='edit'&&$edited===null) fail('invalid_reply',400);
        try {
            $pdo->beginTransaction();
            $current=communityAdminReplyRow($pdo,$reply);
            if (!$current||$expected!==(int)$current['revision_no']) {
                $pdo->rollBack();fail('reply_version_conflict',409);
            }
            $state=(string)$current['state'];
            $newState=$state;
            $body=$edited??(string)$current['body_text'];
            if ($action==='edit') {
                if ($state==='removed'){$pdo->rollBack();fail('reply_state_conflict',409);}
                $event='edited';
            } else {
                $allowed=[
                    'publish'=>['draft','hidden'],
                    'hide'=>['published'],
                    'restore'=>['removed','hidden'],
                    'remove'=>['draft','hidden','published']
                ];
                if (!in_array($state,$allowed[$action]??[],true)) {
                    $pdo->rollBack();fail('reply_state_conflict',409);
                }
                $newState=match($action) {
                    'publish'=>'published','hide'=>'hidden','restore'=>'draft',
                    'remove'=>'removed',default=>$state
                };
                if ($action==='publish') {
                    $q=$pdo->prepare('SELECT state FROM community_comments WHERE id=? FOR UPDATE');
                    $q->execute([(string)$current['comment_id']]);$parent=$q->fetch();
                    if (!$parent||$parent['state']!=='approved') {
                        $pdo->rollBack();fail('comment_not_approved',409);
                    }
                }
                $event=match($action) {
                    'publish'=>'published','hide'=>'hidden',
                    'restore'=>'restored','remove'=>'removed',default=>'edited'
                };
            }
            $nextRevision=$expected+1;
            $sql='UPDATE community_admin_replies SET body_text=?,state=?,revision_no=?,updated_at=?,published_at=?,removed_at=? WHERE id=? AND revision_no=?';
            $publishedAt=$newState==='published' ? ($now) : ($current['published_at']===null ? null : (int)$current['published_at']);
            $removedAt=$newState==='removed' ? $now : null;
            $q=$pdo->prepare($sql);
            $q->execute([$body,$newState,$nextRevision,$now,$publishedAt,$removedAt,$reply,$expected]);
            if ($q->rowCount()!==1) {
                $pdo->rollBack();fail('reply_version_conflict',409);
            }
            communityAdminReplyRevision($pdo,$reply,$nextRevision,$actorId,$event,$newState,$body,$now);
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction())$pdo->rollBack();
            fail('community_unavailable',503);
        }
        respond(['ok'=>true,'id'=>$reply,'state'=>$newState,'revision'=>$nextRevision]);
    }
    if ($route==='/community/admin/erase' && $verb==='POST') {
        $actor=communityMutationGuard($pdo);
        communityModerator($pdo);
        if (!communityCanErase($actor)) fail('super_admin_required',403);
        $input=jsonBody();
        $kind=$input['targetKind']??null;
        $target=$input['targetId']??null;
        $reason=$input['reasonCode']??null;
        // Deliberate two-step permanent deletion; never infer consent from ordinary "remove".
        if (!is_string($kind)||!in_array($kind,['comment','admin_reply'],true)||
            !is_string($target)||!validUuid($target)||
            !is_string($reason)||!in_array($reason,['owner_request','spam','abuse','privacy','retention','other'],true)||
            ($input['confirmation']??null)!=='ERASE') fail('invalid_erasure',400);
        $actorId=(string)$actor['id'];
        if (!rateAllowed($pdo,'community_admin_erase',$actorId,10,3600)) fail('rate_limited',429);
        try {
            $pdo->beginTransaction();
            $table=$kind==='comment' ? 'community_comments' : 'community_admin_replies';
            $q=$pdo->prepare("SELECT state FROM $table WHERE id=? FOR UPDATE");
            $q->execute([$target]);$record=$q->fetch();
            $allowed=$kind==='comment' ? ['removed','rejected'] : ['removed'];
            if (!$record||!in_array((string)$record['state'],$allowed,true)) {
                $pdo->rollBack();fail('erasure_requires_removal',409);
            }
            $affected=0;
            if ($kind==='comment') {
                $q=$pdo->prepare('SELECT COUNT(*) FROM community_admin_replies WHERE comment_id=?');
                $q->execute([$target]);$affected=(int)$q->fetchColumn();
            }
            $q=$pdo->prepare("INSERT INTO community_erasure_audit(id,target_kind,target_id,actor_account_id,reason_code,affected_reply_count,occurred_at) VALUES(?,?,?,?,?,?,?)");
            $q->execute([uuidv4(),$kind,$target,$actorId,$reason,$affected,nowTs()]);
            $q=$pdo->prepare("DELETE FROM $table WHERE id=?");
            $q->execute([$target]);
            if ($q->rowCount()!==1) {
                $pdo->rollBack();fail('erasure_conflict',409);
            }
            // The comment/reply foreign keys cascade related text and private revision snapshots.
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction())$pdo->rollBack();
            fail('community_unavailable',503);
        }
        respond(['ok'=>true,'erased'=>true,'targetKind'=>$kind]);
    }
    fail('not_found',404);
}
