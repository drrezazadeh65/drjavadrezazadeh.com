/**
 * JREI four-track official Konkur public link discovery.
 * No question text/PDF downloads. All output is unreviewed URL metadata.
 * Reuses the vetted DNS-pinned HTTP and robots parser, never bypasses access.
 */
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as pause} from 'node:timers/promises';
import {pinnedPublicAddress,getPinned,robotsPermission} from '../platform/jrei-v5/jrei-authorized-https-acquisition.mjs';
export const EXAM_TRACKS=Object.freeze({
 HUMANITIES:['علوم انسانی','انسانی','humanities'],
 MATHEMATICS:['علوم ریاضی','ریاضی','ریاضی و فنی','mathematics'],
 FOREIGN_LANGUAGES:['زبان‌های خارجی','زبان های خارجی','زبان تخصصی','foreign languages','languages'],
 EXPERIMENTAL_SCIENCES:['علوم تجربی','تجربی','زیست شناسی','experimental sciences']
});
export const OFFICIAL_SEEDS=Object.freeze([
 {issuer:'SANJESH',year:'1405',url:'https://www.sanjesh.org/fa-IR/sanjesh/4936/news/view/14591/13759/Staging'}
]);
const allowedHost='www.sanjesh.org';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function classifyExamLink(text,url){
 const input=(text+' '+url).toLowerCase();
 return Object.entries(EXAM_TRACKS)
  .filter(([,keywords])=>keywords.some(k=>input.includes(k.toLowerCase())))
  .map(([track])=>track);
}
function clean(s){return s.replace(/<[^>]*>/g,' ').replace(/&(?:amp|quot|nbsp|lt|gt|#39);/g,' ').replace(/\s+/g,' ').trim().slice(0,180);}
export function extractExamCandidates(html,seedUrl){
 if(typeof html!=='string'||html.length>2097152)throw Error('JREI_SCOUT_HTML_INVALID');
 const result=new Map(),links=html.matchAll(/<a\b[^>]{0,500}\bhref=(?:"([^"]{1,800})"|'([^']{1,800})')[^>]{0,500}>([\s\S]*?)<\/a>/gi);
 let scanned=0;
 for(const match of links){
  if(scanned++>=3000)break;
  const title=clean(match[3]);let u;
  try{u=new URL(match[1]||match[2],seedUrl);}catch{continue;}
  if(u.protocol!=='https:'||u.hostname!==allowedHost||
     u.username||u.password||u.port||u.hash||
     u.pathname.includes('..'))continue;
  const types=classifyExamLink(title,u.pathname);
  if(!types.length)continue;
  const cleanUrl=u.origin+u.pathname+u.search;
  // URLs may contain unpredictable query identifiers; emit only hashes
  // unless it is a known official same-origin route with no query.
  const locator= u.search?'REVIEW_QUERY_URL_WITHHELD':cleanUrl;
  result.set(hash(cleanUrl),{
   locatorSha256:hash(cleanUrl),issuer:'SANJESH',year:'1405',
   locator:locator==='REVIEW_QUERY_URL_WITHHELD'?null:locator,
   observedTitle:title,tracks:types,
   downloadAuthorized:false,commercialReuseAuthorized:false,
   itemScientificReviewAccepted:false,sourceRightsUnverified:true
  });
  if(result.size>=400)break;
 }
 return [...result.values()].sort((a,b)=>a.locatorSha256.localeCompare(b.locatorSha256));
}
async function scout(seed){
 const u=new URL(seed.url);
 if(u.protocol!=='https:'||u.hostname!==allowedHost||u.username||u.password||u.port||u.search)
  throw Error('JREI_SCOUT_SEED_NOT_ALLOWLISTED');
 const ip=await pinnedPublicAddress(allowedHost);
 const robots=await getPinned('https://'+allowedHost+'/robots.txt',ip,131072);
 if(robots.mime!=='text/plain')throw Error('JREI_SCOUT_ROBOTS_NOT_TEXT');
 const policy=robotsPermission(robots.bytes,u.pathname);
 if(!policy.allowed)throw Error('JREI_SCOUT_ROBOTS_DISALLOWED');
 await pause(Math.max(12000,policy.delay*1000));
 const page=await getPinned(seed.url,ip,2097152);
 if(page.mime!=='text/html')throw Error('JREI_SCOUT_NOT_HTML');
 return extractExamCandidates(page.bytes.toString('utf8'),seed.url);
}
async function main(){
 const source=OFFICIAL_SEEDS[0],all=[],errors=[];
 try{all.push(...await scout(source));}
 catch(e){errors.push(String(e?.message??'SCOUT_UNKNOWN').replace(/[^A-Z0-9_]/gi,'').slice(0,90));}
 const byTrack=Object.fromEntries(Object.keys(EXAM_TRACKS).map(k=>[k,all.filter(c=>c.tracks.includes(k)).length]));
 const record={schema:'jr.jrei.konkur-four-track-scouter.v1',
  runAtUtc:new Date().toISOString(),officialSourceOnly:true,
  source:{issuer:source.issuer,year:source.year,url:source.url},
  targets:Object.keys(EXAM_TRACKS),discoveredCandidateCounts:byTrack,
  errors,sourcePageRetrieved:errors.length===0,candidates:all,
  noQuestionPdfDownloaded:true,noRightsClaim:true,
  noCommercialItemAuthorization:true,noExamSalesEnabled:true,
  noStudentData:true,noBypassedAccessControls:true,
  nextStep:'INDEPENDENT_REVIEW_AND_AUTHORIZED_PRIVATE_QUESTION_ACQUISITION'};
 const dir=join(process.env.RUNNER_TEMP||'/tmp','jrei-exam-scouter');
 await mkdir(dir,{recursive:true,mode:0o700});
 await writeFile(join(dir,'four-track-official-source-candidates.json'),JSON.stringify(record,null,2)+'\n',{mode:0o600,flag:'w'});
 process.stdout.write('[JREI] FOUR_TRACK_SCOUT_STATE='+ (errors.length?'SOURCE_ACCESS_UNVERIFIED':'OFFICIAL_LINKS_DISCOVERED')+'\n');
 for(const [k,v] of Object.entries(byTrack))process.stdout.write('[JREI] '+k+'='+v+'\n');
 if(errors.length)process.stdout.write('[JREI] SOURCE_FETCH_BLOCKED='+errors.join(',')+'\n');
 process.stdout.write('[JREI] NO_QUESTION_DOWNLOAD_OR_COMMERCIAL_REUSE_APPROVED\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 main().catch(e=>{process.stderr.write('[JREI] SCOUT_FAILED\n');process.exitCode=1;});
