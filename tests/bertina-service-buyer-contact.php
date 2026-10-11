<?php
declare(strict_types=1);
// Unit-test the actual production contact normalization without SMTP, DB, or payments.
$source = (string)file_get_contents(__DIR__.'/../api/index.php');
$start=strpos($source,'function normalizedServiceBuyer(');
$end=strpos($source,'function token(', $start===false?0:$start);
if($start===false||$end===false||$end<=$start)throw new RuntimeException('service_buyer_not_found');
function fail(string $code):never {throw new InvalidArgumentException($code);}
function emailNorm(mixed $e):string {return strtolower(trim((string)$e));}
function validEmail(string $e):bool {return filter_var($e,FILTER_VALIDATE_EMAIL)!==false;}
function textLen(string $v):int {return strlen($v);}
eval(substr($source,$start,$end-$start));
function expectReject(mixed $input,string $code):void {
 try{normalizedServiceBuyer($input);throw new RuntimeException('unrejected: '.$code);}
 catch(InvalidArgumentException $e){if($e->getMessage()!==$code)throw $e;}
 echo 'PASS: rejected '.$code.PHP_EOL;
}
$buyer=normalizedServiceBuyer(['name'=>'Student Buyer','email'=>' Student.Example@Example.com ','phone'=>'']);
if($buyer['email']!=='student.example@example.com'||$buyer['name']!=='Student Buyer')throw new RuntimeException('invalid normalization');
expectReject(null,'customer_required');
expectReject(['name'=>'A','email'=>'buyer@example.com'],'invalid_customer_name');
expectReject(['name'=>'Student','email'=>'invalid'],'invalid_customer_email');
expectReject(['name'=>'Student','email'=>'buyer@example.com','phone'=>'abc'],'invalid_delivery_phone');
echo 'PASS: server contact retention requires valid name and email'.PHP_EOL;
