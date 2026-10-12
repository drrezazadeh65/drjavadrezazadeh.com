import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const file=route=>fs.readFileSync(path.join(root,route),'utf8');
const json=route=>JSON.parse(file(route));
const existsRoute=url=>{
  const route=new URL(url,'https://drjavadrezazadeh.com').pathname;
  return route.startsWith('/') && !route.includes('..') && fs.existsSync(path.join(root,route,'index.html'));
};
const count=(value,token)=>value.split(token).length-1;
const errors=[];
const check=(fn,label)=>{try{fn()}catch(error){errors.push(label+': '+error.message)}};
const plan=json('platform/organic-growth-stage14.json');
const catalog=json('assets/data/service-catalog.json').services;
const vips=json('assets/data/vip-catalog.json').services;
const books=json('assets/data/book-catalog.json').books;
check(()=>{
  assert.equal(plan.schema,'organic-growth-stage14-v1');
  assert.equal(plan.release_status,'SOURCE_ONLY_UNVERIFIED');
  assert.equal(plan.zero_ad_spend,true);
  assert.deepEqual([catalog.length,vips.length,books.length],[21,6,3]);
  assert.equal(plan.opportunities.length,30);
  const list=new Set(plan.opportunities.map(x=>x.sku_type+':'+x.id));
  assert.equal(list.size,30);
  for(const row of plan.opportunities){
    assert.equal(row.verified_settlement,'UNVERIFIED');
    assert.equal(row.actual_delivery,'UNVERIFIED');
    assert.ok(existsRoute(row.route),row.route+' missing');
    const source=row.sku_type==='SERVICE'?catalog:row.sku_type==='VIP'?vips:books;
    assert.ok(source.some(x=>x.id===row.id),row.id+' missing from canonical catalogue');
  }
},'catalog matrix');
const faServices=file('fa/khadamat/index.html');
const tools=file('assets/js/free-growth-tools.js');
const sharing=file('assets/js/organic-sharing.js');
check(()=>{
  assert.ok(faServices.includes('data-free-growth-tools'));
  assert.ok(faServices.includes('id="free-guidance-tools"'));
  assert.ok(faServices.includes('free-growth-tools.css'));
  assert.ok(faServices.includes('free-growth-tools.js'));
  assert.ok(faServices.includes('data-stage14-share'));
  assert.ok(faServices.includes('organic-sharing.js'));
  assert.ok(faServices.includes('organic_share_intent'));
  assert.equal(plan.free_tools.length,5);
  for(const item of plan.free_tools){
    assert.ok(tools.includes(`id: '${item.id}'`),item.id+' missing');
    assert.ok(existsRoute(item.route),item.route+' missing');
  }
  assert.ok(!/(?:fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB)/.test(tools),'private tool data must not persist or transmit');
  assert.ok(!/(?:fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB)/.test(sharing),'sharing must not send analytics directly');
  assert.ok(sharing.includes("url.search=''")&&sharing.includes("url.hash=''"),'canonical share must strip queries/fragments');
},'free tools and sharing');
check(()=>{
  assert.equal(plan.article_bridges.length,13);
  const all=new Set();
  for(const row of plan.article_bridges){
    assert.ok(!all.has(row.article),'duplicate article '+row.article); all.add(row.article);
    assert.ok(existsRoute(row.article),row.article+' missing');
    assert.ok(existsRoute(row.related_public_destination),row.related_public_destination+' missing');
    const article=file(row.article.slice(1)+'index.html');
    assert.equal(count(article,'data-stage14-organic-bridge'),1,row.article+' bridge not exactly once');
    assert.ok(article.includes('href="'+row.related_public_destination+'"'),row.article+' service not linked');
    assert.ok(article.includes('data-conversion-event="organic_article_service_intent"'),row.article+' missing intent event');
    assert.ok(article.includes('href="/fa/khadamat/#free-guidance-tools"'),row.article+' missing free-tool CTA');
    assert.ok(article.includes('assets/js/site.js'),row.article+' missing existing opt-in event adapter');
    assert.match(article,/<link\s+rel="canonical"\s+href="https:\/\/drjavadrezazadeh\.com\/fa\/akhbar\//);
  }
},'13 editorial article bridges');
check(()=>{
  const related=json('platform/related-content-map.json');
  assert.equal(Object.keys(related.guides).length,plan.counts.evergreen_guides_mapped);
  for(const [guide,row] of Object.entries(related.guides)){
    assert.ok(existsRoute(guide),guide+' absent');
    assert.ok(existsRoute(row.primaryService),guide+' primaryService absent');
  }
},'evergreen guide service relationships');
check(()=>{
  const publicConfig=json('assets/data/analytics-config.json');
  const authority=json('platform/analytics-config.json');
  const contract=json('platform/conversion-event-contract.json');
  assert.equal(publicConfig.enabled,false,'GA4 may not be silently enabled');
  assert.equal(authority.enabled,false,'authority GA4 may not be silently enabled');
  assert.equal(publicConfig.consent.required,true);
  assert.equal(authority.consent.required,true);
  for(const ev of ['organic_article_service_intent','organic_share_intent']){
    assert.ok(publicConfig.allowed_client_events.includes(ev));
    assert.ok(authority.allowed_client_events.includes(ev));
    assert.ok(contract.events.some(x=>x.key===ev));
  }
  for(const forbidden of ['email','phone','assessment_response','payment_reference'])assert.ok(contract.prohibited_fields.includes(forbidden));
},'privacy-safe intent telemetry contract');
check(()=>{
  assert.equal(plan.revenue_dashboard.not_revenue.includes('callback_return_only'),true);
  assert.equal(plan.referral.paid_rewards,'NOT_ENABLED');
  assert.equal(plan.event_evidence.settlement,'INDEPENDENT_BANK_OR_MERCHANT_RECONCILIATION');
},'revenue evidence and referral controls');
console.log('Stage14 source audit: 30 catalogue opportunities, 13 launch articles, '+plan.counts.evergreen_guides_mapped+' guides, 5 tools, canonical-only sharing and privacy-first evidence gates.');
if(errors.length){for(const err of errors)console.error('FAIL '+err);process.exit(1)}
console.log('PASS — source contracts only; not a Bertina live deployment, lead consent capture, bank settlement or verified income.');
