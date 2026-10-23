// FINAL ACCEPTANCE TEST SOURCE ONLY — DO NOT EXECUTE during development.
// No provider/host/LLM/DB/participant data is loaded by these pure contracts.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
 validateExamScope,assessExaminationSource,transitionExamItem,
 inspectGeneratedItem,planThreeStagePreparation
} from '../platform/jrei-v5/jrei-examination-contracts.mjs';
import {
 proposeExamDiscovery,planReviewedExamExtraction,inspectAnswerKeyConflicts
} from '../platform/jrei-v5/jrei-exam-discovery-contracts.mjs';
import {
 registerConstructProposal,validateResearchProtocol,
 authorizeResearchDataset,stageResearchFinding,proposeResearchMethod
} from '../platform/jrei-v5/jrei-testly-research-contracts.mjs';

const scope={
 countryCode:'IR',curriculumId:'ir-school-sciences',
 curriculumVersion:'2026-r1',level:'PRIMARY',grade:5,
 category:'SCHOOL_INTERNAL',subjectId:'mathematics',year:1405
};
const source={
 sourceId:'official-example',issuerId:'ministry',title:'Reviewed 1405 archive',
 publicationDate:'2026-10-20',sourceVersion:'v1',
 originalSha256:'a'.repeat(64),permissionScope:'PERMITTED_PRIVATE_ANALYSIS',
 reviewStatus:'AUTHORITATIVE_REVIEWED',revoked:false,superseded:false,
 termsReviewApproved:true,robotsAndAccessApproved:true
};
const protocol={
 protocolId:'proto1',protocolVersion:'v1',framework:'HUMANABILITY',
 frameworkVersion:'author-proposal-v1',
 registeredHypotheses:[{id:'H1',question:'Can the dimensions be empirically distinguished?'}],
 plannedMethods:['QUALITATIVE_INTERVIEWS','CLASSICAL_TEST_THEORY'],
 ethicalBasis:'independently-approved-protocol',
 independentEthicsApproval:true,sourceDocumentSha256:'a'.repeat(64),
 consentNoticeVersion:'humanability-research-v1',
 sourceQuestionVersion:'pre-registered-question-v1',
 studyIncludesMinors:false,guardianProtocolReviewed:false,
 changesAfterPreregistration:false
};
test('primary and secondary grade ranges and official exam category stay separate',()=>{
 assert.equal(validateExamScope(scope).ok,true);
 assert.equal(validateExamScope({...scope,grade:12}).ok,false);
 assert.equal(validateExamScope({...scope,level:'MASTERS_ENTRANCE',grade:null}).ok,false);
 assert.equal(validateExamScope({...scope,level:'MASTERS_ENTRANCE',grade:null,
   category:'MASTERS_ENTRANCE'}).ok,true);
});
test('public discovery is not copyright or image extraction authority',()=>{
 assert.equal(assessExaminationSource({source,task:'discover'}).ok,true);
 assert.equal(assessExaminationSource({source,task:'reproduce'}).ok,false);
 const p=proposeExamDiscovery({
   sourceAuthorityId:'ministry',approvedHttpsHost:'example.edu',
   seedUrl:'https://example.edu/1405/list',
   scope,paperKinds:['EXAM_PAPER','ANSWER_KEY'],
   termsReview:{reviewed:true,bulkDiscoveryPermitted:true,reviewVersion:'v1'},
   robotsReview:{reviewed:true,allowAutomatedAccess:true,reviewVersion:'v1'},
   sourceReviewAttestation:true
 });
 assert.equal(p.ok,true);
 assert.equal(p.rawDocumentDownloadAllowed,false);
 assert.equal(p.publicationAllowed,false);
 assert.equal(proposeExamDiscovery({
   sourceAuthorityId:'ministry',approvedHttpsHost:'example.edu',
   seedUrl:'https://127.0.0.1/local',scope,paperKinds:['EXAM_PAPER']
 }).ok,false);
});
test('scanned or diagram evidence never silently becomes a complete item',()=>{
 assert.equal(planReviewedExamExtraction({
   source,document:{documentVersion:'v1'},mimeType:'application/pdf',
   originalSha256:source.originalSha256,verifiedBytesCount:4500,
   provenanceLocator:'page-2',includesDiagrams:true,
   allowedPrivateStore:true,independentComponentReview:false
 }).ok,false);
});
test('alternative-label swap is not a generated new question',()=>{
 const orig={id:'old',stem:'Two plus two equals?',correctOption:'B',
   options:[{id:'A',text:'Three'},{id:'B',text:'Four'},
     {id:'C',text:'Five'},{id:'D',text:'Six'}]};
 const switched={...orig,id:'new',correctOption:'C',
   options:[{id:'A',text:'Three'},{id:'B',text:'Five'},
     {id:'C',text:'Four'},{id:'D',text:'Six'}]};
 assert.equal(inspectGeneratedItem({
   original:orig,candidate:switched,qualityReview:{}
 }).reason,'OPTIONS_REORDERED_ONLY');
});
test('official blueprint must be reviewed before three-stage schedule',()=>{
 const base={examDate:'2026-12-01',examDateAuthority:'ministry',
  blueprintVersion:'official-v1',scoringRulesVersion:'scoring-v1'};
 assert.equal(planThreeStagePreparation(base).ok,false);
 const approved=planThreeStagePreparation({
  ...base,examDateVerified:true,blueprintApproved:true
 });
 assert.equal(approved.ok,true);
 assert.deepEqual(approved.stages.map(x=>x.daysBeforeExam),[30,14,3]);
 assert.equal(approved.schedulePublished,false);
});
test('unverified answer keys remain unknown and conflicting keys stay flagged',()=>{
 const f={itemFingerprint:'b'.repeat(64),year:1405,
  sourceDigest:'a'.repeat(64)};
 assert.equal(inspectAnswerKeyConflicts({...f,recordedKeys:[]}).recommendedOption,null);
 const conflict=inspectAnswerKeyConflicts({...f,recordedKeys:[
  {optionCode:'B',sourceSha256:'a'.repeat(64),reviewState:'REVIEWED'},
  {optionCode:'C',sourceSha256:'b'.repeat(64),reviewState:'REVIEWED'}]});
 assert.equal(conflict.conflictDetected,true);
 assert.equal(conflict.publicAnswerReady,false);
});
test('TESTLY and Humanability require the exact original author source hash/paragraph',()=>{
 const args={framework:'HUMANABILITY',frameworkVersion:'author-proposal-v1',
  dimensionCode:'HUMAN_DIGNITY',sourceId:'humanability-author-research-proposal',
  sourceSha256:'6e01e8f2f3e05a387dcb3f3fd4ace8fbacc5560834638de182d1ea5645916ac5',
  sourceParagraph:170,evidenceLevel:'THEORETICAL_PROPOSITION'};
 const good=registerConstructProposal(args);
 assert.equal(good.ok,true);
 assert.equal(good.scoringEnabled,false);
 assert.equal(registerConstructProposal({...args,sourceParagraph:171}).ok,false);
 assert.equal(registerConstructProposal({...args,evidenceLevel:'VALIDATION_SUPPORTED'}).ok,false);
});
test('registered research cannot recruit minors without ethics and guardian protocol',()=>{
 const adult=validateResearchProtocol(protocol);
 assert.equal(adult.ok,true);
 assert.equal(adult.canRecruit,true);
 const child=validateResearchProtocol({...protocol,studyIncludesMinors:true});
 assert.equal(child.ok,false);
 assert.equal(validateResearchProtocol({...protocol,
   independentEthicsApproval:false}).ok,false);
});
test('research dataset consent purpose, withdrawal and method prerequisites are mandatory',()=>{
 const approved=validateResearchProtocol(protocol);
 const fixture={
  protocol:approved,participantPolicy:{includesMinors:false},
  consent:{current:true,purpose:'TESTLY_HUMANABILITY_RESEARCH',
    noticeVersion:approved.consentNoticeVersion,withdrawn:false},
  privacyProof:{accountAuthorizationRechecked:true,purposeScopedAccess:true,
    withdrawalRechecked:true,breachReviewClear:true,exportRightsApproved:true},
  dataset:{datasetId:'ds1',sha256:'b'.repeat(64),
    instrumentVersion:'iv1',retentionPolicyVersion:'ret1',
    minimizationReviewed:true,rawIdentityIncluded:false,
    directIdentifiersIncluded:false,recordCount:200,
    approvedCapabilities:['SCORING_RULES','ITEM_RESPONSES','REVIEWED_SAMPLE']},
  intendedMethod:'CLASSICAL_TEST_THEORY'
 };
 assert.equal(authorizeResearchDataset(fixture).ok,true);
 assert.equal(authorizeResearchDataset({...fixture,
   consent:{...fixture.consent,withdrawn:true}}).ok,false);
 assert.equal(authorizeResearchDataset({...fixture,
   dataset:{...fixture.dataset,rawIdentityIncluded:true}}).ok,false);
});
test('contradictory findings may be staged but not auto certified or published',()=>{
 const result=stageResearchFinding({
  protocolId:'proto1',protocolVersion:'v1',hypothesisId:'H1',
  analysisId:'analysis-1',method:'CLASSICAL_TEST_THEORY',
  analysisCodeSha256:'c'.repeat(64),datasetSha256:'b'.repeat(64),
  resultDigest:'a'.repeat(64),interpretation:'CHALLENGES_PROPOSITION',
  contradictionsRecorded:true,independentReviewer:'external1',
  reportVersion:'r1',disclosureReview:true
 });
 assert.equal(result.ok,true);
 assert.equal(result.interpretation,'CHALLENGES_PROPOSITION');
 assert.equal(result.canPublish,false);
 assert.equal(result.scientificValidationClaim,false);
 assert.equal(proposeResearchMethod({researchQuestion:'Explain factor structure',
   method:'CONFIRMATORY_FACTOR_ANALYSIS',designReviewed:false}).ok,false);
});
