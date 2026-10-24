<?php
declare(strict_types=1);
/**
 * Private, source-only hook for EXISTING operations Cron worker.
 * The original API's owner-signed Cron capability, config, eco consent,
 * outbox and source policy remain authoritative. Merely requiring this file
 * never schedules tasks, downloads URLs, or queues notifications.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }
require_once __DIR__.'/news-library.php';

function jrNewsOriginalCronJobDescriptor(): array {
    return [
        'schema'=>'jr.jrei.news-original-cron-jobs.v1',
        'jobs'=>[
            'news_due_exam_reminders'=>[
                'minimumCadenceSeconds'=>300,
                'originalWorker'=>'operations_cron_dispatcher',
                'sideEffect'=>'ORIGINAL_ECO_OUTBOX_ONLY'],
            'news_urgent_digest'=>[
                'minimumCadenceSeconds'=>300,
                'originalWorker'=>'operations_cron_dispatcher',
                'sideEffect'=>'ORIGINAL_ECO_OUTBOX_ONLY'],
            'news_daily_digest'=>[
                'minimumCadenceSeconds'=>86400,
                'originalWorker'=>'newsletter_worker',
                'sideEffect'=>'ORIGINAL_ECO_OUTBOX_ONLY'],
            'news_weekly_digest'=>[
                'minimumCadenceSeconds'=>604800,
                'originalWorker'=>'newsletter_worker',
                'sideEffect'=>'ORIGINAL_ECO_OUTBOX_ONLY'],
            'news_original_source_metadata'=>[
                'minimumCadenceSeconds'=>3600,
                'originalWorker'=>'jrei_ka_schedule',
                'sideEffect'=>'ORIGINAL_JREI_KA_METADATA_ONLY']
        ],
        'registeredInExistingCron'=>false,
        'liveServicesActivated'=>false
    ];
}

/**
 * Work happens ONLY after the original allowlisted scheduler has verified
 * owner policies in private cfg + DB and supplied verified scoped callbacks.
 * No unauthorized current-time, account, IP or role is accepted from HTTP.
 */
function jrNewsDispatchOriginalCronStep(
    PDO $pdo,string $jobId,array $originalServerCronAuth,
    callable $currentEcoConsentResolver,
    callable $existingEcoOutboxEnqueue,
    int $nowEpoch,string $afterAccountId=''
): array {
    $allowed=[
        'news_due_exam_reminders'=>true,
        'news_urgent_digest'=>true,
        'news_daily_digest'=>true,
        'news_weekly_digest'=>true
    ];
    if (!isset($allowed[$jobId]) ||
        $nowEpoch<=0 ||
        ($originalServerCronAuth['source']??null)!==
            'EXISTING_OPERATIONS_CRON_SIGNED_DISPATCH' ||
        ($originalServerCronAuth['jobId']??null)!==$jobId ||
        ($originalServerCronAuth['ownerApproved']??null)!==true ||
        ($originalServerCronAuth['finalIntegratedAcceptanceVerified']??null)!==true ||
        ($originalServerCronAuth['newsOutboxEnabled']??null)!==true ||
        ($originalServerCronAuth['originalEcoTransportVerified']??null)!==true ||
        ($originalServerCronAuth['leaseCurrentAndExclusive']??null)!==true) {
        throw new RuntimeException('news_original_cron_dispatch_not_authorized');
    }
    $mode=match($jobId) {
        'news_urgent_digest'=>'URGENT',
        'news_daily_digest'=>'DAILY',
        'news_weekly_digest'=>'WEEKLY',
        default=>null
    };
    $result=$mode!==null?
        jrNewsQueueTopicDigests($pdo,$mode,$nowEpoch,
            $currentEcoConsentResolver,$existingEcoOutboxEnqueue,
            $afterAccountId):
        jrNewsQueueDueReminders($pdo,$nowEpoch,
            $currentEcoConsentResolver,$existingEcoOutboxEnqueue);
    return [
        'schema'=>'jr.jrei.news-original-cron-step.v1',
        'jobId'=>$jobId,'mode'=>$mode,'result'=>$result,
        'originalCronLeaseAuthorityRequired'=>true,
        'actualSmtpOrInboxDeliveryConfirmed'=>false,
        'publicNewsPublicationPerformed'=>false
    ];
}
