/**
 * JREI News private runtime adapter contract.
 *
 * Dependency-injected ports point ONLY at existing JREI source acquisition,
 * mother DB, owner-MFA editorial controller, eco_notification_* outbox and
 * existing public CMS. No new server, account DB, browser chatbot or SMTP.
 *
 * Creating a service has NO side effects. Activation is explicitly OFF.
 * Integration backend MUST supply server-owned policy/authorities; NEVER
 * accept controls or trust flags from unauthenticated web requests.
 */
import {assert,plain,utcInstant} from './contracts.mjs';
import {planNewsDiscovery} from './newsroom.mjs';
import {approvalEmailDescriptor,publicationQueueDescriptor} from './approval.mjs';
import {verifiedPublicationPlan} from './publisher-plan.mjs';
import {renderOwnerEmail} from './approval-email.mjs';
const PORTS=Object.freeze([
  'readApprovedJreiSources',
  'readSourceObservation',
  'acquireThroughExistingJrei',
  'savePrivateNewsCandidate',
  'readPrivateEditorialPreview',
  'readOwnerMfaDecision',
  'readOwnerPublicationPolicy',
  'readCurrentSourceRevision',
  'readImmutablePublishedRoutes',
  'queueThroughExistingEcoOutbox',
  'publishThroughExistingApprovedCms',
  'writeExistingOperationsAudit'
]);
export function createPrivateNewsRuntime({ports,serverPolicy}={}){
  assert(plain(ports)&&PORTS.every(k=>typeof ports[k]==='function')&&
    plain(serverPolicy)&&serverPolicy.source==='PRIVATE_OWNER_CONFIGURATION'&&
    typeof serverPolicy.autoAcquireEnabled==='boolean'&&
    typeof serverPolicy.ownerEmailEnabled==='boolean'&&
    typeof serverPolicy.publishEnabled==='boolean',
    'NEWS_RUNTIME_REQUIRES_OFF_BY_DEFAULT_PRIVATE_PORTS');
  // No worker loop, timer, outbound request or new DB on construction.
  async function discoverPlan(nowUtc){
    assert(utcInstant(nowUtc),'NEWS_RUNTIME_CLOCK_INVALID');
    const sources=await ports.readApprovedJreiSources();
    assert(Array.isArray(sources)&&sources.length<=2000,'NEWS_RUNTIME_SOURCE_BOUND');
    const lastChecks={};
    for(const s of sources){
      const last=await ports.readSourceObservation(s.sourceId);
      if(last?.lastCheckedAt)lastChecks[s.sourceId]=last.lastCheckedAt;
    }
    return planNewsDiscovery({sources,nowUtc,lastChecks});
  }
  async function queueOwnerPreview({digest,recipient,tokenReference,expiresAt}={}){
    assert(serverPolicy.ownerEmailEnabled===true&&
      typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest),
      'NEWS_OWNER_EMAIL_RUNTIME_DISABLED');
    const preview=await ports.readPrivateEditorialPreview(digest);
    assert(preview?.approvalDigest===digest &&
      preview?.editorialStatus==='PENDING_OWNER_APPROVAL',
      'NEWS_OWNER_PREVIEW_NOT_READY');
    const descriptor=approvalEmailDescriptor({preview,recipient,
      previewTokenReference:tokenReference,
      baseUrl:'https://drjavadrezazadeh.com',expiresAt});
    const email=renderOwnerEmail({preview,emailDescriptor:descriptor});
    const receipt=await ports.queueThroughExistingEcoOutbox(email);
    return Object.freeze({queued:receipt?.state==='QUEUED',
      actualSmtpDeliveryVerified:false,previewDigest:digest,
      existingEcoOutboxOnly:true});
  }
  async function publishAfterVerifiedOwnerApproval({digest,paths,nowUtc}={}){
    assert(serverPolicy.publishEnabled===true&&
      serverPolicy.finalIntegratedAcceptanceVerified===true&&
      serverPolicy.ownerAuthorizedPublicActivation===true&&
      utcInstant(nowUtc),'NEWS_PUBLIC_PUBLISHER_DISABLED');
    const preview=await ports.readPrivateEditorialPreview(digest);
    const decision=await ports.readOwnerMfaDecision(digest);
    assert(preview?.approvalDigest===digest&&
      decision?.canDispatch===true&&decision?.approvalDigest===digest,
      'NEWS_OWNER_DECISION_MISSING');
    const current=await ports.readCurrentSourceRevision(preview.sourceUrl);
    const queue=publicationQueueDescriptor({decision,preview,
      currentApprovedSourceHash:current?.evidenceSha256,
      serverRecheckedAt:nowUtc});
    const immutableRouteRegistry=await ports.readImmutablePublishedRoutes();
    const ownerRegistry=await ports.readOwnerPublicationPolicy(digest);
    assert(plain(ownerRegistry)&&ownerRegistry.source==='PRIVATE_SERVER_RECHECK',
      'NEWS_OWNER_PUBLICATION_POLICY_UNVERIFIED');
    const plan=verifiedPublicationPlan({queue,preview,paths,
      ownerRegistry,immutableRouteRegistry,nowUtc});
    // The existing authenticated CMS MUST independently re-read exact
    // policy, owner action, source digest, route registry and MFA audit.
    const receipt=await ports.publishThroughExistingApprovedCms(plan);
    await ports.writeExistingOperationsAudit({
      action:'JREI_NEWS_PUBLISHER_RECEIPT',
      digest,receiptReference:receipt?.reference??null});
    return Object.freeze({status:receipt?.status??'UNKNOWN',
      actualPublicReleaseUnverified:receipt?.verified!==true,
      approvalDigest:digest,externalReceipt:receipt?.reference??null});
  }
  return Object.freeze({discoverPlan,queueOwnerPreview,
    publishAfterVerifiedOwnerApproval,
    active:{autoAcquisition:serverPolicy.autoAcquireEnabled,
      ownerEmail:serverPolicy.ownerEmailEnabled,
      publication:serverPolicy.publishEnabled},
    noTimersStarted:true,noDatabaseConnectionCreated:true});
}
