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
        return true;
    } catch (Throwable $e) { return false; }
}
function communityCanonical(mixed $v): ?string {
    if (!is_string($v) || strlen($v)>180) return null;
    if (preg_match('#^/fa/akhbar/([a-z0-9](?:[a-z0-9-]{1,87}[a-z0-9])?)/$#D', $v, $matches) !== 1) return null;
    $root=realpath(dirname(__DIR__).'/fa/akhbar');
    $article=$root ? realpath($root.'/'.$matches[1].'/index.html') : false;
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
function communityRoute(string $route,string $verb): never {
    $pdo=db();
    if (!$pdo || !communityAvailable($pdo)) fail('community_unavailable',503);
    if ($route==='/community/comments' && $verb==='GET') {
        $page=communityCanonical($_GET['page']??null);
        if ($page===null) fail('invalid_page',400);
        $query=$pdo->prepare("SELECT id,body_text,rating,created_at FROM community_comments WHERE page_path=? AND state='approved' ORDER BY created_at DESC,id DESC LIMIT 20");
        $query->execute([$page]);
        $data=array_map(static fn($x)=>[
            'id'=>(string)$x['id'],
            'body'=>(string)$x['body_text'],
            'rating'=>$x['rating']===null?null:(int)$x['rating'],
            'createdAt'=>(int)$x['created_at'],
            'authorLabel'=>'Verified reader'
        ],$query->fetchAll());
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
        $page=communityCanonical($pageBody['page']??null);
        if ($page===null) fail('invalid_page',400);
        $content=$pageBody['body']??null;
        if (!is_string($content)) fail('invalid_comment',400);
        $content=trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u','',$content)??'');
        if (textLen($content)<12 || textLen($content)>2000 || strlen($content)>6000) fail('invalid_comment',400);
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
        communityModerator($pdo);
        $q=$pdo->query("SELECT id,page_path,body_text,rating,created_at FROM community_comments WHERE state='pending' ORDER BY created_at ASC,id ASC LIMIT 30");
        $queue=array_map(static fn($x)=>[
            'id'=>(string)$x['id'],'page'=>(string)$x['page_path'],
            'body'=>(string)$x['body_text'],'rating'=>$x['rating']===null?null:(int)$x['rating'],
            'createdAt'=>(int)$x['created_at']
        ],$q->fetchAll());
        respond(['ok'=>true,'schema'=>'community-moderation-v1','pending'=>$queue]);
    }
    if ($route==='/community/moderation' && $verb==='POST') {
        $actor=communityMutationGuard($pdo);
        communityModerator($pdo);
        $input=jsonBody();
        $comment=$input['id']??null;$decision=$input['decision']??null;
        if (!is_string($comment)||!validUuid($comment)||!in_array($decision,['approved','rejected'],true)) fail('invalid_moderation',400);
        $now=nowTs();
        try {
            $pdo->beginTransaction();
            $q=$pdo->prepare("UPDATE community_comments SET state=?,reviewed_at=?,reviewer_account_id=? WHERE id=? AND state='pending'");
            $q->execute([$decision,$now,(string)$actor['id'],$comment]);
            if ($q->rowCount()!==1) {$pdo->rollBack();fail('not_pending',409);}
            $pdo->prepare("INSERT INTO community_moderation_audit(id,comment_id,actor_account_id,action,created_at) VALUES(?,?,?,?,?)")->execute([uuidv4(),$comment,(string)$actor['id'],$decision,$now]);
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction())$pdo->rollBack();
            fail('community_unavailable',503);
        }
        respond(['ok'=>true,'state'=>$decision]);
    }
    fail('not_found',404);
}
