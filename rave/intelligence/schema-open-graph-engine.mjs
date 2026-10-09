/** Dedicated bilingual Schema.org + Open Graph metadata governance.
 * Pure offline generation from verified editorial data, never live publication.
 */
const validUrl=(s)=>{try{const u=new URL(s);return u.protocol==='https:'&&Boolean(u.hostname)}catch{return false}};
const str=s=>typeof s==='string'&&s.trim().length>0;
const types=new Set(['WebPage','AboutPage','ProfilePage','Article','ScholarlyArticle','Book','Service','Product','FAQPage']);
const localeCode={fa:'fa_IR',en:'en_US'};
export function buildSchemaOpenGraph({page,siteOrigin='https://drjavadrezazadeh.com'}={}){
 const errors=[];
 if(!page||!['fa','en'].includes(page.locale))errors.push('invalid-locale');
 const locale=page?.locale;
 const path=page?.path;
 if(typeof path!=='string'||!path.startsWith('/'+locale+'/')||path.includes('//')||/[?#]/.test(path))errors.push('invalid-localized-path');
 const canonical=validUrl(page?.canonical)?page.canonical:null;
 if(!canonical||!canonical.startsWith(siteOrigin+'/'))errors.push('invalid-canonical');
 if(!str(page?.title)||!str(page?.description))errors.push('missing-editorial-metadata');
 if(!types.has(page?.schemaType))errors.push('unapproved-schema-type');
 if(!str(page?.entityId)||!validUrl(page.entityId))errors.push('missing-stable-entity-id');
 if(!validUrl(page?.imageUrl))errors.push('missing-absolute-social-image');
 const alternates=page?.alternates??{};
 if(!validUrl(alternates.fa)||!validUrl(alternates.en))errors.push('missing-bilingual-alternates');
 if(errors.length)return {ready:false,errors,jsonLd:null,openGraph:null,productionTouched:false};
 const url=new URL(canonical);
 const graph={'@context':'https://schema.org','@type':page.schemaType,'@id':page.entityId,url:canonical,name:page.title,description:page.description,inLanguage:locale};
 if(page.imageApproved===true)graph.image=page.imageUrl;
 else errors.push('social-image-not-approved');
 if(page.schemaType==='Service'&&str(page.providerEntityId)&&validUrl(page.providerEntityId))graph.provider={'@id':page.providerEntityId};
 if(['Article','ScholarlyArticle','Book'].includes(page.schemaType)&&str(page.authorEntityId)&&validUrl(page.authorEntityId))graph.author={'@id':page.authorEntityId};
 if(errors.length)return {ready:false,errors,jsonLd:null,openGraph:null,productionTouched:false};
 const ogType=['Article','ScholarlyArticle'].includes(page.schemaType)?'article':'website';
 const openGraph={'og:type':ogType,'og:url':canonical,'og:title':page.title,'og:description':page.description,'og:image':page.imageUrl,'og:locale':localeCode[locale],'og:locale:alternate':localeCode[locale==='fa'?'en':'fa'],'twitter:card':'summary_large_image','twitter:title':page.title,'twitter:description':page.description,'twitter:image':page.imageUrl};
 return {ready:true,errors:[],jsonLd:graph,openGraph,canonical,hreflang:{fa:alternates.fa,en:alternates.en,'x-default':alternates.en},requiresLiveValidation:true,productionTouched:false};
}
