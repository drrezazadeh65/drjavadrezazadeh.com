<?php
declare(strict_types=1);
/**
 * JREI public-only search indexer. SOURCE-ONLY; never publish through this.
 * Invoked exclusively by original authenticated CMS after real publication
 * receipt and independently checked canonical language pages are available.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/candidate-intake.php';

function jrNewsIndexApprovedPublication(
    PDO $pdo,string $publicationId,string $language,
    callable $verifyOriginalPublisherReceipt,int $indexedAt
): array {
    if (!preg_match('/^[a-f0-9-]{36}$/iD',$publicationId)||
        !in_array($language,['fa','en'],true)||$indexedAt<=0) {
        throw new InvalidArgumentException('news_search_index_id_invalid');
    }
    $pdo->beginTransaction();
    try {
        $stmt=$pdo->prepare(
            "SELECT p.publication_id,p.publisher_state,p.published_at,
                    p.fa_route,p.en_route,p.fa_content_sha256,
                    p.en_content_sha256,p.publisher_receipt_reference,
                    v.bilingual_editorial_json,v.approval_digest,
                    c.event_type,m.category_code,d.action_code
             FROM jrei_news_publications p
             JOIN jrei_news_editorial_versions v ON v.revision_id=p.revision_id
             JOIN jrei_news_candidates c ON c.candidate_id=v.candidate_id
             JOIN jrei_news_monitors m ON m.monitor_id=c.monitor_id
             JOIN jrei_news_owner_decisions d ON d.decision_id=p.approved_decision_id
             WHERE p.publication_id=? FOR UPDATE"
        );
        $stmt->execute([$publicationId]);
        $row=$stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row||$row['publisher_state']!=='PUBLISHED'||
            $row['action_code']!=='APPROVE'||
            empty($row['publisher_receipt_reference'])||
            empty($row['published_at'])) {
            throw new RuntimeException('news_search_unpublished_or_unapproved');
        }
        $path=$row[$language.'_route'];
        $contentHash=$row[$language.'_content_sha256'];
        if (!is_string($path)||
            !preg_match('#^/'.$language.'/[a-z0-9/-]+/$#D',$path)||
            str_contains($path,'//')||
            !is_string($contentHash)||
            !preg_match('/^[a-f0-9]{64}$/D',$contentHash)) {
            throw new RuntimeException('news_search_route_or_hash_invalid');
        }
        // Re-read trusted CMS signer and exact original live content hash.
        $receipt=$verifyOriginalPublisherReceipt(
            $row['publisher_receipt_reference'],$path,$contentHash
        );
        if (!is_array($receipt)||
            ($receipt['source']??null)!=='ORIGINAL_AUTHENTICATED_CMS'||
            ($receipt['verified']??null)!==true||
            ($receipt['route']??null)!==$path||
            ($receipt['contentSha256']??null)!==$contentHash||
            ($receipt['ownerApprovalDigest']??null)!==$row['approval_digest']) {
            throw new RuntimeException('news_search_live_publisher_unverified');
        }
        $data=json_decode((string)$row['bilingual_editorial_json'],true,
            32,JSON_INVALID_UTF8_SUBSTITUTE);
        $copy=is_array($data)?($data[$language]??null):null;
        if (!is_array($copy)||
            !is_string($copy['headline']??null)||
            !is_string($copy['summary']??null)||
            !is_string($copy['body']??null)||
            strlen($copy['headline'])>720||
            strlen($copy['summary'])>4000||
            strlen($copy['body'])>180000) {
            throw new RuntimeException('news_search_language_payload_invalid');
        }
        $query=$pdo->prepare(
            'SELECT document_id,publication_id
             FROM jrei_news_search_documents WHERE public_route=? FOR UPDATE'
        );
        $query->execute([$path]);
        $collision=$query->fetch(PDO::FETCH_ASSOC);
        if ($collision&&$collision['publication_id']!==$publicationId) {
            throw new RuntimeException('news_search_frozen_route_collision');
        }
        $query=$pdo->prepare(
            'SELECT document_id FROM jrei_news_search_documents
             WHERE publication_id=? AND language_code=? FOR UPDATE'
        );
        $query->execute([$publicationId,$language]);
        $existing=$query->fetchColumn();
        $cleanBody=preg_replace('/<[^>]*>/u',' ',(string)$copy['body']);
        if (!is_string($cleanBody)) $cleanBody=$copy['body'];
        $params=[$path,$copy['headline'],$copy['summary'],
            $cleanBody,(string)$row['category_code'],
            (string)$row['event_type'],(string)$row['approval_digest'],
            $contentHash,(int)$row['published_at'],$indexedAt];
        if ($existing) {
            $pdo->prepare(
                "UPDATE jrei_news_search_documents SET
                 public_route=?,title=?,summary=?,searchable_body=?,
                 category_code=?,event_code=?,owner_approval_digest=?,
                 content_sha256=?,published_at=?,indexed_at=?,
                 index_state='PUBLISHED'
                 WHERE document_id=? AND publication_id=? AND language_code=?"
            )->execute(array_merge($params,[$existing,$publicationId,$language]));
            $id=$existing;
        } else {
            $id=jrNewsPrivateUuid();
            $pdo->prepare(
                "INSERT INTO jrei_news_search_documents
                 (document_id,publication_id,language_code,public_route,
                  title,summary,searchable_body,category_code,event_code,
                  owner_approval_digest,content_sha256,published_at,
                  indexed_at,index_state)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'PUBLISHED')"
            )->execute(array_merge([$id,$publicationId,$language],$params));
        }
        $pdo->commit();
        return ['schema'=>'jr.jrei.news-search-index-receipt.v1',
            'documentId'=>$id,'publicationId'=>$publicationId,
            'language'=>$language,'publishedRoute'=>$path,
            'sourceVerifiedByOriginalPublisher'=>true,
            'publicSearchEligible'=>true,'siteDeploymentPerformed'=>false];
    }catch(Throwable $e){
        if ($pdo->inTransaction())$pdo->rollBack();
        throw $e;
    }
}
