<?php
declare(strict_types=1);
// Test exact receipt authorization functions extracted from existing PHP API.
// Fixture only: no bank API, real customer, production credentials or live MySQL.
$source=file_get_contents(__DIR__.'/../api/index.php');
$start=strpos($source,'function commerceReceiptCookieName(');
$end=strpos($source,'function db(): ?PDO {',$start);
if($start===false||$end===false||$end<=$start)throw new RuntimeException('receipt_helpers_missing');
function cfg(): array {return ['auth_pepper'=>$GLOBALS['secret']];}
$GLOBALS['secret']=str_repeat('a',64);
eval(substr($source,$start,$end-$start));
function check(bool $valid,string $name): void {
    if(!$valid)throw new RuntimeException('receipt_auth_fixture_failed: '.$name);
    echo "PASS: ".$name."\n";
}
$id='11111111-1111-4111-8111-111111111117';
$other='11111111-1111-4111-8111-111111111118';
$name=commerceReceiptCookieName($id);
$proof=commerceReceiptProof($id);
check((bool)preg_match('/^drjr_receipt_[a-f0-9]{16}$/',$name),'opaque_cookie_name');
check((bool)preg_match('/^[a-f0-9]{64}$/',$proof),'server_signed_receipt_proof');
check(commerceReceiptCookieName($other)!==$name,'independent_order_names');
$_COOKIE=[];
check(!commerceReceiptAuthorized($id),'absent_proof_denied');
$_COOKIE[$name]=commerceReceiptProof($other);
check(!commerceReceiptAuthorized($id),'other_order_denied');
$_COOKIE[$name]=$proof;
check(commerceReceiptAuthorized($id),'matching_proof_allowed');
$GLOBALS['secret']=str_repeat('b',64);
check(!commerceReceiptAuthorized($id),'changed_private_secret_denied');
$GLOBALS['secret']=str_repeat('a',64);
$_COOKIE[$name]='invalid';
check(!commerceReceiptAuthorized($id),'malformed_proof_denied');
$GLOBALS['secret']='too-short';
try{commerceReceiptProof($id);throw new RuntimeException('weak_secret_accepted');}
catch(RuntimeException $e){check($e->getMessage()==='receipt_auth_unavailable','weak_secret_denied');}
echo "Nine scoped receipt authorization fixture cases passed.\n";
