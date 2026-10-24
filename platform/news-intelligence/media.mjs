/** Rights-aware bilingual newsroom imagery, no direct image generation. */
import {assert,plain,safeText,sha256} from './contracts.mjs';
export const NEWS_IMAGE_TEMPLATES=Object.freeze({
  BREAKING:{ratio:'16:9',palette:'charcoal-gold',labelFa:'خبر فوری',labelEn:'Breaking News'},
  EXAM:{ratio:'16:9',palette:'black-ivory',labelFa:'آزمون‌ها',labelEn:'Examinations'},
  UNIVERSITY:{ratio:'16:9',palette:'charcoal-ivory',labelFa:'دانشگاه‌ها',labelEn:'Universities'},
  SCHOLARSHIP:{ratio:'16:9',palette:'gold-ivory',labelFa:'بورسیه',labelEn:'Scholarships'},
  RESEARCH:{ratio:'16:9',palette:'black-gold',labelFa:'پژوهش',labelEn:'Research'},
  ANALYSIS:{ratio:'16:9',palette:'charcoal-gold',labelFa:'تحلیل آموزشی',labelEn:'Educational Analysis'}
});
export function imageDesignBrief({kind,headlineFa,headlineEn,sourceCredit=null,
  intendedUsage='FEATURED_NEWS',documentary=false}={}){
  assert(Object.hasOwn(NEWS_IMAGE_TEMPLATES,kind)&&
    safeText(headlineFa,8,160)&&safeText(headlineEn,8,160)&&
    (sourceCredit===null||safeText(sourceCredit,3,200))&&
    ['FEATURED_NEWS','SOCIAL_CARD','EMAIL_PREVIEW'].includes(intendedUsage)&&
    typeof documentary==='boolean','NEWS_IMAGE_BRIEF_INVALID');
  return Object.freeze({schema:'jr.jrei.news-image-brief.v1',
    kind,template:NEWS_IMAGE_TEMPLATES[kind],headlineFa,headlineEn,
    sourceCredit,intendedUsage,documentary,
    sizes:[{width:1600,height:900},{width:1200,height:675},
      {width:800,height:450}],
    requireLicenseOrOriginalAsset:true,
    prohibitSyntheticDocumentaryPhoto:true,
    requireAltTextBothLanguages:true,
    approved:false,rendered:false,
    briefHash:sha256([kind,headlineFa,headlineEn,intendedUsage].join('|'))});
}
export function approveMediaAsset({brief,asset,rightsReviewer}={}){
  assert(plain(brief)&&brief.schema==='jr.jrei.news-image-brief.v1'&&
    plain(asset)&&safeText(asset.reference,5,500)&&
    safeText(asset.altFa,5,300)&&safeText(asset.altEn,5,300)&&
    ['LICENSED_OFFICIAL','ORIGINAL_DESIGN','ORIGINAL_AI_ILLUSTRATION']
      .includes(asset.provenance)&&asset.licenseVerified===true&&
    safeText(rightsReviewer,3,80)&&
    !(brief.documentary&&asset.provenance==='ORIGINAL_AI_ILLUSTRATION'),
    'NEWS_MEDIA_RIGHTS_INVALID');
  return Object.freeze({provenance:asset.provenance,
    assetReference:asset.reference,altFa:asset.altFa,altEn:asset.altEn,
    rightsReviewed:true,isDocumentaryPhoto:brief.documentary,
    rightsReviewer,requiresOwnerEditorialApproval:true});
}
