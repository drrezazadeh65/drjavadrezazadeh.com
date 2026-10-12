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
        'orders'=>null,'claims'=>null,'stock'=>null,'fulfilment'=>null,'notifications'=>null
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
        $snapshot['available']=true;
        $snapshot['reason']=null;
        $snapshot['orders']=[
            'states'=>$states,
            'pendingRecords'=>$states['pending']??0,
            'paidStateRecords'=>$states['paid']??0,
            'failedRecords'=>$states['failed']??0,
            'totalRows'=>array_sum($states)
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
            'proofOfDelivery'=>'not_observed'
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
