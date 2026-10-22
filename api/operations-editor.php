<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Private editorial workbench: structured draft storage only. Drafts never
 * publish, modify public URLs, invoke AI or overwrite repository files.
 * Every save creates a version in the ONE operations MySQL database.
 */
function operationsEditorReady(PDO $pdo): bool {
    try {
        $pdo->query('SELECT 1 FROM operations_content_drafts LIMIT 1');
        $pdo->query('SELECT 1 FROM operations_content_revisions LIMIT 1');
        return true;
    } catch(Throwable $e) {return false;}
}
function operationsEditorList(PDO $pdo): array {
    $q=$pdo->query("SELECT id,language,content_type,title,status,version,updated_at,media_path
       FROM operations_content_drafts ORDER BY updated_at DESC,id DESC LIMIT 100");
    return ['ok'=>true,'schema'=>'operations-editor-drafts-v1',
        'drafts'=>array_map(static fn($r)=>[
            'id'=>$r['id'],'language'=>$r['language'],'contentType'=>$r['content_type'],
            'title'=>$r['title'],'status'=>$r['status'],'version'=>(int)$r['version'],
            'updatedAt'=>(int)$r['updated_at'],'mediaPath'=>$r['media_path']],
            $q->fetchAll(PDO::FETCH_ASSOC)),
        'publicationState'=>'drafts_only',
        'limitation'=>'Saving a draft does not publish a page, send a newsletter or modify SEO URLs.'];
}
function operationsEditorOpen(PDO $pdo,string $id): array {
    if(!preg_match('/^[a-f0-9]{32}$/D',$id))throw new InvalidArgumentException('invalid_draft_id');
    $q=$pdo->prepare('SELECT id,language,content_type,title,body_markdown,seo_title,seo_description,media_path,status,version,updated_at FROM operations_content_drafts WHERE id=?');
    $q->execute([$id]);$r=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($r))throw new DomainException('draft_not_found');
    $q=$pdo->prepare('SELECT version,created_at FROM operations_content_revisions WHERE draft_id=? ORDER BY version DESC LIMIT 20');
    $q->execute([$id]);
    return ['ok'=>true,'schema'=>'operations-editor-draft-v1','draft'=>[
        'id'=>$r['id'],'language'=>$r['language'],'contentType'=>$r['content_type'],
        'title'=>$r['title'],'bodyMarkdown'=>$r['body_markdown'],
        'seoTitle'=>$r['seo_title'],'seoDescription'=>$r['seo_description'],
        'mediaPath'=>$r['media_path'],'status'=>$r['status'],
        'version'=>(int)$r['version'],'updatedAt'=>(int)$r['updated_at']],
        'revisions'=>array_map(static fn($v)=>['version'=>(int)$v['version'],
            'createdAt'=>(int)$v['created_at']],$q->fetchAll(PDO::FETCH_ASSOC)),
        'publicationState'=>'drafts_only'];
}
function operationsEditorMedia(): array {
    $source=dirname(__DIR__).'/assets/media-registry.json';
    $raw=@file_get_contents($source);
    $data=is_string($raw)&&strlen($raw)<524288?json_decode($raw,true):null;
    if(!is_array($data)||!is_array($data['assets']??null))
        return ['ok'=>true,'schema'=>'operations-editor-media-v1','state'=>'unavailable',
            'assets'=>[],'limitation'=>'Canonical media registry is unavailable.'];
    $assets=[];
    foreach($data['assets'] as $asset){
        if(!is_array($asset))continue;
        $path=(string)($asset['path']??'');
        if(!preg_match('#^assets/images/[A-Za-z0-9/_\-.]+\.(svg|png|jpe?g|webp|avif)$#Di',$path)
            ||str_contains($path,'..')||empty($asset['rights'])
            ||!str_contains(strtolower((string)$asset['rights']),'approved'))continue;
        $assets[]=[
            'path'=>$path,'kind'=>(string)($asset['kind']??''),
            'role'=>(string)($asset['role']??''),
            'altFa'=>(string)($asset['alt_fa']??''),
            'altEn'=>(string)($asset['alt_en']??''),
            'compositionLocked'=>!empty($asset['composition_locked']),
            'sourceStatus'=>(string)($asset['source_status']??'unverified'),
        ];
        if(count($assets)>=500)break;
    }
    return ['ok'=>true,'schema'=>'operations-editor-media-v1','state'=>'catalogued',
        'assets'=>$assets,
        'limitation'=>'This is the approved existing gallery, not a binary upload, image transformation or publication endpoint.'];
}
function operationsEditorSave(PDO $pdo,array $input,string $actor,int $at): array {
    $keys=['id','baseVersion','language','contentType','title','bodyMarkdown','seoTitle','seoDescription','mediaPath','status'];
    if(array_keys($input)!==$keys)throw new InvalidArgumentException('invalid_editor_payload');
    foreach($keys as $key)if(!array_key_exists($key,$input))throw new InvalidArgumentException('invalid_editor_payload');
    if(!is_string($input['id'])||($input['id']!==''&&!preg_match('/^[a-f0-9]{32}$/D',$input['id']))
        ||!is_int($input['baseVersion'])||$input['baseVersion']<0
        ||!in_array($input['language'],['fa','en'],true)
        ||!in_array($input['contentType'],['article','news','page','newsletter','book-description'],true)
        ||!in_array($input['status'],['draft','archived'],true))
        throw new InvalidArgumentException('invalid_editor_payload');
    foreach(['title'=>180,'bodyMarkdown'=>60000,'seoTitle'=>180,'seoDescription'=>360,'mediaPath'=>240] as $key=>$max){
        if(!is_string($input[$key])||strlen($input[$key])>$max||
            str_contains($input[$key],"\0"))throw new InvalidArgumentException('invalid_editor_payload');
    }
    if(trim($input['title'])==='')throw new InvalidArgumentException('invalid_editor_title');
    $media=(string)$input['mediaPath'];
    if($media!==''&&!preg_match('#^assets/images/[A-Za-z0-9/_\-.]+\.(svg|png|jpe?g|webp|avif)$#Di',$media))
        throw new InvalidArgumentException('invalid_editor_media');
    if($media!==''){
        $canonical=operationsEditorMedia();
        if(!in_array($media,array_column($canonical['assets'],'path'),true))
            throw new InvalidArgumentException('unapproved_editor_media');
    }
    $id=$input['id']?:bin2hex(random_bytes(16));
    $pdo->beginTransaction();
    try{
        $q=$pdo->prepare('SELECT version FROM operations_content_drafts WHERE id=? FOR UPDATE');
        $q->execute([$id]);$existing=$q->fetch(PDO::FETCH_ASSOC);
        $version=$existing?(int)$existing['version']:0;
        if($version!==$input['baseVersion']||(!$existing&&$input['id']!==''))
            throw new DomainException('draft_version_conflict');
        $next=$version+1;
        if($existing){
            $q=$pdo->prepare('UPDATE operations_content_drafts SET language=?,content_type=?,title=?,body_markdown=?,seo_title=?,seo_description=?,media_path=?,status=?,version=?,updated_at=?,updated_by=? WHERE id=?');
            $q->execute([$input['language'],$input['contentType'],$input['title'],$input['bodyMarkdown'],
                $input['seoTitle'],$input['seoDescription'],$media?:null,$input['status'],$next,$at,$actor,$id]);
        }else{
            $q=$pdo->prepare('INSERT INTO operations_content_drafts
              (id,language,content_type,title,body_markdown,seo_title,seo_description,media_path,status,version,created_at,updated_at,updated_by)
              VALUES (?,?,?,?,?,?,?,?,?,1,?,?,?)');
            $q->execute([$id,$input['language'],$input['contentType'],$input['title'],$input['bodyMarkdown'],
                $input['seoTitle'],$input['seoDescription'],$media?:null,$input['status'],$at,$at,$actor]);
        }
        $q=$pdo->prepare('INSERT INTO operations_content_revisions(draft_id,version,title,body_markdown,seo_title,seo_description,media_path,status,created_at,actor_id) VALUES(?,?,?,?,?,?,?,?,?,?)');
        $q->execute([$id,$next,$input['title'],$input['bodyMarkdown'],$input['seoTitle'],$input['seoDescription'],
            $media?:null,$input['status'],$at,$actor]);
        operationsAudit($pdo,$actor,'editor_draft_saved',substr(hash('sha256',$id),0,64));
        $pdo->commit();
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
    return ['ok'=>true,'schema'=>'operations-editor-save-v1','id'=>$id,
        'version'=>$next,'status'=>$input['status'],'published'=>false,'savedAt'=>$at];
}
