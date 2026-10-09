/** Explicit reviewer decision on evidence-backed offline growth tasks. */
const validText=value=>typeof value==='string'&&value.trim().length>0;
export function reviewGrowthTask(board,taskId,{reviewer,decision,reason}={}){
 if(!board||!Array.isArray(board.tasks)||!validText(taskId))throw new TypeError('Invalid board or task');
 if(!validText(reviewer)||!['approve','reject'].includes(decision)||!validText(reason))throw new Error('Reviewer, decision and reason required');
 const idx=board.tasks.findIndex(t=>t.id===taskId);
 if(idx<0)throw new Error('Unknown task');
 const target=board.tasks[idx];
 if(target.state!=='awaiting-review'||!Array.isArray(target.evidence)||target.evidence.length===0)throw new Error('Evidence submission required before review');
 if(target.reviewer===reviewer)throw new Error('Independent reviewer required');
 const tasks=board.tasks.map((task,i)=>i===idx?{...task,evidence:[...task.evidence],state:decision==='approve'?'approved-for-offline-work':'changes-requested',approved:decision==='approve',reviewedBy:reviewer,reviewReason:reason}: {...task,evidence:[...task.evidence]});
 return {...board,tasks,summary:{...board.summary,blocked:tasks.filter(t=>t.state==='blocked-on-evidence').length,approved:tasks.filter(t=>t.approved).length},autoDeploy:false,productionTouched:false};
}
