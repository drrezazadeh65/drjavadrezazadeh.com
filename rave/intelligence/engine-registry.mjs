/** Standalone engine catalog. No site or third-party connections. */
export const ENGINES=Object.freeze([
{id:'ai',titleFa:'هوش مصنوعی',titleEn:'AI Engine',capabilities:['providerRouting','consent','privacy','taskPlanning','sourceGrounding','humanReview']},
{id:'seo',titleFa:'مستر سئو',titleEn:'Master SEO',capabilities:['technicalAudit','indexation','bilingualHreflang','schema','contentQuality','searchConsole']},
{id:'rave',titleFa:'راو',titleEn:'RAVE',capabilities:['acquisition','engagement','conversion','retention','attribution','reports']},
{id:'golden-talent',titleFa:'گلدن تلنت',titleEn:'Golden Talent',capabilities:['instruments','assessment','scoring','pathways','reports','consent']},
{id:'commerce',titleFa:'تجارت و مالی',titleEn:'Commerce',capabilities:['catalog','pricing','checkout','orders','invoices','refunds']},
{id:'crm',titleFa:'مدیریت ارتباط با مشتری',titleEn:'CRM',capabilities:['profiles','segments','email','entitlements','support','privacy']},
{id:'content',titleFa:'محتوا',titleEn:'Content',capabilities:['pages','translations','drafts','review','revisions','publication']},
{id:'media',titleFa:'رسانه',titleEn:'Media',capabilities:['library','metadata','optimization','derivatives','usage','rights']},
{id:'design',titleFa:'استودیوی طراحی',titleEn:'Design',capabilities:['tokens','themes','typography','layouts','preview','accessibility']},
{id:'operations',titleFa:'عملیات و امنیت',titleEn:'Operations & Security',capabilities:['roles','audit','backups','cache','release','security']},
{id:'magazine',titleFa:'مجله علمی',titleEn:'Scientific Magazine',capabilities:[]},
{id:'admin-orchestration',titleFa:'مدیریت یکپارچه داشبورد',titleEn:'Admin Orchestration',capabilities:[]}
]);
export function engineById(id){return ENGINES.find(e=>e.id===id)??null}
export function engineReadiness(id,evidence={}){
 const engine=engineById(id);if(!engine)throw new Error('Unknown engine');
 const capabilities=engine.capabilities.map(name=>({name,implemented:evidence[name]?.implemented===true,verified:evidence[name]?.verified===true,connected:evidence[name]?.connected===true}));
 return Object.freeze({id,ready:capabilities.every(c=>c.implemented&&c.verified),connected:capabilities.every(c=>c.connected),capabilities});
}
