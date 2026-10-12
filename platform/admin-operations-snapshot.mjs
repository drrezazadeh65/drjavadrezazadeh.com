// A server-only composition of edge health and domain engine evidence.
// Edge health is intentionally separate and never upgrades domain engine status.
import {collectEdgeHealthEvidence} from './edge-health-evidence.mjs';
import {buildAdminEngineReport} from './admin-engine-report.mjs';
export async function buildAdminOperationsSnapshot({authorization,fetcher,signals={},now=()=>new Date()}={}){
 if(authorization?.server_authorized!==true||authorization?.email_verified!==true||
  !['ADMIN','SUPER_ADMIN'].includes(authorization?.role)||authorization?.mfa_verified!==true)
  throw new Error('Authenticated MFA admin required');
 const instant=now();
 const as_of=instant.toISOString();
 const [edge,domain]=await Promise.all([
  collectEdgeHealthEvidence({fetcher,now:()=>instant}),
  Promise.resolve(buildAdminEngineReport({authorization,signals,as_of}))
 ]);
 return {as_of,edge,domain};
}
