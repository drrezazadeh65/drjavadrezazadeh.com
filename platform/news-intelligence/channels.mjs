/** Social channel adapters: payloads only; existing AWOS engine sends. */
import {assert,isHash,plain,publicHttps,safeText,sha256,utcInstant} from './contracts.mjs';
export const SOCIAL_CHANNELS=Object.freeze({
  TELEGRAM:{limit:1000,kind:'MESSAGING'},
  EITAA:{limit:1000,kind:'MESSAGING'},
  BALE:{limit:1000,kind:'MESSAGING'},
  INSTAGRAM:{limit:2200,kind:'IMAGE_SOCIAL'},
  FACEBOOK:{limit:3000,kind:'SOCIAL'},
  X:{limit:280,kind:'MICROBLOG'},
  LINKEDIN:{limit:3000,kind:'PROFESSIONAL'},
  WHATSAPP_BUSINESS:{limit:1000,kind:'MESSAGING'},
  APARAT:{limit:3000,kind:'VIDEO'},
  YOUTUBE:{limit:3000,kind:'VIDEO'}
});
export function planChannelDelivery({publishedArticle,channel,caption,
  imageAsset=null,approvedAccount,nowUtc}={}){
  assert(plain(publishedArticle)&&publishedArticle.publicationState==='PUBLISHED'&&
    publishedArticle.ownerApproved===true&&
    isHash(publishedArticle.approvalDigest)&&
    Object.hasOwn(SOCIAL_CHANNELS,channel)&&
    safeText(caption,10,SOCIAL_CHANNELS[channel].limit)&&
    plain(approvedAccount)&&approvedAccount.channel===channel&&
    approvedAccount.connectionStatus==='ACTIVE'&&
    approvedAccount.officialApiAuthorized===true&&
    approvedAccount.ownerDistributionConsent===true&&
    utcInstant(nowUtc),'NEWS_SOCIAL_DISTRIBUTION_NOT_AUTHORIZED');
  const url=publicHttps(publishedArticle.publicUrl);
  assert(url.startsWith('https://drjavadrezazadeh.com/'),
    'NEWS_SOCIAL_CANONICAL_DOMAIN_INVALID');
  if(['INSTAGRAM','APARAT','YOUTUBE'].includes(channel)){
    assert(typeof imageAsset==='string'&&imageAsset.length>5,
      'NEWS_MEDIA_REQUIRED_FOR_CHANNEL');
  }
  return Object.freeze({schema:'jr.jrei.news-social-delivery.v1',
    channel,accountReference:approvedAccount.accountReference,
    articleUrl:url,caption,imageAsset,
    idempotencyKey:sha256([channel,approvedAccount.accountReference,
      publishedArticle.approvalDigest,url].join('|')),
    createdAt:nowUtc,state:'PENDING_EXISTING_AWOS_OUTBOX',
    sent:false,providerAccepted:false});
}
export function channelDeliveryResult({plan,providerReceipt,receivedAt}={}){
  assert(plain(plan)&&plan.schema==='jr.jrei.news-social-delivery.v1'&&
    plain(providerReceipt)&&['ACCEPTED','FAILED','RETRYABLE'].includes(providerReceipt.state)&&
    utcInstant(receivedAt),'NEWS_SOCIAL_RECEIPT_INVALID');
  return Object.freeze({idempotencyKey:plan.idempotencyKey,
    channel:plan.channel,receivedAt,state:providerReceipt.state,
    externalId:providerReceipt.externalId??null,
    verifiedDelivery:providerReceipt.state==='ACCEPTED'&&
      typeof providerReceipt.externalId==='string'});
}
