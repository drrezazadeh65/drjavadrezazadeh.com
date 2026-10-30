<?php
declare(strict_types=1);
/**
 * Existing-site JREI NEWS machine-to-machine transport adapter.
 * WEBSITE is the only owner of news CMS, MFA standing authority, source
 * rights, independent QA, canonical routes and original publisher receipts.
 * No browser approval, parallel CMS, arbitrary functions or image rights.
 *
 * Both fixed API routes are OFF by default. A signed intake only places
 * original text/evidence into a durable hold. It NEVER signs a CMS receipt.
 * The receipt-query route is read-only except for atomic nonce replay claims.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/internal/jrei-news/original-chat-news-signed-intake.php';

function jrNewsSignedGatewayHeaders():array {
    $fields=[
        'x-jrei-service'=>'HTTP_X_JREI_SERVICE',
        'x-jrei-timestamp'=>'HTTP_X_JREI_TIMESTAMP',
        'x-jrei-nonce'=>'HTTP_X_JREI_NONCE',
        'x-jrei-signature'=>'HTTP_X_JREI_SIGNATURE',
        'x-jrei-packet-id'=>'HTTP_X_JREI_PACKET_ID',
        'x-jrei-packet-sha256'=>'HTTP_X_JREI_PACKET_SHA256',
        'x-jrei-idempotency-key'=>'HTTP_X_JREI_IDEMPOTENCY_KEY'
    ];
    $result=[];
    foreach($fields as $header=>$server){
        $value=$_SERVER[$server]??'';
        if(!is_string($value)||strlen($value)>256)
            throw new RuntimeException('news_gateway_header_invalid');
        $result[$header]=$value;
    }
    return $result;
}

/** One original mother-DB claim; no in-process replay cache. */
function jrNewsSignedGatewayNonceClaim(PDO $pdo):callable {
    return static function(string $nonce,int $now,int $until)use($pdo):bool {
        if($now<=0||$until<=$now||$until>$now+600)return false;
        $stmt=$pdo->prepare('INSERT INTO jrei_news_site_nonces
             (nonce_sha256,issued_at,expires_at) VALUES(?,?,?)');
        try{
            $stmt->execute([hash('sha256',$nonce),$now,$until]);
            return $stmt->rowCount()===1;
        }catch(PDOException $e){
            // Duplicate or unavailable durable ledger: never reuse nonce.
            return false;
        }
    };
}

/** Atomic immutable packet reservation, NOT a factual or editorial approval. */
function jrNewsSignedGatewayReserve(PDO $pdo):callable {
    return static function(string $id,string $sha,string $requestSha)
        use($pdo):array {
        $pdo->beginTransaction();
        try{
            $query=$pdo->prepare('SELECT packet_sha256,request_sha256
                FROM jrei_news_site_packets WHERE packet_id=? FOR UPDATE');
            $query->execute([$id]);
            $existing=$query->fetch(PDO::FETCH_ASSOC);
            if(is_array($existing)){
                if(!hash_equals((string)$existing['packet_sha256'],$sha)||
                   !hash_equals((string)$existing['request_sha256'],$requestSha))
                    throw new RuntimeException('news_gateway_packet_identity_conflict');
                $pdo->commit();
                return ['state'=>'EXISTING_PACKET'];
            }
            $now=time();
            $insert=$pdo->prepare('INSERT INTO jrei_news_site_packets
                (packet_id,packet_sha256,request_sha256,state,received_at,updated_at)
                VALUES(?,?,?,\'RECEIVING\',?,?)');
            $insert->execute([$id,$sha,$requestSha,$now,$now]);
            $pdo->commit();
            return ['state'=>'NEW_HELD_FOR_ORIGINAL_QA'];
        }catch(Throwable $e){
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
    };
}

/** The original CMS has no pre-authorised packet->publication mapping.
 * A future ORIGINAL service must bind that mapping only after actual QA.
 * Never turn a source-draft hash, a client flag or a filesystem guess into
 * a fabricated PUBLISHED_BILINGUAL_CMS_VERIFIED response.
 */
function jrNewsSignedGatewayReceiptStatus(PDO $pdo,string $id,string $sha):array {
    $q=$pdo->prepare('SELECT packet_sha256,state,verified_publication_id
        FROM jrei_news_site_packets WHERE packet_id=? LIMIT 1');
    $q->execute([$id]);
    $row=$q->fetch(PDO::FETCH_ASSOC);
    if(!is_array($row))
        return ['state'=>'NO_ORIGINAL_CMS_PUBLICATION_RECEIPT',
                'published'=>false,'article_resubmitted'=>false];
    if(!hash_equals((string)$row['packet_sha256'],$sha))
        throw new RuntimeException('news_gateway_receipt_packet_hash_mismatch');
    // Even a future ORIGINAL_CMS_VERIFIED ledger state cannot substitute for
    // independent on-disk original CMS receipt verification. This source
    // adapter deliberately does not sign until that service is connected.
    return ['state'=>'ORIGINAL_INDEPENDENT_RECEIPT_VERIFICATION_PENDING',
            'published'=>false,'article_resubmitted'=>false,
            'original_mother_db_state'=>(string)$row['state']];
}

function jrNewsSignedGatewayRoute(string $path,string $verb):never {
    $intake='/jrei/v1/news-intake';
    $receipt='/jrei/v1/news-receipt';
    if(!in_array($path,[$intake,$receipt],true))fail('not_found',404);
    if($verb!=='POST')fail('method_not_allowed',405);

    $cfg=cfg();
    $key=(string)($cfg['jrei_news_site_gateway_hmac_key']??'');
    if(($cfg['jrei_news_site_gateway_enabled']??false)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['jrei_news_standing_official_publishing_enabled']??false)!==true||
       strlen($key)<32)
        fail('jrei_news_gateway_not_activated',503);

    $uri=(string)($_SERVER['REQUEST_URI']??'');
    $exact='/api'. $path;
    if($uri!==$exact)fail('news_gateway_exact_route_required',404);
    $raw=file_get_contents('php://input',false,null,0,8000001);
    if(!is_string($raw)||strlen($raw)>8000000)
        fail('news_gateway_request_size_invalid',413);
    try{
        $pdo=db();
        if(!$pdo instanceof PDO)
            throw new RuntimeException('news_gateway_mother_db_unavailable');
        $headers=jrNewsSignedGatewayHeaders();
        $claim=jrNewsSignedGatewayNonceClaim($pdo);
        if($path===$receipt){
            $query=jrNewsChatVerifySignedReceiptQuery(
                $verb,$exact,$headers,$raw,$exact,$key,time(),$claim);
            $status=jrNewsSignedGatewayReceiptStatus(
                $pdo,$query['packetId'],$query['packetSha256']);
            respond($status,200);
        }
        $verified=jrNewsChatVerifySignedIntake(
            $verb,$exact,$headers,$raw,$exact,$key,time(),$claim,
            jrNewsSignedGatewayReserve($pdo));
        $stored=[
            'schema'=>'jr.jrei.news-site-original-received.v1',
            'packet_id'=>$verified['packetId'],
            'draft_id'=>$verified['draftId'],
            // These are still client-provided; the original source registry,
            // claim QA, independent model and rights policy must recheck.
            'source_versions_unverified'=>$verified['sourceVersions'],
            'fa_unverified'=>$verified['fa'],
            'en_unverified'=>$verified['en'],
            'seo_proposal_unverified'=>$verified['seoProposal'],
            'image_rights_verified'=>false,
            'image_bytes_saved'=>false,
            'source_rights_verified'=>false,
            'original_independent_qa_verified'=>false,
            'standing_original_cms_publication_authorized'=>false
        ];
        $json=json_encode($stored,JSON_THROW_ON_ERROR|
            JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        if(strlen($json)>170000)
            throw new RuntimeException('news_gateway_held_packet_too_large');
        if($verified['state']==='NEW_HELD_FOR_ORIGINAL_QA'){
            $stmt=$pdo->prepare('UPDATE jrei_news_site_packets
                SET editorial_json=?,state=\'HELD_FOR_ORIGINAL_INDEPENDENT_QA\',
                    updated_at=?
                WHERE packet_id=? AND packet_sha256=? AND state=\'RECEIVING\'');
            $stmt->execute([$json,time(),$verified['packetId'],
                $verified['packetSha256']]);
            if($stmt->rowCount()!==1)
                throw new RuntimeException('news_gateway_hold_transition_failed');
        }
        respond([
            'state'=>'HELD_FOR_ORIGINAL_INDEPENDENT_QA',
            'packet_id'=>$verified['packetId'],
            'published'=>false,'original_cms_receipt'=>null,
            'automatic_source_and_qa_reconciliation_required'=>true,
            'manual_article_publish_required'=>false
        ],202);
    }catch(Throwable $e){
        // Do not expose raw source, private service keys, SQL or paths.
        fail('news_gateway_signed_intake_or_receipt_hold',503);
    }
}
