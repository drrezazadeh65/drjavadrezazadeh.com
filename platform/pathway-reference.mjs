import fs from 'node:fs';
const policy=JSON.parse(fs.readFileSync(new URL('./pathway-reference-policy.json',import.meta.url),'utf8'));
export {policy};

export function validatePathwayReference(ref={}){
 const required=['reference_type','source_system','source_version','source_record_id','jurisdiction','locale','source_url','licence','retrieved_at','title'];
 const missing=required.filter(k=>ref[k]===undefined||ref[k]===null||String(ref[k]).trim()==='');
 if(missing.length) throw new Error('Pathway reference missing: '+missing.join(', '));
 if(!policy.reference_types.includes(ref.reference_type)) throw new Error('Unsupported pathway reference type');
 if(!policy.adapter_classes.includes(ref.source_system)) throw new Error('Unsupported pathway adapter class');
 return {...ref,validated_reference:true};
}

export function createPathwayHypothesis({
 subject_user_id,pathway_reference,supporting_evidence_ids=[],counterevidence_ids=[],
 uncertainty,proposed_experiment,reviewer_user_id
}={}){
 if(!subject_user_id) throw new Error('Subject required');
 const ref=validatePathwayReference(pathway_reference);
 if(!supporting_evidence_ids.length) throw new Error('Supporting evidence required');
 if(!String(uncertainty||'').trim()) throw new Error('Uncertainty statement required');
 if(!String(proposed_experiment||'').trim()) throw new Error('Real-world pathway experiment required');
 if(!reviewer_user_id) throw new Error('Human reviewer required');
 return {
  subject_user_id,
  pathway_reference:ref,
  supporting_evidence_ids:[...new Set(supporting_evidence_ids)],
  counterevidence_ids:[...new Set(counterevidence_ids)],
  uncertainty,
  proposed_experiment,
  reviewer_user_id,
  status:'HYPOTHESIS',
  human_review_required:true,
  automatic_ranking:false,
  suitability_score:null,
  normative_label:null,
  automatic_major_recommendation:false,
  automatic_career_prescription:false
 };
}

export function pathwayPortfolio(hypotheses=[]){
 const valid=hypotheses.filter(x=>x?.status==='HYPOTHESIS'&&x?.pathway_reference?.validated_reference===true);
 return {
  hypotheses:valid,
  ordering:'UNRANKED',
  preserves_counterevidence:true,
  requires_experiential_follow_up:true,
  total_score:null
 };
}
