<?php
/**
 * Scoped production initializer for the owner's SINGLE TWO-VOLUME Webster set.
 *
 * Called only by the one-click, owner-authenticated ephemeral Bertina deploy
 * endpoint AFTER the existing live-SHA/recovery-policy checks and BEFORE
 * updating public site files. It is never exposed as an HTTP application route.
 *
 * The legacy mother database and all existing customer/order/payment rows are
 * retained. Missing Stage09 structures are installed additively using their
 * canonical DDL. Never reset existing inventory or resurrect a sold copy.
 * MySQL/MariaDB DDL implicitly commits; successful DDL is intentionally
 * persistent even if the subsequent public release fails.
 */
function drjrInstallOwnerWebsterSingleSet(PDO $pdo): array {
    if ((string)$pdo->getAttribute(PDO::ATTR_DRIVER_NAME)!=='mysql' ||
        (string)$pdo->query('SELECT DATABASE()')->fetchColumn()!=='drjavad1_store')
        throw new RuntimeException('webster_wrong_mother_database');

    $lockName='drjr_webster_single_set_v1';
    $lock=$pdo->prepare('SELECT GET_LOCK(?,10)');
    $lock->execute([$lockName]);
    if ((int)$lock->fetchColumn()!==1) throw new RuntimeException('webster_migration_locked');
    try {
        // Canonical Stage09 tables from docs/migrations/20261012_stage09_commerce.sql.
        // There is NO duplicate orders table and NO parallel commerce schema.
        $ddl=[
            'commerce_book_stock'=><<<'SQL'
CREATE TABLE IF NOT EXISTS commerce_book_stock (
  sku VARCHAR(80) PRIMARY KEY,
  physical_on_hand INT UNSIGNED NOT NULL,
  reserved INT UNSIGNED NOT NULL DEFAULT 0,
  reconciled_at DATETIME NULL,
  reconciled_by VARCHAR(100) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL
,
            'commerce_book_reservations'=><<<'SQL'
CREATE TABLE IF NOT EXISTS commerce_book_reservations (
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  state ENUM('reserved','committed','released') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id,sku),
  INDEX idx_book_reservations_sku_state (sku,state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL
,
            'commerce_stock_movements'=><<<'SQL'
CREATE TABLE IF NOT EXISTS commerce_stock_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  reason ENUM('sale','release','adjustment','physical_return') NOT NULL,
  units INT NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_book_movement (order_id,sku,reason),
  INDEX idx_book_movement_sku (sku,recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL
,
            'commerce_payment_claims'=><<<'SQL'
CREATE TABLE IF NOT EXISTS commerce_payment_claims (
  provider VARCHAR(24) NOT NULL,
  transaction_id VARCHAR(80) NOT NULL,
  order_id CHAR(36) NOT NULL,
  verified_amount BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (provider,transaction_id),
  UNIQUE KEY uq_payment_order (provider,order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL
,
            'commerce_outbox'=><<<'SQL'
CREATE TABLE IF NOT EXISTS commerce_outbox (
  event_key VARCHAR(120) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  state ENUM('pending','processing','sent','failed') NOT NULL DEFAULT 'pending',
  attempts INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_commerce_outbox_dispatch (state,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL
,
            'commerce_service_cases'=><<<'SQL'
CREATE TABLE IF NOT EXISTS commerce_service_cases (
  order_id CHAR(36) NOT NULL,
  sku VARCHAR(80) NOT NULL,
  status ENUM('awaiting_contact','scheduling','booked','in_progress','delivered','cancelled') NOT NULL,
  booking_start DATETIME NULL,
  booking_end DATETIME NULL,
  delivered_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id,sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL
,
            'commerce_parcels'=><<<'SQL'
CREATE TABLE IF NOT EXISTS commerce_parcels (
  order_id CHAR(36) NOT NULL PRIMARY KEY,
  carrier VARCHAR(100) NULL,
  tracking_code VARCHAR(100) NULL,
  state ENUM('preparing','dispatched','in_transit','delivered','returned') NOT NULL,
  dispatched_at DATETIME NULL,
  delivered_at DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_carrier_tracking (carrier,tracking_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL
,
            'commerce_refund_requests'=><<<'SQL'
CREATE TABLE IF NOT EXISTS commerce_refund_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  requester_account_id CHAR(36) NOT NULL,
  status ENUM('requested','reviewing','approved','declined','settled') NOT NULL,
  reason_code VARCHAR(40) NOT NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at DATETIME NULL,
  INDEX idx_commerce_refunds_order (order_id),
  UNIQUE KEY uq_commerce_refund_request (order_id,requester_account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL
        ];
        $schemaRows=$pdo->query("SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES
            WHERE TABLE_SCHEMA=DATABASE()")->fetchAll(PDO::FETCH_ASSOC);
        $engines=[];
        foreach($schemaRows as $row)
            $engines[(string)$row['TABLE_NAME']]=(string)$row['ENGINE'];

        if (($engines['commerce_orders']??'')!=='InnoDB')
            throw new RuntimeException('webster_legacy_orders_not_innodb');
        $ordersCols=[];
        foreach ($pdo->query('SHOW COLUMNS FROM commerce_orders')->fetchAll(PDO::FETCH_ASSOC) as $col)
            $ordersCols[(string)$col['Field']]=true;
        foreach(['id','items_json','currency','state'] as $required) {
            if(!isset($ordersCols[$required]))
                throw new RuntimeException('webster_legacy_orders_incompatible');
        }
        $created=[];
        foreach($ddl as $name=>$statement) {
            if (isset($engines[$name])) {
                if(strcasecmp($engines[$name],'InnoDB')!==0)
                    throw new RuntimeException('webster_existing_table_not_innodb');
                continue;
            }
            $pdo->exec($statement);
            $created[]=$name;
        }

        // Do not recreate or replace orders. Add only approved optional columns.
        $optional=[
          'customer_email'=>"ALTER TABLE commerce_orders ADD COLUMN customer_email VARCHAR(254) NULL",
          'customer_json'=>"ALTER TABLE commerce_orders ADD COLUMN customer_json LONGTEXT NULL",
          'receipt_email_sent_at'=>"ALTER TABLE commerce_orders ADD COLUMN receipt_email_sent_at DATETIME NULL"
        ];
        $added=[];
        foreach($optional as $name=>$statement) {
            if(!isset($ordersCols[$name])) {
                $pdo->exec($statement);
                $added[]=$name;
            }
        }

        // Unique payment identity is non-negotiable; any existing incompatible
        // table must be reviewed, never silently repaired with destructive DDL.
        $indexRows=$pdo->query('SHOW INDEX FROM commerce_payment_claims')->fetchAll(PDO::FETCH_ASSOC);
        $unique=[];
        foreach($indexRows as $idx) {
            if((int)$idx['Non_unique']===0)
                $unique[(string)$idx['Key_name']][(int)$idx['Seq_in_index']]=(string)$idx['Column_name'];
        }
        foreach($unique as &$set)ksort($set,SORT_NUMERIC);
        unset($set);
        if(array_values($unique['PRIMARY']??[])!==['provider','transaction_id'] ||
            array_values($unique['uq_payment_order']??[])!==['provider','order_id'])
            throw new RuntimeException('webster_payment_uniqueness_unverified');

        // The owner's one physical set is one indivisible SKU, never two units.
        // Inspect *all* historical states so paid, pending, or cancelled orders
        // can NEVER be re-stocked by a later deployment.
        $sku='book:websters-third-1981';
        $pdo->beginTransaction();
        try {
            $stock=$pdo->prepare("SELECT physical_on_hand,reserved,reconciled_at
              FROM commerce_book_stock WHERE sku=? FOR UPDATE");
            $stock->execute([$sku]);
            $current=$stock->fetch(PDO::FETCH_ASSOC);
            if(is_array($current)) {
                $state='existing_unchanged';
                // An existing zero quantity may be sold: NEVER upsert or reset.
            } else {
                $history=$pdo->prepare("SELECT id FROM commerce_orders
                    WHERE items_json LIKE ? LIMIT 1");
                $history->execute(['%websters-third-1981%']);
                $held=$pdo->prepare("SELECT order_id FROM commerce_book_reservations
                    WHERE sku=? LIMIT 1");
                $held->execute([$sku]);
                $movements=$pdo->prepare("SELECT id FROM commerce_stock_movements
                    WHERE sku=? LIMIT 1");
                $movements->execute([$sku]);
                if($history->fetch()||$held->fetch()||$movements->fetch()) {
                    // Never reinsert a previously sold or reserved set.
                    $state='historical_transaction_blocks_seed';
                } else {
                    $insert=$pdo->prepare("INSERT INTO commerce_book_stock
                     (sku,physical_on_hand,reserved,reconciled_at,reconciled_by)
                     VALUES (?,1,0,NOW(),'owner-confirmed-one-set-2026-10-28')");
                    $insert->execute([$sku]);
                    $state='one_set_seeded';
                }
            }
            $pdo->commit();
        } catch(Throwable $e) {
            if($pdo->inTransaction())$pdo->rollBack();
            throw $e;
        }
        // The deploy response contains only a fixed status and table names;
        // it never exposes customer records, payment data or DB credentials.
        return ['schema'=>'webster-single-physical-set-v1',
          'stockState'=>$state,'tablesCreated'=>$created,'columnsAdded'=>$added];
    } finally {
        $unlock=$pdo->prepare('SELECT RELEASE_LOCK(?)');
        $unlock->execute([$lockName]);
    }
}
