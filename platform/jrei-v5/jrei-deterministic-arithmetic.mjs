/**
 * JREI elementary integer arithmetic. Pure, bounded, and optional.
 * Language-model replies never establish numerical correctness.
 */
export const JREI_ARITHMETIC_VERSION='jr.jrei.math-integrity.v1';
const nums={'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
const digit=s=>s.replace(/[۰-۹٠-٩]/gu,c=>nums[c]);
const missed=reason=>Object.freeze({eligible:false,reason,verified:false});
function integer(a,b,operator,language){
 const x=digit(a),y=digit(b);
 if(!/^\d{1,9}$/.test(x)||!/^\d{1,9}$/.test(y)||
    +x>100000000||+y>100000000)return missed('OPERAND_LIMIT');
 const A=BigInt(x),B=BigInt(y);
 let result;
 if(operator==='multiply')result=A*B;
 else if(operator==='add')result=A+B;
 else if(operator==='subtract')result=A-B;
 else if(operator==='divide'&&B!==0n&&A%B===0n)result=A/B;
 else return missed('UNSUPPORTED_OPERATION');
 if(result>1000000000n||result< -1000000000n)return missed('RESULT_LIMIT');
 const decimal=String(result);
 const answer=language==='fa'?decimal.replace(/[0-9]/g,c=>'۰۱۲۳۴۵۶۷۸۹'[+c]):decimal;
 return Object.freeze({eligible:true,verified:true,operator,operands:[x,y],
   exactDecimal:decimal,answer,source:'DETERMINISTIC_INTEGER_ONLY',
   modelInvoked:false,scienceValidated:false});
}
export function planJreiArithmetic(question,language='fa'){
 if(typeof question!=='string'||question.length>180||
    !['fa','en'].includes(language))return missed('OUT_OF_SCOPE');
 const q=digit(question.normalize('NFC')).trim();
 let m=q.match(/^([0-9]{1,9})\s*([×*+÷/−-])\s*([0-9]{1,9})\s*(?:=\s*\?)?[.?؟!]*$/u);
 if(m){
  const op={'×':'multiply','*':'multiply','+':'add','÷':'divide','/':'divide','-':'subtract','−':'subtract'}[m[2]];
  return integer(m[1],m[3],op,language);
 }
 m=q.match(/^(?:عدد\s*)?([0-9]{1,9})\s*را\s*در\s*([0-9]{1,9})\s*ضرب\s*(?:کن|کنید)(?:\s*و\s*نتیجه\s*را\s*فقط\s*با\s*رقم\s*بنویس)?[.؟!]*$/u);
 if(m)return integer(m[1],m[2],'multiply',language);
 m=q.match(/^what is ([0-9]{1,9}) (times|multiplied by|divided by) ([0-9]{1,9})\?\s*(?:respond with the number only\.?)?$/i);
 if(m)return integer(m[1],m[3],m[2].toLowerCase()==='divided by'?'divide':'multiply',language);
 return missed('NOT_ELEMENTARY_ARITHMETIC');
}
export function auditJreiArithmetic(question,answer,language='fa'){
 const plan=planJreiArithmetic(question,language);
 if(!plan.eligible)return Object.freeze({status:'NOT_APPLICABLE',verified:false});
 const actual=typeof answer==='string'?digit(answer.trim()):'';
 const match=actual===plan.exactDecimal;
 return Object.freeze({status:match?'EXACT_MATCH':'MATHEMATICAL_MISMATCH',
   verified:match,expectedDecimal:plan.exactDecimal,
   action:match?'CONTINUE_REVIEW':'REJECT_DRAFT',modelCorrectionPerformed:false});
}
