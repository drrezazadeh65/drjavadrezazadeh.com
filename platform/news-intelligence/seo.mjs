/**
 * JREI News SEO descriptors — immutable proposals, NO public route mutation.
 * Canonical paths must be owner-approved and consistent with frozen URL policy.
 */
import {assert,plain,publicHttps,safeText,utcInstant} from './contracts.mjs';
import {hasVerifiedPublicationAuthority} from './publication-authority.mjs';
const ORIGIN='https://drjavadrezazadeh.com';
const route=p=>typeof p==='string'&&/^\/(?:fa|en)\/[a-z0-9/-]+\/$/.test(p)&&
  !p.includes('//');
export function articleSeoDescriptor({article,faPath,enPath,organizationName,
  imageUrl,publishedAt,modifiedAt}={}){
  assert(plain(article)&&hasVerifiedPublicationAuthority(article)&&
    article.publicationState==='PUBLISHED'&&route(faPath)&&route(enPath)&&
    faPath.startsWith('/fa/')&&enPath.startsWith('/en/')&&
    safeText(organizationName,3,160)&&utcInstant(publishedAt)&&
    utcInstant(modifiedAt)&&Date.parse(modifiedAt)>=Date.parse(publishedAt),
    'NEWS_SEO_PUBLICATION_INVALID');
  const image=publicHttps(imageUrl);
  assert(image.startsWith(ORIGIN+'/'),'NEWS_SEO_IMAGE_HOST_INVALID');
  const languagePaths={fa:faPath,en:enPath};
  const descriptors={};
  for(const lang of ['fa','en']){
    const path=languagePaths[lang],data=article[lang];
    assert(plain(data)&&safeText(data.headline,8,180)&&
      safeText(data.description,40,320)&&safeText(data.body,40,30000),
      'NEWS_SEO_LANGUAGE_MISSING');
    const url=ORIGIN+path;
    descriptors[lang]=Object.freeze({
      canonical:url,language:lang,title:data.headline,
      description:data.description,robots:'index,follow,max-image-preview:large',
      alternates:{fa:ORIGIN+faPath,en:ORIGIN+enPath},
      openGraph:{type:'article',url,title:data.headline,
        description:data.description,image},
      structuredData:{
        '@context':'https://schema.org','@type':'NewsArticle',
        headline:data.headline,description:data.description,
        inLanguage:lang,mainEntityOfPage:url,
        datePublished:publishedAt,dateModified:modifiedAt,
        image:[image],publisher:{'@type':'Organization',
          name:organizationName,url:ORIGIN},
        isAccessibleForFree:true
      },
      newsSitemapEligible:true,
      internalSearchResultPage:false
    });
  }
  return Object.freeze(descriptors);
}
export function newsSitemapItem({seo,publicationAgeHours,verifiedIndexable=true}={}){
  assert(plain(seo)&&typeof seo.canonical==='string'&&
    seo.canonical.startsWith(ORIGIN+'/')&&
    Number.isFinite(publicationAgeHours)&&publicationAgeHours>=0,
    'NEWS_SITEMAP_ITEM_INVALID');
  return Object.freeze({loc:seo.canonical,
    newsSitemapEligible:verifiedIndexable===true&&publicationAgeHours<=48,
    generalSitemapEligible:verifiedIndexable===true,
    publicationDate:seo.structuredData.datePublished,
    language:seo.language,
    neverIncludePrivateDrafts:true});
}
export function proposalSeoForUnpublished({language,headline,summary}={}){
  assert(['fa','en'].includes(language)&&safeText(headline,8,180)&&
    safeText(summary,20,320),'NEWS_SEO_DRAFT_INVALID');
  return Object.freeze({language,title:headline,description:summary,
    published:false,canonical:null,newsSitemapEligible:false});
}
