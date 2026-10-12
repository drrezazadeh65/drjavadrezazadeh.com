/**
 * Deterministic, source-faithful per-account editorial planning.
 * No generative model is called and no unsupported claims are introduced.
 * AI rewrite can later be added behind a human verification gate.
 */
import {createHash} from 'node:crypto';
import {CONNECTORS,validateHandle} from './connections.mjs';
const ORIGIN='https://drjavadrezazadeh.com';
const TOPICS=[
 {fa:/استعداد|توانمند|طلایی|golden talent/i,en:/talent|golden path/i,faTag:'استعدادیابی',enTag:'TalentDevelopment'},
 {fa:/آموزش|یادگیر|معلم|مدرسه|teacher|learning/i,en:/education|school|teacher|learning/i,faTag:'آموزش',enTag:'Education'},
 {fa:/سنجش|آزمون|ارزیاب|روایی|پایایی|assessment|testing/i,en:/assessment|testing|validity/i,faTag:'سنجش_آموزشی',enTag:'Assessment'},
 {fa:/پژوهش|مقاله|دانشگاه|scientific|research/i,en:/research|scientific|journal/i,faTag:'پژوهش',enTag:'Research'},
 {fa:/مشاور|رشته|کنکور|guidance|counseling/i,en:/guidance|advising|counseling/i,faTag:'مشاوره_تحصیلی',enTag:'AcademicGuidance'},
 {fa:/کتاب|نشر|نویسند|book|publisher/i,en:/book|publishing|literature/i,faTag:'کتاب',enTag:'Books'},
 {fa:/زبان|انگلیسی|linguistic|language/i,en:/language|linguistics/i,faTag:'آموزش_زبان',enTag:'LanguageEducation'},
 {fa:/هوش مصنوعی|artificial intelligence|\bAI\b/i,en:/artificial intelligence|\bAI\b/i,faTag:'هوش_مصنوعی',enTag:'AIinEducation'}
];
const clean=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const cut=(s,n)=>{
 const c=Array.from(s);
 return c.length>n?c.slice(0,Math.max(0,n-1)).join('').trimEnd()+'…':s;
};
const publicCanonical=uri=>{
 const u=new URL(uri);
 if(u.origin!==ORIGIN||!/^\/(?:fa|en)\/[^?#]+/.test(u.pathname)||u.username||u.password||u.search||u.hash
  ||/^\/(?:fa|en)\/(?:app|account|customer-dashboard|login|signup|register|checkout|payment-result)(?:\/|$)/i.test(u.pathname))
  throw Error('Only canonical released site content is eligible');
 return u.origin+u.pathname;
};
function hashtags(article,provider,max){
 const isEnglish=new URL(article.url).pathname.startsWith('/en/');
 const signal=clean(article.title+' '+article.description);
 const list=TOPICS.filter(t=>(isEnglish?t.en:t.fa).test(signal))
 .map(t=>'#'+(isEnglish?t.enTag:t.faTag));
 const specific=[...new Set(list)].slice(0,Math.max(0,max));
 if(specific.length===0&&max>0)specific.push(isEnglish?'#Education':'#آموزش');
 return specific;
}
export function planPost(article,channel,{campaign='website',accountId='preview',approvedMedia=[]}={}){
 const policy=CONNECTORS[channel];
 if(!policy)throw Error('Unsupported social network');
 if(!article||!clean(article.title))throw Error('An approved source title is required');
 const canonical=publicCanonical(article.url);
 const locale=canonical.includes('/en/')?'en':'fa';
 const data=clean(article.description);
 const c=String(campaign).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,40)||'website';
 const url=new URL(canonical);
 url.searchParams.set('utm_source',channel);
 url.searchParams.set('utm_medium','social');
 url.searchParams.set('utm_campaign',c);
 const track=url.toString();
 const tags=hashtags(article,channel,policy.tags);
 const isVideoOnly=['aparat','youtube','tiktok'].includes(channel);
 const requiresVerifiedTemplate=channel==='whatsapp';
 const needsMedia=isVideoOnly||channel==='instagram'||channel==='pinterest';
 const hasMedia=approvedMedia.some(x=>x?.rightsVerified===true && x?.public===true
   && (isVideoOnly?x.type==='video':['photo','video'].includes(x.type)));
 const guidance=locale==='en'
  ? 'Read the full article on the website:'
  : 'متن کامل این مطلب را در وب‌سایت مطالعه کنید:';
 let intro=clean(article.title);
 if(channel!=='x' && channel!=='bluesky' && channel!=='threads')intro+=data?'\n\n'+data:'';
 let suffix='\n\n'+guidance+'\n'+track;
 if(tags.length && !requiresVerifiedTemplate)suffix+='\n\n'+tags.join(' ');
 const target=policy.editorialTarget;
 let body=target?cut(intro,Math.max(15,target-Array.from(suffix).length))+suffix:intro+suffix;
 if(channel==='instagram'){
  body+='\n'+(locale==='en'?'Note: caption links are generally not clickable; use your bio/story link.':
    'توجه: لینک متن پست معمولاً قابل کلیک نیست؛ لینک معرفی صفحه یا استوری را هم تنظیم کنید.');
 }
 const warnings=[];
 if(channel==='instagram')warnings.push('Caption links usually are not clickable; separately set bio/eligible Story sticker');
 if(needsMedia&&!hasMedia)warnings.push('Approved genuine image/video with publishing rights required');
 if(requiresVerifiedTemplate)warnings.push('WhatsApp Business requires opt-in and provider-approved message template; not a public broadcast feed');
 if(channel==='aparat')warnings.push('Official upload authorization and video processing verification outstanding');
 if(['x','facebook','linkedin'].includes(channel))warnings.push('Provider account permissions, quotas and cost may apply');
 if(channel==='eitaa')warnings.push('Destination must grant authorized EitaaYar publishing permission');
 const key=createHash('sha256').update(JSON.stringify([canonical,channel,accountId,c])).digest('hex');
 return {network:channel,accountId,source:canonical,trackingUrl:track,locale,
   title:article.title,body,hashtags:requiresVerifiedTemplate?[]:tags,
   characterCount:Array.from(body).length,editorialTarget:target,
   requiredMedia:needsMedia?'approved_media':null,
   warnings,format:isVideoOnly?'video':channel==='instagram'?'photo_or_reel':'text_or_link',
   readyForApproval:(!needsMedia||hasMedia)&&!requiresVerifiedTemplate&&channel!=='aparat',
   published:false,status:'draft',idempotencyKey:key};
}
export function planCampaign(article,accounts,opts={}){
 if(!Array.isArray(accounts)||accounts.length>100)throw Error('Invalid account selection');
 const unique=new Set();
 return accounts.map(a=>{
  if(!a||typeof a!=='object'||!CONNECTORS[a.network])throw Error('Unknown account');
  const identifier=validateHandle(a.network,a.handle);
  const key=a.network+':'+identifier;
  if(unique.has(key))throw Error('Duplicate account in campaign');
  unique.add(key);
  const post=planPost(article,a.network,{...opts,accountId:key});
  // Display "connected" only if trusted server confirmed, never from client input.
  return {...post,accountHandle:identifier,providerConnectionRequired:true};
 });
}
