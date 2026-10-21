/* JR Konkur portable self-reported practice CSV v1.
 * User-initiated local export only. Never validates rank, eligibility or admission odds.
 * Private information typed into subject labels can remain on the downloaded device.
 */
(function(root,factory){
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.JRKonkurMockExport=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const schema='jr-konkur-mock-portable-csv-v1';
 const headers=Object.freeze([
  'exam_date_solar','provider_code','examination_group','education_stage',
  'rank_population','provider_reported_taz','provider_reported_rank',
  'subject_label','provider_reported_subject_percentage','evidence_status'
 ]);
 const MAX_EXAMS=40,MAX_SUBJECTS=12;
 const cleanText=value=>{
  const s=String(value??'').slice(0,300)
   .replace(/[\u0000-\u001f\u007f\u2028\u2029]/g,' ')
   .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g,'');
  // Excel and similar apps evaluate CSV formulas, even after leading whitespace.
  return /^\s*[=+@-]/.test(s)?"'"+s:s;
 };
 const csvText=value=>'"'+cleanText(value).replace(/"/g,'""')+'"';
 const csvNumber=value=>value===null||value===undefined?'':Number.isFinite(value)?String(value):'';
 const quotedNumber=value=>'"'+csvNumber(value)+'"';
 const escapeRow=row=>row.map((value,index)=>(index===5||index===6||index===8)?quotedNumber(value):csvText(value)).join(',');
 function buildMockExamCsv(exams){
  if(!Array.isArray(exams)||exams.length===0||exams.length>MAX_EXAMS)throw new TypeError('Expected 1–40 self-reported exam entries');
  const lines=[headers.join(',')];
  for(const exam of exams){
   if(!exam||typeof exam!=='object'||Array.isArray(exam))throw new TypeError('Malformed self-reported exam');
   const subjects=[
    ...(typeof exam.subject==='string'&&Number.isFinite(exam.percent)?[{subject:exam.subject,percent:exam.percent}]:[]),
    ...(Array.isArray(exam.additionalSubjects)?exam.additionalSubjects:[]),
   ];
   if(subjects.length>MAX_SUBJECTS)throw new TypeError('Too many subject entries');
   const measures=subjects.length?subjects:[{subject:'',percent:null}];
   for(const metric of measures){
    if(!metric||typeof metric!=='object'||!Number.isFinite(metric.percent)&&metric.percent!==null)throw new TypeError('Invalid subject measure');
    lines.push(escapeRow([
     exam.date,exam.provider,exam.group,exam.grade,exam.rankScope,
     exam.taz,exam.rank,metric.subject,metric.percent,'SELF_REPORTED_UNVERIFIED'
    ]));
   }
  }
  return Object.freeze({
   schema,filename:'jr-konkur-mock-self-reported.csv',
   mimeType:'text/csv;charset=utf-8',records:exams.length,rows:lines.length-1,
   csv:'\uFEFF'+lines.join('\r\n')+'\r\n',
   warning:'Contains unverified self-reported practice scores. Not an official exam result, rank equivalence, or admission prediction. User is responsible for protecting the locally downloaded file.'
  });
 }
 return {schema,headers,buildMockExamCsv};
});
