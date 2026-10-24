<?php
declare(strict_types=1);
/**
 * Drop-in JREI News API dispatcher for the ORIGINAL same-origin Bertina API.
 * NOT MOUNTED. This file does not register public routes or start a server.
 * Original bootstrap must authenticate user/owner sessions, protect CSRF,
 * rate-limit public reads and load mother PDO before calling.
 *
 * Activation is explicitly OFF until final integrated tests, owner release
 * acceptance, approved migrations and existing API route coordination.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}
require_once __DIR__.'/public-read-model.php';
require_once __DIR__.'/owner-editorial.php';
require_once __DIR__.'/owner-preview.php';
require_once __DIR__.'/owner-overview.php';
require_once __DIR__.'/exam-reminders.php';
require_once __DIR__.'/topic-newsletter.php';
require_once __DIR__.'/preferences-replace.php';
require_once __DIR__.'/source-monitor-owner.php';
require_once __DIR__.'/jrei-ka-source-adapter.php';
require_once __DIR__.'/exam-deadline-owner.php';
require_once __DIR__.'/publication-dispatch.php';
require_once __DIR__.'/owner-review-outbox.php';
function jrNewsRouteBody(array $body,string $key,int $maxBytes=240): string {
    $v=$body[$key]??null;
    if (!is_string($v) || trim($v)==='' || strlen($v)>$maxBytes ||
        preg_match('/[\x00-\x1F\x7F]/',$v)) {
        throw new InvalidArgumentException('news_api_field_invalid_'.$key);
    }
    return $v;
}
function jrNewsActiveCustomerSession(array $ctx): string {
    if (($ctx['customerSessionVerified']??null)!==true ||
        ($ctx['csrfVerified']??null)!==true ||
        ($ctx['emailVerified']??null)!==true ||
        ($ctx['sessionSource']??null)!=='EXISTING_BERTINA_CUSTOMER_SESSION') {
        throw new RuntimeException('news_api_customer_session_required');
    }
    $id=$ctx['accountId']??null;
    if (!is_string($id) ||
        !preg_match('/^[a-f0-9-]{36}$/iD',$id)) {
        throw new RuntimeException('news_api_customer_id_invalid');
    }
    return $id;
}
function jrNewsDispatchApi(PDO $pdo,string $method,string $route,
    array $body,array $serverCtx,callable $currentEcoConsentResolver,
    callable $publicReadRateLimiter,
    callable $originalJreiSourceCurrentResolver,
    callable $existingEcoNewsSuppressor,
    array $ownerIntegrationPorts=[]): array {
    if (getenv('JR_JREI_NEWS_API_ENABLED')!=='true' ||
        ($serverCtx['originalApiBootstrap']??null)!==true ||
        ($serverCtx['finalIntegratedAcceptanceVerified']??null)!==true ||
        ($serverCtx['ownerAuthorizedActivation']??null)!==true) {
        throw new RuntimeException('news_api_source_only_not_active');
    }
    if ($method==='GET' && $route==='/news/v1/search') {
        if ($publicReadRateLimiter('NEWS_PUBLIC_SEARCH',$serverCtx)!==true) {
            throw new RuntimeException('news_api_public_rate_limited');
        }
        $q=jrNewsRouteBody($body,'q',220);
        $language=$body['language']??'fa';
        if (!in_array($language,['fa','en'],true)) {
            throw new InvalidArgumentException('news_api_locale_invalid');
        }
        $filters=[];
        if (isset($body['category']) && $body['category']!=='') {
            $filters['category']=jrNewsRouteBody($body,'category',48);
        }
        if (isset($body['country']) && $body['country']!=='') {
            $country=jrNewsRouteBody($body,'country',2);
            $filters['country']=strtoupper($country);
        }
        foreach (['after','before'] as $dateKey) {
            if (!isset($body[$dateKey])||$body[$dateKey]==='')continue;
            $raw=$body[$dateKey];
            if (!is_string($raw) ||
                !preg_match('/^[0-9]{1,10}$/D',$raw) ||
                (int)$raw>4102444800) {
                throw new InvalidArgumentException('news_api_search_date_invalid');
            }
            $filters[$dateKey]=(int)$raw;
        }
        if (isset($filters['after'],$filters['before']) &&
            $filters['after']>$filters['before']) {
            throw new InvalidArgumentException('news_api_search_window_invalid');
        }
        return jrNewsPublishedSearch($pdo,$q,$language,20,$filters);
    }
    if ($method==='GET' && $route==='/news/v1/owner/sources') {
        $owner=$serverCtx['existingOwnerMfaSession']??null;
        if (!is_array($owner)) {
            throw new RuntimeException('news_owner_session_required');
        }
        jrNewsOwnerAuthority($owner);
        return jrNewsExistingJreiApprovedSources($pdo,200);
    }
    if ($method==='POST' && $route==='/news/v1/owner/source/stage') {
        $owner=$serverCtx['existingOwnerMfaSession']??null;
        if (!is_array($owner)) {
            throw new RuntimeException('news_owner_session_required');
        }
        return jrNewsOwnerStageSourceMonitor($pdo,$owner,
            jrNewsRouteBody($body,'sourceId',36),
            jrNewsRouteBody($body,'category',48),
            jrNewsRouteBody($body,'priority',2),time());
    }
    if ($method==='POST' && $route==='/news/v1/owner/exam/approve') {
        $owner=$serverCtx['existingOwnerMfaSession']??null;
        $resolver=$ownerIntegrationPorts['originalExamSourceRecheck']??null;
        if (!is_array($owner)||!is_callable($resolver)) {
            throw new RuntimeException('news_exam_owner_original_port_missing');
        }
        return jrNewsApproveOfficialExamMilestone($pdo,$owner,
            jrNewsRouteBody($body,'milestoneId',36),$resolver,time());
    }
    if ($method==='POST' && $route==='/news/v1/owner/publication/stage') {
        $owner=$serverCtx['existingOwnerMfaSession']??null;
        $resolver=$ownerIntegrationPorts['originalCmsAndSourcePolicy']??null;
        if (!is_array($owner)||!is_callable($resolver)) {
            throw new RuntimeException('news_original_publisher_policy_missing');
        }
        return jrNewsStageFromApprovedStoredRouteProposal($pdo,$owner,
            jrNewsRouteBody($body,'revisionId',36),$resolver,time());
    }
    if ($method==='POST' && $route==='/news/v1/owner/review/email') {
        $owner=$serverCtx['existingOwnerMfaSession']??null;
        $mailbox=$ownerIntegrationPorts['originalVerifiedOwnerMailbox']??null;
        $outbox=$ownerIntegrationPorts['originalEcoPrivateOutbox']??null;
        if(!is_array($owner)||!is_callable($mailbox)||
            !is_callable($outbox)) {
            throw new RuntimeException('news_original_owner_mail_not_connected');
        }
        return jrNewsQueueOwnerEditorialReviewNotice($pdo,$owner,
            jrNewsRouteBody($body,'revisionId',36),$mailbox,
            $outbox,time());
    }
    if ($method==='GET' && $route==='/news/v1/owner/overview') {
        $owner=$serverCtx['existingOwnerMfaSession']??null;
        if (!is_array($owner)) {
            throw new RuntimeException('news_api_owner_session_required');
        }
        return jrNewsOwnerOperationalOverview($pdo,$owner,time());
    }
    if ($method==='GET' && $route==='/news/v1/owner/queue') {
        $owner=$serverCtx['existingOwnerMfaSession']??null;
        if (!is_array($owner)) {
            throw new RuntimeException('news_api_owner_session_required');
        }
        return jrNewsPrivateOwnerQueue($pdo,$owner,40);
    }
    if ($method==='GET' && $route==='/news/v1/owner/preview') {
        $owner=$serverCtx['existingOwnerMfaSession']??null;
        if (!is_array($owner)) {
            throw new RuntimeException('news_api_owner_session_required');
        }
        $revisionId=jrNewsRouteBody($body,'revisionId',36);
        return jrNewsPrivateOwnerPreview($pdo,$owner,$revisionId);
    }
    if ($method==='POST' && $route==='/news/v1/owner/decision') {
        $owner=$serverCtx['existingOwnerMfaSession']??null;
        if (!is_array($owner)) {
            throw new RuntimeException('news_api_owner_session_required');
        }
        $revisionId=jrNewsRouteBody($body,'revisionId',36);
        $digest=jrNewsRouteBody($body,'approvalDigest',64);
        $action=jrNewsRouteBody($body,'action',24);
        $decision=jrNewsPrivateRecordDecision($pdo,$owner,$revisionId,
            $digest,$action,time(),$originalJreiSourceCurrentResolver);
        if ($action!=='APPROVE')return $decision;
        $publisherPolicy=$ownerIntegrationPorts['originalCmsAndSourcePolicy']??null;
        if (!is_callable($publisherPolicy)) {
            return $decision+[
                'publicationQueueState'=>'WAITING_FOR_ORIGINAL_CMS_POLICY',
                'publiclyPublished'=>false
            ];
        }
        try {
            $staged=jrNewsStageFromApprovedStoredRouteProposal(
                $pdo,$owner,$revisionId,$publisherPolicy,time());
            return $decision+[
                'publicationQueueState'=>$staged['state'],
                'publicationId'=>$staged['publicationId'],
                'publiclyPublished'=>false,
                'needsOriginalPublisherReceipt'=>true
            ];
        }catch(Throwable $e) {
            error_log('News queue reconciliation required: '.get_class($e));
            return $decision+[
                'publicationQueueState'=>'NEEDS_PRIVATE_RECONCILIATION',
                'publiclyPublished'=>false,
                'ownerApprovalAlreadyRecorded'=>true
            ];
        }
    }
    if ($method==='GET' && $route==='/news/v1/preferences/current') {
        $accountId=jrNewsActiveCustomerSession($serverCtx);
        return jrNewsCurrentTopicPreferences($pdo,$accountId);
    }
    if ($method==='GET' && $route==='/news/v1/exam/follows') {
        $accountId=jrNewsActiveCustomerSession($serverCtx);
        return jrNewsCurrentExamReminders($pdo,$accountId,time());
    }
    if ($method==='POST' && $route==='/news/v1/exam/withdraw') {
        $accountId=jrNewsActiveCustomerSession($serverCtx);
        $suppressor=$ownerIntegrationPorts['originalEcoReminderSuppressor']??null;
        if (!is_callable($suppressor)) {
            throw new RuntimeException('news_original_exam_outbox_suppressor_missing');
        }
        return jrNewsWithdrawExamReminder($pdo,$accountId,
            jrNewsRouteBody($body,'followId',36),$suppressor,time());
    }
    if ($method==='POST' && $route==='/news/v1/preferences/replace') {
        $accountId=jrNewsActiveCustomerSession($serverCtx);
        $topics=$body['topics']??null;
        if (!is_array($topics)||count($topics)>14) {
            throw new InvalidArgumentException('news_api_topics_invalid');
        }
        $mode=jrNewsRouteBody($body,'mode',24);
        $locale=jrNewsRouteBody($body,'locale',2);
        $channel=jrNewsRouteBody($body,'channel',12);
        return jrNewsReplaceTopicPreferences($pdo,$accountId,$topics,
            $mode,$locale,$channel,$currentEcoConsentResolver,
            $existingEcoNewsSuppressor,time());
    }
    if ($method==='POST' && $route==='/news/v1/preferences') {
        $accountId=jrNewsActiveCustomerSession($serverCtx);
        $topic=jrNewsRouteBody($body,'topic',40);
        $mode=jrNewsRouteBody($body,'mode',24);
        $locale=jrNewsRouteBody($body,'locale',2);
        $channel=jrNewsRouteBody($body,'channel',12);
        return jrNewsSaveTopicPreference($pdo,$accountId,$topic,$mode,
            $locale,$channel,$currentEcoConsentResolver,time());
    }
    if ($method==='POST' && $route==='/news/v1/preferences/withdraw') {
        $accountId=jrNewsActiveCustomerSession($serverCtx);
        $topic=$body['topic']??null;
        if ($topic!==null&&!is_string($topic)) {
            throw new InvalidArgumentException('news_api_topic_invalid');
        }
        return jrNewsWithdrawTopics($pdo,$accountId,$topic,time(),
            $existingEcoNewsSuppressor);
    }
    if ($method==='POST' && $route==='/news/v1/exam/follow') {
        $accountId=jrNewsActiveCustomerSession($serverCtx);
        $milestone=jrNewsRouteBody($body,'milestoneId',36);
        $days=$body['daysBefore']??null;
        $channel=jrNewsRouteBody($body,'channel',12);
        if (!is_int($days)) {
            throw new InvalidArgumentException('news_api_reminder_days_invalid');
        }
        return jrNewsFollowExam($pdo,$accountId,$milestone,$days,$channel,
            $currentEcoConsentResolver,time());
    }
    throw new InvalidArgumentException('news_api_unknown_or_forbidden_route');
}
