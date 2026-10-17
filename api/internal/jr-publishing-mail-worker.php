<?php
declare(strict_types=1);
/**
 * Bertina cron: php /absolute/path/public_html/api/internal/jr-publishing-mail-worker.php
 * CLI only. Runs with private PHP configuration; never via an HTTP request.
 * Dispatch is best-effort but durable and retriable. A dead-letter queue
 * remains visible to the operator for manual remediation.
 */
if(PHP_SAPI!=='cli') { http_response_code(404); exit; }
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php'; // defines cfg(), db(), sendLocalMail(), etc.; returns before routing
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/publishing.php';
require_once __DIR__.'/jr-publishing-digital.php';
require_once __DIR__.'/jr-publishing-notifications.php';
require_once __DIR__.'/jr-publishing-mailer.php';
$pdo=db();
if(!$pdo||!mailReady()||!jrPublishingSchemaReady($pdo)) {
  fwrite(STDERR,"JR publishing outbox not configured\n");exit(1);
}
// A worker crash after SMTP acceptance but before status persistence makes
// the send outcome unknowable. Escalate stale leases for operator review;
// never automatically repeat an ambiguous author/buyer notification.
$expired=$pdo->exec("UPDATE publishing_notification_outbox
  SET status='dead_letter' WHERE status='processing' AND next_attempt_at<NOW()");
if($expired>0) {
  error_log('JR publishing outbox: '.(int)$expired.' ambiguous sends require manual reconciliation');
}
// A bank-settled refund is not eligible for paid-file emails. Exclude its
// queued notices at selection time so they do not starve valid orders; retain
// rows for operator reconciliation rather than silently marking them sent.
$s=$pdo->query("SELECT DISTINCT n.order_id FROM publishing_notification_outbox n
  WHERE n.status IN('queued','retry') AND n.next_attempt_at<=NOW()
    AND NOT EXISTS (SELECT 1 FROM commerce_refund_requests r
      WHERE r.order_id=n.order_id AND r.status='settled')
  ORDER BY n.order_id ASC LIMIT 20");
$total=0;
foreach($s->fetchAll(PDO::FETCH_COLUMN) as $id) {
  try { $total+=jrPubProcessOutbox($pdo,(string)$id); }
  catch(Throwable $e) { error_log('JR outbox cron '.get_class($e)); }
}
fwrite(STDOUT,'JR publishing outbox accepted deliveries: '.$total."\n");
