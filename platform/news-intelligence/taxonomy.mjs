/** Bilingual editorial taxonomy; categories are stable IDs, not URL promises. */
import {assert,safeText} from './contracts.mjs';
export const NEWS_CATEGORIES=Object.freeze([
  {id:'school',fa:'آموزش‌وپرورش',en:'School Education',children:['primary','lower-secondary','upper-secondary','final-exams','gifted-schools','teacher-development']},
  {id:'examinations',fa:'کنکور و آزمون‌ها',en:'Entrance Examinations',children:['konkur','masters','doctoral','exam-results','registration','admit-cards','appeals']},
  {id:'universities',fa:'دانشگاه‌ها',en:'Universities',children:['azad','payam-noor','applied-science','public-universities','medical','international']},
  {id:'employment',fa:'آزمون‌های استخدامی',en:'Employment Examinations',children:['teacher-recruitment','civil-service','professional-qualifications']},
  {id:'language',fa:'آموزش زبان',en:'Language Education',children:['ielts','toefl','pte','iran-language-tests','language-assessment','teacher-education']},
  {id:'international',fa:'فرصت‌های بین‌المللی',en:'International Opportunities',children:['scholarships','admissions','postdoctoral','exchanges','conferences']},
  {id:'research',fa:'پژوهش و فناوری آموزشی',en:'Research and EdTech',children:['educational-research','journals','artificial-intelligence','assessment','talent-development']}
].map(c=>Object.freeze({...c,children:Object.freeze(c.children)})));
export function categoryById(id){return NEWS_CATEGORIES.find(c=>c.id===id)??null;}
export function normalizeNewsTags({category,subtopic,country='IR',level='all',institution=null,tags=[]}={}){
  const c=categoryById(category);
  assert(c&&c.children.includes(subtopic),'NEWS_TAXONOMY_INVALID');
  assert(/^[A-Z]{2}$/.test(country)&&safeText(level,2,60)&&
    (institution===null||safeText(institution,3,120))&&
    Array.isArray(tags)&&tags.length<=12&&tags.every(t=>/^[a-z0-9-]{2,48}$/.test(t)),
    'NEWS_TAGS_INVALID');
  return Object.freeze({category,subtopic,country,level,institution,tags:[...new Set(tags)]});
}
export const CHANNEL_TOPICS=Object.freeze(['ARTICLES','SCHOOL','EXAMINATIONS','RESULTS',
  'UNIVERSITIES','EMPLOYMENT','LANGUAGE','SCHOLARSHIPS','INTERNATIONAL',
  'RESEARCH','EDTECH','TALENT','TEACHER_EDUCATION','EVENTS']);
