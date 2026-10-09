/** Build conservative, reviewable JSON-LD for academic identity and service pages. */
const has=x=>typeof x==='string'&&x.trim().length>0;
const absolute=x=>{try{const u=new URL(x);return u.protocol==='https:'&&has(u.hostname)}catch{return false}};
const localized=x=>typeof x==='string'&&/^\/(fa|en)\/[a-z0-9/_-]*$/.test(x)&&!x.includes('//');
const compact=o=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined));
export function buildAcademicIdentityGraph({siteOrigin,organization,person}={}){
 if(!absolute(siteOrigin)||!has(organization?.nameFa)||!has(organization?.nameEn)||!localized(organization?.pathFa)||!localized(organization?.pathEn))throw new Error('Verified bilingual organization identity required');
 const origin=new URL(siteOrigin).origin;
 const orgId=origin+'/#organization';
 const org=compact({'@type':'EducationalOrganization','@id':orgId,name:organization.nameEn,alternateName:organization.nameFa,url:origin+organization.pathEn,description:has(organization.descriptionEn)?organization.descriptionEn:undefined});
 const graph=[org];
 if(person){
  if(!has(person.nameEn)||!has(person.nameFa)||!localized(person.pathEn)||!localized(person.pathFa)||person.verified!==true)throw new Error('Person identity requires editorial verification');
  graph.push({'@type':'Person','@id':origin+'/#academic-person',name:person.nameEn,alternateName:person.nameFa,url:origin+person.pathEn,affiliation:{'@id':orgId}});
 }
 return {'@context':'https://schema.org','@graph':graph};
}
export function buildAcademicServiceGraph({siteOrigin,service,organizationId}={}){
 if(!absolute(siteOrigin)||!absolute(organizationId)||!has(service?.id)||!has(service?.titleFa)||!has(service?.titleEn)||!has(service?.descriptionFa)||!has(service?.descriptionEn)||!localized(service?.paths?.fa)||!localized(service?.paths?.en)||service?.approvedByEditor!==true)throw new Error('Approved bilingual service metadata required');
 const origin=new URL(siteOrigin).origin;
 const url=origin+service.paths.en;
 return {'@context':'https://schema.org','@graph':[{'@type':'Service','@id':url+'#service',name:service.titleEn,alternateName:service.titleFa,description:service.descriptionEn,url,provider:{'@id':organizationId},inLanguage:['en','fa']},{'@type':'WebPage','@id':url+'#webpage',url,name:service.titleEn,about:{'@id':url+'#service'},inLanguage:'en'}]};
}
