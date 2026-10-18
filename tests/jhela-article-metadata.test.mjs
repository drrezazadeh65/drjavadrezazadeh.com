import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isValidOrcid,isValidRor,validateJhelaArticle} from '../scripts/jhela-article-metadata-audit.mjs';
const policy=JSON.parse(fs.readFileSync('platform/jhela-article-metadata-quality-policy-v1.json','utf8'));
const words=('This synthetic research explores classroom interpretations of learning activities through a transparent descriptive method and contextualised evidence. '+
 'The analysis distinguishes reported experiences from broader causal claims and discusses the study boundaries with particular attention to evidence quality and ethical care. '+
 'The study documents its analytical choices and reflects on practical applications, acknowledging uncertainty, sampling limits and differences across institutional contexts. '+
 'It proposes an accountable interpretation while treating learners and educators as participants in a shared educational environment, not as isolated performance metrics.').repeat(2);
function sample(){
 return {
  schema:'jhela-article-metadata-v1',journal:'JHELA',type:'research',language:'en',
  title:'A synthetic study of responsible educational assessment practices',
  abstract:words,
  keywords:['learning','assessment','research ethics'],
  authors:[{name:'Example Researcher',orcid:'0000-0002-1825-0097',affiliations:[{name:'Example University',ror:'https://ror.org/03yrm5c26'}]}],
  references:[{citation:'Example scholarly citation from a synthetic bibliographic record'}],
  declarations:{
   ethicsStatement:'Institutional approval or a justified exemption is documented within the protected editorial system.',
   consentStatement:'Appropriate participant consent or approved waiver is documented in the editorial system.',
   fundingStatement:'This synthetic record lists no research funding.',
   competingInterestsStatement:'No conflicts have been reported in this synthetic record.',
   dataAvailabilityStatement:'Only synthetic demonstrations are used, with no real human-participant information.',
   aiAssistanceStatement:'No automated content assistance was used for this synthetic fixture.'
  },
  rights:{license:'CC-BY-4.0',authorAgreementConfirmed:true,fullTextOpenAccess:true},
  history:{submittedAt:'2026-10-01T12:00:00Z'},
  review:{decision:'accept',independentReviewersConfirmed:true,conflictScreeningConfirmed:true,nativeEditorialAuditReferenceVerified:true},
  publication:{landingUrl:'https://journal.drjavadrezazadeh.com/jhela/article/view/123',fullTextUrl:'https://journal.drjavadrezazadeh.com/jhela/article/download/123/100'},
  production:{proofApproved:true,metadataApproved:true,publisherRightsApproved:true},
 };
}
const check=(a,phase='editorial')=>validateJhelaArticle(a,policy,{phase});
test('synthetic complete English journal metadata is ready for editorial quality check but never authorizes publication',()=>{
 const r=check(sample());
 assert.deepEqual(r.errors,[]);
 assert.equal(r.pass,true);
 assert.equal(r.publicationAuthorised,false);
 assert.equal(r.registryCertified,false);
});
test('production metadata requires actual review, acceptance chronology, proof signoff and HTTPS pages',()=>{
 const a=sample();a.history.acceptedAt='2026-10-10T09:00:00Z';
 assert.equal(check(a,'production').pass,true,'source preflight can pass with synthetic affirmative flags, but cannot independently certify native editorial platform records');
 a.history.acceptedAt='2026-09-01T09:00:00Z';a.review.nativeEditorialAuditReferenceVerified=false;a.production.proofApproved=false;
 a.publication.fullTextUrl='http://example.com/paper.pdf';
 const r=check(a,'production');
 for(const code of ['history.acceptance_precedes_submission','review.native_evidence_not_verified','production.proof_metadata_rights_signoff','publication.public_urls_required'])assert.ok(r.errors.includes(code));
});
test('ORCID MOD 11-2 validation and ROR optional identifier formatting',()=>{
 assert.equal(isValidOrcid('0000-0002-1825-0097'),true);
 assert.equal(isValidOrcid('https://orcid.org/0000-0002-1825-0097'),true);
 assert.equal(isValidOrcid('0000-0002-1825-0098'),false);
 assert.equal(isValidOrcid('0000-0000-0000-000X'),false);
 assert.equal(isValidRor('https://ror.org/03yrm5c26'),true);
 assert.equal(isValidRor('https://evil.invalid/03yrm5c26'),false);
 const a=sample();a.authors[0].orcid='0000-0002-1825-0098';a.authors[0].affiliations[0].ror='https://evil.invalid/03yrm5c26';
 const r=check(a);assert.ok(r.errors.includes('author.orcid_checksum_invalid'));assert.ok(r.errors.includes('author.ror_invalid'));
});
test('privacy: private reviewers, student participant details and bank credentials never become public metadata',()=>{
 const a=sample();a.review.reviewerEmail='reviewer@example.edu';a.participantName='Person X';a.bankAccount='123456';
 assert.ok(check(a).errors.includes('privacy.private_field'));
});
test('DOI syntax and locally claimed registration cannot masquerade as external Crossref evidence',()=>{
 const a=sample();
 a.doi={value:'10.1234/test.123',depositStatus:'registered',publiclyClaimed:true};
 const r=check(a);
 assert.ok(r.errors.includes('doi.public_claim_requires_offline_authority_verification'));
 assert.ok(r.warnings.includes('doi.registration_unverified_by_offline_audit'));
 assert.equal(r.registryCertified,false);
 a.doi.publiclyClaimed=false;
 assert.equal(check(a).pass,true);
 a.doi.value='made-up-prefix';
 assert.ok(check(a).errors.includes('doi.invalid'));
});
test('source-only article metadata refuses journal-level ISSN, Scopus/SSCI or Q1 self-certification',()=>{
 const a=sample();a.issn='1234-5678';a.quartile='Q1';a.indexes=['Scopus'];
 assert.ok(check(a).errors.includes('indexing.journal_level_claims_not_article_metadata'));
});
test('required ethics, languages, title, references, keywords and open rights cannot be skipped',()=>{
 const a=sample();a.language='fa';a.abstract='too short';a.keywords=['learning','Learning'];a.references=[];a.rights.authorAgreementConfirmed=false;a.declarations.consentStatement='';
 const r=check(a);
 for(const code of ['article.language','abstract.insufficient_context','keywords.invalid','references.invalid','rights.open_access_author_agreement_required','declarations.consentStatement'])assert.ok(r.errors.includes(code));
});
test('unsupported phases and missing source payloads fail closed',()=>{
 const a=sample();assert.equal(check(a,'publicly_accepted').pass,false);
 assert.equal(check(null).pass,false);
 assert.equal(validateJhelaArticle(a,{schema:'wrong'}).pass,false);
});
