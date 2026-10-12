<?php
// Include-only pre-extraction guard for the temporary Bertina release endpoint.
// The public request contains a certificate, NEVER a private key. No HTTP entry point.
function drjrRecoveryFail(string $reason): never {
    throw new RuntimeException('recovery_' . $reason);
}
function drjrRecoveryJson(string $file, int $maxBytes): array {
    if (is_link($file) || !is_file($file) || filesize($file) < 2 || filesize($file) > $maxBytes) drjrRecoveryFail('file_invalid');
    $value = json_decode((string) file_get_contents($file), true);
    if (!is_array($value) || json_last_error() !== JSON_ERROR_NONE) drjrRecoveryFail('json_invalid');
    return $value;
}
function drjrRecoveryCheck(string $siteRoot, string $requestBase64, int $now): void {
    // Check the owner's PIN independently of mutable GitHub request content.
    $trustedPin='45b0d78e2327a30e1a84017c2293d6c3fa2050cc33bae1766035c250333e50b9';
    $rawRequest=base64_decode($requestBase64,true);
    $request=is_string($rawRequest)?json_decode($rawRequest,true):null;
    if (!is_array($request) || ($request['schema']??null)!=='bertina-private-backup-v1'
        || !preg_match('/^[a-f0-9]{32}$/D',(string)($request['id']??''))
        || !preg_match('/^[a-f0-9]{40}$/D',(string)($request['sourceRelease']??'')))
        drjrRecoveryFail('request_invalid');
    $key=openssl_pkey_get_public((string)($request['publicKeyPem']??''));
    $details=$key?openssl_pkey_get_details($key):false;
    if (!is_array($details) || ($details['bits']??0)!==4096 || ($details['type']??-1)!==OPENSSL_KEYTYPE_RSA)
        drjrRecoveryFail('public_key_invalid');
    $encoded=preg_replace('/-----[^-]+-----|\s+/','',(string)$details['key']);
    $der=base64_decode((string)$encoded,true);
    if (!is_string($der) || !hash_equals($trustedPin,hash('sha256',$der))) drjrRecoveryFail('public_key_pin_invalid');
    $root=realpath($siteRoot);
    if ($root===false || $root==='/' || is_link($siteRoot)) drjrRecoveryFail('site_root_invalid');
    $parent=dirname($root);
    if (is_link($parent)) drjrRecoveryFail('parent_invalid');
    $current=drjrRecoveryJson($parent.'/.codex-private-backup-current.json',8192);
    $id=$request['id'];
    if (($current['schema']??null)!=='bertina-private-backup-current-v1'
        || ($current['id']??null)!==$id || ($current['recipientSpkiSha256']??null)!==$trustedPin)
        drjrRecoveryFail('pointer_invalid');
    $private=$parent.'/.codex-private-backup-'.$id;
    if (is_link($private) || !is_dir($private) || realpath($private)!==$private || (fileperms($private)&0007)!==0)
        drjrRecoveryFail('private_directory_invalid');
    $metadata=drjrRecoveryJson($private.'/metadata.json',262144);
    $receipt=drjrRecoveryJson($private.'/certification.json',65536);
    if (($metadata['ok']??null)!==true || ($metadata['schema']??null)!=='bertina-private-backup-metadata-v1'
        || ($metadata['metadataComplete']??null)!==true || ($metadata['consistentSnapshot']??null)!==true
        || ($metadata['id']??null)!==$id || ($metadata['recipientSpkiSha256']??null)!==$trustedPin
        || ($metadata['sourceReleaseSha']??null)!==$request['sourceRelease'])
        drjrRecoveryFail('metadata_invalid');
    if (($receipt['schema']??null)!=='bertina-private-backup-signed-receipt-v1'
        || ($receipt['scope']??null)!=='owner_attested_actual_isolated_restore_and_independent_ciphertext_readback'
        || ($receipt['restoreGate']??null)!==($metadata['restoreGate']??null))
        drjrRecoveryFail('receipt_invalid');
    $gate=$metadata['restoreGate'];
    if (!is_array($gate) || array_keys($gate)!==['bodyBase64','signatureBase64'])
        drjrRecoveryFail('signed_gate_missing');
    $proofRaw=base64_decode((string)$gate['bodyBase64'],true);
    $signature=base64_decode((string)$gate['signatureBase64'],true);
    if (!is_string($proofRaw) || strlen($proofRaw)>16384 || !is_string($signature)
        || strlen($signature)!==512 || openssl_verify($proofRaw,$signature,$key,OPENSSL_ALGO_SHA256)!==1)
        drjrRecoveryFail('signature_invalid');
    $proof=json_decode($proofRaw,true);
    $expectedKeys=['schema','backupId','recipientSpkiSha256','sourceRelease','createdAtEpoch',
        'certifiedAtEpoch','expiresAtEpoch','encryptedSnapshotSha256','encryptedSnapshotBytes',
        'isolatedRestoreVerified','secondaryCiphertextReadbackVerified','secondaryCiphertextSha256'];
    if (!is_array($proof) || array_diff(array_keys($proof),$expectedKeys)
        || array_diff($expectedKeys,array_keys($proof))
        || ($proof['schema']??null)!=='bertina-private-backup-restore-proof-v1'
        || ($proof['backupId']??null)!==$id || ($proof['recipientSpkiSha256']??null)!==$trustedPin
        || ($proof['sourceRelease']??null)!==$request['sourceRelease']
        || ($proof['isolatedRestoreVerified']??null)!==true
        || ($proof['secondaryCiphertextReadbackVerified']??null)!==true)
        drjrRecoveryFail('proof_invalid');
    $created=$proof['createdAtEpoch']??null;
    $certified=$proof['certifiedAtEpoch']??null;
    $expires=$proof['expiresAtEpoch']??null;
    if (!is_int($created) || !is_int($certified) || !is_int($expires)
        || $created!==($metadata['createdAt']??null) || $certified<$created
        || $expires<=$now || $created>$now || $now-$created>21600
        || $expires>$created+21600) drjrRecoveryFail('expired');
    $liveSw=@file_get_contents($root.'/sw.js');
    if (!is_string($liveSw)
        || !preg_match("/^const CACHE_VERSION='jr-site-bertina-([a-f0-9]{40})';$/m",$liveSw,$match)
        || $match[1]!==$request['sourceRelease']) drjrRecoveryFail('source_release_mismatch');
    if (is_file($root.'/bertina-private-backup-'.$id.'.php'))
        drjrRecoveryFail('ephemeral_helper_not_retired');
    $archive=$private.'/full-backup.zip';
    $bytes=$proof['encryptedSnapshotBytes']??null;
    $digest=$proof['encryptedSnapshotSha256']??null;
    if (!is_int($bytes) || $bytes<1 || $bytes>2147483648 || !is_string($digest)
        || !preg_match('/^[a-f0-9]{64}$/D',$digest)
        || $bytes!==($metadata['archiveBytes']??null)
        || $digest!==($metadata['archiveSha256']??null)
        || ($proof['secondaryCiphertextSha256']??null)!==$digest
        || is_link($archive) || !is_file($archive) || filesize($archive)!==$bytes
        || filemtime($archive)!==($metadata['archiveMtime']??null)
        || !hash_equals($digest,(string)hash_file('sha256',$archive)))
        drjrRecoveryFail('ciphertext_mismatch');
}
