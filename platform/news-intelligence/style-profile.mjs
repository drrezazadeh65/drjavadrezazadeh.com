/**
 * Authorial corpus measurement from actual owner-approved source text.
 * Never synthesize a fictitious style record or embed copyrighted fulltext
 * in the public Git repo. Output holds hashes and aggregate indicators only.
 */
import {assert,isHash,isId,plain,safeText,sha256} from './contracts.mjs';
const CONNECTIVES=Object.freeze({
 fa:['ازاین‌رو','از این رو','بنابراین','با این حال','به عبارت دیگر',
   'در نتیجه','از سوی دیگر','به بیان دیگر','در حقیقت','در این میان'],
 en:['however','therefore','nevertheless','accordingly','moreover',
   'in other words','consequently','on the other hand','in this regard']
});
const normalize=s=>s.normalize('NFKC').toLocaleLowerCase()
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim();
export function analyzeApprovedAuthorCorpus({documents,language,
  analystReference}={}){
  assert(['fa','en'].includes(language)&&isId(analystReference)&&
    Array.isArray(documents)&&documents.length>=1&&documents.length<=12,
    'NEWS_AUTHOR_CORPUS_INVALID');
  let totalChars=0,totalWords=0,totalParagraphs=0,totalSentences=0;
  const paragraphSizes=[],sentenceSizes=[],sourceRefs=[];
  const counts=Object.fromEntries(CONNECTIVES[language].map(s=>[s,0]));
  for(const d of documents){
    assert(plain(d)&&d.language===language&&
      safeText(d.sourceReference,5,300)&&
      typeof d.text==='string'&&d.text.length>=300&&d.text.length<=200000&&
      isHash(d.contentSha256)&&sha256(d.text)===d.contentSha256&&
      d.ownerApproved===true&&d.rightsReviewed===true&&
      d.isActualAuthorWork===true,'NEWS_AUTHOR_STYLE_SOURCE_UNVERIFIED');
    totalChars+=d.text.length;
    const paragraphs=d.text.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
    const sentences=d.text.split(/[.!?؟]+(?:\s|$)/u).map(x=>x.trim()).filter(Boolean);
    totalParagraphs+=paragraphs.length;totalSentences+=sentences.length;
    paragraphSizes.push(...paragraphs.map(x=>x.length));
    sentenceSizes.push(...sentences.map(x=>x.length));
    totalWords+=d.text.split(/\s+/).filter(Boolean).length;
    const lower=normalize(d.text);
    for(const phrase of CONNECTIVES[language]){
      const marker=normalize(phrase);
      counts[phrase]+=lower.split(marker).length-1;
    }
    sourceRefs.push({source:d.sourceReference,sha256:d.contentSha256});
  }
  assert(totalChars<=1200000&&totalParagraphs<=30000,
    'NEWS_AUTHOR_CORPUS_EXCEEDS_POLICY');
  const round=x=>Math.round(x*100)/100;
  return Object.freeze({schema:'jr.jrei.author-style-measurement.v1',
    language,analystReference,
    measuredCorpusSources:sourceRefs,
    analyzedDocuments:documents.length,totalChars,totalWords,
    paragraphCount:totalParagraphs,sentenceCount:totalSentences,
    averageParagraphCharacters:round(
      paragraphSizes.reduce((a,b)=>a+b,0)/Math.max(1,paragraphSizes.length)),
    averageSentenceCharacters:round(
      sentenceSizes.reduce((a,b)=>a+b,0)/Math.max(1,sentenceSizes.length)),
    connectiveCounts:counts,
    measuredButNotProofOfAuthorship:true,
    rawAuthorTextsRetainedInThisOutput:false,
    manuscriptPublicationAuthorization:false});
}
