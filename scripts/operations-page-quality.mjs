/**
 * Read-only, bounded page-quality scoring for the SINGLE authenticated admin
 * dashboard. Scores are static-source readiness proxies (0..10), not rankings,
 * Search Console field observations, actual UX studies, Core Web Vitals or
 * inclusion in any AI answer. Live speed and visibility remain null until
 * provider observations are separately validated.
 *
 * Reuses the existing Schema.org inspector and ecosystem route policy. No
 * HTTP requests, database writes, credential reads or test execution.
 */
import fs from 'node:fs';
import path from 'node:path';
import {discoverHtml,inspectHtml} from './schema-entity-inventory.mjs';
import {classifyRoute} from '../platform/ecosystem-governance.mjs';

const BASE='https://drjavadrezazadeh.com';
const attr=(tag,key)=>{
 const result=tag.match(new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(["\\x27])([^"\\x27]*?)\\1','i'));
 return result?.[2]??'';
};
const matches=(html,pattern)=>[...html.matchAll(pattern)].map(m=>m[0]);
const score=(checks,source='source_static_html')=>{
 const active=checks.filter(x=>x.applicable!==false);
 const passed=active.filter(x=>x.pass===true).length;
 return {
   score:active.length?Number((10*passed/active.length).toFixed(1)):null,
   passed,applicable:active.length,source,
   findings:active.filter(x=>x.pass!==true).map(x=>x.id)
 };
};
const c=(id,pass,applicable=true)=>({id,pass:pass===true,applicable});
function extractText(html){
 return html.replace(/<!--[\s\S]*?-->/g,' ')
   .replace(/<(?:script|style|svg|noscript|template)\b[^>]*>[\s\S]*?<\/\s*(?:script|style|svg|noscript|template)\s*>/gi,' ')
   .replace(/<(?:header|nav|footer)\b[^>]*>[\s\S]*?<\/\s*(?:header|nav|footer)\s*>/gi,' ')
   .replace(/<[^>]+>/g,' ').replace(/&(?:[a-z]+|#\d+);/gi,' ')
   .replace(/\s+/g,' ').trim();
}
const has=(html,re)=>re.test(html);
function inspectQuality(route,html,schema){
 const policy=classifyRoute(route),privateRoute=policy.indexing==='NOINDEX';
 const noindex=schema.indexability==='noindex';
 const eligible=!privateRoute&&!noindex;
 const imgs=matches(html,/<img\b[^>]*>/gi);
 const links=matches(html,/<a\b[^>]*>/gi);
 const buttons=matches(html,/<button\b[^>]*>/gi);
 const forms=matches(html,/<form\b[^>]*>/gi);
 const scripts=matches(html,/<script\b[^>]*>/gi).filter(x=>attr(x,'src')!=='');
 const metas=matches(html,/<meta\b[^>]*>/gi);
 const getMeta=name=>attr(metas.find(x=>attr(x,'name').toLowerCase()===name)||'','content');
 const title=(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';
 const titleText=title.replace(/<[^>]+>/g,' ').trim();
 const text=extractText(html),words=text?text.split(/\s+/u).length:0;
 const h1=matches(html,/<h1\b[^>]*>/gi).length;
 const h2=matches(html,/<h2\b[^>]*>/gi).length;
 const canonical=!!schema.canonical&&schema.canonical===BASE+route;
 const lang=['fa','en'].includes(schema.language);
 const reciprocal=Array.isArray(schema.hreflang)&&schema.hreflang.some(x=>x.lang==='fa')
   &&schema.hreflang.some(x=>x.lang==='en');
 const validSchema=schema.structuredDataBlocks>0&&!schema.errors.some(e=>e.code==='malformed_json_ld');
 const alt=imgs.every(x=>/\balt\s*=/.test(x));
 // Official eNamad trust seal markup is vendor-controlled: do not lower
 // image/speed grades for forbidden modifications to its required snippet.
 const officialSeal=tag=>/^https:\/\/trustseal\.enamad\.ir\/logo\.aspx\?/i.test(attr(tag,'src'));
 const sized=imgs.every(x=>officialSeal(x)||(!!attr(x,'width')&&!!attr(x,'height')));
 const hints=imgs.every((x,i)=>officialSeal(x)||i===0||
   ['lazy','eager'].includes(attr(x,'loading'))||attr(x,'fetchpriority')==='high');
 const description=getMeta('description');
 const formsNamed=forms.length===0||forms.every(x=>!!attr(x,'aria-label')||!!attr(x,'id')||has(html,/<label\b/i));
 const controlsNamed=buttons.length===0||buttons.every(x=>!/^<button\b[^>]*>$/i.test(x)
   ||!!attr(x,'aria-label')||!!attr(x,'title')||has(html,/<button\b[^>]*>[^<\s]+/i));
 const externalLinksSafe=links.every(x=>attr(x,'target')!=='_blank'||/\bnoopener\b/i.test(attr(x,'rel')));
 const main=has(html,/<main\b/i),viewport=has(html,/<meta\b[^>]*name=["']viewport["']/i);
 const semanticMarkup=has(html,/<(?:article|section|main)\b/i);
 const namedEntity=schema.schemaTypes.some(t=>['Person','Organization','ScholarlyArticle','Article','Book','WebSite','WebPage','ProfilePage','Service'].includes(t));
 const sourceSpeed=score([
    c('image_intrinsic_dimensions',sized,imgs.length>0),
    c('defer_noncritical_image_loading',hints,imgs.length>1),
    c('script_loading_hints',scripts.every(x=>/\b(?:defer|async|type\s*=\s*["']module["'])/i.test(x)),scripts.length>0),
    c('responsive_viewport',viewport),
    c('stylesheet_present',has(html,/<link\b[^>]*rel=["']stylesheet["']/i)),
    c('critical_asset_hints',has(html,/<link\b[^>]*rel=["'](?:preconnect|preload|modulepreload)["']/i))
 ],'static_performance_hints_only');
 const grades={
   content:score([
      c('visible_main_text_100_words',words>=100),c('substantive_main_text_250_words',words>=250),
      c('single_primary_heading',h1===1),c('subheadings',h2>0),
      c('semantic_content_container',semanticMarkup)
   ]),
   image:score([
      c('image_alt_coverage',alt),c('image_dimensions_coverage',sized),
      c('noncritical_image_loading',hints)
   ].map(x=>({...x,applicable:imgs.length>0}))),
   seo:eligible?score([
      c('meaningful_title',titleText.length>=18&&titleText.length<=72),
      c('descriptive_meta',description.length>=40&&description.length<=190),
      c('canonical_self_reference',canonical),c('single_h1',h1===1),
      c('language_tag',lang),c('hreflang_fa_en',reciprocal),
      c('no_schema_errors',schema.errors.length===0)
   ]):{score:null,passed:0,applicable:0,source:'not_applicable_private_or_noindex',findings:[]},
   ui:score([
      c('viewport_mobile',viewport),c('language_declared',lang),
      c('direction_declared',schema.language!=='fa'||has(html,/<html\b[^>]*dir=["']rtl["']/i)),
      c('main_landmark',main),c('stylesheet_included',has(html,/<link\b[^>]*rel=["']stylesheet["']/i))
   ],'static_structure_proxy_not_visual_audit'),
   ux:score([
      c('visible_navigation',has(html,/<nav\b/i)),
      c('main_landmark',main),c('accessible_skip_link',has(html,/(?:skip-link|skip-to-content|پرش به محتوا)/i)),
      c('form_label_structure',formsNamed),c('buttons_named_static',controlsNamed),
      c('external_new_tabs_hardened',externalLinksSafe)
   ],'static_accessibility_proxy_not_user_testing'),
   ai:eligible?score([
      c('human_readable_content',words>=100),c('extractable_headline',h1===1),
      c('document_language',lang),c('valid_structured_data',validSchema),
      c('descriptive_metadata',description.length>=40)
   ],'ai_crawl_readiness_not_ai_citation'): {score:null,passed:0,applicable:0,source:'not_applicable_private_or_noindex',findings:[]},
   geo:eligible?score([
      c('canonical_stable',canonical),c('language_alternates',reciprocal),
      c('schema_entity_types',namedEntity),c('valid_schema',validSchema),
      c('author_or_entity_information',schema.entityIds.length>0),
      c('meaningful_headings',h1===1&&h2>=1)
   ],'entity_and_answer_readiness_not_search_visibility'): {score:null,passed:0,applicable:0,source:'not_applicable_private_or_noindex',findings:[]},
   speedReadiness:sourceSpeed,
   speed:{score:null,passed:0,applicable:0,source:'field_and_lab_data_unavailable',findings:[]},
   security:{score:null,passed:0,applicable:0,source:'runtime_headers_not_observed',findings:[]}
 };
 // Source-only dimensions. These do not certify deployed HTTP, mobile
 // usability, accessibility compliance, rich results or AI citations.
 // Legacy fields remain for consumers of the earlier inventory.
 grades.onPageSeo=grades.seo;
 grades.technicalSeo=eligible?score([
   c('canonical_identity_in_source',canonical),
   c('html_language',lang),
   c('language_alternates',reciprocal),
   c('public_page_has_no_source_noindex',!/\bnoindex\b/i.test(getMeta('robots'))),
   c('valid_schema_syntax',!schema.errors.some(e=>e.code==='malformed_json_ld'))
 ],'static_technical_seo_not_live_http'):{score:null,passed:0,applicable:0,
   source:'not_applicable_private_or_noindex',findings:[]};
 grades.accessibility=score([
   c('document_language',lang),
   c('main_landmark',main),
   c('skip_navigation',has(html,/(?:skip-link|skip-to-content|پرش به محتوا)/i)),
   c('image_text_alternatives',alt,imgs.length>0),
   c('form_label_structure',formsNamed,forms.length>0),
   c('button_accessible_names_source',controlsNamed,buttons.length>0)
 ],'static_accessibility_markup_not_manual_wcag_audit');
 grades.aiReadiness=grades.ai;
 grades.schema=eligible?score([
   c('json_ld_present',schema.structuredDataBlocks>0),
   c('no_malformed_json_ld',!schema.errors.some(e=>e.code==='malformed_json_ld')),
   c('entity_type_declared',schema.schemaTypes.length>0),
   c('entity_identifier_in_source',schema.entityIds.length>0)
 ],'static_schema_markup_not_google_rich_results'):{score:null,passed:0,applicable:0,
   source:'not_applicable_private_or_noindex',findings:[]};
 grades.mobile=score([
   c('responsive_viewport',viewport),
   c('document_direction',schema.language!=='fa'||has(html,/<html\b[^>]*dir=["']rtl["']/i)),
   c('intrinsic_image_dimensions',sized,imgs.length>0),
   c('noncritical_image_loading_hints',hints,imgs.length>1),
   c('navigation_markup',has(html,/<nav\b/i))
 ],'static_mobile_structure_not_device_experience');
 const measured=Object.entries(grades).filter(([k,v])=>
   ['content','image','onPageSeo','technicalSeo','ui','ux','accessibility','aiReadiness','geo','schema','mobile'].includes(k)&&v.score!==null);
 const overall=measured.length?Number((measured.reduce((sum,[,v])=>sum+v.score,0)/measured.length).toFixed(1)):null;
 return {route,url:BASE+route,language:schema.language,
    indexability:privateRoute?'private_noindex_required':schema.indexability,
    contentIntent:schema.contentIntent,source:'committed_html_not_production',
    summary:{words,images:imgs.length,forms:forms.length,schemaErrors:schema.errors.length,schemaWarnings:schema.warnings.length},
    grades,performanceReadiness:sourceSpeed,
    overallSourceReadiness:overall,
    noindexExpected:privateRoute,
    limitations:'Static-source heuristics are NOT Google rankings, index status, real UX/visual results, Core Web Vitals, security header measurement or AI mentions.'};
}
export function generateQualityInventory(root){
 const rows=[],seen=new Set();
 for(const file of discoverHtml(root)){
   const relative=path.relative(root,file).split(path.sep).join('/');
   const route=relative==='index.html'?'/':
     relative.endsWith('/index.html')?'/'+relative.slice(0,-'index.html'.length):'/'+relative;
   if(seen.has(route))continue;
   seen.add(route);
   const html=fs.readFileSync(file,'utf8');
   if(html.length>2_000_000){
     rows.push({route,url:BASE+route,source:'oversize_uninspected',grades:{},overallSourceReadiness:null,
       limitations:'Source HTML exceeds bounded inspector size; assessment unavailable.'});
     continue;
   }
   const schema=inspectHtml(route,html);
   rows.push(inspectQuality(route,html,schema));
 }
 // Sitemap-only URLs may be served dynamically by PHP/OJS. Include them
 // in the complete route list but do NOT invent page HTML or numeric grades.
 // This is a bounded local read; no network access or URL crawling occurs.
 for(const name of fs.readdirSync(root).filter(n=>/^sitemap(?:-[a-z0-9-]+)?\.xml$/i.test(n)).slice(0,30)){
   const filename=path.join(root,name);
   if(!fs.statSync(filename).isFile()||fs.statSync(filename).size>1_000_000)continue;
   const xml=fs.readFileSync(filename,'utf8');
   for(const match of xml.matchAll(/<loc\s*>([^<]+)<\/loc\s*>/gi)){
     const sourceUrl=match[1].replace(/&amp;/gi,'&').trim();
     let parsed;try{parsed=new URL(sourceUrl);}catch{continue;}
     if(parsed.origin!==BASE||parsed.search||parsed.hash
       ||/\.xml$/i.test(parsed.pathname))continue;
     let route=parsed.pathname;
     try{route=decodeURI(route);}catch{}
     if(!route.startsWith('/')||seen.has(route)||route.length>500)continue;
     seen.add(route);
     const grades=Object.fromEntries(
       ['content','image','seo','ui','ux','ai','geo','speedReadiness','speed','security',
         'onPageSeo','technicalSeo','accessibility','aiReadiness','schema','mobile']
         .map(key=>[key,{score:null,passed:0,applicable:0,
           source:'dynamic_sitemap_route_not_inspected',findings:[]}]));
     rows.push({route,url:BASE+route,language:route.startsWith('/fa/')?'fa':
       route.startsWith('/en/')?'en':'other',
       indexability:'sitemap_declared_unverified',
       contentIntent:'dynamic_or_unmatched',source:'sitemap_only_not_html_inspected',
       summary:null,grades,performanceReadiness:null,overallSourceReadiness:null,
       noindexExpected:false,
       limitations:'Declared in a local sitemap, but no deployable static HTML was available for source scoring. No live measurements or grade inferred.'});
   }
 }
 rows.sort((a,b)=>a.route.localeCompare(b.route,'en'));
 return {schema:'operations-page-quality-inventory-v1',source:'committed_html_not_production',
   generatedAt:new Date().toISOString(),total:rows.length,
   scoringContract:'0..10 source-only structural readiness. Missing field speed, security headers and AI citations are null, not zero. Categories are independent.',
   categories:['content','image','onPageSeo','technicalSeo','ui','ux','accessibility','aiReadiness','geo','schema','speed','mobile','security'],
   pages:rows};
}
