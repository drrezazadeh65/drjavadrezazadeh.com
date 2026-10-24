/** Context envelope for the existing JREI assistant, never a second chatbot. */
import {assert,isHash,plain,publicHttps,safeText,sha256} from './contracts.mjs';
export function newsAssistantContext({article,verifiedEvidence,
  userQuestion,profile=null,consent=null}={}){
  assert(plain(article)&&article.publicationState==='PUBLISHED'&&
    article.ownerApproved===true&&isHash(article.evidenceSha256)&&
    safeText(userQuestion,2,2000)&&Array.isArray(verifiedEvidence)&&
    verifiedEvidence.length>=1&&verifiedEvidence.length<=20,
    'NEWS_ASSISTANT_CONTEXT_INVALID');
  for(const item of verifiedEvidence){
    assert(plain(item)&&isHash(item.contentSha256)&&
      safeText(item.excerpt,20,6000)&&
      item.reviewStatus==='APPROVED'&&
      item.publicationPermission==='ALLOWED'&&
      item.superseded===false&&item.revoked===false,
      'NEWS_ASSISTANT_EVIDENCE_NOT_APPROVED');
    publicHttps(item.sourceUrl);
  }
  if(profile!==null){
    assert(plain(consent)&&consent.purpose==='PERSONAL_EDUCATION_CONTEXT'&&
      consent.granted===true&&consent.withdrawn!==true&&
      plain(profile)&&profile.dataMinimized===true,
      'NEWS_ASSISTANT_PERSONALIZATION_NOT_CONSENTED');
  }
  const context={schema:'jr.jrei.news-assistant-context.v1',
    purpose:'NEWS_EDUCATIONAL_EXPLANATION',articleId:article.id,
    articleUrl:publicHttps(article.publicUrl),
    sourceUrl:publicHttps(article.sourceUrl),
    evidenceSha256:article.evidenceSha256,
    articleHeadline:article.headline,
    question:userQuestion,
    evidence:verifiedEvidence.map(e=>({
      sourceUrl:e.sourceUrl,excerpt:e.excerpt,contentSha256:e.contentSha256})),
    profile:profile===null?null:{...profile},
    requiresCitations:true,discloseUncertainty:true,
    noUnverifiedExamDates:true,noGuaranteedAdmissionsAdvice:true,
    routeTo:'EXISTING_JREI_ASSISTANT_ONLY',noDirectModelCall:true};
  return Object.freeze({...context,contextDigest:sha256(JSON.stringify(context))});
}
export function suggestedNewsQuestions({language='fa',hasExamDate=false}={}){
  assert(['fa','en'].includes(language),'NEWS_QUESTION_LANGUAGE_INVALID');
  const fa=['این خبر شامل حال من می‌شود؟','بعد از این خبر چه‌کار کنم؟',
    'منبع رسمی این خبر کجاست؟','چگونه برای این آزمون آماده شوم؟'];
  const en=['Does this announcement apply to me?','What should I do next?',
    'Where is the official source?','How can I prepare for this examination?'];
  if(hasExamDate){fa.push('چطور برای این تاریخ هشدار تنظیم کنم؟');
    en.push('How can I set a reminder for this date?');}
  return Object.freeze(language==='fa'?fa:en);
}
