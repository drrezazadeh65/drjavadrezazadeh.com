/**
 * Authorial style governance. Never claim to have examined a corpus not read;
 * do not misattribute an AI-written newsroom story to the owner personally.
 */
import {assert,plain,safeText} from './contracts.mjs';
export const EDITORIAL_FORMATS=Object.freeze(['BREAKING_BRIEF','NEWS_REPORT',
  'EXPLAINER','ANALYSIS','GUIDE','CORRECTION','RUMOR_REVIEW']);
export const EDITORIAL_POLICY=Object.freeze({
  fa:{voice:'analytical, progressive, educational, precise, humane',
    references:['approved Persian educational philosophy',
      'approved first chapter of Masir-e Roshd',
      'other owner-approved Persian prose'],
    mustNotClaimCorpusAnalyzedWithoutEvidence:true},
  en:{voice:'Javad Rezazadeh Integrated English Writing Style',
    references:['approved MA thesis','approved PhD dissertation',
      'owner-approved scholarly publications'],
    mustNotClaimCorpusAnalyzedWithoutEvidence:true},
  byline:'JREI EDITORIAL DESK',
  personalBylineRequiresExplicitAuthorConfirmation:true,
  officialFactsMustNotBeAlteredForStyle:true
});
export function editorialGenerationRequest({candidate,evidence,format,
  styleCorpusRecords=[],languages=['fa','en']}={}){
  assert(plain(candidate)&&candidate.schema==='jr.jrei.news-candidate.v1'&&
    plain(evidence)&&evidence.schema==='jr.jrei.news-evidence-review.v1'&&
    evidence.candidateFingerprint===candidate.fingerprint&&
    EDITORIAL_FORMATS.includes(format)&&
    Array.isArray(languages)&&languages.includes('fa')&&languages.includes('en')&&
    Array.isArray(styleCorpusRecords)&&styleCorpusRecords.length<=30,
    'NEWS_EDITORIAL_GENERATION_INVALID');
  for(const item of styleCorpusRecords){
    assert(plain(item)&&safeText(item.sourceReference,5,500)&&
      /^[a-f0-9]{64}$/.test(item.contentSha256??'')&&
      item.ownerApproved===true&&item.rightsReviewed===true,
      'NEWS_STYLE_CORPUS_UNAPPROVED');
  }
  return Object.freeze({schema:'jr.jrei.news-generation-request.v1',
    candidateFingerprint:candidate.fingerprint,format,languages:['fa','en'],
    stylePolicy:EDITORIAL_POLICY,
    corpusVerified:styleCorpusRecords.length>0,
    corpusReferences:styleCorpusRecords.map(x=>x.sourceReference),
    sourceFactsImmutable:true,requireEvidenceForEachMaterialClaim:true,
    noInventedDatesOrLinks:true,noFalsePersonalByline:true,
    outputs:['headline','summary','body','nextSteps','officialSource',
      'editorialNotes','claimsToVerify'],
    generationStatus:'PENDING_EXISTING_JREI_MODEL_ADAPTER',
    publicationAllowed:false});
}
