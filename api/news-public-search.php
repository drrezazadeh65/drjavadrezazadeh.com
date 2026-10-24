<?php
declare(strict_types=1);
/**
 * Read-only JREI News search endpoint for the ORIGINAL Bertina API.
 * Mount is safe when explicitly provisioned: feature remains disabled
 * until owner-authorized activation through existing private config.
 * 
 * This does NOT include owner queues, source acquisition, models, SMS,
 * SMTP, newsletter, logins, billing or JREI private evidence.
 * All results originate in the owner-approved published-only index.
 */
if(!defined('BERTINA_API_BOOTSTRAPPED')){http_response_code(404);exit;}

function jrNewsPublicSearchRoute(string $method): never {
    header('Cache-Control: no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');
    if($method!=='GET')fail('method_not_allowed',405);
    $configuration=cfg();
    // Deliberately separate permission from existence of news DB tables.
    if(($configuration['jrei_news_search_enabled']??false)!==true||
       ($configuration['jrei_news_publisher_receipts_accepted']??false)!==true) {
        fail('news_search_not_enabled',503);
    }
    $pdo=db();
    if(!$pdo instanceof PDO)fail('news_search_unavailable',503);
    if(!rateAllowed($pdo,'jrei_news_public_search','public',20,300)){
        fail('news_search_rate_limited',429);
    }
    // Reject unknown keys before touching any indexed public content.
    $allowed=['q','language','country','category','after','before'];
    foreach($_GET as $key=>$value){
        if(!is_string($key)||!in_array($key,$allowed,true)||
           !is_string($value)||strlen($value)>260) {
            fail('news_search_query_invalid',400);
        }
    }
    if(strlen((string)($_SERVER['QUERY_STRING']??''))>1600)
        fail('news_search_query_invalid',400);
    $q=$_GET['q']??'';
    $locale=$_GET['language']??'fa';
    if(!is_string($q)||trim($q)===''||strlen($q)>220||
       !is_string($locale)||!in_array($locale,['fa','en'],true)) {
        fail('news_search_query_invalid',400);
    }
    $filters=[];
    if(isset($_GET['category'])&&$_GET['category']!=='')
        $filters['category']=$_GET['category'];
    if(isset($_GET['country'])&&$_GET['country']!=='')
        $filters['country']=strtoupper($_GET['country']);
    foreach(['after','before'] as $key){
        if(!isset($_GET[$key])||$_GET[$key]==='')continue;
        if(!preg_match('/^[0-9]{1,10}$/D',$_GET[$key])||
           (int)$_GET[$key]>4102444800) {
            fail('news_search_date_invalid',400);
        }
        $filters[$key]=(int)$_GET[$key];
    }
    if(isset($filters['after'],$filters['before'])&&
       $filters['after']>$filters['before'])
        fail('news_search_date_invalid',400);
    // The original build explicitly packages ONLY this reviewed PHP read
    // model into api/internal/, which is blocked from direct HTTP access.
    require_once __DIR__.'/internal/jrei-news/public-read-model.php';
    try{
        respond(jrNewsPublishedSearch($pdo,$q,$locale,20,$filters));
    }catch(InvalidArgumentException $e){
        fail('news_search_query_invalid',400);
    }catch(Throwable $e){
        // Never disclose SQL table names, database configuration or drafts.
        error_log('JREI news public search failed: '.get_class($e));
        fail('news_search_unavailable',503);
    }
}
