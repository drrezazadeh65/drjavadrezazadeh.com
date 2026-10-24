<?php
declare(strict_types=1);
/**
 * Prepare an exam reminder after ORIGINAL eco EXAM_REMINDERS consent and
 * independently rechecked official date. This cannot send email or create
 * implicit consent. A distinct first-party eco purpose/template and actual
 * original SMTP worker extension must be provisioned at final integration.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) { http_response_code(404); exit; }

function jrNewsComposeVerifiedExamReminder(
    array $originalWorkerGrant,array $originalEcoConsent,
    array $currentOfficialMilestone,string $locale,int $nowEpoch
): array {
    if(!in_array($locale,['fa','en'],true)||
        $nowEpoch<=0||
        ($originalWorkerGrant['source']??null)!==
            'ORIGINAL_ECO_EXAM_REMINDER_WORKER'||
        ($originalWorkerGrant['signedJobVerified']??null)!==true||
        ($originalWorkerGrant['ownerRemindersEnabled']??null)!==true||
        ($originalEcoConsent['source']??null)!=='EXISTING_ECO_CONSENT'||
        ($originalEcoConsent['purpose']??null)!=='EXAM_REMINDERS'||
        ($originalEcoConsent['granted']??null)!==true||
        ($originalEcoConsent['withdrawn']??null)!==false||
        ($currentOfficialMilestone['source']??null)!==
            'ORIGINAL_JREI_OFFICIAL_EXAM_REGISTRY'||
        ($currentOfficialMilestone['issuerReverified']??null)!==true||
        ($currentOfficialMilestone['ownerApproved']??null)!==true||
        ($currentOfficialMilestone['superseded']??null)!==false||
        ($currentOfficialMilestone['withdrawn']??null)!==false||
        !is_int($currentOfficialMilestone['eventUtc']??null)||
        $currentOfficialMilestone['eventUtc']<=$nowEpoch||
        !in_array($currentOfficialMilestone['daysBefore']??null,
            [0,1,3,5,7,10,15,30],true)||
        !preg_match('/^[a-f0-9]{64}$/D',
            (string)($currentOfficialMilestone['evidenceSha256']??''))) {
        throw new RuntimeException('news_official_exam_reminder_not_verified');
    }
    $sourceUrl=$currentOfficialMilestone['sourceUrl']??null;
    $parsed=is_string($sourceUrl)?parse_url($sourceUrl):false;
    if(!is_array($parsed)||($parsed['scheme']??null)!=='https'||
        !is_string($parsed['host']??null)||strlen($sourceUrl)>1000||
        isset($parsed['user'])||isset($parsed['pass'])) {
        throw new RuntimeException('news_reminder_source_invalid');
    }
    $fa=$locale==='fa';
    $label=$currentOfficialMilestone[$fa?'titleFa':'titleEn']??null;
    if(!is_string($label)||trim($label)===''||strlen($label)>880) {
        throw new RuntimeException('news_reminder_title_invalid');
    }
    $time=(new DateTimeImmutable('@'.$currentOfficialMilestone['eventUtc']))
        ->setTimezone(new DateTimeZone('Asia/Tehran'))
        ->format('Y-m-d H:i');
    $body=$fa?
        "یادآوری انتخابی شما\n\n".trim($label).
        "\nتاریخ رسمی (به وقت ایران): ".$time.
        "\n\nلطفاً برای تغییر احتمالی مهلت‌ها به منبع اصلی مراجعه کنید:\n".
        $sourceUrl."\n":
        "Your optional examination reminder\n\n".trim($label).
        "\nVerified date (Iran time): ".$time.
        "\n\nCheck the issuing authority for subsequent changes:\n".
        $sourceUrl."\n";
    return [
        'schema'=>'jr.jrei.news-exam-reminder-email.v1',
        'purpose'=>'EXAM_REMINDERS',
        'locale'=>$locale,
        'subject'=>$fa?'یادآوری آزمون آموزشی | JREI':
            'Verified Examination Reminder | JREI',
        'plainTextBody'=>$body,
        'sourceVersion'=>$currentOfficialMilestone['versionNumber']??null,
        'originalEvidenceSha256'=>$currentOfficialMilestone['evidenceSha256'],
        'mailSent'=>false,
        'needsOriginalOptoutInstructionsAtDelivery'=>true,
        'recheckOfficialSourceAgainBeforeSmtp'=>true
    ];
}
