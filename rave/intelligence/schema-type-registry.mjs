/** Extensible Schema.org type registry and conservative page eligibility policy.
 * Registry accepts any syntactically valid Schema.org type; publishing requires
 * an explicitly approved, evidence-backed page/type pairing.
 */
const TYPE=/^[A-Z][A-Za-z0-9]*$/;
const SCHEMA='https://schema.org/';
const PAGE_TYPES={
 'home':['WebSite','WebPage','Organization','EducationalOrganization'],
 'academic-profile':['Person','ProfilePage','AboutPage'],
 'service':['Service','Offer','OfferCatalog','WebPage'],
 'product':['Product','Book','Offer','WebPage'],
 'book':['Book','CreativeWork','WebPage'],
 'research':['ScholarlyArticle','Article','Dataset','CreativeWork','WebPage'],
 'course':['Course','CourseInstance','LearningResource','WebPage'],
 'event':['Event','EducationEvent','WebPage'],
 'faq':['FAQPage','WebPage'],
 'listing':['CollectionPage','ItemList','WebPage'],
 'other':['WebPage']
};
export function schemaTypeRegistry({additionalTypes=[]}={}){
 if(!Array.isArray(additionalTypes)||additionalTypes.some(t=>typeof t!=='string'||!TYPE.test(t)))throw new TypeError('Invalid Schema.org type');
 const names=[...new Set([...Object.values(PAGE_TYPES).flat(),...additionalTypes])].sort();
 return {namespace:SCHEMA,types:names,pageTypePolicy:PAGE_TYPES,extensible:true,exhaustive:false,productionTouched:false};
}
export function assessSchemaTypes({pageKind,types=[],approvedTypes=[],evidence={}}={}){
 const errors=[];
 if(!Object.hasOwn(PAGE_TYPES,pageKind))errors.push('unknown-page-kind');
 if(!Array.isArray(types)||!types.length||types.some(t=>typeof t!=='string'||!TYPE.test(t)))errors.push('invalid-schema-types');
 if(!Array.isArray(approvedTypes))errors.push('invalid-approvals');
 if(errors.length)return {ready:false,errors,productionTouched:false};
 const permitted=new Set([...PAGE_TYPES[pageKind],...approvedTypes.filter(t=>typeof t==='string'&&TYPE.test(t))]);
 for(const type of types){
  if(!permitted.has(type))errors.push('type-not-approved:'+type);
  if(evidence[type]!==true)errors.push('type-lacks-content-evidence:'+type);
 }
 return {ready:errors.length===0,errors,types:[...new Set(types)],productionTouched:false};
}
