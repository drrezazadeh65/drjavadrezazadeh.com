<?php
declare(strict_types=1);
/**
 * Single staging import surface for the JREI News Bertina PHP modules.
 *
 * Integration point for EXISTING api/index.php and existing MFA/eco/CMS only.
 * Including this library must never run SQL, call models, crawl, send emails,
 * publish content or activate a new route.
 */
if (!defined('BERTINA_API_BOOTSTRAPPED')) {
    http_response_code(404);
    exit;
}

require_once __DIR__.'/official-feed-extractor.php';
require_once __DIR__.'/official-html-discovery.php';
require_once __DIR__.'/feed-discovery.php';
require_once __DIR__.'/approved-feed-item-link.php';
require_once __DIR__.'/original-auto-article-link.php';
require_once __DIR__.'/delegated-official-source-enrollment.php';
require_once __DIR__.'/candidate-intake.php';
require_once __DIR__.'/evidence-review.php';
require_once __DIR__.'/original-primary-headline-fact-packet.php';
require_once __DIR__.'/original-independent-evidence-runner.php';
require_once __DIR__.'/editorial-draft-store.php';
require_once __DIR__.'/original-ai-news-drafting.php';
require_once __DIR__.'/original-model-draft-queue.php';
require_once __DIR__.'/original-draft-runtime-adapter.php';
require_once __DIR__.'/original-native-news-style-media.php';
require_once __DIR__.'/original-reviewed-news-evidence-port.php';
require_once __DIR__.'/original-independent-news-qa-producer.php';
require_once __DIR__.'/original-independent-news-qa-service.php';
require_once __DIR__.'/independent-qa-ledger.php';
require_once __DIR__.'/owner-editorial.php';
require_once __DIR__.'/owner-preview.php';
require_once __DIR__.'/owner-overview.php';
require_once __DIR__.'/owner-review-outbox.php';
require_once __DIR__.'/official-auto-handoff.php';
require_once __DIR__.'/official-institution-directory.php';
require_once __DIR__.'/original-official-source-bootstrap.php';
require_once __DIR__.'/original-approved-university-monitor-sync.php';
require_once __DIR__.'/original-autonomous-institution-discovery.php';
require_once __DIR__.'/admin-source-management.php';
require_once __DIR__.'/standing-official-publication.php';
require_once __DIR__.'/verified-news-page-render.php';
require_once __DIR__.'/original-cms-news-writer.php';
require_once __DIR__.'/original-news-policy-resolver.php';
require_once __DIR__.'/original-private-publishing-pipeline.php';
require_once __DIR__.'/original-public-index-runner.php';
require_once __DIR__.'/original-news-syndication.php';
require_once __DIR__.'/original-chat-news-signed-intake.php';
require_once __DIR__.'/original-chat-news-receipt-proof.php';
require_once __DIR__.'/original-news-owner-exceptions.php';
require_once __DIR__.'/publication-dispatch.php';
require_once __DIR__.'/publication-readiness.php';
require_once __DIR__.'/calendar-read.php';
require_once __DIR__.'/exam-deadline-owner.php';
require_once __DIR__.'/exam-reminders.php';
require_once __DIR__.'/topic-newsletter.php';
require_once __DIR__.'/original-eco-compatibility.php';
require_once __DIR__.'/eco-digest-composer.php';
require_once __DIR__.'/original-eco-digest-delivery.php';
require_once __DIR__.'/eco-reminder-composer.php';
require_once __DIR__.'/preferences-replace.php';
require_once __DIR__.'/digest-worker.php';
require_once __DIR__.'/public-search-indexer.php';
require_once __DIR__.'/public-read-model.php';
require_once __DIR__.'/slug-routes.php';
require_once __DIR__.'/source-monitor-owner.php';
require_once __DIR__.'/jrei-ka-source-adapter.php';
require_once __DIR__.'/retraction.php';
require_once __DIR__.'/news-api-adapter.php';

function jrNewsSourceCapabilities(): array {
    return [
        'schema'=>'jr.jrei.news-source-capabilities.v1',
        'branch'=>'migration/bertina-linux6',
        'motherDatabase'=>'drjavad1_store',
        'oneSourceRegistry'=>'EXISTING_JREI',
        'oneOwnerIdentity'=>'EXISTING_OPERATIONS_MFA',
        'oneConsentAndOutbox'=>'EXISTING_ECO',
        'onePublicCms'=>'EXISTING_SITE_PUBLISHER',
        'oneAi'=>'EXISTING_JREI_MODEL_ROUTER',
        'oneSocialPublisher'=>'EXISTING_AWOSE',
        'sourceOnly'=>true,
        'schemaMigrationsAppliedByImport'=>false,
        'newPublicApiMountedByImport'=>false,
        'outboundRequestsOnImport'=>false,
        'standingOfficialSourceAutoHandoffProposalAvailable'=>true,
        'originalCmsAutoPublisherConnectedByLibrary'=>false,
        'ownerApprovalRequiredForEveryPublicRevision'=>false,
        'ownerApprovalReservedForGenuineExceptions'=>true,
        'testsPerformedByThisLibrary'=>false,
        'deployedByThisLibrary'=>false,
        'realIntegrationReadinessNotEstablished'=>true
    ];
}
