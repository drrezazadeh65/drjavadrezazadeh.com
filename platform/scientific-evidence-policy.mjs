/**
 * Pure NOT DEPLOYED scientific evidence acceptance predicate.
 *
 * Must be called ONLY on the authenticated, auditable, immutable
 * SERVER-APPROVED evidence dossier looked up by an eventual trusted API.
 * An asserted source value or fabricated digest in JSON does not prove that
 * the studies, review, signer identities or cryptographic signatures exist.
 */
const hex64=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
const within=(value,now)=>Number.isFinite(Date.parse(value))&&
   Date.parse(value)<=Date.parse(now);
const future=(value,now)=>Number.isFinite(Date.parse(value))&&
   Date.parse(value)>Date.parse(now);

export function evidenceMeetsSpecifiedUseGate(evidence,instrument,administration,now){
  if(!evidence||!instrument||!administration||
     !Number.isFinite(Date.parse(now)))return false;
  if(evidence.schema_version!=='scientific-reviewed-claim-v1' ||
     evidence.record_source!=='SERVER_APPROVED_EVIDENCE_LEDGER' ||
     evidence.approval_state!=='APPROVED_FOR_SPECIFIED_USE' ||
     evidence.claim_type!=='VALIDATED_USE_CLAIM')return false;

  for(const [a,b] of [
    [evidence.instrument_code,instrument.code],
    [evidence.instrument_version,instrument.version],
    [evidence.locale,instrument.locale],
    [evidence.item_bank_checksum,instrument.item_bank_checksum],
    [evidence.scoring_version,instrument.scoring_version],
    [evidence.target_population,administration.target_population],
    [evidence.intended_use,administration.intended_use]
  ])if(!nonempty(a)||a!==b)return false;
  if(!hex64(instrument.content_sha256)||
     evidence.instrument_content_sha256!==instrument.content_sha256 ||
     !hex64(evidence.evidence_bundle_sha256) ||
     !hex64(evidence.validity_dossier_sha256) ||
     !hex64(evidence.precision_dossier_sha256) ||
     !hex64(evidence.fairness_review_sha256) ||
     !nonempty(evidence.study_preregistration_reference) ||
     !nonempty(evidence.ethics_clearance_reference) ||
     !nonempty(evidence.independent_review_record) ||
     !nonempty(evidence.author_id) ||
     !within(evidence.decision_at,now) ||
     !future(evidence.valid_until,now))return false;

  // Synthetic documents with generic arbitrary labels may satisfy test
  // fixtures; the production verifier must bind these to signed database
  // evidence and a real institutional reviewer registry.
  if(!Array.isArray(evidence.reviewers) ||
     evidence.reviewers.length<2 ||
     evidence.reviewers.length>20)return false;
  const identities=new Set();
  const required=new Set(['MEASUREMENT_METHODS','ETHICS_FAIRNESS']);
  for(const reviewer of evidence.reviewers){
    if(!reviewer||
       !nonempty(reviewer.account_id) ||
       reviewer.account_id===evidence.author_id ||
       identities.has(reviewer.account_id) ||
       reviewer.independence_verified!==true ||
       reviewer.conflict_of_interest_cleared!==true ||
       reviewer.decision!=='APPROVED' ||
       !hex64(reviewer.decision_digest_sha256) ||
       !within(reviewer.signed_at,now))return false;
    identities.add(reviewer.account_id);
    required.delete(reviewer.role);
  }
  if(required.size)return false;

  if(evidence.scientific_status!=='VALIDATED_FOR_SPECIFIED_USE' ||
     evidence.research_evidence_verified!==true ||
     evidence.safeguarding_review_verified!==true ||
     evidence.version_lock_verified!==true ||
     evidence.audit_replayable!==true)return false;
  return true;
}
