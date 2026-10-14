// RCAS -> Golden Talent descriptive-evidence bridge. Private server use only.
// Inputs require server-side identity, consent, session and instrument-version checks.
// A response is not a validated trait or normative score. Missing/UNKNOWN/NA is not zero.
const DOMAIN_MAP=Object.freeze({A:['D5'],B:['D1'],C:['D1'],D:['D1','D6'],E:['D2'],F:['D3'],G:['D4','D5']});
const ACCESS_VALUES=new Set(['در دسترس','محدود','فعلاً در دسترس نیست','نیاز ندارم']);
const safeReference=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const coreCode=/^([A-G])([1-4])$/;
const accessCode=/^access[0-7]$/;
const missing=value=>value==null||value===''||value==='NA'||value==='UNKNOWN';
export function rcasToEvidence(input){
 if(!safeReference(input?.session_id)||!safeReference(input?.instrument_version)||
    !Array.isArray(input.responses)||input.responses.length>36)
   throw new Error('Invalid RCAS submission');
 const seen=new Set(),out=[];
 for(const r of input.responses){
  if(!r||typeof r!=='object'||Array.isArray(r)||
     Object.keys(r).some(key=>!['item_code','value'].includes(key)))
    throw new Error('Invalid RCAS item payload');
  const code=r.item_code;
  if(typeof code!=='string'||!code||seen.has(code)) throw new Error('Invalid or duplicate item');
  seen.add(code);
  const core=coreCode.exec(code);
  if(core){
   if(!missing(r.value)&&!(Number.isInteger(r.value)&&r.value>=0&&r.value<=4)&&
      !(typeof r.value==='string'&&/^[0-4]$/.test(r.value)))
      throw new Error('Invalid RCAS core response scale');
   // UNKNOWN and NA stay missing: neither is a weakness nor domain evidence.
   if(missing(r.value))continue;
   for(const domain of DOMAIN_MAP[core[1]])out.push({
    source_type:'ASSESSMENT',source_reference_id:input.session_id,
    instrument_code:'RCAS-CORE',instrument_version:input.instrument_version,
    domain_code:domain,evidence_key:code,evidence_value:{response:Number(r.value)},
    quality_state:'UNREVIEWED',
    provenance:{respondent_role:'SELF',item_code:code,direction:'CONTEXTUALISES'}
   });
   continue;
  }
  if(accessCode.test(code)){
   if(missing(r.value))continue;
   if(typeof r.value!=='string'||!ACCESS_VALUES.has(r.value))
     throw new Error('Invalid RCAS access response');
   if(r.value==='نیاز ندارم')continue;
   out.push({
    source_type:'CONTEXT',source_reference_id:input.session_id,
    instrument_code:'RCAS-P0',instrument_version:input.instrument_version,
    domain_code:'D4',evidence_key:code,evidence_value:{access_state:r.value},
    quality_state:'UNREVIEWED',
    provenance:{respondent_role:'SELF',item_code:code,direction:'CONTEXTUALISES'}
   });
   continue;
  }
  throw new Error('Unknown RCAS item code');
 }
 return out;
}
