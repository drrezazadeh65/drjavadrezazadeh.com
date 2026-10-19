/**
 * Public, zero-credential journal subdomain observation.
 * A trusted TLS redirect is valuable infrastructure evidence, NOT proof
 * of editorial intake, verified private PDF handling or peer review.
 * Never follow unexpected redirects or silently accept off-domain targets.
 */
const JOURNAL_HOST='journal.drjavadrezazadeh.com';
const CANONICAL='https://drjavadrezazadeh.com/journal/';

export function observeJhelaHostRedirect({httpStatus,location}={}){
  const base={
    schema:'jhela-native-public-host-tls-v1',
    httpStatus:Number.isInteger(httpStatus)?httpStatus:null,
    trustedTlsHandshake:true, // Caller sets this only AFTER native HTTPS fetch succeeded.
    nativeEditorialSubmissionVerified:false,
    privateManuscriptStorageVerified:false,
    independentPeerReviewVerified:false,
    journalArticlePublicationVerified:false
  };
  if(![301,302,307,308].includes(httpStatus)){
    return {...base,status:'HOST_ROUTE_UNVERIFIED',
      routeMode:httpStatus===200?'host_content_not_independently_audited':'unexpected_http_status',
      canonicalJournalRedirectVerified:false};
  }
  if(typeof location!=='string'||!location||location.length>2048)
    return {...base,status:'HOST_ROUTE_UNVERIFIED',routeMode:'missing_redirect_target',
      canonicalJournalRedirectVerified:false};
  let target;
  try { target=new URL(location,'https://'+JOURNAL_HOST+'/'); }
  catch { return {...base,status:'HOST_ROUTE_UNVERIFIED',routeMode:'invalid_redirect_target',
      canonicalJournalRedirectVerified:false}; }
  const targetValid=target.protocol==='https:'&&target.hostname==='drjavadrezazadeh.com'
   &&target.port===''&&target.pathname==='/journal/'
   &&!target.username&&!target.password&&!target.search&&!target.hash;
  return {
    ...base,
    status:targetValid?'LIVE_TLS_CANONICAL_BRIDGE':'HOST_ROUTE_UNVERIFIED',
    routeMode:targetValid?'safe_canonical_journal_redirect':'unexpected_redirect_target',
    canonicalJournalRedirectVerified:targetValid,
    canonicalDestination:targetValid?CANONICAL:null
  };
}

export function journalPublicTlsSignal(evidence){
 return evidence?.name==='jhela-native-subdomain-tls' &&
   evidence?.trustedTlsHandshake===true &&
   evidence?.canonicalJournalRedirectVerified===true;
}
