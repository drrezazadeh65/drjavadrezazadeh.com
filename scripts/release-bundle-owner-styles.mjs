/**
 * Package the pre-existing private administrator styles into one safe,
 * content-addressed CSS file per language, preserving cascade order.
 *
 * Source HTML and CSS are never changed. Runs only after the existing
 * security/URL validations in the owner-approved Bertina release assembler.
 * Authenticated HTML remains no-store; these public CSS bytes have no secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OWNER_PAGES=Object.freeze({
 fa:'fa/app/admin/index.html',
 en:'en/account/admin/index.html'
});
const styleTag=/<link\b[^>]*>/gi;
const attr=(tag,name)=>{
 for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)){
  if(m[1].toLowerCase()===name.toLowerCase())return m[2]??m[3];
 }
 return null;
};
const isStylesheet=tag=>(attr(tag,'rel')||'').toLowerCase().split(/\s+/).includes('stylesheet');

export function bundleOwnerStyles(releaseDirectory){
 const root=path.resolve(releaseDirectory);
 if(!fs.statSync(root).isDirectory())throw Error('Expected sanitized release output');
 const results={};
 for(const [language,relative] of Object.entries(OWNER_PAGES)){
  const htmlFile=path.join(root,relative);
  const html=fs.readFileSync(htmlFile,'utf8');
  if(!/<meta\b[^>]*\bnoindex/i.test(html)||
     !html.includes('id="ops-mfa-form"')||
     !html.includes('id="ops-workspace"'))
   throw Error('Refusing to bundle CSS without private MFA/noindex shell: '+relative);
  const found=[...html.matchAll(styleTag)].map(m=>m[0]).filter(isStylesheet);
  if(found.length<15||found.length>40)
   throw Error('Unexpected owner stylesheet inventory: '+relative+' has '+found.length);
  const parts=[];
  for(const tag of found){
   const href=attr(tag,'href')||'';
   const match=href.match(/^\/assets\/css\/([a-zA-Z0-9_-]+)\.css(?:\?[^"'<>]*)?$/);
   if(!match)throw Error('Owner stylesheet not a local supported asset: '+href);
   const file=path.join(root,'assets/css',match[1]+'.css');
   if(!fs.existsSync(file)||!fs.statSync(file).isFile())
    throw Error('Missing owner stylesheet '+match[1]);
   const css=fs.readFileSync(file,'utf8');
   // Non-top-level @import or @charset inside a bundle can silently change
   // cascade semantics, so reject instead of shipping a broken workspace.
   if(/@(?:import|charset)\b/i.test(css))
    throw Error('Bundling requires CSS without @import/@charset: '+match[1]);
   // Relative url() paths would resolve against the bundle name; every
   // included stylesheet currently has either no URL or root-absolute URLs.
   for(const item of css.matchAll(/\burl\(\s*['"]?([^'")\s]+)[^)]*\)/gi)){
    const url=item[1];
    if(!url.startsWith('/')&&!url.startsWith('data:')&&!url.startsWith('#'))
      throw Error('Relative CSS url requires explicit migration: '+match[1]);
   }
   parts.push('/* '+match[1]+' — original cascade order '+(parts.length+1)+' */\n'+css+'\n');
  }
  const bundled='/* JR Bertina owner CSS bundle: public style bytes, private HTML */\n'+parts.join('\n');
  const digest=crypto.createHash('sha256').update(bundled).digest('hex').slice(0,12);
  const fileName='operations-owner.'+language+'.'+digest+'.css';
  const destination=path.join(root,'assets/css',fileName);
  if(fs.existsSync(destination)){
   if(fs.readFileSync(destination,'utf8')!==bundled)
    throw Error('Immutable private-dashboard CSS alias collision: '+fileName);
  }else fs.writeFileSync(destination,bundled,{flag:'wx',mode:0o644});
  let ordinal=0;
  const rewritten=html.replace(styleTag,tag=>{
   if(!isStylesheet(tag))return tag;
   ordinal++;
   return ordinal===1
    ?'<link rel="stylesheet" href="/assets/css/'+fileName+'">'
    :'';
  });
  if(ordinal!==found.length)throw Error('Owner stylesheet rewrite mismatch');
  fs.writeFileSync(htmlFile,rewritten);
  results[language]={
   css:fileName,
   sourceFiles:found.length,
   combinedRawBytes:Buffer.byteLength(bundled,'utf8'),
   htmlPage:relative,
   includesCommandDeck:bundled.includes('ops-command-deck')
  };
  if(!results[language].includesCommandDeck)
   throw Error('Owner command deck style missing from bundle');
 }
 return Object.freeze({schema:'jr.owner.styles.immutable.v1',results});
}
