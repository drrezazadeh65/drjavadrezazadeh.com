/** Personalised actions derived ONLY from already-reviewed public facts. */
import {assert,plain,safeText,utcInstant} from './contracts.mjs';
export function newsNextSteps({article,language,officialLinks=[],
  relatedServices=[],examMilestones=[]}={}){
  assert(plain(article)&&article.publicationState==='PUBLISHED'&&
    article.ownerApproved===true&&['fa','en'].includes(language)&&
    Array.isArray(officialLinks)&&officialLinks.length<=10&&
    Array.isArray(relatedServices)&&relatedServices.length<=10&&
    Array.isArray(examMilestones)&&examMilestones.length<=15,
    'NEWS_NEXT_STEPS_UNVERIFIED');
  for(const link of officialLinks){
    assert(plain(link)&&link.reviewed===true&&
      safeText(link.label,4,120)&&typeof link.url==='string'&&
      link.url.startsWith('https://'),'NEWS_OFFICIAL_ACTION_NOT_REVIEWED');
  }
  const actions=[];
  for(const event of examMilestones){
    assert(event&&event.schema==='jr.jrei.exam-event.v1'&&
      event.status==='OFFICIAL_DATE_REVIEWED',
      'NEWS_EXAM_ACTION_UNVERIFIED');
    actions.push({type:'SET_EXAM_REMINDER',eventId:event.eventId,
      deadlineUtc:event.startsAt,requiresOptIn:true});
  }
  for(const link of officialLinks)actions.push({type:'OFFICIAL_LINK',
    label:link.label,url:link.url,sourceReviewed:true});
  for(const service of relatedServices){
    assert(plain(service)&&service.verifiedPublicRoute===true&&
      typeof service.path==='string'&&
      /^\/(?:fa|en)\//.test(service.path)&&
      safeText(service.label,4,120),'NEWS_SERVICE_LINK_INVALID');
    actions.push({type:'RELATED_EDUCATIONAL_SERVICE',
      path:service.path,label:service.label,paid:service.paid===true,
      notGuaranteedRelevantToEveryUser:true});
  }
  return Object.freeze({schema:'jr.jrei.news-reader-actions.v1',
    language,actions,firstPartyAIContextRequired:true,
    noAutomaticCommerceConsent:true});
}
