<?php
declare(strict_types=1);
define('BERTINA_API_BOOTSTRAPPED',true);
require dirname(__DIR__).'/api/jrei-owner-private-pilot.php';
function pilotCheck(bool $pass,string $code): void {
    if(!$pass)throw new RuntimeException($code);
}
pilotCheck(function_exists('jrOwnerPilotOwnerAsk'),'pilot_owner_submission_missing');
pilotCheck(function_exists('jrOwnerPilotWorkerPoll'),'signed_worker_poll_missing');
pilotCheck(function_exists('jrOwnerPilotWorkerFinish'),'signed_worker_completion_missing');
pilotCheck(function_exists('jrOwnerPilotOwnerResult'),'private_owner_collection_missing');
pilotCheck(function_exists('jrOwnerPilotOwnerCancel'),'owner_cancellation_missing');
pilotCheck(jrLocalChatKey(['jrei_local_chat_key_b64'=>base64_encode(
    random_bytes(32))])!==null,'private_encryption_required');
pilotCheck(jrLocalChatKey(['jrei_local_chat_key_b64'=>''])===null,
    'private_encryption_never_auto_enabled');
pilotCheck(jrJreiLocalDraftIntegrityFailure('۱۲ × ۷','۴۸','fa')===
    'WRONG_DETERMINISTIC_ARITHMETIC','pilot_wrong_math_rejected');
pilotCheck(jrJreiLocalDraftIntegrityFailure('سلام','م可靠性','fa')===
    'FOREIGN_CJK_SCRIPT_INTRUSION','pilot_mixed_script_rejected');
pilotCheck((new ReflectionFunction('jrOwnerPilotOwnerAsk'))
    ->getNumberOfRequiredParameters()===3,'pilot_requires_explicit_owner_action');
pilotCheck((new ReflectionFunction('jrOwnerPilotWorkerFinish'))
    ->getNumberOfRequiredParameters()===5,'pilot_requires_signed_node_and_lease');
echo "JREI private owner pilot isolated contract checks passed.\n";
