<?php
declare(strict_types=1);
// Synthetic buyer preference acceptance. Never connect to the Bertina production DB.
$dsn=(string)(getenv('OPERATIONS_TEST_DSN')?:'');
if(!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/D',$dsn)) {
    fwrite(STDERR,"Refusing to run outside isolated operations_fixture\n");exit(2);
}
$pdo=new PDO($dsn,(string)(getenv('OPERATIONS_TEST_USER')?:''),(string)(getenv('OPERATIONS_TEST_PASSWORD')?:''),[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES=>false,
]);
define('BERTINA_API_BOOTSTRAPPED',true);
require_once __DIR__.'/../api/commerce-stage9.php';
require_once __DIR__.'/../api/consultation-delivery.php';
function validUuid(string $value): bool {
    return preg_match('/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/iD',$value)===1;
}
function localCatalog(): array {
    return [
        'service:academic_consult_60'=>['kind'=>'service','price'=>1000000],
        'vip:golden-talent-signature'=>['kind'=>'vip','price'=>6000000]
    ];
}
function ensureChoice(bool $condition,string $label): void {
    if(!$condition)throw new RuntimeException('FAIL: '.$label);
    echo "PASS ".$label."\n";
}
function denied(callable $fn,string $expected,string $label): void {
    try{$fn();}catch(Throwable $e) {
        ensureChoice($e instanceof $expected,$label);return;
    }
    throw new RuntimeException('FAIL: accepted '.$label);
}
$pdo->exec(file_get_contents(__DIR__.'/../docs/BERTINA_MYSQL_SCHEMA.sql'));
$pdo->exec(file_get_contents(__DIR__.'/../docs/migrations/20261012_stage09_commerce.sql'));
ensureChoice(stage9SchemaReady($pdo),'commerce fixture schema ready');
// Earlier Stage09 fixture tests may already have applied these tables to
// this same CI database. Shadow one table ONLY in this connection to prove
// fail-closed readiness without dropping anyone else's fixture tables.
$pdo->exec('CREATE TEMPORARY TABLE commerce_consultation_preferences
    (order_id CHAR(36) NOT NULL)');
ensureChoice(!commerceConsultationPreferenceSchemaReady($pdo),
    'missing preference columns fail closed even when a namesake table exists');
$pdo->exec('DROP TEMPORARY TABLE commerce_consultation_preferences');
$pdo->exec(file_get_contents(__DIR__.'/../docs/migrations/20261014_consultation_preferences.sql'));
ensureChoice(commerceConsultationPreferenceSchemaReady($pdo),'additive consultation SQL installs required columns');
$tables=$pdo->query("SELECT TABLE_NAME AS table_name, ENGINE AS engine FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name IN
      ('commerce_consultation_preferences','commerce_consultation_preference_events')")->fetchAll();
ensureChoice(count($tables)===2 && !array_filter($tables,static fn(array $x)=>$x['engine']!=='InnoDB'),
    'both new tables are transactional InnoDB');
$owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
$order='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
$vipOrder='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
$unpaid='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
$sku='service:academic_consult_60';
$vipSku='vip:golden-talent-signature';
$email='buyer@example.invalid';
$insertOrder=$pdo->prepare("INSERT INTO commerce_orders
  (id,factor_id,amount_toman,provider_amount,currency,customer_email,items_json,state,
   provider_id_get,provider_trans_id,paid_at)
  VALUES(?,?,?,?,? ,?,?,'paid','001',?,NOW())");
$insertOrder->execute([$order,'mock-normal',1000000,10000000,'IRT',$email,
    '[{"kind":"service","sku":"service:academic_consult_60","quantity":1,"price":1000000,"subtotal":1000000}]','test-tx-normal']);
$insertOrder->execute([$vipOrder,'mock-vip',6000000,60000000,'IRT',$email,
    '[{"kind":"vip","sku":"vip:golden-talent-signature","quantity":1,"price":6000000,"subtotal":6000000}]','test-tx-vip']);
$insertOrder->execute([$unpaid,'mock-unmatched',1000000,10000000,'IRT',$email,
    '[{"kind":"service","sku":"service:academic_consult_60","quantity":1,"price":1000000,"subtotal":1000000}]','test-tx-unmatched']);
$claim=$pdo->prepare("INSERT INTO commerce_payment_claims
    (provider,transaction_id,order_id,verified_amount) VALUES('bitpay',?,?,?)");
$claim->execute(['test-tx-normal',$order,10000000]);
$claim->execute(['test-tx-vip',$vipOrder,60000000]);
$cases=$pdo->prepare("INSERT INTO commerce_service_cases(order_id,sku,status)
    VALUES(?,?,'awaiting_contact')");
$cases->execute([$order,$sku]);
$cases->execute([$vipOrder,$vipSku]);
$cases->execute([$unpaid,$sku]);
ensureChoice(commerceConsultationModes($sku)===['PHONE','VIDEO'],'normal counselling only phone/video');
ensureChoice(commerceConsultationModes($vipSku)===['PHONE','VIDEO','IN_PERSON'],'catalogued VIP may request in-person');
ensureChoice(commerceConsultationModes('service:annual_coaching')===[],'uncatalogued annual coaching is disabled');
ensureChoice(!commerceConsultationValidChoice($sku,'IN_PERSON','KASHAN'),'ordinary in-person denied');
ensureChoice(!commerceConsultationValidChoice($vipSku,'IN_PERSON','ISFAHAN'),'unapproved VIP city denied');
ensureChoice(!commerceConsultationValidChoice($vipSku,'VIDEO','TEHRAN'),'video may not contain a city');
ensureChoice(commerceConsultationValidChoice($vipSku,'IN_PERSON','TEHRAN')
    && commerceConsultationValidChoice($vipSku,'IN_PERSON','KASHAN'),'only Tehran/Kashan permitted');
$choice=['orderId'=>$order,'sku'=>$sku,'mode'=>'PHONE','city'=>null];
denied(fn()=>commerceConsultationSavePreference($pdo,$owner,'wrong@example.invalid',$choice),
    DomainException::class,'another buyer cannot choose delivery');
denied(fn()=>commerceConsultationSavePreference($pdo,$owner,$email,
    array_merge($choice,['orderId'=>$unpaid])),DomainException::class,
    'a paid flag without unique provider claim is insufficient');
denied(fn()=>commerceConsultationSavePreference($pdo,$owner,$email,
    array_merge($choice,['mode'=>'IN_PERSON','city'=>'TEHRAN'])),InvalidArgumentException::class,
    'ordinary service in-person policy is server-enforced');
denied(fn()=>commerceConsultationSavePreference($pdo,$owner,$email,
    array_merge($choice,['city'=>'KASHAN'])),InvalidArgumentException::class,
    'telephone must not carry a physical location');
denied(fn()=>commerceConsultationSavePreference($pdo,$owner,$email,
    array_merge($choice,['extra'=>'x'])),InvalidArgumentException::class,
    'unexpected request fields are rejected');
$saved=commerceConsultationSavePreference($pdo,$owner,$email,$choice);
ensureChoice($saved['deliveryMode']==='PHONE' && $saved['appointmentConfirmed']===false,
    'buyer choice saved without promising a reserved appointment');
$eventCount=static fn():int=>(int)$pdo->query('SELECT COUNT(*) FROM commerce_consultation_preference_events')->fetchColumn();
ensureChoice($eventCount()===1,'preference change produces exactly one audit event');
commerceConsultationSavePreference($pdo,$owner,$email,$choice);
ensureChoice($eventCount()===1,'idempotent preference does not create repeated audits');
$video=commerceConsultationSavePreference($pdo,$owner,$email,array_merge($choice,['mode'=>'VIDEO']));
ensureChoice($video['deliveryMode']==='VIDEO' && $eventCount()===2,
    'buyer may change telephone to video before a booking');
$vipChoice=['orderId'=>$vipOrder,'sku'=>$vipSku,'mode'=>'IN_PERSON','city'=>'TEHRAN'];
ensureChoice(commerceConsultationSavePreference($pdo,$owner,$email,$vipChoice)['meetingCity']==='TEHRAN',
    'VIP may select Tehran');
ensureChoice(commerceConsultationSavePreference($pdo,$owner,$email,array_merge($vipChoice,['city'=>'KASHAN']))['meetingCity']==='KASHAN',
    'VIP may change preference to Kashan before booking');
$pdo->prepare("UPDATE commerce_service_cases SET status='booked'
    WHERE order_id=? AND sku=?")->execute([$order,$sku]);
denied(fn()=>commerceConsultationSavePreference($pdo,$owner,$email,$choice),
    DomainException::class,'buyer cannot overwrite confirmed booking preference');
$live=$pdo->prepare('SELECT delivery_mode,meeting_city FROM commerce_consultation_preferences WHERE order_id=? AND sku=?');
$live->execute([$order,$sku]);$last=$live->fetch();
ensureChoice($last['delivery_mode']==='VIDEO'&&$last['meeting_city']===null,'locked preference unchanged');
$log=$pdo->query("SELECT actor_account_id,previous_mode,next_mode FROM commerce_consultation_preference_events
    WHERE order_id='".$order."' ORDER BY event_id")->fetchAll();
ensureChoice(count($log)===2 && $log[0]['actor_account_id']===$owner
    && $log[0]['previous_mode']===null && $log[0]['next_mode']==='PHONE'
    && $log[1]['previous_mode']==='PHONE' && $log[1]['next_mode']==='VIDEO',
    'append-only change audit records transitions without PII');
echo "Consultation mode SQL and security fixture passed: synthetic rows only, no real payment or appointment.\n";
