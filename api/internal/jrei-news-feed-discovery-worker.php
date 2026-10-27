<?php
declare(strict_types=1);
/**
 * JREI News private Cron projection of ORIGINAL JREI-KA RSS/Atom receipts.
 * PHP 8.3 CLI only. Never opens an HTTP route, new crawler, SMTP client,
 * provider account, model inference or public publisher.
 * Owner master Cron and both news-release switches remain OFF by default.
 */
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
define('BERTINA_MAIL_SMOKE_CONTEXT',true);
require_once dirname(__DIR__).'/index.php';
define('BERTINA_API_BOOTSTRAPPED',true);
require_once dirname(__DIR__).'/jrei-news-private-feed-bridge.php';
require_once dirname(__DIR__).'/internal/jrei-news/delegated-official-source-enrollment.php';
require_once dirname(__DIR__).'/internal/jrei-news/admin-source-management.php';
require_once dirname(__DIR__).'/internal/jrei-news/original-official-source-bootstrap.php';
require_once dirname(__DIR__).'/internal/jrei-news/original-approved-university-monitor-sync.php';
require_once dirname(__DIR__).'/internal/jrei-news/original-autonomous-institution-discovery.php';
try{
    $cfg=cfg();
    if(($cfg['jrei_news_feed_discovery_enabled']??false)!==true||
       ($cfg['jrei_news_integrated_release_accepted']??false)!==true||
       ($cfg['operations_cron_master_enabled']??false)!==true){
        fwrite(STDOUT,"JREI News original-feed projection OFF.\n");
        exit(0);
    }
    $pdo=db();
    if(!($pdo instanceof PDO))
        throw new RuntimeException('news_mother_database_unavailable');
    // Bootstrap the owner's named official institutions into the ORIGINAL
    // unreviewed source registry. These are DISCOVERED metadata only:
    // neither robots/rights nor article authenticity are silently approved.
    $institutionSeeds=['examined'=>0,'newDiscovered'=>0,
        'sourcePermissionsGranted'=>0,'activeMonitorsAdded'=>0];
    if(($cfg['jrei_news_official_catalogue_auto_seed_enabled']??false)===true){
        $institutionSeeds=jrNewsOriginalSeedOfficialInstitutionSources(
            $pdo,[
              'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_WORKER',
              'originalCronLeaseVerified'=>true,
              'institutionCatalogueSeedEnabled'=>true
            ],time(),12);
    }
    // Sources already approved through the manager dashboard should no
    // longer require a second manual "reconcile" click when the original
    // JREI-KA source and publisher-rights policies later become valid.
    $admin=['linked'=>0,'activated'=>0,'pendingPolicy'=>0];
    if(($cfg['jrei_news_admin_source_autolink_enabled']??false)===true){
        $admin=jrNewsOriginalReconcileApprovedAdminSources(
            $pdo,$cfg,[
              'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_WORKER',
              'originalCronLeaseVerified'=>true
            ],time(),20);
    }
    // Original JREI-KA has ALREADY reviewed these institution policies:
    // allow the latest owner-approved class-wide standing monitoring rule to
    // create monitors for any verified university, not just nine hardcodes.
    $verifiedUniversities=['monitorsActivated'=>0,
        'existingOwnerDisabledRetained'=>0];
    if(($cfg['jrei_news_automatic_official_monitor_enabled']??false)===true&&
       ($cfg['jrei_news_source_activation_accepted']??false)===true){
        $verifiedUniversities=jrNewsOriginalSyncReviewedUniversityMonitors(
            $pdo,$cfg,[
              'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_WORKER',
              'originalCronLeaseVerified'=>true
            ],time(),50);
    }
    // Discover previously unnamed universities, ministries, research
    // institutions and education/exam authorities using links inside
    // SHA-verified original JREI-KA observations. Independent review of the
    // TARGET authority/rights remains mandatory; no implicit fetch or publish.
    $autonomous=['discoveredInstitutionCandidates'=>0,'reviewedObservationPages'=>0];
    if(($cfg['jrei_news_source_activation_accepted']??false)===true){
        $privateArchive=jrKaPrivateArchiveRoot($cfg);
        if($privateArchive===null)
            throw new RuntimeException('news_original_institution_archive_unavailable');
        $autonomous=jrNewsStageAutonomousInstitutionCandidates(
            $pdo,$privateArchive,$cfg,[
               'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_WORKER',
               'originalCronLeaseVerified'=>true
            ],time(),8);
    }
    // Follow source-network nominations into the ORIGINAL JREI-KA registry
    // automatically, but leave every newly found origin DISCOVERED with an
    // explicitly PENDING_REVIEW permission and scheduler policy. No manual
    // institution list, forged approval or independent crawler is needed.
    $newSources=['registeredForIndependentReview'=>0];
    if(($cfg['jrei_news_source_activation_accepted']??false)===true)
        $newSources=jrNewsEnqueueNewInstitutionalSourceCandidates(
            $pdo,$cfg,[
                'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_WORKER',
                'originalCronLeaseVerified'=>true
            ],time(),12);
    $summary=jrNewsBridgeOriginalFeedObservation($pdo,$cfg,time());
    // Once the owner delegates a reviewed official HTTPS path, the original
    // JREI scheduler can register SAME-ORIGIN article URLs without another
    // MFA prompt for every notice. It must never inherit unreviewed rights.
    $delegated=['enrolled'=>0,'pending'=>0];
    if(($cfg['jrei_news_delegated_scopes_enabled']??false)===true&&
       ($cfg['jrei_news_source_activation_accepted']??false)===true){
        jrNewsRevokeExpiredOfficialSourceEnrollments(
            $pdo,[
              'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_WORKER',
              'originalServerSessionVerified'=>true,
              'delegatedOfficialScopesEnabled'=>true
            ],time(),50);
        $delegated=jrNewsOriginalEnrollDelegatedOfficialArticles(
            $pdo,[
              'source'=>'ORIGINAL_JREI_PRIVATE_NEWS_WORKER',
              'originalServerSessionVerified'=>true,
              'delegatedOfficialScopesEnabled'=>true
            ],time(),20);
    }

    $state=(string)($summary['state']??'UNKNOWN');
    if(!preg_match('/^[A-Z_]{3,80}$/D',$state))$state='REQUIRES_REVIEW';
    fwrite(STDOUT,
      'JREI News private feed projection='.$state.
      '; approved universities newly monitored='.(int)$verifiedUniversities['monitorsActivated'].
      '; known official origins newly discovered='.(int)$institutionSeeds['newDiscovered'].
      '; private link suggestions='.(int)$summary['newPrivateLinksSuggested'].
      '; approved manager sources linked='.(int)$admin['linked'].
      '; monitored manager sources enabled='.(int)$admin['activated'].
      '; previously unnamed institutional origins discovered='.(int)$autonomous['discoveredInstitutionCandidates'].
      '; original delegated URL enrollments='.(int)$delegated['enrolled'].
      '; no independent downloads, no public publishing.'."\n");
}catch(Throwable $e){
    // Do not print original source URLs, private archive paths, personal
    // information, content bytes, SQL errors or unreadable publisher feeds.
    fwrite(STDERR,
       "JREI News private feed projection requires owner review.\n");
    exit(1);
}
