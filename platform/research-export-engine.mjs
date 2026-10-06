// Research export planner: operational data never becomes a research dataset implicitly.
const FORMATS=new Set(['CSV','XLSX','SPSS','R','PYTHON','QUALITATIVE_PACKAGE']);
export function planResearchExport({study,study_version,dataset_freeze,format,approved_by,purpose}={}){
 if(!study?.id||study.status!=='APPROVED') throw new Error('Approved research study required');
 if(!study_version?.id||study_version.status!=='FROZEN') throw new Error('Frozen study version required');
 if(!dataset_freeze?.id||dataset_freeze.status!=='FROZEN') throw new Error('Frozen dataset required');
 if(!FORMATS.has(format)||!approved_by||!String(purpose||'').trim()) throw new Error('Approved export context required');
 return {study_id:study.id,study_version_id:study_version.id,dataset_freeze_id:dataset_freeze.id,format,purpose,approved_by,direct_identity:false,transformation_log_required:true,codebook_required:true,audit_required:true};
}
export function qualitativePackage({case_id,text_records=[],codebook_version}={}){
 if(!case_id||!codebook_version) throw new Error('Pseudonymous case and codebook required');
 return {case_id,codebook_version,records:text_records.map(r=>({record_id:r.id,text:r.deidentified_text,source_type:r.source_type,observed_at:r.observed_at||null})),direct_identity:false};
}
