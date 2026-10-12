// Phase 12 server-side policy primitives. Inputs MUST come from authenticated,
// persisted Bertina records, never from browser role/consent/payment claims.
export const PHASE12_GATE_VERSION = '1.0.0-preproduction';
const PURPOSES = new Set(['ASSESSMENT','PARENT_VISIBILITY','TEACHER_OBSERVATION','ADVISER_REVIEW','SPONSOR_PROGRESS']);
const ACTIONS = new Set(['VIEW_OWN_REPORT','VIEW_CHILD_REPORT','SUBMIT_OBSERVATION','REVIEW_EVIDENCE','START_PAID_MODULE','VIEW_SPONSOR_NEEDS','VIEW_SPONSOR_PROGRESS']);
const deny = reason => Object.freeze({ allowed: false, reason, projection: 'NONE' });
const allow = projection => Object.freeze({ allowed: true, reason: 'AUTHORISATION_VERIFIED', projection });
const same = (a,b) => typeof a==='string' && a!=='' && a===b;
const on = (v,now) => typeof v==='string' && Number.isFinite(Date.parse(v)) && Date.parse(v) > now;

/** Latest append-only decision; a withdrawal wins until a later valid GRANT. */
export function currentConsent(events, subjectId, purpose, now = Date.now()) {
  if (!PURPOSES.has(purpose) || !subjectId || !Array.isArray(events)) return null;
  const relevant = events.filter(e => e && e.record_source==='PERSISTED' &&
    same(e.subject_id,subjectId) && e.purpose===purpose &&
    Number.isSafeInteger(e.sequence) && e.sequence>0 &&
    Number.isFinite(Date.parse(e.decided_at)) && Date.parse(e.decided_at)<=now &&
    ['GRANTED','WITHDRAWN'].includes(e.decision) &&
    typeof e.policy_version==='string' && e.policy_version.trim()!=='');
  if (!relevant.length) return null;
  relevant.sort((a,b)=>b.sequence-a.sequence);
  if (relevant.length>1 && relevant[0].sequence===relevant[1].sequence) return null;
  return relevant[0];
}

const activeConsent = (events,subject,purpose,now) => {
  const c=currentConsent(events,subject.id,purpose,now);
  if (!c || c.decision!=='GRANTED') return false;
  if (subject.is_minor===true) return same(c.granted_by_account_id,subject.guardian_account_id) && c.guardian_verified===true;
  return same(c.granted_by_account_id,subject.id);
};
const verifiedRelation = (items,type,subjectId,actorId,capability) => Array.isArray(items) && items.some(r=>
  r?.record_source==='PERSISTED' && r.type===type && r.state==='VERIFIED' &&
  same(r.subject_id,subjectId) && same(r.actor_id,actorId) &&
  (!capability || (Array.isArray(r.capabilities) && r.capabilities.includes(capability))));
const verifiedRole=(actor,role)=>actor?.record_source==='PERSISTED'&&actor?.session_verified===true&&
  Array.isArray(actor.roles)&&actor.roles.includes(role)&&typeof actor.account_id==='string'&&actor.account_id!=='';
const paidAccess = (items,actorId,feature,now) => Array.isArray(items) && items.some(e=>
  e?.record_source==='PERSISTED' && same(e.account_id,actorId) && same(e.feature,feature) &&
  e.state==='ACTIVE' && e.grant_origin==='PAYMENT_VERIFIED' && e.provider_reconciled===true &&
  typeof e.verified_order_id==='string' && e.verified_order_id!=='' &&
  e.revoked_at==null && on(e.expires_at,now));

/**
 * A decision helper, not an HTTP security boundary. The PHP API must independently
 * authenticate, query records for the subject, check every resource/field scope,
 * enforce current consent at read time, and recheck under a DB transaction on writes.
 */
export function authorisePhase12({actor,subject,action,relationships=[],consents=[],entitlements=[],sponsorships=[],feature,now=Date.now()}={}) {
  if (!ACTIONS.has(action)) return deny('UNKNOWN_ACTION');
  if (!Number.isFinite(now) || !subject?.id || !actor?.session_verified || actor.record_source!=='PERSISTED') return deny('UNVERIFIED_CONTEXT');
  const id=actor.account_id;
  const self=verifiedRole(actor,'STUDENT') && same(id,subject.student_account_id);
  const guardian=verifiedRole(actor,'PARENT') && same(id,subject.guardian_account_id) &&
    verifiedRelation(relationships,'GUARDIAN',subject.id,id);
  const assignedTeacher=verifiedRole(actor,'TEACHER') && verifiedRelation(relationships,'TEACHER',subject.id,id,'SUBMIT_OBSERVATION');
  const assignedAdviser=verifiedRole(actor,'ADVISER') && verifiedRelation(relationships,'ADVISER',subject.id,id,'REVIEW_EVIDENCE');
  const consent=p=>activeConsent(consents,subject,p,now);
  if (action==='VIEW_OWN_REPORT') return self&&consent('ASSESSMENT')&&subject.report_state==='RELEASED'?allow('RELEASED_STUDENT_REPORT'):deny('STUDENT_REPORT_NOT_AUTHORISED');
  if (action==='VIEW_CHILD_REPORT') return guardian&&consent('PARENT_VISIBILITY')&&subject.report_state==='RELEASED'?allow('RELEASED_GUARDIAN_REPORT'):deny('GUARDIAN_REPORT_NOT_AUTHORISED');
  if (action==='SUBMIT_OBSERVATION') return (guardian||assignedTeacher)&&consent('TEACHER_OBSERVATION')?allow('UNREVIEWED_OBSERVATION_WRITE'):deny('OBSERVER_NOT_AUTHORISED');
  if (action==='REVIEW_EVIDENCE') return assignedAdviser&&consent('ADVISER_REVIEW')?allow('SCOPED_PROFESSIONAL_REVIEW'):deny('REVIEWER_NOT_AUTHORISED');
  if (action==='START_PAID_MODULE') return (self||guardian)&&consent('ASSESSMENT')&&typeof feature==='string'&&paidAccess(entitlements,id,feature,now)?allow('ENTITLED_MODULE'):deny('ENTITLEMENT_OR_CONSENT_MISSING');
  // Sponsorship cannot grant access to a full student record or direct messaging.
  if(!verifiedRole(actor,'SPONSOR') || !consent('SPONSOR_PROGRESS')) return deny('SPONSOR_NOT_AUTHORISED');
  const validLink=Array.isArray(sponsorships)&&sponsorships.some(s=>
    s?.record_source==='PERSISTED' && same(s.sponsor_account_id,id) && same(s.subject_id,subject.id) &&
    s.state==='APPROVED' && s.guardian_consent_active===true && s.student_assent_active===true &&
    s.sponsor_consent_active===true && s.staff_approved===true && s.revoked_at==null && on(s.expires_at,now));
  return validLink?allow(action==='VIEW_SPONSOR_NEEDS'?'APPROVED_SAFE_NEEDS_ONLY':'APPROVED_SAFE_PROGRESS_ONLY'):deny('SPONSOR_LINK_INACTIVE');
}

export function publishedInstrument(registry,id,version){
  if (!registry || registry.schema_version!=='1.0' || !Array.isArray(registry.instruments)) return null;
  const entry=registry.instruments.find(x=>x.id===id && x.version===version);
  if (!entry || entry.release_state!=='PUBLISHED' || !/^[a-f0-9]{64}$/.test(entry.content_sha256||'') ||
    entry.scientific_status!=='REVIEWED_FOR_STATED_USE' || entry.human_approval!==true ||
    typeof entry.consent_policy_version!=='string' || !entry.consent_policy_version.trim()) return null;
  return entry;
}
