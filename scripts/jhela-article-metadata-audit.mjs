/**
 * JHELA public scholarly metadata preflight — source-only, zero HTTP calls or publication writes.
 * Does NOT certify that peer review, actual Crossref registration or native editorial platform acceptance occurred.
 * Never provide live unredacted manuscripts, reviewer details or participant data as fixtures.
 */
import fs from 'node:fs';

const validDate=d=>typeof d==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(d)&&Number.isFinite(Date.parse(d));
const cleanString=v=>typeof v==='string'&&v.trim()===v&&v.length>0&&!/[<>]/.test(v);
const onlyHttps=(value,host)=>{
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!host||u.hostname===host);}
 catch{return false;}
};
const wordCount=s=>typeof s==='string'?(s.trim().match(/\S+/g)||[]).length:0;
const hiddenKey=/(?:reviewer(?:name|email|identity|password|notes|report|file|token)|participant(?:name|email|address|identity)|raw(?:manuscript|submission)|secret|api(?:_|)key|password|card(?:number|cvv)|financialaccount|bankaccount|confidential(?:file|report|letter))/i;
function forbiddenFields(record){
 const failures=[];
 const visit=(node,path='',level=0)=>{
  if(level>12){failures.push('privacy.max_depth');return;}
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){if(node.length>500){failures.push('privacy.unbounded_collection');return;}node.forEach((v,i)=>visit(v,path+'['+i+']',level+1));return;}
  for(const [key,v] of Object.entries(node)){
    if(hiddenKey.test(key))failures.push('privacy.private_field');
    else visit(v,path?path+'.'+key:key,level+1);
  }
 };
 visit(record);
 return [...new Set(failures)];
}
/** ORCID ISO 7064 MOD 11-2 checksum; optional identifiers still have to be valid. */
export function isValidOrcid(value){
 if(typeof value!=='string')return false;
 const match=value.match(/^(?:https:\/\/orcid\.org\/)?(\d{4})-(\d{4})-(\d{4})-(\d{3}[\dX])$/);
 if(!match)return false;
 const digits=match.slice(1).join('');
 let sum=0;
 for(const char of digits.slice(0,15))sum=(sum+Number(char))*2;
 const remainder=sum%11;const check=(12-remainder)%11;
 return digits[15]===(check===10?'X':String(check));
}
export function isValidRor(value){
 return typeof value==='string'&&/^https:\/\/ror\.org\/0[0-9a-hjkmnp-tv-z]{6}[0-9]{2}$/i.test(value);
}
const validDoi=v=>typeof v==='string'&&/^10\.\d{4,9}\/[^\s<>]{1,170}$/i.test(v);
const abstractAdvisory=(article)=>['research','systematic_review','methods'].includes(article?.type);
export function validateJhelaArticle(article,policy,{phase='editorial'}={}){
 const errors=[],warnings=[],add=(v)=>errors.push(v),warn=(v)=>warnings.push(v);
 const permitted=['editorial','production'];
 if(!permitted.includes(phase))return {schema:'jhela-article-metadata-preflight-v1',phase,pass:false,errors:['phase.invalid'],warnings:[],publicationAuthorised:false,registryCertified:false};
 if(!article||typeof article!=='object'||Array.isArray(article))return {schema:'jhela-article-metadata-preflight-v1',phase,pass:false,errors:['article.invalid'],warnings:[],publicationAuthorised:false,registryCertified:false};
 if(policy?.schema!=='jhela-article-metadata-quality-policy-v1')add('policy.invalid');
 errors.push(...forbiddenFields(article));
 if(article.schema!=='jhela-article-metadata-v1')add('metadata.schema');
 if(article.journal!=='JHELA')add('metadata.journal');
 if(!policy?.permittedArticleTypes?.includes(article.type))add('article.type');
 if(article.language!=='en')add('article.language');
 if(!cleanString(article.title)||article.title.length<(policy?.metadataRequirements?.titleMinimumCharacters??20))add('title.missing_or_short');
 if(typeof article.abstract!=='string'||!article.abstract.trim())add('abstract.missing');
 else{
  const words=wordCount(article.abstract);
  if(abstractAdvisory(article)&&words<(policy?.metadataRequirements?.abstractMinimumWordsForResearch??75))add('abstract.insufficient_context');
  if(words>(policy?.metadataRequirements?.abstractAdvisoryMaximumWords??350))warn('abstract.very_long');
 }
 const keywords=article.keywords;
 if(!Array.isArray(keywords)||keywords.length<(policy?.metadataRequirements?.keywordsMin??3)||keywords.length>(policy?.metadataRequirements?.keywordsMax??8)||keywords.some(x=>!cleanString(x)))add('keywords.invalid');
 else if(new Set(keywords.map(x=>x.toLocaleLowerCase('en'))).size!==keywords.length)add('keywords.duplicate');
 const authors=article.authors;
 if(!Array.isArray(authors)||authors.length<1||authors.length>100)add('authors.invalid');
 else for(const author of authors){
  if(!author||typeof author!=='object'||!cleanString(author.name)||author.name.length<3)add('author.public_name_invalid');
  if(!Array.isArray(author?.affiliations)||author.affiliations.length<1||author.affiliations.some(x=>!x||!cleanString(x.name)))add('author.affiliation_required');
  else for(const affiliation of author.affiliations)if(affiliation.ror!==undefined&&affiliation.ror!==null&&!isValidRor(affiliation.ror))add('author.ror_invalid');
  if(author?.orcid!==undefined&&author.orcid!==null&&!isValidOrcid(author.orcid))add('author.orcid_checksum_invalid');
 }
 const refs=article.references;
 if(!Array.isArray(refs)||refs.length>750||((!['perspective'].includes(article.type))&&refs.length<1)||refs.some(x=>!x||!cleanString(x.citation)||x.citation.length<8))add('references.invalid');
 else for(const ref of refs)if(ref.doi!==undefined&&ref.doi!==null&&!validDoi(ref.doi))add('references.doi_invalid');
 for(const key of policy?.ethicalMinimum||[]){
  if(!cleanString(article.declarations?.[key])||article.declarations[key].length<10)add('declarations.'+key);
 }
 const rights=article.rights;
 if(rights?.license!=='CC-BY-4.0'||rights?.authorAgreementConfirmed!==true||rights?.fullTextOpenAccess!==true)add('rights.open_access_author_agreement_required');
 const history=article.history||{};
 if(!validDate(history.submittedAt))add('history.submitted_at_invalid');
 if(phase==='production'){
  if(!validDate(history.acceptedAt))add('history.acceptance_not_recorded');
  if(validDate(history.submittedAt)&&validDate(history.acceptedAt)&&Date.parse(history.acceptedAt)<Date.parse(history.submittedAt))add('history.acceptance_precedes_submission');
  if(article.review?.decision!=='accept'||article.review?.independentReviewersConfirmed!==true||article.review?.conflictScreeningConfirmed!==true||article.review?.nativeEditorialAuditReferenceVerified!==true)add('review.native_evidence_not_verified');
  if(!onlyHttps(article.publication?.landingUrl)||!onlyHttps(article.publication?.fullTextUrl))add('publication.public_urls_required');
  if(article.production?.proofApproved!==true||article.production?.metadataApproved!==true||article.production?.publisherRightsApproved!==true)add('production.proof_metadata_rights_signoff');
 }
 // A DOI in editorial metadata is not proof of successful Crossref registration.
 if(article.doi!==undefined&&article.doi!==null){
  if(!validDoi(article.doi.value))add('doi.invalid');
  if(article.doi.publiclyClaimed===true)add('doi.public_claim_requires_offline_authority_verification');
  if(article.doi.depositStatus==='registered')warn('doi.registration_unverified_by_offline_audit');
 }
 if(article.issn!==undefined||article.indexes!==undefined||article.quartile!==undefined)add('indexing.journal_level_claims_not_article_metadata');
 return {
  schema:'jhela-article-metadata-preflight-v1',
  phase,pass:errors.length===0,
  errors:[...new Set(errors)].sort(),warnings:[...new Set(warnings)].sort(),
  publicationAuthorised:false,registryCertified:false,
  limitation:'Source metadata quality does not certify native editorial platform editorial decisions, DOI registration, issue release or publisher approval.'
 };
}
if(process.argv[1]?.endsWith('jhela-article-metadata-audit.mjs')){
 const usage=()=>{console.error('Usage: node scripts/jhela-article-metadata-audit.mjs --synthetic-contract');process.exitCode=2;};
 if(process.argv.length!==3||process.argv[2]!=='--synthetic-contract')usage();
 else{
  const policy=JSON.parse(fs.readFileSync('platform/jhela-article-metadata-quality-policy-v1.json','utf8'));
  const result=validateJhelaArticle({},policy,{phase:'editorial'});
  console.log(JSON.stringify({schema:result.schema,contractValid:policy.schema==='jhela-article-metadata-quality-policy-v1',syntheticInvalidArticleRejected:!result.pass,publicationAuthorised:false},null,2));
  if(result.pass||policy.schema!=='jhela-article-metadata-quality-policy-v1')process.exitCode=1;
 }
}
