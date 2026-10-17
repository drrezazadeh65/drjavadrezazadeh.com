<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/publishing-onboarding.php';
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
          'publishing_notification_outbox','publishing_audit_events',
          'publishing_author_contracts','publishing_contract_signature_evidence',
          'publishing_platform_cost_entries','publishing_platform_funding_entries',
          'commerce_orders','commerce_payment_claims','commerce_refund_requests'];
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
    if(str_starts_with($path,'/publishing/author/onboarding')) jrPubAuthorOnboardingRoute($path,$verb);
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
              AND l.revoked_at IS NULL AND a.status IN('verification_pending','approved')
            ORDER BY a.display_name_fa ASC LIMIT 30");
        $authors->execute([(string)$account['id']]);
        $rows=$authors->fetchAll(PDO::FETCH_ASSOC);
        if(!$rows) fail('author_access_not_approved',403);
        $earnings=$pdo->prepare("SELECT
            COUNT(DISTINCT CASE WHEN e.entry_kind='author_share' THEN e.order_id END) AS verified_paid_orders,
            COALESCE(SUM(CASE WHEN e.entry_kind IN ('author_share','author_reversal') THEN e.amount_toman ELSE 0 END),0) AS author_accrued_toman,
            COALESCE(SUM(CASE WHEN e.entry_kind IN ('talent_fund','fund_reversal') THEN e.amount_toman ELSE 0 END),0) AS fund_earmarked_toman
            FROM publishing_sale_allocation_entries e
            JOIN commerce_orders o ON o.id=e.order_id AND o.state='paid' AND o.currency='IRT' AND o.paid_at IS NOT NULL
            JOIN commerce_payment_claims c ON c.order_id=o.id AND c.provider='bitpay'
              AND c.transaction_id=o.provider_trans_id AND c.verified_amount=o.provider_amount
            WHERE e.author_id=?");
        $settled=$pdo->prepare("SELECT COALESCE(SUM(amount_toman),0) AS bank_settled_toman
            FROM publishing_author_settlements WHERE author_id=? AND status='bank_verified'");
        $works=$pdo->prepare("SELECT id,public_slug,title_fa,publication_status,scientific_review
            FROM publishing_works WHERE author_id=?
            ORDER BY created_at DESC LIMIT 100");
        $reserve=$pdo->prepare("SELECT
           COALESCE(SUM(c.reserve_amount_toman),0) AS reserved_toman
           FROM publishing_platform_cost_entries c
           JOIN publishing_offers f ON f.id=c.offer_id
           JOIN publishing_works w ON w.id=f.work_id
           JOIN commerce_orders o ON o.id=c.order_id AND o.state='paid' AND o.currency='IRT' AND o.paid_at IS NOT NULL
           JOIN commerce_payment_claims p ON p.order_id=o.id AND p.provider='bitpay'
             AND p.transaction_id=o.provider_trans_id AND p.verified_amount=o.provider_amount
           WHERE w.author_id=?");
        $funding=$pdo->prepare("SELECT
           COALESCE(SUM(CASE WHEN a.funding_state='bank_reconciled' THEN a.amount_toman ELSE 0 END),0) AS reconciled_toman
           FROM publishing_platform_funding_entries a
           JOIN publishing_platform_cost_entries c ON c.id=a.cost_entry_id
           JOIN publishing_offers f ON f.id=c.offer_id
           JOIN publishing_works w ON w.id=f.work_id
           WHERE w.author_id=?");
        // A settled refund and its allocation reversal are independent facts.
        // Surface unmatched refund obligations instead of silently reporting them as clean earnings.
        $refunds=$pdo->prepare("SELECT COUNT(*) AS unreconciled_count FROM (
           SELECT e.order_id FROM publishing_sale_allocation_entries e
           WHERE e.author_id=?
             AND EXISTS (SELECT 1 FROM commerce_refund_requests r
               WHERE r.order_id=e.order_id AND r.status='settled')
           GROUP BY e.order_id
           HAVING SUM(CASE WHEN e.entry_kind IN ('author_share','author_reversal')
               THEN e.amount_toman ELSE 0 END)<>0
              OR SUM(CASE WHEN e.entry_kind IN ('talent_fund','fund_reversal')
               THEN e.amount_toman ELSE 0 END)<>0
        ) unresolved_refunds");
        $contracts=$pdo->prepare("SELECT id,work_id,version_label,state,effective_from,effective_until
           FROM publishing_author_contracts WHERE author_id=?
           ORDER BY template_created_at DESC LIMIT 30");
        // Read-only per-sale financial history, limited to this verified author.
        // Never select buyer identity, raw gateway transaction, download token or
        // account email. Monetary values are actual ledger entries, not estimates.
        $history=$pdo->prepare("SELECT e.order_id,e.offer_id,
           MAX(e.created_at) AS booked_at,
           COALESCE(SUM(CASE WHEN e.entry_kind IN ('author_share','author_reversal')
              THEN e.amount_toman ELSE 0 END),0) AS author_net,
           COALESCE(SUM(CASE WHEN e.entry_kind IN ('talent_fund','fund_reversal')
              THEN e.amount_toman ELSE 0 END),0) AS fund_net,
           COALESCE((SELECT SUM(pc.reserve_amount_toman)
              FROM publishing_platform_cost_entries pc
              WHERE pc.order_id=e.order_id AND pc.offer_id=e.offer_id),0) AS operating_reserve_net,
           (SELECT n.status FROM publishing_notification_outbox n
              WHERE n.order_id=e.order_id AND n.event_type='author_sale'
              ORDER BY n.created_at DESC LIMIT 1) AS author_notice_state,
           EXISTS(SELECT 1 FROM commerce_refund_requests r
             WHERE r.order_id=e.order_id AND r.status='settled') AS refund_settled
           FROM publishing_sale_allocation_entries e
           JOIN commerce_orders o ON o.id=e.order_id AND o.state='paid'
             AND o.currency='IRT' AND o.paid_at IS NOT NULL
           JOIN commerce_payment_claims c ON c.order_id=o.id AND c.provider='bitpay'
             AND c.transaction_id=o.provider_trans_id AND c.verified_amount=o.provider_amount
           WHERE e.author_id=?
           GROUP BY e.order_id,e.offer_id
           ORDER BY MAX(e.created_at) DESC LIMIT 50");
        require_once __DIR__.'/internal/jr-publishing-contract-draft.php';
        $out=[];
        foreach($rows as $row) {
            $id=(string)$row['id'];
            $earnings->execute([$id]);$totals=$earnings->fetch(PDO::FETCH_ASSOC)?:[];
            $settled->execute([$id]);$bank=$settled->fetch(PDO::FETCH_ASSOC)?:[];
            $works->execute([$id]);$items=$works->fetchAll(PDO::FETCH_ASSOC);
            $reserve->execute([$id]);$reserveAmount=$reserve->fetch(PDO::FETCH_ASSOC)?:[];
            $funding->execute([$id]);$fundedAmount=$funding->fetch(PDO::FETCH_ASSOC)?:[];
            $contracts->execute([$id]);$contractRows=$contracts->fetchAll(PDO::FETCH_ASSOC);
            $refunds->execute([$id]);$refundCounts=$refunds->fetch(PDO::FETCH_ASSOC)?:[];
            $history->execute([$id]);$saleRows=$history->fetchAll(PDO::FETCH_ASSOC);
            $accrued=(int)($totals['author_accrued_toman']??0);
            $sent=(int)($bank['bank_settled_toman']??0);
            $out[]=[
              'id'=>$id,
              'slug'=>(string)$row['slug'],
              'displayNameFa'=>(string)$row['display_name_fa'],
              'displayNameEn'=>(string)$row['display_name_en'],
              'verifiedPaidOrders'=>(int)($totals['verified_paid_orders']??0),
              'settledRefundsAwaitingAllocationReversal'=>(int)($refundCounts['unreconciled_count']??0),
              'authorAccruedToman'=>$accrued,
              'talentFundEarmarkedToman'=>(int)($totals['fund_earmarked_toman']??0),
              'authorBankSettledToman'=>$sent,
              'authorUnsettledToman'=>max(0,$accrued-$sent),
              'platformOperatingReserveToman'=>(int)($reserveAmount['reserved_toman']??0),
              'platformOperatingFundingReconciledToman'=>(int)($fundedAmount['reconciled_toman']??0),
              'platformOperatingReserveBps'=>700,
              'platformOperatingPolicy'=>'Costs borne independently by platform, never withheld from author/fund',
              'draftContract'=>jrPublishingDraftContract((string)$row['display_name_fa']),
              'recentSales'=>array_map(static function(array $sale): array {
                  $a=(int)$sale['author_net'];$fund=(int)$sale['fund_net'];
                  return [
                    'saleRef'=>substr(hash('sha256','jr-pub-privacy-v1|'.(string)$sale['order_id']),0,12),
                    'bookedAt'=>(string)$sale['booked_at'],
                    'netSaleToman'=>$a+$fund,
                    'authorShareToman'=>$a,
                    'talentFundShareToman'=>$fund,
                    'platformOperatingReserveToman'=>(int)$sale['operating_reserve_net'],
                    'authorNotificationState'=>$sale['author_notice_state']??'not_queued',
                    'refundSettled'=>(bool)($sale['refund_settled']??false),
                    'refundAllocationsUnreconciled'=>(bool)($sale['refund_settled']??false) && ($a!==0||$fund!==0)
                  ];
              },$saleRows),
              'contracts'=>array_map(static function(array $c): array {
                 return ['id'=>(string)$c['id'],'workId'=>(string)$c['work_id'],
                   'version'=>(string)$c['version_label'],'state'=>(string)$c['state'],
                   'effectiveFrom'=>$c['effective_from'],'effectiveUntil'=>$c['effective_until']];
              },$contractRows),
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
