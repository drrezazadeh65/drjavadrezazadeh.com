<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * V5 owner-only commerce exception visibility. This module is a *read-only*
 * SQL projection: it never certifies provider/bank settlement, email delivery,
 * physical inventory or actual fulfilment, and never reveals customer PII.
 * The caller must enforce verified admin role and fresh TOTP MFA.
 */
/**
 * Claim-matched offer popularity from the EXISTING orders+claims, not sales
 * conversion, audience analytics, fulfilment or bank settlement. Read-only.
 * JSON_TABLE is available in MySQL 8 / MariaDB 10.11; older hosts fail
 * closed for this OPTIONAL projection, never for checkout or other KPIs.
 */
function operationsCommercePopularOffers(PDO $pdo): array {
    try {
        $sql="SELECT jt.sku,jt.kind,
              COUNT(DISTINCT o.id) AS orders_count,
              COALESCE(SUM(jt.quantity),0) AS units_count
              FROM commerce_orders o
              JOIN JSON_TABLE(
                  CASE WHEN JSON_VALID(o.items_json)=1 THEN o.items_json ELSE '[]' END,
                  '$[*]' COLUMNS (
                      sku VARCHAR(80) PATH '$.sku',
                      kind VARCHAR(32) PATH '$.kind',
                      quantity INT PATH '$.quantity'
                  )
              ) AS jt
              WHERE o.state='paid' AND jt.sku IS NOT NULL
                AND jt.quantity BETWEEN 1 AND 20
                AND EXISTS (
                    SELECT 1 FROM commerce_payment_claims pc
                    WHERE pc.order_id=o.id AND pc.provider='bitpay'
                      AND pc.transaction_id=o.provider_trans_id
                      AND pc.verified_amount=o.provider_amount
                )
              GROUP BY jt.sku,jt.kind
              ORDER BY units_count DESC,orders_count DESC,jt.sku ASC LIMIT 15";
        $rows=$pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        $offers=[];
        foreach($rows as $row){
            $sku=(string)($row['sku']??'');
            if($sku===''||strlen($sku)>80||preg_match('/[\x00-\x1F\x7F]/',$sku))continue;
            $offers[]=['sku'=>$sku,
                'kind'=>substr((string)($row['kind']??'unknown'),0,32),
                'matchedOrders'=>(int)$row['orders_count'],
                'units'=>(int)$row['units_count']];
        }
        return ['status'=>'internal_provider_claim_matches_only',
            'offers'=>$offers,'limit'=>15,
            'settlementVerified'=>false,
            'scope'=>'all_time_ledger_without_buyer_identity'];
    }catch(Throwable $e){
        return ['status'=>'query_unavailable','offers'=>null,
            'settlementVerified'=>false,
            'note'=>'No popularity data inferred from absent/unavailable SQL JSON adapter.'];
    }
}

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
            'An open parcel record is not proof of carrier acceptance, delivery or customer notification.',
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
        // Read-only owner-MFA visibility: ageing physical holds can silently
        // reduce sellable stock. Provider/bank reconciliation is required before
        // ANY mutation; this query must never release or cancel a reservation.
        $heldPending=$pdo->query("SELECT
            COUNT(DISTINCT CASE WHEN o.state='pending'
              AND o.created_at<DATE_SUB(NOW(),INTERVAL 24 HOUR)
              THEN o.id ELSE NULL END) AS pending_book_orders_24h,
            COALESCE(SUM(CASE WHEN o.state='pending'
              AND o.created_at<DATE_SUB(NOW(),INTERVAL 24 HOUR)
              THEN r.quantity ELSE 0 END),0) AS pending_book_units_24h,
            COALESCE(SUM(CASE WHEN o.state<>'paid' THEN r.quantity ELSE 0 END),0)
              AS unpaid_order_reserved_units
            FROM commerce_book_reservations r
            JOIN commerce_orders o ON o.id=r.order_id
            WHERE r.state='reserved'")->fetch(PDO::FETCH_ASSOC);
        if(!is_array($heldPending)) throw new RuntimeException('pending_book_hold_aggregate_unavailable');
        // Bounded, private owner-MFA review queue. Never expose buyer PII,
        // full gateway references, or an actionable payment claim.
        $bookExpiryRows=$pdo->query("SELECT o.id,o.created_at,
             RIGHT(o.provider_id_get,4) AS gateway_suffix,
             SUM(r.quantity) AS held_units
           FROM commerce_orders o
           JOIN commerce_book_reservations r ON r.order_id=o.id AND r.state='reserved'
           WHERE o.state='pending' AND o.paid_at IS NULL
             AND o.provider_trans_id IS NULL
             AND o.created_at<=DATE_SUB(NOW(),INTERVAL 24 HOUR)
             AND NOT EXISTS (SELECT 1 FROM commerce_payment_claims c WHERE c.order_id=o.id)
           GROUP BY o.id,o.created_at,o.provider_id_get
           ORDER BY o.created_at ASC LIMIT 25")->fetchAll(PDO::FETCH_ASSOC);
        $bookExpiryReview=array_map(static fn(array $row):array=>[
            'orderId'=>(string)$row['id'],
            'createdAt'=>(string)$row['created_at'],
            'gatewayReferenceSuffix'=>(string)$row['gateway_suffix'],
            'reservedUnits'=>(int)$row['held_units'],
            'requiresIndependentProviderFailureProof'=>true
        ],$bookExpiryRows);


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
        // Paid book fulfilment worklist. Fixed-column, bounded owner-MFA
        // projection: no shipping address, tracking code or customer identity.
        // These signals flag operational follow-up, not proof of delivery.
        $parcelOpenStates="'preparing','dispatched','in_transit'";
        $openParcels=(int)$pdo->query("SELECT COUNT(*) FROM commerce_parcels
            WHERE state IN (".$parcelOpenStates.")")->fetchColumn();
        $parcelRows=$pdo->query("SELECT p.order_id,p.state,p.updated_at,p.dispatched_at,
                o.state AS order_state,o.paid_at,o.provider_trans_id,o.provider_amount,
                c.transaction_id AS claim_transaction,c.verified_amount AS claim_amount
            FROM commerce_parcels p
            JOIN commerce_orders o ON o.id=p.order_id
            LEFT JOIN commerce_payment_claims c ON
                c.order_id=o.id AND c.provider='bitpay'
            WHERE p.state IN (".$parcelOpenStates.")
            ORDER BY p.updated_at ASC,p.order_id ASC LIMIT 50")->fetchAll(PDO::FETCH_ASSOC);
        $parcelQueue=[];
        foreach($parcelRows as $row){
            $paid=(string)$row['order_state']==='paid';
            $claimMatched=$paid && $row['claim_transaction']!==null
                && (string)$row['claim_transaction']===(string)$row['provider_trans_id']
                && (string)$row['claim_amount']===(string)$row['provider_amount'];
            $parcelQueue[]=[
                'orderId'=>(string)$row['order_id'],
                'state'=>(string)$row['state'],
                'updatedAt'=>(string)$row['updated_at'],
                'dispatchedAt'=>$row['dispatched_at']!==null?(string)$row['dispatched_at']:null,
                'orderPaidState'=>$paid,
                'providerClaimMatchesOrder'=>$claimMatched
            ];
        }
        $parcelAge=$pdo->query("SELECT
            COALESCE(SUM(CASE WHEN state='preparing'
                AND updated_at<DATE_SUB(NOW(),INTERVAL 48 HOUR)
                THEN 1 ELSE 0 END),0) AS preparing_over_48h,
            COALESCE(SUM(CASE WHEN state IN ('dispatched','in_transit')
                AND updated_at<DATE_SUB(NOW(),INTERVAL 7 DAY)
                THEN 1 ELSE 0 END),0) AS shipping_over_7d
            FROM commerce_parcels")->fetch(PDO::FETCH_ASSOC);
        if(!is_array($parcelAge))throw new RuntimeException('commerce_parcel_age_unavailable');
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
        // Preferences are an additive migration. Old Stage09 deployments
        // retain a working READ-ONLY report but never imply a usable choice.
        $preferenceReady=function_exists('commerceConsultationPreferenceSchemaReady')
            && commerceConsultationPreferenceSchemaReady($pdo);
        $preferenceFields=$preferenceReady
            ? 'pr.delivery_mode,pr.meeting_city,pr.updated_at AS preference_updated_at'
            : 'NULL AS delivery_mode,NULL AS meeting_city,NULL AS preference_updated_at';
        $preferenceJoin=$preferenceReady
            ? ' LEFT JOIN commerce_consultation_preferences pr ON pr.order_id=sc.order_id AND pr.sku=sc.sku'
            : '';
        // Only a boolean and revision leave this PII-free admin overview.
        // Actual encrypted buyer notes require separate SUPER_ADMIN + fresh MFA.
        $intakeReady=function_exists('jrServiceIntakeSchemaReady')
            && jrServiceIntakeSchemaReady($pdo);
        $intakeFields=$intakeReady
            ? 'si.revision AS intake_revision,si.updated_at AS intake_updated_at'
            : 'NULL AS intake_revision,NULL AS intake_updated_at';
        $intakeJoin=$intakeReady
            ? ' LEFT JOIN commerce_service_intakes si ON si.order_id=sc.order_id AND si.sku=sc.sku'
            : '';
        $queueRows=$pdo->query("SELECT sc.order_id,sc.sku,sc.status,sc.created_at,
                sc.booking_start,sc.booking_end,
                o.state AS order_state,o.provider_trans_id,o.provider_amount,
                c.transaction_id AS claim_transaction,c.verified_amount AS claim_amount,
                ".$preferenceFields.",".$intakeFields."
            FROM commerce_service_cases sc
            JOIN commerce_orders o ON o.id=sc.order_id
            LEFT JOIN commerce_payment_claims c
                ON c.order_id=o.id AND c.provider='bitpay'
            ".$preferenceJoin.$intakeJoin."
            WHERE sc.status IN (".$activeStates.")
            ORDER BY sc.created_at ASC,sc.order_id ASC,sc.sku ASC
            LIMIT 50")->fetchAll();
        // Owner's one-resource internal schedule. No customer names, email,
        // telephone numbers, notes, links or gateway identifiers leave MySQL.
        // Missing records are not proof of external consultant availability.
        $calendarCount=(int)$pdo->query("SELECT COUNT(*)
            FROM commerce_service_cases
            WHERE status IN ('booked','in_progress')
                AND booking_start IS NOT NULL AND booking_end>UTC_TIMESTAMP()
                AND booking_start<DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 DAY)")->fetchColumn();
        $calendarRows=$pdo->query("SELECT booking_start,booking_end,status
            FROM commerce_service_cases
            WHERE status IN ('booked','in_progress')
                AND booking_start IS NOT NULL AND booking_end>UTC_TIMESTAMP()
                AND booking_start<DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 DAY)
            ORDER BY booking_start,booking_end LIMIT 100")->fetchAll(PDO::FETCH_ASSOC);
        $calendar=[];
        foreach($calendarRows as $window){
            $start=(string)($window['booking_start']??'');
            $end=(string)($window['booking_end']??'');
            if(!preg_match('/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$/D',$start)
                ||!preg_match('/^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$/D',$end))continue;
            $calendar[]=['startUtc'=>$start,'endUtc'=>$end,
                'state'=>(string)$window['status']];
        }
        // Explicit internal owner-authored windows, bounded and private.
        // A missing additive table is UNKNOWN, not an empty/available diary.
        $capacityReady=function_exists('operationsConsultationAvailabilitySchemaReady')
            && operationsConsultationAvailabilitySchemaReady($pdo);
        $capacityOpenCount=null;$capacityWindows=[];
        if ($capacityReady) {
            $capacityOpenCount=(int)$pdo->query("SELECT COUNT(*) FROM commerce_consultation_availability
                WHERE state='OPEN' AND end_utc>UTC_TIMESTAMP()
                  AND start_utc<DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 DAY)")->fetchColumn();
            $capacityRows=$pdo->query("SELECT id,start_utc,end_utc FROM commerce_consultation_availability
                WHERE state='OPEN' AND end_utc>UTC_TIMESTAMP()
                  AND start_utc<DATE_ADD(UTC_TIMESTAMP(),INTERVAL 90 DAY)
                ORDER BY start_utc,id LIMIT 100")->fetchAll(PDO::FETCH_ASSOC);
            foreach($capacityRows as $window){
                $capacityWindows[]=['id'=>(string)$window['id'],
                    'startUtc'=>(string)$window['start_utc'],
                    'endUtc'=>(string)$window['end_utc']];
            }
        }
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
                'providerClaimMatchesOrder'=>$claimMatched,
                'bookingStart'=>$row['booking_start']!==null?(string)$row['booking_start']:null,
                'bookingEnd'=>$row['booking_end']!==null?(string)$row['booking_end']:null,
                'deliveryMode'=>$row['delivery_mode']!==null?(string)$row['delivery_mode']:null,
                'meetingCity'=>$row['meeting_city']!==null?(string)$row['meeting_city']:null,
                'intakeSubmitted'=>$intakeReady && $row['intake_revision']!==null,
                'intakeRevision'=>$row['intake_revision']===null?null:(int)$row['intake_revision'],
                'intakeUpdatedAt'=>$row['intake_updated_at']===null?null:(string)$row['intake_updated_at'],
                'customerPreferenceRecorded'=>$preferenceReady
                    && $row['delivery_mode']!==null
                    && function_exists('commerceConsultationValidChoice')
                    && commerceConsultationValidChoice((string)$row['sku'],(string)$row['delivery_mode'],
                        $row['meeting_city']===null?null:(string)$row['meeting_city']),
                'preferenceUpdatedAt'=>$row['preference_updated_at']!==null
                    ?(string)$row['preference_updated_at']:null
            ];
        }
        // Keep completed services in a separate bounded queue. Never mix
        // them into the active queue where they could crowd out new clients.
        // No buyer contact details, file contents or banking IDs are exposed.
        $deliveredCount=(int)$pdo->query("SELECT COUNT(*) FROM commerce_service_cases
            WHERE status='delivered'")->fetchColumn();
        $completedRows=$pdo->query("SELECT sc.order_id,sc.sku,sc.status,sc.delivered_at,
                o.state AS order_state,o.provider_trans_id,o.provider_amount,
                c.transaction_id AS claim_transaction,c.verified_amount AS claim_amount
            FROM commerce_service_cases sc JOIN commerce_orders o ON o.id=sc.order_id
            LEFT JOIN commerce_payment_claims c ON c.order_id=o.id AND c.provider='bitpay'
            WHERE sc.status='delivered'
            ORDER BY sc.delivered_at DESC,sc.order_id DESC,sc.sku DESC LIMIT 50")
            ->fetchAll(PDO::FETCH_ASSOC);
        $deliveredQueue=[];
        foreach($completedRows as $row){
            $matched=$row['order_state']==='paid'
                &&$row['claim_transaction']!==null
                &&(string)$row['provider_trans_id']===(string)$row['claim_transaction']
                &&(string)$row['provider_amount']===(string)$row['claim_amount'];
            $deliveredQueue[]=[
                'orderId'=>(string)$row['order_id'],
                'sku'=>(string)$row['sku'],
                'status'=>'delivered',
                'deliveredAt'=>$row['delivered_at']===null?null:(string)$row['delivered_at'],
                'orderPaidState'=>$row['order_state']==='paid',
                'providerClaimMatchesOrder'=>$matched
            ];
        }
        $snapshot['available']=true;
        $snapshot['reason']=null;
        // Pending donations can have succeeded at bitpay.ir when callbacks
        // failed. Owner-MFA review only; never classify them as unpaid from DB.
        $donationRecoveryRows=$pdo->query("SELECT o.id,o.created_at,o.amount_toman,
             RIGHT(o.provider_id_get,4) AS gateway_suffix,
             JSON_UNQUOTE(JSON_EXTRACT(o.items_json,'$[0].sku')) AS donation_sku
            FROM commerce_orders o
            WHERE o.state='pending' AND o.paid_at IS NULL
              AND o.provider_trans_id IS NULL AND o.provider_id_get IS NOT NULL
              AND JSON_VALID(o.items_json)=1 AND JSON_LENGTH(o.items_json)=1
              AND JSON_UNQUOTE(JSON_EXTRACT(o.items_json,'$[0].kind'))='donation'
              AND JSON_UNQUOTE(JSON_EXTRACT(o.items_json,'$[0].sku'))
                IN ('support:students','support:voluntary')
              AND NOT EXISTS (SELECT 1 FROM commerce_payment_claims c
                              WHERE c.order_id=o.id)
            ORDER BY o.created_at ASC LIMIT 25")->fetchAll(PDO::FETCH_ASSOC);
        $donationRecoveryQueue=array_map(static fn(array $row):array=>[
            'orderId'=>(string)$row['id'],
            'createdAt'=>(string)$row['created_at'],
            'amountToman'=>(string)$row['amount_toman'],
            'gatewayReferenceSuffix'=>(string)$row['gateway_suffix'],
            'donationSku'=>(string)$row['donation_sku'],
            'requiresServerSideProviderTransactionVerification'=>true
        ],$donationRecoveryRows);
        // All-time donation totals; do not mix a 1,000-row sample with all-time claim totals.
        // This uses the existing verified commerce order and provider-claim ledgers.
        // EXISTS counts each donation order once, even if the provider has multiple
        // verification claim records. Never inflate donation revenue by JOIN fan-out.
        $givingTotals=$pdo->query("SELECT
            COUNT(*) AS total_count,
            COALESCE(SUM(CASE WHEN o.state='pending' THEN 1 ELSE 0 END),0) AS pending_count,
            COALESCE(SUM(CASE WHEN o.state='paid' THEN 1 ELSE 0 END),0) AS paid_count,
            COALESCE(SUM(CASE WHEN o.state='paid' AND EXISTS (
                SELECT 1 FROM commerce_payment_claims c
                WHERE c.order_id=o.id AND c.provider='bitpay'
                  AND c.transaction_id=o.provider_trans_id
                  AND c.verified_amount=o.provider_amount
            ) THEN 1 ELSE 0 END),0) AS matched_count,
            COALESCE(SUM(CASE WHEN o.state='paid' AND EXISTS (
                SELECT 1 FROM commerce_payment_claims c
                WHERE c.order_id=o.id AND c.provider='bitpay'
                  AND c.transaction_id=o.provider_trans_id
                  AND c.verified_amount=o.provider_amount
            ) THEN o.amount_toman ELSE 0 END),0) AS matched_toman
            FROM commerce_orders o
            WHERE JSON_VALID(o.items_json)=1 AND JSON_LENGTH(o.items_json)=1
              AND JSON_UNQUOTE(JSON_EXTRACT(o.items_json,'$[0].sku'))='support:students'")->fetch(PDO::FETCH_ASSOC);
        if(!is_array($givingTotals))throw new RuntimeException('donation_totals_unavailable');
        $snapshot['donationRecovery']=[
            'schema'=>'commerce-donation-recovery-review-v1',
            'pendingReviewQueue'=>$donationRecoveryQueue,
            'reviewLimit'=>25,
            'onlyProviderVerifiedPaymentMayBeRecorded'=>true,
            'browserCannotGrantPaidStatus'=>true,
            'automaticReconciliationActive'=>false,
            'reviewOnly'=>true
        ];
        $snapshot['donations']=[
            'scope'=>'all_time_internal_donation_ledger',
            'totalOrders'=>(int)$givingTotals['total_count'],
            'pendingOrders'=>(int)$givingTotals['pending_count'],
            'paidStateOrders'=>(int)$givingTotals['paid_count'],
            'claimMatchedOrders'=>(int)$givingTotals['matched_count'],
            'claimMatchedAmountToman'=>(string)$givingTotals['matched_toman'],
            'bankSettlementVerified'=>false,
            'allocationVerified'=>false
        ];
        $snapshot['orders']=[
            'states'=>$states,
            'pendingRecords'=>$states['pending']??0,
            'paidStateRecords'=>$states['paid']??0,
            'failedRecords'=>$states['failed']??0,
            'totalRows'=>array_sum($states)
        ];
        $snapshot['bookExpiry']=[
            'schema'=>'commerce-book-expiry-review-v1',
            'policyHours'=>24,
            'pendingReviewQueue'=>$bookExpiryReview,
            'reviewLimit'=>25,
            'manualProviderVerificationRequired'=>true,
            'automaticReleaseActive'=>false,
            'readOnly'=>true,
            'note'=>'Pending without claim is not verified failed; do not release automatically.'
        ];
        $snapshot['salesPipeline']=[
            'paidStateAmountToman'=>(string)$sales['paid_state_toman'],
            'providerClaimMatchedAmountToman'=>(string)$sales['claim_matched_toman'],
            'providerClaimMatchedOrderCount'=>(int)$sales['claim_matched_count'],
            'popularOffers'=>operationsCommercePopularOffers($pdo),
            'recordedOrderPaidStateSharePercent'=>array_sum($states)>0
                ?round(100*(int)($states['paid']??0)/array_sum($states),1):null,
            'recordedOrderShareIsNotVisitorConversion'=>true,
            'paidStateOrdersLast7Days'=>(int)$sales['recent_paid_7d'],
            'paidStateOrdersLast30Days'=>(int)$sales['recent_paid_30d'],
            'paidStateAmountLast30DaysToman'=>(string)$sales['recent_paid_toman_30d'],
            'pendingOlderThan24Hours'=>(int)$sales['pending_older_24h'],
            'pendingBookOrdersWithReservationsOlderThan24Hours'=>(int)$heldPending['pending_book_orders_24h'],
            'pendingBookUnitsReservedOlderThan24Hours'=>(int)$heldPending['pending_book_units_24h'],
            'unpaidOrderBookUnitsReserved'=>(int)$heldPending['unpaid_order_reserved_units'],

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
                'An ageing book reservation is not proof of payment failure; release only after independent provider cancellation confirmation.',
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
            'activeParcelCount'=>$openParcels,
            'parcelActionQueue'=>$parcelQueue,
            'parcelQueueLimit'=>50,
            'parcelQueueTruncated'=>$openParcels>count($parcelQueue),
            'preparingOlderThan48Hours'=>(int)$parcelAge['preparing_over_48h'],
            'inShippingOlderThan7Days'=>(int)$parcelAge['shipping_over_7d'],
            'activeServiceCaseCount'=>$openCases,
            'serviceActionQueue'=>$actionQueue,
            'deliveredServiceCaseCount'=>$deliveredCount,
            'deliveredServiceActionQueue'=>$deliveredQueue,
            'deliveredServiceQueueTruncated'=>$deliveredCount>count($deliveredQueue),
            'serviceDeliveryEvidenceSchemaReady'=>function_exists('operationsServiceDeliveryEvidenceReady') && operationsServiceDeliveryEvidenceReady($pdo),
            'privateServiceFilesReady'=>function_exists('jrServiceFilesReady') && jrServiceFilesReady($pdo),
            'privateServiceFilesActivationChecks'=>function_exists('jrServiceFilesActivationChecks')
                ?jrServiceFilesActivationChecks($pdo):[],
            'serviceIntakeSchemaReady'=>$intakeReady,
            'customerPreferenceSchemaReady'=>$preferenceReady,
            'internalAvailability'=>[
                'schemaReady'=>$capacityReady,
                'scope'=>'single_owner_explicit_windows_only',
                'timeZone'=>'UTC',
                'openWindowCount'=>$capacityOpenCount,
                'windows'=>$capacityWindows,
                'limit'=>100,
                'truncated'=>$capacityReady&&$capacityOpenCount>count($capacityWindows),
                'externalAvailabilityConfirmed'=>false
            ],
            'internalCalendar'=>[
                'scope'=>'single_owner_internal_cases_only',
                'timeZone'=>'UTC',
                'futureDays'=>90,
                'totalUpcoming'=>$calendarCount,
                'windows'=>$calendar,
                'limit'=>100,
                'truncated'=>$calendarCount>count($calendar),
                'externalAvailabilityConfirmed'=>false
            ],
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
