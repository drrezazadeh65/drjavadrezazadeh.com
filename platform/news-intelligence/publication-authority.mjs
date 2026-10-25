/**
 * One publication-authorization vocabulary across NewsArticle/RSS/sitemap,
 * public archive and ORIGINAL CMS rendering. Latest owner direction:
 * independently verified official-primary notices use a standing policy,
 * not a manufactured per-story owner APPROVE decision.
 *
 * Pure contract checks NEVER independently attest owner sessions, source
 * licences or the fact of publication. Caller must derive all fields from
 * original private DB + authenticated CMS receipt and recheck revocations.
 */
export function hasValidOfficialStandingAuthorization(a){
  return !!a && typeof a==='object' &&
    a.standingOfficialPublicationVerified===true &&
    a.originalCmsReceiptVerified===true &&
    typeof a.standingPolicyId==='string' &&
    /^[a-f0-9-]{36}$/i.test(a.standingPolicyId) &&
    typeof a.standingPolicyDigest==='string' &&
    /^[a-f0-9]{64}$/.test(a.standingPolicyDigest);
}
export function hasVerifiedPublicationAuthority(a){
  return !!a && typeof a==='object' &&
    (a.ownerApproved===true || hasValidOfficialStandingAuthorization(a));
}
export function hasPublisherAuthorizationForArtifacts(auth){
  return !!auth && typeof auth==='object' &&
    auth.source==='ORIGINAL_AUTHENTICATED_CMS' &&
    (auth.ownerMfaDecisionVerified===true ||
     (auth.standingOfficialPublicationVerified===true &&
      auth.originalStandingPolicyCurrent===true &&
      auth.standingOriginalSourceEvidenceVerified===true &&
      typeof auth.standingPolicyId==='string' &&
      /^[a-f0-9-]{36}$/i.test(auth.standingPolicyId) &&
      typeof auth.standingPolicyDigest==='string' &&
      /^[a-f0-9]{64}$/.test(auth.standingPolicyDigest))) &&
    auth.currentSourceEvidenceVerified===true &&
    auth.licensedMediaVerified===true &&
    auth.publicReleaseActivated===true;
}
