/**
 * Negative-only screening of PRIVATE synthetic JREI local model evidence.
 * Never contacts cloud, server, DB, or Windows credentials. No inferred
 * scientific acceptance, public activation or training privileges.
 */
const NUMERALS={
 '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
 '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'
};
const expectedArithmetic=Object.freeze({'fa-02':'84','en-02':'6'});
const normalDigits=s=>s.replace(/[۰-۹٠-٩]/gu,c=>NUMERALS[c]);
const code=(fixtureId,kind)=>({fixtureId,kind});

export function triageLocalQualityEvidence(report){
 if(!report||report.schema!=='jr.jrei.owner-local-evidence.v1'||
    !Array.isArray(report.fixtures)||report.fixtures.length>100||
    report.requestedSampleCount!==16||
    typeof report.modelArtifactSha256!=='string'||
    !/^[a-f0-9]{64}$/.test(report.modelArtifactSha256))
   throw Error('LOCAL_EVIDENCE_INVALID');
 const findings=[],seen=new Set();
 for(const item of report.fixtures){
   if(!item||typeof item.fixtureId!=='string'||
      typeof item.answer!=='string'||item.answer.length>5000||
      !['fa','en'].includes(item.lang)||seen.has(item.fixtureId))
     throw Error('LOCAL_EVIDENCE_INVALID');
   seen.add(item.fixtureId);
   if(item.finishReason!=='stop')
     findings.push(code(item.fixtureId,'INCOMPLETE_GENERATION'));
   if(!item.answer.trim())
     findings.push(code(item.fixtureId,'EMPTY_GENERATION'));
   if(item.lang==='fa'&&/\p{Script=Han}/u.test(item.answer))
     findings.push(code(item.fixtureId,'CJK_SCRIPT_INTRUSION_IN_PERSIAN'));
   if(Object.hasOwn(expectedArithmetic,item.fixtureId)&&
      normalDigits(item.answer.trim())!==expectedArithmetic[item.fixtureId])
     findings.push(code(item.fixtureId,'FIXED_ARITHMETIC_MISMATCH'));
 }
 for(const required of ['fa-02','en-02'])
   if(!seen.has(required))
     findings.push(code(required,'REQUIRED_ARITHMETIC_FIXTURE_MISSING'));
 if(report.sampleCount!==report.fixtures.length||
    report.sampleCount!==report.requestedSampleCount||
    report.allFixturesCompleted!==true||
    (Array.isArray(report.failures)&&report.failures.length>0))
   findings.push(code(null,'INCOMPLETE_OR_FAILED_TEST_CAMPAIGN'));
 return Object.freeze({
   schema:'jr.jrei.negative-quality-triage.v1',
   result:findings.length?'BLOCKED_REMEDIATION_REQUIRED':'INDEPENDENT_REVIEW_REQUIRED',
   negativeFindings:findings,
   reviewedByHuman:false,mathematicalIntegrityProven:false,
   scientificQualityAccepted:false,modelWeightsChanged:false,
   publicActivationAuthorized:false,
   assessmentLimit:'SELECTED_SYNTHETIC_NEGATIVE_CHECKS_ONLY'
 });
}
