/* JR Konkur 1406 descriptive study review plan.
 * No diagnosis, comparison of provider TAZ, official admission inference, AI,
 * account storage, analytics transmission or automated learning claims.
 */
(function(root,factory){
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JRKonkurStudyReview=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const version='jr-konkur-local-review-v1';
 const minutesAllowed=Object.freeze([15,25,40]);
 const boundedLabel=s=>typeof s==='string'&&s.trim().length>0&&s.trim().length<=70;
 const isDate=s=>typeof s==='string'&&/^14\d{2}\/(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])$/.test(s);
 function generateStudyReview(exams,minutes=25){
  const basis={schema:version,modelPredictionEnabled:false,officialRank:null,
   admissionProbability:null,dataClass:'SELF_REPORTED_UNVERIFIED',
   comparability:'SINGLE_REPORTED_EXAM_ONLY'};
  const denied=(reason)=>Object.freeze({...basis,status:'INSUFFICIENT_INFORMATION',
   reason,exam:null,subjects:Object.freeze([]),minutesPerSubject:null,
   guidance:'Enter subject percentages for one recent practice exam before planning.'});
  if(!Array.isArray(exams)||exams.length===0||exams.length>40)return denied('NO_VALID_EXAM_COLLECTION');
  if(!minutesAllowed.includes(minutes))return denied('UNSUPPORTED_REVIEW_DURATION');
  const eligible=exams.filter(e=>e&&typeof e==='object'&&!Array.isArray(e)&&
   isDate(e.date)&&typeof e.provider==='string'&&e.provider.length<=70&&
   typeof e.group==='string'&&e.group.length<=80);
  if(!eligible.length)return denied('NO_VALID_EXAM_DATES');
  const latest=eligible.slice().sort((a,b)=>a.date.localeCompare(b.date)).at(-1);
  const potential=[
   ...(boundedLabel(latest.subject)&&Number.isFinite(latest.percent)?
    [{subject:latest.subject,percent:latest.percent}]:[]),
   ...(Array.isArray(latest.additionalSubjects)?latest.additionalSubjects:[])
  ];
  const seen=new Set(),subjects=[];
  for(const metric of potential.slice(0,12)){
   if(!metric||!boundedLabel(metric.subject)||!Number.isFinite(metric.percent)||
     metric.percent < -33.34||metric.percent>100)continue;
   const key=metric.subject.normalize('NFKC').trim().toLocaleLowerCase();
   if(seen.has(key))continue;seen.add(key);
   subjects.push(Object.freeze({
    subject:metric.subject.trim(),selfReportedPercent:metric.percent,
    reviewMinutes:minutes,sourceExamDate:latest.date,
    steps:Object.freeze([
     'Identify the specific topic or error pattern in the last exam.',
     'Recall or explain the concept without looking at notes.',
     'Try new questions and check the explanation; record what remains uncertain.'
    ])
   }));
  }
  if(!subjects.length)return denied('NO_USABLE_SUBJECT_PERCENTAGES_IN_LATEST_EXAM');
  return Object.freeze({...basis,status:'DESCRIPTIVE_REVIEW_READY',
   exam:Object.freeze({date:latest.date,provider:latest.provider,group:latest.group,
    grade:String(latest.grade??'UNSPECIFIED').slice(0,40)}),
   subjects:Object.freeze(subjects),minutesPerSubject:minutes,
   guidance:'This is an optional self-directed review checklist, not a learning diagnosis. Topics, difficulty, exam coverage and personal needs require human judgement. The allotted time is a user-selected example, not a prescription.'
  });
 }
 return {version,minutesAllowed,generateStudyReview};
});
