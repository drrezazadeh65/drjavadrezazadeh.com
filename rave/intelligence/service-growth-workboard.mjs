/** Turn ranked growth blockers into an offline, reviewable execution board. */
import {prioritizeServiceGrowthFixes} from './service-growth-priority-planner.mjs';
const validId=id=>typeof id==='string'&&id.trim().length>0;
const stableTaskId=task=>'growth-'+[task.serviceId,task.source,task.locale,task.code].map(v=>encodeURIComponent(String(v??'unknown'))).join('~');
export function buildServiceGrowthWorkboard(services=[]){
 const result=prioritizeServiceGrowthFixes(services);
 const seen=new Map();
 const tasks=result.tasks.map(task=>{
  const base=stableTaskId(task);
  const count=(seen.get(base)??0)+1;seen.set(base,count);
  return {
  id:count===1?base:base+'~'+count,
  serviceId:task.serviceId,
  source:task.source,
  locale:task.locale,
  issue:task.code,
  priority:task.priority,
  instruction:task.action,
  state:'blocked-on-evidence',
  reviewerRequired:true,
  evidence:[],
  approved:false
 };});
 return {tasks,summary:{servicesReviewed:result.servicesReviewed,totalTasks:tasks.length,blocked:tasks.length,approved:0},autoDeploy:false,productionTouched:false};
}
export function submitGrowthEvidence(board,taskId,{references=[],reviewer}={}){
 if(!board||!Array.isArray(board.tasks)||!validId(taskId))throw new TypeError('Invalid board or task');
 const idx=board.tasks.findIndex(t=>t.id===taskId);
 if(idx<0)throw new Error('Unknown task');
 if(!Array.isArray(references)||references.length===0||references.some(r=>!validId(r))||!validId(reviewer))throw new Error('Evidence and reviewer required');
 const tasks=board.tasks.map((task,i)=>i===idx?{...task,evidence:[...references],state:'awaiting-review',reviewer,approved:false}: {...task,evidence:[...task.evidence]});
 return {...board,tasks,summary:{...board.summary,blocked:tasks.filter(t=>t.state==='blocked-on-evidence').length},autoDeploy:false,productionTouched:false};
}
