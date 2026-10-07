import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const readiness=read('platform/master-readiness.json');
const modules=read('platform/module-registry.json');
const ecosystem=read('platform/ecosystem-registry.json');
const intents=read('platform/seo-intent-registry.json');
const hreflang=read('platform/hreflang-pairs.json');
const payments=read('platform/payment-provider-registry.json');
const nav=read('platform/mobile-navigation-contract.json');
const gtPolicy=read('platform/golden-talent-engine-policy.json');
const entityRegistry=read('platform/public-entity-registry.json');
const authPolicy=read('platform/identity-auth-policy.json');
const assistantPolicy=read('platform/assistant-runtime-policy.json');
const bookCatalog=read('platform/book-catalog.json');

const html=[];
function walk(dir){
 for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
  if(['.git','node_modules'].includes(ent.name)) continue;
  const p=path.join(dir,ent.name);
  if(ent.isDirectory()) walk(p);
  else if(ent.isFile()&&ent.name.endsWith('.html')) html.push(p);
 }
}
walk(root);
const noindex=html.filter(p=>/name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(fs.readFileSync(p,'utf8'))).length;
const indexable=html.length-noindex;
const sitemapFiles=['sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-news.xml'];
const sitemapUrls=new Set();
for(const f of sitemapFiles){
 const p=path.join(root,f); if(!fs.existsSync(p)) continue;
 const x=fs.readFileSync(p,'utf8');
 for(const m of x.matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.add(m[1]);
}
const migrations=fs.readdirSync(path.join(root,'platform','db','migrations')).filter(x=>/\.sql$/i.test(x)).sort();
const priorityRank={CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3};
const next=(readiness.tracks||[]).filter(x=>x.production_state!=='LIVE').sort((a,b)=>priorityRank[a.revenue_priority]-priorityRank[b.revenue_priority]||a.id.localeCompare(b.id));
const moduleStates={};
for(const m of modules.modules||[]) moduleStates[m.state]=(moduleStates[m.state]||0)+1;
const readyStates={};
for(const t of readiness.tracks||[]) readyStates[t.production_state]=(readyStates[t.production_state]||0)+1;

const summary={
 as_of:readiness.as_of,
 commit:process.env.GITHUB_SHA||null,
 public_surface:{html_total:html.length,indexable,noindex,sitemap_urls:sitemapUrls.size,seo_intent_clusters:(intents.clusters||[]).length,hreflang_pairs:(hreflang.pairs||[]).length,entity_schema_surfaces:(entityRegistry.schema_surfaces||[]).length},
 platform:{modules:(modules.modules||[]).length,module_states:moduleStates,readiness_tracks:(readiness.tracks||[]).length,readiness_states:readyStates,db_migrations:migrations.length,last_migration:migrations.at(-1)||null},
 mobile:{stable_tabs:nav.stable_tabs,role_nav_profiles:Object.keys(nav.routes||{}).length},
 commerce:{payment_provider_slots:(payments.providers||[]).length,payment_providers_enabled:(payments.providers||[]).filter(x=>x.enabled).length,published_books:(bookCatalog.books||[]).length,sellable_books:(bookCatalog.books||[]).filter(x=>x.commerce?.sellable===true).length,invalid_sellable_books:(bookCatalog.books||[]).filter(x=>{const c=x.commerce||{};return c.sellable===true&&(!Number.isInteger(c.price)||c.price<=0||!c.currency||!Array.isArray(c.formats_confirmed)||!c.formats_confirmed.length||!['IN_STOCK','DIGITAL'].includes(c.inventory_state))}).length},
 identity:{primary_login_identifier:authPolicy.primary_login_identifier,activation_requires:authPolicy.registration?.activation_requires,mobile_is_authenticator:authPolicy.registration?.phone_is_authenticator===true,recovery_channel:authPolicy.recovery?.channel},
 assistant:{lead_capture:assistantPolicy.lead_capture?.enabled===true,lead_bank:assistantPolicy.storage?.lead_bank,conversation_persisted:assistantPolicy.storage?.server_conversation_persistence===true},
 golden_talent:{status:gtPolicy.status,engine_version:gtPolicy.engine_version,total_score_enabled:gtPolicy.routing_policy?.total_score===true,career_prescription_enabled:gtPolicy.routing_policy?.automatic_career_prescription===true},
 next_actions:next.slice(0,8).map(x=>({track:x.id,priority:x.revenue_priority,state:x.production_state,blocked:(x.external_blockers||[]).length>0,next:x.next_actions?.[0]}))
};

const failures=[];
if(summary.public_surface.indexable!==summary.public_surface.sitemap_urls) failures.push('Indexable HTML count and sitemap URL count differ');
if(summary.commerce.payment_providers_enabled!==0) failures.push('A payment provider is enabled before external credential gate is cleared');
if(summary.golden_talent.total_score_enabled) failures.push('Golden Talent total score unexpectedly enabled');
if(summary.golden_talent.career_prescription_enabled) failures.push('Automatic career prescription unexpectedly enabled');
if(JSON.stringify(summary.mobile.stable_tabs)!==JSON.stringify(['HOME','DISCOVER','TESTS','MY_PATH','ACCOUNT'])) failures.push('Private mobile five-tab contract drift');
if((ecosystem.locales?.supported||[]).join(',')!=='fa,en') failures.push('Bilingual locale contract drift');
if(summary.identity.primary_login_identifier!=='EMAIL'||summary.identity.activation_requires!=='EMAIL_VERIFICATION'||summary.identity.mobile_is_authenticator) failures.push('Email-only identity boundary drift');
if(summary.identity.recovery_channel!=='EMAIL') failures.push('Password recovery must remain email-only');
if(!summary.assistant.lead_capture||summary.assistant.lead_bank!=='CLOUDFLARE_DURABLE_OBJECT_SQLITE'||summary.assistant.conversation_persisted) failures.push('Assistant lead-bank/privacy boundary drift');
if(summary.commerce.invalid_sellable_books!==0) failures.push('Bookstore contains sellable products without verified commercial data');

const markdown=process.argv.includes('--markdown');
if(markdown){
 console.log('# Master Ecosystem Audit');
 console.log('');
 console.log('- Audit date: `'+summary.as_of+'`');
 if(summary.commit) console.log('- Commit: `'+summary.commit+'`');
 console.log('- Public HTML: **'+summary.public_surface.html_total+'** · indexable: **'+summary.public_surface.indexable+'** · noindex/private/staging: **'+summary.public_surface.noindex+'**');
 console.log('- Sitemap canonical URLs: **'+summary.public_surface.sitemap_urls+'** · SEO intent clusters: **'+summary.public_surface.seo_intent_clusters+'** · hreflang pairs: **'+summary.public_surface.hreflang_pairs+'** · entity schema surfaces: **'+summary.public_surface.entity_schema_surfaces+'**');
 console.log('- Platform modules: **'+summary.platform.modules+'** · DB migrations: **'+summary.platform.db_migrations+'** · latest: `'+summary.platform.last_migration+'`');
 console.log('- Mobile private navigation: **'+summary.mobile.stable_tabs.length+' stable tabs** across **'+summary.mobile.role_nav_profiles+' routing profiles**');
 console.log('- Payment adapters enabled: **'+summary.commerce.payment_providers_enabled+'** (expected 0 until credentials/reconciliation gate passes) · published books: **'+summary.commerce.published_books+'** · sellable now: **'+summary.commerce.sellable_books+'** · invalid sellable: **'+summary.commerce.invalid_sellable_books+'**');
 console.log('- Identity: **email-only** sign-in/verification/recovery · mobile is contact-only');
 console.log('- AI concierge: consented lead capture **'+(summary.assistant.lead_capture?'ON':'OFF')+'** · chat persistence **'+(summary.assistant.conversation_persisted?'ON':'OFF')+'**');
 console.log('- Golden Talent: **'+summary.golden_talent.status+'** · total score: **OFF** · automatic career prescription: **OFF**');
 console.log('');
 console.log('## Highest-priority next actions');
 for(const a of summary.next_actions) console.log('- **'+a.priority+' · '+a.track+' · '+a.state+'**'+(a.blocked?' · external dependency present':'')+' — '+a.next);
 if(failures.length){console.log('');console.log('## Audit failures');for(const f of failures) console.log('- '+f);}
}else{
 console.log(JSON.stringify(summary,null,2));
}
if(failures.length){for(const f of failures) console.error('✗ '+f);process.exit(1);}
