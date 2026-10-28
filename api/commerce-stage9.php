<?php
declare(strict_types=1);
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

/**
 * Stage 09 source-only stock/payment hardening. All mutations use InnoDB and
 * require an already verified migration and reconciled, privately seeded stock.
 * NO stock count is inferred from the public book catalogue or historic 1000.
 */
function stage9SchemaReady(PDO $pdo): bool {
    try {
        foreach (['commerce_book_stock','commerce_book_reservations','commerce_stock_movements',
                  'commerce_payment_claims','commerce_outbox','commerce_service_cases',
                  'commerce_parcels','commerce_refund_requests'] as $table) {
            $pdo->query('SELECT 1 FROM '.$table.' LIMIT 1');
        }
        // MyISAM or a missing legacy commerce_orders table defeats row locks,
        // atomic reservations and payment-claim rollback. Recheck runtime storage
        // engines, not only the one-time deployment preflight.
        $engines=[];
        foreach ($pdo->query('SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')->fetchAll() as $table) {
            $engines[(string)($table['TABLE_NAME']??'')]=(string)($table['ENGINE']??'');
        }
        foreach (['commerce_orders','commerce_book_stock','commerce_book_reservations',
                  'commerce_stock_movements','commerce_payment_claims','commerce_outbox',
                  'commerce_service_cases','commerce_parcels','commerce_refund_requests'] as $table) {
            if (strcasecmp($engines[$table]??'', 'InnoDB')!==0) return false;
        }
        // Existence alone is insufficient: enforce the two unique provider
        // identity constraints before a gateway can begin new money movement.
        $indexes=$pdo->query('SHOW INDEX FROM commerce_payment_claims')->fetchAll();
        $columns=[];
        foreach ($indexes as $index) {
            $key=(string)($index['Key_name']??'');
            $position=(int)($index['Seq_in_index']??0);
            if($position>0 && ($index['Non_unique']??1)==0)
                $columns[$key][$position]=(string)($index['Column_name']??'');
        }
        foreach ($columns as &$fields)ksort($fields,SORT_NUMERIC);
        unset($fields);
        return array_values($columns['PRIMARY']??[])===['provider','transaction_id']
            &&array_values($columns['uq_payment_order']??[])===['provider','order_id'];
    } catch (Throwable $e) { return false; }
}
function stage9BookStockReady(PDO $pdo): bool {
    if (!stage9SchemaReady($pdo)) return false;
    // Single-copy collectible stock is gated per SKU by the same atomic
    // reservation SQL below. Do not let a new listing disable checkout for
    // legacy print titles while its one-off inventory is being reconciled.
    $books=array_filter(localCatalog(),static fn(array $entry): bool =>
        $entry['kind']==='book' && ($entry['single_copy']??false)!==true);
    if (count($books)<1) return false;
    // Each statement observes a consistent InnoDB snapshot of the stock row
    // and reservation ledger. A reconciled stock flag cannot excuse drift in
    // actual held units: block new paid book orders until an operator reviews it.
    $s=$pdo->prepare("SELECT s.physical_on_hand,s.reserved,s.reconciled_at,
        COALESCE((SELECT SUM(r.quantity) FROM commerce_book_reservations r
          WHERE r.sku=s.sku AND r.state='reserved'),0) AS held_units
        FROM commerce_book_stock s WHERE s.sku=?");
    foreach (array_keys($books) as $sku) {
        $s->execute([$sku]);$row=$s->fetch();
        if (!$row || empty($row['reconciled_at']) ||
            (int)$row['physical_on_hand'] < (int)$row['reserved'] ||
            (int)$row['reserved'] !== (int)$row['held_units']) return false;
    }
    return true;
}
/**
 * Read-only availability for one collectible. Never trust a public catalogue
 * stock label. Reconciled inventory, reserved ledger and InnoDB schema must
 * agree. The buy path independently enforces stock inside a transaction.
 */
function stage9SingleCopyAvailable(PDO $pdo,string $sku): bool {
    if(!preg_match('/^book:[a-z0-9-]{1,40}$/D',$sku)||!stage9SchemaReady($pdo))
        return false;
    try{
        $s=$pdo->prepare("SELECT physical_on_hand,reserved,reconciled_at,
             COALESCE((SELECT SUM(quantity) FROM commerce_book_reservations
               WHERE sku=? AND state='reserved'),0) AS held
             FROM commerce_book_stock WHERE sku=?");
        $s->execute([$sku,$sku]);
        $r=$s->fetch(PDO::FETCH_ASSOC);
        return is_array($r) && !empty($r['reconciled_at']) &&
            (int)$r['reserved']===(int)$r['held'] &&
            (int)$r['physical_on_hand']===1 && (int)$r['reserved']===0;
    }catch(Throwable $e){return false;}
}

/** Must be called inside an open transaction, before an order becomes payable. */
function stage9ReserveBooks(PDO $pdo,string $orderId,array $lines): void {
    if (!$pdo->inTransaction()) throw new RuntimeException('inventory_transaction_required');
    $books=[];
    foreach ($lines as $line) {
        if (($line['kind']??'')!=='book') continue;
        $sku=(string)($line['sku']??''); $qty=$line['quantity']??null;
        if (!preg_match('/^book:[a-z0-9-]{1,40}$/D',$sku) || !is_int($qty) || $qty<1 || $qty>20 ||
            array_key_exists($sku,$books)) throw new RuntimeException('invalid_stock_line');
        $books[$sku]=$qty;
    }
    ksort($books,SORT_STRING); // deterministic lock order for multi-book checkout.
    $reserve=$pdo->prepare('UPDATE commerce_book_stock SET reserved=reserved+? WHERE sku=? AND reconciled_at IS NOT NULL AND physical_on_hand>=reserved+?');
    $insert=$pdo->prepare("INSERT INTO commerce_book_reservations(order_id,sku,quantity,state) VALUES(?,?,?,'reserved')");
    foreach ($books as $sku=>$qty) {
        $reserve->execute([$qty,$sku,$qty]);
        if ($reserve->rowCount()!==1) throw new RuntimeException('stock_unavailable');
        $insert->execute([$orderId,$sku,$qty]);
    }
}
/** Only an operator with independently verified provider cancellation may call this. */
function stage9ReleaseBooks(PDO $pdo,string $orderId): void {
    if (!$pdo->inTransaction()) throw new RuntimeException('inventory_transaction_required');
    // Lock the parent order first, matching payment finalization lock order.
    // Age alone never proves cancellation; the caller must additionally have
    // independently verified provider cancellation before entering this path.
    $order=$pdo->prepare('SELECT state,provider_trans_id,paid_at FROM commerce_orders WHERE id=? FOR UPDATE');
    $order->execute([$orderId]);
    $current=$order->fetch();
    if (!$current || !in_array((string)$current['state'],['pending','cancelled','failed'],true)
        || !empty($current['provider_trans_id']) || !empty($current['paid_at'])) throw new RuntimeException('stock_release_order_not_safe');
    $claims=$pdo->prepare('SELECT COUNT(*) FROM commerce_payment_claims WHERE order_id=?');
    $claims->execute([$orderId]);
    if ((int)$claims->fetchColumn()!==0) throw new RuntimeException('stock_release_payment_claim_exists');
    $s=$pdo->prepare("SELECT sku,quantity,state FROM commerce_book_reservations WHERE order_id=? ORDER BY sku FOR UPDATE");
    $s->execute([$orderId]);
    foreach ($s->fetchAll() as $row) {
        if ($row['state']==='released') continue;
        if ($row['state']!=='reserved') throw new RuntimeException('committed_stock_cannot_release');
        $sku=(string)$row['sku'];$qty=(int)$row['quantity'];
        $u=$pdo->prepare('UPDATE commerce_book_stock SET reserved=reserved-? WHERE sku=? AND reserved>=?');
        $u->execute([$qty,$sku,$qty]);
        if ($u->rowCount()!==1) throw new RuntimeException('stock_release_conflict');
        $pdo->prepare("UPDATE commerce_book_reservations SET state='released' WHERE order_id=? AND sku=? AND state='reserved'")
            ->execute([$orderId,$sku]);
        $pdo->prepare("INSERT INTO commerce_stock_movements(order_id,sku,reason,units) VALUES(?,?,'release',?)")
            ->execute([$orderId,$sku,$qty]);
    }
}
/** Called ONLY after verified gateway amount/factorId and while order row is locked. */
function stage9CommitBooks(PDO $pdo,string $orderId,array $items): void {
    if (!$pdo->inTransaction()) throw new RuntimeException('inventory_transaction_required');
    $required=[];
    foreach ($items as $line) {
        if (($line['kind']??'')==='book') {
            $sku=(string)($line['sku']??'');$qty=$line['quantity']??null;
            if (!preg_match('/^book:[a-z0-9-]{1,40}$/D',$sku) || !is_int($qty) || $qty<1 || $qty>20 ||
                isset($required[$sku])) throw new RuntimeException('invalid_paid_stock');
            $required[$sku]=$qty;
        }
    }
    ksort($required,SORT_STRING);
    if (!$required) return;
    $select=$pdo->prepare('SELECT quantity,state FROM commerce_book_reservations WHERE order_id=? AND sku=? FOR UPDATE');
    foreach ($required as $sku=>$qty) {
        $select->execute([$orderId,$sku]);$reservation=$select->fetch();
        if (!$reservation || $reservation['state']!=='reserved' ||
            (int)$reservation['quantity']!==$qty) throw new RuntimeException('stock_reservation_missing');
        $u=$pdo->prepare('UPDATE commerce_book_stock SET physical_on_hand=physical_on_hand-?, reserved=reserved-? WHERE sku=? AND physical_on_hand>=? AND reserved>=?');
        $u->execute([$qty,$qty,$sku,$qty,$qty]);
        if ($u->rowCount()!==1) throw new RuntimeException('stock_commit_conflict');
        $pdo->prepare("UPDATE commerce_book_reservations SET state='committed' WHERE order_id=? AND sku=? AND state='reserved'")
            ->execute([$orderId,$sku]);
        $pdo->prepare("INSERT INTO commerce_stock_movements(order_id,sku,reason,units) VALUES(?,?,'sale',?)")
            ->execute([$orderId,$sku,-$qty]);
    }
}
/**
 * Server-side BitPay verification already happened before calling this.
 * One transaction locks the order, prevents a cross-order provider transaction
 * claim, commits stock exactly once and records a deduplicated fulfilment event.
 * Return false for same-order replay/nonpending; throw on cross-order collision.
 */
function stage9FinalizePayment(PDO $pdo,string $orderId,string $idGet,string $trans,string $verifiedAmount,string $verifiedFactor): bool {
    if (!preg_match('/^[1-9][0-9]*$/D',$idGet) || !preg_match('/^[1-9][0-9]*$/D',$trans))
        throw new RuntimeException('invalid_gateway_identity');
    $pdo->beginTransaction();
    try {
        $s=$pdo->prepare('SELECT state,provider_id_get,provider_amount,factor_id,items_json FROM commerce_orders WHERE id=? FOR UPDATE');
        $s->execute([$orderId]);$row=$s->fetch();
        if (!$row || $row['state']!=='pending' || (string)$row['provider_id_get']!==$idGet) {
            $pdo->rollBack();return false;
        }
        // Re-check all provider-verified values against the locked current row,
        // not merely a stale pre-network order snapshot.
        if ((string)$row['provider_amount']!==$verifiedAmount ||
            (string)$row['factor_id']!==$verifiedFactor)
            throw new RuntimeException('gateway_order_changed');
        $items=json_decode((string)$row['items_json'],true);
        if (!is_array($items) || !$items) throw new RuntimeException('invalid_order_items');
        $pdo->prepare("INSERT INTO commerce_payment_claims(provider,transaction_id,order_id,verified_amount) VALUES('bitpay',?,?,?)")
            ->execute([$trans,$orderId,(int)$row['provider_amount']]);
        stage9CommitBooks($pdo,$orderId,$items);
        // Atomically allocate the digital author's share, talent fund share,
        // 7% external platform cost, and two private PDF entitlements.
        // Any failure rolls back the bank claim and order state for safe retry.
        $hasDigitalOrder=false;
        foreach($items as $line){if(($line['kind']??null)==='digital'){$hasDigitalOrder=true;break;}}
        if($hasDigitalOrder){
            if(!function_exists('jrPubCommitVerifiedDigitalOrder'))
                throw new RuntimeException('digital_fulfilment_module_missing');
            jrPubCommitVerifiedDigitalOrder($pdo,$orderId,$items);
        }
        // A gateway-verified paid book order needs one physical fulfilment work
        // item. "preparing" is NOT a shipment, label, carrier acceptance or
        // delivery claim. The unique order PK and same locked transaction
        // prevent duplicate parcels on callback replay or concurrent payment.
        $hasBooks=false;
        foreach ($items as $item) {
            if (($item['kind']??null)==='book') { $hasBooks=true; break; }
        }
        if ($hasBooks) {
            $parcel=$pdo->prepare("INSERT INTO commerce_parcels(order_id,state) VALUES(?,'preparing')");
            $parcel->execute([$orderId]);
        }
        $case=$pdo->prepare("INSERT INTO commerce_service_cases(order_id,sku,status) VALUES(?,?,'awaiting_contact')");
        $seen=[];
        foreach ($items as $item) {
            $sku=(string)($item['sku']??'');
            if (str_starts_with($sku,'service:') || str_starts_with($sku,'vip:')) {
                if (isset($seen[$sku]) || ($item['quantity']??null)!==1 ||
                    !preg_match('/^(?:service|vip):[a-z0-9_-]{1,60}$/D',$sku))
                    throw new RuntimeException('invalid_service_order');
                $seen[$sku]=true;
                // An administrative follow-up case is NOT an appointment or entitlement.
                $case->execute([$orderId,$sku]);
            }
        }
        $u=$pdo->prepare("UPDATE commerce_orders SET state='paid',provider_trans_id=?,paid_at=NOW(),updated_at=NOW() WHERE id=? AND state='pending' AND provider_id_get=?");
        $u->execute([$trans,$orderId,$idGet]);
        if ($u->rowCount()!==1) throw new RuntimeException('payment_state_conflict');
        $pdo->prepare("INSERT INTO commerce_outbox(event_key,order_id,event_type) VALUES(?,?,'order_paid')")
            ->execute(['order_paid:'.$orderId,$orderId]);
        $pdo->commit();
        return true;
    } catch(Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}
