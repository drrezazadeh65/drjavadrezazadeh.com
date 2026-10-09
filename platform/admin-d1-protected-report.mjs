// Fail-closed composition: provider-signed identity + D1 grants.
// The identity provider must verify session signatures, audience, expiry and MFA.
import {createAdminSessionVerifier} from './admin-session-verifier.mjs';
import {createD1AdminRoleLookup} from './admin-d1-role-lookup.mjs';
import {createAdminEngineReportWorker} from './admin-engine-report-worker.mjs';
export function createD1ProtectedEngineReport({introspectSession,collectSignals,clock}={}){
 const lookupAdmin=createD1AdminRoleLookup();
 const verifySession=createAdminSessionVerifier({introspectSession,lookupAdmin});
 return createAdminEngineReportWorker({verifySession,collectSignals,clock});
}
