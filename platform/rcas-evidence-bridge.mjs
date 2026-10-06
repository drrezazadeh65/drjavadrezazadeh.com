// RCAS to Golden Talent evidence bridge. Server-intended; browser state is not authoritative.
const DOMAIN_MAP={A:['D5'],B:['D1'],C:['D1'],D:['D1','D6'],E:['D2'],F:['D3'],G:['D4','D5']};
export function rcasToEvidence(input){
 if(!input?.session_id||!input?.instrument_version||!Array.isArray(input.responses)) throw new Error('Invalid RCAS submission');
 const seen=new Set(),out=[];
 for(const r of input.responses){
  const code=String(r?.item_code||'').trim();
  if(!code||seen.has(code)) throw new Error('Invalid or duplicate item');
  seen.add(code);
  const group=code.match(/^([A-G])\d+$/)?.[1];
  if(group&&r.value!=='NA'&&r.value!==''&&r.value!=null){
   for(const domain of DOMAIN_MAP[group]) out.push({source_type:'ASSESSMENT',source_reference_id:input.session_id,instrument_code:'RCAS-CORE',instrument_version:input.instrument_version,domain_code:domain,evidence_key:code,evidence_value:{response:r.value},quality_state:'UNREVIEWED',provenance:{respondent_role:'SELF',item_code:code,direction:'CONTEXTUALISES'}});
  } else if(/^access\d+$/.test(code)&&r.value&&r.value!=='نیاز ندارم'){
   out.push({source_type:'CONTEXT',source_reference_id:input.session_id,instrument_code:'RCAS-P0',instrument_version:input.instrument_version,domain_code:'D4',evidence_key:code,evidence_value:{access_state:r.value},quality_state:'UNREVIEWED',provenance:{respondent_role:'SELF',item_code:code,direction:'CONTEXTUALISES'}});
  }
 }
 return out;
}
