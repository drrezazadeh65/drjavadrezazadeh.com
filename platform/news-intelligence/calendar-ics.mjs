/** Calendar rendering helper, never treats proposed dates as official. */
import {assert,plain,utcInstant} from './contracts.mjs';
const escapeText=s=>String(s).replace(/\\/g,'\\\\')
  .replace(/;/g,'\\;').replace(/,/g,'\\,')
  .replace(/\r\n|\r|\n/g,'\\n');
const compact=s=>s.replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function approvedExamIcs({event,generatedAt,locale='fa'}={}){
  assert(plain(event)&&event.schema==='jr.jrei.exam-event.v1'&&
    event.status==='OFFICIAL_DATE_REVIEWED'&&
    utcInstant(event.startsAt)&&utcInstant(generatedAt)&&
    ['fa','en'].includes(locale),'NEWS_ICS_INVALID_EVENT');
  const title=locale==='fa'?event.titleFa:event.titleEn;
  const lines=['BEGIN:VCALENDAR','VERSION:2.0',
    'PRODID:-//JREI//Exam Calendar//EN','CALSCALE:GREGORIAN',
    'BEGIN:VEVENT','UID:'+escapeText(event.eventId+'@drjavadrezazadeh.com'),
    'DTSTAMP:'+compact(generatedAt),'DTSTART:'+compact(event.startsAt),
    'SUMMARY:'+escapeText(title),'URL:'+event.sourceUrl,
    'DESCRIPTION:'+escapeText('Official source: '+event.sourceUrl),
    'SEQUENCE:'+event.version,'END:VEVENT','END:VCALENDAR'];
  // RFC5545 line-folding is delegated to a UTF8-aware serializer at delivery.
  return Object.freeze({mime:'text/calendar; charset=utf-8',
    calendarText:lines.join('\r\n')+'\r\n',
    deliveryRequiresUtf8ByteFolding:true,
    officialSourceRecorded:true});
}
