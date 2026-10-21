#!/usr/bin/env node
/* Read-only bilingual service indexability and tariff consistency release gate.
 * Complements, does not replace, the existing SEO, catalog, link and privacy gates.
 * SOURCE ONLY: nothing here queries Google or certifies Search Console coverage.
 */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const ORIGIN='https://drjavadrezazadeh.com';
export function normalizeNumber(text){
  const fa='۰۱۲۳۴۵۶۷۸۹',ar='٠١٢٣٤٥٦٧٨٩';
  return String(text??'').replace(/[۰-۹٠-٩]/g,c=>{
    const i=fa.indexOf(c);return String(i>=0?i:ar.indexOf(c));
  });
}
export function displayedPrice(html){
  for(const m of String(html).matchAll(/<(p|div|span)\b[^>]*class=["'](?:[^"']*\s)?price(?:\s[^"']*)?["'][^>]*>([\s\S]*?)<\/\1>/gi)){
    // Match the price element itself, never an outer container that would
    // consume nested price markup before the global regex can visit it.
    const value=normalizeNumber(m[2].replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' '));
    const amount=(value.match(/[0-9][0-9,٬،\s]{4,}[0-9]/)||[])[0];
    if(amount){
      const num=Number(amount.replace(/[^0-9]/g,''));
      if(Number.isSafeInteger(num))return num;
    }
  }
  return null;
}
export function attr(tag,name){
  const m=String(tag||'').match(new RegExp('\\b'+name+'\\s*=\\s*(["\x27])(.*?)\\1','i'));
  return m?m[2]:null;
}
export function metaLinks(html){
  return [...String(html).matchAll(/<link\b[^>]*>/gi)].map(x=>x[0]);
}
export function readServiceSchema(html){
  const nodes=[];
  for(const m of String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try{const obj=JSON.parse(m[1]);nodes.push(...(Array.isArray(obj['@graph'])?obj['@graph']:[obj]));}
    catch{return null;}
  }
  return nodes.find(x=>x['@type']==='Service')||null;
}
export function audit(root=process.cwd()){
  const failures=[],warnings=[],pages=[];
  const read=p=>fs.readFileSync(path.join(root,p),'utf8');
  const fail=(when,msg)=>{if(when)failures.push(msg);};
  const service=JSON.parse(read('assets/data/service-catalog.json'));
  const vip=JSON.parse(read('assets/data/vip-catalog.json'));
  const fixed=JSON.parse(read('platform/public-url-stability-manifest.json'));
  const siteIndex=read('sitemap.xml');
  const locs=[...siteIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  const sources=locs.map(url=>{
    fail(!url.startsWith(ORIGIN+'/'), 'Foreign sitemap source: '+url);
    const rel=url.slice((ORIGIN+'/').length);
    if(rel.includes('..')||!rel.endsWith('.xml')){fail(true,'Unapproved sitemap source: '+rel);return null;}
    const file=path.join(root,rel);
    if(!fs.existsSync(file)){fail(true,'Missing declared sitemap: '+rel);return null;}
    return read(rel);
  }).filter(Boolean);
  const publicUrls=new Set(sources.flatMap(xml=>[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1])));
  fail(service.currency!=='IRT'||vip.currency!=='IRT','Approved published tariff unit changed (expected IRT/toman)');
  fail(service.services.length!==21||vip.services.length!==6,'Expected precisely 21 standard + 6 VIP service IDs');
  fail(fixed.production_origin!==ORIGIN,'Frozen public URL origin drift');
  const frozen=new Set(fixed.frozen_indexable_routes||[]);
  let preFreezeRoutes=0, postFreezePublishedRoutes=0;
  const groups=[['service',service.services],['vip',vip.services]];
  for(const [kind,items] of groups){
    for(const item of items){
      for(const lang of ['fa','en']){
        const route='/'+lang+'/'+(kind==='service'?'services':'vip')+'/'+item.id+'/';
        const other='/'+(lang==='fa'?'en':'fa')+'/'+(kind==='service'?'services':'vip')+'/'+item.id+'/';
        const relative=route.slice(1)+'index.html';
        const file=path.join(root,relative);
        if(!fs.existsSync(file)){fail(true,'Missing bilingual offer: '+route);continue;}
        const html=read(relative),canonical=ORIGIN+route;
        const links=metaLinks(html);
        const self=links.filter(x=>attr(x,'rel')==='canonical').map(x=>attr(x,'href'));
        const alternates=links.filter(x=>attr(x,'rel')==='alternate');
        const translated=alternates.find(x=>attr(x,'hreflang')===(lang==='fa'?'en':'fa'));
        const same=alternates.find(x=>attr(x,'hreflang')===lang);
        const htmlTag=(html.match(/<html\b[^>]*>/i)||[])[0]||'';
        const robots=(html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)||[])[0]||'';
        const schema=readServiceSchema(html);
        const amount=displayedPrice(html);
        fail(self.length!==1||self[0]!==canonical,'Non-self/duplicate canonical: '+route);
        fail(attr(translated,'href')!==ORIGIN+other,'Non-reciprocal language target: '+route);
        fail(attr(same,'href')!==canonical,'Missing local hreflang: '+route);
        fail(attr(htmlTag,'lang')!==lang,'Page language differs from URL: '+route);
        fail(lang==='fa'&&attr(htmlTag,'dir')!=='rtl','Missing Persian RTL: '+route);
        fail(/noindex/i.test(robots),'Noindex unexpectedly set on public service: '+route);
        fail(!publicUrls.has(canonical),'Public offer omitted from sitemap inventory: '+route);
        // Frozen routes are an October 8 historical baseline, not a complete
        // registry of later legitimately published service/VIP URLs.
        if(frozen.has(route))preFreezeRoutes++;else postFreezePublishedRoutes++;
        fail(!schema||schema.url!==canonical,'Service JSON-LD URL mismatches self canonical: '+route);
        fail(schema?.provider?.['@id']!==ORIGIN+'/#person','Service provider identity drift: '+route);
        fail(amount!==item.price,'Displayed tariff diverges from central catalogue: '+route);
        fail(!/<meta\b[^>]+name=["']viewport["']/i.test(html),'Viewport meta missing: '+route);
        fail(!/<h1\b/i.test(html),'H1 missing: '+route);
        // A shared bilingual Service @id intentionally points at the canonical FA
        // entity. The Service URL, page canonical and hreflang must still be local.
        if(schema?.['@id']!==ORIGIN+'/fa/'+(kind==='service'?'services':'vip')+'/'+item.id+'/#service')
          warnings.push('Check shared bilingual Service entity identifier: '+route);
        pages.push({route,group:kind,language:lang,priceToman:amount,sourceOnly:true});
      }
    }
  }
  const canonicalAnalytics=JSON.parse(read('platform/analytics-config.json'));
  const publicAnalytics=JSON.parse(read('assets/data/analytics-config.json'));
  for(const key of ['enabled','measurement_id','gtm_container_id','tag_transport']){
    fail(canonicalAnalytics[key]!==publicAnalytics[key],'Analytics public projection differs from canonical: '+key);
  }
  fail(canonicalAnalytics?.clarity?.enabled!==publicAnalytics?.clarity?.enabled,
       'Clarity public projection differs from canonical source');
  const crawler=read('robots.txt');
  fail(!crawler.includes('Sitemap: '+ORIGIN+'/sitemap.xml'),
       'Robots directive missing canonical sitemap');
  fail(!crawler.includes('User-agent: OAI-SearchBot'),
       'Existing AI search crawler policy missing');
  fail(!fs.existsSync(path.join(root,'scripts/indexnow-submit.mjs')),
       'Existing controlled IndexNow path missing');
  fail(!fs.existsSync(path.join(root,'.github/workflows/google-search-console-sync.yml')),
       'Existing owner-controlled GSC connection workflow missing');
  return {
    schema:'jr-unified-seo-release-preflight-v1',
    status:failures.length?'FAIL':'SOURCE_PASS',
    offers:service.services.length+vip.services.length,
    bilingualPagesChecked:pages.length,
    uniquePublicUrlsInSitemaps:publicUrls.size,
    frozenBaselineOfferRoutes:preFreezeRoutes,
    postFreezePublishedOfferRoutes:postFreezePublishedRoutes,
    analytics:{ga4Enabled:canonicalAnalytics.enabled===true,
               clarityEnabled:canonicalAnalytics.clarity?.enabled===true,
               gtmRegistered:!!canonicalAnalytics.gtm_container_id},
    googleIndexation:'NOT_MEASURED_BY_SOURCE_AUDIT',
    warnings,failures
  };
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  try{
    const result=audit();
    console.log(JSON.stringify(result,null,2));
    if(result.failures.length)process.exitCode=1;
  }catch(e){
    console.error('SEO_SOURCE_AUDIT=ERROR '+e.message);
    process.exitCode=1;
  }
}
