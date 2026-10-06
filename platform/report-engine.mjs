// Versioned report assembly; rendering adapters consume this immutable model.
export function assembleReport({report_id,report_type,subject_user_id,assessment_session_id,source_response_revision,scoring_version_id=null,interpretation_version_id=null,template_version,sections=[],human_review_status='REQUESTED'}={}){
 if(!report_id||!report_type||!subject_user_id||!template_version) throw new Error('Versioned report identity required');
 if(source_response_revision!=null&&(!Number.isInteger(source_response_revision)||source_response_revision<1)) throw new Error('Valid response revision required');
 return {report_id,report_type,subject_user_id,assessment_session_id:assessment_session_id||null,source_response_revision:source_response_revision||null,scoring_version_id,interpretation_version_id,template_version,sections,status:'GENERATING',human_review_status,immutable_source_provenance:true};
}
export function approveReport(report,{reviewer_user_id,reviewed_at}={}){
 if(!report?.report_id||!reviewer_user_id||!reviewed_at) throw new Error('Human report review required');
 return {...report,status:'READY',human_review_status:'APPROVED',reviewer_user_id,reviewed_at};
}
export function supersedeReport(previous,replacement){
 if(previous?.status!=='READY'||replacement?.status!=='READY'||previous.report_id===replacement.report_id) throw new Error('Distinct ready reports required');
 return {previous:{...previous,status:'SUPERSEDED'},replacement:{...replacement,supersedes_report_id:previous.report_id},history_preserved:true};
}
