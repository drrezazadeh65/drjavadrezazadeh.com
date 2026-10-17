<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
/**
 * JR Future Publishing — verified author-only, READ-ONLY dashboard.
 * The file is additive to the existing Bertina app and cannot enable checkout,
 * author enrollment, payment or any financial disbursement.
 * Real author verification + reviewed private schema migration required.
 */
function jrPublishingSchemaReady(PDO $pdo): bool {
    try {
        $required=['publishing_authors','publishing_author_accounts','publishing_works',
          'publishing_work_versions','publishing_review_decisions','publishing_rights_licences',
          'publishing_offers','publishing_sale_allocation_entries','publishing_author_settlements',
          'publishing_private_assets','publishing_digital_access_grants',
          'publishing_notification_outbox','publishing_audit_events','commerce_orders','commerce_payment_claims'];
        $s=$pdo->query('SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
        $engines=[];
        foreach($s->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $engines[(string)$row['TABLE_NAME']]=(string)$row['ENGINE'];
        }
        foreach($required as $table) {
            if(strcasecmp((string)($engines[$table]??''),'InnoDB')!==0) return false;
        }
        return true;
    } catch(Throwable $e) {
        error_log('Publishing schema preflight unavailable: '.get_class($e));
        return false;
    }
}
function jrPublishingAuthorRoute(string $path,string $verb): never {
    header('Cache-Control: no-store, private, max-age=0');
    header('Pragma: no-cache');
    header('X-Robots-Tag: noindex, noarchive, nosnippet');
    if($verb!=='GET'||$path!=='/publishing/author/overview') fail('route_not_found',404);
    if(!authReady()) fail('author_portal_unavailable',503);
    $pdo=db();
    if(!$pdo||!jrPublishingSchemaReady($pdo)) fail('author_portal_unavailable',503);
    $account=sessionAccount($pdo);
    if(!$account||($account['status']??'')!=='active'||empty($account['email_verified_at']))
        fail('unauthorized',401);
    try {
        $authors=$pdo->prepare("SELECT a.id,a.slug,a.display_name_fa,a.display_name_en
            FROM publishing_author_accounts l
            JOIN publishing_authors a ON a.id=l.author_id
            WHERE l.account_id=? AND l.role='author' AND l.approved_at IS NOT NULL
              AND l.revoked_at IS NULL AND a.status='approved'
            ORDER BY a.display_name_fa ASC LIMIT 30");
        $authors->execute([(string)$account['id']]);
        $rows=$authors->fetchAll(PDO::FETCH_ASSOC);
        if(!$rows) fail('author_access_not_approved',403);
        $earnings=$pdo->prepare("SELECT
            COUNT(DISTINCT CASE WHEN e.entry_kind='author_share' THEN e.order_id END) AS verified_paid_orders,
            COALESCE(SUM(CASE WHEN e.entry_kind IN ('author_share','author_reversal') THEN e.amount_toman ELSE 0 END),0) AS author_accrued_toman,
            COALESCE(SUM(CASE WHEN e.entry_kind IN ('talent_fund','fund_reversal') THEN e.amount_toman ELSE 0 END),0) AS fund_earmarked_toman
            FROM publishing_sale_allocation_entries e
            JOIN commerce_orders o ON o.id=e.order_id AND o.state='paid'
            JOIN commerce_payment_claims c ON c.order_id=o.id AND c.provider='bitpay'
            WHERE e.author_id=?");
        $settled=$pdo->prepare("SELECT COALESCE(SUM(amount_toman),0) AS bank_settled_toman
            FROM publishing_author_settlements WHERE author_id=? AND status='bank_verified'");
        $works=$pdo->prepare("SELECT id,public_slug,title_fa,publication_status,scientific_review
            FROM publishing_works WHERE author_id=?
            ORDER BY created_at DESC LIMIT 100");
        $out=[];
        foreach($rows as $row) {
            $id=(string)$row['id'];
            $earnings->execute([$id]);$totals=$earnings->fetch(PDO::FETCH_ASSOC)?:[];
            $settled->execute([$id]);$bank=$settled->fetch(PDO::FETCH_ASSOC)?:[];
            $works->execute([$id]);$items=$works->fetchAll(PDO::FETCH_ASSOC);
            $accrued=(int)($totals['author_accrued_toman']??0);
            $sent=(int)($bank['bank_settled_toman']??0);
            $out[]=[
              'id'=>$id,
              'slug'=>(string)$row['slug'],
              'displayNameFa'=>(string)$row['display_name_fa'],
              'displayNameEn'=>(string)$row['display_name_en'],
              'verifiedPaidOrders'=>(int)($totals['verified_paid_orders']??0),
              'authorAccruedToman'=>$accrued,
              'talentFundEarmarkedToman'=>(int)($totals['fund_earmarked_toman']??0),
              'authorBankSettledToman'=>$sent,
              'authorUnsettledToman'=>max(0,$accrued-$sent),
              'works'=>array_map(static function(array $v): array {
                  return ['id'=>(string)$v['id'],'slug'=>(string)$v['public_slug'],
                      'title'=>(string)$v['title_fa'],'publicationStatus'=>(string)$v['publication_status'],
                      'scientificReview'=>(string)$v['scientific_review']];
              },$items)
            ];
        }
        respond(['ok'=>true,'service'=>'jr-future-publishing',
            'currency'=>'IRT','amountUnit'=>'toman','authors'=>$out,
            'note'=>'Earmarked is not disbursed; accrued is not bank settled.']);
    } catch(Throwable $e) {
        error_log('Publishing private overview error: '.get_class($e));
        fail('author_portal_unavailable',503);
    }
}
