// Explicit admin-only mount. No automatic activation on public pages.
// The host is responsible for serving this module only after session gating.
import {createEngineStatusController} from './admin-engine-status-controller.mjs';
export function mountAdminEngineStatus({document,fetcher,origin,containerId='admin-engine-status-table'}={}){
 if(!document||typeof document.getElementById!=='function')throw new Error('Admin document required');
 const container=document.getElementById(containerId);
 if(!container)throw new Error('Engine report mount point missing');
 const controller=createEngineStatusController({document,container,fetcher,origin});
 return {refresh:()=>controller.refresh()};
}
