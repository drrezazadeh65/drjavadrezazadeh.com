/**
 * JR Home Campaigns — single-source, non-destructive bilingual static renderer.
 * Safely synchronizes 15 public campaign cards from the owner-reviewed registry.
 *
 * node scripts/render-home-campaigns.mjs --check (default; CI)
 * node scripts/render-home-campaigns.mjs --write (editorial source update ONLY)
 *
 * There is intentionally no public write API, direct HTML input, automatic
 * payment activation, live deployment, account data or privileged browser editor.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const EXPECTED=['golden','major','rcas','consult','family','exam','research','editing',
  'teacher','institution','language','shop','journal','news','support'];
const GROUP_COUNTS={spotlight:1,pathways:5,professional:5,discover:4};
const GROUPS=['pathways','professional','discover'];
const escapeHtml=value=>String(value).replace(/[&<>"]/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
}[char]));
const requireText=(s,what)=>{
  assert.equal(typeof s,'string',what+' must be text');
  assert.ok(s.trim().length>=4&&s.length<1500,what+' is missing or too long');
};
const withinRoot=publicPath=>path.join(ROOT,publicPath.slice(1));

export function validateCampaignRegistry(registry,{verifyFiles=true}={}){
  assert.equal(registry?.policy?.autoplay,false,'No auto-play');
  assert.equal(registry?.policy?.external_tracking,false,'No external tracking');
  assert.equal(registry?.policy?.personalization,false,'No personalization');
  assert.ok(Array.isArray(registry.banners)&&registry.banners.length===15,'Exactly 15 banners');
  assert.deepEqual(
    [...registry.banners.map(item=>item.id)].sort(),
    [...EXPECTED].sort(),
    'No addition/removal of approved banner identities without independent review'
  );
  for(const [group,count] of Object.entries(GROUP_COUNTS)){
    assert.equal(registry.banners.filter(item=>item.group===group).length,count,'Group '+group);
  }
  assert.equal(registry.banners.find(item=>item.id==='golden')?.group,'spotlight');
  const images=new Set();
  for(const banner of registry.banners){
    assert.match(banner.image,/^\/assets\/images\/[a-zA-Z0-9_\/-]+\.webp$/,'Local approved image');
    assert.ok(!images.has(banner.image),'Image must not repeat');
    images.add(banner.image);
    if(verifyFiles)assert.ok(fs.existsSync(withinRoot(banner.image)),'Missing image '+banner.image);
    for(const lang of ['fa','en']){
      const x=banner[lang];
      assert.ok(x&&typeof x==='object','Missing '+lang+' copy');
      for(const field of ['eyebrow','title','summary','cta','alt','href']){
        requireText(x[field],lang+' '+banner.id+' '+field);
      }
      assert.match(x.href,/^\/(?:fa|en|journal)(?:\/[a-zA-Z0-9_-]+)*\/$/,'Local public URL');
      const legal=x.href.startsWith('/'+lang+'/')||
        (lang==='fa'&&x.href.startsWith('/journal/fa/'))||
        (lang==='en'&&x.href.startsWith('/journal/')&&!x.href.startsWith('/journal/fa/'));
      assert.ok(legal,'No cross-language target: '+x.href);
      if(verifyFiles)assert.ok(fs.existsSync(withinRoot(x.href)+'index.html'),'Missing page '+x.href);
    }
  }
  for(const group of GROUPS){
    const x=registry.groups?.[group];
    assert.ok(x,'Missing group '+group);
    for(const field of ['fa','en','summary_fa','summary_en'])requireText(x[field],group+'.'+field);
  }
  return registry;
}

function one(source,regex,replacement,description){
  let count=0;
  const next=source.replace(regex,(...match)=>{count++;return replacement(...match);});
  assert.equal(count,1,'Expected exactly one '+description+' in original page');
  return next;
}
function media(b,lang){
  const size=b.image.startsWith('/assets/images/knowledge/')?[1600,900]:[1672,941];
  return '<img src="'+escapeHtml(b.image)+'" alt="'+escapeHtml(b[lang].alt)+
    '" width="'+size[0]+'" height="'+size[1]+'" loading="lazy" decoding="async">';
}
function feature(b,lang){
  const x=b[lang];
  return '<a class="jr-campaign-feature" data-jr-promo-key="'+b.id+'" href="'+escapeHtml(x.href)+'">'+
    media(b,lang)+'<span class="jr-feature-copy"><span class="jr-feature-kicker">'+escapeHtml(x.eyebrow)+
    '</span><strong class="jr-feature-title">'+escapeHtml(x.title)+
    '</strong><span class="jr-feature-desc">'+escapeHtml(x.summary)+
    '</span><span class="jr-feature-cta">'+escapeHtml(x.cta)+'</span></span></a>';
}
function card(b,lang){
  const x=b[lang];
  return '<li class="jr-campaign-card" data-jr-promo-key="'+b.id+'"><a href="'+escapeHtml(x.href)+'">'+
    media(b,lang)+'<span class="jr-card-copy"><span class="jr-card-kicker">'+escapeHtml(x.eyebrow)+
    '</span><strong class="jr-card-title">'+escapeHtml(x.title)+
    '</strong><span class="jr-card-desc">'+escapeHtml(x.summary)+
    '</span><span class="jr-card-cta">'+escapeHtml(x.cta)+'</span></span></a></li>';
}

export function renderCampaignPage(source,lang,registry){
  assert.ok(lang==='fa'||lang==='en','Unsupported language');
  validateCampaignRegistry(registry,{verifyFiles:false});
  const start=source.indexOf('<!-- JR_HOME_CAMPAIGN_START');
  const end=source.indexOf('<!-- JR_HOME_CAMPAIGN_END',start);
  assert.ok(start>=0&&end>start,'Missing explicit static campaign markers');
  const fragment=source.slice(start,end);
  let output=fragment;
  output=one(output,/<a class="jr-campaign-feature" data-jr-promo-key="golden"[^>]*>[\s\S]*?<\/a>/g,
    ()=>feature(registry.banners.find(x=>x.id==='golden'),lang),'spotlight');
  for(const group of GROUPS){
    const metadata=registry.groups[group];
    const heading=new RegExp('(<section class="jr-campaign-group" data-jr-promo-group="'+group+
      '"[\\s\\S]*?<h3 class="jr-group-title" id="jr-promo-'+lang+'-'+group+
      '">)([^<]*)(<\\/h3><p class="jr-group-summary">)([^<]*)(<\\/p>)','g');
    output=one(output,heading,(_all,open,_oldTitle,mid,_oldSummary,close)=>
      open+escapeHtml(metadata[lang])+mid+escapeHtml(metadata['summary_'+lang])+close,
      group+' heading');
    const rail=new RegExp('(<ul class="jr-campaign-rail" id="jr-promo-rail-'+lang+'-'+group+
      '"[^>]*>)[\\s\\S]*?(<\\/ul>)','g');
    output=one(output,rail,(_all,open,close)=>{
      assert.ok(/aria-label="[^"]*"/.test(open),'A labelled scroll rail is required');
      const labelled=open.replace(/aria-label="[^"]*"/,
        'aria-label="'+escapeHtml(metadata[lang])+'"');
      return labelled+registry.banners.filter(x=>x.group===group)
        .map(x=>card(x,lang)).join('')+close;
    },group+' rail');
  }
  const result=source.slice(0,start)+output+source.slice(end);
  assert.equal((output.match(/data-jr-promo-key="/g)||[]).length,15,'Missing campaign after rendering');
  assert.ok(result.includes('<!-- JR_HOME_CAMPAIGN_END'),'Preserve sentinel and surrounding page');
  return result;
}

export function syncCampaignPages({write=false,root=ROOT}={}){
  const registry=validateCampaignRegistry(JSON.parse(
    fs.readFileSync(path.join(root,'platform/home-campaigns-20261021.json'),'utf8')));
  const drift=[];
  for(const lang of ['fa','en']){
    const file=path.join(root,lang,'index.html');
    const old=fs.readFileSync(file,'utf8');
    const next=renderCampaignPage(old,lang,registry);
    if(old!==next){
      drift.push(lang);
      if(write)fs.writeFileSync(file,next,'utf8');
    }
  }
  return drift;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const mode=process.argv[2]||'--check';
  if(!['--check','--write'].includes(mode)||process.argv.length>3){
    console.error('Usage: node scripts/render-home-campaigns.mjs [--check|--write]');
    process.exitCode=2;
  }else{
    try{
      const drift=syncCampaignPages({write:mode==='--write'});
      console.log(drift.length?
        (mode==='--write'?'Regenerated: ':'Out of sync: ')+drift.join(', '):
        'Both homepages match the approved 15-banner registry.');
      if(drift.length&&mode==='--check')process.exitCode=1;
    }catch(error){
      console.error('Campaign sync rejected:',error.message);
      process.exitCode=1;
    }
  }
}
