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
    $books=array_filter(localCatalog(),static fn(array $entry): bool => $entry['kind']==='book');
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
            if (!preg_match('/^book:[a-z0-9-]{1,40}$/D',$sku) || !is_int($qty) || $qty<1 ||
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
