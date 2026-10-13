<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * V5 owner-only commerce exception visibility. This module is a *read-only*
 * SQL projection: it never certifies provider/bank settlement, email delivery,
 * physical inventory or actual fulfilment, and never reveals customer PII.
 * The caller must enforce verified admin role and fresh TOTP MFA.
 */
function operationsCommerceSnapshot(PDO $pdo, int $at): array {
    $snapshot=[
        'ok'=>true,
        'schema'=>'operations-commerce-evidence-v1',
        'checkedAt'=>$at,
        'scope'=>'live_mysql_readonly_owner_mfa',
        'available'=>false,
        'reason'=>'stage09_schema_unavailable',
        'providerBankSettlementVerified'=>null,
        'physicalStockCountVerified'=>null,
        'customerDetailsExposed'=>false,
        'limitations'=>[
            'A paid database row is not a bank settlement.',
            'A reconciled_at field is not independent evidence of a physical stock count.',
            'The notification outbox is not proof of SMTP acceptance or inbox delivery.',
            'Historical paid rows without Stage09 claims need review, not automatic reclassification.',
            'This endpoint never releases reservations or changes a paid order.'
        ],
        'orders'=>null,'claims'=>null,'stock'=>null,'fulfilment'=>null,'notifications'=>null,
        'salesPipeline'=>null
    ];
    // An incomplete production migration is an explicit unknown, not zero
    // orders or zero issues; no partially filled result escapes.
    if (!function_exists('stage9SchemaReady') || !stage9SchemaReady($pdo)) return $snapshot;
    try {
        $states=[];
        $query=$pdo->query('SELECT state,COUNT(*) AS total FROM commerce_orders GROUP BY state');
        foreach ($query->fetchAll() as $row) {
            $key=(string)$row['state'];$states[$key]=(int)$row['total'];
        }
        // Money is taken from orders.amount_toman only. Even a Stage09 matched
        // provider claim is NOT independently verified bank settlement or net revenue.
        // A single pre-aggregated query avoids exposing any customer/order details.
        $sales=$pdo->query("SELECT
            COALESCE(SUM(CASE WHEN o.state='paid' THEN o.amount_toman ELSE 0 END),0) AS paid_state_toman,
            COALESCE(SUM(CASE WHEN o.state='paid' AND c.transaction_id=o.provider_trans_id
                AND c.verified_amount=o.provider_amount THEN o.amount_toman ELSE 0 END),0) AS claim_matched_toman,
            COALESCE(SUM(CASE WHEN o.state='paid' AND c.transaction_id=o.provider_trans_id
                AND c.verified_amount=o.provider_amount THEN 1 ELSE 0 END),0) AS claim_matched_count,
            COALESCE(SUM(CASE WHEN o.state='paid' AND o.paid_at>=DATE_SUB(NOW(),INTERVAL 7 DAY)
                THEN 1 ELSE 0 END),0) AS recent_paid_7d,
            COALESCE(SUM(CASE WHEN o.state='paid' AND o.paid_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)
                THEN 1 ELSE 0 END),0) AS recent_paid_30d,
            COALESCE(SUM(CASE WHEN o.state='paid' AND o.paid_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)
                THEN o.amount_toman ELSE 0 END),0) AS recent_paid_toman_30d,
            COALESCE(SUM(CASE WHEN o.state='pending' AND o.created_at<DATE_SUB(NOW(),INTERVAL 24 HOUR)
                THEN 1 ELSE 0 END),0) AS pending_older_24h,
            COALESCE(SUM(CASE WHEN o.state='pending' AND o.created_at<DATE_SUB(NOW(),INTERVAL 7 DAY)
                THEN 1 ELSE 0 END),0) AS pending_older_7d,
            COALESCE(SUM(CASE WHEN o.state='created' AND o.created_at<DATE_SUB(NOW(),INTERVAL 24 HOUR)
                THEN 1 ELSE 0 END),0) AS created_older_24h
            FROM commerce_orders o
            LEFT JOIN commerce_payment_claims c ON c.order_id=o.id AND c.provider='bitpay'")->fetch(PDO::FETCH_ASSOC);
        if(!is_array($sales)) throw new RuntimeException('commerce_sales_aggregate_unavailable');
        $refunds=$pdo->query("SELECT status,COUNT(*) AS total
            FROM commerce_refund_requests GROUP BY status")->fetchAll(PDO::FETCH_ASSOC);
        $refundStates=[];
        foreach($refunds as $refund)$refundStates[(string)$refund['status']]=(int)$refund['total'];
        $refundsAwaiting=($refundStates['requested']??0)+($refundStates['reviewing']??0)
            +($refundStates['approved']??0);
        $claimTotal=(int)$pdo->query('SELECT COUNT(*) FROM commerce_payment_claims')->fetchColumn();
        $unmatched=(int)$pdo->query("SELECT COUNT(*) FROM commerce_orders o
            LEFT JOIN commerce_payment_claims c ON c.order_id=o.id AND c.provider='bitpay'
            WHERE o.state='paid' AND (c.order_id IS NULL OR c.transaction_id<>o.provider_trans_id
              OR c.verified_amount<>o.provider_amount)")->fetchColumn();
        $stockRows=$pdo->query("SELECT s.sku,s.physical_on_hand,s.reserved,s.reconciled_at,
                COALESCE(SUM(CASE WHEN r.state='reserved' THEN r.quantity ELSE 0 END),0) AS held_units
            FROM commerce_book_stock s LEFT JOIN commerce_book_reservations r ON r.sku=s.sku
            GROUP BY s.sku,s.physical_on_hand,s.reserved,s.reconciled_at
            ORDER BY s.sku LIMIT 50")->fetchAll();
        $stock=[];$stockDrift=0;$needsPhysical=0;
        foreach ($stockRows as $row) {
            $onHand=(int)$row['physical_on_hand'];$reserved=(int)$row['reserved'];
            $held=(int)$row['held_units'];
            $drift=$reserved!==$held || $reserved>$onHand;
            if ($drift) $stockDrift++;
            if (empty($row['reconciled_at'])) $needsPhysical++;
            $stock[]=[
                'sku'=>(string)$row['sku'],
                'physicalOnHandRecorded'=>$onHand,
                'reservedRecorded'=>$reserved,
                'reservationUnitsHeld'=>$held,
                'availableRecorded'=>max(0,$onHand-$reserved),
                'ledgerDiscrepancy'=>$drift,
                'reconciliationTimestampPresent'=>!empty($row['reconciled_at'])
            ];
        }
        $statuses=function(string $table,string $column)use($pdo):array{
            // Only internal fixed identifiers, never user-supplied SQL.
            $rows=$pdo->query('SELECT '.$column.',COUNT(*) AS total FROM '.$table.' GROUP BY '.$column)->fetchAll();
            $out=[];
            foreach($rows as $row)$out[(string)$row[$column]]=(int)$row['total'];
            return $out;
        };
        $service=$statuses('commerce_service_cases','status');
        $parcels=$statuses('commerce_parcels','state');
        $outbox=$statuses('commerce_outbox','state');
        $missingEmail=(int)$pdo->query("SELECT COUNT(*) FROM commerce_orders
            WHERE state='paid' AND receipt_email_sent_at IS NULL AND customer_email IS NOT NULL
              AND customer_email<>''")->fetchColumn();
        // Bounded owner-only service worklist, not a financial settlement
        // record. Never SELECT email, customer_json, addresses or private notes.
        // The visible order UUID is an internal case reference, not a public link.
        $activeStates="'awaiting_contact','scheduling','booked','in_progress'";
        $openCases=(int)$pdo->query("SELECT COUNT(*) FROM commerce_service_cases
            WHERE status IN (".$activeStates.")")->fetchColumn();
        $queueRows=$pdo->query("SELECT sc.order_id,sc.sku,sc.status,sc.created_at,
                o.state AS order_state,o.provider_trans_id,o.provider_amount,
                c.transaction_id AS claim_transaction,c.verified_amount AS claim_amount
            FROM commerce_service_cases sc
            JOIN commerce_orders o ON o.id=sc.order_id
            LEFT JOIN commerce_payment_claims c
                ON c.order_id=o.id AND c.provider='bitpay'
            WHERE sc.status IN (".$activeStates.")
            ORDER BY sc.created_at ASC,sc.order_id ASC,sc.sku ASC
            LIMIT 50")->fetchAll();
        $actionQueue=[];
        foreach ($queueRows as $row) {
            $claimMatched=$row['order_state']==='paid'
                && $row['claim_transaction']!==null
                && (string)$row['claim_transaction']===(string)$row['provider_trans_id']
                && (string)$row['claim_amount']===(string)$row['provider_amount'];
            $actionQueue[]=[
                'orderId'=>(string)$row['order_id'],
                'sku'=>(string)$row['sku'],
                'status'=>(string)$row['status'],
                'createdAt'=>(string)$row['created_at'],
                'orderPaidState'=>(string)$row['order_state']==='paid',
                'providerClaimMatchesOrder'=>$claimMatched
            ];
        }
        $snapshot['available']=true;
        $snapshot['reason']=null;
        $snapshot['orders']=[
            'states'=>$states,
            'pendingRecords'=>$states['pending']??0,
            'paidStateRecords'=>$states['paid']??0,
            'failedRecords'=>$states['failed']??0,
            'totalRows'=>array_sum($states)
        ];
        $snapshot['salesPipeline']=[
            'paidStateAmountToman'=>(string)$sales['paid_state_toman'],
            'providerClaimMatchedAmountToman'=>(string)$sales['claim_matched_toman'],
            'providerClaimMatchedOrderCount'=>(int)$sales['claim_matched_count'],
            'paidStateOrdersLast7Days'=>(int)$sales['recent_paid_7d'],
            'paidStateOrdersLast30Days'=>(int)$sales['recent_paid_30d'],
            'paidStateAmountLast30DaysToman'=>(string)$sales['recent_paid_toman_30d'],
            'pendingOlderThan24Hours'=>(int)$sales['pending_older_24h'],
            'pendingOlderThan7Days'=>(int)$sales['pending_older_7d'],
            'createdOlderThan24Hours'=>(int)$sales['created_older_24h'],
            'refundRequestStates'=>$refundStates,
            'refundRequestsAwaitingAction'=>$refundsAwaiting,
            'currencyUnit'=>'toman',
            'verifiedNetRevenueToman'=>null,
            'verifiedBankSettlementToman'=>null,
            'verifiedRefundDisbursementsToman'=>null,
            'status'=>'INTERNAL_ORDER_LEDGER_ONLY',
            'limitations'=>[
                'Gross paid-state amounts and matched provider claims are not bank-settled revenue.',
                'Ageing pending orders are a review queue, not customer consent for contact.',
                'Refund request status does not prove that money was returned.',
                'No attribution, profit, net revenue or conversion rate is inferred.'
            ]
        ];
        $snapshot['claims']=[
            'storedUniqueProviderClaims'=>$claimTotal,
            'paidRowsRequiringIndependentProviderReconciliation'=>$unmatched,
            'settlement'=>'not_observed'
        ];
        $snapshot['stock']=[
            'rows'=>$stock,
            'ledgerDiscrepancies'=>$stockDrift,
            'rowsWithoutReconciliationTimestamp'=>$needsPhysical,
            'independentPhysicalCount'=>'not_observed'
        ];
        $snapshot['fulfilment']=[
            'serviceCaseStates'=>$service,
            'parcelStates'=>$parcels,
            'proofOfDelivery'=>'not_observed',
            'activeServiceCaseCount'=>$openCases,
            'serviceActionQueue'=>$actionQueue,
            'queueLimit'=>50,
            'queueTruncated'=>$openCases>count($actionQueue),
            'limitation'=>'Provider claim equality does not prove bank settlement, customer contact, booking or delivery.'
        ];
        $snapshot['notifications']=[
            'outboxStates'=>$outbox,
            'paidOrderRowsWithoutReceiptEmailTimestamp'=>$missingEmail,
            'independentEmailDelivery'=>'not_observed'
        ];
        return $snapshot;
    } catch(Throwable $e) {
        $snapshot['reason']='database_read_unavailable';
        return $snapshot;
    }
}
