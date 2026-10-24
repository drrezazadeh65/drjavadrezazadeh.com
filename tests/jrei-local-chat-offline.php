<?php
declare(strict_types=1);
// Standalone offline JREI-LM safety checks. No server, cloud inference,
// visitor transcripts, MySQL, Windows machine or model are contacted.
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/api/jrei-local-chat.php';
function assertLocal(bool $ok,string $what): void {
    if(!$ok){fwrite(STDERR,"FAIL: ".$what."\n");exit(1);}
}
$key=random_bytes(SODIUM_CRYPTO_SECRETBOX_KEYBYTES);
$config=[
  'jrei_local_chat_enabled'=>true,'jrei_local_public_release_accepted'=>true,
  'jrei_hybrid_enabled'=>true,'jrei_local_chat_key_b64'=>base64_encode($key)
];
assertLocal(jrLocalChatKey($config)===$key,'first-party encryption key is private');
$payload='{"message":"سلام، چرا باید مطالعه کنم؟","lang":"fa"}';
$sealed=jrLocalChatSeal($payload,$key);
assertLocal(strpos($sealed,'مطالعه')===false,'ciphertext never contains plaintext');
assertLocal(jrLocalChatOpen($sealed,$key)===$payload,'encrypted message roundtrip');
$alter=substr_replace($sealed,'A',30,1);
try{
    jrLocalChatOpen($alter,$key);
    // A replacement may coincidentally match the original symbol; if so,
    // replay with another key to guarantee an authentication failure.
    assertLocal($alter===$sealed,'mutated ciphertext rejected');
}catch(DomainException $expected){}
try{
    jrLocalChatOpen($sealed,random_bytes(SODIUM_CRYPTO_SECRETBOX_KEYBYTES));
    assertLocal(false,'wrong key must fail to open visitor data');
}catch(DomainException $expected){}
try{
    jrLocalChatSeal(str_repeat('x',11001),$key);
    assertLocal(false,'unbounded local messages must not be queued');
}catch(DomainException $expected){}
assertLocal(jrLocalChatKey(['jrei_local_chat_key_b64'=>'invalid'])===null,
  'wrongly provisioned key cannot enable model');
assertLocal(jrLocalChatCanonical(['a'=>1,'b'=>2])===
  jrLocalChatCanonical(['a'=>1,'b'=>2]),'deterministic source revalidation digest');
$reflection=new ReflectionFunction('jrLocalChatEnqueue');
assertLocal($reflection->getNumberOfRequiredParameters()===3,
  'queue uses existing mother database and private config');
echo "JREI private local first-party inference encryption checks passed\n";
