/**
 * Exact source compatibility bridge to the EXISTING AWOSE social publisher.
 * Builds the original engine's per-channel variant() and binding digest.
 * Does not send, approve, schedule or activate any provider.
 *
 * The original AWOSE engine only actually dispatches Telegram/Eitaa now;
 * Bale and other networks must not be described as connected without
 * independent working official-provider adapters and operator credentials.
 */
import {variant,CHANNELS} from '../social-distribution/engine.mjs';
import {assert,isHash,plain,publicHttps,safeText,sha256} from './contracts.mjs';
const CURRENT_PROVIDER_SUPPORT=Object.freeze({
  telegram:'ORIGINAL_AWOSE_SUPPORTED',
  eitaa:'ORIGINAL_AWOSE_SUPPORTED',
  bale:'AWOSE_PROVIDER_CONNECTOR_NOT_IMPLEMENTED',
  x:'AWOSE_PROVIDER_CONNECTOR_NOT_IMPLEMENTED',
  instagram:'AWOSE_PROVIDER_CONNECTOR_NOT_IMPLEMENTED',
  facebook:'AWOSE_PROVIDER_CONNECTOR_NOT_IMPLEMENTED',
  linkedin:'AWOSE_PROVIDER_CONNECTOR_NOT_IMPLEMENTED',
  whatsapp:'AWOSE_PROVIDER_CONNECTOR_NOT_IMPLEMENTED',
  aparat:'AWOSE_PROVIDER_CONNECTOR_NOT_IMPLEMENTED',
  youtube:'AWOSE_PROVIDER_CONNECTOR_NOT_IMPLEMENTED'
});
export function planExistingAwoseCampaign({
  article,ownerApproval,channels=['telegram','eitaa'],
  campaign='jrei_education_news'
}={}){
  assert(plain(article)&&article.publicationState==='PUBLISHED'&&
    article.ownerApproved===true&&article.publisherReceiptVerified===true&&
    isHash(article.approvalDigest)&&
    safeText(article.title,8,180)&&safeText(article.description,20,1000)&&
    plain(ownerApproval)&&ownerApproval.approvalDigest===article.approvalDigest&&
    ownerApproval.revoked!==true&&ownerApproval.ownerMfaVerified===true&&
    Array.isArray(channels)&&channels.length>=1&&channels.length<=12&&
    channels.every(x=>Object.hasOwn(CURRENT_PROVIDER_SUPPORT,x)),
    'NEWS_AWOSE_PUBLICATION_NOT_APPROVED');
  const url=publicHttps(article.publicUrl);
  assert(url.startsWith('https://drjavadrezazadeh.com/')&&
    ['/fa/','/en/'].some(prefix=>
      new URL(url).pathname.startsWith(prefix)),
    'NEWS_AWOSE_NOT_CANONICAL_SITE');
  const plans=[];
  for(const name of [...new Set(channels)]){
    const state=CURRENT_PROVIDER_SUPPORT[name];
    if(!Object.hasOwn(CHANNELS,name)){
      plans.push({channel:name,state:'AWOSE_CHANNEL_UNKNOWN',
        automaticDispatchPossible:false});continue;
    }
    const post=variant({
      url,title:article.title,description:article.description
    },name,campaign);
    plans.push({
      channel:name,status:state,
      providerSupportedInSource:state==='ORIGINAL_AWOSE_SUPPORTED',
      existingAwosePreview:post,
      requiresSeparateAwoseRecipientSpecificHumanApproval:true,
      approvalDigestFromAwose:post.approvalDigest,
      originalJreiEditorialDigest:article.approvalDigest,
      canonicalArticleUrl:url,
      idempotencyKey:sha256([article.approvalDigest,
        post.approvalDigest,name].join('|')),
      publicationPerformed:false,
      automaticDispatchPossible:false
    });
  }
  return Object.freeze({schema:'jr.jrei.news-awose-campaign.v1',
    articleUrl:url,channels:plans,
    originalAwoseEngine:'platform/social-distribution/engine.mjs',
    requiresRealAccountCredentials:true,
    noSocialPostsSent:true,
    noDuplicateSocialScheduler:true});
}
