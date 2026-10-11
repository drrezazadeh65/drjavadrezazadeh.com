/**
 * AWOSE non-publishing media planner: prepares a verifiable rendering brief.
 * No fake image/video output is claimed; use a genuine renderer before dispatch.
 */
export const LAYOUTS=Object.freeze({
  square:{width:1080,height:1080,ratio:'1:1',purpose:'social photo'},
  portrait:{width:1080,height:1350,ratio:'4:5',purpose:'feed portrait/carousel'},
  landscape:{width:1200,height:675,ratio:'16:9',purpose:'linked post and editorial preview'},
  story:{width:1080,height:1920,ratio:'9:16',purpose:'Story/Reel/Short'},
  videoWide:{width:1920,height:1080,ratio:'16:9',purpose:'video landscape'}
});
const channelLayouts=Object.freeze({
  telegram:['landscape','square'],
  eitaa:['landscape','square'],
  instagram:['portrait','square','story'],
  facebook:['landscape','portrait','story'],
  x:['landscape','square'],
  whatsapp:[], // Business messaging is not equivalent to public Status posting.
  aparat:['videoWide','story'],
  linkedin:['landscape','portrait'],
  threads:['portrait','square'],
  youtube:['videoWide','story']
});
export function mediaBrief(item,channels=[]){
 if(!item || typeof item.title!=='string' || !item.url)throw Error('A verified article is required');
 const requested=new Set(channels.flatMap(ch=>channelLayouts[ch]||[]));
 return {
   original:item.url,title:item.title,verifiedSourceRequired:true,
   rightsStatus:'unverified',publicReleaseStatus:'requires_review',
   derivatives:[...requested].map(role=>({role,...LAYOUTS[role],output:null,
     alt:item.title,processing:'not_started',needsActualFile:true})),
   networkRequirements:channels.map(channel=>({channel,
     templates:channelLayouts[channel]||[],
     providerLimits:'must_be_verified_at_connect_time',
     deliveryAllowed:false}))
 };
}
const take=(s,n)=>Array.from(String(s||'').trim()).slice(0,n).join('');
export function storyStoryboard(item){
 if(!item?.title || !item?.url)throw Error('Approved public source is required');
 const lead=take(item.description||'',175);
 return {type:'story',layout:LAYOUTS.story,publishingEnabled:false,
   frames:[
     {sequence:1,heading:take(item.title,90),body:'پرسشی برای اندیشیدن',visual:'original_approved_asset_required'},
     {sequence:2,heading:'نگاهی علمی و زمینه‌مند',body:lead||'متن این بخش نیازمند بازبینی محتوای مقاله است.',visual:'original_approved_asset_required'},
     {sequence:3,heading:'مطالعه متن کامل',body:'ادامه این بحث در وب‌سایت منتشر شده است.',target:item.url,visual:'original_approved_asset_required'}
   ],notices:['Verify factual accuracy and rights','Platform-specific link sticker may be unsupported','Human approval required before publication']};
}
