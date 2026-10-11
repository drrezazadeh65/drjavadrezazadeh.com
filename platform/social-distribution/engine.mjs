/**
 * AWOSE Social Distribution Engine — provider-safe first implementation.
 * Node >= 20. No credentials or client-side access. Publish disabled by default.
 * Run behind an authenticated backend on a persistent filesystem.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

export const ORIGIN = 'https://drjavadrezazadeh.com';
export const FEED = ORIGIN + '/feed.xml';
export const ZONE = 'Asia/Tehran';
export const CHANNELS = Object.freeze({
  telegram: {label:'تلگرام', limit:4096, transport:'telegram', media:['text','photo']},
  eitaa: {label:'ایتا', limit:3000, transport:'eitaa', media:['text']},
  x: {label:'ایکس', limit:280, transport:null, media:['text','photo']},
  instagram: {label:'اینستاگرام', limit:2200, transport:null, media:['photo','carousel','reel','story']},
  facebook: {label:'فیس‌بوک', limit:5000, transport:null, media:['text','photo','video','story']},
  whatsapp: {label:'واتس‌اپ بیزینس', limit:null, transport:null, media:['approved_template_only']},
  aparat: {label:'آپارات', limit:null, transport:null, media:['video']},
  linkedin: {label:'لینکدین', limit:3000, transport:null, media:['text','photo']},
  threads: {label:'تردز', limit:500, transport:null, media:['text','photo']},
  youtube: {label:'یوتیوب', limit:null, transport:null, media:['video','short']},
});
const decode = value => String(value||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
  .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
  .replace(/<[^>]*>/g,'').trim();
const field = (body,name) => decode((body.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))||[])[1]);
const strip = s => String(s||'').replace(/\s+/g,' ').trim();
export function parseFeed(xml){
  const items=[...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
  return items.map(([,body])=>({
    title:field(body,'title'),url:field(body,'link'),
    description:field(body,'description'),published:field(body,'pubDate'),
    guid:field(body,'guid')
  })).filter(item=>item.title && isSafeUrl(item.url));
}
export function isSafeUrl(value){
  try{
    const u=new URL(value);
    return u.origin===ORIGIN && /^\/(?:fa|en)\/[^\s]*\/?$/.test(u.pathname)
      && !u.username && !u.password && !u.hash;
  }catch{return false;}
}
function canonical(url){const u=new URL(url);return u.origin+u.pathname;}
export function shorten(text, max){
  text=strip(text);
  if(!max || Array.from(text).length<=max)return text;
  return Array.from(text).slice(0,Math.max(0,max-1)).join('').trimEnd()+'…';
}
export function variant(item,channel,campaign='editorial'){
  const limit=CHANNELS[channel]?.limit;
  if(!CHANNELS[channel]) throw Error('Unknown channel');
  const u=new URL(canonical(item.url));
  u.searchParams.set('utm_source',channel);
  u.searchParams.set('utm_medium','social');
  u.searchParams.set('utm_campaign',campaign);
  const link=u.toString();
  const intro=channel==='x' ? item.title : item.title+'\n\n'+strip(item.description);
  const available=limit ? Math.max(25,limit-Array.from(link).length-3) : null;
  return {channel,title:item.title,url:item.url,trackingUrl:link,
    text:shorten(intro,available)+'\n\n'+link,media:null,
    mode:'text',status:'draft',humanReview:false};
}
export function iranClock(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{
    timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return {day:p.year+'-'+p.month+'-'+p.day,hour:+p.hour,minute:+p.minute};
}
export function isScheduledWindow(date=new Date(),hour=21){
  const t=iranClock(date);
  return t.hour===hour && t.minute>=0 && t.minute<10;
}
const configFromEnv = () => ({
  enabled:process.env.SOCIAL_ENGINE_ACTIVE==='1',
  approved:process.env.SOCIAL_PUBLISH_APPROVED==='1',
  hour:Number(process.env.SOCIAL_PUBLISH_HOUR||21),
  channels:(process.env.SOCIAL_CHANNELS||'').split(',').map(x=>x.trim()).filter(Boolean),
  statePath:process.env.SOCIAL_STATE_PATH||'',
  maxPostsPerDay:Number(process.env.SOCIAL_POSTS_PER_DAY||1),
  campaign:process.env.SOCIAL_CAMPAIGN||'editorial'
});
function hasProviderConfig(channel){
  if(channel==='telegram')return Boolean(process.env.SOCIAL_TELEGRAM_BOT_TOKEN && process.env.SOCIAL_TELEGRAM_CHAT_ID);
  if(channel==='eitaa')return Boolean(process.env.SOCIAL_EITAA_TOKEN && process.env.SOCIAL_EITAA_CHAT_ID);
  return false;
}
async function loadState(file){
  try{return JSON.parse(await fs.readFile(file,'utf8'));}
  catch(e){if(e.code==='ENOENT')return {version:1,sent:{},uncertain:{},days:{}};throw e;}
}
async function persist(file,state){
  const tmp=file+'.tmp-'+process.pid;
  await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});
  await fs.writeFile(tmp,JSON.stringify(state,null,2),{mode:0o600});
  await fs.rename(tmp,file);
}
async function apiPost(url,payload){
  const res=await fetch(url,{method:'POST',
    headers:{'content-type':'application/json'},body:JSON.stringify(payload),
    signal:AbortSignal.timeout(20000),redirect:'error'});
  const data=await res.json().catch(()=>({}));
  if(!res.ok || data.ok===false) throw Error('Provider returned '+res.status+' ('+String(data.error_code||'unknown')+')');
  return data;
}
async function dispatch(channel,post){
  if(channel==='telegram'){
    const token=process.env.SOCIAL_TELEGRAM_BOT_TOKEN;
    const chat_id=process.env.SOCIAL_TELEGRAM_CHAT_ID;
    if(!token || !chat_id)throw Error('Telegram is not connected');
    const data=await apiPost('https://api.telegram.org/bot'+encodeURIComponent(token)+'/sendMessage',
      {chat_id,text:post.text,disable_web_page_preview:false});
    if(!data.ok || !data.result?.message_id)throw Error('Telegram did not confirm publishing');
    return {providerId:String(data.result.message_id)};
  }
  if(channel==='eitaa'){
    const token=process.env.SOCIAL_EITAA_TOKEN;
    const chat_id=process.env.SOCIAL_EITAA_CHAT_ID;
    if(!token || !chat_id)throw Error('Eitaa is not connected');
    const data=await apiPost('https://eitaayar.ir/api/'+encodeURIComponent(token)+'/sendMessage',
      {chat_id,text:post.text});
    if(data.ok===false || data.error)throw Error('Eitaa provider rejected the post');
    return {providerId:String(data.result?.message_id||data.message_id||'confirmed')};
  }
  throw Error(channel+' adapter is awaiting an approved official API connection');
}
async function inspectArticle(url,fetcher=fetch){
  // Fail closed if the actual published page is unavailable, blocked or noncanonical.
  const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!response.ok || response.url && canonical(response.url)!==canonical(url))return false;
  const html=await response.text();
  const robots=html.match(/<meta\s+[^>]*name=["']robots["'][^>]*>/i)?.[0]||'';
  if(/\bnoindex\b/i.test(robots))return false;
  const tag=html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i)?.[0]||'';
  const href=tag.match(/href=["']([^"']+)/i)?.[1];
  return Boolean(href && canonical(href)===canonical(url));
}
export async function runCycle({dryRun=true,forcePreview=false,now=new Date(),
  feedXml=null,fetcher=fetch,config=null}={}){
  const cfg={...configFromEnv(),...(config||{})};
  const clock=iranClock(now);
  if(!forcePreview && !isScheduledWindow(now,cfg.hour))
    return {status:'outside_schedule',time:clock,preview:[]};
  if(!dryRun && (!cfg.enabled || !cfg.approved))
    return {status:'publishing_disabled',time:clock,preview:[]};
  const channels=cfg.channels.filter(x=>CHANNELS[x]);
  if(!channels.length)return {status:'no_channels_enabled',time:clock,preview:[]};
  cfg.maxPostsPerDay=Math.max(1,Math.min(6,Math.floor(cfg.maxPostsPerDay)||1));
  if(!dryRun && !channels.some(hasProviderConfig))
    return {status:'no_authorized_providers',time:clock,preview:[]};
  if(!dryRun && (!cfg.statePath || !path.isAbsolute(cfg.statePath)))
    throw Error('SOCIAL_STATE_PATH must be an absolute persistent private path');
  const xml=feedXml ?? await (async()=>{
    const r=await fetcher(FEED,{redirect:'error',signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw Error('Source RSS HTTP '+r.status);
    return r.text();
  })();
  const state=dryRun ? {sent:{},uncertain:{},days:{}} : await loadState(cfg.statePath);
  const items=parseFeed(xml);
  const selected=[];
  for(const item of items){
    if(selected.length>=cfg.maxPostsPerDay)break;
    if(!dryRun){
      // Continue past already-distributed items so the queue advances every day.
      // An unconnected channel must not hold every other channel hostage.
      const needed=channels.some(ch=>hasProviderConfig(ch) &&
        !state.sent[ch+'|'+canonical(item.url)] &&
        !state.uncertain[ch+'|'+canonical(item.url)]);
      if(!needed)continue;
      if(!(await inspectArticle(item.url,fetcher)))continue;
    }
    selected.push(item);
  }
  const posts=[],results=[];
  for(const item of selected){
    for(const channel of channels){
      const key=channel+'|'+canonical(item.url);
      const post=variant(item,channel,cfg.campaign);
      posts.push(post);
      if(dryRun)continue;
      if(state.sent[key]){results.push({channel,url:item.url,status:'already_published'});continue;}
      if(state.uncertain[key]){results.push({channel,url:item.url,status:'manual_review_required'});continue;}
      const dayKey=clock.day+'|'+channel;
      if((state.days[dayKey]||0)>=cfg.maxPostsPerDay){
        results.push({channel,url:item.url,status:'daily_limit'});continue;
      }
      if(!CHANNELS[channel].transport || !hasProviderConfig(channel)){
        results.push({channel,url:item.url,status:'provider_connection_required'});continue;
      }
      // Commit uncertain state BEFORE external IO to prevent duplicate cross-run posting.
      // In an ambiguous provider failure, never silently retry.
      state.uncertain[key]={at:new Date().toISOString(),reason:'attempt_in_flight'};
      await persist(cfg.statePath,state);
      try{
        const receipt=await dispatch(channel,post);
        state.sent[key]={at:new Date().toISOString(),...receipt};
        delete state.uncertain[key];
        state.days[dayKey]=(state.days[dayKey]||0)+1;
        await persist(cfg.statePath,state);
        results.push({channel,url:item.url,status:'published',...receipt});
      }catch(e){
        state.uncertain[key].reason=String(e.message||e).slice(0,160);
        await persist(cfg.statePath,state);
        results.push({channel,url:item.url,status:'manual_review_required',reason:state.uncertain[key].reason});
      }
    }
  }
  return {status:dryRun?'preview':'processed',time:clock,preview:posts,results};
}
export async function runCLI(args=process.argv.slice(2)){
  const preview=args.includes('--preview');
  const publish=args.includes('--publish');
  if(!preview && !publish)throw Error('Choose --preview or --publish (publishing additionally requires explicit activation)');
  if(publish && args.includes('--force'))throw Error('Force-publish is unsupported');
  const cfg=configFromEnv();
  if(publish && !cfg.statePath)throw Error('Configure a private persistent SOCIAL_STATE_PATH');
  if(publish && !cfg.enabled)throw Error('Engine disabled');
  // Filesystem lock protects against parallel cron invocations.
  let lock=null;
  if(publish){
    await fs.mkdir(path.dirname(cfg.statePath),{recursive:true,mode:0o700});
    const lockPath=cfg.statePath+'.lock';
    try{await fs.mkdir(lockPath,{recursive:false,mode:0o700});lock=lockPath;}
    catch(e){if(e.code==='EEXIST')throw Error('Another publisher invocation is running');throw e;}
  }
  try{
    const result=await runCycle({dryRun:!publish,forcePreview:preview});
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }finally{if(lock)await fs.rmdir(lock).catch(()=>{});}
}
if(process.argv[1] && import.meta.url===new URL('file://'+path.resolve(process.argv[1])).href){
  runCLI().catch(e=>{process.stderr.write('Social publisher: '+e.message+'\n');process.exitCode=1;});
}
