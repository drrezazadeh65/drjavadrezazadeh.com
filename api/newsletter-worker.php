<?php
declare(strict_types=1);
/**
 * Bertina CLI-only mailing worker. Deployed with the existing PHP API, but
 * never remotely executable over HTTP. Activation and cron are separately
 * controlled by the site owner in private host configuration.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
if(getenv('JR_NEWSLETTER_DELIVERY_ENABLED')!=='true' ||
   getenv('JR_NEWSLETTER_EDITORIAL_APPROVED')!=='true'){
    fwrite(STDERR,"Newsletter worker is disabled by production policy.\n");
    exit(2);
}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once __DIR__.'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/newsletter-preferences.php';
require_once __DIR__.'/newsletter-delivery.php';
if(!mailReady()) {fwrite(STDERR,"Newsletter SMTP transport not ready.\n");exit(2);}
$pdo=db();
if(!$pdo||!jrNewsletterOutboundSchemaReady($pdo)){
    fwrite(STDERR,"Newsletter mother-database migration not verified.\n");exit(2);
}
$lock=$pdo->query("SELECT GET_LOCK('jr-newsletter-send-single-worker',0)")->fetchColumn();
if((int)$lock!==1){fwrite(STDERR,"Another newsletter worker is active.\n");exit(2);}
$processed=0;$accepted=0;
try{
    // Never select another module's transactional/security notifications.
    // Rows require the owner-verified published-page object reference.
    $stmt=$pdo->query("SELECT n.id FROM eco_notifications n
       JOIN eco_object_refs o ON o.id=n.message_object_id
       WHERE n.delivery_state='PENDING' AND n.channel_code='EMAIL'
         AND n.purpose_code='ARTICLES'
         AND o.storage_provider='JR_NEWSLETTER_PUBLISHED_PAGE'
         AND o.data_class='PUBLIC'
       ORDER BY n.created_at ASC,n.id ASC LIMIT 5");
    foreach($stmt->fetchAll(PDO::FETCH_COLUMN) as $id){
        $result=jrNewsletterDispatchOne($pdo,(string)$id,
            static fn(string $to,string $subject,string $body):bool =>
                sendLocalMail($to,$subject,$body));
        $processed++;
        if($result==='SMTP_ACCEPTED')$accepted++;
        // No automatic retries for uncertain or rejected deliveries.
        echo "Newsletter attempt outcome: ".$result."\n";
    }
}finally{
    $pdo->query("SELECT RELEASE_LOCK('jr-newsletter-send-single-worker')");
}
echo "Newsletter worker completed; processed: ".$processed."; SMTP accepted: ".$accepted.
    "; inbox receipt not certified.\n";
