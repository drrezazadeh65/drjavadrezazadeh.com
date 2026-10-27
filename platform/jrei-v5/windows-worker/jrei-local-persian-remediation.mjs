/**
 * JREI private Persian-generation remediation study; never a model acceptance.
 *
 * Compare two generalizable prompt strategies on the identical, unmodified
 * failing questions AND independent held-out Persian questions. Unlike the
 * release-quality suite, this is a diagnostic experiment, not a pass gate.
 * No test-answer injection, scoring override, training, public chat,
 * server call, model file change, or production write is performed.
 */
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {inspectJreiEducationalDraft} from '../jrei-educational-answer-review.mjs';

const ROOT=process.env.LOCALAPPDATA?resolve(process.env.LOCALAPPDATA,'JREI'):null;
const MODEL='http://127.0.0.1:8081/v1/chat/completions';
const SHA=/^[a-f0-9]{64}$/;
const digest=s=>createHash('sha256').update(s).digest('hex');
const MAX_RESPONSE=32_768;
const MODEL_TIMEOUT_MS=55_000;

// Scenarios are authored here, not altered in the original 16-case suite.
// Include a separate unseen maths problem, source caution, and validity
// concept: passing only the observed failing prompts is insufficient.
const fixtures=Object.freeze([
 {id:'fa-02',prompt:'عدد ۱۲ را در ۷ ضرب کن و نتیجه را فقط با رقم بنویس.',expectedInteger:84},
 {id:'fa-03',prompt:'در یک جمله توضیح بده چرا یک آزمون بدون اعتبارسنجی نباید دقیق و قطعی معرفی شود.'},
 {id:'fa-04',prompt:'در یک جمله تفاوت روایی و پایایی را در سنجش آموزشی توضیح بده.',conceptReview:true},
 {id:'holdout-math',prompt:'حاصل ضرب ۹ در ۸ را فقط با عدد بنویس.',expectedInteger:72},
 {id:'holdout-source',prompt:'اگر منبع معتبر در اختیار نداری، چرا نباید مشخصات مقاله‌ای را از خودت بسازی؟ یک جمله فارسی بنویس.'},
 {id:'holdout-construct',prompt:'آیا سریع‌بودن یک آزمون به‌تنهایی نشان می‌دهد همان سازهٔ موردنظر را می‌سنجد؟ کوتاه و دقیق پاسخ بده.',conceptReview:true},
]);
const strategies=Object.freeze([
 {
  id:'PERSIAN_DIRECT_CONSTRAINTS',
  system:'شما دستیار پژوهشی فارسی‌زبان هستید. همیشه به فارسی معیار، کوتاه و روان پاسخ دهید. نویسه‌های چینی ننویسید. اگر از پاسخ دقیق مطمئن نیستید، عدم اطمینان را بیان کنید. در محاسبه، عمل خواسته‌شده را دقیق بخوانید. اگر سؤال فقط عدد می‌خواهد، هیچ توضیح یا علامت اضافی ندهید. در سنجش آموزشی، فقط از تعریف‌های علمی قابل دفاع استفاده کنید. منبع جعلی نسازید.'
 },
 {
  id:'BILINGUAL_EXACT_INSTRUCTIONS',
  system:'You are an educational research assistant. For a Persian-language request, respond ONLY in clear, grammatical Persian using Persian/Arabic script, with NO Chinese Han characters. Read all numbers and operators carefully. Distinguish the intended assessment construct from response speed or score stability. Never fabricate empirical evidence or sources. If asked for a number only, produce only the number. Admit uncertainty when necessary.'
 }
]);
const numerals={'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
const asciiDigits=s=>s.replace(/[۰-۹٠-٩]/gu,k=>numerals[k]);
async function hashFile(path){
 const h=createHash('sha256');
 for await(const chunk of createReadStream(path))h.update(chunk);
 return h.digest('hex');
}
function classify(item,answer,finish){
 const reasons=[];
 if(finish!=='stop')reasons.push('GENERATION_INCOMPLETE');
 if(typeof answer!=='string'||!answer.trim()||answer.length>2500)
   reasons.push('EMPTY_OR_OVERSIZED');
 else {
   if(/\p{Script=Han}/u.test(answer))reasons.push('CJK_SCRIPT_INTRUSION');
   if(/<\/?think(?:\s|>)/i.test(answer))reasons.push('EXPOSED_THINKING');
   if(item.expectedInteger!==undefined&&asciiDigits(answer.trim())!==String(item.expectedInteger))
     reasons.push('ARITHMETIC_OR_INSTRUCTION_ERROR');
   if(item.conceptReview&&!(/روایی/u.test(answer)&&/پایایی/u.test(answer) ||
     /سازه/u.test(answer)&&/سنجش/u.test(answer)))
     reasons.push('ACADEMIC_TERMINOLOGY_REQUIRES_REVIEW');
   const prev=inspectJreiEducationalDraft({
     question:item.prompt,answer,language:'fa',stopReason:finish,scope:'OWNER_PRIVATE_REMEDIATION'
   });
   for(const code of prev.reasonCodes||[])if(!reasons.includes(code))reasons.push(code);
 }
 return reasons.sort();
}
async function infer(config,item,strategy){
 const payload={
  model:config.modelId,
  messages:[{role:'system',content:strategy.system},{role:'user',content:item.prompt}],
  max_tokens:256,temperature:0,stream:false,
  chat_template_kwargs:{enable_thinking:false}
 };
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),MODEL_TIMEOUT_MS);
 try{
  const started=performance.now();
  const response=await fetch(MODEL,{
   method:'POST',redirect:'error',cache:'no-store',
   headers:{'Content-Type':'application/json','Accept':'application/json'},
   body:JSON.stringify(payload),signal:ctrl.signal
  });
  if(!response.ok||!response.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
   throw Error('MODEL_RESPONSE_NOT_JSON');
  const size=Number(response.headers.get('content-length'));
  if(Number.isFinite(size)&&size>MAX_RESPONSE)throw Error('MODEL_REPLY_OVERSIZED');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength>MAX_RESPONSE)throw Error('MODEL_REPLY_OVERSIZED');
  const data=JSON.parse(new TextDecoder().decode(bytes));
  const answer=data?.choices?.[0]?.message?.content;
  const finish=data?.choices?.[0]?.finish_reason;
  if(typeof answer!=='string')throw Error('MODEL_CONTENT_INVALID');
  return {id:item.id,answer,finishReason:finish,latencyMs:Math.round(performance.now()-started),
          flags:classify(item,answer,finish)};
 }finally{clearTimeout(timer)}
}
async function main(){
 if(process.platform!=='win32'||process.argv.length!==3||
   process.argv[2]!=='--owner-approved'||!ROOT)
   throw Error('LOCAL_OWNER_REMEDIATION_APPROVAL_REQUIRED');
 const configPath=join(ROOT,'jrei-worker-config.json');
 const cfg=JSON.parse(await readFile(configPath,'utf8'));
 const local=cfg?.localChat;
 if(cfg?.protocol!=='jr.jrei.windows-worker.v1'||
   cfg?.origin!=='https://drjavadrezazadeh.com'||
   local?.ownerApproved!==true||local?.rightsReviewed!==true||
   local?.endpoint!==MODEL||!SHA.test(local.modelSha256??'')||
   !SHA.test(local.backendExeSha256??''))
   throw Error('LOCAL_REMEDIATION_CONFIG_NOT_APPROVED');
 if((await hashFile(local.modelFile))!==local.modelSha256||
    (await hashFile(local.backendExe))!==local.backendExeSha256)
   throw Error('LOCAL_REMEDIATION_MODEL_BINARY_CHANGED');
 const reviewDir=join(ROOT,'quality-reviews');
 const filenames=(await readdir(reviewDir))
   .filter(x=>/^jrei-qwen-acceptance-[0-9TZ-]+\.json$/.test(x)).sort();
 if(!filenames.length)throw Error('ORIGINAL_QUALITY_EVIDENCE_REQUIRED');
 const originalBytes=await readFile(join(reviewDir,filenames.at(-1)));
 if(originalBytes.byteLength>200_000)throw Error('ORIGINAL_EVIDENCE_OVERSIZED');
 const original=JSON.parse(originalBytes.toString('utf8'));
 if(original.schema!=='jr.jrei.owner-local-evidence.v1'||
   original.modelArtifactSha256!==local.modelSha256||
   original.requestedSampleCount!==16||
   original.negativeQualityTriage?.result!=='BLOCKED_REMEDIATION_REQUIRED')
   throw Error('ORIGINAL_NEGATIVE_EVIDENCE_NOT_MATCHED');
 const runs=[];
 for(const strategy of strategies){
  for(const item of fixtures){
   try{
    const result=await infer(local,item,strategy);
    runs.push({strategy:strategy.id,...result});
    process.stdout.write('[JREI] '+strategy.id+' '+item.id+
       (result.flags.length?' REVIEW_HOLD':'NO_AUTOMATED_FAULT_DETECTED')+'\n');
   }catch(err){
    runs.push({strategy:strategy.id,id:item.id,answer:null,finishReason:null,
      latencyMs:null,flags:['MODEL_INFERENCE_ERROR'],errorCode:'LOCAL_EXPERIMENT_FAILED'});
    process.stdout.write('[JREI] '+strategy.id+' '+item.id+' FAILED\n');
   }
  }
 }
 const counts=Object.fromEntries(strategies.map(x=>[
  x.id,{
   cases:runs.filter(z=>z.strategy===x.id).length,
   autoFlagged:runs.filter(z=>z.strategy===x.id&&z.flags.length>0).length,
   conceptQuestionsNeedingHumanReview:2,
   independentQualityAccepted:false
  }
 ]));
 const report={
  schema:'jr.jrei.private-persian-remediation-experiment.v1',
  createdAt:new Date().toISOString(),localOnly:true,
  originalQualityReportSha256:digest(originalBytes),
  originalNegativeFindings:original.negativeQualityTriage.negativeFindings,
  modelSha256:local.modelSha256,
  comparison:['PERSIAN_DIRECT_CONSTRAINTS','BILINGUAL_EXACT_INSTRUCTIONS'],
  changedOnlyPromptingStrategy:true,
  usedOriginalQualityFixtureAsTraining:false,
  newHeldoutTasksIncluded:true,
  modelWeightsChanged:false,productionChatEnabled:false,
  independentScientificReviewCompleted:false,
  originalAcceptanceSuiteUnmodified:true,
  qualityAccepted:false,counts,runs
 };
 await mkdir(reviewDir,{recursive:true,mode:0o700});
 const bytes=JSON.stringify(report,null,2)+'\n';
 const file='jrei-persian-remediation-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
 await writeFile(join(reviewDir,file),bytes,{flag:'wx',mode:0o600});
 process.stdout.write('[JREI] DIAGNOSTIC_REPORT_SAVED_PRIVATE\n');
 process.stdout.write('[JREI] SUMMARY='+JSON.stringify(counts)+'\n');
 process.stdout.write('[JREI] MODEL_PUBLIC_ACTIVATION_REMAINS_OFF\n');
 process.stdout.write('[JREI] INDEPENDENT_EXPERT_REVIEW_STILL_REQUIRED\n');
}
const mainUrl=process.argv[1]?pathToFileURL(process.argv[1]).href:null;
if(mainUrl===import.meta.url)main().catch(err=>{
 const code=String(err?.message||'REMEDIATION_EXPERIMENT_UNAVAILABLE');
 process.stderr.write('[JREI] '+(/^[A-Z0-9_]{4,100}$/.test(code)?code:'REMEDIATION_EXPERIMENT_UNAVAILABLE')+'\n');
 process.exitCode=1;
});
