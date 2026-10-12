/**
 * Human-assisted fallback: generates a copyable package, never posts to a network.
 * A manually supplied URL is only an unverified reference until an independent
 * provider-side observation validates the actual publication.
 */
import {planPost} from './composer.mjs';

export const MANUAL_DESTINATIONS=Object.freeze({
 instagram:'https://www.instagram.com/',
 facebook:'https://www.facebook.com/',
 x:'https://x.com/',
 telegram:'https://web.telegram.org/',
 eitaa:'https://web.eitaa.com/',
 aparat:'https://www.aparat.com/',
 youtube:'https://studio.youtube.com/'
});
const normalized=(s)=>String(s??'').trim();

export function prepareManualPack(article,network,{approvedMedia=[]}={}){
 if(network==='whatsapp')throw Error('WhatsApp messaging requires verified recipient opt-in and approved templates; manual mass distribution is disabled');
 const destination=MANUAL_DESTINATIONS[network];
 if(!destination)throw Error('Unsupported manual destination');
 const post=planPost(article,network,{approvedMedia});
 const media=approvedMedia.filter(m=>m && m.rightsVerified===true && m.public===true)
   .map(m=>({type:m.type,alt:normalized(m.alt),url:normalized(m.url)}));
 // Never imply that preparing an upload package proves actual delivery.
 return Object.freeze({
  schema:'social-manual-pack-v1',provider:network,sourceCanonical:post.source,
  trackedUrl:post.trackingUrl,caption:post.body,hashtags:post.hashtags,
  title:post.title,requiredMedia:post.requiredMedia,
  rightsClearedMedia:media,providerHome:destination,
  manualOnly:true,connected:false,published:false,providerPostId:null,
  status:'needs_manual_upload',warnings:post.warnings
 });
}
export function captureManualReference(pack,externalUrl){
 if(!pack?.manualOnly || pack?.schema!=='social-manual-pack-v1')throw Error('Not a manual publication package');
 let url;
 try{url=new URL(externalUrl);}catch{throw Error('Valid provider publication URL is required');}
 if(url.protocol!=='https:' || url.username || url.password || url.hash)throw Error('Invalid provider URL');
 const home=new URL(pack.providerHome), host=url.hostname.toLowerCase(), expected=home.hostname.toLowerCase();
 if(host!==expected && host!=='www.'+expected && expected!=='www.'+host)
   throw Error('Publication reference does not match selected provider');
 if(!url.pathname || url.pathname==='/')throw Error('A specific publication reference is required');
 return {provider:pack.provider,sourceCanonical:pack.sourceCanonical,referenceUrl:url.origin+url.pathname,
   providerPostId:null,confirmedAt:null,published:false,status:'awaiting_provider_verification'};
}
