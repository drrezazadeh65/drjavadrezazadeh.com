/** Owner-MFA dashboard read model, private data only, no API endpoint. */
import {assert,isHash,plain,utcInstant} from './contracts.mjs';
const STATES=Object.freeze(['DISCOVERED','PENDING_SOURCE_REVIEW',
  'EVIDENCE_REVIEWED','EDITORIAL_DRAFT','OWNER_REVIEW',
  'OWNER_APPROVED','REVISION_REQUESTED','REJECTED','QUARANTINED',
  'PUBLISHER_QUEUED','PUBLISHED','PUBLISH_FAILED',
  'CORRECTION_PROPOSED','SUPERSEDED','RETRACTED']);
export function ownerNewsroomProjection({ownerAccess,workflows,
  sourceStatuses=[],deliveryStatuses=[],generatedAt}={}){
  assert(plain(ownerAccess)&&ownerAccess.ownerAuthenticated===true&&
    ownerAccess.mfaValid===true&&ownerAccess.role==='OWNER'&&
    Array.isArray(workflows)&&workflows.length<=10000&&
    Array.isArray(sourceStatuses)&&sourceStatuses.length<=5000&&
    Array.isArray(deliveryStatuses)&&deliveryStatuses.length<=5000&&
    utcInstant(generatedAt),'NEWS_OWNER_DASHBOARD_ACCESS_DENIED');
  const counts=Object.fromEntries(STATES.map(s=>[s,0]));
  for(const item of workflows){
    assert(plain(item)&&STATES.includes(item.state)&&
      item.schema==='jr.jrei.news-workflow.v1','NEWS_OWNER_WORKFLOW_INVALID');
    counts[item.state]++;
  }
  const approvals=workflows.filter(x=>x.state==='OWNER_REVIEW')
    .map(x=>({editorialId:x.editorialId,revision:x.revision,
      changedAt:x.lastChangedAt}));
  const urgentSources=sourceStatuses.filter(x=>x.priority==='P0'&&
    x.currentStatus==='OFFLINE').length;
  const failedDeliveries=deliveryStatuses.filter(x=>x.state==='FAILED').length;
  return Object.freeze({schema:'jr.jrei.news-owner-dashboard.v1',
    generatedAt,counts,approvalQueue:approvals,
    sourceCount:sourceStatuses.length,offlineUrgentSourceCount:urgentSources,
    failedDeliveryCount:failedDeliveries,
    operatorActions:['REVIEW','APPROVE','REJECT','REQUEST_REVISION','SCHEDULE'],
    approvalRequiresSameOwnerMfaSession:true,
    metricsMeasuredFromProvidedRecordsOnly:true,
    noPrivateSourcesExposedToPublic:true,
    routesNotMounted:true});
}
