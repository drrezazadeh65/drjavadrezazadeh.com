/** JREI autonomous planning: pure ordered tasks, not a privileged executor. */
import {createHash} from 'node:crypto';
export const MISSION_SCHEMA='jr.jrei.scoped-mission.v1';
const KINDS=new Set(['PUBLIC_SOURCE_DISCOVERY','RIGHTS_REVIEW','PRIVATE_ACQUISITION',
 'EVIDENCE_INDEX_PROPOSAL','EDUCATIONAL_RESPONSE_REVIEW','EXAM_ITEM_DRAFT',
 'EXAM_ITEM_INDEPENDENT_REVIEW','NEWS_PRIVATE_DRAFT','NEWS_FACT_REVIEW',
 'SITE_CHANGE_OBSERVE','SITE_PATCH_PROPOSAL']);
const ID=/^[a-z0-9][a-z0-9._:-]{2,79}$/i;
const SHA=/^[a-f0-9]{64}$/;
const fail=reason=>Object.freeze({allowed:false,reason,executed:false});
export function proposeJreiMission({missionId,policyDigest,nodes=[]}={}){
 if(!ID.test(missionId??'')||!SHA.test(policyDigest??'')||
    !Array.isArray(nodes)||nodes.length<1||nodes.length>32)
   return fail('MISSION_INVALID');
 const ids=new Set();
 for(const n of nodes){
  if(!n||!ID.test(n.id??'')||!KINDS.has(n.kind)||
     !Array.isArray(n.after)||n.after.length>8||
     n.after.some(x=>!ID.test(x)||x===n.id)||ids.has(n.id))
    return fail('NODE_INVALID');
  ids.add(n.id);
 }
 if(nodes.some(n=>n.after.some(x=>!ids.has(x))))
   return fail('DEPENDENCY_MISSING');
 const map=new Map(nodes.map(n=>[n.id,n])),todo=new Set(),done=new Set(),ordered=[];
 function visit(id){
  if(todo.has(id))return false;
  if(done.has(id))return true;
  todo.add(id);
  if(!map.get(id).after.every(visit))return false;
  todo.delete(id);done.add(id);ordered.push(id);return true;
 }
 if(!nodes.every(n=>visit(n.id)))return fail('MISSION_DEPENDENCY_CYCLE');
 const graph=ordered.map(id=>({
  id,kind:map.get(id).kind,after:[...map.get(id).after],
  status:'PROPOSED_NOT_EXECUTED',permission:'INDEPENDENT_AUTHORITY_REQUIRED'
 }));
 const result={schema:MISSION_SCHEMA,missionId,policyDigest,graph,
  siteModified:false,windowsAccessGranted:false,privateDataAccessGranted:false,
  commercialPublicationTriggered:false,modelTrainingStarted:false};
 return Object.freeze({...result,allowed:true,executed:false,
  missionDigest:createHash('sha256').update(JSON.stringify(result)).digest('hex')});
}
export function checkJreiMissionStep(mission,taskId,authority={}){
 if(!mission?.allowed||mission.schema!==MISSION_SCHEMA||
    !ID.test(taskId??''))return fail('MISSION_UNAVAILABLE');
 const task=mission.graph.find(x=>x.id===taskId);
 if(!task)return fail('TASK_NOT_REGISTERED');
 if(task.after.some(id=>!authority.completedVerifiedIds?.includes(id)))
   return fail('PREDECESSORS_NOT_VERIFIED');
 if(authority.currentPolicyDigest!==mission.policyDigest||
    authority.ownerAuthorized!==true||
    authority.scopedToolRegistered!==true)
   return fail('OWNER_AND_TOOL_AUTHORITY_REQUIRED');
 return Object.freeze({allowed:true,scope:'EXISTING_AUTHORIZED_TOOL_ONLY',
  taskId,executed:false,modelCanSelfAuthorize:false});
}
