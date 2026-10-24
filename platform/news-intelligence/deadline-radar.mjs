/**
 * Upcoming exams and opportunities ranked by independently reviewed dates.
 * No date guessing, no alerts for withdrawn or unapproved milestones.
 */
import {assert,plain,utcInstant} from './contracts.mjs';
export function upcomingOfficialDeadlines({events,nowUtc,horizonDays=30,
  country=null,examIds=null,maxResults=30}={}){
  assert(Array.isArray(events)&&events.length<=10000&&utcInstant(nowUtc)&&
    Number.isInteger(horizonDays)&&horizonDays>=1&&horizonDays<=365&&
    (country===null||/^[A-Z]{2}$/.test(country))&&
    (examIds===null||(Array.isArray(examIds)&&examIds.length<=100))&&
    Number.isInteger(maxResults)&&maxResults>=1&&maxResults<=100,
    'NEWS_DEADLINE_RADAR_INVALID');
  const now=Date.parse(nowUtc),end=now+horizonDays*86400000;
  const seen=new Set(),choices=[];
  for(const event of events){
    if(!plain(event)||event.schema!=='jr.jrei.exam-event.v1'||
      event.status!=='OFFICIAL_DATE_REVIEWED'||
      event.ownerPublicationApproved!==true||
      !utcInstant(event.startsAt))continue;
    if(country!==null&&event.country!==country)continue;
    if(examIds!==null&&!examIds.includes(event.examId))continue;
    const t=Date.parse(event.startsAt);
    if(t<now||t>end)continue;
    const key=event.eventId+':'+event.version;
    if(seen.has(key))continue;
    seen.add(key);
    choices.push({eventId:event.eventId,examId:event.examId,
      type:event.milestone,startsAt:event.startsAt,
      titleFa:event.titleFa,titleEn:event.titleEn,
      sourceUrl:event.sourceUrl,version:event.version,
      daysRemaining:Math.ceil((t-now)/86400000)});
  }
  choices.sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||
    a.eventId.localeCompare(b.eventId));
  return Object.freeze({schema:'jr.jrei.news-deadline-radar.v1',
    generatedAt:nowUtc,horizonDays,
    totalWithinHorizon:choices.length,events:choices.slice(0,maxResults),
    verifiedOfficialDatesOnly:true,noPredictedDeadlines:true});
}
