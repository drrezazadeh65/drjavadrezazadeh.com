<?php
declare(strict_types=1);
// Isolated executable tests against the actual Stage 09 functions.
// No real customers, external provider, network, bank account or Bertina DB.
define('BERTINA_API_BOOTSTRAPPED',true);
require __DIR__.'/../api/commerce-stage9.php';
function ok(bool $cond,string $case): void {if(!$cond)throw new RuntimeException('FAIL '.$case);echo "PASS ".$case."\n";}
final class Stage9FixtureDb extends PDO {
    public array $stock=['book:one'=>['physical_on_hand'=>2,'reserved'=>0,'reconciled_at'=>'2026-10-12']];
    public array $orders=[];
    public array $reservations=[];
    public array $claims=[];
    public array $outbox=[];
    public array $movements=[];
    public array $cases=[];
    public array $parcels=[];
    private ?array $before=null;
    public function __construct(){}
    public function beginTransaction(): bool {
        if($this->before!==null)throw new RuntimeException('nested_tx');
        $this->before=[$this->stock,$this->orders,$this->reservations,$this->claims,$this->outbox,$this->movements,$this->cases,$this->parcels];
        return true;
    }
    public function inTransaction(): bool {return $this->before!==null;}
    public function commit(): bool {$this->before=null;return true;}
    public function rollBack(): bool {
        if($this->before===null)throw new RuntimeException('no_tx');
        [$this->stock,$this->orders,$this->reservations,$this->claims,$this->outbox,$this->movements,$this->cases,$this->parcels]=$this->before;
        $this->before=null;return true;
    }
    public function prepare(string $query,array $options=[]): PDOStatement|false {return new Stage9FixtureStmt($this,$query);}
    public function query(string $query,?int $fetchMode=null,mixed ...$fetchModeArgs): PDOStatement|false {return new Stage9FixtureStmt($this,$query);}
}
final class Stage9FixtureStmt extends PDOStatement {
    private array $rows=[];private int $affected=0;
    public function __construct(private Stage9FixtureDb $db,private string $sql){}
    public function execute(?array $params=null): bool {
        $p=$params??[];$q=$this->sql;$d=$this->db;$this->rows=[];$this->affected=0;
        if(str_starts_with($q,'UPDATE commerce_book_stock SET reserved=reserved+?')){
            [$n,$sku,$n2]=$p;$x=$d->stock[$sku]??null;
            if($x&&$x['reconciled_at']!==null&&$x['physical_on_hand'] >= $x['reserved']+$n2){
                $d->stock[$sku]['reserved']+=$n;$this->affected=1;
            }
        }elseif(str_starts_with($q,'INSERT INTO commerce_book_reservations')){
            [$order,$sku,$qty]=$p;$key=$order.'|'.$sku;
            if(isset($d->reservations[$key]))throw new PDOException('duplicate_booking');
            $d->reservations[$key]=['sku'=>$sku,'quantity'=>$qty,'state'=>'reserved'];$this->affected=1;
        }elseif(str_starts_with($q,'SELECT state,provider_trans_id FROM commerce_orders')){
            if(isset($d->orders[$p[0]]))$this->rows=[$d->orders[$p[0]]];
        }elseif(str_starts_with($q,'SELECT COUNT(*) FROM commerce_payment_claims WHERE order_id=')){
            $count=0;foreach($d->claims as $claim)if($claim['order']===$p[0])$count++;
            $this->rows=[['count'=>$count]];
        }elseif(str_starts_with($q,'SELECT sku,quantity,state FROM commerce_book_reservations')){
            $order=$p[0];foreach($d->reservations as $key=>$r)if(str_starts_with($key,$order.'|'))$this->rows[]=$r;
        }elseif(str_starts_with($q,'SELECT quantity,state FROM commerce_book_reservations')){
            $this->rows=array_values(array_filter($d->reservations,fn($r,$key)=>$key===$p[0].'|'.$p[1],ARRAY_FILTER_USE_BOTH));
        }elseif(str_starts_with($q,'UPDATE commerce_book_stock SET physical_on_hand=')){
            [$n,$r,$sku,$needPhysical,$needReserved]=$p;$x=$d->stock[$sku]??null;
            if($x&&$x['physical_on_hand'] >=$needPhysical&&$x['reserved'] >=$needReserved){
                $d->stock[$sku]['physical_on_hand']-=$n;$d->stock[$sku]['reserved']-=$r;$this->affected=1;
            }
        }elseif(str_starts_with($q,'UPDATE commerce_book_stock SET reserved=reserved-?')){
            [$n,$sku,$need]=$p;
            if(isset($d->stock[$sku])&&$d->stock[$sku]['reserved'] >=$need){
                $d->stock[$sku]['reserved']-=$n;$this->affected=1;
            }
        }elseif(str_starts_with($q,'UPDATE commerce_book_reservations')){
            [$order,$sku]=$p;$key=$order.'|'.$sku;
            if(isset($d->reservations[$key])&&$d->reservations[$key]['state']==='reserved'){
                $d->reservations[$key]['state']=str_contains($q,"'released'")?'released':'committed';$this->affected=1;
            }
        }elseif(str_starts_with($q,'INSERT INTO commerce_stock_movements')){
            [$order,$sku,$units]=$p;$key=$order.'|'.$sku.'|'.(str_contains($q,"'release'")?'release':'sale');
            if(isset($d->movements[$key]))throw new PDOException('duplicate_movement');
            $d->movements[$key]=$units;$this->affected=1;
        }elseif(str_starts_with($q,'SELECT state,provider_id_get,provider_amount,factor_id,items_json FROM commerce_orders')){
            if(isset($d->orders[$p[0]]))$this->rows=[$d->orders[$p[0]]];
        }elseif(str_starts_with($q,'INSERT INTO commerce_payment_claims')){
            [$trans,$order,$amt]=$p;
            foreach($d->claims as $id=>$v)if($v['order']===$order)throw new PDOException('duplicate_order_claim');
            if(isset($d->claims[$trans]))throw new PDOException('duplicate_provider_transaction');
            $d->claims[$trans]=['order'=>$order,'amount'=>$amt];$this->affected=1;
        }elseif(str_starts_with($q,'INSERT INTO commerce_parcels')){
            [$order]=$p;
            if(isset($d->parcels[$order]))throw new PDOException('duplicate_parcel');
            $d->parcels[$order]='preparing';$this->affected=1;
        }elseif(str_starts_with($q,'INSERT INTO commerce_service_cases')){
            [$order,$sku]=$p;$key=$order.'|'.$sku;
            if(isset($d->cases[$key]))throw new PDOException('duplicate_case');
            $d->cases[$key]='awaiting_contact';$this->affected=1;
        }elseif(str_starts_with($q,'UPDATE commerce_orders SET state=')){
            [$trans,$order,$idGet]=$p;
            if(isset($d->orders[$order])&&$d->orders[$order]['state']==='pending'&&$d->orders[$order]['provider_id_get']===$idGet){
                $d->orders[$order]['state']='paid';$d->orders[$order]['provider_trans_id']=$trans;$this->affected=1;
            }
        }elseif(str_starts_with($q,'INSERT INTO commerce_outbox')){
            [$key,$order]=$p;if(isset($d->outbox[$key]))throw new PDOException('duplicate_event');
            $d->outbox[$key]=$order;$this->affected=1;
        }else{throw new RuntimeException('fixture_missing_query: '.substr($q,0,90));}
        return true;
    }
    public function rowCount(): int {return $this->affected;}
    public function fetch(int $mode=PDO::FETCH_DEFAULT,int $cursorOrientation=PDO::FETCH_ORI_NEXT,int $cursorOffset=0): mixed {
        return array_shift($this->rows)?:false;
    }
    public function fetchColumn(int $column=0): mixed { $row=array_shift($this->rows);return $row===null?false:array_values($row)[$column]??false; }
    public function fetchAll(int $mode=PDO::FETCH_DEFAULT,mixed ...$args): array {return $this->rows;}
}
function fixtureOrder(Stage9FixtureDb $db,string $id,string $sku='book:one'): void {
    $db->orders[$id]=['state'=>'pending','provider_id_get'=>'111','provider_amount'=>'20000000','factor_id'=>$id,
        'items_json'=>json_encode([['kind'=>str_starts_with($sku,'book:')?'book':'service','sku'=>$sku,'quantity'=>1]])];
}
// A malformed persisted order must never consume stock after gateway verification.
$invalidQtyDb=new Stage9FixtureDb();
$invalidQtyDb->beginTransaction();
stage9ReserveBooks($invalidQtyDb,'invalid',[['kind'=>'book','sku'=>'book:one','quantity'=>1]]);
$invalidQtyDb->commit();
fixtureOrder($invalidQtyDb,'invalid');
$invalidQtyDb->orders['invalid']['items_json']=json_encode([['kind'=>'book','sku'=>'book:one','quantity'=>21]]);
try {stage9FinalizePayment($invalidQtyDb,'invalid','111','888','20000000','invalid');throw new RuntimeException('invalid_paid_quantity_accepted');}
catch(RuntimeException $e){ok($e->getMessage()==='invalid_paid_stock','paid_quantity_limit_rechecked');}
ok($invalidQtyDb->stock['book:one']['physical_on_hand']===2 && $invalidQtyDb->stock['book:one']['reserved']===1,
 'invalid_paid_quantity_preserves_stock');
ok($invalidQtyDb->claims===[] && $invalidQtyDb->outbox===[] && $invalidQtyDb->orders['invalid']['state']==='pending',
 'invalid_paid_quantity_rolls_back_financial_claim');
$releaseDb=new Stage9FixtureDb();
fixtureOrder($releaseDb,'release-pending');
$releaseDb->beginTransaction();
stage9ReserveBooks($releaseDb,'release-pending',[['kind'=>'book','sku'=>'book:one','quantity'=>1]]);
$releaseDb->commit();
$releaseDb->orders['release-pending']['state']='paid';
$releaseDb->beginTransaction();
try {stage9ReleaseBooks($releaseDb,'release-pending');throw new RuntimeException('paid_stock_released');}
catch(RuntimeException $e){ok($e->getMessage()==='stock_release_order_not_safe','paid_stock_release_blocked');$releaseDb->rollBack();}
$releaseDb->orders['release-pending']['state']='pending';
$releaseDb->claims['provider-transaction']=['order'=>'release-pending','amount'=>20000000];
$releaseDb->beginTransaction();
try {stage9ReleaseBooks($releaseDb,'release-pending');throw new RuntimeException('claimed_stock_released');}
catch(RuntimeException $e){ok($e->getMessage()==='stock_release_payment_claim_exists','claimed_stock_release_blocked');$releaseDb->rollBack();}
unset($releaseDb->claims['provider-transaction']);
$releaseDb->beginTransaction();
stage9ReleaseBooks($releaseDb,'release-pending');
$releaseDb->commit();
ok($releaseDb->stock['book:one']['reserved']===0,'verified_cancel_release_path_retains_inventory');
$db=new Stage9FixtureDb();
try{stage9ReserveBooks($db,'a',[['kind'=>'book','sku'=>'book:one','quantity'=>1]]);throw new RuntimeException('no_tx_accepted');}
catch(RuntimeException $e){ok($e->getMessage()==='inventory_transaction_required','transaction_required');}
$db->beginTransaction();
stage9ReserveBooks($db,'a',[['kind'=>'book','sku'=>'book:one','quantity'=>1]]);
$db->commit();ok($db->stock['book:one']['reserved']===1,'reserve_one_unit');
$db->beginTransaction();
stage9ReserveBooks($db,'b',[['kind'=>'book','sku'=>'book:one','quantity'=>1]]);
$db->commit();ok($db->stock['book:one']['reserved']===2,'reserve_remaining_unit');
$db->beginTransaction();
try{stage9ReserveBooks($db,'c',[['kind'=>'book','sku'=>'book:one','quantity'=>1]]);throw new RuntimeException('oversell_accepted');}
catch(RuntimeException $e){ok($e->getMessage()==='stock_unavailable','oversell_rejected');$db->rollBack();}
ok($db->stock['book:one']['reserved']===2,'oversell_rollback_integrity');
fixtureOrder($db,'a');fixtureOrder($db,'b');
ok(stage9FinalizePayment($db,'a','111','777','20000000','a'),'verified_first_payment');
ok($db->stock['book:one']['physical_on_hand']===1&&$db->stock['book:one']['reserved']===1,'sold_decrements_stock_and_reservation');
ok(count($db->outbox)===1&&count($db->movements)===1,'single_outbox_and_stock_movement');
ok(($db->parcels['a']??null)==='preparing'&&count($db->parcels)===1,
 'verified_book_creates_one_unshipped_parcel');
ok(stage9FinalizePayment($db,'a','111','777','20000000','a')===false,'same_order_replay_idempotent');
try{stage9FinalizePayment($db,'b','111','777','20000000','b');throw new RuntimeException('cross_order_claim_accepted');}
catch(PDOException $e){ok(str_contains($e->getMessage(),'duplicate_provider_transaction'),'cross_order_replay_rejected');}
ok($db->stock['book:one']['physical_on_hand']===1&&$db->stock['book:one']['reserved']===1,'duplicate_claim_rollback_stock');
ok(count($db->parcels)===1,'cross_order_claim_rollback_does_not_create_parcel');
try{stage9FinalizePayment($db,'b','111','778','1','b');throw new RuntimeException('bad_amount_accepted');}
catch(RuntimeException $e){ok($e->getMessage()==='gateway_order_changed','locked_amount_rechecked');}
ok(stage9FinalizePayment($db,'b','111','778','20000000','b'),'independent_second_payment');
ok($db->stock['book:one']['physical_on_hand']===0&&$db->stock['book:one']['reserved']===0,'exact_final_stock');
ok(count($db->claims)===2&&count($db->outbox)===2,'no_duplicate_financial_events');
ok(count($db->parcels)===2&&($db->parcels['b']??null)==='preparing',
 'each_distinct_paid_book_order_has_one_preparing_parcel');
$service=new Stage9FixtureDb();fixtureOrder($service,'s','service:academic_consult_60');
ok(stage9FinalizePayment($service,'s','111','999','20000000','s'),'paid_service_processed');
ok(($service->cases['s|service:academic_consult_60']??'')==='awaiting_contact','case_not_fake_booking');
ok($service->parcels===[],'pure_service_purchase_has_no_shipping_parcel');
echo "Source-only atomic commerce fixtures passed. Real database concurrency, settlement and stock certification remain OPEN.\n";
