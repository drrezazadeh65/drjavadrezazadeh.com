<?php
declare(strict_types=1);

// Route-level donation contract using real CI-only MySQL; all BitPay requests are mocked.
$dsn=(string)getenv('OPERATIONS_TEST_DSN');
if(!preg_match('/(?:^|;)dbname=operations_fixture(?:;|$)/',$dsn))throw new RuntimeException('isolated_fixture_database_required');
$pdo=new PDO($dsn,(string)getenv('OPERATIONS_TEST_USER'),(string)getenv('OPERATIONS_TEST_PASSWORD'),[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES=>false
]);
$pdo->exec((string)file_get_contents(__DIR__.'/../docs/BERTINA_MYSQL_SCHEMA.sql'));
define('SITE_ORIGIN','https://drjavadrezazadeh.com');

final class DonationRouteResponse extends RuntimeException {
    public function __construct(public array $data, public int $status) { parent::__construct('response'); }
}
function respond(array $data,int $status=200): never { throw new DonationRouteResponse($data,$status); }
function fail(string $code,int $status=400): never { respond(['ok'=>false,'error'=>$code],$status); }
function requirePostOrigin(): void { $GLOBALS['originChecks']++; }
function commerceReady(): bool { return $GLOBALS['ready']; }
function db(): ?PDO { return $GLOBALS['pdo']; }
// Cookie ownership proof is mandatory before starting a provider payment.
// Mock only its result: never mint a real cookie, key, customer or gateway token.
function commerceReceiptGrant(string $orderId): bool {
    $GLOBALS['receiptGrantCalls']++;
    if ($orderId !== uuidv4()) throw new RuntimeException('receipt_grant_wrong_order');
    return $GLOBALS['receiptGrantReady'];
}
function jsonBody(): array { return $GLOBALS['input']; }
function validEmail(string $email): bool { return filter_var($email,FILTER_VALIDATE_EMAIL)!==false; }
function rateAllowed(PDO $pdo,string $action,string $identity,int $max,int $window): bool {
    if($action!=='donations_create'||$max>5||$window!==900)throw new RuntimeException('incorrect_donation_rate_limit');
    return true;
}
function cfg(): array { return ['bitpay_amount_multiplier'=>'10']; }
function uuidv4(): string { return '11111111-1111-4111-8111-111111111118'; }
function gatewayPost(string $endpoint,array $fields): string {
    $GLOBALS['gatewayCalls']++;
    if($endpoint!=='gateway-send'||$fields['amount']!==(string)(($GLOBALS['expectedToman']??10000)*10)||
       $fields['redirect']!==SITE_ORIGIN.'/api/commerce/callback?order='.uuidv4()) {
       throw new RuntimeException('incorrect_gateway_arguments');
    }
    return $GLOBALS['gatewayMode']==='reject'?'-4':'789123';
}
function assertDonation(bool $condition,string $case): void {
    if(!$condition)throw new RuntimeException('donations_mysql_contract_failed: '.$case);
    echo "PASS $case\n";
}
$source=(string)file_get_contents(__DIR__.'/../api/index.php');
$start=strpos($source,"if(\$path==='/donations/health'&&");
// Stop at the next independent route family, not at the AI assistant route:
// assistant syntax and intervening routes may evolve independently of donations.
$end=strpos($source,"if(str_starts_with(\$path,'/growth/'))",$start===false?0:$start);
if($start===false||$end===false||$end<=$start||
    !str_contains(substr($source,$start,$end-$start),"if(\$path==='/donations/create'&&"))
    throw new RuntimeException('Could not extract donation production route');
$route=substr($source,$start,$end-$start);
$id=uuidv4();
$GLOBALS['pdo']=$pdo;
$pdo->prepare('DELETE FROM commerce_orders WHERE id=?')->execute([$id]);
function donationRequest(string $route,string $path,string $method,array $data=[]): DonationRouteResponse {
    $GLOBALS['input']=$data;
    $verb=$method;
    try {
        eval($route);
        throw new RuntimeException('Route returned without a response');
    }catch(DonationRouteResponse $response){return $response;}
}
try {
    $GLOBALS['originChecks']=0;
    $GLOBALS['gatewayCalls']=0;
    $GLOBALS['gatewayMode']='ok';
    $GLOBALS['receiptGrantReady']=true;
    $GLOBALS['receiptGrantCalls']=0;
    $GLOBALS['ready']=false;
    $health=donationRequest($route,'/donations/health','GET');
    assertDonation($health->status===200&&$health->data['checkout']===false,'health_fails_closed_without_gateway');
    $disabled=donationRequest($route,'/donations/create','POST',['amountToman'=>10000]);
    assertDonation($disabled->status===503&&$disabled->data['error']==='donations_disabled','no_charge_when_gateway_offline');
    $GLOBALS['ready']=true;
    $healthy=donationRequest($route,'/donations/health','GET');
    assertDonation($healthy->status===200&&$healthy->data['checkout']===true&&
      $healthy->data['minToman']===1000&&$healthy->data['maxToman']===10000000,'health_amount_limits_and_readiness');

    foreach([999,10000001,10000.25,'10000',-10000,null] as $invalid){
        $result=donationRequest($route,'/donations/create','POST',['amountToman'=>$invalid]);
        assertDonation($result->status===400&&$result->data['error']==='invalid_donation_amount',
            'reject_invalid_amount_'.json_encode($invalid));
    }
    $badFocus=donationRequest($route,'/donations/create','POST',['amountToman'=>10000,'focus'=>'student-id-or-url']);
    assertDonation($badFocus->status===400&&$badFocus->data['error']==='invalid_support_focus','reject_unverified_student_target');
    $badEmail=donationRequest($route,'/donations/create','POST',['amountToman'=>10000,'email'=>'not-an-email']);
    assertDonation($badEmail->status===400&&$badEmail->data['error']==='invalid_donation_email','reject_invalid_optional_email');
    assertDonation($GLOBALS['gatewayCalls']===0,'invalid_payloads_never_contact_gateway');

    // Regression: when the receipt capability cannot be set, do not contact
    // the bank or create an orphaned order. The production code must fail closed.
    $GLOBALS['receiptGrantReady']=false;
    $beforeGatewayCalls=$GLOBALS['gatewayCalls'];
    $deniedReceipt=donationRequest($route,'/donations/create','POST',['amountToman'=>10000]);
    assertDonation($deniedReceipt->status===503&&
        ($deniedReceipt->data['error']??null)==='receipt_access_unavailable',
        'failed_receipt_capability_blocks_donation_before_gateway');
    assertDonation($GLOBALS['gatewayCalls']===$beforeGatewayCalls,
        'receipt_failure_never_contacts_provider');
    $testOrder=$pdo->prepare('SELECT COUNT(*) FROM commerce_orders WHERE id=?');$testOrder->execute([$id]);
    assertDonation((int)$testOrder->fetchColumn()===0,'receipt_failure_never_creates_unowned_order');
    $GLOBALS['receiptGrantReady']=true;

    $GLOBALS['gatewayMode']='reject';
    $denied=donationRequest($route,'/donations/create','POST',['amountToman'=>10000]);
    assertDonation($denied->status===502&&$denied->data['error']==='gateway_rejected','provider_rejection_does_not_return_payment_url');
    $s=$pdo->prepare('SELECT state FROM commerce_orders WHERE id=?');$s->execute([$id]);
    assertDonation($s->fetchColumn()==='failed','failed_gateway_order_stays_unpaid');

    $pdo->prepare('DELETE FROM commerce_orders WHERE id=?')->execute([$id]);
    $GLOBALS['gatewayMode']='ok';
    $response=donationRequest($route,'/donations/create','POST',['amountToman'=>10000,'email'=>'donor@example.test','focus'=>'books']);
    assertDonation($response->status===200&&($response->data['ok']??false)===true&&
        $response->data['orderId']===$id&&$response->data['amountToman']===10000&&
        $response->data['currency']==='IRT','minimum_purchase_free_test_payment_created');
    $expected=SITE_ORIGIN.'/fa/shop/payment-start/?gateway='.rawurlencode('https://bitpay.ir/payment/gateway-789123-get');
    assertDonation($response->data['paymentUrl']===$expected,'strict_bitpay_redirect');
    $stmt=$pdo->prepare('SELECT state,amount_toman,provider_amount,provider_id_get,items_json,customer_email,customer_json FROM commerce_orders WHERE id=?');
    $stmt->execute([$id]);$row=$stmt->fetch();
    assertDonation(is_array($row)&&$row['state']==='pending'&&(int)$row['amount_toman']===10000&&
        (int)$row['provider_amount']===100000&&$row['provider_id_get']==='789123','correct_real_mysql_order_and_currency_conversion');
    $lines=json_decode($row['items_json'],true);
    assertDonation($lines[0]['kind']==='donation'&&$lines[0]['sku']==='support:students'&&
        $lines[0]['program']==='talented-students-v1'&&$lines[0]['focus']==='books'&&
        $lines[0]['allocation']==='pending_verified_need'&&
        $lines[0]['quantity']===1&&$lines[0]['subtotal']===10000,'distinct_support_line_no_book_sale');
    assertDonation($row['customer_email']==='donor@example.test'&&$row['customer_json']===null,'optional_email_without_shipping_details');
    assertDonation($GLOBALS['originChecks']>=2&&$GLOBALS['gatewayCalls']===2,'csrf_origin_gate_and_provider_init_once_per_valid_request');
    // The 10,000,000-toman upper boundary must survive provider conversion and storage.
    $pdo->prepare('DELETE FROM commerce_orders WHERE id=?')->execute([$id]);
    $GLOBALS['expectedToman']=10000000;
    $upper=donationRequest($route,'/donations/create','POST',['amountToman'=>10000000,'focus'=>'scholarship']);
    assertDonation($upper->status===200&&($upper->data['amountToman']??null)===10000000,'upper_limit_is_accepted_without_real_payment');
    $upperQuery=$pdo->prepare('SELECT amount_toman,provider_amount,state,items_json FROM commerce_orders WHERE id=?');
    $upperQuery->execute([$id]);$upperRow=$upperQuery->fetch();
    $upperLines=json_decode((string)($upperRow['items_json']??''),true);
    assertDonation(is_array($upperRow)&&(int)$upperRow['amount_toman']===10000000&&
        (int)$upperRow['provider_amount']===100000000&&$upperRow['state']==='pending'&&
        $upperLines[0]['focus']==='scholarship'&&$upperLines[0]['subtotal']===10000000,
        'upper_limit_currency_and_allocation_integrity');
    echo "Bertina voluntary support contract passed with isolated MySQL and mocked BitPay.\n";
}finally{
    $pdo->prepare('DELETE FROM commerce_orders WHERE id=?')->execute([$id]);
}
