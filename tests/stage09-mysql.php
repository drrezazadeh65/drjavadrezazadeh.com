<?php
declare(strict_types=1);
// Real concurrent InnoDB test in ISOLATED CI MySQL; NOT production Bertina.
// Reuses the established operations_fixture MySQL8 service and never touches live data.
$dsn=(string)getenv('OPERATIONS_TEST_DSN');
if(!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/',$dsn))
    throw new RuntimeException('isolated_fixture_database_required');
$pdo=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),(string)getenv('OPERATIONS_TEST_PASSWORD'),
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
define('BERTINA_API_BOOTSTRAPPED',true);
function localCatalog():array {
    $c=json_decode((string)file_get_contents(__DIR__.'/../assets/data/book-catalog.json'),true);
    $out=[];foreach($c['books']??[] as $b)$out['book:'.$b['id']]=['kind'=>'book'];
    return $out;
}
require __DIR__.'/../api/commerce-stage9.php';
function checkStage9(bool $pass,string $name):void {
    if(!$pass)throw new RuntimeException('stage09_mysql_failed_'.$name);
    echo "PASS ".$name."\n";
}
function putStock(PDO $pdo,string $sku,int $onHand):void {
    $s=$pdo->prepare('INSERT INTO commerce_book_stock(sku,physical_on_hand,reserved,reconciled_at) VALUES(?,?,0,NOW()) ON DUPLICATE KEY UPDATE physical_on_hand=VALUES(physical_on_hand),reserved=0,reconciled_at=NOW()');
    $s->execute([$sku,$onHand]);
}
function pendingOrder(PDO $pdo,string $id,string $factor,string $sku):void {
    $isBook=str_starts_with($sku,'book:');
    $items=json_encode([['kind'=>$isBook?'book':'service','sku'=>$sku,'quantity'=>1,'price'=>2000000,'subtotal'=>2000000]]);
    $s=$pdo->prepare("INSERT INTO commerce_orders(id,factor_id,amount_toman,provider_amount,currency,items_json,state,provider_id_get) VALUES(?,?,2000000,20000000,'IRT',?,'pending','111')");
    $s->execute([$id,$factor,$items]);
}
// Worker modes allow OS-level concurrency, separate PHP processes and separate MySQL sessions.
$mode=$argv[1]??null;
if($mode==='--reserve-worker'){
    $order=$argv[2];try{
        $pdo->beginTransaction();
        stage9ReserveBooks($pdo,$order,[['kind'=>'book','sku'=>'book:race','quantity'=>1]]);
        usleep(300000);$pdo->commit();echo "RESERVED\n";
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();echo "UNAVAILABLE\n";}
    exit;
}
if($mode==='--finalize-worker'){
    $order=$argv[2];
    try{$done=stage9FinalizePayment($pdo,$order,'111','909090','20000000','race-factor');
        echo $done?"FINALIZED\n":"REPLAY\n";
    }catch(Throwable $e){echo "ERROR\n";}exit;
}
$pdo->exec(file_get_contents(__DIR__.'/../docs/BERTINA_MYSQL_SCHEMA.sql'));
$pdo->exec(file_get_contents(__DIR__.'/../docs/migrations/20261012_stage09_commerce.sql'));
checkStage9(stage9SchemaReady($pdo),'additive_schema_present');
$pdo->exec('ALTER TABLE commerce_payment_claims DROP INDEX uq_payment_order');
checkStage9(!stage9SchemaReady($pdo),'missing_unique_claim_constraint_fails_closed');
$pdo->exec('ALTER TABLE commerce_payment_claims ADD UNIQUE KEY uq_payment_order(provider,order_id)');
checkStage9(stage9SchemaReady($pdo),'unique_claim_constraint_restored');
checkStage9(!stage9BookStockReady($pdo),'empty_live_stock_never_assumed');
foreach(['book:roshanaei'=>2,'book:tariki'=>0,'book:bonbast'=>0] as $sku=>$qty)putStock($pdo,$sku,$qty);
checkStage9(stage9BookStockReady($pdo),'all_three_reconciled_rows_required');
$a='11111111-1111-4111-8111-111111111171';$b='11111111-1111-4111-8111-111111111172';
$pdo->beginTransaction();stage9ReserveBooks($pdo,$a,[['kind'=>'book','sku'=>'book:roshanaei','quantity'=>1]]);pendingOrder($pdo,$a,'test-factor-1','book:roshanaei');$pdo->commit();
$pdo->beginTransaction();stage9ReserveBooks($pdo,$b,[['kind'=>'book','sku'=>'book:roshanaei','quantity'=>1]]);pendingOrder($pdo,$b,'test-factor-2','book:roshanaei');$pdo->commit();
$pdo->beginTransaction();
try{stage9ReserveBooks($pdo,'no-stock',[['kind'=>'book','sku'=>'book:roshanaei','quantity'=>1]]);throw new RuntimeException('oversell_success');}
catch(RuntimeException $e){checkStage9($e->getMessage()==='stock_unavailable','no_oversell');$pdo->rollBack();}
checkStage9(stage9FinalizePayment($pdo,$a,'111','717171','20000000','test-factor-1'),'first_paid');
checkStage9(stage9FinalizePayment($pdo,$a,'111','717171','20000000','test-factor-1')===false,'same_order_callback_replay');
try{stage9FinalizePayment($pdo,$b,'111','717171','20000000','test-factor-2');throw new RuntimeException('cross_order_replay_accepted');}
catch(PDOException $e){checkStage9(true,'cross_order_claim_unique');}
checkStage9(stage9FinalizePayment($pdo,$b,'111','727272','20000000','test-factor-2'),'second_unique_paid');
$read=$pdo->query("SELECT physical_on_hand,reserved FROM commerce_book_stock WHERE sku='book:roshanaei'")->fetch();
checkStage9((int)$read['physical_on_hand']===0&&(int)$read['reserved']===0,'zero_remaining_nonnegative');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_payment_claims")->fetchColumn()===2,'claims_once');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_outbox")->fetchColumn()===2,'outbox_once');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_stock_movements WHERE reason='sale'")->fetchColumn()===2,'stock_movements_once');

function workers(array $commands):array {
    $tasks=[];
    foreach($commands as $args){
        $cmd=array_merge([PHP_BINARY,__FILE__],$args);
        $p=proc_open($cmd,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
        if(!is_resource($p))throw new RuntimeException('worker_creation_failed');
        fclose($pipes[0]);$tasks[]=[$p,$pipes];
    }
    $results=[];
    foreach($tasks as [$p,$pipes]){
        $out=trim(stream_get_contents($pipes[1]));$err=trim(stream_get_contents($pipes[2]));
        fclose($pipes[1]);fclose($pipes[2]);$code=proc_close($p);
        if($code!==0)throw new RuntimeException('worker_exit_'.$code.' '.$err);
        $results[]=$out;
    }
    return $results;
}
putStock($pdo,'book:race',1);
$result=workers([['--reserve-worker','race-a'],['--reserve-worker','race-b']]);
sort($result);
checkStage9($result===['RESERVED','UNAVAILABLE'],'two_process_atomic_stock_race');
$race=$pdo->query("SELECT physical_on_hand,reserved FROM commerce_book_stock WHERE sku='book:race'")->fetch();
checkStage9((int)$race['physical_on_hand']===1&&(int)$race['reserved']===1,'race_stock_conservation');
$id='11111111-1111-4111-8111-111111111179';
pendingOrder($pdo,$id,'race-factor','service:academic_consult_60');
$result=workers([['--finalize-worker',$id],['--finalize-worker',$id]]);
sort($result);checkStage9($result===['FINALIZED','REPLAY'],'two_process_callback_idempotency');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_outbox WHERE order_id='".$id."'")->fetchColumn()===1,'parallel_outbox_exactly_once');
checkStage9((int)$pdo->query("SELECT COUNT(*) FROM commerce_service_cases WHERE order_id='".$id."' AND status='awaiting_contact'")->fetchColumn()===1,'service_case_pending_only');
echo "Stage09 MySQL8 multi-process acceptance passed (CI only, no bank/physical inventory evidence).\n";
