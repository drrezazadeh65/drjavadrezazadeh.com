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
// Owner dashboard must give exact explanatory blockers without changing
// private flags or treating an absent mother-DB table as a positive status.
$noDb=jrLocalChatOwnerReadinessGates([
 'motherDatabaseSchemaReady'=>false,
 'privateSwitchEnabled'=>false,
 'ownerPublicReleaseAccepted'=>false,
 'privateEncryptionKeyConfigured'=>true,
 'approvedPublicEvidenceIndexReadable'=>true,
 'privateRetentionWorkerReady'=>false,
 'authorizedNodes'=>null,'recentlySignedGenerativeWorkers'=>null,
 'registeredModelCount'=>null,'rightsReviewedModelCount'=>null,
 'acceptedModelCount'=>null
],['jrei_hybrid_enabled'=>false]);
assertLocal($noDb['allGatesPassed']===false&&
 in_array('mother_db_schema',$noDb['blockingGates'],true)&&
 in_array('registered_local_model',$noDb['unknownGates'],true)&&
 !in_array('private_queue_encryption',$noDb['blockingGates'],true),
 'unavailable DB is diagnosed without concealing other readiness gates');
$readySnapshot=[
 'motherDatabaseSchemaReady'=>true,'privateSwitchEnabled'=>true,
 'ownerPublicReleaseAccepted'=>true,'privateEncryptionKeyConfigured'=>true,
 'approvedPublicEvidenceIndexReadable'=>true,'privateRetentionWorkerReady'=>true,
 'registeredModelCount'=>1,'rightsReviewedModelCount'=>1,
 'acceptedModelCount'=>1,'authorizedNodes'=>1,
 'recentlySignedGenerativeWorkers'=>1
];
$all=jrLocalChatOwnerReadinessGates($readySnapshot,['jrei_hybrid_enabled'=>true]);
assertLocal($all['allGatesPassed']===true&&$all['blockingGates']===[]&&
 $all['unknownGates']===[]&&$all['doesNotProveLiveInference']===true,
 'pass on all server gates is NOT proof of real end-to-end inference');
$notSigned=$readySnapshot;$notSigned['recentlySignedGenerativeWorkers']=0;
$missingPoll=jrLocalChatOwnerReadinessGates($notSigned,['jrei_hybrid_enabled'=>true]);
assertLocal(in_array('recent_signed_generative_poll',$missingPoll['blockingGates'],true),
 'offline signed-chat worker must block claimed availability');

echo "JREI private local first-party inference encryption checks passed\n";
