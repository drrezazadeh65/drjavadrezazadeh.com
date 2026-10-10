import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root=process.cwd();
export const bundles=JSON.parse(fs.readFileSync(path.join(root,'platform/stylesheet-bundles.json'),'utf8')).bundles;
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const content=bundle=>bundle.sources.map(source=>'/* Source: '+source+' */\n'+read('assets/css/'+source)).join('\n');
const href=(bundle,bytes)=>'/assets/css/'+bundle.output+'?v='+crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12);

export function stylesheetSources(html){
  return [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].flatMap(([tag])=>{
    const name=(tag.match(/href=["'][^"']*\/([^/"'?]+)(?:\?[^"']*)?["']/i)||[])[1];
    return bundles.find(bundle=>bundle.output===name)?.sources||[name];
  });
}

export function checkStylesheetBundles(){
  for(const bundle of bundles){
    const bytes=content(bundle);
    if(read('assets/css/'+bundle.output)!==bytes) throw Error('Stale stylesheet bundle: '+bundle.output);
    for(const page of bundle.pages){
      const html=read(page);
      if(!html.includes('href="'+href(bundle,bytes)+'"')) throw Error('Stale bundle URL: '+page);
      if(bundle.sources.includes('mobile-app-v431.css')&&!html.includes('data-v431-mobile-shell href="'+href(bundle,bytes)+'"')) throw Error('Missing mobile CSS marker: '+page);
    }
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(!process.argv.includes('--check')){
    for(const bundle of bundles){
      const bytes=content(bundle);
      fs.writeFileSync(path.join(root,'assets/css',bundle.output),bytes);
      for(const page of bundle.pages){
        const html=read(page);
        const tags=[...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].map(([tag])=>tag);
        const selected=tags.filter(tag=>bundle.sources.some(source=>tag.includes('/'+source))||tag.includes('/'+bundle.output));
        if(!selected.length) throw Error('Missing source stylesheets: '+page);
        const marker=bundle.sources.includes('mobile-app-v431.css')?' data-v431-mobile-shell':'';
        let updated=html.replace(selected[0],'<link rel="stylesheet"'+marker+' href="'+href(bundle,bytes)+'">');
        for(const tag of selected.slice(1)) updated=updated.replace(tag,'');
        fs.writeFileSync(path.join(root,page),updated);
      }
    }
  }
  checkStylesheetBundles();
  console.log('Stylesheet bundles verified: '+bundles.length+' ordered bundles; exact source bytes and page URLs preserved.');
}
